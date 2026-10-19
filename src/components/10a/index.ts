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
     ReplyBar          the chat composers' reply bar (Today reply, pen-pal chat), with
                       EmojiKey and SendDisc
     KindredBar        the chat composers' Kindreds bar (a room), with IdeasBubble
     LineIcon          the chat composers' I1 line icons
     SendKey           the one send key: disabled / enabled (plane) / dimmed
     SecondaryHeader   a pushed page's header (H:90): chevron, mono title, right slot
     BackChevron       the one back key (KBackBar's): 18 at 2.2 in a 36 box 12 from the left
     TranslateCapsule  "ES→EN  Read it in yours" (H:42)
     TopicTag          "#made my day", contrast-safe on any theme surface (H:35/42)
     InkPanel          the InkCard material, "today" (28, 6/6) or "me" (24, 5/5)
     BottomFade        the page dissolving above the tab bar (H:108)
     StickerBox        the outline + hard shadow material the others are made of */

export { ReplyStrip, type ReplyStripHandle, type ReplyStripProps } from "./ReplyStrip";
export { ReplyBar, EmojiKey, SendDisc, type ReplyBarHandle, type ReplyBarProps } from "./ReplyBar";
export { KindredBar, IdeasBubble, popIn, type KindredBarHandle, type KindredBarProps } from "./KindredBar";
export { LineIcon, type LineIconName } from "./LineIcon";
export { type ComposerFieldHandle } from "./useComposerField";
export { SendKey } from "./SendKey";
export { SecondaryHeader } from "./SecondaryHeader";
export { BackChevron, BackChevronGlyph, BACK_CHEVRON, backChevronTop } from "./BackChevron";
export { TranslateCapsule } from "./TranslateCapsule";
export { TopicTag } from "./TopicTag";
export { InkPanel } from "./InkPanel";
export { BottomFade } from "./BottomFade";
export { StickerBox } from "./StickerBox";
export {
  BAR_ABOVE_KEYBOARD,
  BOTTOM_FADE,
  INK_PANEL,
  KINDRED_BAR,
  PLAY_TRAY,
  REPLY_BAR,
  REPLY_STRIP,
  ROW_METRICS,
  SEND_STYLE,
  TOPIC_TAG_SIZE,
  badgeCount,
  contrastRatio,
  openKeyFill,
  playCardFill,
  playTrayHeight,
  sendKeyState,
  translateCode,
  type InkPanelVariant,
  type RowStyle,
  type SendState,
  type SendStyle,
} from "./kit";
