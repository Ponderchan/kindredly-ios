/* Behaviour lock for the journal book's one-time purchase (lib/iap-book-core): when the store's
   answer is a book that may be offered, and what RevenueCat's customer info says is owned.
   Not wired to a runner; run by hand from the repo root with plain node:
     node src/lib/iap-book-core.test.ts
   Every line prints ok/FAIL and the process exits non-zero if any fail. */

const M = await import("./iap-book-core.ts");

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const pkg = (over: Record<string, unknown> = {}) => ({
  identifier: "book",
  packageType: "CUSTOM",
  product: { identifier: "io.kindredly.app.journalbook", priceString: "$4.99", price: 4.99, productCategory: "NON_SUBSCRIPTION", ...over },
});
const offerings = (packages: unknown, current: unknown = null) => ({ current, all: { [M.BOOK_OFFERING_ID]: { identifier: "book", availablePackages: packages } } });

/* ── the names the owner configures ── */
{
  ok("the entitlement is journal_book", M.BOOK_ENTITLEMENT_ID === "journal_book");
  ok("the offering is book", M.BOOK_OFFERING_ID === "book");
}

/* ── the product ── */
{
  const p = M.pickBookProduct(offerings([pkg()]));
  ok("the store's product, with the store's own price string", !!p && p.productId === "io.kindredly.app.journalbook" && p.priceString === "$4.99");
  ok("the package is handed back as it came, to buy it", !!p && (p.raw as { identifier: string }).identifier === "book");
  ok("a localized price is kept as the store wrote it", M.pickBookProduct(offerings([pkg({ priceString: "5,99 €" })]))?.priceString === "5,99 €");

  ok("no answer: no book", M.pickBookProduct(null) === null && M.pickBookProduct(undefined) === null && M.pickBookProduct({}) === null);
  ok("no book offering (not created yet): no book", M.pickBookProduct({ current: { availablePackages: [pkg()] }, all: {} }) === null);
  ok("the First Class offering is never read for it", M.pickBookProduct({ current: { identifier: "default", availablePackages: [pkg()] }, all: { default: { availablePackages: [pkg()] } } }) === null);
  ok("an empty offering: no book", M.pickBookProduct(offerings([])) === null && M.pickBookProduct(offerings(null)) === null);
  ok("no price from the store: no book, never a made-up one", M.pickBookProduct(offerings([pkg({ priceString: "" })])) === null && M.pickBookProduct(offerings([pkg({ priceString: "  " })])) === null && M.pickBookProduct(offerings([pkg({ priceString: undefined })])) === null);
  ok("no product id: no book", M.pickBookProduct(offerings([pkg({ identifier: "" })])) === null);
  ok("a package with no product: no book", M.pickBookProduct(offerings([{ identifier: "book" }])) === null);
  ok("a subscription is never sold as once", M.pickBookProduct(offerings([pkg({ productCategory: "SUBSCRIPTION" })])) === null);
  ok("a product the store can't place is refused too", M.pickBookProduct(offerings([pkg({ productCategory: "UNKNOWN" })])) === null && M.pickBookProduct(offerings([pkg({ productCategory: null })])) === null);
  ok("the first package that is a real one-time product", M.pickBookProduct(offerings([pkg({ productCategory: "SUBSCRIPTION", identifier: "sub" }), pkg({ identifier: "io.kindredly.app.journalbook" })]))?.productId === "io.kindredly.app.journalbook");
}

/* ── what is owned ── */
{
  const info = (ids: string[]) => ({ entitlements: { active: Object.fromEntries(ids.map((id) => [id, { identifier: id, isActive: true }])) } });
  ok("the book's entitlement active: owned", M.ownsBook(info(["journal_book"])));
  ok("First Class alone is not this entitlement (lib/entitlement adds a member's book)", !M.ownsBook(info(["plus"])));
  ok("nothing active, or no customer info: not owned", !M.ownsBook(info([])) && !M.ownsBook(null) && !M.ownsBook({}));

  ok("a restore that found First Class: restored", M.restoredWhat(info(["plus"])) === "restored" && M.restoredWhat(info(["plus", "journal_book"])) === "restored");
  ok("a restore that found only the book: book, never nothing", M.restoredWhat(info(["journal_book"])) === "book");
  ok("a restore that found nothing", M.restoredWhat(info([])) === "nothing" && M.restoredWhat(null) === "nothing");
}

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
