import type { ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useRouter, type Href } from "expo-router";
import { MONO, PF } from "../../theme/post";
import { useTheme } from "../../lib/theme";
import { useLang } from "../../lib/i18n";
import { BackChevron } from "./BackChevron";

/* THE SECONDARY PAGE'S HEADER (10a, H:90; KBackBar's React Native twin).
   ────────────────────────────────────────────────────────────────────────
   Every page pushed over a tab — the reader, a kindred's page, Me's
   sub-pages — opens under this: 52 tall on the page colour, and no rule
   (the owner took the rules away; the ground does the separating). The
   back key is the one BackChevron (a 36 box 12 from the left edge holding
   M15 6l-7 6 7 6, 18pt, stroke 2.2, in ink, a 44pt touch, named for
   VoiceOver a11y.back), centred in the bar's height. The title is centred in mono 600 at 11
   with .16em of tracking (the mock's 12, under owner question 2's 9/10/11
   rule) and is the page's header for VoiceOver; pass it already cased as
   the page wants it (the strings are written in capitals where the mock
   draws them so). `right` sits 12 from the right edge — the mock's icon
   buttons are 34 × 34 with 22pt glyphs.

   Back goes back; with nowhere to go back to (a page opened from a push),
   it replaces to `fallbackHref`, Today by default. Not sticky by itself:
   put it above the ScrollView, or give it `style` to pin it. VoiceOver
   meets the chevron first, then the title, then the right-hand slot. */
export function SecondaryHeader({
  title,
  onBack,
  fallbackHref = "/(tabs)/letters",
  right,
  backLabel,
  height = 52,
  ground,
  style,
}: {
  /** the centred mono title, as shown (may be empty) */
  title?: string;
  /** what the chevron does (default: back, or fallbackHref) */
  onBack?: () => void;
  /** where the chevron goes when there is no page underneath */
  fallbackHref?: Href;
  /** the right-hand slot: icon buttons, a ⋯ */
  right?: ReactNode;
  /** VoiceOver's name for the chevron (default a11y.back) */
  backLabel?: string;
  /** 52 (the mock) or 44 (a compact page) */
  height?: 52 | 44;
  /** the header's ground (default the page colour, tk.bg) */
  ground?: string;
  style?: StyleProp<ViewStyle>;
}) {
  useLang();
  const router = useRouter();
  const { t: tk } = useTheme();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace(fallbackHref)));

  return (
    <View style={[{ height, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: ground ?? tk.bg }, style]}>
      <BackChevron onPress={back} color={tk.ink} label={backLabel} barHeight={height} />
      {!!title && (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          accessibilityRole="header"
          style={{ maxWidth: "64%", fontFamily: PF.monoSemi, fontSize: MONO.title, letterSpacing: MONO.title * 0.16, color: tk.ink, textAlign: "center" }}
        >
          {title}
        </Text>
      )}
      {right != null && <View style={{ position: "absolute", right: 12, flexDirection: "row", alignItems: "center", gap: 4 }}>{right}</View>}
    </View>
  );
}
