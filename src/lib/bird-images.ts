/* HER PICTURE, FOR SWIFT.
   ────────────────────────────────────────────────────────────────────────
   SwiftUI can't run WrenBird's SVG, and the owner rules out a stock bird:
   the Wren on a Swift screen is the user's own — her skin, what she has
   on, her stage, the hatchling's shape and mark, greying when she's
   starving. So she is captured from the real WrenBird, offscreen
   (components/BirdSnapshots, mounted once in the root layout), to a tmp
   PNG, and Swift draws the file (always with an explicit frame: the file
   is screen-scale pixels with no @3x suffix).

   A picture is a POSE (size, mood, and anything pinned) plus WILT.
   Recaptured when:
   - her look changes (skin, accessory, stage, the hatchling's form or
     mark) — one frame after the change, so the capture isn't the old look;
   - iOS has purged the tmp file (checked on mount and on coming back to
     the app; a missing file is recaptured, never left as a blank).

   Snapshots are for static birds in lists and docks only. An animated
   Wren stays an RN island in a KSlot.

   THE KEY KImageStore caches under is the pose and the look, plus this
   launch's token: a recapture of the same look reuses the cached pixels,
   and a new bundle (an OTA can redraw her) never meets a stale picture
   from an older one. */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import type { WrenAccessory, WrenMood, WrenSkin, WrenStage } from "../components/WrenBird";
import type { HatchlingForm } from "./hatchling-form";
import { fileExists, snapshotCacheKey, type ImageRefRecord } from "./images";
import { hashStr } from "./mosaic";

/** Every pose BirdSnapshots can draw. */
export type BirdPose =
  // the Live Activity set (always mounted; snapshotBird)
  | "content"
  | "sleepy"
  | "delight"
  | "fly"
  | "mini"
  // step 5, for Swift screens
  | "curious24"
  | "think20"
  | "official"
  | "fcFree"
  | "fcMember";

/** What a pose draws. Anything pinned overrides the user's look; the rest is hers. */
export type BirdPoseSpec = {
  /** capture size in points. WrenBird draws the mini mark at 20 or below, whatever the mood */
  size: number;
  mood: WrenMood;
  fly?: boolean;
  stage?: WrenStage;
  skin?: WrenSkin;
  accessory?: WrenAccessory;
  /** null pins "no birthmark" */
  mark?: null;
  /** always mounted, for snapshotBird (Live Activities) */
  base?: boolean;
};

/* sizes are the RN call sites' own, so the Swift picture is the same drawing */
export const BIRD_POSES: Record<BirdPose, BirdPoseSpec> = {
  content: { size: 56, mood: "content", base: true },
  sleepy: { size: 56, mood: "sleepy", base: true },
  delight: { size: 56, mood: "delight", base: true },
  fly: { size: 56, mood: "content", fly: true, base: true },
  // the corner mark (EveningAsk's 18pt row, the dock's small bird)
  mini: { size: 20, mood: "content", base: true },
  // room dock: the Wren tool (room/[id].tsx:1000)
  curious24: { size: 24, mood: "curious" },
  // room dock: an expired room (room/[id].tsx:979). At 20pt WrenBird draws
  // the mini mark, so this is the mini drawing — as it is in React Native
  think20: { size: 20, mood: "think" },
  // Wren's own desk row (OfficialBird): the brand bird, never the user's
  // look or stage (WrenDesk.tsx drew her at the user's stage — fixed here)
  official: { size: 48, mood: "content", stage: "wren", skin: "sticker", accessory: "none", mark: null },
  // the First Class stamp (FirstClassStub.tsx:50): the grown bird in the user's look
  fcFree: { size: 36, mood: "curious", stage: "wren" },
  fcMember: { size: 36, mood: "delight", stage: "wren" },
};

/** The user's look, as BirdSnapshots reads it from the Wren contexts. */
export type BirdLook = {
  skin: WrenSkin;
  accessory: WrenAccessory;
  /** null until the first stage read lands (WrenBird then draws her grown) */
  stage: WrenStage | null;
  mark: string | null;
  form: HatchlingForm | null;
};

/* ── the store ─────────────────────────────────────────────────────────── */

/* purged: iOS deleted the file. The ref stays (KImageStore likely still
   holds the pixels under the same key) while it is captured again */
type Shot = { uri: string; look: string; purged?: boolean };

let look: BirdLook | null = null;
const shots = new Map<string, Shot>(); // variant → its last capture
const wanted = new Map<string, number>(); // variant → hooks asking for it
const failures = new Map<string, { look: string; n: number }>();
const MAX_FAILURES = 3;
let version = 0;
const listeners = new Set<() => void>();
function bump() {
  version++;
  listeners.forEach((l) => l());
}

/** "pose" or "pose:wilt" — one captured picture. */
export const birdVariant = (pose: BirdPose, wilt = false): string => (wilt ? pose + ":wilt" : pose);
/** The pose and wilt flag back out of a variant string. */
export function parseBirdVariant(v: string): { pose: BirdPose; wilt: boolean } {
  const wilt = v.endsWith(":wilt");
  return { pose: (wilt ? v.slice(0, -5) : v) as BirdPose, wilt };
}

