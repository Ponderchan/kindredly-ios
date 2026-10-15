import { LinearGradient } from "expo-linear-gradient";
import type { StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../../lib/theme";
import { BOTTOM_FADE, fadeColors } from "./kit";

/* THE BOTTOM FADE (10a, H:108; KBottomFade's React Native twin).
   ────────────────────────────────────────────────────────────────────────
   The page dissolving into its own colour above the floating tab bar, so
   the last rows go under the bar softly instead of being cut by it: 176
   tall, from the page colour at nothing to the page colour at 42%, solid
   below. It never takes a touch. Absolutely placed at the bottom of its
   parent; put it after the list in the screen's root view. A tab screen
   leaves its last row the fade's height − 6 clear (foundation:
   navigation). Colours from the theme (the mock starts from white, which
   greys every page but Classic). */
export function BottomFade({
  height = BOTTOM_FADE.height,
  color,
  style,
}: {
  height?: number;
  /** what it fades into (default the page colour, tk.bg) */
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { t: tk } = useTheme();
  const colors = fadeColors(color ?? tk.bg);
  return (
    <LinearGradient
      pointerEvents="none"
      colors={colors}
      locations={[0, BOTTOM_FADE.solidAt]}
      style={[{ position: "absolute", left: 0, right: 0, bottom: 0, height }, style]}
    />
  );
}
