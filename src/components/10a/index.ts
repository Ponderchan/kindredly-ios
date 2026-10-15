/* THE 10a REACT NATIVE TWINS (10a step 5).
   ────────────────────────────────────────────────────────────────────────
   The same 10a pieces the SwiftUI kit draws (modules/kindredly-ui), for
   the screens that stay React Native — the reader, a kindred's page, Me's
   sub-pages — and for every Swift screen's React Native fallback. All of
   them paint from the theme (useTheme), hold no words of their own (every
   label comes in translated, or is a nine-language key), and take their
   numbers from ./kit, which is pure and checked by `node
   src/components/10a/kit.test.ts`.

     ReplyStrip        the keyboard-state reply strip (H:124), uncontrolled, with SendKey
     SendKey           the one send key: disabled / enabled (plane) / dimmed
     SecondaryHeader   a pushed page's header (H:90): chevron, mono title, right slot
     TranslateCapsule  "ES→EN  Read it in yours" (H:42)
     TopicTag          "#made my day", contrast-safe on any theme surface (H:35/42)
     InkPanel          the InkCard material, "today" (28, 6/6) or "me" (24, 5/5)
     BottomFade        the page dissolving above the tab bar (H:108)
     StickerBox        the outline + hard shadow material the others are made of */

export { ReplyStrip, type ReplyStripHandle, type ReplyStripProps } from "./ReplyStrip";
export { SendKey } from "./SendKey";
export { SecondaryHeader } from "./SecondaryHeader";
export { TranslateCapsule } from "./TranslateCapsule";
export { TopicTag } from "./TopicTag";
export { InkPanel } from "./InkPanel";
export { BottomFade } from "./BottomFade";
export { StickerBox } from "./StickerBox";
export {
  BOTTOM_FADE,
  INK_PANEL,
  REPLY_STRIP,
  ROW_METRICS,
  SEND_STYLE,
  TOPIC_TAG_SIZE,
  badgeCount,
  contrastRatio,
  sendKeyState,
  translateCode,
  type InkPanelVariant,
  type RowStyle,
  type SendState,
  type SendStyle,
} from "./kit";
