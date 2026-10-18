// node scripts/import-stamp-art.mjs            check the stamps in design/stamps-v2, write src/data/stamp-art-v2.ts
// node scripts/import-stamp-art.mjs --check    exit 1 if stamp-art-v2.ts is out of date with the SVG files
// node scripts/import-stamp-art.mjs --web "<web repo>/app/stamp-art-v2.js"
//                                              also write the web's copy (an ES module, same shape)
// node scripts/import-stamp-art.mjs --check --web "<web repo>/app/stamp-art-v2.js"
//                                              exit 1 if either file is out of date
//
// THE STAMPS v2 IMPORTER (stamp-spec §2–§3; the owner approved the 36-stamp set on 2026-10-18).
// Each stamp is one SVG on the 100 × 120 box (5:6) holding white marks in three layers:
//   <g id="art">   the drawing, from S (25pt) up: white fills and 4.31u white strokes, round caps
//                  and joins, every mark inside the safe area x 18–82 × y 18–102;
//   <g id="soft">  optional, opacity="0.55": the second plate, tinted by code with
//                  mix(hex, #FFFFFF, 0.55) (the riso halo of the final set, plus small accents);
//   <g id="xs">    required: the 20×24 cut, 1–2 bold white marks;
//   <g id="guides"> optional: the template's reference layer, stripped with everything in it.
// The paper, perforation, window, ground, keyline and tilt are code
// (src/lib/stamp-frame.ts); the field colour is the stamp's frozen hex in src/data/stamps.ts.
//
// WHAT IT READS. Every *.svg directly in design/stamps-v2 whose name doesn't start with "_" or "."
// (the template _template-100x120.svg is skipped). The names it expects are the 36 ids of
// src/data/stamps.ts: <id>.svg. A missing file is reported, never fatal (the stamp is written with
// no marks, which the renderers draw as the template in its own hex: spec §2.11's fallback). A
// file no stamp is named after is reported with the nearest name and left out.
//
// THE RULES are the stamp checker's (.claude/stamp-design/tools/check.mjs), rule for rule, with the
// same names and numbers, so a file the checker passes is imported and a file it fails for what
// is drawn is rejected: svg.root, svg.layers, svg.elements, svg.numbers, paint, path.read,
// safe.area, motif.key, art.marks (1–9), art.clear (≥ 3u between separate marks), art.thin (no fill
// under 5u across), art.inner, soft.use, xs.marks (1–2), xs.size (≥ 8u), xs.clear (≥ 6u), xs.inner,
// colour. The geometry is measured the checker's way (curves flattened every 0.1u, a stroke's ink
// every point within 4.31 / 2 of its centre-line, a fill its interior and outline, a MARK a
// connected piece of ink), ported here from the checker's geom.mjs so this script stands alone.
//
// IT IS TOLERANT, like scripts/import-mood-art.mjs, about how a drawing tool writes what is drawn;
// each of these is read, imported and reported as a WARNING (the checker fails some of them):
// paint on the root, a layer or a nested <g> is inherited by the marks; a nested plain <g> in a
// layer is flattened; style="" declarations are read like attributes; a nameless <g> wrapping the
// layers (Figma's frame) is unwrapped and its full-artboard clip let go; layers are found by id,
// data-name (Illustrator) or inkscape:label, with an editor's numeric suffix ("art_1"); a missing
// or odd width/height (the viewBox decides) or xmlns; the soft layer's opacity missing, written as
// fill-opacity or not 0.55 (the layer's role decides its tint); numbers with more than 2 decimals
// or an exponent (the path is rewritten in absolute commands to 2 decimals); white spelt #fff,
// white or rgb(255,255,255); <title>, <desc>, <metadata>, comments, ids, data-* and editor
// attributes are ignored. Circles, ellipses, rects, lines, polylines and polygons become path data
// (scripts/art-path.mjs shapeData for the round ones), to 2 decimals.
// An ERROR rejects the stamp (it is written with no marks and the app draws its fallback): not
// readable XML, the root not <svg>, the viewBox not 0 0 100 120, no art or xs layer, anything at
// the root but the layers, a transform, an opacity on a mark, a dash, a gradient, pattern, mask,
// clip, filter, marker, <use>, <defs> with content, text or an image, a hidden element, paint that
// isn't white, a fill and a stroke on one element (or an open stroke left to SVG's black fill), a
// stroke not 4.31 ± 0.02 or not round/round, path data the device can't read, and every geometry
// rule above. Warnings and notes never reject.
//
// WHAT IT WRITES: src/data/stamp-art-v2.ts, STAMP_ART_V2: per stamp id { art, soft, xs }, each a
// list of { d, kind: "fill" | "stroke" } in the 100 × 120 box (every number ≤ 2 decimals), and on
// a soft mark under 10u dropAtS: true (§2.2: S leaves out tint accents under 10u). No colour: the
// renderer paints art and xs white and soft in softHex(hex). src/data/stamp-art.ts (STAMP_ART, the
// 64-grid set StampTile and scripts/gen-stamp-art-swift.mjs draw today) is not touched.
//
// AND, WITH --web <path>, THE WEB'S COPY (stamp-spec §3: the app and the web regenerate together).
// The web (~/Desktop/claude 项目/kindredly, a separate repo with no TypeScript) imports
// app/stamp-art-v2.js: the same STAMP_ART_V2, the same marks in the same order, as a plain ES
// module with the shape in JSDoc instead of types. It is written beside stamp-art-v2.ts from the
// same results in the same run, so the two can never disagree about a drawing; --check compares
// both. Without --web nothing about this script's output changes (stamp-art-v2.ts stays byte for
// byte what it was). The path is the caller's, resolved against the working directory; a --web
// with nothing after it stops before anything is written, rather than writing to a file named
// after the next flag.
//
// Exit status: 0 when every delivered file is imported; 1 when a file was rejected or a file no
// stamp is named after is present (the rest are still written), or, with --check, when
// stamp-art-v2.ts (or, with --web, the web's copy) is out of date. Missing files never fail the run.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PATH_CHARS, parsePath, shapeData, toArtPath } from "./art-path.mjs";
import { parseXml, readColour } from "./import-mood-art.mjs";

export const DIR = new URL("../design/stamps-v2/", import.meta.url);
export const STAMPS = new URL("../src/data/stamps.ts", import.meta.url);
export const OUT = new URL("../src/data/stamp-art-v2.ts", import.meta.url);

/** the checker's numbers (check.mjs SPEC; stamp-spec §2) */
export const SPEC = Object.freeze({
  viewBox: [0, 0, 100, 120],
  safe: { x0: 18, y0: 18, x1: 82, y1: 102 }, // the window inset 8u; ink, stroke width included
  motif: { x0: 19, y0: 27, x1: 81, y1: 89 }, // the 62u motif box, centre y 58
  stroke: 4.31,
  strokeTol: 0.02,
  softOpacity: 0.55,
  artMarks: [1, 9],
  xsMarks: [1, 2],
  xsFeature: 8, // every xs stroke this long, every xs fill this wide and tall
  clearArt: 3,
  clearXs: 6,
  fillMin: 5, // a fill narrower than this overall reads thinner than the stroke weight
  softMax: 2,
  softKeyArea: 200, // bbox area (u²) from which a soft mark is key-shape sized
  softDropS: 10, // §2.2: at S, tint accents under this size are dropped
  decimals: 2,
  flatStep: 0.1,
  touch: 0.01, // inks closer than this are one mark
});
const LAYERS = ["art", "soft", "xs"];
const EPS = 1e-6;

/* ── the 36 stamps, from stamps.ts ───────────────────────────────────────── */

/** { stamps: [{ n, id, cat, color }] (36, in order), ids, byId } from the STAMPS table. */
export function readStamps(text) {
  const s = text.indexOf("export const STAMPS");
  if (s < 0) throw new Error("stamps.ts: no STAMPS table");
  const e = text.indexOf("\n];", s);
  const block = text.slice(s, e < 0 ? undefined : e);
  const stamps = [...block.matchAll(/\{ id: "([\w-]+)", cat: "(\w+)", emoji: "[^"]*", color: "(#[0-9A-Fa-f]{6})"/g)].map((m, i) => ({
    n: i + 1,
    id: m[1],
    cat: m[2],
    color: m[3].toUpperCase(),
  }));
  if (stamps.length !== 36) throw new Error(`stamps.ts: read ${stamps.length} stamps, expected 36`);
  const ids = stamps.map((x) => x.id);
  if (new Set(ids).size !== ids.length) throw new Error("stamps.ts: a stamp id appears twice");
  return { stamps, ids, byId: Object.fromEntries(stamps.map((x) => [x.id, x])) };
}

/* ── reading helpers ─────────────────────────────────────────────────────── */

const attr = (el, name) => {
  const a = el.attrs.find(([k]) => k === name);
  return a ? a[1] : undefined;
};
const localName = (tag) => (tag.startsWith("svg:") ? tag.slice(4) : tag);
const short = (s, n = 30) => {
  const t = String(s).replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
};
/** style="a: b; c: d" as [[a, b], [c, d]] */
const declarations = (style) =>
  style
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const k = d.indexOf(":");
      return k < 0 ? [d, ""] : [d.slice(0, k).trim(), d.slice(k + 1).trim()];
    });

