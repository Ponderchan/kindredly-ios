import { requireNativeView } from "expo";
import { forwardRef, useMemo, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle } from "./types";
import type { KMeAura } from "./Me";
import { nativeAuraArt, type KAuraArtData, type NativeAuraArt } from "./MePieces";

/* THE WRITING AURA ROOM AND ITS SHARE CARD (owner decision 2026-10-26, 1.0.7), drawn by SwiftUI
   (ios/Portable/Aura/KAuraRoomScreen.swift and KAuraShareScreen.swift, adapters
   ios/Adapters/KAuraView.swift), for src/screens/aura/AuraNative.tsx and AuraShareNative.tsx.
   Every word, count and colour comes in from TS (src/screens/aura/aura-model.ts builds them);
   Swift draws them and reports taps. The room keeps only the gesture's state (the lens, the page
   of the nine, the word picked, the sheets); the share card makes its own picture (a PNG in tmp)
   and reports its file:// URL with the tap.

   Each is a whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost, ignoring
   every safe area: no text field), and only after isKindredlyUIViewAvailable and the "aura" /
   "auracard" NativeSurface switch say so. Outside a Host it is a RedBox in dev and a CRASH in a
   release build. insets.top is the status bar, insets.bottom the home indicator. Pass the records
   memoised with a rev from useRev: Swift converts them once per rev.

   CHILDREN (the room only): exactly one <KIsland name="auraArt"> (the Aura card's inside × 110,
   as on Me: auraArtWidth(window − 32) × AURA_ART_H), on every render. */

/** One sticker as the React Native StickerChip draws it (sticker-copy stickerLook). */
export type KAuraSticker = {
  id: string;
  name: string;
  /** "#RRGGBB": the face, the name, the edge */
  bg: string;
  fg: string;
  border: string;
  /** a pill, or a tag with corners of 8 */
  pill: boolean;
  /** degrees, clockwise */
  tilt: number;
  /** still trying on: dashed, no fill */
  trying: boolean;
};

/** The read sheet: the piece split round the words the rule fired on. */
export type KAuraReading = { before: string; marked: string; after: string; from: string; name: string; line: string };

export type KAuraDim = {
  key: string;
  /** "01" */
  number: string;
  label: string;
  /** "DIMENSION 1 OF 9" */
  counter: string;
  name: string;
  line: string;
  /** ESTABLISHED / EMERGING, "" for none */
  state: string;
  established: boolean;
  /** your sentence, "" for none */
  quote: string;
  quoteFrom: string;
  /** the most lines the quote takes in the reader's Letter font */
  quoteLines: number;
  /** null: no "See the read" door */
  reading: KAuraReading | null;
};

export type KAuraWord = { word: string; count: number; tier: 0 | 1 | 2; green: boolean; hit: string };
export type KAuraPause = { label: string; count: number; fraction: number };
export type KAuraUsageItem = { sticker: KAuraSticker; line: string; privateLabel: string };
export type KAuraUsageGroup = { key: string; label: string; items: KAuraUsageItem[] };

export type KAuraRoomStrings = {
  title: string;
  back: string;
  share: string;
  /** PORTRAIT, DIMENSIONS, HABITS */
  tabs: string[];
  allDims: string;
  swipe: string;
  prev: string;
  next: string;
  seeRead: string;
  readTitle: string;
  nine: string;
  nineSub: string;
  close: string;
  scope: string;
  wordsTitle: string;
  wordsNone: string;
  wordsHint: string;
  pausesTitle: string;
  pausesHint: string;
  extrasLabel: string;
  usageNoneLabel: string;
  usageNone: string;
  scopeRow: string;
  scopeTitle: string;
  scopeLetters: string;
  scopeLettersSub: string;
  included: string;
  scopeSealed: string;
  scopeSealedSub: string;
  scopeNote: string;
  done: string;
};

export type KAuraRoomData = {
  /** false until the first read lands */
  ready: boolean;
  /** the Aura card, Me's record (MeNative nativeAura) */
  card: KMeAura;
  /** the card's call to action opens DIMENSIONS (true) or writes a letter (onWrite) */
  ctaOpensRoom: boolean;
  dims: KAuraDim[];
  fromPieces: string;
  words: KAuraWord[];
  pauses: KAuraPause[];
  extras: KAuraUsageItem[];
  groups: KAuraUsageGroup[];
  sealedOn: boolean;
};

export type KAuraLens = "portrait" | "dims" | "habits";

export type KAuraRoomViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KAuraRoomStrings;
    data: KAuraRoomData;
    /** the lens to open on (read when the view first draws) */
    initialLens?: KAuraLens;
    onBack?: () => void;
    onShare?: () => void;
    onWrite?: () => void;
    /** the scope sheet's Done: sealed pages in or out */
    onScope?: (sealed: boolean) => void;
    /** the one <KIsland name="auraArt"> */
    children?: ReactNode;
    /** the card's picture drawn by Swift instead of the island ("auraart", MePieces.tsx);
        absent or `on` false keeps the island */
    auraArt?: KAuraArtData | null;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;
type NativeImage = { uri: string; key: string; kind: "image" | "videoPoster" };
type NativeDim = Omit<KAuraDim, "reading"> & { hasReading: boolean; reading: KAuraReading };

