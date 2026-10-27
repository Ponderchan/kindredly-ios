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
import { GROWTH_SIZE } from "./growth-moment-core";

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
  | "fcMember"
  // Today (3d x 25b): the wire bird's curious face, at the 56 set's size
  | "curious56"
  // Me 4a (.claude/me4a/ME4A.md §5): the looks tiles and the paywall hero
  | "lookNone"
  | "lookBeanie"
  | "lookScarf"
  | "lookWitch"
  | "lookGhost"
  | "lookWorn"
  | "fcHero"
  // Write to us in Swift (screens/settings/WriteToUsNative): her listening at the opener, delighted when it went
  | "listen24"
  | "delight64"
  // the courier page in Swift (screens/courier): her perch and her wardrobe rack
  | HeroPose
  | RackPose
  | StagePose
  // Wren's room in Swift (screens/wren-room/WrenRoomNative): the empty room's curious official bird
  | "officialCurious"
  // the introduction sheet in Swift (components/IntroductionNative): her at the top, the courier on the road
  | "intro44"
  | "introCourier26"
  // the update prompt's parcel scene in Swift (components/UpdatePrompt): her four faces there
  | "parcelFly"
  | "parcelContent"
  | "parcelCurious"
  | "parcelDelight"
  // the grow-up moment in Swift (components/GrowthMomentNative): her old form and her new one
  | GrowPose;

/* THE COURIER PAGE (/courier in Swift, 2026-10-26). Her perch draws her at the
   React Native perch's 186 in every face she can make there (her whereabouts'
   face, and the faces a tap, a pick-up, a drop and a doze give her), in her own
   look, at her own stage — and bare where React Native draws her bare (a
   fledgling wears nothing on the perch: WrenHome's wearsHere). The wardrobe
   rack's tiles are her at the rack's 46: the looks row pins each coat and wears
   what she has on, the dress row pins each piece and wears her coat. None is
   base: captured only while the page asks. */

/** Every face the courier page's perch can show (all of WrenBird's moods). */
const MOOD_SET: Record<WrenMood, true> = { content: true, happy: true, listen: true, sleepy: true, curious: true, delight: true, think: true, wink: true, worry: true };
export const HERO_MOODS = Object.keys(MOOD_SET) as WrenMood[];
/** every coat, and every piece, as the rack can pin them (a new one fails to compile until it is here) */
const SKIN_SET: Record<WrenSkin, true> = { sticker: true, plush: true, ink: true, moss: true, peach: true };
const ACCESSORY_SET: Record<WrenAccessory, true> = { none: true, beanie: true, scarf: true, phones: true, flower: true, party: true, shades: true, witch: true, ghost: true };
const RACK_SKINS = Object.keys(SKIN_SET) as WrenSkin[];
const RACK_ACCESSORIES = Object.keys(ACCESSORY_SET) as WrenAccessory[];

export type HeroPose = `hero-${WrenMood}` | `hero-${WrenMood}-bare`;
export type RackPose = `rack-skin-${WrenSkin}` | `rack-acc-${WrenAccessory}`;

/* THE JOURNEY (owner, 2026-10-26, "she grows"): her three grown-up forms on the courier page,
   each at its own size so the row shows her growing; in her coat, wearing nothing, content. */
export type StagePose = `stage-${"hatch" | "fledge" | "wren"}`;
export const stagePose = (stage: "hatch" | "fledge" | "wren"): StagePose => `stage-${stage}`;
const STAGE_SIZE = { hatch: 60, fledge: 72, wren: 92 } as const;

/** The perch's picture for a face: in her look, or bare (accessory pinned to none). */
export const heroPose = (mood: WrenMood, bare: boolean): HeroPose => (bare ? `hero-${mood}-bare` : `hero-${mood}`);
/** A looks tile: this coat, wearing what she has on. */
export const rackSkinPose = (skin: WrenSkin): RackPose => `rack-skin-${skin}`;
/** A dress tile: this piece, on her coat. */
export const rackAccessoryPose = (accessory: WrenAccessory): RackPose => `rack-acc-${accessory}`;

