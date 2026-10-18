import { Platform } from "react-native";
import { scoped as AsyncStorage } from "./scoped-store";
import { t } from "./i18n";
import { deskDay, isNightHour, nextMorning } from "./day";
import { clockTime } from "./format";
import { getWrenName } from "./wren-name";
import { supabase, supabaseReady } from "./supabase";
import { STAMPS } from "../data/stamps";
import { snapshotBird, type BirdPose } from "../components/BirdSnapshots";

/* HER, ON THE LOCK SCREEN.
   ────────────────────────────────────────────────────────────────────────
   Two Live Activities, both of them things that are actually happening:

   · DAY CLOSED — starts by itself when the last letter leaves Today's
     desk (passed, answered or blocked: Today 3d, owner question 2; never on a quiet day,
     never on a relaunch into a finished desk), counts to the hour she's
     back (the desk's day turns then, lib/day), and is ended on the next
     open past that hour. No push: the countdown is the system's own timer.

   · LETTER OUT — starts when a letter to a stranger leaves. The server
     pushes what happens to it (another desk it landed on, a reply); the
     app also reconciles on every foreground from the same two columns
     (letters.reads, a thread on the letter), so a missed push is a late
     number, never a wrong one. Ends when a reply has come home, or when
     the system's clock runs out.

   Both are decoration on top of the product, so nothing here may throw
   into it: expo-widgets is required lazily and every call is fenced. A dev
   client built before the module existed simply has no lock screen. */

type Widgets = typeof import("expo-widgets");
type DayClosedT = typeof import("../activities/DayClosed").default;
type LetterOutT = typeof import("../activities/LetterOut").default;

let mods: { W: Widgets; DayClosed: DayClosedT; LetterOut: LetterOutT } | null | undefined;
function load() {
  if (mods !== undefined) return mods;
  if (Platform.OS !== "ios") return (mods = null);
  try {
    const W = require("expo-widgets") as Widgets;
    if (!W.widgetsDirectory) {
      if (__DEV__) console.warn("[activities] no widgetsDirectory (app group missing)");
      return (mods = null); // no app group → no widget can read a picture
    }
    const DayClosed = (require("../activities/DayClosed") as { default: DayClosedT }).default;
    const LetterOut = (require("../activities/LetterOut") as { default: LetterOutT }).default;
    return (mods = { W, DayClosed, LetterOut });
  } catch (e) {
    if (__DEV__) console.warn("[activities] no native module:", String((e as Error)?.message ?? e));
    return (mods = null);
  }
}

/* ── her picture, where the widget can see it ──
   Captured from the real WrenBird (components/BirdSnapshots) — her stage,
   the read that shaped her, the shell's mark, the look and the piece she
   has on — then copied into the shared app-group directory, which is the
   only place a widget can read. "@3x" tells UIImage the pixels are 3x, so
   a 66px mark is 22pt: the island refuses anything larger than that. One
   file per pose is kept; older ones go. */
async function birdFile(pose: BirdPose): Promise<string> {
  const m = load();
  if (!m) return "";
  const src = await snapshotBird(pose);
  if (!src) return "";
  const { Directory, File } = require("expo-file-system") as typeof import("expo-file-system");
  const dir = new Directory(m.W.widgetsDirectory);
  const stamp = Date.now().toString(36);
  const dst = new File(dir, `wren-${pose}-${stamp}@3x.png`);
  new File(src).copy(dst);
  try {
    for (const f of dir.list()) if (f instanceof File && f.name.startsWith(`wren-${pose}-`) && f.name !== dst.name) f.delete();
  } catch {
    /* a stale picture is not worth an error */
  }
  return dst.uri;
}

/* Apple ends a Live Activity itself after eight hours. A countdown that the
   system will freeze at five in the morning is worse than none, so past
   eight hours out the blind shows the hour she's back and no clock. */
const EIGHT_H = 8 * 3600 * 1000;

/* ── DAY CLOSED ── */
const CLOSED_DAY_KEY = "kindredly_la_closed_day";

