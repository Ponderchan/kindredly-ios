/* ═══════════════════════════════════════════════════════════════════════
   STAMP v2 · THE FRAME AS CODE (stamp-spec §2 and §3; the owner approved
   the 36-stamp set on 2026-10-18). Everything about a stamp that is not
   its drawing: the tier a rendered width falls in, the perforated 5:6
   paper, the 4:5 window, the series ground, the colours, the keyline,
   the tilt and the ladder of sizes (no postmark: the owner took it off
   on 2026-10-18). The drawing itself is
   src/data/stamp-art-v2.ts (scripts/import-stamp-art.mjs).

   One implementation for every renderer (spec §2.11): RN <Stamp/>, the
   web's StampTile / stampSVG, and Swift's KStamp, which must produce the
   SAME silhouette strings: design/stamps-v2/golden.json holds them, and
   src/lib/stamp-frame.test.ts locks this file to it.

   Pure, no React, import-free but for the product's one hash (FNV-1a 32,
   lib/mosaic hashStr), so plain node runs the test:
     node --experimental-strip-types src/lib/stamp-frame.test.ts

   Units. The stamp is authored on a 100 × 120 box (1u = W/100 pt, H =
   1.2 W). Paths and rects below are in box units; sizes that say Pt are
   points on screen.
   ═══════════════════════════════════════════════════════════════════════ */

import { hashStr } from "./mosaic";

/* ── the box (spec §2.1, §2.4) ───────────────────────────────────────── */

export interface StampRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** the authoring box: 100 × 120 units, 5:6 */
export const STAMP_BOX: Readonly<StampRect> = Object.freeze({ x: 0, y: 0, width: 100, height: 120 });
/** the printed window: 80 × 100u, exactly 4:5, square corners; everything drawn is clipped to it.
    Also the DIY crop box. */
export const STAMP_WINDOW: Readonly<StampRect> = Object.freeze({ x: 10, y: 10, width: 80, height: 100 });
/** where drawn motifs must stay: the window inset 8u (the importer refuses ink outside it) */
export const STAMP_SAFE_AREA: Readonly<StampRect> = Object.freeze({ x: 18, y: 18, width: 64, height: 84 });
/** the 62u motif square, centred horizontally, centre y 58 (2u above the window's centre) */
export const STAMP_MOTIF_BOX: Readonly<StampRect> = Object.freeze({ x: 19, y: 27, width: 62, height: 62 });
/** the one stroke weight of the drawings, in box units (2.16pt at the 50-wide card) */
export const STAMP_STROKE_U = 4.31;
/** below the chip there is no stamp: a dot of the field colour this wide (pt) */
export const STAMP_DOT_PT = 6;

/** a stamp's height for a width: every stamp is 5:6 (exact for whole widths) */
export const stampHeight = (width: number): number => (width * 6) / 5;

/* ── tiers (spec §2.2, §2.3): the level of detail by rendered width ──── */

export type StampTier = "dot" | "chip" | "xs" | "s" | "m" | "l" | "xl";

export interface StampTierSpec {
  tier: StampTier;
  /** the narrowest rendered width (pt, inclusive) in this tier; the next tier's minWidth ends it */
  minWidth: number;
  /** bites across the top and bottom, and down each side (always 5:6, so the pitch is equal) */
  nx: number;
  ny: number;
  /** bite radius in box units: 0.3 × the pitch */
  r: number;
  /** true: a 10u paper margin round the window; false: the field is the stamp (chip, XS) */
  paper: boolean;
  /** what is drawn: nothing, the xs cut (over the whole silhouette), or the art in the window */
  motif: "none" | "xs" | "art";
  /** the category's series ground behind the art */
  ground: boolean;
  /** the soft plate: none; "s" = every soft mark except those flagged dropAtS; "all" */
  soft: "none" | "s" | "all";
  /** strokes are never drawn thinner than this on screen (0: nothing drawn) */
  minStrokePt: number;
  /** the light-theme keyline width (0: none), ln at STAMP_KEYLINE_OPACITY, centred on the edge */
  keylinePt: number;
  /** delivered mail at this size may tilt by its letter (M and up) */
  delivered: boolean;
}

