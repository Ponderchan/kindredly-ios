import type { StyleProp, ViewStyle } from "react-native";
import { Pressable } from "react-native";
import Svg, { Path } from "react-native-svg";
import { t, useLang } from "../../lib/i18n";
import "../../data/strings-step5-kitrn"; // a11y.back

/* THE ONE BACK CHEVRON (owner, 2026-10-19: every detail page's back icon
   the same size and in the same place as Settings'; KBackBar's chevron).
   ────────────────────────────────────────────────────────────────────────
   The 24-grid line chevron M15 6l-7 6 7 6 (KLineIcon .chevronLeft), drawn
   18pt across at stroke 2.2 with round caps, in a 36 × 36 box whose left
   edge is 12 from the screen edge, reached by a 44 touch (hitSlop 4) and
   named for VoiceOver (a11y.back unless the page passes its own words).

   It is absolutely placed: put it in the view that starts right under the
   top safe area (a header bar, or the page under its safe-area padding).
   `barHeight` is the bar it is centred in — 52 (sticky, the default) or 44
   (Settings' bar, which scrolls away); a header taller than 52 (the chat
   header, a hero) keeps the default, so the chevron sits centred in the
   first 52 below the safe area, at the same spot as every other page —
   unless the header centres it with a face row by design (the chat
   headers, like Swift's KChatHeader): then `inline`, same size and x.
   Never a "‹" character, an SF Symbol, or another size or stroke. */

export const BACK_CHEVRON = {
  /** the box's left edge from the screen edge */
  left: 12,
  /** the box, square */
  box: 36,
  /** the glyph, square */
  glyph: 18,
  stroke: 2.2,
  /** the touch reaches 4 past the box on every side: 44 */
  slop: 4,
  path: "M15 6l-7 6 7 6",
} as const;

/** The box's top inside a bar of `barHeight` that sits directly under the safe area. */
export function backChevronTop(barHeight: 52 | 44 = 52): number {
  return (barHeight - BACK_CHEVRON.box) / 2;
}

/** The glyph alone (18 at 2.2), for a control that draws its own box. */
export function BackChevronGlyph({ color }: { color: string }) {
  return (
    <Svg width={BACK_CHEVRON.glyph} height={BACK_CHEVRON.glyph} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={BACK_CHEVRON.stroke} strokeLinecap="round" strokeLinejoin="round">
      <Path d={BACK_CHEVRON.path} />
    </Svg>
  );
}

/** The back key: the glyph in its 36 box, 12 from the left, centred in a 52 (or 44) bar under the safe area. */
export function BackChevron({
  onPress,
  color,
  label,
  barHeight = 52,
  inline = false,
  disabled,
  style,
}: {
  onPress: () => void;
  /** the glyph's ink (the page's ink; white on a dark cover) */
  color: string;
  /** VoiceOver's name for it (default a11y.back) */
  label?: string;
  /** the bar it is centred in: 52 (default, and for any taller header) or 44 */
  barHeight?: 52 | 44;
  /** in the flow instead of absolutely placed: for a header row that centres it with a face by
      design (the chat headers, as KChatHeader does); the row then puts the box 12 from the edge */
  inline?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  useLang();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={BACK_CHEVRON.slop}
      accessibilityRole="button"
      accessibilityLabel={label ?? t("a11y.back")}
      style={({ pressed }) => [
        {
          ...(inline ? null : { position: "absolute" as const, left: BACK_CHEVRON.left, top: backChevronTop(barHeight), zIndex: 2 }),
          width: BACK_CHEVRON.box,
          height: BACK_CHEVRON.box,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.5 : 1,
        },
        style,
      ]}
    >
      <BackChevronGlyph color={color} />
    </Pressable>
  );
}
