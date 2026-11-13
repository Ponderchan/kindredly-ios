import { requireNativeView } from "expo";
import { forwardRef, useMemo, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import { nativeTodayCards, type KTodayCard } from "./Today";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle, KStandardCommands } from "./types";
import { nativeInFlight, type KLetterInFlightData, type NativeInFlight } from "./FourPieces";

/* TODAY'S OVERLAYS, drawn by SwiftUI (2026-10-27, the second Swift batch): ios/Adapters/
   KTodayOverlaysView.swift → ios/Portable/Today (KLetterReaderScreen, KWardrobeSlip, KParcelSheet).
   Each is one piece over Today, in a Host of its own, behind its own switch (off by default), with
   its React Native piece as the fallback:

   - KLetterReaderView ("letterreader"): the unfolded letter, inside LetterReader's React Native page
     sheet (src/screens/today/LetterReader.tsx). A field: SurfaceHost field, useKCommands with
     blurOnUnmount, the draft seeded with setText in onViewAttach. One island, "inflight".
   - KWardrobeSlipView ("wardrobeslip"): the first arrival's slip (src/screens/today/WardrobeSlip.tsx),
     in a Host that matches its height.
   - KParcelSheetView, KParcelBannerView ("parcel"): the update prompt (src/components/UpdatePrompt.tsx):
     the sheet filling a Host in a transparent Modal, the banner filling its 52 under the status bar.

   Every word, number and rule is TS's (the parcel's drawing and clock: src/components/update-parcel);
   Swift draws and reports taps. Outside a Host each is a RedBox in dev and a CRASH in a release
   build: only after isKindredlyUIViewAvailable(view) and the switch say so (NativeSurface). */

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: KImageRefProps = { uri: "", key: "", kind: "image" };
const imageOf = (r: KImageRefProps | null | undefined): KImageRefProps => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : NO_IMAGE);

/* ── the unfolded letter ─────────────────────────────────────────────── */

export type KLetterReaderStrings = {
  /** FOLD BACK (the ✕ beside it is drawn) */
  foldBack: string;
  /** the reply box (Today's, since binary 1.2.8): VoiceOver's expand / collapse, a voice letter's name */
  expandA11y?: string;
  collapseA11y?: string;
  voiceLetter?: string;
  writeBack: string;
  /** the letter's own placeholder, else the desk's (letter-reader-model readerPlaceholder) */
  placeholder: string;
  /** SEND, VoiceOver's name for the send key */
  send: string;
  /** VoiceOver's name for the emoji key */
  emoji: string;
};

/** The reply bar's state for the reader's letter, sent on every change. */
export type KLetterReaderComposer = {
  sendState: "disabled" | "enabled" | "dimmed";
  /** already in capitals (letter-reader-model readerHint) */
  hint: string;
  hintWarn: boolean;
};

/** setText / focus / blur on target "reply", and the composer. */
export type KLetterReaderCommands = Pick<KStandardCommands, "setText" | "focus" | "blur"> & { composer: KLetterReaderComposer };

export type KLetterReaderViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    /** the desk card (TodayNative nativeCard): who wrote it, the docket, the stamp */
    card: KTodayCard;
    /** what the reader shows (letter-reader-model readerText) */
    text: string;
    /** "WRITTEN 3D AGO" */
    written: string;
    /** VoiceOver's docket line (letter-reader-model readerDocketA11y) */
    docketA11y: string;
    /** a reply is in the air: the "inflight" island takes the foot */
    sending: boolean;
    strings: KLetterReaderStrings;
    onClose?: () => void;
    onChange?: (text: string) => void;
    /** the send key (enabled or dimmed): the words; Swift has let go of the keyboard */
    onSend?: (text: string) => void;
    /** a stranger's photo stamp, held (or VoiceOver's action) */
    onStamp?: (action: "keep" | "report") => void;
    /** <KIsland name="inflight"> */
    children?: ReactNode;
    /** batch 3: the crossing drawn by Swift at the foot ("inflight"; FourPieces), null keeps the
        island. Only where the binary has KLetterInFlightView (src/screens/me/me-pieces useSwiftPiece). */
    inflight?: KLetterInFlightData | null;
  };

