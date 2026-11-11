import { MORNING_HOUR, deskDay } from "./day";
import { accountDay } from "./fc-rollout-core";

/* TODAY, AFTER FIFTEEN — THE RULES (docs/today-after-fifteen.md; the owner's decisions of
   2026-11-11). Pure: dates and strings in, decisions out, so
     node src/lib/after-fifteen-core.test.ts
   locks them. Nothing here reads the clock, the store or the language.

   When the day's last letter has gone past, Today shows one of three pages until the desk's
   day turns: the mailbox (box), the receipt, bedtime. Each carries one small daily thing: a
   line of the day, or one of the courier's facts. This file decides
   - which page (choosePage): by the account's day, the weekday and the hour the desk was
     finished, and whether bedtime keeps being skipped. Never by who the reader is;
   - the days that count for the one streak (streakRun, streakDots): the reader finished the
     day's letters or wrote something. First Class's boarding pass reads the same days
     (lib/fc-rollout-core activeDays);
   - the reading timer's sums (addDwell, readMs, lingered): the phone times the letter on
     screen, and nothing may say "lingered" that the timer didn't see;
   - the line (opening, isHeavy, noteLetter, pickLine): the opening of a letter the reader wrote
     back to, else of the one they stayed on longest and long enough; never a chosen "best"
     line, never from a heavy letter;
   - whose turn it is (chooseThing): a line after a fact, a fact after a line, a fact when there
     is no real line, always a fact on the receipt;
   - the receipt's totals (dayLog, weekTotals): only days this phone logged;
   - and the record the phone keeps (AfterState and its moves): what was decided for today, what
     the reader did with it, the finished days, the last evenings bedtime was offered. */

