import { scoped as AsyncStorage } from "./scoped-store";
import { supabase, supabaseReady } from "./supabase";
import { whoAmI, TAKEN_BACK } from "./db";
import { hatch } from "./hatch-engine";
import { gatherWriting } from "./voice";
import { getWrenSkin, loadHatchSkin } from "./wren-style";
import { readYourPronoun } from "./pronouns";
import { isNight } from "./sparks";
import { getLang, t } from "./i18n";
import {
  ARCH_IDS,
  SKIN_IDS,
  isArchId,
  keepSnapshot,
  lastMonth,
  pickTemplate,
  previousSnapshot,
  snapshotOf,
  thisMonthSoFar,
  type ArchId,
  type Period,
  type SkinId,
  type Snapshot,
  type WrappedFacts,
  type WrappedTemplate,
} from "../screens/report/wrapped-core";

/* THE WRAPPED REPORT'S FACTS (owner, 2026-10-31). The I/O half of
   screens/report/wrapped-core: everything here is read from the account
   under the RLS it already has (web 0002/0020/0024: your own letters
   whatever their state, the threads you are in), so no new RPC and no
   migration. Four reads, in parallel:

     letters  author = you, created in the period: body, date, reads
     threads  b = you (someone answered one of your letters), started in
              the period → "wrote back"
     threads  a or b = you, revealed, revealed_at in the period → kindreds
     writing  every letter of yours (up to 200) and your journal, for the
              nine-dimension read when the period alone is too thin

   A read that fails throws: the page says so and offers to try again,
   rather than showing a receipt of zeros (a zero here would be a lie).
   A guest or a build without keys has no letters on a server: the
   report is built from the journal alone, and the receipt cards drop out.

   On the phone, per account (scoped-store): one snapshot per month, the
   newest twelve, which next month's "how you changed" compares against;
   and the template the reader chose with "switch style". */

const SNAP_KEY = "kindredly_report_wrapped_snaps";
const STYLE_KEY = "kindredly_report_wrapped_style";

/** Under this many letters in the period, the type is read from all your writing instead. */
const THIN = 3;

type LetterRow = { body: string | null; created_at: string | null; reads?: number | null };

export async function loadSnapshots(): Promise<Snapshot[]> {
  try {
    const raw = await AsyncStorage.getItem(SNAP_KEY);
    const list = raw ? (JSON.parse(raw) as Snapshot[]) : [];
    return Array.isArray(list) ? list.filter((s) => s && typeof s.month === "string" && isArchId(s.arch)) : [];
  } catch (e) {
    console.warn("[report-wrapped] loadSnapshots", e);
    return [];
  }
}

export async function saveSnapshot(s: Snapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(SNAP_KEY, JSON.stringify(keepSnapshot(await loadSnapshots(), s)));
  } catch (e) {
    // logged: next month's comparison simply has nothing to compare with
    console.warn("[report-wrapped] saveSnapshot", e);
  }
}

export async function loadStyleChoice(): Promise<WrappedTemplate | null> {
  try {
    const v = await AsyncStorage.getItem(STYLE_KEY);
    return v === "A" || v === "B" ? v : null;
  } catch (e) {
    console.warn("[report-wrapped] loadStyleChoice", e);
    return null;
  }
}

export async function saveStyleChoice(v: WrappedTemplate): Promise<void> {
  try {
    await AsyncStorage.setItem(STYLE_KEY, v);
  } catch (e) {
    console.warn("[report-wrapped] saveStyleChoice", e);
  }
}

/** Which template this reader gets: their choice, else by their pronoun, else a stable coin. */
export async function wrappedTemplate(): Promise<WrappedTemplate> {
  const [chosen, pronoun, who] = await Promise.all([loadStyleChoice(), readYourPronoun(), whoAmI().catch(() => ({ reason: "error" }) as const)]);
  return pickTemplate(pronoun, "id" in who ? who.id : "guest", chosen);
}

