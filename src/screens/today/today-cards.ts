import type { PoolLetter } from "../../lib/db";
import type { Signal } from "../../lib/today-signal";
import type { WriteFail } from "../../lib/thread-detail-core";
import type { KMenuAction } from "../../../modules/kindredly-ui/src/types";
import { LETTER_MAX, REPLY_MIN, letterTier, weightedCount } from "../../lib/weighted-count";
import { VEIL_MASK, mosaicMask } from "../../lib/mosaic";
import { whoBook, type StrangerWho, type WhoBook } from "../../lib/stranger-who";
import { DAY_LETTERS, MAX_IN_FLIGHT, rationPool } from "../../lib/ration";
import { MORNING_HOUR, isNightHour, untilMorning } from "../../lib/day";
import { channelColors } from "../../theme/post";
import { paperIdOf, paperOf, type PaperId } from "../../data/papers";

/** the #tag's words and its no-colour fill (= components/10a/kit TOPIC_TAG_INK / TOPIC_TAG_NEUTRAL;
    copied, not imported: kit pulls in themes.json, which plain node can't load) */
const TOPIC_TAG_INK = "#1E1B35";
const TOPIC_TAG_NEUTRAL = "#B9B5D0";

/* THE TODAY TAB, AS DATA (10a step 5; Today 3d × 25b, 2026-10-16). Pure: no
   React, no React Native, no i18n — every word comes in through `t` /
   `fmt`, so `node src/screens/today/today-cards.test.ts` locks the rules.
   Both renderers draw what these builders return: the SwiftUI desk
   (TodayNative → KTodayView) and the React Native fallback (TodayRN), so a
   remote flip between them never changes what the reader sees or what a
   tap does.

   What lives here:
   - the saved day (DayRecord): the desk dealt this morning, frozen once
     dealt, with the letters passed and answered today, the letters already
     counted as seen, the one letter "bring back" can restore, and when the
     desk was first seen done. It is put away under the same key as the old
     { day, desk } (lib/local-push reads those two fields);
   - the phase (loading / offline / reading / done) and every move on the
     day: pass, bring back (one step), answer, drop (gone / blocked /
     withdrawn), seen, freeze, done; how a load deals, fills or only prunes;
   - her counted letter when the desk is done (W33: every number on it is a
     count the phone holds; a zero gets its own sentence) and the window to
     her game, with its sky by the hour;
   - Wren at rest on the band: sleepy in her night hours, wilted while
     she's starving;
   - the seal: what the day's sealed flag means against the desk (a flag
     over a desk that is reading again is stale, and goes);
   - the card: who wrote it (the `who` slot, from lib/stranger-who's book:
     switch off, the pen pal's number in the reader's language, no mark,
     no sign, the FACE v1 mask; switch on, the courier name, the ♀/♂ mark
     and the star sign once the identity client answers, the frosted
     window; UNSIGNED and the veil for a deleted account either way) and
     when; docket (postmark · number, the header as drawn today; the
     courier name in capitals once the switch is on), the stamp and its
     topic tag in the stamp's channel colours worked out on the card's own
     face, the body in its tier, the voice block, ONE capsule slot
     (translation wins over the signal, owner), the ⋯ menu (Report / Block
     on every signed letter — always reachable, App Store — and Bring back
     on the card on screen), the reply field's placeholder, and what
     VoiceOver reads;
   - the reply: the send key's three states (disabled / enabled / dimmed —
     a full pouch still takes the tap so the sheet can say why) and the
     hint's four lines; what a refused reply does;
   - the desk's geometry, the one formula Swift also uses (KTodayGeometry). */

/** i18n's t, as the builders take it. */
export type TFn = (key: string, vars?: Record<string, string | number>) => string;

/** Everything the builders need that isn't pure: words, dates, stamp names. */
export type TodayFormat = {
  t: TFn;
  /** i18n hasString: the reader's language has its own words for the key (missing: assume it does) */
  has?: (key: string) => boolean;
  /** format.postmark: "SEP.23" in the reader's language */
  postmark: (iso: string) => string;
  /** format.postNo: the writer's four-digit number */
  postNo: (uid: string) => number;
  /** format.penPalName: "No. 7273" / "NO.7273" / "N.º7273", in the reader's language */
  penPal: (uid: string, o: { upper: boolean; compact: boolean }) => string;
  /** who strangers are (lib/who useWhoBook: the identity switch, the courier names, the marks,
      the frost). Absent = the switch off, built from `penPal`: exactly the header as it was */
  who?: WhoBook;
  /** m:ss (format.fmt) */
  clock: (seconds: number) => string;
  /** format.clockTime of today at hour:00, in the reader's clock: "8:00 AM", "8:00" */
  clockHour: (hour: number) => string;
  /** `${postmark(ms)} · ${clockTime(ms)}`: "OCT.15 · 10:14 PM" */
  stampTime: (ms: number) => string;
  /** the stamp's colour and its name in the reader's language (sname), or null for an id stamps.ts doesn't list.
      A custom photo stamp ("c:<uuid>"): its category's colour, its #topic as the name ("" while it has none to
      show: taken down, hidden, deleted), and `spoken`, what VoiceOver calls it ("Photo stamp, #tea") */
  stamp: (id: string) => { color: string; name: string; spoken?: string } | null;
  /** a sticker's name in the reader's language (sticker-copy stickerName) */
  stickerName: (id: string) => string;
};

/* ── the saved day ────────────────────────────────────────────────────── */

export type DeskLetter = PoolLetter;

/**
 * Today's desk as the phone keeps it (AsyncStorage POOL_CACHE_KEY). `day`
 * and `desk` keep their names: lib/local-push reads them.
 */
