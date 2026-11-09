import { requireNativeView, requireOptionalNativeModule } from "expo";
import { forwardRef, useMemo, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle, KStandardCommands } from "./types";
import { nativeWrenPicture, type KWrenPictureData } from "./LastIslands";

/* MAKE YOUR OWN FACE, drawn by SwiftUI (ios/Portable/MakeFace/KMakeFacePage.swift, adapter
   ios/Adapters/KMakeFaceView.swift), for src/screens/make-face/MakeFaceNative.tsx. Every word, the
   screen shown and every decision come from TS (useMakeFaceModel over the pure make-face-model);
   Swift draws them, holds the words being typed (an uncontrolled field; the chips edit it) and
   reports every tap.

   A whole screen: alone in one @expo/ui <Host> that keeps the keyboard's safe area (SurfaceHost
   field) on the transparent route /make-face, and only when lib/make-face makeFaceOn() says so
   (the "makeface" switch, and a binary with this view). Its ref is a KScreenHandle (useKCommands
   with blurOnUnmount).

   Islands, every one on every render: "wren" (WrenBird, display only, sized to
   makeFaceWrenSize(screen): 0 on the screens without her). */

export type KMakeFaceScreen = "intro" | "method" | "confirm" | "words" | "generating" | "result" | "done" | "rejected" | "failed" | "quota" | "signin";
export type KMakeFaceEntry = "onboarding" | "me";
export type KMakeFaceMethod = "camera" | "library" | "words";

/** Wren's size on each screen (KMakeFacePage.wrenSize): her island's size. */
export function makeFaceWrenSize(screen: KMakeFaceScreen): number {
  switch (screen) {
    case "intro":
    case "rejected":
    case "failed":
      return 72;
    case "generating":
    case "signin":
      return 64;
    case "done":
      return 56;
    default:
      return 0;
  }
}

export type KMakeFaceStrings = {
  closeLabel: string;
  introLine: string;
  introSub: string;
  introPhoto: string;
  /** the intro's second row: free / used / First Class */
  introQuota: string;
  go: string;
  methodTitle: string;
  camera: string;
  library: string;
  photoSub: string;
  wordsRow: string;
  wordsSub: string;
  at18: string;
  minorLine: string;
  confirmTitle: string;
  confirmGuide: string;
  retake: string;
  usePhoto: string;
  wordsTitle: string;
  wordsPlaceholder: string;
  draw: string;
  wordsLabel: string;
  genLeave: string;
  knockTitle: string;
  knockBody: string;
  knockWatch: string;
  knockAllow: string;
  knockInstead: string;
  knockWatching: string;
  knockOn: string;
  knockOff: string;
  knockLeave: string;
  knockLeaveQuiet: string;
  genLabel: string;
  resultLine: string;
  resultSub: string;
  resultLabel: string;
  accept: string;
  another: string;
  lock: string;
  instead: string;
  doneTag: string;
  doneLine: string;
  /** Continue (onboarding) / Done (Me) */
  doneButton: string;
  rejectBadge: string;
  rejectLine: string;
  rejectSub: string;
  rejectPrimary: string;
  /** "" for none */
  rejectSecondary: string;
  failedLine: string;
  failedSub: string;
  retry: string;
  notNow: string;
  quotaTag: string;
  quotaTitle: string;
  quotaSub: string;
  quotaCta: string;
  signinTitle: string;
  signinSub: string;
  apple: string;
  google: string;
  later: string;
};

export type KMakeFaceChip = { id: string; label: string };
export type KMakeFaceChipGroup = { id: string; title: string; chips: KMakeFaceChip[] };

export type KMakeFaceCommands = Omit<KStandardCommands, "setText" | "focus"> & {
  setText: { target: "words"; value: string };
  focus: { target: "words" };
};

