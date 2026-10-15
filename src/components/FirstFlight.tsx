/* FIRST FLIGHT — the seam between "let her go" and the first letter you read,
   as one shot. Your letter folds itself into an envelope; she picks it up and
   flies one loop of the route chart, past the stops she'll bring letters back
   from, leaving a trail; she lands with three envelopes. Three seconds, one
   tap skips it, reduced motion skips it. The route chart is the first record
   of the map to come — every crossing after this one lands on the same chart. */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { PF } from "../theme/post";
import { useP, useTheme } from "../lib/theme";
import { WrenBird, type WrenAccessory, type WrenMood, type WrenPose, type WrenSkin } from "./WrenBird";
import type { HatchlingForm } from "../lib/hatchling-form";
import type { PoolLetter } from "../lib/db";
import { t } from "../lib/i18n";

const W = 390, H = 844, TOTAL = 3.05;
/* the loop: your city → three stops → home, four cubic segments on the chart */
const SEGS: [number, number][][] = [
  [[78, 640], [60, 440], [140, 300], [210, 250]],
  [[210, 250], [280, 200], [330, 160], [318, 300]],
  [[318, 300], [306, 440], [250, 470], [300, 560]],
  [[300, 560], [350, 650], [190, 700], [78, 640]],
];
const STOPS: [number, number][] = [[210, 250], [318, 300], [300, 560]];
const bez = (p: [number, number][], u: number): [number, number] => {
  const v = 1 - u;
  return [
    v * v * v * p[0][0] + 3 * v * v * u * p[1][0] + 3 * v * u * u * p[2][0] + u * u * u * p[3][0],
    v * v * v * p[0][1] + 3 * v * v * u * p[1][1] + 3 * v * u * u * p[2][1] + u * u * u * p[3][1],
  ];
};
const pathD = SEGS.map((s, i) => (i === 0 ? `M${s[0][0]} ${s[0][1]} ` : "") + `C ${s[1][0]} ${s[1][1]}, ${s[2][0]} ${s[2][1]}, ${s[3][0]} ${s[3][1]}`).join(" ");
/* the flight window on the clock, in seconds */
const FLY0 = 0.8, FLY1 = 2.6;