const NUM = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)(px)?\s*$/;
const NUMBERS = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
/** a length as a number: plain or px */
function length(v, what) {
  const m = NUM.exec(v ?? "");
  if (!m) throw new Error(`${what}="${v}" is a length the importer can't read (plain numbers only)`);
  return Number(m[1]);
}
/** to 2 decimals, -0 as 0 */
const r2 = (n) => {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
};
const f2 = (x) => (x === null || x === undefined || Number.isNaN(x) ? "—" : (Math.abs(x) < 0.005 ? 0 : x).toFixed(2));
/** the numbers in a value that have more than 2 decimals or an exponent */
function longNumbers(v) {
  const out = [];
  for (const m of String(v).matchAll(NUMBERS)) {
    const s = m[0];
    const dot = s.indexOf(".");
    const e = s.search(/[eE]/);
    const decimals = dot < 0 ? 0 : (e < 0 ? s.length : e) - dot - 1;
    if (decimals > SPEC.decimals || e >= 0) out.push(s);
  }
  return out;
}
const isWhite = (v) => {
  const c = readColour(v);
  return !!c.rgba && c.rgba[0] === 255 && c.rgba[1] === 255 && c.rgba[2] === 255 && c.rgba[3] === 1;
};
const isNone = (v) => v !== undefined && !!readColour(v).none;

/* ── attributes ──────────────────────────────────────────────────────────── */

const DRAWABLE = new Set(["path", "circle", "ellipse", "rect", "line", "polyline", "polygon"]);
const SKIPPED = new Set(["title", "desc", "metadata"]);
const PAINT = new Set(["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"]);
const GEOMETRY = {
  path: ["d"],
  circle: ["cx", "cy", "r"],
  ellipse: ["cx", "cy", "rx", "ry"],
  rect: ["x", "y", "width", "height", "rx", "ry"],
  line: ["x1", "y1", "x2", "y2"],
  polyline: ["points"],
  polygon: ["points"],
};
const FORBIDDEN = new Set([
  "text", "tspan", "textPath", "linearGradient", "radialGradient", "stop", "pattern", "filter", "mask", "clipPath", "image",
  "use", "defs", "symbol", "style", "foreignObject", "a", "switch", "marker", "script", "animate", "animateTransform",
  "animateMotion", "set", "svg",
]);
// harmless everywhere (the mood importer's list): names, classes, the fill and clip rules, the miter
// limit, dash offsets, rendering hints, and the properties an editor writes that change no mark
const IGNORED = new Set([
  "id", "class", "fill-rule", "clip-rule", "stroke-miterlimit", "stroke-dashoffset", "pathLength", "paint-order",
  "shape-rendering", "color-interpolation", "color-interpolation-filters", "color-rendering", "image-rendering",
  "text-rendering", "isolation", "lang", "tabindex", "focusable", "role", "color",
  "stop-color", "stop-opacity", "solid-color", "solid-opacity", "flood-color", "flood-opacity", "lighting-color",
  "overflow", "enable-background", "font",
]);
const ROOT_SIZE = new Set(["width", "height", "viewBox", "xmlns", "version", "baseProfile", "x", "y", "preserveAspectRatio", "zoomAndPan", "contentScriptType", "contentStyleType"]);
const IDENTITY_TRANSFORM = /^\s*(?:(?:matrix\(\s*1[\s,]+0[\s,]+0[\s,]+1[\s,]+0[\s,]+0\s*\)|translate\(\s*0(?:[\s,]+0)?\s*\)|scale\(\s*1(?:[\s,]+1)?\s*\)|rotate\(\s*0\s*\))\s*)*$/;

/** What one attribute (or style declaration) means: "paint", "geometry", "ignore", { refuse: why }
    or "unknown". */
function classifyAttr(tag, name, value, isRoot = false) {
  const v = String(value).trim();
  const low = v.toLowerCase();
  if (PAINT.has(name)) return "paint";
  if (GEOMETRY[tag]?.includes(name)) return "geometry";
  if (isRoot && ROOT_SIZE.has(name)) return "ignore";
  if (IGNORED.has(name) || name.startsWith("data-") || name.startsWith("aria-") || name.startsWith("font-") || name === "xmlns") return "ignore";
  if (name.startsWith("-")) return "ignore"; // a vendor property (-inkscape-stroke …)
  if (name === "xlink:href" || name === "href") return { refuse: `a link to another element (${name}="${v}")` };
  if (name.includes(":")) return "ignore"; // xml:space, xmlns:*, inkscape:*, sodipodi:*, serif:*
  switch (name) {
    case "transform":
      return IDENTITY_TRANSFORM.test(v) ? "ignore" : { refuse: `a transform (${short(v)}): bake it into the numbers` };
    case "opacity":
    case "fill-opacity":
    case "stroke-opacity": {
      const m = NUM.exec(v);
      return /^\s*100%\s*$/.test(v) || (m && Number(m[1]) === 1) ? "ignore" : { refuse: `${name}="${v}": the only opacity is the soft layer's 0.55` };
    }
    case "stroke-dasharray":
      return low === "none" || low === "" ? "ignore" : { refuse: `a dashed stroke (stroke-dasharray ${v})` };
    case "vector-effect":
      return low === "none" ? "ignore" : { refuse: `vector-effect ${v}: the app sets the stroke width itself` };
    case "mask":
    case "clip-path":
    case "filter":
    case "marker":
    case "marker-start":
    case "marker-mid":
    case "marker-end":
      return low === "none" ? "ignore" : { refuse: `${name} ${v}` };
    case "display":
      return low === "none" ? { refuse: "a hidden element (display none): delete it before export" } : "ignore";
    case "visibility":
      return low === "hidden" || low === "collapse" ? { refuse: `a hidden element (visibility ${v}): delete it before export` } : "ignore";
    case "mix-blend-mode":
      return low === "normal" ? "ignore" : { refuse: `a blend mode (${v})` };
    default:
      return isRoot ? "ignore" : "unknown";
  }
}

/** an element's attributes with style="" declarations appended (and whether there were any) */
function attrEntries(el) {
  const list = el.attrs.filter(([k]) => k !== "style");
  const style = attr(el, "style");
  const decl = style !== undefined && style.trim() ? declarations(style) : [];
  return { list: [...list, ...decl], style: decl.length ? style : null };
}

/** layers by name: id, data-name (Illustrator) or inkscape:label, with an editor's numeric suffix */
const LAYER_NAME = /^(art|soft|xs|guides?)(?:[-_ ]\d+)?$/i;
function layerName(el) {
  for (const k of ["id", "data-name", "inkscape:label"]) {
    const v = attr(el, k);
    const m = v === undefined ? null : LAYER_NAME.exec(v.trim());
    if (m) {
      const n = m[1].toLowerCase();
      return { name: n.startsWith("guide") ? "guides" : n, by: k, value: v };
    }
  }
  return null;
}

/** <defs> children that are full-artboard clips (Figma's frame clip): their ids */
function fullClips(defs) {
  const ids = new Set();
  for (const c of defs.children) {
    if (localName(c.tag) !== "clipPath") return null;
    const kids = c.children.filter((k) => !SKIPPED.has(localName(k.tag)));
    const r = kids[0];
    if (kids.length !== 1 || localName(r.tag) !== "rect" || attr(r, "transform") !== undefined) return null;
    try {
      const x = attr(r, "x") === undefined ? 0 : length(attr(r, "x"), "x");
      const y = attr(r, "y") === undefined ? 0 : length(attr(r, "y"), "y");
      if (x > 0 || y > 0 || length(attr(r, "width"), "width") < 100 || length(attr(r, "height"), "height") < 120) return null;
    } catch {
      return null;
    }
    if (attr(c, "id")) ids.add(attr(c, "id"));
  }
  return ids;
}

/* ── shapes as path data ─────────────────────────────────────────────────── */

/** An element's shape as path data (numbers of the primitives to 2 decimals), or null when it has
    no size (SVG draws nothing either). */
