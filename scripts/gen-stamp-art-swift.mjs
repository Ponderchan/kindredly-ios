// node scripts/gen-stamp-art-swift.mjs            write the Swift copy of the stamp art
// node scripts/gen-stamp-art-swift.mjs --check    exit 1 if the Swift copy is out of date
//
// Writes modules/kindredly-ui/ios/Portable/Kit/KStampArtData.swift (the 10a overhaul, step 5)
// from two files the React Native app already draws from:
//   - src/data/stamp-art.ts: each stamp's drawing on a 64 grid, as a flat list of SVG shapes
//     (StampTile draws it through ArtShapes into react-native-svg);
//   - src/data/stamps.ts: which stamp ids exist, in which order, and each stamp's own colour
//     (the backend's vocabulary: letters.stamp stores these ids).
// KStampArt (Kit/KStampArt.swift) draws the generated table with SwiftUI, so a stamp is drawn
// from the same path data on both sides and changes in one place: the design set, then
// stamp-art.ts, then this script. The generated file imports SwiftUI only, like every Portable
// file, so the pure-Swift app planned for 1.1.0 can take it as it is.
//
// What it copies. The path data goes over verbatim and is read on the device by the module's
// SVG reader (KSVGPath in Kit/KLineGlyph.swift: M L H V C S Q T A Z, absolute and relative,
// arcs as cubic Béziers). This script reads every path with the same grammar first (parsePath
// below, exported for the test), so nothing reaches Swift that the reader would cut short.
// Circles, ellipses and rects, which ArtShapes also draws, become path data here. Paint comes
// over as fill and stroke colours (#RRGGBB, #RRGGBBAA, #RGB or none; RGBA packed in a UInt32),
// stroke width, line cap and join, and the dash array (the frames' perforation, "0.5 5", and
// dashes, "3 5"). Stamps keep their own colours in every theme: they are content, not chrome.
//
// What it refuses. A shape it can't read exactly (path data the grammar rejects, a transform,
// an opacity, a colour that isn't hex, an attribute it doesn't know) is never drawn half right:
// the whole stamp is written as a tinted tile instead (KStampArtEntry paths: nil), the tile
// StampTile itself falls back to, and the script names it and says why. A stamp with no art is
// a tile too. Today every one of the 36 is read.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const ART = new URL("../src/data/stamp-art.ts", import.meta.url);
export const LIST = new URL("../src/data/stamps.ts", import.meta.url);
export const TILE = new URL("../src/components/StampTile.tsx", import.meta.url);
export const OUT = new URL("../modules/kindredly-ui/ios/Portable/Kit/KStampArtData.swift", import.meta.url);

/** The grid stamp-art.ts draws on (StampTile: viewBox="0 0 64 64"). */
export const GRID = 64;

/* ── reading the sources ─────────────────────────────────────────────────── */

/** STAMP_ART from stamp-art.ts: a generated file whose table is one JSON object on one line. */
export function readArt(text) {
  const m = /^export const STAMP_ART\s*:[^=]*=\s*(\{.*\});?\s*$/m.exec(text);
  if (!m) throw new Error("stamp-art.ts: no `export const STAMP_ART: … = {…};` line");
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    throw new Error(`stamp-art.ts: STAMP_ART is not plain JSON (${e.message})`);
  }
}

/** The stamps and their categories from stamps.ts, in its order. */
export function readStamps(text) {
  const block = (name) => {
    const start = text.indexOf(`export const ${name}`);
    const end = start < 0 ? -1 : text.indexOf("\n];", start);
    if (start < 0 || end < 0) throw new Error(`stamps.ts: no ${name} array`);
    return text.slice(start, end);
  };
  const cats = [...block("STAMP_CATEGORIES").matchAll(/\{ id: "([^"]+)", emoji: "[^"]*", color: "(#[0-9A-Fa-f]{6})", name: \{ en: "([^"]+)"/g)].map(
    ([, id, color, name]) => ({ id, color, name }),
  );
  const stamps = [...block("STAMPS").matchAll(/\{ id: "([^"]+)", cat: "([^"]+)", emoji: "[^"]*", color: "(#[0-9A-Fa-f]{6})"/g)].map(([, id, cat, color]) => ({
    id,
    cat,
    color,
  }));
  if (!stamps.length) throw new Error("stamps.ts: no stamps read from STAMPS");
  if (new Set(stamps.map((s) => s.id)).size !== stamps.length) throw new Error("stamps.ts: a stamp id is listed twice");
  return { cats, stamps };
}

