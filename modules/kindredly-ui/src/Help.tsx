import { requireNativeView } from "expo";
import { forwardRef, useMemo, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle } from "./types";

/* HOW KINDREDLY WORKS, drawn by SwiftUI (owner, 2026-10-27: "make Me all Swift";
   ios/Portable/Settings/KHelpScreen.swift, adapter ios/Adapters/KSettingsPagesView.swift), for
   src/screens/settings/HelpNative.tsx. TS words every question and answer; Swift draws them and
   keeps which one is open (the first, to begin with).

   A whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost), only after
   isKindredlyUIViewAvailable("KHelpView") and the "help" NativeSurface switch say so. */

export type KHelpStrings = {
  title: string;
  /** VoiceOver for the back chevron */
  backLabel: string;
  /** her opener, her name in it */
  intro: string;
  /** VoiceOver's values for a question: open, closed */
  expanded: string;
  collapsed: string;
};

export type KHelpItem = { q: string; a: string };

export type KHelpViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KHelpStrings;
    /** her snapshot beside the opener */
    bird: KImageRefProps | null;
    items: KHelpItem[];
    onBack?: () => void;
  };

type None = (e: { nativeEvent: Record<string, never> }) => void;

type NativeKHelpViewProps = Omit<KHelpViewProps, "letterFont" | "insets" | "rev" | "bird" | "onBack"> &
  Required<Pick<KHelpViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    bird: KImageRefProps;
    onHpBack?: None;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: KImageRefProps = { uri: "", key: "", kind: "image" };

const NativeKHelpView = requireNativeView<NativeKHelpViewProps>("KindredlyUI", "KHelpView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. */
export const KHelpView = forwardRef<KScreenHandle, KHelpViewProps>(function KHelpView({ modifiers, letterFont, insets, rev, bird, onBack, ...rest }, ref) {
  const sentBird = useMemo(() => (bird ? { uri: bird.uri, key: bird.key, kind: bird.kind ?? "image" } : NO_IMAGE), [bird]);
  return (
    <NativeKHelpView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      bird={sentBird}
      onHpBack={onBack ? () => onBack() : undefined}
    />
  );
});