/** the perch's size and the rack's (WrenHome HeroWren 186, WardrobeRack 46) */
const HERO_SIZE = 186;
const RACK_SIZE = 46;

const COURIER_POSES = Object.fromEntries([
  ...HERO_MOODS.flatMap((mood) => [
    [heroPose(mood, false), { size: HERO_SIZE, mood }],
    [heroPose(mood, true), { size: HERO_SIZE, mood, accessory: "none" }],
  ]),
  ...RACK_SKINS.map((skin) => [rackSkinPose(skin), { size: RACK_SIZE, mood: "happy", skin }]),
  ...RACK_ACCESSORIES.map((accessory) => [rackAccessoryPose(accessory), { size: RACK_SIZE, mood: "happy", accessory }]),
  ...(["hatch", "fledge", "wren"] as const).map((stage) => [stagePose(stage), { size: STAGE_SIZE[stage], mood: "content", stage, accessory: "none" }]),
]) as Record<HeroPose | RackPose | StagePose, BirdPoseSpec>;

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
  /** false: flying empty-handed (WrenBird's `letter`), for a scene that hands her something else to carry */
  letter?: false;
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
  /* Today's Wren on the arc (screens/today/today-birds): she turns curious on
     a drag and a pass. Her other faces there are the 56 base set (content,
     delight, sleepy, fly), so this is that set's size and the five faces
     crossfade as one drawing. curious24 is the room dock's, too small to
     scale up. Her look and stage, unpinned; the hatchling's face is
     HatchEyes, as for every mood. Not base: captured only while Today asks. */
  curious56: { size: 56, mood: "curious" },
  /* Me 4a's WREN'S LOOKS tiles: the grown bird (an egg wears nothing, so a
     tile at her own stage would show no difference before she hatches),
     her skin, the tile's accessory pinned. lookWorn is the member's First
     Class tile: whatever she has on. Not base: captured only while Me asks. */
  lookNone: { size: 48, mood: "content", stage: "wren", accessory: "none" },
  lookBeanie: { size: 48, mood: "content", stage: "wren", accessory: "beanie" },
  lookScarf: { size: 48, mood: "content", stage: "wren", accessory: "scarf" },
  // the Halloween looks' tiles (in their season the Me row is none · witch · ghost · fc)
  lookWitch: { size: 48, mood: "content", stage: "wren", accessory: "witch" },
  lookGhost: { size: 48, mood: "content", stage: "wren", accessory: "ghost" },
  lookWorn: { size: 48, mood: "content", stage: "wren" },
  // the Swift paywall's hero: the grown bird flying, at 4a's 120, in her look
  fcHero: { size: 120, mood: "content", fly: true, stage: "wren" },
  /* Write to us in Swift: the React Native page's WrenBird beside the opener
     (24, listen) and over the sent page (64, delight), her look and stage.
     Not base: captured only while that page asks. Help and the keepsake
     page draw the base content bird (56) at their 26 and 24. */
  listen24: { size: 24, mood: "listen" },
  delight64: { size: 64, mood: "delight" },
  // the courier page's perch and rack (see COURIER_POSES above)
  ...COURIER_POSES,
  /* Wren's room in Swift: the empty room's OfficialBird (64, curious), whose WrenBird is
     round(64 × .62) = 40 — the brand bird, pinned like "official" (the header's face, as on her
     Kindreds row). Not base: captured only while the room asks. */
  officialCurious: { size: 40, mood: "curious", stage: "wren", skin: "sticker", accessory: "none", mark: null },
  /* The introduction sheet in Swift ("introritual"): React Native's WrenBird over her letter (44,
     content, grown, her look) and the courier flying each letter on the mosaic ritual's road (26,
     delight, flying, the sticker coat, her stage). Not base: captured only while the sheet asks. */
  intro44: { size: 44, mood: "content", stage: "wren" },
  introCourier26: { size: 26, mood: "delight", fly: true, skin: "sticker" },
  /* the update prompt's parcel scene in Swift (components/UpdatePrompt ParcelSheetNative): the
     React Native scene's WrenBird at 96, the grown bird in her own look, flying with the parcel
     instead of a letter of her own, then sitting on it content, curious and delighted. Not base:
     captured only while an update waits (TodayUpdate) or the sheet is up. */
  parcelFly: { size: 96, mood: "content", fly: true, stage: "wren", letter: false },
  parcelContent: { size: 96, mood: "content", stage: "wren" },
  parcelCurious: { size: 96, mood: "curious", stage: "wren" },
  parcelDelight: { size: 96, mood: "delight", stage: "wren" },
  /* the grow-up moment in Swift (see GrowPose at the end of the file): the React Native scene's
     WrenBirds — the old form content, the new one delighted, each at the moment's own size
     (lib/growth-moment-core GROWTH_SIZE), at that stage, wearing nothing, in her coat. Not base:
     captured only while the moment asks. */
  "grow-hatch": { size: GROWTH_SIZE.hatch, mood: "content", stage: "hatch", accessory: "none" },
  "grow-fledge": { size: GROWTH_SIZE.fledge, mood: "content", stage: "fledge", accessory: "none" },
  "grown-fledge": { size: GROWTH_SIZE.fledge, mood: "delight", stage: "fledge", accessory: "none" },
  "grown-wren": { size: GROWTH_SIZE.wren, mood: "delight", stage: "wren", accessory: "none" },
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
 * @param pose  'content' 'mini' 'curious24' 'curious56' 'think20' 'official' 'fcFree' 'fcMember' 'lookNone' 'lookBeanie' 'lookScarf' 'lookWitch' 'lookGhost' 'lookWorn' 'fcHero' (or a Live Activity pose)
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
 * useBirdImageRef for a list of poses that changes with the screen (the courier page's faces
 * and its open wardrobe row): one entry per pose, null until captured, each kept captured while
 * listed. All share `wilt`. The answer is a new object only when a picture changes.
 */
