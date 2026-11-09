import { requireNativeView } from "expo";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KScreenBaseProps } from "./types";

/* BATCH 3, SLICE 4 (2026-11-09): the last islands of Wren and of your own face inside Swift
   pages, and the face-ready banner, drawn by SwiftUI (ios/Adapters/KLastIslandsView.swift), each
   behind its own switch (src/lib/surfaces, off by default) with React Native kept for when it is
   off:
   - the host pages take a record each — KComposeView `wren` (KWrenMoodsData, plus the `wrenMood`
     command), KNoteComposeView and KMakeFaceView `wren` (KWrenPictureData), KMeView and
     KEditProfileView `myFace` (KMyFaceData) — and draw the piece instead of the island when it
     says `on`; null (and an older JS) keeps the island;
   - turn one on only where isKindredlyUIViewAvailable says the binary has its marker view below
     ("KWrenPictureView" for the three Wrens, "KMyFaceView" for your face): an older binary ignores
     the record and would show an empty frame where the island used to be (src/lib/swift-island);
   - KFaceReadyView is the face-ready banner, in a Host of its own (src/components/
     FaceReadyBanner.tsx).
   The marker views draw one piece on its own (a dev page). Each needs an @expo/ui <Host>. */

const NO_IMAGE: KImageRefProps = { uri: "", key: "" };
const image = (r: KImageRefProps | null | undefined): KImageRefProps => (r ? { uri: r.uri ?? "", key: r.key ?? "", kind: r.kind ?? "image" } : NO_IMAGE);

/* ── Wren ───────────────────────────────────────────────────────────── */

/** One picture of Wren for an island (her snapshot, lib/bird-images); null until captured. */
export type KWrenPictureData = { image: KImageRefProps | null };
/** The compose toolbar's Wren: her picture in each mood (null until captured). */
export type KWrenMoodsData = { moods: { mood: string; image: KImageRefProps | null }[] };

type NativeWrenPicture = { on: boolean; image: KImageRefProps };
type NativeWrenMoods = { on: boolean; moods: { mood: string; image: KImageRefProps }[] };

/** The record for KNoteComposeView / KMakeFaceView `wren`: off (the island) for null. */
export const nativeWrenPicture = (d: KWrenPictureData | null | undefined): NativeWrenPicture => (d ? { on: true, image: image(d.image) } : { on: false, image: NO_IMAGE });
/** The record for KComposeView `wren`: off (the island) for null. */
export const nativeWrenMoods = (d: KWrenMoodsData | null | undefined): NativeWrenMoods =>
  d ? { on: true, moods: d.moods.map((m) => ({ mood: m.mood ?? "", image: image(m.image) })) } : { on: false, moods: [] };

/* ── your face ──────────────────────────────────────────────────────── */

/** Your own face (src/lib/faces faceRecord, role kindred: image | veil | placeholder). */
export type KMyFaceData = { kind: string; uri: string; key: string; overscan: number };
type NativeMyFace = KMyFaceData & { on: boolean };

/** The record for KMeView / KEditProfileView `myFace`: off (the island) for null. */
export const nativeMyFace = (d: KMyFaceData | null | undefined): NativeMyFace =>
  d ? { on: true, kind: d.kind ?? "placeholder", uri: d.uri ?? "", key: d.key ?? "", overscan: d.overscan ?? 0 } : { on: false, kind: "placeholder", uri: "", key: "", overscan: 0 };

/* ── the marker views, each one piece on its own ── */

export type KWrenPictureViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme"> & {
    image: KImageRefProps | null;
    /** the capture size, and the frame it sits in (default: the size) */
    size: number;
    frame?: number;
    /** breathe and zoom in on each `mood`, as the compose toolbar's Wren */
    breathe?: boolean;
    mood?: string;
  };
export type KMyFaceViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme"> & {
    face: KMyFaceData;
    size: number;
    /** square, for the inside of a stamp */
    square?: boolean;
  };

type NativeWrenPictureProps = CommonViewModifierProps & Pick<KScreenBaseProps, "theme"> & { image: KImageRefProps; size: number; frame: number; breathe: boolean; mood: string };
type NativeMyFaceProps = CommonViewModifierProps & Pick<KScreenBaseProps, "theme"> & { face: NativeMyFace; size: number; square: boolean };

// the views' JS names are the Swift structs' names (ios/Adapters/KLastIslandsView.swift)
const NativeKWrenPictureView = requireNativeView<NativeWrenPictureProps>("KindredlyUI", "KWrenPictureView");
const NativeKMyFaceView = requireNativeView<NativeMyFaceProps>("KindredlyUI", "KMyFaceView");

/** One picture of Wren on its own. Only inside an @expo/ui <Host>. */
export function KWrenPictureView({ modifiers, theme, image: img, size, frame, breathe, mood }: KWrenPictureViewProps) {
  return (
    <NativeKWrenPictureView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      theme={theme}
      image={image(img)}
      size={size}
      frame={frame ?? 0}
      breathe={!!breathe}
      mood={mood ?? ""}
    />
  );
}

/** Your face on its own. Only inside an @expo/ui <Host>. */
export function KMyFaceView({ modifiers, theme, face, size, square }: KMyFaceViewProps) {
  return (
    <NativeKMyFaceView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      theme={theme}
      face={nativeMyFace(face)}
      size={size}
      square={!!square}
    />
  );
}

/* ── the face-ready banner ──────────────────────────────────────────── */

export type KFaceReadyViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme"> & {
    /** "knock knock. your face is done." */
    title: string;
    /** the small line under it */
    name: string;
    /** "See it" */
    see: string;
    /** VoiceOver's label for the card */
    a11y: string;
    /** the new face; null draws the lav disc */
    face: KImageRefProps | null;
    /** her delighted picture at 30 (faceReady30); null until captured */
    bird: KImageRefProps | null;
    /** false: it goes back up and out (.22 s); take the Host away after */
    shown: boolean;
    onOpen: () => void;
  };

type NativeFaceReadyProps = Omit<KFaceReadyViewProps, "face" | "bird" | "onOpen"> & {
  face: KImageRefProps;
  bird: KImageRefProps;
  onFaceReadyOpen: () => void;
};

const NativeKFaceReadyView = requireNativeView<NativeFaceReadyProps>("KindredlyUI", "KFaceReadyView");

/** The face-ready banner. Only inside an @expo/ui <Host> as wide as the card. */
export function KFaceReadyView({ modifiers, face, bird, onOpen, ...rest }: KFaceReadyViewProps) {
  return (
    <NativeKFaceReadyView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      face={image(face)}
      bird={image(bird)}
      onFaceReadyOpen={() => onOpen()}
    />
  );
}

/** How long the Swift banner takes to go (KFaceReadyBanner.outDuration), and a frame. */
export const KFACE_READY_OUT_MS = 240;