/** The colour StampTile gives an id it has no stamp for. */
export function readUnknownTint(text) {
  const m = /const col = s \? s\.color : "(#[0-9A-Fa-f]{6})"/.exec(text);
  if (!m) throw new Error("StampTile.tsx: no fallback colour (`const col = s ? s.color : \"#…\"`)");
  return m[1];
}

export function readSources() {
  return {
    art: readArt(readFileSync(ART, "utf8")),
    ...readStamps(readFileSync(LIST, "utf8")),
    unknownTint: readUnknownTint(readFileSync(TILE, "utf8")),
  };
}

/* ── the path-data reader ────────────────────────────────────────────────── */

/*
 SVG path data, read the way KSVGPath reads it on the device (Kit/KLineGlyph.swift), but
 strictly: KSVGPath stops at the first thing it can't read and draws what came before, this
 throws, so a path that passes here is read to its end there.

 Commands M L H V C S Q T A Z, capital = absolute, lower case = relative to the current point.
 Numbers: an optional sign, digits with at most one decimal point (".5" and "5." too), then an
 exponent only when digits follow it; a sign or a second point starts the next number ("1-8",
 "2.6.5"). Separators are whitespace and commas. A command repeats while numbers follow, and
 extra pairs after M are line-tos. Arc flags are one character, 0 or 1, and may run straight
 into the next number. Data must start with M or m, and numbers can't follow Z.

 Returns the path in absolute moves, lines, quadratic and cubic curves and closes:
   { op: "M" | "L", p: [x, y] }, { op: "Q", p: [cx, cy, x, y] },
   { op: "C", p: [c1x, c1y, c2x, c2y, x, y] }, { op: "Z" }
 H and V become lines, S and T their curves with the reflected control point, and arcs cubic
 curves of at most a quarter turn each (SVG implementation notes F.6.5-F.6.6, as KSVGPath).
*/
const COMMANDS = "MmLlHhVvCcSsQqTtAaZz";
const NUMBER = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
const SEPARATOR = /[\s,]/;

