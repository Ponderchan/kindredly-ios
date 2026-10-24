import { useMemo, useState, type ReactNode } from "react";
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedProps, useAnimatedReaction, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, Rect, Stop } from "react-native-svg";
import { Finger, Pop, Rise, useOnce, useStep, type Reel } from "../guide-reel/kit";
import { WrenBird } from "../WrenBird";
import { Frost } from "../Frost";
import { WhoGlyphs } from "../WhoName";
import { AvatarImage } from "../AvatarImage";
import { GUIDE_REEL_WIDTHS, Stamp, snapStampWidth } from "../Stamp";
import { StickerBox } from "../10a/StickerBox";
import { topicTagLook } from "../10a/kit";
import { LETTER_FONT_CHOICES, P, PFM, letterFamily, letterFitSize, type LetterFontKey } from "../../theme/post";
import { BRAND, THEMES } from "../../theme/themes";
import { PAPERS, PAPER_FOLD_FLAP, paperOf, type Paper, type PaperId } from "../../data/papers";
import { PICKS, WAVE_LINES, type DeckLang, type Sky } from "../../data/sparkle-deck";
import { STAMP_CATEGORIES } from "../../data/stamps";
import { DEFAULT_CATEGORY } from "../../lib/stamp-press-core";
import { PHOTO_STAMP, STAMP_V3_INK } from "../../lib/stamp-frame";
import { frostSpec, type FrostSpec } from "../../lib/frost";
import { strangerName } from "../../lib/stranger-name";
import { penDemo, penDrawPlan, penViewBox, type PenDrawStep, type PenSig } from "../../lib/pen-signature";
import type { Mark } from "../../lib/identity-core";
import type { Zodiac } from "../../lib/zodiac";
import { useLetterFamily, useLetterFont } from "../../lib/theme";
import { localeTag } from "../../lib/format";
import { getLang, t } from "../../lib/i18n";
import { fontTiles } from "../../screens/settings/settings-model";
import "../../data/strings-news-1-0-5";
import "../../data/strings-stamps2"; // cs2.cam.hint, the filters' names, 1ST
import "../../data/strings-papers"; // pp.*
import "../../data/strings-identity2"; // id2.sheet.*, id2.door.waiting
import "../../data/strings-sparkle"; // sp.pick.*, sp.sky.*, sp.wave.*
import "../../data/strings-step5-settings"; // set.letterFont, set.font.system

/* WHAT'S NEW IN 1.0.5, AS A REEL (owner, 2026-10-25: "1.0.5里都要" — every new part in the
   what's-new card, in the big-card style of 1.0.4's). Seven scenes, each drawn at the square's own
   size from the product's parts, in the reader's language, a caption over each (nw105.*):
     1. Stamp Press: the dark camera, the moment in the stamp-shaped cut; the lime shutter is
        pressed, a flash, the bites punch through one after another (PHOTO_STAMP's punch order),
        and the stamp slides out of the slot to land at −5°; a #topic is typed, and a finger
        moves the filter from Original to Warm.
     2. Letter papers: the letter card changes paper as the strip's swatches are tapped (Plain →
        Grid → Airmail → Kraft, "· FIRST CLASS" in gold), all seven drawn from data/papers.
     3. Courier names: three pen pals rise in a list, each a frosted window (lib/frost) and the
        name the reader's courier gives them (lib/stranger-name), typed in; the ♀/♂ mark and the
        star sign arrive after it (the second has no mark: it is theirs to show or not).
     4. Trading names: the signing sheet — a pen name typed, a signature drawn, Sign and Send —
        then the two windows, YOU SIGNED · WAITING until theirs is in, and both wipe clear at
        once onto the faces they chose; the courier names are struck and the signatures write
        themselves in (the ceremony's beats, IntroductionRitual, in the reel's fixed inks).
     5. This or That: Mira's card, the question from the deck (data/sparkle-deck), a pick, and
        both answers open together: Both of you, Same!
     6. Sky postcards: her dusk postcard (KSkyScene's sky, drawn here) and Wave Back; tapped, the
        pair — your night beside her dusk.
     7. The font: a letter set in Newsreader, then Garamond, then SF Mono, as Settings' font
        tiles are tapped.
   Curves are module constants: a hook listing a fresh Easing in its deps would restart on every
   re-render. Typing (Typed) re-renders only its own text, so nothing around it restarts. */

const E_OUT = Easing.out(Easing.cubic);
const E_IN = Easing.in(Easing.quad);
const E_INOUT = Easing.inOut(Easing.cubic);
const E_POP = Easing.out(Easing.back(1.8));
const LINEAR = Easing.linear;
/* a reel is a light picture in every theme (guide-reel/kit), so the 10a parts take the light
   theme's inks, fixed */
const L = THEMES.classic;
const LINE = "rgba(17,17,19,0.14)";
const BAR = "rgba(17,17,19,0.16)";
const CHECK = "M5 12.5l4.2 4.2L19 7";

const clamp01 = (x: number) => {
  "worklet";
  return Math.min(1, Math.max(0, x));
};
const smooth = (x: number) => {
  "worklet";
  return x * x * (3 - 2 * x);
};
const up = (x: string) => x.toLocaleUpperCase(localeTag());
const sentence = (x: string) => {
  const low = x.toLocaleLowerCase(localeTag());
  return low.charAt(0).toLocaleUpperCase(localeTag()) + low.slice(1);
};

/* ── the shared pieces ──────────────────────────────────────────────── */

/* each scene's line, over its picture: the reel's big type (kit BigType), a size down, two lines at most */
function Caption({ s, id }: { s: number; id: string }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: s * 0.07, right: s * 0.07, top: s * 0.075 }}>
      <Rise dy={s * 0.03}>
        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontSize: s * 0.058, lineHeight: s * 0.068, fontWeight: "700", letterSpacing: -0.3, color: P.ink }}>
          {t(id)}
        </Text>
      </Rise>
    </View>
  );
}

/* shown from `from` until `to` (ms), cross-faded: one state of a thing that changes as it's tapped */
function Between({ from, to, style, children }: { from: number; to?: number; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const on = useOnce(180, Math.max(0, from));
  const off = useOnce(180, to ?? 0);
  const first = from <= 0;
  const last = to == null;
  const st = useAnimatedStyle(() => ({ opacity: (first ? 1 : on.value) - (last ? 0 : off.value) }));
  return (
    <Animated.View pointerEvents="none" style={[style, st]}>
      {children}
    </Animated.View>
  );
}

/* a finger for each tap, each gone soon after its press, so one scene can tap more than once */
type TapAt = { x: number; y: number; at: number };
function Taps({ taps, size }: { taps: readonly TapAt[]; size: number }) {
  return (
    <>
      {taps.map((p, i) => (
        <Tap key={i} {...p} size={size} stays={i === taps.length - 1} />
      ))}
    </>
  );
}

function Tap({ x, y, at, size, stays }: TapAt & { size: number; stays: boolean }) {
  const gone = useOnce(220, at + 360);
  const st = useAnimatedStyle(() => ({ opacity: stays ? 1 : 1 - gone.value }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }, st]}>
      <Finger x={x} y={y} at={at} size={size} />
    </Animated.View>
  );
}

/* words typed in, a character every `every` ms from `at` */
function Typed({ text, at, every, style }: { text: string; at: number; every: number; style: StyleProp<TextStyle> }) {
  const chars = useMemo(() => Array.from(text), [text]);
  const v = useStep(chars.length, every, at);
  const [n, setN] = useState(0);
  useAnimatedReaction(
    () => Math.floor(v.value),
    (k, prev) => {
      if (k !== prev) runOnJS(setN)(k);
    },
  );
  return (
    <Text numberOfLines={1} style={[{ flexShrink: 1 }, style]}>
      {chars.slice(0, n).join("")}
    </Text>
  );
}