/** The look a pose actually draws: its pins over the user's look. Stage 'hatch' adds her mark and shape. */
export function poseLook(pose: BirdPose, l: BirdLook | null = look): string {
  const spec = BIRD_POSES[pose];
  const skin = spec.skin ?? l?.skin ?? "sticker";
  const accessory = spec.accessory ?? l?.accessory ?? "none";
  const stage = spec.stage ?? l?.stage ?? "wren";
  let s = `${skin}:${accessory}:${stage}`;
  if (stage === "hatch") {
    const mark = spec.mark === null ? "" : l?.mark ?? "";
    s += `:${mark}:${l?.form ? hashStr(JSON.stringify(l.form)).toString(36) : ""}`;
  }
  return s;
}

const BIRD_LOOK_KEYS: (keyof BirdLook)[] = ["skin", "accessory", "stage", "mark", "form"];

let lookStamp = 0;

/** For BirdSnapshots: publish the user's current look (after the views below it have it). */
export function setBirdLook(l: BirdLook): void {
  const prev = look;
  const changed = !prev || BIRD_LOOK_KEYS.some((k) => (k === "form" ? JSON.stringify(prev.form) !== JSON.stringify(l.form) : prev[k] !== l[k]));
  look = l;
  if (changed) {
    lookStamp++;
    bump();
  }
}

/** For BirdSnapshots: changes whenever the published look does — a capture loop re-settles when it moves. */
export const birdLookStamp = (): number => lookStamp;

/** For BirdSnapshots: the variants some screen is showing. */
export function wantedBirdVariants(): string[] {
  return Array.from(wanted.keys());
}

/** For BirdSnapshots: does this variant need a (re)capture for the current look? False once it has failed MAX_FAILURES times on this look. */
export function birdNeedsCapture(v: string): boolean {
  if (!look) return false; // the contexts haven't been read yet: capture once they are
  const { pose } = parseBirdVariant(v);
  const want = poseLook(pose);
  const f = failures.get(v);
  if (f && f.look === want && f.n >= MAX_FAILURES) return false;
  const s = shots.get(v);
  return !s || !!s.purged || s.look !== want;
}

/** For BirdSnapshots: a capture finished (uri) or failed (null) for the look it was taken in. */
export function settleBirdCapture(v: string, capturedLook: string, uri: string | null): void {
  if (uri) {
    failures.delete(v);
    shots.set(v, { uri, look: capturedLook });
  } else {
    const f = failures.get(v);
    failures.set(v, { look: capturedLook, n: f && f.look === capturedLook ? f.n + 1 : 1 });
    if (__DEV__) console.warn("[bird-images] capture failed:", v, capturedLook);
  }
  bump();
}

/** Subscribe to the store (BirdSnapshots and the hooks). */
export function subscribeBirdImages(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export const birdImagesVersion = (): number => version;

function want(v: string): () => void {
  wanted.set(v, (wanted.get(v) ?? 0) + 1);
  bump();
  return () => {
    const n = (wanted.get(v) ?? 1) - 1;
    if (n > 0) wanted.set(v, n);
    else {
      wanted.delete(v);
      bump(); // BirdSnapshots may stop drawing it
    }
  };
}

/** Mark a capture whose file iOS has purged, so it is taken again. */
function checkPurged(v: string): void {
  const s = shots.get(v);
  if (!s || s.purged || fileExists(s.uri)) return;
  shots.set(v, { ...s, purged: true });
  bump();
}

/** The current picture for a variant, as a SwiftUI image ref (null until the first capture lands). */
export function birdImageRef(pose: BirdPose, wilt = false): ImageRefRecord | null {
  const v = birdVariant(pose, wilt);
  const s = shots.get(v);
  if (!s) return null;
  return { uri: s.uri, key: snapshotCacheKey(`bird:${pose}:${s.look}:${wilt ? 1 : 0}`) };
}

/**
 * Her picture for a Swift screen, as { uri, key } (KImageRef). null until the first
 * capture lands (up to ~4s at launch) — keep the frame and draw nothing, or the
 * placeholder the screen already has. While a new look is being captured the
 * previous picture stays. Keeps the variant captured while mounted.
 *
 * @param pose  'content' 'mini' 'curious24' 'think20' 'official' 'fcFree' 'fcMember' (or a Live Activity pose)
 * @param opts.wilt starving (lib/hunger → wilt): greyed and drooping. Its own capture.
 */
export function useBirdImageRef(pose: BirdPose, opts: { wilt?: boolean } = {}): ImageRefRecord | null {
  const wilt = !!opts.wilt;
  const v = birdVariant(pose, wilt);
  useSyncExternalStore(subscribeBirdImages, birdImagesVersion, birdImagesVersion);
  useEffect(() => {
    const release = want(v);
    checkPurged(v);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") checkPurged(v);
    });
    return () => {
      sub.remove();
      release();
    };
  }, [v]);
  // the store is read fresh on every render; subscribing is what re-renders this hook
  const ref = birdImageRef(pose, wilt);
  const uri = ref?.uri ?? null;
  const key = ref?.key ?? null;
  return useMemo(() => (uri && key ? { uri, key } : null), [uri, key]);
}

/**
 * Her picture's file URI for a Swift screen (or null until captured). Prefer
 * useBirdImageRef when the picture goes into a KImageRef record — it carries the cache key.
 */
export function useBirdImage(pose: BirdPose, opts: { wilt?: boolean } = {}): string | null {
  return useBirdImageRef(pose, opts)?.uri ?? null;
}
