import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../../lib/theme";
import { StickerBox } from "./StickerBox";
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
   inside has a shadow of its own near the edge. Colours from the theme. */
export function InkPanel({
  variant = "me",
  clip = false,
  style,
  contentStyle,
  children,
}: {
  variant?: InkPanelVariant;
  /** clip the children to the rounded face */
  clip?: boolean;
  /** the outer box: margins, flex, width */
  style?: StyleProp<ViewStyle>;
  /** the face: overrides the variant's padding, adds a gap or a layout */
  contentStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const { t: tk } = useTheme();
  const m = INK_PANEL[variant];
  return (
    <StickerBox
      fill={tk.sf}
      stroke={tk.ln}
      lineWidth={m.border}
      radius={m.radius}
      shadow={tk.ln}
      offset={m.shadow}
      style={style}
      faceStyle={[
        { paddingTop: m.padding.top, paddingRight: m.padding.right, paddingBottom: m.padding.bottom, paddingLeft: m.padding.left },
        clip ? { overflow: "hidden" } : null,
        contentStyle,
      ]}
    >
      {children}
    </StickerBox>
  );
}
