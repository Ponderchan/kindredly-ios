# Journal book: the export page's keys and calls (book-model assistant, 2026-11-10)

These names are final. The words live in `src/data/strings-book.ts` (English only for now); import
that file for its side effect (`import "../data/strings-book";`) where the page resolves them with
`t()`.

## The export page's words (route /journal-book)

jb.x.title = Your journal, as a book
jb.x.month = THIS MONTH
jb.x.year = THIS YEAR
jb.x.noneMonth = Nothing written this month yet.
jb.x.noneYear = Nothing written this year yet.
jb.x.ink = Save ink
jb.x.ink.sub = White pages. The color stays in the numbers and the faces.
jb.x.make = Make my book
jb.x.making = Binding…
jb.x.fc.a11y = First Class only
jb.x.pageOf = Page {n} of {total}
jb.x.words = Just the words
jb.x.empty = Nothing to bind yet. A book starts with one page.
jb.x.write = Write a note
jb.x.fail.title = The book didn't come together
jb.x.fail.body = Your pages are safe. Try again in a moment.

Notes on use:
- jb.x.pageOf: {n} and {total} are numbers of RENDERED pages (the paginated list Swift's
  KBookRenderer.pages returns), not the reader's journal pages.
- jb.x.fc.a11y: read after the key's own label for a non-member ("Make my book, First Class only").
- jb.x.noneMonth / jb.x.noneYear: the line shown for a range whose segment is disabled.
- jb.x.empty + jb.x.write: the whole journal has no page of the reader's own (no preview).
- jb.x.fail.title / jb.x.fail.body: the alert when loading, rendering or sharing the book fails.

## The TS the page calls (src/lib/journal-book.ts)

```ts
import { exportBook, loadBook, rangeFor, rangesWithPages, useBookWren, type BookRange, type BookRangeKind } from "../lib/journal-book";
import { hasJournalBook, type Book } from "../../modules/kindredly-ui";

type BookRangeKind = "month" | "year";
type BookRange = { kind: "year"; year: number } | { kind: "month"; year: number; month: number }; // month 1…12 (NOT 0…11)
type BookOptions = { now?: Date; penName?: string; letterFont?: string; wren?: string };          // all optional

rangeFor(kind: BookRangeKind, now: Date): BookRange           // THIS MONTH / THIS YEAR of `now`, local time
rangesWithPages(now?: Date): Promise<{ month: boolean; year: boolean; any: boolean }>
   // any: the journal has at least one page of the reader's own, in any year (false → the empty
   // state: jb.x.empty + jb.x.write). REJECTS when the journal can't be read.
loadBook(range, opts?): Promise<{ book: Book; pages: number; skipped: number }>
   // pages 0 → book.pages is [] (nothing to preview). REJECTS when the journal can't be read.
exportBook(range, inkSaver: boolean, opts?): Promise<{ pages: number; uri: string } | null>
   // null: nothing to bind (no page in the range). Resolves after the share sheet closes (its own
   // Cancel is not a failure). REJECTS on any failure (journal unreadable, no native renderer,
   // render failed, share failed): catch it and show jb.x.fail.title / jb.x.fail.body.
   // A second call while one is running returns the first one's promise.
useBookWren(): string
   // a hook for the page: keeps the back cover's bird captured while the page is mounted and
   // answers her file uri ("" until the capture lands). Pass it as opts.wren.
```

`opts` is what the page already has in its hooks: `{ penName: useAuth().handle, letterFont:
useLetterFont(), wren: useBookWren() }`. Anything left out is read from the phone by the lib, so
`loadBook(range)` and `exportBook(range, inkSaver)` alone work too.

The book's own words (cover, calendar, stats, labels, back cover) are `jb.*` keys WITHOUT the `.x.`
part; the model resolves them, the page never needs them.

## For the Swift pages (what the model sends beyond the contract's letter)

- cover `title` holds its line break: "my year\nin pages", "my november\nin pages".
- a month cell's `mood` is "" (no page), a mood id (draw `mood-<id>`: a face, or "group-calm" …),
  or "plain": a day that was written but whose page has no mood. "plain" has no drawing; its
  `color` is "#B9B6CF". The year page's squares use the same colour for such a day.
- an entry's `driftLabel` is "" when `drift` is "".
- cover `faces` and a stat's `mood` may be a group id ("group-low"); KMoodArt has those drawings.
- `contLabel` is in the locale's own order: "NOV 19 · CONTINUED" in English, "19 NOV · …" in Spanish.
