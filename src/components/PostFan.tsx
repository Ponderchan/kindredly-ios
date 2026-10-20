import { useEffect } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, FadeOut, FadeOutDown, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import { t, useLang } from "../lib/i18n";
import { scrimColor, useTheme } from "../lib/theme";
import type { ThemeTokens } from "../theme/themes";
import { tabBarHeight } from "./PostTabBar";

/* THE FAN — what the + opens (owner's reference video, 2026-09-19).
   ────────────────────────────────────────────────────────────────────────
   Pressing + used to leave the page for a full screen where the courier
   asked where the letter should travel. Now nothing leaves: the page dims
   behind the bar, the + has turned into an ×, and the two choices rise out
   of it — one after the other, a little past their mark and back — with a
   word under each. Tap one and the composer slides in over it; tap the ×
   or the dim and they drop back where they came from.

   It covers everything ABOVE the bar and nothing of the bar itself, so the
   × stays live and undimmed, the way the reference has it. */

const DISC = 64;
const SPREAD = 66; // each choice this far from the centre line
const LIFT = 22; // the choices' feet, above the bar

export function PostFan({ onClose }: { onClose: () => void }) {
  useLang();
  const { dark, t: tk } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const barH = tabBarHeight(insets.bottom);

  // push first, close after the slide — the composer slides over the fan
  const go = (to: string) => {
    router.push(to);
    setTimeout(onClose, 420);
  };

  const dim = useSharedValue(0);
  useEffect(() => {
    dim.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
  }, [dim]);
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));

  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: barH }}>
      <Animated.View exiting={FadeOut.duration(160)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Animated.View style={[dimStyle, { flex: 1, backgroundColor: scrimColor(dark, 0.58) }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
      </Animated.View>

      <Choice x={width / 2 - SPREAD} delay={0} label={t("pc.stranger")} tk={tk} onPress={() => go("/compose")}>
        <PlaneGlyph color={tk.ink} />
      </Choice>
      <Choice x={width / 2 + SPREAD} delay={70} label={t("pc.yourself")} tk={tk} onPress={() => go("/journal-pick")}>
        <BookGlyph color={tk.ink} />
      </Choice>
    </View>
  );
}

/* one choice: a soft disc with a glyph, a word beneath. It starts small,
   low and faint at the plus and springs up past its place. The disc is the
   Swift pop's (owner's mock, 2026-10-20): the lav2 wash, a 1pt hairline (sf;
   line in Midnight), a soft blur shadow, a dark line glyph — no black ring,
   no hard shadow. The word stays white: this fan's dim is much heavier. */
function Choice({ x, delay, label, tk, onPress, children }: { x: number; delay: number; label: string; tk: ThemeTokens; onPress: () => void; children: React.ReactNode }) {
  const up = useSharedValue(0);
  useEffect(() => {
    up.value = withDelay(delay, withSpring(1, { damping: 11, stiffness: 150, mass: 0.9 }));
  }, [up, delay]);
  const rise = useAnimatedStyle(() => ({
    opacity: Math.min(1, up.value * 1.6),
    transform: [{ translateY: (1 - up.value) * 64 }, { scale: 0.35 + up.value * 0.65 }],
  }));
  const word = useAnimatedStyle(() => ({ opacity: Math.max(0, (up.value - 0.7) / 0.3) }));
  return (
    <Animated.View exiting={FadeOutDown.duration(180)} style={{ position: "absolute", bottom: LIFT, left: x - DISC / 2, width: DISC, alignItems: "center" }}>
      <Animated.View style={[rise, { alignItems: "center" }]}>
      <Pressable onPress={onPress} hitSlop={10} style={({ pressed }) => ({ width: DISC, height: DISC, borderRadius: DISC / 2, backgroundColor: tk.lav2, borderWidth: 1, borderColor: tk.dark ? tk.line : tk.sf, alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.94 : 1 }], shadowColor: tk.dark ? "#000000" : "#1E1B35", shadowOpacity: tk.dark ? 0.45 : 0.22, shadowRadius: 7, shadowOffset: { width: 0, height: 4 } })}>
        {children}
      </Pressable>
      <Animated.Text numberOfLines={1} style={[word, { fontWeight: "500", fontSize: 13, color: "#FFFFFF", marginTop: 8, width: 120, textAlign: "center" }]}>
        {label}
      </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

/** to a stranger — the courier's paper plane */
function PlaneGlyph({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinejoin="round" strokeLinecap="round">
      <Path d="M20.5 3.5L3.5 10.5l7.5 3 3 7.5 6.5-17.5z" />
      <Path d="M11 13.5l9.5-10" />
    </Svg>
  );
}

/** to yourself — the sealed book */
function BookGlyph({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinejoin="round" strokeLinecap="round">
      <Path d="M6.5 3.5h11a2 2 0 0 1 2 2v15h-13a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z" />
      <Path d="M8.5 3.5v17" />
      <Circle cx={14} cy={11} r={2.2} fill={color} stroke="none" />
    </Svg>
  );
}