export const STAMP_TIERS: readonly Readonly<StampTierSpec>[] = Object.freeze([
  { tier: "dot", minWidth: 0, nx: 0, ny: 0, r: 0, paper: false, motif: "none", ground: false, soft: "none", minStrokePt: 0, keylinePt: 0, delivered: false },
  { tier: "chip", minWidth: 15, nx: 5, ny: 6, r: 6, paper: false, motif: "none", ground: false, soft: "none", minStrokePt: 0, keylinePt: 0, delivered: false },
  { tier: "xs", minWidth: 20, nx: 5, ny: 6, r: 6, paper: false, motif: "xs", ground: false, soft: "none", minStrokePt: 1.5, keylinePt: 0, delivered: false },
  { tier: "s", minWidth: 25, nx: 5, ny: 6, r: 6, paper: true, motif: "art", ground: false, soft: "s", minStrokePt: 1.25, keylinePt: 0.75, delivered: false },
  { tier: "m", minWidth: 40, nx: 10, ny: 12, r: 3, paper: true, motif: "art", ground: true, soft: "all", minStrokePt: 1.25, keylinePt: 1, delivered: true },
  { tier: "l", minWidth: 80, nx: 15, ny: 18, r: 2, paper: true, motif: "art", ground: true, soft: "all", minStrokePt: 1.25, keylinePt: 1.25, delivered: true },
  { tier: "xl", minWidth: 160, nx: 20, ny: 24, r: 1.5, paper: true, motif: "art", ground: true, soft: "all", minStrokePt: 1.25, keylinePt: 1.5, delivered: true },
] satisfies StampTierSpec[]);

const SPEC_BY_TIER = Object.fromEntries(STAMP_TIERS.map((s) => [s.tier, s])) as Record<StampTier, Readonly<StampTierSpec>>;

/** The tier a rendered width (pt) falls in. Below 15 (or not a number): "dot", no stamp. */
export function tierFor(width: number): StampTier {
  if (!(width >= 15)) return "dot";
  if (width < 20) return "chip";
  if (width < 25) return "xs";
  if (width < 40) return "s";
  if (width < 80) return "m";
  if (width < 160) return "l";
  return "xl";
}

export const tierSpec = (tier: StampTier): Readonly<StampTierSpec> => SPEC_BY_TIER[tier];
export const tierSpecFor = (width: number): Readonly<StampTierSpec> => SPEC_BY_TIER[tierFor(width)];

/** The stroke width to draw the art with at a rendered width, in box units: 4.31u, or more when
    that would fall under the tier's minimum on screen (XS 1.5pt, S and up 1.25pt). */
export function strokeU(width: number): number {
  const s = tierSpecFor(width);
  if (!s.minStrokePt || !(width > 0)) return STAMP_STROKE_U;
  return Math.max(STAMP_STROKE_U, (s.minStrokePt * 100) / width);
}

/* ── the silhouette (spec §2.1): build.py's silhouette(), exactly ────── */

const f3 = (v: number): string => v.toFixed(3);

/**
 * The perforated paper on 0 0 100 120: semicircular bites centred on the edge line at k·pitch
 * (pitch = 100 / nx = 120 / ny) for k = 0…n, so every corner is a quarter-circle notch; bite
 * radius 0.3 × pitch. A port of .claude/ui10a-research/identity/stamps/tools/build.py
 * silhouette(nx, ny), number for number (3 decimals; the straight edges' 100 and 120 bare), so
 * every renderer can be checked against the same string.
 */
