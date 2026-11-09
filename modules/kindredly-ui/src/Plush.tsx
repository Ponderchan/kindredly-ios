import { requireNativeView } from "expo";
import { useMemo } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KScreenBaseProps } from "./types";
import type { KSheetDim } from "./SharedSheets";

/* THE PLUSH MOMENT, drawn by SwiftUI (batch 3, 2026-11-09): ios/Adapters/KPlushView.swift →
   ios/Portable/Moments/KPlushCelebration.swift, for src/components/PlushCelebration.tsx behind the
   "plush" switch (off by default; the React Native card is the fallback). It fills a Host inside
   the transparent React Native Modal that fades it in and out; it draws the dim and the card
   (zooming in) and reports the two keys. Outside a Host it is a RedBox in dev and a CRASH in a
   release build: only after isKindredlyUIViewAvailable("KPlushView") and the switch say so
   (NativeSurface). */

export type KPlushStrings = {
  /** NEW LOOK UNLOCKED */
  eyebrow: string;
  /** "Meet ", the name (drawn in ind), "!" */
  meetPre: string;
  meetName: string;
  meetPost: string;
  body: string;
  wear: string;
  keep: string;
};

export type KPlushViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme"> & {
    strings: KPlushStrings;
    /** the Plush bird (bird-images "plush128"); null until captured */
    bird: KImageRefProps | null;
    /** the dim behind the card */
    dim: KSheetDim;
    onWear?: () => void;
    onKeep?: () => void;
  };

type None = (e: { nativeEvent: Record<string, never> }) => void;
type NativeProps = Omit<KPlushViewProps, "bird" | "onWear" | "onKeep"> & { bird: KImageRefProps; onPlWear?: None; onPlKeep?: None };

const NO_IMAGE: KImageRefProps = { uri: "", key: "", kind: "image" };

// the view's JS name is the Swift struct's name (ios/Adapters/KPlushView.swift)
const NativeKPlushView = requireNativeView<NativeProps>("KindredlyUI", "KPlushView");

/** The bare SwiftUI dim and card. Only inside an @expo/ui <Host> that fills the Modal. */
export function KPlushView({ modifiers, bird, onWear, onKeep, ...rest }: KPlushViewProps) {
  const b = useMemo<KImageRefProps>(() => (bird ? { uri: bird.uri, key: bird.key, kind: bird.kind ?? "image" } : NO_IMAGE), [bird]);
  return (
    <NativeKPlushView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      bird={b}
      onPlWear={onWear ? () => onWear() : undefined}
      onPlKeep={onKeep ? () => onKeep() : undefined}
    />
  );
}
