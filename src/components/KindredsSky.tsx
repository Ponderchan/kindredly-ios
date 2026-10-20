import { useEffect, type ReactNode } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, Extrapolation, ReduceMotion, interpolate, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Ellipse, Path, Rect } from "react-native-svg";
import { MONO, PFM } from "../theme/post";
import { useTheme } from "../lib/theme";
import { OrbitMap, orbitBox } from "./OrbitMap";
import { Frost } from "./Frost";
import type { FrostSpec } from "../lib/frost";
import type { OrbitVM } from "../screens/kindreds/kindreds-model";

/* THE SKY, FOLDED ONTO ITS HORIZON — the Kindreds tab's React Native sky
   (the remote switch's fallback, screens/kindreds/KindredsRN; the SwiftUI
   tab draws the 10a band instead).

   Folded, every stranger is a tick on a hairline under the title, ind for
   the ones waiting on you, you the square at its right end, and a round
   button with a chevron sits on the line. Open, the orbit drops out of the
   line onto the page, with the legend under it; pushed back up, it folds
   into the line again. One motion (0.45s): the rings flatten and each
   stranger drops onto the line from wherever the drift has carried them
   (OrbitMap `flat`). The button, a tap anywhere on the sky, a pull on the
   list and a push up all work it (the tab owns the gestures). Reduce
   Motion skips the fold.

   10a: the line is the sky's own now — the title above it lost its rule on
   every tab (owner) — and everything is on the theme. The orbit is the
   model's (kindreds-model orbitItems), the same the Swift orbit draws. The
   legend says "closer = more letters" and "your turn" beside a small face
   inked in ind, as the faces whose turn is yours are drawn. CLOSEST TO YOU
   is gone with the 10a band (owner question 4's default: every pen-pal row
   says its n/5 instead), and so is the grab handle.

   With the identity switch on the orbit draws frosted windows (OrbitMap),
   and "your turn" in the legend is what it looks like there: a small
   frosted square (the model's legendFrost, a fixed sample window, nobody's)
   in its 1.5pt ind ring. Switch off, the legend's inked face as before. */

const LINE_Y = 11; // where the horizon runs through this box
const GAP = 10; // from the line to the orbit, open
const FOLDED_H = LINE_Y * 2 + 6; // the line, with room for the round button on it
const CLAMP = Extrapolation.CLAMP;

/** the legend's your-turn face (KLegendGlyph.turnMask's cells), as a seedless mask isn't a person */
const TURN_CELLS: readonly (readonly [number, number])[] = [
  [0, 1], [0, 3], [1, 0], [1, 2], [1, 4], [2, 1], [2, 3], [3, 0], [3, 2], [3, 4], [4, 1], [4, 3],
];

export function KindredsSky({
  items,
  open,
  onToggle,
  label,
  legendCloser,
  legendTurn,
  legendFrost = null,
}: {
  items: OrbitVM[];
  open: boolean;
  onToggle: () => void;
  /** VoiceOver's name for the sky's button (kd.orbit) */
  label: string;
  legendCloser: string;
  legendTurn: string;
  /** switch on: the legend's sample window (kindreds-model legendFrost); null draws the inked face */
  legendFrost?: FrostSpec | null;
}) {
  const { t: tk } = useTheme();
  const { width: winW } = useWindowDimensions();
  const box = orbitBox(winW);
  const p = useSharedValue(open ? 1 : 0); // 1 = open
  // the legend wraps differently by language, so it is measured
  const footH = useSharedValue(40);
  useEffect(() => {
    p.value = withTiming(open ? 1 : 0, { duration: 450, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.System });
  }, [open, p]);
  const flat = useDerivedValue(() => 1 - p.value);
  // open, it also keeps the list's usual 12pt from the chips
  const boxStyle = useAnimatedStyle(() => ({ height: interpolate(p.value, [0, 1], [FOLDED_H, LINE_Y + GAP + box.H + footH.value + 8], CLAMP) }));
  const map = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(p.value, [0, 1], [LINE_Y - box.CY, LINE_Y + GAP], CLAMP) }] }));
  const lineFade = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 0.6], [1, 0], CLAMP) }));
  const chevTurn = useAnimatedStyle(() => ({ transform: [{ rotate: `${interpolate(p.value, [0, 1], [0, 180], CLAMP)}deg` }] }));
  const foot = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0.7, 1], [0, 1], CLAMP) }));

  return (
    <Pressable
      onPress={onToggle}
      hitSlop={{ bottom: 10 }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: open }}
      accessibilityHint={`${legendCloser}. ${legendTurn}.`}
      style={{ marginHorizontal: 16 }}
    >
      <Animated.View style={[{ overflow: "hidden" }, boxStyle]}>
        {/* the horizon: the sky's own line (the title has none since 10a) */}
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, top: LINE_Y, height: 1, backgroundColor: tk.ink }, lineFade]} />

        <Animated.View pointerEvents="none" style={[{ alignItems: "center" }, map]}>
          <OrbitMap items={items} flat={flat} line={false} />
        </Animated.View>

        {/* open: what the marks mean */}
        <Animated.View
          pointerEvents="none"
          onLayout={(e) => (footH.value = e.nativeEvent.layout.height)}
          style={[{ position: "absolute", left: 0, right: 0, top: LINE_Y + GAP + box.H, paddingHorizontal: 22, paddingBottom: 12, gap: 7 }, foot]}
        >
          <Legend mark={<RingsMark color={tk.sub} />} text={legendCloser} color={tk.sub} />
          <Legend mark={legendFrost ? <Frost spec={legendFrost} size={11} ring={tk.ind} /> : <TurnMark color={tk.ind} />} text={legendTurn} color={tk.sub} />
        </Animated.View>

        {/* a round button at the line's right end, its chevron turning over as the orbit opens */}
        <View
          pointerEvents="none"
          style={{ position: "absolute", right: 0, top: LINE_Y - 14, width: 28, height: 28, borderRadius: 14, backgroundColor: tk.sf, borderWidth: 1, borderColor: tk.line, alignItems: "center", justifyContent: "center", shadowColor: tk.ink, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}
        >
          <Animated.View style={chevTurn}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={tk.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M6 9l6 6 6-6" />
            </Svg>
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function Legend({ mark, text, color }: { mark: ReactNode; text: string; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 18, alignItems: "center" }}>{mark}</View>
      <Text style={{ flex: 1, ...PFM.monoMed, fontSize: MONO.label, letterSpacing: 0.6, color }}>{text}</Text>
    </View>
  );
}

/* the rings, small: two dashed orbits round the square that is you */
function RingsMark({ color }: { color: string }) {
  return (
    <Svg width={18} height={14} viewBox="0 0 18 14">
      <Ellipse cx={9} cy={7} rx={8} ry={6} stroke={color} strokeOpacity={0.75} strokeWidth={1} strokeDasharray="2 2" fill="none" />
      <Ellipse cx={9} cy={7} rx={4.5} ry={3.4} stroke={color} strokeWidth={1} strokeDasharray="2 1.6" fill="none" />
      <Rect x={7.6} y={5.6} width={2.8} height={2.8} fill={color} />
    </Svg>
  );
}

/* a small face inked in ind: what a your-turn face looks like on the orbit */
function TurnMark({ color }: { color: string }) {
  const cell = 1.6;
  const gap = 0.5;
  return (
    <Svg width={10} height={10} viewBox="0 0 10 10">
      {TURN_CELLS.map(([r, c]) => (
        <Rect key={`${r}${c}`} x={c * (cell + gap)} y={r * (cell + gap)} width={cell} height={cell} fill={color} />
      ))}
    </Svg>
  );
}
