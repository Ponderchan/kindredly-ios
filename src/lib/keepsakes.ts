import { scoped as AsyncStorage } from "./scoped-store";
import { t as tr } from "./i18n";
import { localeTag } from "./format";
import type { ThreadSummary } from "./db";
import type { JournalEntry } from "./journal";

/* KEEPSAKES — what you and she went through, not what you completed.
   ────────────────────────────────────────────────────────────────────────
   The owner's library, with its own laws, and they are the whole design:

     1. a real event, or it doesn't exist
     2. evidence you can trace — every keepsake can answer "why this?"
     3. no rarity, no leaderboard, no percentages
     4. history is never purchasable
     5. rationed: major ones get a moment, minor ones join the shelf quietly

   So this file only implements triggers it can prove from data we already
   hold. The registry (data/keepsakes.ts) carries every keepsake the
   library defines, including the ones whose data doesn't exist yet
   (weather, rituals, shared songs, morph changes) — those simply never
   mint. A keepsake nobody can explain is worse than a keepsake nobody
   has. */

export interface Keepsake {
  id: string;
  at: number; // when the event really happened
  /** the printed proof — a date, a count, a word, a thread */
  evidence: string;
  /** the correspondence it belongs to, if any */
  threadId?: string;
  /** a line she carried, when the moment has one and privacy allows */
  line?: string;
}

export interface KeepsakeCtx {
  carried: { at: string }[];
  threads: ThreadSummary[];
  journal: JournalEntry[];
  commonWords: string[];
  joinedAt?: string | null;
  voiceSent?: boolean;
}

const DAY = 864e5;
const hourOf = (iso: string | number) => new Date(iso).getHours();
const LOCALE = localeTag; // one map, in format.ts, for all nine languages
const dayName = (t: number) => new Date(t).toLocaleDateString(LOCALE(), { weekday: "long" });
const stamp = (t: number) =>
  new Date(t).toLocaleDateString(LOCALE(), { month: "short", day: "numeric" }).toUpperCase() +
  " · " +
  new Date(t).toLocaleTimeString(LOCALE(), { hour: "2-digit", minute: "2-digit", hour12: false });

/* which correspondence last spoke inbound — the only reply timestamp a
   thread summary carries, and an honest one: it IS when they last wrote */
const inbound = (t: ThreadSummary) => !t.lastSenderMe && t.theirs > 0;

