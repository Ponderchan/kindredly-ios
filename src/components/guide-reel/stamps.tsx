import { useEffect, useId, useState } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, ReduceMotion, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { BigType, Finger, Pop, Rise, useLoop, useOnce, useStep, type Reel } from "./kit";
import { GUIDE_REEL_WIDTHS, Stamp, snapStampWidth } from "../Stamp";
import { StampGlyph } from "../ComposeTray";
import { EnvelopeArt } from "../EnvelopeArt";
import { STAMPS, STAMP_CATEGORIES, getStamp, sname } from "../../data/stamps";
import { OPENING_MIN } from "../../lib/weighted-count";
import { PHOTO_STAMP, STAMP_FALLBACK_HEX, STAMP_V3_INK, photoStampEdge, stampHeight } from "../../lib/stamp-frame";
import { DEFAULT_CATEGORY, filtersFor, type PressFilter } from "../../lib/stamp-press-core";
import { P, PFM } from "../../theme/post";
import { BRAND } from "../../theme/themes";
import { TOPIC_TAG_INK, TOPIC_TAG_NEUTRAL } from "../10a/kit";
import { t } from "../../lib/i18n";
import "../../data/strings-stamps2"; // the press's own words (cs2.cam.*, cs2.ed.*)
import "../../data/strings-reel-guides";

/* THE MOOD STAMPS GUIDE, AS A REEL. Six scenes, each the real part at
   full size: the send key filling to twenty and turning into PICK A MOOD
   STAMP; the album's first stamps — read off the letter — fanning out and
   one picked; all thirty-six riffling in; the picked one landing on the
   envelope, the key now LET IT TRAVEL; Stamp Press, a moment photographed
   and pressed into a stamp of its own, named and given a filter; the
   title. The ground is the stamp tray's own pale lavender.

   THE STAMPS ARE THE REAL ONES (stamps v3, 2026-10-19): <Stamp/>, 5:6,
   at the three widths a guide reel may use — 30×36, 40×48 or 60×72 —
   whichever is nearest the size the scene asks for at this square's size
   (snapStampWidth over GUIDE_REEL_WIDTHS), and laid out by that real
   width and height. The reel is a light picture in every theme, so the
   names under them are the light themes' nameLight, and the stamps are flat: these are
   stamps in an album, not stamps that came in the post. */

const RM = ReduceMotion.System;
const BG = "#F3F2FA"; // the stamp tray's ground (ComposeTray)
const CHOSEN = "made-my-day";
// three the album would lead with for a small-win letter (stamp-suggest's
// small_win row), the picked one in the middle
const SUGGESTED = ["tiny-win", CHOSEN, "growing"];

/* ── 1 · the key fills to twenty and asks for a stamp ── */
const LINES = [0.94, 0.8, 0.58]; // the written lines, as a share of the field's width
const LINE_SUM = LINES.reduce((a, b) => a + b, 0);
const LINE_FROM = LINES.map((_, i) => LINES.slice(0, i).reduce((a, b) => a + b, 0) / LINE_SUM);

function InkLine({ v, from, len, w, h }: { v: SharedValue<number>; from: number; len: number; w: number; h: number }) {
  const st = useAnimatedStyle(() => ({ width: w * Math.min(1, Math.max(0, (v.value / OPENING_MIN - from) / len)) }));
  return <Animated.View style={[{ height: h, borderRadius: h / 2, backgroundColor: P.ink }, st]} />;
}

