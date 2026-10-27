import { requireNativeView } from "expo";
import { forwardRef, useMemo, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import { nativeImage, nativeNotes, type KNotesGroup, type KNotesKind, type KNotesNote } from "./Notes";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle, KStandardCommands } from "./types";

/* THREE NOTES PAGES, drawn by SwiftUI (2026-10-27): one journal page, one day of them, and the
   photo roll the ＋ opens for a new note (ios/Portable/Notes/KNotePageScreen.swift,
   KNoteDayScreen.swift, KPhotoRollScreen.swift; adapters ios/Adapters/KNotePagesView.swift), for
   src/screens/note-page/NotePageNative.tsx, NoteDayNative.tsx and src/screens/photo-roll/
   PhotoRollNative.tsx. TS reads the journal and the library, words everything and does every
   write; Swift draws and reports taps.

   Each is a whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost), only after
   isKindredlyUIViewAvailable(...) and its NativeSurface switch ("noteentry", "noteday",
   "photoroll") say so. Pass the arrays memoised with a rev from useRev: Swift converts them once
   per rev. */

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;
type NativeImage = { uri: string; key: string; kind: "image" | "videoPoster" };

/* ── one journal page ──────────────────────────────────────────────────── */

export type KNotePageStrings = {
  /** VoiceOver for the back chevron */
  backLabel: string;
  /** VoiceOver for the ⋯ */
  moreLabel: string;
  driftLabel: string;
  deleteLabel: string;
  /** the date, the mood's name, " · SAMPLE", in capitals */
  dateLine: string;
  notFound: string;
  oneLineOut: string;
  tomorrowStranger: string;
  coverHint: string;
  /** VoiceOver's hint on a picture */
  photoHint: string;
  /** VoiceOver's action on a picture that can become the cover */
  makeCover: string;
};

/** One picture of the gallery, in drawing order (the cover first). */
export type KNotePagePhoto = {
  /** unique on the page */
  id: string;
  /** its place in the page's album: what a tap or a hold reports */
  index: number;
  image: KImageRefProps | null;
  /** VoiceOver ("Photo 2 of 5") */
  a11y: string;
};

export type KNotePageState = "loading" | "ready" | "missing";

export type KNotePageViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KNotePageStrings;
    state: KNotePageState;
    kind: KNotesKind;
    group: KNotesGroup;
    /** the mood icon's art key (moods moodArtKey) */
    icon: string;
    body: string;
    /** words alone: the larger type */
    pure: boolean;
    /** the line that left; "" for none */
    drifted: string;
    canDrift: boolean;
    photos: KNotePagePhoto[];
    canSetCover: boolean;
    coverHint: boolean;
    /** the voice island is placed */
    voice: boolean;
    /** the film island is placed */
    film: boolean;
    onBack?: () => void;
    onDrift?: () => void;
    onDelete?: () => void;
    onPhoto?: (index: number) => void;
    onCover?: (index: number) => void;
    /** <KIsland name="voice">, <KIsland name="film">, both on every render, in this order */
    children?: ReactNode;
  };

type NativeKNotePageViewProps = Omit<KNotePageViewProps, "letterFont" | "insets" | "rev" | "photos" | "onBack" | "onDrift" | "onDelete" | "onPhoto" | "onCover"> &
  Required<Pick<KNotePageViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    photos: (Omit<KNotePagePhoto, "image"> & { image: NativeImage })[];
    onNpBack?: None;
    onNpDrift?: None;
    onNpDelete?: None;
    onNpPhoto?: Ev<{ index: number }>;
    onNpCover?: Ev<{ index: number }>;
  };

const NativeKNotePageView = requireNativeView<NativeKNotePageViewProps>("KindredlyUI", "KNotePageView");