type NativeRoomProps = Omit<KAuraRoomViewProps, "letterFont" | "insets" | "rev" | "data" | "initialLens" | "onBack" | "onShare" | "onWrite" | "onScope" | "auraArt"> &
  Required<Pick<KAuraRoomViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    data: Omit<KAuraRoomData, "dims"> & { dims: NativeDim[] };
    initialLens: KAuraLens;
    onRoomBack?: None;
    onRoomShare?: None;
    onRoomWrite?: None;
    onRoomScope?: Ev<{ sealed: boolean }>;
    auraArt: NativeAuraArt;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: NativeImage = { uri: "", key: "", kind: "image" };
const NO_READING: KAuraReading = { before: "", marked: "", after: "", from: "", name: "", line: "" };
const image = (r: KImageRefProps | null | undefined): NativeImage => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : NO_IMAGE);

/** A dimension as the Swift record takes it (a record field can't be null). */
export const nativeDim = (d: KAuraDim): NativeDim => ({ ...d, hasReading: !!d.reading, reading: d.reading ?? NO_READING });

// the views' JS names are the Swift structs' names (ios/Adapters/KAuraView.swift)
const NativeKAuraRoomView = requireNativeView<NativeRoomProps>("KindredlyUI", "KAuraRoomView");

/** The bare SwiftUI room. Only inside an @expo/ui <Host>; the auraArt island as its child. */
export const KAuraRoomView = forwardRef<KScreenHandle, KAuraRoomViewProps>(function KAuraRoomView(
  { modifiers, letterFont, insets, rev, data, initialLens, onBack, onShare, onWrite, onScope, auraArt, ...rest },
  ref,
) {
  // follows the data's identity, so a render that changes nothing else doesn't send it again
  const sent = useMemo(() => ({ ...data, dims: data.dims.map(nativeDim) }), [data]);
  const sentArt = useMemo(() => nativeAuraArt(auraArt), [auraArt]);
  return (
    <NativeKAuraRoomView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      data={sent}
      initialLens={initialLens ?? "portrait"}
      auraArt={sentArt}
      onRoomBack={onBack ? () => onBack() : undefined}
      onRoomShare={onShare ? () => onShare() : undefined}
      onRoomWrite={onWrite ? () => onWrite() : undefined}
      onRoomScope={onScope ? (e) => onScope(!!e.nativeEvent.sealed) : undefined}
    />
  );
});

/* ── the share card ── */

export type KAuraArtKind = "scene" | "sketch" | "empty" | "lines";

export type KAuraTicket = {
  /** false until the aura is read: the page without the card */
  ready: boolean;
  /** KINDREDLY */
  brand: string;
  label: string;
  meInWords: string;
  artKind: KAuraArtKind;
  /** the scene or sketch (a bundled PNG as a file), null for none */
  artImage: KImageRefProps | null;
  /** the face drawn when the picture is missing */
  artMask: number;
  name: string;
  stickers: KAuraSticker[];
  desc: string;
  formedFrom: string;
  /** your face (FACE v1 mask, develop 1) */
  faceMask: number;
  /** what VoiceOver reads for the card */
  a11y: string;
};

export type KAuraShareStrings = { title: string; back: string; share: string; save: string; working: string; readingFrom: string; onlyCard: string };

export type KAuraShareViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KAuraShareStrings;
    ticket: KAuraTicket;
    /** "" | "share" | "save": TS is busy with that act */
    busy: "" | "share" | "save";
    /** Wren for the foot */
    bird: KImageRefProps | null;
    onBack?: () => void;
    /** the card's picture as a file:// URL, "" if it couldn't be made */
    onShare?: (uri: string) => void;
    onSave?: (uri: string) => void;
  };

type NativeShareProps = Omit<KAuraShareViewProps, "letterFont" | "insets" | "rev" | "ticket" | "bird" | "onBack" | "onShare" | "onSave"> &
  Required<Pick<KAuraShareViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    ticket: Omit<KAuraTicket, "artImage"> & { artImage: NativeImage };
    bird: NativeImage;
    onCardBack?: None;
    onCardShare?: Ev<{ uri: string }>;
    onCardSave?: Ev<{ uri: string }>;
  };

const NativeKAuraShareView = requireNativeView<NativeShareProps>("KindredlyUI", "KAuraShareView");

/** The bare SwiftUI share card. Only inside an @expo/ui <Host>. */
export const KAuraShareView = forwardRef<KScreenHandle, KAuraShareViewProps>(function KAuraShareView(
  { modifiers, letterFont, insets, rev, ticket, bird, onBack, onShare, onSave, ...rest },
  ref,
) {
  const sentTicket = useMemo(() => ({ ...ticket, artImage: image(ticket.artImage) }), [ticket]);
  const sentBird = useMemo(() => image(bird), [bird]);
  return (
    <NativeKAuraShareView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      ticket={sentTicket}
      bird={sentBird}
      onCardBack={onBack ? () => onBack() : undefined}
      onCardShare={onShare ? (e) => onShare(e.nativeEvent.uri ?? "") : undefined}
      onCardSave={onSave ? (e) => onSave(e.nativeEvent.uri ?? "") : undefined}
    />
  );
});
