import * as Notifications from "expo-notifications";

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
        title: "The Morning Page is waiting.",
        body: "A line someone let drift out arrived at eight.",
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

export async function morningKnockEnabled(): Promise<boolean> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.some((n) => n.identifier === KNOCK_ID);
  } catch {
    return false;
  }
}
