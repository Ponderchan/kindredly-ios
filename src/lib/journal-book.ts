import { Share } from "react-native";
import { File } from "expo-file-system";
import { hasJournalBook, renderJournalBook, type BookMood } from "../../modules/kindredly-ui/src/JournalBook";
import { MOODS, MOOD_GROUP_FACES, isGroupOnly, moodFace, moodGroup, moodLabel, moodName } from "../data/moods";
import { LOCAL_PROFILE_KEY } from "./auth";
import { birdImageRef, useBirdImage } from "./bird-images";
import { fmt as fmtDuration, firstWeekday, localeTag, noteDay, time24 } from "./format";
import { getLang, t } from "./i18n";
import { readJournal } from "./journal";
import { bookPages, buildBook, rangeFor, type BookFormat, type BookRange, type BookRangeKind, type BookResult } from "./journal-book-core";
import { exportPages } from "./journal-export";
import { parseLocal, visibleProfile } from "./profile-local-core";
import { scopedTo, storageOwner } from "./scoped-store";
import { supabase } from "./supabase";
import { DEFAULT_LETTER_FONT } from "../theme/post";
import { storedLetterFont } from "./theme";
import "../data/strings-book"; // jb.*

/* THE JOURNAL BOOK, FOR THE EXPORT PAGE (journal book, 2026-11-10; contract
   .claude/journal-book/CONTRACT.md).
   ────────────────────────────────────────────────────────────────────────
   The glue over lib/journal-book-core (which decides every page, count and
   word, and is node-tested): it reads what the core is handed and nothing
   else.

   THE JOURNAL STAYS LOCAL-ONLY (lib/journal's promise). Nothing here sends
   anything anywhere: the book is built in memory, drawn by Swift into one
   PDF in the app's own cache, and leaves the phone only if the reader picks
   somewhere in the iOS share sheet themselves.

   - THE PAGES are read with readJournal, which REJECTS when the journal
     can't be read: a failed read is said as a failure, never shown as "no
     pages yet" on a page whose whole job is the reader's pages.
   - THE PEN NAME is the pen name alone (lib/auth's `handle`: the phone's
     copy over the account's, never the legal name Apple or Google filled
     in), and the LETTER FONT is the one Settings shows. The page can pass
     both from its hooks; left out, they are read from where those hooks
     read them. A pen name or font that can't be read is not worth losing
     the book over: the cover goes without the name, the pages use the
     default font, and the log says why.
   - THE WORDS AND DATES are the reader's language: t(), and the same locale
     and FIRST WEEKDAY Notes' own calendar uses (lib/format firstWeekday),
     so the book's month reads like the calendar in Notes.
   - A PHOTO is in the book only if its file is still on the phone (the
     journal re-resolves every stored path against today's container; a
     file that is gone is dropped, and a page whose photos are all gone is a
     page of words). The same check stands behind "STAYS IN THE APP" on a
     voice note or a film.
   - MOOD COLOURS are the face table's (data/moods col / bg), as the
     approved pages are drawn. A page that chose only a group has no face
     of its own: it takes its group's first face's colours and keeps the
     group's own icon and name.
   - HER PICTURE on the back cover is the brand bird (pose "bookBack"),
     captured while the export page is open (useBookWren). Until that
     capture lands the back cover goes without her rather than wait.

   exportBook renders through Swift and opens the share sheet (React
   Native's own Share, as the text export does). The sheet's Cancel is not a
   failure. Every real failure is logged and thrown to the page, which says
   so (jb.x.fail.*); nothing is swallowed. */

export { rangeFor };
export type { BookRange, BookRangeKind, BookResult };

/** What the page may hand over from its hooks; anything left out is read from the phone. */
export type BookOptions = {
  /** the moment the book is made (default: now) */
  now?: Date;
  /** useAuth().handle */
  penName?: string;
  /** useLetterFont() */
  letterFont?: string;
  /** useBookWren() */
  wren?: string;
};

/** A stored mood as the book paints it; null for none and for one this app can't name. */
export function bookMood(id: string | null | undefined): BookMood | null {
  if (isGroupOnly(id)) {
    // a group alone: its own icon and name, its first face's colours (the book has one colour table)
    const lead = MOODS[MOOD_GROUP_FACES[moodGroup(id)][0]];
    return { id, name: moodLabel(id), color: lead.col, bg: lead.bg };
  }
  const face = moodFace(id);
  if (!face) return null;
  const m = MOODS[face];
  return { id: face, name: moodName(face), color: m.col, bg: m.bg };
}

/** A stored media uri, if its file is still on this phone (an absolute file:// uri); else null. */
export function existingFile(uri: string): string | null {
  const at = uri.startsWith("/") ? "file://" + uri : uri;
  if (!at.startsWith("file://")) return null;
  try {
    return new File(at).exists ? at : null;
  } catch (e) {
    console.warn("[journal-book] a media file couldn't be checked; leaving it out:", e);
    return null;
  }
}

