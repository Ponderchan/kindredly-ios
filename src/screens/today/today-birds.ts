/* HER FIVE FACES ON TODAY, FOR SWIFT.
   ────────────────────────────────────────────────────────────────────────
   Today's Wren stands on the arc between NEXT and REPLY, reacts, sleeps,
   and flies into the window when the desk is done. Swift draws her from
   five pictures of the user's own Wren (lib/bird-images, captured from the
   real WrenBird by BirdSnapshots: her skin, what she has on, her stage,
   the hatchling's shape and mark, greyed when she wilts), never a stock
   bird and never the mock's drawings:

     idle     content           at rest on the arc, and in the window
     curious  curious56         a drag past 8%, a pass
     delight  delight           REPLY open (typing)
     sleepy   sleepy            the last letter passed at night
     fly      fly               the take-off along the arc into the window

   THE STAGE RULES. No new art; each stage draws what WrenBird has for it:
   - grown (or stage unknown: WrenBird draws her grown until the first
     read lands, and so do the captures): the five poses as listed.
   - hatchling: the same poses. WrenBird gives a hatchling her moods as
     HatchEyes over her own shape, so curious, delight and sleepy are hers.
   - fledgling, and the egg: one drawing whatever the mood (WrenBird has no
     faces for them), so every face asks for content: one capture, not four
     copies of it. She reacts on Swift's side with the lean and the hop.
   - the fly art is the grown bird's only. Below "wren" the fly face is the
     content picture and flyIsPerch is set: Swift tilts her perch drawing
     −12° (the FirstFlight precedent: the chick herself flies, tilted).

   NEVER BLANK. A capture can be missing: the first launch (up to ~4 s), a
   new pose, her wilt flipping (its own captures). While a face is missing
   it falls back to content in the same wilt; while that is missing too,
   to the picture taken in the other wilt (the face, then content), which
   the store still holds from earlier and which this hook only reads (it
   doesn't keep it captured). Only before her first capture of all is a
   face null, and Swift keeps the frame empty.

   Every ref is memoised by its uri and key, and the result by its refs,
   so a props update carries the same objects until a picture changes. */

import { useMemo } from "react";
import type { WrenStage } from "../../components/WrenBird";
import { birdImageRef, useBirdImageRef, type BirdPose } from "../../lib/bird-images";
import type { ImageRefRecord } from "../../lib/images";

export type TodayBirds = {
  idle: ImageRefRecord | null;
  curious: ImageRefRecord | null;
  delight: ImageRefRecord | null;
  sleepy: ImageRefRecord | null;
  fly: ImageRefRecord | null;
  /** the fly face is her perch drawing (below "wren"); Swift tilts it −12° */
  flyIsPerch: boolean;
};

export type TodayFace = "idle" | "curious" | "delight" | "sleepy" | "fly";

/** Which captured pose each face asks for at a stage, and whether she takes off in her perch drawing. Pure. */
export function todayBirdPoses(stage: WrenStage | null): { poses: Record<TodayFace, BirdPose>; flyIsPerch: boolean } {
  const grown = stage === null || stage === "wren";
  const oneDrawing = stage === "egg" || stage === "fledge";
  return {
    poses: {
      idle: "content",
      curious: oneDrawing ? "content" : "curious56",
      delight: oneDrawing ? "content" : "delight",
      sleepy: oneDrawing ? "content" : "sleepy",
      fly: grown ? "fly" : "content",
    },
    flyIsPerch: !grown,
  };
}

/* the store's current picture for a variant, without asking for it to be
   captured; re-rendered by the useBirdImageRef subscriptions beside it */
function usePeekBird(pose: BirdPose, wilt: boolean): ImageRefRecord | null {
  const ref = birdImageRef(pose, wilt);
  const uri = ref?.uri ?? null;
  const key = ref?.key ?? null;
  return useMemo(() => (uri && key ? { uri, key } : null), [uri, key]);
}

const first = (...refs: (ImageRefRecord | null)[]): ImageRefRecord | null => refs.find((r) => r !== null) ?? null;

/**
 * Today's five pictures of her, for KTodayView's `birds`. Keeps the five
 * variants captured while mounted (each with her wilt). A face never goes
 * blank once any picture of her has landed: see the fallbacks above.
 *
 * @param o.wilt  starving (lib/hunger → wilt): every face greyed and drooping, its own captures
 * @param o.stage useWrenStage().stage (null until the first read: drawn grown)
 */
export function useTodayBirds(o: { wilt: boolean; stage: WrenStage | null }): TodayBirds {
  const wilt = o.wilt;
  const { poses, flyIsPerch } = todayBirdPoses(o.stage);

  // kept captured, in her wilt
  const idle = useBirdImageRef(poses.idle, { wilt });
  const curious = useBirdImageRef(poses.curious, { wilt });
  const delight = useBirdImageRef(poses.delight, { wilt });
  const sleepy = useBirdImageRef(poses.sleepy, { wilt });
  const fly = useBirdImageRef(poses.fly, { wilt });

  // read only: the same faces in the other wilt, while hers are being taken
  const idleX = usePeekBird(poses.idle, !wilt);
  const curiousX = usePeekBird(poses.curious, !wilt);
  const delightX = usePeekBird(poses.delight, !wilt);
  const sleepyX = usePeekBird(poses.sleepy, !wilt);
  const flyX = usePeekBird(poses.fly, !wilt);

  const base = first(idle, idleX);
  const curiousRef = first(curious, idle, curiousX, idleX);
  const delightRef = first(delight, idle, delightX, idleX);
  const sleepyRef = first(sleepy, idle, sleepyX, idleX);
  // below "wren" poses.fly is content, so this is the idle ref, as Swift's tilt expects
  const flyRef = first(fly, idle, flyX, idleX);

  return useMemo(
    () => ({ idle: base, curious: curiousRef, delight: delightRef, sleepy: sleepyRef, fly: flyRef, flyIsPerch }),
    [base, curiousRef, delightRef, sleepyRef, flyRef, flyIsPerch],
  );
}
