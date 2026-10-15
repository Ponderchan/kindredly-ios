/* The stamp-art generator's lock (scripts/gen-stamp-art-swift.mjs). Not wired to a runner; run
   by hand from the repo root with plain node:
     node scripts/gen-stamp-art-swift.test.mjs

   It checks, in order: the sources read as the generator expects; every stamp round-trips into
   the committed KStampArtData.swift with the same number of paths, the same path data and the
   same paint; the committed file is what the generator writes today; the path-data reader's
   grammar, including what it must refuse; arcs land on their ellipse; and a stamp the generator
   can't read becomes a tinted tile without touching the others. */

import { readFileSync } from "node:fs";
import {
  OUT,
  arcToCurves,
  buildSwift,
  dashes,
  paint,
  parsePath,
  readSources,
  swiftPath,
  toArtPath,
} from "./gen-stamp-art-swift.mjs";

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
ok("every stamp has art in stamp-art.ts", stamps.every((s) => Array.isArray(art[`stamp-${s.id}`]) && art[`stamp-${s.id}`].length > 0));
ok("stamp-art.ts has no art for an unknown id", Object.keys(art).every((k) => stamps.some((s) => `stamp-${s.id}` === k)));
ok("StampTile's unknown-id colour is read", unknownTint.toUpperCase() === "#8B7FE8");
const sourceShapes = stamps.reduce((n, s) => n + art[`stamp-${s.id}`].length, 0);
ok(`the art has ${sourceShapes} shapes, none of them empty`, sourceShapes > 0 && stamps.every((s) => art[`stamp-${s.id}`].every((g) => g && (g.t !== "p" || g.d))));

/* ── the generator reads all of it ── */

const built = buildSwift(src);
ok("all 36 stamps read (no tinted tiles)", built.read.length === 36 && built.unread.length === 0);
if (built.unread.length) for (const u of built.unread) console.log(`     ${u.id}: ${u.why}`);
ok("every shape becomes one KArtPath", built.shapes === sourceShapes);
ok("nothing left out", built.ignored.length === 0);

/* ── the committed Swift round-trips every stamp ── */

const committed = readFileSync(OUT, "utf8");
ok("KStampArtData.swift is what the generator writes (run node scripts/gen-stamp-art-swift.mjs)", committed === built.swift);