function elementData(tag, get) {
  const val = (name, fallback) => {
    const v = get(name);
    return v === undefined ? fallback : length(v, name);
  };
  switch (tag) {
    case "path": {
      const d = get("d");
      if (d === undefined || !d.trim()) return null;
      const out = d.trim().replace(/\s+/g, " ");
      if (!PATH_CHARS.test(out)) throw new Error(`path data with characters SVG doesn't allow ("${short(out, 40)}")`);
      return out;
    }
    case "circle": {
      const r = val("r", 0);
      return r > 0 ? shapeData({ t: "c", cx: val("cx", 0), cy: val("cy", 0), r }, r2) : null;
    }
    case "ellipse": {
      const rxv = get("rx");
      const ryv = get("ry");
      const rx = rxv === undefined || rxv === "auto" ? (ryv === undefined || ryv === "auto" ? 0 : length(ryv, "ry")) : length(rxv, "rx");
      const ry = ryv === undefined || ryv === "auto" ? rx : length(ryv, "ry");
      return rx > 0 && ry > 0 ? shapeData({ t: "e", cx: val("cx", 0), cy: val("cy", 0), rx, ry }, r2) : null;
    }
    case "rect": {
      const x = val("x", 0);
      const y = val("y", 0);
      const w = val("width", 0);
      const h = val("height", 0);
      if (!(w > 0 && h > 0)) return null;
      const given = (v) => v !== undefined && v !== "auto";
      let rx = given(get("rx")) ? length(get("rx"), "rx") : given(get("ry")) ? length(get("ry"), "ry") : 0;
      let ry = given(get("ry")) ? length(get("ry"), "ry") : rx;
      rx = Math.max(0, Math.min(rx, w / 2));
      ry = Math.max(0, Math.min(ry, h / 2));
      const [X, Y, W, H] = [x, y, w, h].map(r2);
      if (rx === 0 || ry === 0) return `M${X},${Y}h${W}v${H}h${r2(-w)}Z`;
      const [a, b, sw, sh] = [rx, ry, w - 2 * rx, h - 2 * ry].map(r2);
      return `M${r2(x + rx)},${Y}h${sw}a${a},${b} 0 0 1 ${a},${b}v${sh}a${a},${b} 0 0 1 ${r2(-a)},${b}h${r2(-sw)}a${a},${b} 0 0 1 ${r2(-a)},${r2(-b)}v${r2(-sh)}a${a},${b} 0 0 1 ${a},${r2(-b)}Z`;
    }
    case "line":
      return `M${r2(val("x1", 0))},${r2(val("y1", 0))}L${r2(val("x2", 0))},${r2(val("y2", 0))}`;
    case "polyline":
    case "polygon": {
      const p = (get("points") ?? "").match(NUMBERS)?.map(Number) ?? [];
      if (p.length % 2) throw new Error(`points="${short(get("points"))}" holds an odd count of numbers`);
      if (p.length < 4) return null;
      const pairs = [];
      for (let k = 0; k < p.length; k += 2) pairs.push(`${r2(p[k])},${r2(p[k + 1])}`);
      return `M${pairs[0]}L${pairs.slice(1).join(" ")}${tag === "polygon" ? "Z" : ""}`;
    }
  }
  return null;
}

/** parsePath's segments written back as absolute path data, to 2 decimals (arcs as cubics) */
const absPath = (segments) =>
  segments
    .map((s) => {
      if (s.op === "Z") return "Z";
      const pairs = [];
      for (let i = 0; i < s.p.length; i += 2) pairs.push(`${r2(s.p[i])},${r2(s.p[i + 1])}`);
      return s.op + pairs.join(" ");
    })
    .join("");

/** A short readable name for an element: `#2 <path d="M7.5 14.5c1.5…">`. */
function describe(el, tag, index) {
  const parts = (GEOMETRY[tag] || [])
    .filter((k) => attr(el, k) !== undefined)
    .map((k) => {
      let v = String(attr(el, k)).replace(/\s+/g, " ").trim();
      if (v.length > 22) v = v.slice(0, 21) + "…";
      return `${k}="${v}"`;
    });
  return `#${index} <${tag}${parts.length ? " " + parts.join(" ") : ""}>`;
}

/* ── plane geometry (a port of .claude/mood-design/tools/geom.mjs, which check.mjs uses) ─ */

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const cross = (ax, ay, bx, by) => ax * by - ay * bx;

function bezPoint(P, t) {
  const u = 1 - t;
  if (P.length === 2) return [u * P[0][0] + t * P[1][0], u * P[0][1] + t * P[1][1]];
  if (P.length === 3) {
    const a = u * u, b = 2 * u * t, c = t * t;
    return [a * P[0][0] + b * P[1][0] + c * P[2][0], a * P[0][1] + b * P[1][1] + c * P[2][1]];
  }
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]];
}

const polyLen = (P) => {
  let s = 0;
  for (let i = 1; i < P.length; i++) s += dist(P[i - 1], P[i]);
  return s;
};

/** parsePath's output as flattened subpaths { pts, closed, segs } (a move alone draws nothing) */
function toSubpaths(segments, step) {
  const subs = [];
  let cur = null;
  let pt = [0, 0];
  let start = [0, 0];
  const begin = (p) => {
    cur = { pts: [p.slice()], closed: false, segs: [] };
    subs.push(cur);
    start = p.slice();
  };
  const add = (P) => {
    const i0 = cur.pts.length - 1;
    const n = P.length === 2 ? 1 : Math.max(2, Math.ceil(polyLen(P) / step));
    for (let k = 1; k <= n; k++) cur.pts.push(bezPoint(P, k / n));
    cur.pts[cur.pts.length - 1] = P[P.length - 1].slice();
    cur.segs.push({ P, i0, i1: cur.pts.length - 1 });
  };
  for (const s of segments) {
    if (s.op === "M") {
      pt = [s.p[0], s.p[1]];
      begin(pt);
      continue;
    }
    if (s.op === "Z") {
      if (cur) {
        if (dist(pt, start) > 1e-9) add([pt.slice(), start.slice()]);
        cur.closed = true;
        pt = start.slice();
        cur = null;
      }
      continue;
    }
    if (!cur) begin(pt);
    let P;
    if (s.op === "L") P = [pt.slice(), [s.p[0], s.p[1]]];
    else if (s.op === "Q") P = [pt.slice(), [s.p[0], s.p[1]], [s.p[2], s.p[3]]];
    else if (s.op === "C") P = [pt.slice(), [s.p[0], s.p[1]], [s.p[2], s.p[3]], [s.p[4], s.p[5]]];
    else throw new Error(`unknown segment op ${s.op}`);
    add(P);
    pt = P[P.length - 1].slice();
  }
  return subs.filter((s) => s.segs.length > 0);
}

/** a subpath's outline as a closed ring ending exactly on its first point */
function ringOf(sub) {
  const p = sub.pts;
  if (!p.length) return p;
  const a = p[0], b = p[p.length - 1];
  if (a[0] === b[0] && a[1] === b[1]) return p;
  if (dist(a, b) <= 1e-9) return [...p.slice(0, -1), a.slice()];
  return [...p, a.slice()];
}

function bboxOfPolys(polys) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (const [x, y] of p) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}
const inkBoxOf = (shape) => {
  const b = bboxOfPolys(shape.polys);
  return { x0: b.x0 - shape.r, y0: b.y0 - shape.r, x1: b.x1 + shape.r, y1: b.y1 + shape.r };
};
function unionBox(boxes) {
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const c of boxes) {
    b.x0 = Math.min(b.x0, c.x0);
    b.y0 = Math.min(b.y0, c.y0);
    b.x1 = Math.max(b.x1, c.x1);
    b.y1 = Math.max(b.y1, c.y1);
  }
  return b;
}
function boxGap(a, b) {
  const dx = Math.max(0, a.x0 - b.x1, b.x0 - a.x1);
  const dy = Math.max(0, a.y0 - b.y1, b.y0 - a.y1);
  return Math.hypot(dx, dy);
}

function pointSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const L = dx * dx + dy * dy;
  let t = L > 0 ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ax + t * dx, qy = ay + t * dy;
  return { d: Math.hypot(px - qx, py - qy), q: [qx, qy] };
}
function segsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = cross(bx - ax, by - ay, cx - ax, cy - ay);
  const d2 = cross(bx - ax, by - ay, dx - ax, dy - ay);
  const d3 = cross(dx - cx, dy - cy, ax - cx, ay - cy);
  const d4 = cross(dx - cx, dy - cy, bx - cx, by - cy);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