/* ── days as keys ─────────────────────────────────────────────────────── */

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-11" → that day at local noon (noon, so a clock change never moves the date) */
function noonOf(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

const keyOf = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** the day `n` days after `key` (before it, for a negative n) */
export function shiftDay(key: string, n: number): string {
  const d = noonOf(key);
  d.setDate(d.getDate() + n);
  return keyOf(d);
}

/** whole days from `a` to `b` (positive when b is later) */
export function daysApart(a: string, b: string): number {
  return Math.round((noonOf(b).getTime() - noonOf(a).getTime()) / 86400000);
}

/** 0 = Sunday … 6 = Saturday */
export const weekdayOf = (key: string): number => noonOf(key).getDay();

/* ── which page ───────────────────────────────────────────────────────── */

export type AfterPage = "box" | "receipt" | "bedtime";

/** an evening bedtime was the page, and whether Lights out was reached before the day turned */
export type AfterNight = { day: string; done: boolean };

/** bedtime is for a desk finished from this hour on (and after midnight, before the morning) */
export const BEDTIME_HOUR = 20;
/** this many offered bedtimes in a row without Lights out, and evenings go back to the mailbox */
export const SKIPS_TO_REST = 3;
/** …until this many days after bedtime was last offered, when it is offered once more */
export const BEDTIME_RETRY_DAYS = 7;

export type PageFacts = {
  /** the account's created_at, epoch ms; null when unknown (a guest before sign-up, a failed read) */
  createdAt: number | null;
  /** when the desk was finished, epoch ms */
  doneAt: number;
  /** she is out of the egg (an egg has no bedtime) */
  hatched: boolean;
  /** the evenings bedtime was offered before today, oldest first */
  nights: readonly AfterNight[];
};

/** the desk was finished in the evening: 20:00 or later, or after midnight before she is back */
export function isEvening(doneAt: number): boolean {
  const h = new Date(doneAt).getHours();
  return h >= BEDTIME_HOUR || h < MORNING_HOUR;
}

/** Bedtime keeps being skipped: the last SKIPS_TO_REST offers all ended without Lights out, and the last was under BEDTIME_RETRY_DAYS ago. */
export function bedtimeResting(nights: readonly AfterNight[], today: string): boolean {
  const before = nights.filter((n) => n.day !== today);
  if (before.length < SKIPS_TO_REST) return false;
  const last = before.slice(-SKIPS_TO_REST);
  if (last.some((n) => n.done)) return false;
  return daysApart(last[last.length - 1].day, today) < BEDTIME_RETRY_DAYS;
}

/**
 * The page for a desk just finished. In order: days 1–2 of the account (or its age unknown) the
 * mailbox; a Sunday desk the receipt; an evening finish bedtime, unless she is an egg or bedtime
 * keeps being skipped; otherwise the mailbox.
 */
export function choosePage(f: PageFacts): AfterPage {
  const today = deskDay(new Date(f.doneAt));
  if (f.createdAt == null || accountDay(f.createdAt, f.doneAt) <= 2) return "box";
  if (weekdayOf(today) === 0) return "receipt";
  if (isEvening(f.doneAt) && f.hatched && !bedtimeResting(f.nights, today)) return "bedtime";
  return "box";
}

/* ── the one streak ───────────────────────────────────────────────────── */

/** days in a row that count, ending on `today` (0 when today itself doesn't count) */
export function streakRun(days: ReadonlySet<string>, today: string): number {
  let n = 0;
  let key = today;
  while (days.has(key)) {
    n++;
    key = shiftDay(key, -1);
  }
  return n;
}

export type StreakDot = { key: string; weekday: number; on: boolean; tonight: boolean };

/** bedtime's seven dots: the last seven days, tonight last */
export function streakDots(days: ReadonlySet<string>, today: string): StreakDot[] {
  return Array.from({ length: 7 }, (_, i) => {
    const key = shiftDay(today, i - 6);
    return { key, weekday: weekdayOf(key), on: days.has(key), tonight: i === 6 };
  });
}

/* ── the reading timer ────────────────────────────────────────────────── */

/** a letter is timed for at most this long: a phone left on the table doesn't win */
export const DWELL_CAP_MS = 5 * 60 * 1000;
/** staying on a letter means at least this long… */
export const LINGER_MIN_MS = 20 * 1000;
/** …and at least this many times what its length takes to read */
export const LINGER_TIMES = 2;

/** `add` more milliseconds on letter `id`, capped. The same object back when nothing changes. */
export function addDwell(ms: Readonly<Record<string, number>>, id: string, add: number): Record<string, number> {
  const had = ms[id] ?? 0;
  if (!id || !(add > 0) || had >= DWELL_CAP_MS) return ms as Record<string, number>;
  return { ...ms, [id]: Math.min(DWELL_CAP_MS, had + add) };
}

const CJK = /[぀-ヿ㐀-䶿一-鿿가-힯]/g;

/** what a letter's length takes to read, in ms: four words a second, eight CJK characters a second */
export function readMs(body: string): number {
  const cjk = (body.match(CJK) ?? []).length;
  const words = body.replace(CJK, " ").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  return Math.round((words / 4 + cjk / 8) * 1000);
}

/** the reader stayed on it: long enough in itself, and well past the time its length needs */
export function lingered(need: number, dwell: number): boolean {
  return dwell >= LINGER_MIN_MS && dwell >= LINGER_TIMES * need;
}

/* ── the line ─────────────────────────────────────────────────────────── */

/** a first sentence shorter than this takes the second with it ("Hi." is not a line) */
export const OPENING_MIN = 16;
/** an opening longer than this is no line (a stranger's sentence is never cut short) */
export const OPENING_MAX = 140;

const ENDERS = ".!?…。！？";
const CLOSERS = "\"'”’»）)」』】";
const CJK_ENDERS = "。！？";

/** where the sentence starting at `from` ends (the index after it), or -1 when the text runs out first */
function sentenceEnd(s: string, from: number): number {
  for (let i = from; i < s.length; i++) {
    const c = s[i];
    if (c === "\n") return i;
    if (!ENDERS.includes(c)) continue;
    let j = i + 1;
    while (j < s.length && ENDERS.includes(s[j])) j++;
    while (j < s.length && CLOSERS.includes(s[j])) j++;
    // "3.5" and "e.g.x" are not ends: a Latin ender wants a gap or the end after it
    if (CJK_ENDERS.includes(c) || j >= s.length || /\s/.test(s[j])) return j;
  }
  return -1;
}

const tidy = (s: string) => s.replace(/\s+/g, " ").trim();
const chars = (s: string) => Array.from(s).length;

/**
 * A letter's opening, as its line: the first sentence; with the second when the first is under
 * OPENING_MIN characters. Null when there are no words, or it runs past OPENING_MAX: the line is
 * the writer's sentence whole or it is nothing. Never a sentence chosen for being good.
 */
export function opening(body: string): string | null {
  const text = body.replace(/\r/g, "").trim();
  if (!text) return null;
  const first = sentenceEnd(text, 0);
  let cut = first < 0 ? text.length : first;
  if (chars(tidy(text.slice(0, cut))) < OPENING_MIN && cut < text.length) {
    let from = cut;
    while (from < text.length && /\s/.test(text[from])) from++;
    if (from < text.length) {
      const second = sentenceEnd(text, from);
      cut = second < 0 ? text.length : second;
    }
  }
  const line = tidy(text.slice(0, cut));
  if (!line || !/[\p{L}\p{N}]/u.test(line) || chars(line) > OPENING_MAX) return null;
  return line;
}

/** topics that are heavy by their name: a letter under one gives no line */
export const HEAVY_STAMPS: ReadonlySet<string> = new Set(["grief", "whats-the-point", "spiral", "intrusive"]);

/* The care list: words that mark a letter as one not to quote on a cheerful end-of-day page.
   Deliberately broad (a false match only means "no line from this letter", which costs
   nothing). Latin-script entries match whole words, or a word's start when they end in "*";
   CJK entries match anywhere. Languages: the app's nine, and Chinese (letters arrive in it). */
const CARE_WORDS: readonly string[] = [
  // en
  "suicide", "suicidal", "kill myself", "killing myself", "end it all", "want to die", "wanna die", "self-harm", "self harm", "hurt myself", "overdose*",
  "died", "dying", "death", "dead", "funeral", "passed away", "cancer", "tumor", "tumour", "miscarriage", "hospice", "abus*", "assault*", "rape", "raped", "molest*",
  // es
  "suicid*", "matarme", "quitarme la vida", "morir", "morirme", "murió", "muerte", "muerto", "muerta", "falleció", "funeral", "entierro", "cáncer", "violación", "aborto",
  // pt
  "suicíd*", "me matar", "morrer", "morreu", "morte", "morto", "morta", "faleceu", "velório", "enterro", "câncer", "cancro", "estupro", "automutila*",
  // id
  "bunuh diri", "meninggal", "kematian", "pemakaman", "kanker", "pelecehan", "perkosa*", "melukai diri",
  // fr
  "me tuer", "mourir", "mort", "morte", "décédé", "décédée", "décès", "enterrement", "funérailles", "viol", "violée", "fausse couche", "automutil*",
  // de
  "suizid*", "selbstmord*", "umbringen", "sterben", "gestorben", "tod", "tot", "beerdigung", "krebs", "missbrauch*", "vergewaltig*", "fehlgeburt", "ritzen",
  // it
  "uccidermi", "morire", "morto", "morta", "morte", "funerale", "tumore", "stupro", "aborto spontaneo", "autolesion*",
  // ja
  "自殺", "死にたい", "死んだ", "死んで", "亡くな", "葬式", "葬儀", "癌", "がん", "ガン", "虐待", "自傷", "消えたい", "流産",
  // ko
  "자살", "죽고 싶", "죽었", "죽음", "돌아가셨", "장례", "암에", "암으로", "학대", "자해", "유산했",
  // zh
  "自杀", "想死", "去世", "过世", "葬礼", "癌", "虐待", "自残", "流产",
];

const isCjkWord = (w: string) => /[぀-ヿ㐀-鿿가-힯]/.test(w);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const CARE_CJK = CARE_WORDS.filter(isCjkWord);
const CARE_LATIN = new RegExp(
  "(?<![\\p{L}\\p{N}])(?:" +
    CARE_WORDS.filter((w) => !isCjkWord(w))
      .map((w) => (w.endsWith("*") ? escapeRe(w.slice(0, -1)) + "[\\p{L}]*" : escapeRe(w)))
      .join("|") +
    ")(?![\\p{L}\\p{N}])",
  "iu",
);

/** A heavy letter: its topic is one of the heavy ones, or its words are on the care list. */
export function isHeavy(letter: { stamp: string; body: string }): boolean {
  if (HEAVY_STAMPS.has(letter.stamp)) return true;
  if (CARE_LATIN.test(letter.body)) return true;
  return CARE_CJK.some((w) => letter.body.includes(w));
}

/** What the phone notes about a letter while it is on screen: enough to offer its line later, and no more. */
export type LetterNote = {
  /** the letter's stamp id (a photo stamp is "c:<uuid>") */
  stamp: string;
  /** its opening; null when it gives no line (a voice letter, a heavy one, no opening that fits) */
  line: string | null;
  /** what its length takes to read, ms */
  need: number;
  /** who wrote it, as the card showed them */
  who: string;
  /** when it was written (ISO) */
  at: string;
};

export function noteLetter(l: { stamp: string; body: string; kind?: "text" | "voice"; created_at: string }, who: string): LetterNote {
  const voice = l.kind === "voice";
  const line = voice || isHeavy(l) ? null : opening(l.body);
  return { stamp: l.stamp, line, need: voice ? 0 : readMs(l.body), who, at: l.created_at };
}

export type LinePick = { id: string; why: "replied" | "stayed" };

/**
 * The letter whose opening is today's line, or null. One the reader wrote back to (with several,
 * the one stayed on longest; the first answered when the timer has nothing to say); else the one
 * stayed on longest, if the timer says they stayed (lingered).
 */
export function pickLine(a: { notes: Readonly<Record<string, LetterNote>>; answered: readonly string[]; dwell: Readonly<Record<string, number>> }): LinePick | null {
  const has = (id: string) => a.notes[id]?.line != null;
  let best: string | null = null;
  for (const id of a.answered) {
    if (!has(id)) continue;
    if (best == null || (a.dwell[id] ?? 0) > (a.dwell[best] ?? 0)) best = id;
  }
  if (best != null) return { id: best, why: "replied" };
  for (const id of Object.keys(a.notes)) {
    if (!has(id) || !lingered(a.notes[id].need, a.dwell[id] ?? 0)) continue;
    if (best == null || a.dwell[id] > a.dwell[best]) best = id;
  }
  return best != null ? { id: best, why: "stayed" } : null;
}

/* ── whose turn ───────────────────────────────────────────────────────── */

export type AfterKind = "fact" | "line";

export type Thing =
  | { kind: "fact"; no: number }
  | { kind: "line"; id: string; text: string; who: string; stamp: string; at: string; why: "replied" | "stayed" };

/**
 * Today's small thing. The receipt always prints a fact. Otherwise they take turns: a line when
 * the last one given was a fact and there is a real line today; else the next fact. Facts go in
 * order from NO. 1 for each reader and start again after the last.
 */
export function chooseThing(a: {
  page: AfterPage;
  lastKind: AfterKind | null;
  /** the next fact's number, from 1 */
  factNext: number;
  /** how many facts there are */
  factCount: number;
  pick: LinePick | null;
  notes: Readonly<Record<string, LetterNote>>;
}): { thing: Thing; factNext: number; lastKind: AfterKind } {
  const note = a.pick ? a.notes[a.pick.id] : undefined;
  if (a.page !== "receipt" && a.lastKind === "fact" && a.pick && note?.line) {
    return {
      thing: { kind: "line", id: a.pick.id, text: note.line, who: note.who, stamp: note.stamp, at: note.at, why: a.pick.why },
      factNext: a.factNext,
      lastKind: "line",
    };
  }
  const count = Math.max(1, a.factCount);
  const no = ((Math.max(1, a.factNext) - 1) % count) + 1;
  return { thing: { kind: "fact", no }, factNext: no + 1, lastKind: "fact" };
}

/* ── the receipt's numbers ────────────────────────────────────────────── */

/** one desk day as the phone logged it */
export type DayLog = {
  /** letters that went past (passed or answered) */
  read: number;
  /** of those, written back to */
  replied: number;
  /** ms stayed, by stamp, for the letters the timer says the reader stayed on */
  stay: Record<string, number>;
};

export function dayLog(a: { read: number; replied: number; notes: Readonly<Record<string, LetterNote>>; dwell: Readonly<Record<string, number>> }): DayLog {
  const stay: Record<string, number> = {};
  for (const id of Object.keys(a.notes)) {
    const n = a.notes[id];
    const ms = a.dwell[id] ?? 0;
    if (n.need > 0 && lingered(n.need, ms)) stay[n.stamp] = (stay[n.stamp] ?? 0) + ms;
  }
  return { read: a.read, replied: a.replied, stay };
}

/** the stamp stayed on longest, or null when the timer saw no staying */
export function topStay(stay: Readonly<Record<string, number>>): string | null {
  let best: string | null = null;
  for (const k of Object.keys(stay).sort()) if (best == null || stay[k] > stay[best]) best = k;
  return best;
}

export type Totals = { read: number; replied: number; stay: string | null; from: string; to: string; days: number };

/** The last seven desk days ending today, summed over the days the phone logged (`from` is the first of them). */
export function weekTotals(days: Readonly<Record<string, DayLog>>, today: string): Totals {
  let read = 0;
  let replied = 0;
  let n = 0;
  let from = today;
  const stay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const key = shiftDay(today, -i);
    const d = days[key];
    if (!d) continue;
    if (n === 0) from = key;
    n++;
    read += d.read;
    replied += d.replied;
    for (const k of Object.keys(d.stay)) stay[k] = (stay[k] ?? 0) + d.stay[k];
  }
  return { read, replied, stay: topStay(stay), from, to: today, days: n };
}

