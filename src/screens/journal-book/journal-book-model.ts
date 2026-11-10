/* THE JOURNAL BOOK'S EXPORT PAGE — ITS RULES (journal book, 2026-11-10).
   ────────────────────────────────────────────────────────────────────────
   The page (/journal-book, .claude/journal-book/CONTRACT.md "The export screen") shows the reader
   a live preview of their own book, lets them pick this month or this year, and then either makes
   the PDF (First Class, or the book bought once) or hands over just the words (free, Settings'
   text file). The journal is
   read and the book built by src/lib/journal-book; Swift draws (KJournalBookView). This file is
   the part in between, pure (no React, no storage, no i18n: every word comes through `t`), so
   `node src/screens/journal-book/journal-book-model.test.ts` holds it:

   - WHICH RANGE OPENS. This year, when it has a page: it is the fuller book, and the year page
     is the one a reader has never seen anywhere else. A range with no page can't be chosen
     (the control dims it and a line says so); if the wanted one is empty the other opens; with
     no page in either there is no preview at all, only a line and "Write a note".
   - EVERYONE SEES THE PREVIEW; MAKING THE FILE IS FIRST CLASS, OR THE BOOK BOUGHT ONCE. The key
     is `locked` (the small wax-gold mark) only once the membership answer is in and the reader
     has neither: before that it is the plain key, and a tap waits for the answer instead of
     sending a paying reader to the paywall (lib/entitlement: `premium: false` before `settled`
     means "not asked yet").
   - THE SMALLER DOOR (new feature, 2026-11-10; lib/iap-book-core says what the purchase is).
     Someone with neither First Class nor the book taps the key: when the store has answered
     with the book's real product and its localized price, a small sheet offers two ways, "Just
     the book" at that price, once, or First Class; when the store has no such product (the
     owner hasn't created it yet, no RevenueCat key in this build, offline, a simulator) there
     is no sheet and the tap opens the paywall exactly as it did before this existed. Until the
     store has answered either way the tap waits, as it waits for membership (lib/iap bounds
     that wait). The price is never written here: it is the store's string or the sheet doesn't
     exist. After the purchase: it went through, the book is made at once; cancelled, nothing
     changes and nothing is said; anything else, one plain alert.
   - THE FREE WAY OUT STAYS ONE TAP AWAY: "Just the words" is there whenever the journal has a
     page of the reader's own, in ANY year (also under the empty state: last year's pages are not
     in this year's book, but their words can still be taken out). Until the journal has been
     counted the link shows (the tap itself says if there was nothing), as Settings' row does.
   - A JOURNAL THAT CAN'T BE READ IS NOT AN EMPTY ONE (lib/journal): it gets its own line, and
     no key that could act on it.
   - The book's key (bookKey) changes only when the book's JSON does, so coming back to the page
     (from the paywall, from the composer) with the same pages doesn't re-paginate the preview or
     send it back to its first page. */

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

/** which book */
export type BookKind = "month" | "year";

/** The range src/lib/journal-book takes, written out here so this file imports nothing: the
    calendar year or month of "now", the reader's local time (month is 1…12). */
export type BookRange = { kind: "year"; year: number } | { kind: "month"; year: number; month: number };

/** which ranges hold at least one page (src/lib/journal-book rangesWithPages) */
export type BookRanges = { month: boolean; year: boolean };

/** Where the page gets its book: src/lib/journal-book's three calls, or the dev page's sample
    journal (./demo-book). Only `book` of loadBook's answer is read; a range without a page may
    answer null, nothing, or a book with no pages. */
export type BookSource = {
  rangesWithPages: (now: Date) => Promise<BookRanges>;
  loadBook: (range: BookRange) => Promise<{ book?: { fileStem: string; pages: readonly unknown[] } | null }>;
  exportBook: (range: BookRange, inkSaver: boolean) => Promise<unknown>;
};

/** The one-time purchase as the store answered it (lib/iap-book-core BookProduct, written out
    here so this file imports nothing): the product, and the store's own localized price string.
    `raw` goes back to the store untouched when it is bought. */
export type BookOffer = { productId: string; priceString: string; raw: unknown };

/** What buying it came to (lib/iap IapPurchaseResult, the part the page reads). */
export type BookBuyResult = { ok: boolean; cancelled?: boolean; error?: string };

/** Where the page asks for the book's product and buys it: lib/iap's two calls, or the dev
    page's fake (app/dev/journal-book: a made-up product with a price label that says it is one).
    `dev` marks that fake: nothing bought through it is counted (lib/track). */
export type BookStore = {
  product: () => Promise<BookOffer | null>;
  buy: (offer: BookOffer) => Promise<BookBuyResult>;
  dev?: boolean;
};

/** A tap on the key by someone with neither First Class nor the book, when the store has no
    book to sell; and the sheet's First Class key. */
export const BOOK_PAYWALL = "/paywall?src=journal_book";
/** How the money events name this door and this product (lib/track: source, fare). */
export const BOOK_TRACK_SOURCE = "journal_book";
export const BOOK_TRACK_FARE = "book";
/** The empty journal's key: the note composer, as Notes' + opens it. */
export const BOOK_WRITE = "/journal-entry";

