// node scripts/gen-pen-vectors.mjs           write design/identity/pen-signature.v1.vectors.json (refuses to overwrite)
// node scripts/gen-pen-vectors.mjs --force   overwrite it (a deliberate PEN v2 only)
//
// THE SHARED VECTORS FOR PEN v1 (identity Phase 2), WRITTEN ONCE. The drawn pen name travels as
// strokes in a 1000×320 box (src/lib/pen-signature.ts ↔ web app/engine/pen-signature.js, and the
// server's check in web migration 0035 private.pen_sig_ok). This file is what both apps' tests
// must reproduce exactly, so a signature drawn on a phone is the same signature on the web:
//   validate  values and the first rule each breaks (or ok) — the same order as the SQL
//   normalise pad strokes in pad points → the box
//   simplify  oversized drawings (a 3,000-point spiral, 2,400 jittery points, 40 strokes) → the caps
//   paths     penPath of a dot, a line and a curve
//   viewBox   penViewBox, the whole box and cropped to the ink at an aspect
//   plan      penDrawPlan of a demo drawing in 1400 ms and in 600 ms
//   demo      penDemo for the dev pages' names
//   faces     penFaceOrNull: library ids in, anything else out (the SQL's private.pen_face)
//   upright   penTypedUpright for names in several scripts
// Made from the app's TypeScript as it stands, ONCE: after that it is the contract. Its sha256 is
// locked in both suites, so regenerating it quietly fails a test; a real change runs this with
// --force and re-locks both.
//
// Plain node: the TS is loaded with Node's own type stripping.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../design/identity");
const FORCE = process.argv.includes("--force");
const P = await import(pathToFileURL(resolve(HERE, "../src/lib/pen-signature.ts")).href);

const sig = (s) => ({ v: 1, w: 1000, h: 320, s });
const many = (n, stroke) => Array.from({ length: n }, () => stroke.slice());

/* ── validate ── */
const validateValues = [
  ["the smallest line", sig([[0, 0, 1000, 320]])],
  ["a dot", sig([[500, 160]])],
  ["32 strokes", sig(many(32, [10, 10, 20, 20]))],
  ["1200 points", sig([Array.from({ length: 2400 }, (_, i) => (i % 2 === 0 ? i % 1000 : i % 320))])],
  ["not an object (string)", "pen"],
  ["not an object (null)", null],
  ["not an object (array)", [[0, 0]]],
  ["a fifth key", { v: 1, w: 1000, h: 320, s: [[1, 2]], x: 0 }],
  ["no strokes key", { v: 1, w: 1000, h: 320, t: [[1, 2]] }],
  ["v 2", { v: 2, w: 1000, h: 320, s: [[1, 2]] }],
  ["w 999", { v: 1, w: 999, h: 320, s: [[1, 2]] }],
  ["h as a string", { v: 1, w: 1000, h: "320", s: [[1, 2]] }],
  ["no stroke", sig([])],
  ["33 strokes", sig(many(33, [10, 10, 20, 20]))],
  ["strokes not a list", { v: 1, w: 1000, h: 320, s: { 0: [1, 2] } }],
  ["an empty stroke", sig([[]])],
  ["an odd stroke", sig([[0, 0, 1]])],
  ["a stroke not a list", sig([5])],
  ["1201 points", sig([Array.from({ length: 2402 }, (_, i) => (i % 2 === 0 ? i % 1000 : i % 320))])],
  ["x past 1000", sig([[0, 0, 1001, 320]])],
  ["y past 320", sig([[0, 321]])],
  ["a negative", sig([[-1, 0]])],
  ["not an integer", sig([[0, 0, 10.5, 3]])],
  ["a number as a string", sig([["5", 5]])],
  ["a boolean", sig([[true, 5]])],
];
const validate = validateValues.map(([name, value]) => ({ name, value, verdict: P.validatePen(value) }));

