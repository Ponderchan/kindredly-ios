import { requireNativeView } from "expo";
import { useMemo } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import { nativeFrost, type KFrost, type KImageRefProps, type KInsets, type KScreenBaseProps, type KSign } from "./types";

/* THE EMPTY KINDREDS TAB, drawn by SwiftUI (batch 3, 2026-11-09): ios/Adapters/KKindredsEmptyView.swift
   → ios/Portable/Kindreds/KKindredsEmpty.swift, for src/screens/kindreds/KindredsEmpty.tsx behind the
   "kindredsempty" switch (off by default; the React Native page is the fallback). A whole screen: put
   it alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost, ignoreSafeArea "all"); insets.top is
   the status bar, insets.tabBarRoom the floating bar's room. Every word is TS's; Swift draws them and
   reports the taps. With `slips` (catch a line, 2026-11-12: the first lines of today's letters,
   screens/kindreds/catch-model) the page is the drifting sky instead; a binary whose view has no
   `slips` prop ignores them and draws the page as it was (kindredlyUIViewHasProp). Outside a Host it is a RedBox in dev and a CRASH in a release build: only
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
  /** catch a line: "Letters are passing through." and the line under it */
  catchTitle?: string;
  catchSub?: string;
  /** the opened letter's two buttons */
  letGo?: string;
  writeBack?: string;
};

/** One drifting line and the letter under it (catch-model CatchSlip). The writer is Today's card's
    own: the name, the star sign and the face; a she/he mark is never sent. */
export type KCatchSlip = {
  id: string;
  line: string;
  /** the slip's paper and the opened letter's (hex) */
  wash: string;
  cardWash: string;
  /** a dark theme's hairline round both, in the topic's colour (hex); "" for none */
  edge: string;
  /** the topic tag's fill (hex): the stamp's own colour, as on Today's card */
  tagFill: string;
  who: {
    name: string;
    sign: KSign;
    face: "mosaic" | "frost" | "veil" | "tile";
    mask: number;
    frost: KFrost | null;
  };
  /** "#made my day"; "" for none */
  topic: string;
  body: string;
  /** VoiceOver, for the slip: who, the topic, the line */
  a11y: string;
  /** VoiceOver, for the opened letter's header: who and the topic */
  spoken: string;
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
  /** her avatar as Kindreds' list draws it (assets/wren-avatar.png); a binary before it ignores it */
  avatar?: KImageRefProps | null;
};

export type KKindredsEmptyViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme" | "letterFont" | "insets"> & {
    strings: KKindredsEmptyStrings;
    desk: KKindredsEmptyDesk;
    /** her at the edge of the sky (bird-images "curious40"); null until captured */
    bird: KImageRefProps | null;
    /** catch a line: today's first lines, at most six; none (or absent) is the page as it was */
    slips?: readonly KCatchSlip[];
    /** the tab is on show (the slips drift only then); absent = true */
    active?: boolean;
    onWrite?: () => void;
    onDesk?: () => void;
    /** WRITE BACK on an opened letter */
    onAnswer?: (letterId: string) => void;
  };

type None = (e: { nativeEvent: Record<string, never> }) => void;
type NativeDesk = Omit<KKindredsEmptyDesk, "bird" | "avatar"> & { bird: KImageRefProps; avatar: KImageRefProps };
type NativeSlip = Omit<KCatchSlip, "who"> & { who: { name: string; mark: string; sign: string; face: KCatchSlip["who"]["face"]; mask: number; frost: KFrost } };
type NativeProps = Omit<KKindredsEmptyViewProps, "desk" | "bird" | "slips" | "strings" | "active" | "onWrite" | "onDesk" | "onAnswer"> & {
  strings: Required<KKindredsEmptyStrings>;
  desk: NativeDesk;
  bird: KImageRefProps;
  slips: NativeSlip[];
  active: boolean;
  onKeWrite?: None;
  onKeDesk?: None;
  onKeAnswer?: (e: { nativeEvent: { letterId: string } }) => void;
};

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: KImageRefProps = { uri: "", key: "", kind: "image" };
const imageOf = (r: KImageRefProps | null | undefined): KImageRefProps => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : NO_IMAGE);

// the view's JS name is the Swift struct's name (ios/Adapters/KKindredsEmptyView.swift)
const NativeKKindredsEmptyView = requireNativeView<NativeProps>("KindredlyUI", "KKindredsEmptyView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host> that fills the screen. */
export function KKindredsEmptyView({ modifiers, desk, bird, insets, strings, slips, active, onWrite, onDesk, onAnswer, ...rest }: KKindredsEmptyViewProps) {
  const d = useMemo<NativeDesk>(() => ({ ...desk, bird: imageOf(desk.bird), avatar: imageOf(desk.avatar ?? null) }), [desk]);
  const b = useMemo(() => imageOf(bird), [bird]);
  const words = useMemo<Required<KKindredsEmptyStrings>>(() => ({ catchTitle: "", catchSub: "", letGo: "", writeBack: "", ...strings }), [strings]);
  // a @Field can't take null: "" for no sign, NO_FROST for no window; the mark is never sent
  const lines = useMemo<NativeSlip[]>(
    () => (slips ?? []).map((sl) => ({ ...sl, who: { name: sl.who.name, mark: "", sign: sl.who.sign ?? "", face: sl.who.face, mask: sl.who.mask, frost: nativeFrost(sl.who.frost) } })),
    [slips],
  );
  return (
    <NativeKKindredsEmptyView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      insets={insets ?? NO_INSETS}
      strings={words}
      desk={d}
      bird={b}
      slips={lines}
      active={active ?? true}
      onKeWrite={onWrite ? () => onWrite() : undefined}
      onKeDesk={onDesk ? () => onDesk() : undefined}
      onKeAnswer={onAnswer ? (e) => onAnswer(e.nativeEvent.letterId) : undefined}
    />
  );
}
