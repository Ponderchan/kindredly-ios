/* ═══════════════════════════════════════════════════════════════════════
   STAMPS v3 (owner, 2026-10-19) LIVE AT THE END OF THIS FILE: the v3 tiers
   (which layers a width keeps, the dot below 15), the colour roles, the
   draw list and the empty slot; the ladder, the tilt and StampTiltRule
   below are shared by v2 and v3 and stay. Everything marked @deprecated is
   v2 only and goes once the renderers have moved (INTEGRATION.md).

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
import type { StampArtV3, StampEl, StampLayer, StampRole } from "../data/stamp-art-v3";

/* ── the box (spec §2.1, §2.4) ───────────────────────────────────────── */

export interface StampRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** the authoring box: 100 × 120 units, 5:6 */
export const STAMP_BOX: Readonly<StampRect> = Object.freeze({ x: 0, y: 0, width: 100, height: 120 });
/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
    the printed window: 80 × 100u, exactly 4:5, square corners; everything drawn is clipped to it.
    Also the DIY crop box. */
export const STAMP_WINDOW: Readonly<StampRect> = Object.freeze({ x: 10, y: 10, width: 80, height: 100 });
/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
    where drawn motifs must stay: the window inset 8u (the importer refuses ink outside it) */
export const STAMP_SAFE_AREA: Readonly<StampRect> = Object.freeze({ x: 18, y: 18, width: 64, height: 84 });
/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
    the 62u motif square, centred horizontally, centre y 58 (2u above the window's centre) */
export const STAMP_MOTIF_BOX: Readonly<StampRect> = Object.freeze({ x: 19, y: 27, width: 62, height: 62 });
/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
    the one stroke weight of the drawings, in box units (2.16pt at the 50-wide card) */
export const STAMP_STROKE_U = 4.31;
/** below the chip there is no stamp: a dot of the field colour this wide (pt) */
export const STAMP_DOT_PT = 6;

/** a stamp's height for a width: every stamp is 5:6 (exact for whole widths) */
export const stampHeight = (width: number): number => (width * 6) / 5;

/* ── tiers (spec §2.2, §2.3): the level of detail by rendered width ──── */

/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file). */
export type StampTier = "dot" | "chip" | "xs" | "s" | "m" | "l" | "xl";

/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file). */
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

/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file). */
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

/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
    The tier a rendered width (pt) falls in. Below 15 (or not a number): "dot", no stamp. */
export function tierFor(width: number): StampTier {
  if (!(width >= 15)) return "dot";
  if (width < 20) return "chip";
  if (width < 25) return "xs";
  if (width < 40) return "s";
  if (width < 80) return "m";
  if (width < 160) return "l";
  return "xl";
}

/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file). */
export const tierSpec = (tier: StampTier): Readonly<StampTierSpec> => SPEC_BY_TIER[tier];
/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file). */
export const tierSpecFor = (width: number): Readonly<StampTierSpec> => SPEC_BY_TIER[tierFor(width)];

/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
    The stroke width to draw the art with at a rendered width, in box units: 4.31u, or more when
    that would fall under the tier's minimum on screen (XS 1.5pt, S and up 1.25pt). */
export function strokeU(width: number): number {
  const s = tierSpecFor(width);
  if (!s.minStrokePt || !(width > 0)) return STAMP_STROKE_U;
  return Math.max(STAMP_STROKE_U, (s.minStrokePt * 100) / width);
}

/* ── the silhouette (spec §2.1): build.py's silhouette(), exactly ────── */

const f3 = (v: number): string => v.toFixed(3);

/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
   
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

/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
    The silhouette of a tier ("" for the dot: there is no stamp). */
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

/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
    The 5:6 paper with its perforation for a rendered width, as SVG path data on 0 0 100 120.
    "" below 15pt (the dot tier: draw a STAMP_DOT_PT circle of the field colour instead). */
export const silhouettePath = (width: number): string => silhouetteForTier(tierFor(width));

/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
    The field's rect for a rendered width: the window from S up; the whole box at chip and XS,
    where the field is the stamp (clip it to the silhouette). */
export function windowRect(width: number): Readonly<StampRect> {
  return SPEC_BY_TIER[tierFor(width)].paper ? STAMP_WINDOW : STAMP_BOX;
}

/* ── series grounds (spec §2.5): one flat shape per category, M and up ── */

export type StampCategory = "confessions" | "almosts" | "latenights" | "small" | "becoming" | "missing";

/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
    Each category's ground as path data on 0 0 100 120, already inside the window (build.py
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

/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
    A category's series ground ("" for a category that has none). */