export type DayRecord = {
  v: 2;
  /** the deskDay() it belongs to */
  day: string;
  /** today's desk in dealt order, passed letters INCLUDED; answered, blocked and withdrawn letters removed */
  desk: DeskLetter[];
  /** ids passed today, in pass order (a passed letter that is later blocked or withdrawn stays here: it was read) */
  passed: string[];
  /** ids answered today (a reply went; the letter left `desk`) */
  answered: string[];
  /** ids already counted by bump("seen") today (dedupe across relaunches) */
  seen: string[];
  /** the id bring-back would restore: set by a pass, cleared by bringBack, a reply, or that letter leaving */
  undo: string | null;
  /** ms when the day's deal froze; null = not frozen */
  dealtAt: number | null;
  /** ms the desk was first seen done today */
  doneAt: number | null;
};

export function emptyDay(day: string): DayRecord {
  return { v: 2, day, desk: [], passed: [], answered: [], seen: [], undo: null, dealtAt: null, doneAt: null };
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const isLetter = (x: unknown): x is DeskLetter => isObj(x) && typeof x.id === "string" && typeof x.created_at === "string";
const ids = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === "string") : []);
const msOrNull = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);

/**
 * Parse what AsyncStorage holds.
 * - v2 with day === today → { rec, placeholder: false }
 * - legacy { day, desk } with day === today → v2 with empty lists, dealtAt null (it fills, then freezes)
 * - onboarding's raw array (non-empty) → { rec: { ...emptyDay(today), desk: rationPool(list) }, placeholder: true }
 * - any record from another day, unreadable input or empty input → null (a stale desk is NOT painted)
 */
export function readDayRecord(raw: string | null, today: string): { rec: DayRecord; placeholder: boolean } | null {
  if (!raw) return null;
  let c: unknown;
  try {
    c = JSON.parse(raw);
  } catch {
    return null;
  }
  if (Array.isArray(c)) {
    const list = c.filter(isLetter);
    return list.length ? { rec: { ...emptyDay(today), desk: rationPool(list) }, placeholder: true } : null;
  }
  if (!isObj(c) || c.day !== today || !Array.isArray(c.desk)) return null;
  const desk = c.desk.filter(isLetter);
  if (c.v !== 2) return { rec: { ...emptyDay(today), desk }, placeholder: false };
  const undo = typeof c.undo === "string" ? c.undo : null;
  return {
    rec: { v: 2, day: today, desk, passed: ids(c.passed), answered: ids(c.answered), seen: ids(c.seen), undo, dealtAt: msOrNull(c.dealtAt), doneAt: msOrNull(c.doneAt) },
    placeholder: false,
  };
}

/**
 * Whether a saved record of today says anything yet: something was dealt,
 * passed or answered. A bare empty record (an empty deal not yet refilled)
 * doesn't count as knowing the day, so the first paint says "loading", not
 * "nothing came past your desk", until the network answers.
 */
export const recordKnown = (rec: DayRecord): boolean => rec.desk.length > 0 || rec.passed.length > 0 || rec.answered.length > 0 || rec.dealtAt != null;

/* ── the phase and the current letter ─────────────────────────────────── */

export type DeskPhase = "loading" | "offline" | "reading" | "done";

/** The letters not passed yet, in dealt order. The first is the one on screen. */
export function unpassed<T extends { id: string }>(desk: readonly T[], passed: readonly string[]): T[] {
  if (!passed.length) return [...desk];
  const gone = new Set(passed);
  return desk.filter((l) => !gone.has(l.id));
}

/**
 * Where the desk is. Letters left to read → reading (a placeholder desk
 * paints too, before the network). Nothing left: the first load never says
 * done (it says loading, or offline once a load came back empty-handed);
 * loaded, it is done — and that includes a quiet day, loaded with nothing
 * dealt.
 */
export function deskPhase(a: { loaded: boolean; offline: boolean; desk: readonly { id: string }[]; passed: readonly string[] }): DeskPhase {
  if (unpassed(a.desk, a.passed).length > 0) return "reading";
  if (!a.loaded) return a.offline ? "offline" : "loading";
  return "done";
}

/* ── the moves (each returns the same object when nothing changes) ────── */

const onDesk = (rec: DayRecord, id: string): boolean => rec.desk.some((l) => l.id === id);

/** The desk replaced (a load): the undo goes if its letter left. */
export function withDesk(rec: DayRecord, desk: DeskLetter[]): DayRecord {
  if (desk === rec.desk || (desk.length === rec.desk.length && desk.every((l, i) => l === rec.desk[i]))) return rec;
  const undo = rec.undo != null && desk.some((l) => l.id === rec.undo) ? rec.undo : null;
  return { ...rec, desk, undo };
}

/** Pass a letter on the desk: it joins the passed list and becomes the one bring-back restores. */
export function passLetter(rec: DayRecord, id: string): DayRecord {
  if (!onDesk(rec, id) || rec.passed.includes(id)) return rec;
  return { ...rec, passed: [...rec.passed, id], undo: id };
}

/** Bring back is one step: the last pass, while that letter is still on the desk. */
export function canBringBack(rec: DayRecord): boolean {
  return rec.undo != null && rec.passed.includes(rec.undo) && onDesk(rec, rec.undo);
}

export function bringBack(rec: DayRecord): DayRecord {
  if (!canBringBack(rec)) return rec;
  const id = rec.undo;
  // from a done desk too (her letter's ⋯): the day is open again, so the done moment goes with it
  return { ...rec, passed: rec.passed.filter((p) => p !== id), undo: null, doneAt: null };
}

/**
 * A reply went: the letter leaves the desk and is counted as answered. A
 * letter that had been passed moves from passed to answered, so it is never
 * counted twice on her letter.
 */
export function answerLetter(rec: DayRecord, id: string): DayRecord {
  if (!onDesk(rec, id)) return rec;
  return {
    ...rec,
    desk: rec.desk.filter((l) => l.id !== id),
    passed: rec.passed.includes(id) ? rec.passed.filter((p) => p !== id) : rec.passed,
    answered: rec.answered.includes(id) ? rec.answered : [...rec.answered, id],
    undo: rec.undo === id ? null : rec.undo,
  };
}

