import { useEffect, type Ref } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { ClipPath, Defs, G, Path, Rect } from "react-native-svg";
import { Frost } from "../../../components/Frost";
import { Stamp, StampSlot } from "../../../components/Stamp";
import { WhoGlyphs } from "../../../components/WhoName";
import { localeTag } from "../../../lib/format";
import { frostSpec } from "../../../lib/frost";
import { t, type Lang } from "../../../lib/i18n";
import type { PronounId } from "../../../lib/pronouns";
import { strangerName } from "../../../lib/stranger-name";
import { signOf, type Dob } from "../flow";
import { EDGE, FONT, OB, SHADOW } from "../parts/tokens";
import { useLetterFamily } from "../../../lib/theme";
import "../../../data/strings-onboarding2";
import { OB_MAX_FONT } from "../parts/tokens";

/* YOUR ENVELOPE FRONT, AS A STRANGER WILL SEE IT (screens 8 and 12;
   storyboard §6 · 8 "your envelope front from screen 6", §6 · 12 "the
   envelope it carries out is YOUR envelope front", §7).
   ────────────────────────────────────────────────────────────────────────
   One paper object drawn the run's way: white paper inside an airmail band
   (red and Post Blue diagonals), a 3pt ink edge and a 4pt hard ink shadow.
   On it, everything a stranger gets about you and nothing more — the same
   pieces as the Today card's header, at about 1.4 ×:
     · YOUR frost window, FROST v1 from your user id (lib/frost), the real
       thing strangers see;
     · YOUR courier name, in your language (lib/stranger-name, salt 0: the
       name a stranger's desk gives you when you're new to it);
     · ♀ or ♂ after it, only for she/he with the switch on, then the star
       sign, only with its switch on (the same line glyphs, WhoGlyphs);
     · today's date in mono, and "to: someone who writes like you";
     · the stamp corner, top right: empty (dashed), glowing (8, waiting for
       your first stamp), or filled with your stamp at its small tilt.
   It is drawn at one design size (ENV_W × ENV_H) and scaled to `width`, so
   the 12's little envelope under the bird is the same drawing as 8's, and
   the stamp in its corner lands where 8 put it. The corner's box is
   exported (ENV_CORNER) and reachable by `cornerRef`, so 8 can fly the big
   stamp onto exactly that spot.

   Screen 6 (the 1–6 agent's) draws the same envelope header for "This is
   you, to a stranger"; the two should become one part once both exist. */

/** The envelope's design size; it scales to any width. */
export const ENV_W = 340;
export const ENV_H = 214;
/** the airmail band inside the ink edge */
const BAND = 10;
const RADIUS = 12;
/** the stamp corner, in design points (a Today reader-head stamp: 60 × 72) */
export const ENV_CORNER = { x: ENV_W - 22 - 60, y: 22, w: 60, h: 72 } as const;
/** the small tilt a stamp settles at once it's on (stamps v2: ±2°) */
export const STAMP_SETTLE_DEG = 2;
const FACE = 56;

const RED = "#E2453C";
/* the airmail band's diagonals, 45° down to the left: red, white, blue, white, every 28pt
   (drawn once as two paths over the whole envelope and clipped to it; the paper covers the middle) */
const STRIPE = 8;
const PITCH = 28;
function stripes(offset: number): string {
  let d = "";
  for (let k = -ENV_H; k < ENV_W + ENV_H; k += PITCH) {
    const x = k + offset;
    d += `M${x} 0 L${x + STRIPE} 0 L${x + STRIPE - ENV_H} ${ENV_H} L${x - ENV_H} ${ENV_H} Z `;
  }
  return d;
}
const AIRMAIL_RED = stripes(0);
const AIRMAIL_BLUE = stripes(PITCH / 2);
/** the corner waiting for its first stamp: acid, a shade deeper so its dashes read on white */
const GLOW_FILL = "rgba(195,232,79,0.32)";
const GLOW_LINE = "#8DB51F";

