import * as Notifications from "expo-notifications";

/* THE 8 O'CLOCK KNOCK — now one of her lines (push step two, iOS 1.2.3).
   It used to be a repeating daily trigger with fixed words, which could
   neither change its line nor know whether the desk had letters. It is a
   device switch now, and the knock itself is planned with the rest of her
   lines in lib/local-push: one-shot, a different line each morning, every
   morning while it is on (owner, 2026-10-11: only a desk the app KNOWS is
   empty would skip it, and the desk refills at eight, after the app last
   looked — so in practice none is skipped), carrying the morning question
   when that is on. These four keep their old names for their callers. */

import { MORNING_HOUR } from "./day";
export { MORNING_HOUR };
import { askForNotifications, getKnockOn, replanLocal, setKnockOn } from "./local-push";

export async function enableMorningKnock(): Promise<boolean> {
  try {
    if (!(await askForNotifications())) return false;
    await setKnockOn(true);
    return true;
  } catch (e) {
    console.warn("[notify] knock on:", e);
    return false;
  }
}

export async function disableMorningKnock(): Promise<void> {
  try {
    await setKnockOn(false);
  } catch (e) {
    console.warn("[notify] knock off:", e);
  }
}

/* The words are copied into the OS schedule the moment they're set, so they
   don't follow a later language change (or a new name for her) on their
   own — re-stamp everything. Never raises a permission prompt. */
export async function refreshMorningKnock(): Promise<void> {
  await replanLocal({ force: true });
}

export async function morningKnockEnabled(): Promise<boolean> {
  try {
    return await getKnockOn();
  } catch (e) {
    console.warn("[notify] knock read:", e);
    return false;
  }
}

/* ── THE PUSHES THE SERVER SENDS ────────────────────────────────────
   "Nothing nudges you" was written for everything the app might want to
   say. It silenced the single event the whole product turns on — a
   stranger answered — and a letter that takes days to arrive needs a
   letterbox. Since push step two (owner, 2026-10-10) the server also sends
   a few reminders (her hunger, a room about to close, a letter's first
   opening), each with its own switch in Settings (user_metadata.push), and
   none of them ever carries who, or a word of anyone's letter. */

import { supabase, supabaseReady } from "./supabase";
import { getLang } from "./i18n";

/** register this device for the reply knock. Idempotent; silent on refusal. */
export async function registerForReplies(): Promise<void> {
  if (!supabaseReady) return;
  try {
    const { data: u } = await supabase!.auth.getUser();
    const uid = u.user?.id;
    if (!uid || u.user?.is_anonymous) return; // a guest has no correspondence

    /* AND WHAT TIME IT IS THERE (2026-10-10, push step two). Reminders keep
       to the reader's own day — nothing after ten at night, the hungry
       courier at seven — and that day is set server-side, so the time zone
       rides on the account the way the courier's name does. Written only
       when it changed (a trip, a move), whatever the push permission. */
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && (u.user?.user_metadata as Record<string, unknown> | undefined)?.tz !== tz) {
        void supabase!.auth.updateUser({ data: { tz } }).then(({ error }) => error && console.warn("[notify] tz write:", error.message), (e) => console.warn("[notify] tz write:", e));
      }
    } catch {
      /* no zone, no reminders by the clock — the knocks themselves still come */
    }

    const perm = await Notifications.getPermissionsAsync();
    let status = perm.status;
    /* asked only once, and only after a session exists — a permission
       sheet on first launch, before anyone has written a word, is a
       stranger asking to buzz you about nothing */
    if (status !== "granted") {
      if (!perm.canAskAgain) return;
      status = (await Notifications.requestPermissionsAsync()).status;
      // just allowed: the launch re-plan found no permission and stood down — plan her lines now
      if (status === "granted") void replanLocal({ force: true });
    }
    if (status !== "granted") return;

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (!token) return;
    /* AND WHAT LANGUAGE TO KNOCK IN. The one sentence this product ever
       pushes is written server-side, where none of the app's four
       translations are reachable — so the language rides on the token and
       is refreshed on every launch, which also means changing it in
       Settings changes the next knock. */
    await supabase!.from("push_tokens").upsert(
      { token, user_id: uid, platform: "ios", lang: getLang(), updated_at: new Date().toISOString() },
      { onConflict: "token" },
    );
  } catch {
    /* a device that cannot be reached is not a broken app */
  }
}

/** stop knocking this device — called on sign-out and account deletion. */
export async function forgetThisDevice(): Promise<void> {
  if (!supabaseReady) return;
  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (token) await supabase!.from("push_tokens").delete().eq("token", token);
  } catch {}
}