export function rangeOf(kind: BookKind, now: Date): BookRange {
  return kind === "year" ? { kind: "year", year: now.getFullYear() } : { kind: "month", year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** The range to open: the wanted one when it has a page, else the other, else none (the empty
    state). The page asks for "year" first. */
export function pickKind(ranges: BookRanges, want: BookKind = "year"): BookKind | null {
  if (ranges[want]) return want;
  const other: BookKind = want === "year" ? "month" : "year";
  return ranges[other] ? other : null;
}

/** A short key for a book's JSON: the same for the same text, another for another (its length
    and a 32-bit hash; Swift paginates again only when it changes). */
export function bookKey(json: string): string {
  let h = 5381;
  for (let i = 0; i < json.length; i++) h = ((h << 5) + h + json.charCodeAt(i)) | 0;
  return `${json.length}:${(h >>> 0).toString(36)}`;
}

export type MakeIntent = "export" | "choose" | "paywall" | "wait" | "none";

/** What a tap on the main key does. busy: nothing. First Class, or the book bought: export.
    Membership not answered yet: wait for it. Then, for someone with neither: the store hasn't
    said yet whether it sells the book (`offer` undefined): wait for that too; it sells it:
    the two-way sheet ("choose"); it doesn't (`offer` null): the paywall, as before. */
export function makeIntent(f: { settled: boolean; premium: boolean; bookOwned: boolean; busy: boolean; offer: BookOffer | null | undefined }): MakeIntent {
  if (f.busy) return "none";
  if (f.premium || f.bookOwned) return "export";
  if (!f.settled || f.offer === undefined) return "wait";
  return f.offer ? "choose" : "paywall";
}

/** The sheet a tap raises for someone with neither: its title (the key that raised it), one
    line, the two keys and the way out. The price is the store's string, put in as it came. */
export type BookChoice = { title: string; body: string; book: string; firstClass: string; cancel: string };

export function bookChoice(offer: BookOffer, t: TFn): BookChoice {
  return {
    title: t("bk.make"),
    body: t("bkb.sheet.body"),
    book: t("bkb.sheet.book", { price: offer.priceString }),
    firstClass: t("bkb.sheet.fc"),
    cancel: t("mf.notNow"),
  };
}

/** After the purchase: it went through: make the book now; the reader backed out of the
    store's sheet: nothing, not even a word; anything else: one alert. */
export function afterBuy(res: BookBuyResult): "export" | "nothing" | "alert" {
  if (res.ok) return "export";
  return res.cancelled ? "nothing" : "alert";
}

export type BookFacts = {
  /** reading the journal / the book is in hand / the journal could not be read */
  phase: "loading" | "ready" | "failed";
  /** null until asked */
  ranges: BookRanges | null;
  kind: BookKind;
  /** the PDF is being written, or the key is waiting for the membership answer */
  busy: boolean;
  premium: boolean;
  /** the journal book bought once (lib/entitlement bookOwned), or bought on this page a moment ago */
  bookOwned: boolean;
  /** the membership answer is in */
  settled: boolean;
  /** how many pages the free text export would hold; null until counted (or uncountable) */
  wordsPages: number | null;
};

export type BookStrings = {
  title: string;
  backLabel: string;
  rangeMonth: string;
  rangeYear: string;
  rangeNote: string;
  pageOf: string;
  previewA11y: string;
  inkLabel: string;
  inkSub: string;
  make: string;
  making: string;
  lockTag: string;
  lockA11y: string;
  words: string;
  emptyLine: string;
  emptyKey: string;
  failedLine: string;
};

export type BookView = {
  state: "loading" | "ready" | "empty" | "failed";
  makeState: "idle" | "busy" | "locked";
  monthEnabled: boolean;
  yearEnabled: boolean;
  strings: BookStrings;
};

/** Everything the Swift page is told besides the book itself. */
export function bookView(f: BookFacts, t: TFn): BookView {
  const none = !!f.ranges && !f.ranges.month && !f.ranges.year;
  const state: BookView["state"] = f.phase === "failed" ? "failed" : none ? "empty" : f.phase;
  // the wax-gold mark is only for a reader who has neither First Class nor the book
  const makeState: BookView["makeState"] = f.busy ? "busy" : f.settled && !f.premium && !f.bookOwned ? "locked" : "idle";
  // until the ranges are known both read as there: nothing is dimmed on a guess
  const monthEnabled = f.ranges ? f.ranges.month : true;
  const yearEnabled = f.ranges ? f.ranges.year : true;
  return {
    state,
    makeState,
    monthEnabled,
    yearEnabled,
    strings: {
      title: t("set.export"),
      backLabel: t("a11y.back"),
      rangeMonth: t("bk.range.month"),
      rangeYear: t("bk.range.year"),
      // only the month can be empty beside a year with pages (the month is inside the year)
      rangeNote: !none && !monthEnabled ? t("bk.range.noMonth") : "",
      pageOf: t("bk.pageOf"),
      previewA11y: t("bk.preview.a11y"),
      inkLabel: t("bk.ink"),
      inkSub: t("bk.ink.sub"),
      make: t("bk.make"),
      making: t("bk.making"),
      lockTag: t("mf.result.lock"),
      lockA11y: t("pp.a11y.fc"),
      words: f.wordsPages === 0 ? "" : t("bk.words"),
      emptyLine: t("bk.empty"),
      emptyKey: t("bk.empty.key"),
      failedLine: t("bk.unread"),
    },
  };
}