function Count({ s }: { s: number }) {
  const v = useStep(OPENING_MIN, 65, 300); // the count, 0 → 20
  const [n, setN] = useState(0);
  useAnimatedReaction(
    () => Math.floor(v.value),
    (k, prev) => {
      if (k !== prev) runOnJS(setN)(k);
    },
  );
  const ready = n >= OPENING_MIN;
  const lit = useSharedValue(0);
  useEffect(() => {
    if (ready) lit.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic), reduceMotion: RM });
  }, [ready, lit]);
  const TAP = 2450;
  const press = useSharedValue(0);
  useEffect(() => {
    press.value = withDelay(TAP, withSequence(withTiming(1, { duration: 120, reduceMotion: RM }), withTiming(0, { duration: 220, reduceMotion: RM })));
  }, [press]);
  const nudge = useLoop(520, 1900);

  // the card: a piece of the writing screen, its bottom bar at full size
  const L = s * 0.07, T = s * 0.14, W = s * 0.86, H = s * 0.74;
  const pd = s * 0.055, kh = s * 0.15, g = s * 0.025;
  const keyL = pd + kh + g;
  const keyW = W - 2 * pd - kh - g;
  const fx = L + keyL + keyW * 0.55;
  const fy = T + H - pd - kh * 0.5;
  const fieldW = W - 2 * pd;
  const corner = s * 0.14;
  const lineH = Math.max(3, s * 0.017);

  const wash = useAnimatedStyle(() => ({ width: `${(v.value / OPENING_MIN) * 100}%` }));
  const filling = useAnimatedStyle(() => ({ opacity: 1 - lit.value }));
  const pen = useAnimatedStyle(() => ({ opacity: lit.value }));
  const key = useAnimatedStyle(() => ({ transform: [{ scale: (1 + 0.06 * Math.sin(lit.value * Math.PI)) * (1 - 0.04 * press.value) }] }));
  const chev = useAnimatedStyle(() => ({ transform: [{ translateX: -s * 0.014 * nudge.value }] }));
  const labelSize = s * 0.04;
  const bw = Math.max(1.5, s * 0.0047);

  return (
    <View style={{ width: s, height: s }}>
      <View style={{ position: "absolute", left: L, top: T, width: W, height: H, backgroundColor: "#FFFFFF", borderRadius: s * 0.04, borderWidth: 1, borderColor: P.ink12, overflow: "hidden" }}>
        {/* the corner where the stamp goes, still empty */}
        <View style={{ position: "absolute", right: pd, top: pd * 0.8, width: corner, height: corner, borderWidth: bw, borderStyle: "dashed", borderColor: P.pen, borderRadius: s * 0.014, backgroundColor: P.penWash, transform: [{ rotate: "8deg" }] }} />
        {/* the letter, being written */}
        <View style={{ position: "absolute", left: pd, top: pd + corner + s * 0.035, gap: s * 0.04 }}>
          {LINES.map((w, i) => (
            <InkLine key={i} v={v} from={LINE_FROM[i]} len={w / LINE_SUM} w={fieldW * w} h={lineH} />
          ))}
        </View>
        {/* the bar: the stamp key, and the send key */}
        <View style={{ position: "absolute", left: pd, right: pd, bottom: pd, height: kh, flexDirection: "row", alignItems: "center", gap: g }}>
          <View style={{ width: kh, height: kh, borderRadius: kh / 2, borderWidth: bw, borderColor: P.ink, alignItems: "center", justifyContent: "center" }}>
            <StampGlyph size={kh * 0.59} />
          </View>
          <Animated.View style={[{ width: keyW, height: kh }, key]}>
            {/* filling: a wash rising from the left, the count beside the label */}
            <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: keyW, height: kh, borderWidth: 1, borderColor: P.ink12, overflow: "hidden", justifyContent: "center" }, filling]}>
              <Animated.View style={[{ position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: P.penWash }, wash]} />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: s * 0.022, paddingHorizontal: s * 0.03 }}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ flexShrink: 1, ...PFM.monoSemi, fontSize: labelSize, letterSpacing: 1.2, color: P.ink40 }}>
                  {t("cp.travel")}
                </Text>
                <Text style={{ ...PFM.monoSemi, fontSize: labelSize * 0.9, color: P.ink60 }}>
                  {Math.min(n, OPENING_MIN)}/{OPENING_MIN}
                </Text>
              </View>
            </Animated.View>
            {/* clear: solid pen blue, asking for the stamp, the chevron leaning toward the stamp key */}
            <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: keyW, height: kh, backgroundColor: P.pen, justifyContent: "center" }, pen]}>
              <Animated.View style={[{ position: "absolute", left: s * 0.025 }, chev]}>
                <Svg width={s * 0.045} height={s * 0.045} viewBox="0 0 24 24" fill="none">
                  <Path d="M15 5 L8 12 L15 19" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Animated.View>
              {/* two lines allowed: it "SCEGLI UN FRANCOBOLLO DELL'UMORE" is
                  32 characters, and the key here is half a phone wide */}
              <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6} style={{ marginLeft: s * 0.06, marginRight: s * 0.025, textAlign: "center", ...PFM.monoSemi, fontSize: labelSize, letterSpacing: 1.2, color: "#FFFFFF" }}>
                {t("cp.needStamp")}
              </Text>
            </Animated.View>
          </Animated.View>
        </View>
      </View>
      <Finger x={fx} y={fy} at={TAP} size={s * 0.15} />
    </View>
  );
}

/* ── 2 · the album leads with stamps read off the letter; one is picked ── */
const PICK_AT = 1950;

function FanStamp({ id, i, s, w, cy, fan, pick }: { id: string; i: number; s: number; w: number; cy: number; fan: SharedValue<number>; pick: SharedValue<number> }) {
  const chosen = id === CHOSEN;
  const side = i - 1; // -1, 0, 1
  const dx = side * s * 0.3;
  const dy = Math.abs(side) * s * 0.035;
  const rot = side * 9;
  const rise = s * 0.2;
  const st = useAnimatedStyle(() => {
    const f = fan.value;
    return {
      opacity: Math.min(1, Math.max(0, f * 2.2)) * (chosen ? 1 : 1 - 0.6 * pick.value),
      transform: [{ translateX: dx * f }, { translateY: dy * f + (1 - Math.min(1, f)) * rise }, { rotate: `${rot * f}deg` }, { scale: (0.7 + 0.3 * f) * (chosen ? 1 + 0.1 * pick.value : 1) }],
    };
  });
  const ring = useAnimatedStyle(() => ({ opacity: pick.value }));
  const name = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, (fan.value - 0.55) / 0.45)) }));
  const stamp = getStamp(id);
  const pad = w * 0.07;
  const box = w * 1.15;
  const h = stampHeight(w);
  return (
    <Animated.View style={[{ position: "absolute", left: s / 2 - box / 2, top: cy - h / 2 - pad, width: box, alignItems: "center", zIndex: chosen ? 2 : 1 }, st]}>
      <View style={{ padding: pad }}>
        {chosen && <Animated.View style={[{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, borderWidth: Math.max(2, w * 0.035), borderColor: P.pen, borderRadius: w * 0.13 }, ring]} />}
        <Stamp id={id} width={w} dark={false} />
      </View>
      {/* two lines: de "Hat meinen Tag gerettet" won't fit one at this size */}
      <Animated.Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6} style={[{ width: box, marginTop: s * 0.006, textAlign: "center", ...PFM.monoSemi, fontSize: s * 0.032, letterSpacing: 0.4, color: stamp?.nameLight ?? P.ink }, name]}>
        {sname(stamp?.name).toUpperCase()}
      </Animated.Text>
    </Animated.View>
  );
}

