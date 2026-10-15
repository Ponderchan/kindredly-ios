import { requireNativeView } from "expo";
import { forwardRef, memo, useMemo, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KInsets, KMenuAction, KScreenBaseProps, KScreenHandle, KStandardCommands } from "./types";

/* THE TODAY TAB, drawn by SwiftUI (ios/Portable/Today/KTodayDesk.swift, adapter
   ios/Adapters/KTodayView.swift), for src/screens/today/TodayNative.tsx. Every word, date, count
   and menu comes in from TS (src/screens/today/today-cards.ts builds the cards); Swift draws them
   and reports taps. Swift keeps only the gesture's and the keyboard's state: the card the stack
   settled on, the scroll, the field's focus.

   It is a whole screen: put it alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost field in
   src/components/NativeSurface.tsx: ignoreSafeArea "container", so the keyboard's safe area stays
   and the reply strip rides it), and only after isKindredlyUIViewAvailable("KTodayView") and the
   "today" NativeSurface switch say so. Outside a Host it is a RedBox in dev and a CRASH in a
   release build. Its ref is a KScreenHandle: give it `commands.ref` from
   useKCommands<KTodayCommands>(ref, { blurOnUnmount: true, onViewAttach }) and reseed the bound
   letter's draft in onViewAttach (a remounted view starts with an empty field).

   insets.top is the status bar; insets.tabBarRoom the floating bar's room (the pill sits 6 above
   it). Pass `cards` memoised with a rev from useRev — apart from the drafts, so typing never
   re-sends fifteen letters. Anything that changes often (the composer's key and hint, focus,
   playback, scroll requests, the cord's lock, text seeds) goes through commands, never props.

   Islands go in as children, every one on every render, in this order: <KIsland name="deskBird">,
   <KIsland name="arrivalBird">, and the end page's <KSlot name="endPage"> (src/Slot.tsx). */

/** The one capsule slot at a card's foot. */
export type KTodayCapsule = {
  kind: "none" | "translate" | "signal";
  code?: string;
  label?: string;
  enabled?: boolean;
  value?: string;
  glyph?: "rings" | "clock" | "stickers";
};

/** One desk letter (today-cards CardVM, without what Swift doesn't draw). */
export type KTodayCard = {
  id: string;
  postmark: string;
  mask: number;
  ghost: boolean;
  stampId: string;
  stampHex: string;
  stampName: string;
  topic: string;
  topicWash: string;
  topicInk: string;
  topicLine: string;
  body: string;
  bodySize: number;
  bodyLine: number;
  bodyCenter: boolean;
  isVoice: boolean;
  voiceReady: boolean;
  caption: string;
  durationLabel: string;
  capsule: KTodayCapsule;
  menu: KMenuAction[];
  a11yLabel: string;
};

/** Her first return: the line and the three envelopes, with what VoiceOver says of each. */
export type KTodayArrival = {
  open: boolean;
  line: string;
  states: ("opened" | "current" | "sealed")[];
  labels: string[];
  values: string[];
};

/** Every word on the desk that isn't on a card. */
export type KTodayStrings = {
  title: string;
  /** CLOSED / ALL READ / "" */
  rightLabel: string;
  /** the desk strip's line; "" draws none */
  deskStrip: string;
  pass: string;
  reply: string;
  replyA11y: string;
  unfold: string;
  unfoldA11y: string;
  voiceLetter: string;
  more: string;
  next: string;
  previous: string;
  play: string;
  pause: string;
  placeholder: string;
  send: string;
};

/** Where the reader's page goes after the cards changed under it: the card now in its place ("" = the end page). */
export type KTodayAnchor = { id: string; serial: number };

/** The reply strip's state for the bound letter, sent on every change. */
export type KTodayComposer = {
  letterId: string;
  sendState: "disabled" | "enabled" | "dimmed";
  hint: string;
  hintWarn: boolean;
  preview: string;
  sending: boolean;
  /** the last send press answered (its serial from onReplySend) */
  sendSerial: number;
};

/** The Today view's commands. */
export type KTodayCommands = Omit<KStandardCommands, "scrollTo" | "composer" | "playback"> & {
  scrollTo: { key: "top" | (string & {}); animated?: boolean };
  composer: KTodayComposer;
  playback: { key: string; playing: boolean; positionS: number; durationS: number; at: number; failed: boolean };
  lock: { held: boolean };
};

export type KTodayCardAction = "unfold" | "translate" | "report" | "block" | "voice";