/** Letters that can't be answered any more (taken back, a block, a writer gone) leave the desk. The passed list keeps them: they were read. */
export function dropLetters(rec: DayRecord, gone: readonly string[]): DayRecord {
  if (!gone.length) return rec;
  const out = new Set(gone);
  const desk = rec.desk.filter((l) => !out.has(l.id));
  if (desk.length === rec.desk.length) return rec;
  return { ...rec, desk, undo: rec.undo != null && out.has(rec.undo) ? null : rec.undo };
}

/** Every letter by a blocked writer leaves the desk. */
export function dropAuthor(rec: DayRecord, author: string): DayRecord {
  return dropLetters(
    rec,
    rec.desk.filter((l) => l.author === author).map((l) => l.id),
  );
}

/** A letter on screen counts once a day for the reader's own stickers (Picky / Generous), across relaunches. */
export function markSeen(rec: DayRecord, id: string): { rec: DayRecord; counted: boolean } {
  if (rec.seen.includes(id)) return { rec, counted: false };
  return { rec: { ...rec, seen: [...rec.seen, id] }, counted: true };
}

/** One letter of today's desk as Next's ring draws it (Swift's KDeskRing, owner 2026-11-09). */
export type DeskTick = { id: string; state: "unread" | "read" | "replied" };

/**
 * Next's ring: today's whole desk in reading order, and the letter on
 * screen's place in it. What went past comes first (passed or answered), in
 * the order those letters first came on screen (`seen`): an answered letter
 * has left `desk`, so `seen` is the one list that still knows where it
 * stood. One gone past without being counted seen (a dev letter, an old
 * record) follows the seen ones, passed before answered. Then the letters not
 * passed, the one on screen first. The letter on screen counts as read; so
 * does one further on that was already on screen (a reload that dealt it
 * behind the current one); the rest are unread.
 */
export function deskTicks(rec: Pick<DayRecord, "passed" | "answered" | "seen">, unpassedIds: readonly string[]): { desk: DeskTick[]; at: number } {
  const replied = new Set(rec.answered);
  const gone = new Set([...rec.passed, ...rec.answered]);
  const seen = new Set(rec.seen);
  const order = [...rec.seen.filter((id) => gone.has(id)), ...rec.passed.filter((id) => !seen.has(id)), ...rec.answered.filter((id) => !seen.has(id))];
  const behind = order.map((id): DeskTick => ({ id, state: replied.has(id) ? "replied" : "read" }));
  const ahead = unpassedIds.map((id, i): DeskTick => ({ id, state: i === 0 || seen.has(id) ? "read" : "unread" }));
  return { desk: [...behind, ...ahead], at: behind.length };
}

/** The day's deal is done: nothing joins the desk until the morning. An empty deal stays open, so a quiet morning can still fill. */
export function freeze(rec: DayRecord, now: number): DayRecord {
  if (rec.dealtAt != null || rec.desk.length === 0) return rec;
  return { ...rec, dealtAt: now };
}

/** The first moment the desk was seen done (her letter's postmark). */
export function markDone(rec: DayRecord, now: number): DayRecord {
  if (rec.doneAt != null) return rec;
  return { ...rec, doneAt: now };
}

/* ── the seal ─────────────────────────────────────────────────────────── */

/**
 * What the day's sealed flag (lib/flags sealed:{day}) means held against
 * the desk. The desk wins: done is the only sealer and it is final for the
 * day (bring back is gated to reading, a frozen desk takes nothing new), so
 * a desk that is READING cannot be a sealed day — a flag over it outlived
 * its desk (an old blind's pull, a legacy { day, desk } record that filled
 * again under it, a day started over) and is stale: clear it, and the day
 * has its right to close again. Nothing is decided before the load: a
 * placeholder desk is reading too, but it isn't the day yet.
 * - "wait"   not loaded: leave everything as it is
 * - "stale"  reading, flagged: clear the flag, the day is open
 * - "open"   reading, no flag: the day is open
 * - "sealed" not reading, flagged: the day is sealed (a relaunch into a finished desk never seals again)
 * - "keep"   not reading, no flag: leave it (done may be sealing this moment)
 */
export type SealVerdict = "wait" | "stale" | "open" | "sealed" | "keep";

export function sealVerdict(a: { loaded: boolean; phase: DeskPhase; flagged: boolean }): SealVerdict {
  if (!a.loaded) return "wait";
  if (a.phase === "reading") return a.flagged ? "stale" : "open";
  return a.flagged ? "sealed" : "keep";
}

/* ── dealing ──────────────────────────────────────────────────────────── */

/** one page of the server's newest letters (fetchPool's default) */
export const POOL_PAGE = 40;

/** How a load treats the desk: deal it, fill an unfrozen desk, or (frozen) only prune it. */
export type LoadMode = "deal" | "fill" | "frozen";

export function loadMode(rec: DayRecord, placeholder: boolean): LoadMode {
  if (placeholder || (rec.desk.length === 0 && rec.dealtAt == null)) return "deal";
  return rec.dealtAt != null ? "frozen" : "fill";
}

/**
 * A reload lands on a desk already in use: every letter the server still
 * has stays where it is, and (unless the desk is frozen) the day's new ones
 * join at the end, up to the fifteen. `all` is one page of the newest
 * letters; when it is full, a letter missing from it may simply have aged
 * past it, so only the server's whole pool (`whole`: fetchPoolPage, read
 * from the page as sent, never from its length here — the page is filtered
 * on the phone first) can say a letter is gone.
 */
export function keepDesk<T extends { id: string }>(cur: readonly T[], all: readonly T[], whole: boolean, fresh: readonly T[], frozen = false): T[] {
  const alive = new Set(all.map((l) => l.id));
  const kept = whole ? cur.filter((l) => alive.has(l.id)) : [...cur];
  if (frozen) return kept.length === cur.length ? (cur as T[]) : kept;
  const seen = new Set(kept.map((l) => l.id));
  const add = fresh.filter((l) => !seen.has(l.id));
  return [...kept, ...add].slice(0, Math.max(kept.length, DAY_LETTERS));
}

