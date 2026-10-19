import { requireNativeView } from "expo";
import { forwardRef, useMemo, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import { nativeFrost, type KFrost, type KImageRefProps, type KInsets, type KMark, type KMenuAction, type KScreenBaseProps, type KScreenHandle, type KSign, type KStandardCommands } from "./types";

/* A ROOM WITH A KINDRED AND A PEN-PAL CHAT, drawn by SwiftUI (10a step 5, batch 1): one view for
   both (ios/Adapters/KConversationView.swift → ios/Portable/Chat/KConversation.swift), for
   src/app/room/[id].tsx and src/app/chat/[id].tsx through src/screens/chat/ConversationNative.tsx.
   Everything it shows is worded and dated in TS (src/screens/chat/build-items.ts); Swift draws
   and reports.

   It is a whole screen below its header, which it draws itself (`header`: the pen-pal chat
   before names, chat composers A2, and the kindreds chat, B; a pen-pal chat already revealed
   keeps a React Native header above it instead): put it alone in one @expo/ui <Host
   style={{flex:1}} ignoreSafeArea="container"> (SurfaceHost field in src/components/
   NativeSurface.tsx: the keyboard's safe area must still apply, so the dock rides it), and only
   after isKindredlyUIViewAvailable("KConversationView") and the screen's NativeSurface switch
   say so. Outside a Host it is a RedBox in dev and a CRASH in a release build.

   Its ref is a KScreenHandle: give it `commands.ref` from useKCommands<KChatCommands>(ref,
   { blurOnUnmount: true, onViewAttach }), and reseed the draft (setText body) in onViewAttach:
   it holds two SwiftUI fields, uncontrolled, whose words live in Swift.

   PROPS vs COMMANDS. `items` (memoised, with a rev from useRev) and `dock` change when the
   conversation does; everything that changes as the reader types or listens goes through
   commands: composer (canSend, the status line, clearOnSend), setText, focus, blur, scrollTo,
   playback, tray, idea (the sentence the room's ideas bubble offers: ANOTHER moves it on, so it
   goes as a command, never as a prop). Every prop change re-sends the whole props map (the 0b
   bench: 29 ms for an 80-row change, 2.7 ms for a command). */

/** What a row draws. */
export type KChatItemKind = "line" | "letter" | "photo" | "song" | "fold" | "recalled" | "voice";
/** A translation under a line. */
export type KChatTranslation = "none" | "busy" | "shown";
/** Which part of a row was tapped (onChatItemPress). */
export type KChatPart = "body" | "photo" | "song" | "quote" | "fold" | "shelf" | "voice";
/** What was pressed in the dock (onChatDock), or in the Swift header: back, page (the face and
    name), more (the ⋯). The room's ideas bubble: ideaNext (↻ ANOTHER), ideaUse (USE IT →; Swift
    has already closed the bubble, the owner puts the sentence in the field and focuses it). */
export type KChatDockAction =
  | "replyClose"
  | "modeClose"
  | "noticeClose"
  | "closingLink"
  | "rekindle"
  | "sign"
  | "back"
  | "page"
  | "more"
  | "ideaNext"
  | "ideaUse";

/** One opened half of a fold: a line with its own menu. */
export type KChatFoldHalf = {
  /** "half:<fold id>": its menu's actions and its translation are keyed by it */
  key: string;
  mine: boolean;
  /** YOU or their name, in capitals */
  speaker: string;
  body: string;
  menu: KMenuAction[];
  translation: KChatTranslation;
  translationText: string;
};

/** One row of the conversation, everything already worded and dated. */
export type KChatItem = {
  /** stable for the row's life: the message id, a send's client key, "opening", "fold:<id>" */
  key: string;
  kind: KChatItemKind;
  mine: boolean;
  /** the day rule above the row; "" for none */
  dayLabel: string;
  /** points above the row, below its day rule */
  gap: number;
  /** letters (the React Native fallback): "YOU · OCT 14" above the block; "" for none */
  speakerLabel: string;
  /** letters (the SwiftUI cards): the head line inside the card, "LETTER 3 · NO. 5422"; "" for none */
  head: string;
  /** letters: the 24-hour time at the block's foot; "" for none */
  timeLabel: string;
  /** the words; a recalled line's note; the voice opening's caption */
  body: string;
  /** what VoiceOver reads for the row: whose, the words, the day */
  a11yLabel: string;
  /** a tap does something (letters: open the reader) */
  tappable: boolean;
  /** the line a reply quotes */
  quote: { speaker: string; excerpt: string; gone: boolean; target: string } | null;
  translation: KChatTranslation;
  translationText: string;
  menu: KMenuAction[];
  /** a moment's picture; null while its link isn't signed */
  photo: KImageRefProps | null;
  songTitle: string;
  songHost: string;
  /** "{n} songs between you", under the last song; "" for none */
  shelfLink: string;
  /** the voice opening's playback key; "" for none */
  voiceKey: string;
  voiceDuration: string;
  fold: {
    kindLabel: string;
    prompt: string;
    state: "open" | "waiting" | "sealed";
    hint: string;
    answerKey: string;
    halves: KChatFoldHalf[];
  } | null;
};

/** One card of the room's + tray (chat composers B, Prompt 6). */
export type KChatTrace = {
  key: string;
  title: string;
  subtitle: string;
  /** a KLineGlyph: the I1 four (foldNote | askSomething | tinyMoment | leaveSong), or one of the
      older line set (note | ask | moment | song | photo | bug | idea) */
  glyph: "foldNote" | "askSomething" | "tinyMoment" | "leaveSong" | "note" | "ask" | "moment" | "song" | "photo" | "bug" | "idea";
  /** the card's ground: a 10a mood's fill (calm #DDEFD6, tired #E4E2F4, low #CFE3F5, happy
      #F6E7C6; Swift darkens it in Midnight), or none for the theme's sf */
  tint: "calm" | "tired" | "low" | "happy" | "none";
};

/** Everything above and in place of the composer. "" means none for every text. */
export type KChatDock = {
  closingText: string;
  closingLink: string;
  notice: { label: string; evidence: string; line: string; word: string; closeLabel: string } | null;
  signDoor: "none" | "offer" | "theirsFirst" | "waiting";
  signLabel: string;
  /** what the door does, for VoiceOver (identity on: it opens the signing sheet); "" or absent for none */
  signHint?: string;
  replyLabel: string;
  replyExcerpt: string;
  replyCloseLabel: string;
  mode: { title: string; closeLabel: string; showsPrompt: boolean; promptPlaceholder: string; promptText: string } | null;
  terminal: "none" | "gone" | "expired";
  goneText: string;
  expiredLabel: string;
  expiredBody: string;
  expiredButton: string;
  placeholder: string;
  sendLabel: string;
  autocapitalize: boolean;
  /** the Wren tool's VoiceOver name (the React Native room's; the SwiftUI room has the ideas key
      in its place); "" for no round tools (the pen-pal chat) */
  wrenToolLabel: string;
  plusLabel: string;
  plusCloseLabel: string;
  traces: KChatTrace[];
  /** the Kindreds bar (chat composers B): the ideas key's VoiceOver name, "" for no Kindreds bar
      (the pen-pal chat's reply bar); the bubble's AN IDEA, ANOTHER and USE IT (already in
      capitals, Swift adds the ↻ and the →); the + tray's title ("Leave something small") */
  ideasLabel: string;
  ideaLabel: string;
  ideaAnother: string;
  ideaUse: string;
  trayTitle: string;
  /** the pen-pal reply bar's hint over the bar while the keyboard is up, already in capitals; "" for none */
  hint: string;
  /** the reply bar's emoji key, for VoiceOver */
  emojiLabel: string;
};

/** A face as Swift's KFace takes it (lib/faces faceRecord): fields a kind doesn't use are "" or 0. */
export type KChatFace = {
  kind: "image" | "mosaic" | "frost" | "veil" | "placeholder";
  uri: string;
  key: string;
  overscan: number;
  mask: number;
  /** kind "frost": the frosted window's spec (src/lib/faces faceRecord) */
  frost?: KFrost | null;
};

/** The conversation's own header: the pen-pal chat's (chat composers A2; build-items
    lettersHeader) or the kindreds chat's (B; build-items roomHeader). */
export type KChatHeader = {
  /** the kindreds chat's: the kindred's round face (`face`) 44 across, no band; false for the
      pen-pal chat's FACE v1 (`mask`, `veil`, `frame`) and the progress band under it */
  room: boolean;
  /** room: the face, as lib/faces resolves it */
  face: KChatFace;
  /** "No. 5422" */
  name: string;
  /** the line under it, already in capitals: "LETTER 3 OF 5 · THEIRS", or the state past the letters */
  sub: string;
  tone: "mute" | "ind" | "brass";
  /** FACE v1 (lib/mosaic mosaicMask with their letters' develop) */
  mask: number;
  /** identity on: the pen pal's frosted window, drawn in the face slot instead of `mask` (never
      develops; the frame and the band stay); null while the switch is off, and for the room */
  frost: KFrost | null;
  /** identity on: the ♀/♂ mark after the name (an ink glyph in sub, 6pt after it); null for none */
  mark: KMark;
  /** identity on: the star sign's glyph after the mark (4pt after it, or where it would be); null for none */
  sign: KSign;
  /** a deleted account, or not loaded: the veil */
  veil: boolean;
  /** the identity switch is on: the veil is drawn as the flat veil tile (a square, like the
      windows), not the mosaic's veil. The screen sets it (useLettersModel identity); absent = off */
  identity?: boolean;
  /** none while the face develops; line when their five are in; brass when they also went first */
  frame: "none" | "line" | "brass";
  /** a First Class member's stamp round the face (C2): "1ST" | "007" | "" (omitted = none). In the
      pen-pal header it replaces the frame (D-8); never on a veil */
  stamp?: string;
  /** the progress band under the header's rule (live 1.0.4's, owner 2026-10-19): both sides'
      five cells and the line that says who still owes what; null for none (names traded, a
      deleted account, the kindreds chat) */
  band: KChatBand | null;
  /** VoiceOver: the face, the name and the line, as one (the band says the counts) */
  a11yLabel: string;
  canOpenPage: boolean;
  backLabel: string;
  /** "" hides the ⋯ (nobody to report) */
  moreLabel: string;
};

/** The pen-pal chat's progress band (build-items bandFacts):
      YOU ■■□□□   NO. 8768 ■□□□□
      3 MORE FROM YOU · 4 FROM THEM → NAMES */
export type KChatBand = {
  /** your letters, 0..5 (a side with all five is drawn in ind) */
  me: number;
  /** theirs, 0..5 */
  them: number;
  /** the second line, already in capitals (ch.band.*) */
  line: string;
  /** both fives are in: the line in ind */
  named: boolean;
  /** "YOU" */
  youLabel: string;
  /** the pen pal's name in capitals: "NO. 8768", or with the identity switch on the courier name */
  themLabel: string;
  /** VoiceOver: the band as one element (ch.band.a11y) */
  a11y: string;
};

/** The words the rows share. */
export type KChatStrings = {
  goToQuote: string;
  translating: string;
  photoOpen: string;
  playLabel: string;
  pauseLabel: string;
};

/** The conversation's commands: the standard set (setText/focus target "body" | "prompt") plus
    its own. */
export type KChatCommands = KStandardCommands & {
  scrollTo: { key: string; animated?: boolean; highlight?: boolean; onlyAtBottom?: boolean };
  composer: { canSend: boolean; status: string; statusAlarm: boolean; clearOnSend: boolean };
  /** failed: the voice card shows itself unavailable and takes no taps. Send it only while there
      is no signed link at all; a load that failed (offline, a lapsed link) goes as failed: false,
      so the next press can reach voice-playback, which loads it again (known bug 2). */
  playback: KStandardCommands["playback"] & { failed?: boolean };
  tray: { open: boolean };
  /** the sentence the room's ideas bubble shows now (useRoomModel's ideas: their order and where
      the reader is in it live in TS); sent when it changes and on every attach */
  idea: { text: string };
};

export type KConversationViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    variant: "room" | "letters";
    /** the render window, oldest first — memoised, with a rev from useRev */
    items: KChatItem[];
    hasOlder: boolean;
    hasNewer: boolean;
    /** memoised */
    dock: KChatDock;
    /** the conversation's own header (memoised): the pen-pal chat's or the kindreds chat's; null
        or absent: none (a React Native one stands above) */
    header?: KChatHeader | null;
    strings: KChatStrings;
    toolBird?: KImageRefProps | null;
    noticeBird?: KImageRefProps | null;
    expiredBird?: KImageRefProps | null;
    onChatReachTop?: () => void;
    onChatReachBottom?: () => void;
    onChatBottomChange?: (atBottom: boolean) => void;
    onChatItemPress?: (key: string, part: KChatPart) => void;
    onChatItemAction?: (key: string, action: string) => void;
    onChatText?: (value: string) => void;
    onChatPromptText?: (value: string) => void;
    /** the words as they were when sent, and whether the field emptied itself (composer clearOnSend) */
    onChatSend?: (value: string, prompt: string, cleared: boolean) => void;
    onChatFocus?: (focused: boolean) => void;
    onChatTool?: (tool: string) => void;
    onChatTrace?: (key: string) => void;
    onChatDock?: (action: KChatDockAction) => void;
    onChatVoice?: (key: string) => void;
    /** no islands today; kept so a <KSlot> can join later */
    children?: ReactNode;
  };

