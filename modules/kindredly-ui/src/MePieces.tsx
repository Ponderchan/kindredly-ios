import { requireNativeView } from "expo";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KScreenBaseProps } from "./types";

/* TWO PIECES OF ME IN SWIFTUI (2026-10-27), each behind its own switch (src/lib/surfaces.ts,
   off by default) with its React Native island kept for when it is off:
   - the courier's card ("couriercard"): KMeView draws it in the courier frame (ios/Portable/Me/
     KCourierCard.swift) when its `courierCard` record says `on`, instead of the "courier" island;
   - the Aura card's picture ("auraart"): KMeView and KAuraRoomView draw it in the card's art slot
     (ios/Portable/Me/KAuraArt.swift) when their `auraArt` record says `on`, instead of the
     "auraArt" island.
   The records are built by src/screens/me/me-pieces.ts from the pure models (src/components/
   courier-card-model.ts, aura-art-model.ts). Turn one on only where isKindredlyUIViewAvailable
   says the binary has its marker view below ("KCourierCardView", "KAuraArtView"): an older binary
   ignores the record and would show an empty frame where the island used to be.

   The marker views draw one piece on its own (a dev page). Each needs an @expo/ui <Host>. */

/** The hour's sky (courier-card-model PALETTE[daylight]), "#RRGGBB"; sun and cloud "" for none. */
export type KCourierPalette = {
  text: string;
  scrim: string;
  button: string;
  buttonText: string;
  sky0: string;
  sky1: string;
  sea: string;
  land: string;
  forest: string;
  rock: string;
  ink: string;
  chip: string;
  chipText: string;
  sun: string;
  /** the sun's (or moon's) place, as fractions of the width and the scene's height */
  sunX: number;
  sunY: number;
  moon: boolean;
  stars: boolean;
  lit: boolean;
  cloud: string;
};

/** The courier card, as KMeView's `courierCard` and KCourierCardView's `card` take it. */
export type KCourierCardData = {
  /** draw the Swift card instead of the island (false: the island) */
  on: boolean;
  /** the loops run (the card is on show) */
  live: boolean;
  daylight: "morning" | "day" | "evening" | "night";
  palette: KCourierPalette;
  state: "unsent" | "home" | "exploring" | "delivery" | "bringing";
  /** her place on the arc, 0 (your window) to 1 (theirs) */
  at: number;
  /** her day off: the course and the game's cover */
  playing: boolean;
  /** in the air: on the arc; else on the sill */
  flying: boolean;
  /** her snapshot (lib/bird-images card-*), null until captured */
  bird: KImageRefProps | null;
  chip: string;
  you: string;
  somewhere: string;
  dayOffTag: string;
  name: string;
  time: string;
  line: string;
  /** "" for none */
  aside: string;
  cta: string;
};

/** Every colour of the desk (aura-art-model nativeDeskPaint): "#RRGGBB", "#RRGGBBAA", "" for none. */
export type KDeskPaint = {
  fidelity: "lines" | "pencil" | "sketch" | "colour";
  sky0: string;
  sky1: string;
  ground: string;
  lines: string;
  brass: string;
  stroke: string;
  window: string;
  head: string;
  hair: string;
  body: string;
  page: string;
  sun: boolean;
  sunFill: string;
  sunStroke: string;
  dots: string;
  dotsOpacity: number;
};

/** The Aura card's picture, as KMeView's and KAuraRoomView's `auraArt` and KAuraArtView's `art` take it. */
export type KAuraArtData = {
  /** draw the Swift picture instead of the island (false: the island) */
  on: boolean;
  /** one of the fifty pictures, or the desk */
  kind: "picture" | "desk";
  /** the picture (a bundled asset), null until resolved */
  image: KImageRefProps | null;
  /** how far in the picture sits: 6 on a dark theme */
  inset: number;
  desk: KDeskPaint;
};

type NativeImage = { uri: string; key: string; kind: "image" | "videoPoster" };
export type NativeCourierCard = Omit<KCourierCardData, "bird"> & { bird: NativeImage };
export type NativeAuraArt = Omit<KAuraArtData, "image"> & { image: NativeImage };