/** One day's totals, in the week's shape. */
export function dayTotals(d: DayLog | undefined, today: string): Totals {
  return { read: d?.read ?? 0, replied: d?.replied ?? 0, stay: d ? topStay(d.stay) : null, from: today, to: today, days: d ? 1 : 0 };
}

/* ── what the phone keeps ─────────────────────────────────────────────── */

export type ReceiptPhase = "idle" | "printed" | "torn";

/** today's page, its thing, and what the reader has done with them */
export type AfterToday = {
  day: string;
  page: AfterPage;
  thing: Thing;
  /** when the desk was finished (the receipt's time) */
  doneAt: number;
  /** the last letter was brought back: the page is put away until the desk is finished again */
  open: boolean;
  /** the Lore entry the thing was kept as, or null */
  kept: string | null;
  /** the mailbox: the shutter is down */
  shut: boolean;
  receipt: ReceiptPhase;
  /** bedtime's steps */
  fed: boolean;
  pat: boolean;
  asleep: boolean;
};

export type AfterState = {
  v: 1;
  /** desk days finished, oldest first */
  finished: string[];
  /** the last desk days, by key */
  days: Record<string, DayLog>;
  /** the desk day being read: the timer's sums and the notes on its letters */
  desk: { day: string; ms: Record<string, number>; notes: Record<string, LetterNote> };
  today: AfterToday | null;
  /** the last evenings bedtime was the page, oldest first */
  nights: AfterNight[];
  lastKind: AfterKind | null;
  factNext: number;
};

