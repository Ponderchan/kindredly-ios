/* The mood icons' Swift generator lock (scripts/gen-mood-art-swift.mjs). Not wired to a runner; run
   by hand from the repo root with plain node:
     node scripts/gen-mood-art-swift.test.mjs

   It checks, in order: the sources read as the generator expects (the 24 grid, every key one
   moods.ts names); the committed KMoodArtData.swift is what the generator writes today; every
   icon moods.ts names has one entry, in its order, and every drawn icon round-trips into Swift
   with the same path count, the same path data and the template ink; an icon not drawn yet is
   paths: nil and named in the header; a shape the reader refuses leaves only that icon undrawn;
   a key moods.ts doesn't name is left out; another grid is refused. */

import { readFileSync } from "node:fs";
import { paint } from "./art-path.mjs";
import { GRID, OUT, buildSwift, readArt, readSources } from "./gen-mood-art-swift.mjs";

let fails = 0;
const ok = (name, cond) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const throws = (fn) => {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
};

/* ── the sources ── */

const src = readSources();
const { art, moods } = src;
ok("the grid is 24", GRID === 24);
ok("moods.ts names 34 icons", moods.expected.length === 34);
ok("mood-line-art.ts holds only icons moods.ts names", Object.keys(art).every((k) => moods.expected.some((e) => e.key === k)));
ok("the four group icons are drawn today", ["calm", "happy", "tired", "low"].every((g) => Array.isArray(art[`mood-group-${g}`]) && art[`mood-group-${g}`].length === 3));
ok("refuses mood-line-art.ts on another grid", throws(() => readArt('export const MOOD_LINE_GRID = 60;\nexport const MOOD_LINE_ART: Readonly<Record<string, readonly LineShape[]>> = {};')));
ok("refuses a table that isn't JSON", throws(() => readArt("export const MOOD_LINE_GRID = 24;\nexport const MOOD_LINE_ART: X = {a: 1};")));

/* ── the committed Swift ── */

const built = buildSwift(src);
const committed = readFileSync(OUT, "utf8");
ok("KMoodArtData.swift is what the generator writes (run node scripts/gen-mood-art-swift.mjs)", committed === built.swift);
const sourceShapes = Object.values(art).reduce((n, l) => n + l.length, 0);
ok("every shape becomes one KArtPath", built.shapes === sourceShapes);
ok("nothing left out", built.ignored.length === 0);

