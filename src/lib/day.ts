/* THE DESK'S DAY.
   ────────────────────────────────────────────────────────────────────────
   The blind says she's back at eight, so eight is when the day turns —
   for the ration, for the closed flag, for the day's counts on her note.
   Before this there were three different days on one page: the ration
   reset at local midnight, the "closed" flag at UTC midnight (which is
   eight in the morning in China and five in the afternoon in California),
   and the counters at UTC midnight too. A countdown is only true if the
   thing it counts to happens. */

/** the hour she's back with the next ten — the morning knock fires then too */
export const MORNING_HOUR = 8;

/** the desk's day, as a key: turns at MORNING_HOUR local time, not at midnight */
export function deskDay(now: Date = new Date()): string {
  const d = new Date(now.getTime());
  d.setHours(d.getHours() - MORNING_HOUR);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* WHEN SHE'S BACK (Today 3d, 2026-10-16). One morning for everything that
   counts to it: her letter's countdown, the NOT YET chip, the window's
   "back in" (and, till 2026-11-13, the lock screen's DayClosed Live Activity). Before this
   there were two copies, one in activities and one in CloseOfDay. */

/** the next MORNING_HOUR:00 local, strictly after `now` (between 00:00 and 08:00 that is today's, never "tomorrow's") */
export function nextMorning(now: Date = new Date()): Date {
  const d = new Date(now.getTime());
  d.setHours(MORNING_HOUR, 0, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

/** whole minutes to nextMorning, rounded down: h = floor(min / 60), m = min % 60; ms is the exact gap */
export function untilMorning(now: Date = new Date()): { h: number; m: number; ms: number } {
  const ms = Math.max(0, nextMorning(now).getTime() - now.getTime());
  const min = Math.floor(ms / 60000);
  return { h: Math.floor(min / 60), m: min % 60, ms };
}

/** her yawn hours: 21:00 to 07:59 (she's asleep on the wire, and dozes off when the desk is done) */
export const isNightHour = (hour: number): boolean => hour >= 21 || hour < MORNING_HOUR;
