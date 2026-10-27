/* THE PARCEL SCENE, AS DATA (the update prompt's drawing and clock, shared by both renderers).
   ────────────────────────────────────────────────────────────────────────
   Pure: no React, no React Native, no colours (the brand colours are themes.json's, read by each
   renderer: BRAND in React Native, KBrand in Swift), so
     node src/components/update-parcel.test.ts
   locks the geometry. The React Native scene (components/UpdatePrompt ParcelScene, the "parcel"
   switch's fallback) draws from these, and the SwiftUI one (KParcelSheetView) is sent the very
   same paths, beats and the geometry for its width, so the two can't drift apart.

   THE PARCEL is cut into layers so each part can move: the body (front, inside, flaps, stamp)
   under Wren, the bow over her. Every layer is the same PW × PH box. */

/** the parcel's box, in points and in its viewBox alike */
export const PW = 120;
export const PH = 100;

/* the front face, its foot rounded; the top seen a little from above, as two flaps meeting in the middle */
export const PARCEL_ART = {
  front: "M4 26 H116 V92 Q116 96 112 96 H8 Q4 96 4 92 Z",
  frontShade: "M4 26 H116 V31 H4 Z",
  top: "M14 6 H106 L116 26 H4 Z",
  flapL: "M14 6 H60 V26 H4 Z",
  flapR: "M60 6 H106 L116 26 H60 Z",
  ribbonFront: "M54 26 H66 V96 H54 Z",
  ribbonL: "M55 6 H60 V26 H54 Z",
  ribbonR: "M60 6 H65 L66 26 H60 Z",
  /* the bow, its knot on the front edge at (60, 26) */
  bowLoops: "M60 26 C50 10 34 11 37 21 C39 28 51 29 60 26 Z M60 26 C70 10 86 11 83 21 C81 28 69 29 60 26 Z",
  bowShade: "M60 26 C53 17 44 17 45 22 C46 26 53 27 60 26 Z M60 26 C67 17 76 17 75 22 C74 26 67 27 60 26 Z",
  bowTails: "M57 29 L49 43 L54 41.5 L57 45 L60 30 Z M63 29 L71 43 L66 41.5 L63 45 L60 30 Z",
  /** the knot's square, x y w h r */
  knot: { x: 55.5, y: 21.5, w: 9, h: 9, r: 3 },
  /** the four-point star the open box throws (a 20 box) */
  star: "M10 0 L12.6 7.4 L20 10 L12.6 12.6 L10 20 L7.4 12.6 L0 10 L7.4 7.4 Z",
} as const;

/** where the version stamp sits on the front */
export const STAMP = { x: 18, y: 52, w: 84, h: 24 } as const;

/** the points things turn about, in the box: the box's foot (its shake), the bow's knot, the flaps' hinges */
export const PIVOTS = {
  foot: { x: PW / 2, y: 96 },
  knot: { x: 60, y: 26 },
  flapL: { x: 4, y: 26 },
  flapR: { x: 116, y: 26 },
} as const;

export const SCENE_H = 214;
/** Wren's size, perched or flying */
export const S = 96;
/* her feet in her own box (WrenBird's 200 viewBox at S): perched, between the two feet; flying,
   where the letter would hang (the official fly art) */
export const PERCH_FEET = { x: 47, y: 83 } as const;
export const FLY_FEET = { x: 51, y: 79 } as const;
/* flying, the parcel hangs from her feet by the bow's loops (their top is at y 12 in the box) */
export const CARRY = { dx: FLY_FEET.x - PW / 2, dy: FLY_FEET.y - 12 + 2 } as const;

/** the beats, in ms */
export const BEATS = {
  /** the sheet rises first */
  start: 280,
  fly: 950,
  hover: 220,
  drop: 300,
  /** from the drop to her feet on the lid */
  land: 640,
  settle: 160,
  firstShake: 1400,
  shakeEvery: [3400, 5200] as readonly [number, number],
  curious: 1300,
  bow: 520,
  flapDelay: 90,
  flap: 320,
  starsDelay: 140,
  stars: 760,
  /** each star's own flight, inside `stars` */
  starRun: 560,
  /** from Update to the App Store */
  open: 820,
  /** hard mode: from the App Store opening to the closed parcel again */
  reset: 1200,
  /** the dev preview's ?play=1: Update presses itself this long after the sheet opens */
  autoPlay: 4600,
} as const;

/** a few stars out of the open box: where each ends up (from the opening), how big, which brand colour, how late */
export type StarTone = "waxGold" | "lime" | "postRed";
export const STARS: readonly { dx: number; dy: number; size: number; tone: StarTone; delay: number }[] = [
  { dx: -58, dy: -64, size: 14, tone: "waxGold", delay: 0 },
  { dx: 52, dy: -80, size: 18, tone: "waxGold", delay: 40 },
  { dx: -20, dy: -98, size: 12, tone: "lime", delay: 90 },
  { dx: 80, dy: -34, size: 12, tone: "postRed", delay: 60 },
  { dx: -84, dy: -24, size: 10, tone: "waxGold", delay: 120 },
];

