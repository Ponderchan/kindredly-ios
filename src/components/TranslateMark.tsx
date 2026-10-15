import { View } from "react-native";
import { useTheme } from "../lib/theme";

/* THE MARK ON THE TRANSLATE CONTROL — "second impression".
   Two rules, the app's own structural unit, standing for one line of type set
   twice: the same sentence in another language comes out a different length.
   The top rule is the original, the bottom is the translation, and the accent
   marks whichever one you are reading — so the mark reports state instead of
   decorating the word. Off, it stays quiet and lets REPLY keep the only accent
   in the row. Deliberately not the 文/A glyph: that is someone else's visual
   language, and this product is built of type and its own postal objects.

   10a: on the theme (mute rules, the theme's ind when on). The reader itself
   now offers translation through the 10a capsule (components/10a
   TranslateCapsule, H:42); this mark stays for any React Native control
   that still sets the word beside it. */
export function TranslateMark({ on }: { on?: boolean }) {
  const { t: tk } = useTheme();
  return (
    <View style={{ width: 13, marginRight: 7 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ height: 1.5, width: 13, backgroundColor: tk.mute }} />
      <View style={{ height: 1.5, width: 8, marginTop: 3, backgroundColor: on ? tk.ind : tk.mute }} />
    </View>
  );
}
