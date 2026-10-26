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
import { LAYERS, LAYERS_V3, OUT, arcToCurves, buildSwift, paint, parsePath, readElV3, readMark, readSources, swiftEl, swiftMark, tintOf } from "./gen-stamp-art-swift.mjs";

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
/* the 36 mood stamps have v2 drawings; the seasonal ones (2026-10-26, after v2 was retired) are v3
   only, so the v2 table writes them as the template, which nothing draws any more */
const SEASONAL = new Set(stamps.filter((s) => s.cat === "seasonal").map((s) => s.id));
const moods = stamps.filter((s) => !SEASONAL.has(s.id));
ok("stamps.ts lists 39 stamps: 36 mood stamps, then 3 seasonal", stamps.length === 39 && moods.length === 36 && stamps.slice(36).every((s) => SEASONAL.has(s.id)));
ok("in 6 categories of 6, and the seasonal one", cats.length === 7 && cats.filter((c) => c.id !== "seasonal").every((c) => stamps.filter((s) => s.cat === c.id).length === 6));
ok("every mood stamp has a drawing with art marks in stamp-art-v2.ts", moods.every((s) => Array.isArray(art[s.id]?.art) && art[s.id].art.length > 0));
ok("stamp-art-v2.ts has no drawing for an unknown id", Object.keys(art).every((k) => moods.some((s) => s.id === k)));
ok("every drawing has exactly the three layers", moods.every((s) => Object.keys(art[s.id]).sort().join() === "art,soft,xs"));
ok("the unknown-id colour is read from stamp-frame.ts", unknownTint.toUpperCase() === "#8B7FE8");
const count = (layer) => moods.reduce((n, s) => n + art[s.id][layer].length, 0);
const sourceMarks = { art: count("art"), soft: count("soft"), xs: count("xs") };
ok(`the drawings have ${sourceMarks.art} art, ${sourceMarks.soft} soft and ${sourceMarks.xs} xs marks`, sourceMarks.art > 0 && sourceMarks.xs > 0);
ok("every stamp has its XS cut", moods.every((s) => art[s.id].xs.length > 0));
ok("only soft marks are flagged dropAtS", moods.every((s) => ["art", "xs"].every((l) => art[s.id][l].every((m) => !m.dropAtS))));

/* ── the generator reads all of it ── */

