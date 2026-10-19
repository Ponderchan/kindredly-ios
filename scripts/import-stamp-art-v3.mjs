// node scripts/import-stamp-art-v3.mjs            read the 36 v3 SVGs, write src/data/stamp-art-v3.ts and
//                                                 design/stamps-v3/golden.json
// node scripts/import-stamp-art-v3.mjs --check    exit 1 if either file is out of date with the SVGs
// node scripts/import-stamp-art-v3.mjs --web "<web repo>/app/engine/stamp-art-v3.js"
//                                                 also write the web's copy (an ES module, the same data)
// node scripts/import-stamp-art-v3.mjs --check --web "<path>"   exit 1 if any of the three is stale
//
// THE STAMPS v3 IMPORTER (B "character", the owner's pick of 2026-10-19; the bright palette, option 1).
// The contract for the renderers is .claude/stamp-design/v3/INTEGRATION.md.
//
// WHAT IT READS
//   .claude/stamp-design/v3/final/svg/<id>.svg  the kit's output (kit/build.mjs, checked 36/36 by
//       kit/check.mjs): 100 × 120, five layers <g id="frame|rims|body|marks|face"> in that order,
//       plain path / circle (ellipse, line, polyline, polygon and rect are read too), every paint one
//       of three colours: the stamp's hex, ink #1E1B35, tint = mix(hex, white, 0.88);
//   src/data/stamps.ts   the 36 ids in order, each stamp's `color` (the hex), nameLight, nameDark;
//   src/lib/stamp-frame.ts   STAMP_V3_FRAME_D, the frame path every SVG's frame layer must use;
//   the kit itself (kit/lib.mjs tierSVG, kit/data.mjs = palette.json) for the golden file only.
//
// WHAT IT WRITES
//   src/data/stamp-art-v3.ts   STAMP_ART_V3: per id the five layers as element lists, each element
//       { el: "path", d } | { el: "circle", cx, cy, r } | { el: "ellipse", cx, cy, rx, ry } with
//       fill and stroke as colour ROLES ("hex" | "ink" | "tint" | "none") and, when stroked, its
//       width (box units), cap and join. No hex literal anywhere: the renderers resolve the roles
//       at runtime from stamps.ts (lib/stamp-frame stampDrawListV3, Swift's KStampArtData entry).
//       The frame layer is the same in all 36, so it is written once (STAMP_V3_FRAME) and shared.
//   design/stamps-v3/golden.json   for every id × tier (xs, s, l) the element list drawn, with
//       LITERAL colours as the SVG has them, cut by the kit's own tierSVG — independent of the
//       app's role mapping and tier code, so RN (src/lib/stamp-v3.test.ts), the web and Swift
//       (scripts/stamp-frame-golden.swift) each prove they draw exactly what the kit drew.
//   --web <path>   the same STAMP_ART_V3 as a plain ES module with the shape in JSDoc.
//
// WHAT IT REFUSES (the stamp is left out of STAMP_ART_V3, so the renderers draw its frame alone,
// and the run exits 1): a root or viewBox that is not the kit's, the five layers missing or out of
// order, anything outside them, a transform, opacity, dash, gradient, clip, mask, filter, text,
// image or use, an attribute the kit never writes, a colour that is not this stamp's hex / ink /
// tint (a hex that differs from stamps.ts means the kit and the app disagree: rebuild the kit or
// fix stamps.ts), a stroke without a width or not round/round, an element with no fill (SVG would
// paint it black), path data the device's reader can't read (scripts/art-path.mjs parsePath, the
// grammar of Swift's KSVGPath), a frame layer that is not STAMP_V3_FRAME_D in tint/tint 14 and
// tint/ink 6. A missing SVG is reported and left out (exit 1).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PATH_CHARS, parsePath } from "./art-path.mjs";

