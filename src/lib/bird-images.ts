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
  // the journal book's back cover (lib/journal-book): the brand bird, large enough for print
  | "bookBack"
  // the introduction sheet in Swift (components/IntroductionNative): her at the top, the courier on the road
  | "intro44"
  | "introCourier26"
  // the update prompt's parcel scene in Swift (components/UpdatePrompt): her four faces there
  | "parcelFly"
  | "parcelContent"
  | "parcelCurious"
  | "parcelDelight"
  // the grow-up moment in Swift (components/GrowthMomentNative): her old form and her new one
  | GrowPose
  // Let it travel in Swift (components/LetterTravel): the courier flying, empty-handed
  | "travelFly"
  // the courier card on Me in Swift (behind "couriercard"): her 50 on the arc or the sill, her 44 on the day-off cover
  | CardPose
  // batch 3: the Swift onboarding's doorstep, slide 2 (behind "obroutebird"): Wren flying the route
  | "obRoute"
  // batch 3 (2026-11-09): the empty Kindreds tab's curious bird, the Plush moment, the wardrobe sheet
  | "curious40"
  | "plush128"
  | TryPose
  // batch 3, slice 4: Wren in the compose toolbar, the Notes composer, Make your own face and the face-ready banner
  | Slice4Pose
  // batch 3: the rating ask's two sheets and the crossing in the reader (behind "ratingsheet", "inflight")
  | "rateStamp50"
  | "rateWorry118"
  | "inflightFly34"
  | "inflightStill26"
  // the guide reels in Swift (behind "reels"): her in the reels' scenes (see REEL_POSES)
  | ReelPose
  // Free Flight in Swift (batch 3, "freeflight"): her three faces in the game, at 46
  | FlightPose;

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

/* THE WARDROBE SHEET IN SWIFT (batch 3, behind "wardrobesheet", screens/today/WardrobeSlip). The
   sheet tries looks on before they are kept, so every picture pins BOTH the coat and the piece
   (the sheet's trial, not what she has on): the big bird at the sheet's 150 (happy), and the
   rack's tiles at 46 (happy) — the looks row each coat in the trial piece, the dress row each
   piece on the trial coat. Her stage, shape and mark are hers. Not base: captured only while
   the sheet asks. */
export type TryPose = `try-${WrenSkin}-${WrenAccessory}` | `trytile-${WrenSkin}-${WrenAccessory}`;
/** The wardrobe sheet's big bird in this coat and piece. */
export const tryPose = (skin: WrenSkin, accessory: WrenAccessory): TryPose => `try-${skin}-${accessory}`;
/** A wardrobe-sheet rack tile in this coat and piece. */
export const tryTilePose = (skin: WrenSkin, accessory: WrenAccessory): TryPose => `trytile-${skin}-${accessory}`;
const TRY_SIZE = 150;
const TRY_POSES = Object.fromEntries(
  RACK_SKINS.flatMap((skin) =>
    RACK_ACCESSORIES.flatMap((accessory) => [
      [tryPose(skin, accessory), { size: TRY_SIZE, mood: "happy", skin, accessory }],
      [tryTilePose(skin, accessory), { size: RACK_SIZE, mood: "happy", skin, accessory }],
    ]),
  ),
) as Record<TryPose, BirdPoseSpec>;

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
  /** false: the fly pose without the letter under her feet (WrenBird `letter`), for a scene that
      hands her something else to carry or flies her empty-handed */
  letter?: false;
};

/* THE COURIER CARD ON ME (Swift, behind "couriercard", 2026-10-27). The React
   Native card draws WrenBird live at her card stage (Me's stage floor, which
   can sit above her own: it only moves forward), so each picture pins that
   stage: 50 on the sill in her face (hunger's, or her whereabouts'), 50 in
   flight (the fly drawing, which carries its letter; its face is the
   drawing's own), and 44 on her day-off cover, happy, flying empty-handed
   when grown, perched before. Her look is hers. Not base: captured only
   while the card asks (components/courier-card-model courierCardPose). */
const CARD_STAGES = ["egg", "hatch", "fledge", "wren"] as const satisfies readonly WrenStage[];
export type CardPose = `card-${WrenStage}-${WrenMood}` | `card-fly-${WrenStage}` | `card-dayoff-${WrenStage}`;
const CARD_POSES = Object.fromEntries(
  CARD_STAGES.flatMap((stage) => [
    ...HERO_MOODS.map((mood) => [`card-${stage}-${mood}`, { size: 50, mood, stage }]),
    [`card-fly-${stage}`, { size: 50, mood: "content", fly: true, stage }],
    [`card-dayoff-${stage}`, stage === "wren" ? { size: 44, mood: "happy", fly: true, stage, letter: false } : { size: 44, mood: "happy", stage }],
  ]),
) as Record<CardPose, BirdPoseSpec>;