/** today's date the way the card's header says it: OCT 18 (in the reader's language) */
export function envelopeDate(now: number): string {
  try {
    return new Intl.DateTimeFormat(localeTag(), { month: "short", day: "numeric" }).format(new Date(now)).toLocaleUpperCase(localeTag());
  } catch (e) {
    console.warn("[onboarding] the envelope's date couldn't be formatted:", e);
    const d = new Date(now);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
}

/** Your courier name in your language (salt 0), or "" before there is a user id. */
export const yourCourierName = (uid: string | null, lang: Lang): string => strangerName(uid, { lang, unsigned: "" });

/** What the envelope shows after the name: the sign with its switch (null = on), and never the she/he
    mark. This envelope goes to a stranger, and the mark is a kindred's to see (owner, 2026-11-12);
    pronoun and showMark are still taken so the callers stay as they are. */
export function yourMarks(o: { pronoun: PronounId | null; showMark: boolean | null; showSign: boolean | null; dob: Dob | null }): { mark: "she" | "he" | null; sign: ReturnType<typeof signOf> } {
  const sign = o.showSign !== false ? signOf(o.dob) : null;
  return { mark: null, sign };
}

export type EnvelopeCorner = "empty" | "glow" | "filled" | "none";

export function EnvelopeFront({
  uid,
  lang,
  pronoun,
  showMark,
  showSign,
  dob,
  now,
  stamp,
  corner = "empty",
  width = ENV_W,
  tilt = 0,
  shadow = true,
  cornerRef,
  style,
}: {
  uid: string | null;
  lang: Lang;
  pronoun: PronounId | null;
  showMark: boolean | null;
  showSign: boolean | null;
  dob: Dob | null;
  now: number;
  /** the stamp in the corner, when `corner` is "filled" */
  stamp?: string | null;
  corner?: EnvelopeCorner;
  /** the drawn width; everything scales from ENV_W */
  width?: number;
  /** degrees; the whole envelope turns about its centre */
  tilt?: number;
  shadow?: boolean;
  /** a view exactly over the stamp corner (for measuring where a stamp lands) */
  cornerRef?: Ref<View>;
  style?: StyleProp<ViewStyle>;
}) {
  // the address line is handwriting on your envelope: the letter font's italic
  const said = useLetterFamily(true);
  const s = width / ENV_W;
  const h = ENV_H * s;
  const name = yourCourierName(uid, lang);
  const { mark, sign } = yourMarks({ pronoun, showMark, showSign, dob });
  const frost = frostSpec(uid);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={t("ob2.stamp.envA11y", { name })}
      style={[{ width: width + SHADOW * s, height: h + SHADOW * s }, style]}
    >
      <View style={{ position: "absolute", left: 0, top: 0, width: width + SHADOW * s, height: h + SHADOW * s, transform: tilt ? [{ rotate: `${tilt}deg` }] : undefined }}>
        {/* the design-size drawing, scaled about its centre so it fills exactly this box */}
        <View style={{ position: "absolute", left: ((ENV_W + SHADOW) * (s - 1)) / 2, top: ((ENV_H + SHADOW) * (s - 1)) / 2, width: ENV_W + SHADOW, height: ENV_H + SHADOW, transform: [{ scale: s }] }}>
          {/* the paper, the airmail band, the ink edge and the hard shadow */}
          <Svg width={ENV_W + SHADOW} height={ENV_H + SHADOW} style={{ position: "absolute", left: 0, top: 0 }}>
            <Defs>
              <ClipPath id="envelope">
                <Rect x={EDGE / 2} y={EDGE / 2} width={ENV_W - EDGE} height={ENV_H - EDGE} rx={RADIUS} />
              </ClipPath>
            </Defs>
            {shadow && <Rect x={SHADOW + EDGE / 2} y={SHADOW + EDGE / 2} width={ENV_W - EDGE} height={ENV_H - EDGE} rx={RADIUS} fill={OB.ink} />}
            <G clipPath="url(#envelope)">
              <Rect x={0} y={0} width={ENV_W} height={ENV_H} fill={OB.paper} />
              <Path d={AIRMAIL_RED} fill={RED} />
              <Path d={AIRMAIL_BLUE} fill={OB.blue} />
            </G>
            <Rect x={EDGE + BAND} y={EDGE + BAND} width={ENV_W - 2 * (EDGE + BAND)} height={ENV_H - 2 * (EDGE + BAND)} rx={5} fill={OB.paper} />
            <Rect x={EDGE / 2} y={EDGE / 2} width={ENV_W - EDGE} height={ENV_H - EDGE} rx={RADIUS} fill="none" stroke={OB.ink} strokeWidth={EDGE} />
          </Svg>

          {/* the stamp corner */}
          <View ref={cornerRef} collapsable={false} pointerEvents="none" style={{ position: "absolute", left: ENV_CORNER.x, top: ENV_CORNER.y, width: ENV_CORNER.w, height: ENV_CORNER.h }}>
            {corner === "glow" && <CornerGlow />}
            {corner === "empty" && <StampSlot width={ENV_CORNER.w} fill="transparent" stroke={OB.inkSoft} />}
            {corner === "filled" && (
              <View style={{ transform: [{ rotate: `${STAMP_SETTLE_DEG}deg` }] }}>
                <Stamp id={stamp} width={ENV_CORNER.w} dark={false} />
              </View>
            )}
          </View>

          {/* who: your window, your name and marks, the date */}
          <View style={{ position: "absolute", left: 26, top: 104, right: 22, flexDirection: "row", alignItems: "center" }}>
            {frost ? <Frost spec={frost} size={FACE} /> : <View style={{ width: FACE, height: FACE, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: OB.inkSoft }} />}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ flexShrink: 1, ...FONT.bold, fontSize: 23, letterSpacing: -0.4, color: OB.ink }}>
                  {name || " "}
                </Text>
                <WhoGlyphs mark={mark} sign={sign} size={18} color={OB.inkSoft} />
              </View>
              <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={1} style={{ ...FONT.mono, fontSize: 12.5, letterSpacing: 1.4, color: OB.inkSoft, marginTop: 3 }}>
                {envelopeDate(now)}
              </Text>
            </View>
          </View>
          <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={1} style={{ position: "absolute", left: 26, right: 22, top: ENV_H - 50, ...said, fontSize: 15.5, color: OB.ink }}>
            {t("ob2.stamp.to")}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** The corner waiting for your first stamp: the stamp's own dashed silhouette in acid, breathing (still under Reduce Motion). */