export function parsePath(d) {
  if (typeof d !== "string") throw new Error("no path data");
  const n = d.length;
  let i = 0;
  const where = () => `at ${i} in "${d.length > 60 ? d.slice(0, 57) + "…" : d}"`;
  const skip = () => {
    while (i < n && SEPARATOR.test(d[i])) i++;
  };
  const num = (what) => {
    skip();
    NUMBER.lastIndex = i;
    const m = NUMBER.exec(d);
    if (!m) throw new Error(`${what} expected ${where()}`);
    i = NUMBER.lastIndex;
    const v = Number(m[0]);
    if (!Number.isFinite(v)) throw new Error(`${what} is not a finite number ${where()}`);
    return v;
  };
  const flag = (what) => {
    skip();
    if (d[i] === "0" || d[i] === "1") return d[i++] === "1";
    throw new Error(`${what} flag (0 or 1) expected ${where()}`);
  };

  const out = [];
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let lastCubic = null; // the last C/S curve's second control point, for S
  let lastQuad = null; // the last Q/T curve's control point, for T
  let cmd = null;

  for (;;) {
    skip();
    if (i >= n) break;
    const c = d[i];
    if (/[A-Za-z]/.test(c)) {
      if (!COMMANDS.includes(c)) throw new Error(`unknown command "${c}" ${where()}`);
      cmd = c;
      i++;
    } else if (cmd === null || cmd === "Z" || cmd === "z") {
      throw new Error(`a number with no command to repeat ${where()}`);
    }
    if (!out.length && cmd !== "M" && cmd !== "m") throw new Error(`path data must start with M ${where()}`);
    const rel = cmd >= "a";
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    let cubic = null;
    let quad = null;

    switch (cmd.toLowerCase()) {
      case "m": {
        x = ox + num("x");
        y = oy + num("y");
        startX = x;
        startY = y;
        out.push({ op: "M", p: [x, y] });
        cmd = rel ? "l" : "L"; // further pairs are line-tos of the same case
        break;
      }
      case "l": {
        x = ox + num("x");
        y = oy + num("y");
        out.push({ op: "L", p: [x, y] });
        break;
      }
      case "h": {
        x = ox + num("x");
        out.push({ op: "L", p: [x, y] });
        break;
      }
      case "v": {
        y = oy + num("y");
        out.push({ op: "L", p: [x, y] });
        break;
      }
      case "c": {
        const x1 = ox + num("x1");
        const y1 = oy + num("y1");
        const x2 = ox + num("x2");
        const y2 = oy + num("y2");
        x = ox + num("x");
        y = oy + num("y");
        out.push({ op: "C", p: [x1, y1, x2, y2, x, y] });
        cubic = [x2, y2];
        break;
      }
      case "s": {
        const [x1, y1] = lastCubic ? [2 * x - lastCubic[0], 2 * y - lastCubic[1]] : [x, y];
        const x2 = ox + num("x2");
        const y2 = oy + num("y2");
        x = ox + num("x");
        y = oy + num("y");
        out.push({ op: "C", p: [x1, y1, x2, y2, x, y] });
        cubic = [x2, y2];
        break;
      }
      case "q": {
        const x1 = ox + num("x1");
        const y1 = oy + num("y1");
        x = ox + num("x");
        y = oy + num("y");
        out.push({ op: "Q", p: [x1, y1, x, y] });
        quad = [x1, y1];
        break;
      }
      case "t": {
        const [x1, y1] = lastQuad ? [2 * x - lastQuad[0], 2 * y - lastQuad[1]] : [x, y];
        x = ox + num("x");
        y = oy + num("y");
        out.push({ op: "Q", p: [x1, y1, x, y] });
        quad = [x1, y1];
        break;
      }
      case "a": {
        const rx = num("rx");
        const ry = num("ry");
        const rotation = num("x-axis-rotation");
        const large = flag("large-arc");
        const sweep = flag("sweep");
        const ex = ox + num("x");
        const ey = oy + num("y");
        out.push(...arcToCurves(x, y, rx, ry, rotation, large, sweep, ex, ey));
        x = ex;
        y = ey;
        break;
      }
      case "z": {
        out.push({ op: "Z" });
        x = startX;
        y = startY;
        break;
      }
    }
    lastCubic = cubic;
    lastQuad = quad;
  }
  if (!out.length) throw new Error("empty path data");
  return out;
}

/** An SVG elliptical arc from (x0, y0) to (x, y) as cubic curves, as KSVGPath.addArc draws it. */
export function arcToCurves(x0, y0, rx0, ry0, degrees, large, sweep, x, y) {
  if (x0 === x && y0 === y) return []; // F.6.2: the same end points draw nothing
  let rx = Math.abs(rx0);
  let ry = Math.abs(ry0);
  if (rx === 0 || ry === 0) return [{ op: "L", p: [x, y] }]; // F.6.2: a radius of 0 is a line
  const phi = (degrees * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  // F.6.5.1: the start point in the ellipse's own frame, centred between the two ends
  const dx = (x0 - x) / 2;
  const dy = (y0 - y) / 2;
  const x1 = cosPhi * dx + sinPhi * dy;
  const y1 = -sinPhi * dx + cosPhi * dy;
  // F.6.6: radii too small to reach are scaled up just enough
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  // F.6.5.2: the centre in that frame
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const coef = den > 0 ? (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den)) : 0;
  const cx1 = coef * ((rx * y1) / ry);
  const cy1 = coef * ((-ry * x1) / rx);
  // F.6.5.3: back to the drawing's frame
  const cx = cosPhi * cx1 - sinPhi * cy1 + (x0 + x) / 2;
  const cy = sinPhi * cx1 + cosPhi * cy1 + (y0 + y) / 2;
  // F.6.5.5-6: the start angle and the sweep
  const angle = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const ux = (x1 - cx1) / rx;
  const uy = (y1 - cy1) / ry;
  const vx = (-x1 - cx1) / rx;
  const vy = (-y1 - cy1) / ry;
  const theta = angle(1, 0, ux, uy);
  let delta = angle(ux, uy, vx, vy);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  // at most a quarter turn per cubic (the tolerance keeps an exact half turn at two)
  const count = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9));
  const step = delta / count;
  const k = (4 / 3) * Math.tan(step / 4);
  const onEllipse = (ex, ey) => [cx + rx * cosPhi * ex - ry * sinPhi * ey, cy + rx * sinPhi * ex + ry * cosPhi * ey];
  const out = [];
  let a = theta;
  for (let s = 0; s < count; s++) {
    const b = a + step;
    const c1 = onEllipse(Math.cos(a) - k * Math.sin(a), Math.sin(a) + k * Math.cos(a));
    const c2 = onEllipse(Math.cos(b) + k * Math.sin(b), Math.sin(b) - k * Math.cos(b));
    const to = s === count - 1 ? [x, y] : onEllipse(Math.cos(b), Math.sin(b));
    out.push({ op: "C", p: [...c1, ...c2, ...to] });
    a = b;
  }
  return out;
}