export async function startDayClosed(facts: { read: number; waiting: number }): Promise<void> {
  /* never over nothing: she counts what went past the desk, and a quiet
     day has nothing to count. Today's done effect already holds to this;
     here it holds for any caller. */
  if (!(facts.read > 0)) return;
  const m = load();
  if (!m) return;
  try {
    for (const i of m.DayClosed.getInstances()) await i.end("immediate");
    const wren = (await getWrenName()).toUpperCase();
    /* off duty in the evening, asleep in her yawn hours (21:00–07:59, the
       same hours Today has her doze off) — she has more than one way of
       being done for the day */
    const bird = await birdFile(isNightHour(new Date().getHours()) ? "sleepy" : "content");
    const mini = await birdFile("mini");
    const backAt = nextMorning();
    const timer = backAt.getTime() - Date.now() <= EIGHT_H;
    m.DayClosed.start(
      {
        wren,
        bird,
        mini,
        read: facts.read,
        waiting: facts.waiting,
        backAt: backAt.getTime(),
        since: Date.now(),
        timer,
        eyebrow: t("la.closed.eyebrow"),
        allRead: t("la.closed.allRead"),
        none: t("cod.slip.read0"),
        waitingLine: facts.waiting === 0 ? "" : facts.waiting === 1 ? t("la.closed.waiting1") : t("la.closed.waitingN", { n: facts.waiting }),
        backIn: t("cod.nextPost", { name: wren }),
        // the hour in the reader's own clock: "AT 8:00 AM", "A LAS 8:00"
        backAtLabel: t("cod.blind.next", { t: clockTime(backAt) }).toUpperCase(),
      },
      "kindredly:///(tabs)/letters",
      backAt,
    );
    await AsyncStorage.setItem(CLOSED_DAY_KEY, deskDay());
  } catch (e) {
    /* ActivityKit off in Settings, or the extension missing — the blind
       still came down inside the app */
    if (__DEV__) console.warn("[activities] day closed:", String((e as Error)?.message ?? e));
  }
}

/* ── LETTER OUT ── */
const OUT_KEY = "kindredly_la_letters"; // { [activityId]: letterId }