/* ── the records Swift reads (ios/Adapters/KConversationView.swift): flat, every field set ── */

type NativeMenu = { key: string; title: string; icon: string; destructive: boolean };
type NativeImage = { uri: string; key: string; kind: "image" | "videoPoster" };
type NativeHalf = { key: string; mine: boolean; speaker: string; body: string; menu: NativeMenu[]; translation: KChatTranslation; translationText: string };
type NativeItem = {
  key: string;
  kind: KChatItemKind;
  mine: boolean;
  dayLabel: string;
  gap: number;
  speakerLabel: string;
  head: string;
  timeLabel: string;
  body: string;
  a11yLabel: string;
  tappable: boolean;
  hasQuote: boolean;
  quoteSpeaker: string;
  quoteExcerpt: string;
  quoteGone: boolean;
  quoteTarget: string;
  translation: KChatTranslation;
  translationText: string;
  menu: NativeMenu[];
  photo: NativeImage;
  songTitle: string;
  songHost: string;
  shelfLink: string;
  voiceKey: string;
  voiceDuration: string;
  foldKindLabel: string;
  foldPrompt: string;
  foldState: "open" | "waiting" | "sealed";
  foldHint: string;
  foldAnswerKey: string;
  foldHalves: NativeHalf[];
};
type NativeDock = {
  closingText: string;
  closingLink: string;
  noticeLabel: string;
  noticeEvidence: string;
  noticeLine: string;
  noticeWord: string;
  noticeCloseLabel: string;
  signDoor: KChatDock["signDoor"];
  signLabel: string;
  signHint: string;
  replyLabel: string;
  replyExcerpt: string;
  replyCloseLabel: string;
  modeTitle: string;
  modeCloseLabel: string;
  modeShowsPrompt: boolean;
  modePromptPlaceholder: string;
  modePromptText: string;
  terminal: KChatDock["terminal"];
  goneText: string;
  expiredLabel: string;
  expiredBody: string;
  expiredButton: string;
  placeholder: string;
  sendLabel: string;
  autocapitalize: boolean;
  wrenToolLabel: string;
  plusLabel: string;
  plusCloseLabel: string;
  traces: KChatTrace[];
  hint: string;
  emojiLabel: string;
  ideasLabel: string;
  ideaLabel: string;
  ideaAnother: string;
  ideaUse: string;
  trayTitle: string;
};
/* the header as Swift's record: the face flattened, no mark or sign as "", no window as NO_FROST
   (a @Field record can't take null) */
