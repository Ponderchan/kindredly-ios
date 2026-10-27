import type { ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { LaunchMarkArt, POST_BLUE } from "../../../components/LaunchAnimation";
import { LineIcon, type LineIconName } from "../../../components/10a/LineIcon";
import { STAMP_V3_FRAME_D, STAMP_V3_INK } from "../../../lib/stamp-frame";
import { PFM } from "../../../theme/post";
import { OB } from "../parts/tokens";
import { OB_MAX_FONT } from "../parts/tokens";

/* AN ENVELOPE FRONT, AS A STRANGER SEES IT (storyboard §2 slide 1, §6 · 6 and 8).
   ────────────────────────────────────────────────────────────────────────
   The doorstep's first slide is "a letter card exactly as it lands on
   Today", and screen 6 is "exactly the Today card header at 1.4×", so both
   draw the Today card's docket (screens/today TodayRN CardFace, identity on)
   scaled by `k`, on the airmail envelope the sheet draws round it:

     ▢  Sunday Kite ♀ ♊                 [stamp]
        OCT.18
     i keep rehearsing conversations…

   · the face slot, 40k square with corners at 25% (Frost, or for 6 your own
     face as it frosts over);
   · the courier name in the system face at 600, 17k, then the she/he mark
     6k after it and the star sign 4k after that, both LineIcon line
     drawings at 0.8 × the name in quiet ink — the same order and sizes as
     components/WhoName, drawn here with explicit colours because the run
     wears its own paper, not the theme (WhoName's glyphs take the theme's
     sub, which in Midnight would be a pale lavender on white paper);
   · under the name the date alone, mono 500 11k (lib/format postmark, the
     reader's language: OCT.18, 18.OKT, 10月18日);
   · the stamp corner, 40k × 48k (the ladder's todayCard at k = 1): empty
     (dashed), the launch's mark as a stamp (1), or your first stamp (8).

   THE AIRMAIL EDGE is the envelope's border, red and Post Blue diagonals
   with white between, cut by the card's corners (the parent clips). It is
   paper, not chrome, so it keeps its colours on every theme.

   THE MARK AS A STAMP (owner, 2026-10-18: "邮戳不要了 … 落成第一张卡右上角的
   一枚邮票"). A stamp — the v3 frame of lib/stamp-frame stretched round the
   window (stamps v3, 2026-10-19: MarkStampPaper), a solid window — whose window is
   Post Blue and whose art is the launch's own white mark (LaunchMarkArt),
   i.e. the app icon as a stamp. The mark's 1024 box is drawn at the stamp's
   WIDTH, centred on the window: its strokes then fill about 70% of the
   window across and 76% down, the proportion of a v2 motif, and — the
   point — it is the same drawing at the same centre as the launch's mark
   scaled by width ÷ 156, so the mark that flies in from the launch lands on
   exactly these pixels. No postmark, ever. */

/** The sample stranger the doorstep shows: the uid whose courier name is "Sunday Kite" in English
    (and "Dedal de neblina", "冬の風鈴"… in the others — the same name strangers would really see in
    each language). Written by us; nobody owns it. */
export const SAMPLE_UID = "5a3b1e00-0000-4000-8000-000000000346";
/** The second window on slide 3 (you): any fixed seed, so its frost never changes between visits. */
export const SAMPLE_UID_YOU = "5a3b1e00-0000-4000-8000-00000000b0b0";

/** airmail stripes: the sheet's red, the icon's blue */
export const AIR_RED = "#E5533D";
const AIR_BLUE = POST_BLUE;
/** the envelope's border band, before the white */
export const AIR_BAND = 9;

/** Today's docket at k = 1 (TodayRN WHO_FACE, the name at 17/600, the date at mono 11, the stamp 40 × 48). */
export function docketMetrics(k: number) {
  return {
    face: 40 * k,
    gap: 10 * k,
    name: 17 * k,
    glyph: Math.round(17 * k * 0.8),
    date: 11 * k,
    stampW: 40 * k,
    stampH: 48 * k,
    rowH: 48 * k,
  };
}

/** The envelope's inner padding inside the airmail band. */
export const ENV_PAD_X = 16;
export const ENV_PAD_Y = 12;

/**
 * Where the stamp corner sits inside an envelope `w` × `h` whose content (the docket row plus
 * `below` points of lines under it, `gapBelow` apart) is centred vertically: the stamp's box, from
 * the envelope's top-left. Screen 1 needs it before anything is drawn (the launch's mark flies there).
 */
export function envelopeStampBox(w: number, h: number, k: number, below: number, gapBelow: number): { x: number; y: number; w: number; h: number } {
  const m = docketMetrics(k);
  const content = m.rowH + gapBelow + below;
  const top = Math.max(AIR_BAND + ENV_PAD_Y, (h - content) / 2);
  return { x: w - AIR_BAND - ENV_PAD_X - m.stampW, y: top, w: m.stampW, h: m.stampH };
}

/** The airmail border: diagonal red and blue bars with white between, the whole `w` × `h` (the parent clips it to its corners). */
export function AirmailStripes({ w, h }: { w: number; h: number }) {
  const period = 22;
  const bar = 7.5;
  const red: string[] = [];
  const blue: string[] = [];
  let i = 0;
  for (let x = -h; x < w + h; x += period / 2, i++) {
    // a bar from the top edge falling 45° to the left
    const d = `M${x.toFixed(1)} 0 L${(x + bar).toFixed(1)} 0 L${(x + bar - h).toFixed(1)} ${h} L${(x - h).toFixed(1)} ${h} Z`;
    (i % 2 === 0 ? red : blue).push(d);
  }
  return (
    <Svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }} pointerEvents="none">
      <Path d={red.join(" ")} fill={AIR_RED} />
      <Path d={blue.join(" ")} fill={AIR_BLUE} />
    </Svg>
  );
}