export type KMakeFaceViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KMakeFaceStrings;
    screen: KMakeFaceScreen;
    entry: KMakeFaceEntry;
    minor: boolean;
    firstClass: boolean;
    appleAvailable: boolean;
    busy: boolean;
    wordsMax: number;
    photo: KImageRefProps | null;
    result: KImageRefProps | null;
    quotaFace: KImageRefProps | null;
    /** the drawings to choose from on the result (empty: just the one) and the one chosen */
    choices?: KImageRefProps[];
    choice?: number;
    /** while Wren paints: the knock offer (ask), waiting (watch), allowed (on), or not possible (off) */
    knock?: "ask" | "watch" | "on" | "off";
    /** the chip groups (memoised, with a rev) */
    chips: KMakeFaceChipGroup[];
    genLines: string[];
    onClose?: () => void;
    onStart?: () => void;
    onMethod?: (kind: KMakeFaceMethod) => void;
    onRetake?: () => void;
    onUsePhoto?: () => void;
    onDraw?: (text: string) => void;
    onLeave?: () => void;
    onAccept?: () => void;
    onAnother?: () => void;
    onPickInstead?: () => void;
    onDone?: () => void;
    onRetry?: () => void;
    onRejectPrimary?: () => void;
    onRejectSecondary?: () => void;
    onFirstClass?: () => void;
    onNotNow?: () => void;
    onApple?: () => void;
    onGoogle?: () => void;
    onLater?: () => void;
    onChoose?: (index: number) => void;
    onKnockAllow?: () => void;
    onKnockWatch?: () => void;
    onKnockAsk?: () => void;
    /** batch 3 ("facewren", LastIslands.tsx): her picture for this screen; Swift draws it at
        makeFaceWrenSize(screen) and leaves the "wren" island out. null keeps the island */
    wren?: KWrenPictureData | null;
    /** the one <KIsland name="wren">, every render (Slot.tsx) */
    children?: ReactNode;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;
type NativeImage = { uri: string; key: string; kind: "image" | "videoPoster" };

type NativeProps = Omit<
  KMakeFaceViewProps,
  | "letterFont"
  | "insets"
  | "rev"
  | "photo"
  | "result"
  | "quotaFace"
  | "choices"
  | "choice"
  | "onChoose"
  | "knock"
  | "onKnockAllow"
  | "onKnockWatch"
  | "onKnockAsk"
  | "onClose"
  | "onStart"
  | "onMethod"
  | "onRetake"
  | "onUsePhoto"
  | "onDraw"
  | "onLeave"
  | "onAccept"
  | "onAnother"
  | "onPickInstead"
  | "onDone"
  | "onRetry"
  | "onRejectPrimary"
  | "onRejectSecondary"
  | "onFirstClass"
  | "onNotNow"
  | "onApple"
  | "onGoogle"
  | "onLater"
  | "wren"
> &
  Required<Pick<KMakeFaceViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    wren: ReturnType<typeof nativeWrenPicture>;
    photo: NativeImage;
    result: NativeImage;
    quotaFace: NativeImage;
    choices: NativeImage[];
    choice: number;
    onFaceChoose?: Ev<{ index: number }>;
    knock: string;
    onFaceKnockAllow?: None;
    onFaceKnockWatch?: None;
    onFaceKnockAsk?: None;
    onFaceClose?: None;
    onFaceStart?: None;
    onFaceMethod?: Ev<{ kind: KMakeFaceMethod }>;
    onFaceRetake?: None;
    onFaceUsePhoto?: None;
    onFaceDraw?: Ev<{ text: string }>;
    onFaceLeave?: None;
    onFaceAccept?: None;
    onFaceAnother?: None;
    onFacePickInstead?: None;
    onFaceDone?: None;
    onFaceRetry?: None;
    onFaceRejectPrimary?: None;
    onFaceRejectSecondary?: None;
    onFaceFirstClass?: None;
    onFaceNotNow?: None;
    onFaceApple?: None;
    onFaceGoogle?: None;
    onFaceLater?: None;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: NativeImage = { uri: "", key: "", kind: "image" };
const image = (r: KImageRefProps | null | undefined): NativeImage => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : NO_IMAGE);

/** The chip groups as the Swift records want them: every field present. */
export function nativeFaceChips(groups: readonly KMakeFaceChipGroup[]): KMakeFaceChipGroup[] {
  return groups.map((g) => ({ id: g.id ?? "", title: g.title ?? "", chips: g.chips.map((c) => ({ id: c.id ?? "", label: c.label ?? "" })) }));
}