export const SRC = new URL("../.claude/stamp-design/v3/final/svg/", import.meta.url);
export const KIT = new URL("../.claude/stamp-design/v3/final/kit/", import.meta.url);
export const STAMPS = new URL("../src/data/stamps.ts", import.meta.url);
export const FRAME = new URL("../src/lib/stamp-frame.ts", import.meta.url);
export const OUT = new URL("../src/data/stamp-art-v3.ts", import.meta.url);
export const GOLDEN = new URL("../design/stamps-v3/golden.json", import.meta.url);

export const INK = "#1E1B35";
export const TINT_MIX = 0.88;
export const LAYERS = Object.freeze(["frame", "rims", "body", "marks", "face"]);
const ROOT = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="120" viewBox="0 0 100 120">';
const TAGS = new Set(["path", "circle", "ellipse", "line", "polyline", "polygon", "rect"]);
const PAINT = ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"];
const GEOM = { path: ["d"], circle: ["cx", "cy", "r"], ellipse: ["cx", "cy", "rx", "ry"], line: ["x1", "y1", "x2", "y2"], polyline: ["points"], polygon: ["points"], rect: ["x", "y", "width", "height"] };

/* ── colour ─────────────────────────────────────────────────────────────── */

/** mix(a, b, t) per channel, half up, "#RRGGBB" in capitals (lib/stamp-frame mixHex, the kit's mix) */
export function mixHex(a, b, t) {
  const rgb = (h) => [0, 2, 4].map((i) => parseInt(h.replace("#", "").slice(i, i + 2), 16));
  const A = rgb(a), B = rgb(b);
  return "#" + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).toUpperCase().padStart(2, "0")).join("");
}
export const tintOf = (hex) => mixHex(hex, "#FFFFFF", TINT_MIX);

/* ── the sources ────────────────────────────────────────────────────────── */

/** { stamps: [{ id, cat, color, nameLight, nameDark }] in stamps.ts order, cats: [{ id, color }] } */
export function readStamps(text) {
  const block = (name) => {
    const s = text.indexOf(`export const ${name}`);
    const e = s < 0 ? -1 : text.indexOf("\n];", s);
    if (s < 0 || e < 0) throw new Error(`stamps.ts: no ${name} array`);
    return text.slice(s, e);
  };
  const cats = [...block("STAMP_CATEGORIES").matchAll(/\{ id: "([^"]+)", emoji: "[^"]*", color: "(#[0-9A-Fa-f]{6})"/g)].map(([, id, color]) => ({ id, color: color.toUpperCase() }));
  const stamps = [...block("STAMPS").matchAll(/\{ id: "([\w-]+)", cat: "(\w+)", emoji: "[^"]*", color: "(#[0-9A-Fa-f]{6})", nameLight: "(#[0-9A-Fa-f]{6})", nameDark: "(#[0-9A-Fa-f]{6})"/g)].map(
    ([, id, cat, color, nameLight, nameDark]) => ({ id, cat, color: color.toUpperCase(), nameLight: nameLight.toUpperCase(), nameDark: nameDark.toUpperCase() }),
  );
  if (stamps.length !== 36) throw new Error(`stamps.ts: read ${stamps.length} stamps with color, nameLight and nameDark, expected 36`);
  if (new Set(stamps.map((s) => s.id)).size !== 36) throw new Error("stamps.ts: a stamp id is listed twice");
  return { stamps, cats };
}

/** STAMP_V3_FRAME_D from lib/stamp-frame.ts */
export function readFrameD(text) {
  const m = /export const STAMP_V3_FRAME_D =\s*"([^"]+)";/.exec(text);
  if (!m) throw new Error('stamp-frame.ts: no `export const STAMP_V3_FRAME_D = "…";`');
  return m[1];
}

/* ── one SVG ────────────────────────────────────────────────────────────── */

