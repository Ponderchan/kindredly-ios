import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { EGG_SHELLS, EggBody } from "./EggShell";
import { Y } from "../theme/y2k";

/* THE EGG THAT LISTENS (W39 · write). It sits over the page while you type:
   the glow behind it grows with the length of what's in the box, it twitches
   on every keystroke, swells a little, and each FEED lands as a pop and one
   more lit pip on its belly. It is the meter — there is no other meter. */
export function FeedEgg({ shell, fed, draftLen, pulse, breathe }: { shell: number; fed: number; draftLen: number; pulse: number; breathe: any }) {
  const sh = EGG_SHELLS[shell] ?? EGG_SHELLS[0];
  const kick = useSharedValue(0);
  const pop = useSharedValue(0);
  const flash = useSharedValue(0);

  // a twitch per keystroke, alternating sides
  useEffect(() => {
    if (draftLen === 0) return;
    kick.value = withSequence(withTiming(draftLen % 2 ? 1 : -1, { duration: 50 }), withTiming(0, { duration: 180 }));
  }, [draftLen, kick]);
  // the swallow: a squash and a warm pulse
  useEffect(() => {
    if (!pulse) return;
    pop.value = withSequence(withTiming(1, { duration: 90 }), withSpring(0, { damping: 8, stiffness: 200 }));
    flash.value = withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 460 }));
  }, [pulse, pop, flash]);

  const warm = Math.min(draftLen, 80) / 80;
  const body = useAnimatedStyle(() => ({
    transform: [{ rotate: `${kick.value * 2}deg` }, { scaleX: 1 + pop.value * 0.1 }, { scaleY: 1 - pop.value * 0.08 }],
  }));
  const glow = useAnimatedStyle(() => ({ opacity: Math.min(1, 0.1 * fed + warm * 0.3 + flash.value * 0.4) }));

  return (
    <View style={{ width: 124, height: 142, alignItems: "center", justifyContent: "center", transform: [{ scale: 1 + warm * 0.06 }] }}>
      <Animated.View pointerEvents="none" style={[glow, { position: "absolute", width: 240, height: 240, left: -58, top: -49 }]}>
        <Svg width={240} height={240}>
          <Defs>
            <RadialGradient id="feedglow" gradientUnits="userSpaceOnUse" cx={120} cy={120} r={118}>
              <Stop offset={0} stopColor="#FFD98A" stopOpacity={0.95} />
              <Stop offset={1} stopColor="#FFD98A" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={120} cy={120} r={118} fill="url(#feedglow)" />
        </Svg>
      </Animated.View>
      <Animated.View style={[breathe, body]}>
        <Svg width={124} height={142} viewBox="-100 -110 200 220">
          <EggBody shell={sh} gid="feedegg">
            {/* five pips on the belly — one per thought it has eaten */}
            {[0, 1, 2, 3, 4].map((i) => (
              <Rect key={i} x={-50 + i * 21} y={60} width={16} height={8} rx={2} fill={i < fed ? Y.blue : "#FFFFFF"} stroke={Y.ink} strokeWidth={2} />
            ))}
          </EggBody>
        </Svg>
      </Animated.View>
    </View>
  );
}
