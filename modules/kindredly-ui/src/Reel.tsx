import { requireNativeView } from "expo";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KScreenBaseProps } from "./types";

/* A REEL, DRAWN BY SWIFTUI (2026-11-09, behind the "reels" switch, off by default;
   ios/Portable/Reels: KReelSquare and one file a reel; adapter ios/Adapters/KReelView.swift).
   The spec is built by src/components/guide-reel/swift-reels (useReelSpecs): which reel, its
   VoiceOver label, whether it plays, its words and facts as JSON, and its pictures by name.

   Two ways in: the Swift Wren room draws a card's reel itself from the spec on its card record
   (WrenRoom.tsx KWrenRoomCard.reel); anywhere else ReelSquare puts <KReelView> in a small Host
   of its own, the size of the square. KReelView is also the binary's marker: TS asks
   isKindredlyUIViewAvailable("KReelView") before it hands a reel to Swift. */

export type KReelSpec = {
  /** letters | kindreds | aura | stamps | sealed | courier | news-1.0.5 */
  id: string;
  /** VoiceOver: what the square is (a tap starts it over) */
  label: string;
  /** the screen is on show: the reel plays */
  live: boolean;
  /** KReelData as JSON */
  data: string;
  /** its pictures, by name */
  images: Record<string, KImageRefProps>;
};

/** the spec as the Swift record takes it: `on` false is none (a record field can't take null) */
export type NativeReelSpec = { on: boolean; id: string; label: string; live: boolean; data: string; images: { name: string; uri: string; key: string; kind: string }[] };

export const REEL_OFF: NativeReelSpec = { on: false, id: "", label: "", live: false, data: "{}", images: [] };

export const nativeReel = (r: KReelSpec | null | undefined): NativeReelSpec =>
  r
    ? {
        on: true,
        id: r.id,
        label: r.label,
        live: r.live,
        data: r.data,
        images: Object.entries(r.images).map(([name, im]) => ({ name, uri: im.uri, key: im.key, kind: im.kind ?? "image" })),
      }
    : REEL_OFF;

export type KReelViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme" | "letterFont"> & {
    reel: KReelSpec;
    /** the square's side */
    side: number;
    /** the holder's clip, which the dark card's edge follows (GuideCard: 17 / 0, NewsCard 17 / 17) */
    cornerTop?: number;
    cornerBottom?: number;
  };

type NativeProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme"> & { letterFont: NonNullable<KScreenBaseProps["letterFont"]>; reel: NativeReelSpec; side: number; cornerTop: number; cornerBottom: number };

// the view's JS name is the Swift struct's name (ios/Adapters/KReelView.swift)
const NativeKReelView = requireNativeView<NativeProps>("KindredlyUI", "KReelView");

/** One reel square, `side` square. Only inside an @expo/ui <Host> of that size. */
export function KReelView({ modifiers, theme, letterFont, reel, side, cornerTop = 17, cornerBottom = 0 }: KReelViewProps) {
  return (
    <NativeKReelView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      theme={theme}
      letterFont={letterFont ?? "newsreader"}
      reel={nativeReel(reel)}
      side={side}
      cornerTop={cornerTop}
      cornerBottom={cornerBottom}
    />
  );
}