/* ── shapes to KArtPath ──────────────────────────────────────────────────── */

// every key ArtShapes / GShape knows (src/components/ArtShapes.tsx)
const KEYS = new Set(["t", "d", "cx", "cy", "r", "rx", "ry", "x", "y", "w", "h", "f", "s", "sw", "lc", "lj", "o", "tf", "da"]);
const CAPS = new Set(["butt", "round", "square"]);
const JOINS = new Set(["miter", "round", "bevel"]);
const PATH_CHARS = /^[MmLlHhVvCcSsQqTtAaZzEe0-9+\-.,\s]+$/;

const number = (v, what) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  if (!Number.isFinite(n)) throw new Error(`${what} "${v}" is not a number`);
  return n;
};

/** "#RRGGBB" / "#RRGGBBAA" / "#RGB" as 0xRRGGBBAA, or null for none. */
export function paint(v, what) {
  if (v === undefined) return what === "fill" ? 0x000000ff : null; // SVG: fill defaults to black, stroke to none
  if (v === "none") return null;
  let m = /^#([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})?$/.exec(v);
  if (m) return parseInt(m[1] + (m[2] ?? "FF"), 16) >>> 0;
  m = /^#([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])$/.exec(v);
  if (m) return parseInt(m[1] + m[1] + m[2] + m[2] + m[3] + m[3] + "FF", 16) >>> 0;
  throw new Error(`a ${what} colour KArtPath can't read ("${v}")`);
}

/** stroke-dasharray as a list: none or empty → [], an odd list repeated (SVG), all zeros → []. */
export function dashes(v) {
  if (v === undefined || v === "none" || String(v).trim() === "") return [];
  const list = String(v)
    .trim()
    .split(/[\s,]+/)
    .map((x) => number(x, "a dash length"));
  if (list.some((x) => x < 0)) throw new Error(`a negative dash length ("${v}")`);
  if (list.every((x) => x === 0)) return [];
  return list.length % 2 ? [...list, ...list] : list;
}

/** A circle, ellipse or rect (ArtShapes's c, e, r) as path data. */
function shapeData(s) {
  const f = (k) => number(s[k], k);
  const ellipse = (cx, cy, rx, ry) => (rx > 0 && ry > 0 ? `M${cx - rx},${cy}a${rx},${ry} 0 1 0 ${2 * rx},0a${rx},${ry} 0 1 0 ${-2 * rx},0Z` : null);
  switch (s.t) {
    case "p":
      return s.d;
    case "c":
      return ellipse(f("cx"), f("cy"), f("r"), f("r"));
    case "e":
      return ellipse(f("cx"), f("cy"), f("rx"), f("ry"));
    case "r": {
      const x = s.x === undefined ? 0 : f("x");
      const y = s.y === undefined ? 0 : f("y");
      const w = f("w");
      const h = f("h");
      if (!(w > 0 && h > 0)) return null;
      // SVG: ry defaults to rx; both are clamped to half the side (ArtShapes only passes rx)
      const r = Math.min(s.rx === undefined ? 0 : f("rx"), w / 2, h / 2);
      if (r <= 0) return `M${x},${y}h${w}v${h}h${-w}Z`;
      return `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}v${-(h - 2 * r)}a${r},${r} 0 0 1 ${r},${-r}Z`;
    }
    default:
      throw new Error(`a shape type KArtPath doesn't know ("${s.t}")`);
  }
}

