/* Behaviour lock for the journal book's export page (screens/journal-book/journal-book-model):
   which range opens, what a tap on the key does, and what the Swift page is told in each state.
   Not wired to a runner; run by hand from the repo root with plain node (it strips the types
   itself from Node 22.18 / 23.6 on):
     node src/screens/journal-book/journal-book-model.test.ts
   Every line prints ok/FAIL and the process exits non-zero if any fail. */

const M = await import("./journal-book-model.ts");

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const t = (k: string, v?: Record<string, string | number>) => (v ? `${k}(${Object.entries(v).map(([a, b]) => `${a}=${b}`).join(",")})` : k);
type Facts = Parameters<typeof M.bookView>[0];
const facts = (over: Partial<Facts> = {}): Facts => ({
  phase: "ready",
  ranges: { month: true, year: true },
  kind: "year",
  busy: false,
  premium: true,
  bookOwned: false,
  settled: true,
  wordsPages: 12,
  ...over,
});
/** the book as a store answered it */
const offer = { productId: "io.kindredly.app.journalbook", priceString: "$4.99", raw: { identifier: "book" } };
type Tap = Parameters<typeof M.makeIntent>[0];
const tap = (over: Partial<Tap> = {}): Tap => ({ settled: true, premium: false, bookOwned: false, busy: false, offer: null, ...over });

/* ── the range ── */
{
  const now = new Date(2026, 10, 10, 9, 0, 0); // 10 November 2026, local
  ok("this year: the calendar year of now", JSON.stringify(M.rangeOf("year", now)) === JSON.stringify({ kind: "year", year: 2026 }));
  ok("this month: the calendar month of now, 1 to 12", JSON.stringify(M.rangeOf("month", now)) === JSON.stringify({ kind: "month", year: 2026, month: 11 }));
  ok("January is month 1, December 12", (M.rangeOf("month", new Date(2026, 0, 1)) as { month: number }).month === 1 && (M.rangeOf("month", new Date(2026, 11, 31)) as { month: number }).month === 12);

  ok("the page opens on this year when it has a page", M.pickKind({ month: true, year: true }) === "year");
  ok("the wanted range, when it has a page", M.pickKind({ month: true, year: true }, "month") === "month");
  ok("this month is empty: this year", M.pickKind({ month: false, year: true }, "month") === "year");
  ok("the wanted one is empty: the other", M.pickKind({ month: true, year: false }, "year") === "month");
  ok("no page in either: none (the empty state)", M.pickKind({ month: false, year: false }) === null && M.pickKind({ month: false, year: false }, "month") === null);
}

/* ── the book's key ── */
{
  const a = M.bookKey('{"fileStem":"kindredly-book-2026","pages":[1]}');
  ok("the same JSON, the same key", a === M.bookKey('{"fileStem":"kindredly-book-2026","pages":[1]}'));
  ok("another JSON, another key", a !== M.bookKey('{"fileStem":"kindredly-book-2026","pages":[2]}'));
  ok("the same length, another key", M.bookKey("ab") !== M.bookKey("ba"));
  ok("an empty book has a key too", M.bookKey("") === "0:" + (5381).toString(36));
}

/* ── a tap on the key ── */
{
  ok("a member: export", M.makeIntent(tap({ premium: true })) === "export");
  ok("not a member, answered, and the store has no book to sell: the paywall, as before", M.makeIntent(tap()) === "paywall");
  ok("membership not answered yet: wait, never the paywall on a guess", M.makeIntent(tap({ settled: false })) === "wait" && M.makeIntent(tap({ settled: false, offer })) === "wait");
  ok("already known as a member before the answer settles: export", M.makeIntent(tap({ settled: false, premium: true })) === "export");
  ok("busy: nothing, member or not", M.makeIntent(tap({ premium: true, busy: true })) === "none" && M.makeIntent(tap({ busy: true })) === "none" && M.makeIntent(tap({ busy: true, offer })) === "none");
  ok("the paywall is told where the reader came from", M.BOOK_PAYWALL === "/paywall?src=journal_book");
  ok("write a note opens the composer Notes' + opens", M.BOOK_WRITE === "/journal-entry");
}

