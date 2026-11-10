import { requireOptionalNativeModule } from "expo";

/* THE JOURNAL BOOK, ACROSS THE BRIDGE (journal book, 2026-11-10; contract
   .claude/journal-book/CONTRACT.md).
   ────────────────────────────────────────────────────────────────────────
   Notes can leave the phone as a plain text file, free. The BOOK is the
   First Class version: the reader's own pages typeset as an A5 PDF, made
   ON THE PHONE by Swift (Portable/Book) — nothing about the journal goes
   anywhere, and there is no network in any of it.

   TS builds the whole book as one plain object (src/lib/journal-book-core:
   which pages, in what order, every count and every word already in the
   reader's language) and Swift only draws it. The types below ARE the
   contract between the two: Swift decodes exactly these shapes, so a field
   is never renamed or re-meant here without the Swift side changing with
   it.

   The two native functions are new in the binary that carries the book, and
   JavaScript travels over the air to older binaries: hasJournalBook() asks
   the module itself (never a version number) and is false on a binary from
   before them, on Android, and when the call fails; renderJournalBook()
   rejects there instead of pretending. Settings keeps its plain-text export
   wherever hasJournalBook() is false. */

/** A mood as a page is painted in it: src/data/moods.ts `col` and `bg`. `id` is the face Swift
    draws (KMoodArt "mood-<id>": a face, or "group-calm" … for a page that chose only a group). */
export type BookMood = { id: string; name: string; color: string; bg: string };

export type BookMedia =
  | { type: "none" }
  /** file:// uris on this phone, 1…9, the cover first */
  | { type: "photos"; uris: string[] }
  /** "VOICE · 1:14 · STAYS IN THE APP" */
  | { type: "voice"; label: string }
  /** "FILM · 0:12 · STAYS IN THE APP" */
  | { type: "video"; label: string };

export type BookPage =
  /** faces: up to five mood ids, the most written first; by: "— Mira" or "" */
  | { kind: "cover"; title: string; by: string; faces: string[]; top: string; foot: string }
  /** days: one string per day of that month, "" (no page) or the colour "#RRGGBB" of that day's page */
  | { kind: "year"; year: string; lead: string; months: { label: string; days: string[] }[]; foot: string }
  /** label "NOV"; blanks: empty cells before day 1 in a 7-column week that starts on the reader's
      first weekday; a day's mood "" = no page that day */
  | { kind: "month"; label: string; blanks: number; days: { n: number; mood: string; color: string }[]; foot: string }
  /** 1…3 stats, each a real count; mood "" or a mood id whose face is drawn after the label */
  | { kind: "monthEnd"; top: string; stats: { value: string; label: string; mood: string }[]; foot: string }
  /** day "05"; dateLine "THURSDAY · NOVEMBER · 21:14"; drift: the exact line that drifted out ("" none),
      a substring of body when it still is one; contLabel "NOV 19 · CONTINUED"; continues "CONTINUES →" */
  | {
      kind: "entry";
      id: string;
      day: string;
      dateLine: string;
      mood: BookMood | null;
      body: string;
      drift: string;
      driftLabel: string;
      media: BookMedia;
      contLabel: string;
      continues: string;
    }
  /** wren: "" or a file:// uri of her picture */
  | { kind: "back"; lines: string[]; wren: string; foot: string };

export type Book = {
  /** "kindredly-book-2026" | "kindredly-book-2026-11" */
  fileStem: string;
  /** the reader's Letter font key, as KType's KLetterFace reads it */
  letterFont: string;
  /** in print order */
  pages: BookPage[];
};

type Native = {
  hasJournalBook?: () => boolean;
  renderJournalBook?: (json: string, inkSaver: boolean) => Promise<string>;
};

const native = (): Native | null => requireOptionalNativeModule<Native>("KindredlyUI");

/* Asked once and remembered: a binary can't gain the renderer while it runs. */
let has: boolean | undefined;

/** Whether this binary's Swift can make the book. false on a binary from before it, on Android,
    and when the question itself fails. */
export function hasJournalBook(): boolean {
  if (has !== undefined) return has;
  let there = false;
  try {
    const n = native();
    there = typeof n?.hasJournalBook === "function" && typeof n.renderJournalBook === "function" && n.hasJournalBook() === true;
  } catch (e) {
    console.log("[kindredly-ui] could not ask for the journal book, keeping the text export:", e);
  }
  has = there;
  return there;
}

/** Draw the book as an A5 PDF in the phone's cache and say where it is (a file:// uri). Rejects
    on a binary without the renderer, and when Swift fails: the caller says so, nothing is
    swallowed. `inkSaver`: white page grounds (the colour stays in the numerals, squares and faces). */
export async function renderJournalBook(book: Book, inkSaver: boolean): Promise<string> {
  const n = native();
  if (typeof n?.renderJournalBook !== "function") throw new Error("journal book: this build has no renderJournalBook");
  const out: unknown = await n.renderJournalBook(JSON.stringify(book), inkSaver === true);
  if (typeof out !== "string" || !out) throw new Error("journal book: the renderer answered no file");
  // a bare path is a file too (Share wants the uri)
  return out.startsWith("/") ? "file://" + out : out;
}