export function FirstFlight({ her, opener, stops, form, mark, skin, accessory, onDone }: { her: string; opener: string; stops: PoolLetter[]; form?: HatchlingForm; mark?: string | null; skin?: WrenSkin; accessory?: WrenAccessory; onDone: () => void }) {
  /* THE CHART IS DRAWN IN THE PAGE'S OWN INKS. Its ground stays the
     accent's palest wash (useP's penWash, lav2), the ground onboarding ends
     on; the grid, the route and the stops are drawn in the outline
     colour (ln), and the letter and the envelopes are cards on it (sf, with
     an ln edge). The stops' yellow faces, the postmark-red marks and her
     colours are her own and stay put. */
  const P = useP();
  const tk = useTheme().t;
  const { width, height } = useWindowDimensions();
  const k = Math.min(width / W, height / H);
  const clock = useSharedValue(0);
  const done = useRef(false);
  const pose: WrenPose = "perch"; // no hatchling has a fly symbol — the chick herself flies, tilted
  const [mood, setMood] = useState<WrenMood>("curious");

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  /* the sampled loop and the moment she passes each point */
  const pts = useMemo(() => {
    const out: { x: number; y: number; at: number }[] = [];
    const n = 9;
    SEGS.forEach((s, si) => {
      for (let i = si === 0 ? 0 : 1; i < n; i++) {
        const [x, y] = bez(s, i / (n - 1));
        const frac = (si + i / (n - 1)) / SEGS.length;
        out.push({ x, y, at: FLY0 + frac * (FLY1 - FLY0) });
      }
    });
    return out;
  }, []);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      if (!alive) return;
      if (r) { finish(); return; }
      clock.value = withTiming(TOTAL, { duration: TOTAL * 1000, easing: Easing.linear }, (ok) => {
        if (ok) runOnJS(finish)();
      });
    });
    const tick = (ms: number, f: () => void) => setTimeout(() => alive && f(), ms);
    const timers = [
      tick(0, () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
      tick(300, () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
      tick(FLY0 * 1000, () => { setMood("content"); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }),
      ...STOPS.map((_, i) => tick((FLY0 + ((i + 1) / SEGS.length) * (FLY1 - FLY0)) * 1000, () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))),
      tick(FLY1 * 1000, () => { setMood("delight"); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft); }),
    ];
    return () => { alive = false; timers.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 1 · the letter folds in place, the envelope takes its place */
  const cardStyle = useAnimatedStyle(() => {
    const s = interpolate(clock.value, [0.05, 0.55], [1, 0.04], Extrapolation.CLAMP);
    return { transform: [{ translateY: -70 * (1 - s) }, { scaleY: s }], opacity: interpolate(clock.value, [0.5, 0.6], [1, 0], Extrapolation.CLAMP) };
  });
  /* the envelope appears where the letter folded, then rides under her */
  const envT = [0, FLY0 - 0.001, ...pts.map((p) => p.at), 2.85, TOTAL];
  const envX = [135, 135, ...pts.map((p) => p.x - 20), 90, 90];
  const envY = [330, 330, ...pts.map((p) => p.y + 22), 420, 420];
  const envStyle = useAnimatedStyle(() => ({
    opacity: interpolate(clock.value, [0.3, 0.55, 2.5, 2.65], [0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(clock.value, envT, envX, Extrapolation.CLAMP) },
      { translateY: interpolate(clock.value, envT, envY, Extrapolation.CLAMP) },
      { scale: interpolate(clock.value, [0.3, 0.6, FLY0, FLY0 + 0.25], [0.6, 1, 1, 0.5], Extrapolation.CLAMP) },
      { rotate: `${interpolate(clock.value, [FLY0, FLY0 + 0.25], [0, -12], Extrapolation.CLAMP)}deg` },
    ],
  }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: interpolate(clock.value, [0.6, 1.0], [1, 0.18], Extrapolation.CLAMP) }));
  const chartStyle = useAnimatedStyle(() => ({ opacity: interpolate(clock.value, [0.55, 0.9, 2.7, 3.0], [0, 1, 1, 0.35], Extrapolation.CLAMP) }));

  /* 2 · she follows the loop; 3 · she comes home to the middle, larger */
  const inT = [0, FLY0 - 0.001, ...pts.map((p) => p.at), 2.85, TOTAL];
  const xs = [240, 240, ...pts.map((p) => p.x), 150, 150];
  const ys = [232, 232, ...pts.map((p) => p.y), 380, 380];
  const birdStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(clock.value, inT, xs, Extrapolation.CLAMP) - 45 },
      { translateY: interpolate(clock.value, inT, ys, Extrapolation.CLAMP) - 45 },
      { scale: interpolate(clock.value, [0, FLY0, FLY0 + 0.3, FLY1, 2.9], [1, 1, 0.78, 0.78, 1.5], Extrapolation.CLAMP) },
      { rotate: `${interpolate(clock.value, [FLY0 - 0.05, FLY0 + 0.25, FLY1 - 0.25, FLY1], [0, -16, -16, 0], Extrapolation.CLAMP)}deg` },
    ],
  }));
  const trayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(clock.value, [2.55, 2.85], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(clock.value, [2.55, 2.9], [24, 0], Extrapolation.CLAMP) }],
  }));

  const words = (l?: PoolLetter) => (l?.body || "").split(/\s+/).slice(0, 4).join(" ");
  const stampOf = (l?: PoolLetter) => (l?.stamp ? "#" + String(l.stamp).replace(/-/g, " ") : "");

  return (
    <Pressable onPress={finish} style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: P.penWash, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: W, height: H, transform: [{ scale: k }] }}>
        {/* the chart */}
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: W, height: H }, chartStyle]} pointerEvents="none">
          <Svg width={W} height={H}>
            {Array.from({ length: 16 }, (_, i) => <Line key={"v" + i} x1={i * 26} y1={0} x2={i * 26} y2={H} stroke={tk.ln} strokeOpacity={0.06} />)}
            {Array.from({ length: 33 }, (_, i) => <Line key={"h" + i} x1={0} y1={i * 26} x2={W} y2={i * 26} stroke={tk.ln} strokeOpacity={0.06} />)}
            {[180, 330, 480, 630].map((y) => <Path key={y} d={`M0 ${y} Q195 ${y - 26} 390 ${y}`} fill="none" stroke={tk.ln} strokeOpacity={0.16} strokeDasharray="4 6" />)}
            <Path d={pathD} fill="none" stroke={tk.ln} strokeOpacity={0.14} />
            {[[78, 640], ...STOPS].map(([x, y], i) => (
              <React.Fragment key={i}>
                <Circle cx={x} cy={y} r={16} fill={i === 0 ? P.sheet : "#FFF3C4"} stroke={tk.ln} strokeWidth={1.5} />
                <Circle cx={x} cy={y} r={10} fill="none" stroke={tk.ln} strokeWidth={0.8} strokeDasharray="1.5 2.5" opacity={0.7} />
                <Rect x={x - 3} y={y - 3} width={6} height={6} fill={i === 0 ? tk.ln : P.post} />
              </React.Fragment>
            ))}
          </Svg>
          <Text style={{ position: "absolute", left: 40, top: 664, fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.4, color: P.ink }}>{t("ff.yourCity")}</Text>
          {STOPS.map(([x, y], i) => (
            <View key={i} style={{ position: "absolute", left: x - 70, top: y + 22, width: 140, alignItems: "center" }} pointerEvents="none">
              <Text numberOfLines={1} style={{ fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.2, color: P.ink }}>{stampOf(stops[i]) || t("ff.stop", { n: i + 1 })}</Text>
              {!!words(stops[i]) && <Text numberOfLines={1} style={{ fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 11, color: P.ink60, marginTop: 2 }}>{words(stops[i])}…</Text>}
            </View>
          ))}
          <Text style={{ position: "absolute", left: 20, top: 756, fontFamily: PF.mono, fontSize: 9, letterSpacing: 1.6, color: P.ink40 }}>{t("ff.chart")}</Text>
        </Animated.View>
        {/* the trail she leaves */}
        {pts.map((p, i) => <TrailDot key={i} clock={clock} at={p.at} x={p.x} y={p.y} />)}

        {/* the title of the moment, stepping back once she's gone */}
        <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 96, alignItems: "center" }, titleStyle]} pointerEvents="none">
          <Text style={{ fontFamily: PF.serif, fontSize: 30, color: P.ink, textAlign: "center" }}>
            {t("ob.flight.plain", { name: her })} <Text style={{ fontFamily: PF.serifItalic, fontStyle: "italic" }}>{t("ob.flight.em", { name: her })}</Text>
          </Text>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.6, color: P.ink60, marginTop: 10 }}>{t("ob.flight.sub")}</Text>
        </Animated.View>

        {/* 1 · the letter, folding */}
        <Animated.View style={[{ position: "absolute", left: 52, top: 300, width: 286, backgroundColor: P.sheet, borderWidth: 1.5, borderColor: tk.ln, paddingHorizontal: 18, paddingVertical: 14, transform: [{ rotate: "-2deg" }] }, cardStyle]} pointerEvents="none">
          <Text numberOfLines={3} style={{ fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 15, lineHeight: 22, color: P.ink }}>{opener}</Text>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 8.5, letterSpacing: 1.4, color: P.ink40, marginTop: 8 }}>{t("ob.carriedBy", { name: her.toUpperCase() })}</Text>
        </Animated.View>
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: 120, height: 80, backgroundColor: P.sheet, borderWidth: 1.5, borderColor: tk.ln }, envStyle]} pointerEvents="none">
          <Svg width={117} height={77} viewBox="0 0 117 77"><Path d="M0 0 L58.5 42 L117 0" fill="none" stroke={tk.ln} strokeWidth={1.5} /></Svg>
          <View style={{ position: "absolute", right: 9, top: 7, width: 20, height: 18, backgroundColor: P.pen }} />
        </Animated.View>

        {/* 3 · what she brings back */}
        <Animated.View style={[{ position: "absolute", left: 70, top: 440, width: 250, height: 120 }, trayStyle]} pointerEvents="none">
          {[-14, -2, 10].map((r, i) => (
            <View key={i} style={{ position: "absolute", left: i * 50, top: i === 1 ? 10 : 0, width: 150, height: 99, backgroundColor: P.sheet, borderWidth: 1.5, borderColor: tk.ln, transform: [{ rotate: `${r}deg` }] }}>
              <Svg width={147} height={96} viewBox="0 0 147 96"><Path d="M0 0 L73.5 52 L147 0" fill="none" stroke={tk.ln} strokeWidth={1.5} /></Svg>
              <View style={{ position: "absolute", right: 11, top: 8, width: 22, height: 20, backgroundColor: P.pen }} />
            </View>
          ))}
        </Animated.View>

        {/* her */}
        <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, birdStyle]} pointerEvents="none">
          <WrenBird size={90} mood={mood} pose={pose} stage="hatch" form={form} mark={mark} skin={skin} accessory={accessory} />
        </Animated.View>

        <Text style={{ position: "absolute", left: 0, right: 0, bottom: 22, textAlign: "center", fontFamily: PF.mono, fontSize: 10, letterSpacing: 1.4, color: P.ink40 }}>{t("ff.skip")}</Text>
      </View>
    </Pressable>
  );
}

function TrailDot({ clock, at, x, y }: { clock: SharedValue<number>; at: number; x: number; y: number }) {
  const P = useP();
  const style = useAnimatedStyle(() => ({ opacity: interpolate(clock.value, [at - 0.02, at, 2.9, 3.05], [0, 0.7, 0.7, 0.3], Extrapolation.CLAMP) }));
  return <Animated.View style={[{ position: "absolute", left: x - 2.2, top: y - 2.2, width: 4.4, height: 4.4, borderRadius: 2.2, backgroundColor: P.pen }, style]} pointerEvents="none" />;
}
