import { requireNativeView } from "expo";
import type { ReactNode } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import { nativeFrost, type KFrost, type KImageRefProps, type KScreenBaseProps, type KSign } from "./types";

/* THREE FULL-SCREEN MOMENTS, drawn by SwiftUI (2026-10-27), each behind its own switch (off by
   default) with its React Native piece as the fallback: ios/Adapters/KMomentsView.swift →
   ios/Portable/Moments.

   - KGrowthMomentView: Wren's grow-up moment (src/components/GrowthMomentNative.tsx, "growthmoment")
   - KIdentityNoteView: the one-time identity note (src/screens/edit-profile/IdentityNoteNative.tsx,
     "identitynote")
   - KFirstFlightView: the first flight (src/components/FirstFlightNative.tsx, "firstflight"); its
     children are the islands "bird", "head", "envelope" and "line" (KIsland / KSlot)

   TS decides everything (when, what, every word and number: lib/growth-moment-core, the identity
   note's model, components/first-flight-model) and keeps the haptics, the saves and the endings;
   Swift draws on the clock from `startAt` and reports taps. Each sits in a Host of its own. */

/* ── Wren grows up ───────────────────────────────────────────────────── */

/** The moment's clock in ms (lib/growth-moment-core GROWTH_BEATS) and its curves (GROWTH_CURVES). */
export type KGrowthBeats = {
  ground: number;
  shakeAt: number;
  shakeStep: number;
  shake: number[];
  outAt: number;
  outMs: number;
  burstAt: number;
  burstMs: number;
  popAt: number;
  popMs: number;
  stampAt: number;
  stampMs: number;
  wordsAt: number;
  wordsMs: number;
  bobAt: number;
  bobMs: number;
  bobBy: number;
  groundStill: number;
  still: number;
  /** the burst's pieces */
  burst: number;
  burstCurve: number[];
  popCurve: number[];
  stampCurve: number[];
};

export type KGrowthMomentViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme" | "letterFont"> & {
    /** Date.now() when the moment started: every beat counts from it */
    startAt: number;
    /** Reduce Motion: the reduced scene (fades only) */
    still: boolean;
    beats: KGrowthBeats;
    /** her old form and her new one (bird-images grow poses); null draws nothing there */
    oldBird: KImageRefProps | null;
    newBird: KImageRefProps | null;
    oldSize: number;
    newSize: number;
    /** the stamp: "FLEDGLING · OCT.27" */
    mark: string;
    /** her line, without the quotes */
    line: string;
    /** the one glad key */
    ok: string;
    onClose: () => void;
  };

type NativeGrowthProps = Omit<KGrowthMomentViewProps, "onClose" | "oldBird" | "newBird" | "letterFont"> & {
  letterFont: string;
  oldBird: KImageRefProps;
  newBird: KImageRefProps;
  onGrowthClose: () => void;
};

// the views' JS names are the Swift structs' names (ios/Adapters/KMomentsView.swift)
const NativeKGrowthMomentView = requireNativeView<NativeGrowthProps>("KindredlyUI", "KGrowthMomentView");

const NO_IMAGE: KImageRefProps = { uri: "", key: "" };

/** The bare SwiftUI grow-up moment. Only inside an @expo/ui <Host>. */
export function KGrowthMomentView({ modifiers, letterFont, oldBird, newBird, onClose, ...rest }: KGrowthMomentViewProps) {
  return (
    <NativeKGrowthMomentView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      oldBird={oldBird ?? NO_IMAGE}
      newBird={newBird ?? NO_IMAGE}
      onGrowthClose={() => onClose()}
    />
  );
}

/* ── The one-time identity note ──────────────────────────────────────── */

/** One switch of the note; null for none (the mark's, for they / unset). */
export type KIdentityNoteSwitch = { label: string; note: string; on: boolean };

export type KIdentityNoteViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme" | "letterFont" | "insets"> & {
    title: string;
    body: string;
    previewLabel: string;
    previewName: string;
    previewA11y: string;
    /** today's postmark date under the preview's name */
    when: string;
    /** your own window; null draws the soft square */
    frost: KFrost | null;
    /** the glyphs beside the preview's name, as the switches stand */
    mark: "she" | "he" | null;
    sign: KSign;
    /** ON YOUR LETTERS */
    header: string;
    markSwitch: KIdentityNoteSwitch | null;
    signSwitch: KIdentityNoteSwitch;
    foot: string;
    done: string;
    onMark: (on: boolean) => void;
    onSign: (on: boolean) => void;
    onDone: () => void;
  };

type NativeSwitch = KIdentityNoteSwitch & { show: boolean };
type NativeNoteProps = Omit<KIdentityNoteViewProps, "onMark" | "onSign" | "onDone" | "frost" | "mark" | "sign" | "markSwitch" | "signSwitch" | "letterFont"> & {
  letterFont: string;
  frost: KFrost;
  mark: string;
  sign: string;
  markSwitch: NativeSwitch;
  signSwitch: NativeSwitch;
  onNoteMark: (e: { nativeEvent: { on: boolean } }) => void;
  onNoteSign: (e: { nativeEvent: { on: boolean } }) => void;
  onNoteDone: () => void;
};