export function silhouetteFor(nx: number, ny: number): string {
  const w = 100;
  const h = 120;
  const p = w / nx;
  const r = 0.3 * p;
  const d: string[] = [`M${f3(r)},0`];
  for (let k = 1; k < nx; k++) {
    const x = k * p;
    d.push(`L${f3(x - r)},0 A${f3(r)},${f3(r)} 0 0 0 ${f3(x + r)},0`);
  }
  d.push(`L${f3(w - r)},0 A${f3(r)},${f3(r)} 0 0 0 ${f3(w)},${f3(r)}`);
  for (let k = 1; k < ny; k++) {
    const y = k * p;
    d.push(`L${w},${f3(y - r)} A${f3(r)},${f3(r)} 0 0 0 ${w},${f3(y + r)}`);
  }
  d.push(`L${w},${f3(h - r)} A${f3(r)},${f3(r)} 0 0 0 ${f3(w - r)},${h}`);
  for (let k = nx - 1; k > 0; k--) {
    const x = k * p;
    d.push(`L${f3(x + r)},${h} A${f3(r)},${f3(r)} 0 0 0 ${f3(x - r)},${h}`);
  }
  d.push(`L${f3(r)},${h} A${f3(r)},${f3(r)} 0 0 0 0,${f3(h - r)}`);
  for (let k = ny - 1; k > 0; k--) {
    const y = k * p;
    d.push(`L0,${f3(y + r)} A${f3(r)},${f3(r)} 0 0 0 0,${f3(y - r)}`);
  }
  d.push(`L0,${f3(r)} A${f3(r)},${f3(r)} 0 0 0 ${f3(r)},0Z`);
  return d.join("");
}

const SILHOUETTES = new Map<StampTier, string>();

/** The silhouette of a tier ("" for the dot: there is no stamp). */
export function silhouetteForTier(tier: StampTier): string {
  const s = SPEC_BY_TIER[tier];
  if (!s || !s.nx) return "";
  let d = SILHOUETTES.get(tier);
  if (d === undefined) {
    d = silhouetteFor(s.nx, s.ny);
    SILHOUETTES.set(tier, d);
  }
  return d;
}

/** The 5:6 paper with its perforation for a rendered width, as SVG path data on 0 0 100 120.
    "" below 15pt (the dot tier: draw a STAMP_DOT_PT circle of the field colour instead). */
export const silhouettePath = (width: number): string => silhouetteForTier(tierFor(width));

/** The field's rect for a rendered width: the window from S up; the whole box at chip and XS,
    where the field is the stamp (clip it to the silhouette). */
export function windowRect(width: number): Readonly<StampRect> {
  return SPEC_BY_TIER[tierFor(width)].paper ? STAMP_WINDOW : STAMP_BOX;
}

/* ── series grounds (spec §2.5): one flat shape per category, M and up ── */

export type StampCategory = "confessions" | "almosts" | "latenights" | "small" | "becoming" | "missing";

/** Each category's ground as path data on 0 0 100 120, already inside the window (build.py
    ground(); the far lamp is written as the quarter disc the window leaves of its circle). Fill
    with groundHex(hex), behind the motif, from M up. */
export const STAMP_GROUNDS: Readonly<Record<StampCategory, string>> = Object.freeze({
  confessions: "M20,58A30,30 0 1 0 80,58A30,30 0 1 0 20,58Z", // spotlight disc, r 30 at 50,58
  almosts: "M14,110A36,36 0 0 1 86,110Z", // low sun, a half disc r 36 on the window floor
  latenights: "M10,10H90V44H10Z", // sky band, the top 34u
  small: "M10,110L10,92Q50,66 90,92L90,110Z", // hill
  becoming: "M10,110L90,110L90,58Z", // rising slope, bottom-left to the right edge at y 58
  missing: "M90,10V48A38,38 0 0 1 52,10Z", // far lamp, a quarter disc r 38 in the top-right corner
});

/** A category's series ground ("" for a category that has none). */
export function groundPath(category: string): string {
  return Object.prototype.hasOwnProperty.call(STAMP_GROUNDS, category) ? STAMP_GROUNDS[category as StampCategory] : "";
}

/* ── colour (spec §2.5, §2.6, §2.11) ─────────────────────────────────── */

