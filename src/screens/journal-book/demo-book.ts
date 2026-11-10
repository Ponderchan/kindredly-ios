import { Share } from "react-native";
import { renderJournalBook, type Book, type BookMedia, type BookMood, type BookPage } from "../../../modules/kindredly-ui/src/JournalBook";
import { MOODS, moodFace, moodLabel } from "../../data/moods";
import { demoJournal } from "../../data/demo";
import type { JournalEntry } from "../../lib/journal";
import type { BookRange, BookSource } from "./journal-book-model";

/* dev only — A BOOK FROM THE SAMPLE JOURNAL (journal book, 2026-11-10).
   ────────────────────────────────────────────────────────────────────────
   The export page (/journal-book) reads the reader's own journal, and samples are never in a real
   book (the contract). So that the whole page can be walked on a simulator that has no journal,
   kindredly:///dev/journal-book opens the SAME screen (JournalBookNative) with this as its source
   instead of src/lib/journal-book: the same three calls (rangesWithPages, loadBook, exportBook),
   answered from data/demo demoJournal. The PDF is the real one (renderJournalBook, then the share
   sheet).

   It is NOT the product's book builder: that is src/lib/journal-book-core buildBook, the model
   slice's, which this file cannot see from its worktree. It only fills the contract's shapes
   (.claude/journal-book/CONTRACT.md) from the sample pages, simply: the cover, the year page (a
   year only), then each month with its calendar, its pages oldest first and its count, then the
   back cover. Its words are English, typed here: a dev page, like the journal book lab. Every
   number it prints is still counted from the pages it was given. Once the model is merged this
   could call buildBook on the same sample pages instead; nothing else would change.

   The sample photos are remote urls and are passed through as they are: the Swift page draws a
   photo only when it is a file on this phone, and lays the page out without the ones it can't
   read. */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const two = (n: number): string => String(n).padStart(2, "0");
const clock = (s: number): string => `${Math.floor(s / 60)}:${two(Math.round(s) % 60)}`;

function inRange(d: Date, range: BookRange): boolean {
  if (d.getFullYear() !== range.year) return false;
  return range.kind === "year" || d.getMonth() + 1 === range.month;
}

function moodOf(e: JournalEntry): BookMood | null {
  const face = moodFace(e.mood);
  if (!face) return null;
  return { id: face, name: moodLabel(e.mood), color: MOODS[face].col, bg: MOODS[face].bg };
}

function mediaOf(e: JournalEntry): BookMedia {
  if (e.type === "photo") {
    const uris = (e.media?.length ? e.media : e.mediaUri ? [e.mediaUri] : []).slice(0, 9);
    return uris.length ? { type: "photos", uris } : { type: "none" };
  }
  if (e.type === "voice" && e.mediaUri) return { type: "voice", label: `VOICE${e.dur ? ` · ${clock(e.dur)}` : ""} · STAYS IN THE APP` };
  if (e.type === "video" && e.mediaUri) return { type: "video", label: `FILM${e.dur ? ` · ${clock(e.dur)}` : ""} · STAYS IN THE APP` };
  return { type: "none" };
}

/** The sample pages of a range, oldest first (a page whose date can't be read is left out). */
function pagesIn(entries: readonly JournalEntry[], range: BookRange): { e: JournalEntry; d: Date }[] {
  return entries
    .map((e) => ({ e, d: new Date(e.date) }))
    .filter((x) => !Number.isNaN(x.d.getTime()) && inRange(x.d, range))
    .sort((a, b) => a.d.getTime() - b.d.getTime());
}

