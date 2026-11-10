/* Behaviour lock for the journal book's model (lib/journal-book-core; journal book, 2026-11-10):
   which pages are in a book (the reader's own, once each, oldest first, inside the range by the
   LOCAL calendar; an unreadable date is left out and counted), the order of its pages, and every
   count and word printed on them — each number counted from the pages, or left out.
   Not wired to a runner; run by hand from the repo root with plain node (types stripped by Node
   itself; the hook below adds ".ts" to the app's extensionless imports):
     node src/lib/journal-book-core.test.ts
   The clock is pinned to New York before anything reads a date, so the daylight-saving days and
   the "UTC says January, the reader's wall says December" pages are real ones. */

process.env.TZ = "America/New_York";

import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
      const url = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, context);
    }
    return next(specifier, context);
  },
});

const core = await import("./journal-book-core.ts");
const { buildBook, bookPages, bookFileStem, daysInMonth, leadingBlanks, pageLength, photoUris, rangeFor, NO_MOOD, NO_MOOD_COLOR, MAX_PHOTOS, COVER_FACES } = core;
type BookEntry = import("./journal-book-core.ts").BookEntry;
type BookFormat = import("./journal-book-core.ts").BookFormat;
type BookRange = import("./journal-book-core.ts").BookRange;
type BookInput = import("./journal-book-core.ts").BookInput;

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const eq = (name: string, got: unknown, want: unknown) => {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  ok(name + (g === w ? "" : `  (got ${g}, want ${w})`), g === w);
};

ok("the clock is New York's (the daylight-saving cases below depend on it)", new Date(2026, 6, 1, 12).getTimezoneOffset() === 240 && new Date(2026, 0, 1, 12).getTimezoneOffset() === 300);

