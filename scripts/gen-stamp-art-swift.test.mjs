/* The stamp-art generator's lock (scripts/gen-stamp-art-swift.mjs). Not wired to a runner; run
   by hand from the repo root with plain node:
     node scripts/gen-stamp-art-swift.test.mjs

   Stamps v2 (2026-10-18): the generator now reads src/data/stamp-art-v2.ts (each stamp's marks
   on the 100 × 120 box in three layers, art / soft / xs, each a fill or a stroke, some soft
   marks flagged dropAtS) and writes KStampMark lines with no paint: KStamp colours and strokes
   them at draw time. It checks, in order: the sources read as the generator expects; every stamp
   round-trips into the committed KStampArtData.swift with the same marks in the same layers, in
   the same order, with the same path data, kind and dropAtS, under its own category and colour;
   the committed file is what the generator writes today; the path-data reader's grammar,
   including what it must refuse; arcs land on their ellipse; and a stamp the generator can't
   read becomes the template (no marks) without touching the others. */

import { readFileSync } from "node:fs";
import { LAYERS, OUT, arcToCurves, buildSwift, paint, parsePath, readMark, readSources, swiftMark } from "./gen-stamp-art-swift.mjs";

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
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const ops = (segs) => segs.map((s) => s.op).join("");
const nums = (segs) => segs.flatMap((s) => s.p ?? []);
const sameNums = (a, b, eps = 1e-9) => a.length === b.length && a.every((v, i) => near(v, b[i], eps));

/* ── the sources ── */

const src = readSources();
const { art, cats, stamps, unknownTint } = src;
ok("stamps.ts lists 36 stamps", stamps.length === 36);
ok("in 6 categories of 6", cats.length === 6 && cats.every((c) => stamps.filter((s) => s.cat === c.id).length === 6));
ok("every stamp has a drawing with art marks in stamp-art-v2.ts", stamps.every((s) => Array.isArray(art[s.id]?.art) && art[s.id].art.length > 0));
ok("stamp-art-v2.ts has no drawing for an unknown id", Object.keys(art).every((k) => stamps.some((s) => s.id === k)));
ok("every drawing has exactly the three layers", stamps.every((s) => Object.keys(art[s.id]).sort().join() === "art,soft,xs"));
ok("the unknown-id colour is read from stamp-frame.ts", unknownTint.toUpperCase() === "#8B7FE8");
const count = (layer) => stamps.reduce((n, s) => n + art[s.id][layer].length, 0);
const sourceMarks = { art: count("art"), soft: count("soft"), xs: count("xs") };
ok(`the drawings have ${sourceMarks.art} art, ${sourceMarks.soft} soft and ${sourceMarks.xs} xs marks`, sourceMarks.art > 0 && sourceMarks.xs > 0);
ok("every stamp has its XS cut", stamps.every((s) => art[s.id].xs.length > 0));
ok("only soft marks are flagged dropAtS", stamps.every((s) => ["art", "xs"].every((l) => art[s.id][l].every((m) => !m.dropAtS))));

/* ── the generator reads all of it ── */

const built = buildSwift(src);
ok("all 36 stamps read (no templates)", built.read.length === 36 && built.unread.length === 0);
if (built.unread.length) for (const u of built.unread) console.log(`     ${u.id}: ${u.why}`);
ok("every mark becomes one KStampMark", LAYERS.every((l) => built.marks[l] === sourceMarks[l]));
ok("nothing left out", built.ignored.length === 0);

/* ── the committed Swift round-trips every stamp ── */

const committed = readFileSync(OUT, "utf8");
ok("KStampArtData.swift is what the generator writes (run node scripts/gen-stamp-art-swift.mjs)", committed === built.swift);
ok("it states the 100 × 120 box", /static let box = CGSize\(width: 100, height: 120\)/.test(committed));
ok("and the unknown-id colour", /static let unknownTint: UInt32 = 0x8B7FE8FF/.test(committed));

