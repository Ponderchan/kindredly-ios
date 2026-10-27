/* Behaviour lock for the Voice report in Swift (screens/report/report-model): the same cards, in
   the same order, on the same conditions as the React Native page (app/report.tsx), and the same
   words. Not wired to a runner; run by hand from the repo root with plain node:
     node src/screens/report/report-model.test.ts
   The model imports types only, so nothing needs stubbing. */

import { reportCardKeys, reportStarCount, reportView, type ReportFormat } from "./report-model.ts";
import type { ReportData } from "../../lib/report";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const fmt: ReportFormat = {
  t: (k, v) => (v ? `${k}:${Object.values(v).join("|")}` : k),
  wren: "Wren",
};

const data = (o: Partial<ReportData> = {}): ReportData =>
  ({
    read: {} as ReportData["read"],
    units: [0.2, 0.7],
    archetype: "An unhurried writer",
    chips: ["quick thoughts", "warm", "late"],
    brightest: ["Rhythm", "Warmth", "Shape"],
    words: ["rain", "window", "tea", "slow"],
    punct: [
      { mark: "—", pct: 52 },
      { mark: ",", pct: 3 },
    ],
    hourBand: "23:00 – 02:00",
    quote: "You write like the lamp is still on.",
    pieces: 12,
    ...o,
  }) as ReportData;

/* ── which cards, in which order ── */
ok("everything known: all seven, in the page's order", reportCardKeys(data()).join() === "cover,stars,hour,words,punct,quote,end");
ok("no hour band: no hour card", reportCardKeys(data({ hourBand: null })).join() === "cover,stars,words,punct,quote,end");
ok("two words are not enough for the words card", !reportCardKeys(data({ words: ["a", "b"] })).includes("words"));
ok("three words are", reportCardKeys(data({ words: ["a", "b", "c"] })).includes("words"));
ok("no marks: no marks card", !reportCardKeys(data({ punct: [] })).includes("punct"));
ok("the least there is: cover, sky, quote, end", reportCardKeys(data({ hourBand: null, words: [], punct: [] })).join() === "cover,stars,quote,end");

/* ── the numbers ── */
ok("stars: 3 + pieces", reportStarCount(0) === 3 && reportStarCount(4) === 7);
ok("stars: never more than 12", reportStarCount(9) === 12 && reportStarCount(400) === 12);

/* ── the words ── */
{
  const v = reportView(data(), fmt);
  ok("the cover's eyebrow and the sky's", v.eyebrows.cover === "m4.rt.eyebrow" && v.eyebrows.stars === "rt.sky");
  ok("every card's eyebrow is its own key", v.eyebrows.hour === "rt.hour" && v.eyebrows.words === "rt.words" && v.eyebrows.punct === "rt.marks" && v.eyebrows.quote === "rt.after" && v.eyebrows.end === "rt.keep");
  ok("many pieces: m4.rt.written with n", v.written === "m4.rt.written:12");
  ok("the brightest joined with a middle dot", v.brightest === "Rhythm · Warmth · Shape");
  ok("the favourite word, then the rest spaced", v.firstWord === "rain" && v.otherWords === "window   ·   tea   ·   slow");
  ok("the top mark is the first", v.topMark === "—");
  ok("a mark's bar is never under 6%", v.marks[0].bar === 52 && v.marks[1].bar === 6 && v.marks[1].pct === 3);
  ok("the quote in curly quotes, signed with an em dash", v.quote === "“You write like the lamp is still on.”" && v.signature === "— Wren");
  ok("Share hands over her name, the bare quote and the archetype", v.shareMessage === "m4.rt.share:Wren|You write like the lamp is still on.|An unhurried writer");
  ok("the close key's name", v.close === "m4.pw.close");
  ok("the stars for 12 pieces", v.stars === 12);
}
ok("one piece: m4.rt.writtenOne", reportView(data({ pieces: 1 }), fmt).written === "m4.rt.writtenOne");
ok("no hour band: an empty band, not null", reportView(data({ hourBand: null }), fmt).hourBand === "");

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