export function groundPath(category: string): string {
  return Object.prototype.hasOwnProperty.call(STAMP_GROUNDS, category) ? STAMP_GROUNDS[category as StampCategory] : "";
}

/* ── colour (spec §2.5, §2.6, §2.11) ─────────────────────────────────── */

export const STAMP_WHITE = "#FFFFFF";
/** the last fallback (spec §2.11): the template in this tint with no motif */
export const STAMP_FALLBACK_HEX = "#8B7FE8";
/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
    ln in Classic, Lavender and Paper: the keyline on light themes */
export const STAMP_INK_LIGHT = "#1E1B35";
/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
    ln in Midnight */
export const STAMP_INK_DARK = "#D4D0EA";
/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file). */
export const STAMP_PAPER_LIGHT = "#FFFFFF";
/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
    Midnight's paper: cool, from its own ink family, deliberately not cream */
export const STAMP_PAPER_DARK = "#ECE9F4";
/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file). */
export const STAMP_SOFT_MIX = 0.55;
/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file). */
export const STAMP_GROUND_MIX = 0.2;
/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
    the light keyline's opacity: one constant (spec §2.3: step it to 0.55 if device review asks) */
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

/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
    the soft plate (secondary marks): mix(hex, white, 0.55) */
export const softHex = (hex: string): string => mixHex(hex, STAMP_WHITE, STAMP_SOFT_MIX);
/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
    the series ground: mix(hex, white, 0.20) */
export const groundHex = (hex: string): string => mixHex(hex, STAMP_WHITE, STAMP_GROUND_MIX);
/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
    the paper: white on the light themes, #ECE9F4 on Midnight */
export const paperHex = (themeDark: boolean): string => (themeDark ? STAMP_PAPER_DARK : STAMP_PAPER_LIGHT);

/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file). */
export interface StampEdge {
  /** "keyline": ln at 40% (light); "rim": the 1pt paper rim of chip and XS on a dark surface */
  kind: "keyline" | "rim";
  color: string;
  opacity: number;
  /** stroke width in pt, centred on the silhouette (× 100 / W for box units) */
  widthPt: number;
}

/** @deprecated stamps v2 only (see STAMPS v3 at the end of this file).
   
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

/* ═══════════════════════════════════════════════════════════════════════
   STAMPS v3 · B "CHARACTER" (owner, 2026-10-19). The contract is
   .claude/stamp-design/v3/INTEGRATION.md; this is its code.

   The drawing is the whole stamp now. data/stamp-art-v3.ts (written by
   scripts/import-stamp-art-v3.mjs from the kit's SVGs) holds each of the 36
   as five layers of plain elements — frame, rims, body, marks, face, in
   that draw order — whose paint is a colour ROLE, never a hex. This
   section resolves the roles, decides which layers a width keeps, and
   holds the empty slot. Nothing else is drawn by code: no paper, window,
   ground, keyline or rim (the frame layer is the perforated paper and its
   ink keyline), and one drawing serves every theme (the ink is never
   swapped for the theme's light ink on Midnight).

   Colour roles, per stamp:
     hex   the stamp's colour: data/stamps.ts `color` (the bright palette)
     ink   #1E1B35, always
     tint  mixHex(hex, #FFFFFF, 0.88), rounded half up per channel
     none  not painted
   Strokes are always round-capped and round-joined; stroke widths are in
   box units and scale with the stamp (no minimum on screen: the tiers drop
   whole layers instead).

   Tiers (the kit's tierFor/tierSVG, plus the app's dot):
     < 15   dot: no stamp, a STAMP_DOT_PT circle of the hex
     15–24  xs:  frame, rims, body          (the colour and the silhouette)
     25–39  s:   frame, rims, body, face    (no marks)
     ≥ 40   l:   all five; delivered mail tilts by its letter (tilt())
   ═══════════════════════════════════════════════════════════════════════ */

/** the ink role: edges, eye rings, pupils, lids, lines on the paper; the #tag's words; never theme-swapped */
export const STAMP_V3_INK = "#1E1B35";
/** tint = mix(hex, white, this) */
export const STAMP_V3_TINT_MIX = 0.88;
/** the five layers, in draw order */
export const STAMP_V3_LAYERS: readonly StampLayer[] = Object.freeze(["frame", "rims", "body", "marks", "face"]);

export type StampV3Tier = "dot" | "xs" | "s" | "l";

export interface StampV3TierSpec {
  tier: StampV3Tier;
  /** the narrowest rendered width (pt, inclusive) in this tier */
  minWidth: number;
  /** the layers drawn, in draw order (none for the dot) */
  layers: readonly StampLayer[];
  /** delivered mail at this size tilts by its letter (l only) */
  delivered: boolean;
}