function segSeg(ax, ay, bx, by, cx, cy, dx, dy) {
  if (segsCross(ax, ay, bx, by, cx, cy, dx, dy)) {
    const den = cross(bx - ax, by - ay, dx - cx, dy - cy);
    const t = den ? cross(cx - ax, cy - ay, dx - cx, dy - cy) / den : 0;
    const p = [ax + t * (bx - ax), ay + t * (by - ay)];
    return { d: 0, p, q: p };
  }
  let best = { d: Infinity, p: null, q: null };
  let r = pointSeg(ax, ay, cx, cy, dx, dy);
  if (r.d < best.d) best = { d: r.d, p: [ax, ay], q: r.q };
  r = pointSeg(bx, by, cx, cy, dx, dy);
  if (r.d < best.d) best = { d: r.d, p: [bx, by], q: r.q };
  r = pointSeg(cx, cy, ax, ay, bx, by);
  if (r.d < best.d) best = { d: r.d, p: r.q, q: [cx, cy] };
  r = pointSeg(dx, dy, ax, ay, bx, by);
  if (r.d < best.d) best = { d: r.d, p: r.q, q: [dx, dy] };
  return best;
}
const CHUNK = 24;
function chunks(polys) {
  const out = [];
  for (const p of polys) {
    if (p.length === 1) {
      out.push({ pts: [p[0], p[0]], box: { x0: p[0][0], y0: p[0][1], x1: p[0][0], y1: p[0][1] } });
      continue;
    }
    for (let i = 0; i < p.length - 1; i += CHUNK) {
      const pts = p.slice(i, Math.min(p.length, i + CHUNK + 1));
      out.push({ pts, box: bboxOfPolys([pts]) });
    }
  }
  return out;
}
/** minimum distance between two sets of polylines, exact on the flattening */
function polySetDistance(A, B) {
  const ca = chunks(A), cb = chunks(B);
  const pairs = [];
  for (const a of ca) for (const b of cb) pairs.push([boxGap(a.box, b.box), a, b]);
  pairs.sort((x, y) => x[0] - y[0]);
  let best = { d: Infinity, p: null, q: null };
  for (const [g, a, b] of pairs) {
    if (g >= best.d) break;
    const pa = a.pts, pb = b.pts;
    for (let i = 0; i < pa.length - 1; i++) {
      const [ax, ay] = pa[i], [bx, by] = pa[i + 1];
      for (let j = 0; j < pb.length - 1; j++) {
        const r = segSeg(ax, ay, bx, by, pb[j][0], pb[j][1], pb[j + 1][0], pb[j + 1][1]);
        if (r.d < best.d) {
          best = r;
          if (r.d === 0) return best;
        }
      }
    }
  }
  return best;
}
/** nonzero winding number of a point against closed rings */
function winding(rings, px, py) {
  let w = 0;
  for (const r of rings) {
    for (let i = 0; i < r.length - 1; i++) {
      const [ax, ay] = r[i], [bx, by] = r[i + 1];
      if (ay <= py) {
        if (by > py && cross(bx - ax, by - ay, px - ax, py - ay) > 0) w++;
      } else if (by <= py && cross(bx - ax, by - ay, px - ax, py - ay) < 0) w--;
    }
  }
  return w;
}
const insideFill = (shape, p) => shape.fill && winding(shape.polys, p[0], p[1]) !== 0;
function coreDistance(A, B) {
  if (B.fill) for (const p of A.polys) for (const pt of p) if (insideFill(B, pt)) return { d: 0, p: pt, q: pt };
  if (A.fill) for (const p of B.polys) for (const pt of p) if (insideFill(A, pt)) return { d: 0, p: pt, q: pt };
  return polySetDistance(A.polys, B.polys);
}
/** clear space between the inks of two shapes: positive gap, or negative when they overlap */
function clearance(A, B) {
  const c = coreDistance(A, B);
  return { clear: c.d - A.r - B.r, core: c.d, p: c.p, q: c.q };
}
function convexHull(points) {
  const p = points.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const lower = [], upper = [];
  const turn = (o, a, b) => cross(a[0] - o[0], a[1] - o[1], b[0] - o[0], b[1] - o[1]);
  for (const q of p) {
    while (lower.length >= 2 && turn(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && turn(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}
/** the smallest caliper width of a point set */
function minWidth(points) {
  const h = convexHull(points);
  if (h.length < 3) return 0;
  let best = Infinity;
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length];
    const L = dist(a, b);
    if (L < 1e-12) continue;
    let m = 0;
    for (const q of h) m = Math.max(m, Math.abs(cross(b[0] - a[0], b[1] - a[1], q[0] - a[0], q[1] - a[1])) / L);
    best = Math.min(best, m);
  }
  return best;
}
/** the narrowest place where one stroke's centre-line faces itself (two arms within 30° of
    parallel, farther apart along the line than across), as the ink gap at width w */
function innerGap(subs, w, spacing) {
  const segs = [];
  const samples = [];
  subs.forEach((sub, si) => {
    const pts = sub.pts;
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1], pts[i]);
    if (total < 1e-6) return;
    let s = 0, next = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const L = dist(a, b);
      if (L < 1e-12) continue;
      const t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
      segs.push({ a, b, t, s0: s, L, sub: si, total, closed: sub.closed });
      while (next <= s + L) {
        const f = (next - s) / L;
        samples.push({ p: [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])], t, s: next, sub: si, total, closed: sub.closed });
        next += spacing;
      }
      s += L;
    }
  });
  const reach = w + 1.25 + 1;
  let best = null;
  for (const A of samples) {
    for (const sgn of [1, -1]) {
      const nx = -A.t[1] * sgn, ny = A.t[0] * sgn;
      let hit = null;
      for (const S of segs) {
        const ex = S.b[0] - S.a[0], ey = S.b[1] - S.a[1];
        const den = cross(nx, ny, ex, ey);
        if (Math.abs(den) < 1e-12) continue;
        const wx = S.a[0] - A.p[0], wy = S.a[1] - A.p[1];
        const u = cross(wx, wy, ex, ey) / den;
        const v = cross(wx, wy, nx, ny) / den;
        if (u <= 1e-6 || u > reach || v < 0 || v > 1) continue;
        if (hit && u >= hit.u) continue;
        let along = Infinity;
        if (S.sub === A.sub) {
          along = Math.abs(S.s0 + v * S.L - A.s);
          if (A.closed) along = Math.min(along, A.total - along);
        }
        if (along < 1.3 * u) continue;
        hit = { u, t: S.t, q: [A.p[0] + u * nx, A.p[1] + u * ny] };
      }
      if (!hit) continue;
      if (Math.abs(cross(A.t[0], A.t[1], hit.t[0], hit.t[1])) > 0.5) continue;
      const gap = hit.u - w;
      if (!best || gap < best.gap) best = { gap, p: A.p, q: hit.q };
    }
  }
  return best;
}

/* ── marks (check.mjs's buildAtoms / buildMarks) ─────────────────────────── */

/** an element's subpaths as atoms with their ink at the spec weight */
function buildAtoms(elements) {
  const atoms = [];
  const r = SPEC.stroke / 2;
  for (const el of elements) {
    if (!el.segments || (el.kind !== "fill" && el.kind !== "stroke" && el.kind !== "both")) continue;
    let subs;
    try {
      subs = toSubpaths(el.segments, SPEC.flatStep);
    } catch {
      continue;
    }
    subs.forEach((sub, k) => {
      const shape = el.kind === "stroke" ? { polys: [sub.pts], fill: false, r } : { polys: [ringOf(sub)], fill: true, r: el.kind === "fill" ? 0 : r };
      atoms.push({ el, k, kind: el.kind, sub, shape, length: polyLen(sub.pts), inkBox: inkBoxOf(shape) });
    });
  }
  return atoms;
}
/** marks: atoms joined where their inks touch or overlap at the spec weight */
function buildMarks(atoms) {
  const parent = atoms.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      if (boxGap(atoms[i].inkBox, atoms[j].inkBox) > SPEC.touch) continue;
      if (clearance(atoms[i].shape, atoms[j].shape).clear <= SPEC.touch) parent[find(i)] = find(j);
    }
  }
  const groups = new Map();
  atoms.forEach((a, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(a);
  });
  const marks = [...groups.values()].map((list) => {
    const els = [...new Set(list.map((a) => a.el.index))].sort((a, b) => a - b);
    const kinds = new Set(list.map((a) => a.kind));
    const inkBox = unionBox(list.map((a) => a.inkBox));
    return { atoms: list, els, kind: kinds.size > 1 ? "mixed" : [...kinds][0], inkBox, w: inkBox.x1 - inkBox.x0, h: inkBox.y1 - inkBox.y0 };
  });
  marks.sort((a, b) => a.els[0] - b.els[0] || a.inkBox.y0 - b.inkBox.y0);
  marks.forEach((m, i) => {
    m.n = i + 1;
    m.name = `mark ${i + 1} (${m.kind}, el ${m.els.join("+")})`;
  });
  return marks;
}
function markClearance(A, B) {
  let best = null;
  for (const a of A.atoms) for (const b of B.atoms) {
    const c = clearance(a.shape, b.shape);
    if (!best || c.clear < best.clear) best = c;
    if (best.clear <= 0) return best;
  }
  return best;
}
/** innerGap measured for gaps up to `limit` (it only looks w + 2.25 out, so widen and convert back) */
function innerGapUpTo(subs, w, limit) {
  const wEff = Math.max(w, w + limit - 2.25);
  const g = innerGap(subs, wEff, 0.25);
  return g ? { gap: g.gap + wEff - w, p: g.p, q: g.q } : null;
}
const boxStr = (b) => `x ${f2(b.x0)}–${f2(b.x1)} y ${f2(b.y0)}–${f2(b.y1)}`;

/* ── colour (info) ───────────────────────────────────────────────────────── */

const mix = (a, b, t) => {
  const A = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const B = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).toUpperCase().padStart(2, "0")).join("");
};
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/* ── one file ────────────────────────────────────────────────────────────── */

/**
 * Checks one stamp SVG against every rule and reads its marks. `stamp` is its stamps.ts row
 * ({ id, cat, color }) or null. Returns { status: "ok" | "rejected", errors, warnings, notes
 * ([{ rule, text, line }]), measures, art: { art, soft, xs } (ArtPath lists) }.
 */