const KEEP_FINISHED = 400;
const KEEP_DAYS = 21;
const KEEP_NIGHTS = 12;

export function emptyAfter(): AfterState {
  return { v: 1, finished: [], days: {}, desk: { day: "", ms: {}, notes: {} }, today: null, nights: [], lastKind: null, factNext: 1 };
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const strs = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === "string") : []);
const numMap = (x: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (isObj(x)) for (const k of Object.keys(x)) if (typeof x[k] === "number" && Number.isFinite(x[k] as number)) out[k] = x[k] as number;
  return out;
};

function readThing(x: unknown): Thing | null {
  if (!isObj(x)) return null;
  if (x.kind === "fact" && typeof x.no === "number" && x.no >= 1) return { kind: "fact", no: Math.floor(x.no) };
  if (x.kind === "line" && typeof x.id === "string" && typeof x.text === "string" && x.text) {
    return { kind: "line", id: x.id, text: x.text, who: typeof x.who === "string" ? x.who : "", stamp: typeof x.stamp === "string" ? x.stamp : "", at: typeof x.at === "string" ? x.at : "", why: x.why === "stayed" ? "stayed" : "replied" };
  }
  return null;
}

/** What the store holds, read back. Anything unreadable is left out rather than guessed; nothing at all gives an empty record. */
export function readAfter(raw: string | null): AfterState {
  const s = emptyAfter();
  if (!raw) return s;
  let c: unknown;
  try {
    c = JSON.parse(raw);
  } catch {
    return s;
  }
  if (!isObj(c) || c.v !== 1) return s;
  s.finished = strs(c.finished);
  if (isObj(c.days)) {
    for (const k of Object.keys(c.days)) {
      const d = c.days[k];
      if (isObj(d) && typeof d.read === "number" && typeof d.replied === "number") s.days[k] = { read: d.read, replied: d.replied, stay: numMap(d.stay) };
    }
  }
  if (isObj(c.desk) && typeof c.desk.day === "string") {
    const notes: Record<string, LetterNote> = {};
    if (isObj(c.desk.notes)) {
      for (const k of Object.keys(c.desk.notes)) {
        const n = c.desk.notes[k];
        if (isObj(n) && typeof n.stamp === "string") {
          notes[k] = { stamp: n.stamp, line: typeof n.line === "string" ? n.line : null, need: typeof n.need === "number" ? n.need : 0, who: typeof n.who === "string" ? n.who : "", at: typeof n.at === "string" ? n.at : "" };
        }
      }
    }
    s.desk = { day: c.desk.day, ms: numMap(c.desk.ms), notes };
  }
  if (isObj(c.today) && typeof c.today.day === "string") {
    const t = c.today;
    const thing = readThing(t.thing);
    const page = t.page === "receipt" || t.page === "bedtime" || t.page === "box" ? t.page : null;
    if (thing && page) {
      s.today = {
        day: t.day as string,
        page,
        thing,
        doneAt: typeof t.doneAt === "number" ? t.doneAt : 0,
        open: t.open === true,
        kept: typeof t.kept === "string" ? t.kept : null,
        shut: t.shut === true,
        receipt: t.receipt === "printed" || t.receipt === "torn" ? t.receipt : "idle",
        fed: t.fed === true,
        pat: t.pat === true,
        asleep: t.asleep === true,
      };
    }
  }
  if (Array.isArray(c.nights)) s.nights = c.nights.filter((n): n is AfterNight => isObj(n) && typeof n.day === "string" && typeof n.done === "boolean").map((n) => ({ day: n.day, done: n.done }));
  s.lastKind = c.lastKind === "fact" || c.lastKind === "line" ? c.lastKind : null;
  s.factNext = typeof c.factNext === "number" && c.factNext >= 1 ? Math.floor(c.factNext) : 1;
  return s;
}