const NO_IMAGE: NativeImage = { uri: "", key: "", kind: "image" };
const image = (r: KImageRefProps | null | undefined): NativeImage => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : NO_IMAGE);

/** The record for a host when the piece is off: Swift keeps the island. */
export const COURIER_CARD_OFF: NativeCourierCard = Object.freeze({
  on: false,
  live: false,
  daylight: "night",
  palette: { text: "#FFFFFF", scrim: "#2B2660", button: "#FFFFFF", buttonText: "#1E1B35", sky0: "#1E1B35", sky1: "#2E2A6B", sea: "#1F2E5E", land: "#2F5148", forest: "#1B3530", rock: "#3A3F5C", ink: "#DAD6F2", chip: "#FFFFFF", chipText: "#1E1B35", sun: "", sunX: 0.84, sunY: 0.18, moon: true, stars: true, lit: true, cloud: "" },
  state: "home",
  at: 0.06,
  playing: false,
  flying: false,
  bird: NO_IMAGE,
  chip: "",
  you: "",
  somewhere: "",
  dayOffTag: "",
  name: "",
  time: "",
  line: "",
  aside: "",
  cta: "",
}) as NativeCourierCard;

/** The record for a host when the piece is off: Swift keeps the island. */
export const AURA_ART_OFF: NativeAuraArt = Object.freeze({
  on: false,
  kind: "desk",
  image: NO_IMAGE,
  inset: 0,
  desk: { fidelity: "lines", sky0: "", sky1: "", ground: "#FFFFFF", lines: "#1E1B35", brass: "#D8A63F", stroke: "", window: "", head: "", hair: "", body: "", page: "", sun: false, sunFill: "", sunStroke: "", dots: "", dotsOpacity: 1 },
}) as NativeAuraArt;

/** The courier card as the Swift record takes it (a record field can't be null). */
export const nativeCourierCard = (d: KCourierCardData | null | undefined): NativeCourierCard => (d ? { ...d, bird: image(d.bird) } : COURIER_CARD_OFF);
/** The Aura card's picture as the Swift record takes it. */
export const nativeAuraArt = (d: KAuraArtData | null | undefined): NativeAuraArt => (d ? { ...d, image: image(d.image) } : AURA_ART_OFF);

/* ── the two marker views, each one piece on its own ── */

export type KCourierCardViewProps = CommonViewModifierProps & Pick<KScreenBaseProps, "theme" | "letterFont"> & { card: KCourierCardData };
export type KAuraArtViewProps = CommonViewModifierProps & Pick<KScreenBaseProps, "theme"> & { art: KAuraArtData };

type NativeCardProps = CommonViewModifierProps & Pick<KScreenBaseProps, "theme"> & { letterFont: NonNullable<KScreenBaseProps["letterFont"]>; card: NativeCourierCard };
type NativeArtProps = CommonViewModifierProps & Pick<KScreenBaseProps, "theme"> & { art: NativeAuraArt };

// the views' JS names are the Swift structs' names (ios/Adapters/KMePiecesView.swift)
const NativeKCourierCardView = requireNativeView<NativeCardProps>("KindredlyUI", "KCourierCardView");
const NativeKAuraArtView = requireNativeView<NativeArtProps>("KindredlyUI", "KAuraArtView");

/** One courier card, 236 tall and as wide as it is laid out. Only inside an @expo/ui <Host>. */
export function KCourierCardView({ modifiers, theme, letterFont, card }: KCourierCardViewProps) {
  return (
    <NativeKCourierCardView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      theme={theme}
      letterFont={letterFont ?? "newsreader"}
      card={nativeCourierCard(card)}
    />
  );
}

/** The Aura card's picture, as large as it is laid out. Only inside an @expo/ui <Host>. */
export function KAuraArtView({ modifiers, theme, art }: KAuraArtViewProps) {
  return <NativeKAuraArtView modifiers={modifiers} {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)} theme={theme} art={nativeAuraArt(art)} />;
}
