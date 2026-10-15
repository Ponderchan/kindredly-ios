import { requireNativeView } from "expo";
import { forwardRef, useMemo, type ReactNode, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle, KStandardCommands } from "./types";

/* THE ME TAB, drawn by SwiftUI (ios/Portable/Me/KMeScreen.swift, adapter ios/Adapters/KMeView.swift),
   for src/screens/me/MeNative.tsx. Every word, figure and destination comes in from TS
   (src/screens/me/me-model.ts builds them); Swift draws them and reports taps. Swift keeps only
   the gesture's state: the segment showing (reported through onSegment), the scroll, the pinned
   chips.

   It is a whole screen: put it alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost in
   src/components/NativeSurface.tsx; ignoreSafeArea "all" — it has no text field), and only after
   isKindredlyUIViewAvailable("KMeView") and the "me" NativeSurface switch say so. Outside a Host
   it is a RedBox in dev and a CRASH in a release build. Its ref is a KScreenHandle: give it
   `commands.ref` from useKCommands<KMeCommands> (commands.ts).

   insets.top is the status bar (Swift draws the page colour under it, with the 52pt bar at its
   foot); insets.tabBarRoom is the floating bar's room (the page's end clears it, plus 12, and
   never less than the bottom fade). Pass the records memoised, with a rev from useRev: Swift
   converts them once per rev, and every prop change re-sends the whole props map.

   CHILDREN: exactly three <KIsland>s, in this order, on every render (Slot.tsx): "avatar"
   (56 × 56), "courier" (the frame's inside × 236: the window less 37) and "auraArt" (the Aura
   card's inside × 110: the window less 69). Fill the courier and aura islands only while their
   card shows (onSegment says which), so a hidden CourierCard isn't running its loops. */

export type KMeStat = {
  key: "letters" | "kindreds";
  glyph: "envelope" | "bubbles";
  count: string;
  unit: string;
  a11y: string;
};

export type KMeProfile = {
  name: string;
  /** "" for none */
  joined: string;
  /** "" for none */
  cofounder: string;
  editLabel: string;
  stats: KMeStat[];
};

export type KMeAura = {
  /** false: no aura read yet (the card's skeleton); the rest is then ignored */
  present: boolean;
  label: string;
  title: string;
  from: string;
  chips: { id: string; name: string; emerging: boolean }[];
  meterKind: "ticks" | "slots";
  filled: number;
  total: number;
  /** -1 for no slips */
  slipsN: number;
  slipsOf: number;
  caption: string;
  cta: string;
  share: boolean;
  shareLabel: string;
};

export type KMeStamps = {
  label: string;
  count: string;
  cells: { id: string; date: string; a11y: string; hex: string }[];
  emptyText: string;
  emptyCta: string;
};

export type KMeKeepsakes = {
  header: string;
  count: string;
  note: string;
  a11y: string;
  /** two tiles; id "" for an empty (dashed) one */
  tiles: { id: string; name: string; image: KImageRefProps | null; fresh: boolean }[];
};

export type KMeFirstClass = {
  eyebrow: string;
  headline: string;
  sub: string;
  cta: string;
  stampLabel: string;
  /** the courier's snapshot for the stamp (lib/bird-images fcFree / fcMember); null for none */
  bird: KImageRefProps | null;
};

export type KMeStrings = {
  title: string;
  penName: string;
  settingsLabel: string;
  courierA11y: string;
  /** Courier, Aura, Stamps, First Class */
  segments: string[];
};

/** The Me view's commands: scrollTo top (Me pressed again), and segment, which shows a card as
    its chip would (no onSegment for it). */
export type KMeCommands = Omit<KStandardCommands, "scrollTo"> & {
  scrollTo: { key: "top"; animated?: boolean };
  segment: { index: number };
};

export type KMeViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KMeStrings;
    profile: KMeProfile;
    aura: KMeAura;
    stamps: KMeStamps;
    keepsakes: KMeKeepsakes;
    firstClass: KMeFirstClass;
    /** the segment to open on (read when the view first draws) */
    initialSegment: number;
    onSettings?: () => void;
    onEdit?: () => void;
    onStat?: (key: "letters" | "kindreds") => void;
    onSegment?: (index: number) => void;
    onCourier?: () => void;
    onKeepsakes?: () => void;
    onKeepsake?: (id: string) => void;
    onAuraOpen?: () => void;
    onAuraCta?: () => void;
    onAuraShare?: () => void;
    onStampsEmpty?: () => void;
    onFirstClass?: () => void;
    /** the three <KIsland>s: avatar, courier, auraArt (see the top) */
    children?: ReactNode;
  };

