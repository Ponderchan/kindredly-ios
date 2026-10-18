import { useCallback, useRef, useState, type ReactNode } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LineIcon, type LineIconName } from "../../../components/10a/LineIcon";
import { nestEggRect } from "./s01-geometry";

/* A GLYPH FLYING INTO THE EGG'S WARMTH (storyboard §6 · 3 → 4, 4 → 5).
   ────────────────────────────────────────────────────────────────────────
   "The ♊ glyph shrinks into the egg's glow, kept for screen 6"; "the ♀ flies
   into the glow". The answer you just gave visibly goes INTO the egg, so
   when screen 6 assembles your envelope from the same glyphs, they come
   back out of something you watched them go into. The flight starts where
   the glyph is on screen (measured in window points), curves up to the
   centre of the runner's nest egg (s01-geometry nestEggRect — the same box
   the runner draws it in), shrinks to a third and fades as it arrives, then
   calls back so the screen can go on. About 380 ms, which is the pause the
   storyboard gives these screens anyway (4 "advances after 300 ms").

   The overlay is drawn by the screen in window points (the runner mounts
   every screen at the window's origin). The caller decides whether to fly
   at all: under Reduce Motion it just goes on. */

type From = { x: number; y: number; size: number };

export function useGlyphFlight(): { overlay: ReactNode; fly: (from: View | null, glyph: LineIconName, color: string, then: () => void, size?: number) => void } {
  const { width: sw } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const nest = nestEggRect(sw, { top: insets.top, bottom: insets.bottom });
  const [f, setF] = useState<{ from: From; glyph: LineIconName; color: string } | null>(null);
  const p = useSharedValue(0);
  const then = useRef<() => void>(() => {});
  const done = useCallback(() => then.current(), []);

  const fly = useCallback(
    (from: View | null, glyph: LineIconName, color: string, next: () => void, size = 24) => {
      then.current = next;
      if (!from) {
        next();
        return;
      }
      from.measureInWindow((x, y, w, h) => {
        if (!w && !h) {
          next();
          return;
        }
        setF({ from: { x: x + w / 2, y: y + h / 2, size }, glyph, color });
        p.value = 0;
        p.value = withTiming(1, { duration: 380, easing: Easing.inOut(Easing.cubic) }, (fin) => {
          if (fin) runOnJS(done)();
        });
      });
    },
    [p, done],
  );

  const to = { x: nest.x + nest.size / 2, y: nest.y + nest.size * 0.55 };
  const style = useAnimatedStyle(() => {
    if (!f) return { opacity: 0 };
    const u = p.value;
    const v = 1 - u;
    // a gentle curve: up first, then across into the egg
    const cx = f.from.x + (to.x - f.from.x) * 0.25;
    const cy = Math.min(f.from.y, to.y) - 30;
    const x = v * v * f.from.x + 2 * v * u * cx + u * u * to.x;
    const y = v * v * f.from.y + 2 * v * u * cy + u * u * to.y;
    return {
      opacity: u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3,
      transform: [{ translateX: x - f.from.size / 2 }, { translateY: y - f.from.size / 2 }, { scale: 1 - 0.65 * u }],
    };
  });

  const overlay = f ? (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0 }, style]}>
      <LineIcon name={f.glyph} size={f.from.size} stroke={2} color={f.color} />
    </Animated.View>
  ) : null;
  return { overlay, fly };
}
