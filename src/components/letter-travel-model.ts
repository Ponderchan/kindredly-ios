/* LET IT TRAVEL, AS NUMBERS (the send-off's clock and the sheet's numbers).
   ────────────────────────────────────────────────────────────────────────
   Pure: no React, no React Native, so
     node src/components/letter-travel-model.test.ts
   locks the beats. The React Native piece (LetterTravel.tsx
   LetterTravelRN) draws every frame from travelFrame and runs its clock
   with stepTravel. The SwiftUI piece (modules/kindredly-ui
   Portable/Compose/KLetterTravel.swift) can't call TypeScript sixty times
   a second, so it carries a line-for-line port of both
   (KLetterTravelFrame, KLetterTravelClock): change them together.

   Authored seconds, 3.7 in all: Fold 0, Pickup 0.9, World 1.6, Cross 2.5.
   The clock rests on the arrival card (HOLD_AT) until the send has landed
   and the card has said so for DONE_MS; the time spent resting is taken
   off, so the fade resumes without a jump. */

export const TRAVEL_W = 393;
export const TRAVEL_H = 852;
export const CUES = { Fold: 0, Pickup: 0.9, World: 1.6, Cross: 2.5 } as const;
export const TOTAL = 3.7;
/** the arrival card, before the fade: the clock rests here until the send has landed */
export const HOLD_AT = TOTAL - 0.18;
/** past this long at the hold, the card says she is still flying */
export const WAIT_MS = 2500;
/** once the send has landed, how long the card says so before the fade */
export const DONE_MS = 900;
/** Reduce Motion: the last tableau, held at this T */
export const STILL_T = TOTAL - 0.3;
/** Reduce Motion: how long the tableau stays once the send has landed, then the fade's length */
export const STILL_HOLD_MS = 900 + DONE_MS;
export const STILL_FADE_MS = 260;

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (t: number, a: number, b: number) => a + (b - a) * t;
export const ramp = (t: number, stops: readonly number[], vals: readonly number[]) => {
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i]) {
      const f = (t - stops[i - 1]) / (stops[i] - stops[i - 1] || 1);
      return lerp(clamp(f, 0, 1), vals[i - 1], vals[i]);
    }
  }
  return vals[vals.length - 1];
};
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
type Ease = (t: number) => number;
const animate = (from: number, to: number, start: number, end: number, ease: Ease) => (T: number) => from + (to - from) * ease(clamp((T - start) / (end - start), 0, 1));
const enter = (from: number, to: number, start: number, end: number) => animate(from, to, start, end, easeOutCubic);
const draw = (from: number, to: number, start: number, end: number) => animate(from, to, start, end, easeInOutQuad);
const pop = (from: number, to: number, start: number, end: number) => animate(from, to, start, end, easeOutBack);

/** Every number one frame of the sheet needs, in its own 393 × 852 points. */
export type TravelFrame = {
  T: number;
  fold: number;
  seal: number;
  sealSquash: number;
  swoop: number;
  lift: number;
  taken: number;
  out: number;
  cross: number;
  markIn: number;
  outro: number;
  /** the globe: radius and centre */
  gR: number;
  gCX: number;
  gCY: number;
  gTop: number;
  home: [number, number];
  away: [number, number];
  deskX: number;
  deskY: number;
  birdX: number;
  birdY: number;
  birdS: number;
  heading: number;
  bob: number;
  envOnDesk: number;
  foldW: number;
  foldH: number;
  sealed: boolean;
};

/** a point on the route: a great-circle arc over the top of the globe, 0 at home, 1 away */
export function travelArc(f: Pick<TravelFrame, "gR" | "gCX" | "gCY">, p: number): [number, number] {
  const A = -168;
  const B = -12;
  const ang = (lerp(p, A, B) * Math.PI) / 180;
  const r = f.gR + 6 + Math.sin(p * Math.PI) * 62;
  return [f.gCX + Math.cos(ang) * r, f.gCY + Math.sin(ang) * r];
}

