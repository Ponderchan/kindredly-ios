import { ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import type { Ground } from "../flow";
import { EDGE, KEY_H, OB, ON_GROUND, SHADOW, TYPE } from "./tokens";
import { OB_MAX_FONT } from "./tokens";

/* THE KEYS (storyboard §3 Acid, §6 "Keys").
   ────────────────────────────────────────────────────────────────────────
   ONE PRIMARY KEY PER SCREEN, and it is acid: the brand's one accent, an ink
   label, a 3pt ink edge and a 4pt hard ink shadow that COLLAPSES on press —
   the face travels the four points down onto its shadow, so pressing feels
   like pressing a real thing, not a colour change. Dim (not ready: 3 before
   the wheel turns, 7 before 20 characters) is the same key at 40%, still in
   place, never hidden, so nothing below it moves when it lights.

   TEXT KEYS are the second door on a screen ("Skip, say they", "Later",
   "Not now", "Been here before? Sign in"): a plain line of type with a 44pt
   target, white on blue, ink on paper and Shell. The GHOST KEY is the one
   outlined key the storyboard has ("Pick another" on 8): the primary's
   geometry, no fill, a 2pt edge in the ground's type colour.

   The keys sit in the frame's key area (parts/frame KeyArea), which reserves
   their room on every screen, so a key never moves between screens or when a
   line above it wraps. */

/** How far a fixed-height key's label follows the phone's text size (Dynamic Type). */
const KEY_TEXT_MAX = 1.6;

export function AcidKey({
  label,
  onPress,
  disabled = false,
  busy = false,
  style,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  /** dim and inert (not ready yet); stays in place */
  disabled?: boolean;
  /** working: the label gives way to a spinner and presses are ignored */
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const down = useSharedValue(0);
  const face = useAnimatedStyle(() => ({ transform: [{ translateX: down.value * SHADOW }, { translateY: down.value * SHADOW }] }));
  const inert = disabled || busy;
  return (
    <Pressable
      onPress={inert ? undefined : () => onPress()}
      onPressIn={() => {
        if (!inert) down.value = withTiming(1, { duration: 60 });
      }}
      onPressOut={() => {
        down.value = withTiming(0, { duration: 120 });
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inert, busy }}
      style={[{ height: KEY_H + SHADOW, opacity: disabled ? 0.4 : 1 }, style]}
    >
      {/* the hard shadow: the key's own shape in ink, four points down and right */}
      <View style={{ position: "absolute", left: SHADOW, top: SHADOW, right: 0, height: KEY_H, borderRadius: 14, backgroundColor: OB.ink }} />
      <Animated.View
        style={[
          face,
          {
            height: KEY_H,
            marginRight: SHADOW,
            borderRadius: 14,
            borderWidth: EDGE,
            borderColor: OB.ink,
            backgroundColor: OB.acid,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        {/* the face is a fixed KEY_H tall (the key area reserves exactly that), so the label grows
            with the phone's text size only so far (1.6×, about AX1) and never spills out of it */}
        {busy ? <ActivityIndicator color={OB.ink} /> : <Text maxFontSizeMultiplier={KEY_TEXT_MAX} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[TYPE.key, { color: OB.ink }]}>{label}</Text>}
      </Animated.View>
    </Pressable>
  );
}

/** A line of type that is a key: white on blue, ink on paper and Shell; a 44pt target. */
export function TextKey({
  label,
  onPress,
  on = "blue",
  underline = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  /** the ground it stands on (its colour follows) */
  on?: Ground;
  underline?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : () => onPress()}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[{ minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, opacity: disabled ? 0.4 : 1 }, style]}
    >
      <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.textKey, { color: ON_GROUND[on], textAlign: "center", textDecorationLine: underline ? "underline" : "none" }]}>{label}</Text>
    </Pressable>
  );
}

/** The outlined key ("Pick another" on 8): the primary's geometry, no fill, a 2pt edge in the ground's type colour. */
export function GhostKey({ label, onPress, on = "blue", style }: { label: string; onPress: () => void; on?: Ground; style?: StyleProp<ViewStyle> }) {
  const ink = ON_GROUND[on];
  return (
    <Pressable
      onPress={() => onPress()}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          height: KEY_H,
          marginRight: SHADOW,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: ink,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Text maxFontSizeMultiplier={KEY_TEXT_MAX} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[TYPE.key, { color: ink }]}>{label}</Text>
    </Pressable>
  );
}