type NativeHeader = Omit<KChatHeader, "face" | "frost" | "mark" | "sign" | "identity" | "band" | "stamp"> & {
  show: boolean;
  stamp: string;
  faceKind: KChatFace["kind"];
  faceUri: string;
  faceKey: string;
  faceOverscan: number;
  faceMask: number;
  frost: KFrost;
  mark: string;
  sign: string;
  identity: boolean;
  band: NativeBand;
};
type NativeBand = KChatBand & { show: boolean };
const NO_BAND: NativeBand = { show: false, me: 0, them: 0, line: "", named: false, youLabel: "", themLabel: "", a11y: "" };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: NativeImage = { uri: "", key: "", kind: "image" };
const NO_HEADER: NativeHeader = {
  show: false,
  room: false,
  faceKind: "placeholder",
  faceUri: "",
  faceKey: "",
  faceOverscan: 0,
  faceMask: 0,
  name: "",
  sub: "",
  tone: "mute",
  mask: 0,
  frost: nativeFrost(null),
  mark: "",
  sign: "",
  veil: true,
  identity: false,
  frame: "none",
  stamp: "",
  band: NO_BAND,
  a11yLabel: "",
  canOpenPage: false,
  backLabel: "",
  moreLabel: "",
};

const image = (ref: KImageRefProps | null | undefined): NativeImage =>
  ref && ref.uri ? { uri: ref.uri, key: ref.key, kind: ref.kind ?? "image" } : NO_IMAGE;