/**
 * Deal the day onto a desk that may already show something (onboarding's
 * placeholder, or the first deal before the matcher answered). What the
 * reader has passed stays, in pass order, then the letter on screen; the
 * deal fills in behind them. Nothing swaps under the thumb.
 */
export function dealDesk<T extends { id: string }>(cur: readonly T[], passed: readonly string[], dealt: readonly T[]): T[] {
  const byId = new Map(cur.map((l) => [l.id, l]));
  const head: T[] = passed.map((id) => byId.get(id)).filter((l): l is T => !!l);
  const onScreen = unpassed(cur, passed)[0];
  if (onScreen) head.push(onScreen);
  const taken = new Set(head.map((l) => l.id));
  return [...head, ...dealt.filter((l) => !taken.has(l.id))].slice(0, Math.max(head.length, DAY_LETTERS));
}

/* ── her letter (the counted note) and the window ─────────────────────── */

export type WrenLetterFacts = { count: number; replied: number; waiting: number; canPlay: boolean };

/** Her counts (W33): letters that went past the desk today (passed + answered), the replies, the correspondences waiting on you. */
export function wrenLetterFacts({ rec, waiting, canPlay }: { rec: DayRecord; waiting: number; canPlay: boolean }): WrenLetterFacts {
  return { count: rec.passed.length + rec.answered.length, replied: rec.answered.length, waiting, canPlay };
}

/**
 * Her letter, line by line. Every clause is a count; a zero gets its own
 * sentence and an empty clause is left out. Then when she's back (the
 * reader's clock), and the invitation: with a lap of her game when she can
 * play, without it when she can't.
 */
export function wrenLetterLines(f: WrenLetterFacts, morning: string, t: TFn): string[] {
  const out: string[] = [];
  out.push(f.count === 0 ? t("wl.count.0") : f.count === 1 ? t("wl.count.1") : t("wl.count.N", { n: f.count }));
  if (f.replied > 0) out.push(f.replied === 1 ? t("wl.replied.1") : t("wl.replied.N", { n: f.replied }));
  if (f.waiting > 0) out.push(f.waiting === 1 ? t("wl.waiting.1") : t("wl.waiting.N", { n: f.waiting }));
  out.push(t("wl.next", { t: morning }));
  out.push(f.canPlay ? t("wl.invite") : t("wl.invitePlain"));
  return out;
}

/** "8H 06M": the hours and minutes to her return (minutes padded). */
export function countdownLabel(u: { h: number; m: number }, t: TFn): string {
  return t("ld.countdown", { h: u.h, m: String(u.m).padStart(2, "0") });
}

/** the first character as a reader sees it (a grapheme), so "Émile" gives É and an emoji stays whole */
function firstGrapheme(s: string): string {
  const name = s.trim();
  if (!name) return "";
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment: (x: string) => Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) {
    for (const g of new Seg(undefined, { granularity: "grapheme" }).segment(name)) return g.segment;
  }
  return Array.from(name)[0] ?? "";
}

export type WrenLetterVM = {
  /** FROM YOUR COURIER */
  from: string;
  /** "OCT.15 · 10:14 PM": when the desk was first seen done */
  stamp: string;
  lines: string[];
  /** "— W." */
  sign: string;
  /** the bag's label: OPENS AT 8:00 AM (no number: nothing is counted that isn't known) */
  bag: string;
  /** WREN IS BACK IN */
  foot: string;
  /** 8H 06M */
  countdown: string;
  /** NOT YET · 8H 06M (the bag's tap) */
  notYet: string;
  /** THAT'S ALL FOR TODAY (the letter's tap) */
  chip: string;
  a11y: string;
  /** the ⋯'s one item, "Bring back the last letter", while the last pass can still be undone
      ("" otherwise: no ⋯). Without it a mistaken pass of the day's last letter had no way back:
      the bring-back lives in a card's ⋯, and a done desk has no card (No. 1692, 2026-10-20). */
  bringBack: string;
  /** VoiceOver for that ⋯ (the cards' own) */
  more: string;
};

export function buildWrenLetter(
  { facts, name, doneAt, now, canBringBack = false }: { facts: WrenLetterFacts; name: string; doneAt: number | null; now: Date; canBringBack?: boolean },
  fmt: Pick<TodayFormat, "t" | "stampTime" | "clockHour">,
): WrenLetterVM {
  const { t } = fmt;
  const morning = fmt.clockHour(MORNING_HOUR);
  const countdown = countdownLabel(untilMorning(now), t);
  return {
    from: t("wl.from"),
    stamp: fmt.stampTime(doneAt ?? now.getTime()),
    lines: wrenLetterLines(facts, morning, t),
    sign: t("wl.sign", { initial: firstGrapheme(name).toLocaleUpperCase(), name }),
    bag: t("bag.opens", { t: morning }).toLocaleUpperCase(),
    foot: t("cod.nextPost", { name: name.toLocaleUpperCase() }),
    countdown,
    notYet: `${t("ld.notYet")} · ${countdown}`,
    chip: t("cod.wholePost"),
    a11y: t("wl.a11y", { name }),
    bringBack: canBringBack ? t("ld.bringBack") : "",
    more: t("rp.menu.a11y"),
  };
}

/** The window's sky, by the hour, in the game's own palette (hex). */
export type WindowSky = { top: string; bottom: string; pillarFill: string; pillarInk: string; text: string; stars: boolean; night: boolean };

/**
 * The sky from one of the courier card's palettes (components/CourierCard
 * PALETTE[daylight(hour)]); `night` is daylight === "night". The pipes take
 * the scene's scrim, outlined in the palette's chip (her moonlit ink at
 * night), and the words go white after dark.
 */
export function windowSky(p: { sky: readonly [string, string]; scrim: string; chip: string; text: string; stars: boolean }, night: boolean): WindowSky {
  return { top: p.sky[0], bottom: p.sky[1], pillarFill: p.scrim, pillarInk: night ? "#DAD6F2" : p.chip, text: night ? "#FFFFFF" : p.text, stars: p.stars, night };
}