/**
 * The desk's day is `day` now. A record of another day gives up its timer and its notes, and its
 * page: an evening that had bedtime joins the nights, with whether Lights out was reached. Old
 * logs are dropped. The same object back when the day hasn't turned.
 */
export function turnDay(s: AfterState, day: string): AfterState {
  if (s.desk.day === day && (!s.today || s.today.day === day)) return s;
  let nights = s.nights;
  const was = s.today;
  if (was && was.day !== day && was.page === "bedtime" && !was.open && !nights.some((n) => n.day === was.day)) {
    nights = [...nights, { day: was.day, done: was.asleep }].slice(-KEEP_NIGHTS);
  }
  const days: Record<string, DayLog> = {};
  for (const k of Object.keys(s.days)) if (daysApart(k, day) < KEEP_DAYS) days[k] = s.days[k];
  return {
    ...s,
    days,
    nights,
    today: was && was.day === day ? was : null,
    desk: s.desk.day === day ? s.desk : { day, ms: {}, notes: {} },
  };
}

/** A letter came on screen: what the phone notes about it (once; the first note stands). */
export function withNote(s: AfterState, id: string, note: LetterNote): AfterState {
  if (!id || s.desk.notes[id]) return s;
  return { ...s, desk: { ...s.desk, notes: { ...s.desk.notes, [id]: note } } };
}

