import { useEffect, type ReactNode } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { P } from "../../theme/post";

/* THE KIT FOR A GUIDE REEL (owner, 2026-10-11: "大的清楚的动态演示 card",
   after WhatsApp's own channel cards). A reel is a few scenes that play on
   their own in a square: a finger tapping the real control, the product's
   own parts moving, a line of big type. Everything here draws at the size
   it's given — `s` is the square's side in points — so nothing is scaled
   up from a small picture and goes soft. Each scene mounts fresh when its
   turn comes, so a scene's motion starts from zero every time it plays. */

export type Scene = {
  key: string;
  /** how long it holds before the next one, in ms */
  ms: number;
  render: (s: number) => ReactNode;
};

export type Reel = {
  /** the square's ground */
  bg: string;
  scenes: Scene[];
};

const RM = ReduceMotion.System;

/** 0 → 1 once, after `delay` ms, over `ms` ms */
/* curves made once: a default like Easing.out(...) is a new function on
   every call, and useOnce lists its curve in its deps, so a scene that
   re-rendered restarted every animation in it, delay and all */
const E_OUT = Easing.out(Easing.cubic);
const E_POP = Easing.out(Easing.back(1.8));

export function useOnce(ms: number, delay = 0, ease = E_OUT): SharedValue<number> {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withTiming(1, { duration: ms, easing: ease, reduceMotion: RM }));
  }, [v, ms, delay, ease]);
  return v;
}

/** 0 → 1 → 0, forever */
export function useLoop(ms: number, delay = 0): SharedValue<number> {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.quad), reduceMotion: RM }), withTiming(0, { duration: ms, easing: Easing.inOut(Easing.quad), reduceMotion: RM })), -1, false));
  }, [v, ms, delay]);
  return v;
}

/** a ticking counter for things that step (a count going down, letters typed) */
export function useStep(n: number, everyMs: number, delay = 0): SharedValue<number> {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withTiming(n, { duration: n * everyMs, easing: Easing.linear, reduceMotion: RM }));
  }, [v, n, everyMs, delay]);
  return v;
}

/* A FINGER THAT TAPS — slides in to (x, y), presses (it and the ring
   under it shrink), lifts. `at` is when the press lands, in ms. */
export function Finger({ x, y, at = 700, size = 46 }: { x: number; y: number; at?: number; size?: number }) {
  const come = useOnce(520, Math.max(0, at - 560));
  const press = useSharedValue(0);
  useEffect(() => {
    press.value = withDelay(at, withSequence(withTiming(1, { duration: 120, reduceMotion: RM }), withTiming(0, { duration: 220, reduceMotion: RM })));
  }, [press, at]);
  const hand = useAnimatedStyle(() => ({
    opacity: come.value,
    transform: [{ translateX: (1 - come.value) * 60 }, { translateY: (1 - come.value) * 80 }, { scale: 1 - 0.12 * press.value }],
  }));
  const ring = useAnimatedStyle(() => ({ opacity: press.value * 0.5, transform: [{ scale: 0.6 + 0.8 * press.value }] }));
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x - size * 0.3, top: y - size * 0.12 }}>
      <Animated.View style={[{ position: "absolute", left: size * 0.3 - 18, top: size * 0.12 - 18, width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFFFFF" }, ring]} />
      <Animated.View style={hand}>
        <Svg width={size} height={size * 1.25} viewBox="0 0 40 50">
          <Path d="M13 4c2.2 0 4 1.8 4 4v13l2-.4c1.6-.3 3.1.7 3.5 2.3l.1.4 1.6-.3c1.7-.3 3.3.8 3.6 2.5l1.7-.2c1.8-.2 3.4 1.1 3.6 2.9L35 38c.8 6.6-4.4 11-11 11h-3.4c-3.4 0-6.6-1.6-8.6-4.4L5 35.4c-1-1.4-.7-3.4.7-4.4 1.3-.9 3.1-.8 4.2.4L9 30V8c0-2.2 1.8-4 4-4Z" fill="#F1C9A5" stroke="#1E1B35" strokeWidth={1.6} strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/* BIG TYPE — the WhatsApp interstitial: a few words, very large, words
   arriving one after another; the accent word in the pen. */
export function BigType({ s, words, accent = [], color = P.ink, accentColor = P.pen }: { s: number; words: string[]; accent?: number[]; color?: string; accentColor?: string }) {
  return (
    <View style={{ width: s, height: s, justifyContent: "center", paddingHorizontal: s * 0.09 }}>
      <Text style={{ fontSize: s * 0.11, lineHeight: s * 0.13, fontWeight: "700", letterSpacing: -0.5 }}>
        {words.map((w, i) => (
          <Word key={i} text={w + (i < words.length - 1 ? " " : "")} delay={120 + i * 170} color={accent.includes(i) ? accentColor : color} />
        ))}
      </Text>
    </View>
  );
}

function Word({ text, delay, color }: { text: string; delay: number; color: string }) {
  const v = useOnce(380, delay);
  const st = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.Text style={[{ color }, st]}>{text}</Animated.Text>;
}

/* A SMALL PHONE — a white screen with rounded corners and a hairline, for
   scenes that show a piece of the app being used */
export function MiniScreen({ w, h, children, bg = "#FFFFFF" }: { w: number; h: number; children: ReactNode; bg?: string }) {
  return (
    <View style={{ width: w, height: h, borderRadius: w * 0.09, backgroundColor: bg, borderWidth: 2, borderColor: "#1E1B35", overflow: "hidden" }}>
      {children}
    </View>
  );
}

/** fade + rise in, after `delay` */
export function Rise({ delay = 0, dy = 14, children }: { delay?: number; dy?: number; children: ReactNode }) {
  const v = useOnce(460, delay);
  const st = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * dy }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

/** pop in (scale from small), after `delay` */
export function Pop({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  const v = useOnce(420, delay, E_POP);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, v.value * 1.4), transform: [{ scale: 0.4 + 0.6 * v.value }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

export const centre = { flex: 1, alignItems: "center" as const, justifyContent: "center" as const };
