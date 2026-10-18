/* The star sign (lib/zodiac). Not wired to a runner; run by hand from the repo root with plain
   node (zodiac.ts imports nothing, so no resolver is needed):
     node src/lib/zodiac.test.ts
   The table is checked two ways: against the boundaries written out by hand below, and against
   design/identity/zodiac.v1.vectors.json (every day of a leap year), the file the web's
   scripts/zodiac.test.mjs also checks app/engine/zodiac.js AND migration 0034's SQL against —
   so the sign your phone previews is the sign strangers are sent. */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { ZODIAC, ZODIAC_CUSPS, ZODIAC_KEYS, ZODIAC_TEXT, isZodiac, zodiacFromDob, zodiacKey, zodiacOf, type Zodiac } from "./zodiac.ts";

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok  " : "FAIL") + " " + name + (cond || !extra ? "" : "  — " + extra));
  if (!cond) fails++;
};

/* ── the vectors ── */
const VECTORS_SHA256 = "5d27da3686aec7bdc0ed2dd5cef78eb6e6c96cbd013efcffe90a29b437ac66e5";
const vtext = readFileSync(new URL("../../design/identity/zodiac.v1.vectors.json", import.meta.url), "utf8");
ok("vectors file: sha256 locked", createHash("sha256").update(vtext).digest("hex") === VECTORS_SHA256);
const V = JSON.parse(vtext) as { days: [number, number, Zodiac][] };
ok("vectors: all 366 days of a leap year", V.days.length === 366);
{
  const bad = V.days.filter(([m, d, s]) => zodiacOf(m, d) !== s);
  ok("vectors: every day's sign reproduced", bad.length === 0, bad.slice(0, 3).map((x) => x.join("/")).join(", "));
}

/* ── the boundaries, by hand: the first and last day of each sign ── */
const HAND: [Zodiac, number, number, number, number][] = [
  ["aries", 3, 21, 4, 19],
  ["taurus", 4, 20, 5, 20],
  ["gemini", 5, 21, 6, 20],
  ["cancer", 6, 21, 7, 22],
  ["leo", 7, 23, 8, 22],
  ["virgo", 8, 23, 9, 22],
  ["libra", 9, 23, 10, 22],
  ["scorpio", 10, 23, 11, 21],
  ["sagittarius", 11, 22, 12, 21],
  ["capricorn", 12, 22, 1, 19],
  ["aquarius", 1, 20, 2, 18],
  ["pisces", 2, 19, 3, 20],
];
for (const [sign, m0, d0, m1, d1] of HAND) {
  ok(`${sign}: ${m0}/${d0} – ${m1}/${d1}, inclusive`, zodiacOf(m0, d0) === sign && zodiacOf(m1, d1) === sign && JSON.stringify(ZODIAC_CUSPS[sign]) === JSON.stringify([[m0, d0], [m1, d1]]));
}
ok("the day before each sign is the sign before it", HAND.every(([sign, m0, d0], i) => {
  const prev = HAND[(i + 11) % 12][0];
  const before = new Date(Date.UTC(2024, m0 - 1, d0 - 1));
  return zodiacOf(before.getUTCMonth() + 1, before.getUTCDate()) === prev && sign !== prev;
}));
{
  // every day has exactly one sign, and each sign 29–32 days
  const per = new Map<Zodiac, number>();
  let all = true;
  for (let m = 1; m <= 12; m++)
    for (let d = 1; d <= new Date(Date.UTC(2024, m, 0)).getUTCDate(); d++) {
      const s = zodiacOf(m, d);
      if (!s) all = false;
      else per.set(s, (per.get(s) ?? 0) + 1);
    }
  ok("every real day has a sign; each sign spans 29–32 days", all && per.size === 12 && [...per.values()].every((n) => n >= 29 && n <= 32));
}
ok("29 February is Pisces", zodiacOf(2, 29) === "pisces");
ok("days that don't exist have none", [[2, 30], [4, 31], [13, 1], [0, 5], [6, 0], [1, 32], [1.5, 3], [NaN, 1]].every(([m, d]) => zodiacOf(m, d) === null));

/* ── a stored birthday ── */
ok("dob: YYYY-MM-DD → its sign (the year is never read)", zodiacFromDob("1999-03-04") === "pisces" && zodiacFromDob("2007-06-21") === "cancer" && zodiacFromDob("1950-06-21") === "cancer");
ok("dob: stray spaces trimmed", zodiacFromDob(" 2001-12-25 ") === "capricorn");
ok("dob: none or junk → null", [null, undefined, "", "1999-3-4", "03/04/1999", "1999-02-30", "1999-13-01", "abcd-ef-gh", "1999-03-04T00:00:00Z"].every((x) => zodiacFromDob(x as string | null) === null));

/* ── keys ── */
ok("12 signs, Aries first", ZODIAC.length === 12 && ZODIAC[0] === "aries" && ZODIAC[11] === "pisces");
ok("keys: zd.<sign>, one per sign", ZODIAC_KEYS.length === 12 && zodiacKey("gemini") === "zd.gemini" && new Set(ZODIAC_KEYS).size === 12);
ok("isZodiac: the twelve keys only", ZODIAC.every(isZodiac) && ![null, "", "Gemini", "ophiuchus", 3, {}].some(isZodiac));
ok("text glyphs: ♈…♓ with U+FE0E (text, not emoji)", ZODIAC.every((s, i) => ZODIAC_TEXT[s] === String.fromCodePoint(0x2648 + i) + "︎"));

console.log(fails ? `\n${fails} FAILED` : "\nall ok");
if (fails) process.exit(1);