/** The sheet at authored second T; `beat` is the wall clock (the wings and the stars). */
export function travelFrame(T: number, beat: number): TravelFrame {
  const fold = draw(0, 1, 0.24, CUES.Pickup - 0.1)(T);
  const seal = pop(0, 1, CUES.Pickup - 0.4, CUES.Pickup + 0.05)(T);
  const sealSquash = 1 - Math.max(0, Math.sin(clamp((T - (CUES.Pickup - 0.4)) / 0.45, 0, 1) * Math.PI)) * 0.16;

  const swoop = enter(0, 1, CUES.Pickup - 0.05, CUES.World - 0.08)(T);
  const lift = enter(0, 1, CUES.World - 0.24, CUES.World + 0.16)(T);
  const taken = clamp((lift - 0.15) / 0.85, 0, 1);

  const out = draw(0, 1, CUES.World - 0.05, CUES.Cross + 0.1)(T);
  const cross = draw(0, 1, CUES.Cross + 0.05, TOTAL - 0.5)(T);
  const markIn = enter(0, 1, TOTAL - 0.78, TOTAL - 0.3)(T);
  const outro = draw(0, 1, TOTAL - 0.16, TOTAL)(T);

  /* the globe grows in from below as we pull back */
  const gR = ramp(out, [0, 1], [86, 166]);
  const gCX = TRAVEL_W / 2;
  const gCY = ramp(out, [0, 1], [TRAVEL_H + 150, 530]);
  const globe = { gR, gCX, gCY };
  const home = travelArc(globe, 0);
  const away = travelArc(globe, 1);

  const deskX = TRAVEL_W / 2;
  const deskY = 452;

  /* the bird: desk pickup → up → along the arc, carried with the desk to home as the world
     pulls into view, so the arc starts under her */
  const [ax, ay] = travelArc(globe, cross);
  const flyUp = enter(0, 1, CUES.World - 0.2, CUES.Cross + 0.05)(T);
  const preX = lerp(swoop, -120, deskX - 78) + flyUp * 34;
  const preY = lerp(swoop, 700, deskY - 6) - lift * 44 - flyUp * 120;
  const birdX = cross > 0.001 ? ax : lerp(out, preX, home[0]);
  const birdY = cross > 0.001 ? ay : lerp(out, preY, home[1]);
  const birdS = (0.6 + swoop * 0.14) * (1 - out * 0.62);
  /* one steady wing beat; over her last 0.4s of arc it eases into a slow breath, and her
     heading, taken across her position, eases level as she lands */
  const landing = enter(0, 1, TOTAL - 0.9, TOTAL - 0.5)(T);
  const behind = travelArc(globe, Math.max(cross - 0.02, 0));
  const ahead = travelArc(globe, Math.min(cross + 0.02, 1));
  const arcHeading = (Math.atan2(ahead[1] - behind[1], ahead[0] - behind[0]) * 180) / Math.PI;
  const heading = cross > 0.001 ? arcHeading * (1 - landing) : -8 + swoop * 6 - flyUp * 14;
  const since = beat - (CUES.Pickup - 0.05);
  const flap = Math.sin(since * 2.4 * Math.PI * 2) * 3;
  const breath = Math.sin(since * 0.8 * Math.PI * 2) * 1.2;
  const bob = swoop > 0.01 ? flap * (1 - landing) + breath * landing : 0;

  const envOnDesk = (1 - taken) * (1 - out);
  const foldW = ramp(fold, [0, 0.52, 1], [214, 210, 132]);
  const foldH = ramp(fold, [0, 0.52, 1], [268, 252, 86]);
  const sealed = fold > 0.62;

  return {
    T,
    fold,
    seal,
    sealSquash,
    swoop,
    lift,
    taken,
    out,
    cross,
    markIn,
    outro,
    gR,
    gCX,
    gCY,
    gTop: gCY - gR,
    home,
    away,
    deskX,
    deskY,
    birdX,
    birdY,
    birdS,
    heading,
    bob,
    envOnDesk,
    foldW,
    foldH,
    sealed,
  };
}

/** The clock's memory: when it started, the time spent resting at the hold, and the moments
    that happen once (the send landing, the hold, the tap, the end). Times are Date.now() ms. */
export type TravelClock = {
  t0: number;
  /** seconds spent resting at the hold */
  paused: number;
  pauseAt: number | null;
  holdAt: number | null;
  readyAt: number | null;
  tapped: boolean;
  done: boolean;
};

export function newTravelClock(t0: number): TravelClock {
  return { t0, paused: 0, pauseAt: null, holdAt: null, readyAt: null, tapped: false, done: false };
}

/** The clock started again from `now` (Reduce Motion turned off mid-flight): what has happened
    once (the send landing, the hold, the tap, the end) stays happened. */
export function restartTravelClock(c: TravelClock, now: number): void {
  c.t0 = now;
  c.paused = 0;
  c.pauseAt = null;
}

/** One frame of the clock at `now`, with the send landed or not. Returns the authored second, the
    wall clock, and whether this frame is the one the seal taps (Pickup − 0.12) and the one it
    ends on (TOTAL); each is true once. Calling it again at the same `now` changes nothing. */
export function stepTravel(c: TravelClock, now: number, ready: boolean): { T: number; beat: number; tap: boolean; done: boolean } {
  if (ready && c.readyAt === null) c.readyAt = now;
  const wall = (now - c.t0) / 1000;
  let T = wall - c.paused;
  const confirmed = ready && c.readyAt !== null && now - Math.max(c.readyAt, c.holdAt ?? now) >= DONE_MS;
  if (T >= HOLD_AT && !confirmed) {
    if (c.pauseAt === null) c.pauseAt = now;
    if (c.holdAt === null) c.holdAt = now;
    T = HOLD_AT;
  } else if (c.pauseAt !== null) {
    c.paused += (now - c.pauseAt) / 1000;
    c.pauseAt = null;
    T = wall - c.paused;
  }
  let tap = false;
  if (!c.tapped && T >= CUES.Pickup - 0.12) {
    c.tapped = true;
    tap = true;
  }
  let done = false;
  if (!c.done && T >= TOTAL) {
    c.done = true;
    done = true;
  }
  return { T, beat: wall, tap, done };
}

/** The card's second line: "sent" once the send has landed, "still flying…" once the rest at
    the card runs long, else the usual one (null). `beat` is the wall clock in seconds, which
    stays 0 under Reduce Motion (nothing ticks there). */
export function travelCardLine(s: { reduce: boolean; T: number; ready: boolean; heldForMs: number; beat: number }): "done" | "wait" | null {
  const atCard = s.reduce || s.T >= HOLD_AT - 0.01;
  if (!atCard) return null;
  if (s.ready) return "done";
  return s.heldForMs >= WAIT_MS || (s.reduce && s.beat > WAIT_MS / 1000) ? "wait" : null;
}
