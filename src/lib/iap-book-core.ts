/* THE JOURNAL BOOK, BOUGHT ONCE — WHAT THE STORE'S ANSWERS MEAN (new feature, 2026-11-10).
   ────────────────────────────────────────────────────────────────────────
   The journal book (/journal-book) is made for a First Class member. The owner wanted a smaller
   door beside the paywall: ONE non-consumable in-app purchase, "the journal book", bought once
   and kept for good. It unlocks making the book (any month, any year, as often as the reader
   likes, ink saver included) and nothing else: it does not make anyone First Class. It needs no
   server and no counting: the App Store keeps it, RevenueCat reads it, Restore brings it back.

   In RevenueCat it is a second entitlement, "journal_book", carried by the one product the owner
   creates (suggested id io.kindredly.app.journalbook), offered through an OFFERING OF ITS OWN
   named "book". An offering, not a product id written in the app: the owner can change the
   product or its price without a build, and the First Class paywall (which reads the CURRENT
   offering, lib/iap iapGetPackages) never sees it.

   This file is the pure part (no React Native, no SDK), so `node src/lib/iap-book-core.test.ts`
   holds it; lib/iap makes the calls. Three rules:

   - NEVER A PRICE THE STORE DIDN'T SAY (the placeholder-price incident, SETUP.md §OTA: a build
     without the RevenueCat key showed made-up fares and "Can't reach the store"). The book is
     offered only when RevenueCat's answer holds the "book" offering with a package whose store
     product has an identifier and a non-empty localized price string. Anything less is null,
     and the page then does what it did before this existed (the paywall).
   - NEVER A SUBSCRIPTION SOLD AS "ONCE". The sheet says the price is paid once; a product the
     store calls a subscription is refused even if someone put it in the "book" offering.
   - OWNING THE BOOK is the "journal_book" entitlement being active in RevenueCat's customer
     info. First Class is asked separately ("plus"); a member has the book through that
     (lib/entitlement bookOwned), not through this. */

export const BOOK_ENTITLEMENT_ID = "journal_book";
/** the RevenueCat offering that holds the one-time purchase, and nothing else */
export const BOOK_OFFERING_ID = "book";
/** First Class, as lib/iap names it (written here too so this file imports nothing) */
const PLUS_ENTITLEMENT_ID = "plus";

/** The book as the store prices it. `raw` is RevenueCat's package, handed back to buy it. */
export type BookProduct = { productId: string; priceString: string; raw: unknown };

type Loose = Record<string, any> | null | undefined;

/** The book's product out of RevenueCat's getOfferings() answer, or null (see the rules above). */
export function pickBookProduct(offerings: Loose): BookProduct | null {
  const offering = offerings?.all?.[BOOK_OFFERING_ID];
  const packages: unknown = offering?.availablePackages;
  if (!Array.isArray(packages)) return null;
  for (const p of packages as Loose[]) {
    const product = p?.product;
    const productId = typeof product?.identifier === "string" ? product.identifier : "";
    const priceString = typeof product?.priceString === "string" ? product.priceString.trim() : "";
    if (!productId || !priceString) continue;
    // RevenueCat on iOS always says which it is; anything but a one-time product is not the book
    if (product.productCategory !== "NON_SUBSCRIPTION") continue;
    return { productId, priceString, raw: p };
  }
  return null;
}

const active = (info: Loose, id: string): boolean => !!(info?.entitlements?.active && info.entitlements.active[id]);

/** Whether RevenueCat's customer info says the book was bought (the entitlement alone: a First
    Class member's book is lib/entitlement's to add). */
export function ownsBook(info: Loose): boolean {
  return active(info, BOOK_ENTITLEMENT_ID);
}

/** What a restore brought back, from the customer info it returned: First Class ("restored",
    which has the book in it), only the journal book ("book"), or nothing. */
export function restoredWhat(info: Loose): "restored" | "book" | "nothing" {
  if (active(info, PLUS_ENTITLEMENT_ID)) return "restored";
  return ownsBook(info) ? "book" : "nothing";
}
