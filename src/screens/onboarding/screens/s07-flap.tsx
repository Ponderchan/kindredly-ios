import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import { EggArt, WarmthGlow } from "../parts/nest-egg";
import { OB } from "../parts/tokens";

/* THE EGG ON THE FLAP (screen 7; storyboard §6 · 7 "the egg sits on the
   flap's point, small and listening").
   ────────────────────────────────────────────────────────────────────────
   On the letter the egg leaves its nest and sits on the point of the open
   flap, over the page you're writing on, LISTENING: the old run's FeedEgg
   behaviour — a twitch on every keystroke (alternating sides), a swell and
   a warmer glow the more there is on the page — drawn as the run's own egg
   (parts/nest-egg EggArt + WarmthGlow), so it is the same egg that sat in
   the nest on 3–6 and goes back there on 8, not the console egg with the
   old feed meter's five pips on its belly (the five-thought feed is gone).
   The four warmth pips joined into ONE gold ring as 6 handed over ("ready
   for words"), so on 7 the ring is drawn round it. Reduce Motion: no
   twitch; the glow still warms. */

export function FlapEgg({
  shell,
  len,
  size = 46,
  ringOpacity,
}: {
  shell: number;
  /** the page's length (characters): the twitch fires on each change, the glow warms with it */
  len: number;
  size?: number;
  /** the ring's opacity (it gives way while the egg travels between the nest and the flap) */
  ringOpacity?: SharedValue<number>;
}) {
  const reduce = useReducedMotion();
  const kick = useSharedValue(0);
  useEffect(() => {
    if (len === 0 || reduce) return;
    kick.value = withSequence(withTiming(len % 2 ? 1 : -1, { duration: 50 }), withTiming(0, { duration: 180 }));
  }, [len, reduce, kick]);
  const warm = Math.min(len, 80) / 80;
  const body = useAnimatedStyle(() => ({ transform: [{ rotate: `${kick.value * 2.4}deg` }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: ringOpacity ? ringOpacity.value : 1 }));
  const glow = size * (1.9 + warm * 0.5);
  const ring = size * 1.24;
  return (
    <View pointerEvents="none" style={{ width: size, height: size, alignItems: "center", justifyContent: "center", transform: [{ scale: 1 + warm * 0.06 }] }}>
      <View style={{ position: "absolute", left: (size - glow) / 2, top: (size - glow) / 2 }}>
        <WarmthGlow size={glow} heat={0.55 + warm * 0.45} />
      </View>
      <Animated.View style={[ringStyle, { position: "absolute", width: ring, height: ring, borderRadius: ring, borderWidth: 2.5, borderColor: OB.gold }]} />
      <Animated.View style={body}>
        <EggArt shell={shell} size={size} />
      </Animated.View>
    </View>
  );
}