/** The contract's `Book` from some journal pages; null when the range holds none. */
export function simpleBook(entries: readonly JournalEntry[], range: BookRange, letterFont: string): Book | null {
  const list = pagesIn(entries, range);
  if (!list.length) return null;
  const year = String(range.year);
  const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

  // the faces on the cover: the most written first
  const counts = new Map<string, number>();
  for (const { e } of list) {
    const m = moodOf(e);
    if (m) counts.set(m.id, (counts.get(m.id) ?? 0) + 1);
  }
  const faces = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);

  const monthsWith = [...new Set(list.map(({ d }) => d.getMonth()))].sort((a, b) => a - b);
  const dayKeys = new Set(list.map(({ d }) => `${d.getMonth()}-${d.getDate()}`));
  const pages: BookPage[] = [];

  pages.push({
    kind: "cover",
    title: range.kind === "year" ? "my year in pages" : `my ${MONTHS[range.month - 1].toLowerCase()} in pages`,
    by: "",
    faces,
    top: "KINDREDLY",
    foot: `${year} · ${plural(list.length, "PAGE", "PAGES")}`,
  });

  /** the last page's mood colour of each day of a month ("" for a day without a page) */
  const dayColours = (month: number): { mood: string; color: string }[] => {
    const n = new Date(range.year, month + 1, 0).getDate();
    const out = Array.from({ length: n }, () => ({ mood: "", color: "" }));
    for (const { e, d } of list) {
      if (d.getMonth() !== month) continue;
      const m = moodOf(e);
      // a page with no mood still marks its day, in the ink its numeral is printed in
      out[d.getDate() - 1] = { mood: m?.id ?? "", color: m?.color ?? "#1E1B35" };
    }
    return out;
  };

  if (range.kind === "year") {
    pages.push({
      kind: "year",
      year,
      lead: [plural(list.length, "PAGE", "PAGES"), plural(dayKeys.size, "DAY", "DAYS"), plural(monthsWith.length, "MONTH", "MONTHS")].join(" · "),
      months: monthsWith.map((m) => ({ label: MONTHS[m].slice(0, 3).toUpperCase(), days: dayColours(m).map((x) => x.color) })),
      foot: "EACH SQUARE IS A DAY YOU WROTE",
    });
  }

  for (const m of monthsWith) {
    const mine = list.filter(({ d }) => d.getMonth() === m);
    const days = dayColours(m);
    const written = days.filter((x) => x.color).length;
    const short = MONTHS[m].slice(0, 3).toUpperCase();
    pages.push({
      kind: "month",
      label: short,
      blanks: new Date(range.year, m, 1).getDay(), // the week starts on Sunday here
      days: days.map((x, i) => ({ n: i + 1, mood: x.mood, color: x.color })),
      foot: `${written} OF ${days.length}`,
    });
    for (const { e, d } of mine) {
      pages.push({
        kind: "entry",
        id: e.id,
        day: two(d.getDate()),
        dateLine: `${WEEKDAYS[d.getDay()].toUpperCase()} · ${MONTHS[m].toUpperCase()} · ${two(d.getHours())}:${two(d.getMinutes())}`,
        mood: moodOf(e),
        body: e.body ?? "",
        drift: e.driftedLine ?? "",
        driftLabel: e.driftedLine ? "THIS LINE DRIFTED OUT" : "",
        media: mediaOf(e),
        contLabel: `${two(d.getDate())} ${short} · CONTINUED`,
        continues: "CONTINUES →",
      });
    }
    const words = mine.reduce((n, { e }) => n + (e.body ?? "").split(/\s+/).filter(Boolean).length, 0);
    pages.push({
      kind: "monthEnd",
      top: `${MONTHS[m].toUpperCase()}, COUNTED`,
      stats: [
        { value: String(written), label: written === 1 ? "day you wrote" : "days you wrote", mood: "" },
        { value: String(mine.length), label: mine.length === 1 ? "page" : "pages", mood: "" },
        ...(words ? [{ value: String(words), label: words === 1 ? "word" : "words", mood: "" }] : []),
      ],
      foot: `KINDREDLY · ${year}`,
    });
  }

  pages.push({ kind: "back", lines: ["kept on this phone.", "carried by nobody."], wren: "", foot: `KINDREDLY · ${year}` });
  return { fileStem: range.kind === "year" ? `kindredly-book-${year}` : `kindredly-book-${year}-${two(range.month)}`, letterFont, pages };
}

/** The dev page's source: the sample journal, every sample page (store mode or not).
    `labPhotos`: each sample photo becomes the journal book lab's stand-in ("lab:<n>", a tinted
    block Swift draws without a file: KBookImages.isLab), so the photo layouts can be seen on a
    simulator whose sample photos are only urls. */
export function demoBookSource(letterFont: string, opts: { labPhotos?: boolean } = {}): BookSource {
  const entries = (): JournalEntry[] => {
    const all = demoJournal({ store: false });
    if (!opts.labPhotos) return all;
    return all.map((e) => (e.type === "photo" ? { ...e, mediaUri: "lab:1", media: (e.media?.length ? e.media : [e.mediaUri ?? ""]).map((_, i) => `lab:${i + 1}`) } : e));
  };
  const count = (range: BookRange): number => pagesIn(entries(), range).length;
  return {
    async rangesWithPages(now) {
      const y = now.getFullYear();
      return { month: count({ kind: "month", year: y, month: now.getMonth() + 1 }) > 0, year: count({ kind: "year", year: y }) > 0 };
    },
    async loadBook(range) {
      return { book: simpleBook(entries(), range, letterFont) };
    },
    async exportBook(range, inkSaver) {
      const book = simpleBook(entries(), range, letterFont);
      if (!book) throw new Error("journal-book (demo): no sample page in this range");
      const url = await renderJournalBook(book, inkSaver);
      const res = await Share.share({ url });
      return res.action === Share.dismissedAction ? "dismissed" : "shared";
    },
  };
}