function CornerGlow() {
  const reduce = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })), -1, false);
  }, [reduce, pulse]);
  const halo = useAnimatedStyle(() => ({ opacity: 0.35 + pulse.value * 0.45, transform: [{ scale: 1 + pulse.value * 0.06 }] }));
  return (
    <>
      <Animated.View style={[halo, { position: "absolute", left: -7, top: -7, right: -7, bottom: -7, borderRadius: 10, backgroundColor: "rgba(195,232,79,0.38)" }]} />
      <StampSlot width={ENV_CORNER.w} fill={GLOW_FILL} stroke={GLOW_LINE} />
    </>
  );
}

/** A plain little envelope (the ones the bird brings back, the one it holds on 11): white, ink edge, the flap's V. */
export function PlainEnvelope({ width = 64, tilt = 0, shadow = true }: { width?: number; tilt?: number; shadow?: boolean }) {
  const h = Math.round(width * 0.66);
  const e = Math.max(2, width / 26);
  return (
    <View pointerEvents="none" style={{ width: width + 3, height: h + 3, transform: tilt ? [{ rotate: `${tilt}deg` }] : undefined }}>
      <Svg width={width + 3} height={h + 3}>
        {shadow && <Rect x={3 + e / 2} y={3 + e / 2} width={width - e} height={h - e} rx={width / 14} fill={OB.ink} />}
        <G>
          <Rect x={e / 2} y={e / 2} width={width - e} height={h - e} rx={width / 14} fill={OB.paper} stroke={OB.ink} strokeWidth={e} />
          <Path d={`M${e * 1.6} ${e * 1.6} L${width / 2} ${h * 0.56} L${width - e * 1.6} ${e * 1.6}`} fill="none" stroke={OB.ink} strokeWidth={e * 0.8} strokeLinejoin="round" strokeLinecap="round" />
        </G>
      </Svg>
    </View>
  );
}
