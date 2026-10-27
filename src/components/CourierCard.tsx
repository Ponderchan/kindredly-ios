import { useEffect, useMemo, useRef, useState } from "react";
import type { HungerRead } from "../lib/hunger";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import Reanimated, { Easing as REasing, cancelAnimation, useAnimatedProps, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useIsFocused } from "expo-router";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Polygon, Rect, Stop } from "react-native-svg";
import { t, useLang } from "../lib/i18n";
import { PF, PFM, letterFamily, letterFitSize, type LetterFontKey } from "../theme/post";
import { useLetterFont } from "../lib/theme";
import { WrenBird, type WrenStage } from "./WrenBird";
import type { WhereaboutsRead } from "../lib/whereabouts";
import { WHEREABOUTS_META } from "../lib/whereabouts";
import { W14, cardShadow } from "./AuraCard";
import { ARC_AT as AT, BAND_H, GLOBE, PALETTE, SCENE_H, daylight, onArc, type Palette } from "./courier-card-model";
import { agoLabel, flightLog, type LogEntry } from "../lib/flight-log";
import { useWhoBook } from "../lib/who";
import type { ThreadSummary } from "../lib/db";

/* THE SVG LOOPS RUN ON THE UI THREAD (stall probe, 2026-09-20). They were
   plain Animated with useNativeDriver:false — SVG props can't take the
   native driver — which meant four timers ticking the JS thread sixty
   times a second for as long as the card was mounted, on every tab. That
   is the tax every tap paid. Reanimated's animated props go to the
   native view directly, and the loops stop when the screen is not the
   one on show. */
const RPath = Reanimated.createAnimatedComponent(Path);
const RG = Reanimated.createAnimatedComponent(G);
const RCircle = Reanimated.createAnimatedComponent(Circle);
const REllipse = Reanimated.createAnimatedComponent(Ellipse);

/* THE COURIER'S CARD — the owner's V9 sheet (Me Region Variants, Round 2).
   ────────────────────────────────────────────────────────────────────────
   Not a bird standing in a box: a delivery. The whole route is drawn in a
   full-bleed scene — YOU on the left, SOMEWHERE on the right, a dashed arc
   over the world between them — and the bird sits on that arc wherever
   the letters actually are. The label is a chip inside the scene, so
   nothing floats outside the card. Below: her name, the day, the stage,
   what she is doing, and one button. No invented progress: the arc shows
   the state, not a percentage. */

/* one block (the owner's V10): the scene is the whole card, and the words
   sit on it — on a second layer, the palette's deep tone fading up from
   the bottom, so every hour has the night's two-layer feel and white
   words read on all of them. SCENE_H and BAND_H, the hour's four skies
   (PALETTE, daylight: morning is pale and low-lit, noon clear blue with a
   high sun, evening amber, night the V10 sheet), where on the arc she is
   per state (ARC_AT) and the arc itself (onArc) live in the pure
   courier-card-model, which the SwiftUI card on Me reads too; the palette
   is re-exported here for everyone who imports it from this file. */
export { PALETTE, daylight, type Daylight, type Palette } from "./courier-card-model";

/* THE PLANET — a real globe, not a horizon: a circle whose shoulders you
   can see, sky in both bottom corners, the route thrown over the top of
   it. Sea, continents that follow the curve, forests, one snowy range,
   two faint latitude lines and a thin atmosphere so it reads as a sphere;
   after dark a few lit towns. Flat shapes, no map: nobody can ask "where
   am I". */