function Suggest({ s }: { s: number }) {
  const fan = useOnce(720, 250, Easing.out(Easing.back(1.3)));
  const pick = useOnce(260, PICK_AT);
  const w = snapStampWidth(s * 0.25, GUIDE_REEL_WIDTHS);
  const cy = s * 0.5;
  return (
    <View style={{ width: s, height: s }}>
      <View style={{ position: "absolute", left: 0, right: 0, top: s * 0.15, alignItems: "center" }}>
        <Rise delay={100} dy={s * 0.04}>
          <Text style={{ ...PFM.monoSemi, fontSize: s * 0.038, letterSpacing: 1.8, color: P.ink60 }}>{t("cp.forThisLetter")}</Text>
        </Rise>
      </View>
      {SUGGESTED.map((id, i) => (
        <FanStamp key={id} id={id} i={i} s={s} w={w} cy={cy} fan={fan} pick={pick} />
      ))}
      <Finger x={s * 0.5 + w * 0.14} y={cy + w * 0.12} at={PICK_AT} size={s * 0.15} />
    </View>
  );
}

/* ── 3 · all thirty-six riffle in, then a wave runs through them ── */
function GridTile({ id, r, c, x, y, tile, s }: { id: string; r: number; c: number; x: number; y: number; tile: number; s: number }) {
  const inn = useOnce(380, 120 + (r + c) * 55, Easing.out(Easing.back(1.6)));
  const wave = useOnce(540, 1900 + (r + c) * 40, Easing.inOut(Easing.quad));
  const tilt = (((r * 7 + c * 5) % 5) - 2) * 7;
  const st = useAnimatedStyle(() => ({
    opacity: Math.min(1, inn.value * 1.6),
    transform: [{ translateY: -(1 - inn.value) * s * 0.08 - Math.sin(wave.value * Math.PI) * tile * 0.18 }, { rotate: `${tilt * (1 - inn.value)}deg` }, { scale: 0.5 + 0.5 * inn.value }],
  }));
  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y }, st]}>
      <Stamp id={id} width={tile} dark={false} />
    </Animated.View>
  );
}

function All({ s }: { s: number }) {
  const G = s * 0.76;
  const cell = G / 6;
  // the reel width nearest 0.82 of a cell whose 1.2× height still leaves the rows apart
  const tile = snapStampWidth(cell * 0.82, GUIDE_REEL_WIDTHS, (cell * 0.92) / 1.2);
  const tileH = stampHeight(tile);
  const top = s * 0.16;
  const left = (s - G) / 2;
  const badge = s * 0.3;
  const ids = STAMPS.slice(0, 36).map((x) => x.id);
  return (
    <View style={{ width: s, height: s }}>
      {ids.map((id, k) => {
        const r = Math.floor(k / 6);
        const c = k % 6;
        return <GridTile key={id} id={id} r={r} c={c} x={left + c * cell + (cell - tile) / 2} y={top + r * cell + (cell - tileH) / 2} tile={tile} s={s} />;
      })}
      {/* how many there are */}
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: top + G / 2 - badge / 2, alignItems: "center" }}>
        <Pop delay={1350}>
          <View style={{ width: badge, height: badge, borderRadius: badge / 2, backgroundColor: P.pen, borderWidth: Math.max(3, s * 0.014), borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: s * 0.13, fontWeight: "800", letterSpacing: -1, color: "#FFFFFF" }}>{ids.length}</Text>
          </View>
        </Pop>
      </View>
    </View>
  );
}