// read the committed file back: entries, their layers and their KStampMark lines, in order
const ENTRY = /^ {4}KStampArtEntry\("([^"]+)", category: "([^"]+)", tint: (0x[0-9A-F]{8})(, art: \[\], soft: \[\], xs: \[\]\),|,)$/;
const LAYER_OPEN = /^ {6}(art|soft|xs): \[(\],?)?$/;
const LAYER_CLOSE = /^ {6}\],?$/;
const MARK = /^ {8}KStampMark\(("(?:[^"\\]|\\.)*"), \.(fill|stroke)(, dropAtS: true)?\),$/;
const back = new Map();
let current = null;
let layer = null;
let stray = 0;
for (const line of committed.split("\n")) {
  const e = ENTRY.exec(line);
  if (e) {
    current = { id: e[1], cat: e[2], tint: e[3], art: [], soft: [], xs: [], template: e[4] !== "," };
    back.set(e[1], current);
    if (current.template) current = null;
    layer = null;
    continue;
  }
  const open = LAYER_OPEN.exec(line);
  if (open) {
    if (!current) stray++;
    layer = open[2] ? null : open[1];
    continue;
  }
  if (LAYER_CLOSE.test(line)) {
    layer = null;
    continue;
  }
  const m = MARK.exec(line);
  if (m) {
    if (!current || !layer) stray++;
    else current[layer].push({ d: JSON.parse(m[1]), kind: m[2], dropAtS: !!m[3] });
    continue;
  }
  if (/KStampMark\(|KStampArtEntry\(/.test(line)) stray++; // a line the patterns don't know
}
ok("every KStampMark line belongs to a layer of a stamp and reads back", stray === 0);
ok("the Swift lists the 36 stamps in stamps.ts order", [...back.keys()].join() === stamps.map((s) => s.id).join());
let countsMatch = true;
let dataMatch = true;
let metaMatch = true;
for (const st of stamps) {
  const swift = back.get(st.id);
  if (!swift || swift.template) {
    countsMatch = false;
    console.log(`     ${st.id}: no marks in Swift`);
    continue;
  }
  if (swift.cat !== st.cat || parseInt(swift.tint, 16) !== paint(st.color, "fill")) metaMatch = false;
  for (const l of LAYERS) {
    const source = art[st.id][l];
    if (swift[l].length !== source.length) {
      countsMatch = false;
      console.log(`     ${st.id} ${l}: ${source.length} marks in stamp-art-v2.ts, ${swift[l].length} in Swift`);
      continue;
    }
    source.forEach((s, i) => {
      const w = swift[l][i];
      if (w.d !== s.d || w.kind !== s.kind || w.dropAtS !== (s.dropAtS === true)) {
        dataMatch = false;
        console.log(`     ${st.id} ${l} mark ${i + 1}: differs`);
      }
    });
  }
}
ok("every stamp round-trips its mark count, layer by layer", countsMatch);
ok("every mark's path data, kind and dropAtS are copied verbatim", dataMatch);
ok("every stamp keeps its category and its own colour", metaMatch);
ok("the dropAtS flags all reach Swift", [...back.values()].reduce((n, e) => n + e.soft.filter((m) => m.dropAtS).length, 0) === stamps.reduce((n, s) => n + art[s.id].soft.filter((m) => m.dropAtS).length, 0));

/* ── marks ── */

ok("a fill, a stroke and a dropAtS stroke are written as KStampMark",
  swiftMark(readMark({ d: "M0,0L1,1Z", kind: "fill" })) === 'KStampMark("M0,0L1,1Z", .fill)' &&
    swiftMark(readMark({ d: "M0,0L1,1", kind: "stroke", dropAtS: true })) === 'KStampMark("M0,0L1,1", .stroke, dropAtS: true)');
ok("refuses a kind that isn't fill or stroke", throws(() => readMark({ d: "M0,0", kind: "soft" })) && throws(() => readMark({ d: "M0,0" })));
ok("refuses a key nobody knows, rather than dropping it", throws(() => readMark({ d: "M0,0", kind: "fill", fill: "#fff" })));
ok("refuses dropAtS that isn't true", throws(() => readMark({ d: "M0,0", kind: "fill", dropAtS: false })));
ok("refuses path data the reader would cut short, or with characters SVG doesn't allow",
  throws(() => readMark({ d: "M0,0L1", kind: "fill" })) && throws(() => readMark({ d: "M0,0L1,1;", kind: "fill" })) && throws(() => readMark({ d: "", kind: "fill" })));

/* ── the path-data reader ── */

ok("absolute M L H V Z", ops(parsePath("M1,2L3,4H10V20Z")) === "MLLLZ" && sameNums(nums(parsePath("M1,2L3,4H10V20Z")), [1, 2, 3, 4, 10, 4, 10, 20]));
ok("relative m l h v", sameNums(nums(parsePath("m1,2l3,4h10v20")), [1, 2, 4, 6, 14, 6, 14, 26]));
ok("q and t: t reflects the last control point", sameNums(nums(parsePath("M13,45q8,-5 17,0t17,0")), [13, 45, 21, 40, 30, 45, 39, 50, 47, 45]));
ok("t with no curve before it uses the current point", sameNums(nums(parsePath("M0,0T10,0")), [0, 0, 0, 0, 10, 0]));
ok("c and s: s reflects the last second control point", sameNums(nums(parsePath("M0,0c1,1 2,1 3,0s2,-1 3,0")), [0, 0, 1, 1, 2, 1, 3, 0, 4, -1, 5, -1, 6, 0]));
ok("s after a line uses the current point", sameNums(nums(parsePath("M0,0L5,0S8,3 10,0")).slice(4, 6), [5, 0]));
ok("extra pairs after M are line-tos (and after m relative ones)", ops(parsePath("M0,0 1,1 2,2")) === "MLL" && sameNums(nums(parsePath("m1,1 1,1")), [1, 1, 2, 2]));
ok("a command repeats while numbers follow", ops(parsePath("M0,0q1,1 2,0 1,-1 2,0")) === "MQQ");
ok("after Z the point is the subpath's start", sameNums(nums(parsePath("M10,10h5v5zl1,1")), [10, 10, 15, 10, 15, 15, 11, 11]));
ok('numbers: ".01", "1-8", "2.6.5", "1e-1", "+3"', sameNums(nums(parsePath("M.01-8L2.6.5 1e-1+3")), [0.01, -8, 2.6, 0.5, 0.1, 3]));
ok("separators: commas, spaces, tabs, newlines", sameNums(nums(parsePath("M 1 , 2\n\tL3\t4")), [1, 2, 3, 4]));
ok("the v2 marks' all-comma curves (C46,56.63,40.63,62,34,62)", ops(parsePath("M46,50C46,56.63,40.63,62,34,62")) === "MC");
ok("arc flags may run into the next number", ops(parsePath("M0,0a5,5 0 0110,0")) === ops(parsePath("M0,0a5,5 0 0 1 10,0")));
ok("refuses data not starting with M", throws(() => parsePath("L1,2")));
ok("refuses a missing number", throws(() => parsePath("M1")) && throws(() => parsePath("M0,0C1,1 2,2")));
ok("refuses an unknown command", throws(() => parsePath("M0,0X1,1")));
ok("refuses numbers after Z", throws(() => parsePath("M0,0L1,1Z 2,2")));
ok("refuses a flag that isn't 0 or 1", throws(() => parsePath("M0,0a5,5 0 2 1 10,0")));
ok('refuses "1e" with no exponent digits', throws(() => parsePath("M1e,2")));
ok("refuses empty data", throws(() => parsePath("")) && throws(() => parsePath("   ")));

/* ── arcs ── */

// every point of a cubic within the tolerance of the ellipse (cx, cy, rx, ry), axis-aligned
const onEllipse = (x0, y0, curves, cx, cy, rx, ry, eps) => {
  let px = x0;
  let py = y0;
  for (const c of curves) {
    const [x1, y1, x2, y2, x, y] = c.p;
    for (let t = 0; t <= 1; t += 0.125) {
      const u = 1 - t;
      const bx = u * u * u * px + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x;
      const by = u * u * u * py + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y;
      if (Math.abs(Math.hypot((bx - cx) / rx, (by - cy) / ry) - 1) > eps) return false;
    }
    px = x;
    py = y;
  }
  return true;
};
{
  const half = arcToCurves(22, 38, 10, 10, 0, true, false, 42, 38);
  ok("a half turn is two quarter curves ending on its end point", half.length === 2 && near(half[1].p[4], 42) && near(half[1].p[5], 38));
  ok("and it stays on its circle", onEllipse(22, 38, half, 32, 38, 10, 10, 1e-3));
  ok("sweep 0 from left to right passes below (y down: larger y)", half[0].p[5] > 38);
  const whole = parsePath("M32,13a13,17 0 1 0 .01,0"); // a whole ellipse from an almost-closed arc
  ok("an almost-closed arc is a whole ellipse in four curves", ops(whole) === "MCCCC");
  ok("and it stays on its ellipse", onEllipse(32, 13, whole.slice(1), 32.005, 30, 13, 17, 2e-3));
  ok("a corner arc (a6,6 0 0 1 -6,6) is one quarter curve", ops(parsePath("M10,0a6,6 0 0 1 -6,6")) === "MC");
  ok("a perforation bite (A3.000,3.000 0 0 0 13.000,0) is a half circle in two curves", ops(parsePath("M7.000,0 A3.000,3.000 0 0 0 13.000,0")) === "MCC");
  ok("an arc with a zero radius is a line", ops(parsePath("M0,0a0,5 0 0 1 10,0")) === "ML");
  ok("an arc to its own start draws nothing", ops(parsePath("M5,5a3,3 0 1 0 0,0")) === "M");
  const small = arcToCurves(0, 0, 1, 1, 0, false, true, 10, 0); // radius too small: scaled up to reach
  ok("a radius too small to reach is scaled up (a half circle of radius 5)", onEllipse(0, 0, small, 5, 0, 5, 5, 1e-3));
}

/* ── what can't be read becomes the template, alone ── */

{
  const ids = stamps.map((s) => s.id);
  const broken = structuredClone(art);
  broken[ids[0]].art[0].d = "M0,0L1"; // a missing number
  broken[ids[1]].soft.length ? (broken[ids[1]].soft[0].kind = "tint") : (broken[ids[1]].art[0].kind = "tint");
  delete broken[ids[2]];
  broken[ids[3]].art = []; // rejected by the importer: written with no marks
  broken[ids[4]].xs[0].opacity = 0.5;
  const r = buildSwift({ ...src, art: broken });
  const unread = r.unread.map((u) => u.id);
  ok("bad path data, an unknown kind, no drawing, no art marks and an unknown key each make a template", unread.join() === ids.slice(0, 5).join());
  ok("each says why", r.unread.every((u) => /mark \d+ of \d+|no drawing|no art marks/.test(u.why)));
  ok("the templates are written with no marks, with their own category and colour",
    ids.slice(0, 5).every((id) => new RegExp(`KStampArtEntry\\("${id}", category: "[a-z]+", tint: 0x[0-9A-F]{8}, art: \\[\\], soft: \\[\\], xs: \\[\\]\\)`).test(r.swift)));
  ok("the header names them", ids.slice(0, 5).every((id) => r.swift.includes(`///   - ${id}: `)));
  ok("the other 31 stamps are untouched", r.read.length === 31 && r.marks.art === sourceMarks.art - [0, 1, 2, 3, 4].reduce((n, k) => n + art[ids[k]].art.length, 0));
  ok("a layer nobody knows is refused", buildSwift({ ...src, art: { ...art, [ids[5]]: { ...art[ids[5]], glow: [] } } }).unread.some((u) => u.id === ids[5]));
}

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