export { GLOBE };
function Planet({ w, P }: { w: number; P: Palette }) {
  const R = w * GLOBE.r;
  const cx = w / 2;
  const cy = GLOBE.top + R;
  const trees = (x: number, y: number, n: number, r: number) =>
    Array.from({ length: n }, (_, i) => <Circle key={i} cx={x + (i - (n - 1) / 2) * r * 1.5} cy={y - (i % 2) * r * 0.6} r={r} fill={P.forest} />);
  return (
    <>
      <Defs>
        <ClipPath id="planet">
          <Circle cx={cx} cy={cy} r={R} />
        </ClipPath>
      </Defs>
      {/* atmosphere */}
      <Circle cx={cx} cy={cy} r={R + 5} fill="none" stroke="#FFFFFF" strokeWidth={4} opacity={0.35} />
      <Circle cx={cx} cy={cy} r={R} fill={P.sea} />
      <G clipPath="url(#planet)">
        {/* continents, drawn to lean with the curve */}
        <Path d={`M${cx - R * 1.05} ${cy - R * 0.55} C ${cx - R * 0.7} ${cy - R * 1.02}, ${cx - R * 0.15} ${cy - R * 0.98}, ${cx + R * 0.02} ${cy - R * 0.7} C ${cx + R * 0.1} ${cy - R * 0.45}, ${cx - R * 0.35} ${cy - R * 0.3}, ${cx - R * 0.6} ${cy - R * 0.38} C ${cx - R * 0.85} ${cy - R * 0.44}, ${cx - R * 1.02} ${cy - R * 0.3}, ${cx - R * 1.05} ${cy - R * 0.55} Z`} fill={P.land} />
        <Path d={`M${cx + R * 0.3} ${cy - R * 0.9} C ${cx + R * 0.6} ${cy - R * 0.98}, ${cx + R * 0.95} ${cy - R * 0.7}, ${cx + R * 1.02} ${cy - R * 0.4} C ${cx + R * 0.9} ${cy - R * 0.2}, ${cx + R * 0.55} ${cy - R * 0.3}, ${cx + R * 0.38} ${cy - R * 0.55} C ${cx + R * 0.28} ${cy - R * 0.7}, ${cx + R * 0.24} ${cy - R * 0.84}, ${cx + R * 0.3} ${cy - R * 0.9} Z`} fill={P.land} />
        <Path d={`M${cx - R * 0.2} ${cy - R * 0.1} C ${cx - R * 0.05} ${cy - R * 0.25}, ${cx + R * 0.2} ${cy - R * 0.2}, ${cx + R * 0.22} ${cy + R * 0.02} C ${cx + R * 0.1} ${cy + R * 0.12}, ${cx - R * 0.15} ${cy + R * 0.08}, ${cx - R * 0.2} ${cy - R * 0.1} Z`} fill={P.land} />
        {/* one snowy range on the big continent */}
        <Polygon points={`${cx - R * 0.4},${cy - R * 0.62} ${cx - R * 0.34},${cy - R * 0.76} ${cx - R * 0.28},${cy - R * 0.62}`} fill={P.rock} />
        <Polygon points={`${cx - R * 0.36},${cy - R * 0.713} ${cx - R * 0.34},${cy - R * 0.76} ${cx - R * 0.32},${cy - R * 0.713} ${cx - R * 0.33},${cy - R * 0.7} ${cx - R * 0.34},${cy - R * 0.715} ${cx - R * 0.35},${cy - R * 0.7}`} fill="#FFFFFF" opacity={0.9} />
        <Polygon points={`${cx - R * 0.3},${cy - R * 0.6} ${cx - R * 0.25},${cy - R * 0.71} ${cx - R * 0.2},${cy - R * 0.6}`} fill={P.rock} opacity={0.85} />
        {/* forests */}
        {trees(cx - R * 0.8, cy - R * 0.5, 4, 3.2)}
        {trees(cx - R * 0.08, cy - R * 0.66, 3, 3)}
        {trees(cx + R * 0.66, cy - R * 0.62, 4, 3.2)}
        {trees(cx + R * 0.02, cy - R * 0.06, 3, 2.8)}
        {/* waves on the open sea */}
        {[[-0.35, -0.15], [0.45, -0.1], [-0.05, 0.25], [0.8, -0.05]].map(([fx, fy], i) => (
          <Path key={i} d={`M${cx + R * fx - 7} ${cy + R * fy} q 3.5 -2.5 7 0 t 7 0`} fill="none" stroke="#FFFFFF" strokeWidth={1.2} opacity={0.5} />
        ))}
        {/* latitude — two faint lines that say "sphere" */}
        <Path d={`M${cx - R} ${cy - R * 0.35} Q ${cx} ${cy - R * 0.62} ${cx + R} ${cy - R * 0.35}`} fill="none" stroke="#FFFFFF" strokeWidth={1} opacity={0.22} />
        <Path d={`M${cx - R} ${cy + R * 0.05} Q ${cx} ${cy - R * 0.2} ${cx + R} ${cy + R * 0.05}`} fill="none" stroke="#FFFFFF" strokeWidth={1} opacity={0.22} />
        {/* towns, lit after dark */}
        {P.lit && [[-0.9, -0.6], [-0.5, -0.45], [0.55, -0.5], [0.85, -0.55], [0.1, -0.12]].map(([fx, fy], i) => <Circle key={i} cx={cx + R * fx} cy={cy + R * fy} r={1.4} fill="#FFD98A" />)}
      </G>
    </>
  );
}

