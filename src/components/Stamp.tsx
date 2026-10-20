import { memo, useId, useMemo } from "react";
import { ActionSheetIOS, Alert, Platform, Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, ClipPath, Defs, Ellipse, FeColorMatrix, Filter, G, Image as SvgImage, Path } from "react-native-svg";
import { canKeep, isCustomStampId, isKeptStamp, keepStampFlow, lookOf, reportStampFlow, useCustomStamps } from "../lib/custom-stamps";
import { t } from "../lib/i18n";
import { STAMP_ART_V3, type StampArtV3 } from "../data/stamp-art-v3";
import { getStamp } from "../data/stamps";
import {
  STAMP_DOT_EDGE_PT,
  STAMP_DOT_PT,
  STAMP_LADDER,
  PHOTO_STAMP,
  STAMP_FALLBACK_HEX,
  STAMP_V3_INK,
  STAMP_V3_SLOT,
  photoStampEdge,
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
     · below 15pt there is no stamp: a 6pt dot of the hex (STAMP_DOT_PT)
       edged 1pt in ink (STAMP_DOT_EDGE_PT), and the dot is all the
       component lays out;
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

function planFor(id: string | null | undefined, width: number, fallbackHex?: string | null): StampPlan {
  const key = `${id ?? ""}|${width}|${fallbackHex ?? ""}`;
  const kept = PLANS.get(key);
  if (kept) return kept;
  const st = getStamp(id);
  const hex = stampColoursV3(st?.color ?? fallbackHex ?? null).hex;
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

export const Stamp = memo(function Stamp({ id, width, delivered = false, letterId, dark = false, style }: StampProps) {
  if (isCustomStampId(id)) return <PhotoStamp id={id} width={width} delivered={delivered} letterId={letterId} dark={dark} style={style} />;
  return <DrawnStamp id={id} width={width} delivered={delivered} letterId={letterId} style={style} />;
});

/** The 36 (or the frame alone in `fallbackHex` / #8B7FE8 for an id this build doesn't draw). */
function DrawnStamp({ id, width, delivered = false, letterId, fallbackHex, style }: StampProps & { fallbackHex?: string | null }) {
  const plan = useMemo(() => planFor(id, width, fallbackHex), [id, width, fallbackHex]);

  if (plan.els.length === 0) {
    // edged in ink (STAMP_DOT_EDGE_PT) so a bright yellow or pink dot stays visible on white
    return (
      <View
        pointerEvents="none"
        style={[{ width: STAMP_DOT_PT, height: STAMP_DOT_PT, borderRadius: STAMP_DOT_PT / 2, backgroundColor: plan.hex, borderWidth: STAMP_DOT_EDGE_PT, borderColor: STAMP_V3_INK }, style]}
      />
    );
  }

  const deg = delivered && plan.tilts && letterId ? tilt(letterId) : 0;
  return (
    <View pointerEvents="none" style={[{ width: plan.width, height: plan.height }, style]}>
      <View style={{ position: "absolute", left: 0, top: 0, width: plan.width, height: plan.height, transform: deg ? [{ rotate: `${deg}deg` }] : undefined }}>
        <StampFace plan={plan} />
      </View>
    </View>
  );
}

/* ── custom photo stamps ("c:<uuid>", contract .claude/custom-stamps/CONTRACT.md §2.2, §3) ──
   The photo full bleed (aspect-filled: xMidYMid slice), clipped to PHOTO_STAMP.d (the 36's paper
   in style, portrait 3:4, centred) in the same 100 × 120 box, so it lines up with the official
   stamps. Edges by the rendered width (photoStampEdge): ≤ 60 a
   1pt hairline inside the cut (ink, white on dark, at .3), > 60 a soft shadow that follows the
   bites; a Cofounder's stamp a 2pt #D8A63F line at every size. My own taken-down stamp is greyed
   (saturation 0, opacity .6). No picture (removed, deleted, hidden, not resolved yet): the frame
   alone in the category's colour; nothing known: in #8B7FE8. Below 15pt: the dot. The reader
   (60), a kindred's "began under", drafts and the RN fallbacks draw through here. */
function PhotoStamp({ id, width, delivered = false, letterId, dark = false, style }: StampProps & { id: string }) {
  const info = useCustomStamps([id])(id);
  const look = lookOf(info);
  const uid = useId().replace(/:/g, "");
  if (look === "frame" || look === "unknown" || !info?.url || !(width >= 15)) {
    return <DrawnStamp id={id} width={width} delivered={delivered} letterId={letterId} fallbackHex={info?.hex ?? STAMP_FALLBACK_HEX} style={style} />;
  }
  const height = stampHeight(width);
  const deg = delivered && stampTiltsAtV3(width) && letterId ? tilt(letterId) : 0;
  const edge = photoStampEdge(width, info.gold);
  const k = 100 / width; // pt → box units
  const lineU = (edge === "gold" ? PHOTO_STAMP.goldLinePt : PHOTO_STAMP.hairlinePt) * 2 * k;
  const lineColor = edge === "gold" ? PHOTO_STAMP.goldEdge : dark ? "#FFFFFF" : STAMP_V3_INK;
  const lineOpacity = edge === "gold" ? 1 : PHOTO_STAMP.hairlineOpacity;
  const p = PHOTO_STAMP.paper;
  const paperW = (p.width * width) / 100;
  const shadow =
    edge === "none" || (edge === "gold" && width > PHOTO_STAMP.hairlineMaxBoxWidth)
      ? {
          shadowColor: "#000",
          shadowOpacity: dark ? PHOTO_STAMP.shadowOpacity.dark : PHOTO_STAMP.shadowOpacity.light,
          shadowRadius: paperW * PHOTO_STAMP.shadowRadiusK,
          shadowOffset: { width: 0, height: paperW * PHOTO_STAMP.shadowYK },
        }
      : null;
  return (
    <View pointerEvents="none" style={[{ width, height }, style]}>
      <View style={[{ position: "absolute", left: 0, top: 0, width, height, transform: deg ? [{ rotate: `${deg}deg` }] : undefined }, shadow]}>
        <Svg width={width} height={height} viewBox="0 0 100 120">
          <Defs>
            <ClipPath id={`c${uid}`}>
              <Path d={PHOTO_STAMP.d} />
            </ClipPath>
            {look === "greyed" ? (
              <Filter id={`g${uid}`}>
                <FeColorMatrix type="saturate" values="0" />
              </Filter>
            ) : null}
          </Defs>
          <G clipPath={`url(#c${uid})`}>
            {look === "greyed" ? null : <Path d={PHOTO_STAMP.d} fill={stampColoursV3(info.hex).tint} />}
            <SvgImage
              href={{ uri: info.url }}
              x={p.x}
              y={p.y}
              width={p.width}
              height={p.height}
              preserveAspectRatio="xMidYMid slice"
              opacity={look === "greyed" ? 0.6 : 1}
              filter={look === "greyed" ? `url(#g${uid})` : undefined}
            />
            {edge !== "none" ? <Path d={PHOTO_STAMP.d} fill="none" stroke={lineColor} strokeOpacity={lineOpacity} strokeWidth={lineU} strokeLinejoin="round" /> : null}
          </G>
        </Svg>
      </View>
    </View>
  );
}

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
 * break-out, stroked 4u dashed 8/10 with round caps (STAMP_V3_SLOT: a dashed outline, not beads)
 * in `stroke` (on the compose corner stampSlotStroke(tk): the theme's mute, darker on Lavender). `fill` is "none" unless a picture asks for one (onboarding's glowing corner). Same box
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

/* ── a stranger's photo stamp on a letter you read: hold it to keep or report it ──
   (custom stamps, contract §7 B4; Prompt 7). The readers (Today's LetterReader, a correspondence's
   ReaderScreen) draw their stamp through this: an official stamp, my own, or one that isn't ok is
   the plain Stamp with no gesture. A stranger's ok "c:" stamp answers a long press with Keep this
   stamp (or "In your album ✓" once kept) / Report this stamp / Never mind; the flows are
   lib/custom-stamps keepStampFlow / reportStampFlow, and the line they answer goes to `onDone`
   (the screen's toast). `from` says where it was seen: the letter (Today) or the correspondence. */
export function KeepableStamp({
  id,
  width,
  delivered,
  letterId,
  dark,
  from,
  onDone,
  style,
}: StampProps & { from: { letter?: string | null; thread?: string | null }; onDone?: (line: string) => void }) {
  const custom = isCustomStampId(id) ? id : null;
  const info = useCustomStamps(custom ? [custom] : [])(custom ?? "");
  const stamp = <Stamp id={id} width={width} delivered={delivered} letterId={letterId} dark={dark} style={style} />;
  if (!custom || !canKeep(info)) return stamp;
  const kept = isKeptStamp(custom);
  const run = (which: "keep" | "report") => {
    const flow = which === "keep" ? keepStampFlow(custom, from) : reportStampFlow(custom, from.letter ?? null);
    void flow.then((line) => {
      if (line) onDone?.(line);
    });
  };
  const open = () => {
    const keepLabel = kept ? t("cs2.use.inAlbum") : t("cs2.use.keep");
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [keepLabel, t("cs2.use.report"), t("cs2.use.neverMind")], destructiveButtonIndex: 1, cancelButtonIndex: 2, disabledButtonIndices: kept ? [0] : undefined },
        (i) => {
          if (i === 0 && !kept) run("keep");
          else if (i === 1) run("report");
        },
      );
    } else {
      Alert.alert("", undefined, [
        ...(kept ? [] : [{ text: keepLabel, onPress: () => run("keep") }]),
        { text: t("cs2.use.report"), style: "destructive" as const, onPress: () => run("report") },
        { text: t("cs2.use.neverMind"), style: "cancel" as const },
      ]);
    }
  };
  return (
    <Pressable
      onLongPress={open}
      delayLongPress={350}
      accessibilityRole="image"
      accessibilityLabel={info?.topic ? t("cs2.use.a11yStamp", { topic: info.topic }) : t("cs2.use.a11yBlank")}
      accessibilityActions={[...(kept ? [] : [{ name: "keep", label: t("cs2.use.keep") }]), { name: "report", label: t("cs2.use.report") }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "keep") run("keep");
        if (e.nativeEvent.actionName === "report") run("report");
      }}
    >
      {stamp}
    </Pressable>
  );
}
