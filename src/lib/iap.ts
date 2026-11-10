import { Platform } from "react-native";
import { BOOK_ENTITLEMENT_ID, ownsBook, pickBookProduct, restoredWhat, type BookProduct } from "./iap-book-core";

export { BOOK_ENTITLEMENT_ID, BOOK_OFFERING_ID } from "./iap-book-core";
export type { BookProduct } from "./iap-book-core";

/* RevenueCat abstraction (peekabug pattern): lazy-require the native module in
   try/catch so a missing module / no key => demo mode (no crash, no gating).
   Kindredly ties the RC app_user_id to the Supabase user id so web (Creem) and
   iOS (Apple) entitlements unify in the same subscriptions table.

   Two entitlements: "plus" is First Class (subscriptions and the lifetime fare, the CURRENT
   offering); "journal_book" is the journal book bought once (2026-11-10, its own offering
   "book"; see the block further down and ./iap-book-core). The second never touches the
   subscriptions table: the web's RevenueCat webhook ignores a one-time product that is not the
   lifetime fare, which is right, since the book makes nobody First Class. */

export const ENTITLEMENT_ID = "plus";
const RC_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || "";

let Purchases: any = null;
let loaded = false;
function load(): any {
  if (loaded) return Purchases;
  loaded = true;
  try {
    Purchases = require("react-native-purchases").default;
  } catch {
    Purchases = null;
  }
  return Purchases;
}

/** true only when we're on iOS AND a RevenueCat key is present. */
export const IAP_READY = Platform.OS === "ios" && !!RC_IOS_KEY;

let configured = false;

/** Configure the SDK once and attach the Supabase user id. */
export async function iapConfigure(appUserId?: string): Promise<boolean> {
  if (!IAP_READY) return false;
  const P = load();
  if (!P) return false;
  try {
    if (!configured) {
      await P.configure({ apiKey: RC_IOS_KEY, appUserID: appUserId || null });
      configured = true;
    } else if (appUserId) {
      try {
        await P.logIn(appUserId);
      } catch {
        /* non-fatal */
      }
    }
    return true;
  } catch {
    return false;
  }
}

function succeeded(info: any): boolean {
  return !!(
    info?.entitlements?.active && info.entitlements.active[ENTITLEMENT_ID]
  );
}

/** null when IAP isn't configured (caller falls back to server entitlement). */
export async function iapCheckPremium(): Promise<boolean | null> {
  if (!IAP_READY) return null;
  const P = load();
  if (!P) return null;
  try {
    const info = await P.getCustomerInfo();
    return succeeded(info);
  } catch {
    return null;
  }
}

export interface IapPackage {
  id: string;
  priceString: string;
  title: string;
  /* lifetime is a NON-CONSUMABLE, not a subscription — RevenueCat reports
     it as LIFETIME, and the paywall prices and words it differently */
  period: "monthly" | "annual" | "lifetime" | "other";
  raw: any;
  /* Me 4a (lib/fares): the numbers the Swift paywall needs beside the
     string. All three are the store's own, read as RevenueCat hands them;
     absent on the placeholders. */
  /** the store product's identifier (for the trial eligibility check) */
  productId?: string;
  /** product.price, a number in the store's currency */
  price?: number | null;
  /** product.pricePerMonthString (an annual's monthly figure, in the store's format) */
  perMonthString?: string | null;
  /** product.introPrice: a free trial is one whose price is 0 */
  introPrice?: { price: number; periodUnit: string; periodNumberOfUnits: number; cycles: number } | null;
}

export async function iapGetPackages(): Promise<IapPackage[]> {
  if (!IAP_READY) return [];
  const P = load();
  if (!P) return [];
  try {
    const offerings = await P.getOfferings();
    const pkgs = (offerings?.current?.availablePackages || []) as any[];
    return pkgs.map((p) => ({
      id: p.identifier,
      priceString: p.product?.priceString || "",
      title: p.product?.title || p.identifier,
      period:
        p.packageType === "ANNUAL"
          ? "annual"
          : p.packageType === "MONTHLY"
            ? "monthly"
            : p.packageType === "LIFETIME"
              ? "lifetime"
              : "other",
      raw: p,
      productId: p.product?.identifier,
      price: typeof p.product?.price === "number" ? p.product.price : null,
      perMonthString: p.product?.pricePerMonthString ?? null,
      introPrice: p.product?.introPrice
        ? {
            price: Number(p.product.introPrice.price),
            periodUnit: String(p.product.introPrice.periodUnit || ""),
            periodNumberOfUnits: Number(p.product.introPrice.periodNumberOfUnits) || 0,
            cycles: Number(p.product.introPrice.cycles) || 0,
          }
        : null,
    }));
  } catch (e) {
    console.warn("[iap] offerings:", e);
    return [];
  }
}

