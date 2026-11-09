import { requireNativeView } from "expo";
import { forwardRef, useMemo, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KComposeSection } from "./Compose";
import { nativeComposeSections } from "./Compose";
import { nativeFrost, type KFrost, type KImageRefProps, type KInsets, type KScreenBaseProps, type KScreenHandle, type KStandardCommands } from "./types";
import { nativeObPieces, type KObPieces, type NativeObPieces } from "./ObPieces";

/* THE ONBOARDING, drawn by SwiftUI (ios/Portable/Onboarding, adapter ios/Adapters/
   KOnboardingView.swift), for src/screens/onboarding/OnboardingNative.tsx. The run is TS's (the
   flow, the runner, the services); Swift draws the screen it is told, plays the motion, holds the
   words being typed (uncontrolled fields) and reports every tap through one event.

   A whole screen: alone in one @expo/ui <Host> that keeps the keyboard's safe area (SurfaceHost
   field), and only after isKindredlyUIViewAvailable("KOnboardingView") and the "onboarding"
   NativeSurface switch (off by default) say so. Its ref is a KScreenHandle (useKCommands).

   Islands, every one on every render, in this order: "routeBird" (Wren flying on the doorstep's
   slide 2), "hatch" (HatchStage on 9), "chick" (the named chick on 10, 11, 13) and "flight"
   (FirstFlight on 12 and, landed, behind 13). Each of the four can be drawn by Swift instead
   (`pieces`, ./ObPieces.ts; batch 3): null keeps its island. */

export type KObScreenId = "doorstep" | "egg" | "birthday" | "pronoun" | "face" | "envelope" | "letter" | "stamp" | "hatch" | "name" | "address" | "flight" | "knock";
export type KObSideId = "" | "signin" | "underage" | "tray" | "code";
export type KObGround = "blue" | "paper" | "shell";

export type KObWord = { k: string; v: string };
export type KObShell = { name: string; a11y: string };
export type KObDoor = {
  entry: "full" | "still" | "rest";
  /** when the launch handed over, ms since 1970 (0: no hand-off) */
  handedAt: number;
  showLang: boolean;
  date: string;
  sample: string;
  frostThem: KFrost | null;
  frostYou: KFrost | null;
  faceThem: KImageRefProps | null;
  faceYou: KImageRefProps | null;
};
export type KObFold = { stage: "key" | "email" | "code"; busy: boolean; bad: string };
export type KObAuth = {
  apple: boolean;
  busy: "" | "apple" | "google" | "switch";
  err: string;
  fold: KObFold;
  failed: boolean;
  exists: boolean;
  switchCode: boolean;
  switchBusy: boolean;
  switchBad: boolean;
};
export type KObDob = { set: boolean; y: number; m: number; d: number; ty: number; tm: number; td: number; months: string[]; sign: string };
export type KObFace = { id: string; image: KImageRefProps | null; a11y: string };
export type KObMake = { show: boolean; state: "free" | "used" | "yours"; image: KImageRefProps | null; id: string };
export type KObEnvelope = {
  hasUid: boolean;
  name: string;
  frost: KFrost | null;
  face: KImageRefProps | null;
  hasFace: boolean;
  mark: "" | "she" | "he";
  sign: string;
  showMark: boolean;
  showSign: boolean;
  date: string;
  envDate: string;
};
export type KObLetter = { left: number; fill: number; clean: boolean; ready: boolean; cueTurn: number; len: number };
export type KObHatch = { flood: boolean; floodX: number; floodY: number; hatched: boolean; readS: number };
export type KObName = { chick: number; ideas: string[]; typed: string; pronoun: "she" | "he" | "they"; reserved: boolean };

/** What Swift reports: one channel (OnboardingNative lists every type). */
export type KObEvent = { type: string; s: string; n: number };

export type KOnboardingCommands = Omit<KStandardCommands, "setText" | "focus"> & {
  setText: { target: "letter" | "name" | "email" | "code" | "switchCode"; value: string };
  focus: { target: "letter" | "name" | "email" | "code" | "switchCode" };
};

