import { requireNativeView } from "expo";
import { forwardRef, useMemo, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import { nativeFrost, type KFrost, type KInsets, type KMark, type KScreenBaseProps, type KScreenHandle, type KSign, type KStandardCommands } from "./types";

/* THE ONE-LETTER READER, drawn by SwiftUI (owner-approved 2026-10-20; ios/Adapters/
   KConversationView.swift KReaderView → ios/Portable/Chat/KChatRows.swift KReaderScreen), for
   src/screens/chat/ReaderNative.tsx. The model is the React Native reader's own
   (src/screens/chat/useReaderModel.ts); TS words and dates everything, Swift draws and reports.

   A whole screen with its own header: alone in one @expo/ui <Host style={{flex:1}}
   ignoreSafeArea="container"> (SurfaceHost field: the keyboard's safe area must still apply, so
   the reply bar rides it), only after isKindredlyUIViewAvailable("KReaderView") and the "reader"
   NativeSurface switch say so. Its ref is a KScreenHandle: give it `commands.ref` from
   useKCommands<KReaderCommands>(ref, { blurOnUnmount: true, onViewAttach }), and reseed the reply's
   words (setText) and the composer on attach: the field is uncontrolled, its words live in Swift.

   PROPS vs COMMANDS. hero, earlier (memoised, with a rev) and strings change with the thread;
   the send key and the hint change per keystroke and go as the composer command. */

/** The face at the top of the card, as lib/faces resolves it. */
export type KReaderFaceKind = "none" | "image" | "mosaic" | "frost" | "veil" | "tile" | "placeholder";

/** The letter being read, every word resolved. */
export type KReaderHero = {
  /** the letter's key ("opening", a message id): the card fades in when it changes */
  key: string;
  /** the paper id (src/data/papers.ts); "plain" for the soft card */
  paper: string;
  faceKind: KReaderFaceKind;
  faceUri: string;
  faceKey: string;
  faceOverscan: number;
  faceMask: number;
  faceFrost: KFrost | null;
  /** a kindred's face is round; a pen pal's mosaic, frost or veil is not */
  faceRound: boolean;
  faceSize: number;
  /** a member's C2 stamp round the face: "1ST" | "007" | "" */
  memberStamp: string;
  /** switch on, a pen pal: the courier name (the date goes under it); "" for the postmark line */
  name: string;
  mark: KMark;
  sign: KSign;
  /** under the name: "OCT.14 · YOU" */
  when: string;
  /** "OCT.14 · NO.7273" */
  postmark: string;
  /** the thread's state; "" for none */
  state: string;
  tone: "mute" | "ind" | "brass";
  /** VoiceOver for the head row; "" reads its words */
  headA11y: string;
  stampId: string;
  stampHex: string;
  /** theirs came to you: tilted by stampLetterId; your own is flat */
  delivered: boolean;
  stampLetterId: string;
  stampA11y: string;
  isVoice: boolean;
  voiceKey: string;
  voiceDuration: string;
  /** the words shown (the translation while it is on); a voice letter's caption */
  body: string;
  size: number;
  line: number;
  center: boolean;
  /** "#tiny win"; "" for none */
  topic: string;
  topicHex: string;
  translates: boolean;
  translateCode: string;
  translateLabel: string;
  translateBusy: boolean;
  /** "3 LETTERS BETWEEN YOU ›"; "" when there are no earlier letters */
  betweenLabel: string;
  hideLabel: string;
  /** "REPLY ↓"; "" where nothing can be sent */
  replyLabel: string;
};

/** One earlier letter, signed. */
export type KReaderLetter = { key: string; mine: boolean; body: string; signature: string; isVoice: boolean; a11y: string };

export type KReaderStrings = {
  title: string;
  backLabel: string;
  /** "" hides the ⋯ */
  moreLabel: string;
  offlineTitle: string;
  offlineBody: string;
  /** where the reply bar was, when nothing can be sent; "" for the bar */
  closed: string;
  /** the reply bar is drawn */
  composer: boolean;
  placeholder: string;
  sendLabel: string;
  emojiLabel: string;
  playLabel: string;
  pauseLabel: string;
};

export type KReaderCommands = KStandardCommands & {
  composer: { canSend: boolean; hint: string; hintAlarm: boolean };
  /** failed: the voice card shows itself unavailable (no signed link at all) */
  playback: KStandardCommands["playback"] & { failed?: boolean };
};

export type KReaderViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    /** null while nothing is loaded */
    hero: KReaderHero | null;
    /** memoised, with a rev */
    earlier: KReaderLetter[];
    strings: KReaderStrings;
    onReaderBack?: () => void;
    /** the ⋯: the window y the report card drops from */
    onReaderMore?: (top: number) => void;
    onReaderTranslate?: () => void;
    onReaderText?: (value: string) => void;
    onReaderSend?: (value: string) => void;
    onReaderFocus?: (focused: boolean) => void;
    onReaderVoice?: (key: string) => void;
    onReaderStamp?: (action: "keep" | "report") => void;
  };