/** Whether this Apple ID may still take each product's introductory offer, by product id:
    0 unknown, 1 ineligible, 2 eligible, 3 no intro offer exists (RevenueCat's
    INTRO_ELIGIBILITY_STATUS). {} when purchases can't be reached or the check fails (logged):
    the caller then shows no trial, never a trial it can't vouch for (ME4A D12). */
export async function iapTrialEligibility(productIds: string[]): Promise<Record<string, number>> {
  if (!IAP_READY || !productIds.length) return {};
  const P = load();
  if (!P) return {};
  try {
    const res = await P.checkTrialOrIntroductoryPriceEligibility(productIds);
    const out: Record<string, number> = {};
    for (const id of productIds) {
      const st = res?.[id]?.status;
      if (typeof st === "number") out[id] = st;
    }
    return out;
  } catch (e) {
    console.warn("[iap] trial eligibility:", e);
    return {};
  }
}

/** A purchase's outcome. On success it also carries the store's transaction id and the bought
    product id (FC2 §4.4: the receipt shows once per transaction id), both read defensively from
    RevenueCat's result; either may be missing, and the caller copes. */
export type IapPurchaseResult = { ok: boolean; cancelled?: boolean; error?: string; transactionId?: string; productId?: string };

export async function iapPurchase(pkg: IapPackage): Promise<IapPurchaseResult> {
  if (!IAP_READY) return { ok: false, error: "not-configured" };
  const P = load();
  if (!P) return { ok: false, error: "not-configured" };
  try {
    const res = await P.purchasePackage(pkg.raw);
    const ok = succeeded(res?.customerInfo);
    const tx = (res as any)?.transaction?.transactionIdentifier;
    const pid = (res as any)?.productIdentifier ?? (res as any)?.transaction?.productIdentifier;
    return {
      ok,
      ...(typeof tx === "string" && tx ? { transactionId: tx } : {}),
      ...(typeof pid === "string" && pid ? { productId: pid } : {}),
    };
  } catch (e: any) {
    if (e?.userCancelled) return { ok: false, cancelled: true };
    return { ok: false, error: e?.message || "purchase-failed" };
  }
}

/* THE JOURNAL BOOK, BOUGHT ONCE (new feature, 2026-11-10; the rules and the why are at the top
   of ./iap-book-core). A second entitlement, "journal_book", carried by one non-consumable the
   owner creates, read from RevenueCat's offering named "book". Three calls, all of them quiet
   when purchases can't be reached: the export page then does what it did before (the paywall). */

/** How long the page may wait for the store to say whether the book is for sale. A tap on the
    key waits for this answer, so it has to come: after this long it is "no" (the paywall). */
const BOOK_PRODUCT_WAIT_MS = 4000;

/** The journal book as the store sells it, with the store's own localized price string; null
    when the store has no such product for this build (not configured yet, no RevenueCat key,
    offline, a simulator without StoreKit, no answer in time). Never a made-up price. */
