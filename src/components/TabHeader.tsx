import type { ReactNode } from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { MONO, PF, PFM } from "../theme/post";
import { useTheme } from "../lib/theme";

/* EVERY TAB'S PLATE. The tab's name with the tab's one fact or
   control on the right. Today, Notes, Kindreds and Me wear the same one;
   only the + has none, because it isn't a place.

   10a: the name is the page title — system 700 at 22, leading, the same on
   all four tabs (owner, 2026-10-20; KTextStyle.pageTitle in Swift) — and
   the rule under it is gone on all four tabs
   (the owner's call): the page's own ground does the separating now. It
   paints from the theme. A long name in some languages (SEELENVERWANDTE,
   AUJOURD'HUI) shrinks to fit its line, to .7, rather than pushing the
   right-hand fact off the screen; VoiceOver hears it as the page's header.

   The right side is either your own node (`right`: Notes' two keys, Me's
   gear) or the mock's status label (`rightLabel`: mono 11 at .12em, in
   mute — or ind when it is a way in, like Kindreds' "2 TO ANSWER"). The
   Swift tabs draw their own title row; this is the React Native one, for
   the screens and fallbacks that stay React Native.

   `rule` puts the old 1pt line back, for the one screen still drawn on it:
   the React Native Kindreds sky (KindredsSky) uses the title's rule as its
   horizon, until the Kindreds fallback is redrawn without it. */
export function TabHeader({
  title,
  right,
  rightLabel,
  rightTone = "mute",
  onRightPress,
  rightA11yLabel,
  ink,
  rule = false,
  style,
}: {
  title: string;
  /** your own right-hand node (keys, a gear); wins over rightLabel */
  right?: ReactNode;
  /** the mock's status label on the right (mono 11, uppercase as given) */
  rightLabel?: string;
  /** mute (a plain fact) or ind (a way in) */
  rightTone?: "mute" | "ind";
  /** makes the label a button */
  onRightPress?: () => void;
  /** VoiceOver's name for the label when it is a button (default: the label) */
  rightA11yLabel?: string;
  /** the title's colour; default the theme's ink */
  ink?: string;
  /** the old 1pt rule under the plate (KindredsSky only — see above) */
  rule?: boolean;
  style?: ViewStyle;
}) {
  const { t: tk } = useTheme();
  const color = ink ?? tk.ink;

  let side: ReactNode = right ?? null;
  if (side == null && rightLabel) {
    const label = (
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        style={{ ...PFM.monoMed, fontSize: MONO.title, letterSpacing: 1.3, color: rightTone === "ind" ? tk.ind : tk.mute, textAlign: "right" }}
      >
        {rightLabel}
      </Text>
    );
    side = onRightPress ? (
      <Pressable onPress={onRightPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={rightA11yLabel ?? rightLabel} style={{ flexShrink: 1 }}>
        {label}
      </Pressable>
    ) : (
      <View style={{ flexShrink: 1 }}>{label}</View>
    );
  }

  return (
    <View
      style={[
        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 52, marginHorizontal: 16, paddingHorizontal: 6 },
        rule ? { borderBottomWidth: 1, borderBottomColor: color } : null,
        style,
      ]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        accessibilityRole="header"
        style={{ flexShrink: 1, fontFamily: PF.letter, fontWeight: "700", fontSize: 22, color }}
      >
        {title}
      </Text>
      {side}
    </View>
  );
}