// an undefined field would reach Swift as null, which a Bool @Field can't take
const menu = (m: KMenuAction[]): NativeMenu[] => m.map((a) => ({ key: a.key, title: a.title, icon: a.icon, destructive: a.destructive ?? false }));

/** The items as Swift's flat records. Exported for the node test of the conversion. */
export function nativeChatItems(items: KChatItem[]): NativeItem[] {
  return items.map((it) => ({
    key: it.key,
    kind: it.kind,
    mine: it.mine,
    dayLabel: it.dayLabel,
    gap: it.gap,
    speakerLabel: it.speakerLabel,
    head: it.head ?? "",
    timeLabel: it.timeLabel,
    body: it.body,
    a11yLabel: it.a11yLabel,
    tappable: it.tappable,
    hasQuote: !!it.quote,
    quoteSpeaker: it.quote?.speaker ?? "",
    quoteExcerpt: it.quote?.excerpt ?? "",
    quoteGone: it.quote?.gone ?? false,
    quoteTarget: it.quote?.target ?? "",
    translation: it.translation,
    translationText: it.translationText,
    menu: menu(it.menu),
    photo: image(it.photo),
    songTitle: it.songTitle,
    songHost: it.songHost,
    shelfLink: it.shelfLink,
    voiceKey: it.voiceKey,
    voiceDuration: it.voiceDuration,
    foldKindLabel: it.fold?.kindLabel ?? "",
    foldPrompt: it.fold?.prompt ?? "",
    foldState: it.fold?.state ?? "sealed",
    foldHint: it.fold?.hint ?? "",
    foldAnswerKey: it.fold?.answerKey ?? "",
    foldHalves: (it.fold?.halves ?? []).map((h) => ({
      key: h.key,
      mine: h.mine,
      speaker: h.speaker,
      body: h.body,
      menu: menu(h.menu),
      translation: h.translation,
      translationText: h.translationText,
    })),
  }));
}