/* ── the words and dates, English, with no Intl ── */
const WORDS: Record<string, string> = {
  "jb.cover.top": "KINDREDLY",
  "jb.cover.year": "my year\nin pages",
  "jb.cover.month": "my {month}\nin pages",
  "jb.cover.by": "— {name}",
  "jb.cover.foot": "{year} · {pages}",
  "jb.pages.1": "1 PAGE",
  "jb.pages": "{n} PAGES",
  "jb.days.1": "1 DAY",
  "jb.days": "{n} DAYS",
  "jb.months.1": "1 MONTH",
  "jb.months": "{n} MONTHS",
  "jb.year.foot": "EACH SQUARE IS A DAY YOU WROTE",
  "jb.month.foot": "{n} OF {total}",
  "jb.month.mostly": "MOSTLY {mood}",
  "jb.end.top": "{month}, COUNTED",
  "jb.stat.days.1": "day you wrote",
  "jb.stat.days": "days you wrote",
  "jb.stat.mood": "of them {mood}",
  "jb.stat.words": "words on your longest page",
  "jb.stat.chars": "characters on your longest page",
  "jb.end.foot": "EVERY NUMBER IS COUNTED FROM YOUR PAGES",
  "jb.continues": "CONTINUES →",
  "jb.cont": "{date} · CONTINUED",
  "jb.drift": "THIS LINE DRIFTED OUT",
  "jb.voice": "VOICE · {dur} · STAYS IN THE APP",
  "jb.voice.plain": "VOICE · STAYS IN THE APP",
  "jb.film": "FILM · {dur} · STAYS IN THE APP",
  "jb.film.plain": "FILM · STAYS IN THE APP",
  "jb.back.1": "kept on this phone.",
  "jb.back.2": "carried by nobody.",
  "jb.back.foot": "KINDREDLY · {year}",
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const asked: string[] = [];
const fmtWith = (firstWeekday: number): BookFormat => ({
  t: (k, vars) => {
    asked.push(k);
    const s = WORDS[k] ?? k;
    return vars ? s.replace(/\{(\w+)\}/g, (m, v) => (v in vars ? String(vars[v]) : m)) : s;
  },
  upper: (s) => s.toUpperCase(),
  lower: (s) => s.toLowerCase(),
  monthLong: (_y, m) => MONTHS[m - 1],
  monthShort: (_y, m) => MONTHS[m - 1].slice(0, 3),
  coverMonth: (_y, m) => MONTHS[m - 1].toLowerCase(),
  weekday: (d) => WEEKDAYS[d.getDay()],
  time: (d) => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"),
  dayMonth: (d) => MONTHS[d.getMonth()].slice(0, 3) + " " + d.getDate(),
  duration: (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0"),
  count: (n) => String(n).replace(/\B(?=(\d{3})+$)/g, ","),
  firstWeekday,
});

const TABLE: Record<string, { name: string; color: string; bg: string }> = {
  calm: { name: "Calm", color: "#8FBBD9", bg: "#EFF5F9" },
  cheerful: { name: "Cheerful", color: "#F6C445", bg: "#FDF6E4" },
  sleepy: { name: "Sleepy", color: "#9C9BD6", bg: "#F1F1F9" },
  "in-love": { name: "In love", color: "#F2708F", bg: "#FDEAEF" },
  playful: { name: "Playful", color: "#5CC08E", bg: "#E8F6EF" },
  drained: { name: "Drained", color: "#8A8496", bg: "#EEEDF0" },
  "group-low": { name: "Low", color: "#7E9BC4", bg: "#ECF1F6" },
};
/** the resolver the app passes: a legacy id by its new face, an unknown one as none */
const mood: BookInput["mood"] = (id) => {
  const key = id === "tender" ? "in-love" : id;
  return key && Object.prototype.hasOwnProperty.call(TABLE, key) ? { id: key, ...TABLE[key] } : null;
};
/** every file is there unless its name says "gone"; a stored path comes back absolute */
const file: BookInput["file"] = (uri) => (uri.includes("gone") ? null : uri.startsWith("file://") ? uri : "file:///journal/" + uri.split("/").pop());

/** a local wall-clock time as the stored ISO string (month 1…12) */
const iso = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).toISOString();
let seq = 0;
const page = (date: string, over: Partial<BookEntry> = {}): BookEntry => ({ id: `j-${++seq}`, date, type: "text", body: "a line", mood: "calm", ...over });

const NOW = new Date(2026, 10, 10, 9, 30); // 10 November 2026, local
const Y2026: BookRange = { kind: "year", year: 2026 };
const NOV: BookRange = { kind: "month", year: 2026, month: 11 };
const build = (entries: BookEntry[], range: BookRange = Y2026, over: Partial<BookInput> = {}) =>
  buildBook({ entries, range, now: NOW, penName: "Mira", letterFont: "newsreader", mood, file, wren: "file:///tmp/wren.png", fmt: fmtWith(0), ...over });
type Page = ReturnType<typeof build>["book"]["pages"][number];
const kinds = (r: ReturnType<typeof build>) => r.book.pages.map((p) => p.kind);
const only = <K extends Page["kind"]>(r: ReturnType<typeof build>, kind: K) => r.book.pages.filter((p): p is Extract<Page, { kind: K }> => p.kind === kind);

/* ── which pages ── */
{
  const a = page(iso(2026, 11, 5, 21, 14), { id: "a" });
  const b = page(iso(2026, 3, 2), { id: "b" });
  const c = page(iso(2026, 11, 5, 8), { id: "c" });
  const demo = page(iso(2026, 11, 6), { id: "demo-1" });
  const again = page(iso(2026, 11, 7), { id: "a", body: "the copy further down" });
  const lastYear = page(iso(2025, 12, 31, 23, 59), { id: "old" });
  const nextYear = page(iso(2027, 1, 1, 0, 0), { id: "next" });
  const bad = page("not a date", { id: "bad" });
  const noDate = { id: "nodate", body: "x" } as unknown as BookEntry;
  const entries = [a, b, c, demo, again, lastYear, nextYear, bad, noDate];
  const frozen = JSON.stringify(entries);

  const year = bookPages(entries, Y2026);
  eq("a year: the reader's pages of that year, oldest first", year.pages.map((p) => p.e.id), ["b", "c", "a"]);
  ok("a sample is never in a book", !year.pages.some((p) => p.e.id.startsWith("demo-")));
  ok("a repeated id is one page: the first met", year.pages.filter((p) => p.e.id === "a").length === 1 && year.pages.find((p) => p.e.id === "a")?.e.body === "a line");
  eq("a page whose date can't be read is left out and counted", year.skipped, 2);
  eq("a month: only that month's", bookPages(entries, NOV).pages.map((p) => p.e.id), ["c", "a"]);
  eq("the skipped count is the same for any range (they can't be placed anywhere)", bookPages(entries, NOV).skipped, 2);
  eq("the last minute of last year is last year's", bookPages(entries, { kind: "year", year: 2025 }).pages.map((p) => p.e.id), ["old"]);
  eq("midnight on 1 January is the new year's", bookPages(entries, { kind: "year", year: 2027 }).pages.map((p) => p.e.id), ["next"]);
  ok("the stored pages are never changed", JSON.stringify(entries) === frozen);

  const r = build(entries);
  eq("buildBook: pages and skipped", [r.pages, r.skipped], [3, 2]);
  eq("the entry pages are those pages, in that order", only(r, "entry").map((p) => p.id), ["b", "c", "a"]);
}

/* ── the LOCAL calendar, not UTC's ── */
{
  // 04:30 UTC on 1 Jan 2026 is 23:30 on 31 Dec 2025 in New York
  const eve = page("2026-01-01T04:30:00.000Z", { id: "eve" });
  // 03:00 UTC on 1 Jan 2027 is 22:00 on 31 Dec 2026 in New York
  const eve26 = page("2027-01-01T03:00:00.000Z", { id: "eve26" });
  // 05:00 UTC on 1 Jan 2026 is exactly local midnight
  const first = page("2026-01-01T05:00:00.000Z", { id: "first" });
  const all = [eve, eve26, first];
  eq("New Year's Eve at 23:30 local belongs to the old year, whatever UTC says", bookPages(all, { kind: "year", year: 2025 }).pages.map((p) => p.e.id), ["eve"]);
  eq("2026 holds its first midnight and its last evening", bookPages(all, Y2026).pages.map((p) => p.e.id), ["first", "eve26"]);
  eq("December 2026 holds the page UTC calls January 2027", bookPages(all, { kind: "month", year: 2026, month: 12 }).pages.map((p) => p.e.id), ["eve26"]);
  eq("January 2027 doesn't", bookPages(all, { kind: "month", year: 2027, month: 1 }).pages.length, 0);

  const r = build(all);
  const entries = only(r, "entry");
  eq("their days are the wall's: 01 and 31", entries.map((p) => p.day), ["01", "31"]);
  eq("a year book that spans January and December has both months, in order", only(r, "month").map((p) => p.label), ["JAN", "DEC"]);
  ok("December's calendar lights the 31st", only(r, "month")[1].days[30].mood === "calm" && only(r, "month")[1].days.filter((d) => d.mood).length === 1);

  eq("rangeFor at 23:30 on 31 December: that December, that year", [rangeFor("month", new Date(2026, 11, 31, 23, 30)), rangeFor("year", new Date(2026, 11, 31, 23, 30))], [{ kind: "month", year: 2026, month: 12 }, { kind: "year", year: 2026 }]);
  eq("rangeFor at 00:30 on 1 January: January, the new year", [rangeFor("month", new Date(2027, 0, 1, 0, 30)), rangeFor("year", new Date(2027, 0, 1, 0, 30))], [{ kind: "month", year: 2027, month: 1 }, { kind: "year", year: 2027 }]);
}

/* ── the order of the pages ── */
{
  const entries = [page(iso(2026, 11, 5)), page(iso(2026, 11, 7)), page(iso(2026, 3, 2)), page(iso(2026, 7, 19))];
  eq("a year: cover, the year, then each written month (calendar, pages, count), then the back", kinds(build(entries)), [
    "cover", "year",
    "month", "entry", "monthEnd",
    "month", "entry", "monthEnd",
    "month", "entry", "entry", "monthEnd",
    "back",
  ]);
  eq("months with no page are skipped; the rest oldest first", only(build(entries), "month").map((p) => p.label), ["MAR", "JUL", "NOV"]);
  eq("a month: no year page", kinds(build(entries, NOV)), ["cover", "month", "entry", "entry", "monthEnd", "back"]);

  const none = build(entries, { kind: "month", year: 2026, month: 2 });
  eq("an empty range: no pages, and no cover for nothing", [none.pages, none.book.pages.length], [0, 0]);
  eq("…its file name and font are still said", [none.book.fileStem, none.book.letterFont], ["kindredly-book-2026-02", "newsreader"]);
  eq("no pages at all: an empty book", [build([]).pages, build([]).book.pages.length, build([]).skipped], [0, 0, 0]);
  eq("only samples: an empty book", build([page(iso(2026, 11, 5), { id: "demo-9" })]).pages, 0);
  eq("only unreadable dates: an empty book, and it says how many", [build([page("???")]).pages, build([page("???")]).skipped], [0, 1]);
}

/* ── the file's name ── */
eq("a year's file", bookFileStem(Y2026), "kindredly-book-2026");
eq("a month's file (two digits)", [bookFileStem(NOV), bookFileStem({ kind: "month", year: 2026, month: 3 })], ["kindredly-book-2026-11", "kindredly-book-2026-03"]);
eq("the book carries it, and the Letter font as given", [build([page(iso(2026, 11, 5))]).book.fileStem, build([page(iso(2026, 11, 5))], Y2026, { letterFont: "sfmono" }).book.letterFont], ["kindredly-book-2026", "sfmono"]);

/* ── the cover ── */
{
  const entries = [page(iso(2026, 11, 5)), page(iso(2026, 11, 7)), page(iso(2026, 3, 2))];
  const cover = only(build(entries), "cover")[0];
  eq("a year's title", cover.title, "my year\nin pages");
  eq("the pen name, when there is one", cover.by, "— Mira");
  eq("the top line", cover.top, "KINDREDLY");
  eq("the foot: the year and the real page count", cover.foot, "2026 · 3 PAGES");
  eq("a month's title: the month's name, lower-cased by the caller", only(build(entries, NOV), "cover")[0].title, "my november\nin pages");
  eq("a month's foot counts that month's pages", only(build(entries, NOV), "cover")[0].foot, "2026 · 2 PAGES");
  eq("one page is 1 PAGE", only(build(entries, { kind: "month", year: 2026, month: 3 }), "cover")[0].foot, "2026 · 1 PAGE");
  eq("no pen name: no line", [only(build(entries, Y2026, { penName: "" }), "cover")[0].by, only(build(entries, Y2026, { penName: "   " }), "cover")[0].by], ["", ""]);
  eq("the pen name is theirs, exactly", only(build(entries, Y2026, { penName: " mira of the Sea " }), "cover")[0].by, "— mira of the Sea");
  eq("a thousand pages are written the locale's way", only(build(Array.from({ length: 1204 }, (_, i) => page(iso(2026, 1 + (i % 11), 1 + (i % 28), 8, i % 60)))), "cover")[0].foot, "2026 · 1,204 PAGES");

  // faces: sleepy ×3, calm ×2, cheerful ×2 (cheerful more recent), playful ×1, drained ×1 (more recent), in-love ×1 (oldest)
  const faces = [
    page(iso(2026, 1, 1), { mood: "in-love" }),
    page(iso(2026, 1, 2), { mood: "playful" }),
    page(iso(2026, 1, 3), { mood: "calm" }),
    page(iso(2026, 1, 4), { mood: "calm" }),
    page(iso(2026, 1, 5), { mood: "sleepy" }),
    page(iso(2026, 1, 6), { mood: "sleepy" }),
    page(iso(2026, 1, 7), { mood: "cheerful" }),
    page(iso(2026, 1, 8), { mood: "cheerful" }),
    page(iso(2026, 1, 9), { mood: "sleepy" }),
    page(iso(2026, 1, 10), { mood: "drained" }),
    page(iso(2026, 1, 11), { mood: null }),
    page(iso(2026, 1, 12), { mood: "not-a-mood" }),
  ];
  const f = only(build(faces), "cover")[0].faces;
  eq("faces: the most written first; a tie goes to the more recent; five at most", f, ["sleepy", "cheerful", "calm", "drained", "playful"]);
  ok("…never more than five", f.length === COVER_FACES);
  eq("a page with no mood, or one nobody can name, puts no face on the cover", only(build([page(iso(2026, 1, 1), { mood: null }), page(iso(2026, 1, 2), { mood: "zzz" })]), "cover")[0].faces, []);
  eq("a legacy id counts as its face", only(build([page(iso(2026, 1, 1), { mood: "tender" }), page(iso(2026, 1, 2), { mood: "in-love" }), page(iso(2026, 1, 3), { mood: "calm" })]), "cover")[0].faces, ["in-love", "calm"]);
  eq("a month's cover counts only that month's moods", only(build([page(iso(2026, 10, 1), { mood: "sleepy" }), page(iso(2026, 10, 2), { mood: "sleepy" }), page(iso(2026, 11, 2), { mood: "calm" })], NOV), "cover")[0].faces, ["calm"]);
}

/* ── the year at a glance ── */
{
  const entries = [page(iso(2026, 2, 28), { mood: "sleepy" }), page(iso(2026, 3, 2)), page(iso(2026, 3, 2, 22), { mood: "cheerful" }), page(iso(2026, 11, 5), { mood: null })];
  const y = only(build(entries), "year")[0];
  eq("its year", y.year, "2026");
  eq("one row a month from January to this month", y.months.map((m) => m.label), ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV"]);
  eq("each row has exactly its month's days", y.months.map((m) => m.days.length), [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30]);
  eq("the lead: pages, days, months, each counted", y.lead, "4 PAGES · 3 DAYS · 3 MONTHS");
  eq("the foot", y.foot, "EACH SQUARE IS A DAY YOU WROTE");
  eq("a written day is its mood's colour", y.months[1].days[27], "#9C9BD6");
  eq("a day with two pages is the LAST page's colour", y.months[2].days[1], "#F6C445");
  eq("a written day with no mood is the quiet colour, not empty", y.months[10].days[4], NO_MOOD_COLOR);
  eq("every other square is empty", y.months.flatMap((m) => m.days).filter((d) => d !== "").length, 3);
  ok("an unwritten month is a row of empty squares", y.months[0].days.every((d) => d === ""));

  eq("one page: 1 PAGE · 1 DAY · 1 MONTH", only(build([page(iso(2026, 5, 5))]), "year")[0].lead, "1 PAGE · 1 DAY · 1 MONTH");
  eq("a page dated past this month carries the rows to it", only(build([page(iso(2026, 12, 25))]), "year")[0].months.length, 12);
  eq("in January the year is one row", only(build([page(iso(2026, 1, 3))], Y2026, { now: new Date(2026, 0, 20) }), "year")[0].months.map((m) => m.label), ["JAN"]);
  eq("a year that is over shows all twelve months", only(build([page(iso(2025, 2, 3))], { kind: "year", year: 2025 }), "year")[0].months.length, 12);
  eq("a year that hasn't come runs to its last page", only(build([page(iso(2027, 4, 3))], { kind: "year", year: 2027 }), "year")[0].months.length, 4);

  // leap years
  const feb = (year: number) => only(build([page(iso(year, 2, 10))], { kind: "year", year }, { now: new Date(year, 11, 31) }), "year")[0].months[1].days.length;
  eq("February: 28 in 2026, 29 in 2028 and 2000, 28 in 2100", [feb(2026), feb(2028), feb(2000), feb(2100)], [28, 29, 29, 28]);
  eq("daysInMonth", [daysInMonth(2026, 2), daysInMonth(2028, 2), daysInMonth(2026, 4), daysInMonth(2026, 12), daysInMonth(2026, 1)], [28, 29, 30, 31, 31]);
  ok("29 February is a square in a leap year", only(build([page(iso(2028, 2, 29))], { kind: "year", year: 2028 }, { now: new Date(2028, 11, 31) }), "year")[0].months[1].days[28] !== "");
  ok("a month book has no year page", only(build(entries, NOV), "year").length === 0);
}

/* ── a month's calendar ── */
{
  // 2026: Jan starts Thursday, Feb Sunday, Apr Wednesday, May Friday, Jun Monday, Aug Saturday, Sep Tuesday
  const starts: [number, number, number][] = [[2, 0, 6], [6, 1, 0], [9, 2, 1], [4, 3, 2], [1, 4, 3], [5, 5, 4], [8, 6, 5]];
  for (const [m, sun, mon] of starts) {
    eq(`${MONTHS[m - 1]} 2026: ${sun} blanks from Sunday, ${mon} from Monday`, [leadingBlanks(2026, m, 0), leadingBlanks(2026, m, 1)], [sun, mon]);
  }
  eq("a week that starts on Saturday (6)", [leadingBlanks(2026, 8, 6), leadingBlanks(2026, 2, 6)], [0, 1]);
  eq("the model carries the locale's blanks: Sunday first", only(build([page(iso(2026, 1, 9))], { kind: "month", year: 2026, month: 1 }), "month")[0].blanks, 4);
  eq("…Monday first", only(build([page(iso(2026, 1, 9))], { kind: "month", year: 2026, month: 1 }, { fmt: fmtWith(1) }), "month")[0].blanks, 3);
  eq("in a year book each month has its own blanks", only(build([page(iso(2026, 2, 9)), page(iso(2026, 6, 9)), page(iso(2026, 8, 9))], Y2026, { fmt: fmtWith(1) }), "month").map((p) => p.blanks), [6, 0, 5]);

  const entries = [
    page(iso(2026, 11, 5, 8), { mood: "sleepy" }),
    page(iso(2026, 11, 5, 21), { mood: "calm" }),
    page(iso(2026, 11, 7), { mood: "calm" }),
    page(iso(2026, 11, 9), { mood: null }),
    page(iso(2026, 11, 12), { mood: "who-knows" }),
    page(iso(2026, 11, 30, 23, 59), { mood: "cheerful" }),
  ];
  const m = only(build(entries, NOV), "month")[0];
  eq("its label: the short month, upper-cased", m.label, "NOV");
  eq("every day of the month, numbered", [m.days.length, m.days[0].n, m.days[29].n], [30, 1, 30]);
  eq("a day with a page: its mood and colour", m.days[6], { n: 7, mood: "calm", color: "#8FBBD9" });
  eq("several pages in a day: the LAST one's", m.days[4], { n: 5, mood: "calm", color: "#8FBBD9" });
  eq("a day with no page", m.days[0], { n: 1, mood: "", color: "" });
  eq("a written day with no mood is still a written day", m.days[8], { n: 9, mood: NO_MOOD, color: NO_MOOD_COLOR });
  eq("an unknown mood is no mood", m.days[11], { n: 12, mood: NO_MOOD, color: NO_MOOD_COLOR });
  eq("the last minute of the month is the month's", m.days[29], { n: 30, mood: "cheerful", color: "#F6C445" });
  eq("the foot counts DAYS, of the month's days, and names the mood that is strictly ahead", m.foot, "5 OF 30 · MOSTLY CALM");
  ok("the lit cells are the days the foot counts", m.days.filter((d) => d.mood !== "").length === 5);

  eq("a tie names no mood", only(build([page(iso(2026, 11, 1), { mood: "calm" }), page(iso(2026, 11, 2), { mood: "calm" }), page(iso(2026, 11, 3), { mood: "sleepy" }), page(iso(2026, 11, 4), { mood: "sleepy" })], NOV), "month")[0].foot, "4 OF 30");
  eq("one day each names no mood", only(build([page(iso(2026, 11, 1), { mood: "calm" }), page(iso(2026, 11, 2), { mood: "sleepy" })], NOV), "month")[0].foot, "2 OF 30");
  eq("a single day names no mood", only(build([page(iso(2026, 11, 1), { mood: "calm" })], NOV), "month")[0].foot, "1 OF 30");
  eq("February in a leap year is OF 29", only(build([page(iso(2028, 2, 29))], { kind: "month", year: 2028, month: 2 }), "month")[0].foot, "1 OF 29");
  eq("…and has 29 cells", only(build([page(iso(2028, 2, 29))], { kind: "month", year: 2028, month: 2 }), "month")[0].days.length, 29);
}

/* ── a month, counted ── */
{
  const long = Array.from({ length: 412 }, (_, i) => "word" + i).join(" ");
  const entries = [
    page(iso(2026, 11, 1), { mood: "calm", body: long }),
    page(iso(2026, 11, 2), { mood: "calm" }),
    page(iso(2026, 11, 2, 23), { mood: "calm" }),
    page(iso(2026, 11, 3), { mood: "sleepy" }),
    page(iso(2026, 11, 4), { mood: "calm" }),
  ];
  const end = only(build(entries, NOV), "monthEnd")[0];
  eq("the top", end.top, "NOVEMBER, COUNTED");
  eq("the foot", end.foot, "EVERY NUMBER IS COUNTED FROM YOUR PAGES");
  eq("three stats: days written, the mood ahead (by days), the longest page in words", end.stats, [
    { value: "4", label: "days you wrote", mood: "" },
    { value: "3", label: "of them calm", mood: "calm" },
    { value: "412", label: "words on your longest page", mood: "" },
  ]);
  ok("the mood's count is never more than the days written (two calm pages on one day are one calm day)", Number(end.stats[1].value) <= Number(end.stats[0].value));

  const stats = (es: BookEntry[], range: BookRange = NOV) => only(build(es, range), "monthEnd")[0].stats;
  eq("one day: the singular, and nothing else to say", stats([page(iso(2026, 11, 1))]), [{ value: "1", label: "day you wrote", mood: "" }]);
  eq("a tie for the lead: no mood line", stats([page(iso(2026, 11, 1), { mood: "calm" }), page(iso(2026, 11, 2), { mood: "calm" }), page(iso(2026, 11, 3), { mood: "sleepy" }), page(iso(2026, 11, 4), { mood: "sleepy" })]).map((s) => s.label), ["days you wrote"]);
  eq("ahead, but written once: no mood line", stats([page(iso(2026, 11, 1), { mood: "calm" }), page(iso(2026, 11, 2), { mood: null })]).map((s) => s.label), ["days you wrote"]);
  eq("the day's LAST page is its mood: sleepy mornings, calm nights → calm", stats([page(iso(2026, 11, 1, 8), { mood: "sleepy" }), page(iso(2026, 11, 1, 22), { mood: "calm" }), page(iso(2026, 11, 2, 8), { mood: "sleepy" }), page(iso(2026, 11, 2, 22), { mood: "calm" })])[1], { value: "2", label: "of them calm", mood: "calm" });
  eq("pages with no mood are not a mood", stats([page(iso(2026, 11, 1), { mood: null }), page(iso(2026, 11, 2), { mood: null }), page(iso(2026, 11, 3), { mood: null })]).map((s) => s.label), ["days you wrote"]);
  eq("a mood's name is lower-cased inside the line; a group has a face too", stats([page(iso(2026, 11, 1), { mood: "group-low" }), page(iso(2026, 11, 2), { mood: "group-low" })])[1], { value: "2", label: "of them low", mood: "group-low" });
  eq("a two-word mood", stats([page(iso(2026, 11, 1), { mood: "in-love" }), page(iso(2026, 11, 2), { mood: "tender" })])[1], { value: "2", label: "of them in love", mood: "in-love" });

  const words = (n: number) => Array.from({ length: n }, () => "mug").join(" ");
  eq("19 words: too short to count", stats([page(iso(2026, 11, 1), { body: words(19) })]).length, 1);
  eq("20 words: counted", stats([page(iso(2026, 11, 1), { body: words(20) })])[1], { value: "20", label: "words on your longest page", mood: "" });
  eq("punctuation and line breaks are not words", stats([page(iso(2026, 11, 1), { body: words(20).replace(/ /g, " — \n") + " … !!" })])[1].value, "20");
  eq("1,204 words", stats([page(iso(2026, 11, 1), { body: words(1204) })])[1].value, "1,204");

  const han = (n: number) => "今天把他的杯子最后装进箱子里".repeat(Math.ceil(n / 14)).slice(0, n);
  eq("a Chinese page is counted in characters, with its own label", stats([page(iso(2026, 11, 1), { body: han(60) })])[1], { value: "60", label: "characters on your longest page", mood: "" });
  eq("39 characters: too short", stats([page(iso(2026, 11, 1), { body: han(39) })]).length, 1);
  eq("40 characters: counted", stats([page(iso(2026, 11, 1), { body: han(40) })])[1].value, "40");
  eq("spaces and line breaks are not characters; punctuation is", stats([page(iso(2026, 11, 1), { body: han(20) + "。\n\n " + han(20) + "！" })])[1].value, "42");
  eq("the longest page decides the unit: a long English page beats a short Chinese one", stats([page(iso(2026, 11, 1), { body: han(40) }), page(iso(2026, 11, 2), { body: words(300) })])[2], { value: "300", label: "words on your longest page", mood: "" });
  eq("…and a long Chinese page beats a short English one", stats([page(iso(2026, 11, 1), { body: han(400) }), page(iso(2026, 11, 2), { body: words(30) })])[2], { value: "400", label: "characters on your longest page", mood: "" });
  eq("each month counts its own pages", only(build([page(iso(2026, 10, 1), { body: words(50) }), page(iso(2026, 11, 1), { body: words(25) })]), "monthEnd").map((p) => p.stats[1].value), ["50", "25"]);

  eq("pageLength: English", pageLength("Packed his mug last. Couldn’t decide if it was mine to keep."), { unit: "words", n: 12 });
  eq("pageLength: Japanese", pageLength("今日は何もしなかった。それでいい。"), { unit: "chars", n: 17 });
  eq("pageLength: Korean is counted by the character, spaces out", pageLength("오늘은 아무것도 안 했다"), { unit: "chars", n: 10 });
  eq("pageLength: mostly English with a few hanzi stays words", pageLength("I learned the word 加油 today and I keep saying it"), { unit: "words", n: 11 });
  eq("pageLength: an emoji with a joiner is not a pile of characters", pageLength("今天很好👩‍🚀").n, 6);
  eq("pageLength: nothing", [pageLength(""), pageLength("   \n ")], [{ unit: "words", n: 0 }, { unit: "words", n: 0 }]);
  eq("pageLength: only emoji and dots are no words", pageLength("… 🙂 !!").n, 0);
}

/* ── a page ── */
{
  const body = "  I said no to something today\nand the world did not end.  \n\n<b>really</b> & *truly* ";
  const e = page(iso(2026, 11, 5, 21, 14), { id: "p1", mood: "cheerful", body, driftedLine: "and the world did not end." });
  const p = only(build([e], NOV), "entry")[0];
  eq("its id", p.id, "p1");
  eq("its day, two digits", p.day, "05");
  eq("its date line: weekday · month · time, upper-cased", p.dateLine, "THURSDAY · NOVEMBER · 21:14");
  eq("its mood, as the table has it", p.mood, { id: "cheerful", name: "Cheerful", color: "#F6C445", bg: "#FDF6E4" });
  ok("its words exactly as written: not trimmed, not escaped", p.body === body);
  eq("the line that drifted out, and its label", [p.drift, p.driftLabel], ["and the world did not end.", "THIS LINE DRIFTED OUT"]);
  ok("…still a piece of the body", p.body.includes(p.drift));
  eq("a page of words has no media", p.media, { type: "none" });
  eq("the labels a long page needs", [p.contLabel, p.continues], ["NOV 5 · CONTINUED", "CONTINUES →"]);

  const plain = only(build([page(iso(2026, 11, 19, 0, 5), { mood: null })], NOV), "entry")[0];
  eq("no mood: null", plain.mood, null);
  eq("no drifted line: none, and no label", [plain.drift, plain.driftLabel], ["", ""]);
  eq("five past midnight is 00:05 on the 19th", [plain.day, plain.dateLine], ["19", "THURSDAY · NOVEMBER · 00:05"]);
  eq("an unknown mood: null", only(build([page(iso(2026, 11, 19), { mood: "constructor" })], NOV), "entry")[0].mood, null);
  eq("a legacy mood is its face", only(build([page(iso(2026, 11, 19), { mood: "tender" })], NOV), "entry")[0].mood?.id, "in-love");
  eq("a group alone keeps its id (Swift has its drawing)", only(build([page(iso(2026, 11, 19), { mood: "group-low" })], NOV), "entry")[0].mood?.id, "group-low");
  eq("a whitespace drifted line is none", only(build([page(iso(2026, 11, 19), { driftedLine: "  \n" })], NOV), "entry")[0].drift, "");
  eq("a page with no body is an empty page, not a crash", only(build([{ id: "nb", date: iso(2026, 11, 19) }], NOV), "entry")[0].body, "");
  eq("a single-digit and a double-digit day", only(build([page(iso(2026, 11, 1)), page(iso(2026, 11, 30))], NOV), "entry").map((x) => x.day), ["01", "30"]);

  /* photos */
  const media = (over: Partial<BookEntry>) => only(build([page(iso(2026, 11, 9), over)], NOV), "entry")[0].media;
  eq("one photo", media({ type: "photo", mediaUri: "/old/container/j-1.jpg", media: ["/old/container/j-1.jpg"] }), { type: "photos", uris: ["file:///journal/j-1.jpg"] });
  eq("an old photo page with only its cover", media({ type: "photo", mediaUri: "file:///journal/j-1.jpg" }), { type: "photos", uris: ["file:///journal/j-1.jpg"] });
  eq("several: the cover first, the rest in their order", media({ type: "photo", media: ["a.jpg", "b.jpg", "c.jpg"], coverIndex: 2, mediaUri: "c.jpg" }), { type: "photos", uris: ["file:///journal/c.jpg", "file:///journal/a.jpg", "file:///journal/b.jpg"] });
  eq("a cover index that points nowhere is the first photo", photoUris({ id: "x", date: "", media: ["a.jpg", "b.jpg"], coverIndex: 7 }), ["a.jpg", "b.jpg"]);
  eq("a photo listed twice is one photo", photoUris({ id: "x", date: "", media: ["a.jpg", "b.jpg", "a.jpg"], coverIndex: 1 }), ["b.jpg", "a.jpg"]);
  eq("a missing file is dropped", media({ type: "photo", media: ["a.jpg", "gone.jpg", "c.jpg"] }), { type: "photos", uris: ["file:///journal/a.jpg", "file:///journal/c.jpg"] });
  eq("a missing cover: the next photo leads", media({ type: "photo", media: ["a.jpg", "gone.jpg"], coverIndex: 1 }), { type: "photos", uris: ["file:///journal/a.jpg"] });
  eq("every file missing: a page of words", media({ type: "photo", media: ["gone1.jpg", "gone2.jpg"] }), { type: "none" });
  eq("a photo page with nothing stored: none", media({ type: "photo" }), { type: "none" });
  const twelve = Array.from({ length: 12 }, (_, i) => `p${i}.jpg`);
  const nine = media({ type: "photo", media: twelve });
  ok("nine photos at most, the first nine", nine.type === "photos" && nine.uris.length === MAX_PHOTOS && nine.uris[8] === "file:///journal/p8.jpg");
  eq("a text page that somehow has media shows none", media({ type: "text", media: ["a.jpg"], mediaUri: "a.jpg" }), { type: "none" });

  /* voice and film */
  eq("a voice note: its length, and that it stays in the app", media({ type: "voice", mediaUri: "v.m4a", dur: 74 }), { type: "voice", label: "VOICE · 1:14 · STAYS IN THE APP" });
  eq("a voice note with no known length doesn't invent one", media({ type: "voice", mediaUri: "v.m4a" }), { type: "voice", label: "VOICE · STAYS IN THE APP" });
  eq("a zero length is not a length", media({ type: "voice", mediaUri: "v.m4a", dur: 0 }), { type: "voice", label: "VOICE · STAYS IN THE APP" });
  eq("a film", media({ type: "video", mediaUri: "f.mov", dur: 12 }), { type: "video", label: "FILM · 0:12 · STAYS IN THE APP" });
  eq("a film with no known length", media({ type: "video", mediaUri: "f.mov", dur: NaN }), { type: "video", label: "FILM · STAYS IN THE APP" });
  eq("a recording whose file is gone isn't said to stay in the app", [media({ type: "voice", mediaUri: "gone.m4a", dur: 74 }), media({ type: "video", mediaUri: "gone.mov" })], [{ type: "none" }, { type: "none" }]);
  eq("a voice page with no file: none", media({ type: "voice", dur: 74 }), { type: "none" });
}

/* ── the back cover ── */
{
  const back = only(build([page(iso(2026, 11, 5))]), "back")[0];
  eq("its two lines", back.lines, ["kept on this phone.", "carried by nobody."]);
  eq("its foot", back.foot, "KINDREDLY · 2026");
  eq("her picture, when there is one", back.wren, "file:///tmp/wren.png");
  eq("…and none when there isn't", only(build([page(iso(2026, 11, 5))], Y2026, { wren: "" }), "back")[0].wren, "");
}

/* ── daylight-saving days (New York: 8 March 2026 has 23 hours, 1 November 2026 has 25) ── */
{
  ok("8 March 2026 really is 23 hours here", new Date(2026, 2, 9).getTime() - new Date(2026, 2, 8).getTime() === 23 * 3600 * 1000);
  ok("1 November 2026 really is 25 hours here", new Date(2026, 10, 2).getTime() - new Date(2026, 10, 1).getTime() === 25 * 3600 * 1000);

  const march = [
    page(iso(2026, 3, 7, 23, 59), { id: "m7", mood: "sleepy" }),
    page(iso(2026, 3, 8, 0, 30), { id: "m8a", mood: "calm" }),
    page(iso(2026, 3, 8, 3, 30), { id: "m8b", mood: "cheerful" }), // after the skipped hour
    page(iso(2026, 3, 8, 23, 59), { id: "m8c", mood: "playful" }),
    page(iso(2026, 3, 9, 0, 1), { id: "m9", mood: "drained" }),
  ];
  const mm = only(build(march, { kind: "month", year: 2026, month: 3 }), "month")[0];
  eq("spring forward: March still has 31 cells and starts on a Sunday", [mm.days.length, mm.blanks], [31, 0]);
  eq("…the 7th, 8th and 9th each keep their own pages; the 8th is its last page's", [mm.days[6].mood, mm.days[7].mood, mm.days[8].mood], ["sleepy", "playful", "drained"]);
  eq("…the pages' days and times are the wall's", only(build(march, { kind: "month", year: 2026, month: 3 }), "entry").map((p) => p.day + " " + p.dateLine.split(" · ")[2]), ["07 23:59", "08 00:30", "08 03:30", "08 23:59", "09 00:01"]);
  eq("…three days written", only(build(march, { kind: "month", year: 2026, month: 3 }), "monthEnd")[0].stats[0].value, "3");

  // 01:30 happens twice on 1 November: once in daylight time (05:30 UTC), once in standard (06:30 UTC)
  const nov = [
    page(iso(2026, 10, 31, 23, 59), { id: "o31", mood: "sleepy" }),
    page("2026-11-01T05:30:00.000Z", { id: "n1a", mood: "calm" }),
    page("2026-11-01T06:30:00.000Z", { id: "n1b", mood: "cheerful" }),
    page(iso(2026, 11, 1, 23, 59), { id: "n1c", mood: "playful" }),
    page(iso(2026, 11, 2, 0, 1), { id: "n2", mood: "drained" }),
  ];
  const r = build(nov, NOV);
  eq("fall back: the 25-hour day is one day, with every page written in it, in the order written", only(r, "entry").map((p) => p.id + " " + p.day), ["n1a 01", "n1b 01", "n1c 01", "n2 02"]);
  eq("…both 01:30s read 01:30", only(r, "entry").slice(0, 2).map((p) => p.dateLine), ["SUNDAY · NOVEMBER · 01:30", "SUNDAY · NOVEMBER · 01:30"]);
  const nm = only(r, "month")[0];
  eq("…November has 30 cells; it starts on that Sunday (0 blanks Sunday-first, 6 Monday-first)", [nm.days.length, nm.blanks, leadingBlanks(2026, 11, 1)], [30, 0, 6]);
  eq("…the 1st is its last page's, and 31 October stayed in October", [nm.days[0].mood, nm.days[1].mood, nm.days.filter((d) => d.mood).length], ["playful", "drained", 2]);
  const yr = only(build([...march, ...nov]), "year")[0];
  eq("…the year's rows keep their lengths across both changes", [yr.months[2].days.length, yr.months[9].days.length, yr.months[10].days.length], [31, 31, 30]);
  eq("…and count 10 pages on 6 days in 3 months", yr.lead, "10 PAGES · 6 DAYS · 3 MONTHS");
}

/* ── nothing printed that the caller didn't word ── */
{
  asked.length = 0;
  const r = build([
    page(iso(2026, 10, 1), { mood: "calm", body: Array.from({ length: 30 }, () => "w").join(" "), driftedLine: "w w" }),
    page(iso(2026, 10, 2), { mood: "calm", type: "voice", mediaUri: "v.m4a", dur: 9 }),
    page(iso(2026, 11, 2), { type: "video", mediaUri: "f.mov" }),
  ]);
  const missing = Array.from(new Set(asked)).filter((k) => !(k in WORDS));
  eq("every key the model asks for is one of the book's", missing, []);
  ok("no line still holds an unfilled {placeholder}", !/\{\w+\}/.test(JSON.stringify(r.book)));
  ok("the book is plain JSON (it crosses the bridge as a string)", JSON.stringify(JSON.parse(JSON.stringify(r.book))) === JSON.stringify(r.book));
}

/* ── the words file has every key the model asks for (read as text: it imports i18n) ── */
{
  const { readFileSync } = await import("node:fs");
  const text = readFileSync(new URL("../data/strings-book.ts", import.meta.url), "utf8");
  const en = text.slice(text.indexOf("/* ── en"), text.indexOf("/* ── es"));
  const keys = new Set([...en.matchAll(/^\s*"([\w.]+)":/gm)].map((m) => m[1]));
  eq("strings-book.ts words every key of the book", Object.keys(WORDS).filter((k) => !keys.has(k)), []);
  const value = (k: string) => JSON.parse(new RegExp(`^\\s*"${k.replace(/\./g, "\\.")}":\\s*("(?:[^"\\\\]|\\\\.)*")`, "m").exec(en)?.[1] ?? '""');
  eq("…with the English this test builds with", Object.keys(WORDS).filter((k) => value(k) !== WORDS[k]), []);
  const page = ["jb.x.title", "jb.x.month", "jb.x.year", "jb.x.noneMonth", "jb.x.noneYear", "jb.x.ink", "jb.x.ink.sub", "jb.x.make", "jb.x.making", "jb.x.fc.a11y", "jb.x.pageOf", "jb.x.words", "jb.x.empty", "jb.x.write", "jb.x.fail.title", "jb.x.fail.body"];
  eq("…and the export page's keys, by the names KEYS.md promises", page.filter((k) => !keys.has(k)), []);
  ok("no exclamation marks (the app's voice)", !/!/.test([...keys].map(value).join(" ")));
}

if (fails) {
  console.log(`\n${fails} FAILED`);
  process.exit(1);
}
console.log("\nall ok");