export type WindowVM = { canPlay: boolean; eyebrow: string; line: string; a11yLabel: string; a11yHint: string; sky: WindowSky };

/** The window to her game. When she can't play (an egg, or wilted), it says when she's back instead of offering a lap. */
export function buildWindow({ canPlay, name, countdown, sky }: { canPlay: boolean; name: string; countdown: string; sky: WindowSky }, t: TFn): WindowVM {
  const line = canPlay ? t("win.fly", { name }) : `${t("cod.nextPost", { name: name.toLocaleUpperCase() })} ${countdown}`;
  return { canPlay, eyebrow: t("cod.wholePost"), line, a11yLabel: canPlay ? t("ff.title") : line, a11yHint: canPlay ? t("ff.hint") : "", sky };
}

/* ── Wren at rest on the band ─────────────────────────────────────────── */

/** the face she rests in on the band: content by day, sleepy in her night hours */
export type WrenRestFace = "idle" | "sleepy";
export type WrenRest = { face: WrenRestFace; wilt: boolean };

/**
 * How she stands on the band when nothing is happening (owner, 2026-10-18).
 * Her face is sleepy from 21:00 to 07:59 by the reader's own clock (lib/day
 * isNightHour, up to MORNING_HOUR), content otherwise; every reaction (the
 * lean, curious, delight, the hop, the errand) plays over it and comes back
 * to it. While she's starving (lib/hunger's wilt: the courier page's grey,
 * drooping pictures) she wears her wilted pictures, faces and all; a letter
 * written on the phone feeds her (noteFed), and she is back in her colours.
 * The renderers re-ask whenever the hour or her hunger changes.
 */
export function wrenRest({ hour, wilt }: { hour: number; wilt: boolean }): WrenRest {
  return { face: isNightHour(hour) ? "sleepy" : "idle", wilt };
}

/* ── the arrival ──────────────────────────────────────────────────────── */

/** the three letters she brought back on her first crossing */
export const ARRIVAL_LETTERS = 3;
/**
 * Whether her arrival shows: she has just come back AND there are letters
 * on the desk for it to be about. A quiet day and a first load with nothing
 * yet draw none — she never says "I brought back three" over nothing. The
 * first card's unfold follows the same rule. Decided here, so both
 * renderers agree.
 */
export const arrivalShows = ({ fresh, onDesk }: { fresh: boolean; onDesk: number }): boolean => fresh && onDesk > 0;
/** The arrival is over once three letters have been passed. */
export const arrivalSettled = (passedCount: number): boolean => passedCount >= ARRIVAL_LETTERS;

/** @deprecated the step-5 arrival's envelopes, for the scroll-stack renderers until integrate rewires them. */
export type EnvelopeState = "opened" | "current" | "sealed";
/** @deprecated see EnvelopeState */
export function envelopeStates(idx: number): EnvelopeState[] {
  return Array.from({ length: ARRIVAL_LETTERS }, (_, i) => (i < idx ? "opened" : i === idx ? "current" : "sealed"));
}

/* ── the card ─────────────────────────────────────────────────────────── */

/** the caption a voice letter is published with when the writer gave none */
export const DEFAULT_VOICE_CAPTION = "🎙 A voice letter";

/** A translation's state on one card. */
export type Translation = { text: string | null; on: boolean; busy: boolean };

/** The one capsule slot at the card's foot. A translation is drawn as the language pair (langPair reads `code`); `label` is what VoiceOver's translate action says, `value` the side showing. */
export type CardCapsule =
  | { kind: "none" }
  | { kind: "translate"; code: string; label: string; enabled: boolean; value: string }
  | { kind: "signal"; label: string; glyph: "rings" | "clock" | "stickers" };

/* ── who wrote it (identity-plan §9 + addendum: the slot in its final shape,
   so the names switch is a change of data, not of layout) ── */

export type { Zodiac } from "../../lib/zodiac";

/**
 * The writer, as the card header names them (lib/stranger-who StrangerWho):
 * - name: switch off "No. 7273" (penPal, title case); on, the courier's name ("Sunday Kite"); a deleted author UNSIGNED
 * - mark / markLabel: the she/he mark (an ink glyph in sub, 6pt after the name) and its VoiceOver word; null / "" when off or none
 * - sign / signLabel: the star sign (a line glyph 4pt after the mark) and its name; null / "" when off, none or opted out
 * - face: the FACE v1 mosaic (off), the frosted window (on: { kind: "frost", spec }), the veil (a deleted account)
 * - spoken: VoiceOver's words for the writer ("Sunday Kite, she, Gemini"; off, the name)
 */
export type CardWho = StrangerWho;

/** The book a builder uses: the caller's, or (none given) the switch off, from its penPal and t. */
export function bookOf(fmt: Pick<TodayFormat, "t" | "penPal" | "who">): WhoBook {
  return (
    fmt.who ??
    whoBook({
      identity: false,
      t: fmt.t,
      lang: "en",
      penPal: (uid, o) => (uid ? fmt.penPal(uid, { upper: !!o.upper, compact: !!o.compact }) : fmt.t("ld.unsigned")),
    })
  );
}

