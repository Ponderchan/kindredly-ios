import { requireNativeView } from "expo";
import { forwardRef, useMemo, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KMenuAction, KScreenBaseProps, KScreenHandle, KStandardCommands } from "./types";

/* A ROOM WITH A KINDRED AND A PEN-PAL CHAT, drawn by SwiftUI (10a step 5, batch 1): one view for
   both (ios/Adapters/KConversationView.swift → ios/Portable/Chat/KConversation.swift), for
   src/app/room/[id].tsx and src/app/chat/[id].tsx through src/screens/chat/ConversationNative.tsx.
   Everything it shows is worded and dated in TS (src/screens/chat/build-items.ts); Swift draws
   and reports.

   It is a whole screen below the React Native header: put it alone in one @expo/ui <Host
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
   playback, tray. Every prop change re-sends the whole props map (the 0b bench: 29 ms for an
   80-row change, 2.7 ms for a command). */

/** What a row draws. */
export type KChatItemKind = "line" | "letter" | "photo" | "song" | "fold" | "recalled" | "voice";
/** A translation under a line. */
export type KChatTranslation = "none" | "busy" | "shown";
/** Which part of a row was tapped (onChatItemPress). */
export type KChatPart = "body" | "photo" | "song" | "quote" | "fold" | "shelf" | "voice";
/** What was pressed in the dock (onChatDock). */
export type KChatDockAction = "replyClose" | "modeClose" | "noticeClose" | "closingLink" | "rekindle" | "sign";

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
  /** letters: "YOU · OCT 14" above the block; "" for none */
  speakerLabel: string;
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

/** One card of the room's trace tray. */
export type KChatTrace = {
  key: string;
  title: string;
  subtitle: string;
  /** a KLineGlyph: note | ask | moment | song | photo | bug | idea */
  glyph: "note" | "ask" | "moment" | "song" | "photo" | "bug" | "idea";
};

/** Everything above and in place of the composer. "" means none for every text. */
export type KChatDock = {
  closingText: string;
  closingLink: string;
  notice: { label: string; evidence: string; line: string; word: string; closeLabel: string } | null;
  signDoor: "none" | "offer" | "theirsFirst" | "waiting";
  signLabel: string;
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
  /** the Wren tool's VoiceOver name; "" for no round tools (the pen-pal chat) */
  wrenToolLabel: string;
  plusLabel: string;
  plusCloseLabel: string;
  traces: KChatTrace[];
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
};

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: NativeImage = { uri: "", key: "", kind: "image" };

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
    traces: d.traces.map((t) => ({ key: t.key, title: t.title, subtitle: t.subtitle, glyph: t.glyph })),
  };
}

type NativeKConversationViewProps = Omit<
  KConversationViewProps,
  | "letterFont"
  | "insets"
  | "rev"
  | "items"
  | "dock"
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
