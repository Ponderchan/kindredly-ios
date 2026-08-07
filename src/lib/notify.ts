import * as Notifications from "expo-notifications";

/* The 8 o'clock knock — a fully local daily notification for the Morning
   Page. No server push involved; nothing else ever notifies (the product
   promise: "no rush, nothing nudges you"). */

const KNOCK_ID = "morning-knock";

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
        hour: 8,
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