export type CardVM = {
  id: string;
  /** the writer: name, mark, sign, face, spoken. `postmark` / `mask` / `ghost` below carry the header as it is drawn today; the renderers move to `who` + `when` with the new header (and must, before the switch goes on: only `who` has the frost, the mark and the sign) */
  who: CardWho;
  /** "SEP.23": when it was posted, the date alone */
  when: string;
  /** "SEP.23 · NO.7273" or "SEP.23 · UNSIGNED"; switch on, "SEP.23 · SUNDAY KITE" */
  postmark: string;
  /** FACE v1 25-bit mask (fully in), or VEIL_MASK for a ghost — today's header, either way (the frost is who.face) */
  mask: number;
  /** the author deleted their account: the veil, in faint */
  ghost: boolean;
  stampId: string;
  /** the stamp's colour, for the tinted tile when its art is missing */
  stampHex: string;
  /** the stamp's name, for VoiceOver ("" hides the stamp from it) */
  stampName: string;
  /** "#made my day", lowercase (the writer picked it); "" for none */
  topic: string;
  topicWash: string;
  topicInk: string;
  topicLine: string;
  /** the text shown: the translation when it is on */
  body: string;
  bodySize: number;
  bodyLine: number;
  bodyCenter: boolean;
  isVoice: boolean;
  /** the voice letter's link is signed (else the card shows it unavailable — never the caption as the body) */
  voiceReady: boolean;
  /** the writer's caption, "" for the default one */
  caption: string;
  /** "1:14", "" when unknown */
  durationLabel: string;
  capsule: CardCapsule;
  /** the ⋯ menu: Report / Block (signed letters), then Bring back (the card on screen, after a pass); [] for none */
  menu: KMenuAction[];
  /** the reply field's placeholder for this letter: "write back to No. 7273…" (switch on, "write back to Sunday Kite…"), or "write back…" unsigned */
  replyPlaceholder: string;
  /** the paper the writer picked (letters.paper, src/data/papers.ts): the Swift card is drawn on it; null, missing or unknown is plain, the card as it always was */
  paper: PaperId;
  /** what VoiceOver reads for the whole card: off, "SEP.23 · NO.7273. #topic. …"; on, "Sunday Kite, she, Gemini. SEP.23. #topic. …" */
  a11yLabel: string;
  /** a dev sample (demo-): skips the counters, the read receipt and the pouch */
  demo: boolean;
};

export type CardInput = {
  letter: PoolLetter;
  /** the translate offer for this letter (needsTranslating and the language guess agree), or null */
  offer: { code: string } | null;
  xl?: Translation | null;
  signal: Signal | null;
  voiceReady: boolean;
};

/** The docket line: when it was posted and who by (the pen pal's number, "NO.7273" / "N.º7273"; switch on, the courier name in capitals), or UNSIGNED. */
export function docket(letter: Pick<PoolLetter, "created_at" | "author">, fmt: Pick<TodayFormat, "postmark" | "penPal" | "t" | "who">): string {
  return `${fmt.postmark(letter.created_at)} · ${letter.author ? bookOf(fmt).name(letter.author, { upper: true, compact: true }) : fmt.t("ld.unsigned")}`;
}

/** The capsule slot: translation wins (owner), else the signal, else nothing. */
export function capsuleFor(offer: { code: string } | null, xl: Translation | null | undefined, signal: Signal | null, fmt: Pick<TodayFormat, "t" | "stickerName">): CardCapsule {
  if (offer) {
    const on = !!(xl?.on && xl.text);
    const busy = !!xl?.busy;
    const [from, to] = offer.code.split("→");
    return {
      kind: "translate",
      // turned round once it is in yours: "EN←ES"
      code: on && to ? `${to}←${from}` : offer.code,
      label: busy ? fmt.t("mm.translating") : on ? fmt.t("mm.original") : fmt.t("read.invite"),
      enabled: !busy,
      value: on ? to ?? "" : from ?? "",
    };
  }
  if (!signal) return { kind: "none" };
  if (signal.kind === "close") return { kind: "signal", label: fmt.t("ld.close"), glyph: "rings" };
  return { kind: "signal", label: fmt.t("ld.both.label", { name: fmt.stickerName(signal.stickerId) }), glyph: signal.kind === "hour" ? "clock" : "stickers" };
}

/**
 * The pair a translate capsule's code names, for the language pair both renderers draw at the
 * foot (LangPair / KLangPair.pair, the owner's B1 brought back 2026-10-16): "ES→EN" reads left
 * to right with the original showing (`from` lit), "EN←ES" is the same pair turned round once
 * the letter is in yours (`to` lit). A code with neither arrow is one language, nothing to turn to.
 */
export function langPair(code: string): { from: string; to: string; on: boolean } {
  const back = code.indexOf("←");
  if (back >= 0) return { from: code.slice(back + 1), to: code.slice(0, back), on: true };
  const fwd = code.indexOf("→");
  if (fwd >= 0) return { from: code.slice(0, fwd), to: code.slice(fwd + 1), on: false };
  return { from: code, to: "", on: false };
}

/** The ⋯ menu of a desk letter: Report and Block, for anyone signed; then Bring back when it is offered (the only item on an unsigned letter). */
export function cardMenu(letter: Pick<PoolLetter, "author">, t: TFn, o: { bringBack: boolean } = { bringBack: false }): KMenuAction[] {
  const items: KMenuAction[] = letter.author
    ? [
        { key: "report", title: t("rp.menu.report"), icon: "flag", destructive: false },
        { key: "block", title: t("rp.menu.block"), icon: "nosign", destructive: true },
      ]
    : [];
  if (o.bringBack) items.push({ key: "bringBack", title: t("ld.bringBack"), icon: "arrow.uturn.backward", destructive: false });
  return items;
}

