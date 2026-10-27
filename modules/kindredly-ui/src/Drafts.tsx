import { requireNativeView } from "expo";
import { forwardRef, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KInsets, KScreenBaseProps, KScreenHandle } from "./types";

/* UNSENT, drawn by SwiftUI (2026-10-27; ios/Portable/Pages/KDraftsScreen.swift, adapter
   ios/Adapters/KMorePagesView.swift), for src/screens/drafts/DraftsNative.tsx. TS reads the drafts
   and builds every card (screens/drafts/drafts-model); Swift draws them and reports taps. TS opens
   a draft on the letter desk and asks before one is thrown away (the React Native page's Alert).

   A whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost), only after
   isKindredlyUIViewAvailable("KDraftsView") and the "drafts" NativeSurface switch say so. */

export type KDraftsStrings = {
  title: string;
  /** VoiceOver for the back chevron */
  backLabel: string;
  /** "03", or "··" while they load */
  count: string;
  emptyTitle: string;
  emptyBody: string;
  hint: string;
  /** the VoiceOver action that throws one away */
  throwLabel: string;
};

export type KDraftsCard = {
  id: string;
  date: string;
  words: string;
  /** "" for none */
  stamp: string;
  /** a known stamp's colour, "" otherwise */
  stampHex: string;
  a11y: string;
};

export type KDraftsViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KDraftsStrings;
    loaded: boolean;
    cards: KDraftsCard[];
    onBack?: () => void;
    onOpen?: (id: string) => void;
    onThrow?: (id: string) => void;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;

type NativeKDraftsViewProps = Omit<KDraftsViewProps, "letterFont" | "insets" | "rev" | "onBack" | "onOpen" | "onThrow"> &
  Required<Pick<KDraftsViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    onDrBack?: None;
    onDrOpen?: Ev<{ id: string }>;
    onDrThrow?: Ev<{ id: string }>;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };

const NativeKDraftsView = requireNativeView<NativeKDraftsViewProps>("KindredlyUI", "KDraftsView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. Pass the records memoised with a rev. */
export const KDraftsView = forwardRef<KScreenHandle, KDraftsViewProps>(function KDraftsView(
  { modifiers, letterFont, insets, rev, onBack, onOpen, onThrow, ...rest },
  ref,
) {
  return (
    <NativeKDraftsView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      onDrBack={onBack ? () => onBack() : undefined}
      onDrOpen={onOpen ? (e) => onOpen(e.nativeEvent.id) : undefined}
      onDrThrow={onThrow ? (e) => onThrow(e.nativeEvent.id) : undefined}
    />
  );
});