/* ── 4 · the picked stamp lands on the envelope; the key can let it go ── */
function Land({ s }: { s: number }) {
  const ew = s * 0.74;
  const eh = ew * 0.72;
  const ex = (s - ew) / 2;
  const ey = s * 0.15;
  const sw = snapStampWidth(ew * 0.22, GUIDE_REEL_WIDTHS);
  const sh = stampHeight(sw);
  const LAND = 930;
  const drop = useOnce(480, LAND - 480, Easing.in(Easing.quad));
  const thud = useOnce(320, LAND, Easing.out(Easing.quad));
  const env = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.035 * Math.sin(thud.value * Math.PI) }] }));
  /* from large and tilted, kept below the story bars: started bigger or
     higher, its corner swung over the top edge of the square */
  const stampSt = useAnimatedStyle(() => ({
    opacity: Math.min(1, drop.value * 3),
    transform: [{ translateX: -(1 - drop.value) * s * 0.16 }, { translateY: -(1 - drop.value) * s * 0.02 }, { rotate: `${-22 + 30 * drop.value}deg` }, { scale: 1.9 - 0.9 * drop.value }],
  }));
  const ring = useAnimatedStyle(() => ({ opacity: thud.value > 0 && thud.value < 1 ? 0.55 * (1 - thud.value) : 0, transform: [{ scale: 1 + 0.7 * thud.value }] }));
  const stamp = getStamp(CHOSEN);
  const kh = s * 0.14;
  const rowTop = ey + eh + s * 0.06;
  const bw = Math.max(1.5, s * 0.0047);
  // inside the paper's top-right corner (EnvelopeArt's paper ends at 200 of
  // its 212 wide), so the 8° tilt doesn't hang off the edge
  const sx = ex + (ew * 200) / 212 - sw - ew * 0.06;
  const sy = ey + ew * 0.075;
  return (
    <View style={{ width: s, height: s }}>
      <Animated.View style={[{ position: "absolute", left: ex, top: ey }, env]}>
        <Rise dy={s * 0.04}>
          <EnvelopeArt w={ew} sealed={false} />
        </Rise>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: sx - sw * 0.15, top: sy - sw * 0.15, width: sw * 1.3, height: sh + sw * 0.3, borderRadius: sw * 0.2, borderWidth: Math.max(2, s * 0.008), borderColor: P.pen }, ring]} />
      <Animated.View style={[{ position: "absolute", left: sx, top: sy }, stampSt]}>
        <Stamp id={CHOSEN} width={sw} dark={false} />
      </Animated.View>
      {/* the bar after: the stamp's own pill (the App Store tag: its colour solid, ink words and
          border, stamps v3), and the key in solid ink */}
      <View style={{ position: "absolute", left: ex, top: rowTop, width: ew }}>
        <Rise delay={1300} dy={s * 0.04}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: s * 0.025, height: kh }}>
            <View style={{ height: kh, maxWidth: ew * 0.46, borderRadius: kh / 2, borderWidth: bw, borderColor: TOPIC_TAG_INK, backgroundColor: stamp?.color ?? TOPIC_TAG_NEUTRAL, paddingHorizontal: s * 0.03, alignItems: "center", justifyContent: "center" }}>
              {/* two lines allowed: de/it names run to 23 characters and the
                  pill here is narrower than the real one (148pt) */}
              <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6} style={{ textAlign: "center", ...PFM.monoMed, fontSize: s * 0.036, color: TOPIC_TAG_INK }}>
                #{sname(stamp?.name).toLowerCase()}
              </Text>
            </View>
            <View style={{ flex: 1, height: kh, backgroundColor: P.ink, alignItems: "center", justifyContent: "center", paddingHorizontal: s * 0.025 }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} style={{ ...PFM.monoSemi, fontSize: s * 0.038, letterSpacing: 1.2, color: "#FFFFFF" }}>
                {t("cp.travel")}
              </Text>
            </View>
          </View>
        </Rise>
      </View>
    </View>
  );
}

/* ── 5 · Stamp Press: a moment pressed into a stamp of its own ──
   The camera as KStampPressCamera draws it (Kit/KLab.swift): the live
   picture fills the screen, one stamp-shaped hole in a dim over it, a white
   line along the cut, four lime corner marks, the lime shutter. The press:
   a white flash in the cut, the picture freezes as the un-bitten rounded
   rect and the bites punch through it one after another, clockwise from
   the top left; then the camera goes and the stamp settles on the edit
   page at −5° (KStampEditScreen, Profile/KFaceStrip.swift), where the
   #topic is named — dashed while empty, solid in its colour once named —
   and a filter is picked from the row a Free reader sees: Original, Vivid
   and Warm, and First Class's three with the gold 1ST.

   THE STAMP IS THE PHOTO STAMP'S OWN CUT (lib/stamp-frame PHOTO_STAMP:
   3:4, corners r7, the sixteen bites), drawn as Stamp's PhotoStamp draws a
   "c:" stamp — the picture clipped to PHOTO_STAMP.d, a faint ink hairline
   along the cut at a small size, a soft shadow at a large one. Only the
   picture is the reel's: it has no camera, so it presses the scene the
   press itself presses when there is no lens (KPressRender.devScene, the
   Simulator's stand-in): a sky from blue to peach, the sun, a green hill.
   It is drawn in the cut's own units (PHOTO_STAMP.paper: x11 y8, 78 × 104
   on the 100 × 120 box), so the live view and the stamp are one drawing
   seen through two windows. */
