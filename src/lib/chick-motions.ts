/* WHAT THE CHICK DOES WHEN NOBODY IS TOUCHING HER.
   ────────────────────────────────────────────────────────────────────────
   The hatch read nine dimensions off the writing. The form (hatchling-form)
   turns them into her shape; this turns them into her habits. Each
   dimension owns one motion, and the ones the read scored highest — and
   locked — are the ones she does most. So a bursty hand hatches a chick
   that hops; a wide vocabulary hatches one that's always pecking at
   something; a writer who looks outward hatches a chick that looks about.

     rhythm       hidden rhythm       → hop        she bounces to it
     vocabulary   rare words          → peck       picks a seed off the ground
     perspective  way of seeing       → look       looks left, then right
     emotion      emotional patterns  → flap       feeling on the surface: wings
     function     small tells         → foot       lifts one foot — the small tell
     punctuation  where you pause     → doze       she stops; a slow blink
     structure    thought patterns    → shake      shakes her head, reordering
     sentence     sentence shape      → stretch    the long stretch up
     quirks       personal patterns   → wag        the tail, her own tic

   Everything here is pure: which motion, how long, what face she makes,
   and where each part of her is at a given moment. The rig draws it. */
import type { DimKey, DimScore } from "./hatch-engine";
import type { WShape } from "../components/wren-family-data";
import type { WrenMood } from "../components/WrenBird";

export type Motion = "hop" | "peck" | "look" | "flap" | "foot" | "doze" | "shake" | "stretch" | "wag";

export const MOTION_OF_DIM: Record<DimKey, Motion> = {
  rhythm: "hop",
  vocabulary: "peck",
  perspective: "look",
  emotion: "flap",
  function: "foot",
  punctuation: "doze",
  structure: "shake",
  sentence: "stretch",
  quirks: "wag",
};

/** seconds each one takes */
export const MOTION_S: Record<Motion, number> = { hop: 0.6, peck: 1.1, look: 1.6, flap: 0.8, foot: 1.0, doze: 2.2, shake: 0.7, stretch: 1.3, wag: 0.9 };

/** the face she makes while doing it; null keeps whatever she had */
export const FACE_OF_MOTION: Record<Motion, WrenMood | null> = {
  hop: "happy",
  peck: "curious",
  look: "listen",
  flap: "delight",
  foot: null,
  doze: "sleepy",
  shake: "think",
  stretch: null,
  wag: "happy",
};

/* WEIGHTED BY THE READ. A dimension's chance grows faster than its score
   (score^1.5) and is multiplied when the engine trusted it (locked), so the
   one or two things the read is sure of are what she mostly does; a small
   floor keeps every motion possible, so she is never a one-trick bird. The
   last motion is skipped so she doesn't do the same thing twice running. */
export function pickMotion(dims: DimScore[], last: Motion | null = null, rnd: () => number = Math.random): Motion {
  const rows = dims
    .map((d) => ({ m: MOTION_OF_DIM[d.key], w: (0.08 + Math.pow(Math.max(0, d.score) / 100, 1.5)) * (d.locked ? 2.5 : 1) }))
    .filter((r) => r.m && r.m !== last);
  if (!rows.length) return "look";
  const total = rows.reduce((s, r) => s + r.w, 0);
  let x = rnd() * total;
  for (const r of rows) {
    x -= r.w;
    if (x <= 0) return r.m;
  }
  return rows[rows.length - 1].m;
}

/** how long she rests between motions, in seconds — a chick, not a metronome */
export const restBetween = (rnd: () => number = Math.random): number => 1.8 + rnd() * 2.8;

/* ── the rig: which part of the drawing is which ──────────────────────
   The chick's shapes are told apart by geometry and colour, the same way
   shapeHatchling does it, so a regenerated export can't shuffle a foot
   onto her head. */
export type Layer = "tail" | "farWing" | "feather" | "body" | "belly" | "nearWing" | "face" | "legL" | "legR";

const num = (v: unknown) => (typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN);
const firstX = (d?: string): number => {
  const m = /M\s*([-\d.]+)/.exec(d || "");
  return m ? parseFloat(m[1]) : NaN;
};