/** The bare SwiftUI journal page. Only inside an @expo/ui <Host>. */
export const KNotePageView = forwardRef<KScreenHandle, KNotePageViewProps>(function KNotePageView(
  { modifiers, letterFont, insets, rev, photos, onBack, onDrift, onDelete, onPhoto, onCover, ...rest },
  ref,
) {
  // a Swift record can't take null: no picture is an empty ref
  const sent = useMemo(() => photos.map((p) => ({ ...p, image: nativeImage(p.image) })), [photos]);
  return (
    <NativeKNotePageView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      photos={sent}
      onNpBack={onBack ? () => onBack() : undefined}
      onNpDrift={onDrift ? () => onDrift() : undefined}
      onNpDelete={onDelete ? () => onDelete() : undefined}
      onNpPhoto={onPhoto ? (e) => onPhoto(e.nativeEvent.index) : undefined}
      onNpCover={onCover ? (e) => onCover(e.nativeEvent.index) : undefined}
    />
  );
});

/* ── one day of pages ──────────────────────────────────────────────────── */

export type KNoteDayStrings = {
  /** the day, in the reader's own words */
  title: string;
  backLabel: string;
  /** "3 ON THIS DAY"; "" until the day is read */
  footer: string;
  play: string;
  pause: string;
};

/** The day page's commands: the one player's transitions, as the Notes tab takes them. */
export type KNoteDayCommands = KStandardCommands & {
  playback: KStandardCommands["playback"] & { failed: boolean };
};

export type KNoteDayViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KNoteDayStrings;
    /** the Notes tab's own note records (Card), oldest first */
    notes: KNotesNote[];
    onBack?: () => void;
    onOpen?: (id: string) => void;
    onVoiceToggle?: (id: string) => void;
  };

type NativeKNoteDayViewProps = Omit<KNoteDayViewProps, "letterFont" | "insets" | "rev" | "notes" | "onBack" | "onOpen" | "onVoiceToggle"> &
  Required<Pick<KNoteDayViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    notes: ReturnType<typeof nativeNotes>;
    onNdBack?: None;
    onNdOpen?: Ev<{ id: string }>;
    onNdVoiceToggle?: Ev<{ id: string }>;
  };

const NativeKNoteDayView = requireNativeView<NativeKNoteDayViewProps>("KindredlyUI", "KNoteDayView");

/** The bare SwiftUI day page. Only inside an @expo/ui <Host>; its ref takes the playback command. */
export const KNoteDayView = forwardRef<KScreenHandle, KNoteDayViewProps>(function KNoteDayView(
  { modifiers, letterFont, insets, rev, notes, onBack, onOpen, onVoiceToggle, ...rest },
  ref,
) {
  const sent = useMemo(() => nativeNotes(notes), [notes]);
  return (
    <NativeKNoteDayView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      notes={sent}
      onNdBack={onBack ? () => onBack() : undefined}
      onNdOpen={onOpen ? (e) => onOpen(e.nativeEvent.id) : undefined}
      onNdVoiceToggle={onVoiceToggle ? (e) => onVoiceToggle(e.nativeEvent.id) : undefined}
    />
  );
});

/* ── the photo roll ────────────────────────────────────────────────────── */

export type KPhotoRollStrings = {
  closeLabel: string;
  /** the album on show ("Recents") */
  title: string;
  camera: string;
  write: string;
  say: string;
  denied: string;
  /** "Open Settings ›" */
  settings: string;
  none: string;
  /** "Choose more photos ›"; "" unless access is limited */
  limited: string;
};

export type KPhotoRollKey = "camera" | "text" | "voice";

/** One picture or film of the roll. */
export type KPhotoRollFrame = {
  /** the library's asset id */
  id: string;
  /** ph://… (Swift reads it from the library) */
  uri: string;
  video: boolean;
  /** a film's length, "0:12"; "" for a picture */
  duration: string;
  /** VoiceOver: "Photo", "Video" */
  a11y: string;
};

