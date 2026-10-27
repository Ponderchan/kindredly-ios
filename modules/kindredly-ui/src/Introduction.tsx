import { requireNativeView } from "expo";
import { useMemo } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import { nativeFrost, type KFrost, type KImageRefProps, type KInsets, type KScreenBaseProps } from "./types";
import type { KIntroRitualBeats, KIntroRitualCrossing, KIntroRitualFace, KIntroRitualNotice, KIntroRitualSide } from "./IntroRitual";

/* WREN'S INTRODUCTION, THE WHOLE SHEET, drawn by SwiftUI (2026-10-27; behind the "introritual"
   NativeSurface switch, OFF by default): ios/Adapters/KIntroductionView.swift →
   ios/Portable/Chat/KIntroduction.swift (the sheet), KIntroMosaicRitual.swift (the mosaic
   ritual) and, both sides signed, the ceremony's KIntroRitual. For
   src/components/IntroductionNative.tsx, inside the introduction's page sheet (the React Native
   Modal), alone in one Host filling it. The React Native sheet (src/components/Introduction.tsx
   IntroductionRN) stays the fallback.

   TS works out every word, date, face, mask, scrap, stroke plan and beat (the mosaic ritual's
   clock and burst: src/components/introduction-model; the signed one's: SIGNED_BEATS); Swift
   draws them against one clock that starts at `startAt`, and reports the ✕, TALK TO, a held
   signature (its slot in the sheet's own points) and VoiceOver's report / block. */

/** The mosaic ritual's clock, in ms from `startAt` (introduction-model). */
export type KIntroMosaicBeats = {
  road: number;
  step: number;
  fly: number;
  burst: number;
  burstMs: number;
  slap: number;
  name: number;
  typeLead: number;
  typeStep: number;
  joltAfter: number;
  caretAfter: number;
  bump: number;
  notice: number;
  done: number;
  /** when nothing moves any more (a long name can still be typing after done) */
  end: number;
};

/** One square of their mosaic: its middle from the grid's middle, and its throw (burstScraps). */
export type KIntroMosaicScrap = { x0: number; y0: number; ang: number; dist: number; spin: number };

/** The mosaic ritual's own parts (identity off, or names traded before it). */
export type KIntroMosaic = {
  beats: KIntroMosaicBeats;
  /** their name in capitals as it is typed: the text after each letter lands */
  nameSteps: string[];
  scraps: KIntroMosaicScrap[];
  /** FACE v1 masks at develop 1 (lib/mosaic mosaicMask) */
  myMask: number;
  theirMask: number;
  /** the faces from the bump on (lib/faces, as kindreds) */
  myFace: KIntroRitualFace;
  theirFace: KIntroRitualFace;
  myName: string;
  otherName: string;
};

export type KIntroductionViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme" | "letterFont" | "insets"> & {
    /** Date.now() when the sheet opened: every beat counts from it */
    startAt: number;
    /** Reduce Motion */
    still: boolean;
    /** the signed ritual is done and their signature may be held */
    holdable: boolean;
    /** "Carried by {wren}" */
    title: string;
    /** the ✕'s VoiceOver name */
    closeLabel: string;
    /** her snapshot (content, grown, 44); null until captured */
    wren: KImageRefProps | null;
    /** her letter */
    letter: string;
    /** which ritual: the signed one (beats, mine, theirs) or the mosaic one (mosaic) */
    kind: "signed" | "mosaic";
    road: KIntroRitualCrossing[];
    youLabel: string;
    themLabel: string;
    roadLine: string;
    /** the envelopes' stamp ("" none) */
    stamp: string;
    /** the courier flying the letters; null until captured */
    courier: KImageRefProps | null;
    /** "KINDREDS · OCT 14" */
    chip: string;
    notice: KIntroRitualNotice;
    beats: KIntroRitualBeats;
    mine: KIntroRitualSide;
    theirs: KIntroRitualSide;
    mosaic: KIntroMosaic;
    /** the ritual as one VoiceOver sentence */
    a11y: string;
    /** said once by VoiceOver when the signed ritual is done ("" for nothing) */
    announce: string;
    /** VoiceOver's two actions on the ritual once it is holdable; "" for none */
    reportLabel: string;
    blockLabel: string;
    noticedHead: string;
    /** "" shows nothing */
    noticedLine: string;
    /** ms from startAt: the line fades in then */
    noticedAt: number;
    knowYou: string;
    talkTo: string;
    onClose?: () => void;
    onTalk?: () => void;
    /** their signature was held (450ms): its slot, in the sheet's points from its top left */
    onHold?: (rect: { x: number; y: number; width: number; height: number }) => void;
    onAction?: (name: "report" | "block") => void;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;
type NativeSide = Omit<KIntroRitualSide, "frost"> & { frost: KFrost };
type NativeProps = Omit<KIntroductionViewProps, "onClose" | "onTalk" | "onHold" | "onAction" | "wren" | "courier" | "mine" | "theirs" | "letterFont" | "insets"> & {
  letterFont: string;
  insets: KInsets;
  wren: KImageRefProps;
  courier: KImageRefProps;
  mine: NativeSide;
  theirs: NativeSide;
  onInClose?: None;
  onInTalk?: None;
  onInHold?: Ev<{ x: number; y: number; width: number; height: number }>;
  onInAction?: Ev<{ name: string }>;
};

// the view's JS name is the Swift struct's name (ios/Adapters/KIntroductionView.swift)
const NativeKIntroductionView = requireNativeView<NativeProps>("KindredlyUI", "KIntroductionView");

const NO_IMAGE: KImageRefProps = { uri: "", key: "" };
const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const side = (s: KIntroRitualSide): NativeSide => ({ ...s, frost: nativeFrost(s.frost) });

/** The bare SwiftUI sheet. Only inside an @expo/ui <Host> filling the page sheet. */
export function KIntroductionView({ modifiers, letterFont, insets, wren, courier, mine, theirs, onClose, onTalk, onHold, onAction, ...rest }: KIntroductionViewProps) {
  const sentMine = useMemo(() => side(mine), [mine]);
  const sentTheirs = useMemo(() => side(theirs), [theirs]);
  return (
    <NativeKIntroductionView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      wren={wren ?? NO_IMAGE}
      courier={courier ?? NO_IMAGE}
      mine={sentMine}
      theirs={sentTheirs}
      onInClose={onClose ? () => onClose() : undefined}
      onInTalk={onTalk ? () => onTalk() : undefined}
      onInHold={onHold ? (e) => onHold(e.nativeEvent) : undefined}
      onInAction={onAction ? (e) => (e.nativeEvent.name === "report" || e.nativeEvent.name === "block" ? onAction(e.nativeEvent.name) : undefined) : undefined}
    />
  );
}
