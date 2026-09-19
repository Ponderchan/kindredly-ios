import { scoped } from "./scoped-store";
import { deskDay } from "./day";
import { EMPTY_COUNTERS, type LocalCounters } from "./usage-stickers";

/* LOCAL COUNTERS — the handful of taps the usage stickers count.
   ────────────────────────────────────────────────────────────────────────
   Letters shown, replies sent, translations asked for, visits to the
   courier's room. Kept per account on this phone (the scoped store follows
   the session), never sent anywhere; they only ever become a sticker the
   reader sees about themselves. Read from storage each time — a bump is a
   rare event and a cache would have to follow account switches. */

const KEY = "kindredly_usage_counters";

export async function getCounters(): Promise<LocalCounters> {
  try {
    const raw = await scoped.getItem(KEY);
    return raw ? { ...EMPTY_COUNTERS, ...(JSON.parse(raw) as Partial<LocalCounters>) } : { ...EMPTY_COUNTERS };
  } catch {
    return { ...EMPTY_COUNTERS };
  }
}

/** letters shown today — zero once the day has turned */
export const seenToday = (c: LocalCounters): number => (c.seenDay === deskDay() ? c.seenToday ?? 0 : 0);
/** replies sent today — zero once the day has turned */
export const repliedToday = (c: LocalCounters): number => (c.repliedDay === deskDay() ? c.repliedToday ?? 0 : 0);

export async function bump(key: "seen" | "replied" | "translated" | "courierVisits", by = 1): Promise<void> {
  const c = await getCounters();
  c[key] += by;
  const day = deskDay(); // the desk's day, not the calendar's — see lib/day
  if (key === "seen") {
    // the day's own count, for the courier's "3 letters went past your desk today"
    c.seenToday = (c.seenDay === day ? c.seenToday ?? 0 : 0) + by;
    c.seenDay = day;
  }
  if (key === "replied") {
    // and the day's replies, for her slip on the closed counter
    c.repliedToday = (c.repliedDay === day ? c.repliedToday ?? 0 : 0) + by;
    c.repliedDay = day;
  }
  try {
    await scoped.setItem(KEY, JSON.stringify(c));
  } catch {
    /* a counter is not worth an error */
  }
}
