import { memo, useMemo } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { ClipPath, Defs, G, Path, Rect } from "react-native-svg";
import { STAMP_ART_V2, type ArtPath, type StampId } from "../data/stamp-art-v2";
import { getStamp } from "../data/stamps";
import { useTheme } from "../lib/theme";
import {
  STAMP_DOT_PT,
  STAMP_FALLBACK_HEX,
  STAMP_LADDER,
  STAMP_WHITE,
  STAMP_WINDOW,
  groundHex,
  groundPath,
  keyline,
  paperHex,
  silhouetteForTier,
  softHex,
  stampHeight,
  strokeU,
  tierFor,
  tierSpec,
  tilt,
  type StampTier,
  type StampTierSpec,
} from "../lib/stamp-frame";

/* ═══════════════════════════════════════════════════════════════════════
   THE STAMP (stamps v2, the set the owner approved on 2026-10-18; spec
   §2.11 "one component"). Every one of the 36 mood stamps React Native
   draws goes through here, at a width taken from the ladder
   (lib/stamp-frame STAMP_LADDER), and nothing about it is decided here:
   the tier, the perforated paper, the window, the series ground, the
   colours, the keyline and the tilt are lib/stamp-frame's,
   and the drawing is data/stamp-art-v2's. This file only lays them on top
   of each other in the right order, so the Swift KStamp and the web's
   stampSVG, reading the same two files, draw the same stamp.

   From the bottom up, by the tier the width falls in:
     · below 15pt there is no stamp: a 6pt dot of the field colour
       (STAMP_DOT_PT), and the dot is all the component lays out;
     · chip (15) and XS (20): the field IS the stamp — the perforated
       silhouette filled with the stamp's hex. The chip stops there
       (colour only); XS adds its own cut, the 1 or 2 bold white marks of
       the `xs` layer, over the whole silhouette;
     · S (25–39) and up: the paper (white, or Midnight's cool #ECE9F4),
       the 4:5 window in the hex, from M the category's series ground in
       mix(hex, white, 0.20), then the soft plate in mix(hex, white, 0.55)
       (at S without the small marks flagged dropAtS), then the art in
       white on top, both clipped to the window;
     · last, the edge: on the light themes the keyline, ln at 40%, centred
       on the silhouette (S 0.75 / M 1 / L 1.25 / XL 1.5pt); on a dark
       surface no keyline, but chip and XS get a 1pt paper rim. No stamp
       has a shadow, anywhere.
   Strokes are 4.31u with round caps and joins, never thinner on screen
   than the tier allows (strokeU). No text is ever drawn on a stamp.

   THE FALLBACK CHAIN. A known id with no marks (a drawing not delivered,
   or rejected by the importer) is the template: the paper, the window in
   its own hex and, from M, its category's ground — the ground is frame,
   not drawing (lib/stamp-frame), so the web's stampModel draws it here
   too and the two renderers agree — but no motif. An id this build
   doesn't know is the template in #8B7FE8, with no ground (it has no
   category). Never blank, never an emoji.

   DELIVERED MAIL. `delivered` (with the letter's id) is for a stamp that
   came to you on someone's letter — the Today card, the reader, a
   kindred's "began under". From M up it tilts by the letter's id
   ([−2, −1, +1, +2]°, FNV-1a, the same on every platform, so sender and
   reader see one tilt). No postmark: the owner took the wavy lines off on
   2026-10-18. Below M, and for your own and unsent stamps (trays, grids,
   lists), a stamp is flat: 0°.

   THE BOX IT TAKES. Exactly width × 1.2 width (the dot: the dot). The
   keyline's outer half and the tilt's corners draw outside that box
   without moving the layout, so a placement sizes its row by the stamp alone and leaves
   overflow visible (React Native's default on iOS).

   THE COST. The path work — which marks, in which colours, at which
   stroke — is done once per id and width and kept (PLANS), so a list of
   thirty-six re-renders without redoing it; the component is memo'd, and
   its face only redraws when the plan or the theme's darkness changes. */

/* ── the plan: everything about a stamp that depends on its id and width ── */