const num = (v, what) => {
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(String(v))) throw new Error(`${what}="${v}" is not a plain number`);
  return Number(v);
};
const attrsOf = (s) => {
  const a = {};
  for (const m of s.matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) {
    if (m[1] in a) throw new Error(`attribute ${m[1]} given twice`);
    a[m[1]] = m[2];
  }
  const rest = s.replace(/([a-zA-Z:-]+)="([^"]*)"/g, "").replace(/[\s/]/g, "");
  if (rest) throw new Error(`markup the importer can't read: "${rest.slice(0, 30)}"`);
  return a;
};
const pts = (v) => {
  const n = String(v).trim().split(/[\s,]+/).map((x) => num(x, "points"));
  if (n.length < 4 || n.length % 2) throw new Error("points: an odd or short list");
  const out = [];
  for (let i = 0; i < n.length; i += 2) out.push(`${n[i]},${n[i + 1]}`);
  return out;
};

/**
 * The layers of one SVG as written by the kit: { frame: [{ tag, a }], …, face }, in order. Throws
 * for anything that isn't the kit's plain SVG. `literal` elements keep their attributes as written.
 */
export function readLayers(raw) {
  const s = raw.replace(/<!--[\s\S]*?-->/g, "").trim();
  if (!s.startsWith(ROOT)) throw new Error("root must be exactly " + ROOT);
  if (!s.endsWith("</svg>")) throw new Error("the file doesn't end with </svg>");
  const body = s.slice(ROOT.length, -"</svg>".length);
  const forb = body.match(/transform|filter|mask|gradient|opacity|clip|dasharray|<text|<image|<use|<defs|<style|style=|class=|href/i);
  if (forb) throw new Error("forbidden: " + forb[0]);
  const groups = [...body.matchAll(/<g id="([a-z]+)"(?:\s*\/>|>([\s\S]*?)<\/g>)/g)];
  const order = groups.map((g) => g[1]);
  if (order.join() !== LAYERS.join()) throw new Error(`layers must be ${LAYERS.join(" > ")} (found ${order.join(" > ") || "none"})`);
  const outside = body.replace(/<g id="[a-z]+"(?:\s*\/>|>[\s\S]*?<\/g>)/g, "").trim();
  if (outside) throw new Error("markup outside the five layers");
  const layers = {};
  for (const [, id, inner = ""] of groups) {
    const els = [];
    const left = inner.replace(/<([a-zA-Z]+)\s([^>]*?)\/>/g, (m, tag, at) => {
      if (!TAGS.has(tag)) throw new Error(`${id}: <${tag}> is not a plain shape`);
      const a = attrsOf(at);
      for (const k of Object.keys(a)) if (!PAINT.includes(k) && !GEOM[tag].includes(k)) throw new Error(`${id}: <${tag}> ${k}="…" is not an attribute the kit writes`);
      els.push({ tag, a });
      return "";
    });
    if (left.trim()) throw new Error(`${id}: markup that is not a self-closed shape ("${left.trim().slice(0, 30)}")`);
    layers[id] = els;
  }
  return layers;
}

/** a shape as { el, geometry } (line / polyline / polygon / rect become path data) */
function geometry(tag, a) {
  if (tag === "path") {
    if (!PATH_CHARS.test(a.d || "")) throw new Error(`path data with characters SVG doesn't allow ("${String(a.d).slice(0, 30)}")`);
    parsePath(a.d); // throws where Swift's KSVGPath would stop short
    return { el: "path", d: a.d };
  }
  if (tag === "circle") return { el: "circle", cx: num(a.cx, "cx"), cy: num(a.cy, "cy"), r: num(a.r, "r") };
  if (tag === "ellipse") return { el: "ellipse", cx: num(a.cx, "cx"), cy: num(a.cy, "cy"), rx: num(a.rx, "rx"), ry: num(a.ry, "ry") };
  if (tag === "line") return { el: "path", d: `M${num(a.x1, "x1")},${num(a.y1, "y1")}L${num(a.x2, "x2")},${num(a.y2, "y2")}` };
  if (tag === "polyline" || tag === "polygon") {
    const p = pts(a.points);
    return { el: "path", d: "M" + p[0] + p.slice(1).map((q) => "L" + q).join("") + (tag === "polygon" ? "Z" : "") };
  }
  const x = num(a.x ?? 0, "x"), y = num(a.y ?? 0, "y"), w = num(a.width, "width"), h = num(a.height, "height");
  return { el: "path", d: `M${x},${y}L${x + w},${y}L${x + w},${y + h}L${x},${y + h}Z` };
}