export function checkStamp(text, stamp) {
  const errors = [], warnings = [], notes = [];
  const err = (rule, msg, line = null) => errors.push({ rule, text: msg, line });
  const warn = (rule, msg, line = null) => warnings.push({ rule, text: msg, line });
  const note = (rule, msg, line = null) => notes.push({ rule, text: msg, line });
  const measures = {};
  const done = (art = null) => ({ status: errors.length ? "rejected" : "ok", errors, warnings, notes, measures, art });

  let root;
  try {
    root = parseXml(text);
  } catch (e) {
    err("svg.parse", e.message);
    return done();
  }

  /* the root */
  if (localName(root.tag) !== "svg") {
    err("svg.root", `the root is <${root.tag}>, not <svg>`, root.line);
    return done();
  }
  {
    const vb = attr(root, "viewBox");
    if (vb === undefined) err("svg.root", `no viewBox="0 0 100 120": the drawing must sit on the 100 × 120 box`, root.line);
    else {
      const n = vb.trim().split(/[\s,]+/).map(Number);
      if (n.length !== 4 || n.some((x, i) => x !== SPEC.viewBox[i])) err("svg.root", `viewBox="${vb}" (want "0 0 100 120"): redraw on the 100 × 120 template`, root.line);
    }
    for (const [k, want] of [["width", 100], ["height", 120]]) {
      const v = attr(root, k);
      const m = v === undefined ? null : NUM.exec(v);
      if (v === undefined) warn("svg.root", `no ${k}="${want}" (the viewBox decides)`, root.line);
      else if (!m || Number(m[1]) !== want) warn("svg.root", `${k}="${v}" (want "${want}"; the viewBox decides)`, root.line);
    }
    if (attr(root, "xmlns") !== "http://www.w3.org/2000/svg") warn("svg.root", `no xmlns="http://www.w3.org/2000/svg"`, root.line);
  }
  const rootPaint = {};
  {
    const { list, style } = attrEntries(root);
    if (style) warn("svg.root", `style="${short(style)}" on the root read like attributes`, root.line);
    for (const [k, v] of list) {
      const c = classifyAttr("svg", k, v, true);
      if (c === "paint") {
        rootPaint[k] = v.trim();
        warn("svg.root", `${k}="${v}" on the root: read as inherited by the marks (better: every mark names its own paint)`, root.line);
      } else if (c?.refuse) err("svg.root", `the root carries ${c.refuse}`, root.line);
    }
  }

  /* the layers */
  const layers = { art: null, soft: null, xs: null };
  let clips = new Set();
  for (const c of root.children) if (localName(c.tag) === "defs") clips = fullClips(c) ?? clips;
  const containerPaint = (el, where, paint, rule, { soft = false, wrapper = false } = {}) => {
    const { list, style } = attrEntries(el);
    if (style) warn(rule, `${where}: style="${short(style)}" read like attributes`, el.line);
    for (const [k, v] of list) {
      if (soft && (k === "opacity" || k === "fill-opacity")) continue; // the soft layer's own, below
      if (wrapper && k === "clip-path") {
        const id = /^url\(\s*#([^)\s]+)\s*\)$/.exec(v.trim())?.[1];
        if (id && clips.has(id)) {
          note(rule, `${where}: the full-artboard clip ${v} clips nothing; let go`, el.line);
          continue;
        }
      }
      const c = classifyAttr("g", k, v);
      if (c === "paint") {
        paint[k] = v.trim();
        warn(rule, `${where} carries ${k}="${v}": read as inherited by its marks (better: every mark names its own paint)`, el.line);
      } else if (c?.refuse) err(rule, `${where} carries ${c.refuse}`, el.line);
      else if (c === "unknown") warn(rule, `${where}: unknown attribute ${k}="${v}" (ignored)`, el.line);
    }
  };
  const collect = (container, paint) => {
    if (container.text.trim()) err("svg.layers", `stray text "${short(container.text)}" outside the layers`, container.line);
    for (const c of container.children) {
      const tag = localName(c.tag);
      if (tag === "g") {
        const name = layerName(c);
        if (name?.name === "guides") {
          note("svg.layers", `<g ${name.by}="${name.value}"> (guides) stripped`, c.line);
          continue;
        }
        if (name) {
          if (name.by !== "id" || name.value !== name.name) note("svg.layers", `layer ${name.name} found by ${name.by}="${name.value}"`, c.line);
          if (layers[name.name]) err("svg.layers", `a second <g> named ${name.name} (line ${c.line}): one ${name.name} layer only`, c.line);
          else layers[name.name] = { node: c, paint: { ...paint } };
          continue;
        }
        if (c.children.some((k) => localName(k.tag) === "g" && layerName(k))) {
          warn("svg.layers", `a nameless <g> wraps the layers: unwrapped`, c.line);
          const p = { ...paint };
          containerPaint(c, "the wrapping <g>", p, "svg.layers", { wrapper: true });
          collect(c, p);
          continue;
        }
        err("svg.layers", `<g${attr(c, "id") ? ` id="${attr(c, "id")}"` : ""}> outside the layers: only the layers art, soft, xs (and guides) are allowed`, c.line);
        continue;
      }
      if (SKIPPED.has(tag)) {
        warn("svg.layers", `<${tag}> is ignored; better left out`, c.line);
        continue;
      }
      if (tag === "defs") {
        const fc = fullClips(c);
        if (c.children.length && !fc) err("svg.layers", `<defs> with content: gradients, symbols and clips aren't drawn on a stamp`, c.line);
        else if (c.children.length) note("svg.layers", `<defs> holds only a full-artboard clip; let go`, c.line);
        continue;
      }
      if (DRAWABLE.has(tag)) err("svg.layers", `<${tag}> outside the layers: everything is drawn inside <g id="art">, <g id="soft"> or <g id="xs">`, c.line);
      else err("svg.layers", `<${tag}> outside the layers: not allowed on a stamp`, c.line);
    }
  };
  collect(root, rootPaint);
  if (!layers.art) err("svg.layers", `no <g id="art">: the drawing goes there`);
  if (!layers.xs) err("svg.layers", `no <g id="xs">: the XS cut (1–2 white marks that stand for the stamp at 20×24) is required`);
  if (!layers.soft) note("svg.layers", `no <g id="soft"> (optional)`);

  /* the elements of each layer */
  const elements = { art: [], soft: [], xs: [] };
  for (const name of LAYERS) {
    const L = layers[name];
    if (!L) continue;
    const where = `<g id="${name}">`;
    containerPaint(L.node, where, L.paint, "svg.layers", { soft: name === "soft" });
    let index = 0;
    const readElement = (c, tag, paint) => {
      const idx = ++index;
      const label = describe(c, tag, idx);
      const at = `${name} ${label}`;
      const own = {};
      const geo = {};
      const { list, style } = attrEntries(c);
      if (style) warn("svg.elements", `${at}: style="${short(style)}" read like attributes (export presentation attributes)`, c.line);
      for (const [k, v] of list) {
        const cls = classifyAttr(tag, k, v);
        if (cls === "paint") own[k] = v.trim();
        else if (cls === "geometry") geo[k] = v;
        else if (cls?.refuse) err("svg.elements", `${at}: ${cls.refuse}`, c.line);
        else if (cls === "unknown") warn("svg.elements", `${at}: unknown attribute ${k}="${v}" (ignored)`, c.line);
      }
      for (const k of c.children) {
        if (SKIPPED.has(localName(k.tag))) warn("svg.elements", `${at}: a <${localName(k.tag)}> inside it is ignored`, k.line);
        else err("svg.elements", `${at} has a child element <${k.tag}>`, k.line);
      }
      if (c.text.trim()) err("svg.elements", `${at} holds text "${short(c.text)}"`, c.line);

      /* paint */
      const p = { ...paint, ...own };
      const fillsByDefault = p.fill === undefined;
      const filled = fillsByDefault || !isNone(p.fill);
      const stroked = p.stroke !== undefined && !isNone(p.stroke);
      const kind = filled && stroked ? "both" : filled ? "fill" : stroked ? "stroke" : "none";
      if (kind === "both") err("paint", `${at}: fill="${p.fill ?? "(missing = black)"}" and stroke="${p.stroke}" on one element; a mark is a fill OR a stroke, never both`, c.line);
      else if (kind === "none") err("paint", `${at}: fill="${p.fill}" and no stroke: it draws nothing`, c.line);
      else if (kind === "fill") {
        if (fillsByDefault) err("paint", `${at}: no fill attribute, so SVG paints it black; write fill="#FFFFFF" (or fill="none" with a white stroke)`, c.line);
        else if (!isWhite(p.fill)) err("paint", `${at}: fill="${p.fill}" is not white; every mark is #FFFFFF (the soft layer is tinted by code)`, c.line);
        const stray = ["stroke-width", "stroke-linecap", "stroke-linejoin"].filter((k) => own[k] !== undefined);
        if (stray.length) warn("paint", `${at}: a fill mark with ${stray.map((k) => `${k}="${own[k]}"`).join(" ")} (no stroke, so these do nothing)`, c.line);
      } else {
        const problems = [];
        if (!isWhite(p.stroke)) problems.push(`stroke="${p.stroke}" is not white`);
        const sw = p["stroke-width"];
        const m = sw === undefined ? null : NUM.exec(sw);
        if (sw === undefined) problems.push(`no stroke-width (SVG draws 1u); write stroke-width="4.31"`);
        else if (!m) problems.push(`stroke-width="${sw}" is not a number`);
        else if (Math.abs(Number(m[1]) - SPEC.stroke) > SPEC.strokeTol + 1e-9) problems.push(`stroke-width="${sw}" (the one weight is ${SPEC.stroke} ± ${SPEC.strokeTol})`);
        const cap = p["stroke-linecap"], join = p["stroke-linejoin"];
        if (cap !== "round") problems.push(cap === undefined ? `no stroke-linecap (SVG draws butt caps); write stroke-linecap="round"` : `stroke-linecap="${cap}" (want round)`);
        if (join !== "round") problems.push(join === undefined ? `no stroke-linejoin (SVG draws miter joins); write stroke-linejoin="round"` : `stroke-linejoin="${join}" (want round)`);
        if (fillsByDefault) problems.push(`no fill attribute, so SVG also fills it black; write fill="none"`);
        if (problems.length) err("paint", `${at}: ${problems.join("; ")}`, c.line);
      }

      /* geometry: path data, numbers, the device's reader */
      const el = { index: idx, layer: name, label, line: c.line, kind, d: null, segments: null };
      let d = null;
      try {
        d = elementData(tag, (k) => geo[k]);
        if (d === null) err("path.read", `${at}: <${tag}> has no size, draws nothing`, c.line);
      } catch (e) {
        err("path.read", `${at}: ${e.message}`, c.line);
      }
      if (d !== null) {
        const long = (GEOMETRY[tag] || []).flatMap((k) => (geo[k] === undefined ? [] : longNumbers(geo[k])));
        try {
          if (tag === "path" && long.length) {
            d = absPath(parsePath(d));
            warn("svg.numbers", `${at}: ${long.length} number${long.length > 1 ? "s" : ""} with more than ${SPEC.decimals} decimals or an exponent (${long.slice(0, 3).join(", ")}${long.length > 3 ? ", …" : ""}): rewritten in absolute commands to ${SPEC.decimals} decimals`, c.line);
          } else if (long.length) warn("svg.numbers", `${at}: ${long.length} number${long.length > 1 ? "s" : ""} with more than ${SPEC.decimals} decimals (${long.slice(0, 3).join(", ")}): written to ${SPEC.decimals}`, c.line);
          const art = toArtPath({ t: "p", d, f: kind === "stroke" ? "none" : "#FFFFFF", s: kind === "fill" ? undefined : "#FFFFFF", sw: kind === "fill" ? undefined : String(SPEC.stroke), lc: "round", lj: "round" });
          el.d = d;
          el.segments = art.segments;
        } catch (e) {
          err("path.read", `${at}: the device's path reader refuses it: ${e.message}`, c.line);
        }
      }
      elements[name].push(el);
    };
    const walk = (g, paint) => {
      if (g.text.trim()) err("svg.elements", `stray text "${short(g.text)}" in ${where}`, g.line);
      for (const c of g.children) {
        const tag = localName(c.tag);
        if (DRAWABLE.has(tag)) readElement(c, tag, paint);
        else if (tag === "g") {
          warn("svg.elements", `a <g> inside ${where} is flattened (a layer is a flat list of shapes)`, c.line);
          const p = { ...paint };
          containerPaint(c, `a <g> in ${where}`, p, "svg.elements");
          walk(c, p);
        } else if (SKIPPED.has(tag)) warn("svg.elements", `<${tag}> in ${where} is ignored; better left out`, c.line);
        else err("svg.elements", `<${tag}> in ${where}: ${FORBIDDEN.has(tag) ? "not allowed on a stamp" : "not a plain shape"} (path circle ellipse rect line polyline polygon only)`, c.line);
      }
    };
    walk(L.node, L.paint);
    if (name === "soft") {
      const op = attrEntries(L.node).list.filter(([k]) => k === "opacity" || k === "fill-opacity");
      if (!op.length) {
        if (elements.soft.length) warn("svg.layers", `<g id="soft"> has no opacity="0.55": the file previews its marks full white (the app tints the layer anyway)`, L.node.line);
      } else
        for (const [k, v] of op) {
          if (Math.abs(Number(v) - SPEC.softOpacity) > 1e-9) warn("svg.layers", `<g id="soft" ${k}="${v}">: write opacity="0.55" (the app tints the layer with mix(hex, white, 0.55) whatever the file says)`, L.node.line);
          else if (k === "fill-opacity") warn("svg.layers", `<g id="soft" fill-opacity="0.55">: write opacity="0.55" (fill-opacity leaves stroke marks at full white; the importer reads the layer's role either way)`, L.node.line);
        }
    }
    if (!elements[name].length) {
      if (name === "soft") note("svg.layers", `<g id="soft"> is empty (harmless)`, L.node.line);
      else err("svg.layers", `<g id="${name}"> is empty`, L.node.line);
    }
  }

  /* geometry */
  const byLayer = {};
  for (const name of LAYERS) {
    if (!layers[name]) continue;
    const atoms = buildAtoms(elements[name]);
    const marks = buildMarks(atoms);
    byLayer[name] = { atoms, marks, inkBox: marks.length ? unionBox(marks.map((m) => m.inkBox)) : null };
    (measures.marks ??= {})[name] = marks.length;
  }

  // safe area
  for (const [k, v] of Object.entries(byLayer)) {
    const S = SPEC.safe;
    for (const m of v.marks) {
      const b = m.inkBox;
      const out = [];
      if (b.x0 < S.x0 - EPS) out.push(`left by ${f2(S.x0 - b.x0)}`);
      if (b.x1 > S.x1 + EPS) out.push(`right by ${f2(b.x1 - S.x1)}`);
      if (b.y0 < S.y0 - EPS) out.push(`top by ${f2(S.y0 - b.y0)}`);
      if (b.y1 > S.y1 + EPS) out.push(`bottom by ${f2(b.y1 - S.y1)}`);
      if (out.length) err("safe.area", `${k} ${m.name} leaves the safe area ${out.join(", ")}: ink ${boxStr(b)} (safe x ${S.x0}–${S.x1}, y ${S.y0}–${S.y1}, stroke width included)`);
    }
  }

  // art: marks, key shape, clear space, thinness, inner gaps
  const art = byLayer.art;
  if (art) {
    const n = art.marks.length;
    const list = art.marks.map((m) => `${m.n}:${m.kind} ${f2(m.w)}×${f2(m.h)}`).join(", ");
    if (n < SPEC.artMarks[0]) err("art.marks", `art draws nothing readable`);
    else if (n > SPEC.artMarks[1]) err("art.marks", `${n} separate marks in art (at most ${SPEC.artMarks[1]}): ${list}`);
    if (n) {
      const key = art.marks.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
      const B = SPEC.motif;
      const ix = Math.max(0, Math.min(key.inkBox.x1, B.x1) - Math.max(key.inkBox.x0, B.x0));
      const iy = Math.max(0, Math.min(key.inkBox.y1, B.y1) - Math.max(key.inkBox.y0, B.y0));
      const share = key.w * key.h > 0 ? (ix * iy) / (key.w * key.h) : 0;
      measures.key = r2(share);
      if (ix <= 0 || iy <= 0) err("motif.key", `the key shape (${key.name}, ${boxStr(key.inkBox)}) does not touch the motif box x ${B.x0}–${B.x1} y ${B.y0}–${B.y1}`);
      else if (share < 0.5) warn("motif.key", `the key shape (${key.name}) is only ${Math.round(share * 100)}% inside the motif box x ${B.x0}–${B.x1} y ${B.y0}–${B.y1}: ${boxStr(key.inkBox)}`);
    }
    const soft = byLayer.soft ?? { marks: [] };
    const all = [...art.marks.map((m) => ({ m, layer: "art" })), ...soft.marks.map((m) => ({ m, layer: "soft" }))];
    let worst = null;
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const A = all[i], B2 = all[j];
        const c = markClearance(A.m, B2.m);
        const pair = `${A.layer} ${A.m.name} ↔ ${B2.layer} ${B2.m.name}`;
        if (c.clear <= SPEC.touch) {
          if (A.layer !== B2.layer) warn("art.clear", `${pair} touch or overlap (${f2(c.clear)}): the tint would draw over the white; separate them by ≥ ${SPEC.clearArt}u or make it one white mark`);
          continue;
        }
        if (!worst || c.clear < worst) worst = c.clear;
        if (c.clear < SPEC.clearArt - EPS) err("art.clear", `${pair}: ${f2(c.clear)}u clear (need ${SPEC.clearArt}; at S 25 wide that is ${f2(c.clear / 4)}pt) near (${f2(c.p?.[0])}, ${f2(c.p?.[1])})`);
      }
    }
    if (worst !== null) measures.clearMin = r2(worst);
    for (const a of [...art.atoms, ...(byLayer.soft?.atoms ?? [])]) {
      const where = `${a.el.layer} ${a.el.label}${a.k ? ` subpath ${a.k + 1}` : ""}`;
      if (a.kind === "fill") {
        const mw = minWidth(ringOf(a.sub));
        if (mw < SPEC.fillMin - EPS) err("art.thin", `${where}: a fill only ${f2(mw)}u across at its narrowest overall (need ${SPEC.fillMin}; the stroke weight is ${SPEC.stroke})`, a.el.line);
      } else if (a.length < SPEC.stroke) note("art.thin", `${where}: a ${f2(a.length)}u stroke reads as a dot of ${f2(SPEC.stroke + a.length)}u`, a.el.line);
    }
    for (const el of elements.art) {
      if (el.kind !== "stroke" || !el.segments) continue;
      const subs = art.atoms.filter((a) => a.el === el).map((a) => a.sub);
      const g = innerGapUpTo(subs, SPEC.stroke, SPEC.clearArt);
      if (g && g.gap < SPEC.clearArt - EPS) warn("art.inner", `art ${el.label}: the stroke faces itself with ${f2(g.gap)}u between the inks near (${f2(g.p[0])}, ${f2(g.p[1])}) (under ${SPEC.clearArt}u, it closes up at S)`, el.line);
    }
  }

  // soft
  const dropAtS = new Set();
  if (byLayer.soft) {
    const s = byLayer.soft;
    if (s.marks.length > SPEC.softMax) warn("soft.use", `${s.marks.length} soft marks: the soft layer is for a few small secondary marks (at most ${SPEC.softMax})`);
    for (const m of s.marks) {
      const area = m.w * m.h;
      if (area >= SPEC.softKeyArea) warn("soft.use", `soft ${m.name} is key-shape sized (${f2(m.w)}×${f2(m.h)} = ${Math.round(area)}u², from ${SPEC.softKeyArea} a shape is a main shape): main shapes are white`);
    }
    const drop = s.marks.filter((m) => Math.max(m.w, m.h) < SPEC.softDropS);
    for (const m of drop) for (const i of m.els) dropAtS.add(i);
    if (drop.length) note("soft.use", `at S the soft mark${drop.length > 1 ? "s" : ""} ${drop.map((m) => `${m.n} (${f2(m.w)}×${f2(m.h)})`).join(", ")} drop${drop.length > 1 ? "" : "s"} (dropAtS: tint accents under ${SPEC.softDropS}u are left out at S)`);
    measures.dropAtS = drop.length;
  }

  // xs
  const xs = byLayer.xs;
  if (xs) {
    const n = xs.marks.length;
    if (n < SPEC.xsMarks[0]) err("xs.marks", `the xs cut draws nothing readable`);
    else if (n > SPEC.xsMarks[1]) err("xs.marks", `${n} separate marks in xs (1–2 only): ${xs.marks.map((m) => `${m.n}:${m.kind} ${f2(m.w)}×${f2(m.h)}`).join(", ")}`);
    for (const a of xs.atoms) {
      const where = `xs ${a.el.label}${a.k ? ` subpath ${a.k + 1}` : ""}`;
      if (a.kind === "stroke") {
        if (a.length < SPEC.xsFeature - EPS) err("xs.size", `${where}: a ${f2(a.length)}u stroke (every xs stroke ≥ ${SPEC.xsFeature}u long)`, a.el.line);
      } else {
        const b = bboxOfPolys([ringOf(a.sub)]);
        const w = b.x1 - b.x0, h = b.y1 - b.y0;
        const mw = minWidth(ringOf(a.sub));
        if (w < SPEC.xsFeature - EPS || h < SPEC.xsFeature - EPS) err("xs.size", `${where}: a fill ${f2(w)}×${f2(h)}u (every xs fill ≥ ${SPEC.xsFeature}u in both dimensions)`, a.el.line);
        else if (mw < SPEC.xsFeature - EPS) err("xs.size", `${where}: a fill only ${f2(mw)}u across at its narrowest overall (every xs feature ≥ ${SPEC.xsFeature}u)`, a.el.line);
      }
    }
    if (xs.marks.length === 2) {
      const c = markClearance(xs.marks[0], xs.marks[1]);
      measures.xsClear = r2(c.clear);
      if (c.clear < SPEC.clearXs - EPS) err("xs.clear", `xs marks 1 ↔ 2: ${f2(c.clear)}u clear (need ${SPEC.clearXs}; at 20 wide that is ${f2(c.clear / 5)}pt)`);
    }
    for (const el of elements.xs) {
      if (el.kind !== "stroke" || !el.segments) continue;
      const subs = xs.atoms.filter((a) => a.el === el).map((a) => a.sub);
      const g = innerGapUpTo(subs, SPEC.stroke, SPEC.clearXs);
      if (g && g.gap < SPEC.clearXs - EPS) warn("xs.inner", `xs ${el.label}: the stroke faces itself with ${f2(g.gap)}u between the inks near (${f2(g.p[0])}, ${f2(g.p[1])}) (under ${SPEC.clearXs}u, it closes up at 20×24)`, el.line);
    }
  }

  // colour (info)
  if (stamp) {
    const c = contrast("#FFFFFF", stamp.color);
    measures.white = r2(c);
    if (c < 3) warn("colour", `white on ${stamp.color} is only ${c.toFixed(2)}:1`);
    measures.softHex = mix(stamp.color, "#FFFFFF", 0.55);
    measures.groundHex = mix(stamp.color, "#FFFFFF", 0.2);
  }

  /* the marks as written out */
  const out = { art: [], soft: [], xs: [] };
  for (const name of LAYERS) {
    for (const el of elements[name]) {
      if (!el.d || (el.kind !== "fill" && el.kind !== "stroke")) continue;
      const p = { d: el.d, kind: el.kind };
      if (name === "soft" && dropAtS.has(el.index)) p.dropAtS = true;
      out[name].push(p);
    }
  }
  for (const p of [...out.art, ...out.soft, ...out.xs]) {
    const long = longNumbers(p.d);
    if (long.length) err("svg.numbers", `internal: a written path still holds ${long.join(", ")}`);
  }
  return done(out);
}