export type SceneGeometry = {
  cx: number;
  ground: number;
  /** the parcel at rest on the ground (its box's top left) */
  restX: number;
  restY: number;
  /** Wren sitting on the lid (her box's top left) */
  perchX: number;
  perchY: number;
  /** flying, where she hovers before she lets go */
  hoverX: number;
  hoverY: number;
  /** flying down to the lid, her feet where they'll stand */
  landX: number;
  landY: number;
  /** she comes in from beyond the top right corner */
  startX: number;
  startY: number;
  /** she rides the parcel's shake: the same turn about the parcel's foot, from her own box (x, y, 0) */
  perchOrigin: [number, number, number];
};

/** Where everything stands in a scene `width` wide. */
export function sceneGeometry(width: number): SceneGeometry {
  const cx = width / 2;
  const ground = SCENE_H - 14;
  const restX = cx - PW / 2;
  const restY = ground - 96; // the box's foot is at y 96
  const footY = restY + 9; // her feet on the back of the lid, just behind the bow
  const perchX = cx - PERCH_FEET.x;
  const perchY = footY - PERCH_FEET.y;
  // the parcel hovers 26 over the ground before she lets go
  const hoverX = restX - CARRY.dx;
  const hoverY = restY - 26 - CARRY.dy;
  return {
    cx,
    ground,
    restX,
    restY,
    perchX,
    perchY,
    hoverX,
    hoverY,
    landX: cx - FLY_FEET.x,
    landY: footY - FLY_FEET.y,
    startX: width + 20,
    startY: -120,
    perchOrigin: [restX + PW / 2 - perchX, ground - perchY, 0],
  };
}

/** The sheet's card floats 8 in from each edge: the scene is the window less 16. */
export const sceneWidth = (windowWidth: number): number => windowWidth - 16;

/** The room the banner takes under the status bar: its 42 and the air above and below it. */
export const UPDATE_BANNER_ROOM = 52;

/* ── for the SwiftUI scene (KParcelSheetView's `art` and `scene`) ───────── */

/** The drawing as the Swift record takes it: the paths, the knot, the stamp and the pivots, every
    field present (a record field can't take undefined). */
export const PARCEL_ART_RECORD = {
  pw: PW,
  ph: PH,
  front: PARCEL_ART.front,
  frontShade: PARCEL_ART.frontShade,
  top: PARCEL_ART.top,
  flapL: PARCEL_ART.flapL,
  flapR: PARCEL_ART.flapR,
  ribbonFront: PARCEL_ART.ribbonFront,
  ribbonL: PARCEL_ART.ribbonL,
  ribbonR: PARCEL_ART.ribbonR,
  bowLoops: PARCEL_ART.bowLoops,
  bowShade: PARCEL_ART.bowShade,
  bowTails: PARCEL_ART.bowTails,
  star: PARCEL_ART.star,
  knot: { ...PARCEL_ART.knot },
  stamp: { ...STAMP, r: 0 },
  foot: { ...PIVOTS.foot },
  knotPivot: { ...PIVOTS.knot },
  flapLHinge: { ...PIVOTS.flapL },
  flapRHinge: { ...PIVOTS.flapR },
};

/** The scene `width` wide as the Swift record takes it: where everything stands, the beats, the stars. */
export function parcelSceneRecord(width: number) {
  const g = sceneGeometry(width);
  return {
    height: SCENE_H,
    size: S,
    cx: g.cx,
    ground: g.ground,
    restX: g.restX,
    restY: g.restY,
    perchX: g.perchX,
    perchY: g.perchY,
    hoverX: g.hoverX,
    hoverY: g.hoverY,
    landX: g.landX,
    landY: g.landY,
    startX: g.startX,
    startY: g.startY,
    carryDx: CARRY.dx,
    carryDy: CARRY.dy,
    perchOriginX: g.perchOrigin[0],
    perchOriginY: g.perchOrigin[1],
    start: BEATS.start,
    fly: BEATS.fly,
    hover: BEATS.hover,
    drop: BEATS.drop,
    land: BEATS.land,
    settle: BEATS.settle,
    firstShake: BEATS.firstShake,
    shakeMin: BEATS.shakeEvery[0],
    shakeMax: BEATS.shakeEvery[1],
    curious: BEATS.curious,
    bow: BEATS.bow,
    flapDelay: BEATS.flapDelay,
    flap: BEATS.flap,
    starsDelay: BEATS.starsDelay,
    stars: BEATS.stars,
    starRun: BEATS.starRun,
    starList: STARS.map((s) => ({ ...s })),
  };
}
