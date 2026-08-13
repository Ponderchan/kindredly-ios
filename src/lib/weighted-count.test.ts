/* Behaviour lock for the weighted counter. Not wired to a test runner (the
   host can't run the RN toolchain); run by hand from the repo root with:
     node --experimental-strip-types src/lib/weighted-count.test.ts
   Every line prints ok/FAIL and the process exits non-zero if any fail. */

import { weightedCount as w, letterTier } from "./weighted-count.ts";

let fail = 0;
const eq = (got: number, want: number, label: string) => {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}  → ${got} (want ${want})`);
};

eq(w(""), 0, "empty");
eq(w("hello"), 5, "hello");
eq(w("ok"), 2, "ok (reply min)");
eq(w("我"), 2, "one hanzi");
eq(w("我没事"), 6, "3 hanzi");
eq(w("我没事 ok👍 https://x.com/abc"), 35, "worked example (35)");
eq(w("😀😀"), 4, "two emoji");
eq(w("👨‍👩‍👧‍👦"), 2, "family ZWJ = one emoji");
eq(w("🇯🇵"), 2, "flag = one emoji");
eq(w("1️⃣"), 2, "keycap = one emoji");
eq(w("👍🏽"), 2, "emoji + skin tone = one");
eq(w("café"), 4, "accented latin");
eq(w("안녕하세요"), 10, "korean x5");
eq(w("https://a.co/x https://b.co/y"), 47, "two urls + space (23+1+23)");
eq(w("www.example.com/really/long/path?q=1"), 23, "www url flat 23");
eq(w("。"), 2, "fullwidth punctuation");
eq(w("a\nb"), 3, "newline counts 1");

// calibration: terse one-line openers land in the 30s — just under the 40 floor
eq(w("把这件事憋了整整三年，今天想说出来。"), 36, "18-hanzi opener = 36 (under 40)");
eq(w("Some days I just miss who I used to be."), 39, "english opener = 39 (under 40)");

const tel = letterTier(w("我在等一个人。"));
const mid = letterTier(300);
const lng = letterTier(800);
if (!tel.center || tel.size !== 30) { fail++; console.log("FAIL  telegram tier"); }
if (mid.size !== 21 || lng.size !== 18) { fail++; console.log("FAIL  letter/long tier"); }

console.log(fail ? `\n${fail} FAILED` : "\nall passed");
process.exit(fail ? 1 : 0);