/* ── the whole set ───────────────────────────────────────────────────────── */

const distance = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};

/** The SVG files a delivery folder holds: name → text (no "_" or "." names, no folders). */
export function readFolder(dir = DIR) {
  const files = new Map();
  for (const name of readdirSync(dir).sort()) {
    if (!name.toLowerCase().endsWith(".svg") || name.startsWith("_") || name.startsWith(".")) continue;
    const url = new URL(name, dir);
    if (!statSync(url).isFile()) continue;
    files.set(name, readFileSync(url, "utf8"));
  }
  return files;
}

/** Checks every file against the 36. Returns { results: [{ stamp, file, status: "ok" | "rejected"
    | "missing", check }], unexpected: [{ name, suggestion }], ts }. */
export function importSet(files, set) {
  const results = set.stamps.map((stamp) => {
    const file = `${stamp.id}.svg`;
    if (!files.has(file)) return { stamp, file, status: "missing", check: null };
    const check = checkStamp(files.get(file), stamp);
    return { stamp, file, status: check.status, check };
  });
  const expected = set.stamps.map((s) => `${s.id}.svg`);
  const unexpected = [...files.keys()]
    .filter((name) => !expected.includes(name))
    .map((name) => {
      let suggestion = null;
      let best = Infinity;
      for (const e of expected) {
        const d = distance(name.toLowerCase(), e);
        if (d < best) {
          best = d;
          suggestion = e;
        }
      }
      return { name, suggestion: best <= 3 ? suggestion : null };
    });
  return { results, unexpected, ts: buildTs(results) };
}