/* ── normalise ── */
const normaliseCases = [
  { name: "a pad at the box's aspect, corner to corner", strokes: [[{ x: 0, y: 0 }, { x: 343, y: 109.76 }]], pad: { width: 343, height: 109.76 } },
  { name: "a taller pad: centred across", strokes: [[{ x: 0, y: 0 }, { x: 300, y: 150 }]], pad: { width: 300, height: 150 } },
  { name: "a wider pad: centred down", strokes: [[{ x: 0, y: 0 }, { x: 400, y: 100 }]], pad: { width: 400, height: 100 } },
  { name: "repeats and outside points", strokes: [[{ x: 10, y: 10 }, { x: 10, y: 10 }, { x: 10.2, y: 10.1 }, { x: -50, y: 500 }, { x: 20, y: 30 }]], pad: { width: 343, height: 110 } },
  { name: "an empty stroke and a dot", strokes: [[], [{ x: 171.5, y: 55 }]], pad: { width: 343, height: 110 } },
  { name: "no ink", strokes: [[], []], pad: { width: 343, height: 110 } },
  { name: "no size", strokes: [[{ x: 1, y: 1 }]], pad: { width: 0, height: 110 } },
];
const normalise = normaliseCases.map((c) => ({ ...c, out: P.normalisePen(c.strokes, c.pad) }));

/* ── simplify ── (pad strokes are kept flat here, [x, y, x, y, …] in pad points, to keep the file small;
   the tests turn each into PadPoint objects before calling penFromPad) */
const r2 = (v) => Math.round(v * 100) / 100;
const spiral = [];
for (let i = 0; i < 3000; i++) {
  const t = i / 30;
  spiral.push(r2(171 + Math.cos(t) * t * 1.6), r2(55 + Math.sin(t) * t * 0.5));
}
// a wave under a finger's jitter: 2,400 points that tolerance 1 can't bring under 1200, so the
// tolerance climbs until the jitter goes and the wave stays
const jitter = [];
for (let i = 0; i < 2400; i++) {
  const x = (i / 2400) * 343;
  jitter.push(r2(x), r2(55 + 20 * Math.sin(x / 10) + (i % 2 ? 1.6 : -1.6)));
}
const forty = Array.from({ length: 40 }, (_, i) => [5 + i * 8, 20, 5 + i * 8 + (i % 5), 20 + (i % 7) * 10, 5 + i * 8 + 3, 90]);
const simplifyCases = [
  { name: "a 3,000-point spiral", strokes: [spiral], pad: { width: 343, height: 110 } },
  { name: "2,400 jittery points: the tolerance climbs", strokes: [jitter], pad: { width: 343, height: 110 } },
  { name: "40 strokes: the 32 longest kept, in order", strokes: forty, pad: { width: 343, height: 110 } },
];
const toPad = (flat) => {
  const pts = [];
  for (let i = 0; i + 1 < flat.length; i += 2) pts.push({ x: flat[i], y: flat[i + 1] });
  return pts;
};
const simplify = simplifyCases.map((c) => ({ ...c, out: P.penFromPad(c.strokes.map(toPad), c.pad) }));
const simplifyRaw = [
  { name: "box units with fractions and a point outside", in: sig([[0.4, 0.6, 500.5, 160.4, 1200, -5]]) },
];
const simplifyDirect = simplifyRaw.map((c) => ({ ...c, out: P.simplifyPen(c.in) }));