/** a rounded rect as a path (r 0: square corners) */
function rrPath(x: number, y: number, w: number, h: number, r: number): string {
  const q = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M${x + q} ${y}H${x + w - q}A${q} ${q} 0 0 1 ${x + w} ${y + q}V${y + h - q}A${q} ${q} 0 0 1 ${x + w - q} ${y + h}H${x + q}A${q} ${q} 0 0 1 ${x} ${y + h - q}V${y + q}A${q} ${q} 0 0 1 ${x + q} ${y}Z`;
}

/* ── 1 · the stamp press ────────────────────────────────────────────── */

/* THE MOMENT: a drawing standing in for the photo (the press's own stand-in scene where there is
   no camera does the same), in the box units of the stamp's 100 × 120 box — the cut's paper is
   x11 y8 w78 h104, so it fills the cut and, drawn wider, the camera behind it. One sunset in the
   four looks the filter row shows: original, vivid and warm for everyone, golden with First
   Class (KPressFilter: bright, warm, hopeful; nothing darkens). */
type Look = { skyTop: string; skyLow: string; sun: string; seaTop: string; seaLow: string; land: string };
type LookId = "original" | "vivid" | "warm" | "golden";
const LOOKS: Readonly<Record<LookId, Look>> = {
  original: { skyTop: "#86A9DD", skyLow: "#F5C3A6", sun: "#FFF0C8", seaTop: "#5A84BC", seaLow: "#2E4F84", land: "#3C4E78" },
  vivid: { skyTop: "#5F95F2", skyLow: "#FFB089", sun: "#FFF4B8", seaTop: "#3B78D6", seaLow: "#1C4699", land: "#2A3D7C" },
  warm: { skyTop: "#9DA8D8", skyLow: "#FFC08C", sun: "#FFE9A8", seaTop: "#6E86B6", seaLow: "#3B5282", land: "#4A4C72" },
  golden: { skyTop: "#C2A2B2", skyLow: "#FFB25E", sun: "#FFE08A", seaTop: "#8C82A2", seaLow: "#504A6C", land: "#58445E" },
};
const FILTER_ROW: readonly LookId[] = ["original", "vivid", "warm", "golden"];
const GLINTS: readonly (readonly [number, number, number, number])[] = [
  [49, 73.5, 18, 1.6],
  [52, 78, 12, 1.4],
  [54.5, 84, 7, 1.2],
  [56, 91, 4, 1],
];

function PhotoScene({ look }: { look: Look }) {
  return (
    <>
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="70" gradientUnits="userSpaceOnUse">
          <Stop offset={0} stopColor={look.skyTop} />
          <Stop offset={1} stopColor={look.skyLow} />
        </LinearGradient>
        <LinearGradient id="sea" x1="0" y1="70" x2="0" y2="130" gradientUnits="userSpaceOnUse">
          <Stop offset={0} stopColor={look.seaTop} />
          <Stop offset={1} stopColor={look.seaLow} />
        </LinearGradient>
      </Defs>
      <Rect x={-300} y={-300} width={700} height={370} fill="url(#sky)" />
      <Circle cx={58} cy={62} r={22} fill={look.sun} opacity={0.35} />
      <Circle cx={58} cy={62} r={11} fill={look.sun} />
      <Rect x={-300} y={70} width={700} height={400} fill="url(#sea)" />
      {GLINTS.map(([x, y, w, h], i) => (
        <Rect key={i} x={x} y={y} width={w} height={h} rx={h / 2} fill={look.sun} opacity={0.75} />
      ))}
      <Path d="M-300 70L-300 50L0 50C12 44 24 50 34 62C37 66 39 68 42 70Z" fill={look.land} />
    </>
  );
}

/* the moment cut to the stamp, at the cut's paper (the "paper" placement): the bites show what's
   behind. ≤ 60 wide it keeps the faint ink hairline along the cut (photoStampEdge) */
function PhotoCut({ w, look }: { w: number; look: Look }) {
  const p = PHOTO_STAMP.paper;
  const hair = w <= PHOTO_STAMP.hairlineMaxBoxWidth;
  return (
    <Svg width={w} height={(w * p.height) / p.width} viewBox={`${p.x} ${p.y} ${p.width} ${p.height}`}>
      <Defs>
        <ClipPath id="cut">
          <Path d={PHOTO_STAMP.d} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#cut)">
        <PhotoScene look={look} />
        {hair && <Path d={PHOTO_STAMP.d} fill="none" stroke={STAMP_V3_INK} strokeOpacity={PHOTO_STAMP.hairlineOpacity} strokeWidth={(PHOTO_STAMP.hairlinePt * 2 * p.width) / w} />}
      </G>
    </Svg>
  );
}

const DIM = "rgba(20,18,42,0.58)"; // the camera's dim outside the cut (KStampPressCamera)
const BITE_R = PHOTO_STAMP.bite;
const SHADOW_A = PHOTO_STAMP.shadowOpacity.light;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
/* one bite punching through the frozen photo: a dim disc growing to the bite's radius */
function Bite({ cx, cy, at }: { cx: number; cy: number; at: number }) {
  const v = useOnce(90, at, E_OUT);
  const props = useAnimatedProps(() => ({ r: BITE_R * v.value }));
  return <AnimatedCircle cx={cx} cy={cy} fill={DIM} animatedProps={props} />;
}

const SHUTTER = 1150;
const PUNCH = SHUTTER + 150; // the bites, one after another over .35 s
const PUNCH_MS = 350;
const SLIDE = SHUTTER + 620; // the stamp slides out of the slot
const FILTER_TAP = 3550;

function Press({ s }: { s: number }) {
  const paper = PHOTO_STAMP.paper;
  // the camera page, dark in every theme, and the stamp-shaped cut in it (3:4)
  const px = s * 0.07, py = s * 0.25, pw = s * 0.86, ph = s * 0.68;
  const ch = s * 0.42, cw = ch * (paper.width / paper.height);
  const cx = (pw - cw) / 2, cy = s * 0.075;
  const u = paper.width / cw; // box units a point
  const x0 = paper.x - cx * u, y0 = paper.y - cy * u, W = pw * u, H = ph * u;
  const vb = `${x0} ${y0} ${W} ${H}`;
  const outside = `M${x0} ${y0}h${W}v${H}h${-W}Z`;
  const unbitten = rrPath(paper.x, paper.y, paper.width, paper.height, PHOTO_STAMP.corner);
  const shutter = s * 0.12;
  const shutterY = cy + ch + (ph - cy - ch) / 2;
  // where the pressed stamp lands, turned −5° with the soft shadow (the edit page's big stamp)
  const bw = s * 0.28, bh = bw * (paper.height / paper.width);
  const lx = s * 0.11, ly = s * 0.255;
  const dx = px + pw / 2 - (lx + bw / 2), dy = py + cy + ch / 2 - (ly + bh / 2);
  const k0 = cw / bw;

  const freeze = useOnce(60, SHUTTER + 80);
  const flashIn = useOnce(80, SHUTTER);
  const flashOut = useOnce(260, SHUTTER + 90);
  const shown = useOnce(60, PUNCH + PUNCH_MS + 70);
  const slide = useOnce(480, SLIDE, E_INOUT);
  const away = useOnce(320, SLIDE, E_IN);
  const warm = useOnce(260, FILTER_TAP + 60);
  const live = useAnimatedStyle(() => ({ opacity: 1 - freeze.value }));
  const frozen = useAnimatedStyle(() => ({ opacity: freeze.value }));
  const flash = useAnimatedStyle(() => ({ opacity: 0.85 * (flashIn.value - flashOut.value) }));
  const panel = useAnimatedStyle(() => ({ opacity: 1 - away.value }));
  const stamp = useAnimatedStyle(() => ({
    opacity: shown.value,
    shadowOpacity: SHADOW_A * slide.value,
    transform: [{ translateX: dx * (1 - slide.value) }, { translateY: dy * (1 - slide.value) }, { scale: k0 + (1 - k0) * slide.value }, { rotate: `${-5 * slide.value}deg` }],
  }));
  const warmSt = useAnimatedStyle(() => ({ opacity: warm.value }));

  const cat = STAMP_CATEGORIES.find((c) => c.id === DEFAULT_CATEGORY);
  const tag = topicTagLook(cat?.color, L);
  const mw = s * 0.12, mh = mw * (paper.height / paper.width), tileW = mw + 6;
  const rowX = s * 0.07, rowW = s * 0.86, rowY = s * 0.7;
  const rowGap = (rowW - FILTER_ROW.length * tileW) / (FILTER_ROW.length - 1);
  const tileX = (i: number) => rowX + i * (tileW + rowGap);
  const lime = BRAND.lime;
  const mark = 7; // the corner marks' arms, in box units
  const m = 4.5;
  const corners = [
    `M${paper.x + m} ${paper.y + m + mark}V${paper.y + m}H${paper.x + m + mark}`,
    `M${paper.x + paper.width - m - mark} ${paper.y + m}H${paper.x + paper.width - m}V${paper.y + m + mark}`,
    `M${paper.x + paper.width - m} ${paper.y + paper.height - m - mark}V${paper.y + paper.height - m}H${paper.x + paper.width - m - mark}`,
    `M${paper.x + m + mark} ${paper.y + paper.height - m}H${paper.x + m}V${paper.y + paper.height - m - mark}`,
  ];

  return (
    <View style={{ width: s, height: s }}>
      <Caption s={s} id="nw105.press" />

      {/* the camera: the live moment under the dim, the cut, the lime shutter */}
      <Animated.View style={[{ position: "absolute", left: px, top: py, width: pw, height: ph, borderRadius: s * 0.05, overflow: "hidden", backgroundColor: P.ink }, panel]}>
        <Svg width={pw} height={ph} viewBox={vb} style={{ position: "absolute" }}>
          <PhotoScene look={LOOKS.original} />
        </Svg>
        {/* live: the dim with the bitten hole, the cut's white hairline and the four lime marks */}
        <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, live]}>
          <Svg width={pw} height={ph} viewBox={vb}>
            <Path d={outside + PHOTO_STAMP.d} fill={DIM} fillRule="evenodd" />
            <Path d={PHOTO_STAMP.d} fill="none" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={u} />
            {corners.map((d, i) => (
              <Path key={i} d={d} fill="none" stroke={lime} strokeWidth={2 * u} strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </Svg>
        </Animated.View>
        {/* pressed: the frozen photo un-bitten, then the bites punch through it in order */}
        <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, frozen]}>
          <Svg width={pw} height={ph} viewBox={vb}>
            <Defs>
              <ClipPath id="frozen">
                <Path d={unbitten} />
              </ClipPath>
            </Defs>
            <Path d={outside + unbitten} fill={DIM} fillRule="evenodd" />
            <G clipPath="url(#frozen)">
              {PHOTO_STAMP.bites.map(([bx, by], i) => (
                <Bite key={i} cx={paper.x + bx} cy={paper.y + by} at={PUNCH + (i * PUNCH_MS) / PHOTO_STAMP.bites.length} />
              ))}
            </G>
          </Svg>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: cx, top: cy, width: cw, height: ch, borderRadius: PHOTO_STAMP.corner / u, backgroundColor: "#FFFFFF" }, flash]} />
        <Text numberOfLines={1} style={{ position: "absolute", left: 0, right: 0, top: cy * 0.32, textAlign: "center", ...PFM.monoSemi, fontSize: s * 0.026, letterSpacing: 1.2, color: "rgba(255,255,255,0.8)" }}>
          {t("cs2.cam.hint")}
        </Text>
        <View style={{ position: "absolute", left: pw / 2 - shutter / 2, top: shutterY - shutter / 2, width: shutter, height: shutter }}>
          <View style={{ position: "absolute", left: shutter * 0.05, top: shutter * 0.05, width: shutter, height: shutter, borderRadius: shutter / 2, backgroundColor: "rgba(0,0,0,0.5)" }} />
          <View style={{ width: shutter, height: shutter, borderRadius: shutter / 2, backgroundColor: lime, borderWidth: Math.max(1.5, shutter * 0.033), borderColor: L.ink, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: shutter * 0.79, height: shutter * 0.79, borderRadius: shutter * 0.4, borderWidth: Math.max(1, shutter * 0.02), borderColor: L.ink }} />
          </View>
        </View>
      </Animated.View>

      {/* the pressed stamp, from the slot to where the edit page holds it; the look follows the filter */}
      <Animated.View style={[{ position: "absolute", left: lx, top: ly, width: bw, height: bh, shadowColor: "#000", shadowRadius: bw * PHOTO_STAMP.shadowRadiusK, shadowOffset: { width: 0, height: bw * PHOTO_STAMP.shadowYK } }, stamp]}>
        <PhotoCut w={bw} look={LOOKS.original} />
        <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, warmSt]}>
          <PhotoCut w={bw} look={LOOKS.warm} />
        </Animated.View>
      </Animated.View>

      {/* its #topic, typed, in the topic tag's sticker (the colour row's default: small things) */}
      <View style={{ position: "absolute", left: s * 0.5, top: s * 0.4, maxWidth: s * 0.44 }}>
        <Pop delay={SLIDE + 520}>
          <StickerBox fill={tag.fill} stroke={tag.border} lineWidth={2} radius={20} shadow={tag.shadow} offset={3} faceStyle={{ paddingVertical: s * 0.017, paddingHorizontal: s * 0.034, minWidth: s * 0.12 }}>
            <Typed text={t("nw105.press.topic")} at={SLIDE + 700} every={60} style={{ ...PFM.monoSemi, fontSize: s * 0.034, letterSpacing: 0.2, color: tag.text }} />
          </StickerBox>
        </Pop>
      </View>

      {/* the filter row: the moment in each look, the gold 1ST on what First Class keeps */}
      {FILTER_ROW.map((id, i) => (
        <View key={id} style={{ position: "absolute", left: tileX(i), top: rowY, width: tileW, alignItems: "center" }}>
          <Rise delay={SLIDE + 600 + i * 70} dy={s * 0.03}>
            <View style={{ padding: 3 }}>
              <PhotoCut w={mw} look={LOOKS[id]} />
              {(id === "original" || id === "warm") && (
                <Between from={id === "original" ? 0 : FILTER_TAP} to={id === "original" ? FILTER_TAP : undefined} style={{ position: "absolute", left: 0, top: 0, width: tileW, height: mh + 6, borderRadius: 8, borderWidth: 2, borderColor: L.ind }} />
              )}
              {id === "golden" && (
                <View style={{ position: "absolute", right: -s * 0.02, top: -s * 0.018, width: s * 0.062, height: s * 0.044, borderRadius: 3, backgroundColor: BRAND.waxGold, borderWidth: 1.5, borderColor: L.ink, alignItems: "center", justifyContent: "center", transform: [{ rotate: "6deg" }] }}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ ...PFM.monoSemi, fontSize: s * 0.02, color: L.ink }}>
                    {t("cs2.ed.fcBadge")}
                  </Text>
                </View>
              )}
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ width: tileW + rowGap * 0.8, marginTop: s * 0.012, textAlign: "center", ...PFM.monoMed, fontSize: s * 0.025, color: L.sub }}>
              {t(`cs2.ed.f.${id}`)}
            </Text>
          </Rise>
        </View>
      ))}

      {/* the shutter, pressed (the finger goes with the camera), then Warm */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: s, height: s }, panel]}>
        <Finger x={px + pw / 2} y={py + shutterY} at={SHUTTER} size={s * 0.15} />
      </Animated.View>
      <Finger x={tileX(2) + tileW / 2} y={rowY + 3 + mh / 2} at={FILTER_TAP} size={s * 0.13} />
    </View>
  );
}

/* ── 2 · letter papers ──────────────────────────────────────────────── */

/* A PAPER, READ OFF THE PAPERS TABLE (data/papers: the prototype's CSS, which Swift's KPaper
   carries as numbers). The card's values are for the prototype's card (~340 wide), the swatch's
   (t*) for its 48 × 60, so `k` scales them to the size drawn. Its ground is the last colour the
   CSS paints; Grid draws its 20px lines, Airmail its red-white-blue border, Receipt its torn
   edges, Sticky its folded corner; a hard shadow is drawn, a soft one is the view's. */
const hexes = (css: string): string[] => css.match(/#[0-9A-Fa-f]{3,8}\b/g) ?? [];
const groundOf = (p: Paper): string => (p.id === "airmail" ? "#FFFFFF" : hexes(p.bg).pop() ?? "#FFFFFF");
/** "2.5px solid #1E1B35" → its width and colour; none, or Airmail's transparent one, → null */
function lineOf(css: string): { w: number; color: string; dashed: boolean } | null {
  const m = css.match(/([\d.]+)px (solid|dashed) (#[0-9A-Fa-f]{3,8})/);
  return m ? { w: parseFloat(m[1]), color: m[3], dashed: m[2] === "dashed" } : null;
}
/** a hard shadow ("6px 6px 0 #3A34D6", "0 2px 0 #1E1B35"), or null for a soft one or none */
function hardOf(css: string): { x: number; y: number; color: string } | null {
  const m = css.match(/^(-?[\d.]+)(?:px)? (-?[\d.]+)(?:px)? 0 (#[0-9A-Fa-f]{3,8}|rgba\([^)]*\))$/);
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]), color: m[3] } : null;
}

function sheetPath(p: Paper, w: number, h: number, r: number, k: number): string {
  if (p.torn) {
    const tooth = Math.max(4, 10 * k);
    const a = tooth * 0.45;
    const n = Math.max(2, Math.round(w / tooth));
    const step = w / n;
    let d = `M0 ${a}`;
    for (let i = 0; i < n; i++) d += `L${(i + 0.5) * step} 0L${(i + 1) * step} ${a}`;
    d += `L${w} ${h - a}`;
    for (let i = n - 1; i >= 0; i--) d += `L${(i + 0.5) * step} ${h}L${i * step} ${h - a}`;
    return d + "Z";
  }
  if (p.fold) {
    const f = Math.min(w, h) * 0.18;
    return `M0 0H${w}V${h - f}L${w - f} ${h}H0Z`;
  }
  return rrPath(0, 0, w, h, r);
}

function airStripes(w: number, h: number, k: number, colours: string[]): ReactNode[] {
  const band = 10 * k;
  const period = band * colours.length;
  const out: ReactNode[] = [];
  let n = 0;
  for (let x = -h - period; x < w; x += period)
    colours.forEach((c, i) => {
      const a = x + i * band;
      out.push(<Polygon key={n++} points={`${a},0 ${a + band},0 ${a + band + h},${h} ${a + h},${h}`} fill={c} />);
    });
  return out;
}

function PaperSheet({ p, w, h, k, swatch = false, children }: { p: Paper; w: number; h: number; k: number; swatch?: boolean; children?: ReactNode }) {
  const r = (parseFloat(swatch ? p.tRadius : p.radius) || 0) * k;
  const line = lineOf(swatch ? p.tBorder : p.border);
  const lw = line ? line.w * k : 0;
  const stripes = p.id === "airmail" ? (parseFloat(swatch ? p.tBorder : p.border) || 0) * k : 0;
  const hard = swatch ? null : hardOf(p.shadow);
  const soft = !swatch && !hard && p.shadow !== "none";
  const d = sheetPath(p, w, h, r, k);
  const f = Math.min(w, h) * 0.18;
  const grid = 20 * k;
  const gridInk = hexes(p.bg)[0];
  return (
    <View style={[{ width: w, height: h }, soft ? { shadowColor: L.ink, shadowOpacity: 0.22, shadowRadius: 10 * k, shadowOffset: { width: 0, height: 6 * k } } : null]}>
      {hard && (
        <Svg width={w} height={h} style={{ position: "absolute", left: hard.x * k, top: hard.y * k }}>
          <Path d={d} fill={hard.color} />
        </Svg>
      )}
      <Svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
        <Defs>
          <ClipPath id="sheet">
            <Path d={d} />
          </ClipPath>
        </Defs>
        <Path d={d} fill={groundOf(p)} />
        <G clipPath="url(#sheet)">
          {p.id === "grid" &&
            Array.from({ length: Math.ceil(w / grid) + Math.ceil(h / grid) }, (_, i) => {
              const across = Math.ceil(w / grid);
              return i < across ? (
                <Line key={i} x1={(i + 1) * grid} y1={0} x2={(i + 1) * grid} y2={h} stroke={gridInk} strokeWidth={Math.max(0.5, k)} />
              ) : (
                <Line key={i} x1={0} y1={(i - across + 1) * grid} x2={w} y2={(i - across + 1) * grid} stroke={gridInk} strokeWidth={Math.max(0.5, k)} />
              );
            })}
          {stripes > 0 && (
            <>
              {airStripes(w, h, k, hexes(p.bg).slice(-3))}
              <Path d={rrPath(stripes, stripes, w - 2 * stripes, h - 2 * stripes, Math.max(0, r - stripes))} fill="#FFFFFF" />
            </>
          )}
        </G>
        {p.fold && <Path d={`M${w - f} ${h - f}H${w}L${w - f} ${h}Z`} fill={PAPER_FOLD_FLAP} />}
        {line && (
          <Path
            d={p.torn || p.fold ? d : rrPath(lw / 2, lw / 2, w - lw, h - lw, Math.max(0, r - lw / 2))}
            fill="none"
            stroke={line.color}
            strokeWidth={lw}
            strokeDasharray={line.dashed ? [3 * k, 2 * k] : undefined}
          />
        )}
      </Svg>
      {children}
    </View>
  );
}

/* the card goes Plain → Grid → Airmail → Kraft as their swatches are tapped */
const PAPER_RUN: readonly { id: PaperId; at: number }[] = [
  { id: "plain", at: 0 },
  { id: "grid", at: 1050 },
  { id: "airmail", at: 2000 },
  { id: "kraft", at: 2950 },
];
const CARD_STAMP = "made-my-day";

function Papers({ s }: { s: number }) {
  const face = useLetterFamily();
  const size = letterFitSize(useLetterFont(), s * 0.044);
  const cardW = s * 0.64, cardH = s * 0.36;
  const cardX = (s - cardW) / 2, cardY = s * 0.255;
  const k = cardW / 340;
  const sw = snapStampWidth(s * 0.085, GUIDE_REEL_WIDTHS);
  const stripW = s * 0.86, g = s * 0.016;
  const tw = (stripW - (PAPERS.length - 1) * g) / PAPERS.length, th = tw * 1.25;
  const stripX = (s - stripW) / 2, stripY = s * 0.735;
  const headY = cardY + cardH + s * 0.05;
  const tileX = (i: number) => stripX + i * (tw + g);
  const indexOf = (id: PaperId) => PAPERS.findIndex((p) => p.id === id);
  const line = t("nw105.papers.line");
  const taps = PAPER_RUN.slice(1).map((run) => ({ x: tileX(indexOf(run.id)) + tw / 2, y: stripY + th / 2, at: run.at }));
  return (
    <View style={{ width: s, height: s }}>
      <Caption s={s} id="nw105.papers" />

      {/* the letter card, on the paper last picked (each fades out once the next is in, so no edge shows through) */}
      <View style={{ position: "absolute", left: cardX, top: cardY, width: cardW, height: cardH }}>
        <Rise dy={s * 0.03}>
          <View style={{ width: cardW, height: cardH }}>
            {PAPER_RUN.map((run, i) => {
              const p = paperOf(run.id);
              const pad = (p.id === "airmail" ? parseFloat(p.border) * k : 0) + 16 * k;
              const glow = hardOf(p.textShadow);
              const next = PAPER_RUN[i + 1];
              return (
                <Between key={run.id} from={run.at} to={next ? next.at + 200 : undefined} style={{ position: "absolute", left: 0, top: 0 }}>
                  <PaperSheet p={p} w={cardW} h={cardH} k={k}>
                    <View style={{ position: "absolute", right: pad, top: pad }}>
                      <Stamp id={CARD_STAMP} width={sw} />
                    </View>
                    <Text
                      numberOfLines={3}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                      style={{
                        position: "absolute",
                        left: pad,
                        right: pad + sw + s * 0.02,
                        top: pad + s * 0.01,
                        ...face,
                        fontSize: size,
                        lineHeight: size * 1.3,
                        color: p.ink,
                        ...(glow ? { textShadowColor: glow.color, textShadowOffset: { width: glow.x * k, height: glow.y * k }, textShadowRadius: 0 } : null),
                      }}
                    >
                      {line}
                    </Text>
                  </PaperSheet>
                </Between>
              );
            })}
          </View>
        </Rise>
      </View>

      {/* the strip's head: PAPER · {name}, "· FIRST CLASS" in gold on a First Class paper */}
      {PAPER_RUN.map((run, i) => {
        const p = paperOf(run.id);
        const next = PAPER_RUN[i + 1];
        return (
          <Between key={run.id} from={run.at} to={next?.at} style={{ position: "absolute", left: s * 0.07, right: s * 0.07, top: headY, alignItems: "center" }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ ...PFM.monoSemi, fontSize: s * 0.03, letterSpacing: 1.2, color: L.ink }}>
              {t("pp.strip.head", { name: up(t(p.nameKey)) })}
              {p.tier === "first" && <Text style={{ color: BRAND.goldText }}> {t("pp.strip.fc")}</Text>}
            </Text>
          </Between>
        );
      })}

      {/* the strip: all seven, the gold 1ST on First Class, the picked one ringed */}
      {PAPERS.map((p, i) => (
        <View key={p.id} style={{ position: "absolute", left: tileX(i) - g / 2, top: stripY, width: tw + g, alignItems: "center" }}>
          <Rise delay={150 + i * 50} dy={s * 0.02}>
            <View style={{ width: tw, height: th }}>
              <PaperSheet p={p} w={tw} h={th} k={tw / 48} swatch>
                {/* two lines of writing, wordless, in the paper's own ink */}
                <View style={{ position: "absolute", left: tw * 0.2, right: tw * 0.2, top: th * 0.36, gap: th * 0.1 }}>
                  <View style={{ height: Math.max(1.5, th * 0.045), borderRadius: 2, backgroundColor: p.line, opacity: 0.55 }} />
                  <View style={{ height: Math.max(1.5, th * 0.045), width: "62%", borderRadius: 2, backgroundColor: p.line, opacity: 0.55 }} />
                </View>
              </PaperSheet>
              {p.tier === "first" && (
                <View style={{ position: "absolute", right: -tw * 0.18, top: -th * 0.1, paddingHorizontal: 2.5, paddingVertical: 1, borderRadius: 3, backgroundColor: BRAND.waxGold, borderWidth: 1, borderColor: L.ink, transform: [{ rotate: "6deg" }] }}>
                  <Text style={{ ...PFM.monoSemi, fontSize: Math.max(6.5, s * 0.018), color: L.ink }}>{t("pp.badge.fc")}</Text>
                </View>
              )}
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ width: tw + g, marginTop: s * 0.012, textAlign: "center", ...PFM.monoMed, fontSize: s * 0.024, color: L.sub }}>
              {t(p.nameKey).toLocaleLowerCase(localeTag())}
            </Text>
          </Rise>
        </View>
      ))}
      {PAPER_RUN.map((run, i) => {
        const next = PAPER_RUN[i + 1];
        return <Between key={run.id} from={run.at} to={next?.at} style={{ position: "absolute", left: tileX(indexOf(run.id)) - 3, top: stripY - 3, width: tw + 6, height: th + 6, borderRadius: 6, borderWidth: 2, borderColor: L.ind }} />;
      })}

      <Taps taps={taps} size={s * 0.13} />
    </View>
  );
}

/* ── 3 · courier names ──────────────────────────────────────────────── */

/* three strangers as the reader's list shows them: the window and the name their courier gives
   them (in English the first is "Sunday Kite"), the mark and the sign only where they show them */
const NAMED: readonly { seed: string; mark: Mark | null; sign: Zodiac }[] = [
  { seed: "news-105-9288", mark: "she", sign: "gemini" },
  { seed: "news-105-32", mark: "he", sign: "leo" },
  { seed: "news-105-13", mark: null, sign: "pisces" },
];
const NAMED_FROST: readonly (FrostSpec | null)[] = NAMED.map((n) => frostSpec(n.seed));
const NAME_EVERY = 45;

function NameRow({ s, i }: { s: number; i: number }) {
  const n = NAMED[i];
  const spec = NAMED_FROST[i];
  const name = strangerName(n.seed, { lang: getLang(), unsigned: t("ld.unsigned") });
  const at = 250 + i * 520;
  const typed = at + 220;
  const glyphs = typed + Array.from(name).length * NAME_EVERY + 160;
  const win = s * 0.092;
  return (
    <Rise delay={at} dy={s * 0.03}>
      <View style={{ height: s * 0.14, flexDirection: "row", alignItems: "center", gap: s * 0.035, paddingHorizontal: s * 0.04, borderBottomWidth: i < NAMED.length - 1 ? 1 : 0, borderBottomColor: LINE }}>
        {spec ? <Frost spec={spec} size={win} /> : <View style={{ width: win, height: win }} />}
        <View style={{ flex: 1, gap: s * 0.018 }}>
          <View style={{ flexDirection: "row", alignItems: "center", minHeight: s * 0.06 }}>
            <Typed text={name} at={typed} every={NAME_EVERY} style={{ fontSize: s * 0.047, fontWeight: "600", color: L.ink }} />
            <Pop delay={glyphs}>
              <WhoGlyphs mark={n.mark} sign={n.sign} size={Math.round(s * 0.038)} color={L.sub} />
            </Pop>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: BAR, marginRight: s * (0.08 + 0.07 * i) }} />
        </View>
      </View>
    </Rise>
  );
}

function Names({ s }: { s: number }) {
  const x = s * 0.07, y = s * 0.4, w = s * 0.86;
  const wren = s * 0.16;
  return (
    <View style={{ width: s, height: s }}>
      <Caption s={s} id="nw105.names" />
      <View style={{ position: "absolute", left: x, top: y, width: w }}>
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 18, overflow: "hidden" }}>
          {NAMED.map((_, i) => (
            <NameRow key={i} s={s} i={i} />
          ))}
        </View>
      </View>
      {/* the courier who named them, perched on the list */}
      <View style={{ position: "absolute", left: x + w - wren - s * 0.04, top: y - wren * 0.9 }}>
        <Rise dy={s * 0.02}>
          <WrenBird size={wren} mood="happy" />
        </Rise>
      </View>
    </View>
  );
}

/* ── 4 · trading names ──────────────────────────────────────────────── */

/* Sunday Kite, who signs as Mira, and you, Theo to her from now on. The signatures are made-up
   ones (penDemo, as the dev pages draw them): a picture, never anyone's, never stored */
const THEM = { seed: "news-105-9288", face: "f-02-tender-thinker", sig: penDemo("news-105-mira") };
const ME = { seed: "news-105-37", face: "m-15-curious-mind", sig: penDemo("news-105-theo") };
const FROST_THEM = frostSpec(THEM.seed);
const FROST_ME = frostSpec(ME.seed);

const T_NAME = 250; // the pen name typed
const T_DRAW = 850; // the signature on the pad
const T_SEND = 2050;
const T_SHEET_OUT = 2300;
const T_PAIR = 2500;
const T_MINE = 2650; // yours is in: YOU SIGNED · WAITING
const T_THEIRS = 3250; // theirs is in
const T_WIPE = 3500; // both windows wipe clear together
const T_STRIKE = 4150;
const T_SIGN = 4400;
const T_SIGN_MS = 900;
const WIPE_MS = 600;

const AnimatedPath = Animated.createAnimatedComponent(Path);
/* a signature drawn stroke by stroke (penDrawPlan) in a w × h slot, in the reel's ink */
function SigDraw({ sig, w, h, at, ms, strokePt = 2 }: { sig: PenSig; w: number; h: number; at: number; ms: number; strokePt?: number }) {
  const plan = useMemo(() => penDrawPlan(sig, ms, { gapMs: 40, minStrokeMs: 60 }) ?? [], [sig, ms]);
  const vb = useMemo(() => penViewBox(sig, "ink", { aspect: w / h }), [sig, w, h]);
  const end = plan.reduce((m, st) => Math.max(m, st.delay + st.duration), 0) + 1;
  const clock = useOnce(end, at, LINEAR);
  const width = (strokePt * vb.w) / w;
  return (
    <Svg width={w} height={h} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}>
      {plan.map((st, i) => (
        <StrokeIn key={i} step={st} clock={clock} end={end} width={width} />
      ))}
    </Svg>
  );
}

function StrokeIn({ step, clock, end, width }: { step: PenDrawStep; clock: SharedValue<number>; end: number; width: number }) {
  const dash = step.length + 2;
  const props = useAnimatedProps(() => {
    const now = clock.value * end;
    const p = smooth(clamp01((now - step.delay) / step.duration));
    // hidden until its turn: a round cap at the dash's end would sit on the first point as a dot
    return { strokeDashoffset: dash * (1 - p), strokeOpacity: now > step.delay ? 1 : 0 };
  });
  return <AnimatedPath d={step.d} fill="none" stroke={L.ink} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[dash, dash]} animatedProps={props} />;
}

/* the frosted window each wore, wiped clear (the ceremony's WipeWindow): a sheen sweeps the pane
   while the frost fades, the square turns round, and the face they sent comes forward */
function WipeWindow({ spec, face, seed, size }: { spec: FrostSpec | null; face: string; seed: string; size: number }) {
  const v = useOnce(WIPE_MS, T_WIPE, LINEAR);
  const clip = useAnimatedStyle(() => ({ borderRadius: size * (0.25 + 0.25 * smooth(clamp01((v.value * WIPE_MS - 50) / 500))) }));
  const frost = useAnimatedStyle(() => ({ opacity: 1 - smooth(clamp01((v.value * WIPE_MS) / 550)) }));
  const sheen = useAnimatedStyle(() => {
    const p = clamp01((v.value * WIPE_MS) / 550);
    const d = -size * 0.85 + size * 1.7 * smooth(p);
    return { opacity: p > 0 && p < 1 ? Math.sin(p * Math.PI) : 0, transform: [{ translateX: d }, { translateY: d }, { rotate: "45deg" }] };
  });
  const faceSt = useAnimatedStyle(() => {
    const f = clamp01((v.value * WIPE_MS - 150) / 450);
    return { opacity: f, transform: [{ scale: 0.92 + 0.08 * f }] };
  });
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[{ width: size, height: size, overflow: "hidden" }, clip]}>
        <Animated.View style={[{ position: "absolute" }, faceSt]}>
          <AvatarImage id={face} seed={seed} size={size} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[{ position: "absolute" }, frost]}>
          {spec && <Frost spec={spec} size={size} />}
        </Animated.View>
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: size * 0.25, top: -size * 0.5, width: size * 0.5, height: size * 2 }, sheen]}>
          <Svg width={size * 0.5} height={size * 2}>
            <Defs>
              <LinearGradient id="wipe" x1="0" y1="0" x2="1" y2="0">
                <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0} />
                <Stop offset={0.5} stopColor="#FFFFFF" stopOpacity={0.85} />
                <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={size * 0.5} height={size * 2} fill="url(#wipe)" />
          </Svg>
        </Animated.View>
      </Animated.View>
      {/* the white ring a face wears as a sticker, once it's round */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: size, height: size, borderWidth: 3, borderColor: BRAND.paperWhite }, clip, faceSt]} />
    </View>
  );
}

/* a 1.5pt ink line strikes through the courier name, left to right; the name dims. Mono, so its
   width is known: a name too long for the column steps the size down instead of wrapping */
const WIDE = /[ᄀ-ᇿ⺀-꓏가-힯豈-﫿＀-｠]/;
function Struck({ text, at, size, room }: { text: string; at: number; size: number; room: number }) {
  const v = useOnce(240, at, E_INOUT);
  const w = useSharedValue(0);
  const nameSt = useAnimatedStyle(() => ({ opacity: 1 - 0.55 * v.value }));
  const line = useAnimatedStyle(() => ({ width: w.value * v.value }));
  let ems = 0;
  for (const ch of text) ems += (WIDE.test(ch) ? 1 : 0.6) + 0.06;
  const fs = Math.min(size, room / Math.max(1, ems));
  return (
    <View onLayout={(e) => (w.value = e.nativeEvent.layout.width)} style={{ alignSelf: "center", justifyContent: "center" }}>
      <Animated.Text style={[{ ...PFM.monoMed, fontSize: fs, letterSpacing: 0.6, color: L.sub }, nameSt]}>{text}</Animated.Text>
      <Animated.View style={[{ position: "absolute", left: 0, top: "50%", height: 1.5, marginTop: -0.5, backgroundColor: L.ink }, line]} />
    </View>
  );
}

/* the small ✓ on a window: that side has signed */
function Signed({ d, at, until }: { d: number; at: number; until: number }) {
  const on = useOnce(380, at, E_POP);
  const off = useOnce(200, until);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, on.value * 1.4) * (1 - off.value), transform: [{ scale: 0.4 + 0.6 * on.value }] }));
  return (
    <Animated.View style={[{ width: d, height: d, borderRadius: d / 2, backgroundColor: L.ind, borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }, st]}>
      <Svg width={d * 0.58} height={d * 0.58} viewBox="0 0 24 24">
        <Path d={CHECK} fill="none" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

function Side({ s, who, spec, courier, pen, signAt }: { s: number; who: typeof THEM; spec: FrostSpec | null; courier: string; pen: string; signAt: number }) {
  const face = useLetterFamily();
  const colW = s * 0.42, win = s * 0.2, badge = s * 0.065;
  const slotW = s * 0.34, slotH = s * 0.1;
  return (
    <View style={{ width: colW, alignItems: "center" }}>
      <View style={{ width: win, height: win }}>
        <WipeWindow spec={spec} face={who.face} seed={who.seed} size={win} />
        <View style={{ position: "absolute", left: win - badge * 0.7, top: win - badge * 0.7 }}>
          <Signed d={badge} at={who === ME ? T_MINE : T_THEIRS} until={T_WIPE} />
        </View>
      </View>
      <View style={{ marginTop: s * 0.03 }}>
        <Struck text={courier} at={who === THEM ? T_STRIKE : T_STRIKE + 120} size={s * 0.03} room={colW * 0.95} />
      </View>
      <View style={{ marginTop: s * 0.02, width: slotW, height: slotH }}>
        <SigDraw sig={who.sig} w={slotW} h={slotH} at={signAt} ms={T_SIGN_MS} />
      </View>
      <View style={{ marginTop: s * 0.008 }}>
        <Rise delay={signAt + T_SIGN_MS} dy={s * 0.015}>
          <Text numberOfLines={1} style={{ ...face, fontSize: s * 0.042, color: L.ink }}>
            {pen}
          </Text>
        </Rise>
      </View>
    </View>
  );
}

function Trade({ s }: { s: number }) {
  const face = useLetterFamily();
  const lang = getLang();
  const unsigned = t("ld.unsigned");
  const myPen = t("nw105.trade.pen");
  const sheetOut = useOnce(300, T_SHEET_OUT, E_IN);
  const sheet = useAnimatedStyle(() => ({ opacity: 1 - sheetOut.value, transform: [{ translateY: sheetOut.value * s * 0.06 }] }));
  // the sheet: YOUR PEN NAME, YOUR SIGNATURE, Sign and Send (the 10a main action, in ink)
  const sx = s * 0.07, sy = s * 0.25, sw = s * 0.86, pad = s * 0.05;
  const fieldH = s * 0.1, padY = pad + s * 0.215, padH = s * 0.19, keyY = pad + s * 0.44, keyH = s * 0.11;
  const label = { ...PFM.monoSemi, fontSize: s * 0.026, letterSpacing: 1.2, color: L.sub } as const;
  return (
    <View style={{ width: s, height: s }}>
      <Caption s={s} id="nw105.trade" />

      <Animated.View style={[{ position: "absolute", left: sx, top: sy, width: sw }, sheet]}>
        <Rise dy={s * 0.04}>
          <View style={{ height: s * 0.66, backgroundColor: "#FFFFFF", borderRadius: s * 0.05, paddingHorizontal: pad }}>
            <Text numberOfLines={1} style={[label, { position: "absolute", left: pad, top: pad }]}>
              {t("id2.sheet.name")}
            </Text>
            <View style={{ position: "absolute", left: pad, right: pad, top: pad + s * 0.045, height: fieldH, borderRadius: s * 0.025, borderWidth: 1.5, borderColor: L.line, justifyContent: "center", paddingHorizontal: s * 0.03 }}>
              <Typed text={myPen} at={T_NAME} every={110} style={{ ...face, fontSize: s * 0.05, color: L.ink }} />
            </View>
            <Text numberOfLines={1} style={[label, { position: "absolute", left: pad, top: pad + s * 0.17 }]}>
              {t("id2.sheet.sign")}
            </Text>
            <View style={{ position: "absolute", left: pad, right: pad, top: padY, height: padH, borderRadius: s * 0.03, backgroundColor: L.soft, alignItems: "center", justifyContent: "center" }}>
              <SigDraw sig={ME.sig} w={sw - 2 * pad - s * 0.08} h={padH * 0.8} at={T_DRAW} ms={1000} strokePt={2.6} />
            </View>
            <View style={{ position: "absolute", left: pad, right: pad, top: keyY, height: keyH, borderRadius: keyH / 2, backgroundColor: L.ink, alignItems: "center", justifyContent: "center" }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontSize: s * 0.042, fontWeight: "600", color: "#FFFFFF" }}>
                {t("id2.sheet.send")}
              </Text>
            </View>
          </View>
        </Rise>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: s, height: s }, sheet]}>
        <Finger x={s * 0.5} y={sy + keyY + keyH / 2} at={T_SEND} size={s * 0.15} />
      </Animated.View>

      {/* the two of you: sealed until both have signed, then open together */}
      <View style={{ position: "absolute", left: s * 0.08, right: s * 0.08, top: s * 0.3, flexDirection: "row", justifyContent: "space-between" }}>
        <Rise delay={T_PAIR} dy={s * 0.03}>
          <Side s={s} who={ME} spec={FROST_ME} courier={up(strangerName(ME.seed, { lang, unsigned }))} pen={myPen} signAt={T_SIGN + 250} />
        </Rise>
        <Rise delay={T_PAIR + 80} dy={s * 0.03}>
          <Side s={s} who={THEM} spec={FROST_THEM} courier={up(strangerName(THEM.seed, { lang, unsigned }))} pen={sentence(t("ga.mira"))} signAt={T_SIGN} />
        </Rise>
      </View>
      <Between from={T_MINE + 60} to={T_THEIRS} style={{ position: "absolute", left: 0, right: 0, top: s * 0.88, alignItems: "center" }}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ ...PFM.monoSemi, fontSize: s * 0.03, letterSpacing: 1.2, color: L.ind }}>
          {t("id2.door.waiting")}
        </Text>
      </Between>
    </View>
  );
}

/* ── 5 · This or That ───────────────────────────────────────────────── */

const PICK_TAP = 1500;
const PICK_OPEN = 1950;

function Pick({ s }: { s: number }) {
  const face = useLetterFamily();
  const pair = (PICKS[getLang() as DeckLang] ?? PICKS.en)[1];
  const name = sentence(t("ga.mira"));
  const lit = useOnce(200, PICK_TAP + 40);
  const open = useOnce(350, PICK_OPEN, E_OUT);
  const aSt = useAnimatedStyle(() => ({ opacity: 1 - 0.4 * open.value }));
  const bLit = useAnimatedStyle(() => ({ opacity: lit.value }));
  const tagSt = useAnimatedStyle(() => ({ opacity: open.value }));
  const hintSt = useAnimatedStyle(() => ({ opacity: 1 - open.value }));
  const verdictSt = useAnimatedStyle(() => ({ opacity: open.value, transform: [{ translateY: (1 - open.value) * 6 }] }));
  // the card (KPickCard): the head, the question, the two choices, the hint or the verdict
  const x = s * 0.07, y = s * 0.25, w = s * 0.86, pad = s * 0.045;
  const icon = s * 0.072, promptH = s * 0.15, chH = s * 0.17, gap = s * 0.028;
  const chY = pad + icon + s * 0.025 + promptH + s * 0.02;
  const chW = (w - 2 * pad - gap) / 2;
  const mono = { ...PFM.monoMed, fontSize: s * 0.027, letterSpacing: 1.2, color: L.mute } as const;
  const choice = (text: string, b: boolean) => (
    <Animated.View style={[{ width: chW, height: chH, borderRadius: s * 0.04, backgroundColor: L.soft, alignItems: "center", justifyContent: "center", paddingHorizontal: s * 0.025, overflow: "hidden" }, b ? null : aSt]}>
      {b && <Animated.View style={[{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: L.lav }, bLit]} />}
      <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} style={{ ...face, fontSize: s * 0.045, color: L.ink, textAlign: "center" }}>
        {text}
      </Text>
      {b && (
        <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: s * 0.01 }, tagSt]}>
          <Svg width={s * 0.034} height={s * 0.034} viewBox="0 0 24 24">
            <Path d={CHECK} fill="none" stroke={L.ind} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text numberOfLines={1} style={{ fontSize: s * 0.034, fontWeight: "600", color: L.ind }}>
            {t("sp.pick.both")}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
  return (
    <View style={{ width: s, height: s }}>
      <Caption s={s} id="nw105.pick" />
      <View style={{ position: "absolute", left: x, top: y, width: w }}>
        <Rise dy={s * 0.04}>
          <View style={{ height: chY + chH + s * 0.12 + pad, borderRadius: 18, backgroundColor: "#FFFFFF", padding: pad }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: s * 0.028, height: icon }}>
              <View style={{ width: icon, height: icon, borderRadius: s * 0.022, backgroundColor: L.lav, alignItems: "center", justifyContent: "center" }}>
                {/* the swap glyph: two arrows passing */}
                <Svg width={icon * 0.58} height={icon * 0.58} viewBox="0 0 24 24">
                  <Path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4" fill="none" stroke={L.ind} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
              <Text numberOfLines={1} style={[mono, { flexShrink: 1 }]}>
                {up(t("sp.pick.label"))}
              </Text>
              <View style={{ flex: 1 }} />
              <Text numberOfLines={1} style={[mono, { flexShrink: 1 }]}>
                {up(t("sp.pick.theyAsked", { name }))}
              </Text>
            </View>
            <View style={{ height: promptH, marginTop: s * 0.025, justifyContent: "center" }}>
              <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} style={{ ...face, fontSize: s * 0.058, lineHeight: s * 0.075, color: L.ink }}>
                {pair.q}
              </Text>
            </View>
            <View style={{ position: "absolute", left: pad, top: chY, flexDirection: "row", gap }}>
              {choice(pair.a, false)}
              {choice(pair.b, true)}
            </View>
            <View style={{ position: "absolute", left: pad, right: pad, top: chY + chH + s * 0.03 }}>
              <Animated.Text numberOfLines={2} style={[{ fontSize: s * 0.036, lineHeight: s * 0.048, color: L.mute }, hintSt]}>
                {t("sp.pick.hint")}
              </Animated.Text>
              <Animated.Text numberOfLines={1} style={[{ position: "absolute", left: 0, top: 0, fontSize: s * 0.044, fontWeight: "600", color: L.ind }, verdictSt]}>
                {t("sp.pick.same.1")}
              </Animated.Text>
            </View>
          </View>
        </Rise>
      </View>
      <Finger x={x + pad + chW + gap + chW * 0.55} y={y + chY + chH * 0.55} at={PICK_TAP} size={s * 0.15} />
    </View>
  );
}

/* ── 6 · sky postcards ──────────────────────────────────────────────── */

/* THE SKY (KSkyScene's, drawn here in react-native-svg): the sender's sky word only — dawn pink
   to peach with a pale sun on a hazy horizon, day blue with a sun and three clouds, dusk violet to
   orange with a big sun half under the edge, night navy with sixteen stars and a crescent moon —
   and Wren crossing every sky at (.30, .40), turned −8°. The colours are the sky's in every theme. */
const SKY: Readonly<Record<Sky, { stops: readonly string[]; ink: string; bird: string; birdAlpha: number }>> = {
  dawn: { stops: ["#F7B9C8", "#FFDDB8"], ink: BRAND.inkOnBrand, bird: "#1E1B35", birdAlpha: 0.55 },
  day: { stops: ["#86C3F2", "#D3ECFC"], ink: BRAND.inkOnBrand, bird: "#1E1B35", birdAlpha: 0.55 },
  dusk: { stops: ["#6D58C6", "#C774A8", "#F59A55"], ink: BRAND.paperWhite, bird: "#2A1E3D", birdAlpha: 0.7 },
  night: { stops: ["#0E1838", "#24325F"], ink: BRAND.paperWhite, bird: "#FFFFFF", birdAlpha: 0.85 },
};

/* the night's stars, from a fixed seed so a card keeps its sky */
function starsOf(seed: number): { x: number; y: number; r: number; a: number }[] {
  let h = seed >>> 0;
  const next = () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let z = h;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: 16 }, () => ({ x: 0.04 + 0.92 * next(), y: 0.05 + 0.65 * next(), r: 0.6 + 0.5 * next(), a: 0.55 + 0.45 * next() }));
}
const STARS = starsOf(105);

/* Wren in flight as a silhouette (KWrenFlightShape): two swept wings and a tail, in a box twice
   as wide as tall centred on (cx, cy); the body and the head are ellipses beside it */
function flightPath(cx: number, cy: number, bw: number): string {
  const bh = bw / 2, x0 = cx - bw / 2, y0 = cy - bh / 2;
  const p = (x: number, y: number) => `${x0 + x * bw} ${y0 + y * bh}`;
  return (
    `M${p(0.47, 0.62)}C${p(0.34, 0.4)} ${p(0.16, 0.16)} ${p(0, 0.12)}C${p(0.2, 0.36)} ${p(0.3, 0.66)} ${p(0.42, 0.78)}Z` +
    `M${p(0.52, 0.6)}C${p(0.66, 0.3)} ${p(0.84, 0.06)} ${p(1, 0)}C${p(0.86, 0.28)} ${p(0.72, 0.58)} ${p(0.6, 0.76)}Z` +
    `M${p(0.4, 0.76)}L${p(0.26, 0.98)}L${p(0.44, 0.86)}Z`
  );
}

function SkyArt({ sky, w, h, bird }: { sky: Sky; w: number; h: number; bird: number }) {
  const look = SKY[sky];
  const bx = 0.3 * w, by = 0.4 * h, bh = bird / 2;
  const u = Math.min(w, h);
  const moonR = 0.1 * h;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id="air" x1="0" y1="0" x2="0" y2={h} gradientUnits="userSpaceOnUse">
          {look.stops.map((c, i) => (
            <Stop key={i} offset={i / (look.stops.length - 1)} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill="url(#air)" />
      {sky === "dawn" && (
        <>
          <Circle cx={0.7 * w} cy={0.86 * h} r={0.11 * h} fill="#FFF4E2" opacity={0.9} />
          <Rect x={0} y={0.86 * h} width={w} height={0.14 * h} fill="#FFDDB8" opacity={0.7} />
          <Rect x={0} y={0.86 * h - 1} width={w} height={2} fill="#FFFFFF" opacity={0.25} />
        </>
      )}
      {sky === "day" && (
        <>
          <Circle cx={0.86 * w} cy={0.17 * h} r={0.075 * h} fill="#FFF3C4" />
          {([[0.22, 0.3], [0.62, 0.2], [0.8, 0.48]] as const).map(([x, y], i) => (
            <G key={i} opacity={0.9}>
              <Circle cx={x * w - 0.09 * u} cy={y * h + 0.02 * u} r={0.07 * u} fill="#FFFFFF" />
              <Circle cx={x * w} cy={y * h - 0.02 * u} r={0.095 * u} fill="#FFFFFF" />
              <Circle cx={x * w + 0.09 * u} cy={y * h + 0.025 * u} r={0.065 * u} fill="#FFFFFF" />
            </G>
          ))}
        </>
      )}
      {sky === "dusk" && <Circle cx={0.66 * w} cy={h} r={0.13 * h} fill="#FFD27A" />}
      {sky === "night" && (
        <>
          {STARS.map((st, i) => (
            <Circle key={i} cx={st.x * w} cy={st.y * h} r={Math.max(0.5, st.r * (w / 240))} fill="#FFFFFF" opacity={st.a} />
          ))}
          {/* the crescent: the moon, then its bite painted in the sky's own gradient */}
          <Circle cx={0.8 * w} cy={0.24 * h} r={moonR} fill="#F3EFD9" />
          <Circle cx={0.8 * w + 0.64 * moonR} cy={0.24 * h - 0.28 * moonR} r={0.92 * moonR} fill="url(#air)" />
        </>
      )}
      <G opacity={look.birdAlpha} transform={`rotate(-8 ${bx} ${by})`}>
        <Path d={flightPath(bx, by, bird)} fill={look.bird} />
        <Ellipse cx={bx - bird / 2 + 0.51 * bird} cy={by - bh / 2 + 0.73 * bh} rx={0.15 * bird} ry={0.15 * bh} fill={look.bird} />
        <Ellipse cx={bx - bird / 2 + 0.67 * bird} cy={by - bh / 2 + 0.62 * bh} rx={0.07 * bird} ry={0.1 * bh} fill={look.bird} />
      </G>
    </Svg>
  );
}

/* a postcard (KWavePostcard): the sky, its name top left and the line at the foot in its own ink */
function Postcard({ sky, w, h, label, line, lineSize, bird }: { sky: Sky; w: number; h: number; label: string; line: string; lineSize: number; bird: number }) {
  const face = useLetterFamily();
  const ink = SKY[sky].ink;
  const pad = w * 0.045;
  return (
    <View style={{ width: w, height: h, borderRadius: 18, overflow: "hidden" }}>
      <SkyArt sky={sky} w={w} h={h} bird={bird} />
      <Text numberOfLines={1} style={{ position: "absolute", left: pad, top: pad, ...PFM.monoMed, fontSize: Math.max(8, lineSize * 0.62), letterSpacing: 1.3, color: ink, opacity: 0.85 }}>
        {label}
      </Text>
      <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={{ position: "absolute", left: pad, right: pad, bottom: pad, ...face, fontSize: lineSize, lineHeight: lineSize * 1.3, color: ink }}>
        {line}
      </Text>
    </View>
  );
}

const WAVE_TAP = 1650;
const PAIR_AT = 2050;

function SkyScene({ s }: { s: number }) {
  const lines = WAVE_LINES[getLang() as DeckLang] ?? WAVE_LINES.en;
  const name = sentence(t("ga.mira"));
  const out = useOnce(300, WAVE_TAP + 250, E_IN);
  const single = useAnimatedStyle(() => ({ opacity: 1 - out.value, transform: [{ scale: 1 - 0.04 * out.value }] }));
  const x = s * 0.07, y = s * 0.26;
  const w1 = s * 0.72, h1 = (w1 * 2) / 3;
  const capH = s * 0.1, capY = y + h1 + s * 0.03;
  const gap = s * 0.03, w2 = (s * 0.86 - gap) / 2, h2 = w2 * 1.25;
  const whose = { ...PFM.monoMed, fontSize: s * 0.025, letterSpacing: 1.2, color: L.mute } as const;
  return (
    <View style={{ width: s, height: s }}>
      <Caption s={s} id="nw105.sky" />

      {/* her wave: one postcard, and Wave Back under it */}
      <Animated.View style={[{ position: "absolute", left: x, top: y }, single]}>
        <Rise dy={s * 0.04}>
          <Postcard sky="dusk" w={w1} h={h1} label={up(t("sp.sky.dusk"))} line={lines.dusk[0]} lineSize={s * 0.045} bird={s * 0.09} />
        </Rise>
        <View style={{ marginTop: s * 0.03, alignSelf: "flex-start" }}>
          <Rise delay={350} dy={s * 0.02}>
            <View style={{ height: capH, borderRadius: capH / 2, backgroundColor: L.lav, paddingHorizontal: s * 0.05, alignItems: "center", justifyContent: "center" }}>
              <Text numberOfLines={1} style={{ fontSize: s * 0.04, fontWeight: "600", color: L.ind }}>
                {t("sp.wave.back")}
              </Text>
            </View>
          </Rise>
        </View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: s, height: s }, single]}>
        <Finger x={x + s * 0.12} y={capY + capH / 2} at={WAVE_TAP} size={s * 0.15} />
      </Animated.View>

      {/* waved back: the pair, yours first — your night beside her dusk */}
      <View style={{ position: "absolute", left: x, top: y, flexDirection: "row", gap }}>
        {(
          [
            { sky: "night", whose: t("sp.wave.yourSky"), line: lines.night[0], at: PAIR_AT },
            { sky: "dusk", whose: t("sp.wave.theirSky", { name }), line: lines.dusk[0], at: PAIR_AT + 150 },
          ] as const
        ).map((c) => (
          <Between key={c.sky} from={c.at}>
            <Postcard sky={c.sky} w={w2} h={h2} label={up(t(`sp.sky.${c.sky}`))} line={c.line} lineSize={s * 0.036} bird={s * 0.065} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[whose, { width: w2, marginTop: s * 0.018 }]}>
              {up(c.whose)}
            </Text>
          </Between>
        ))}
      </View>
    </View>
  );
}

/* ── 7 · the font ───────────────────────────────────────────────────── */

/* Settings' font tiles (KFontPicker: four faces go two by two), the specimen in each face and its
   name; the letter above is set in the face last tapped: Newsreader → Garamond → SF Mono */
const FONT_RUN: readonly { key: LetterFontKey; at: number }[] = (
  [
    { key: "newsreader", at: 0 },
    { key: "garamond", at: 1300 },
    { key: "sfmono", at: 2500 },
  ] as const
).filter((r) => LETTER_FONT_CHOICES.includes(r.key));

function Font({ s }: { s: number }) {
  const tiles = fontTiles(LETTER_FONT_CHOICES, t);
  const x = s * 0.07, w = s * 0.86;
  const cardY = s * 0.25, cardH = s * 0.2;
  const boxY = s * 0.5, pad = s * 0.04, gap = s * 0.025;
  const tw = (w - 2 * pad - gap) / 2, th = s * 0.11;
  const tilesY = boxY + pad + s * 0.12;
  const tileAt = (i: number) => ({ x: x + pad + (i % 2) * (tw + gap), y: tilesY + Math.floor(i / 2) * (th + gap) });
  const runOf = (key: string) => FONT_RUN.findIndex((r) => r.key === key);
  const line = t("nw105.font.line");
  const taps = FONT_RUN.slice(1).map((r) => {
    const p = tileAt(tiles.findIndex((f) => f.key === r.key));
    return { x: p.x + tw * 0.55, y: p.y + th * 0.55, at: r.at };
  });
  return (
    <View style={{ width: s, height: s }}>
      <Caption s={s} id="nw105.font" />

      {/* a letter, in the face the reader picks */}
      <View style={{ position: "absolute", left: x, top: cardY, width: w, height: cardH }}>
        <Rise dy={s * 0.03}>
          <View style={{ width: w, height: cardH, borderRadius: s * 0.045, backgroundColor: "#FFFFFF", paddingHorizontal: s * 0.05, justifyContent: "center" }}>
            {FONT_RUN.map((r, i) => {
              const size = letterFitSize(r.key, s * 0.052);
              const next = FONT_RUN[i + 1];
              return (
                <Between key={r.key} from={r.at} to={next?.at} style={{ position: "absolute", left: s * 0.05, right: s * 0.05 }}>
                  <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} style={{ ...letterFamily(r.key), fontSize: size, lineHeight: size * 1.3, color: L.ink }}>
                    {line}
                  </Text>
                </Between>
              );
            })}
          </View>
        </Rise>
      </View>

      {/* Settings: Font, what it's for, the four tiles */}
      <View style={{ position: "absolute", left: x, top: boxY, width: w }}>
        <Rise delay={150} dy={s * 0.03}>
          <View style={{ height: s * 0.12 + 2 * th + gap + 2 * pad, borderRadius: s * 0.04, backgroundColor: "#FFFFFF", padding: pad }}>
            <Text numberOfLines={1} style={{ fontSize: s * 0.042, color: L.ink }}>
              {t("set.letterFont")}
            </Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ marginTop: s * 0.008, fontSize: s * 0.032, color: L.mute }}>
              {t("set.letterFont.sub")}
            </Text>
          </View>
        </Rise>
      </View>
      {tiles.map((f, i) => {
        const p = tileAt(i);
        const run = runOf(f.key);
        const next = run >= 0 ? FONT_RUN[run + 1] : undefined;
        return (
          <View key={f.key} style={{ position: "absolute", left: p.x, top: p.y, width: tw, height: th }}>
            <Rise delay={250 + i * 60} dy={s * 0.02}>
              <View style={{ width: tw, height: th, borderRadius: 12, borderWidth: 1, borderColor: L.line, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", gap: s * 0.006 }}>
                <Text style={{ ...letterFamily(f.key as LetterFontKey), fontSize: s * 0.058, color: L.ink }}>{f.sample}</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontSize: s * 0.03, fontWeight: "500", color: L.sub }}>
                  {f.name}
                </Text>
              </View>
              {/* the selected look: a 2pt ind border in a 3pt lav halo */}
              {run >= 0 && (
                <Between from={FONT_RUN[run].at} to={next?.at} style={{ position: "absolute", left: -3, top: -3, width: tw + 6, height: th + 6, borderRadius: 15, borderWidth: 3, borderColor: L.lav }}>
                  <View style={{ flex: 1, borderRadius: 12, borderWidth: 2, borderColor: L.ind }} />
                </Between>
              )}
            </Rise>
          </View>
        );
      })}

      <Taps taps={taps} size={s * 0.13} />
    </View>
  );
}

export const reel: Reel = {
  bg: P.penWash,
  scenes: [
    { key: "press", ms: 4800, render: (s) => <Press s={s} /> },
    { key: "papers", ms: 4300, render: (s) => <Papers s={s} /> },
    { key: "names", ms: 3800, render: (s) => <Names s={s} /> },
    { key: "trade", ms: 6600, render: (s) => <Trade s={s} /> },
    { key: "pick", ms: 4400, render: (s) => <Pick s={s} /> },
    { key: "sky", ms: 4400, render: (s) => <SkyScene s={s} /> },
    { key: "font", ms: 4000, render: (s) => <Font s={s} /> },
  ],
};