function wrapList(lead, names, width = 100, indent = "   ") {
  const lines = [];
  let line = `${indent}${lead}`;
  names.forEach((n, k) => {
    const piece = `${n}${k === names.length - 1 ? "." : ","}`;
    if ((line + " " + piece).length > width) {
      lines.push(line);
      line = `${indent}  ${piece}`;
    } else line += ` ${piece}`;
  });
  lines.push(line);
  return lines;
}

/* The two outputs share these: the head comment's tally of what was imported, and one line per
   stamp ("id": { art, soft, xs },) in stamps.ts order. Both files are built from them, so the
   app's stamp-art-v2.ts and the web's stamp-art-v2.js carry the same marks character for
   character. */

/** "Imported: n of 36 — …", "Not delivered yet: …", "Rejected by the checks: …" (head comment lines). */
function importTally(results) {
  const ok = results.filter((r) => r.status === "ok");
  const missing = results.filter((r) => r.status === "missing").map((r) => r.stamp.id);
  const rejected = results.filter((r) => r.status === "rejected").map((r) => r.stamp.id);
  const L = [];
  if (ok.length) L.push(...wrapList(`Imported: ${ok.length} of ${results.length} —`, ok.map((r) => r.stamp.id)));
  else L.push(`   Imported: none of ${results.length}.`);
  if (missing.length) L.push(...wrapList(`Not delivered yet: ${missing.length} —`, missing));
  else L.push("   Not delivered yet: none.");
  if (rejected.length) L.push(...wrapList(`Rejected by the checks (run the importer for its report): ${rejected.length} —`, rejected));
  else L.push("   Rejected by the checks: none.");
  return L;
}

/** one `  "id": {"art":[…],"soft":[…],"xs":[…]},` line per stamp; no marks for a missing or rejected one */
function artLines(results) {
  return results.map((r) => {
    const a = r.status === "ok" ? r.check.art : { art: [], soft: [], xs: [] };
    return `  ${JSON.stringify(r.stamp.id)}: ${JSON.stringify({ art: a.art, soft: a.soft, xs: a.xs })},`;
  });
}

/** src/data/stamp-art-v2.ts for a set of results. */
export function buildTs(results) {
  const L = [];
  L.push("/* AUTO-GENERATED from design/stamps-v2 by scripts/import-stamp-art.mjs — do not edit.");
  L.push("   After the drawings change, run: node scripts/import-stamp-art.mjs");
  L.push("");
  L.push("   Stamps v2 (the owner-approved set, 2026-10-18): each stamp's white marks on the 100 × 120 box");
  L.push("   (5:6), inside the safe area x 18–82 y 18–102 of the window x 10–90 y 10–110. No colour here:");
  L.push("   art and xs marks are #FFFFFF, soft marks softHex(hex) = mix(hex, #FFFFFF, 0.55), the field the");
  L.push("   stamp's hex (src/data/stamps.ts); strokes are 4.31u, round caps and joins, never under the");
  L.push("   tier's minimum (src/lib/stamp-frame.ts strokeU). The frame (paper, bites, ground, keyline,");
  L.push("   tilt) is src/lib/stamp-frame.ts.");
  L.push("     art   from S up, clipped to the window; drawn last, over the soft plate (where the two");
  L.push("           touch, the white stays on top, as the file previews it);");
  L.push("     soft  from S up, under the art; at S leave out the paths with dropAtS (tint accents under 10u);");
  L.push("     xs    the 20×24 cut, alone, over the whole silhouette (XS only).");
  L.push("   A stamp with no marks here (not delivered, or rejected by the checks) is drawn as the template");
  L.push("   in its own hex with no motif (stamp-spec §2.11's fallback chain).");
  L.push("");
  L.push(...importTally(results));
  L[L.length - 1] += " */";
  L.push("");
  L.push("export type StampId =");
  results.forEach((r, i) => L.push(`  | ${JSON.stringify(r.stamp.id)}${i === results.length - 1 ? ";" : ""}`));
  L.push("");
  L.push('export type ArtPath = { d: string; kind: "fill" | "stroke"; dropAtS?: true };');
  L.push("export type StampArtV2 = { art: ArtPath[]; soft: ArtPath[]; xs: ArtPath[] };");
  L.push("");
  L.push("export const STAMP_ART_V2: Record<StampId, StampArtV2> = {");
  L.push(...artLines(results));
  L.push("};");
  return L.join("\n") + "\n";
}