/** the paint of an element: { fill, stroke, width?, cap?, join? } through `colour` (role or literal) */
function paint(a, colour) {
  if (a.fill === undefined) throw new Error("an element with no fill (SVG would paint it black)");
  const fill = colour(a.fill);
  const stroke = a.stroke === undefined ? colour("none") : colour(a.stroke);
  const stroked = a.stroke !== undefined && a.stroke.toLowerCase() !== "none";
  if (!stroked) {
    if (a["stroke-width"] !== undefined) throw new Error("a stroke width with no stroke");
    return { fill, stroke };
  }
  if (a["stroke-width"] === undefined) throw new Error("a stroke without a stroke-width");
  const width = num(a["stroke-width"], "stroke-width");
  if (!(width > 0)) throw new Error("a stroke width that isn't positive");
  if (a["stroke-linecap"] !== "round" || a["stroke-linejoin"] !== "round") throw new Error("a stroke that isn't round-capped and round-joined");
  return { fill, stroke, width, cap: "round", join: "round" };
}

/**
 * One stamp: { art: { frame, rims, body, marks, face } } with colour ROLES, checked against its
 * stamps.ts hex and the shared frame path. Throws, saying why, for anything a renderer couldn't
 * draw exactly.
 */
export function importStamp(raw, hex, frameD) {
  const H = hex.toUpperCase(), T = tintOf(H);
  const used = new Set();
  const role = (c) => {
    const u = String(c).trim().toUpperCase();
    if (u === "NONE") return "none";
    const r = u === H ? "hex" : u === INK ? "ink" : u === T ? "tint" : null;
    if (!r) {
      if (/^#[0-9A-F]{6}$/.test(u)) throw new Error(`colour ${u} is not this stamp's hex ${H}, ink ${INK} or tint ${T} (the kit and stamps.ts disagree: rebuild the kit or fix stamps.ts)`);
      throw new Error(`colour "${c}" is not #RRGGBB or none`);
    }
    used.add(r);
    return r;
  };
  const layers = readLayers(raw);
  const art = {};
  for (const L of LAYERS) {
    art[L] = layers[L].map(({ tag, a }, i) => {
      try {
        return { ...geometry(tag, a), ...paint(a, role) };
      } catch (e) {
        throw new Error(`${L} element ${i + 1}: ${e.message}`);
      }
    });
  }
  for (const r of ["hex", "ink", "tint"]) if (!used.has(r)) throw new Error(`the ${r} colour is never used (is ${H} this stamp's hex?)`);
  const f = art.frame;
  const frameOk = f.length === 2 && f.every((e) => e.el === "path" && e.d === frameD) &&
    f[0].fill === "tint" && f[0].stroke === "tint" && f[0].width === 14 && f[1].fill === "tint" && f[1].stroke === "ink" && f[1].width === 6;
  if (!frameOk) throw new Error("the frame layer is not STAMP_V3_FRAME_D as tint rim 14 + tint/ink keyline 6 (lib/stamp-frame.ts)");
  if (!art.body.some((e) => e.fill === "hex")) throw new Error("no hex body");
  return art;
}

/* ── the whole set ──────────────────────────────────────────────────────── */

/** Imports every stamp in stamps.ts order: { stamps, cats, frameD, art: { id: layers }, missing, rejected } */
export function importAll({ srcDir = SRC } = {}) {
  const { stamps, cats } = readStamps(readFileSync(STAMPS, "utf8"));
  const frameD = readFrameD(readFileSync(FRAME, "utf8"));
  const art = {}, missing = [], rejected = [], raws = {};
  for (const st of stamps) {
    const file = new URL(st.id + ".svg", srcDir);
    if (!existsSync(file)) {
      missing.push(st.id);
      continue;
    }
    const raw = readFileSync(file, "utf8");
    try {
      art[st.id] = importStamp(raw, st.color, frameD);
      raws[st.id] = raw;
    } catch (e) {
      rejected.push({ id: st.id, why: e.message });
    }
  }
  return { stamps, cats, frameD, art, missing, rejected, raws };
}

const json = (o) => JSON.stringify(o);
const FRAME_ELS = (dRef) => [
  `{ el: "path", d: ${dRef}, fill: "tint", stroke: "tint", width: 14, cap: "round", join: "round" }`,
  `{ el: "path", d: ${dRef}, fill: "tint", stroke: "ink", width: 6, cap: "round", join: "round" }`,
];
const stampLine = (id, a) => `  ${json(id)}: ${json({ rims: a.rims, body: a.body, marks: a.marks, face: a.face })},`;
const count = (r) => {
  const ids = Object.keys(r.art);
  const n = (L) => ids.reduce((k, id) => k + r.art[id][L].length, 0);
  return { ids, rims: n("rims"), body: n("body"), marks: n("marks"), face: n("face") };
};

function header(r, kind) {
  const c = count(r);
  const left = [...r.missing.map((id) => `${id} (no svg)`), ...r.rejected.map((x) => `${x.id} (${x.why})`)];
  return `/* AUTO-GENERATED from .claude/stamp-design/v3/final/svg by scripts/import-stamp-art-v3.mjs — do not edit.
   After the kit is rebuilt (or a stamp's colour changes in src/data/stamps.ts), run:
     node scripts/import-stamp-art-v3.mjs --web "<web repo>/app/engine/stamp-art-v3.js"
   The contract: .claude/stamp-design/v3/INTEGRATION.md.

   Stamps v3 · B "character" (owner, 2026-10-19), the bright palette. Each stamp is five layers on the
   100 × 120 box, drawn in this order: frame (the perforated paper and its ink keyline; the same for
   all 36: STAMP_V3_FRAME), rims (the tint die-cut rim of every body and line), body (ink edges,
   the hex and tint fills, ink lines), marks (tint marks on the body), face (the two ink eye rings
   first, then eye discs, pupils, lids, the mouth). Paint is a ROLE, resolved per stamp at runtime:
     hex  = the stamp's colour (src/data/stamps.ts \`color\`)    ink = #1E1B35 (never theme-swapped)
     tint = mix(hex, #FFFFFF, 0.88), half up                     none = not painted
   A stroked element carries its width in box units (it scales with the stamp) and is round-capped
   and round-joined. Which layers a width keeps: ${kind === "ts" ? "lib/stamp-frame stampLayersFor" : "engine/stamp-frame (the port of lib/stamp-frame stampLayersFor)"}
   (< 15 dot, 15–24 frame rims body, 25–39 + face, ≥ 40 all five). An id with no entry here is drawn
   as STAMP_V3_FRAME alone in its colour.

   Imported: ${c.ids.length} of 36 (${c.rims} rim, ${c.body} body, ${c.marks} mark and ${c.face} face elements).
   Left out: ${left.length ? left.join("; ") : "none"}. */
`;
}

/** src/data/stamp-art-v3.ts */
export function buildTs(r) {
  const ids = r.stamps.map((s) => s.id);
  const L = [header(r, "ts")];
  L.push(`export type StampRole = "hex" | "ink" | "tint" | "none";
export type StampLayer = "frame" | "rims" | "body" | "marks" | "face";

type StampPaint = {
  fill: StampRole;
  stroke: StampRole;
  /** stroke width in box units; present when stroke isn't "none" */
  width?: number;
  cap?: "round";
  join?: "round";
};
/** one element on the 100 × 120 box */
export type StampEl =
  | ({ el: "path"; d: string } & StampPaint)
  | ({ el: "circle"; cx: number; cy: number; r: number } & StampPaint)
  | ({ el: "ellipse"; cx: number; cy: number; rx: number; ry: number } & StampPaint);
/** a stamp: its five layers, bottom to top */
export type StampArtV3 = { readonly [K in StampLayer]: readonly StampEl[] };

export type StampArtV3Id =
${ids.map((id) => `  | ${json(id)}`).join("\n")};

/** the frame path, the same in all 36 (= lib/stamp-frame STAMP_V3_FRAME_D) */
export const STAMP_V3_FRAME_PATH = ${json(r.frameD)};
/** the frame layer, the same in all 36: the tint rim (14u) under the keyline (tint fill, ink 6u) */
export const STAMP_V3_FRAME: readonly StampEl[] = [
  ${FRAME_ELS("STAMP_V3_FRAME_PATH").join(",\n  ")},
];

/** per id: rims, body, marks, face (the frame is STAMP_V3_FRAME) */
const ART: { readonly [K in StampArtV3Id]?: Omit<StampArtV3, "frame"> } = {
${ids.filter((id) => r.art[id]).map((id) => stampLine(id, r.art[id])).join("\n")}
};

/** the 36 v3 drawings by stamp id (letters.stamp), each with its five layers */
export const STAMP_ART_V3: { readonly [K in StampArtV3Id]?: StampArtV3 } = Object.fromEntries(
  Object.entries(ART).map(([id, a]) => [id, { frame: STAMP_V3_FRAME, ...a }]),
);
`);
  return L.join("\n");
}

/** the web's app/engine/stamp-art-v3.js (the same data, plain JS) */
export function buildWeb(r) {
  const ids = r.stamps.map((s) => s.id);
  const L = [header(r, "web")];
  L.push(`/**
 * @typedef {"hex" | "ink" | "tint" | "none"} StampRole
 * @typedef {"frame" | "rims" | "body" | "marks" | "face"} StampLayer
 * @typedef {{ fill: StampRole, stroke: StampRole, width?: number, cap?: "round", join?: "round" }} StampPaint
 * @typedef {({ el: "path", d: string } | { el: "circle", cx: number, cy: number, r: number } | { el: "ellipse", cx: number, cy: number, rx: number, ry: number }) & StampPaint} StampEl
 * @typedef {{ frame: StampEl[], rims: StampEl[], body: StampEl[], marks: StampEl[], face: StampEl[] }} StampArtV3
 */

/** the frame path, the same in all 36 */
export const STAMP_V3_FRAME_PATH = ${json(r.frameD)};
/** @type {StampEl[]} the frame layer, the same in all 36: the tint rim (14u) under the keyline (tint fill, ink 6u) */
export const STAMP_V3_FRAME = [
  ${FRAME_ELS("STAMP_V3_FRAME_PATH").join(",\n  ")},
];

/** the stamp ids this file has drawings for, in src/data/stamps.ts order */
export const STAMP_ART_V3_IDS = ${json(ids.filter((id) => r.art[id]))};

const ART = {
${ids.filter((id) => r.art[id]).map((id) => stampLine(id, r.art[id])).join("\n")}
};

/** @type {Record<string, StampArtV3>} the v3 drawings by stamp id (letters.stamp), each with its five layers */
export const STAMP_ART_V3 = Object.fromEntries(Object.entries(ART).map(([id, a]) => [id, { frame: STAMP_V3_FRAME, ...a }]));
`);
  return L.join("\n");
}

/* ── the golden file: what the kit draws, per id × tier, literal colours ── */

export async function buildGolden(r) {
  const kit = await import(new URL("lib.mjs", KIT).href);
  const geom = await import(new URL("geom.mjs", KIT).href);
  const tierW = { xs: 20, s: 30, l: 40 };
  const kitName = { xs: "XS", s: "S", l: "L" };
  for (const [t, w] of Object.entries(tierW)) if (kit.tierFor(w).name !== kitName[t]) throw new Error(`the kit's tierFor(${w}) is not ${kitName[t]}`);
  if (kit.FRAME_D !== r.frameD) throw new Error("the kit's FRAME_D differs from lib/stamp-frame STAMP_V3_FRAME_D");
  if (kit.INK !== INK || kit.TINT_MIX !== TINT_MIX) throw new Error("the kit's ink or tint mix differs from the importer's");
  const lit = (c) => (String(c).toLowerCase() === "none" ? null : String(c).toUpperCase());
  const draw = {}, colours = {};
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const st of r.stamps) {
    if (!r.art[st.id]) continue;
    const k = kit.BY_ID[st.id];
    colours[st.id] = { hex: k.hex, tint: kit.tintOf(k.hex), ink: kit.INK, nameLight: k.nameLight, nameDark: k.nameDark };
    draw[st.id] = {};
    for (const [t, w] of Object.entries(tierW)) {
      const cut = kit.tierSVG(r.raws[st.id], w);
      const layers = readLayersLoose(cut);
      draw[st.id][t] = layers.flatMap(([layer, els]) =>
        els.map(({ tag, a }) => {
          const p = paint(a, lit);
          const g = geometry(tag, a);
          return { layer, ...g, fill: p.fill, stroke: p.stroke, width: p.width ?? 0 };
        }),
      );
    }
    // where the paint lands (strokes included), at L
    for (const e of draw[st.id].l) {
      const half = e.stroke ? e.width / 2 : 0;
      const subs = e.el === "path" ? geom.flattenPath(e.d, 0.25) : geom.geometry({ tag: e.el, a: e }, 0.25);
      const bb = geom.bbox(subs);
      x0 = Math.min(x0, bb.x0 - half); y0 = Math.min(y0, bb.y0 - half); x1 = Math.max(x1, bb.x1 + half); y1 = Math.max(y1, bb.y1 + half);
    }
  }
  const r1 = (n) => Math.round(n * 10) / 10;
  const cats = Object.fromEntries(kit.CATEGORIES.map((c) => [c.id, c.color]));
  const golden = {
    about:
      "Stamps v3 goldens (B character, the bright palette, owner 2026-10-19). draw[id][tier] is the element list the kit draws at that tier " +
      "(kit/lib.mjs tierSVG at xs 20, s 30, l 40), bottom to top, with the colours LITERAL as the SVG paints them; every renderer resolves " +
      "data/stamp-art-v3 roles (hex = stamps.ts color, ink #1E1B35, tint = mix(hex, white, 0.88) half up) and its tier rule and must produce " +
      "exactly these lists: the same elements in the same order, geometry verbatim, fill/stroke (null = none) and stroke width (0 = none). " +
      "Every stroke is round-capped and round-joined. Below 15pt nothing is drawn but a dot of the hex. An id with no drawing draws `unknown` " +
      "(the frame alone) in its colour, or the fallback hex. Written by scripts/import-stamp-art-v3.mjs; checked by src/lib/stamp-v3.test.ts " +
      "(RN), the web's test and scripts/stamp-frame-golden.swift.",
    box: [0, 0, 100, 120],
    ink: INK,
    tintMix: TINT_MIX,
    tierFor: [[0, "dot"], [14.99, "dot"], [15, "xs"], [20, "xs"], [24.99, "xs"], [25, "s"], [30, "s"], [39.99, "s"], [40, "l"], [60, "l"], [200, "l"]],
    layers: { dot: [], xs: ["frame", "rims", "body"], s: ["frame", "rims", "body", "face"], l: ["frame", "rims", "body", "marks", "face"] },
    tiltsByLetter: { dot: false, xs: false, s: false, l: true },
    dotPt: 6,
    fallbackHex: "#8B7FE8",
    // an id with no drawing, in the fallback hex (with a known colour: the same two in that colour's tint and ink)
    unknown: [
      { layer: "frame", el: "path", d: r.frameD, fill: tintOf("#8B7FE8"), stroke: tintOf("#8B7FE8"), width: 14 },
      { layer: "frame", el: "path", d: r.frameD, fill: tintOf("#8B7FE8"), stroke: INK, width: 6 },
    ],
    slot: { d: kit.FRAME_D, fill: null, width: kit.SLOT.width, dash: kit.SLOT.dash, cap: "round", join: "round", light: "#8A86A3", dark: "#8F8BAA" },
    bounds: { x0: r1(x0), y0: r1(y0), x1: r1(x1), y1: r1(y1) },
    tag: { text: INK, fill: "the stamp hex", border: "theme ln", shadow: "theme ln (hard 3/3)", borderPt: 2 },
    trayName: { light: "nameLight (classic, lavender, paper)", dark: "nameDark (midnight)" },
    categories: cats,
    colours,
    draw,
  };
  // one element per line: the file stays diffable without a line per key
  const drawText = "{\n" + Object.entries(draw).map(([id, tiers]) =>
    `  ${json(id)}: {\n` + Object.entries(tiers).map(([t, els]) => `   ${json(t)}: [\n` + els.map((e) => "    " + json(e)).join(",\n") + "\n   ]").join(",\n") + "\n  }").join(",\n") + "\n }";
  return JSON.stringify({ ...golden, draw: "__DRAW__" }, null, 1).replace('"__DRAW__"', () => drawText) + "\n";
}
/** [[layer, els]] in order for a tier-cut SVG (some layers removed) */
function readLayersLoose(svg) {
  const s = svg.replace(/<!--[\s\S]*?-->/g, "");
  return [...s.matchAll(/<g id="([a-z]+)"(?:\s*\/>|>([\s\S]*?)<\/g>)/g)].map(([, id, inner = ""]) => [
    id,
    [...inner.matchAll(/<([a-zA-Z]+)\s([^>]*?)\/>/g)].map(([, tag, at]) => ({ tag, a: attrsOf(at) })),
  ]);
}