/** The dock as Swift's flat record. */
export function nativeChatDock(d: KChatDock): NativeDock {
  return {
    closingText: d.closingText,
    closingLink: d.closingLink,
    noticeLabel: d.notice?.label ?? "",
    noticeEvidence: d.notice?.evidence ?? "",
    noticeLine: d.notice?.line ?? "",
    noticeWord: d.notice?.word ?? "",
    noticeCloseLabel: d.notice?.closeLabel ?? "",
    signDoor: d.signDoor,
    signLabel: d.signLabel,
    signHint: d.signHint ?? "",
    replyLabel: d.replyLabel,
    replyExcerpt: d.replyExcerpt,
    replyCloseLabel: d.replyCloseLabel,
    modeTitle: d.mode?.title ?? "",
    modeCloseLabel: d.mode?.closeLabel ?? "",
    modeShowsPrompt: d.mode?.showsPrompt ?? false,
    modePromptPlaceholder: d.mode?.promptPlaceholder ?? "",
    modePromptText: d.mode?.promptText ?? "",
    terminal: d.terminal,
    goneText: d.goneText,
    expiredLabel: d.expiredLabel,
    expiredBody: d.expiredBody,
    expiredButton: d.expiredButton,
    placeholder: d.placeholder,
    sendLabel: d.sendLabel,
    autocapitalize: d.autocapitalize,
    wrenToolLabel: d.wrenToolLabel,
    plusLabel: d.plusLabel,
    plusCloseLabel: d.plusCloseLabel,
    traces: d.traces.map((t) => ({ key: t.key, title: t.title, subtitle: t.subtitle, glyph: t.glyph, tint: t.tint ?? "none" })),
    hint: d.hint ?? "",
    emojiLabel: d.emojiLabel ?? "",
    ideasLabel: d.ideasLabel ?? "",
    ideaLabel: d.ideaLabel ?? "",
    ideaAnother: d.ideaAnother ?? "",
    ideaUse: d.ideaUse ?? "",
    trayTitle: d.trayTitle ?? "",
  };
}