export type KOnboardingViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    screen: KObScreenId;
    side: KObSideId;
    ground: KObGround;
    canAdvance: boolean;
    hasBack: boolean;
    noFade: boolean;
    demo: boolean;
    /** this screen's words (memoised, with a rev) */
    words: KObWord[];
    shell: number;
    /** the four shells (memoised, with a rev) */
    shells: KObShell[];
    pips: number;
    voice: string;
    still: boolean;
    door: KObDoor;
    auth: KObAuth;
    dob: KObDob;
    pronoun: string;
    /** 5's faces (memoised, with a rev) */
    faces: KObFace[];
    selectedFace: string;
    make: KObMake;
    envelope: KObEnvelope;
    letter: KObLetter;
    stampShown: string;
    /** 8a's tray; [] unless it is open (memoised, with a rev) */
    sections: KComposeSection[];
    hatch: KObHatch;
    name: KObName;
    refused: boolean;
    /** the islands Swift draws itself (batch 3); omitted = every island React Native's */
    pieces?: KObPieces;
    onEvent?: (e: KObEvent) => void;
    /** the four <KIsland>s, "routeBird", "hatch", "chick", "flight", every render (Slot.tsx) */
    children?: ReactNode;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;

type NativeProps = Omit<KOnboardingViewProps, "letterFont" | "insets" | "rev" | "onEvent" | "door" | "envelope" | "make" | "pieces"> &
  Required<Pick<KOnboardingViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    door: Omit<KObDoor, "frostThem" | "frostYou" | "faceThem" | "faceYou"> & { frostThem: KFrost; frostYou: KFrost; faceThem: KImageRefProps; faceYou: KImageRefProps };
    envelope: Omit<KObEnvelope, "frost" | "face"> & { frost: KFrost; face: KImageRefProps };
    make: Omit<KObMake, "image"> & { image: KImageRefProps };
    pieces: NativeObPieces;
    onObEvent?: Ev<{ type: string; s?: string; n?: number }>;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: KImageRefProps = { uri: "", key: "", kind: "image" };

/** A picture as the Swift record takes it: every field present, none for null. */
const img = (r: KImageRefProps | null | undefined): KImageRefProps => (r && r.uri ? { uri: r.uri, key: r.key ?? "", kind: r.kind ?? "image" } : NO_IMAGE);

// the view's JS name is the Swift struct's name (ios/Adapters/KOnboardingView.swift)
const NativeKOnboardingView = requireNativeView<NativeProps>("KindredlyUI", "KOnboardingView");

/** The bare SwiftUI run. Only inside an @expo/ui <Host>; its ref takes commands. */
export const KOnboardingView = forwardRef<KScreenHandle, KOnboardingViewProps>(function KOnboardingView(
  { modifiers, letterFont, insets, rev, door, envelope, make, faces, sections, pieces, onEvent, ...rest },
  ref,
) {
  const doorSent = useMemo(
    () => ({ ...door, frostThem: nativeFrost(door.frostThem), frostYou: nativeFrost(door.frostYou), faceThem: img(door.faceThem), faceYou: img(door.faceYou) }),
    [door],
  );
  const envelopeSent = useMemo(() => ({ ...envelope, frost: nativeFrost(envelope.frost), face: img(envelope.face) }), [envelope]);
  const makeSent = useMemo(() => ({ ...make, image: img(make.image) }), [make]);
  const facesSent = useMemo(() => faces.map((f) => ({ id: f.id, image: img(f.image), a11y: f.a11y ?? "" })), [faces]);
  const sectionsSent = useMemo(() => nativeComposeSections(sections), [sections]);
  const piecesSent = useMemo(() => nativeObPieces(pieces), [pieces]);
  return (
    <NativeKOnboardingView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      door={doorSent}
      envelope={envelopeSent}
      make={makeSent}
      faces={facesSent}
      sections={sectionsSent}
      pieces={piecesSent}
      onObEvent={onEvent ? (e) => onEvent({ type: e.nativeEvent.type, s: e.nativeEvent.s ?? "", n: e.nativeEvent.n ?? 0 }) : undefined}
    />
  );
});
