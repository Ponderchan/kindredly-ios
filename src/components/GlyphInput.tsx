import { forwardRef } from "react";
import { StyleSheet, TextInput, View, type TextInputProps, type TextStyle } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "../lib/theme";

/* THE GLYPH, AND THE FIELD IT USED TO BE THE CARET OF.
   ────────────────────────────────────────────────────────────────────────
   The courier's typographic mark, cut down to the two characters that
   are her face: •> — an ink eye and an amber beak. For a while it was the
   cursor wherever you write here; see GlyphInput below for why it is the
   system's caret again. The glyph itself is still drawn for the
   introduction ritual. */

/* the mark's two colours are hers, not the page's: the same ink eye and
   amber beak in every theme */
const INK = "#1E1B35";
const AMBER = "#D8A63F";

/* drawn, not typed: a dot and a chevron, so the eye sits exactly on the
   text's x-height whatever face the page is set in */
export function WrenGlyph({ size }: { size: number }) {
  const w = size * 1.1;
  const h = size * 0.5;
  return (
    <Svg width={w} height={h} viewBox="0 0 1.1 0.5">
      <Circle cx={0.13} cy={0.25} r={0.12} fill={INK} />
      <Path d="M0.5 0.03 L0.98 0.25 L0.5 0.47" fill="none" stroke={AMBER} strokeWidth={0.14} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* THE CARET IS THE SYSTEM'S AGAIN (owner, 2026-09-19). The mirrored-text
   trick above placed the bird where the caret would be, but a mirror of
   the text is a second copy of every keystroke laid out on every change,
   and it can only guess at what the native field does with a long letter —
   scrolling inside the field, a selection made by the handle, a line
   wrapped by a different rule. A caret that is sometimes not where the
   text goes in is worse than a plain one. The wrapper keeps one thing:
   the flex the callers put on the field, which on the field itself made
   Yoga size it from a zero basis and lose the height fieldBox set. The
   glyph stays drawn for the ritual that types a name onto a sticker.

   The caret and the selection are the theme's ind, the product's one
   actionable colour, so they read on a dark page too. The placeholder and
   the keyboard follow the theme unless the caller says otherwise. */
const flat = (s: TextStyle | TextStyle[] | undefined): TextStyle => (StyleSheet.flatten(s) as TextStyle) || {};

export const GlyphInput = forwardRef<TextInput, TextInputProps>(function GlyphInput(props, ref) {
  const { t: tk, dark } = useTheme();
  const st = flat(props.style as TextStyle);
  return (
    <View style={{ flex: (st.flex as number) ?? undefined, alignSelf: "stretch" }}>
      <TextInput
        placeholderTextColor={tk.faint}
        keyboardAppearance={dark ? "dark" : "light"}
        {...props}
        ref={ref}
        style={[props.style, { flex: undefined }]}
        selectionColor={tk.ind}
      />
    </View>
  );
});
