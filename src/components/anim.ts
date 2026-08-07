import { useEffect } from "react";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

/** gentle vertical bob — the v20 "breathe" keyframe (translateY ±distance). */
export function useBreathe(distance = 5, duration = 2600) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(
      withSequence(
        withTiming(-distance, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [distance, duration, y]);
  return useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
}

/** soft pulsing opacity (for "waiting" / breathing dots). */
export function usePulse(min = 0.4, max = 1, duration = 1400) {
  const o = useSharedValue(max);
  useEffect(() => {
    o.value = withRepeat(
      withSequence(
        withTiming(min, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(max, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [min, max, duration, o]);
  return useAnimatedStyle(() => ({ opacity: o.value }));
}