const PAPER = PHOTO_STAMP.paper;
const pX = (f: number) => PAPER.x + f * PAPER.width;
const pY = (f: number) => PAPER.y + f * PAPER.height;
const SKY = ["#9EC9F5", "#F6D9C6"] as const;
const SUN = { color: "#FBBF3E", x: pX(0.71), y: pY(0.18) + 0.13 * PAPER.width, r: 0.13 * PAPER.width };
const HILL = "#4CA86E";
// the hill runs on flat past both edges of the cut, so the live view around it is the same picture
const HILL_D = `M${pX(-1)} ${pY(0.78)} L${pX(0)} ${pY(0.78)} Q${pX(0.45)} ${pY(0.52)} ${pX(1)} ${pY(0.72)} L${pX(2)} ${pY(0.72)} L${pX(2)} ${pY(2)} L${pX(-1)} ${pY(2)} Z`;
const DIM = "rgba(20,18,42,0.58)"; // the camera's dim round the hole

/* THE FILTERS, ON FOUR FLAT COLOURS. KPressFilter.apply is Core Image on a
   photo; this picture is four colours, so each look is its white balance,
   exposure, lift and saturation (KFaceStrip's table) applied to those four
   in sRGB — near enough to tell the six apart at this size. Bright, warm,
   hopeful: nothing here darkens the picture or greys it. */
type Look = { gain: readonly [number, number, number]; ev: number; lift: number; sat: number };
const LOOKS: Record<PressFilter, Look> = {
  original: { gain: [1, 1, 1], ev: 1, lift: 0, sat: 1 },
  vivid: { gain: [1, 1, 1], ev: 1.03, lift: 0.04, sat: 1.3 },
  warm: { gain: [1.07, 1, 0.9], ev: 1.1, lift: 0.03, sat: 1.12 },
  golden: { gain: [1.12, 1.03, 0.82], ev: 1.04, lift: 0, sat: 1.18 },
  film: { gain: [1.06, 1.03, 0.92], ev: 1.07, lift: 0.07, sat: 0.9 },
  airy: { gain: [0.98, 1, 1.03], ev: 1.22, lift: 0.05, sat: 0.94 },
  gilt: { gain: [1.14, 1.06, 0.78], ev: 1.13, lift: 0, sat: 1.18 },
};

function looked(hex: string, l: Look): string {
  const c = [1, 3, 5].map((i, n) => (parseInt(hex.slice(i, i + 2), 16) / 255) * l.gain[n] * l.ev);
  const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return (
    "#" +
    c
      .map((v) => l.lift + (1 - l.lift) * Math.min(1, Math.max(0, y + (v - y) * l.sat)))
      .map((v) => Math.round(v * 255).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** the sky's gradient, in user space (RN-SVG paints a bounding-box one as a hard edge) */
function SkyGradient({ gid, look }: { gid: string; look: Look }) {
  return (
    <Defs>
      <LinearGradient id={gid} gradientUnits="userSpaceOnUse" x1={0} y1={pY(0)} x2={0} y2={pY(1)}>
        <Stop offset={0} stopColor={looked(SKY[0], look)} />
        <Stop offset={1} stopColor={looked(SKY[1], look)} />
      </LinearGradient>
    </Defs>
  );
}

/** the picture itself, in the cut's units; the sky reaches well past the cut for the live view */
function Picture({ gid, look }: { gid: string; look: Look }) {
  return (
    <>
      <Rect x={pX(-1)} y={pY(-1)} width={PAPER.width * 3} height={PAPER.height * 3} fill={`url(#${gid})`} />
      <Circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill={looked(SUN.color, look)} />
      <Path d={HILL_D} fill={looked(HILL, look)} />
    </>
  );
}

/** the photo stamp `w` wide (the cut's own width: placement "paper"), its edge by its box's width as photoStampEdge
    says; `lifted` false leaves out the large size's shadow, for a look laid over the same stamp */
function PressStamp({ w, look, lifted = true }: { w: number; look: PressFilter; lifted?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const h = w / PHOTO_STAMP.aspect;
  const box = (w * 100) / PAPER.width; // the 100-wide box the cut sits in
  const edge = photoStampEdge(box, false);
  const shadow =
    edge === "none" && lifted
      ? { shadowColor: "#000", shadowOpacity: PHOTO_STAMP.shadowOpacity.light, shadowRadius: w * PHOTO_STAMP.shadowRadiusK, shadowOffset: { width: 0, height: w * PHOTO_STAMP.shadowYK } }
      : null;
  return (
    <View pointerEvents="none" style={[{ width: w, height: h }, shadow]}>
      <Svg width={w} height={h} viewBox={`${PAPER.x} ${PAPER.y} ${PAPER.width} ${PAPER.height}`}>
        <SkyGradient gid={`sky${uid}`} look={LOOKS[look]} />
        <Defs>
          <ClipPath id={`cut${uid}`}>
            <Path d={PHOTO_STAMP.d} />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#cut${uid})`}>
          <Picture gid={`sky${uid}`} look={LOOKS[look]} />
          {edge === "hairline" && <Path d={PHOTO_STAMP.d} fill="none" stroke={STAMP_V3_INK} strokeOpacity={PHOTO_STAMP.hairlineOpacity} strokeWidth={(PHOTO_STAMP.hairlinePt * 2 * 100) / box} strokeLinejoin="round" />}
        </G>
      </Svg>
    </View>
  );
}

/** one bite punching through the frozen picture: the dim showing through, from nothing to its full half-circle */
function Bite({ x, y, r, at }: { x: number; y: number; r: number; at: number }) {
  const v = useOnce(120, at);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: v.value }] }));
  return <Animated.View style={[{ position: "absolute", left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: r, backgroundColor: DIM }, st]} />;
}

