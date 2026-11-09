import { requireNativeView } from "expo";
import { useMemo } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KScreenBaseProps } from "./types";

/* PICTURES AND FILMS, drawn by SwiftUI (batch 3, 2026-11-09), each behind its own switch
   (src/lib/surfaces.ts, off by default) with its React Native piece kept for when it is off:
   - "frameviewer": one frame full screen over the Notes composer (ios/Portable/Notes/
     KFrameViewer.swift), KFrameViewerView below, inside the React Native Modal FrameViewer always
     had (src/components/FrameViewerSwift.tsx);
   - "notefilm" / "notevoice": a journal page's film and voice card, drawn by KNotePageView itself
     (its swiftFilm prop and `voice` command, src/NotePages.tsx; ios/Portable/Notes/KNoteFilm.swift,
     Portable/Voice/KVoiceSlot.swift);
   - "postmedia": a Wren post's picture or film, drawn by KWrenRoomView itself (its media prop,
     src/WrenRoom.tsx; ios/Portable/WrenRoom/KPostMediaSquare.swift).
   KNoteFilmView and KPostMediaView are the binary's markers for the last three (ask
   isKindredlyUIViewAvailable before handing a page the prop: an older binary would ignore it
   and leave the slot empty); each also draws its piece alone. Every view needs an @expo/ui <Host>. */

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: KImageRefProps = { uri: "", key: "", kind: "image" };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;

/* ── one frame, full screen ────────────────────────────────────────────── */

export type KFrameViewerStrings = {
  /** VoiceOver for the ‹ */
  backLabel: string;
  /** VoiceOver for the bin */
  removeLabel: string;
  /** under the first picture */
  isCover: string;
  /** the capsule under any other */
  makeCover: string;
};

export type KFrameViewerPhoto = {
  image: KImageRefProps | null;
  /** VoiceOver ("Photo 2 of 5") */
  a11y: string;
};

export type KFrameViewerViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    photos: KFrameViewerPhoto[];
    /** the picture to show: where it opened, or where to go after one went */
    index: number;
    strings: KFrameViewerStrings;
    onClose?: () => void;
    onCover?: (index: number) => void;
    onRemove?: (index: number) => void;
  };

type NativeKFrameViewerViewProps = Omit<KFrameViewerViewProps, "letterFont" | "insets" | "rev" | "photos" | "onClose" | "onCover" | "onRemove"> &
  Required<Pick<KFrameViewerViewProps, "letterFont" | "insets" | "rev">> & {
    photos: { image: KImageRefProps; a11y: string }[];
    onFvClose?: None;
    onFvCover?: Ev<{ index: number }>;
    onFvRemove?: Ev<{ index: number }>;
  };

const NativeKFrameViewerView = requireNativeView<NativeKFrameViewerViewProps>("KindredlyUI", "KFrameViewerView");

/** The bare SwiftUI frame viewer. Only inside an @expo/ui <Host>. */
export function KFrameViewerView({ modifiers, letterFont, insets, rev, photos, onClose, onCover, onRemove, ...rest }: KFrameViewerViewProps) {
  // a Swift record can't take null: no picture is an empty ref
  const sent = useMemo(() => photos.map((p) => ({ image: p.image ? { uri: p.image.uri, key: p.image.key, kind: p.image.kind ?? "image" } : NO_IMAGE, a11y: p.a11y })), [photos]);
  return (
    <NativeKFrameViewerView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      photos={sent}
      onFvClose={onClose ? () => onClose() : undefined}
      onFvCover={onCover ? (e) => onCover(e.nativeEvent.index) : undefined}
      onFvRemove={onRemove ? (e) => onRemove(e.nativeEvent.index) : undefined}
    />
  );
}

/* ── a journal page's film ("notefilm") ────────────────────────────────── */

/** The film KNotePageView draws itself (its swiftFilm prop); url "" keeps the island. */
export type KNoteFilmData = {
  /** file://, https://, or a bare absolute path */
  url: string;
  /** VoiceOver while stopped (jt.play) */
  playLabel: string;
  /** VoiceOver while playing (jt.pause) */
  pauseLabel: string;
};

export const NOTE_FILM_OFF: KNoteFilmData = { url: "", playLabel: "", pauseLabel: "" };

export type KNoteFilmViewProps = CommonViewModifierProps & Pick<KScreenBaseProps, "theme"> & KNoteFilmData;

const NativeKNoteFilmView = requireNativeView<KNoteFilmViewProps>("KindredlyUI", "KNoteFilmView");

/** The film alone (the "notefilm" marker). Only inside an @expo/ui <Host>. */
export function KNoteFilmView({ modifiers, ...rest }: KNoteFilmViewProps) {
  return <NativeKNoteFilmView modifiers={modifiers} {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)} {...rest} />;
}

/* ── a Wren post's picture or film ("postmedia") ───────────────────────── */

/** A card's square that KWrenRoomView draws itself (its media prop) instead of the island named `slot`. */
export type KPostMediaSlot = {
  slot: string;
  /** the file's https address (nothing is signed) */
  url: string;
  kind: "image" | "video";
};

export type KPostMediaViewProps = CommonViewModifierProps & Pick<KScreenBaseProps, "theme"> & Omit<KPostMediaSlot, "slot">;

const NativeKPostMediaView = requireNativeView<KPostMediaViewProps>("KindredlyUI", "KPostMediaView");

/** The picture or film alone, filling its frame (the "postmedia" marker). Only inside an @expo/ui <Host>. */
export function KPostMediaView({ modifiers, ...rest }: KPostMediaViewProps) {
  return <NativeKPostMediaView modifiers={modifiers} {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)} {...rest} />;
}
