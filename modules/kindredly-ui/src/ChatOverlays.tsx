import { requireNativeView } from "expo";
import { forwardRef, useMemo, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle, KStandardCommands } from "./types";

/* THE PIECES OVER THE CHAT, drawn by SwiftUI (2026-10-27; ios/Portable/Chat/KPhotoLightbox.swift,
   KSongShelf.swift, KSignSheet.swift, adapter ios/Adapters/KChatOverlaysView.swift): a photo
   opened full screen, a kindred room's song shelf, the pen-pal chat's signing sheet. Each keeps
   its React Native Modal and draws its inside here, alone in one @expo/ui <Host> (SurfaceHost)
   inside that Modal, only after isKindredlyUIViewAvailable(view) and its switch ("lightbox",
   "songshelf", "signsheet") say so (src/components/OverlayNativeSurface.tsx). Every word and
   every rule is TS's; Swift draws them and reports taps. */

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: KImageRefProps = { uri: "", key: "", kind: "image" };
const imageOf = (r: KImageRefProps | null | undefined): KImageRefProps => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : NO_IMAGE);

/* ── a photo, big (src/components/PhotoLightbox.tsx) ─────────────────────── */

export type KPhotoLightboxViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    /** the photo; null while its link is signed */
    photo: KImageRefProps | null;
    /** VoiceOver for the stage and the × */
    closeLabel: string;
    onClose?: () => void;
  };

type NativeKPhotoLightboxViewProps = Omit<KPhotoLightboxViewProps, "letterFont" | "insets" | "rev" | "photo" | "onClose"> &
  Required<Pick<KPhotoLightboxViewProps, "letterFont" | "insets" | "rev">> & {
    photo: KImageRefProps;
    onLbClose?: None;
  };

const NativeKPhotoLightboxView = requireNativeView<NativeKPhotoLightboxViewProps>("KindredlyUI", "KPhotoLightboxView");

/** The bare SwiftUI lightbox. Only inside an @expo/ui <Host>. */
export function KPhotoLightboxView({ modifiers, letterFont, insets, rev, photo, onClose, ...rest }: KPhotoLightboxViewProps) {
  const sent = useMemo(() => imageOf(photo), [photo]);
  return (
    <NativeKPhotoLightboxView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      photo={sent}
      onLbClose={onClose ? () => onClose() : undefined}
    />
  );
}

/* ── the song shelf (src/screens/chat/SongShelfNative.tsx) ───────────────── */

export type KSongShelfRow = {
  /** the song's link: what onOpen hands back */
  key: string;
  title: string;
  /** "JUNO · OCT 3" */
  who: string;
};

export type KSongShelfViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    title: string;
    /** VoiceOver for the dim and the ✕ */
    closeLabel: string;
    /** Wren's line about the songs; "" when she has none */
    says: string;
    evidence: string;
    /** her mark beside the line */
    bird: KImageRefProps | null;
    rows: KSongShelfRow[];
    onClose?: () => void;
    /** a song pressed: its key (the link) */
    onOpen?: (key: string) => void;
  };

type NativeKSongShelfViewProps = Omit<KSongShelfViewProps, "letterFont" | "insets" | "rev" | "bird" | "onClose" | "onOpen"> &
  Required<Pick<KSongShelfViewProps, "letterFont" | "insets" | "rev">> & {
    bird: KImageRefProps;
    onShClose?: None;
    onShOpen?: Ev<{ key: string }>;
  };

const NativeKSongShelfView = requireNativeView<NativeKSongShelfViewProps>("KindredlyUI", "KSongShelfView");

/** The bare SwiftUI shelf. Only inside an @expo/ui <Host>. */
export function KSongShelfView({ modifiers, letterFont, insets, rev, bird, onClose, onOpen, ...rest }: KSongShelfViewProps) {
  const sentBird = useMemo(() => imageOf(bird), [bird]);
  return (
    <NativeKSongShelfView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      bird={sentBird}
      onShClose={onClose ? () => onClose() : undefined}
      onShOpen={onOpen ? (e) => onOpen(e.nativeEvent.key) : undefined}
    />
  );
}

/* ── the signing sheet (src/screens/chat/SignSheetNative.tsx) ────────────── */

