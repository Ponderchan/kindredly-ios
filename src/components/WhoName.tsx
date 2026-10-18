import { StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import { useTheme } from "../lib/theme";
import type { WhoMarks } from "../lib/stranger-who";
import { LineIcon } from "./10a/LineIcon";

/* A STRANGER'S NAME WITH ITS MARKS, DRAWN BY REACT NATIVE (identity Phase 1;
   identity-plan §4, §9 and the zodiac addendum).
   ────────────────────────────────────────────────────────────────────────
   The courier name, then the she/he mark 6pt after it, then the star sign
   4pt after the mark (or 6pt after the name, where the mark would be). Both
   glyphs are LineIcon's line drawings (the same paths as Swift's
   KLineGlyph and the web's), drawn for stroke 2 at 0.8 × the name's size,
   in the theme's sub — the colour of the line under the name — and never
   tinted: no pink, no blue, no disc, nothing that reads as a dating app.
   They only ever come after the name.

   Which glyphs to draw is lib/stranger-who's answer (WhoMarks): none with
   the switch off, none until marks_for answers (and none at all before the
   owner runs 0034), none for they / unset / guests / anyone who turned
   them off. So the name and the layout are final from the first frame and
   only the two small glyphs arrive late.

   VoiceOver never lands on a glyph: the element that holds the name says
   "Sunday Kite, she, Gemini" (StrangerWho.spoken), so the glyphs are
   hidden from it here. Nothing may ever sort, hide or choose anyone by
   them. */

/** The mark and the sign after a name, `size` points each (0.8 × the name's size), in sub. */
export function WhoGlyphs({ mark, sign, size, color, lead = 6 }: Pick<WhoMarks, "mark" | "sign"> & { size: number; color?: string; /** the room before the first glyph; a row that already spaces its children passes the difference */ lead?: number }) {
  const { t: tk } = useTheme();
  if (!mark && !sign) return null;
  const ink = color ?? tk.sub;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: "row", alignItems: "center", marginLeft: lead, gap: 4, flexShrink: 0 }}>
      {mark && <LineIcon name={mark} size={size} stroke={2} color={ink} />}
      {sign && <LineIcon name={sign} size={size} stroke={2} color={ink} />}
    </View>
  );
}

/* the glyphs inside the name's own line: an inline view the text lays out
   like one more character, so a long name wraps them onto its next line
   with its last word instead of cutting the name (a text attachment sits on
   the baseline, where a symbol in the text would) */
function InlineGlyphs({ mark, sign, size }: Pick<WhoMarks, "mark" | "sign"> & { size: number }) {
  const { t: tk } = useTheme();
  if (!mark && !sign) return null;
  const n = (mark ? 1 : 0) + (sign ? 1 : 0);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 6 + n * size + (n - 1) * 4, height: size, flexDirection: "row", justifyContent: "flex-end", gap: 4 }}
    >
      {mark && <LineIcon name={mark} size={size} stroke={2} color={tk.sub} />}
      {sign && <LineIcon name={sign} size={size} stroke={2} color={tk.sub} />}
    </View>
  );
}

/**
 * A stranger's name with its mark and sign after it, in one text. The name
 * is never cut short to make room: a courier name fits a header on one line
 * (the 165pt render gate), and where a column is narrower (the reader's
 * head, an iPhone SE) the glyphs, then the last word, wrap to a second line
 * (`numberOfLines`, 2 by default) — the same order SwiftUI's fallbacks take.
 */
export function WhoName({
  name,
  marks,
  style,
  glyph,
  numberOfLines = 2,
  maxFontSizeMultiplier,
}: {
  name: string;
  marks: Pick<WhoMarks, "mark" | "sign">;
  /** the name's text style; its fontSize sets the glyphs at 0.8 × it unless `glyph` says otherwise */
  style: StyleProp<TextStyle>;
  /** the glyphs' size in points */
  glyph?: number;
  /** 0 = as many lines as it takes (the largest text sizes) */
  numberOfLines?: number;
  maxFontSizeMultiplier?: number;
}) {
  const size = glyph ?? Math.round((StyleSheet.flatten(style)?.fontSize ?? 17) * 0.8);
  return (
    <Text numberOfLines={numberOfLines} maxFontSizeMultiplier={maxFontSizeMultiplier} style={style}>
      {name}
      <InlineGlyphs mark={marks.mark} sign={marks.sign} size={size} />
    </Text>
  );
}
