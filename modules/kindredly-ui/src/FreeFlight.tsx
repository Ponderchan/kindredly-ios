import { requireNativeView } from "expo";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KScreenBaseProps } from "./types";

/* FREE FLIGHT, drawn by SwiftUI (batch 3, 2026-11-09; behind the "freeflight" switch, off by
   default): ios/Portable/Courier/KFreeFlight.swift, a port of src/components/FreeFlightGame.tsx,
   adapter ios/Adapters/KFreeFlightView.swift. The courier page in Swift (KCourierView) draws it on
   its cover from its `flight` record (src/screens/courier/CourierNative.tsx builds it), so the
   page never hands itself to React Native for a game. Off, or on a binary without the view, Play
   still opens the React Native game (app/courier).

   Swift runs the game (the physics on a display link, the typing, the haptics, the result card);
   TS keeps the words, her snapshots and the best: a finished run comes back as (gates, pace) and
   TS saves it (lib/free-flight saveRun). KFreeFlightView is the game on its own: the binary's
   marker for the switch (isKindredlyUIViewAvailable("KFreeFlightView")) and a dev page's. */

/** The game's words, resolved by TS (the ff.* keys). `takeoff` keeps "{letter}" and `best`
    keeps "{n}": Swift fills them as the game goes. `title` is upper-cased. */
export type KFreeFlightStrings = {
  done: string;
  faster: string;
  title: string;
  takeoff: string;
  hint: string;
  best: string;
  newBest: string;
  crashTitle: string;
  statGates: string;
  statLetters: string;
  statAccuracy: string;
  statPace: string;
  again: string;
  anyKey: string;
};

/** The course: the hour's sky (colours "#RRGGBB"), its size, her three faces and the best. */
export type KFreeFlightData = {
  /** morning | day | evening | night: which pangram she starts on */
  hour: "morning" | "day" | "evening" | "night";
  /** the course's height (WrenHome playH) */
  height: number;
  /** the header's room above the sentence (44 on the courier page) */
  top: number;
  sky0: string;
  sky1: string;
  scrim: string;
  pillarInk: string;
  land: string;
  forest: string;
  /** "" for no sun */
  sun: string;
  moon: boolean;
  stars: boolean;
  night: boolean;
  /** her snapshots at 46 (bird-images ff-<stage>-<mood>), null until captured */
  curious: KImageRefProps | null;
  happy: KImageRefProps | null;
  worry: KImageRefProps | null;
  /** the best run kept on this phone (gates), 0 for none */
  best: number;
  strings: KFreeFlightStrings;
};

type NativeImage = { uri: string; key: string; kind: "image" | "videoPoster" };
/** The record as Swift takes it (KFreeFlightRecord): `on` and `open` are the courier page's. */
export type NativeFreeFlight = Omit<KFreeFlightData, "curious" | "happy" | "worry"> & {
  on: boolean;
  open: boolean;
  curious: NativeImage;
  happy: NativeImage;
  worry: NativeImage;
};

const NO_IMAGE: NativeImage = { uri: "", key: "", kind: "image" };
const image = (r: KImageRefProps | null | undefined): NativeImage => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : NO_IMAGE);

const NO_STRINGS: KFreeFlightStrings = { done: "", faster: "", title: "", takeoff: "", hint: "", best: "", newBest: "", crashTitle: "", statGates: "", statLetters: "", statAccuracy: "", statPace: "", again: "", anyKey: "" };

/** The record for the courier page when the game is React Native's: Play reports as before. */
export const FREE_FLIGHT_OFF: NativeFreeFlight = Object.freeze({
  on: false,
  open: false,
  hour: "day",
  height: 320,
  top: 44,
  sky0: "#BFE3F8",
  sky1: "#E3F3FB",
  scrim: "#ADDBB5",
  pillarInk: "#1F5C33",
  land: "#9CD48C",
  forest: "#3F8F52",
  sun: "",
  moon: false,
  stars: false,
  night: false,
  curious: NO_IMAGE,
  happy: NO_IMAGE,
  worry: NO_IMAGE,
  best: 0,
  strings: NO_STRINGS,
}) as NativeFreeFlight;

/** The course as the Swift record takes it (a record field can't be null); null keeps the game React Native's. */
export const nativeFreeFlight = (d: KFreeFlightData | null | undefined, open = false): NativeFreeFlight =>
  d ? { ...d, on: true, open, curious: image(d.curious), happy: image(d.happy), worry: image(d.worry) } : FREE_FLIGHT_OFF;

/* ── the game on its own ── */

export type KFreeFlightViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme"> & {
    flight: KFreeFlightData;
    /** the × */
    onClose?: () => void;
    /** a run ended: save it (lib/free-flight saveRun) */
    onRun?: (gates: number, pace: number) => void;
  };

type NativeProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme"> & {
    letterFont: string;
    flight: NativeFreeFlight;
    onFfClose?: () => void;
    onFfRun?: (e: { nativeEvent: { gates: number; pace: number } }) => void;
  };

// the view's JS name is the Swift struct's name (ios/Adapters/KFreeFlightView.swift)
const NativeKFreeFlightView = requireNativeView<NativeProps>("KindredlyUI", "KFreeFlightView");

/** The game alone, as wide as it is laid out and flight.height tall. Only inside an @expo/ui <Host>. */
export function KFreeFlightView({ modifiers, theme, flight, onClose, onRun }: KFreeFlightViewProps) {
  return (
    <NativeKFreeFlightView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      theme={theme}
      letterFont="newsreader"
      flight={nativeFreeFlight(flight, true)}
      onFfClose={onClose ? () => onClose() : undefined}
      onFfRun={onRun ? (e) => onRun(Number(e.nativeEvent.gates) || 0, Number(e.nativeEvent.pace) || 0) : undefined}
    />
  );
}
