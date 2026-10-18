import { useEffect, useRef } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, G, RadialGradient, Stop } from "react-native-svg";
import { EGG_SHELLS, EggBody, type Shell } from "../../../components/EggShell";
import type { Ground } from "../flow";
import * as haptics from "./haptics";
import { OB, ON_GROUND, TYPE } from "./tokens";
import { OB_MAX_FONT } from "./tokens";

/* THE EGG ON SCREENS 2–8: the nest egg, its warmth, its four pips, its voice
   (storyboard §6, "The egg on screens 2–8").
   ────────────────────────────────────────────────────────────────────────
   It replaces the progress bar. The egg sits in a nest spot at the top
   (about 90pt), with a gold warmth glowing inside it; under it FOUR WARMTH
   PIPS, one lit by each of screens 3, 4, 5 and 6 as you pass them — with a
   pop, a light haptic, one rock and a slightly bigger glow — and under those
   its VOICE: one short lower-case line, white on blue, warm and a little dry,
   its only voice until it hatches.

   ONE EGG ACROSS THE SCREENS. The runner (Onboarding2) draws a single NestEgg
   in a fixed slot at the top of 3–6 and 8 and keeps it mounted while the
   screens change under it, so a pip lights where the eye already is and the
   egg never blinks out and back. A screen reserves that slot with
   ScreenFrame's `nest` (parts/frame NEST_H) and draws nothing there itself.

   The shell is the art of components/EggShell (the shell you picked on 2, the
   birthmark on its crown); `shell={null}` is the launch's own egg in small —
   white, a gold dot of warmth inside, no birthmark — which is the egg on
   screen 1's pager before any shell was chosen. Reduce Motion: no breathing,
   no rock; the pips still light. */

/** The nest egg's drawn box, and the slot the frame reserves for egg + pips + voice. */
export const NEST_EGG = 84;
export const NEST_PIPS_H = 18;
export const NEST_VOICE_H = 22;
export const NEST_SLOT_H = NEST_EGG + NEST_PIPS_H + NEST_VOICE_H + 6;

/* the launch's egg, white: no birthmark (mark "none"), the face as pale as the mark's white */
const LAUNCH_SHELL: Shell = { id: "launch", name: "", base: "#FFFFFF", mid: "#E9E8F7", deep: "#D3D1EE", mark: "none", speck: "#D3D1EE" };

/** The egg drawn on its own at `size` (no shadow, no glow): a shell from EGG_SHELLS, or `null` for the launch's white egg with its gold dot. */
export function EggArt({ shell, size, gid }: { shell: number | null; size: number; gid?: string }) {
  const s = shell == null ? LAUNCH_SHELL : EGG_SHELLS[shell] ?? EGG_SHELLS[0];
  const id = gid ?? `ob2egg-${s.id}-${Math.round(size)}`;
  return (
    <Svg width={size} height={size} viewBox="-110 -110 220 220">
      <G transform="scale(0.98)">
        <EggBody shell={s} gid={id}>
          {shell == null && <Circle cx={0} cy={4} r={15} fill={OB.gold} />}
        </EggBody>
      </G>
    </Svg>
  );
}

/** The gold warmth behind and inside the egg; `heat` 0–1 grows it. */
export function WarmthGlow({ size, heat }: { size: number; heat: number }) {
  const r = size / 2;
  return (
    <Svg width={size} height={size} pointerEvents="none">
      <Defs>
        <RadialGradient id="ob2warmth" gradientUnits="userSpaceOnUse" cx={r} cy={r} r={r}>
          <Stop offset={0} stopColor={OB.gold} stopOpacity={0.55 + 0.35 * heat} />
          <Stop offset={0.55} stopColor={OB.gold} stopOpacity={0.18 + 0.2 * heat} />
          <Stop offset={1} stopColor={OB.gold} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={r} cy={r} r={r} fill="url(#ob2warmth)" />
    </Svg>
  );
}

