import { requireNativeView } from "expo";
import { forwardRef, useMemo, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KChatTrace } from "./Conversation";
import type { KPostMediaSlot } from "./MediaPieces";

import { REEL_OFF, nativeReel, type KReelSpec, type NativeReelSpec } from "./Reel";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle, KStandardCommands } from "./types";

/* WREN'S ROOM, drawn by SwiftUI (2026-10-27; ios/Portable/WrenRoom/KWrenRoomScreen.swift, adapter
   ios/Adapters/KWrenRoomView.swift), for src/screens/wren-room/WrenRoomNative.tsx.

   Every row arrives worded (screens/wren-room wren-room-model wrenRoomRows plus the host's words);
   Swift lays them out. One uncontrolled field, target "body" (KComposerField's contract): TS
   hears every edit through onText, sends canSend with the composer command, empties or seeds it
   with setText and gives it the keyboard with focus. The ⊕'s tray is Swift's (the kindred room's
   KChatTray); its cards come back as onHand. TS asks for the end for the reader's own new line
   (scrollTo end); Swift follows the end by itself only while at it.

   Children: one <KIsland name={card.slot} interactive> per card, the reel square (React Native:
   ReelSquare with a guide's or a release's reel), cardWidth - 2 square, every render, in the
   transcript's order.

   A whole screen with a text field: alone in one @expo/ui <Host> that keeps the keyboard's safe
   area (SurfaceHost field), only after isKindredlyUIViewAvailable("KWrenRoomView") and the
   "wrenroom" NativeSurface switch say so. */

export type KWrenRoomStrings = {
  name: string;
  /** her role, in capitals */
  role: string;
  /** VoiceOver for the back chevron */
  backLabel: string;
  emptyLine: string;
  /** HOW THINGS WORK */
  chipsHead: string;
  /** More; "" once every guide shows */
  moreLabel: string;
  /** the line about where your words go; "" with no mail */
  mailNote: string;
  /** VoiceOver for a picture */
  photoOpen: string;
  placeholder: string;
  /** A BUG / AN IDEA while one is being written; "" for none */
  modeLabel: string;
  modeCloseLabel: string;
  plusLabel: string;
  plusCloseLabel: string;
  sendLabel: string;
};

/** A big card: a guide she answered with, or a release's what's new. */
export type KWrenRoomCard = {
  /** the reel island's name */
  slot: string;
  title: string;
  body: string;
  cta: string;
  /** "Not it?" under a guide she guessed from a question; "" for none */
  notIt: string;
  sendOn: string;
  /** batch 3 (behind "reels"): the reel Swift draws in the square instead of the island; null or absent keeps the island */
  reel?: KReelSpec | null;
};

/** One row of the transcript, worded. */
export type KWrenRoomRow = {
  key: string;
  dayLabel: string;
  first: boolean;
  label: string;
  labelMine: boolean;
  labelUnderDay: boolean;
  question: string;
  answerLabel: string;
  body: string;
  mine: boolean;
  hasPhoto: boolean;
  /** the signed picture; null while it is being signed */
  photo: KImageRefProps | null;
  /** "Open ›"; "" for none */
  link: string;
  card: KWrenRoomCard | null;
};

export type KWrenRoomChip = { id: string; title: string };

/** The commands this page takes: the standard setText / focus / blur on "body", scrollTo end, and
    the composer's canSend. */
export type KWrenRoomCommands = Pick<KStandardCommands, "setText" | "focus" | "blur" | "scrollTo"> & {
  composer: { canSend: boolean };
};

export type KWrenRoomViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KWrenRoomStrings;
    /** her official snapshot (the header) */
    bird: KImageRefProps | null;
    /** her curious official snapshot (the empty room) */
    emptyBird: KImageRefProps | null;
    rows: KWrenRoomRow[];
    chips: KWrenRoomChip[];
    traces: KChatTrace[];
    /** a card's width, its 1pt edge included */
    cardWidth: number;
    onBack?: () => void;
    onText?: (text: string) => void;
    onSend?: (text: string) => void;
    onModeClose?: () => void;
    onHand?: (key: string) => void;
    onPhoto?: (key: string) => void;
    onLink?: (key: string) => void;
    onCardCta?: (key: string) => void;
    onNotIt?: (key: string) => void;
    onChip?: (id: string) => void;
    onMore?: () => void;
    /** the reel islands */
    children?: ReactNode;
    /** batch 3 ("postmedia", off by default): the squares Swift draws itself, by slot; a slot
        listed here has no island. Only where isKindredlyUIViewAvailable("KPostMediaView"). */
    media?: KPostMediaSlot[];
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;
type Key = Ev<{ key: string }>;