/* ── paths, viewBox, plan, demo, upright ── */
const demoNames = ["Mira", "Juno", "Tamsin", "Ren", "Sunday Kite", "雨のランタン", ""];
const demo = demoNames.map((seed) => ({ seed, sig: P.penDemo(seed) }));
const curve = sig([[100, 200, 150, 120, 220, 210, 300, 130, 380, 220]]);
const paths = [
  { name: "a dot", sig: sig([[500, 160]]), d: P.penPath(sig([[500, 160]])) },
  { name: "a line", sig: sig([[0, 0, 1000, 320]]), d: P.penPath(sig([[0, 0, 1000, 320]])) },
  { name: "a curve", sig: curve, d: P.penPath(curve) },
  { name: "a demo", sig: demo[0].sig, d: P.penPath(demo[0].sig) },
  { name: "not PEN v1", sig: { v: 2 }, d: P.penPath({ v: 2 }) },
];
const viewBox = [
  { name: "the box", sig: curve, fit: "box", opts: {}, out: P.penViewBox(curve, "box") },
  { name: "the ink", sig: curve, fit: "ink", opts: {}, out: P.penViewBox(curve, "ink") },
  { name: "the ink at 3:1", sig: curve, fit: "ink", opts: { aspect: 3 }, out: P.penViewBox(curve, "ink", { aspect: 3 }) },
  { name: "the ink at 1:1, margin 10", sig: curve, fit: "ink", opts: { aspect: 1, margin: 10 }, out: P.penViewBox(curve, "ink", { aspect: 1, margin: 10 }) },
  { name: "not PEN v1", sig: null, fit: "ink", opts: {}, out: P.penViewBox(null, "ink") },
];
const plan = [
  { name: "a demo in 1400 ms", sig: demo[0].sig, totalMs: 1400, opts: {}, steps: P.penDrawPlan(demo[0].sig, 1400) },
  { name: "a demo in 600 ms, gap 40", sig: demo[1].sig, totalMs: 600, opts: { gapMs: 40 }, steps: P.penDrawPlan(demo[1].sig, 600, { gapMs: 40 }) },
  { name: "too short: every stroke at its floor", sig: demo[2].sig, totalMs: 100, opts: {}, steps: P.penDrawPlan(demo[2].sig, 100) },
  { name: "not PEN v1", sig: "x", totalMs: 1000, opts: {}, steps: P.penDrawPlan("x", 1000) },
];
const faces = ["m-anchor", "f-02-tender-thinker", "f-81-space-buns", "m-deep-water", "", "M-anchor", "x-anchor", "m-", "m--anchor", "m-anchor-", "file:///var/mobile/photo.jpg", "m-" + "a".repeat(46), "m-" + "a".repeat(47), null, 7].map((id) => ({ id, out: P.penFaceOrNull(id) }));
const upright = ["Mira", "ミラ", "雨のランタン", "민지", "陈", "Zoë", "Ana María", ""].map((name) => ({ name, upright: P.penTypedUpright(name) }));

const vectors = {
  v: 1,
  about:
    "PEN v1 (kindredly-ios src/lib/pen-signature.ts, web app/engine/pen-signature.js; the server's check is web migration 0035 private.pen_sig_ok). Written once by scripts/gen-pen-vectors.mjs; both test suites must reproduce every case exactly and lock this file's sha256.",
  caps: { w: P.PEN_W, h: P.PEN_H, strokes: P.PEN_MAX_STROKES, points: P.PEN_MAX_POINTS, bytes: P.PEN_MAX_BYTES, baseline: P.PEN_BASELINE, tolerances: P.PEN_TOLERANCES },
  validate,
  normalise,
  simplify,
  simplifyDirect,
  paths,
  viewBox,
  plan,
  demo,
  faces,
  upright,
};

mkdirSync(OUT, { recursive: true });
const path = resolve(OUT, "pen-signature.v1.vectors.json");
if (existsSync(path) && !FORCE) {
  console.log(`kept        ${path} (exists; --force to overwrite)`);
} else {
  // one case per line: readable, and a fraction of the size of an indented file
  const text =
    "{\n" +
    Object.entries(vectors)
      .map(([k, v]) => (Array.isArray(v) ? ` ${JSON.stringify(k)}: [\n${v.map((c) => "  " + JSON.stringify(c)).join(",\n")}\n ]` : ` ${JSON.stringify(k)}: ${JSON.stringify(v)}`))
      .join(",\n") +
    "\n}\n";
  writeFileSync(path, text);
  console.log(`wrote       ${path}  sha256 ${createHash("sha256").update(text).digest("hex")}`);
}
