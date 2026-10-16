// The art pipeline's shared reader (the 10a overhaul, step 5): SVG path data and the flat shape
// lists the design sets are kept as (src/data/stamp-art.ts, src/data/mood-line-art.ts), read the
// way the device reads them, and written out as KArtPath initialisers (Kit/KArtPath.swift).
//
// Used by:
//   - scripts/gen-stamp-art-swift.mjs   the stamps' Swift table (KStampArtData.swift)
//   - scripts/import-mood-art.mjs       the mood icons' SVG files -> src/data/mood-line-art.ts
//   - scripts/gen-mood-art-swift.mjs    the mood icons' Swift table (KMoodArtData.swift)
// Nothing here knows about stamps or moods: a grid, path data, paint. It has no side effects and
// reads no files, so each script and its test import what they need.

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
/** the only characters SVG path data may hold */
export const PATH_CHARS = /^[MmLlHhVvCcSsQqTtAaZzEe0-9+\-.,\s]+$/;

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

/**
 * A shape's path data: a path's own, or a circle, ellipse or rect (ArtShapes's c, e, r) drawn as
 * path data; null for a circle, ellipse or rect of no size (SVG draws nothing either). `num`
 * writes each computed number (the stamps keep JavaScript's own String; the mood importer rounds,
 * so 8.5 - 2.2 is written 6.3).
 */
export function shapeData(s, num = (n) => n) {
  const f = (k) => number(s[k], k);
  const ellipse = (cx0, cy0, rx0, ry0) => {
    if (!(rx0 > 0 && ry0 > 0)) return null;
    const [x, cy, rx, ry, dx, back] = [cx0 - rx0, cy0, rx0, ry0, 2 * rx0, -2 * rx0].map(num);
    return `M${x},${cy}a${rx},${ry} 0 1 0 ${dx},0a${rx},${ry} 0 1 0 ${back},0Z`;
  };
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
      if (r <= 0) return `M${num(x)},${num(y)}h${num(w)}v${num(h)}h${num(-w)}Z`;
      const [x0, y0, r0, nr, sw, sh, nsw, nsh] = [x + r, y, r, -r, w - 2 * r, h - 2 * r, -(w - 2 * r), -(h - 2 * r)].map(num);
      return `M${x0},${y0}h${sw}a${r0},${r0} 0 0 1 ${r0},${r0}v${sh}a${r0},${r0} 0 0 1 ${nr},${r0}h${nsw}a${r0},${r0} 0 0 1 ${nr},${nr}v${nsh}a${r0},${r0} 0 0 1 ${r0},${nr}Z`;
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

/** A colour as Swift writes it: 0xRRGGBBAA, or nil for none. */
export const swiftHex = (v) => (v === null ? "nil" : "0x" + v.toString(16).toUpperCase().padStart(8, "0"));
/** A number as Swift writes it (-0 as 0). */
export const swiftNumber = (n) => String(Object.is(n, -0) ? 0 : n);
const hex = swiftHex;
const fmt = swiftNumber;

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
