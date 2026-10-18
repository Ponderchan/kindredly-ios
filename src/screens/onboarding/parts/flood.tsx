import { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { OB } from "./tokens";

/* THE SHELL FLOOD (storyboard §6 · 9, §3 "It has a job in the story").
   ────────────────────────────────────────────────────────────────────────
   At the burst a disc of Shell grows from the crack until it covers the
   screen, 420 ms, ease-out, the shards flying over it: the egg's warm inside
   spills out over the blue and the world after the hatch is Shell. It is a
   circle scaled from nothing to the radius that reaches the farthest corner
   from where it starts, drawn over the ground and under whatever flies on
   top (the screen decides the stacking). `onDone` fires once the screen is
   covered — the moment to switch the ground itself to Shell (draft.born) and
   mount the dark status bar. Reduce Motion: a 220 ms cross-fade instead of
   the growing disc.

   It is general on purpose: the dissolve into Today is the same colour, and
   a screen may flood paper or blue the same way (`color`). */

export function ShellFlood({
  play,
  from,
  color = OB.shell,
  duration = 420,
  onDone,
}: {
  /** start growing (false → nothing drawn; true → grows once) */
  play: boolean;
  /** where it starts, in the screen's coordinates (the crack) */
  from: { x: number; y: number };
  color?: string;
  duration?: number;
  onDone?: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  // the radius that reaches the farthest corner from the origin
  const R = Math.max(Math.hypot(from.x, from.y), Math.hypot(width - from.x, from.y), Math.hypot(from.x, height - from.y), Math.hypot(width - from.x, height - from.y));

  useEffect(() => {
    if (!play) {
      p.value = 0;
      return;
    }
    const done = () => onDone?.();
    p.value = withTiming(1, { duration: reduce ? 220 : duration, easing: Easing.out(Easing.cubic) }, (fin) => {
      if (fin) runOnJS(done)();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play]);

  const disc = useAnimatedStyle(() =>
    reduce ? { opacity: p.value, transform: [{ scale: 1 }] } : { opacity: p.value > 0 ? 1 : 0, transform: [{ scale: Math.max(0.0001, p.value) }] },
  );
  if (!play) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        disc,
        reduce
          ? { position: "absolute", left: 0, top: 0, width, height, backgroundColor: color }
          : { position: "absolute", left: from.x - R, top: from.y - R, width: 2 * R, height: 2 * R, borderRadius: R, backgroundColor: color },
      ]}
    />
  );
}