const NativeKIdentityNoteView = requireNativeView<NativeNoteProps>("KindredlyUI", "KIdentityNoteView");

const NO_SWITCH: NativeSwitch = { show: false, label: "", note: "", on: false };

/** The bare SwiftUI identity note (the dim and the sheet). Only inside an @expo/ui <Host>. */
export function KIdentityNoteView({ modifiers, letterFont, frost, mark, sign, markSwitch, signSwitch, onMark, onSign, onDone, ...rest }: KIdentityNoteViewProps) {
  return (
    <NativeKIdentityNoteView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      frost={nativeFrost(frost)}
      mark={mark ?? ""}
      sign={sign ?? ""}
      markSwitch={markSwitch ? { show: true, ...markSwitch } : NO_SWITCH}
      signSwitch={{ show: true, ...signSwitch }}
      onNoteMark={(e) => onMark(!!e.nativeEvent.on)}
      onNoteSign={(e) => onSign(!!e.nativeEvent.on)}
      onNoteDone={() => onDone()}
    />
  );
}

/* ── The first flight ────────────────────────────────────────────────── */

/** "#RRGGBB" each (TS: the theme's, or the new onboarding's day colours). */
export type KFirstFlightColors = { ground: string; ink: string; sub: string; faint: string; line: string; card: string; pen: string; post: string };
/** A value on the clock (seconds): t[i] → v[i] (first-flight-model FlightCurve). */
export type KFirstFlightCurve = { t: number[]; v: number[] };
/** first-flight-model FLIGHT_CURVES, and TRAIL as trailLead / trailPeak / trailHold / trailEnd. */
export type KFirstFlightCurves = {
  cardFold: KFirstFlightCurve;
  cardFade: KFirstFlightCurve;
  envFade: KFirstFlightCurve;
  envScale: KFirstFlightCurve;
  envTurn: KFirstFlightCurve;
  title: KFirstFlightCurve;
  chart: KFirstFlightCurve;
  birdScale: KFirstFlightCurve;
  birdTurn: KFirstFlightCurve;
  trayFade: KFirstFlightCurve;
  trayRise: KFirstFlightCurve;
  trailLead: number;
  trailPeak: number;
  trailHold: number;
  trailEnd: number;
};
/** A place on the clock (seconds): at t[i] it is at (x[i], y[i]) on the 390 × 844 board. */
export type KFirstFlightTrack = { t: number[]; x: number[]; y: number[] };
export type KFirstFlightPoint = { x: number; y: number; at: number };
export type KFirstFlightStop = { label: string; words: string };

export type KFirstFlightViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme" | "letterFont"> & {
    /** Date.now() when the flight started: the clock counts from it */
    startAt: number;
    /** the landed chart alone, dimmed: no clock, no tap */
    still: boolean;
    /** the board's scale to the window */
    scale: number;
    /** the flight's length, seconds */
    total: number;
    colors: KFirstFlightColors;
    /** the "head" island replaces the default title */
    hasHead: boolean;
    title: string;
    titleEm: string;
    sub: string;
    opener: string;
    openerLines: number;
    carried: string;
    yourCity: string;
    chart: string;
    skip: string;
    stops: KFirstFlightStop[];
    stopWordsSize: number;
    /** the loop as SVG path data */
    loop: string;
    home: KFirstFlightPoint;
    stopPoints: KFirstFlightPoint[];
    trail: KFirstFlightPoint[];
    curves: KFirstFlightCurves;
    /** her centre */
    bird: KFirstFlightTrack;
    /** the envelope's top-left corner */
    envelope: KFirstFlightTrack;
    envelopeW: number;
    envelopeH: number;
    /** the "envelope" island replaces the plain envelope */
    hasEnvelope: boolean;
    /** the "line" island is drawn under the chart */
    hasLine: boolean;
    /** a tap anywhere (never while still) */
    onSkip: () => void;
    /** the islands: <KIsland name="bird">, "head", "envelope", "line", every one on every render */
    children?: ReactNode;
  };

type NativeFlightProps = Omit<KFirstFlightViewProps, "onSkip" | "letterFont"> & {
  letterFont: string;
  onFlightSkip: () => void;
};

const NativeKFirstFlightView = requireNativeView<NativeFlightProps>("KindredlyUI", "KFirstFlightView");

/** The bare SwiftUI first flight. Only inside an @expo/ui <Host>. */
export function KFirstFlightView({ modifiers, letterFont, onSkip, children, ...rest }: KFirstFlightViewProps) {
  return (
    <NativeKFirstFlightView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      onFlightSkip={() => onSkip()}
    >
      {children}
    </NativeKFirstFlightView>
  );
}