/* BATCH 3, SLICE 4 (2026-11-09): the last WrenBirds React Native drew inside Swift pages, each
   behind its own switch (lib/surfaces). Sizes and moods are the React Native call sites' own; her
   look and stage are hers (nothing pinned, as those WrenBirds pinned nothing). None is base:
   captured only while a page asks.
   - "composewren": the compose toolbar's Wren (screens/compose/ComposeNative WrenIsland), 38, in
     every face her read of the letter can give her (lib/wren-read readMood goes through the
     courier's read, so any mood); Swift breathes and zooms the picture.
   - "notewren": the Notes composer's Wren (screens/journal-entry/NoteComposeNative), 30, content.
   - "facewren": Make your own face's Wren (screens/make-face/MakeFaceNative), curious at 72 and
     content at 64; delighted at 56 is the base "delight" pose, the same drawing.
   - "faceready": the face-ready banner's Wren (components/FaceReadyBanner), 30, delighted. */
export type ComposeWrenPose = `compose-${WrenMood}`;
export type Slice4Pose = ComposeWrenPose | "note30" | "faceCurious72" | "faceContent64" | "faceReady30";
/** The compose toolbar's picture for a mood. */
export const composeWrenPose = (mood: WrenMood): ComposeWrenPose => `compose-${mood}`;
/** Every face the compose toolbar can show, in WrenBird's order. */
export const COMPOSE_WREN_MOODS: readonly WrenMood[] = HERO_MOODS;
const SLICE4_POSES = {
  ...Object.fromEntries(HERO_MOODS.map((mood) => [composeWrenPose(mood), { size: 38, mood }])),
  note30: { size: 30, mood: "content" },
  faceCurious72: { size: 72, mood: "curious" },
  faceContent64: { size: 64, mood: "content" },
  faceReady30: { size: 30, mood: "delight" },
} as Record<Slice4Pose, BirdPoseSpec>;

/* THE GUIDE REELS IN SWIFT (2026-11-09, behind "reels": components/guide-reel/swift-reels). The
   React Native reels draw WrenBird at a fraction of the square's side; each picture here is her
   at that fraction of the widest square (360), in her own look and stage as the reels leave them,
   so Swift only ever draws her a little smaller. Not base: captured only while a Swift reel asks. */
/** the courier reel's coats (Sky, Mist, Peach, Night) */
const REEL_COATS = ["sticker", "plush", "peach", "ink"] as const;
/* the courier reel draws her at her own stage, or hatched while she is still an egg (courier.tsx
   useHatchedStage): each of those pictures comes twice, as she is and hatched ("-h") */
type ReelStaged = `reelCoat-${(typeof REEL_COATS)[number]}` | "reelCoatBeanie" | "reelCurious" | "reelDelight";
export type ReelPose = "reelSleepy" | "reelContent" | "reelFlyHappy" | "reelFlyEmpty" | "reelHappy" | "reelHatchContent" | "reelHatchDelight" | "reelHatchCurious" | ReelStaged | `${ReelStaged}-h`;
const REEL_STAGED: Record<ReelStaged, BirdPoseSpec> = {
  // the dressing disc (.52 s): each coat bare and content, then Night with the beanie, delighted
  ...(Object.fromEntries(REEL_COATS.map((skin) => [`reelCoat-${skin}`, { size: 188, mood: "content", skin, accessory: "none" }])) as Record<`reelCoat-${(typeof REEL_COATS)[number]}`, BirdPoseSpec>),
  reelCoatBeanie: { size: 188, mood: "delight", skin: "ink", accessory: "beanie" },
  // under Settings' switches (.27 s) and in the Live Activity (.16 s): curious, then glad
  reelCurious: { size: 98, mood: "curious" },
  reelDelight: { size: 98, mood: "delight" },
};
const REEL_POSES: Record<ReelPose, BirdPoseSpec> = {
  // sealed: dozing by the cloud (.27 s); letters: by the desk, content then sleepy (.24 s)
  reelSleepy: { size: 98, mood: "sleepy" },
  reelContent: { size: 87, mood: "content" },
  // letters: the courier over the desks (.26 s) and past the title (.22 s), flying, happy
  reelFlyHappy: { size: 94, mood: "happy", fly: true },
  // kindreds: bringing the reply (.34 s), flying, happy, the envelope drawn apart from her
  reelFlyEmpty: { size: 123, mood: "happy", fly: true, letter: false },
  // the 1.0.5 release reel: perched on the list of courier names (.16 s), happy
  reelHappy: { size: 58, mood: "happy" },
  // courier: the hatchling out of the egg (.56 s) and under her name tag (.46 s), bare
  reelHatchContent: { size: 202, mood: "content", stage: "hatch", accessory: "none" },
  reelHatchDelight: { size: 202, mood: "delight", stage: "hatch", accessory: "none" },
  reelHatchCurious: { size: 202, mood: "curious", stage: "hatch", accessory: "none" },
  ...REEL_STAGED,
  ...(Object.fromEntries(Object.entries(REEL_STAGED).map(([k, v]) => [`${k}-h`, { ...v, stage: "hatch" }])) as Record<`${ReelStaged}-h`, BirdPoseSpec>),
};

