/* Behaviour lock for "is today this reader's birthday" (lib/birthday-core; owner's audit,
   2026-11-10): the day by month and day whatever the year of birth, the leap-day birthday on
   28 February in a year without a 29th (and only then), no birthday and junk dates never, the
   reader's own calendar (not UTC), the once-a-year rule and its flag.
   Not wired to a runner; run by hand from the repo root with plain node (birthday-core.ts
   imports nothing, so no resolver is needed):
     node src/lib/birthday-core.test.ts
   Every line prints ok/FAIL and the process exits non-zero if any fail. */

import { birthdayFlag, birthdayLetter, birthdayOf, calendarDay, isBirthday, isBirthdayFlag, isLeapYear, sameCalendarDay } from "./birthday-core.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const day = (y: number, m: number, d: number) => ({ y, m, d });

/* ── the stored birthday ── */
ok("a stored birthday gives its month and day", JSON.stringify(birthdayOf("1996-06-14")) === JSON.stringify({ m: 6, d: 14 }));
ok("a timestamp after the date is still that date", JSON.stringify(birthdayOf("1996-06-14T00:00:00Z")) === JSON.stringify({ m: 6, d: 14 }));
ok("29 February is a real birthday", JSON.stringify(birthdayOf("2000-02-29")) === JSON.stringify({ m: 2, d: 29 }));
ok("none, empty and junk are no birthday", birthdayOf(null) === null && birthdayOf(undefined) === null && birthdayOf("") === null && birthdayOf("soon") === null && birthdayOf("14/06/1996") === null);
ok("a day that doesn't exist is no birthday", birthdayOf("1990-02-30") === null && birthdayOf("1990-04-31") === null && birthdayOf("1990-13-01") === null && birthdayOf("1990-00-10") === null && birthdayOf("1990-06-00") === null);

/* ── the day ── */
ok("the same month and day is the birthday, whatever the year", isBirthday("1996-06-14", day(2026, 6, 14)) && isBirthday("1996-06-14", day(2031, 6, 14)));
ok("the day before and the day after are not", !isBirthday("1996-06-14", day(2026, 6, 13)) && !isBirthday("1996-06-14", day(2026, 6, 15)));
ok("the same day of another month is not", !isBirthday("1996-06-14", day(2026, 7, 14)));
ok("no birthday is never", !isBirthday(null, day(2026, 6, 14)) && !isBirthday(undefined, day(2026, 6, 14)) && !isBirthday("", day(2026, 6, 14)));
ok("a junk date is never", !isBirthday("1990-02-30", day(2026, 2, 28)) && !isBirthday("soon", day(2026, 1, 1)));
ok("1 January and 31 December", isBirthday("2001-01-01", day(2027, 1, 1)) && isBirthday("2001-12-31", day(2026, 12, 31)) && !isBirthday("2001-12-31", day(2027, 1, 1)));

/* ── the leap day ── */
ok("leap years: 2024, 2028, 2000; not 2026, 2100, 1900", isLeapYear(2024) && isLeapYear(2028) && isLeapYear(2000) && !isLeapYear(2026) && !isLeapYear(2100) && !isLeapYear(1900));
ok("born 29 February: 28 February in a year without one", isBirthday("2000-02-29", day(2026, 2, 28)) && isBirthday("2000-02-29", day(2100, 2, 28)));
ok("born 29 February: not 1 March in a year without one", !isBirthday("2000-02-29", day(2026, 3, 1)));
ok("born 29 February: the 29th in a leap year", isBirthday("2000-02-29", day(2028, 2, 29)));
ok("born 29 February: not the 28th in a leap year (never both)", !isBirthday("2000-02-29", day(2028, 2, 28)));
ok("born 28 February: the 28th every year, never the 29th", isBirthday("1999-02-28", day(2026, 2, 28)) && isBirthday("1999-02-28", day(2028, 2, 28)) && !isBirthday("1999-02-28", day(2028, 2, 29)));

/* ── the reader's own calendar ── */
{
  // local midnight and one minute before the next one are the same day; the minute after is the next
  const first = new Date(2026, 5, 14, 0, 0, 0);
  const last = new Date(2026, 5, 14, 23, 59, 0);
  const next = new Date(2026, 5, 15, 0, 0, 0);
  ok("the calendar day is the reader's local date", JSON.stringify(calendarDay(first)) === JSON.stringify({ y: 2026, m: 6, d: 14 }));
  ok("it starts at local midnight and lasts to the next", isBirthday("1996-06-14", calendarDay(first)) && isBirthday("1996-06-14", calendarDay(last)) && !isBirthday("1996-06-14", calendarDay(next)));
  ok("not the desk's day: 00:30 is already the birthday", isBirthday("1996-06-14", calendarDay(new Date(2026, 5, 14, 0, 30))));
  ok("the same day is the same day", sameCalendarDay(calendarDay(first), calendarDay(last)) && !sameCalendarDay(calendarDay(first), calendarDay(next)));
}

/* ── once a year ── */
ok("not their birthday: no letter, whatever was read", birthdayLetter({ birthday: false, year: 2026, readYear: undefined }) === "no" && birthdayLetter({ birthday: false, year: 2026, readYear: null }) === "no");
ok("their birthday, the phone hasn't answered: ask (nothing is decided)", birthdayLetter({ birthday: true, year: 2026, readYear: undefined }) === "ask");
ok("their birthday, never read: due", birthdayLetter({ birthday: true, year: 2026, readYear: null }) === "due");
ok("their birthday, read this year: no", birthdayLetter({ birthday: true, year: 2026, readYear: 2026 }) === "no");
ok("their birthday, read last year: due again", birthdayLetter({ birthday: true, year: 2027, readYear: 2026 }) === "due");

/* ── the flag ── */
ok("one flag per year", birthdayFlag(2026) === "bdayletter:2026" && birthdayFlag(2027) !== birthdayFlag(2026));
ok("a birthday flag is told from the others", isBirthdayFlag(birthdayFlag(2026)) && !isBirthdayFlag("sealed:2026-11-10") && !isBirthdayFlag("arrival_fresh"));

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall ok");
