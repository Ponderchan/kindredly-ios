/* PEN v1 — A DRAWN PEN NAME, AS IT TRAVELS AND IS KEPT (identity Phase 2, 2026-10-19).
   ────────────────────────────────────────────────────────────────────────
   (Not lib/signature: that file is the writing fingerprint, the voice
   vector the matcher compares. This one is the hand-signed pen name.)

   At the first trade of names the signing sheet asks for a face, the pen
   name typed, and the pen name signed with a finger on a wide pad. The
   drawing travels as vector strokes in one fixed box, never as a picture:

     { v: 1, w: 1000, h: 320, s: [[x, y, x, y, …], …] }

   integer coordinates, 0 ≤ x ≤ 1000, 0 ≤ y ≤ 320, top-left origin, one
   flat list per stroke (finger down → up). The caps: at most 32 strokes,
   1200 points and 12288 bytes of compact JSON. Web 0035's
   private.pen_sig_ok holds the server to exactly the rules validatePen
   reads here (exactly those four keys, every number an integer in range,
   every stroke an even list of at least one point); sign_thread refuses
   anything else. No drawing (null) means "typed": the pen name set in the
   letter serif, italic, upright for Chinese, Japanese and Korean
   (penTypedUpright).

   THE PATH FROM A FINGER TO THE SERVER: the pad hands over its strokes in
   its own points; penFromPad = normalisePen (one uniform scale into the
   box, the pad's aspect kept and centred, rounded, clamped, repeats
   dropped) then simplifyPen (the 32 longest strokes kept in drawing order,
   then Ramer–Douglas–Peucker with a tolerance raised step by step until
   the points and bytes fit). Its answer is always valid or null (no ink).

   THE PATH FROM THE SERVER TO A SCREEN: never trust a stored drawing
   blindly — penOrNull / penDrawPlan return null for anything that isn't
   PEN v1, and the screen then sets the typed name instead. penPath draws
   the strokes smoothed (a quadratic through each pair's midpoint), in box
   units: render it in an SVG whose viewBox is penViewBox ("box" keeps
   where on the line they signed; "ink" crops to the drawing).
   penDrawPlan times the ceremony's stroke-by-stroke draw-in.

   THE SAME FILE ON THE WEB: app/engine/pen-signature.js is a line-for-line
   port. design/identity/pen-signature.v1.vectors.json (written once by
   scripts/gen-pen-vectors.mjs) holds validation cases, normalised and
   simplified drawings, paths, draw plans and the demo drawings; this
   repo's src/lib/pen-signature.test.ts and the web's
   scripts/pen-signature.test.mjs both reproduce it and lock its sha256, so
   a change here is a deliberate PEN v2 on both sides.

   Pure and import-free, so plain node can test it. */

/** The format's version: the only one there is. */
export const PEN_V = 1;
/** The box every drawing is kept in, in logical units (wide: a name on a line). */
export const PEN_W = 1000;
export const PEN_H = 320;
/** The caps (web 0035 private.pen_sig_ok checks the same). */
export const PEN_MAX_STROKES = 32;
export const PEN_MAX_POINTS = 1200;
/** 12 KB of compact JSON, as JSON.stringify sends it. */
export const PEN_MAX_BYTES = 12288;
/** Where the pad draws its baseline (and the × on it), as a fraction of the height: y = 230 of 320. */
export const PEN_BASELINE = 230 / 320;

/** A drawn pen name, PEN v1. `s` holds one flat [x, y, x, y, …] list per stroke. */
export type PenSig = { v: 1; w: 1000; h: 320; s: number[][] };
/** A point as the pad hands it over: its own points, top-left origin. */
export type PadPoint = { x: number; y: number };
/** The pad's size in its own points. */
export type PadSize = { width: number; height: number };

/** Why a value isn't PEN v1 (the first rule it breaks, in the order the server checks). */
export type PenProblem = "shape" | "keys" | "version" | "strokes" | "stroke" | "points" | "coord" | "bytes";
export type PenVerdict = { ok: true } | { ok: false; problem: PenProblem };

