import { requireNativeView } from "expo";
import { forwardRef, useMemo, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KInsets, KScreenBaseProps, KScreenHandle } from "./types";
import { nativeWrenLook, type KWrenLookData } from "./Planet";

/* TODAY, AFTER FIFTEEN (2026-11-11, docs/today-after-fifteen.md), drawn by SwiftUI
   (ios/Portable/Today/After, adapter ios/Adapters/KAfterFifteenView.swift) for the Today tab
   (src/screens/today/AfterFifteenNative.tsx). Once the day's last letter has gone past, Today is
   one of three pages until the morning: the mailbox, the receipt, bedtime; each carries one small
   thing to Keep, and under each a strip opens her game.

   A whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost), only after
   isKindredlyUIViewAvailable("KAfterFifteenView") and the "afterfifteen" switch say so
   (lib/after-fifteen useAfterFifteenOn). Outside a Host it is a RedBox in dev and a CRASH in a
   release build. Every word and every number is TS's (src/screens/today/after-view.ts); Swift
   draws, runs the small motions, and reports what the reader did. What they did is kept by TS
   (lib/after-fifteen) and comes back in these props, so the page is as it was left.
   insets.top is the status bar, insets.tabBarRoom the floating bar's room. */

export const AFTER_FIFTEEN_VIEW = "KAfterFifteenView";

export type KAfterPage = "box" | "receipt" | "bedtime";

/** The small daily thing: a line of the day, or one of her facts. */
export type KAfterThing = {
  /** a stranger's line (she adds nothing of her own to it) */
  isLine: boolean;
  /** POND'S FACT · NO. 12 / LINE OF THE DAY */
  tag: string;
  body: string;
  foot: string;
  keep: string;
  kept: string;
  keepStub: string;
  keptStub: string;
  isKept: boolean;
  keepHint: string;
};

export type KAfterStrip = { canPlay: boolean; eyebrow: string; title: string; hint: string };

export type KAfterBox = {
  line: string;
  /** "" when she has nothing to count */
  sub: string;
  hint: string;
  pinned: string;
  slot: string;
  slotOpening: string;
  slotA11y: string;
  eyebrow: string;
  closed: string;
  back: string;
  countdown: string;
  pull: string;
  lift: string;
  pullA11y: string;
  liftA11y: string;
  shut: boolean;
};

export type KAfterRow = { id: string; label: string; value: string; strong: boolean; /** left out of the shared picture */ unshared: boolean };

export type KAfterReceiptPhase = "idle" | "printed" | "torn";

export type KAfterReceipt = {
  line: string;
  shop: string;
  stampLine: string;
  rows: KAfterRow[];
  delivery: KAfterRow[];
  print: string;
  printing: string;
  tear: string;
  share: string;
  phase: KAfterReceiptPhase;
  a11y: string;
};

export type KAfterStep = { label: string; sub: string; subDone: string };
export type KAfterDot = { id: string; letter: string; on: boolean; tonight: boolean };

export type KAfterBed = {
  sayIdle: string;
  sayFed: string;
  sayFull: string;
  sayPat: string;
  sayNeedSnack: string;
  sayNeedPat: string;
  snack: KAfterStep;
  pat: KAfterStep;
  lights: KAfterStep;
  lockedSub: string;
  sleepTag: string;
  streak: string;
  streakSub: string;
  streakDone: string;
  streakSubDone: string;
  next: string;
  nextAt: string;
  dots: KAfterDot[];
  dotsA11y: string;
  dotsA11yDone: string;
  birdA11y: string;
  fed: boolean;
  patted: boolean;
  asleep: boolean;
};

export type KAfterStepName = "snack" | "pat" | "lights";

export type KAfterFifteenViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    page: KAfterPage;
    title: string;
    look: KWrenLookData;
    thing: KAfterThing;
    strip: KAfterStrip;
    box: KAfterBox;
    receipt: KAfterReceipt;
    bed: KAfterBed;
    /** "Undo" while the day's last pass can be taken back; "" otherwise */
    undo: string;
    undoHint: string;
    onSlot?: () => void;
    onShut?: (shut: boolean) => void;
    onKeep?: (keep: boolean) => void;
    onReceipt?: (phase: KAfterReceiptPhase) => void;
    /** the receipt's picture, a file URL in tmp ("" when it couldn't be made) */
    onShare?: (uri: string) => void;
    onStep?: (step: KAfterStepName) => void;
    onPlay?: () => void;
    onUndo?: () => void;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;

type NativeProps = Omit<KAfterFifteenViewProps, "letterFont" | "insets" | "rev" | "look" | "onSlot" | "onShut" | "onKeep" | "onReceipt" | "onShare" | "onStep" | "onPlay" | "onUndo"> &
  Required<Pick<KAfterFifteenViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    look: ReturnType<typeof nativeWrenLook>;
    onAfterSlot?: None;
    onAfterShut?: Ev<{ shut: boolean }>;
    onAfterKeep?: Ev<{ keep: boolean }>;
    onAfterReceipt?: Ev<{ phase: string }>;
    onAfterShare?: Ev<{ uri: string }>;
    onAfterStep?: Ev<{ step: string }>;
    onAfterPlay?: None;
    onAfterUndo?: None;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };

// the view's JS name is the Swift struct's name (ios/Adapters/KAfterFifteenView.swift)
const NativeKAfterFifteenView = requireNativeView<NativeProps>("KindredlyUI", AFTER_FIFTEEN_VIEW);

const isPhase = (p: string): p is KAfterReceiptPhase => p === "idle" || p === "printed" || p === "torn";
const isStep = (s: string): s is KAfterStepName => s === "snack" || s === "pat" || s === "lights";

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. Pass the records memoised with a rev. */
export const KAfterFifteenView = forwardRef<KScreenHandle, KAfterFifteenViewProps>(function KAfterFifteenView(
  { modifiers, letterFont, insets, rev, look, onSlot, onShut, onKeep, onReceipt, onShare, onStep, onPlay, onUndo, ...rest },
  ref,
) {
  const sentLook = useMemo(() => nativeWrenLook(look), [look]);
  return (
    <NativeKAfterFifteenView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      look={sentLook}
      onAfterSlot={onSlot ? () => onSlot() : undefined}
      onAfterShut={onShut ? (e) => onShut(!!e.nativeEvent.shut) : undefined}
      onAfterKeep={onKeep ? (e) => onKeep(!!e.nativeEvent.keep) : undefined}
      onAfterReceipt={onReceipt ? (e) => isPhase(e.nativeEvent.phase) && onReceipt(e.nativeEvent.phase) : undefined}
      onAfterShare={onShare ? (e) => onShare(String(e.nativeEvent.uri ?? "")) : undefined}
      onAfterStep={onStep ? (e) => isStep(e.nativeEvent.step) && onStep(e.nativeEvent.step) : undefined}
      onAfterPlay={onPlay ? () => onPlay() : undefined}
      onAfterUndo={onUndo ? () => onUndo() : undefined}
    />
  );
});
