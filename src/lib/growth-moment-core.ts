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
