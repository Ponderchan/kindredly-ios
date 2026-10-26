import { requireNativeView } from "expo";
import { forwardRef, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle } from "./types";

/* WREN'S JOURNEY, drawn by SwiftUI (the courier page, owner 2026-10-26; ios/Portable/Courier/
   KCourierScreen.swift, adapter ios/Adapters/KCourierView.swift), for
   src/screens/courier/CourierNative.tsx. TS builds every word and fact (src/screens/courier/
   courier-model.ts) and hands her over as snapshots of her own WrenBird (lib/bird-images);
   Swift owns what opens and shuts on the page (her flight log, the tracking slip, the wardrobe
   rack), her perch's gestures, and reports taps. Free Flight stays React Native: Play is
   reported, and TS hands the page to the React Native one for the game.

   A whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost), only after
   isKindredlyUIViewAvailable("KCourierView") and the "courier" NativeSurface switch say so. */

export type KCourierStrings = {
  title: string;
  back: string;
  hints: string[];
  tapHint: string;
  play: string;
  playA11y: string;
  playHint: string;
  logHint: string;
  expanded: string;
  collapsed: string;
  track: string;
  trackClose: string;
  slip: string;
  slipGo: string;
  log: string;
  journey: string;
  keepsakes: string;
  allKept: string;
  wrenUpper: string;
};

export type KCourierCover = {
  sky0: string;
  sky1: string;
  ink: string;
  band: string;
  pillarInk: string;
  scrim: string;
  /** "" for no sun */
  sun: string;
  moon: boolean;
  stars: boolean;
  night: boolean;
  dayOff: boolean;
  dayChip: string;
  cofounder: string;
  bubble: string;
  bubbleOpens: boolean;
  canPlay: boolean;
};

/** One face on the perch: the WrenBird mood and her picture in it ("" uri until captured). */
export type KCourierFace = { mood: string; bird: KImageRefProps };

export type KCourierHero = {
  /** the face her whereabouts (or hunger, or sleep) give her */
  mood: string;
  /** every face the perch may show, the base one among them */
  faces: KCourierFace[];
  /** home | delivery | bringing | exploring | unsent | dozing: how she idles */
  state: string;
  /** egg | hatch | fledge | wren: how well she does it */
  stage: string;
  wilt: boolean;
  /** her name, VoiceOver's label for her */
  label: string;
};

export type KCourierBand = { show: boolean; line: string; sub: string; bringing: boolean };
export type KCourierSlip = { rows: string[]; lit: boolean; threadId: string };
export type KCourierLog = { rows: string[]; line: string };
export type KCourierFact = { icon: "letter" | "kindred" | "date" | "next"; text: string };
/** A journey stop: her form at that stage (bird), and on the next stop your count toward it
    (done of `of`, and in words; of 0 = none). */
export type KCourierStop = { id: string; name: string; sub: string; state: "done" | "now" | "later"; bird: KImageRefProps; done: number; of: number; progress: string };
export type KCourierKeepsake = { id: string; name: string; evidence: string; fresh: boolean; a11y: string; icon: KImageRefProps };
export type KCourierCell = { key: "looks" | "dress"; label: string; value: string; count: string; swatch: string };
export type KCourierTile = { id: string; label: string; lock: string; hint: string; on: boolean; bird: KImageRefProps };
export type KCourierFirstClass = {
  eyebrow: string;
  headline: string;
  rows: string[];
  cta: string;
  trial: string;
  stampLabel: string;
  bird: KImageRefProps;
  member: boolean;
};

export type KCourierViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KCourierStrings;
    cover: KCourierCover;
    hero: KCourierHero;
    band: KCourierBand;
    slip: KCourierSlip;
    log: KCourierLog;
    name: string;
    kindLine: string;
    facts: KCourierFact[];
    journey: KCourierStop[];
    keepsakes: KCourierKeepsake[];
    cells: KCourierCell[];
    looks: KCourierTile[];
    dress: KCourierTile[];
    firstClass: KCourierFirstClass;
    onBack?: () => void;
    onPlay?: () => void;
    /** "Go to the Door" on the tracking slip */
    onSlipGo?: (threadId: string) => void;
    onKeepsake?: (id: string) => void;
    onAllKeepsakes?: () => void;
    onLook?: (id: string) => void;
    onDress?: (id: string) => void;
    onFirstClass?: () => void;
    /** the rack opened on a row, or shut ("") — TS captures that row's tiles only while it shows */
    onRack?: (open: "looks" | "dress" | "") => void;
    /** the cover went out from under the status bar, or came back (the bar's style follows) */
    onUnderSky?: (under: boolean) => void;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;

type NativeKCourierViewProps = Omit<
  KCourierViewProps,
  "letterFont" | "insets" | "rev" | "onBack" | "onPlay" | "onSlipGo" | "onKeepsake" | "onAllKeepsakes" | "onLook" | "onDress" | "onFirstClass" | "onRack" | "onUnderSky"
> &
  Required<Pick<KCourierViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    onCrBack?: None;
    onCrPlay?: None;
    onCrSlipGo?: Ev<{ id: string }>;
    onCrKeepsake?: Ev<{ id: string }>;
    onCrAllKeepsakes?: None;
    onCrLook?: Ev<{ id: string }>;
    onCrDress?: Ev<{ id: string }>;
    onCrFirstClass?: None;
    onCrRack?: Ev<{ open: string }>;
    onCrUnderSky?: Ev<{ under: boolean }>;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };

const NativeKCourierView = requireNativeView<NativeKCourierViewProps>("KindredlyUI", "KCourierView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. Pass the records memoised with a rev. */
export const KCourierView = forwardRef<KScreenHandle, KCourierViewProps>(function KCourierView(
  { modifiers, letterFont, insets, rev, onBack, onPlay, onSlipGo, onKeepsake, onAllKeepsakes, onLook, onDress, onFirstClass, onRack, onUnderSky, ...rest },
  ref,
) {
  return (
    <NativeKCourierView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      onCrBack={onBack ? () => onBack() : undefined}
      onCrPlay={onPlay ? () => onPlay() : undefined}
      onCrSlipGo={onSlipGo ? (e) => onSlipGo(e.nativeEvent.id) : undefined}
      onCrKeepsake={onKeepsake ? (e) => onKeepsake(e.nativeEvent.id) : undefined}
      onCrAllKeepsakes={onAllKeepsakes ? () => onAllKeepsakes() : undefined}
      onCrLook={onLook ? (e) => onLook(e.nativeEvent.id) : undefined}
      onCrDress={onDress ? (e) => onDress(e.nativeEvent.id) : undefined}
      onCrFirstClass={onFirstClass ? () => onFirstClass() : undefined}
      onCrRack={onRack ? (e) => onRack(e.nativeEvent.open === "looks" || e.nativeEvent.open === "dress" ? e.nativeEvent.open : "") : undefined}
      onCrUnderSky={onUnderSky ? (e) => onUnderSky(!!e.nativeEvent.under) : undefined}
    />
  );
});