/** The web's app/stamp-art-v2.js for a set of results: the same STAMP_ART_V2 as buildTs, as a plain
    ES module (the web has no TypeScript; the shape is JSDoc). Its head names the web's own files. */
export function buildWebJs(results) {
  const L = [];
  L.push("/* AUTO-GENERATED from kindredly-ios design/stamps-v2 by kindredly-ios scripts/import-stamp-art.mjs");
  L.push("   — do not edit. After the drawings change, run in kindredly-ios:");
  L.push('     node scripts/import-stamp-art.mjs --web "<this repo>/app/stamp-art-v2.js"');
  L.push("   (it writes the app's src/data/stamp-art-v2.ts in the same run, from the same results, so the");
  L.push("   app and the web always carry the same marks).");
  L.push("");
  L.push("   Stamps v2 (the owner-approved set, 2026-10-18): each stamp's white marks on the 100 × 120 box");
  L.push("   (5:6), inside the safe area x 18–82 y 18–102 of the window x 10–90 y 10–110. No colour here:");
  L.push("   art and xs marks are #FFFFFF, soft marks softHex(hex) = mix(hex, #FFFFFF, 0.55), the field the");
  L.push("   stamp's hex (app/system.js STAMPS); strokes are 4.31u, round caps and joins, never under the");
  L.push("   tier's minimum (app/engine/stamp-frame.js strokeU). The frame (paper, bites, ground, keyline,");
  L.push("   tilt) is app/engine/stamp-frame.js, a line-for-line port of the app's");
  L.push("   src/lib/stamp-frame.ts; app/engine/stamp-svg.js draws frame and marks together (stampSVG for");
  L.push("   the DOM, StampTile in app/engine/wren-react.jsx for React).");
  L.push("     art   from S up, clipped to the window; drawn last, over the soft plate (where the two");
  L.push("           touch, the white stays on top, as the file previews it);");
  L.push("     soft  from S up, under the art; at S leave out the paths with dropAtS (tint accents under 10u);");
  L.push("     xs    the 20×24 cut, alone, over the whole silhouette (XS only).");
  L.push("   A stamp with no marks here (not delivered, or rejected by the checks) is drawn as the template");
  L.push("   in its own hex with no motif (stamp-spec §2.11's fallback chain).");
  L.push("");
  L.push(...importTally(results));
  L[L.length - 1] += " */";
  L.push("");
  L.push('/** @typedef {{ d: string, kind: "fill" | "stroke", dropAtS?: true }} ArtPath */');
  L.push("/** @typedef {{ art: ArtPath[], soft: ArtPath[], xs: ArtPath[] }} StampArtV2 */");
  L.push("");
  L.push("/** @type {Record<string, StampArtV2>} */");
  L.push("export const STAMP_ART_V2 = {");
  L.push(...artLines(results));
  L.push("};");
  return L.join("\n") + "\n";
}

/* ── the report ──────────────────────────────────────────────────────────── */

export function formatReport({ results, unexpected }) {
  const out = [];
  const ok = results.filter((r) => r.status === "ok").length;
  const rejected = results.filter((r) => r.status === "rejected").length;
  const missing = results.filter((r) => r.status === "missing");
  out.push(`design/stamps-v2: ${ok} of ${results.length} stamps imported, ${rejected} rejected, ${missing.length} not delivered yet`);
  out.push(`rules: box 100×120 · safe x 18–82 y 18–102 (ink incl. stroke) · motif box x 19–81 y 27–89 · stroke ${SPEC.stroke}±${SPEC.strokeTol} round/round · art 1–${SPEC.artMarks[1]} marks, clear ≥ ${SPEC.clearArt} · fills ≥ ${SPEC.fillMin} across · xs 1–2 marks, features ≥ ${SPEC.xsFeature}, clear ≥ ${SPEC.clearXs}`);
  out.push("");
  const pad = Math.max(...results.map((r) => r.file.length));
  const msg = (kind, m) => `      ${kind}  ${m.rule.padEnd(12)} ${m.line ? `line ${m.line}: ` : ""}${m.text}`;
  const byRule = {};
  for (const r of results) {
    if (r.status === "missing") continue;
    const c = r.check;
    const M = c.measures;
    const bits = [];
    for (const k of LAYERS) if (M.marks?.[k] !== undefined) bits.push(`${k} ${M.marks[k]} mark${M.marks[k] === 1 ? "" : "s"}`);
    if (M.key !== undefined) bits.push(`key ${Math.round(M.key * 100)}% in motif box`);
    if (M.clearMin !== undefined) bits.push(`clear ≥ ${f2(M.clearMin)}`);
    if (M.xsClear !== undefined) bits.push(`xs clear ${f2(M.xsClear)}`);
    if (M.white !== undefined) bits.push(`white ${M.white.toFixed(2)}:1`);
    const tally = `${c.errors.length} error${c.errors.length === 1 ? "" : "s"}, ${c.warnings.length} warning${c.warnings.length === 1 ? "" : "s"}`;
    if (r.status === "ok") out.push(`  ok        ${r.file.padEnd(pad)}  ${bits.join(" · ")} · ${tally}`);
    else out.push(`  REJECTED  ${r.file.padEnd(pad)}  ${tally}; written with no marks, the app draws the template in its hex`);
    for (const e of c.errors) out.push(msg("error", e));
    for (const w of c.warnings) {
      out.push(msg("warn ", w));
      byRule[w.rule] = (byRule[w.rule] ?? 0) + 1;
    }
    for (const n of c.notes) out.push(msg("note ", n));
  }
  if (missing.length) {
    out.push("");
    out.push(...wrapList(`not delivered yet (${missing.length}; written with no marks):`, missing.map((r) => r.file), 100, "  "));
  }
  for (const u of unexpected) {
    out.push("");
    out.push(`  not imported: ${u.name}: no stamp is named that${u.suggestion ? ` (did you mean ${u.suggestion}?)` : ""}; names are <id>.svg as in src/data/stamps.ts`);
  }
  const rules = Object.entries(byRule).map(([k, n]) => `${k} ×${n}`);
  out.push("");
  out.push(`warnings: ${rules.length ? `${Object.values(byRule).reduce((a, b) => a + b, 0)} (${rules.join(", ")})` : "none"}`);
  return out.join("\n");
}

/* ── the command line ────────────────────────────────────────────────────── */

function main() {
  const CHECK = process.argv.includes("--check");
  /* --web <path>: the web's copy too. The path must follow the flag and not be another flag; an
     empty one stops here, before anything is read or written. */
  const webAt = process.argv.indexOf("--web");
  let WEB = null;
  if (webAt >= 0) {
    const p = process.argv[webAt + 1];
    if (!p || !p.trim() || p.startsWith("--")) {
      console.error('import-stamp-art: --web needs the path of the web\'s module, e.g. --web "<web repo>/app/stamp-art-v2.js"');
      process.exit(1);
    }
    WEB = resolve(p);
  }
  let set;
  try {
    set = importSet(readFolder(DIR), readStamps(readFileSync(STAMPS, "utf8")));
  } catch (e) {
    console.error(`import-stamp-art: ${e.message}`);
    process.exit(1);
  }
  const web = WEB ? buildWebJs(set.results) : null;
  const report = formatReport(set);
  const bad = set.results.some((r) => r.status === "rejected") || set.unexpected.length > 0;
  if (CHECK) {
    let current = "";
    try {
      current = readFileSync(OUT, "utf8");
    } catch {
      console.error(`import-stamp-art: ${OUT.pathname} does not exist; run node scripts/import-stamp-art.mjs`);
      process.exit(1);
    }
    if (current !== set.ts) {
      console.error(report);
      console.error("\nimport-stamp-art: stamp-art-v2.ts is out of date with design/stamps-v2; run node scripts/import-stamp-art.mjs");
      process.exit(1);
    }
    if (WEB) {
      let onWeb = null;
      try {
        onWeb = readFileSync(WEB, "utf8");
      } catch {
        onWeb = null;
      }
      if (onWeb !== web) {
        console.error(`import-stamp-art: ${WEB} is ${onWeb === null ? "missing" : "out of date with design/stamps-v2"}; run node scripts/import-stamp-art.mjs --web "${WEB}"`);
        process.exit(1);
      }
    }
    if (bad) console.warn(report + "\n");
    console.log(`stamp-art-v2.ts${WEB ? " and the web's copy are" : " is"} up to date (${set.results.filter((r) => r.status === "ok").length} of ${set.results.length} stamps)`);
    return;
  }
  console.log(report);
  writeFileSync(OUT, set.ts);
  console.log(`\nwrote ${OUT.pathname}`);
  if (WEB) {
    writeFileSync(WEB, web);
    console.log(`wrote ${WEB}`);
  }
  if (bad) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