/** a lime L inside one of the cut's corners */
function CornerMark({ x, y, l, right, bottom }: { x: number; y: number; l: number; right: boolean; bottom: boolean }) {
  const d = `M${right ? 0 : l} ${bottom ? l : 0} L${right ? l : 0} ${bottom ? l : 0} L${right ? l : 0} ${bottom ? 0 : l}`;
  return (
    <Svg width={l + 2} height={l + 2} viewBox={`-1 -1 ${l + 2} ${l + 2}`} style={{ position: "absolute", left: x - 1, top: y - 1 }}>
      <Path d={d} fill="none" stroke={BRAND.lime} strokeWidth={2} strokeLinecap="square" />
    </Svg>
  );
}

const E_SLIDE = Easing.inOut(Easing.cubic);
const E_SETTLE = Easing.out(Easing.back(1.4));
const PRESS_AT = 1100; // the shutter
const PUNCH_AT = PRESS_AT + 150; // the frozen picture's bites begin
const PUNCH_MS = 350; // all sixteen, the last landing here (KPhotoStamp.punchDuration)
const LIFT_AT = 1800; // the camera goes and the stamp slides to the edit page
const NAMED_AT = 2900; // the #topic is named
const FILTER_AT = 3700; // a filter is picked
const PICKED_FILTER: PressFilter = "warm";
const ROW = filtersFor("free"); // the row a Free reader sees: Gilt hidden, First Class's three locked (1ST)
const TOPIC_HEX = STAMP_CATEGORIES.find((c) => c.id === DEFAULT_CATEGORY)?.color ?? STAMP_FALLBACK_HEX; // small things, the press's default colour

