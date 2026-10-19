import { requireNativeView } from "expo";
import { forwardRef, useMemo, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KInsets, KScreenBaseProps, KScreenHandle } from "./types";

/* MY LETTERS, drawn by SwiftUI (Me 4a, Prompt 8; ios/Portable/Kit/KBackBar.swift
   KMyLettersScreen, adapter ios/Adapters/KSettingsView.swift KMyLettersView), for
   src/screens/letters/MyLettersNative.tsx. TS builds every card (src/screens/letters/
   letters-model.ts) with its words resolved; Swift owns the filter and manage mode, and reports
   taps. Removing a letter or a draft is TS's: onRemove sends the id, and TS asks first (the same
   Alert as the React Native page) before it withdraws anything.

   A whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost), only after
   isKindredlyUIViewAvailable("KMyLettersView") and the "myletters" NativeSurface switch say so. */

export type KMyLettersStrings = {
  title: string;
  write: string;
  manage: string;
  cancel: string;
  /** VoiceOver for the × on a card while managing */
  remove: string;
  /** VoiceOver for the back chevron */
  back: string;
  /** an empty Answered or Quiet filter */
  none: string;
  /** an empty Drafts filter */
  noDrafts: string;
};

export type KMyLettersFilter = { key: "all" | "answered" | "quiet" | "drafts"; label: string; count: number };

/** A face as Swift's KFace takes it (lib/faces faceRecord without the frost: a reply's face is a kindred's). */
export type KMyLettersFace = { kind: "image" | "mosaic" | "veil" | "placeholder" | "frost"; uri: string; key: string; overscan: number; mask: number };

export type KMyLettersCard = {
  id: string;
  kind: "letter" | "draft";
  tag: "answered" | "quiet" | "draft";
  /** "2026.09.23"; a draft's is "DRAFT · 2026.09.23" */
  date: string;
  reads: number;
  answers: number;
  stampId: string;
  /** the stamp's colour ("#RRGGBB"), "" when unknown */
  stampHex: string;
  body: string;
  tone: "quiet" | "answered" | "replied" | "draft";
  /** the status band's words, resolved */
  status: string;
  /** the replier's face (tone replied); null for none */
  face: KMyLettersFace | null;
  /** a tap opens something (onOpen) */
  opens: boolean;
  a11y: string;
};

export type KMyLettersViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KMyLettersStrings;
    filters: KMyLettersFilter[];
    /** newest first; Swift deals them into the two columns */
    cards: KMyLettersCard[];
    /** false until the first read is in: no empty-state words yet */
    loaded: boolean;
    onBack?: () => void;
    onWrite?: () => void;
    onOpen?: (id: string) => void;
    onRemove?: (id: string) => void;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;
type NativeCard = Omit<KMyLettersCard, "face"> & { face: KMyLettersFace };

type NativeKMyLettersViewProps = Omit<KMyLettersViewProps, "letterFont" | "insets" | "rev" | "cards" | "onBack" | "onWrite" | "onOpen" | "onRemove"> &
  Required<Pick<KMyLettersViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    cards: NativeCard[];
    onMlBack?: None;
    onMlWrite?: None;
    onMlOpen?: Ev<{ id: string }>;
    onMlRemove?: Ev<{ id: string }>;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_FACE: KMyLettersFace = { kind: "placeholder", uri: "", key: "", overscan: 0, mask: 0 };

const NativeKMyLettersView = requireNativeView<NativeKMyLettersViewProps>("KindredlyUI", "KMyLettersView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. Pass the records memoised with a rev. */
export const KMyLettersView = forwardRef<KScreenHandle, KMyLettersViewProps>(function KMyLettersView(
  { modifiers, letterFont, insets, rev, cards, onBack, onWrite, onOpen, onRemove, ...rest },
  ref,
) {
  // a Swift record can't take null: no face is the placeholder, which Swift doesn't draw for a
  // card whose tone isn't "replied"
  const sentCards = useMemo(() => cards.map((c) => ({ ...c, face: c.face ?? NO_FACE })), [cards]);
  return (
    <NativeKMyLettersView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      cards={sentCards}
      onMlBack={onBack ? () => onBack() : undefined}
      onMlWrite={onWrite ? () => onWrite() : undefined}
      onMlOpen={onOpen ? (e) => onOpen(e.nativeEvent.id) : undefined}
      onMlRemove={onRemove ? (e) => onRemove(e.nativeEvent.id) : undefined}
    />
  );
});
