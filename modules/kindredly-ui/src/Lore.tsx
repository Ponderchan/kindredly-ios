import { requireNativeView } from "expo";
import { forwardRef, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KInsets, KScreenBaseProps, KScreenHandle } from "./types";

/* LORE, drawn by SwiftUI (2026-10-27; ios/Portable/Pages/KLoreScreen.swift, adapter
   ios/Adapters/KMorePagesView.swift), for src/screens/lore/LoreNative.tsx. TS reads the shelf and
   words every clipping (screens/lore/lore-model); Swift draws them and reports a hold. TS asks
   before a line comes down (the React Native page's Alert) and takes it down.

   A whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost), only after
   isKindredlyUIViewAvailable("KLoreView") and the "lore" NativeSurface switch say so. */

export type KLoreStrings = {
  title: string;
  /** VoiceOver for the back chevron */
  backLabel: string;
  head: string;
  empty: string;
  /** the VoiceOver action that takes a line down, and its hint */
  removeLabel: string;
  removeHint: string;
};

export type KLoreCard = { id: string; /** "" for none */ prompt: string; body: string; from: string };

export type KLoreViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KLoreStrings;
    loaded: boolean;
    cards: KLoreCard[];
    onBack?: () => void;
    onRemove?: (id: string) => void;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;

type NativeKLoreViewProps = Omit<KLoreViewProps, "letterFont" | "insets" | "rev" | "onBack" | "onRemove"> &
  Required<Pick<KLoreViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    onLoBack?: None;
    onLoRemove?: Ev<{ id: string }>;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };

const NativeKLoreView = requireNativeView<NativeKLoreViewProps>("KindredlyUI", "KLoreView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. Pass the records memoised with a rev. */
export const KLoreView = forwardRef<KScreenHandle, KLoreViewProps>(function KLoreView({ modifiers, letterFont, insets, rev, onBack, onRemove, ...rest }, ref) {
  return (
    <NativeKLoreView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      onLoBack={onBack ? () => onBack() : undefined}
      onLoRemove={onRemove ? (e) => onRemove(e.nativeEvent.id) : undefined}
    />
  );
});
