import { requireNativeView } from "expo";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KScreenBaseProps } from "./types";

/* THE RECORDING BAR AND THE VOICE CARD, drawn by SwiftUI (2026-10-27; behind the "recorder" and
   "audiocard" switches, off by default): ios/Adapters/KVoicePiecesView.swift →
   ios/Portable/Voice (KRecorderBar, KAudioCardRow). For src/components/Recorder.tsx and
   AudioCard.tsx, which keep their exported components and props and draw these when the switch
   is on and the binary has the view; their React Native rows stay the fallback.

   Display only. The recording (expo-audio, the permission, the cap, the file, the alerts) and the
   player stay in TS; every word, colour and size comes from src/components/recorder-model.ts and
   audio-card-model.ts, the models the React Native rows draw from too. Each view is one piece of a
   React Native screen, alone in a small @expo/ui <Host matchContents={{ vertical: true }}>: width
   from React Native, height from the piece.

   Inside the two Swift composers the pages draw the same pieces themselves (KVoiceSlot), told
   through their `recorder` command (KVoiceSlotCommand below; src/components/VoiceSlot.tsx). */

/** The recording bar (recorder-model RecorderBarModel). */
export type KRecorderBar = {
  phase: "idle" | "recording" | "done";
  /** "0:12 / 3:00", or the take's length */
  clock: string;
  /** VoiceOver: "0:12 of 3:00" */
  timeA11y: string;
  /** the twenty bar heights */
  bars: number[];
  recordLabel: string;
  stopLabel: string;
  discardLabel: string;
};

/** One bar of the voice card: its height, colour ("#RRGGBB") and strength. */
export type KAudioCardBar = { h: number; color: string; alpha: number };

/** The voice card's look (audio-card-model AudioCardLook, without pct). Colours are "#RRGGBB",
    or "transparent" for no panel; edge "" for no ring. */
export type KAudioCardLook = {
  ink: string;
  glyph: string;
  panel: string;
  edge: string;
  timeInk: string;
  time: string;
  padding: number;
  radius: number;
  disc: number;
  discRadius: number;
  glyphSize: number;
  glyphNudge: number;
  barRadius: number;
  bars: KAudioCardBar[];
  mono: "regular" | "semibold";
};

/** The composers' voice slot, the `recorder` command of KComposeView and KNoteComposeView. */
export type KVoiceSlotCommand = {
  /** Swift draws the recording bar (else the island holds the React Native Recorder) */
  showBar: boolean;
  bar: KRecorderBar;
  /** Swift draws the take's card (else, when there is a take, the island holds AudioCard) */
  showCard: boolean;
  card: { look: KAudioCardLook; playing: boolean; label: string };
  /** the React Native island has something in it */
  island: boolean;
};

/** A tap in the voice slot's Swift bar or card. */
export type KVoiceSlotAction = "press" | "discard" | "toggle";

export type KRecorderViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme"> & {
    bar: KRecorderBar;
    /** the key: start or stop */
    onPress?: () => void;
    /** the take's ✕ */
    onDiscard?: () => void;
  };

export type KAudioCardViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme"> & {
    look: KAudioCardLook;
    playing: boolean;
    /** VoiceOver's name for the disc right now (vo.play / vo.pause, or the caller's) */
    label: string;
    /** the disc: play or pause */
    onToggle?: () => void;
  };

type Ev = () => void;

type NativeRecorderProps = Omit<KRecorderViewProps, "onPress" | "onDiscard"> & {
  letterFont: string;
  onRecorderPress?: Ev;
  onRecorderDiscard?: Ev;
};
type NativeAudioCardProps = Omit<KAudioCardViewProps, "onToggle"> & {
  letterFont: string;
  onAudioToggle?: Ev;
};

// the views' JS names are the Swift structs' names (ios/Adapters/KVoicePiecesView.swift)
const NativeKRecorderView = requireNativeView<NativeRecorderProps>("KindredlyUI", "KRecorderView");
const NativeKAudioCardView = requireNativeView<NativeAudioCardProps>("KindredlyUI", "KAudioCardView");

/** The bare SwiftUI recording bar. Only inside an @expo/ui <Host>. */
export function KRecorderView({ modifiers, onPress, onDiscard, ...rest }: KRecorderViewProps) {
  return (
    <NativeKRecorderView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont="newsreader"
      onRecorderPress={onPress ? () => onPress() : undefined}
      onRecorderDiscard={onDiscard ? () => onDiscard() : undefined}
    />
  );
}

/** The bare SwiftUI voice card. Only inside an @expo/ui <Host>. */
export function KAudioCardView({ modifiers, onToggle, ...rest }: KAudioCardViewProps) {
  return (
    <NativeKAudioCardView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont="newsreader"
      onAudioToggle={onToggle ? () => onToggle() : undefined}
    />
  );
}