/**
 * The envelope's paper: the airmail band round a white middle, `w` × `h`, corners `radius` (the
 * card's). Its children are laid out in the white middle, the content centred vertically.
 */
export function AirmailPaper({ w, h, radius, children, style }: { w: number; h: number; radius: number; children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: w, height: h, borderRadius: radius, overflow: "hidden", backgroundColor: OB.paper }, style]}>
      <AirmailStripes w={w} h={h} />
      <View
        style={{
          position: "absolute",
          left: AIR_BAND,
          top: AIR_BAND,
          right: AIR_BAND,
          bottom: AIR_BAND,
          borderRadius: Math.max(2, radius - AIR_BAND),
          backgroundColor: OB.paper,
          paddingHorizontal: ENV_PAD_X,
          justifyContent: "center",
        }}
      >
        {children}
      </View>
    </View>
  );
}

/** A courier name with its mark and sign after it, in explicit colours (WhoName's order and sizes: 6k, then 4k between). */
export function NameMarks({
  name,
  mark,
  sign,
  size,
  color = OB.ink,
  glyphColor = OB.inkSoft,
  numberOfLines = 2,
  glyphs,
}: {
  name: ReactNode;
  mark: "she" | "he" | null;
  sign: LineIconName | null;
  size: number;
  color?: string;
  glyphColor?: string;
  numberOfLines?: number;
  /** draw the glyphs yourself (6's pop-ins): replaces the static pair */
  glyphs?: ReactNode;
}) {
  const g = Math.round(size * 0.8);
  const n = (mark ? 1 : 0) + (sign ? 1 : 0);
  return (
    <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={numberOfLines} style={{ fontSize: size, fontWeight: "600", color, letterSpacing: -0.2 }}>
      {name}
      {glyphs ??
        (n > 0 && (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ width: 6 * (size / 17) + n * g + (n - 1) * 4 * (size / 17), height: g, flexDirection: "row", justifyContent: "flex-end", gap: 4 * (size / 17) }}
          >
            {mark && <LineIcon name={mark} size={g} stroke={2} color={glyphColor} />}
            {sign && <LineIcon name={sign} size={g} stroke={2} color={glyphColor} />}
          </View>
        ))}
    </Text>
  );
}

