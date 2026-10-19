import { memo, useMemo } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { STAMP_ART_V3, type StampArtV3 } from "../data/stamp-art-v3";
import { getStamp } from "../data/stamps";
import {
  STAMP_DOT_PT,
  STAMP_LADDER,
  STAMP_V3_SLOT,
  stampColoursV3,
  stampDrawListV3,
  stampHeight,
  stampTiltsAtV3,
  tilt,
  type StampDrawEl,
} from "../lib/stamp-frame";

/* ═══════════════════════════════════════════════════════════════════════
   THE STAMP (stamps v3 · B "character", owner 2026-10-19; the contract is
   .claude/stamp-design/v3/INTEGRATION.md). Every one of the 36 mood stamps
   React Native draws goes through here, at a width taken from the ladder
   (lib/stamp-frame STAMP_LADDER). Nothing about it is decided here: which
   layers a width keeps, the colour roles and the tilt are lib/stamp-frame's
   (stampDrawListV3, stampTiltsAtV3, tilt), and the drawing is
   data/stamp-art-v3's. This file only paints the resolved list, so the
   Swift KStamp and the web's stampSVG, reading the same data, draw the
   same stamp (design/stamps-v3/golden.json locks all three).

   By the width (stampTierV3):
     · below 15pt there is no stamp: a 6pt dot of the hex (STAMP_DOT_PT),
       and the dot is all the component lays out;
     · 15–24: frame, rims, body (the colour and the silhouette);
     · 25–39: + the face (no marks);
     · 40 and up: all five layers.
   One drawing serves every theme: the frame layer is the paper and its ink
   keyline, the tint rims are the die-cut edge that shows on Midnight, and
   the ink is #1E1B35 everywhere. Every element paints its fill, then its
   stroke (round caps and joins), widths in box units. No shadow, no text.

   THE FALLBACK CHAIN. A known id with no drawing: the frame layer alone in
   its own hex. An id this build doesn't know: the frame alone in #8B7FE8.
   Never blank, never an emoji.

   DELIVERED MAIL. `delivered` (with the letter's id) is for a stamp that
   came on someone's letter. From 40pt up it tilts by the letter's id
   ([−2, −1, +1, +2]°, FNV-1a, the same on every platform) about the box
   centre; smaller, and for your own and unsent stamps, it is flat.

   THE BOX IT TAKES. Exactly width × 1.2 width (the dot: the dot). All the
   paint lands inside the box (x3–97, y8–120), so nothing is clipped and a
   placement sizes its row by the stamp alone.

   THE COST. The resolved list is made once per id and width and kept
   (PLANS); the component is memo'd. */

/* ── the plan: everything about a stamp that depends on its id and width ── */

interface StampPlan {
  width: number;
  height: number;
  /** the stamp's hex (or the fallback): the dot's colour */
  hex: string;
  /** what to paint, bottom to top ([] for the dot) */
  els: StampDrawEl[];
  /** a delivered stamp at this width tilts by its letter */
  tilts: boolean;
}

const PLANS = new Map<string, StampPlan>();
/** an unknown id is a free string, so the cache is cleared rather than left to grow */
const PLANS_MAX = 600;

const artFor = (id: string): StampArtV3 | null =>
  Object.prototype.hasOwnProperty.call(STAMP_ART_V3, id) ? (STAMP_ART_V3 as Record<string, StampArtV3 | undefined>)[id] ?? null : null;

function planFor(id: string | null | undefined, width: number): StampPlan {
  const key = `${id ?? ""}|${width}`;
  const kept = PLANS.get(key);
  if (kept) return kept;
  const st = getStamp(id);
  const hex = stampColoursV3(st?.color).hex;
  const plan: StampPlan = {
    width,
    height: stampHeight(width),
    hex,
    els: stampDrawListV3(st ? artFor(st.id) : null, hex, width),
    tilts: stampTiltsAtV3(width),
  };
  if (PLANS.size >= PLANS_MAX) PLANS.clear();
  PLANS.set(key, plan);
  return plan;
}

/* ── layout helpers for placements ── */

/** Every width the ladder names, narrowest first (15 … 250). */
export const STAMP_LADDER_WIDTHS: readonly number[] = Object.freeze(
  [...new Set(Object.values(STAMP_LADDER).map((p) => p.w))].sort((a, b) => a - b),
);

/** The three widths the Wren-desk guide reels snap to (spec §2.8: 26→30, 40→40, 58→60). */
export const GUIDE_REEL_WIDTHS: readonly number[] = Object.freeze([
  STAMP_LADDER.guideReelSmall.w,
  STAMP_LADDER.guideReelMedium.w,
  STAMP_LADDER.guideReelLarge.w,
]);

