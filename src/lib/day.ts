/* THE DESK'S DAY.
   ────────────────────────────────────────────────────────────────────────
   The blind says she's back at eight, so eight is when the day turns —
   for the ration, for the closed flag, for the day's counts on her note.
   Before this there were three different days on one page: the ration
   reset at local midnight, the "closed" flag at UTC midnight (which is
   eight in the morning in China and five in the afternoon in California),
   and the counters at UTC midnight too. A countdown is only true if the
   thing it counts to happens. */

/** the hour she's back with the next fifteen — the morning knock fires then too */
export const MORNING_HOUR = 8;

/** the desk's day, as a key: turns at MORNING_HOUR local time, not at midnight */
export function deskDay(now: Date = new Date()): string {
  const d = new Date(now.getTime());
  d.setHours(d.getHours() - MORNING_HOUR);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
