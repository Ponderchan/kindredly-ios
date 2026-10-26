import { requireNativeView } from "expo";
import { useMemo } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import { nativeFrost, type KFrost, type KImageRefProps, type KScreenBaseProps } from "./types";

/* THE NAME-TRADING CEREMONY'S SIGNED RITUAL, drawn by SwiftUI (owner, 2026-10-26; 1.0.7):
   ios/Adapters/KIntroRitualView.swift → ios/Portable/Chat/KIntroRitual.swift, for
   src/components/IntroductionRitualNative.tsx behind the "ceremony" NativeSurface switch. The
   React Native ritual (src/components/IntroductionRitual.tsx SignedRitual) stays the fallback.

   TS works out every word, date, face, window, stroke plan and beat (SIGNED_BEATS, the React
   Native ritual's own clock); Swift draws them against one clock that starts at `startAt`, and
   reports one thing back: their signature was held (the slot's rect, in the ritual's own points,
   from its top left corner). It is one piece of a React Native sheet, in a Host of its own with
   the height KINTRO_RITUAL_HEIGHT gives it. */

/** The ritual's clock, in ms from `startAt` (the React Native ritual's SIGNED_BEATS). */
export type KIntroRitualBeats = {
  road: number;
  step: number;
  fly: number;
  windows: number;
  lift: number;
  liftMs: number;
  wipe: number;
  wipeMs: number;
  strikeTheirs: number;
  strikeMine: number;
  signTheirs: number;
  signTheirsMs: number;
  signMine: number;
  signMineMs: number;
  bump: number;
  chip: number;
  notice: number;
  done: number;
  doneStill: number;
};

/** One letter of the road, oldest first: who sent it and the day it left ("OCT.14", or "—"). */
export type KIntroRitualCrossing = { mine: boolean; date: string };

/** A face as Swift's KFace takes it (src/lib/faces faceRecord, without the window: that is `frost`). */
export type KIntroRitualFace = { kind: "image" | "mosaic" | "veil" | "placeholder" | "frost"; uri: string; key: string; overscan: number; mask: number };

/** One stroke of the draw-in (lib/pen-signature PenDrawStep): its path in box units and when it runs, in ms from the signature's own beat. */
export type KIntroRitualStroke = { d: string; delay: number; duration: number };

/** One side of the pair: theirs on the right, mine on the left. */
export type KIntroRitualSide = {
  /** the courier name they wore, upper-cased in the reader's locale; "" for none */
  courier: string;
  /** its mono size, fitted to the column in TS */
  courierSize: number;
  /** the pen name signed (mine: in.meFallback when none) */
  name: string;
  /** a typed side in Chinese, Japanese or Korean is set upright, not in the italic */
  typedUpright: boolean;
  /** the face they sent, behind the window */
  face: KIntroRitualFace;
  /** the window they wore; null: the veil tile */
  frost: KFrost | null;
  /** the drawing, stroke by stroke; empty: a typed side */
  strokes: KIntroRitualStroke[];
  /** the drawing's viewBox, in box units (penViewBox "ink" at the slot's aspect) */
  vbX: number;
  vbY: number;
  vbW: number;
  vbH: number;
};

/** What she noticed, as a sticker (AuraCard StickerChip, size lg). show false: none. */
export type KIntroRitualNotice = {
  show: boolean;
  name: string;
  /** "#RRGGBB" */
  bg: string;
  fg: string;
  border: string;
  /** 999 for a pill */
  radius: number;
  /** the sticker's own tilt, degrees (stickerLook) */
  tilt: number;
  /** the tilt it is slapped down at, degrees (±2) */
  slapTilt: number;
  /** a label you both wear: the ×2 corner */
  shared: boolean;
};

export type KIntroRitualViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme" | "letterFont"> & {
    /** Date.now() when the ceremony opened: every beat counts from it */
    startAt: number;
    /** Reduce Motion: the end state cross-fades in (done by beats.doneStill) */
    still: boolean;
    /** the ritual is done and their signature may be held */
    holdable: boolean;
    beats: KIntroRitualBeats;
    road: KIntroRitualCrossing[];
    youLabel: string;
    themLabel: string;
    /** "10 LETTERS · THE ROAD TO A NAME" */
    roadLine: string;
    /** the stamp the correspondence opened under (the envelopes' dot); "" for none */
    stamp: string;
    /** the courier flying the letters (bird-images "fly"); null until captured */
    bird: KImageRefProps | null;
    mine: KIntroRitualSide;
    theirs: KIntroRitualSide;
    /** "KINDREDS · OCT.26" */
    chip: string;
    notice: KIntroRitualNotice;
    /** the whole ritual as one VoiceOver sentence */
    a11y: string;
    /** said once by VoiceOver when the ritual is done; "" for nothing */
    announce: string;
    /** their signature was held (450ms): its slot, in the ritual's points from its top left */
    onRitualHold?: (rect: { x: number; y: number; width: number; height: number }) => void;
  };

/* The ritual's height, in points: the same numbers as KIntroRitual.height(notice:) in
   ios/Portable/Chat/KIntroRitual.swift (the road 144, 14, the cards 190 and their 6pt shadow,
   10, the chip 24, and the notice's 14 + 50); change them together. The Host is given it up
   front so nothing under the ritual moves as it lands. */
export const KINTRO_RITUAL_HEIGHT = { base: 144 + 14 + 190 + 6 + 10 + 24, notice: 14 + 50 } as const;
export const kIntroRitualHeight = (notice: boolean): number => KINTRO_RITUAL_HEIGHT.base + (notice ? KINTRO_RITUAL_HEIGHT.notice : 0);

type NativeSide = Omit<KIntroRitualSide, "frost"> & { frost: KFrost };
type NativeProps = Omit<KIntroRitualViewProps, "onRitualHold" | "bird" | "mine" | "theirs" | "letterFont"> & {
  letterFont: string;
  bird: KImageRefProps;
  mine: NativeSide;
  theirs: NativeSide;
  onRitualHold?: (e: { nativeEvent: { x: number; y: number; width: number; height: number } }) => void;
};

// the view's JS name is the Swift struct's name (ios/Adapters/KIntroRitualView.swift)
const NativeKIntroRitualView = requireNativeView<NativeProps>("KindredlyUI", "KIntroRitualView");

const NO_BIRD: KImageRefProps = { uri: "", key: "" };
const side = (s: KIntroRitualSide): NativeSide => ({ ...s, frost: nativeFrost(s.frost) });

/** The bare SwiftUI ritual. Only inside an @expo/ui <Host>. */
export function KIntroRitualView({ modifiers, letterFont, bird, mine, theirs, onRitualHold, ...rest }: KIntroRitualViewProps) {
  const sentMine = useMemo(() => side(mine), [mine]);
  const sentTheirs = useMemo(() => side(theirs), [theirs]);
  return (
    <NativeKIntroRitualView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      bird={bird ?? NO_BIRD}
      mine={sentMine}
      theirs={sentTheirs}
      onRitualHold={onRitualHold ? (e) => onRitualHold(e.nativeEvent) : undefined}
    />
  );
}
