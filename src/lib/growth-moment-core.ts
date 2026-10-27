import type { WrenStage } from "../components/WrenBird";

/* WHEN WREN GROWS UP, ONCE (owner, 2026-10-26, option 1 "全屏换羽": a full-screen moment the next
   time the app is open after she fledges or grows up). Pure, so it is tested with plain node
   (growth-moment-core.test.ts); lib/growth-moment.ts stores `seen` and reads her stage.

   - `seen` is the last stage a moment was shown for. Nothing stored yet (the first run of a build
     with this feature, or a new phone) is a baseline: whatever she is now counts as seen, so
     nobody who grew up weeks ago is told it happened today.
   - Only fledging and growing up have a moment: hatching is the first flight's own scene
     (onboarding), and an egg never moves back.
   - A jump of two stages (hatch → grown in one go) shows one moment, from the form last seen to
     the one she has now. */

const ORDER: readonly WrenStage[] = ["egg", "hatch", "fledge", "wren"];
const at = (s: WrenStage) => ORDER.indexOf(s);

export type GrowthMoment = { from: WrenStage; to: "fledge" | "wren" };

export function growthToShow(now: WrenStage, seen: WrenStage | null): { moment: GrowthMoment | null; seen: WrenStage } {
  if (seen === null || at(seen) < 0) return { moment: null, seen: now };
  if (at(now) <= at(seen)) return { moment: null, seen };
  if (now === "fledge" || now === "wren") return { moment: { from: seen === "egg" ? "hatch" : seen, to: now }, seen: now };
  return { moment: null, seen: now };
}

/** A stored value, read back: a stage, or null for anything else. */
export function asStage(raw: unknown): WrenStage | null {
  return typeof raw === "string" && (ORDER as readonly string[]).includes(raw) ? (raw as WrenStage) : null;
}

/* THE MOMENT ITSELF, shared by its two renderers (components/GrowthMoment: the React Native scene,
   and the SwiftUI one behind the "growthmoment" switch, components/GrowthMomentNative). Every
   number here is the React Native scene's own, moved out so both draw the same two seconds. */

/** Her size in each form (WrenBird size, points): the new form is drawn larger, so the change reads. */
export const GROWTH_SIZE: Record<WrenStage, number> = { egg: 160, hatch: 160, fledge: 190, wren: 230 };

/** The moment's clock, in ms from its start. Every eased beat runs on Reanimated's default curve
    (in-out quad) unless GROWTH_CURVES names one. */
export const GROWTH_BEATS = {
  /** the lavender ground fades in */
  ground: 300,
  /** the old form shakes: one step of GROWTH_SHAKE every shakeStep, linear */
  shakeAt: 450,
  shakeStep: 110,
  /** the old form swells a quarter and gives way */
  outAt: 1150,
  outMs: 220,
  /** the feathers and sparks fly out (GROWTH_CURVES.burst) */
  burstAt: 1150,
  burstMs: 900,
  /** the new form pops in, larger (GROWTH_CURVES.pop) */
  popAt: 1270,
  popMs: 520,
  /** the one tap of haptics (medium) */
  hapticAt: 1300,
  /** the stage stamp lands (GROWTH_CURVES.stamp) */
  stampAt: 1850,
  stampMs: 360,
  /** her line and the key */
  wordsAt: 2150,
  wordsMs: 300,
  /** then she bobs: bobBy points up over bobMs and back, for as long as it is up */
  bobAt: 2500,
  bobMs: 1200,
  bobBy: 5,
  /** Reduce Motion: the ground over groundStill, then the new form, the stamp and the line over
      still, all from the start; no shake, no burst, no bob, no haptics */
  groundStill: 250,
  still: 300,
} as const;

/** The shake's steps, points left and right, ending where it began. */
export const GROWTH_SHAKE: readonly number[] = [-6, 6, -5, 5, -3, 0];

/** The burst's pieces: every third a gold spark, the rest lilac feathers. */
export const GROWTH_BURST = 14;

/** The eased beats' cubic Béziers (x1, y1, x2, y2), as Reanimated's Easing.bezier takes them. */
export const GROWTH_CURVES: Record<"burst" | "pop" | "stamp", readonly [number, number, number, number]> = {
  burst: [0.2, 0.8, 0.3, 1],
  pop: [0.3, 1.4, 0.5, 1],
  stamp: [0.5, 0, 0.6, 1.4],
};

/** The moment's words: her line, and the stamp's mark (the stage's name and the day, in capitals). */
export function growthWords(m: GrowthMoment, t: (key: string) => string, day: string): { line: string; mark: string } {
  const line = t(m.to === "wren" ? "grow.line.wren" : "grow.line.fledge");
  const stage = t(m.to === "wren" ? "wren.name.grown" : "wren.name.fledge");
  return { line, mark: `${stage} · ${day}`.toUpperCase() };
}