/* FREE FLIGHT IN SWIFT (batch 3, "freeflight"; Portable/Courier/KFreeFlight.swift). The React
   Native game draws WrenBird at 46 at the courier page's stage: curious before take-off, happy in
   flight, worried after a crash; the fly drawing without its letter when grown, perched before;
   wearing her piece only when hatched or grown (WrenHome wearsHere), so a fledgling's is pinned
   bare. Her look is hers. Not base: captured only while the Swift game may be opened. */
export type FlightStage = "hatch" | "fledge" | "wren";
export type FlightMood = "curious" | "happy" | "worry";
export type FlightPose = `ff-${FlightStage}-${FlightMood}`;
export const flightPose = (stage: FlightStage, mood: FlightMood): FlightPose => `ff-${stage}-${mood}`;
const FLIGHT_POSES = Object.fromEntries(
  (["hatch", "fledge", "wren"] as const).flatMap((stage) =>
    (["curious", "happy", "worry"] as const).map((mood) => [
      flightPose(stage, mood),
      {
        size: 46,
        mood,
        stage,
        ...(stage === "wren" ? { fly: true, letter: false } : {}),
        ...(stage === "fledge" ? { accessory: "none" } : {}),
      },
    ]),
  ),
) as Record<FlightPose, BirdPoseSpec>;

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
  /* The journal book's back cover (journal book, 2026-11-10; lib/journal-book useBookWren): the
     brand bird, pinned like "official" — the book is the reader's, the mark on its back is the
     press's — but at 120, because the page is PRINTED: she sits about 118pt wide on an A5 sheet,
     and the 48pt "official" capture would come out soft on paper. Not base: captured only while
     the export page asks. */
  bookBack: { size: 120, mood: "content", stage: "wren", skin: "sticker", accessory: "none", mark: null },
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
  /* Let it travel in Swift: LetterTravel's own WrenBird (pose fly, mood delight, letter false —
     the envelope she carries is drawn at her beak), in her look. Captured at 112, the most the
     piece draws her (132 × .74 × the sheet's scale), and scaled down as she flies off. Not base:
     the compose page asks for it while the switch is on (LetterTravelWarm), so she is there
     before the first send. */
  travelFly: { size: 112, mood: "delight", fly: true, letter: false },
  // the courier card on Me in Swift (see CARD_POSES above)
  ...CARD_POSES,
  /* batch 3: the Swift onboarding's doorstep, slide 2 ("obroutebird"): s01-showcase's WrenBird 50,
     flying (with her letter), the grown bird in the sticker coat wearing nothing — the brand bird,
     every part pinned, never the account's look (no one has one yet). KObSlide2 flies and turns
     the picture. Not base: captured only while the doorstep asks. */
  obRoute: { size: 50, mood: "content", fly: true, stage: "wren", skin: "sticker", accessory: "none", mark: null },

  /* batch 3 (2026-11-09). The empty Kindreds tab in Swift ("kindredsempty"): KindredsEmpty's
     WrenBird at the edge of the empty sky (40, curious, her look and stage). The Plush moment in
     Swift ("plush"): PlushCelebration's WrenBird (128, happy, the Plush coat pinned, the rest
     hers). The wardrobe sheet's pictures (see TRY_POSES above). Not base: captured only while
     each asks. */
  curious40: { size: 40, mood: "curious" },
  plush128: { size: 128, mood: "happy", skin: "plush" },
  ...TRY_POSES,

  // batch 3, slice 4 (see SLICE4_POSES above)
  ...SLICE4_POSES,

  /* batch 3 (2026-11-09). The rating ask in Swift ("ratingsheet", components/RatingAsk): the founder
     letter's stamp draws WrenBird at 50 flying, happy; Wren's review draws her at 118, worried (her
     fidget and the sweat bead are SwiftUI motion on this picture). The crossing in the reader
     ("inflight", components/LetterInFlight): 34 flying, delighted, with the letter under her feet,
     and Reduce Motion's still row at 26, flying, content. Her look, not pinned. Not base: captured
     only while a sheet or the crossing asks. */
  rateStamp50: { size: 50, mood: "happy", fly: true },
  rateWorry118: { size: 118, mood: "worry" },
  inflightFly34: { size: 34, mood: "delight", fly: true },
  inflightStill26: { size: 26, mood: "content", fly: true },

  // the guide reels in Swift (see REEL_POSES above)
  ...REEL_POSES,

  // Free Flight in Swift (see FLIGHT_POSES above)
  ...FLIGHT_POSES,
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