async function outMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(OUT_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

const stampEmoji = (id: string | null | undefined) => STAMPS.find((s) => s.id === id)?.emoji ?? "✉️";

/* the static half of a letter's activity: her, the stamp, and every line
   it can show. The server pushes only `reads` and `replied` on top. */
/* the static half of a letter's activity: her out with it, her landed
   with the reply, her small mark, the stamp, and every line it can show.
   The server pushes only `reads` and `replied` on top. */
function outStatic(wren: string, bird: string, birdBack: string, mini: string, stamp: string) {
  return {
    wren,
    bird,
    birdBack,
    mini,
    stamp,
    eyebrowOut: t("la.out.eyebrow", { name: wren }),
    eyebrowBack: t("la.out.back", { name: wren }),
    reads0: t("la.out.reads0"),
    reads1: t("la.out.reads1"),
    readsN: t("la.out.readsN"),
    looking: t("la.out.looking"),
    repliedHead: t("la.out.repliedHead"),
    repliedLine: t("la.out.repliedLine"),
  };
}

export async function startLetterOut(letterId: string, stampId: string | null | undefined): Promise<void> {
  const m = load();
  if (!m) return;
  try {
    const wren = (await getWrenName()).toUpperCase();
    const bird = await birdFile("fly");
    const birdBack = await birdFile("delight");
    const mini = await birdFile("mini");
    const fixed = outStatic(wren, bird, birdBack, mini, stampEmoji(stampId));
    const inst = m.LetterOut.start({ ...fixed, reads: 0, replied: false }, `kindredly:///my-letters`);
    const map = await outMap();
    map[inst.getId()] = letterId;
    await AsyncStorage.setItem(OUT_KEY, JSON.stringify(map));
    /* the server needs the activity's own push token to update it, and the
       static half of its props to push back with the numbers; a token can
       rotate, so both the first and every later one are kept */
    const keep = async (token: string | null) => {
      if (!token || !supabaseReady) return;
      const { data } = await supabase!.auth.getUser();
      const me = data.user?.id;
      if (!me) return;
      await supabase!.from("live_activity_tokens").upsert({ user_id: me, letter: letterId, token, props: fixed, updated_at: new Date().toISOString() }, { onConflict: "letter" });
    };
    void inst.getPushToken().then(keep, () => {});
    inst.addPushTokenListener((e) => void keep(e.pushToken));
  } catch (e) {
    /* no lock screen for this one; the letter itself is already out */
    if (__DEV__) console.warn("[activities] letter out:", String((e as Error)?.message ?? e));
  }
}

/** dev + sign-out: take her off the lock screen entirely */
export async function endAllActivities(): Promise<void> {
  const m = load();
  if (!m) return;
  try {
    for (const i of m.DayClosed.getInstances()) await i.end("immediate");
    for (const i of m.LetterOut.getInstances()) await i.end("immediate");
  } catch {
    /* ignore */
  }
}

/* dev only: push a number onto every letter out, the way the server would */
export async function previewLetterOut(state: { reads: number; replied: boolean }): Promise<void> {
  const m = load();
  if (!m || !__DEV__) return;
  const wren = (await getWrenName()).toUpperCase();
  const fixed = outStatic(wren, await birdFile("fly"), await birdFile("delight"), await birdFile("mini"), stampEmoji("cant-sleep"));
  for (const inst of m.LetterOut.getInstances()) await inst.update({ ...fixed, ...state });
}

/* ── reconciling on foreground ──
   The closed window is ended once its hour has passed; each letter out is
   brought up to date from the database's own columns and ended once a
   reply has come home and been seen. */
export async function syncActivities(): Promise<void> {
  const m = load();
  if (!m) return;
  try {
    const closed = m.DayClosed.getInstances();
    if (closed.length) {
      const day = await AsyncStorage.getItem(CLOSED_DAY_KEY);
      if (day !== deskDay()) for (const i of closed) await i.end("immediate");
    }
  } catch {
    /* ignore */
  }
  try {
    const out = m.LetterOut.getInstances();
    if (!out.length || !supabaseReady) return;
    const map = await outMap();
    const ids = out.map((i) => map[i.getId()]).filter((id) => id && !(__DEV__ && id.startsWith("preview")));
    if (!ids.length) return;
    const { data: me } = await supabase!.auth.getUser();
    const uidNow = me.user?.id;
    if (!uidNow) return;
    const [{ data: letters }, { data: threads }] = await Promise.all([
      supabase!.from("letters").select("id,stamp,reads,active").in("id", ids),
      supabase!.from("threads").select("letter").in("letter", ids),
    ]);
    const answered = new Set((threads || []).map((r: any) => r.letter as string));
    const wren = (await getWrenName()).toUpperCase();
    const bird = await birdFile("fly");
    const birdBack = await birdFile("delight");
    const mini = await birdFile("mini");
    for (const inst of out) {
      const letterId = map[inst.getId()];
      if (__DEV__ && letterId?.startsWith("preview")) continue; // /activity-preview's stand-in letter has no row
      const row = (letters || []).find((l: any) => l.id === letterId) as { stamp: string | null; reads: number; active?: boolean } | undefined;
      /* withdrawn: since web 0024 the author can still read their own
         withdrawn letter, so a missing row no longer means it — active does */
      if (!row || row.active === false) {
        await inst.end("immediate"); // withdrawn, or not ours any more
        continue;
      }
      const replied = answered.has(letterId);
      await inst.update({ ...outStatic(wren, bird, birdBack, mini, stampEmoji(row.stamp)), reads: row.reads ?? 0, replied });
      /* a reply the reader has now opened the app for: the activity did its
         job, let it fade rather than sit there */
      if (replied) await inst.end(m.W.after(new Date(Date.now() + 60 * 60 * 1000)));
    }
  } catch {
    /* ignore */
  }
}