/* ── reading ─────────────────────────────────────────────────────────── */

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/**
 * Is this PEN v1, by the server's rules (private.pen_sig_ok)? The first
 * rule broken, in the server's order: not an object (shape), keys other
 * than exactly v/w/h/s (keys), v/w/h not 1/1000/320 (version), not 1–32
 * strokes (strokes), a stroke not an even list of ≥ 1 point (stroke), over
 * 1200 points (points), a coordinate not an integer inside the box
 * (coord), over 12288 bytes of compact JSON (bytes).
 */
export function validatePen(x: unknown): PenVerdict {
  if (!isObj(x)) return { ok: false, problem: "shape" };
  const keys = Object.keys(x);
  if (keys.length !== 4 || !("v" in x && "w" in x && "h" in x && "s" in x)) return { ok: false, problem: "keys" };
  if (x.v !== PEN_V || x.w !== PEN_W || x.h !== PEN_H) return { ok: false, problem: "version" };
  const s = x.s;
  if (!Array.isArray(s) || s.length < 1 || s.length > PEN_MAX_STROKES) return { ok: false, problem: "strokes" };
  let points = 0;
  for (const stroke of s) {
    if (!Array.isArray(stroke) || stroke.length < 2 || stroke.length % 2 !== 0) return { ok: false, problem: "stroke" };
    points += stroke.length / 2;
    if (points > PEN_MAX_POINTS) return { ok: false, problem: "points" };
    for (let i = 0; i < stroke.length; i++) {
      const n = stroke[i];
      if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > (i % 2 === 0 ? PEN_W : PEN_H)) return { ok: false, problem: "coord" };
    }
  }
  if (penBytes(x as PenSig) > PEN_MAX_BYTES) return { ok: false, problem: "bytes" };
  return { ok: true };
}

/** True when the value is PEN v1 (validatePen ok). */
export const isPenSig = (x: unknown): x is PenSig => validatePen(x).ok;

/** The value when it is PEN v1, else null: what a screen draws, or the typed name when null. */
export const penOrNull = (x: unknown): PenSig | null => (isPenSig(x) ? x : null);

/** How many points a drawing holds. */
export const penPointCount = (sig: PenSig): number => sig.s.reduce((n, st) => n + st.length / 2, 0);

/** Its size as compact JSON (all ASCII, so characters = bytes). */
export const penBytes = (sig: PenSig): number => JSON.stringify(sig).length;

/* ── from the pad ────────────────────────────────────────────────────── */

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** a flat stroke without consecutive repeats of the same point */
function dedupe(flat: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const x = flat[i];
    const y = flat[i + 1];
    const n = out.length;
    if (n >= 2 && out[n - 2] === x && out[n - 1] === y) continue;
    out.push(x, y);
  }
  return out;
}

/**
 * The pad's strokes, in its own points, into the box: ONE uniform scale
 * (min of the two ratios), the pad centred in the box, every coordinate
 * rounded and clamped, consecutive repeats dropped, empty strokes and
 * non-finite points dropped. A pad drawn at the box's own aspect (1000:320)
 * maps edge to edge, so where on the line they signed is kept. null when
 * no ink is left, or the pad has no size.
 */
export function normalisePen(strokes: readonly (readonly PadPoint[])[], pad: PadSize): PenSig | null {
  if (!(pad.width > 0) || !(pad.height > 0)) return null;
  const k = Math.min(PEN_W / pad.width, PEN_H / pad.height);
  const ox = (PEN_W - pad.width * k) / 2;
  const oy = (PEN_H - pad.height * k) / 2;
  const s: number[][] = [];
  for (const stroke of strokes) {
    const flat: number[] = [];
    for (const p of stroke) {
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      flat.push(clamp(Math.round(ox + p.x * k), 0, PEN_W), clamp(Math.round(oy + p.y * k), 0, PEN_H));
    }
    const clean = dedupe(flat);
    if (clean.length >= 2) s.push(clean);
  }
  return s.length ? { v: PEN_V, w: PEN_W, h: PEN_H, s } : null;
}

