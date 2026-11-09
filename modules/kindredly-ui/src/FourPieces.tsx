import { requireNativeView } from "expo";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import { nativeChatHeader, type KChatDockAction, type KChatHeader } from "./Conversation";
import type { KImageRefProps, KInsets, KScreenBaseProps } from "./types";

/* FOUR PIECES IN SWIFTUI (2026-11-09, the third Swift batch), each behind its own switch
   (src/lib/surfaces.ts, off by default) with its React Native piece kept as the fallback:
   ios/Adapters/KFourPiecesView.swift → ios/Portable.

   - KRatingAskView ("ratingask"): the inside of the rating ask's Modal (src/components/RatingAsk.tsx,
     Portable/Today/KRatingAsk.swift): the dim and one of the two sheets. Fills a Host.
   - KFCReceiptView ("fcreceipt"): the First Class receipt over the paywall
     (src/components/FirstClassWelcome.tsx, Portable/Kit/KFCReceipt.swift). Fills a Host laid over
     the page.
   - KChatHeaderView ("chatheader"): a conversation's header alone. The revealed pen-pal header is
     drawn by KConversationView itself (its header record's `revealed`); this view is the binary's
     marker for it (isKindredlyUIViewAvailable) and a dev page's way to see it.
   - KLetterInFlightView ("inflight"): the crossing alone. KLetterReaderView draws it at its foot
     from its `inflight` record; this view is the marker, and a dev page's.

   Every word, number and rule is TS's; Swift draws and reports taps. Outside a Host each is a
   RedBox in dev and a CRASH in a release build: only after the switch and
   isKindredlyUIViewAvailable(view) say so. */

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: KImageRefProps = { uri: "", key: "", kind: "image" };
const imageOf = (r: KImageRefProps | null | undefined): KImageRefProps => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : NO_IMAGE);

/* ── the crossing ─────────────────────────────────────────────────────── */

/** The crossing (components/LetterInFlight), as KLetterReaderView's `inflight` and
    KLetterInFlightView take it. */
export type KLetterInFlightData = {
  /** who it flies to, in capitals ("JUNO"); "" for nobody named */
  to: string;
  /** the headwind line, in capitals (net.slow); "" while the send isn't slow */
  slow: string;
  /** "ON ITS WAY" (ld.onItsWay), the still row's words under Reduce Motion */
  onItsWay: string;
  /** the crossing's length in ms (LetterInFlight INFLIGHT_CYCLE_MS) */
  cycleMs: number;
  /** her flying at 34 (bird-images inflightFly34), null until captured */
  bird: KImageRefProps | null;
  /** her flying at 26 (inflightStill26) for the still row, null until captured */
  stillBird: KImageRefProps | null;
};

export type NativeInFlight = Omit<KLetterInFlightData, "bird" | "stillBird"> & { on: boolean; bird: KImageRefProps; stillBird: KImageRefProps };

const IN_FLIGHT_OFF: NativeInFlight = Object.freeze({ on: false, to: "", slow: "", onItsWay: "", cycleMs: 930, bird: NO_IMAGE, stillBird: NO_IMAGE });

/** The record Swift reads (on: false keeps the island). */
export const nativeInFlight = (d: KLetterInFlightData | null | undefined): NativeInFlight =>
  d ? { ...d, on: true, bird: imageOf(d.bird), stillBird: imageOf(d.stillBird) } : IN_FLIGHT_OFF;

export type KLetterInFlightViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme"> & {
    inflight: KLetterInFlightData;
    /** a new value flies her again */
    play?: number;
  };

type NativeInFlightProps = Omit<KLetterInFlightViewProps, "inflight"> & { letterFont: string; inflight: NativeInFlight; play: number };
const NativeKLetterInFlightView = requireNativeView<NativeInFlightProps>("KindredlyUI", "KLetterInFlightView");

/** The crossing alone (a dev page). Only inside an @expo/ui <Host>. */
export function KLetterInFlightView({ modifiers, inflight, play, ...rest }: KLetterInFlightViewProps) {
  return (
    <NativeKLetterInFlightView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont="newsreader"
      inflight={nativeInFlight(inflight)}
      play={play ?? 0}
    />
  );
}

/* ── the rating ask ───────────────────────────────────────────────────── */

