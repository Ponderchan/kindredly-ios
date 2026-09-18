import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Polygon, Rect, Stop } from "react-native-svg";
import { t, useLang } from "../lib/i18n";
import { PF } from "../theme/post";
import { WrenBird, type WrenStage } from "./WrenBird";
import type { WhereaboutsRead } from "../lib/whereabouts";
import { WHEREABOUTS_META } from "../lib/whereabouts";
import { W14, cardShadow } from "./AuraCard";
import { agoLabel, flightLog, type LogEntry } from "../lib/flight-log";
import type { ThreadSummary } from "../lib/db";

const APath = Animated.createAnimatedComponent(Path);
const AG = Animated.createAnimatedComponent(G);

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
   words read on all of them */
const SCENE_H = 236;
const BAND_H = 92;

/* THE HOUR PAINTS THE SCENE. Four skies, by the phone's clock — the same
   route, the same bird, but morning is pale and low-lit, noon is clear
   blue with a high sun, evening goes amber, night is the V10 sheet: deep
   indigo, a moon, stars, and both windows lit. Text and chip inks follow
   so they stay legible on each sky. */
export type Daylight = "morning" | "day" | "evening" | "night";
export function daylight(hour = new Date().getHours()): Daylight {
  if (hour >= 5 && hour < 10) return "morning";
  if (hour >= 10 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
}
export interface Palette { text: string; scrim: string; button: string; buttonText: string; sky: [string, string]; sea: string; land: string; forest: string; rock: string; ink: string; chip: string; chipText: string; sun: string | null; sunAt: [number, number]; moon: boolean; stars: boolean; lit: boolean; cloud: string | null }
export const PALETTE: Record<Daylight, Palette> = {
  // `ink` draws on the sky; `body` draws on the white below it (the stage chip, the button)
  morning: { text: "#1E1B35", scrim: "#C4E1C6", button: "#2D5B3A", buttonText: "#FFFFFF", land: "#B4DCA6", forest: "#4E9A5C", rock: "#9AA3B0", sea: "#9CC8E6", sky: ["#FBE3D6", "#EAF1E4"], ink: "#2D5B3A", chip: "#2D5B3A", chipText: "#FFFFFF", sun: "#FFD79A", sunAt: [0.1, 0.42], moon: false, stars: false, lit: false, cloud: "#FFFFFF" },
  day: { text: "#1E1B35", scrim: "#ADDBB5", button: "#1F5C33", buttonText: "#FFFFFF", land: "#9CD48C", forest: "#3F8F52", rock: "#8E9AA6", sea: "#6FB6E8", sky: ["#BFE3F8", "#E3F3FB"], ink: "#1F5C33", chip: "#1F5C33", chipText: "#FFFFFF", sun: "#FFD54A", sunAt: [0.82, 0.16], moon: false, stars: false, lit: false, cloud: "#FFFFFF" },
  evening: { text: "#3B2634", scrim: "#E6CBD3", button: "#4A2F3F", buttonText: "#FFFFFF", land: "#93BB8C", forest: "#3A6F46", rock: "#7E7A8E", sea: "#8FA6CF", sky: ["#F6C39A", "#E8C7E6"], ink: "#4A2F3F", chip: "#4A2F3F", chipText: "#FFFFFF", sun: "#FF9A57", sunAt: [0.9, 0.42], moon: false, stars: false, lit: true, cloud: "#FFE0CC" },
  night: { text: "#FFFFFF", scrim: "#2B2660", button: "#FFFFFF", buttonText: "#1E1B35", land: "#2F5148", forest: "#1B3530", rock: "#3A3F5C", sea: "#1F2E5E", sky: ["#1E1B35", "#2E2A6B"], ink: "#DAD6F2", chip: "#FFFFFF", chipText: "#1E1B35", sun: null, sunAt: [0.84, 0.18], moon: true, stars: true, lit: true, cloud: null },
};

/* where on the arc she is, per state — 0 = your window, 1 = theirs */
const AT: Record<WhereaboutsRead["state"], number> = { unsent: 0.06, home: 0.06, exploring: 0.5, delivery: 0.72, bringing: 0.3 };

/* a point on the quadratic arc from (x0,y) over (cx,cy) to (x1,y) */
const onArc = (tt: number, x0: number, x1: number, y: number, cy: number) => {
  const u = 1 - tt;
  const cx = (x0 + x1) / 2;
  return { x: u * u * x0 + 2 * u * tt * cx + tt * tt * x1, y: u * u * y + 2 * u * tt * cy + tt * tt * y };
};

/* THE PLANET — a real globe, not a horizon: a circle whose shoulders you
   can see, sky in both bottom corners, the route thrown over the top of
   it. Sea, continents that follow the curve, forests, one snowy range,
   two faint latitude lines and a thin atmosphere so it reads as a sphere;
   after dark a few lit towns. Flat shapes, no map: nobody can ask "where
   am I". */
export const GLOBE = { top: 66, r: 0.44, shoulder: 0.3 };
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
}: {
  wren: string;
  where: WhereaboutsRead;
  threads: ThreadSummary[];
  lastWrittenAt: string | null;
  seenToday: number;
  stage: WrenStage;
  accessory?: Parameters<typeof WrenBird>[0]["accessory"];
  onPress: () => void;
  /** the hour to paint — defaults to the phone's clock; previews pass one */
  hour?: number;
  /** a fixed log entry — previews only */
  entry?: LogEntry;
}) {
  const [w, setW] = useState(0);
  const lang = useLang(); // the diary is written in the reader's language — re-write it when that changes
  const light = daylight(hour);
  const P = PALETTE[light];
  const GREEN = { ink: P.ink };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const entry = useMemo(() => entryProp ?? flightLog({ where, threads, lastWrittenAt, seenToday, daylight: light }), [entryProp, where, threads, lastWrittenAt, seenToday, light, lang]);

  /* ── motion, by state ──
     flying: she bobs and the route marches under her;
     home: she breathes, and hops now and then;
     waiting (unsent): she tilts her head — "give me one?";
     night: the stars blink; day: the cloud drifts; a lit window pulses
     when something is waiting on you. All loops, all cheap. */
  const bob = useRef(new Animated.Value(0)).current;
  const dash = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const twinkle = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const flyingNow = where.state === "exploring" || where.state === "delivery" || where.state === "bringing";
  useEffect(() => {
    const loops: Animated.CompositeAnimation[] = [];
    const sine = Easing.inOut(Easing.sin);
    if (flyingNow) {
      loops.push(Animated.loop(Animated.sequence([Animated.timing(bob, { toValue: 1, duration: 1300, easing: sine, useNativeDriver: true }), Animated.timing(bob, { toValue: 0, duration: 1300, easing: sine, useNativeDriver: true })])));
      loops.push(Animated.loop(Animated.timing(dash, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: false })));
    } else if (where.state === "unsent") {
      loops.push(Animated.loop(Animated.sequence([Animated.delay(1800), Animated.timing(tilt, { toValue: 1, duration: 420, easing: sine, useNativeDriver: true }), Animated.delay(900), Animated.timing(tilt, { toValue: 0, duration: 420, easing: sine, useNativeDriver: true })])));
    } else {
      loops.push(Animated.loop(Animated.sequence([Animated.timing(breathe, { toValue: 1, duration: 1600, easing: sine, useNativeDriver: true }), Animated.timing(breathe, { toValue: 0, duration: 1600, easing: sine, useNativeDriver: true })])));
      loops.push(Animated.loop(Animated.sequence([Animated.delay(4200), Animated.timing(hop, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }), Animated.timing(hop, { toValue: 0, duration: 220, easing: Easing.bounce, useNativeDriver: true })])));
    }
    if (P.stars) loops.push(Animated.loop(Animated.sequence([Animated.timing(twinkle, { toValue: 1, duration: 1100, easing: sine, useNativeDriver: false }), Animated.timing(twinkle, { toValue: 0, duration: 1100, easing: sine, useNativeDriver: false })])));
    if (P.cloud) loops.push(Animated.loop(Animated.sequence([Animated.timing(drift, { toValue: 1, duration: 9000, easing: sine, useNativeDriver: false }), Animated.timing(drift, { toValue: 0, duration: 9000, easing: sine, useNativeDriver: false })])));
    if (where.state === "bringing") loops.push(Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 900, easing: sine, useNativeDriver: false }), Animated.timing(pulse, { toValue: 0, duration: 900, easing: sine, useNativeDriver: false })])));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [flyingNow, where.state, P.stars, P.cloud, bob, dash, breathe, hop, tilt, twinkle, drift, pulse]);
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
    <Pressable onPress={onPress} onLayout={(e) => setW(e.nativeEvent.layout.width)} style={({ pressed }) => [{ backgroundColor: W14.card, borderRadius: 20, overflow: "hidden", opacity: pressed ? 0.94 : 1 }, cardShadow]}>
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
                <AG opacity={twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] })}>
                  {[[0.12, 22], [0.47, 30], [0.75, 34], [0.55, 48]].map(([fx, y], i) => <Circle key={i} cx={w * fx} cy={y} r={i % 2 === 0 ? 1.6 : 1} fill="#FFFFFF" />)}
                </AG>
                <AG opacity={twinkle.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] })}>
                  {[[0.3, 12], [0.62, 16], [0.93, 26], [0.2, 46]].map(([fx, y], i) => <Circle key={i} cx={w * fx} cy={y} r={i % 2 === 0 ? 1.2 : 1} fill="#FFFFFF" />)}
                </AG>
              </>
            )}
            {P.sun && <Circle cx={w * P.sunAt[0]} cy={SCENE_H * P.sunAt[1]} r={daylight(hour) === "day" ? 13 : 11} fill={P.sun} />}
            {P.moon && (
              <>
                <Circle cx={w * P.sunAt[0]} cy={SCENE_H * P.sunAt[1]} r={11} fill="#FFF3D6" />
                <Circle cx={w * P.sunAt[0] + 6} cy={SCENE_H * P.sunAt[1] - 4} r={9.5} fill={P.sky[0]} />
              </>
            )}
            {P.cloud && (
              <AG translateX={drift.interpolate({ inputRange: [0, 1], outputRange: [-10, 14] })}>
                <Ellipse cx={w * 0.6} cy={30} rx={22} ry={8} fill={P.cloud} opacity={0.9} />
                <Ellipse cx={w * 0.6 + 12} cy={26} rx={13} ry={9} fill={P.cloud} opacity={0.9} />
              </AG>
            )}
            <Planet w={w} P={P} />
            {/* the route — only once a letter has left */}
            {where.state !== "unsent" && (
              <APath
                d={`M${x0} ${ARC_Y} Q ${(x0 + x1) / 2} ${ARC_CY} ${x1} ${ARC_Y}`}
                fill="none"
                stroke={GREEN.ink}
                strokeWidth={1.6}
                strokeDasharray="4 5"
                opacity={0.7}
                strokeDashoffset={dash.interpolate({ inputRange: [0, 1], outputRange: where.state === "bringing" ? [0, 9] : [9, 0] })}
              />
            )}
            {/* your window, their window */}
            <Rect x={x0 - 7} y={ARC_Y - 2} width={14} height={12} rx={2} fill={P.lit || where.state === "bringing" ? "#FFD98A" : "#FFFFFF"} stroke={GREEN.ink} strokeWidth={1.6} />
            {where.state === "bringing" && (
              <AG opacity={pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] })}>
                <Circle cx={x0} cy={ARC_Y + 4} r={13} fill="#FFD98A" />
              </AG>
            )}
            <Path d={`M${x0 - 9} ${ARC_Y - 2} L${x0} ${ARC_Y - 9} L${x0 + 9} ${ARC_Y - 2}`} fill="none" stroke={GREEN.ink} strokeWidth={1.6} strokeLinejoin="round" />
            <Rect x={x1 - 7} y={ARC_Y - 4} width={14} height={14} rx={2} fill={P.lit ? "#FFD98A" : "#FFFFFF"} stroke={GREEN.ink} strokeWidth={1.6} opacity={where.state === "unsent" ? 0.35 : 1} />
            <Path d={`M${x1} ${ARC_Y - 4} V${ARC_Y + 10} M${x1 - 7} ${ARC_Y + 3} H${x1 + 7}`} stroke={GREEN.ink} strokeWidth={1.2} opacity={where.state === "unsent" ? 0.35 : 1} />
          </Svg>
        )}
        {/* the bird, on the arc — or at home on the sill */}
        {w > 0 && (
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
            <WrenBird size={birdSize} mood={WHEREABOUTS_META[where.state].mood} stage={stage} accessory={accessory} pose={flying ? "fly" : "perch"} />
          </Animated.View>
        )}
        {/* the fly pose already carries a letter — the family art draws it */}
        {/* the chip, inside the scene */}
        <View style={{ position: "absolute", left: 12, top: 12, backgroundColor: P.chip, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.6, color: P.chipText }}>{t("me.sec.courier").toUpperCase()}</Text>
        </View>
        <Text style={{ position: "absolute", left: 0, width: x0 * 2, top: ARC_Y + 14, textAlign: "center", fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.4, color: GREEN.ink }}>{t("me.route.you")}</Text>
        <Text style={{ position: "absolute", right: 0, width: (w - x1) * 2, top: ARC_Y + 14, textAlign: "center", fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.4, color: GREEN.ink, opacity: where.state === "unsent" ? 0.4 : 1 }}>{t("me.route.somewhere")}</Text>

        {/* the second tier: a solid panel with a hard edge (the owner's V10) —
            two layers you see at a glance, not a fade */}
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: BAND_H, backgroundColor: P.scrim }} />

        {/* on the scene: who, what she is doing, one button */}
        <View style={{ position: "absolute", left: 16, right: 16, bottom: 0, height: BAND_H, flexDirection: "row", alignItems: "center", gap: 12 }}>
          {/* her diary: name · when, the entry, the aside */}
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 16, letterSpacing: -0.3, color: P.text }}>{wren}</Text>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.4, color: P.text, opacity: 0.6 }}>{agoLabel(entry.at)}</Text>
            </View>
            <Text style={{ fontFamily: PF.letter, fontSize: 13.5, lineHeight: 18, color: P.text }} numberOfLines={2}>{entry.line}</Text>
            {!!entry.sub && <Text style={{ fontFamily: PF.letter, fontSize: 11.5, color: P.text, opacity: 0.6 }} numberOfLines={1}>{entry.sub}</Text>}
          </View>
          <View style={{ backgroundColor: P.button, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 }}>
            <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 13, color: P.buttonText }}>{t("me.open")}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