// read the committed file back: entries and their KArtPath lines, in order
const ENTRY = /^ {4}KMoodArtEntry\("([^"]+)", paths: (nil|\[)\),?(?: \/\/ .*)?$|^ {4}KMoodArtEntry\("([^"]+)", paths: \[$/;
const PATH = /^ {6}KArtPath\(("(?:[^"\\]|\\.)*"), fill: (nil|0x[0-9A-F]{8})(?:, stroke: (0x[0-9A-F]{8}))?(?:, width: ([-0-9.e]+))?(?:, cap: \.(\w+))?(?:, join: \.(\w+))?\),$/;
const back = new Map();
let current = null;
let stray = 0;
for (const line of committed.split("\n")) {
  const e = ENTRY.exec(line);
  if (e) {
    const key = e[1] ?? e[3];
    current = { key, paths: e[2] === "nil" ? null : [] };
    back.set(key, current);
    if (e[2] === "nil") current = null;
    continue;
  }
  const p = PATH.exec(line);
  if (p) {
    if (!current) stray++;
    else
      current.paths.push({
        d: JSON.parse(p[1]),
        fill: p[2] === "nil" ? null : parseInt(p[2], 16),
        stroke: p[3] ? parseInt(p[3], 16) : null,
        width: p[4] ? Number(p[4]) : 1,
        cap: p[5] ?? "butt",
        join: p[6] ?? "miter",
      });
    continue;
  }
  if (/KArtPath\(|KMoodArtEntry\(/.test(line)) stray++;
}
ok("every KArtPath line belongs to an icon and reads back", stray === 0);
ok("the Swift lists the 34 icons in moods.ts order", [...back.keys()].join() === moods.expected.map((e) => e.key).join());
let roundTrip = true;
for (const e of moods.expected) {
  const source = art[e.key];
  const swift = back.get(e.key);
  if (!source) {
    if (swift?.paths !== null) roundTrip = false;
    continue;
  }
  if (!swift?.paths || swift.paths.length !== source.length) {
    roundTrip = false;
    console.log(`     ${e.key}: ${source.length} shapes in mood-line-art.ts, ${swift?.paths ? swift.paths.length : "no"} paths in Swift`);
    continue;
  }
  source.forEach((s, i) => {
    const w = swift.paths[i];
    const same =
      w.d === s.d &&
      w.fill === paint(s.f, "fill") &&
      w.stroke === paint(s.s, "stroke") &&
      w.width === (s.sw === undefined ? 1 : Number(s.sw)) &&
      w.cap === (s.lc ?? "butt") &&
      w.join === (s.lj ?? "miter");
    if (!same) {
      roundTrip = false;
      console.log(`     ${e.key} shape ${i + 1} differs`);
    }
  });
}
ok("every drawn icon round-trips: path count, data verbatim, paint", roundTrip);
ok("every mark is the template ink: a black fill, or a black stroke 2 wide with round caps and joins", [...back.values()].every((e) => !e.paths || e.paths.every((p) => (p.fill === 0x000000ff && p.stroke === null) || (p.fill === null && p.stroke === 0x000000ff && p.width === 2 && p.cap === "round" && p.join === "round"))));
ok("an icon not drawn yet is paths: nil", back.get("mood-sleepy")?.paths === null || !!art["mood-sleepy"]);
ok("the header counts what is drawn and names what isn't", new RegExp(`Drawn: ${built.drawn.length} of 34, ${built.shapes} marks\\.`).test(committed) && built.undrawn.every((u) => committed.includes(u.key)));
ok("the groups are sectioned in the owner's order", committed.indexOf("// ── Calm ──") < committed.indexOf("// ── Happy ──") && committed.indexOf("// ── Happy ──") < committed.indexOf("// ── Tired ──") && committed.indexOf("// ── Tired ──") < committed.indexOf("// ── Low ──"));

/* ── what can't be read stays undrawn, alone ── */

{
  const broken = structuredClone(art);
  broken["mood-group-calm"][0].tf = "rotate(8 12 12)";
  broken["mood-group-happy"][1].d = "M0,0L1"; // a missing number
  broken["mood-nobody"] = [{ t: "p", d: "M0 0h1", f: "#000000" }];
  const r = buildSwift({ art: broken, moods });
  ok("a transform and bad path data each leave that icon undrawn, saying why", r.undrawn.some((u) => u.key === "mood-group-calm" && /shape 1 of 3/.test(u.why)) && r.undrawn.some((u) => u.key === "mood-group-happy" && /shape 2 of 3/.test(u.why)));
  ok("they are written paths: nil with the reason", /KMoodArtEntry\("mood-group-calm", paths: nil\), \/\/ shape 1 of 3/.test(r.swift) && /Refused by the generator/.test(r.swift));
  ok("the other icons are untouched", r.drawn.includes("mood-group-tired") && r.drawn.includes("mood-group-low"));
  ok("a key moods.ts doesn't name is left out", r.ignored.join() === "mood-nobody" && !r.swift.includes("mood-nobody"));
}
{
  const r = buildSwift({ art: {}, moods });
  ok("nothing drawn: 34 entries, every one paths: nil", r.drawn.length === 0 && (r.swift.match(/paths: nil\)/g) ?? []).length === 34);
}

/* ── both renderers draw the same strokes ── */

{
  const swiftArt = readFileSync(new URL("../modules/kindredly-ui/ios/Portable/Kit/KMoodArt.swift", import.meta.url), "utf8");
  const rn = readFileSync(new URL("../src/screens/notes/notes-glyphs.tsx", import.meta.url), "utf8");
  const chip = readFileSync(new URL("../modules/kindredly-ui/ios/Portable/Notes/KMoodChip.swift", import.meta.url), "utf8");
  const steps = (text) => /faceSize <= 14 \? 2\.4 : faceSize < 30 \? 2 : 1\.75/.test(text);
  ok("the optical steps (2.4 to 14pt, 2.0 to 29pt, 1.75 from 30pt) are the same in KMoodArt and MoodFace", steps(swiftArt) && steps(rn));
  ok("both scale from the master stroke 2", /masterStroke: CGFloat = 2\b/.test(swiftArt) && /MOOD_LINE_STROKE = 2;/.test(rn));
  const faces = [...chip.matchAll(/static let (\w+) = Metrics\(size: (\d+), cornerRadius: (\d+), faceSize: (\d+)\)/g)].map((m) => [m[1], Number(m[4])]);
  ok("KMoodChip's four sizes take their stroke from the face size (22, 18, 13, 12)", faces.map(([k, f]) => `${k}:${f}`).join() === "card:22,compact:18,chip:13,legend:12");
  ok("the legend draws the group icons, the cards and the date chip a page's icon", /KMoodChip\(group: group, icon: group\.iconKey, metrics: \.legend\)/.test(readFileSync(new URL("../modules/kindredly-ui/ios/Portable/Notes/KNotesCalendar.swift", import.meta.url), "utf8")));
}

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