/* ── the smaller door: the book bought once ── */
{
  ok("the book bought: export, First Class or not", M.makeIntent(tap({ bookOwned: true })) === "export" && M.makeIntent(tap({ bookOwned: true, premium: true })) === "export");
  ok("the book bought: export without asking the store anything", M.makeIntent(tap({ bookOwned: true, offer: undefined })) === "export" && M.makeIntent(tap({ bookOwned: true, offer })) === "export");
  ok("a member is never shown the sheet, whatever the store sells", M.makeIntent(tap({ premium: true, offer })) === "export");
  ok("neither, and the store sells the book: the two-way sheet", M.makeIntent(tap({ offer })) === "choose");
  ok("neither, and the store hasn't said yet: wait for it, no sheet and no paywall on a guess", M.makeIntent(tap({ offer: undefined })) === "wait");
  ok("neither, and the store has no such product: the paywall exactly as before", M.makeIntent(tap({ offer: null })) === "paywall");

  const c = M.bookChoice(offer, t);
  ok("the sheet is titled by the key that raised it, with one line under it", c.title === "bk.make" && c.body === "bkb.sheet.body");
  ok("the book's key carries the store's own price string, untouched", c.book === "bkb.sheet.book(price=$4.99)");
  ok("another storefront's price goes in as it came", M.bookChoice({ ...offer, priceString: "5,99 €" }, t).book === "bkb.sheet.book(price=5,99 €)");
  ok("the other key is First Class, and the way out is Not now", c.firstClass === "bkb.sheet.fc" && c.cancel === "mf.notNow");
  ok("no price is written in the sheet's own words", !/[0-9$€¥£]/.test(c.title + c.body + c.firstClass + c.cancel));

  ok("bought: the book is made at once", M.afterBuy({ ok: true }) === "export");
  ok("backed out of the store's sheet: nothing, not even a word", M.afterBuy({ ok: false, cancelled: true }) === "nothing");
  ok("it failed: one alert", M.afterBuy({ ok: false, error: "purchase-failed" }) === "alert" && M.afterBuy({ ok: false }) === "alert");
  ok("the store took it and nothing was unlocked: an alert, never a silent nothing", M.afterBuy({ ok: false, error: "entitlement-missing" }) === "alert");
  ok("the money events name this door and this product", M.BOOK_TRACK_SOURCE === "journal_book" && M.BOOK_TRACK_FARE === "book");
}

/* ── what the Swift page is told ── */
{
  const v = M.bookView(facts(), t);
  ok("a member with pages: ready, the plain key, both ranges there", v.state === "ready" && v.makeState === "idle" && v.monthEnabled && v.yearEnabled);
  ok("the title is the row that opened it", v.strings.title === "set.export" && v.strings.backLabel === "a11y.back");
  ok("no line under the range when both have pages", v.strings.rangeNote === "");
  ok("the words of the page", v.strings.rangeMonth === "bk.range.month" && v.strings.rangeYear === "bk.range.year" && v.strings.pageOf === "bk.pageOf" && v.strings.previewA11y === "bk.preview.a11y" && v.strings.inkLabel === "bk.ink" && v.strings.inkSub === "bk.ink.sub" && v.strings.make === "bk.make" && v.strings.making === "bk.making");
  ok("the free text file is one tap away", v.strings.words === "bk.words");

  const locked = M.bookView(facts({ premium: false }), t);
  ok("not First Class: the preview all the same, the key locked", locked.state === "ready" && locked.makeState === "locked");
  ok("the lock is the app's own mark and VoiceOver's words for it", locked.strings.lockTag === "mf.result.lock" && locked.strings.lockA11y === "pp.a11y.fc");
  ok("the words link is free: there for a non-member too", locked.strings.words === "bk.words");

  ok("the book bought once, not First Class: the plain key, no lock", M.bookView(facts({ premium: false, bookOwned: true }), t).makeState === "idle");
  ok("the lock is only for a reader with neither", M.bookView(facts({ premium: true, bookOwned: true }), t).makeState === "idle" && M.bookView(facts({ premium: false, bookOwned: false }), t).makeState === "locked");
  ok("membership not answered: the plain key, not the lock", M.bookView(facts({ premium: false, settled: false }), t).makeState === "idle");
  ok("the PDF being written: busy, member or not", M.bookView(facts({ busy: true }), t).makeState === "busy" && M.bookView(facts({ busy: true, premium: false }), t).makeState === "busy");

  const noMonth = M.bookView(facts({ ranges: { month: false, year: true } }), t);
  ok("no page this month: its part is off, the year's on, and the line says so", !noMonth.monthEnabled && noMonth.yearEnabled && noMonth.strings.rangeNote === "bk.range.noMonth" && noMonth.state === "ready");

  const none = M.bookView(facts({ ranges: { month: false, year: false } }), t);
  ok("no page this year: the empty state, its line and its key", none.state === "empty" && none.strings.emptyLine === "bk.empty" && none.strings.emptyKey === "bk.empty.key");
  ok("the empty state has no line about the month", none.strings.rangeNote === "");
  ok("older pages still have words to take: the link stays under the empty state", none.strings.words === "bk.words");
  ok("a journal with no page at all: no words link", M.bookView(facts({ ranges: { month: false, year: false }, wordsPages: 0 }), t).strings.words === "");
  ok("not counted yet: the link shows (the tap says if there was nothing)", M.bookView(facts({ wordsPages: null }), t).strings.words === "bk.words");

  const loading = M.bookView(facts({ phase: "loading", ranges: null }), t);
  ok("being read: loading, nothing dimmed on a guess", loading.state === "loading" && loading.monthEnabled && loading.yearEnabled && loading.strings.rangeNote === "");
  ok("reading another range keeps what is known about the ranges", M.bookView(facts({ phase: "loading", ranges: { month: false, year: true } }), t).monthEnabled === false);
  ok("empty wins over loading (a quiet re-read of an empty journal)", M.bookView(facts({ phase: "loading", ranges: { month: false, year: false } }), t).state === "empty");

  const failed = M.bookView(facts({ phase: "failed", ranges: null }), t);
  ok("a journal that can't be read: failed, with its own line", failed.state === "failed" && failed.strings.failedLine === "bk.unread");
  ok("failed is never the empty state, whatever was known before", M.bookView(facts({ phase: "failed", ranges: { month: false, year: false } }), t).state === "failed");
}

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
