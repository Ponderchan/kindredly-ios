import AsyncStorage from "@react-native-async-storage/async-storage";

/* THE RECEIPT SHOWS ONCE PER TRANSACTION (FC2 §4.2, D-11).
   ────────────────────────────────────────────────────────────────────────
   After a purchase the A3 receipt (components/FirstClassWelcome) appears once
   for that store transaction, never again for the same one (a page re-opened,
   a retried buy that StoreKit answered from the same transaction), and never
   on a restore (restore never calls this). Phone-scoped: the last 50 keys,
   as a JSON array under kindredly_fc_receipts. A transaction id is unique
   across the store, so no account goes in the key.
   If the store can't be read the receipt shows anyway: twice is better than
   never. Every read and write is wrapped; nothing here throws. */

export const FC_RECEIPTS_KEY = "kindredly_fc_receipts";
export const FC_RECEIPTS_KEEP = 50;

/** the stored list, tolerant of junk */
export function parseSeen(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
  } catch {
    return [];
  }
}

/** the list with `key` added last (moved there if present), the oldest dropped past the cap */
export function withSeen(list: readonly string[], key: string, keep = FC_RECEIPTS_KEEP): string[] {
  const next = list.filter((k) => k !== key);
  next.push(key);
  return next.slice(Math.max(0, next.length - keep));
}

/** The key for one purchase: the store's transaction id, else the product and the moment (so a
    purchase without an id still shows once, and only for that tap). */
export function receiptKey(r: { transactionId?: string | null; productId?: string | null }, fallbackId: string, now = Date.now()): string {
  return r.transactionId || `${r.productId || fallbackId}@${now}`;
}

/** true when this purchase's receipt has already been shown on this phone; false when unknown */
export async function receiptSeen(key: string): Promise<boolean> {
  try {
    return parseSeen(await AsyncStorage.getItem(FC_RECEIPTS_KEY)).includes(key);
  } catch (e) {
    console.log("[fc-receipt] read:", e);
    return false;
  }
}

/** remember that this purchase's receipt was shown */
export async function markReceiptSeen(key: string): Promise<void> {
  try {
    const list = parseSeen(await AsyncStorage.getItem(FC_RECEIPTS_KEY));
    await AsyncStorage.setItem(FC_RECEIPTS_KEY, JSON.stringify(withSeen(list, key)));
  } catch (e) {
    console.log("[fc-receipt] write:", e);
  }
}

/** Checks and marks in one step: true when the receipt should show now (first time, or the store
    couldn't say). */
export async function claimReceipt(key: string): Promise<boolean> {
  if (await receiptSeen(key)) return false;
  await markReceiptSeen(key);
  return true;
}