export type KSignSheetStrings = {
  title: string;
  closeLabel: string;
  lead: string;
  faceLabel: string;
  faceNote: string;
  /** NO FACE, already upper-cased */
  faceNone: string;
  nameLabel: string;
  /** the field's placeholder at the first trade; "" later */
  namePlaceholder: string;
  nameNote: string;
  /** the red line in the note's place; "" for none */
  nameError: string;
  /** VoiceOver for the field's clear key */
  clearLabel: string;
  signLabel: string;
  /** Type it instead, or Draw it instead while typed */
  typeToggle: string;
  /** VoiceOver's hint on Type it instead; "" while typed */
  typeHint: string;
  legal: string;
  undo: string;
  clear: string;
  /** the guest line and its link; "" for an account */
  guestText: string;
  guestLink: string;
  /** SIGN AND SEND, or "…" while the send is out */
  send: string;
  foot: string;
  /** the typed preview's faint words with no name */
  typedEmpty: string;
  /** the pad's corner caption */
  caption: string;
  padLabel: string;
  /** the pad's VoiceOver value; "" for none */
  padValue: string;
};

/** A face in the row: faces.ts faceRecord's fields, and what VoiceOver says for it. */
export type KSignSheetFace = {
  kind: "image" | "mosaic" | "veil" | "placeholder" | "frost";
  uri: string;
  key: string;
  overscan: number;
  mask: number;
  label: string;
  /** No face (the glyph) */
  none: boolean;
};

/** The commands the sheet takes: its pen-name field ("name"). */
export type KSignSheetCommands = Pick<KStandardCommands, "setText" | "blur">;

export type KSignSheetViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KSignSheetStrings;
    /** the red line's ink, "#RRGGBB" */
    errorInk: string;
    faces: KSignSheetFace[];
    /** the chosen face's place in the row */
    chosen: number;
    typed: boolean;
    /** the pen name as it would go */
    typedName: string;
    typedUpright: boolean;
    typedEmptyUpright: boolean;
    /** the words traced under the ink */
    guide: string;
    guideUpright: boolean;
    padWidth: number;
    padHeight: number;
    /** every finished stroke as one SVG path, in pad points */
    ink: string;
    strokeCount: number;
    full: boolean;
    canSend: boolean;
    busy: boolean;
    onClose?: () => void;
    /** the pen name typed (never a setText) */
    onName?: (text: string) => void;
    onFace?: (index: number) => void;
    onTypeToggle?: () => void;
    /** a stroke finished: x0, y0, x1, y1 … in pad points */
    onStroke?: (points: number[]) => void;
    onUndo?: () => void;
    onClear?: () => void;
    onGuest?: () => void;
    onSend?: () => void;
  };

type NativeKSignSheetViewProps = Omit<
  KSignSheetViewProps,
  "letterFont" | "insets" | "rev" | "onClose" | "onName" | "onFace" | "onTypeToggle" | "onStroke" | "onUndo" | "onClear" | "onGuest" | "onSend"
> &
  Required<Pick<KSignSheetViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    onSsClose?: None;
    onSsName?: Ev<{ text: string }>;
    onSsFace?: Ev<{ index: number }>;
    onSsType?: None;
    onSsStroke?: Ev<{ points: number[] }>;
    onSsUndo?: None;
    onSsClear?: None;
    onSsGuest?: None;
    onSsSend?: None;
  };

const NativeKSignSheetView = requireNativeView<NativeKSignSheetViewProps>("KindredlyUI", "KSignSheetView");

/** The bare SwiftUI sheet's inside. Only inside an @expo/ui <Host>. Give it useKCommands(...).ref. */
export const KSignSheetView = forwardRef<KScreenHandle, KSignSheetViewProps>(function KSignSheetView(
  { modifiers, letterFont, insets, rev, onClose, onName, onFace, onTypeToggle, onStroke, onUndo, onClear, onGuest, onSend, ...rest },
  ref,
) {
  return (
    <NativeKSignSheetView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      onSsClose={onClose ? () => onClose() : undefined}
      onSsName={onName ? (e) => onName(e.nativeEvent.text) : undefined}
      onSsFace={onFace ? (e) => onFace(e.nativeEvent.index) : undefined}
      onSsType={onTypeToggle ? () => onTypeToggle() : undefined}
      onSsStroke={onStroke ? (e) => onStroke(e.nativeEvent.points) : undefined}
      onSsUndo={onUndo ? () => onUndo() : undefined}
      onSsClear={onClear ? () => onClear() : undefined}
      onSsGuest={onGuest ? () => onGuest() : undefined}
      onSsSend={onSend ? () => onSend() : undefined}
    />
  );
});