type NativeKLetterReaderViewProps = Omit<KLetterReaderViewProps, "letterFont" | "insets" | "rev" | "card" | "onClose" | "onChange" | "onSend" | "onStamp" | "inflight"> &
  Required<Pick<KLetterReaderViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    card: ReturnType<typeof nativeTodayCards>[number];
    inflight: NativeInFlight;
    onReaderClose?: None;
    onReaderChange?: Ev<{ text: string }>;
    onReaderSend?: Ev<{ text: string }>;
    onReaderStamp?: Ev<{ action: "keep" | "report" }>;
  };

const NativeKLetterReaderView = requireNativeView<NativeKLetterReaderViewProps>("KindredlyUI", "KLetterReaderView");

/** The bare SwiftUI reader. Only inside an @expo/ui <Host> (SurfaceHost field). Give it useKCommands(...).ref. */
export const KLetterReaderView = forwardRef<KScreenHandle, KLetterReaderViewProps>(function KLetterReaderView(
  { modifiers, letterFont, insets, rev, card, onClose, onChange, onSend, onStamp, children, inflight, ...rest },
  ref,
) {
  const sent = useMemo(() => nativeTodayCards([card])[0], [card]);
  const crossing = useMemo(() => nativeInFlight(inflight), [inflight]);
  return (
    <NativeKLetterReaderView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      card={sent}
      inflight={crossing}
      onReaderClose={onClose ? () => onClose() : undefined}
      onReaderChange={onChange ? (e) => onChange(e.nativeEvent.text) : undefined}
      onReaderSend={onSend ? (e) => onSend(e.nativeEvent.text) : undefined}
      onReaderStamp={onStamp ? (e) => onStamp(e.nativeEvent.action) : undefined}
    >
      {children}
    </NativeKLetterReaderView>
  );
});

/* ── the wardrobe slip ───────────────────────────────────────────────── */

export type KWardrobeSlipViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme"> & {
    /** "Otis wants a look →" */
    title: string;
    /** "try anything on, free" */
    sub: string;
    /** the ×, for VoiceOver ("Not now") */
    close: string;
    /** her content snapshot (bird-images "content"); null until captured */
    bird: KImageRefProps | null;
    /** false once either tap put it away: it fades out (.16s) */
    shown: boolean;
    onOpen?: () => void;
    onClose?: () => void;
  };

type NativeKWardrobeSlipViewProps = Omit<KWardrobeSlipViewProps, "bird" | "onOpen" | "onClose"> & {
  bird: KImageRefProps;
  onSlipOpen?: None;
  onSlipClose?: None;
};

const NativeKWardrobeSlipView = requireNativeView<NativeKWardrobeSlipViewProps>("KindredlyUI", "KWardrobeSlipView");

/** The bare SwiftUI slip. Only inside an @expo/ui <Host>. Its depth (4) hangs right of and below it, inside the view. */
export function KWardrobeSlipView({ modifiers, bird, onOpen, onClose, ...rest }: KWardrobeSlipViewProps) {
  const b = useMemo(() => imageOf(bird), [bird]);
  return (
    <NativeKWardrobeSlipView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      bird={b}
      onSlipOpen={onOpen ? () => onOpen() : undefined}
      onSlipClose={onClose ? () => onClose() : undefined}
    />
  );
}

/** the slip's depth beyond its frame (KWardrobeSlip.depth): the Host gives it room */
export const KWARDROBE_SLIP_DEPTH = 4;

/* ── the update prompt ───────────────────────────────────────────────── */

type Box = { x: number; y: number; w: number; h: number; r?: number };
type Point = { x: number; y: number };

/** The parcel's drawing (update-parcel PARCEL_ART, STAMP, PIVOTS, PW × PH). */
export type KParcelArt = {
  pw: number;
  ph: number;
  front: string;
  frontShade: string;
  top: string;
  flapL: string;
  flapR: string;
  ribbonFront: string;
  ribbonL: string;
  ribbonR: string;
  bowLoops: string;
  bowShade: string;
  bowTails: string;
  star: string;
  knot: Box;
  stamp: Box;
  foot: Point;
  knotPivot: Point;
  flapLHinge: Point;
  flapRHinge: Point;
};

/** One star out of the open box (update-parcel STARS). */
export type KParcelStar = { dx: number; dy: number; size: number; tone: "waxGold" | "lime" | "postRed"; delay: number };