/** a flat stroke's length along its points, in box units */
function strokeLength(flat: readonly number[]): number {
  let len = 0;
  for (let i = 2; i + 1 < flat.length; i += 2) len += Math.hypot(flat[i] - flat[i - 2], flat[i + 1] - flat[i - 1]);
  return len;
}

/** distance from (px, py) to the segment (ax, ay)–(bx, by) */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - ax, py - ay);
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Ramer–Douglas–Peucker on a flat stroke, iteratively (no recursion depth to run out of); the ends always stay */
function rdp(flat: readonly number[], eps: number): number[] {
  const n = flat.length / 2;
  if (n <= 2 || eps <= 0) return flat.slice();
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack: number[] = [0, n - 1];
  while (stack.length) {
    const b = stack.pop()!;
    const a = stack.pop()!;
    let far = -1;
    let farD = eps;
    for (let i = a + 1; i < b; i++) {
      const d = segDist(flat[2 * i], flat[2 * i + 1], flat[2 * a], flat[2 * a + 1], flat[2 * b], flat[2 * b + 1]);
      if (d > farD) {
        farD = d;
        far = i;
      }
    }
    if (far >= 0) {
      keep[far] = 1;
      stack.push(a, far, far, b);
    }
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(flat[2 * i], flat[2 * i + 1]);
  return out;
}

/** the tolerances simplifyPen tries, in box units (1 unit ≈ a third of a point on a phone pad) */
export const PEN_TOLERANCES: readonly number[] = [1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64];

/**
 * A drawing brought within the caps. First, over 32 strokes, the 32
 * longest are kept (ties: the earlier), still in the order they were drawn
 * (the pad stops taking strokes at 32, so this is a backstop). Then every
 * stroke is simplified with the first tolerance in PEN_TOLERANCES that
 * fits the points and bytes caps (tolerance 1 always runs: it only strips
 * the jitter of a finger, invisible at any size). Coordinates are rounded
 * and clamped again, so any input in the box's units comes back valid —
 * or null when nothing is left.
 */
export function simplifyPen(sig: PenSig): PenSig | null {
  let strokes = sig.s
    .map((st) => {
      const flat: number[] = [];
      for (let i = 0; i + 1 < st.length; i += 2) {
        if (!Number.isFinite(st[i]) || !Number.isFinite(st[i + 1])) continue;
        flat.push(clamp(Math.round(st[i]), 0, PEN_W), clamp(Math.round(st[i + 1]), 0, PEN_H));
      }
      return dedupe(flat);
    })
    .filter((st) => st.length >= 2);
  if (!strokes.length) return null;
  if (strokes.length > PEN_MAX_STROKES) {
    const ranked = strokes.map((st, i) => ({ i, len: strokeLength(st) })).sort((p, q) => q.len - p.len || p.i - q.i);
    const kept = new Set(ranked.slice(0, PEN_MAX_STROKES).map((r) => r.i));
    strokes = strokes.filter((_, i) => kept.has(i));
  }
  let out: PenSig | null = null;
  for (const eps of PEN_TOLERANCES) {
    out = { v: PEN_V, w: PEN_W, h: PEN_H, s: strokes.map((st) => rdp(st, eps)) };
    if (penPointCount(out) <= PEN_MAX_POINTS && penBytes(out) <= PEN_MAX_BYTES) return out;
  }
  return out && validatePen(out).ok ? out : null;
}

/** The pad's strokes as they go to sign_thread: normalised, simplified, and valid — or null for no ink. */
export function penFromPad(strokes: readonly (readonly PadPoint[])[], pad: PadSize): PenSig | null {
  const n = normalisePen(strokes, pad);
  const s = n ? simplifyPen(n) : null;
  return s && validatePen(s).ok ? s : null;
}

/* ── to a screen ─────────────────────────────────────────────────────── */

/** a number for a path: at most one decimal, no trailing ".0" */
const num = (v: number): string => String(Math.round(v * 10) / 10);

/**
 * One stroke as an SVG path, in box units, smoothed: from the first point,
 * a quadratic through each point to the midpoint of the next pair, then a
 * line to the last point. Two points are a line; one point is a dot (a
 * hair-length line, which a round cap draws as a dot in every renderer).
 */
export function penStrokePath(flat: readonly number[]): string {
  const n = Math.floor(flat.length / 2);
  if (n < 1) return "";
  const x = (i: number) => flat[2 * i];
  const y = (i: number) => flat[2 * i + 1];
  if (n === 1) return `M${num(x(0))} ${num(y(0))}l0.1 0`;
  let d = `M${num(x(0))} ${num(y(0))}`;
  for (let i = 1; i < n - 1; i++) d += `Q${num(x(i))} ${num(y(i))} ${num((x(i) + x(i + 1)) / 2)} ${num((y(i) + y(i + 1)) / 2)}`;
  d += `L${num(x(n - 1))} ${num(y(n - 1))}`;
  return d;
}

/** Every stroke as one path (d), in box units. "" for anything that isn't PEN v1. */
export function penPath(sig: unknown): string {
  const p = penOrNull(sig);
  return p ? p.s.map(penStrokePath).join("") : "";
}

/** The ink's bounds in box units, or null for anything that isn't PEN v1. */
export function penInkBox(sig: unknown): { x: number; y: number; w: number; h: number } | null {
  const p = penOrNull(sig);
  if (!p) return null;
  let x0 = PEN_W;
  let y0 = PEN_H;
  let x1 = 0;
  let y1 = 0;
  for (const st of p.s) {
    for (let i = 0; i + 1 < st.length; i += 2) {
      x0 = Math.min(x0, st[i]);
      x1 = Math.max(x1, st[i]);
      y0 = Math.min(y0, st[i + 1]);
      y1 = Math.max(y1, st[i + 1]);
    }
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * The viewBox to draw a signature in, in box units.
 * - "box": the whole 1000×320 (where on the line they signed is kept; the
 *   KindredPage and the sheet's preview).
 * - "ink": the ink's bounds plus `margin` (default 24) on every side, then
 *   widened (or heightened) about its centre to `aspect` (width / height)
 *   when given, so a small signature fills a small slot (the ceremony).
 * Anything that isn't PEN v1 gets the whole box.
 */
export function penViewBox(sig: unknown, fit: "box" | "ink", opts: { margin?: number; aspect?: number } = {}): { x: number; y: number; w: number; h: number } {
  const ink = fit === "ink" ? penInkBox(sig) : null;
  if (!ink) return { x: 0, y: 0, w: PEN_W, h: PEN_H };
  const m = opts.margin ?? 24;
  let x = ink.x - m;
  let y = ink.y - m;
  let w = ink.w + 2 * m;
  let h = ink.h + 2 * m;
  const a = opts.aspect;
  if (a && a > 0) {
    if (w / h < a) {
      const nw = h * a;
      x -= (nw - w) / 2;
      w = nw;
    } else {
      const nh = w / a;
      y -= (nh - h) / 2;
      h = nh;
    }
  }
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10 };
}

/** One stroke of the draw-in: its path, its length along its points (for a dash), and when it runs. */
export type PenDrawStep = { d: string; length: number; delay: number; duration: number };

/**
 * The stroke-by-stroke draw-in, inside `totalMs`: strokes in the order they
 * were drawn, `gapMs` (default 60) between one and the next, each stroke's
 * share of the rest in proportion to its length but never under
 * `minStrokeMs` (default 80; a dot gets exactly that). Animate each step
 * as a dash: strokeDasharray = length + 2, strokeDashoffset from length + 2
 * to 0 between delay and delay + duration. null for anything that isn't
 * PEN v1 (draw the typed name instead).
 */
export function penDrawPlan(sig: unknown, totalMs: number, opts: { gapMs?: number; minStrokeMs?: number } = {}): PenDrawStep[] | null {
  const p = penOrNull(sig);
  if (!p) return null;
  const gap = opts.gapMs ?? 60;
  const min = opts.minStrokeMs ?? 80;
  const n = p.s.length;
  const lens = p.s.map(strokeLength);
  const drawMs = Math.max(n * min, totalMs - gap * (n - 1));
  const spare = drawMs - n * min;
  const total = lens.reduce((a, b) => a + b, 0);
  let at = 0;
  return p.s.map((st, i) => {
    const duration = Math.round(min + (total > 0 ? (spare * lens[i]) / total : spare / n));
    const step = { d: penStrokePath(st), length: Math.round(lens[i] * 10) / 10, delay: Math.round(at), duration };
    at += duration + gap;
    return step;
  });
}

/* ── the face that travels with it ───────────────────────────────────── */

/** A hand-drawn library face id ("m-anchor", "f-02-tender-thinker"): what sign_thread takes as p_face (web 0035 private.pen_face). */
export const PEN_FACE = /^[fm]-[a-z0-9]+(-[a-z0-9]+)*$/;
/** The longest face id the server takes. */
export const PEN_FACE_MAX = 48;

/** The id when it is a library face sign_thread will take, else null (a photo path, an empty string, a typo): null sends no face, the glyph. */
export const penFaceOrNull = (id: unknown): string | null =>
  typeof id === "string" && id.length <= PEN_FACE_MAX && PEN_FACE.test(id) ? id : null;

/* ── typed ───────────────────────────────────────────────────────────── */

/* the scripts a typed pen name is set upright in: kana, CJK ideographs (and their compatibility
   block), Hangul syllables and jamo — italic there is a fake slant, not a hand */
const UPRIGHT = /[ᄀ-ᇿ぀-ヿ㄰-㆏㐀-䶿一-鿿가-힯豈-﫿]/;

/** Whether a typed pen name is set upright (Chinese, Japanese, Korean) rather than in the letter serif's italic. */
export const penTypedUpright = (name: string): boolean => UPRIGHT.test(name || "");

/* ── dev pages ───────────────────────────────────────────────────────── */

/* the same FNV-1a as lib/mosaic hashStr, inlined so this file imports nothing */
function fnv(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * DEV PAGES ONLY: a made-up signature for a seed (a demo thread's name),
 * so the sheet's preview, the ceremony and the kindred page can be seen
 * without a server. A run of cursive loops along the baseline (four to
 * seven, their height and lean from the seed), an underline flourish and a
 * dot — deterministic, always valid PEN v1. Never real data.
 */
export function penDemo(seed: string): PenSig {
  const h = fnv("pen:" + (seed || ""));
  const loops = 4 + (h % 4);
  const base = Math.round(PEN_BASELINE * PEN_H);
  const height = 70 + ((h >>> 2) % 50);
  const lean = ((h >>> 8) % 30) - 10;
  const x0 = 110 + ((h >>> 12) % 60);
  const pitch = 92 + ((h >>> 16) % 24);
  const main: number[] = [];
  const steps = loops * 16;
  for (let i = 0; i <= steps; i++) {
    const t = (i / 16) * Math.PI * 2;
    const amp = 0.55 + 0.45 * Math.abs(Math.sin(i / 16 + (h % 7)));
    const lift = height * amp * (0.5 - 0.5 * Math.cos(t));
    const x = x0 + (pitch * t) / (Math.PI * 2) + 30 * Math.sin(t) + (lean * lift) / height;
    main.push(clamp(Math.round(x), 0, PEN_W), clamp(Math.round(base - lift), 0, PEN_H));
  }
  const endX = main[main.length - 2];
  const flourish: number[] = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    const x = x0 - 20 + (endX + 40 - x0) * u;
    const y = base + 26 + 14 * Math.sin(u * Math.PI) - 18 * u;
    flourish.push(clamp(Math.round(x), 0, PEN_W), clamp(Math.round(y), 0, PEN_H));
  }
  const dot = [clamp(Math.round(x0 + pitch * 1.4), 0, PEN_W), clamp(base - height - 30, 0, PEN_H)];
  return simplifyPen({ v: PEN_V, w: PEN_W, h: PEN_H, s: [main, flourish, dot] })!;
}