/** The timer saw `add` more ms on letter `id`. */
export function withDwell(s: AfterState, id: string, add: number): AfterState {
  const ms = addDwell(s.desk.ms, id, add);
  return ms === s.desk.ms ? s : { ...s, desk: { ...s.desk, ms } };
}

/** The day's counts as they stand (kept for the receipt whether or not the desk gets finished). */
export function withLog(s: AfterState, day: string, counts: { read: number; replied: number }): AfterState {
  if (s.desk.day !== day) return s;
  const log = dayLog({ ...counts, notes: s.desk.notes, dwell: s.desk.ms });
  const had = s.days[day];
  if (had && had.read === log.read && had.replied === log.replied && JSON.stringify(had.stay) === JSON.stringify(log.stay)) return s;
  return { ...s, days: { ...s.days, [day]: log } };
}

export type SettleFacts = {
  day: string;
  doneAt: number;
  createdAt: number | null;
  hatched: boolean;
  /** ids answered today, in order */
  answered: readonly string[];
  read: number;
  factCount: number;
};

/**
 * The desk is done. Once a day: the day joins the finished days, its page is chosen and its thing
 * with it. Finished again after the last letter was brought back: the page is chosen again (the
 * hour may have changed), the thing stays (a fact's number is not spent twice). Already settled:
 * the same object back.
 */
