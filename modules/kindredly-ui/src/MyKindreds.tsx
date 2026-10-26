import { requireNativeView } from "expo";
import { forwardRef, useMemo, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle } from "./types";
import type { KMyLettersFace } from "./MyLetters";

/* MY KINDREDS, drawn by SwiftUI (owner, 2026-10-27: a new page that lists ONLY kindreds — the
   people you traded names and faces with — as signed cards; ios/Portable/Me/KMyKindredsScreen.swift,
   adapter ios/Adapters/KMePagesView.swift KMyKindredsView), for
   src/screens/my-kindreds/MyKindredsNative.tsx. TS reads the threads and words every card
   (src/screens/my-kindreds/my-kindreds-model.ts); Swift draws them and reports taps.

   A whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost), only after
   isKindredlyUIViewAvailable("KMyKindredsView") and the "mykindreds" NativeSurface switch say so. */

export type KMyKindredsStrings = {
  title: string;
  /** VoiceOver for the back chevron */
  backLabel: string;
  /** the kindreds' count at the bar's right; "" until a list is read */
  count: string;
  lede: string;
  /** no kindred yet: what a kindred is and how you get one */
  empty: string;
  /** nothing could be read and nothing was kept */
  failed: string;
};

export type KMyKindredsState = "loading" | "ready" | "empty" | "failed";

export type KMyKindredCard = {
  /** the thread's id */
  id: string;
  name: string;
  /** their face as Swift's KFace takes it (lib/faces faceRecord, a kindred's: never a frost), with their member stamp */
  face: KMyLettersFace | null;
  /** "KINDREDS · SEP 18" (in.sinceChip); "" when the day isn't known */
  since: string;
  /** the last letter's day or time; "" for none */
  when: string;
  /** "You: " when the last line is yours; "" */
  youPrefix: string;
  /** the last line; "" for none */
  preview: string;
  /** their letters not yet opened here ("3", "9+"); "" */
  badge: string;
  a11y: string;
};

export type KMyKindredsViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KMyKindredsStrings;
    state: KMyKindredsState;
    /** her snapshot over the empty and failed lines */
    bird: KImageRefProps | null;
    cards: KMyKindredCard[];
    onBack?: () => void;
    onOpen?: (id: string) => void;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;
type NativeCard = Omit<KMyKindredCard, "face"> & { face: KMyLettersFace };

type NativeKMyKindredsViewProps = Omit<KMyKindredsViewProps, "letterFont" | "insets" | "rev" | "bird" | "cards" | "onBack" | "onOpen"> &
  Required<Pick<KMyKindredsViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    bird: KImageRefProps;
    cards: NativeCard[];
    onMkBack?: None;
    onMkOpen?: Ev<{ id: string }>;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_FACE: KMyLettersFace = { kind: "placeholder", uri: "", key: "", overscan: 0, mask: 0, stamp: "" };
const NO_IMAGE: KImageRefProps = { uri: "", key: "", kind: "image" };

const NativeKMyKindredsView = requireNativeView<NativeKMyKindredsViewProps>("KindredlyUI", "KMyKindredsView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. Pass the records memoised with a rev. */
export const KMyKindredsView = forwardRef<KScreenHandle, KMyKindredsViewProps>(function KMyKindredsView(
  { modifiers, letterFont, insets, rev, bird, cards, onBack, onOpen, ...rest },
  ref,
) {
  // a Swift record can't take null: no face is the placeholder disc, no picture an empty ref
  const sentCards = useMemo(() => cards.map((c) => ({ ...c, face: c.face ? { ...c.face, stamp: c.face.stamp ?? "" } : NO_FACE })), [cards]);
  const sentBird = useMemo(() => (bird ? { uri: bird.uri, key: bird.key, kind: bird.kind ?? "image" } : NO_IMAGE), [bird]);
  return (
    <NativeKMyKindredsView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      bird={sentBird}
      cards={sentCards}
      onMkBack={onBack ? () => onBack() : undefined}
      onMkOpen={onOpen ? (e) => onOpen(e.nativeEvent.id) : undefined}
    />
  );
});