// read the committed file back: entries and their KArtPath lines, in order
const ENTRY = /^ {4}KStampArtEntry\("([^"]+)", tint: (0x[0-9A-F]{8}), paths: (nil|\[)\),?$|^ {4}KStampArtEntry\("([^"]+)", tint: (0x[0-9A-F]{8}), paths: \[$/;
const PATH =
  /^ {6}KArtPath\(("(?:[^"\\]|\\.)*"), fill: (nil|0x[0-9A-F]{8})(?:, stroke: (0x[0-9A-F]{8}))?(?:, width: ([-0-9.e]+))?(?:, cap: \.(\w+))?(?:, join: \.(\w+))?(?:, dash: \[([^\]]*)\])?\),$/;
const back = new Map();
let current = null;
let stray = 0;
for (const line of committed.split("\n")) {
  const e = ENTRY.exec(line);
  if (e) {
    const id = e[1] ?? e[4];
    current = { id, tint: e[2] ?? e[5], paths: e[3] === "nil" ? null : [] };
    back.set(id, current);
    if (e[3] === "nil") current = null;
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
        dash: p[7] ? p[7].split(",").map(Number) : [],
      });
    continue;
  }
  if (/KArtPath\(|KStampArtEntry\(/.test(line)) stray++; // a line the patterns don't know
}
ok("every KArtPath line belongs to a stamp and reads back", stray === 0);
ok("the Swift lists the 36 stamps in stamps.ts order", [...back.keys()].join() === stamps.map((s) => s.id).join());
let countsMatch = true;
let dataMatch = true;
let paintMatch = true;
for (const st of stamps) {
  const source = art[`stamp-${st.id}`];
  const swift = back.get(st.id);
  if (!swift || !swift.paths || swift.paths.length !== source.length) {
    countsMatch = false;
    console.log(`     ${st.id}: ${source.length} shapes in stamp-art.ts, ${swift?.paths ? swift.paths.length : "no"} paths in Swift`);
    continue;
  }
  if (parseInt(swift.tint, 16) !== paint(st.color, "fill")) paintMatch = false;
  source.forEach((s, i) => {
    const w = swift.paths[i];
    if (w.d !== s.d) dataMatch = false;
    const same =
      w.fill === paint(s.f, "fill") &&
      w.stroke === paint(s.s, "stroke") &&
      w.width === (s.sw === undefined ? 1 : Number(s.sw)) &&
      w.cap === (s.lc ?? "butt") &&
      w.join === (s.lj ?? "miter") &&
      w.dash.join() === dashes(s.da).join();
    if (!same) {
      paintMatch = false;
      console.log(`     ${st.id} shape ${i + 1}: paint differs`);
    }
  });
}
ok("every stamp round-trips its path count", countsMatch);
ok("every path's data is copied verbatim", dataMatch);
ok("every fill, stroke, width, cap, join, dash and tint round-trips", paintMatch);
ok("the frames keep their perforation (36 dotted frames)", [...back.values()].filter((e) => e.paths?.[0]?.dash.join() === "0.5,5").length === 36);
ok("dashes elsewhere keep theirs (3 5)", [...back.values()].some((e) => e.paths?.some((p) => p.dash.join() === "3,5")));

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
  const half = arcToCurves(22, 38, 10, 10, 0, true, false, 42, 38); // guilty's face, first half
  ok("a half turn is two quarter curves ending on its end point", half.length === 2 && near(half[1].p[4], 42) && near(half[1].p[5], 38));
  ok("and it stays on its circle", onEllipse(22, 38, half, 32, 38, 10, 10, 1e-3));
  ok("sweep 0 from left to right passes below (y down: larger y)", half[0].p[5] > 38);
  const whole = parsePath("M32,13a13,17 0 1 0 .01,0"); // who-am-i: a whole ellipse from an almost-closed arc
  ok("an almost-closed arc is a whole ellipse in four curves", ops(whole) === "MCCCC");
  ok("and it stays on its ellipse", onEllipse(32, 13, whole.slice(1), 32.005, 30, 13, 17, 2e-3));
  ok("a corner arc (a6,6 0 0 1 -6,6) is one quarter curve", ops(parsePath("M10,0a6,6 0 0 1 -6,6")) === "MC");
  ok("an arc with a zero radius is a line", ops(parsePath("M0,0a0,5 0 0 1 10,0")) === "ML");
  ok("an arc to its own start draws nothing", ops(parsePath("M5,5a3,3 0 1 0 0,0")) === "M");
  const small = arcToCurves(0, 0, 1, 1, 0, false, true, 10, 0); // radius too small: scaled up to reach
  ok("a radius too small to reach is scaled up (a half circle of radius 5)", onEllipse(0, 0, small, 5, 0, 5, 5, 1e-3));
}

/* ── paint ── */

ok("#RRGGBB is opaque", paint("#5B3B8C", "fill") === 0x5b3b8cff);
ok("#RRGGBBAA keeps its alpha (the 1c tint)", paint("#5B3B8C1c", "fill") === 0x5b3b8c1c);
ok("#RGB doubles each digit", paint("#fa0", "stroke") === 0xffaa00ff);
ok("none is nil; a missing fill is black, a missing stroke none", paint("none", "fill") === null && paint(undefined, "fill") === 0x000000ff && paint(undefined, "stroke") === null);
ok("refuses rgb() and names", throws(() => paint("rgb(1,2,3)", "fill")) && throws(() => paint("red", "fill")));
ok("dash: an odd list repeats, zeros are none", dashes("3").join() === "3,3" && dashes("0 0").length === 0 && dashes("0.5 5").join() === "0.5,5" && dashes("1,2").join() === "1,2");
ok("dash: refuses a negative length", throws(() => dashes("1 -2")));
ok(
  "Swift: defaults left out, the rest written out",
  swiftPath(toArtPath({ t: "p", d: "M9,9h46v46H9Z", f: "#5B3B8C1c" })) === 'KArtPath("M9,9h46v46H9Z", fill: 0x5B3B8C1C)' &&
    swiftPath(toArtPath({ t: "p", d: "M0,0L1,1", f: "none", s: "#1E1B33", sw: "3.2", lc: "round", lj: "round", da: "3 5" })) ===
      'KArtPath("M0,0L1,1", fill: nil, stroke: 0x1E1B33FF, width: 3.2, cap: .round, join: .round, dash: [3, 5])',
);
ok(
  "circles, ellipses and rects become path data",
  ops(toArtPath({ t: "c", cx: "10", cy: "10", r: "5", f: "#000000" }).segments) === "MCCCCZ" &&
    ops(toArtPath({ t: "e", cx: "10", cy: "10", rx: "5", ry: "3", f: "#000000" }).segments) === "MCCCCZ" &&
    ops(toArtPath({ t: "r", x: "1", y: "1", w: "10", h: "6", f: "#000000" }).segments) === "MLLLZ" &&
    ops(toArtPath({ t: "r", x: "1", y: "1", w: "10", h: "6", rx: "2", f: "#000000" }).segments) === "MLCLCLCLCZ",
);

/* ── what can't be read becomes a tinted tile, alone ── */

{
  const ids = stamps.map((s) => s.id);
  const broken = structuredClone(art);
  broken[`stamp-${ids[0]}`][2].tf = "rotate(8 32 32)";
  broken[`stamp-${ids[1]}`][3].d = "M0,0L1"; // a missing number
  broken[`stamp-${ids[2]}`][1].f = "url(#g)";
  delete broken[`stamp-${ids[3]}`];
  broken[`stamp-${ids[4]}`][0].o = "0.5";
  const r = buildSwift({ ...src, art: broken });
  const unread = r.unread.map((u) => u.id);
  ok("a transform, bad path data, a non-hex paint, no art and an opacity each make a tile", unread.join() === ids.slice(0, 5).join());
  ok("each says why", r.unread.every((u) => /shape \d+ of \d+|no art/.test(u.why)));
  ok("the tiles are written as paths: nil, with their own colour", ids.slice(0, 5).every((id) => new RegExp(`KStampArtEntry\\("${id}", tint: 0x[0-9A-F]{8}, paths: nil\\)`).test(r.swift)));
  ok("the header names them", ids.slice(0, 5).every((id) => r.swift.includes(`///   - ${id}: `)));
  ok("the other 31 stamps are untouched", r.read.length === 31 && r.shapes === sourceShapes - [0, 1, 2, 3, 4].reduce((n, k) => n + art[`stamp-${ids[k]}`].length, 0));
  ok("an attribute nobody knows is refused, not dropped", throws(() => toArtPath({ t: "p", d: "M0,0", f: "#000000", filter: "blur" })));
}

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