type Ev<T> = (e: { nativeEvent: T }) => void;
type None = Ev<Record<string, never>>;
type NativeImage = { uri: string; key: string; kind: "image" | "videoPoster" };

type NativeKMeViewProps = Omit<
  KMeViewProps,
  | "letterFont"
  | "insets"
  | "rev"
  | "keepsakes"
  | "firstClass"
  | "onSettings"
  | "onEdit"
  | "onStat"
  | "onSegment"
  | "onCourier"
  | "onKeepsakes"
  | "onKeepsake"
  | "onAuraOpen"
  | "onAuraCta"
  | "onAuraShare"
  | "onStampsEmpty"
  | "onFirstClass"
> &
  Required<Pick<KMeViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    keepsakes: Omit<KMeKeepsakes, "tiles"> & { tiles: { id: string; name: string; image: NativeImage; fresh: boolean }[] };
    firstClass: Omit<KMeFirstClass, "bird"> & { bird: NativeImage };
    onMeSettings?: None;
    onMeEdit?: None;
    onMeStat?: Ev<{ key: "letters" | "kindreds" }>;
    onMeSegment?: Ev<{ index: number }>;
    onMeCourier?: None;
    onMeKeepsakes?: None;
    onMeKeepsake?: Ev<{ id: string }>;
    onMeAuraOpen?: None;
    onMeAuraCta?: None;
    onMeAuraShare?: None;
    onMeStampsEmpty?: None;
    onMeFirstClass?: None;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: NativeImage = { uri: "", key: "", kind: "image" };
const image = (r: KImageRefProps | null | undefined): NativeImage => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : NO_IMAGE);

/** The keepsakes as the Swift record wants them: every field present (a Swift @Field record
    can't take null), always two tiles. */
export function nativeKeepsakes(k: KMeKeepsakes): NativeKMeViewProps["keepsakes"] {
  const tiles = k.tiles.slice(0, 2).map((t) => ({ id: t.id, name: t.name, image: image(t.image), fresh: t.fresh }));
  while (tiles.length < 2) tiles.push({ id: "", name: "", image: NO_IMAGE, fresh: false });
  return { header: k.header, count: k.count, note: k.note, a11y: k.a11y, tiles };
}

// the view's JS name is the Swift struct's name (ios/Adapters/KMeView.swift)
const NativeKMeView = requireNativeView<NativeKMeViewProps>("KindredlyUI", "KMeView");

/** The bare SwiftUI screen. Only inside an @expo/ui <Host>; its ref takes commands. Pass the
    records memoised with a rev from useRev, and the three islands as children. */
export const KMeView = forwardRef<KScreenHandle, KMeViewProps>(function KMeView(
  {
    modifiers,
    letterFont,
    insets,
    rev,
    keepsakes,
    firstClass,
    onSettings,
    onEdit,
    onStat,
    onSegment,
    onCourier,
    onKeepsakes,
    onKeepsake,
    onAuraOpen,
    onAuraCta,
    onAuraShare,
    onStampsEmpty,
    onFirstClass,
    ...rest
  },
  ref,
) {
  // the converted records follow their source's identity, so a render that changes nothing
  // else doesn't send them again
  const sentKeepsakes = useMemo(() => nativeKeepsakes(keepsakes), [keepsakes]);
  const sentFirstClass = useMemo(() => ({ ...firstClass, bird: image(firstClass.bird) }), [firstClass]);
  return (
    <NativeKMeView
      ref={ref}
      modifiers={modifiers}
      // lets event modifiers (onTapGesture, onAppear…) reach this view, as @expo/ui's own views do
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      // always sent, so Swift never sees a base prop go missing
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      keepsakes={sentKeepsakes}
      firstClass={sentFirstClass}
      onMeSettings={onSettings ? () => onSettings() : undefined}
      onMeEdit={onEdit ? () => onEdit() : undefined}
      onMeStat={onStat ? (e) => onStat(e.nativeEvent.key) : undefined}
      onMeSegment={onSegment ? (e) => onSegment(e.nativeEvent.index) : undefined}
      onMeCourier={onCourier ? () => onCourier() : undefined}
      onMeKeepsakes={onKeepsakes ? () => onKeepsakes() : undefined}
      onMeKeepsake={onKeepsake ? (e) => onKeepsake(e.nativeEvent.id) : undefined}
      onMeAuraOpen={onAuraOpen ? () => onAuraOpen() : undefined}
      onMeAuraCta={onAuraCta ? () => onAuraCta() : undefined}
      onMeAuraShare={onAuraShare ? () => onAuraShare() : undefined}
      onMeStampsEmpty={onStampsEmpty ? () => onStampsEmpty() : undefined}
      onMeFirstClass={onFirstClass ? () => onFirstClass() : undefined}
    />
  );
});