function Press({ s }: { s: number }) {
  // the camera's screen, and the cut on it
  const CL = s * 0.07, CT = s * 0.1, CW = s * 0.86, CH = s * 0.86;
  const W = s * 0.44;
  const H = W / PHOTO_STAMP.aspect;
  const cx = CL + (CW - W) / 2;
  const cy = CT + s * 0.035;
  const k = PAPER.width / W; // the cut's units per point
  const viewBox = `${PAPER.x - (cx - CL) * k} ${PAPER.y - (cy - CT) * k} ${CW * k} ${CH * k}`;
  const dimD = `M${PAPER.x - (cx - CL) * k} ${PAPER.y - (cy - CT) * k} h${CW * k} v${CH * k} h${-CW * k} Z ${PHOTO_STAMP.d}`;
  const corner = PHOTO_STAMP.corner / k;
  const shutter = s * 0.115;
  const shutterY = s * 0.86;
  const mark = W * 0.09;
  const markIn = W * 0.06;
  // the edit page: the stamp settles smaller and turned, the tag under it, the filter row at the foot
  const SETTLED = 0.68;
  const dy = s * 0.3 - (cy + H / 2);
  const tagH = s * 0.08;
  const rowTop = s * 0.665;
  const slot = CW / ROW.length;
  const tw = s * 0.095;
  const th = tw / PHOTO_STAMP.aspect;
  const pad = s * 0.009;
  const pickedAt = ROW.findIndex((f) => f.id === PICKED_FILTER);

  const flash = useOnce(260, PRESS_AT);
  const frozen = useOnce(60, PRESS_AT + 80);
  const camera = useOnce(300, LIFT_AT);
  const slide = useOnce(560, LIFT_AT + 160, E_SLIDE);
  const tagIn = useOnce(380, LIFT_AT + 520);
  const named = useOnce(300, NAMED_AT, E_SETTLE);
  const rowIn = useOnce(420, LIFT_AT + 700);
  const pick = useOnce(320, FILTER_AT + 60);

  const flashSt = useAnimatedStyle(() => ({ opacity: flash.value > 0 && flash.value < 1 ? 0.9 * (1 - flash.value) : 0 }));
  const frozenSt = useAnimatedStyle(() => ({ opacity: frozen.value }));
  const marksSt = useAnimatedStyle(() => ({ opacity: 1 - frozen.value }));
  const cameraSt = useAnimatedStyle(() => ({ opacity: 1 - camera.value }));
  const stampSt = useAnimatedStyle(() => ({ transform: [{ translateY: dy * slide.value }, { scale: 1 - (1 - SETTLED) * slide.value }, { rotate: `${-5 * slide.value}deg` }] }));
  const pickedSt = useAnimatedStyle(() => ({ opacity: pick.value }));
  const tagSt = useAnimatedStyle(() => ({ opacity: tagIn.value, transform: [{ translateY: (1 - tagIn.value) * s * 0.03 }] }));
  const emptySt = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, named.value) }));
  const namedSt = useAnimatedStyle(() => ({ opacity: Math.min(1, named.value * 2), transform: [{ scale: 0.85 + 0.15 * named.value }] }));
  const rowSt = useAnimatedStyle(() => ({ opacity: rowIn.value, transform: [{ translateY: (1 - rowIn.value) * s * 0.04 }] }));
  const firstRing = useAnimatedStyle(() => ({ opacity: 1 - pick.value }));
  const pickedRing = useAnimatedStyle(() => ({ opacity: pick.value }));

  const ring = { position: "absolute" as const, left: 0, top: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: P.pen, borderRadius: s * 0.02 };
  const tagLabel = { ...PFM.monoSemi, fontSize: s * 0.036 };
  return (
    <View style={{ width: s, height: s }}>
      {/* ── the edit page, under the camera ── */}
      <Animated.View style={[{ position: "absolute", left: cx, top: cy, width: W, height: H }, stampSt]}>
        <PressStamp w={W} look="original" />
        <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, pickedSt]}>
          <PressStamp w={W} look={PICKED_FILTER} lifted={false} />
        </Animated.View>
      </Animated.View>

      {/* the #topic: dashed and the placeholder while empty, solid in its colour once named */}
      <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: s * 0.545, height: tagH + 3, alignItems: "center", justifyContent: "center" }, tagSt]}>
        <Animated.View style={[{ position: "absolute", height: tagH, paddingHorizontal: s * 0.035, borderRadius: tagH * 0.375, borderWidth: 1.5, borderStyle: "dashed", borderColor: P.ink40, justifyContent: "center" }, emptySt]}>
          <Text numberOfLines={1} style={[tagLabel, { color: P.ink40 }]}>
            {t("cs2.ed.topicPh")}
          </Text>
        </Animated.View>
        <Animated.View style={[{ position: "absolute" }, namedSt]}>
          <View style={{ position: "absolute", left: 3, top: 3, right: -3, bottom: -3, borderRadius: tagH * 0.375, backgroundColor: TOPIC_TAG_INK }} />
          <View style={{ height: tagH, paddingHorizontal: s * 0.035, borderRadius: tagH * 0.375, borderWidth: 2, borderColor: TOPIC_TAG_INK, backgroundColor: TOPIC_HEX, justifyContent: "center" }}>
            <Text numberOfLines={1} style={[tagLabel, { color: TOPIC_TAG_INK }]}>
              #{t("gd.stamps.pressTopic")}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* the filter row: each tile the stamp in that look; the gold 1ST on what Free can't keep */}
      <Animated.View style={[{ position: "absolute", left: CL, width: CW, top: rowTop, flexDirection: "row" }, rowSt]}>
        {ROW.map((f, i) => (
          <View key={f.id} style={{ width: slot, alignItems: "center" }}>
            <View style={{ padding: pad }}>
              {i === 0 && <Animated.View style={[ring, firstRing]} />}
              {i === pickedAt && <Animated.View style={[ring, pickedRing]} />}
              <PressStamp w={tw} look={f.id} />
              {f.locked && (
                <View style={{ position: "absolute", right: -s * 0.012, top: -s * 0.012, width: s * 0.046, height: s * 0.032, borderRadius: s * 0.007, borderWidth: 1.5, borderColor: TOPIC_TAG_INK, backgroundColor: BRAND.waxGold, alignItems: "center", justifyContent: "center", transform: [{ rotate: "6deg" }] }}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ ...PFM.monoSemi, fontSize: s * 0.019, color: TOPIC_TAG_INK }}>
                    {t("cs2.ed.fcBadge")}
                  </Text>
                </View>
              )}
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ maxWidth: slot - 2, marginTop: s * 0.006, ...PFM.monoMed, fontSize: s * 0.028, color: P.ink60 }}>
              {t(`cs2.ed.f.${f.id}`)}
            </Text>
          </View>
        ))}
      </Animated.View>
      <Finger x={CL + slot * (pickedAt + 0.5)} y={rowTop + pad + th / 2} at={FILTER_AT} size={s * 0.15} />

      {/* ── the camera, over all of it until the stamp is pressed ── */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: s, height: s }, cameraSt]}>
        <View style={{ position: "absolute", left: CL, top: CT, width: CW, height: CH, borderRadius: s * 0.06, overflow: "hidden" }}>
          <Svg width={CW} height={CH} viewBox={viewBox}>
            <SkyGradient gid="live" look={LOOKS.original} />
            <Picture gid="live" look={LOOKS.original} />
            <Path d={dimD} fill={DIM} fillRule="evenodd" />
            <Path d={PHOTO_STAMP.d} fill="none" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={k} />
          </Svg>
          <View style={{ position: "absolute", left: 0, right: 0, top: cy - CT + H + s * 0.016, alignItems: "center" }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ maxWidth: CW - s * 0.08, ...PFM.monoSemi, fontSize: s * 0.032, letterSpacing: 1.2, color: "#FFFFFF" }}>
              {t("cs2.cam.hint")}
            </Text>
          </View>
        </View>
        <View pointerEvents="none" style={{ position: "absolute", left: CL, top: CT, width: CW, height: CH, borderRadius: s * 0.06, borderWidth: 2, borderColor: STAMP_V3_INK }} />

        {/* the corner marks: what's in here is the stamp */}
        <Animated.View style={[{ position: "absolute", left: cx, top: cy, width: W, height: H }, marksSt]}>
          {[0, 1, 2, 3].map((n) => {
            const right = n % 2 === 1;
            const bottom = n >= 2;
            return <CornerMark key={n} l={mark} right={right} bottom={bottom} x={right ? W - markIn - mark : markIn} y={bottom ? H - markIn - mark : markIn} />;
          })}
        </Animated.View>

        {/* the press: the picture frozen as the un-bitten rect, the bites punching through it */}
        <Animated.View style={[{ position: "absolute", left: cx, top: cy, width: W, height: H, borderRadius: corner, overflow: "hidden" }, frozenSt]}>
          <Svg width={W} height={H} viewBox={`${PAPER.x} ${PAPER.y} ${PAPER.width} ${PAPER.height}`}>
            <SkyGradient gid="frozen" look={LOOKS.original} />
            <Picture gid="frozen" look={LOOKS.original} />
          </Svg>
          {PHOTO_STAMP.bites.map(([bx, by], n) => (
            <Bite key={n} x={bx / k} y={by / k} r={PHOTO_STAMP.bite / k} at={PUNCH_AT + (n * (PUNCH_MS - 120)) / (PHOTO_STAMP.bites.length - 1)} />
          ))}
        </Animated.View>
        <Animated.View style={[{ position: "absolute", left: cx, top: cy, width: W, height: H, borderRadius: corner, backgroundColor: "#FFFFFF" }, flashSt]} />

        {/* the lime shutter, its hard shadow behind it */}
        <View style={{ position: "absolute", left: s / 2 - shutter / 2, top: shutterY - shutter / 2, width: shutter, height: shutter }}>
          <View style={{ position: "absolute", left: 3, top: 3, width: shutter, height: shutter, borderRadius: shutter / 2, backgroundColor: "rgba(0,0,0,0.5)" }} />
          <View style={{ width: shutter, height: shutter, borderRadius: shutter / 2, backgroundColor: BRAND.lime, borderWidth: 2.5, borderColor: STAMP_V3_INK, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: (shutter * 60) / 76, height: (shutter * 60) / 76, borderRadius: (shutter * 30) / 76, borderWidth: 1.5, borderColor: STAMP_V3_INK }} />
          </View>
        </View>
        <Finger x={s / 2} y={shutterY} at={PRESS_AT} size={s * 0.15} />
      </Animated.View>
    </View>
  );
}