/** Wren's prompt for today: the letter desk's own sparks (lib/sparks), picked by the day so the
    report never moves the desk's counter. */
export function promptForToday(now = new Date()): string {
  const day = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  return isNight(now) ? t(`sp.night.${(day % 4) + 1}`) : t(`sp.day.${(day % 10) + 1}`);
}

const iso = (d: Date) => d.toISOString();

async function lettersIn(me: string, p: Period): Promise<LetterRow[]> {
  const q = (cols: string) =>
    supabase!.from("letters").select(cols).eq("author", me).gte("created_at", iso(p.start)).lt("created_at", iso(p.end)).order("created_at", { ascending: true }).limit(500);
  let r = await q("body,created_at,reads");
  // pre-0020: no reads column yet
  if (r.error) r = await q("body,created_at");
  if (r.error) throw new Error("letters: " + r.error.message);
  return ((r.data || []) as unknown as LetterRow[]).filter((l) => l.body && l.created_at && l.body !== TAKEN_BACK);
}

async function countThreads(build: () => any): Promise<number> {
  const { count, error } = await build();
  if (error) throw new Error("threads: " + error.message);
  return count ?? 0;
}

/** Everything the report says, read now. `member` is First Class; `firstLine` the hatch's line. */
export async function readWrappedFacts(member: boolean, firstLine: string | null, now = new Date()): Promise<WrappedFacts> {
  const who = supabaseReady ? await whoAmI() : ({ reason: "not-ready" } as const);
  if (!("id" in who) && who.reason === "network") throw new Error("offline");
  const me = "id" in who ? who.id : null;

  let period = lastMonth(now);
  let letters: LetterRow[] = [];
  if (me) {
    letters = await lettersIn(me, period);
    if (!letters.length) {
      period = thisMonthSoFar(now);
      letters = await lettersIn(me, period);
    }
  } else {
    period = lastMonth(now);
  }

  const [replies, kindreds, all, journal, hatchSkin, skin, snaps] = await Promise.all([
    me
      ? countThreads(() => supabase!.from("threads").select("id", { count: "exact", head: true }).eq("b", me).gte("created_at", iso(period.start)).lt("created_at", iso(period.end)))
      : 0,
    me
      ? countThreads(() =>
          supabase!
            .from("threads")
            .select("id", { count: "exact", head: true })
            .or(`a.eq.${me},b.eq.${me}`)
            .eq("revealed", true)
            .gte("revealed_at", iso(period.start))
            .lt("revealed_at", iso(period.end)),
        )
      : 0,
    me && letters.length < THIN
      ? supabase!
          .from("letters")
          .select("body")
          .eq("author", me)
          .order("created_at", { ascending: false })
          .limit(200)
          .then((r) => {
            if (r.error) throw new Error("writing: " + r.error.message);
            return ((r.data || []) as { body: string | null }[]).map((x) => x.body || "").filter((b) => b.trim().length >= 3 && b !== TAKEN_BACK);
          })
      : Promise.resolve([] as string[]),
    letters.length < THIN ? gatherWriting(firstLine) : Promise.resolve([] as string[]),
    loadHatchSkin(),
    getWrenSkin(),
    loadSnapshots(),
  ]);

  const texts = letters.length >= THIN ? letters.map((l) => l.body!.trim()) : [...letters.map((l) => l.body!.trim()), ...all, ...journal];
  const hours = letters.map((l) => new Date(l.created_at!).getHours());
  // the type is matched at the hour you write most (the hour boost in matchArchetype), not now
  const at = new Date(now);
  if (hours.length) at.setHours(mostCommon(hours));
  const read = hatch(texts.length ? texts : [firstLine || ""], at);
  const arch: ArchId = isArchId(read.archetype.id) ? read.archetype.id : ARCH_IDS[0];
  const coat = (hatchSkin || skin) as string;
  const sk: SkinId = (SKIN_IDS as readonly string[]).includes(coat) ? (coat as SkinId) : "sticker";

  return {
    period,
    arch,
    skin: sk,
    dims: read.dims.map((d) => ({ key: d.key, score: d.score, locked: d.locked, chipId: d.chipId })),
    letters: letters.map((l) => ({ body: l.body!, created_at: l.created_at!, reads: l.reads ?? 0 })),
    repliesReceived: replies,
    kindredsMade: kindreds,
    prev: previousSnapshot(snaps, period.month),
    member,
    prompt: promptForToday(now),
    lang: getLang(),
    now,
  };
}

