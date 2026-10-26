import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../../lib/theme";
import { StickerBox, objectDepth } from "./StickerBox";
import { INK_PANEL, type InkPanelVariant } from "./kit";

/* THE INK PANEL (10a InkCard; the SwiftUI InkCard's React Native twin).
   ────────────────────────────────────────────────────────────────────────
   The material of letters and of the things you made: an sf face, a 2.5 ln
   outline and a hard shadow in ln (tokens-10a.md §7). Two variants, as the
   mock draws them:

     "today"  the letter card: corners 28, a 6/6 shadow, padding 18 20 14 (H:32)
     "me"     every Me card (profile, Aura, Stamps): corners 24, 5/5, padding 16 (H:72)

   The shadow is a view behind the face (StickerBox), so it takes no room:
   leave 6 (or 5) free to the right and below. `clip` cuts the children to
   the corners (a photo that runs to the edge); leave it off when something
   inside has a shadow of its own near the edge. Colours from the theme.
   `object` (owner's rule B, 2026-10-26: the Aura card) drops the outline
   for the object depth's purple shadow and keeps the content where the
   outline left it, as the SwiftUI InkCard(object:) does. */
export function InkPanel({
  variant = "me",
  clip = false,
  object = false,
  style,
  contentStyle,
  children,
}: {
  variant?: InkPanelVariant;
  /** clip the children to the rounded face */
  clip?: boolean;
  /** rule B: no outline, the object depth (objectDepth) instead of the ink shadow */
  object?: boolean;
  /** the outer box: margins, flex, width */
  style?: StyleProp<ViewStyle>;
  /** the face: overrides the variant's padding, adds a gap or a layout */
  contentStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const { t: tk } = useTheme();
  const m = INK_PANEL[variant];
  // an object has no outline; its content stays where the outline put it
  const b = object ? m.border : 0;
  const depth = object ? objectDepth(tk) : { stroke: tk.ln, shadow: tk.ln, offset: m.shadow };
  return (
    <StickerBox
      fill={tk.sf}
      {...depth}
      lineWidth={m.border}
      radius={m.radius}
      style={style}
      faceStyle={[
        { paddingTop: m.padding.top + b, paddingRight: m.padding.right + b, paddingBottom: m.padding.bottom + b, paddingLeft: m.padding.left + b },
        clip ? { overflow: "hidden" } : null,
        contentStyle,
      ]}
    >
      {children}
    </StickerBox>
  );
}