/* ── the command line ───────────────────────────────────────────────────── */

async function main() {
  const argv = process.argv.slice(2);
  const CHECK = argv.includes("--check");
  const wi = argv.indexOf("--web");
  let web = null;
  if (wi >= 0) {
    web = argv[wi + 1];
    if (!web || web.startsWith("--")) {
      console.error("import-stamp-art-v3: --web needs the path of the web's app/engine/stamp-art-v3.js");
      process.exit(2);
    }
    web = resolve(process.cwd(), web);
  }
  const r = importAll();
  for (const id of r.missing) console.error(`import-stamp-art-v3: ${id}: no svg in ${fileURLToPath(SRC)} (drawn as its frame)`);
  for (const x of r.rejected) console.error(`import-stamp-art-v3: ${x.id}: REJECTED, drawn as its frame: ${x.why}`);
  const outputs = [
    [fileURLToPath(OUT), buildTs(r)],
    [fileURLToPath(GOLDEN), await buildGolden(r)],
    ...(web ? [[web, buildWeb(r)]] : []),
  ];
  const c = count(r);
  const summary = `${c.ids.length}/36 stamps · ${c.rims} rim, ${c.body} body, ${c.marks} mark, ${c.face} face elements`;
  let stale = 0;
  for (const [path, text] of outputs) {
    if (CHECK) {
      const now = existsSync(path) ? readFileSync(path, "utf8") : null;
      if (now !== text) {
        stale++;
        console.error(`import-stamp-art-v3: ${path} is out of date; run node scripts/import-stamp-art-v3.mjs${web ? ` --web "${web}"` : ""}`);
      } else console.log(`up to date: ${path}`);
    } else {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, text);
      console.log(`wrote ${path}`);
    }
  }
  console.log(summary);
  process.exit(stale || r.missing.length || r.rejected.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