/** Today's BookFormat: i18n's words, the reader's locale, Notes' first weekday. */
export function bookFormat(): BookFormat {
  const locale = localeTag();
  const lang = getLang();
  const monthOf = (year: number, month: number, style: "long" | "short") => new Date(year, month - 1, 1, 12).toLocaleDateString(locale, { month: style });
  return {
    t,
    upper: (s) => s.toLocaleUpperCase(locale),
    lower: (s) => s.toLocaleLowerCase(locale),
    monthLong: (y, m) => monthOf(y, m, "long"),
    monthShort: (y, m) => monthOf(y, m, "short").replace(/\.$/, ""),
    // German writes its nouns with a capital, in a lowercase title too
    coverMonth: (y, m) => (lang === "de" ? monthOf(y, m, "long") : monthOf(y, m, "long").toLocaleLowerCase(locale)),
    weekday: (d) => d.toLocaleDateString(locale, { weekday: "long" }),
    time: (d) => time24(d, { locale }),
    dayMonth: (d) => noteDay(d, { locale }),
    duration: fmtDuration,
    count: (n) => n.toLocaleString(locale),
    firstWeekday: firstWeekday(lang),
  };
}

/** The pen name as lib/auth shows it (the phone's copy over the account's), read outside React.
    The account's copy is on the session already held on the phone. "" for none, and when it
    can't be read. */
async function storedPenName(): Promise<string> {
  let meta: Record<string, unknown> = {};
  try {
    const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
    meta = (data.session?.user?.user_metadata as Record<string, unknown> | undefined) ?? {};
  } catch (e) {
    console.warn("[journal-book] the account's pen name wasn't read:", e);
  }
  let local: Record<string, unknown> = {};
  try {
    local = parseLocal(await scopedTo(await storageOwner()).getItem(LOCAL_PROFILE_KEY));
  } catch (e) {
    console.warn("[journal-book] the phone's pen name wasn't read:", e);
  }
  const handle: unknown = visibleProfile(meta, local).handle;
  return typeof handle === "string" ? handle.trim() : "";
}

/** Her picture for the back cover, if it has been captured and its file is still there. */
function capturedWren(): string {
  const uri = birdImageRef("bookBack")?.uri;
  return (uri && existingFile(uri)) || "";
}

/** For the export page: keeps her back-cover picture captured while the page is mounted, and
    answers its file uri ("" until the first capture lands). Pass it to loadBook / exportBook as
    `wren`. */
export function useBookWren(): string {
  return useBirdImage("bookBack") ?? "";
}

/** THIS MONTH / THIS YEAR: which have at least one of the reader's pages, and whether the
    journal has any page of theirs at all (`any` false: the page's empty state). Rejects when
    the journal can't be read. */
export async function rangesWithPages(now: Date = new Date()): Promise<{ month: boolean; year: boolean; any: boolean }> {
  const entries = await readJournal();
  return {
    month: bookPages(entries, rangeFor("month", now)).pages.length > 0,
    year: bookPages(entries, rangeFor("year", now)).pages.length > 0,
    any: exportPages(entries).length > 0,
  };
}

/** The book for a range, ready for Swift: `pages` 0 means nothing to bind (the book has no
    pages); `skipped` is how many of the reader's pages were left out because their date can't
    be read. Rejects when the journal can't be read. */
export async function loadBook(range: BookRange, opts: BookOptions = {}): Promise<BookResult> {
  const entries = await readJournal();
  const penName =
    opts.penName ??
    (await storedPenName().catch((e) => {
      console.warn("[journal-book] no pen name for the cover:", e);
      return "";
    }));
  const letterFont =
    opts.letterFont ??
    (await storedLetterFont().catch((e) => {
      console.warn("[journal-book] the saved letter font wasn't read, using the default:", e);
      return DEFAULT_LETTER_FONT;
    }));
  return buildBook({
    entries,
    range,
    now: opts.now ?? new Date(),
    penName,
    letterFont,
    mood: bookMood,
    file: existingFile,
    wren: opts.wren ?? capturedWren(),
    fmt: bookFormat(),
  });
}

/* one book at a time: a second tap while a book is being made gets the first one's answer,
   never a second render or a second share sheet over the first */
let making: Promise<{ pages: number; uri: string } | null> | null = null;

/** Make the book's PDF and hand it to the iOS share sheet. null: the range has no page (nothing
    was made). Resolves once the share sheet has closed, whatever the reader did there. REJECTS
    when the journal can't be read, this binary can't draw the book, the drawing fails or the
    sheet can't open: the page says so (jb.x.fail.title / jb.x.fail.body). */
export function exportBook(range: BookRange, inkSaver: boolean, opts: BookOptions = {}): Promise<{ pages: number; uri: string } | null> {
  if (making) return making;
  const run = (async () => {
    try {
      // asked first: there is no point building a book this binary can't draw
      if (!hasJournalBook()) throw new Error("journal-book: this build can't draw the book");
      const { book, pages } = await loadBook(range, opts);
      if (!pages) return null;
      const uri = await renderJournalBook(book, inkSaver);
      await Share.share({ url: uri });
      return { pages, uri };
    } catch (e) {
      console.warn("[journal-book] the book wasn't made:", e);
      throw e;
    }
  })();
  making = run;
  const done = () => {
    if (making === run) making = null;
  };
  run.then(done, done);
  return run;
}