/* HER DAY OFF — the course instead of the planet: a strip of ground at the
   band's edge, two pairs of pillars in the palette's own colours, and a
   dotted trail where she's been flapping */
function Course({ w, P }: { w: number; P: Palette }) {
  const ground = SCENE_H - BAND_H - 8;
  const ink = P.moon ? "#DAD6F2" : P.chip;
  const pair = (x: number, gc: number, key: string) => (
    <G key={key}>
      <Rect x={x} y={-4} width={26} height={gc - 26 + 4} rx={3} fill={P.scrim} stroke={ink} strokeWidth={2} />
      <Rect x={x - 4} y={gc - 34} width={34} height={9} rx={3} fill={P.scrim} stroke={ink} strokeWidth={2} />
      <Rect x={x} y={gc + 26} width={26} height={ground - gc - 26 + 2} rx={3} fill={P.scrim} stroke={ink} strokeWidth={2} />
      <Rect x={x - 4} y={gc + 26} width={34} height={9} rx={3} fill={P.scrim} stroke={ink} strokeWidth={2} />
    </G>
  );
  return (
    <>
      <Path d={`M${w * 0.02} ${ground - 6} Q ${w * 0.14} ${58} ${w * 0.25} ${96}`} fill="none" stroke={ink} strokeWidth={1.6} strokeDasharray="3 5" opacity={0.6} />
      {pair(w * 0.52, 94, "a")}
      {pair(w * 0.82, 72, "b")}
      <Rect x={0} y={ground} width={w} height={SCENE_H - ground} fill={P.land} />
      <Rect x={0} y={ground} width={w} height={2} fill={P.moon ? "#DAD6F2" : P.forest} />
    </>
  );
}

/* THE 10a FRAME (Me, step 5). On Me the card sits inside the 10a courier
   frame (2.5 ln, corners 24, a 5/5 hard shadow, clipped; H:75) — drawn by
   SwiftUI around this card as a React Native island (KCourierFrame), or by
   the fallback's own frame. `framed` gives the frame a card with no corners,
   shadow or white ground of its own (the doubled corner and shadow the
   critic saw), the 10a band type (her name system 600 14, the time mono 500
   10 at .7, the line 13/1.4 and the aside italic 12 at .75 in the reader's
   letter font,
   Open system 600 13 in the hour's own button colours, which read on their
   own sky in every app theme — not the mock's sf on #1F5B3C, dark on dark in
   Midnight), the ink label shape for YOUR COURIER (corners 6; its 12pt is
   the owner's), and type that stops growing at 1.3× so the fixed band never
   clips at the largest sizes. Without onPress it is a picture only: the
   frame owns the tap (in SwiftUI, a Button over the scene, cancelled by a
   scroll, which an RN Pressable inside a SwiftUI scroll view is not). */