/** Opened = read: this month's snapshot, kept for next month's "how you changed". */
export async function keepThisMonth(f: WrappedFacts): Promise<void> {
  await saveSnapshot(snapshotOf(f));
}

function mostCommon(xs: number[]): number {
  const n = new Map<number, number>();
  for (const x of xs) n.set(x, (n.get(x) || 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

/* ── a dev-build stand-in, for the simulator and the design pass (never in a release) ── */

/** October as the prototypes drew it: nine letters, 41 desks, six wrote back, one kindred. */
export function demoWrappedFacts(member: boolean, now = new Date()): WrappedFacts {
  const period = lastMonth(now);
  const y = period.start.getFullYear();
  const m = period.start.getMonth();
  const at = (d: number, h: number) => new Date(y, m, d, h, 12).toISOString();
  const bodies = [
    "I reorganised my bookshelf by colour instead of texting him back. It took four hours and I regret nothing.",
    "The bus was late again and the whole street looked like a film set somebody forgot to strike.",
    "I keep a list of things strangers say on trains. Today: 'no, the other moon'.",
    "My grandmother hums when she cooks and I have started doing it too, badly.",
    "It rained so hard the cat filed a complaint.",
    "I don't think I've ever told anyone that I like the sound of the fridge at night.",
    "Some days the kindest thing I do is answer a letter from someone I'll never meet.",
    "I walked home the long way so the song could finish.",
    "The lamp across the street goes off at exactly 1:14 every night. I have checked.",
  ];
  const hours = [23, 0, 1, 23, 14, 0, 23, 9, 1];
  const reads = [7, 5, 6, 4, 3, 5, 4, 3, 4];
  return {
    period,
    arch: "night-courier",
    skin: "sticker",
    dims: [
      { key: "emotion", score: 82, locked: true, chipId: "dim.chip.emotion.contrast" },
      { key: "structure", score: 74, locked: true, chipId: "dim.chip.structure.noThroat" },
      { key: "sentence", score: 70, locked: true, chipId: "dim.chip.sentence.breathe" },
      { key: "vocabulary", score: 55, locked: true, chipId: "dim.chip.vocabulary.observed" },
      { key: "rhythm", score: 50, locked: true, chipId: "dim.chip.rhythm.conversation" },
      { key: "perspective", score: 46, locked: true, chipId: "dim.chip.perspective.inside" },
      { key: "function", score: 40, locked: true, chipId: "dim.chip.function.commits" },
      { key: "punctuation", score: 38, locked: true, chipId: "dim.chip.punctuation.pauses" },
      { key: "quirks", score: 30, locked: false, chipId: "dim.chip.quirks.has" },
    ],
    letters: bodies.map((body, i) => ({ body, created_at: at(2 + i * 3, hours[i]), reads: reads[i] })),
    repliesReceived: 6,
    kindredsMade: 1,
    prev: { month: `${new Date(y, m - 1, 1).getFullYear()}-${String(new Date(y, m - 1, 1).getMonth() + 1).padStart(2, "0")}`, arch: "window-watcher", tags: ["world", "steady", "plain"], hour: 21, letters: 6, desks: 29 },
    member,
    prompt: promptForToday(now),
    lang: getLang(),
    now,
  };
}