export function useBirdImageRefs<P extends BirdPose>(poses: readonly P[], opts: { wilt?: boolean } = {}): Partial<Record<P, ImageRefRecord>> {
  const wilt = !!opts.wilt;
  const list = Array.from(new Set(poses));
  const key = list.join(",");
  useSyncExternalStore(subscribeBirdImages, birdImagesVersion, birdImagesVersion);
  useEffect(() => {
    const variants = key ? key.split(",").map((p) => birdVariant(p as BirdPose, wilt)) : [];
    const releases = variants.map(want);
    variants.forEach(checkPurged);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") variants.forEach(checkPurged);
    });
    return () => {
      sub.remove();
      releases.forEach((r) => r());
    };
  }, [key, wilt]);
  // the store is read fresh on every render; the memo keys on what was read
  const refs = list.map((p) => birdImageRef(p, wilt));
  const sig = refs.map((r) => (r ? r.key + "|" + r.uri : "")).join(",");
  return useMemo(() => {
    const out: Partial<Record<P, ImageRefRecord>> = {};
    list.forEach((p, i) => {
      const r = refs[i];
      if (r) out[p] = r;
    });
    return out;
    // sig and key say everything the lists hold
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, sig]);
}

/**
 * Her picture's file URI for a Swift screen (or null until captured). Prefer
 * useBirdImageRef when the picture goes into a KImageRef record — it carries the cache key.
 */
export function useBirdImage(pose: BirdPose, opts: { wilt?: boolean } = {}): string | null {
  return useBirdImageRef(pose, opts)?.uri ?? null;
}

/* THE GROW-UP MOMENT IN SWIFT (2026-10-27, components/GrowthMomentNative): her old form ("grow-",
   content) and her new one ("grown-", delighted). The moment only ever goes from a hatchling or a
   fledgling to a fledgling or the grown bird (lib/growth-moment-core growthToShow). */
export type GrowPose = `grow-${"hatch" | "fledge"}` | `grown-${"fledge" | "wren"}`;
/** Her old form's picture for a moment from `stage`; null for a stage the moment never starts from. */
export const growFromPose = (stage: WrenStage): GrowPose | null => (stage === "hatch" || stage === "fledge" ? `grow-${stage}` : null);
/** Her new form's picture for a moment to `stage`. */
export const growToPose = (stage: "fledge" | "wren"): GrowPose => `grown-${stage}`;