const FRAMED_TYPE_MAX = 1.3;
/* Her line and its aside are Wren speaking: content, in the reader's letter
   font (the aside italic where the face has one). The band is a fixed height,
   so a roomier face (SF Mono, Garamond) steps down a size rather than being
   cut (letterFitSize). In the 10a frame: the line 13/1.4, the aside 12 at .75;
   without it: the line 13.5/18, the aside 11.5 at .6. */
const BAND_LINE_10A = (color: string, key: LetterFontKey) => {
  const size = letterFitSize(key, 13);
  return { ...letterFamily(key), fontSize: size, lineHeight: Math.round(size * 14) / 10, color };
};
const BAND_ASIDE_10A = (color: string, key: LetterFontKey) => ({ ...letterFamily(key, true), fontSize: letterFitSize(key, 12), color, opacity: 0.75 });
const BAND_LINE = (color: string, key: LetterFontKey) => {
  const size = letterFitSize(key, 13.5);
  return { ...letterFamily(key), fontSize: size, lineHeight: Math.round((size * 18) / 13.5), color };
};
const BAND_ASIDE = (color: string, key: LetterFontKey) => ({ ...letterFamily(key), fontSize: letterFitSize(key, 11.5), color, opacity: 0.6 });

export function CourierCard({
  wren,
  where,
  threads,
  lastWrittenAt,
  seenToday,
  stage,
  accessory,
  onPress,
  hour,
  entry: entryProp,
  hunger = null,
  dayOff = false,
  best = 0,
  onPlay,
  framed = false,
  width,
}: {
  wren: string;
  where: WhereaboutsRead;
  threads: ThreadSummary[];
  lastWrittenAt: string | null;
  seenToday: number;
  stage: WrenStage;
  accessory?: Parameters<typeof WrenBird>[0]["accessory"];
  /** the card's tap; absent in the 10a frame, which owns the tap */
  onPress?: () => void;
  /** the hour to paint — defaults to the phone's clock; previews pass one */
  hour?: number;
  /** a fixed log entry — previews, and Me (whose model reads the same entry for VoiceOver) */
  entry?: LogEntry;
  /** when she is hungry or someone is waiting on you, that is what she says (lib/hunger) */
  hunger?: HungerRead | null;
  /** her day off (lib/free-flight): she's doing laps, and the card opens the game */
  dayOff?: boolean;
  /** your best run, to invite a rematch */
  best?: number;
  onPlay?: () => void;
  /** inside the 10a frame (see above) */
  framed?: boolean;
  /** the card's width when the caller knows it (an island), so the first frame is drawn */
  width?: number;
}) {
  const [w, setW] = useState(width ?? 0);
  const fontMax = framed ? FRAMED_TYPE_MAX : undefined;
  const letterFont = useLetterFont();
  const lang = useLang(); // the diary is written in the reader's language — re-write it when that changes
  const light = daylight(hour);
  const P = PALETTE[light];
  const GREEN = { ink: P.ink };
  // a pen pal named as every screen names them (lib/who): the number, or the courier name once the switch is on
  const book = useWhoBook({ threads });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const entry = useMemo(() => entryProp ?? flightLog({ where, threads, lastWrittenAt, seenToday, daylight: light, book }), [entryProp, where, threads, lastWrittenAt, seenToday, light, lang, book]);

  /* ── motion, by state ──
     flying: she bobs and the route marches under her;
     home: she breathes, and hops now and then;
     waiting (unsent): she tilts her head — "give me one?";
     night: the stars blink; day: the cloud drifts; a lit window pulses
     when something is waiting on you. All loops, all cheap. */
  const bob = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const dash = useSharedValue(0);
  const twinkle = useSharedValue(0);
  const drift = useSharedValue(0);
  const pulse = useSharedValue(0);
  const playing = dayOff && !!onPlay;
  const flyingNow = playing || where.state === "exploring" || where.state === "delivery" || where.state === "bringing";
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) {
      // nothing moves on a screen nobody is looking at
      cancelAnimation(dash);
      cancelAnimation(pulse);
      cancelAnimation(twinkle);
      cancelAnimation(drift);
      return;
    }
    const sine = REasing.inOut(REasing.sin);
    if (flyingNow) dash.value = withRepeat(withTiming(1, { duration: 1400, easing: REasing.linear }), -1, false);
    else dash.value = 0;
    if (where.state === "bringing") pulse.value = withRepeat(withSequence(withTiming(1, { duration: 900, easing: sine }), withTiming(0, { duration: 900, easing: sine })), -1, false);
    else pulse.value = 0;
    // the weather runs from wherever it was — no snap back on a refocus
    if (P.stars) twinkle.value = withRepeat(withSequence(withTiming(1, { duration: 1100, easing: sine }), withTiming(0, { duration: 1100, easing: sine })), -1, false);
    if (P.cloud) drift.value = withRepeat(withSequence(withTiming(1, { duration: 9000, easing: sine }), withTiming(0, { duration: 9000, easing: sine })), -1, false);
  }, [focused, flyingNow, where.state, P.stars, P.cloud, dash, pulse, twinkle, drift]);
  const bringing = where.state === "bringing";
  const dashProps = useAnimatedProps(() => ({ strokeDashoffset: bringing ? dash.value * 9 : 9 - dash.value * 9 }));
  const starsA = useAnimatedProps(() => ({ opacity: 0.35 + 0.65 * twinkle.value }));
  const starsB = useAnimatedProps(() => ({ opacity: 1 - 0.65 * twinkle.value }));
  const cloudA = useAnimatedProps(() => ({ cx: w * 0.6 - 10 + 24 * drift.value }));
  const cloudB = useAnimatedProps(() => ({ cx: w * 0.6 + 12 - 10 + 24 * drift.value }));
  const pulseProps = useAnimatedProps(() => ({ opacity: 0.55 * pulse.value }));
  useEffect(() => {
    const loops: Animated.CompositeAnimation[] = [];
    const sine = Easing.inOut(Easing.sin);
    if (flyingNow) {
      loops.push(Animated.loop(Animated.sequence([Animated.timing(bob, { toValue: 1, duration: 1300, easing: sine, useNativeDriver: true, isInteraction: false }), Animated.timing(bob, { toValue: 0, duration: 1300, easing: sine, useNativeDriver: true, isInteraction: false })])));
    } else if (where.state === "unsent") {
      loops.push(Animated.loop(Animated.sequence([Animated.delay(1800), Animated.timing(tilt, { toValue: 1, duration: 420, easing: sine, useNativeDriver: true, isInteraction: false }), Animated.delay(900), Animated.timing(tilt, { toValue: 0, duration: 420, easing: sine, useNativeDriver: true, isInteraction: false })])));
    } else {
      loops.push(Animated.loop(Animated.sequence([Animated.timing(breathe, { toValue: 1, duration: 1600, easing: sine, useNativeDriver: true, isInteraction: false }), Animated.timing(breathe, { toValue: 0, duration: 1600, easing: sine, useNativeDriver: true, isInteraction: false })])));
      loops.push(Animated.loop(Animated.sequence([Animated.delay(4200), Animated.timing(hop, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }), Animated.timing(hop, { toValue: 0, duration: 220, easing: Easing.bounce, useNativeDriver: true, isInteraction: false })])));
    }
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [flyingNow, where.state, bob, breathe, hop, tilt]);
  const flying = where.state === "exploring" || where.state === "delivery" || where.state === "bringing";
  // the house and the window sit on the globe's shoulders; the route goes over the top
  const R = w * GLOBE.r;
  const cx = w / 2;
  const dx = w * GLOBE.shoulder;
  const x0 = cx - dx;
  const x1 = cx + dx;
  const ARC_Y = Math.round(GLOBE.top + R - Math.sqrt(Math.max(0, R * R - dx * dx)));
  const ARC_CY = 4;
  const p = onArc(AT[where.state], x0, x1, ARC_Y, ARC_CY);
  const birdSize = 50;

  return (
    <Pressable
      onPress={playing ? onPlay : onPress}
      disabled={framed && !onPress}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={({ pressed }) =>
        framed
          ? [{ width, backgroundColor: P.sky[1], overflow: "hidden", opacity: pressed ? 0.94 : 1 }]
          : [{ backgroundColor: W14.card, borderRadius: 20, overflow: "hidden", opacity: pressed ? 0.94 : 1 }, cardShadow]
      }
    >
      {/* the scene */}
      <View style={{ height: SCENE_H, backgroundColor: P.sky[1] }}>
        {w > 0 && (
          <Svg width={w} height={SCENE_H} style={{ position: "absolute", left: 0, top: 0 }}>
            <Defs>
              <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={P.sky[0]} />
                <Stop offset="1" stopColor={P.sky[1]} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={w} height={SCENE_H} fill="url(#sky)" />
            {P.stars && (
              <>
                <RG animatedProps={starsA}>
                  {[[0.12, 22], [0.47, 30], [0.75, 34], [0.55, 48]].map(([fx, y], i) => <Circle key={i} cx={w * fx} cy={y} r={i % 2 === 0 ? 1.6 : 1} fill="#FFFFFF" />)}
                </RG>
                <RG animatedProps={starsB}>
                  {[[0.3, 12], [0.62, 16], [0.93, 26], [0.2, 46]].map(([fx, y], i) => <Circle key={i} cx={w * fx} cy={y} r={i % 2 === 0 ? 1.2 : 1} fill="#FFFFFF" />)}
                </RG>
              </>
            )}
            {/* the sun or moon — between the pillars on her day off */}
            {P.sun && <Circle cx={playing ? w * 0.69 : w * P.sunAt[0]} cy={playing ? 26 : SCENE_H * P.sunAt[1]} r={daylight(hour) === "day" ? 13 : 11} fill={P.sun} />}
            {P.moon && (
              <>
                <Circle cx={playing ? w * 0.69 : w * P.sunAt[0]} cy={playing ? 26 : SCENE_H * P.sunAt[1]} r={11} fill="#FFF3D6" />
                <Circle cx={(playing ? w * 0.69 : w * P.sunAt[0]) + 6} cy={(playing ? 26 : SCENE_H * P.sunAt[1]) - 4} r={9.5} fill={P.sky[0]} />
              </>
            )}
            {P.cloud && (
              <>
                <REllipse animatedProps={cloudA} cy={30} rx={22} ry={8} fill={P.cloud} opacity={0.9} />
                <REllipse animatedProps={cloudB} cy={26} rx={13} ry={9} fill={P.cloud} opacity={0.9} />
              </>
            )}
            {playing ? <Course w={w} P={P} /> : <Planet w={w} P={P} />}
            {/* the route — only once a letter has left */}
            {!playing && where.state !== "unsent" && (
              <RPath
                d={`M${x0} ${ARC_Y} Q ${(x0 + x1) / 2} ${ARC_CY} ${x1} ${ARC_Y}`}
                fill="none"
                stroke={GREEN.ink}
                strokeWidth={1.6}
                strokeDasharray="4 5"
                opacity={0.7}
                animatedProps={dashProps}
              />
            )}
            {/* your window, their window */}
            {!playing && (<>
            <Rect x={x0 - 7} y={ARC_Y - 2} width={14} height={12} rx={2} fill={P.lit || where.state === "bringing" ? "#FFD98A" : "#FFFFFF"} stroke={GREEN.ink} strokeWidth={1.6} />
            {where.state === "bringing" && (
              <RCircle animatedProps={pulseProps} cx={x0} cy={ARC_Y + 4} r={13} fill="#FFD98A" />
            )}
            <Path d={`M${x0 - 9} ${ARC_Y - 2} L${x0} ${ARC_Y - 9} L${x0 + 9} ${ARC_Y - 2}`} fill="none" stroke={GREEN.ink} strokeWidth={1.6} strokeLinejoin="round" />
            <Rect x={x1 - 7} y={ARC_Y - 4} width={14} height={14} rx={2} fill={P.lit ? "#FFD98A" : "#FFFFFF"} stroke={GREEN.ink} strokeWidth={1.6} opacity={where.state === "unsent" ? 0.35 : 1} />
            <Path d={`M${x1} ${ARC_Y - 4} V${ARC_Y + 10} M${x1 - 7} ${ARC_Y + 3} H${x1 + 7}`} stroke={GREEN.ink} strokeWidth={1.2} opacity={where.state === "unsent" ? 0.35 : 1} />
            </>)}
          </Svg>
        )}
        {/* her day off: mid-flap before the first gap, the letter she needs on a key */}
        {w > 0 && playing && (
          <Animated.View
            style={{
              position: "absolute",
              left: w * 0.3 - 22,
              top: 98 - 22,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [5, -8] }) }, { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ["10deg", "-8deg"] }) }],
            }}
          >
            <WrenBird size={44} mood="happy" stage={stage} accessory={accessory} pose={stage === "wren" ? "fly" : "perch"} letter={false} />
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#1E1B35", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ ...PFM.monoSemi, fontSize: 12, color: "#1E1B35" }}>K</Text>
            </View>
          </Animated.View>
        )}
        {/* the bird, on the arc — or at home on the sill */}
        {w > 0 && !playing && (
          <Animated.View
            style={{
              position: "absolute",
              left: p.x - birdSize / 2,
              top: (flying ? p.y : ARC_Y - 6) - birdSize + 8,
              transform: [
                { scaleX: where.state === "bringing" ? -1 : 1 },
                { translateY: Animated.add(bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }), hop.interpolate({ inputRange: [0, 1], outputRange: [0, -7] })) },
                { scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) },
                { rotate: tilt.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-9deg"] }) },
              ],
            }}
          >
            <WrenBird size={birdSize} mood={hunger ? hunger.mood : WHEREABOUTS_META[where.state].mood} stage={stage} accessory={accessory} pose={flying ? "fly" : "perch"} wilt={!!hunger?.wilt} />
          </Animated.View>
        )}
        {/* the fly pose already carries a letter — the family art draws it */}
        {/* the chip, inside the scene */}
        {/* 12pt, not 9.5 — readers couldn't make it out (owner, 2026-09-23) */}
        <View style={{ position: "absolute", left: 12, top: 12, backgroundColor: P.chip, borderRadius: framed ? 6 : 999, paddingHorizontal: framed ? 9 : 12, paddingVertical: framed ? 5 : 6 }}>
          <Text maxFontSizeMultiplier={fontMax} style={{ ...PFM.monoSemi, fontSize: 12, letterSpacing: framed ? 1.68 : 1.5, color: P.chipText }}>{t("me.sec.courier").toLocaleUpperCase()}</Text>
        </View>
        {/* on her day off: a sticker beside the chip */}
        {playing && (
          <View style={{ position: "absolute", left: 12, top: 46, backgroundColor: "#C3E84F", borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4, transform: [{ rotate: "-4deg" }] }}>
            <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1.4, color: "#1E1B35" }}>{t("ff.dayoff.tag")}</Text>
          </View>
        )}
        {!playing && <Text style={{ position: "absolute", left: 0, width: x0 * 2, top: ARC_Y + 14, textAlign: "center", ...PFM.monoSemi, fontSize: 9, letterSpacing: 1.4, color: GREEN.ink }}>{t("me.route.you")}</Text>}
        {!playing && <Text style={{ position: "absolute", right: 0, width: (w - x1) * 2, top: ARC_Y + 14, textAlign: "center", ...PFM.monoSemi, fontSize: 9, letterSpacing: 1.4, color: GREEN.ink, opacity: where.state === "unsent" ? 0.4 : 1 }}>{t("me.route.somewhere")}</Text>}

        {/* the second tier: a solid panel with a hard edge (the owner's V10) —
            two layers you see at a glance, not a fade */}
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: BAND_H, backgroundColor: P.scrim }} />

        {/* on the scene: who, what she is doing, one button */}
        <View style={{ position: "absolute", left: 16, right: 16, bottom: 0, height: BAND_H, flexDirection: "row", alignItems: "center", gap: 12 }}>
          {/* her diary: name · when, the entry, the aside */}
          <View style={{ flex: 1, minWidth: 0, gap: framed ? 4 : 3 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: framed ? 6 : 8 }}>
              <Text maxFontSizeMultiplier={fontMax} style={framed ? { fontSize: 14, fontWeight: "600", color: P.text } : { fontFamily: PF.letter, fontWeight: "700", fontSize: 16, letterSpacing: -0.3, color: P.text }}>{wren}</Text>
              <Text maxFontSizeMultiplier={fontMax} style={framed ? { ...PFM.monoMed, fontSize: 10, letterSpacing: 1, color: P.text, opacity: 0.7 } : { ...PFM.monoSemi, fontSize: 9.5, letterSpacing: 1.4, color: P.text, opacity: 0.6 }}>{playing ? t("ff.dayoff.tag") : agoLabel(entry.at)}</Text>
            </View>
            {playing ? (
              <>
                <Text maxFontSizeMultiplier={fontMax} style={framed ? BAND_LINE_10A(P.text, letterFont) : BAND_LINE(P.text, letterFont)} numberOfLines={2}>{where.state === "delivery" ? t("ff.dayoff.lineCarrying") : t("ff.dayoff.line")}</Text>
                <Text maxFontSizeMultiplier={fontMax} style={framed ? BAND_ASIDE_10A(P.text, letterFont) : BAND_ASIDE(P.text, letterFont)} numberOfLines={1}>{best > 0 ? t("ff.dayoff.subBest", { n: best }) : t("ff.dayoff.sub")}</Text>
              </>
            ) : (
              <>
                <Text maxFontSizeMultiplier={fontMax} style={framed ? BAND_LINE_10A(P.text, letterFont) : BAND_LINE(P.text, letterFont)} numberOfLines={2}>{hunger ? hunger.line : entry.line}</Text>
                {!!(hunger ? hunger.sub : entry.sub) && <Text maxFontSizeMultiplier={fontMax} style={framed ? BAND_ASIDE_10A(P.text, letterFont) : BAND_ASIDE(P.text, letterFont)} numberOfLines={1}>{hunger ? hunger.sub : entry.sub}</Text>}
              </>
            )}
          </View>
          {playing ? (
            /* flat, as every control (owner's rule B, 2026-10-26): the lime, no ink edge */
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#C3E84F", borderRadius: framed ? 16 : 999, paddingHorizontal: 16, paddingVertical: 9 }}>
              <Text maxFontSizeMultiplier={fontMax} style={{ fontSize: 9, color: "#1E1B35" }}>▶</Text>
              <Text maxFontSizeMultiplier={fontMax} style={framed ? { fontSize: 13, fontWeight: "600", color: "#1E1B35" } : { fontFamily: PF.letter, fontWeight: "700", fontSize: 13, color: "#1E1B35" }}>{t("ff.play")}</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: P.button, borderRadius: framed ? 16 : 999, paddingHorizontal: 16, paddingVertical: framed ? 8 : 9 }}>
              <Text maxFontSizeMultiplier={fontMax} style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 13, color: P.buttonText }}>{t("me.open")}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