/** The scene for its width: update-parcel sceneGeometry, BEATS (ms) and STARS. */
export type KParcelScene = {
  height: number;
  size: number;
  cx: number;
  ground: number;
  restX: number;
  restY: number;
  perchX: number;
  perchY: number;
  hoverX: number;
  hoverY: number;
  landX: number;
  landY: number;
  startX: number;
  startY: number;
  carryDx: number;
  carryDy: number;
  perchOriginX: number;
  perchOriginY: number;
  start: number;
  fly: number;
  hover: number;
  drop: number;
  land: number;
  settle: number;
  firstShake: number;
  shakeMin: number;
  shakeMax: number;
  curious: number;
  bow: number;
  flapDelay: number;
  flap: number;
  starsDelay: number;
  stars: number;
  starRun: number;
  starList: KParcelStar[];
};

export type KParcelStrings = {
  title: string;
  line: string;
  update: string;
  later: string;
  /** "VERSION 1.0.7", or "" while the App Store's version is unknown (no stamp) */
  version: string;
};

/** Her four pictures in the scene (bird-images parcelFly / parcelContent / parcelCurious / parcelDelight). */
export type KParcelBirds = { fly: KImageRefProps | null; content: KImageRefProps | null; curious: KImageRefProps | null; delight: KImageRefProps | null };

export type KParcelSheetViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme" | "insets" | "rev"> & {
    strings: KParcelStrings;
    force: boolean;
    /** Update was pressed: the parcel opens */
    opening: boolean;
    /** hard mode's rounds: each a fresh scene, no fly-in after the first */
    round: number;
    /** her pictures are there (or TS stopped waiting): the scene may start */
    ready: boolean;
    art: KParcelArt;
    scene: KParcelScene;
    birds: KParcelBirds;
    onUpdate?: () => void;
    /** put away (soft mode only): Later, the dim, the grabber, VoiceOver's escape */
    onLater?: () => void;
  };

type NativeKParcelSheetViewProps = Omit<KParcelSheetViewProps, "birds" | "insets" | "rev" | "onUpdate" | "onLater"> & {
  insets: KInsets;
  rev: number;
  birds: { fly: KImageRefProps; content: KImageRefProps; curious: KImageRefProps; delight: KImageRefProps };
  onParcelUpdate?: None;
  onParcelLater?: None;
};

const NativeKParcelSheetView = requireNativeView<NativeKParcelSheetViewProps>("KindredlyUI", "KParcelSheetView");

/** The bare SwiftUI update sheet (dim, card, scene, keys). Only inside a full-screen @expo/ui <Host>. */
export function KParcelSheetView({ modifiers, birds, insets, rev, onUpdate, onLater, ...rest }: KParcelSheetViewProps) {
  const pictures = useMemo(
    () => ({ fly: imageOf(birds.fly), content: imageOf(birds.content), curious: imageOf(birds.curious), delight: imageOf(birds.delight) }),
    [birds.fly, birds.content, birds.curious, birds.delight],
  );
  return (
    <NativeKParcelSheetView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      birds={pictures}
      onParcelUpdate={onUpdate ? () => onUpdate() : undefined}
      onParcelLater={onLater ? () => onLater() : undefined}
    />
  );
}

export type KParcelBannerViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme" | "rev"> & {
    /** "a parcel's waiting for you" */
    line: string;
    /** "Update ›" */
    cta: string;
    /** VoiceOver: "a parcel's waiting for you, Update" */
    a11y: string;
    art: KParcelArt;
    onPress?: () => void;
  };

type NativeKParcelBannerViewProps = Omit<KParcelBannerViewProps, "rev" | "onPress"> & { rev: number; onParcelBanner?: None };

const NativeKParcelBannerView = requireNativeView<NativeKParcelBannerViewProps>("KindredlyUI", "KParcelBannerView");

/** The bare SwiftUI banner. Only inside an @expo/ui <Host> the banner's room tall. */
export function KParcelBannerView({ modifiers, rev, onPress, ...rest }: KParcelBannerViewProps) {
  return (
    <NativeKParcelBannerView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      rev={rev ?? 0}
      onParcelBanner={onPress ? () => onPress() : undefined}
    />
  );
}
