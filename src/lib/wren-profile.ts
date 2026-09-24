import { scoped as AsyncStorage } from "./scoped-store";
import { supabase } from "./supabase";

/* HER IDENTITY LIVES ON THE ACCOUNT (owner, 2026-09-23).
   ────────────────────────────────────────────────────────────────────────
   Her name, her shell, her coat and what she is wearing were each kept in
   this device's store and nowhere else, so the same courier answered to a
   different name and wore a different coat in the browser — and a reinstall
   or a new phone met a stranger called Wren in the default skin.

   The truth is now `user_metadata`, the one place the phone and the web can
   both see (the web writes the same field names). The device keeps a copy
   so she is dressed before the network answers, and a value found only on
   this device is carried up once. Nothing here ever blocks: a cold read
   returns the cached value, and a failed write leaves the device correct
   and the account behind until the next save. */

/** what rides on the account, and the device key that mirrors it */
export const WREN_FIELDS = {
  name: "kindredly_wren_name",
  egg: "kindredly_wren_egg",
  skin: "kindredly_wren_skin",
  accessory: "kindredly_wren_accessory",
  /** the coat she hatched in on the web's /aura test — hers, paid or not */
  hatchSkin: "kindredly_wren_hatch_skin",
} as const;
export type WrenField = keyof typeof WREN_FIELDS;

/** the account's field names — the same strings the web reads */
const META: Record<WrenField, string> = { name: "wren", egg: "wrenEgg", skin: "wrenSkin", accessory: "wrenAccessory", hatchSkin: "wrenHatchSkin" };

async function fromAccount(field: WrenField): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession(); // the metadata rides on the local session
    const m = (data.session?.user?.user_metadata || {}) as Record<string, unknown>;
    const v = m[META[field]];
    const s = typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
    return s || null;
  } catch {
    return null;
  }
}

async function toAccount(field: WrenField, value: string): Promise<void> {
  try {
    await supabase?.auth.updateUser({ data: { [META[field]]: value } });
  } catch {
    /* offline: the device has it, and the next save carries it up */
  }
}

/** read: the device first (she is dressed at once), the account when this
    device was never told, carrying a device-only value up as it goes */
export async function readWren(field: WrenField, ok: (v: string) => boolean): Promise<string | null> {
  let local = "";
  try {
    local = (await AsyncStorage.getItem(WREN_FIELDS[field]))?.trim() || "";
  } catch {
    /* no store: the account may still know */
  }
  const theirs = await fromAccount(field);
  if (local && ok(local)) {
    if (!theirs) void toAccount(field, local); // named or dressed here before this synced
    return local;
  }
  if (theirs && ok(theirs)) {
    try { await AsyncStorage.setItem(WREN_FIELDS[field], theirs); } catch { /* read-only is fine */ }
    return theirs;
  }
  return null;
}

/** write: the device, then the account */
export async function writeWren(field: WrenField, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(WREN_FIELDS[field], value);
  } catch {
    /* a coat is not worth failing over */
  }
  await toAccount(field, value);
}