/** One desk letter as both renderers draw it. `surfaceHex` is the card's face (tk.sf): the topic tag's colours are worked out on it. */
export function buildCard(input: CardInput, surfaceHex: string, fmt: TodayFormat, o: { bringBack: boolean } = { bringBack: false }): CardVM {
  const { letter, offer, xl, signal, voiceReady } = input;
  const st = fmt.stamp(letter.stamp);
  const isVoice = letter.kind === "voice" && !!letter.media_path;
  const shown = xl?.on && xl.text ? xl.text : letter.body || "";
  const tier = letterTier(weightedCount(shown));
  const caption = isVoice && letter.body && letter.body !== DEFAULT_VOICE_CAPTION ? letter.body : "";
  const topic = st?.name ? `#${st.name.toLowerCase()}` : "";
  const colors = channelColors(st?.color ?? null, surfaceHex);
  const post = docket(letter, fmt);
  const ready = isVoice && voiceReady;
  const durationLabel = letter.duration_s && letter.duration_s > 0 ? fmt.clock(letter.duration_s) : "";
  const capsule: CardCapsule = isVoice ? (signal ? capsuleFor(null, null, signal, fmt) : { kind: "none" }) : capsuleFor(offer, xl, signal, fmt);
  /* the writer (identity-plan §9): switch off, their number in title case
     ("No. 7273"), no mark, no sign, the FACE v1 mosaic fully in; switch on,
     the courier's name, the mark and the sign as the identity client
     answered (none until it does), the frosted window. A deleted account
     is UNSIGNED behind the veil either way. */
  const book = bookOf(fmt);
  const who: CardWho = book.who(letter.author || null, { develop: 1 });
  const when = fmt.postmark(letter.created_at);
  /* WHAT VOICEOVER HEARS is everything the eye gets from the card, since it
     reads the card as one element (its children are ignored): who wrote it
     and when (off, the docket as it always read, "SEP.23 · NO.7273"; on,
     "{name}, {mark}, {sign}. {when}." — the plan's header label, never the
     number), the topic, why the matcher chose it (the lime capsule, beside
     the topic at the foot; a translate capsule is an action instead), then
     the letter — or, for a voice letter, that it is one, how long it is,
     that it can't play yet (its link isn't signed), and the writer's
     caption. */
  const why = capsule.kind === "signal" ? capsule.label : "";
  const words = isVoice ? [fmt.t("ld.voiceLetter"), durationLabel, ready ? "" : fmt.t("ld.voice.unavailable"), caption].filter(Boolean).join(". ") : shown;
  const head = book.identity ? [who.spoken, when] : [post];
  /* the paper (contract §4.1): plain says nothing; any other is named after the letter's words
     ("Written on Kraft paper."), the one thing the eye gets from it */
  const paper = paperIdOf(letter.paper);
  const onPaper = paper === "plain" ? "" : fmt.t("pp.a11y.onPaper", { name: fmt.t(paperOf(paper).nameKey) });
  return {
    id: letter.id,
    who,
    when,
    postmark: post,
    mask: letter.author ? mosaicMask(letter.author, 1) : VEIL_MASK,
    ghost: !letter.author,
    stampId: letter.stamp,
    stampHex: st?.color ?? "",
    stampName: st?.spoken ?? st?.name ?? "",
    topic,
    // the App Store tag (owner, 2026-10-19): the stamp's colour solid with ink #1E1B35 words in
    // every theme, Midnight too (white passes 4.5:1 on none of the bright hexes; stamps v3 contract
    // §8); no colour: the quiet grey #B9B5D0 (ink on it 8.3:1). kit topicTagLook draws the same;
    // the field names stay for the Swift record
    topicWash: st?.color ? st.color.toUpperCase() : TOPIC_TAG_NEUTRAL,
    topicInk: TOPIC_TAG_INK,
    topicLine: colors.line,
    body: isVoice ? "" : shown,
    bodySize: tier.size,
    bodyLine: tier.line,
    bodyCenter: tier.center,
    isVoice,
    voiceReady: ready,
    caption,
    durationLabel,
    capsule,
    menu: cardMenu(letter, fmt.t, o),
    /* the field names the writer as the header does (who.name). Switch on: id.writeBackTo, in all nine.
       Switch off: exactly as before — "write back to No. 7273…" where the language has ld.writeBackTo
       (English only), else its own "write back…" (the identity copy lives under id.*, so translating it
       never changed a switch-off screen) */
    replyPlaceholder: !letter.author ? fmt.t("ld.writeBackPh") : fmt.who?.identity ? fmt.t("id.writeBackTo", { name: who.name }) : (fmt.has?.("ld.writeBackTo") ?? true) ? fmt.t("ld.writeBackTo", { name: who.name }) : fmt.t("ld.writeBackPh"),
    paper,
    a11yLabel: withPaper([...head, topic, why, words].filter(Boolean).join(". "), onPaper),
    demo: letter.id.startsWith("demo"),
  };
}

