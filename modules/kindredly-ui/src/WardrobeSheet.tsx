import { requireNativeView } from "expo";
import { useMemo } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KScreenBaseProps } from "./types";

/* THE WARDROBE SHEET, drawn by SwiftUI (batch 3, 2026-11-09): ios/Adapters/KWardrobeSheetView.swift
   → ios/Portable/Today/KWardrobeSheet.swift, for WardrobeSheet in src/screens/today/WardrobeSlip.tsx
   behind the "wardrobesheet" switch (off by default; the React Native page sheet is the fallback).
   The view goes in a 1pt @expo/ui <Host> and presents an iOS sheet while `presented` is true. TS
   holds the trial look and every word; Swift draws and reports taps, a close (the ✕ or a drag
   down) and, once it has finished going, onGone. Outside a Host it is a RedBox in dev and a CRASH
   in a release build: only after isKindredlyUIViewAvailable("KWardrobeSheetView") and the switch
   say so (NativeSurface). */

export type KWardrobeSheetStrings = {
  /** "Otis's wardrobe" */
  head: string;
  line: string;
  /** VoiceOver's name for the ✕ */
  close: string;
  keep: string;
  /** LOOKS, and its count "2/5" */
  looksLabel: string;
  looksCount: string;
  /** DRESS, and its count */
  dressLabel: string;
  dressCount: string;
};

/** One rack tile (the courier page's KCourierTile). */
export type KWardrobeTile = {
  id: string;
  label: string;
  /** the brass tag; "" when it's hers */
  lock: string;
  /** VoiceOver's hint on a locked tile; "" for none */
  hint: string;
  /** the one tried on */
  on: boolean;
  bird: KImageRefProps | null;
};

export type KWardrobeSheetViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme"> & {
    /** the sheet is up (turning it off takes it down without onClose) */
    presented: boolean;
    strings: KWardrobeSheetStrings;
    /** her, big, trying it on; null until the first capture */
    bird: KImageRefProps | null;
    /** the big pictures one tap away, loaded unseen */
    near: KImageRefProps[];
    looks: KWardrobeTile[];
    dress: KWardrobeTile[];
    onLook?: (id: string) => void;
    onDress?: (id: string) => void;
    onKeep?: () => void;
    /** the ✕, or a drag down */
    onClose?: () => void;
    /** the sheet has finished going, however it went */
    onGone?: () => void;
  };

type None = (e: { nativeEvent: Record<string, never> }) => void;
type Id = (e: { nativeEvent: { id: string } }) => void;
type NativeTile = Omit<KWardrobeTile, "bird"> & { bird: KImageRefProps };
type NativeProps = Omit<KWardrobeSheetViewProps, "bird" | "near" | "looks" | "dress" | "onLook" | "onDress" | "onKeep" | "onClose" | "onGone"> & {
  bird: KImageRefProps;
  near: KImageRefProps[];
  looks: NativeTile[];
  dress: NativeTile[];
  onWsLook?: Id;
  onWsDress?: Id;
  onWsKeep?: None;
  onWsClose?: None;
  onWsGone?: None;
};

const NO_IMAGE: KImageRefProps = { uri: "", key: "", kind: "image" };
const imageOf = (r: KImageRefProps | null | undefined): KImageRefProps => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : NO_IMAGE);
const tilesOf = (tiles: KWardrobeTile[]): NativeTile[] => tiles.map((t) => ({ ...t, bird: imageOf(t.bird) }));

// the view's JS name is the Swift struct's name (ios/Adapters/KWardrobeSheetView.swift)
const NativeKWardrobeSheetView = requireNativeView<NativeProps>("KindredlyUI", "KWardrobeSheetView");

/** The bare SwiftUI sheet's anchor. Only inside an @expo/ui <Host> (1pt is enough). */
export function KWardrobeSheetView({ modifiers, bird, near, looks, dress, onLook, onDress, onKeep, onClose, onGone, ...rest }: KWardrobeSheetViewProps) {
  const b = useMemo(() => imageOf(bird), [bird]);
  const n = useMemo(() => near.map(imageOf), [near]);
  const l = useMemo(() => tilesOf(looks), [looks]);
  const d = useMemo(() => tilesOf(dress), [dress]);
  return (
    <NativeKWardrobeSheetView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      bird={b}
      near={n}
      looks={l}
      dress={d}
      onWsLook={onLook ? (e) => onLook(e.nativeEvent.id) : undefined}
      onWsDress={onDress ? (e) => onDress(e.nativeEvent.id) : undefined}
      onWsKeep={onKeep ? () => onKeep() : undefined}
      onWsClose={onClose ? () => onClose() : undefined}
      onWsGone={onGone ? () => onGone() : undefined}
    />
  );
}
