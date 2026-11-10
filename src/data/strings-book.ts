import { strings } from "../lib/i18n";

/* THE JOURNAL BOOK'S WORDS (journal book, 2026-11-10; contract .claude/journal-book/CONTRACT.md).
   ────────────────────────────────────────────────────────────────────────
   Notes can already leave the phone as a plain text file, free (strings-audit-notes: set.export,
   jx.*). The BOOK is the First Class version: the reader's own pages typeset as an A5 PDF, made on
   the phone. This file holds the book's own words (the export page around it keeps its words in
   strings-book-screen.ts, bk.*):

   - jb.*    THE BOOK ITSELF: what is PRINTED on its pages (the cover, the year at a glance, each
             month's calendar and count, the small labels on a page, the back cover). Resolved by
             lib/journal-book and handed to Swift inside the model: Swift has no words of its own.

   ENGLISH ONLY FOR NOW: t() falls back to English, and the other eight languages are written
   natively after this (as each language, never translated; the comment on each key says what it
   is, where it sits and how long it may be). The three empty blocks are es, pt and id, which
   strings() requires; fr de it ja ko are optional and left out until they are written.

   THE BOOK IS PRINT. Its small mono labels are set in capitals: write them in capitals where the
   language has them (the model also upper-cases them in the reader's locale, so a month or a mood
   name dropped into one comes out in capitals too). Every {n} is a count taken from the reader's
   own pages (owner's hard rule): a line never implies a number it doesn't carry. A count of one
   has its own line (".1"), as ld.left.a11y.1 does.

   Wren is never named in the book: she says of the journal "No one sees this. Not even me."

   No key is reused from elsewhere: the book's failure has its own two lines (they say the pages
   are safe, which cp.fail.generic doesn't), and nothing printed borrows a screen's wording.

   Imported for its side effect by lib/journal-book (the book's words) and by the export page. */

strings(
  /* ── en · English ── */
  {

    // ── THE BOOK: THE COVER ──
    // the cover's small line at the top: the app's name, never translated, capitals
    "jb.cover.top": "KINDREDLY",
    // the cover's title for a whole year, set very large, lowercase, in two lines: the line break (\n) is part of it,
    // so put it where the phrase breaks naturally; each line about 8 characters
    "jb.cover.year": "my year\nin pages",
    // the same for one month: {month} is that month's name in the reader's language, lowercase where the language allows ("november");
    // the month sits on the first line and may be up to 9 or 10 letters, so keep the words around it as few as possible
    "jb.cover.month": "my {month}\nin pages",
    // under the title, small: the reader's pen name; shown only when they have one. {name} is theirs, exactly as they wrote it
    "jb.cover.by": "— {name}",
    // the cover's small line at the bottom: the year and how many pages the book holds ({pages} is jb.pages / jb.pages.1 below)
    "jb.cover.foot": "{year} · {pages}",
    // counts, in capitals, used on the cover's foot and the year page's lead; one is its own line
    "jb.pages.1": "1 PAGE",
    "jb.pages": "{n} PAGES",
    "jb.days.1": "1 DAY",
    "jb.days": "{n} DAYS",
    "jb.months.1": "1 MONTH",
    "jb.months": "{n} MONTHS",

    // ── THE BOOK: THE YEAR AT A GLANCE ──
    // (its lead is the three counts above joined by " · ": "112 PAGES · 97 DAYS · 11 MONTHS")
    // the small line at the bottom of the page of squares, one row per month: what a coloured square is; capitals, one line
    "jb.year.foot": "EACH SQUARE IS A DAY YOU WROTE",

    // ── THE BOOK: A MONTH'S CALENDAR ──
    // the small line under the calendar: {n} days with a page, of the {total} days that month has; capitals
    "jb.month.foot": "{n} OF {total}",
    // added after it (" · ") only when one mood really was ahead of every other that month: {mood} is the mood's name; capitals
    "jb.month.mostly": "MOSTLY {mood}",

    // ── THE BOOK: A MONTH, COUNTED (a dark page of up to three big numbers, each with one line under it) ──
    // the small line at the top: {month} is the month's full name; capitals
    "jb.end.top": "{month}, COUNTED",
    // under the first number (how many days of the month have a page); lowercase, no number in the line; one day has its own line
    "jb.stat.days.1": "day you wrote",
    "jb.stat.days": "days you wrote",
    // under the second number (how many of those days were in the month's commonest mood; always two or more): {mood} is its name, lowercase;
    // the mood's face is drawn right after the line
    "jb.stat.mood": "of them {mood}",
    // under the third number: the length of the month's longest page, in words …
    "jb.stat.words": "words on your longest page",
    // … or, when that page is mostly Chinese, Japanese or Korean, in characters
    "jb.stat.chars": "characters on your longest page",
    // the small line at the bottom of that page: the promise that nothing on it is estimated; capitals, one line
    "jb.end.foot": "EVERY NUMBER IS COUNTED FROM YOUR PAGES",

    // ── THE BOOK: ON A PAGE ──
    // bottom corner of a long page whose words run on to the next sheet; capitals, the arrow stays
    "jb.continues": "CONTINUES →",
    // top of each following sheet: {date} is the page's day and month, short, in the reader's own order ("NOV 19", "19 NOV"); capitals
    "jb.cont": "{date} · CONTINUED",
    // beside the one line of a page that the reader let drift out (it is marked in the page's colour); capitals, one line
    "jb.drift": "THIS LINE DRIFTED OUT",
    // a page that is a voice note: paper can't hold the recording, and the page says so. {dur} is its length ("1:14"); capitals.
    // "STAYS IN THE APP" must stay literally true: the recording is not in the book
    "jb.voice": "VOICE · {dur} · STAYS IN THE APP",
    // the same when the length isn't known
    "jb.voice.plain": "VOICE · STAYS IN THE APP",
    // a page that is a film (a video), the same way
    "jb.film": "FILM · {dur} · STAYS IN THE APP",
    "jb.film.plain": "FILM · STAYS IN THE APP",

    // ── THE BOOK: THE BACK COVER ──
    // two short lowercase lines, set large, each ending in a full stop: the journal lives only on this phone, and no courier ever carried it
    // (in this app letters are carried; the journal never is). About 20 characters each
    "jb.back.1": "kept on this phone.",
    "jb.back.2": "carried by nobody.",
    // the back cover's small line at the bottom: the app's name and the book's year; capitals
    "jb.back.foot": "KINDREDLY · {year}",
  },
  /* ── es · Español (to be written natively) ── */
  {},
  /* ── pt · Português (to be written natively) ── */
  {},
  /* ── id · Bahasa Indonesia (to be written natively) ── */
  {},
);
