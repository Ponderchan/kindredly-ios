import { requireNativeView } from "expo";
import { forwardRef, useMemo, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle } from "./types";

/* THE WRAPPED MONTHLY REPORT, drawn by SwiftUI (2026-10-31; ios/Portable/Pages/KWrappedReportScreen.swift,
   adapter ios/Adapters/KWrappedReportView.swift), for src/screens/report/WrappedReportNative.tsx. TS
   reads the month and words every card (screens/report/wrapped-core); Swift draws both templates,
   keeps which card is up, makes the 1080×1920 share picture and reports the taps.

   A whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost), only after
   isKindredlyUIViewAvailable("KWrappedReportView") and the "reportwrapped" switch say so. */

export type KWrappedCard = "cover" | "far" | "line" | "vibe" | "hour" | "click" | "share" | "next";
export type KWrappedTag = { id: string; tag: string; sub: string; rank: string };
export type KWrappedImages = {
  stamp: KImageRefProps | null;
  pairStamp: KImageRefProps | null;
  standing: KImageRefProps | null;
  curious: KImageRefProps | null;
  delight: KImageRefProps | null;
  fly: KImageRefProps | null;
  sleepy: KImageRefProps | null;
};

export type KWrappedReportViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    /** every word, by wrapped-core WrappedView's field names, plus eyebrow.<card>, lineSt1/2 and the four counts */
    strings: Record<string, string>;
    /** false until the month is read: the ground and the close key only */
    loaded: boolean;
    /** a read that failed: this line and the retry key ("" = none) */
    failed: string;
    retry: string;
    template: "A" | "B";
    /** the share picture is being handed over */
    busy: boolean;
    cards: KWrappedCard[];
    tags: KWrappedTag[];
    changes: string[];
    /** letters per local hour, 24 */
    buckets: number[];
    hourStart: number;
    hourNight: boolean;
    /** how you changed is blurred under the First Class seal */
    locked: boolean;
    images: KWrappedImages;
    onClose?: () => void;
    /** the share picture's file:// URL, "" when it couldn't be made */
    onShare?: (uri: string) => void;
    onCompare?: () => void;
    onSwitchStyle?: () => void;
    onReadTheirs?: () => void;
    onWrite?: () => void;
    onUnlock?: () => void;
    onRetry?: () => void;
    /** the card now up and whether its ground is dark */
    onCard?: (index: number, dark: boolean) => void;
  };

type None = (e: { nativeEvent: Record<string, never> }) => void;
type NativeImage = { uri: string; key: string; kind: string };

type NativeKWrappedReportViewProps = Omit<
  KWrappedReportViewProps,
  "letterFont" | "insets" | "rev" | "images" | "onClose" | "onShare" | "onCompare" | "onSwitchStyle" | "onReadTheirs" | "onWrite" | "onUnlock" | "onRetry" | "onCard"
> &
  Required<Pick<KWrappedReportViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    stamp: NativeImage;
    pairStamp: NativeImage;
    standing: NativeImage;
    curious: NativeImage;
    delight: NativeImage;
    fly: NativeImage;
    sleepy: NativeImage;
    onWrClose?: None;
    onWrShare?: (e: { nativeEvent: { uri: string } }) => void;
    onWrCompare?: None;
    onWrSwitch?: None;
    onWrRead?: None;
    onWrWrite?: None;
    onWrUnlock?: None;
    onWrRetry?: None;
    onWrCard?: (e: { nativeEvent: { index: number; dark: boolean } }) => void;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: NativeImage = { uri: "", key: "", kind: "image" };
const sent = (r: KImageRefProps | null): NativeImage => (r ? { uri: r.uri, key: r.key, kind: r.kind ?? "image" } : NO_IMAGE);

const NativeKWrappedReportView = requireNativeView<NativeKWrappedReportViewProps>("KindredlyUI", "KWrappedReportView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. Pass the records memoised with a rev. */
export const KWrappedReportView = forwardRef<KScreenHandle, KWrappedReportViewProps>(function KWrappedReportView(
  { modifiers, letterFont, insets, rev, images, onClose, onShare, onCompare, onSwitchStyle, onReadTheirs, onWrite, onUnlock, onRetry, onCard, ...rest },
  ref,
) {
  const pics = useMemo(
    () => ({
      stamp: sent(images.stamp),
      pairStamp: sent(images.pairStamp),
      standing: sent(images.standing),
      curious: sent(images.curious),
      delight: sent(images.delight),
      fly: sent(images.fly),
      sleepy: sent(images.sleepy),
    }),
    [images],
  );
  return (
    <NativeKWrappedReportView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      {...pics}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      onWrClose={onClose ? () => onClose() : undefined}
      onWrShare={onShare ? (e) => onShare(e.nativeEvent.uri) : undefined}
      onWrCompare={onCompare ? () => onCompare() : undefined}
      onWrSwitch={onSwitchStyle ? () => onSwitchStyle() : undefined}
      onWrRead={onReadTheirs ? () => onReadTheirs() : undefined}
      onWrWrite={onWrite ? () => onWrite() : undefined}
      onWrUnlock={onUnlock ? () => onUnlock() : undefined}
      onWrRetry={onRetry ? () => onRetry() : undefined}
      onWrCard={onCard ? (e) => onCard(e.nativeEvent.index, e.nativeEvent.dark) : undefined}
    />
  );
});
