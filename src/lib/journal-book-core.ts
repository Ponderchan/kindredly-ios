import type { Book, BookMedia, BookMood, BookPage } from "../../modules/kindredly-ui/src/JournalBook";
import { exportPages } from "./journal-export";
import { weightedCount } from "./weighted-count";

/* THE JOURNAL BOOK, AS A MODEL (journal book, 2026-11-10; contract
   .claude/journal-book/CONTRACT.md, the approved pages in
   .claude/journal-book/gen2.py).
   ────────────────────────────────────────────────────────────────────────
   The First Class export of Notes is a typeset A5 book of the reader's own
   pages, drawn by Swift on the phone. This file decides everything Swift
   does not: WHICH pages are in it, in what order, and every count and word
   printed on them. Swift draws exactly what it is handed and counts
   nothing, so the owner's hard rule lives here:

     EVERY NUMBER PRINTED IS COUNTED FROM THE PAGES. A number that can't be
     counted truthfully is left out, not rounded, guessed or padded.

   Pure: no storage, no files, no i18n, no Intl. Every word and every date
   formatter comes in through `fmt` (lib/journal-book binds them to t() and
   the reader's locale), the mood table and the file check come in as
   resolvers, so `node src/lib/journal-book-core.test.ts` holds the rules:

   - THE READER'S PAGES ONLY, ONCE EACH, OLDEST FIRST (lib/journal-export's
     exportPages: never a sample, a repeated id is one page), and only those
     inside the range by the reader's LOCAL calendar: a page written at
     00:30 on 1 January belongs to January here whatever UTC says. A page
     whose date can't be read can't be placed on a calendar: it is left out
     of the book and counted in `skipped` (the text export still has it).
   - ORDER: cover; for a year, the year at a glance; then for each month
     that has a page, oldest first: its calendar, its pages, its count; then
     the back cover. A month with no page is skipped. An empty range is no
     book at all: no cover for nothing.
   - A DAY WITH SEVERAL PAGES is coloured, on the calendar and in the year's
     squares, by the LAST page written that day (Notes' own calendar does
     the same).
   - THE MONTH'S COUNT is by DAYS, the way the calendar beside it shows
     them, so the reader can check it against the squares: days written;
     then "N of them <mood>" only when one mood is strictly ahead of every
     other and coloured at least two days (a tie, or a single day, says
     nothing); then the longest page's length, in words — or in characters
     with its own label when that page is mostly Chinese, Japanese or Korean
     — and only when it has 20 words / 40 characters, so a month of one-line
     pages doesn't print "3 words on your longest page".
   - A PAGE WITH NO MOOD (or one this app can't name) is `mood: null`: Swift
     draws it on white. Its day is still a day written: its calendar cell
     carries NO_MOOD and a quiet colour, never "" (which means no page).
   - PHOTOS are every stored photo that still exists on the phone, the
     cover first, nine at most; a missing file is dropped, all missing is a
     page of words. A voice note or a film can't be printed: the page says
     so, with its length when that is known, and that it stays in the app.
   - The words are the page's own, exactly as stored; the drifted line too. */

/** THIS MONTH / THIS YEAR on the export page. */
export type BookRangeKind = "month" | "year";

/** A calendar year, or one month of it (month 1…12), in the reader's local time. */
export type BookRange = { kind: "year"; year: number } | { kind: "month"; year: number; month: number };

/** One stored page, as much of it as the book reads (lib/journal JournalEntry). */
export type BookEntry = {
  id: string;
  date: string;
  type?: string;
  body?: string;
  mood?: string | null;
  mediaUri?: string;
  media?: string[];
  coverIndex?: number;
  dur?: number;
  driftedLine?: string;
};