export type KTodayViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KTodayStrings;
    arrival: KTodayArrival;
    cards: KTodayCard[];
    freshUnfold: boolean;
    endPage: boolean;
    pillHidden: boolean;
    anchor: KTodayAnchor;
    onCardIndex?: (index: number) => void;
    onReplyChange?: (letterId: string, text: string) => void;
    onReplySend?: (letterId: string, text: string, serial: number) => void;
    onReplyFocus?: (focused: boolean) => void;
    onCardAction?: (letterId: string, action: KTodayCardAction) => void;
    onDeskStrip?: () => void;
    onEnvelope?: (index: number) => void;
    /** the three islands, every one on every render */
    children?: ReactNode;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;

type NativeCapsule = Required<KTodayCapsule>;
type NativeCard = Omit<KTodayCard, "capsule" | "menu"> & { capsule: NativeCapsule; menu: { key: string; title: string; icon: string; destructive: boolean }[] };

type NativeKTodayViewProps = Omit<
  KTodayViewProps,
  "letterFont" | "insets" | "rev" | "cards" | "onCardIndex" | "onReplyChange" | "onReplySend" | "onReplyFocus" | "onCardAction" | "onDeskStrip" | "onEnvelope"
> &
  Required<Pick<KTodayViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    cards: NativeCard[];
    onTodayCardIndex?: Ev<{ index: number }>;
    onTodayReplyChange?: Ev<{ letterId: string; text: string }>;
    onTodayReplySend?: Ev<{ letterId: string; text: string; serial: number }>;
    onTodayReplyFocus?: Ev<{ focused: boolean }>;
    onTodayCardAction?: Ev<{ letterId: string; action: KTodayCardAction }>;
    onTodayDeskStrip?: Ev<Record<string, never>>;
    onTodayEnvelope?: Ev<{ index: number }>;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };

/** Cards as the Swift records want them: every field present (a @Field record can't take null). */
export function nativeTodayCards(cards: readonly KTodayCard[]): NativeCard[] {
  return cards.map((c) => ({
    ...c,
    capsule: {
      kind: c.capsule.kind,
      code: c.capsule.code ?? "",
      label: c.capsule.label ?? "",
      enabled: c.capsule.enabled ?? true,
      value: c.capsule.value ?? "",
      glyph: c.capsule.glyph ?? "rings",
    },
    menu: c.menu.map((m) => ({ key: m.key, title: m.title, icon: m.icon, destructive: m.destructive ?? false })),
  }));
}

// the view's JS name is the Swift struct's name (ios/Adapters/KTodayView.swift)
const NativeKTodayView = requireNativeView<NativeKTodayViewProps>("KindredlyUI", "KTodayView");

/** The bare SwiftUI screen. Only inside an @expo/ui <Host>; its ref takes commands. Memoised: a
    render of the screen that changes none of its props (a keystroke) doesn't reach the native
    view, whose every props update re-converts the whole map. */
export const KTodayView = memo(
  forwardRef<KScreenHandle, KTodayViewProps>(function KTodayView(
    { modifiers, letterFont, insets, rev, cards, onCardIndex, onReplyChange, onReplySend, onReplyFocus, onCardAction, onDeskStrip, onEnvelope, ...rest },
    ref,
  ) {
    const sent = useMemo(() => nativeTodayCards(cards), [cards]);
    return (
      <NativeKTodayView
        ref={ref}
        modifiers={modifiers}
        // lets event modifiers (onTapGesture, onAppear…) reach this view, as @expo/ui's own views do
        {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
        {...rest}
        // always sent, so Swift never sees a base prop go missing
        letterFont={letterFont ?? "newsreader"}
        insets={insets ?? NO_INSETS}
        rev={rev ?? 0}
        cards={sent}
        onTodayCardIndex={onCardIndex ? (e) => onCardIndex(e.nativeEvent.index) : undefined}
        onTodayReplyChange={onReplyChange ? (e) => onReplyChange(e.nativeEvent.letterId, e.nativeEvent.text) : undefined}
        onTodayReplySend={onReplySend ? (e) => onReplySend(e.nativeEvent.letterId, e.nativeEvent.text, e.nativeEvent.serial) : undefined}
        onTodayReplyFocus={onReplyFocus ? (e) => onReplyFocus(e.nativeEvent.focused) : undefined}
        onTodayCardAction={onCardAction ? (e) => onCardAction(e.nativeEvent.letterId, e.nativeEvent.action) : undefined}
        onTodayDeskStrip={onDeskStrip ? () => onDeskStrip() : undefined}
        onTodayEnvelope={onEnvelope ? (e) => onEnvelope(e.nativeEvent.index) : undefined}
      />
    );
  }),
);