/** The header as Swift's record (the face flattened): show false for none. */
export function nativeChatHeader(h: KChatHeader | null | undefined): NativeHeader {
  if (!h) return NO_HEADER;
  const { face, frost, mark, sign, identity, band, stamp, ...rest } = h;
  return {
    ...rest,
    show: true,
    stamp: stamp ?? "",
    faceKind: face.kind,
    faceUri: face.uri,
    faceKey: face.key,
    faceOverscan: face.overscan,
    faceMask: face.mask,
    frost: nativeFrost(frost),
    mark: mark ?? "",
    sign: sign ?? "",
    identity: !!identity,
    band: band ? { ...band, show: true } : NO_BAND,
  };
}

type NativeKConversationViewProps = Omit<
  KConversationViewProps,
  | "letterFont"
  | "insets"
  | "rev"
  | "items"
  | "dock"
  | "header"
  | "toolBird"
  | "noticeBird"
  | "expiredBird"
  | "onChatBottomChange"
  | "onChatItemPress"
  | "onChatItemAction"
  | "onChatText"
  | "onChatPromptText"
  | "onChatSend"
  | "onChatFocus"
  | "onChatTool"
  | "onChatTrace"
  | "onChatDock"
  | "onChatVoice"
> &
  Required<Pick<KConversationViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    items: NativeItem[];
    dock: NativeDock;
    header: NativeHeader;
    toolBird: NativeImage;
    noticeBird: NativeImage;
    expiredBird: NativeImage;
    onChatBottomChange?: (e: { nativeEvent: { atBottom: boolean } }) => void;
    onChatItemPress?: (e: { nativeEvent: { key: string; part: KChatPart } }) => void;
    onChatItemAction?: (e: { nativeEvent: { key: string; action: string } }) => void;
    onChatText?: (e: { nativeEvent: { value: string } }) => void;
    onChatPromptText?: (e: { nativeEvent: { value: string } }) => void;
    onChatSend?: (e: { nativeEvent: { value: string; prompt: string; cleared: boolean } }) => void;
    onChatFocus?: (e: { nativeEvent: { focused: boolean } }) => void;
    onChatTool?: (e: { nativeEvent: { tool: string } }) => void;
    onChatTrace?: (e: { nativeEvent: { key: string } }) => void;
    onChatDock?: (e: { nativeEvent: { action: KChatDockAction } }) => void;
    onChatVoice?: (e: { nativeEvent: { key: string } }) => void;
  };