export function evaluate(ctx: KeepsakeCtx): Keepsake[] {
  const { carried, threads, journal, commonWords } = ctx;
  const out: Keepsake[] = [];
  const add = (id: string, at: number, evidence: string, extra?: Partial<Keepsake>) =>
    out.push({ id, at, evidence, ...extra });

  /* ── Flight ─────────────────────────────────────────────────────── */
  const first = carried[0];
  if (first) add("first-flight", Date.parse(first.at), stamp(Date.parse(first.at)));

  const night = carried.find((c) => hourOf(c.at) < 5);
  if (night) add("night-flight", Date.parse(night.at), stamp(Date.parse(night.at)));

  const dawn = carried.find((c) => hourOf(c.at) >= 5 && hourOf(c.at) < 8);
  if (dawn) add("early-bird-flight", Date.parse(dawn.at), stamp(Date.parse(dawn.at)));

  /* two flights that left in the same hour of the day — she is starting to
     keep hours of her own */
  const byHour = new Map<number, string[]>();
  for (const c of carried) {
    const h = hourOf(c.at);
    byHour.set(h, [...(byHour.get(h) || []), c.at]);
  }
  const twice = [...byHour.entries()].find(([, list]) => list.length >= 2);
  if (twice)
    add("same-hour-twice", Date.parse(twice[1][1]), tr("ev.twice", { h: String(twice[0]).padStart(2, "0") }));

  /* a favourite hour only exists once one hour clearly leads */
  if (carried.length >= 8) {
    const ranked = [...byHour.entries()].sort((a, b) => b[1].length - a[1].length);
    if (ranked[0] && ranked[0][1].length >= 3 && (!ranked[1] || ranked[0][1].length > ranked[1][1].length))
      add("favorite-hour", Date.now(), tr("ev.flightsHour", { h: String(ranked[0][0]).padStart(2, "0"), n: ranked[0][1].length }));
  }

  if (carried.length >= 8) {
    const byDay = new Map<string, number>();
    for (const c of carried) {
      const d = dayName(Date.parse(c.at));
      byDay.set(d, (byDay.get(d) || 0) + 1);
    }
    const ranked = [...byDay.entries()].sort((a, b) => b[1] - a[1]);
    if (ranked[0] && ranked[0][1] >= 3 && (!ranked[1] || ranked[0][1] > ranked[1][1]))
      add("favorite-day", Date.now(), tr("ev.flightsDay", { day: ranked[0][0].toUpperCase(), n: ranked[0][1] }));
  }

  const lateBack = threads.filter(inbound).find((t) => hourOf(t.lastAt) < 5);
  if (lateBack) add("late-return", lateBack.lastAt, stamp(lateBack.lastAt), { threadId: lateBack.id });

  /* ── Reply ──────────────────────────────────────────────────────── */
  const answered = [...threads].filter((t) => t.theirs > 0).sort((a, b) => a.lastAt - b.lastAt)[0];
  if (answered)
    add("first-reply", answered.lastAt, stamp(answered.lastAt), {
      threadId: answered.id,
      line: answered.preview || undefined,
    });

  const morning = threads.filter(inbound).find((t) => hourOf(t.lastAt) >= 6 && hourOf(t.lastAt) < 11);
  if (morning) add("first-morning-reply", morning.lastAt, stamp(morning.lastAt), { threadId: morning.id });

  const midnight = threads.filter(inbound).find((t) => hourOf(t.lastAt) >= 23 || hourOf(t.lastAt) < 2);
  if (midnight) add("first-midnight-reply", midnight.lastAt, stamp(midnight.lastAt), { threadId: midnight.id });

  /* a word of yours that came back in their handwriting — the same
     counted rule lib/notice.ts uses, never a guess */
  if (commonWords.length) {
    for (const t of threads) {
      const theirs = (t.theirTexts || []).join(" ").toLowerCase();
      const echoed = commonWords.find((w) => w.length >= 4 && theirs.includes(w));
      if (echoed) {
        add("word-came-back", t.lastAt, tr("ev.wordThread", { w: echoed }), { threadId: t.id });
        break;
      }
    }
  }

  /* ── Relationship ───────────────────────────────────────────────── */
  const oldestThread = [...threads].sort((a, b) => a.lastAt - b.lastAt)[0];
  if (oldestThread) add("first-thread", oldestThread.lastAt, stamp(oldestThread.lastAt), { threadId: oldestThread.id });

  const turnedBack = threads.find((t) => t.mine >= 2 && t.theirs >= 1);
  if (turnedBack) add("first-turn-back", turnedBack.lastAt, tr("ev.outBack", { out: turnedBack.mine, back: turnedBack.theirs }), { threadId: turnedBack.id });

  const deep = threads.find((t) => t.mine >= 5 && t.theirs >= 5);
  if (deep) add("five-letters-deep", deep.lastAt, tr("ev.eachWay"), { threadId: deep.id });

  /* who put their name in first — only knowable while it is still true */
  const iFirst = threads.find((t) => t.iSigned && !t.theirSigned);
  if (iFirst) add("you-signed-first", iFirst.lastAt, stamp(iFirst.lastAt), { threadId: iFirst.id });
  const theyFirst = threads.find((t) => t.theirSigned && !t.iSigned);
  if (theyFirst) add("they-signed-first", theyFirst.lastAt, stamp(theyFirst.lastAt), { threadId: theyFirst.id });
  const anySigned = threads.find((t) => t.iSigned);
  if (anySigned) add("name-seal", anySigned.lastAt, stamp(anySigned.lastAt), { threadId: anySigned.id });

  const kindreds = threads.filter((t) => t.revealed).sort((a, b) => a.lastAt - b.lastAt);
  if (kindreds[0])
    add("first-kindred", kindreds[0].lastAt, (kindreds[0].otherName ? kindreds[0].otherName.toUpperCase() : tr("ev.aKindred")), { threadId: kindreds[0].id });
  if (kindreds.length >= 3) add("three-kindreds", kindreds[2].lastAt, tr("ev.kindreds", { n: 3 }));
  if (kindreds.length >= 5) add("five-kindreds", kindreds[4].lastAt, tr("ev.kindreds", { n: 5 }));

  const longest = [...threads].sort((a, b) => b.mine + b.theirs - (a.mine + a.theirs))[0];
  if (longest && longest.mine + longest.theirs >= 12)
    add("longest-thread", longest.lastAt, tr("ev.letters", { n: longest.mine + longest.theirs }), { threadId: longest.id });

  /* ── Writing ────────────────────────────────────────────────────── */
  if (commonWords[0] && carried.length >= 5)
    add("word-spotted", Date.now(), tr("ev.word", { w: commonWords[0] }));
  if (ctx.voiceSent) add("first-voice-letter", Date.now(), tr("ev.aVoice"));

  /* ── Firsts (sealed side) ───────────────────────────────────────── */
  const sealed = [...journal]
    .filter((e) => !e.id.startsWith("demo-"))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  if (sealed[0]) add("first-sealed-page", Date.parse(sealed[0].date), stamp(Date.parse(sealed[0].date)));
  const photo = sealed.find((e) => e.type === "photo");
  if (photo) add("first-photo-kept", Date.parse(photo.date), stamp(Date.parse(photo.date)));
  /* the one line a sealed page was allowed to leave with — the crossing
     from "only me" to "someone" that the product otherwise never marks */
  const drifted = sealed.find((e) => !!e.driftedLine);
  if (drifted)
    add("first-drifted-line", Date.parse(drifted.date), stamp(Date.parse(drifted.date)), { line: drifted.driftedLine });

  /* ── Time ───────────────────────────────────────────────────────── */
  for (const n of [10, 50, 100]) {
    const nth = carried[n - 1];
    if (nth) add(`${n}-letters-carried`, Date.parse(nth.at), tr("ev.carriedStamp", { n, stamp: stamp(Date.parse(nth.at)) }));
  }
  if (ctx.joinedAt && Date.now() - Date.parse(ctx.joinedAt) >= 365 * DAY)
    add("first-anniversary", Date.parse(ctx.joinedAt) + 365 * DAY, tr("ev.oneYear"));

  return out;
}