const built = buildSwift(src);
ok("all 36 mood stamps read; the seasonal ones are v2 templates", built.read.length === 36 && built.unread.map((u) => u.id).join() === [...SEASONAL].join());
for (const u of built.unread) if (!SEASONAL.has(u.id)) console.log(`     ${u.id}: ${u.why}`);
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
ok("the Swift lists the 39 stamps in stamps.ts order (the seasonal ones as templates)", [...back.keys()].join() === stamps.map((s) => s.id).join() && [...SEASONAL].every((id) => back.get(id)?.template));
let countsMatch = true;
let dataMatch = true;
let metaMatch = true;
for (const st of moods) {
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
ok("the dropAtS flags all reach Swift", [...back.values()].reduce((n, e) => n + e.soft.filter((m) => m.dropAtS).length, 0) === moods.reduce((n, s) => n + art[s.id].soft.filter((m) => m.dropAtS).length, 0));

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

/* ── stamps v3 (owner, 2026-10-19): KStampArtData.v3 round-trips stamp-art-v3.ts ── */

{
  const v3 = src.v3;
  ok("stamp-art-v3.ts: 39 drawings, the four own layers each", stamps.every((s) => Object.keys(v3.art[s.id] ?? {}).join() === LAYERS_V3.join()));
  ok("stamps.ts gives every stamp a nameLight and a nameDark", stamps.every((s) => /^#[0-9A-F]{6}$/i.test(s.nameLight ?? "") && /^#[0-9A-F]{6}$/i.test(s.nameDark ?? "")));
  ok("all 39 v3 stamps read (none drawn as a bare frame)", built.v3.entries.every((e) => e.layers) && built.ignoredV3.length === 0);
  const vcount = (L) => stamps.reduce((n, s) => n + v3.art[s.id][L].length, 0);
  ok("every v3 element becomes one KStampEl", LAYERS_V3.every((L) => built.v3.counts[L] === vcount(L)));
  ok("the v3 frame path and frame layer are written", committed.includes(`static let v3FramePath = ${JSON.stringify(v3.framePath)}`) && committed.includes("static let v3Frame: [KStampEl] = [.p(v3FramePath, .tint, .tint, 14), .p(v3FramePath, .tint, .ink, 6)]"));
  ok("the ink role is 0x1E1B35FF, the tint mix 0.88, the fallback #8B7FE8", /static let v3Ink: UInt32 = 0x1E1B35FF/.test(committed) && /static let v3TintMix: CGFloat = 0\.88/.test(committed) && /static let v3FallbackHex: UInt32 = 0x8B7FE8FF/.test(committed));
  ok("the tint is mix(hex, white, 0.88) half up (never-told #9774F0 → #F3EEFD, the palette's)", tintOf("#9774F0") === 0xf3eefdff);
  ok("the six category colours and the seasonal one are written", cats.every((c) => committed.includes(`${JSON.stringify(c.id)}: 0x${c.color.slice(1).toUpperCase()}FF,`)));

  // read the committed v3 table back
  const V3ENTRY = /^ {4}KStampV3Entry\("([^"]+)", category: "([^"]+)", hex: (0x[0-9A-F]{8}), tint: (0x[0-9A-F]{8}), nameLight: (0x[0-9A-F]{8}), nameDark: (0x[0-9A-F]{8})(, rims: \[\], body: \[\], marks: \[\], face: \[\]\),|,)$/;
  const V3OPEN = /^ {6}(rims|body|marks|face): \[(\],?)?$/;
  const V3EL = /^ {8}(\.[pce]\(.*\)),$/;
  const back3 = new Map();
  let cur = null;
  let lay = null;
  let stray3 = 0;
  let inV3 = false;
  for (const line of committed.split("\n")) {
    if (/^ {2}static let v3: \[KStampV3Entry\] = \[$/.test(line)) { inV3 = true; continue; }
    if (inV3 && /^ {2}\]$/.test(line)) { inV3 = false; continue; }
    if (!inV3) continue;
    const e = V3ENTRY.exec(line);
    if (e) {
      cur = { id: e[1], cat: e[2], hex: e[3], tint: e[4], nameLight: e[5], nameDark: e[6], rims: [], body: [], marks: [], face: [] };
      back3.set(e[1], cur);
      lay = null;
      continue;
    }
    const o = V3OPEN.exec(line);
    if (o) { lay = o[2] ? null : o[1]; continue; }
    if (/^ {6}\],?$/.test(line)) { lay = null; continue; }
    const m = V3EL.exec(line);
    if (m) { if (!cur || !lay) stray3++; else cur[lay].push(m[1]); continue; }
    if (/^ {4}\),$/.test(line) || /^ {4}\/\/ ── /.test(line)) continue;
    stray3++;
  }
  ok("every line of the v3 table reads back", stray3 === 0);
  ok("the v3 table lists the 39 in stamps.ts order", [...back3.keys()].join() === stamps.map((s) => s.id).join());
  const hx = (c) => "0x" + c.slice(1).toUpperCase() + "FF";
  ok("every v3 entry carries its category, hex, tint, nameLight and nameDark", stamps.every((s) => {
    const b = back3.get(s.id);
    return b && b.cat === s.cat && b.hex === hx(s.color) && parseInt(b.tint, 16) === tintOf(s.color) && b.nameLight === hx(s.nameLight) && b.nameDark === hx(s.nameDark);
  }));
  let elMatch = true;
  for (const s of stamps) for (const L of LAYERS_V3) {
    const want = v3.art[s.id][L].map((e) => swiftEl(readElV3(e)));
    const got = back3.get(s.id)?.[L] ?? [];
    if (want.join("\n") !== got.join("\n")) { elMatch = false; console.log(`     ${s.id} ${L}: differs`); }
  }
  ok("every v3 element's geometry, roles and width are copied verbatim, in order", elMatch);

  ok("an element: path / circle / ellipse as .p / .c / .e with its roles and width",
    swiftEl(readElV3({ el: "path", d: "M0,0L1,1", fill: "none", stroke: "ink", width: 6, cap: "round", join: "round" })) === '.p("M0,0L1,1", .none, .ink, 6)' &&
      swiftEl(readElV3({ el: "circle", cx: 40.4, cy: 42.4, r: 10.7, fill: "ink", stroke: "none" })) === ".c(40.4, 42.4, 10.7, .ink, .none, 0)" &&
      swiftEl(readElV3({ el: "ellipse", cx: 1, cy: 2, rx: 3, ry: 4, fill: "tint", stroke: "none" })) === ".e(1, 2, 3, 4, .tint, .none, 0)");
  ok("refuses paint that isn't a role (a hex literal)", throws(() => readElV3({ el: "path", d: "M0,0Z", fill: "#FFFFFF", stroke: "none" })));
  ok("refuses a stroke with no width, or not round", throws(() => readElV3({ el: "path", d: "M0,0L1,1", fill: "none", stroke: "ink" })) && throws(() => readElV3({ el: "path", d: "M0,0L1,1", fill: "none", stroke: "ink", width: 6, cap: "butt", join: "round" })));
  ok("refuses an unknown kind or key, and path data the reader would cut short",
    throws(() => readElV3({ el: "rect", fill: "hex", stroke: "none" })) && throws(() => readElV3({ el: "circle", cx: 1, cy: 1, r: 1, fill: "hex", stroke: "none", opacity: 1 })) && throws(() => readElV3({ el: "path", d: "M0,0L1", fill: "hex", stroke: "none" })));
  {
    const ids = stamps.map((s) => s.id);
    const broken = structuredClone(v3.art);
    broken[ids[0]].body[0].fill = "#123456";
    delete broken[ids[1]];
    const r = buildSwift({ ...src, v3: { ...v3, art: broken } });
    const bad = r.v3.entries.filter((e) => !e.layers).map((e) => e.id);
    ok("a v3 stamp that can't be read is written with empty layers (its frame alone), named, the rest untouched",
      bad.join() === ids.slice(0, 2).join() && ids.slice(0, 2).every((id) => new RegExp(`KStampV3Entry\\("${id}", [^\n]*, rims: \\[\\], body: \\[\\], marks: \\[\\], face: \\[\\]\\),`).test(r.swift)) && r.v3.entries.filter((e) => e.layers).length === stamps.length - 2);
  }
  {
    const r = buildSwift({ ...src, art: null });
    ok("without stamp-art-v2.ts the v2 table is left out and the v3 one stays", !r.swift.includes("static let stamps: [KStampArtEntry]") && r.swift.includes("static let v3: [KStampV3Entry] = [") && /\n\}\n$/.test(r.swift));
  }
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
  const unread = r.unread.map((u) => u.id).filter((id) => !SEASONAL.has(id));
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
