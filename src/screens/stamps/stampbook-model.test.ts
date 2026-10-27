/* Behaviour lock for the stamp album in Swift (screens/stamps/stampbook-model): the same stamps,
   colours, counts and words as the React Native page (app/stamps.tsx, GrowthStampTile). Not wired
   to a runner; run by hand from the repo root with plain node:
     node src/screens/stamps/stampbook-model.test.ts
   data/growth is plain data, so nothing needs stubbing. */

import { shadeHex, stampBookView, STAMPBOOK_WORDS } from "./stampbook-model.ts";
import { GROWTH_STAMPS, type GrowthStats } from "../../data/growth.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

const NONE: GrowthStats = { lettersSent: 0, reached: 0, gotReply: false, deepest: 0, kindreds: 0, keptN: 0, journalN: 0, driftN: 0, voiceSent: false, day: 0 };
const speak = (s: string) => s.replace(/Wren/g, "Pip");

/* ── lib/format shade, as hex ── */
ok("shade up, clamped at 255", shadeHex("#3A3AF5", 34) === "#5C5CFF");
ok("shade down, clamped at 0", shadeHex("#3A3AF5", -22) === "#2424DF" && shadeHex("#100000", -22) === "#000000");
ok("a lower-case hex reads the same", shadeHex("#d66c3e", 34) === "#F88E60");

/* ── nothing earned yet ── */
{
  const v = stampBookView(GROWTH_STAMPS, NONE, { speak });
  ok("every stamp, in the catalogue's order", v.tiles.map((t) => t.id).join() === GROWTH_STAMPS.map((s) => s.id).join());
  ok("the count: none of them", v.count === `0/${GROWTH_STAMPS.length}`);
  ok("all grey", v.tiles.every((t) => !t.earned && t.faceFrom === "#DFDFDB" && t.faceTo === "#C6C6C2"));
  ok("all say Keep going", v.tiles.every((t) => t.action === STAMPBOOK_WORDS.keepGoing));
  const three = v.tiles.find((t) => t.id === "three-streets")!;
  ok("a stamp with a target shows how far", three.progress === "0 / 3" && three.fraction === 0);
  const echo = v.tiles.find((t) => t.id === "first-echo")!;
  ok("a stamp without one shows no bar", echo.progress === "" && echo.fraction === 0);
  ok("the card's label: its number and its Chinese name", v.tiles[0].label === "STAMP NO. 01 · 第一封信" && v.tiles[11].label.startsWith("STAMP NO. 12 · "));
  ok("its story in her voice", v.tiles.find((t) => t.id === "three-streets")!.desc.includes("Pip is starting"));
}

/* ── some earned ── */
{
  const v = stampBookView(GROWTH_STAMPS, { ...NONE, lettersSent: 2, gotReply: true }, { speak });
  const first = v.tiles.find((t) => t.id === "first-post")!;
  ok("earned: in its own colour", first.earned && first.faceFrom === shadeHex("#3A3AF5", 34) && first.faceTo === shadeHex("#3A3AF5", -22));
  ok("earned: Write a letter", first.action === STAMPBOOK_WORDS.write);
  ok("the count counts the earned", v.count === `2/${GROWTH_STAMPS.length}`);
  const three = v.tiles.find((t) => t.id === "three-streets")!;
  ok("on the way: 2 / 3 and two thirds of the bar", three.progress === "2 / 3" && Math.abs(three.fraction - 2 / 3) < 1e-9);
  const ten = stampBookView(GROWTH_STAMPS, { ...NONE, lettersSent: 10 }, { speak }).tiles.find((t) => t.id === "three-streets")!;
  ok("earned: no bar, whatever the target", ten.earned && ten.progress === "");
}

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