export const STAMP_V3_TIERS: readonly Readonly<StampV3TierSpec>[] = Object.freeze([
  { tier: "dot", minWidth: 0, layers: Object.freeze([]), delivered: false },
  { tier: "xs", minWidth: 15, layers: Object.freeze(["frame", "rims", "body"]), delivered: false },
  { tier: "s", minWidth: 25, layers: Object.freeze(["frame", "rims", "body", "face"]), delivered: false },
  { tier: "l", minWidth: 40, layers: Object.freeze(["frame", "rims", "body", "marks", "face"]), delivered: true },
] satisfies StampV3TierSpec[]);

const V3_SPEC = Object.fromEntries(STAMP_V3_TIERS.map((s) => [s.tier, s])) as Record<StampV3Tier, Readonly<StampV3TierSpec>>;

/** The v3 tier a rendered width (pt) falls in. Below 15 (or not a number): "dot". */
export function stampTierV3(width: number): StampV3Tier {
  if (!(width >= 15)) return "dot";
  if (width < 25) return "xs";
  if (width < 40) return "s";
  return "l";
}
export const stampTierSpecV3 = (width: number): Readonly<StampV3TierSpec> => V3_SPEC[stampTierV3(width)];
/** the layers a width draws, in order ([] below 15: draw the dot) */
export const stampLayersFor = (width: number): readonly StampLayer[] => V3_SPEC[stampTierV3(width)].layers;
/** whether a delivered stamp at this width tilts by its letter (tilt(letterId)); else 0° */
export const stampTiltsAtV3 = (width: number): boolean => V3_SPEC[stampTierV3(width)].delivered;

/** the tint of a stamp colour: mix(hex, white, 0.88), half up (the kit's tintOf) */
export const stampTint = (hex: string): string => mixHex(hex, STAMP_WHITE, STAMP_V3_TINT_MIX);

export interface StampV3Colours {
  hex: string;
  ink: string;
  tint: string;
}

const HEX6 = /^#?[0-9a-f]{6}$/i;
/** A stamp's three colours from its hex (data/stamps.ts `color`). A missing or malformed hex
    reads as STAMP_FALLBACK_HEX, never NaN on screen. */
export function stampColoursV3(hex: string | null | undefined): StampV3Colours {
  const h = hex && HEX6.test(hex.trim()) ? mixHex(hex, STAMP_WHITE, 0) : STAMP_FALLBACK_HEX;
  return { hex: h, ink: STAMP_V3_INK, tint: stampTint(h) };
}

/** a role as a colour (#RRGGBB in capitals), null for "none" */
export function stampRoleHex(role: StampRole, c: StampV3Colours): string | null {
  return role === "hex" ? c.hex : role === "ink" ? c.ink : role === "tint" ? c.tint : null;
}

type V3Geometry =
  | { el: "path"; d: string }
  | { el: "circle"; cx: number; cy: number; r: number }
  | { el: "ellipse"; cx: number; cy: number; rx: number; ry: number };

/** one element as drawn: its geometry on the 100 × 120 box, resolved paint, and its layer */
export type StampDrawEl = V3Geometry & {
  layer: StampLayer;
  fill: string | null;
  stroke: string | null;
  /** stroke width in box units (0 when stroke is null) */
  width: number;
  cap: "round";
  join: "round";
};

/** the frame path (the kit's FRAME_D): the perforated paper at x10 y25 w80 h88, r7, bites r5 (3 × 4) */
export const STAMP_V3_FRAME_D =
  "M17,25L23,25A5,5 0 0 0 33,25L45,25A5,5 0 0 0 55,25L67,25A5,5 0 0 0 77,25L83,25A7,7 0 0 1 90,32L90,36.25A5,5 0 0 0 90,46.25L90,54.75A5,5 0 0 0 90,64.75L90,73.25A5,5 0 0 0 90,83.25L90,91.75A5,5 0 0 0 90,101.75L90,106A7,7 0 0 1 83,113L77,113A5,5 0 0 0 67,113L55,113A5,5 0 0 0 45,113L33,113A5,5 0 0 0 23,113L17,113A7,7 0 0 1 10,106L10,101.75A5,5 0 0 0 10,91.75L10,83.25A5,5 0 0 0 10,73.25L10,64.75A5,5 0 0 0 10,54.75L10,46.25A5,5 0 0 0 10,36.25L10,32A7,7 0 0 1 17,25Z";

/** The frame layer, the same in all 36 (data/stamp-art-v3 STAMP_V3_FRAME holds the same two):
    the tint rim (14u, under) and the keyline (tint paper fill, ink 6u stroke). An id with no
    drawing is drawn as this alone. */