/** The date under the name: mono 500 11k, quiet ink. `maxFont` caps Larger Text (6's card passes 1: a picture). */
export function DocketDate({ text, k, style, maxFont = OB_MAX_FONT }: { text: string; k: number; style?: StyleProp<ViewStyle>; maxFont?: number }) {
  return (
    <View style={style}>
      <Text maxFontSizeMultiplier={maxFont} numberOfLines={1} style={{ ...PFM.monoMed, fontSize: 11 * k, letterSpacing: 0.88 * k, color: OB.inkSoft }}>
        {text}
      </Text>
    </View>
  );
}

/**
 * The docket row: the face slot, the name over the date, and the stamp corner — the Today card's
 * header at `k`. The stamp corner is a slot of the stamp's box; what goes in it is the caller's.
 */
export function Docket({ k, face, name, date, stamp }: { k: number; face: ReactNode; name: ReactNode; date: ReactNode; stamp: ReactNode }) {
  const m = docketMetrics(k);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", height: m.rowH }}>
      <View style={{ width: m.face, height: m.face }}>{face}</View>
      <View style={{ flex: 1, marginLeft: m.gap, marginRight: m.gap * 0.6, gap: 2 * k }}>
        {name}
        {date}
      </View>
      <View style={{ width: m.stampW, height: m.stampH }}>{stamp}</View>
    </View>
  );
}

/* ── the launch's mark as a v2 stamp ── */

/* The v3 frame (lib/stamp-frame STAMP_V3_FRAME_D: x10–90 × y25–113 on the 100 × 120 box) stretched
   round the v2 window this mark was drawn for (x10–90 × y10–110), so the window, the mark and the
   doorstep's landing don't move: to x3–97 × y3–117, which keeps the 6u ink keyline (the v3 one)
   inside the box and the bites (5u, stretched to ≤ 6.5u) short of the window. */
const MARK_SX = 94 / 80;
const MARK_SY = 114 / 88;
const MARK_FRAME_T = `translate(${3 - 10 * MARK_SX} ${3 - 25 * MARK_SY}) scale(${MARK_SX} ${MARK_SY})`;

/** The stamp's paper, `width` × 1.2 width: the v3 frame stretched round the window (no window, no art). */
export function MarkStampPaper({ width }: { width: number }) {
  return (
    <Svg width={width} height={width * 1.2} viewBox="0 0 100 120" style={{ position: "absolute", left: 0, top: 0 }}>
      <G transform={MARK_FRAME_T}>
        <Path d={STAMP_V3_FRAME_D} fill={OB.paper} stroke={STAMP_V3_INK} strokeWidth={6 / Math.sqrt(MARK_SX * MARK_SY)} strokeLinejoin="round" />
      </G>
    </Svg>
  );
}

/** The window (Post Blue) and the white mark in it, laid out in the stamp's `width` × 1.2 width box. */
export function MarkStampArt({ width }: { width: number }) {
  return (
    <>
      <View style={{ position: "absolute", left: width * 0.1, top: width * 0.1, width: width * 0.8, height: width, backgroundColor: POST_BLUE }} />
      <View style={{ position: "absolute", left: 0, top: width * 0.1 }}>
        <LaunchMarkArt size={width} color="#FFFFFF" />
      </View>
    </>
  );
}

/** The whole mark stamp at rest (paper, window, mark), for a still frame. */
export function MarkStamp({ width, tilt = 0, style }: { width: number; tilt?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[{ width, height: width * 1.2, transform: tilt ? [{ rotate: `${tilt}deg` }] : undefined }, style]}>
      <MarkStampPaper width={width} />
      <MarkStampArt width={width} />
    </View>
  );
}

/** The mark stamp's tilt once it has settled (stamps v2: ±2°; the launch's lands at +2 on a card tilted −2). */
export const MARK_STAMP_TILT = 2;