/** Every word and date of the book, from the caller: t() and the reader's locale. */
export type BookFormat = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** upper-case in the reader's locale (the small mono labels) */
  upper: (s: string) => string;
  /** lower-case in the reader's locale (a mood's name inside a sentence) */
  lower: (s: string) => string;
  /** a month's full name: "November" (month 1…12) */
  monthLong: (year: number, month: number) => string;
  /** a month's short name, no trailing period: "Nov" */
  monthShort: (year: number, month: number) => string;
  /** a month's name as the cover's title sets it: "november" (a language whose nouns keep their capital keeps it) */
  coverMonth: (year: number, month: number) => string;
  /** a weekday's full name: "Thursday" */
  weekday: (d: Date) => string;
  /** a clock time, 24h: "21:14" */
  time: (d: Date) => string;
  /** a day and its month, short, in the locale's own order: "Nov 19", "19 nov" */
  dayMonth: (d: Date) => string;
  /** seconds as m:ss */
  duration: (seconds: number) => string;
  /** a count as the locale writes it: "1,204" */
  count: (n: number) => string;
  /** the first column of a calendar week: 0 = Sunday … 6 = Saturday (the same source Notes' calendar uses) */
  firstWeekday: number;
};

export type BookInput = {
  /** the stored pages, in any order (samples and repeats are dropped here) */
  entries: readonly BookEntry[];
  range: BookRange;
  /** the moment the book is made: how far the year at a glance runs */
  now: Date;
  /** the reader's pen name, "" for none (never a legal name: lib/auth's handle) */
  penName: string;
  /** the reader's Letter font key (theme/post LetterFontKey), handed to Swift as it is */
  letterFont: string;
  /** a stored mood as the book paints it; null for none and for one this app can't name */
  mood: (id: string | null | undefined) => BookMood | null;
  /** a stored media uri as an absolute file:// uri that exists on this phone; null when the file is gone */
  file: (uri: string) => string | null;
  /** her picture for the back cover: a file:// uri, or "" */
  wren: string;
  fmt: BookFormat;
};

export type BookResult = {
  book: Book;
  /** how many of the reader's pages are in it (0: nothing to bind, and the book has no pages) */
  pages: number;
  /** the reader's pages left out because their date can't be read */
  skipped: number;
};

/** A written day whose page stored no mood: its calendar cell's `mood` (never "", which is "no
    page that day"; never a face Swift can draw) and the quiet colour its squares take. */
export const NO_MOOD = "plain";
export const NO_MOOD_COLOR = "#B9B6CF";

/** Nine photos a page at most (the composer's own limit). */
export const MAX_PHOTOS = 9;
/** The longest page is only counted when it is at least this long. */
export const LONGEST_MIN_WORDS = 20;
export const LONGEST_MIN_CHARS = 40;
/** The cover carries at most this many faces. */
export const COVER_FACES = 5;

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** How many days a month has (month 1…12), leap years included. */
export const daysInMonth = (year: number, month: number): number => new Date(year, month, 0).getDate();

/** The empty cells before day 1 in a week that starts on `firstWeekday` (0 = Sunday). */
export function leadingBlanks(year: number, month: number, firstWeekday: number): number {
  // local noon: the 1st is the 1st in every zone, on a daylight-saving night too
  const first = new Date(year, month - 1, 1, 12).getDay();
  return (((first - Math.trunc(firstWeekday)) % 7) + 7) % 7;
}

