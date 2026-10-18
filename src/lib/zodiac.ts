/* THE STAR SIGN NEXT TO A STRANGER'S NAME (identity plan, Addendum: the
   owner's option B, 2026-10-16 evening — on by default, the year never).
   ────────────────────────────────────────────────────────────────────────
   A stranger's letters show their sign as a small line glyph after the
   she/he mark (4pt after it, or where it would be). Only the sign: never
   the date, the year, an age or a cohort, anywhere a stranger can see it.

   WHO COMPUTES WHAT. Another person's sign comes from the server: web
   migration 0034's marks_for() reads the birthday from their account
   (user_metadata.dob, "YYYY-MM-DD", written by auth.saveProfile at
   onboarding), works out the sign from the month and day in SQL with the
   SAME inclusive table as ZODIAC_CUSPS below, honours their showSign
   switch, and returns only the sign's key. The date never leaves the
   database. This file is the client's half: your OWN sign for the
   birthday step's preview ("Your star sign ♊ shows on your letters") and
   Edit profile, and the keys every renderer and VoiceOver label use.

   THE TABLE is the common Western one, inclusive at both ends, read from
   the month and day only (a 29 February is Pisces, like the 28th). The web
   twin (app/engine/zodiac.js) is a line-for-line port and the web's
   scripts/zodiac.test.mjs checks 0034's SQL against the same days, so the
   preview on your phone is the sign strangers see.

   WORDS. The sign's name in nine languages is the copy agent's (natively
   written, like every key): zodiacKey(sign) gives the i18n key ("zd.gemini"),
   used for VoiceOver ("{name}, she, Gemini") and the Edit profile row.
   ZODIAC_TEXT is the Unicode fallback for text-only places (♊︎ with U+FE0E so
   it draws as a text glyph, not the colour emoji); the screens draw the
   12 line glyphs (24 grid, stroke 2) instead.

   Pure and import-free, so plain node can test it (src/lib/zodiac.test.ts). */

/** The twelve signs, Aries first (the order of the year from the March equinox). */
export const ZODIAC = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"] as const;
export type Zodiac = (typeof ZODIAC)[number];

/** Each sign's first and last day, inclusive, as [month 1–12, day]. Capricorn runs over the new year. */
export const ZODIAC_CUSPS: Readonly<Record<Zodiac, readonly [readonly [number, number], readonly [number, number]]>> = {
  aries: [[3, 21], [4, 19]],
  taurus: [[4, 20], [5, 20]],
  gemini: [[5, 21], [6, 20]],
  cancer: [[6, 21], [7, 22]],
  leo: [[7, 23], [8, 22]],
  virgo: [[8, 23], [9, 22]],
  libra: [[9, 23], [10, 22]],
  scorpio: [[10, 23], [11, 21]],
  sagittarius: [[11, 22], [12, 21]],
  capricorn: [[12, 22], [1, 19]],
  aquarius: [[1, 20], [2, 18]],
  pisces: [[2, 19], [3, 20]],
};

/** The Unicode sign for text-only places, with U+FE0E so it draws as text, not the colour emoji. */
export const ZODIAC_TEXT: Readonly<Record<Zodiac, string>> = {
  aries: "♈︎",
  taurus: "♉︎",
  gemini: "♊︎",
  cancer: "♋︎",
  leo: "♌︎",
  virgo: "♍︎",
  libra: "♎︎",
  scorpio: "♏︎",
  sagittarius: "♐︎",
  capricorn: "♑︎",
  aquarius: "♒︎",
  pisces: "♓︎",
};

/** the days in each month, with 29 for February (a leap-day birthday is a real one) */
const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** true for one of the twelve keys (what marks_for returns, or junk) */
export function isZodiac(x: unknown): x is Zodiac {
  return typeof x === "string" && (ZODIAC as readonly string[]).includes(x);
}

/** The sign for a month (1–12) and day; null for a day that doesn't exist (13/1, 31/4, 30/2). */
export function zodiacOf(month: number, day: number): Zodiac | null {
  if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1 || day > MONTH_DAYS[month - 1]) return null;
  const md = month * 100 + day;
  for (const sign of ZODIAC) {
    const [[m0, d0], [m1, d1]] = ZODIAC_CUSPS[sign];
    const from = m0 * 100 + d0;
    const to = m1 * 100 + d1;
    if (from <= to ? md >= from && md <= to : md >= from || md <= to) return sign;
  }
  return null; // unreachable: the table covers every day
}

/** The sign for a stored birthday ("YYYY-MM-DD", user_metadata.dob); null for none or junk. Reads the month and day only. */
export function zodiacFromDob(dob: string | null | undefined): Zodiac | null {
  const hit = /^\d{4}-(\d{2})-(\d{2})$/.exec(typeof dob === "string" ? dob.trim() : "");
  return hit ? zodiacOf(Number(hit[1]), Number(hit[2])) : null;
}

/** The i18n key for a sign's name (VoiceOver, Edit profile): "zd.aries" … "zd.pisces". The copy agent writes them. */
export const zodiacKey = (sign: Zodiac): string => "zd." + sign;

/** Every sign's key, for the copy agent's checklist and the key-coverage test. */
export const ZODIAC_KEYS: readonly string[] = ZODIAC.map(zodiacKey);