type NativeCard = Omit<KWrenRoomCard, "reel"> & { reel: NativeReelSpec };
type NativeRow = Omit<KWrenRoomRow, "photo" | "card"> & { photo: KImageRefProps; hasCard: boolean; card: NativeCard };

type NativeKWrenRoomViewProps = Omit<
  KWrenRoomViewProps,
  | "letterFont"
  | "insets"
  | "rev"
  | "bird"
  | "emptyBird"
  | "rows"
  | "onBack"
  | "onText"
  | "onSend"
  | "onModeClose"
  | "onHand"
  | "onPhoto"
  | "onLink"
  | "onCardCta"
  | "onNotIt"
  | "onChip"
  | "onMore"
> &
  Required<Pick<KWrenRoomViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    bird: KImageRefProps;
    emptyBird: KImageRefProps;
    rows: NativeRow[];
    onWrBack?: None;
    onWrText?: Ev<{ text: string }>;
    onWrSend?: Ev<{ text: string }>;
    onWrModeClose?: None;
    onWrHand?: Key;
    onWrPhoto?: Key;
    onWrLink?: Key;
    onWrCta?: Key;
    onWrNotIt?: Key;
    onWrChip?: Ev<{ id: string }>;
    onWrMore?: None;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: KImageRefProps = { uri: "", key: "", kind: "image" };
const NO_CARD: NativeCard = { slot: "", title: "", body: "", cta: "", notIt: "", sendOn: "", reel: REEL_OFF };
const imageOf = (r: KImageRefProps | null): KImageRefProps => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : NO_IMAGE);
const nativeCard = (c: KWrenRoomCard | null): NativeCard => (c ? { ...c, reel: nativeReel(c.reel) } : NO_CARD);
const nativeRow = (r: KWrenRoomRow): NativeRow => ({ ...r, photo: imageOf(r.photo), hasCard: !!r.card, card: nativeCard(r.card) });

const NativeKWrenRoomView = requireNativeView<NativeKWrenRoomViewProps>("KindredlyUI", "KWrenRoomView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. Give it useKCommands(...).ref. */
export const KWrenRoomView = forwardRef<KScreenHandle, KWrenRoomViewProps>(function KWrenRoomView(
  { modifiers, letterFont, insets, rev, bird, emptyBird, rows, onBack, onText, onSend, onModeClose, onHand, onPhoto, onLink, onCardCta, onNotIt, onChip, onMore, ...rest },
  ref,
) {
  const b = useMemo(() => imageOf(bird), [bird]);
  const eb = useMemo(() => imageOf(emptyBird), [emptyBird]);
  const nativeRows = useMemo(() => rows.map(nativeRow), [rows]);
  return (
    <NativeKWrenRoomView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      bird={b}
      emptyBird={eb}
      rows={nativeRows}
      onWrBack={onBack ? () => onBack() : undefined}
      onWrText={onText ? (e) => onText(e.nativeEvent.text) : undefined}
      onWrSend={onSend ? (e) => onSend(e.nativeEvent.text) : undefined}
      onWrModeClose={onModeClose ? () => onModeClose() : undefined}
      onWrHand={onHand ? (e) => onHand(e.nativeEvent.key) : undefined}
      onWrPhoto={onPhoto ? (e) => onPhoto(e.nativeEvent.key) : undefined}
      onWrLink={onLink ? (e) => onLink(e.nativeEvent.key) : undefined}
      onWrCta={onCardCta ? (e) => onCardCta(e.nativeEvent.key) : undefined}
      onWrNotIt={onNotIt ? (e) => onNotIt(e.nativeEvent.key) : undefined}
      onWrChip={onChip ? (e) => onChip(e.nativeEvent.id) : undefined}
      onWrMore={onMore ? () => onMore() : undefined}
    />
  );
});