/** The range "now" is in: THIS MONTH or THIS YEAR, by the reader's local calendar. */
export function rangeFor(kind: BookRangeKind, now: Date): BookRange {
  return kind === "year" ? { kind: "year", year: now.getFullYear() } : { kind: "month", year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** The file's name without its extension: "kindredly-book-2026", "kindredly-book-2026-11". */
export function bookFileStem(range: BookRange): string {
  return range.kind === "year" ? `kindredly-book-${range.year}` : `kindredly-book-${range.year}-${pad2(range.month)}`;
}

/** A page with its date read once, in the reader's local time. */
type Placed<T> = { e: T; at: Date; y: number; m: number; d: number };

/** The reader's pages inside a range: their own (no samples), once each, oldest first, by the
    LOCAL calendar. `skipped`: their pages whose date can't be read (they can't be placed, in
    this range or any other). Never mutates. */
export function bookPages<T extends { id: string; date: string }>(entries: readonly T[], range: BookRange): { pages: Placed<T>[]; skipped: number } {
  const pages: Placed<T>[] = [];
  let skipped = 0;
  for (const e of exportPages(entries)) {
    const ms = typeof e.date === "string" ? Date.parse(e.date) : NaN;
    if (Number.isNaN(ms)) {
      skipped += 1;
      continue;
    }
    const at = new Date(ms);
    const y = at.getFullYear();
    const m = at.getMonth() + 1;
    if (y !== range.year || (range.kind === "month" && m !== range.month)) continue;
    pages.push({ e, at, y, m, d: at.getDate() });
  }
  return { pages, skipped };
}

/* ── how long a page is ─────────────────────────────────────────────────── */

// kana, CJK ideographs (and their extension A, compatibility forms), hangul: scripts counted by the character
const CJK_CHAR = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/gu;

/** A page's length the way its own script counts it: words where words are spaced, characters
    (no spaces) when more than half its letters are Chinese, Japanese or Korean. */
export function pageLength(body: string): { unit: "words" | "chars"; n: number } {
  const text = body || "";
  const letters = (text.match(/\p{L}/gu) || []).length;
  const cjk = (text.match(CJK_CHAR) || []).length;
  if (letters > 0 && cjk * 2 > letters) {
    // marks, joiners and variation selectors are part of the character before them
    return { unit: "chars", n: Array.from(text.replace(/[\s\p{M}‍︎️]/gu, "")).length };
  }
  return { unit: "words", n: text.split(/\s+/u).filter((w) => /[\p{L}\p{N}]/u.test(w)).length };
}

/* ── media ──────────────────────────────────────────────────────────────── */

/** A photo page's stored photos, the cover first, each once. */
export function photoUris(e: BookEntry): string[] {
  const all = Array.isArray(e.media) ? e.media.filter((u): u is string => typeof u === "string" && u.length > 0) : [];
  if (!all.length) return typeof e.mediaUri === "string" && e.mediaUri ? [e.mediaUri] : [];
  const ci = typeof e.coverIndex === "number" && Number.isInteger(e.coverIndex) && e.coverIndex >= 0 && e.coverIndex < all.length ? e.coverIndex : 0;
  const out: string[] = [];
  for (const u of [all[ci], ...all]) if (!out.includes(u)) out.push(u);
  return out;
}

/** What a page has attached, as the book can show it. */
export function pageMedia(e: BookEntry, file: BookInput["file"], fmt: BookFormat): BookMedia {
  switch (e.type) {
    case "photo": {
      const uris: string[] = [];
      for (const u of photoUris(e)) {
        const there = file(u);
        if (there && !uris.includes(there)) uris.push(there);
        if (uris.length === MAX_PHOTOS) break;
      }
      return uris.length ? { type: "photos", uris } : { type: "none" };
    }
    case "voice":
    case "video": {
      // "stays in the app" is only said of a recording that is still there
      if (typeof e.mediaUri !== "string" || !e.mediaUri || !file(e.mediaUri)) return { type: "none" };
      const key = e.type === "voice" ? "jb.voice" : "jb.film";
      const known = typeof e.dur === "number" && Number.isFinite(e.dur) && e.dur > 0;
      const label = fmt.upper(known ? fmt.t(key, { dur: fmt.duration(e.dur as number) }) : fmt.t(key + ".plain"));
      return { type: e.type, label };
    }
    default:
      return { type: "none" };
  }
}

/* ── counts ─────────────────────────────────────────────────────────────── */

/** "1 PAGE" / "12 PAGES" (and days, months): the singular has its own line. */
function counted(fmt: BookFormat, key: "jb.pages" | "jb.days" | "jb.months", n: number): string {
  return n === 1 ? fmt.t(key + ".1") : fmt.t(key, { n: fmt.count(n) });
}

/** The mood ahead of every other, by `counts`: only when strictly ahead and counted at least twice. */
function strictlyAhead(counts: Map<string, number>): { id: string; n: number } | null {
  let best: { id: string; n: number } | null = null;
  let tied = false;
  for (const [id, n] of counts) {
    if (!best || n > best.n) {
      best = { id, n };
      tied = false;
    } else if (n === best.n) tied = true;
  }
  return best && !tied && best.n >= 2 ? best : null;
}

/** What one month's pages add up to. */
type MonthFacts<T> = {
  /** day of the month → the last page written that day */
  lastOfDay: Map<number, { e: T; mood: BookMood | null }>;
  daysWritten: number;
  /** the mood most days are coloured, under the strictly-ahead rule */
  lead: { mood: BookMood; n: number } | null;
  /** the longest page's length, when it is long enough to say */
  longest: { unit: "words" | "chars"; n: number } | null;
};

function monthFacts<T extends BookEntry>(pages: readonly Placed<T>[], mood: BookInput["mood"]): MonthFacts<T> {
  const lastOfDay = new Map<number, { e: T; mood: BookMood | null }>();
  // oldest first, so the last one set for a day is the last one written
  for (const p of pages) lastOfDay.set(p.d, { e: p.e, mood: mood(p.e.mood) });

  const byMood = new Map<string, number>();
  const table = new Map<string, BookMood>();
  for (const { mood: m } of lastOfDay.values()) {
    if (!m) continue;
    byMood.set(m.id, (byMood.get(m.id) ?? 0) + 1);
    table.set(m.id, m);
  }
  const ahead = strictlyAhead(byMood);

  // the longest page by one fair measure across scripts (lib/weighted-count), then said in its own unit
  let longestBody = "";
  let longestWeight = 0;
  for (const p of pages) {
    const body = typeof p.e.body === "string" ? p.e.body : "";
    const w = weightedCount(body);
    if (w > longestWeight) {
      longestWeight = w;
      longestBody = body;
    }
  }
  const len = pageLength(longestBody);
  const longEnough = len.unit === "words" ? len.n >= LONGEST_MIN_WORDS : len.n >= LONGEST_MIN_CHARS;

  return {
    lastOfDay,
    daysWritten: lastOfDay.size,
    lead: ahead ? { mood: table.get(ahead.id) as BookMood, n: ahead.n } : null,
    longest: longEnough ? len : null,
  };
}

/* ── the pages ──────────────────────────────────────────────────────────── */

/** The cover's faces: up to five moods by how many pages were written in them; a tie goes to
    the one written more recently. */
function coverFaces<T extends BookEntry>(pages: readonly Placed<T>[], mood: BookInput["mood"]): string[] {
  const seen = new Map<string, { n: number; last: number }>();
  pages.forEach((p, i) => {
    const m = mood(p.e.mood);
    if (!m) return;
    const cur = seen.get(m.id);
    // pages are oldest first: a later index is a more recent page
    seen.set(m.id, { n: (cur?.n ?? 0) + 1, last: i });
  });
  return Array.from(seen.entries())
    .sort((a, b) => b[1].n - a[1].n || b[1].last - a[1].last)
    .slice(0, COVER_FACES)
    .map(([id]) => id);
}

function entryPage(p: Placed<BookEntry>, input: BookInput): BookPage {
  const { fmt } = input;
  const e = p.e;
  const drift = typeof e.driftedLine === "string" && e.driftedLine.trim() ? e.driftedLine : "";
  return {
    kind: "entry",
    id: e.id,
    day: pad2(p.d),
    dateLine: fmt.upper([fmt.weekday(p.at), fmt.monthLong(p.y, p.m), fmt.time(p.at)].join(" · ")),
    mood: input.mood(e.mood),
    // the words as stored: never trimmed, tidied or escaped
    body: typeof e.body === "string" ? e.body : "",
    drift,
    driftLabel: drift ? fmt.upper(fmt.t("jb.drift")) : "",
    media: pageMedia(e, input.file, fmt),
    contLabel: fmt.upper(fmt.t("jb.cont", { date: fmt.dayMonth(p.at) })),
    continues: fmt.upper(fmt.t("jb.continues")),
  };
}

/** The whole book for a range. See the top of this file for every rule. */
export function buildBook(input: BookInput): BookResult {
  const { range, fmt } = input;
  const { pages, skipped } = bookPages(input.entries, range);
  const book: Book = { fileStem: bookFileStem(range), letterFont: input.letterFont, pages: [] };
  if (!pages.length) return { book, pages: 0, skipped };

  // the months that have a page, oldest first
  const months = new Map<number, Placed<BookEntry>[]>();
  for (const p of pages) {
    const list = months.get(p.m);
    if (list) list.push(p);
    else months.set(p.m, [p]);
  }
  const facts = new Map<number, MonthFacts<BookEntry>>();
  for (const [m, list] of months) facts.set(m, monthFacts(list, input.mood));
  const daysWritten = Array.from(facts.values()).reduce((n, f) => n + f.daysWritten, 0);
  const monthLabel = (m: number) => fmt.upper(fmt.monthShort(range.year, m));
  /** a written day's colour: its last page's mood, or the quiet one for a page without */
  const dayColor = (hit: { mood: BookMood | null }) => (hit.mood ? hit.mood.color : NO_MOOD_COLOR);

  const out: BookPage[] = [];

  const name = (input.penName || "").trim();
  out.push({
    kind: "cover",
    title: range.kind === "year" ? fmt.t("jb.cover.year") : fmt.t("jb.cover.month", { month: fmt.coverMonth(range.year, range.month) }),
    by: name ? fmt.t("jb.cover.by", { name }) : "",
    faces: coverFaces(pages, input.mood),
    top: fmt.upper(fmt.t("jb.cover.top")),
    foot: fmt.upper(fmt.t("jb.cover.foot", { year: String(range.year), pages: counted(fmt, "jb.pages", pages.length) })),
  });

  if (range.kind === "year") {
    /* January to the last month there is anything to say about: a year that is over shows all
       twelve; this year runs to this month (or past it, to a page dated ahead); a year that
       hasn't come runs to its last page. */
    const lastWritten = Math.max(...Array.from(months.keys()));
    const nowYear = input.now.getFullYear();
    const last = range.year < nowYear ? 12 : range.year === nowYear ? Math.max(lastWritten, input.now.getMonth() + 1) : lastWritten;
    const rows: { label: string; days: string[] }[] = [];
    for (let m = 1; m <= last; m++) {
      const hits = facts.get(m)?.lastOfDay;
      const days: string[] = [];
      for (let d = 1; d <= daysInMonth(range.year, m); d++) {
        const hit = hits?.get(d);
        days.push(hit ? dayColor(hit) : "");
      }
      rows.push({ label: monthLabel(m), days });
    }
    out.push({
      kind: "year",
      year: String(range.year),
      lead: fmt.upper([counted(fmt, "jb.pages", pages.length), counted(fmt, "jb.days", daysWritten), counted(fmt, "jb.months", months.size)].join(" · ")),
      months: rows,
      foot: fmt.upper(fmt.t("jb.year.foot")),
    });
  }

  for (const [m, list] of Array.from(months.entries()).sort((a, b) => a[0] - b[0])) {
    const f = facts.get(m) as MonthFacts<BookEntry>;
    const total = daysInMonth(range.year, m);
    const days: { n: number; mood: string; color: string }[] = [];
    for (let d = 1; d <= total; d++) {
      const hit = f.lastOfDay.get(d);
      days.push(hit ? { n: d, mood: hit.mood ? hit.mood.id : NO_MOOD, color: dayColor(hit) } : { n: d, mood: "", color: "" });
    }
    const foot = [fmt.t("jb.month.foot", { n: fmt.count(f.daysWritten), total: fmt.count(total) })];
    if (f.lead) foot.push(fmt.t("jb.month.mostly", { mood: f.lead.mood.name }));
    out.push({ kind: "month", label: monthLabel(m), blanks: leadingBlanks(range.year, m, fmt.firstWeekday), days, foot: fmt.upper(foot.join(" · ")) });

    for (const p of list) out.push(entryPage(p, input));

    const stats: { value: string; label: string; mood: string }[] = [];
    stats.push({ value: fmt.count(f.daysWritten), label: fmt.t(f.daysWritten === 1 ? "jb.stat.days.1" : "jb.stat.days"), mood: "" });
    if (f.lead) stats.push({ value: fmt.count(f.lead.n), label: fmt.t("jb.stat.mood", { mood: fmt.lower(f.lead.mood.name) }), mood: f.lead.mood.id });
    if (f.longest) stats.push({ value: fmt.count(f.longest.n), label: fmt.t(f.longest.unit === "words" ? "jb.stat.words" : "jb.stat.chars"), mood: "" });
    out.push({ kind: "monthEnd", top: fmt.upper(fmt.t("jb.end.top", { month: fmt.monthLong(range.year, m) })), stats, foot: fmt.upper(fmt.t("jb.end.foot")) });
  }

  out.push({ kind: "back", lines: [fmt.t("jb.back.1"), fmt.t("jb.back.2")], wren: input.wren || "", foot: fmt.upper(fmt.t("jb.back.foot", { year: String(range.year) })) });

  book.pages = out;
  return { book, pages: pages.length, skipped };
}
