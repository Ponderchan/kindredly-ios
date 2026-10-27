import { requireNativeView } from "expo";
import { forwardRef, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KInsets, KScreenBaseProps, KScreenHandle } from "./types";

/* THE STAMP ALBUM (growth stamps), drawn by SwiftUI (2026-10-27;
   ios/Portable/Pages/KStampBookScreen.swift, adapter ios/Adapters/KMorePagesView.swift), for
   src/screens/stamps/StampBookNative.tsx. TS counts what was earned and words every card
   (screens/stamps/stampbook-model); Swift draws the stamps, keeps which card is open, and reports
   the card's key (TS decides where it goes).

   A whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost), only after
   isKindredlyUIViewAvailable("KStampBookView") and the "stampbook" NativeSurface switch say so. */

export type KStampBookStrings = {
  title: string;
  /** VoiceOver for the back chevron */
  backLabel: string;
  /** "3/12" */
  count: string;
  intro: string;
};

export type KStampBookTile = {
  id: string;
  name: string;
  emoji: string;
  earned: boolean;
  /** the face's gradient, "#RRGGBB" */
  faceFrom: string;
  faceTo: string;
  label: string;
  desc: string;
  /** "2 / 3", or "" */
  progress: string;
  fraction: number;
  /** the card's key */
  action: string;
};

export type KStampBookViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KStampBookStrings;
    tiles: KStampBookTile[];
    onBack?: () => void;
    /** the open card's key: the stamp's id (the card has closed) */
    onAction?: (id: string) => void;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;

type NativeKStampBookViewProps = Omit<KStampBookViewProps, "letterFont" | "insets" | "rev" | "onBack" | "onAction"> &
  Required<Pick<KStampBookViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    onSbBack?: None;
    onSbAction?: Ev<{ id: string }>;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };

const NativeKStampBookView = requireNativeView<NativeKStampBookViewProps>("KindredlyUI", "KStampBookView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. Pass the records memoised with a rev. */
export const KStampBookView = forwardRef<KScreenHandle, KStampBookViewProps>(function KStampBookView(
  { modifiers, letterFont, insets, rev, onBack, onAction, ...rest },
  ref,
) {
  return (
    <NativeKStampBookView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      onSbBack={onBack ? () => onBack() : undefined}
      onSbAction={onAction ? (e) => onAction(e.nativeEvent.id) : undefined}
    />
  );
});
