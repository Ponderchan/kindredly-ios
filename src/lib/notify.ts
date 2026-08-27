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
export const MORNING_HOUR = 8;

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