/**
 * The ladder width nearest to `w` (a tie goes to the narrower), among `widths`, and no wider
 * than `maxW` when it is given (the narrowest of `widths` if none fits). Under 15pt there is no
 * stamp to snap to, so `w` comes back as it is and draws the dot. For a size computed from
 * something else (a reel's square, an old square tile's side): placements with a name use their
 * STAMP_LADDER entry directly.
 */
export function snapStampWidth(w: number, widths: readonly number[] = STAMP_LADDER_WIDTHS, maxW = Infinity): number {
  if (!(w >= 15)) return w;
  const fits = widths.filter((x) => x <= maxW);
  const pool = fits.length ? fits : [Math.min(...widths)];
  let best = pool[0];
  for (const x of pool) if (Math.abs(x - w) < Math.abs(best - w)) best = x;
  return best;
}

/* ── the component ── */

export interface StampProps {
  /** the mood id (letters.stamp). Missing or unknown: the frame alone in #8B7FE8 */
  id?: string | null;
  /** the rendered width in pt, from STAMP_LADDER; the height is always 1.2 × width */
  width: number;
  /** a stamp that came on someone's letter: from 40pt up it tilts by `letterId` */
  delivered?: boolean;
  /** the delivered letter's id: the tilt's seed (no id, no tilt) */
  letterId?: string | null;
  /** kept for the API: v3 is one drawing for every theme, so it changes nothing */
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Stamp = memo(function Stamp({ id, width, delivered = false, letterId, style }: StampProps) {
  const plan = useMemo(() => planFor(id, width), [id, width]);

  if (plan.els.length === 0) {
    return <View pointerEvents="none" style={[{ width: STAMP_DOT_PT, height: STAMP_DOT_PT, borderRadius: STAMP_DOT_PT / 2, backgroundColor: plan.hex }, style]} />;
  }

  const deg = delivered && plan.tilts && letterId ? tilt(letterId) : 0;
  return (
    <View pointerEvents="none" style={[{ width: plan.width, height: plan.height }, style]}>
      <View style={{ position: "absolute", left: 0, top: 0, width: plan.width, height: plan.height, transform: deg ? [{ rotate: `${deg}deg` }] : undefined }}>
        <StampFace plan={plan} />
      </View>
    </View>
  );
});

/** one resolved element as an SVG node */
function el(e: StampDrawEl, key: number) {
  const paint = {
    fill: e.fill ?? "none",
    stroke: e.stroke ?? undefined,
    strokeWidth: e.stroke ? e.width : undefined,
    strokeLinecap: e.stroke ? ("round" as const) : undefined,
    strokeLinejoin: e.stroke ? ("round" as const) : undefined,
  };
  if (e.el === "circle") return <Circle key={key} cx={e.cx} cy={e.cy} r={e.r} {...paint} />;
  if (e.el === "ellipse") return <Ellipse key={key} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} {...paint} />;
  return <Path key={key} d={e.d} {...paint} />;
}

/* The stamp itself, on the 100 × 120 box: nothing reaches outside it, so no padding, no clip. */
const StampFace = memo(function StampFace({ plan }: { plan: StampPlan }) {
  return (
    <Svg width={plan.width} height={plan.height} viewBox="0 0 100 120">
      {plan.els.map(el)}
    </Svg>
  );
});

/* ── the empty corner ── */

/**
 * Where a stamp goes before one is chosen (contract §7): the v3 frame path alone, no rim, no
 * break-out, stroked 6u dashed 4/10 with round caps in `stroke` (the theme's `mute` on the compose
 * corner). `fill` is "none" unless a picture asks for one (onboarding's glowing corner). Same box
 * as a Stamp of that width, so choosing one doesn't move anything. Below 15pt: an outlined dot.
 */
export function StampSlot({ width, stroke, fill = "none", style }: { width: number; stroke: string; fill?: string; style?: StyleProp<ViewStyle> }) {
  const height = stampHeight(width);
  if (!(width >= 15)) return <View pointerEvents="none" style={[{ width: STAMP_DOT_PT, height: STAMP_DOT_PT, borderRadius: STAMP_DOT_PT / 2, borderWidth: 1, borderColor: stroke, backgroundColor: fill === "none" ? "transparent" : fill }, style]} />;
  return (
    <View pointerEvents="none" style={[{ width, height }, style]}>
      <Svg width={width} height={height} viewBox="0 0 100 120">
        <Path
          d={STAMP_V3_SLOT.d}
          fill={fill}
          stroke={stroke}
          strokeWidth={STAMP_V3_SLOT.width}
          strokeDasharray={[...STAMP_V3_SLOT.dash]}
          strokeLinecap={STAMP_V3_SLOT.cap}
          strokeLinejoin={STAMP_V3_SLOT.join}
        />
      </Svg>
    </View>
  );
}