type NativeHero = Omit<KReaderHero, "faceFrost" | "mark" | "sign"> & { show: boolean; faceFrost: KFrost; mark: string; sign: string };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_HERO: NativeHero = {
  show: false,
  key: "",
  paper: "plain",
  faceKind: "none",
  faceUri: "",
  faceKey: "",
  faceOverscan: 0,
  faceMask: 0,
  faceFrost: nativeFrost(null),
  faceRound: false,
  faceSize: 24,
  memberStamp: "",
  name: "",
  mark: "",
  sign: "",
  when: "",
  postmark: "",
  state: "",
  tone: "mute",
  headA11y: "",
  stampId: "",
  stampHex: "",
  delivered: false,
  stampLetterId: "",
  stampA11y: "",
  isVoice: false,
  voiceKey: "",
  voiceDuration: "",
  body: "",
  size: 21,
  line: 33,
  center: false,
  topic: "",
  topicHex: "",
  translates: false,
  translateCode: "",
  translateLabel: "",
  translateBusy: false,
  betweenLabel: "",
  hideLabel: "",
  replyLabel: "",
};

/** The hero as Swift's flat record: show false for none, no window as NO_FROST, no mark or sign as "". */
export function nativeReaderHero(h: KReaderHero | null): NativeHero {
  if (!h) return NO_HERO;
  return { ...h, show: true, faceFrost: nativeFrost(h.faceFrost), mark: h.mark ?? "", sign: h.sign ?? "" };
}

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;

type NativeKReaderViewProps = Omit<
  KReaderViewProps,
  "letterFont" | "insets" | "rev" | "hero" | "onReaderBack" | "onReaderMore" | "onReaderTranslate" | "onReaderText" | "onReaderSend" | "onReaderFocus" | "onReaderVoice" | "onReaderStamp"
> &
  Required<Pick<KReaderViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    hero: NativeHero;
    onReaderBack?: None;
    onReaderMore?: Ev<{ top: number }>;
    onReaderTranslate?: None;
    onReaderText?: Ev<{ value: string }>;
    onReaderSend?: Ev<{ value: string }>;
    onReaderFocus?: Ev<{ focused: boolean }>;
    onReaderVoice?: Ev<{ key: string }>;
    onReaderStamp?: Ev<{ action: "keep" | "report" }>;
  };

// the view's JS name is the Swift struct's name (ios/Adapters/KConversationView.swift)
const NativeKReaderView = requireNativeView<NativeKReaderViewProps>("KindredlyUI", "KReaderView");

/** The bare SwiftUI reader. Only inside an @expo/ui <Host>; its ref takes commands. */
export const KReaderView = forwardRef<KScreenHandle, KReaderViewProps>(function KReaderView(
  { modifiers, letterFont, insets, rev, hero, onReaderBack, onReaderMore, onReaderTranslate, onReaderText, onReaderSend, onReaderFocus, onReaderVoice, onReaderStamp, ...rest },
  ref,
) {
  const sentHero = useMemo(() => nativeReaderHero(hero), [hero]);
  return (
    <NativeKReaderView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      hero={sentHero}
      onReaderBack={onReaderBack ? () => onReaderBack() : undefined}
      onReaderMore={onReaderMore ? (e) => onReaderMore(e.nativeEvent.top) : undefined}
      onReaderTranslate={onReaderTranslate ? () => onReaderTranslate() : undefined}
      onReaderText={onReaderText ? (e) => onReaderText(e.nativeEvent.value) : undefined}
      onReaderSend={onReaderSend ? (e) => onReaderSend(e.nativeEvent.value) : undefined}
      onReaderFocus={onReaderFocus ? (e) => onReaderFocus(e.nativeEvent.focused) : undefined}
      onReaderVoice={onReaderVoice ? (e) => onReaderVoice(e.nativeEvent.key) : undefined}
      onReaderStamp={onReaderStamp ? (e) => onReaderStamp(e.nativeEvent.action) : undefined}
    />
  );
});
