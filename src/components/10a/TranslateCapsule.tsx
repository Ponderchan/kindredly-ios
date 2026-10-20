import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { PFM } from "../../theme/post";
import { useTheme } from "../../lib/theme";
import { StickerBox } from "./StickerBox";

/* THE TRANSLATE CAPSULE (10a, H:42; KTranslateCapsule's React Native twin).
   ────────────────────────────────────────────────────────────────────────
   A letter in someone else's language offers itself in yours: an sf
   capsule with a 2pt ln outline, corners 20, padding 6 12, no shadow.
   Inside, 8 apart, the language code in mono 600 10 at .1em in ind
   ("ES→EN"; translateCode() in ./kit turns it round once translated) and
   the words in system 600 13 in ink — read.invite / mm.original /
   mm.translating as the screen chooses. It replaces the LangPair look (the
   owner chose this one for Today; the reader takes it too). Pressed, it
   dips 1pt; busy, it is dimmed and takes no tap, and VoiceOver hears it
   busy. Words and code come in already translated. As wide as its words
   in a row; in a column, give it style={{ alignSelf: "flex-start" }}. */
export function TranslateCapsule({
  code,
  label,
  busy = false,
  onPress,
  accessibilityLabel,
  style,
}: {
  /** the language pair, as shown: translateCode(from, to, translated) */
  code: string;
  /** the words: what a tap does now (read.invite), or mm.original once translated, mm.translating while busy */
  label: string;
  /** a translation in flight: dimmed, not pressable */
  busy?: boolean;
  onPress: () => void;
  /** VoiceOver's name (default the label; the code is read as letters, so it is left out) */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { t: tk } = useTheme();
  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      disabled={busy}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ busy, disabled: busy }}
      style={[{ opacity: busy ? 0.6 : 1 }, style]}
    >
      {({ pressed }) => (
        <StickerBox
          fill={tk.sf}
          stroke={tk.ln}
          lineWidth={2}
          radius={20}
          pressed={pressed}
          faceStyle={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, paddingHorizontal: 12 }}
        >
          <Text numberOfLines={1} style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1, color: tk.ind }}>
            {code}
          </Text>
          <View style={{ flexShrink: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "600", color: tk.ink }}>
              {label}
            </Text>
          </View>
        </StickerBox>
      )}
    </Pressable>
  );
}