/** The card's label with its paper's line after it: ". " between them, or a space when the letter already ends a sentence. */
function withPaper(label: string, onPaper: string): string {
  if (!onPaper) return label;
  if (!label) return onPaper;
  return label + (/[.!?…。！？]["'”’)]*$/.test(label) ? " " : ". ") + onPaper;
}

/** The cards in order; Bring back goes on the first (the one on screen) only, when `bringBackOnFirst` (canBringBack && reading). */
export function buildCards(inputs: readonly CardInput[], surfaceHex: string, fmt: TodayFormat, o: { bringBackOnFirst: boolean } = { bringBackOnFirst: false }): CardVM[] {
  return inputs.map((i, n) => buildCard(i, surfaceHex, fmt, { bringBack: o.bringBackOnFirst && n === 0 }));
}

/* ── the fold (the React Native card; Swift measures its own) ────────── */

/**
 * Whether a letter overflows its page, as the React Native card decides:
 * the measured height first (exact once the layout callback lands), with a
 * CJK-aware estimate as the floor beneath it — CJK packs about half as
 * many characters per line as Latin at the same size, which is why a fixed
 * threshold failed (a 325-weight Chinese letter is far past one page).
 */
export function overflows({ text, size, line, width, frameH, textH }: { text: string; size: number; line: number; width: number; frameH: number; textH: number }): boolean {
  const weighted = weightedCount(text);
  const cjk = (text.match(/[㐀-鿿]/g) || []).length > text.length * 0.3;
  const perLine = Math.max(8, Math.round(width / (size * (cjk ? 1 : 0.52))));
  const lines = frameH > 0 ? Math.floor(frameH / line) : 22;
  const measured = frameH > 0 && textH > frameH + line;
  return measured || weighted > perLine * lines;
}

/* ── the reply ────────────────────────────────────────────────────────── */

export type SendState = "disabled" | "enabled" | "dimmed";

/** What the reply strip shows for the words typed for one letter. */
export type ReplyState = {
  /** 2..1000 weighted: the words may go */
  ok: boolean;
  sendState: SendState;
  hint: string;
  /** the hint in the postmark red (over the limit) */
  hintWarn: boolean;
  /** the pouch is full for this letter (a dev letter never counts) */
  pouchFull: boolean;
};

/**
 * The send key and the hint. Empty or not 2..1000 (or a send in flight):
 * disabled. Fine but the pouch is full: dimmed, still tappable, so the
 * sheet can say why (owner: "a full pouch dims the plane before the tap,
 * not after"). Otherwise enabled. The hint: a send taking longer than a
 * send takes says so ("a headwind — she's still flying", net.slow: the line
 * the fly-by carried before the band took the send over), then over the
 * limit (red), five in flight, a thread opens with the words, or the
 * resting line.
 */
export function replyState(
  { text, flights, demo, forceFull = false, sending = false, slow = false }: { text: string; flights: number; demo: boolean; forceFull?: boolean; sending?: boolean; slow?: boolean },
  t: TFn,
): ReplyState {
  // weighed as it is sent: trimmed
  const w = weightedCount(text.trim());
  const ok = w >= REPLY_MIN && w <= LETTER_MAX;
  const pouchFull = forceFull || (!demo && flights >= MAX_IN_FLIGHT);
  const over = w - LETTER_MAX;
  const sendState: SendState = !ok || sending ? "disabled" : pouchFull ? "dimmed" : "enabled";
  const hint =
    sending && slow
      ? t("net.slow")
      : over > 0
        ? t("ui.overLimit", { n: String(over) })
        : pouchFull
          ? t("ld.flightFull")
          : ok
            ? t("ld.threadOpensTwo")
            : t("ld.replyThreadOpens");
  return { ok, sendState, hint, hintWarn: over > 0, pouchFull };
}

/** The first line of a draft ("" shows the placeholder). */
export function draftPreview(text: string): string {
  const first = text.trim().split("\n")[0] ?? "";
  return first.length > 80 ? first.slice(0, 80).trimEnd() + "…" : first;
}

/** What a reply that didn't go does. A guest is asked to sign in (the letter resumes after); a letter
    taken back, or whose writer left or blocked the reader, leaves the desk (ld.unreachable, never
    "try again"); everything else keeps the words in the box. */
export function replyFailAction(kind: WriteFail | null | undefined, isGuest: boolean): "signup" | "remove" | "keep" {
  if (isGuest) return "signup";
  return kind === "gone" || kind === "blocked" ? "remove" : "keep";
}

/* ── the geometry (KTodayGeometry in Swift: change them together) ────── */

/** the title band, fixed in layout (the title shrinks inside it) */
export const BAND = 52;
/** the card sits this far under the band */
export const CONTENT_TOP = 4;
/** between the card's foot and the control band (NEXT · Wren · REPLY) */
export const CARD_AIR = 14;
/** the control band's height: NEXT, REPLY and Wren on the page ground between them (the owner's 2026-10-16 pick) */
export const CONTROL_H = 68;
/** the band's bottom sits this far above the tab bar's room */
export const CONTROL_LIFT = 2;
/** the shortest card (an iPhone SE still gets a letter, not a strip) */
export const CARD_MIN = 360;
/** the page's side gutter */
export const GUTTER = 16;

/** y from the Host's top */
export type DeskGeometry = { cardTop: number; cardH: number; controlTop: number };

/**
 * The desk's numbers from the Host's height. The card scales with the
 * screen (owner): what is left under the band once the control band and
 * its air above the tab bar are taken out, never under 360. A 393 × 852
 * phone (top 54, room 98) gives the card at 110, 560 tall, the band at
 * 684.
 */
export function deskGeometry({ hostH, safeTop, tabBarRoom }: { hostH: number; safeTop: number; tabBarRoom: number }): DeskGeometry {
  const cardTop = safeTop + BAND + CONTENT_TOP;
  const cardH = Math.max(CARD_MIN, Math.round(hostH - cardTop - CARD_AIR - CONTROL_H - (tabBarRoom + CONTROL_LIFT)));
  return { cardTop, cardH, controlTop: cardTop + cardH + CARD_AIR };
}

/* ── writing back (the chat composers' A1, owner 2026-10-18; KTodayGeometry.replyCardHeight
   and KCardText.compact in Swift: change them together) ──
   While the reader writes back, the band fades, the tab bar slides away and the card shrinks
   to make room: its top stays, its foot comes up to CARD_AIR over the hint, which stands 6 over
   the reply bar, which stands REPLY_GAP over the keyboard (or on the tab bar's own line with a
   hardware keyboard). The prototype's 548 → 272 on an 852 phone, from the real keyboard and the
   bar as drawn. */

/** the reply bar's air over the keyboard */
export const REPLY_GAP = 12;
/** the shortest the card shrinks to while replying: the docket, two lines folded with UNFOLD, the foot */
export const REPLY_CARD_MIN = 200;
/** the letter's size while replying: the prototype's 29 → 20 */
export const REPLY_BODY_SIZE = 20;

/**
 * The card's height while replying, or null when it needn't shrink (a
 * hardware keyboard's bar under its foot). `keyboard` is its overlap at the
 * Host's bottom (0 for none), `strip` the hint and the bar as drawn, and
 * `bottomGap` the tab bar's own line (barBottomGap) where the bar sits with
 * no software keyboard.
 */
export function replyCardHeight(
  geometry: DeskGeometry,
  { hostH, keyboard, strip, bottomGap }: { hostH: number; keyboard: number; strip: number; bottomGap: number },
): number | null {
  const barBottom = Math.max(keyboard + REPLY_GAP, bottomGap);
  const fit = Math.floor(hostH - barBottom - strip - CARD_AIR - geometry.cardTop);
  if (fit >= geometry.cardH) return null;
  return Math.max(REPLY_CARD_MIN, fit);
}

/** The letter's tier while replying: no more than REPLY_BODY_SIZE, its leading scaled with it (a tier already at or under it keeps its own). */
export function replyBody({ size, line }: { size: number; line: number }): { size: number; line: number } {
  if (size <= REPLY_BODY_SIZE) return { size, line };
  return { size: REPLY_BODY_SIZE, line: (line * REPLY_BODY_SIZE) / size };
}