export type KRatingAskStrings = {
  /** the filled key's words, without the ★ (Swift draws "★  " before them, as React Native) */
  cta: string;
  later: string;
  /** A: the stamp's line, the label over the letter, the P.S. */
  stamp: string;
  label: string;
  ps: string;
  /** B: what she says in the bubble, the card's head and the courier's line beside it */
  say: string;
  reviewLabel: string;
  who: string;
};

export type KRatingAskRow = { label: string; value: string; warn: boolean };

export type KRatingAskViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme" | "letterFont"> & {
    /** B, Wren's review; false: A, the founder's letter */
    review: boolean;
    /** the room under the sheet: max(the home indicator − 26, 8) */
    bottom: number;
    strings: KRatingAskStrings;
    /** A: hi, the three paragraphs, the signature */
    paragraphs: string[];
    /** B: the review's rows */
    rows: KRatingAskRow[];
    /** bird-images rateStamp50 / rateWorry118, null until captured */
    stampBird: KImageRefProps | null;
    worryBird: KImageRefProps | null;
    onTap?: () => void;
    onLater?: () => void;
  };

type NativeAskProps = Omit<KRatingAskViewProps, "letterFont" | "stampBird" | "worryBird" | "onTap" | "onLater"> & {
  letterFont: string;
  stampBird: KImageRefProps;
  worryBird: KImageRefProps;
  onAskTap?: None;
  onAskLater?: None;
};
const NativeKRatingAskView = requireNativeView<NativeAskProps>("KindredlyUI", "KRatingAskView");

/** The rating ask's dim and sheet. Only inside an @expo/ui <Host> (SurfaceHost). */
export function KRatingAskView({ modifiers, letterFont, stampBird, worryBird, onTap, onLater, ...rest }: KRatingAskViewProps) {
  return (
    <NativeKRatingAskView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      stampBird={imageOf(stampBird)}
      worryBird={imageOf(worryBird)}
      onAskTap={onTap ? () => onTap() : undefined}
      onAskLater={onLater ? () => onLater() : undefined}
    />
  );
}

/* ── the First Class receipt ──────────────────────────────────────────── */

export type KFCReceiptWords = {
  /** the lime sticker (fc2.rc.stFirst) */
  first: string;
  /** the gold sticker and the lavender one (receiptWords) */
  gold: string;
  lav: string;
  title: string;
  body: string;
  /** Start writing (fc2.rc.go) */
  go: string;
  /** VoiceOver's name for the dim (fc2.rc.close) */
  close: string;
};

export type KFCReceiptViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme" | "insets"> & {
    words: KFCReceiptWords;
    /** the dim */
    onDone?: () => void;
    /** Start writing */
    onWrite?: () => void;
  };

type NativeReceiptProps = Omit<KFCReceiptViewProps, "insets" | "onDone" | "onWrite"> & {
  letterFont: string;
  insets: KInsets;
  onReceiptDone?: None;
  onReceiptWrite?: None;
};
const NativeKFCReceiptView = requireNativeView<NativeReceiptProps>("KindredlyUI", "KFCReceiptView");

/** The receipt's dim and card. Only inside an @expo/ui <Host> laid over the page. */
export function KFCReceiptView({ modifiers, insets, onDone, onWrite, ...rest }: KFCReceiptViewProps) {
  return (
    <NativeKFCReceiptView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont="newsreader"
      insets={insets ?? NO_INSETS}
      onReceiptDone={onDone ? () => onDone() : undefined}
      onReceiptWrite={onWrite ? () => onWrite() : undefined}
    />
  );
}

/* ── a conversation's header alone ────────────────────────────────────── */

export type KChatHeaderViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme" | "insets"> & {
    header: KChatHeader;
    onDock?: (action: KChatDockAction) => void;
  };

type NativeHeaderProps = Omit<KChatHeaderViewProps, "insets" | "header" | "onDock"> & {
  letterFont: string;
  insets: KInsets;
  header: ReturnType<typeof nativeChatHeader>;
  onChatDock?: Ev<{ action: KChatDockAction }>;
};
const NativeKChatHeaderView = requireNativeView<NativeHeaderProps>("KindredlyUI", "KChatHeaderView");

/** A conversation's header alone (a dev page). Only inside an @expo/ui <Host>. */
export function KChatHeaderView({ modifiers, insets, header, onDock, ...rest }: KChatHeaderViewProps) {
  return (
    <NativeKChatHeaderView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont="newsreader"
      insets={insets ?? NO_INSETS}
      header={nativeChatHeader(header)}
      onChatDock={onDock ? (e) => onDock(e.nativeEvent.action) : undefined}
    />
  );
}