/** one mark as drawn: a fill, or a stroke of `sw` box units */
type Mark = { d: string; fill: string | null; stroke: string | null; sw: number };

interface StampPlan {
  tier: StampTier;
  spec: Readonly<StampTierSpec>;
  width: number;
  height: number;
  /** the field: the stamp's hex, or the fallback tint for an id this build doesn't know */
  hex: string;
  /** the perforated paper on 0 0 100 120 ("" for the dot) */
  silhouette: string;
  /** the series ground ("" below M, and for an id this build doesn't know) */
  ground: string;
  groundFill: string;
  /** what goes in the window (or over the whole stamp at XS), bottom to top */
  marks: Mark[];
}

const PLANS = new Map<string, StampPlan>();
/** an unknown id is a free string, so the cache is cleared rather than left to grow */
const PLANS_MAX = 600;

const hasArt = (id: string): id is StampId => Object.prototype.hasOwnProperty.call(STAMP_ART_V2, id);

function inked(list: readonly ArtPath[], colour: string, sw: number, dropSmall: boolean): Mark[] {
  const out: Mark[] = [];
  for (const m of list) {
    if (dropSmall && m.dropAtS) continue;
    out.push(m.kind === "fill" ? { d: m.d, fill: colour, stroke: null, sw: 0 } : { d: m.d, fill: null, stroke: colour, sw });
  }
  return out;
}