export const STAMP_WHITE = "#FFFFFF";
/** the last fallback (spec §2.11): the template in this tint with no motif */
export const STAMP_FALLBACK_HEX = "#8B7FE8";
/** ln in Classic, Lavender and Paper: the keyline on light themes */
export const STAMP_INK_LIGHT = "#1E1B35";
/** ln in Midnight */
export const STAMP_INK_DARK = "#D4D0EA";
export const STAMP_PAPER_LIGHT = "#FFFFFF";
/** Midnight's paper: cool, from its own ink family, deliberately not cream */
export const STAMP_PAPER_DARK = "#ECE9F4";
export const STAMP_SOFT_MIX = 0.55;
export const STAMP_GROUND_MIX = 0.2;
/** the light keyline's opacity: one constant (spec §2.3: step it to 0.55 if device review asks) */
export const STAMP_KEYLINE_OPACITY = 0.4;

const rgbOf = (hex: string): number[] | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null;
};

/** a + (b − a)·t per channel, rounded half up, as #RRGGBB in capitals. A colour that isn't
    #RRGGBB reads as STAMP_FALLBACK_HEX (never NaN on screen). Half up is Swift's .rounded() and
    the stamp checker's rule; the kit's Python proofs rounded half to even, which differs on one
    channel of the 36: outside's soft is #A1C5B0 here, #A1C4B0 on the proof sheets. */
export function mixHex(a: string, b: string, t: number): string {
  const A = rgbOf(a) ?? (rgbOf(STAMP_FALLBACK_HEX) as number[]);
  const B = rgbOf(b) ?? (rgbOf(STAMP_FALLBACK_HEX) as number[]);
  return "#" + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).toUpperCase().padStart(2, "0")).join("");
}

/** the soft plate (secondary marks): mix(hex, white, 0.55) */
export const softHex = (hex: string): string => mixHex(hex, STAMP_WHITE, STAMP_SOFT_MIX);
/** the series ground: mix(hex, white, 0.20) */
export const groundHex = (hex: string): string => mixHex(hex, STAMP_WHITE, STAMP_GROUND_MIX);
/** the paper: white on the light themes, #ECE9F4 on Midnight */
export const paperHex = (themeDark: boolean): string => (themeDark ? STAMP_PAPER_DARK : STAMP_PAPER_LIGHT);

export interface StampEdge {
  /** "keyline": ln at 40% (light); "rim": the 1pt paper rim of chip and XS on a dark surface */
  kind: "keyline" | "rim";
  color: string;
  opacity: number;
  /** stroke width in pt, centred on the silhouette (× 100 / W for box units) */
  widthPt: number;
}

/**
 * The stamp's edge stroke (spec §2.3, §2.6). Light: ln at 40%, S 0.75 / M 1 / L 1.25 / XL 1.5pt,
 * none at chip and XS. Dark (Midnight, or any dark surface such as the Live Activity): no keyline;
 * chip and XS get a 1pt paper rim. null when nothing is stroked. No stamp ever has a shadow.
 */
export function keyline(themeDark: boolean, tier: StampTier): StampEdge | null {
  if (themeDark) {
    return tier === "chip" || tier === "xs" ? { kind: "rim", color: STAMP_PAPER_DARK, opacity: 1, widthPt: 1 } : null;
  }
  const w = SPEC_BY_TIER[tier]?.keylinePt ?? 0;
  return w > 0 ? { kind: "keyline", color: STAMP_INK_LIGHT, opacity: STAMP_KEYLINE_OPACITY, widthPt: w } : null;
}

/* ── tilt (spec §2.7): delivered mail at M and up only ───────────────── */

export const STAMP_TILTS: readonly number[] = Object.freeze([-2, -1, 1, 2]);

/** A delivered letter's stamp tilt in degrees: [−2, −1, +1, +2][FNV-1a-32(letterId) mod 4] (the
    owner's 2026-10-18 call: ±3 stood the stamp crooked beside the card's ⋯; it was ±3 / ±1.5),
    the same on iOS, RN and the web, so sender and reader see one tilt. (hashStr hashes UTF-16
    code units and gives 0 for an empty id; letter ids are ASCII uuids, where that equals the
    FNV-1a of the UTF-8 bytes.) Your own and unsent stamps, trays, grids, lists, XS and S: 0. */
