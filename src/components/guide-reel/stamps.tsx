import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, ReduceMotion, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { BigType, Finger, Pop, Rise, useLoop, useOnce, useStep, type Reel } from "./kit";
import { GUIDE_REEL_WIDTHS, Stamp, snapStampWidth } from "../Stamp";
import { StampGlyph } from "../ComposeTray";
import { EnvelopeArt } from "../EnvelopeArt";
import { STAMPS, getStamp, sname } from "../../data/stamps";
import { OPENING_MIN } from "../../lib/weighted-count";
import { stampHeight } from "../../lib/stamp-frame";
import { P, PF } from "../../theme/post";
import { TOPIC_TAG_INK, TOPIC_TAG_NEUTRAL } from "../10a/kit";
import { t } from "../../lib/i18n";

/* THE MOOD STAMPS GUIDE, AS A REEL. Five scenes, each the real part at
   full size: the send key filling to twenty and turning into PICK A MOOD
   STAMP; the album's first stamps — read off the letter — fanning out and
   one picked; all thirty-six riffling in; the picked one landing on the
   envelope, the key now LET IT TRAVEL; the title. Stamps cut from your own
   photos are not built yet, so they are not in here. The ground is the
   stamp tray's own pale lavender.

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
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ flexShrink: 1, fontFamily: PF.monoSemi, fontSize: labelSize, letterSpacing: 1.2, color: P.ink40 }}>
                  {t("cp.travel")}
                </Text>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: labelSize * 0.9, color: P.ink60 }}>
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
              <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6} style={{ marginLeft: s * 0.06, marginRight: s * 0.025, textAlign: "center", fontFamily: PF.monoSemi, fontSize: labelSize, letterSpacing: 1.2, color: "#FFFFFF" }}>
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
      <Animated.Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6} style={[{ width: box, marginTop: s * 0.006, textAlign: "center", fontFamily: PF.monoSemi, fontSize: s * 0.032, letterSpacing: 0.4, color: stamp?.nameLight ?? P.ink }, name]}>
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
          <Text style={{ fontFamily: PF.monoSemi, fontSize: s * 0.038, letterSpacing: 1.8, color: P.ink60 }}>{t("cp.forThisLetter")}</Text>
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
              <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6} style={{ textAlign: "center", fontFamily: PF.monoMed, fontSize: s * 0.036, color: TOPIC_TAG_INK }}>
                #{sname(stamp?.name).toLowerCase()}
              </Text>
            </View>
            <View style={{ flex: 1, height: kh, backgroundColor: P.ink, alignItems: "center", justifyContent: "center", paddingHorizontal: s * 0.025 }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} style={{ fontFamily: PF.monoSemi, fontSize: s * 0.038, letterSpacing: 1.2, color: "#FFFFFF" }}>
                {t("cp.travel")}
              </Text>
            </View>
          </View>
        </Rise>
      </View>
    </View>
  );
}

/* ── 5 · the title, very large ── */
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
    { key: "title", ms: 2600, render: (s) => <Title s={s} /> },
  ],
};
