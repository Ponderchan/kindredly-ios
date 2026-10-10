import * as Notifications from "expo-notifications";
import { t } from "./i18n";

/* The 8 o'clock knock — a fully local daily notification for the Morning
   Page. No server push involved; nothing else ever notifies (the product
   promise: "no rush, nothing nudges you"). */

const KNOCK_ID = "morning-knock";

/* The one hour the day has a beat: the Morning Page lands, and the knock
   fires. Delivery of pool letters and replies is continuous (there's no
   server-side batch to release), so this is the daily ritual anchor, not a
   promise about when the next letter shows up. Single source of truth for
   both the notification and the quiet-state countdown. */
import { MORNING_HOUR } from "./day";
export { MORNING_HOUR };

export async function enableMorningKnock(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return false;
    await Notifications.cancelScheduledNotificationAsync(KNOCK_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: KNOCK_ID,
      content: {
        title: t("nt.knockTitle"),
        body: t("nt.knockBody"),
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: MORNING_HOUR,
        minute: 0,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function disableMorningKnock(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(KNOCK_ID);
  } catch {
    /* nothing scheduled */
  }
}

/* The knock's words are copied into the OS schedule the moment it's set, so
   they don't follow a later language change on their own — re-stamp them.
   A no-op when nothing is scheduled, and permission is already granted by
   definition if it is, so this never raises a prompt. */
export async function refreshMorningKnock(): Promise<void> {
  if (await morningKnockEnabled()) await enableMorningKnock();
}

export async function morningKnockEnabled(): Promise<boolean> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.some((n) => n.identifier === KNOCK_ID);
  } catch {
    return false;
  }
}

/* ── THE ONE PUSH THIS PRODUCT SENDS ────────────────────────────────
   "Nothing nudges you" was written for everything the app might want to
   say, and it still holds for all of it: no digests, no streaks, no
   "someone read your letter". But it also silenced the single event the
   whole product turns on — a stranger answered — and a letter that takes
   days to arrive needs a letterbox. Nine of eleven readers had gone quiet
   with answers waiting for them; nothing existed to say so. */

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
        void supabase!.auth.updateUser({ data: { tz } }).catch(() => {});
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
