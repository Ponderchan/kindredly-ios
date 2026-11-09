/* Behaviour lock for what TS reads off a paper and a title before handing a reel to Swift
   (swift-reel-model). Not wired to a runner; run by hand from the repo root with plain node:
     node src/components/guide-reel/swift-reel-model.test.ts */

import { hardOf, hexes, kindredsTitleParts, lineOf, paperLook } from "./swift-reel-model.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};

// the CSS pieces
ok("hexes in order", JSON.stringify(hexes("linear-gradient(#E0483C 0, #FFFFFF 50%, #3A4F9E)")) === JSON.stringify(["#E0483C", "#FFFFFF", "#3A4F9E"]));
ok("a solid line", JSON.stringify(lineOf("2.5px solid #1E1B35")) === JSON.stringify({ w: 2.5, color: "#1E1B35", dashed: false }));
ok("a dashed line", lineOf("1px dashed #8A86A3")?.dashed === true);
ok("no line", lineOf("none") === null);
ok("a hard shadow", JSON.stringify(hardOf("6px 6px 0 #3A34D6")) === JSON.stringify({ x: 6, y: 6, color: "#3A34D6" }));
ok("a hard shadow without units", hardOf("0 2px 0 #1E1B35")?.y === 2);
ok("a soft shadow is not hard", hardOf("0 8px 24px rgba(30,27,53,0.18)") === null);

// a paper
const base = { bg: "#FFFFFF", border: "none", shadow: "none", radius: "18px", ink: "#1E1B35", line: "#E6E4EC", textShadow: "none", tBorder: "1px solid #E6E4EC", tRadius: "8px" };
const plain = paperLook({ id: "plain", ...base });
ok("plain: white, no line, rounded 18, swatch line 1", plain.ground === "#FFFFFF" && plain.line === null && plain.radius === 18 && plain.tLine?.w === 1);
ok("plain: no shadow at all", plain.hard === null && plain.soft === false);
const grid = paperLook({ id: "grid", ...base, bg: "linear-gradient(#DCD8F6 1px, transparent 1px), #FBFAFF", shadow: "0 8px 24px rgba(0,0,0,.1)" });
ok("grid: its ground is the last colour, its line ink the first", grid.ground === "#FBFAFF" && grid.gridInk === "#DCD8F6");
ok("grid: a soft shadow", grid.soft === true && grid.hard === null);
const air = paperLook({ id: "airmail", ...base, bg: "repeating-linear-gradient(45deg, #E0483C 0 10px, #FFFFFF 0 20px, #3A4F9E 0 30px)", border: "8px solid transparent", tBorder: "4px solid transparent" });
ok("airmail: white inside, striped 8 / 4, three stripe colours", air.ground === "#FFFFFF" && air.stripes === 8 && air.tStripes === 4 && air.stripeColors.length === 3);
ok("airmail: its transparent border draws no line", air.line === null);
const sticky = paperLook({ id: "sticky", ...base, shadow: "4px 4px 0 #1E1B35", fold: true });
ok("sticky: folded, a hard shadow", sticky.fold === true && sticky.hard?.x === 4);

// the kindreds title
const en = kindredsTitleParts("How a kindred forms", "Kindreds");
ok("en: the kindred in the pen", en.accent === 2 && en.parts[2] === "kindred ");
ok("en: parts keep their spaces", en.parts.join("") === "How a kindred forms");
ok("en: BigType's size", en.fit === 1);
const de = kindredsTitleParts("Wie Seelenverwandtschaft entsteht", "Seelenverwandte");
ok("de: the long word in the pen", de.accent === 1);
ok("de: set a size down so it fits the line", de.fit < 1 && Math.abs(de.fit - 0.82 / 0.11 / (20 * 0.6)) < 1e-9);
const none = kindredsTitleParts("Two strangers become friends", "Zzz");
ok("no stem match: the longer of the last two", none.accent === 3);
const ja = kindredsTitleParts("キンドレッドになるまで", "キンドレッド");
ok("ja: the run inside the line", ja.parts.length === 2 && ja.parts[0] === "キンドレッド" && ja.accent === 0);
const solo = kindredsTitleParts("Kindreds", "Zzz");
ok("one word, no match: no pen", solo.accent === -1 && solo.parts.length === 1);

console.log(fails ? `${fails} failed` : "all ok");
if (fails) process.exit(1);
