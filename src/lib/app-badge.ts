import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import type { ThreadSummary } from "./db";
import { readRoomSeen } from "./room-seen";
import { appBadgeCount } from "../screens/kindreds/kindreds-model";
import { supabase } from "./supabase";

/* THE NUMBER ON THE APP ICON (owner, 2026-10-21). Every message of theirs not yet read
   (screens/kindreds/kindreds-model appBadgeCount). The phone knows what was read (lib/room-seen),
   so the phone sets the exact number: whenever the list is read (launch, a live poke, the
   Kindreds tab), when a room marks itself read, and as the app leaves the screen. A push may
   raise it meanwhile (the server's guess, functions/_lib/push-who); the next sync corrects it.
   Signing out clears it. A failure is logged: a stale badge is not worth a crash. */

let last: readonly ThreadSummary[] | null = null;
let shown = -1;

async function apply(n: number): Promise<void> {
  if (n === shown) return;
  try {
    await Notifications.setBadgeCountAsync(n);
    shown = n;
  } catch (e) {
    console.log("[badge] couldn't set the app icon number:", e);
    return;
  }
  void tellServer(n);
}

/* the same number on this phone's push_tokens row (web 0046), so a push about a new message
   can say n + 1 while the app is closed. Only once the device is registered; a row that isn't
   there, or a server before 0046, is logged and left. */
let token: string | null = null;
async function tellServer(n: number): Promise<void> {
  if (!supabase) return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== "granted") return;
    token ??= (await Notifications.getExpoPushTokenAsync()).data || null;
    if (!token) return;
    const { error } = await supabase.from("push_tokens").update({ badge: n }).eq("token", token);
    if (error) throw error;
  } catch (e) {
    console.log("[badge] couldn't tell the server the icon number:", e);
  }
}

/** the list as just read: remember it and set the number from it */
export async function syncAppBadge(threads?: readonly ThreadSummary[] | null): Promise<void> {
  if (threads) last = threads;
  if (!last) return;
  await apply(appBadgeCount(last, await readRoomSeen()));
}

/** signed out, or the account deleted: nothing of anyone's on the icon */
export function clearAppBadge(): void {
  last = null;
  void apply(0);
}

AppState.addEventListener("change", (s) => {
  if (s === "background") void syncAppBadge();
});