function planFor(id: string | null | undefined, width: number): StampPlan {
  const key = `${id ?? ""}|${width}`;
  const kept = PLANS.get(key);
  if (kept) return kept;

  const st = getStamp(id);
  const hex = st?.color ?? STAMP_FALLBACK_HEX;
  const entry = st && hasArt(st.id) ? STAMP_ART_V2[st.id] : null;
  // a file the importer rejected is written with no marks: that is the template too
  const drawn = entry && entry.art.length > 0 ? entry : null;
  const tier = tierFor(width);
  const spec = tierSpec(tier);
  const sw = strokeU(width);

  let marks: Mark[] = [];
  if (drawn && spec.motif === "xs") {
    marks = inked(drawn.xs, STAMP_WHITE, sw, false);
  } else if (drawn && spec.motif === "art") {
    const soft = spec.soft === "none" ? [] : inked(drawn.soft, softHex(hex), sw, spec.soft === "s");
    marks = soft.concat(inked(drawn.art, STAMP_WHITE, sw, false));
  }

  const plan: StampPlan = {
    tier,
    spec,
    width,
    height: stampHeight(width),
    hex,
    silhouette: silhouetteForTier(tier),
    ground: spec.ground && st ? groundPath(st.cat) : "",
    groundFill: groundHex(hex),
    marks,
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
  /** the mood id (letters.stamp). Missing or unknown: the template in #8B7FE8 */
  id?: string | null;
  /** the rendered width in pt, from STAMP_LADDER; the height is always 1.2 × width */
  width: number;
  /** a stamp that came on someone's letter: from M up it tilts by `letterId` */
  delivered?: boolean;
  /** the delivered letter's id: the tilt's seed (no id, no tilt) */
  letterId?: string | null;
  /** the surface under it is dark: Midnight's paper, no keyline, the rim at chip and XS.
      Defaults to the theme's; a picture with its own light ground (a guide reel) passes false. */
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** room round the box for the keyline's or the rim's outer half (at most 0.75pt) */
const PAD_PT = 1;

export const Stamp = memo(function Stamp({ id, width, delivered = false, letterId, dark, style }: StampProps) {
  const theme = useTheme();
  const isDark = dark ?? theme.dark;
  const plan = useMemo(() => planFor(id, width), [id, width]);

  if (plan.tier === "dot") {
    return <View pointerEvents="none" style={[{ width: STAMP_DOT_PT, height: STAMP_DOT_PT, borderRadius: STAMP_DOT_PT / 2, backgroundColor: plan.hex }, style]} />;
  }

  const mail = delivered && plan.spec.delivered;
  const deg = mail && letterId ? tilt(letterId) : 0;
  return (
    <View pointerEvents="none" style={[{ width: plan.width, height: plan.height }, style]}>
      <View style={{ position: "absolute", left: 0, top: 0, width: plan.width, height: plan.height, transform: deg ? [{ rotate: `${deg}deg` }] : undefined }}>
        <StampFace plan={plan} dark={isDark} />
      </View>
    </View>
  );
});

/* The stamp itself, in box units on a viewBox padded by PAD_PT all round, so the edge's outer
   half isn't cut off at the view's bounds. One clip per Svg (react-native-svg keeps clip ids per
   root), so the fixed id is safe in a list. */
const StampFace = memo(function StampFace({ plan, dark }: { plan: StampPlan; dark: boolean }) {
  const { width, height, spec, silhouette, hex, marks } = plan;
  const u = 100 / width; // box units per pt
  const pad = PAD_PT * u;
  const edge = keyline(dark, plan.tier);
  const field = STAMP_WINDOW;
  return (
    <Svg
      width={width + 2 * PAD_PT}
      height={height + 2 * PAD_PT}
      viewBox={`${-pad} ${-pad} ${100 + 2 * pad} ${120 + 2 * pad}`}
      style={{ position: "absolute", left: -PAD_PT, top: -PAD_PT }}
    >
      {marks.length > 0 && (
        <Defs>
          <ClipPath id="field">{spec.paper ? <Rect x={field.x} y={field.y} width={field.width} height={field.height} /> : <Path d={silhouette} />}</ClipPath>
        </Defs>
      )}
      {spec.paper ? (
        <>
          <Path d={silhouette} fill={paperHex(dark)} />
          <Rect x={field.x} y={field.y} width={field.width} height={field.height} fill={hex} />
          {plan.ground !== "" && <Path d={plan.ground} fill={plan.groundFill} />}
        </>
      ) : (
        <Path d={silhouette} fill={hex} />
      )}
      {marks.length > 0 && (
        <G clipPath="url(#field)">
          {marks.map((m, i) =>
            m.fill ? (
              <Path key={i} d={m.d} fill={m.fill} />
            ) : (
              <Path key={i} d={m.d} fill="none" stroke={m.stroke ?? STAMP_WHITE} strokeWidth={m.sw} strokeLinecap="round" strokeLinejoin="round" />
            ),
          )}
        </G>
      )}
      {edge && <Path d={silhouette} fill="none" stroke={edge.color} strokeOpacity={edge.opacity} strokeWidth={edge.widthPt * u} />}
    </Svg>
  );
});

/* ── the empty corner ── */

/** the slot's dashed line (spec §2.8: dashes [3, 2.5]) */
const SLOT_LINE_PT = 1.5;
const SLOT_DASH_PT: readonly [number, number] = [3, 2.5];

/**
 * Where a stamp goes before one is chosen: the stamp's own perforated silhouette for `width`,
 * filled `fill` and drawn dashed in `stroke` (the compose page's corner: ind on lav2, owner
 * 2026-10-18). Same box as a Stamp of that width, so choosing one doesn't move anything.
 */
export function StampSlot({ width, fill, stroke, style }: { width: number; fill: string; stroke: string; style?: StyleProp<ViewStyle> }) {
  const tier = tierFor(width);
  const silhouette = silhouetteForTier(tier);
  const height = stampHeight(width);
  const u = 100 / width;
  const pad = PAD_PT * u;
  if (!silhouette) return <View pointerEvents="none" style={[{ width: STAMP_DOT_PT, height: STAMP_DOT_PT, borderRadius: STAMP_DOT_PT / 2, borderWidth: 1, borderColor: stroke, backgroundColor: fill }, style]} />;
  return (
    <View pointerEvents="none" style={[{ width, height }, style]}>
      <Svg
        width={width + 2 * PAD_PT}
        height={height + 2 * PAD_PT}
        viewBox={`${-pad} ${-pad} ${100 + 2 * pad} ${120 + 2 * pad}`}
        style={{ position: "absolute", left: -PAD_PT, top: -PAD_PT }}
      >
        <Path d={silhouette} fill={fill} stroke={stroke} strokeWidth={SLOT_LINE_PT * u} strokeDasharray={[SLOT_DASH_PT[0] * u, SLOT_DASH_PT[1] * u]} />
      </Svg>
    </View>
  );
}
