import { strings } from "../lib/i18n";

/* THE JOURNAL BOOK'S EXPORT PAGE — ITS WORDS (journal book, 2026-11-10).
   ────────────────────────────────────────────────────────────────────────
   The page Settings' "Export my journal" opens (/journal-book): a preview of the reader's own
   book, this month or this year, an ink saver, the key that makes the PDF (First Class) and the
   quiet link to the free text file. The book's OWN words (its cover, its counts, its back cover)
   are the model's, in src/data/strings-book.ts; these are only the page around it.

   ENGLISH ONLY for now: t() falls back to English, and the other eight languages are written
   natively after this (as each language, never translated; the comment on each key says what it
   is, where it sits and how long it may be). The three empty blocks are es, pt and id, which
   strings() requires.

   The voice: short, warm, lowercase-leaning, no exclamation marks. Wren does not speak on this
   page and is not named on it: of the journal she says "No one sees this. Not even me."

   Reused, no new copy: set.export (the page's title: the row that opened it), a11y.back,
   mf.result.lock (the wax-gold "1ST" tag on the key for a reader who is not First Class),
   pp.a11y.fc (what VoiceOver says for that tag: "First Class"), cp.fail.generic (the text
   export's failure, as in Settings).

   Imported for its side effect by the page (screens/journal-book/JournalBookNative) and by
   Settings (useSettingsModel: bk.set.sub). */

strings(
  /* ── en · English ── */
  {
    // Settings, THE QUIET, under "Export my journal" (set.export) on a build that can make the book: replaces set.export.sub there.
    // One line, two at most: the journal can leave as a book or as just its words
    "bk.set.sub": "Your journal lives only on this phone. Take it out as a book, or just the words.",

    // the segmented control under the preview, two parts side by side (System 15, like Me's Courier / Aura / Stamps); about 12 characters each
    "bk.range.month": "This month",
    "bk.range.year": "This year",
    // one quiet centred line under that control when this month has no page (its part is dimmed and can't be chosen)
    "bk.range.noMonth": "No pages this month yet.",

    // under the preview, small mono capitals: which printed page is in the middle, of how many the whole book has. {n} and {total} are numbers
    "bk.pageOf": "PAGE {n} OF {total}",
    // VoiceOver's name for the preview (one element; its value is the line above, and a swipe up or down turns the page)
    "bk.preview.a11y": "Your book, a preview",

    // the switch row under the control: its label (like a Settings switch) and the line under it. On: every page is printed on white.
    // The line must stay true: the colour stays in the big numbers, the calendar squares and the mood faces
    "bk.ink": "Save ink",
    "bk.ink.sub": "White pages. The colour stays in the numbers, the calendar and the faces.",

    // the main key at the foot (a wide capsule, System 600 16): about 18 characters
    "bk.make": "Make my book",
    // the same key while the PDF is being written (a spinner stands before it); one word if the language has one
    "bk.making": "Binding…",
    // the quiet text link under the key: the free export, a text file with the words only (no photos); about 20 characters
    "bk.words": "Just the words",

    // no page this year: the page shows only this line (centred, two lines at most) and the key under it
    "bk.empty": "No pages this year yet. A book starts with one.",
    // that key: opens a new journal page (Notes' +); about 16 characters
    "bk.empty.key": "Write a note",

    // the journal could not be read (storage failed): the page shows only this, centred. It must not sound like the journal is gone
    "bk.unread": "Your journal couldn't be read just now. Nothing was changed. Come back in a moment.",
    // an alert's body when the PDF could not be made (its title is set.export "Export my journal"); two short sentences
    "bk.fail": "The book couldn't be made this time. Your pages are safe.",
  },
  /* ── es ── */ {},
  /* ── pt ── */ {},
  /* ── id ── */ {},
);
