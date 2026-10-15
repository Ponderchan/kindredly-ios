import { Text, type StyleProp, type ViewStyle } from "react-native";
import { PF } from "../../theme/post";
import { useTheme } from "../../lib/theme";
import { StickerBox } from "./StickerBox";
import { TOPIC_TAG_SIZE, topicTagLook } from "./kit";

/* THE TOPIC TAG (10a, H:35, H:42; KTopicTag's React Native twin).
   ────────────────────────────────────────────────────────────────────────
   A letter's stamp, said as its topic: "#made my day". The mock's sticker
   shape — a 2pt outline, corners 20, padding 6 12, a hard 3/3 shadow in ln
   — in mono 600 at 11 (the 9/10/11 rule; the mock's 13). Its colours are
   the stamp's, made safe on the theme's surface (topicTagLook in ./kit,
   built on theme/post's channelColors): the stamp's wash as the fill, its
   hue walked to ≥ 4.5:1 for the text, the stamp itself as the outline
   where it holds 3:1. The old pills filled with the stamp's full colour and
   white or channelInk text, which vanished on the dark stamps and on
   Midnight's trays.

   `name` is shown as given — the caller builds it, as the screens do
   today: `#${sname(stamp.name).toLowerCase()}`. `surface` is what the tag
   lies on, so its wash is mixed against the right colour: tk.sf on a card
   (the default), tk.bg on the page, tk.soft2 in a tray. It is as wide as
   its words in a row; in a column, give it style={{ alignSelf:
   "flex-start" }} or it stretches. Leave 3 free right and below for the
   shadow. */
export function TopicTag({
  name,
  colorHex,
  surface,
  style,
}: {
  /** the label as shown, "#made my day" */
  name: string;
  /** the stamp's colour (#RRGGBB); a missing one reads as a quiet grey */
  colorHex?: string | null;
  /** the surface under the tag (default the card face, tk.sf) */
  surface?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { t: tk } = useTheme();
  const look = topicTagLook(colorHex, tk, surface ?? tk.sf);
  return (
    <StickerBox
      fill={look.fill}
      stroke={look.border}
      lineWidth={2}
      radius={20}
      shadow={look.shadow}
      offset={3}
      style={style}
      faceStyle={{ paddingVertical: 6, paddingHorizontal: 12 }}
    >
      <Text numberOfLines={1} style={{ fontFamily: PF.monoSemi, fontSize: TOPIC_TAG_SIZE, letterSpacing: 0.2, color: look.text }}>
        {name}
      </Text>
    </StickerBox>
  );
}
