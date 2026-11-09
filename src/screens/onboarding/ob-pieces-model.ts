/* THE SWIFT ONBOARDING'S LAST FOUR PIECES, THE PURE PART (2026-11-09, batch 3 slice 2).
   ────────────────────────────────────────────────────────────────────────
   OnboardingNative's four React Native islands — Wren flying on the doorstep ("obroutebird"),
   the hatch on 9 ("hatch"), the named chick on 10, 11 and 13 ("obchick") and the first flight on
   12 and behind 13 ("obflight") — can each be drawn by the Swift run instead (ob-pieces.tsx).
   Swift never redraws her: it is handed pictures of the run's own hatchling, captured from the
   real WrenBird / HatchlingRig. What is decided here, free of React Native so its test runs with
   plain node (ob-pieces-model.test.ts):
   - which pictures the run needs now (shotPlan), and the signature of the look they are taken in
     (runLookSig: the read's form and the shell's mark — the RUN's look, never the account's);
   - the idle motions' weights as Swift draws them (motionRows: chick-motions pickMotion's weight
     per dimension, with each motion's length and face, so Swift keeps no table of its own);
   - the burst's place as Swift reports it (parseBurst). */

/** every face the chick and the hatchling can make (WrenBird's moods) */
export const RUN_MOODS = ["content", "happy", "listen", "sleepy", "curious", "delight", "think", "wink", "worry"] as const;
export type RunMood = (typeof RUN_MOODS)[number];

/** the rig's moving parts at rest (HatchlingRig HatchlingPart); "face" is captured per mood */
export const RIG_LAYERS = ["tail", "farWing", "legL", "base", "nearWing"] as const;
export type RigLayer = (typeof RIG_LAYERS)[number];

/** the whole chick's capture size: the most it is drawn (10, keyboard down). 96 (11, 13), 64 (10,
    keyboard up) and the flight's 90 are the same drawing, scaled down */
export const CHICK_SHOT = 104;
/** the hatchling's capture size on 9: HatchStage's bird at full rise, round(148 × 1.18 / 1.18) */
export const RIG_SHOT = 148;

/** The run's look as one string: what the hatch read made of her (form) and the shell's mark. A
    new letter (a back to 7) is a new look, so its pictures are taken again. */
export function runLookSig(form: unknown, mark: string | null | undefined): string {
  const s = JSON.stringify(form ?? null) + "|" + (mark ?? "");
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** The screens in the run's order (flow SCREENS), as far as the plan needs them. */
const ORDER = ["doorstep", "egg", "birthday", "pronoun", "face", "envelope", "letter", "stamp", "hatch", "name", "address", "flight", "knock"];

/**
 * Which pictures to keep captured on `screen`. Taken from 8 (the stamp: the letter is written, so
 * her form is known) so they are there before she is: the rig until the hatch is over, the whole
 * chick (the chick's faces, and the flight's) from 8 to the end. Nothing for a piece React Native
 * draws. An unknown screen needs nothing.
 */
export function shotPlan(screen: string, on: { chick: boolean; flight: boolean; hatch: boolean }): { birds: boolean; rig: boolean } {
  const i = ORDER.indexOf(screen);
  const from = ORDER.indexOf("stamp");
  if (i < from) return { birds: false, rig: false };
  return { birds: on.chick || on.flight, rig: on.hatch && i <= ORDER.indexOf("hatch") };
}

/** One idle motion as Swift draws it: its weight in the draw, its length (s) and its face ("" keeps hers). */
export type MotionRow = { m: string; w: number; s: number; face: string };

/**
 * chick-motions pickMotion's weights for the read's dimensions: score^1.5 with a small floor,
 * ×2.5 when the read locked it. Swift draws from these (never the last one twice running), with
 * each motion's length (MOTION_S) and face (FACE_OF_MOTION) carried along.
 */
export function motionRows(
  dims: readonly { key: string; score: number; locked: boolean }[],
  motionOf: Readonly<Record<string, string>>,
  seconds: Readonly<Record<string, number>>,
  faces: Readonly<Record<string, string | null>>,
): MotionRow[] {
  const out: MotionRow[] = [];
  for (const d of dims) {
    const m = motionOf[d.key];
    if (!m) continue;
    out.push({ m, w: (0.08 + Math.pow(Math.max(0, d.score) / 100, 1.5)) * (d.locked ? 2.5 : 1), s: seconds[m] ?? 1, face: faces[m] ?? "" });
  }
  return out;
}

/** The crack's place as Swift sends it ("x,y" in window points), or null. */
export function parseBurst(s: string): { x: number; y: number } | null {
  const [x, y] = s.split(",").map(Number);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}