/** One shape as KArtPath's fields, or an Error saying why it can't be drawn exactly. */
export function toArtPath(s) {
  if (!s || typeof s !== "object") throw new Error("not a shape");
  for (const k of Object.keys(s)) if (!KEYS.has(k)) throw new Error(`an attribute the generator doesn't know ("${k}")`);
  if (s.tf !== undefined && String(s.tf).trim() !== "") throw new Error(`a transform ("${s.tf}"), which KArtPath doesn't draw`);
  if (s.o !== undefined && number(s.o, "opacity") !== 1) throw new Error(`an opacity ("${s.o}"), which KArtPath doesn't draw`);
  const d = shapeData(s);
  if (d === null) return null; // a zero-size circle, ellipse or rect draws nothing in SVG either
  if (typeof d !== "string" || !PATH_CHARS.test(d)) throw new Error(`path data with characters SVG doesn't allow ("${d}")`);
  const segments = parsePath(d);
  const width = s.sw === undefined ? 1 : number(s.sw, "stroke width");
  if (width < 0) throw new Error(`a negative stroke width ("${s.sw}")`);
  const cap = s.lc ?? "butt";
  const join = s.lj ?? "miter";
  if (!CAPS.has(cap)) throw new Error(`a line cap KArtPath doesn't know ("${cap}")`);
  if (!JOINS.has(join)) throw new Error(`a line join KArtPath doesn't know ("${join}")`);
  return { d, segments, fill: paint(s.f, "fill"), stroke: paint(s.s, "stroke"), width, cap, join, dash: dashes(s.da) };
}

/* ── the Swift file ──────────────────────────────────────────────────────── */

const hex = (v) => (v === null ? "nil" : "0x" + v.toString(16).toUpperCase().padStart(8, "0"));
const fmt = (n) => String(Object.is(n, -0) ? 0 : n);

/** One KArtPath(…) initialiser, defaults left out (KArtPath.swift: stroke nil, width 1, butt, miter, no dash). */
export function swiftPath(p) {
  const args = [JSON.stringify(p.d), `fill: ${hex(p.fill)}`];
  if (p.stroke !== null) args.push(`stroke: ${hex(p.stroke)}`);
  if (p.width !== 1) args.push(`width: ${fmt(p.width)}`);
  if (p.cap !== "butt") args.push(`cap: .${p.cap}`);
  if (p.join !== "miter") args.push(`join: .${p.join}`);
  if (p.dash.length) args.push(`dash: [${p.dash.map(fmt).join(", ")}]`);
  return `KArtPath(${args.join(", ")})`;
}

/**
 * Reads every stamp and writes the Swift table. Returns the file and what happened:
 * { swift, read: [id], unread: [{ id, why }], ignored: [art key], shapes }.
 */
