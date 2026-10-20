import { requireNativeView } from "expo";
import { forwardRef, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KInsets, KScreenBaseProps, KScreenHandle } from "./types";

/* THE STAMP PRESS EDIT PAGE, drawn by SwiftUI (build agent B "edit", 2026-10-19;
   ios/Portable/Profile/KFaceStrip.swift KStampEditScreen, adapter ios/Adapters/KEditProfileView.swift
   KStampEditView), for src/screens/stamp-edit/StampEditNative.tsx. TS resolves every word and
   decides the phase from stamp-check's answer (src/lib/stamp-press); Swift keeps the #topic, the
   colour and the filter while they are being chosen, renders the filters, makes the JPEG and
   reports the submit with the two files.

   A whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost field), only after
   isKindredlyUIViewAvailable("KStampEditView") says so. Outside a Host it is a RedBox in dev and a
   CRASH in a release build. There is no React Native fallback (new work is Swift only). */

export type KStampEditStrings = {
  title: string;
  retake: string;
  eyebrow: string;
  cardMeta: string;
  firstLine: string;
  topicPlaceholder: string;
  topicLabel: string;
  aurasClose: string;
  colourLabel: string;
  filterLabel: string;
  submit: string;
  checking: string;
  keepFC: string;
  fcRibbon: string;
  fcBadge: string;
  lockedHint: string;
  /** "THIS IS 2 OF 3 FREE", or "" */
  freeLine: string;
  yours: string;
  stampLabel: string;
  holdHint: string;
  selected: string;
  rejectBody: string;
  rejectRetry: string;
  rejectRename: string;
  cardTitle: string;
  cardBody: string;
  cardPrimary: string;
  cardSecondary: string;
  /** said to VoiceOver when the phase arrives */
  announce: string;
};

export type KStampEditPhase = "editing" | "checking" | "rejected" | "approved" | "unavailable" | "quota" | "cap" | "problem";

export type KStampEditSubmit = { image: string; original: string; topic: string; category: string; filter: string };

export type KStampEditViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KStampEditStrings;
    categories: { id: string; hex: string; name: string }[];
    filters: { id: string; name: string; locked: boolean }[];
    filterEditable: boolean;
    gold: boolean;
    editing: boolean;
    phase: KStampEditPhase;
    rejectField: "image" | "topic";
    /** bump to put the page back to photo / topic / category / filter */
    seed: number;
    /** file:// of the 3:4 crop (the camera's 1200 × 1600; any other picture is centre-cropped); "" draws the dev stand-in scene */
    photo: string;
    topic: string;
    category: string;
    filter: string;
    onRetake?: () => void;
    onSubmit?: (s: KStampEditSubmit) => void;
    onUpgrade?: () => void;
    onReset?: () => void;
    onFlown?: () => void;
    onCardPrimary?: () => void;
    onCardSecondary?: () => void;
    onExportFailed?: () => void;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;

type NativeKStampEditViewProps = Omit<
  KStampEditViewProps,
  "letterFont" | "insets" | "rev" | "onRetake" | "onSubmit" | "onUpgrade" | "onReset" | "onFlown" | "onCardPrimary" | "onCardSecondary" | "onExportFailed"
> &
  Required<Pick<KStampEditViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    onStampEditRetake?: None;
    onStampEditSubmit?: Ev<KStampEditSubmit>;
    onStampEditUpgrade?: None;
    onStampEditReset?: None;
    onStampEditFlown?: None;
    onStampEditCardPrimary?: None;
    onStampEditCardSecondary?: None;
    onStampEditExportFailed?: None;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };

// the view's JS name is the Swift struct's name (ios/Adapters/KEditProfileView.swift)
const NativeKStampEditView = requireNativeView<NativeKStampEditViewProps>("KindredlyUI", "KStampEditView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. */
export const KStampEditView = forwardRef<KScreenHandle, KStampEditViewProps>(function KStampEditView(
  { modifiers, letterFont, insets, rev, onRetake, onSubmit, onUpgrade, onReset, onFlown, onCardPrimary, onCardSecondary, onExportFailed, ...rest },
  ref,
) {
  return (
    <NativeKStampEditView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      onStampEditRetake={onRetake ? () => onRetake() : undefined}
      onStampEditSubmit={onSubmit ? (e) => onSubmit(e.nativeEvent) : undefined}
      onStampEditUpgrade={onUpgrade ? () => onUpgrade() : undefined}
      onStampEditReset={onReset ? () => onReset() : undefined}
      onStampEditFlown={onFlown ? () => onFlown() : undefined}
      onStampEditCardPrimary={onCardPrimary ? () => onCardPrimary() : undefined}
      onStampEditCardSecondary={onCardSecondary ? () => onCardSecondary() : undefined}
      onStampEditExportFailed={onExportFailed ? () => onExportFailed() : undefined}
    />
  );
});
