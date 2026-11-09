import { requireNativeView } from "expo";
import { useMemo } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KScreenBaseProps } from "./types";

/* THE EMPTY KINDREDS TAB, drawn by SwiftUI (batch 3, 2026-11-09): ios/Adapters/KKindredsEmptyView.swift
   → ios/Portable/Kindreds/KKindredsEmpty.swift, for src/screens/kindreds/KindredsEmpty.tsx behind the
   "kindredsempty" switch (off by default; the React Native page is the fallback). A whole screen: put
   it alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost, ignoreSafeArea "all"); insets.top is
   the status bar, insets.tabBarRoom the floating bar's room. Every word is TS's; Swift draws them and
   reports the two taps. Outside a Host it is a RedBox in dev and a CRASH in a release build: only
   after isKindredlyUIViewAvailable("KKindredsEmptyView") and the switch say so (NativeSurface). */

export type KKindredsEmptyStrings = {
  title: string;
  /** NONE YET (the plate's status, mute) */
  status: string;
  /** YOU, under the centre cell */
  you: string;
  heading: string;
  body: string;
  rule: string;
  cta: string;
  /** "WREN PICKS" (the CTA's mono half, already upper-cased) */
  picks: string;
};

/** Her desk card (WrenDeskRow standalone), as useWrenDesk reads it. */
export type KKindredsEmptyDesk = {
  name: string;
  /** WREN, upper-cased */
  tag: string;
  /** NEW */
  newLabel: string;
  unread: boolean;
  /** "3", "9+"; "" when nothing is unread */
  badge: string;
  /** "" for none */
  ago: string;
  line: string;
  a11y: string;
  /** her official snapshot (bird-images "official"); null until captured */
  bird: KImageRefProps | null;
};

export type KKindredsEmptyViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme" | "letterFont" | "insets"> & {
    strings: KKindredsEmptyStrings;
    desk: KKindredsEmptyDesk;
    /** her at the edge of the sky (bird-images "curious40"); null until captured */
    bird: KImageRefProps | null;
    onWrite?: () => void;
    onDesk?: () => void;
  };

type None = (e: { nativeEvent: Record<string, never> }) => void;
type NativeDesk = Omit<KKindredsEmptyDesk, "bird"> & { bird: KImageRefProps };
type NativeProps = Omit<KKindredsEmptyViewProps, "desk" | "bird" | "onWrite" | "onDesk"> & {
  desk: NativeDesk;
  bird: KImageRefProps;
  onKeWrite?: None;
  onKeDesk?: None;
};

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: KImageRefProps = { uri: "", key: "", kind: "image" };
const imageOf = (r: KImageRefProps | null | undefined): KImageRefProps => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : NO_IMAGE);

// the view's JS name is the Swift struct's name (ios/Adapters/KKindredsEmptyView.swift)
const NativeKKindredsEmptyView = requireNativeView<NativeProps>("KindredlyUI", "KKindredsEmptyView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host> that fills the screen. */
export function KKindredsEmptyView({ modifiers, desk, bird, insets, onWrite, onDesk, ...rest }: KKindredsEmptyViewProps) {
  const d = useMemo<NativeDesk>(() => ({ ...desk, bird: imageOf(desk.bird) }), [desk]);
  const b = useMemo(() => imageOf(bird), [bird]);
  return (
    <NativeKKindredsEmptyView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      insets={insets ?? NO_INSETS}
      desk={d}
      bird={b}
      onKeWrite={onWrite ? () => onWrite() : undefined}
      onKeDesk={onDesk ? () => onDesk() : undefined}
    />
  );
}