/* ── the shelf: minted once, kept forever, never bought ──────────────── */

const KEY = "kindredly_keepsakes";
const SEEN = "kindredly_keepsakes_seen";

export interface Minted extends Keepsake {
  /** when it landed on YOUR shelf, which is not when it happened */
  minted: number;
}

/* ONE MINT AT A TIME. Her room (WrenHome) and the Me tab (10a: Me mints
   too, so its keepsakes block doesn't lag behind a reader who never opens
   her room) both read the shelf, add to it and write it back; two at once
   would each write what it read, and the slower would drop the other's
   new keepsake. Each mint waits for the one before it. */
let minting: Promise<unknown> = Promise.resolve();

export function mint(ctx: KeepsakeCtx): Promise<Minted[]> {
  const next = minting.then(
    () => mintNow(ctx),
    () => mintNow(ctx),
  );
  minting = next;
  return next;
}

async function mintNow(ctx: KeepsakeCtx): Promise<Minted[]> {
  const found = evaluate(ctx);
  const fresh = new Map(found.map((k) => [k.id, k]));
  try {
    const shelf: Minted[] = JSON.parse((await AsyncStorage.getItem(KEY)) || "[]");
    const have = new Set(shelf.map((k) => k.id));
    let changed = false;
    /* REFRESH THE PROOF, KEEP THE HISTORY. evaluate() re-derives evidence in
       the reader's current language every run; a keepsake's evidence string
       was otherwise frozen at first mint (so a date read AUG 3 forever, even
       after the app switched to Portuguese). We refresh evidence and line
       from the fresh read while preserving the immutable facts — id, `at`
       (when it happened), minted (when it landed on your shelf). Non-date
       stats localize the same way, since evaluate builds them from the
       catalog too. */
    for (const m of shelf) {
      const f = fresh.get(m.id);
      if (f && (f.evidence !== m.evidence || f.line !== m.line)) {
        m.evidence = f.evidence;
        m.line = f.line;
        changed = true;
      }
    }
    for (const k of found)
      if (!have.has(k.id)) {
        shelf.push({ ...k, minted: Date.now() });
        have.add(k.id);
        changed = true;
      }
    if (changed) await AsyncStorage.setItem(KEY, JSON.stringify(shelf.slice(-120)));
    return shelf.sort((a, b) => b.at - a.at);
  } catch {
    return found.map((k) => ({ ...k, minted: Date.now() })).sort((a, b) => b.at - a.at);
  }
}

export async function loadShelf(): Promise<Minted[]> {
  try {
    const shelf: Minted[] = JSON.parse((await AsyncStorage.getItem(KEY)) || "[]");
    return shelf.sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

/** which ids the reader hasn't looked at yet — the NEW marker */
export async function unseen(shelf: Minted[]): Promise<Set<string>> {
  try {
    const seen: string[] = JSON.parse((await AsyncStorage.getItem(SEEN) as string) || "[]");
    return new Set(shelf.map((k) => k.id).filter((id) => !seen.includes(id)));
  } catch {
    return new Set();
  }
}

export async function markSeen(ids: string[]): Promise<void> {
  try {
    const seen: string[] = JSON.parse((await AsyncStorage.getItem(SEEN) as string) || "[]");
    await AsyncStorage.setItem(SEEN, JSON.stringify([...new Set([...seen, ...ids])].slice(-200)));
  } catch {
    /* the marker just shows again */
  }
}