export function buildSwift({ art, cats, stamps, unknownTint }) {
  const entries = [];
  const unread = [];
  let shapes = 0;
  for (const st of stamps) {
    const list = art[`stamp-${st.id}`];
    let paths = null;
    let why = null;
    if (!Array.isArray(list) || !list.length) {
      why = "no art in stamp-art.ts";
    } else {
      try {
        paths = list.map((s, i) => {
          try {
            return toArtPath(s);
          } catch (e) {
            throw new Error(`shape ${i + 1} of ${list.length}: ${e.message}`);
          }
        });
        paths = paths.filter(Boolean);
        if (!paths.length) throw new Error("every shape is empty");
      } catch (e) {
        paths = null;
        why = e.message;
      }
    }
    if (paths) shapes += paths.length;
    else unread.push({ id: st.id, why });
    entries.push({ ...st, paths, why });
  }
  const known = new Set(stamps.map((s) => `stamp-${s.id}`));
  const ignored = Object.keys(art).filter((k) => !known.has(k));

  const L = [];
  const out = (s = "") => L.push(s);
  out("// GENERATED by scripts/gen-stamp-art-swift.mjs from src/data/stamp-art.ts and src/data/stamps.ts. DO NOT EDIT.");
  out("// When the art or the stamp list changes, run: node scripts/gen-stamp-art-swift.mjs");
  out("//");
  out("// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.");
  out();
  out("import SwiftUI");
  out();
  out(`/// The ${stamps.length} stamps as src/data/stamp-art.ts draws them (StampTile, through ArtShapes): each shape's`);
  out(`/// path data verbatim on the ${GRID} grid and its paint, in src/data/stamps.ts order. KStampArt draws it.`);
  out("///");
  out(`/// Read by the generator: ${stamps.length - unread.length} of ${stamps.length} stamps, ${shapes} shapes.`);
  if (unread.length) {
    out("/// Drawn as a tinted tile instead (paths: nil), because the generator could not read their art:");
    for (const u of unread) out(`///   - ${u.id}: ${u.why}`);
  } else {
    out("/// Drawn as a tinted tile instead: none.");
  }
  out("enum KStampArtData {");
  out(`  /// The grid the art is drawn on: viewBox 0 0 ${GRID} ${GRID}.`);
  out(`  static let grid: CGFloat = ${GRID}`);
  out();
  out(`  /// The tile colour StampTile gives an id it doesn't know (${unknownTint.toUpperCase()}).`);
  out(`  static let unknownTint: UInt32 = ${hex(paint(unknownTint, "fill"))}`);
  out();
  out("  static let stamps: [KStampArtEntry] = [");
  let lastCat = null;
  for (const e of entries) {
    if (e.cat !== lastCat) {
      const cat = cats.find((c) => c.id === e.cat);
      out(`    // ── ${cat ? cat.name : e.cat} ──`);
      lastCat = e.cat;
    }
    const tint = hex(paint(e.color, "fill"));
    if (!e.paths) {
      out(`    // ${e.id}: a tinted tile, ${e.why}`);
      out(`    KStampArtEntry(${JSON.stringify(e.id)}, tint: ${tint}, paths: nil),`);
      continue;
    }
    out(`    KStampArtEntry(${JSON.stringify(e.id)}, tint: ${tint}, paths: [`);
    for (const p of e.paths) out(`      ${swiftPath(p)},`);
    out("    ]),");
  }
  out("  ]");
  out("}");
  return { swift: L.join("\n") + "\n", read: entries.filter((e) => e.paths).map((e) => e.id), unread, ignored, shapes, entries };
}

/* ── the command line ────────────────────────────────────────────────────── */

function main() {
  const CHECK = process.argv.includes("--check");
  const fail = (msg) => {
    console.error(`gen-stamp-art-swift: ${msg}`);
    process.exit(1);
  };
  let result;
  try {
    result = buildSwift(readSources());
  } catch (e) {
    fail(e.message);
  }
  const { swift, read, unread, ignored, shapes } = result;
  for (const k of ignored) console.warn(`gen-stamp-art-swift: ${k} has art but stamps.ts has no such stamp; left out`);
  for (const u of unread) console.warn(`gen-stamp-art-swift: ${u.id} is drawn as a tinted tile: ${u.why}`);
  const summary = `${read.length} of ${read.length + unread.length} stamps from their art, ${shapes} shapes; tinted tile: ${unread.length ? unread.map((u) => u.id).join(", ") : "none"}`;
  if (CHECK) {
    let current = "";
    try {
      current = readFileSync(OUT, "utf8");
    } catch {
      fail(`${OUT.pathname} does not exist; run node scripts/gen-stamp-art-swift.mjs`);
    }
    if (current !== swift) fail("KStampArtData.swift is out of date with stamp-art.ts / stamps.ts; run node scripts/gen-stamp-art-swift.mjs");
    console.log(`KStampArtData.swift is up to date (${summary})`);
  } else {
    writeFileSync(OUT, swift);
    console.log(`wrote ${OUT.pathname} (${summary})`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