// the view's JS name is the Swift struct's name (ios/Adapters/KConversationView.swift)
const NativeKConversationView = requireNativeView<NativeKConversationViewProps>("KindredlyUI", "KConversationView");

/** The bare SwiftUI conversation. Only inside an @expo/ui <Host>; its ref takes commands. Pass
    `items` and `dock` memoised and a rev from useRev: the converted copies follow their
    identity, so a render that changes nothing else doesn't resend them. */
export const KConversationView = forwardRef<KScreenHandle, KConversationViewProps>(function KConversationView(
  {
    modifiers,
    letterFont,
    insets,
    rev,
    items,
    dock,
    header,
    toolBird,
    noticeBird,
    expiredBird,
    onChatBottomChange,
    onChatItemPress,
    onChatItemAction,
    onChatText,
    onChatPromptText,
    onChatSend,
    onChatFocus,
    onChatTool,
    onChatTrace,
    onChatDock,
    onChatVoice,
    ...rest
  },
  ref,
) {
  const sentItems = useMemo(() => nativeChatItems(items), [items]);
  const sentDock = useMemo(() => nativeChatDock(dock), [dock]);
  const sentHeader = useMemo(() => nativeChatHeader(header), [header]);
  const tool = useMemo(() => image(toolBird), [toolBird]);
  const notice = useMemo(() => image(noticeBird), [noticeBird]);
  const expired = useMemo(() => image(expiredBird), [expiredBird]);
  return (
    <NativeKConversationView
      ref={ref}
      modifiers={modifiers}
      // lets event modifiers (onTapGesture, onAppear…) reach this view, as @expo/ui's own views do
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      // always sent, so Swift never sees a base prop go missing
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      items={sentItems}
      dock={sentDock}
      header={sentHeader}
      toolBird={tool}
      noticeBird={notice}
      expiredBird={expired}
      onChatBottomChange={onChatBottomChange ? (e) => onChatBottomChange(e.nativeEvent.atBottom) : undefined}
      onChatItemPress={onChatItemPress ? (e) => onChatItemPress(e.nativeEvent.key, e.nativeEvent.part) : undefined}
      onChatItemAction={onChatItemAction ? (e) => onChatItemAction(e.nativeEvent.key, e.nativeEvent.action) : undefined}
      onChatText={onChatText ? (e) => onChatText(e.nativeEvent.value) : undefined}
      onChatPromptText={onChatPromptText ? (e) => onChatPromptText(e.nativeEvent.value) : undefined}
      onChatSend={onChatSend ? (e) => onChatSend(e.nativeEvent.value, e.nativeEvent.prompt, e.nativeEvent.cleared) : undefined}
      onChatFocus={onChatFocus ? (e) => onChatFocus(e.nativeEvent.focused) : undefined}
      onChatTool={onChatTool ? (e) => onChatTool(e.nativeEvent.tool) : undefined}
      onChatTrace={onChatTrace ? (e) => onChatTrace(e.nativeEvent.key) : undefined}
      onChatDock={onChatDock ? (e) => onChatDock(e.nativeEvent.action) : undefined}
      onChatVoice={onChatVoice ? (e) => onChatVoice(e.nativeEvent.key) : undefined}
    />
  );
});