/* ── 6 · the title, very large ── */
/* BigType sets every title at one size; a single long word (de
   "Stimmungsmarken") would then break mid-word, so a title whose longest
   word wouldn't fit the line is set the same way, a size down */
function FitWord({ text, delay, color }: { text: string; delay: number; color: string }) {
  const v = useOnce(380, delay);
  const st = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.Text style={[{ color }, st]}>{text}</Animated.Text>;
}

function Title({ s }: { s: number }) {
  const title = t("gd.stamps.title");
  const words = title.includes(" ") ? title.split(" ") : [title];
  const accent = words.length > 1 ? [words.length - 1] : [];
  const longest = Math.max(...words.map((w) => w.length));
  const fit = /[぀-ヿ㐀-鿿가-힯]/.test(title) ? 1 : Math.min(1, 11.5 / longest);
  const sw = snapStampWidth(s * 0.2, GUIDE_REEL_WIDTHS);
  return (
    <View style={{ width: s, height: s }}>
      {fit >= 1 ? (
        <BigType s={s} words={words} accent={accent} />
      ) : (
        <View style={{ width: s, height: s, justifyContent: "center", paddingHorizontal: s * 0.09 }}>
          <Text style={{ fontSize: s * 0.11 * fit, lineHeight: s * 0.13 * fit, fontWeight: "700", letterSpacing: -0.5 }}>
            {words.map((w, i) => (
              <FitWord key={i} text={w + (i < words.length - 1 ? " " : "")} delay={120 + i * 170} color={accent.includes(i) ? P.pen : P.ink} />
            ))}
          </Text>
        </View>
      )}
      <View style={{ position: "absolute", right: s * 0.09, bottom: s * 0.08, transform: [{ rotate: "8deg" }] }}>
        <Pop delay={650}>
          <Stamp id={CHOSEN} width={sw} dark={false} />
        </Pop>
      </View>
    </View>
  );
}

export const reel: Reel = {
  bg: BG,
  scenes: [
    { key: "count", ms: 3300, render: (s) => <Count s={s} /> },
    { key: "suggest", ms: 3200, render: (s) => <Suggest s={s} /> },
    { key: "all", ms: 3000, render: (s) => <All s={s} /> },
    { key: "land", ms: 3200, render: (s) => <Land s={s} /> },
    { key: "press", ms: 5200, render: (s) => <Press s={s} /> },
    { key: "title", ms: 2600, render: (s) => <Title s={s} /> },
  ],
};
