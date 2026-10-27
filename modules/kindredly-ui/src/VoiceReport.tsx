import { requireNativeView } from "expo";
import { forwardRef, useMemo, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle } from "./types";

/* THE VOICE REPORT, drawn by SwiftUI (2026-10-27; ios/Portable/Pages/KVoiceReportScreen.swift,
   adapter ios/Adapters/KMorePagesView.swift), for src/screens/report/VoiceReportNative.tsx. TS
   builds the report and words every card (screens/report/report-model), and works out the sky
   (lib/constellation); Swift draws it, keeps which card is up, and reports Share and Done.

   A whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost), only after
   isKindredlyUIViewAvailable("KVoiceReportView") and the "report" NativeSurface switch say so. */

export type KVoiceReportStrings = {
  eyebrowCover: string;
  eyebrowStars: string;
  eyebrowHour: string;
  eyebrowWords: string;
  eyebrowPunct: string;
  eyebrowQuote: string;
  eyebrowEnd: string;
  archetype: string;
  written: string;
  brightestTitle: string;
  brightest: string;
  hourBand: string;
  hourLine: string;
  firstWord: string;
  otherWords: string;
  wordsLine: string;
  topMark: string;
  breathe: string;
  /** “the quote” */
  quote: string;
  /** — Wren */
  signature: string;
  brand: string;
  share: string;
  done: string;
  /** VoiceOver for the close key */
  close: string;
};

export type KVoiceReportCard = "cover" | "stars" | "hour" | "words" | "punct" | "quote" | "end";
export type KVoiceReportMark = { mark: string; pct: number; bar: number };
/** The sky at one size, in points: its stars and, flattened in pairs, [star, the star it hangs from]. */
export type KVoiceReportSky = { size: number; stars: { x: number; y: number; big: boolean; w: number }[]; links: number[] };

export type KVoiceReportViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KVoiceReportStrings;
    /** false until the report is built: the night and the close key only */
    loaded: boolean;
    cards: KVoiceReportCard[];
    chips: string[];
    marks: KVoiceReportMark[];
    /** the sky card's (150) and the keepsake card's (110) */
    sky: KVoiceReportSky;
    keepSky: KVoiceReportSky;
    /** her snapshot under the quote */
    bird: KImageRefProps | null;
    onShare?: () => void;
    /** Done, and the close key */
    onDone?: () => void;
  };

type None = (e: { nativeEvent: Record<string, never> }) => void;

type NativeKVoiceReportViewProps = Omit<KVoiceReportViewProps, "letterFont" | "insets" | "rev" | "bird" | "onShare" | "onDone"> &
  Required<Pick<KVoiceReportViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    bird: KImageRefProps;
    onVrShare?: None;
    onVrDone?: None;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: KImageRefProps = { uri: "", key: "", kind: "image" };

const NativeKVoiceReportView = requireNativeView<NativeKVoiceReportViewProps>("KindredlyUI", "KVoiceReportView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. Pass the records memoised with a rev. */
export const KVoiceReportView = forwardRef<KScreenHandle, KVoiceReportViewProps>(function KVoiceReportView(
  { modifiers, letterFont, insets, rev, bird, onShare, onDone, ...rest },
  ref,
) {
  const sentBird = useMemo(() => (bird ? { uri: bird.uri, key: bird.key, kind: bird.kind ?? "image" } : NO_IMAGE), [bird]);
  return (
    <NativeKVoiceReportView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      bird={sentBird}
      onVrShare={onShare ? () => onShare() : undefined}
      onVrDone={onDone ? () => onDone() : undefined}
    />
  );
});