export async function iapBookProduct(): Promise<BookProduct | null> {
  if (!IAP_READY) return null;
  const P = load();
  if (!P) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const late = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), BOOK_PRODUCT_WAIT_MS);
    });
    const offerings = await Promise.race([P.getOfferings(), late]);
    if (!offerings) console.warn("[iap] the book's product: no answer from the store in time");
    return pickBookProduct(offerings);
  } catch (e) {
    console.warn("[iap] the book's product:", e);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Buy the journal book: the product iapBookProduct() returned, so what is bought is what was
    priced on screen. ok only when RevenueCat then says the "journal_book" entitlement is
    active; a purchase the store took that unlocked nothing (the product isn't attached to the
    entitlement in RevenueCat) is a failure with its own error, and is logged. */
export async function iapBuyBook(product: BookProduct): Promise<IapPurchaseResult> {
  if (!IAP_READY) return { ok: false, error: "not-configured" };
  const P = load();
  if (!P || !product.raw) return { ok: false, error: "not-configured" };
  try {
    const res = await P.purchasePackage(product.raw);
    const ok = ownsBook(res?.customerInfo);
    const tx = (res as any)?.transaction?.transactionIdentifier;
    const pid = (res as any)?.productIdentifier ?? (res as any)?.transaction?.productIdentifier;
    if (!ok) console.warn(`[iap] the book was bought but the "${BOOK_ENTITLEMENT_ID}" entitlement is not active: is the product attached to it in RevenueCat?`);
    return {
      ok,
      ...(ok ? {} : { error: "entitlement-missing" }),
      ...(typeof tx === "string" && tx ? { transactionId: tx } : {}),
      ...(typeof pid === "string" && pid ? { productId: pid } : {}),
    };
  } catch (e: any) {
    if (e?.userCancelled) return { ok: false, cancelled: true };
    console.warn("[iap] buying the book:", e);
    return { ok: false, error: e?.message || "purchase-failed" };
  }
}

/** Whether the journal book was bought on this Apple ID (the entitlement alone; a First Class
    member's book is lib/entitlement's to add). null when it can't be asked. */
export async function iapCheckBook(): Promise<boolean | null> {
  if (!IAP_READY) return null;
  const P = load();
  if (!P) return null;
  try {
    return ownsBook(await P.getCustomerInfo());
  } catch (e) {
    console.warn("[iap] the book's entitlement:", e);
    return null;
  }
}

/** The free trial First Class is in right now, as the App Store's own receipt says it (RevenueCat's
    customer info): the product, and when the trial ends — the day the first charge happens. Null
    when it isn't a trial, won't renew (so nothing will be charged), or can't be read (logged). The
    receipt after a purchase says it (components/FirstClassWelcome FirstClassReceipt); it never guesses a date. */
export async function iapActiveTrial(): Promise<{ productId: string; endsAt: string } | null> {
  if (!IAP_READY) return null;
  const P = load();
  if (!P) return null;
  try {
    const info = await P.getCustomerInfo();
    const ent = info?.entitlements?.active?.[ENTITLEMENT_ID];
    if (!ent || ent.periodType !== "TRIAL" || ent.willRenew === false) return null;
    const endsAt = typeof ent.expirationDate === "string" ? ent.expirationDate : null;
    const productId = typeof ent.productIdentifier === "string" ? ent.productIdentifier : null;
    if (!endsAt || !productId || Number.isNaN(Date.parse(endsAt))) return null;
    return { productId, endsAt };
  } catch (e) {
    console.warn("[iap] trial from customer info:", e);
    return null;
  }
}

/** What a restore came back with: First Class found on this Apple ID ("restored"), only the
    journal book found ("book": the one-time purchase, 2026-11-10; First Class has the book in
    it, so both found is "restored"), the App Store answered and found nothing ("nothing"), no
    answer (offline, a StoreKit error: "failed"), or purchases can't be reached by this build
    at all (no RevenueCat key or no native module: "unavailable"). Settings tells the last two
    apart from "nothing": telling someone who paid that nothing was found is the wrong sentence,
    and that goes for someone who paid for the book too. */
export type RestoreOutcome = "restored" | "book" | "nothing" | "failed" | "unavailable";

export async function iapRestoreOutcome(): Promise<RestoreOutcome> {
  if (!IAP_READY) return "unavailable";
  const P = load();
  if (!P) return "unavailable";
  try {
    const info = await P.restorePurchases();
    return restoredWhat(info);
  } catch (e) {
    console.warn("[iap] restore:", e);
    return "failed";
  }
}

/** true when First Class came back (the paywall's restore). See iapRestoreOutcome for why a
    failure is not the same as nothing found. */
export async function iapRestore(): Promise<boolean> {
  return (await iapRestoreOutcome()) === "restored";
}
