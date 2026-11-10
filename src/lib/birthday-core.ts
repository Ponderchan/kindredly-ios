/* IS TODAY THIS READER'S BIRTHDAY — the pure half (owner's audit, 2026-11-10).
   ────────────────────────────────────────────────────────────────────────
   The reader gives a birthday in onboarding. It is private: it gates 18+,
   and it gives the star sign strangers may see (lib/zodiac). The old
   onboarding also promised "whoever hatches keeps it, and writes to you on
   the day", and nothing was ever built. On that day the first card on Today
   is now a letter from their courier (screens/today: buildWrenCard,
   useTodayDesk). This file is the rule that decides the day, and whether
   this year's letter is still owed; plain node locks it
   (node src/lib/birthday-core.test.ts).

   DECIDED ON THE PHONE, AND ONLY THERE. The birthday is read from the
   profile the phone already holds (auth's profile.dob, "YYYY-MM-DD": the
   account's copy, or a guest's own answers), held against the phone's own
   calendar, and the year the letter was read is kept in the phone's flags
   (lib/flags, per account bucket). Nothing about the date, the day or the
   letter is sent to any server: the app says the birthday is never shared,
   and this keeps it true.

   THE DAY. The reader's local calendar month and day, whatever the year
   they were born (the year is never read here). Not the desk's day
   (lib/day turns at eight): a birthday starts at midnight, like a birthday.
   Someone born on 29 February has their day on 28 February in a year
   without one (and on the 29th in a year with one, never both). No
   birthday, or a date that isn't one, is never.

   ONCE A YEAR. The letter is owed on the day until it has been passed; the
   year it was read is remembered, so it does not come back that day or on
   a relaunch, and next year it is owed again. Until the phone has answered
   what it remembers, nothing is decided ("ask"): the desk waits rather than
   show a stranger's letter and then push hers in front of it. */

/** A calendar day on the reader's own clock: the year, the month (1–12) and the day. */
export type CalendarDay = { y: number; m: number; d: number };

/** The reader's calendar day at `now` (local time). */
export function calendarDay(now: Date = new Date()): CalendarDay {
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

export const sameCalendarDay = (a: CalendarDay, b: CalendarDay): boolean => a.y === b.y && a.m === b.m && a.d === b.d;

/** A year with a 29 February. */
export const isLeapYear = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** the days in each month, with 29 for February (a leap-day birthday is a real one) */
const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** The month and day of a stored birthday ("YYYY-MM-DD", user_metadata.dob); null for none or anything that isn't a day of the year. The year is not read. */
export function birthdayOf(dob: string | null | undefined): { m: number; d: number } | null {
  const hit = /^\d{4}-(\d{2})-(\d{2})/.exec(typeof dob === "string" ? dob.trim() : "");
  if (!hit) return null;
  const m = Number(hit[1]);
  const d = Number(hit[2]);
  if (m < 1 || m > 12 || d < 1 || d > MONTH_DAYS[m - 1]) return null;
  return { m, d };
}

/**
 * Whether `today` is this reader's birthday: the same month and day; a 29
 * February birthday counts on 28 February in a year without a 29th. No
 * birthday is never.
 */
export function isBirthday(dob: string | null | undefined, today: CalendarDay): boolean {
  const b = birthdayOf(dob);
  if (!b) return false;
  if (b.m === 2 && b.d === 29 && !isLeapYear(today.y)) return today.m === 2 && today.d === 28;
  return b.m === today.m && b.d === today.d;
}

/**
 * Whether this year's letter is owed.
 * - "no"   not their birthday, or this year's was already read
 * - "ask"  it is their birthday and the phone hasn't said yet what it remembers (`readYear` undefined)
 * - "due"  it is their birthday and this year's hasn't been read (`readYear` null, or another year)
 */
export type BirthdayLetter = "no" | "ask" | "due";

export function birthdayLetter(a: { birthday: boolean; year: number; readYear: number | null | undefined }): BirthdayLetter {
  if (!a.birthday) return "no";
  if (a.readYear === undefined) return "ask";
  return a.readYear === a.year ? "no" : "due";
}

/* ── what the phone remembers (lib/flags keeps it; the key is made here so the test can lock it) ── */

const READ = "bdayletter:";

/** the flag that says the letter of `year` was read: one per year, in the account's own bucket */
export const birthdayFlag = (year: number): string => READ + year;

/** whether a flag is one of these (any year): marking a year read drops the older ones */
export const isBirthdayFlag = (key: string): boolean => key.startsWith(READ);