export type KPhotoRollAlbum = {
  /** unique in the list */
  key: string;
  title: string;
  count: string;
  /** ph://… of its newest picture; "" until it is known */
  cover: string;
  current: boolean;
};

/** "" while there is something to show (or the phone is still asking) */
export type KPhotoRollEmpty = "" | "nothing" | "denied";

/** The roll's commands: what changes with a tap goes this way, never by props (a prop change
    re-sends every prop, the whole roll with it). Send both again when the view attaches. */
export type KPhotoRollCommands = KStandardCommands & {
  /** the picks in the order chosen, and Next as drawn ("Next", "Next · 3", "Add · 2", "…") */
  selection: { picked: string[]; next: string; nextLive: boolean };
  /** the album list: open or not, the names known or not, and the rows */
  albums: { open: boolean; loaded: boolean; rows: KPhotoRollAlbum[] };
};

export type KPhotoRollViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KPhotoRollStrings;
    /** the first row's stamps; [] while adding to a page */
    keys: KPhotoRollKey[];
    /** the newest picture in the first row (no camera card); null for none */
    lead: KPhotoRollFrame | null;
    leadBlank: boolean;
    /** the roll after the first row */
    frames: KPhotoRollFrame[];
    empty: KPhotoRollEmpty;
    onClose?: () => void;
    onAlbums?: () => void;
    onAlbum?: (index: number) => void;
    onNext?: () => void;
    onKey?: (key: KPhotoRollKey) => void;
    onFrame?: (id: string) => void;
    onReachEnd?: () => void;
    onSettings?: () => void;
    onLimited?: () => void;
  };

const NO_FRAME: KPhotoRollFrame = { id: "", uri: "", video: false, duration: "", a11y: "" };

type NativeKPhotoRollViewProps = Omit<
  KPhotoRollViewProps,
  "letterFont" | "insets" | "rev" | "lead" | "onClose" | "onAlbums" | "onAlbum" | "onNext" | "onKey" | "onFrame" | "onReachEnd" | "onSettings" | "onLimited"
> &
  Required<Pick<KPhotoRollViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    lead: KPhotoRollFrame;
    onPrClose?: None;
    onPrAlbums?: None;
    onPrAlbum?: Ev<{ index: number }>;
    onPrNext?: None;
    onPrKey?: Ev<{ key: KPhotoRollKey }>;
    onPrFrame?: Ev<{ id: string }>;
    onPrReachEnd?: None;
    onPrSettings?: None;
    onPrLimited?: None;
  };

const NativeKPhotoRollView = requireNativeView<NativeKPhotoRollViewProps>("KindredlyUI", "KPhotoRollView");

/** The bare SwiftUI photo roll. Only inside an @expo/ui <Host>; its ref takes the 'selection' and
    'albums' commands (useKCommands<KPhotoRollCommands>). */
export const KPhotoRollView = forwardRef<KScreenHandle, KPhotoRollViewProps>(function KPhotoRollView(
  { modifiers, letterFont, insets, rev, lead, onClose, onAlbums, onAlbum, onNext, onKey, onFrame, onReachEnd, onSettings, onLimited, ...rest },
  ref,
) {
  return (
    <NativeKPhotoRollView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      lead={lead ?? NO_FRAME}
      onPrClose={onClose ? () => onClose() : undefined}
      onPrAlbums={onAlbums ? () => onAlbums() : undefined}
      onPrAlbum={onAlbum ? (e) => onAlbum(e.nativeEvent.index) : undefined}
      onPrNext={onNext ? () => onNext() : undefined}
      onPrKey={onKey ? (e) => onKey(e.nativeEvent.key) : undefined}
      onPrFrame={onFrame ? (e) => onFrame(e.nativeEvent.id) : undefined}
      onPrReachEnd={onReachEnd ? () => onReachEnd() : undefined}
      onPrSettings={onSettings ? () => onSettings() : undefined}
      onPrLimited={onLimited ? () => onLimited() : undefined}
    />
  );
});