export const STAMP_V3_FRAME_ELS: readonly StampEl[] = Object.freeze([
  { el: "path", d: STAMP_V3_FRAME_D, fill: "tint", stroke: "tint", width: 14, cap: "round", join: "round" },
  { el: "path", d: STAMP_V3_FRAME_D, fill: "tint", stroke: "ink", width: 6, cap: "round", join: "round" },
] satisfies StampEl[]);

/**
 * What to draw for a stamp at a width, bottom to top: the layers its tier keeps, each element
 * with its paint resolved from `hex` (data/stamps.ts `color` of that id). `art` is
 * STAMP_ART_V3[id]; null/undefined (an id this build has no drawing for) draws the frame layer
 * alone, in `hex` or, without one, STAMP_FALLBACK_HEX. [] below 15pt: draw the dot instead
 * (STAMP_DOT_PT wide, filled with stampColoursV3(hex).hex). Pure; renderers cache it per id/width.
 */
export function stampDrawListV3(art: StampArtV3 | null | undefined, hex: string | null | undefined, width: number): StampDrawEl[] {
  const layers = stampLayersFor(width);
  if (!layers.length) return [];
  const c = stampColoursV3(hex);
  const out: StampDrawEl[] = [];
  for (const layer of layers) {
    const list: readonly StampEl[] = art ? art[layer] ?? [] : layer === "frame" ? STAMP_V3_FRAME_ELS : [];
    for (const e of list) {
      const stroke = stampRoleHex(e.stroke, c);
      out.push({ ...e, layer, fill: stampRoleHex(e.fill, c), stroke, width: stroke ? e.width ?? 0 : 0, cap: "round", join: "round" });
    }
  }
  return out;
}

/** The empty slot (the compose corner before a stamp is chosen, 40×48 at 8°): the frame path
    alone, fill none, no rim, no break-out; stroke 4u dashed 8/10 with round caps (≈12u dashes,
    6u gaps: a dashed outline; the kit's 6u dashed 4/10 read as a string of beads, the lead's call
    of 2026-10-19 in the a11y pass). The stroke is UI chrome: the theme's `mute` token (Classic
    #8A86A3, Midnight #8F8BAA, Paper #8E8878), except where mute falls under 3:1 on the page —
    Lavender, 2.94:1 on #ECEAF8 — which takes `pale` (3.65:1) instead (stampSlotStroke; Swift
    KStampSlot.stroke(for:)). `light`/`dark` are the kit's two reference values. */
export const STAMP_V3_SLOT = Object.freeze({
  d: STAMP_V3_FRAME_D,
  width: 4,
  dash: Object.freeze([8, 10]) as readonly number[],
  cap: "round" as const,
  join: "round" as const,
  light: "#8A86A3",
  dark: "#8F8BAA",
  /** the slot on a page where mute is under 3:1 (Lavender) */
  pale: "#7A7694",
});

/** the least contrast the empty slot keeps against the page (WCAG 1.4.11, a graphic that says
    "a stamp goes here") */
export const STAMP_V3_SLOT_MIN_CONTRAST = 3;

const relLum = (hex: string): number => {
  const h = hex.replace("#", "");
  const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
/** WCAG contrast of two #RRGGBB colours */
export function hexContrast(a: string, b: string): number {
  const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** The empty slot's stroke on a theme's page: its mute, or STAMP_V3_SLOT.pale where mute is under
    3:1 on the page (only Lavender of the four). A malformed colour keeps mute. */
export function stampSlotStroke(tk: { mute: string; bg: string }): string {
  if (!HEX6.test(tk.mute) || !HEX6.test(tk.bg)) return tk.mute;
  return hexContrast(tk.mute, tk.bg) < STAMP_V3_SLOT_MIN_CONTRAST ? STAMP_V3_SLOT.pale : tk.mute;
}

/** Below 15pt a stamp is a STAMP_DOT_PT dot of its hex, edged in ink this wide (pt) so the bright
    yellows and pinks stay visible on white (the lead's call of 2026-10-19). */
export const STAMP_DOT_EDGE_PT = 1;

/** Where a v3 stamp's paint lands on the 100 × 120 box, over all 36 (strokes included): the frame
    and its rim fill x3–97 × y18–120; the break-out's rim tops out at y8 at the highest (ink at
    y12–16). Nothing reaches outside the box, so nothing is clipped and a placement sizes by the box. */
export const STAMP_V3_FRAME_BOUNDS: Readonly<StampRect> = Object.freeze({ x: 3, y: 18, width: 94, height: 102 });