export function settle(s0: AfterState, f: SettleFacts): AfterState {
  const s = withLog(turnDay(s0, f.day), f.day, { read: f.read, replied: f.answered.length });
  if (s.today && s.today.day === f.day && !s.today.open) return s;
  const finished = s.finished.includes(f.day) ? s.finished : [...s.finished, f.day].slice(-KEEP_FINISHED);
  const page = choosePage({ createdAt: f.createdAt, doneAt: f.doneAt, hatched: f.hatched, nights: s.nights });
  if (s.today && s.today.day === f.day) {
    // the receipt only prints facts: a line chosen before the reopen can't follow the page there
    const keep = !(page === "receipt" && s.today.thing.kind === "line");
    if (keep) return { ...s, finished, today: { ...s.today, page, doneAt: f.doneAt, open: false } };
  }
  const pick = pickLine({ notes: s.desk.notes, answered: f.answered, dwell: s.desk.ms });
  const turn = chooseThing({ page, lastKind: s.lastKind, factNext: s.factNext, factCount: f.factCount, pick, notes: s.desk.notes });
  return {
    ...s,
    finished,
    lastKind: turn.lastKind,
    factNext: turn.factNext,
    today: { day: f.day, page, thing: turn.thing, doneAt: f.doneAt, open: false, kept: null, shut: false, receipt: "idle", fed: false, pat: false, asleep: false },
  };
}

/** The last letter was brought back: the day isn't finished any more, and its page is put away (its thing waits). */
export function reopen(s: AfterState, day: string): AfterState {
  if (!s.today || s.today.day !== day || s.today.open) return s;
  return { ...s, finished: s.finished.filter((d) => d !== day), today: { ...s.today, open: true } };
}

/** today's page, when there is one to show for `day` */
export function pageFor(s: AfterState, day: string): AfterToday | null {
  return s.today && s.today.day === day && !s.today.open ? s.today : null;
}

const onToday = (s: AfterState, change: (t: AfterToday) => AfterToday): AfterState => {
  if (!s.today || s.today.open) return s;
  const next = change(s.today);
  return next === s.today ? s : { ...s, today: next };
};

/** the mailbox's cord: the shutter down, or lifted again */
export const markShut = (s: AfterState, shut: boolean): AfterState => onToday(s, (t) => (t.shut === shut ? t : { ...t, shut }));

/** the receipt: printed, then torn off (it never goes back) */
export const markReceipt = (s: AfterState, phase: ReceiptPhase): AfterState =>
  onToday(s, (t) => {
    const order: ReceiptPhase[] = ["idle", "printed", "torn"];
    return order.indexOf(phase) <= order.indexOf(t.receipt) ? t : { ...t, receipt: phase };
  });

export type BedStep = "snack" | "pat" | "lights";

/** One of bedtime's steps. Lights out only after the other two; nothing changes once she is asleep. */
export function markStep(s: AfterState, step: BedStep): AfterState {
  return onToday(s, (t) => {
    if (t.asleep) return t;
    if (step === "snack") return t.fed ? t : { ...t, fed: true };
    if (step === "pat") return t.pat ? t : { ...t, pat: true };
    return t.fed && t.pat ? { ...t, asleep: true } : t;
  });
}

/** Keep, and its undoing: the Lore entry's id, or null. */
export const markKept = (s: AfterState, loreId: string | null): AfterState => onToday(s, (t) => (t.kept === loreId ? t : { ...t, kept: loreId }));

/** the evenings bedtime was offered, tonight's included as it stands (for the dev page and the tests) */
export function nightsNow(s: AfterState): AfterNight[] {
  const t = s.today;
  if (!t || t.open || t.page !== "bedtime" || s.nights.some((n) => n.day === t.day)) return s.nights;
  return [...s.nights, { day: t.day, done: t.asleep }];
}
