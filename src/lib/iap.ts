import { Platform } from "react-native";

/* RevenueCat abstraction (peekabug pattern): lazy-require the native module in
   try/catch so a missing module / no key => demo mode (no crash, no gating).
   Kindredly ties the RC app_user_id to the Supabase user id so web (Creem) and
   iOS (Apple) entitlements unify in the same subscriptions table. */

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
    }));
  } catch {
    return [];
  }
}

export async function iapPurchase(
  pkg: IapPackage,
): Promise<{ ok: boolean; cancelled?: boolean; error?: string }> {
  if (!IAP_READY) return { ok: false, error: "not-configured" };
  const P = load();
  if (!P) return { ok: false, error: "not-configured" };
  try {
    const res = await P.purchasePackage(pkg.raw);
    return { ok: succeeded(res?.customerInfo) };
  } catch (e: any) {
    if (e?.userCancelled) return { ok: false, cancelled: true };
    return { ok: false, error: e?.message || "purchase-failed" };
  }
}

export async function iapRestore(): Promise<boolean> {
  if (!IAP_READY) return false;
  const P = load();
  if (!P) return false;
  try {
    const info = await P.restorePurchases();
    return succeeded(info);
  } catch {
    return false;
  }
}