// the view's JS name is the Swift struct's name (ios/Adapters/KMakeFaceView.swift)
const NativeKMakeFaceView = requireNativeView<NativeProps>("KindredlyUI", "KMakeFaceView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>; its ref takes commands. */
export const KMakeFaceView = forwardRef<KScreenHandle, KMakeFaceViewProps>(function KMakeFaceView(
  {
    modifiers,
    letterFont,
    insets,
    rev,
    photo,
    result,
    quotaFace,
    choices,
    choice,
    chips,
    onChoose,
    knock,
    onKnockAllow,
    onKnockWatch,
    onKnockAsk,
    onClose,
    onStart,
    onMethod,
    onRetake,
    onUsePhoto,
    onDraw,
    onLeave,
    onAccept,
    onAnother,
    onPickInstead,
    onDone,
    onRetry,
    onRejectPrimary,
    onRejectSecondary,
    onFirstClass,
    onNotNow,
    onApple,
    onGoogle,
    onLater,
    wren,
    ...rest
  },
  ref,
) {
  const wrenSent = useMemo(() => nativeWrenPicture(wren), [wren]);
  const chipsSent = useMemo(() => nativeFaceChips(chips), [chips]);
  const photoSent = useMemo(() => image(photo), [photo]);
  const resultSent = useMemo(() => image(result), [result]);
  const quotaSent = useMemo(() => image(quotaFace), [quotaFace]);
  const choicesSent = useMemo(() => (choices ?? []).map(image), [choices]);
  return (
    <NativeKMakeFaceView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      chips={chipsSent}
      photo={photoSent}
      result={resultSent}
      quotaFace={quotaSent}
      choices={choicesSent}
      wren={wrenSent}
      choice={choice ?? 0}
      onFaceChoose={onChoose ? (e) => onChoose(e.nativeEvent.index ?? 0) : undefined}
      knock={knock ?? "on"}
      onFaceKnockAllow={onKnockAllow ? () => onKnockAllow() : undefined}
      onFaceKnockWatch={onKnockWatch ? () => onKnockWatch() : undefined}
      onFaceKnockAsk={onKnockAsk ? () => onKnockAsk() : undefined}
      onFaceClose={onClose ? () => onClose() : undefined}
      onFaceStart={onStart ? () => onStart() : undefined}
      onFaceMethod={onMethod ? (e) => onMethod(e.nativeEvent.kind) : undefined}
      onFaceRetake={onRetake ? () => onRetake() : undefined}
      onFaceUsePhoto={onUsePhoto ? () => onUsePhoto() : undefined}
      onFaceDraw={onDraw ? (e) => onDraw(e.nativeEvent.text ?? "") : undefined}
      onFaceLeave={onLeave ? () => onLeave() : undefined}
      onFaceAccept={onAccept ? () => onAccept() : undefined}
      onFaceAnother={onAnother ? () => onAnother() : undefined}
      onFacePickInstead={onPickInstead ? () => onPickInstead() : undefined}
      onFaceDone={onDone ? () => onDone() : undefined}
      onFaceRetry={onRetry ? () => onRetry() : undefined}
      onFaceRejectPrimary={onRejectPrimary ? () => onRejectPrimary() : undefined}
      onFaceRejectSecondary={onRejectSecondary ? () => onRejectSecondary() : undefined}
      onFaceFirstClass={onFirstClass ? () => onFirstClass() : undefined}
      onFaceNotNow={onNotNow ? () => onNotNow() : undefined}
      onFaceApple={onApple ? () => onApple() : undefined}
      onFaceGoogle={onGoogle ? () => onGoogle() : undefined}
      onFaceLater={onLater ? () => onLater() : undefined}
    />
  );
});

type KindredlyUINative = { prepareFacePhoto?: (uri: string) => Promise<string> };

/** The picked photo made small and bare (a square ≤768 JPEG with no metadata, in tmp/make-face,
    KFacePhoto.swift): its file:// uri, or null when it can't be read or this binary can't do it. */
export async function prepareFacePhoto(uri: string): Promise<string | null> {
  const native = requireOptionalNativeModule<KindredlyUINative>("KindredlyUI");
  if (typeof native?.prepareFacePhoto !== "function") return null;
  try {
    const out = await native.prepareFacePhoto(uri);
    return out ? out : null;
  } catch (e) {
    console.warn("[kindredly-ui] prepareFacePhoto failed:", e);
    return null;
  }
}