export function layerOf(sh: WShape): Layer {
  if (sh.t === "p") {
    if (sh.f === "none") return "feather"; // the only stroke-only path
    if (sh.f && sh.s && sh.f === sh.s) return firstX(sh.d) < 100 ? "legL" : "legR"; // legs and feet: fill = stroke, one leg each once split
    return firstX(sh.d) < 70 ? "tail" : "face"; // the stub, or the beak
  }
  if (sh.t === "c") return num(sh.r) >= 40 ? "body" : "face"; // one big circle; every other circle is on her face
  if (sh.t === "e") {
    const cx = num(sh.cx);
    const rx = num(sh.rx);
    if (rx >= 35) return "body"; // the stretched body
    return cx < 70 ? "farWing" : cx > 130 ? "nearWing" : "belly";
  }
  return "face";
}

/** a two-subpath shape (both legs, both feet) becomes two shapes, one per side */
export function splitSides(sh: WShape): WShape[] {
  if (sh.t !== "p" || !sh.d || !(sh.f && sh.s && sh.f === sh.s)) return [sh];
  const parts = sh.d.split(/(?=M)/).filter((p) => p.trim());
  return parts.length > 1 ? parts.map((d) => ({ ...sh, d })) : [sh];
}

/* ── where everything is at moment p of a motion ──────────────────────── */
export interface Pose {
  all: string; // the whole bird
  tail: string;
  farWing: string;
  nearWing: string;
  face: string; // eyes, cheeks, beak, feather, mark, mood — her face slides on the ball
  legL: string;
  seed: boolean; // a seed on the ground, for the peck
}
const NONE = "";
export const REST: Pose = { all: NONE, tail: NONE, farWing: NONE, nearWing: NONE, face: NONE, legL: NONE, seed: false };

const rot = (deg: number, cx: number, cy: number) => `rotate(${deg.toFixed(2)} ${cx} ${cy})`;
const tr = (x: number, y: number) => `translate(${x.toFixed(2)} ${y.toFixed(2)})`;
const bump = (p: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, p))); // 0→1→0
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

/* the chick's pivots, in the 200-unit view: body centre, the feet, the
   wings' shoulders, the tail root, the left hip */
const BODY = { x: 100, y: 113.5 };
const FEET = { x: 100, y: 166 };
const NEAR = { x: 145, y: 116 };
const FAR = { x: 58, y: 114 };
const TAIL = { x: 54, y: 128 };
const HIP = { x: 91, y: 147 };

export function poseAt(m: Motion | null, p: number): Pose {
  if (!m) return REST;
  const b = bump(p);
  switch (m) {
    case "hop":
      return { ...REST, all: tr(0, -14 * b) };
    case "foot":
      return { ...REST, legL: `${tr(0, -7 * b)} ${rot(-22 * b, HIP.x, HIP.y)}` };
    case "peck": {
      // lean on the feet, face dips down the front of the ball; the seed is there until she's had it
      const d = bump(Math.min(1, p / 0.75)); // the dip is over by three-quarters; the rest is swallowing
      return { ...REST, all: rot(9 * d, FEET.x, FEET.y), face: `${rot(26 * d, BODY.x, BODY.y)} ${tr(0, 5 * d)}`, seed: p < 0.5 };
    }
    case "flap": {
      const f = Math.abs(Math.sin(2 * Math.PI * p));
      return { ...REST, all: tr(0, -4 * f), nearWing: rot(-46 * f, NEAR.x, NEAR.y), farWing: rot(46 * f, FAR.x, FAR.y) };
    }
    case "look": {
      // left, hold, right, hold, back
      const s = Math.sin(2 * Math.PI * p);
      const k = Math.sign(s) * Math.pow(Math.abs(s), 0.5);
      return { ...REST, face: tr(-8 * k, 0) };
    }
    case "doze": {
      const e = p < 0.2 ? ease(p / 0.2) : p > 0.8 ? 1 - ease((p - 0.8) / 0.2) : 1;
      return { ...REST, all: tr(0, 3 * e), face: tr(0, 2 * e) };
    }
    case "shake": {
      const s = Math.sin(4 * Math.PI * p) * (1 - p);
      return { ...REST, face: tr(6 * s, 0) };
    }
    case "stretch":
      return { ...REST, all: `${tr(0, 0)} translate(${FEET.x} ${FEET.y}) scale(${(1 - 0.06 * b).toFixed(3)} ${(1 + 0.1 * b).toFixed(3)}) translate(${-FEET.x} ${-FEET.y})`, face: tr(0, -6 * b) };
    case "wag": {
      const s = Math.sin(5 * Math.PI * p) * (1 - p * 0.3);
      return { ...REST, tail: rot(24 * s, TAIL.x, TAIL.y) };
    }
  }
}