/** One warmth pip: gold when lit (with a white edge on blue), an empty ring when not. Pops when it lights. */
function Pip({ lit, on }: { lit: boolean; on: Ground }) {
  const pop = useSharedValue(lit ? 1 : 0);
  const was = useRef(lit);
  useEffect(() => {
    if (lit && !was.current) pop.value = withSequence(withTiming(1.4, { duration: 140, easing: Easing.out(Easing.quad) }), withSpring(1, { damping: 9, stiffness: 220 }));
    else if (!lit) pop.value = withTiming(0, { duration: 160 });
    was.current = lit;
  }, [lit, pop]);
  const fill = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const edge = ON_GROUND[on];
  return (
    <View style={{ width: 11, height: 11, marginHorizontal: 4, borderRadius: 6, borderWidth: 1.5, borderColor: edge, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[fill, { width: 11, height: 11, borderRadius: 6, backgroundColor: OB.gold, borderWidth: 1.5, borderColor: edge }]} />
    </View>
  );
}

/**
 * The nest egg: the egg with its warmth, the four pips (`lit` of them lit) and
 * the voice line. When `lit` goes up, the new pip pops, the egg rocks once and
 * the glow grows, with the pip haptic. `ring` draws the four pips joined into
 * one gold ring (6 → 7: "ready for words"). `still` stops it breathing (3x).
 */
export function NestEgg({
  shell,
  lit,
  voice,
  size = NEST_EGG,
  on = "blue",
  ring = false,
  still = false,
  style,
}: {
  shell: number | null;
  lit: number;
  voice?: string | null;
  size?: number;
  on?: Ground;
  ring?: boolean;
  still?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReducedMotion();
  const breathe = useSharedValue(0);
  const rock = useSharedValue(0);
  const prev = useRef(lit);

  useEffect(() => {
    if (reduce || still) {
      breathe.value = withTiming(0, { duration: 200 });
      return;
    }
    breathe.value = withRepeat(withSequence(withTiming(-1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) })), -1, true);
  }, [reduce, still, breathe]);

  useEffect(() => {
    if (lit > prev.current) {
      haptics.pip();
      if (!reduce) rock.value = withSequence(withTiming(1, { duration: 110 }), withTiming(-0.6, { duration: 140 }), withSpring(0, { damping: 8, stiffness: 200 }));
    }
    prev.current = lit;
  }, [lit, reduce, rock]);

  const egg = useAnimatedStyle(() => ({ transform: [{ rotate: `${breathe.value * 2.6 + rock.value * 7}deg` }, { scale: 1 + breathe.value * 0.012 }] }));
  const heat = Math.min(4, Math.max(0, lit)) / 4;
  const glow = size * (1.55 + 0.25 * heat);
  const ink = ON_GROUND[on];

  return (
    <View style={[{ alignItems: "center" }, style]} accessibilityRole="image" accessibilityLabel={voice ?? undefined}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <View pointerEvents="none" style={{ position: "absolute", left: (size - glow) / 2, top: (size - glow) / 2 }}>
          <WarmthGlow size={glow} heat={heat} />
        </View>
        {ring && <View pointerEvents="none" style={{ position: "absolute", width: size * 1.18, height: size * 1.18, borderRadius: size, borderWidth: 3, borderColor: OB.gold }} />}
        <Animated.View style={egg}>
          <EggArt shell={shell} size={size} />
        </Animated.View>
      </View>
      <View style={{ height: NEST_PIPS_H, flexDirection: "row", alignItems: "center", opacity: ring ? 0 : 1 }}>
        {[0, 1, 2, 3].map((i) => (
          <Pip key={i} lit={i < lit} on={on} />
        ))}
      </View>
      <View style={{ height: NEST_VOICE_H, justifyContent: "center" }}>
        {!!voice && (
          <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={1} style={[TYPE.voice, { color: ink, textAlign: "center" }]}>
            {voice}
          </Text>
        )}
      </View>
    </View>
  );
}