export const tilt = (letterId: string): number => STAMP_TILTS[hashStr(letterId) % 4];

/* ── the ladder (spec §2.8): placements pass a width from here only ──── */

/** 0 or a fixed angle (degrees); "letter": tilt(letterId) of the delivered letter; "scatter":
    the landing wall's own scatter within ±3° */
export type StampTiltRule = number | "letter" | "scatter";

export interface StampPlacement {
  /** pt (the store master is in px) */
  w: number;
  h: number;
  tilt: StampTiltRule;
}

const at = (w: number, tilt: StampTiltRule = 0): StampPlacement => Object.freeze({ w, h: stampHeight(w), tilt });

export const STAMP_LADDER = Object.freeze({
  /** the Introduction envelope corner (the 10-letter road): chip; a STAMP_DOT_PT dot if 18 tall won't fit */
  introEnvelope: at(15),
  /** Live Activity, Dynamic Island compact / minimal: XS (bundled PNGs; rim on dark) */
  liveActivityIsland: at(20),
  /** Live Activity, lock screen: S (no keyline on the dark activity background) */
  liveActivityLock: at(25),
  /** first-flight route stops: XS + the localized name */
  routeStop: at(20),
  /** the chosen-stamp pill (40 capsule): XS leading, 10pt inset */
  chosenPill: at(20),
  /** the compose toolbar key (40): XS */
  composeKey: at(20),
  /** the compose page's stamp corner: 40×48 at the App Store page's 8° (owner, 2026-10-18: the
      compose page keeps its App Store look; this replaces the spec's 0° top slot) */
  composeCorner: at(40, 8),
  /** the stamp tray tile (iOS KStampTray, web Write): S, 30×36, 6 columns (owner, 2026-10-18:
      the App Store tray's size; 40×48 was too big for a picker of 36) */
  trayTile: at(30),
  /** My letters rows (iOS + web): S, 0° */
  myLettersRow: at(25),
  /** Drafts (iOS + web): S, 0° */
  draftsRow: at(30),
  /** the kindred page's "began under": tilt from the thread's opening letter id */
  kindredBeganUnder: at(40, "letter"),
  /** the Today card, top-right of the header: 40×48, tilted by the letter (owner, 2026-10-18: 50×60
      stood taller than the face and the ⋯ beside it and outweighed the letter) */
  todayCard: at(40, "letter"),
  /** the reader head (iOS + web): tilt by the letter, optional date ring */
  readerHead: at(60, "letter"),
  /** the Settings First Class banner: Gold frame, Wren in the window, +3° */
  firstClassBanner: at(60, 3),
  /** the First Class card "1ST": the Gold frame, +3°; "1ST / MEMBER" goes under it, never on it */
  firstClassCard: at(80, 3),
  /** Me › Your stamps (3 columns): the stamp is the cell; 0° */
  meYourStamps: at(80),
  /** long-press preview / stamp detail */
  preview: at(120),
  /** share card, Copy sticker, DIY preview (the aura stamps' size) */
  shareCard: at(200),
  /** the DIY editor canvas (window 200×250): a workspace, not a display size */
  diyCanvas: at(250),
  /** the landing stamp wall (web), scattered within ±3° */
  landingWall: at(100, "scatter"),
  /** spoke pages (web): inline and feature */
  spokeInline: at(40),
  spokeFeature: at(80),
  /** Wren-desk guide reels: the three sizes they snap to (26→30, 40→40, 58→60) */
  guideReelSmall: at(30),
  guideReelMedium: at(40),
  guideReelLarge: at(60),
} satisfies Record<string, StampPlacement>);

export type StampPlacementName = keyof typeof STAMP_LADDER;

/** store, OG and landing masters, in px (XL @5x), regenerated from the vectors */
export const STAMP_STORE_MASTER_PX = Object.freeze({ w: 1000, h: 1200 });
