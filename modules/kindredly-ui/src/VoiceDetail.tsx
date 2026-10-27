import { requireNativeView } from "expo";
import { forwardRef, useMemo, type Ref } from "react";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KImageRefProps, KInsets, KScreenBaseProps, KScreenHandle } from "./types";

/* YOUR VOICE, IN DETAIL, drawn by SwiftUI (2026-10-27; ios/Portable/Pages/KVoiceDetailScreen.swift,
   adapter ios/Adapters/KMorePagesView.swift), for src/screens/voice/VoiceDetailNative.tsx. TS reads
   the writing and words every line (screens/voice/voice-detail-model); Swift draws them and
   reports the back key and a tap on the night letter's door (TS decides where it goes).

   A whole screen: alone in one @expo/ui <Host style={{flex:1}}> (SurfaceHost), only after
   isKindredlyUIViewAvailable("KVoiceDetailView") and the "voice" NativeSurface switch say so. */

export type KVoiceDetailStrings = {
  title: string;
  /** VoiceOver for the back chevron */
  backLabel: string;
  /** the line under the title */
  basedOn: string;
  /** “her summary”, or "" */
  summary: string;
  /** — Wren */
  signature: string;
  learning: string;
};

export type KVoiceDetailRow = { key: string; glyph: string; title: string; line: string; strength: number; read: boolean };

/** The night letter's door; null until the gate is known. */
export type KVoiceDetailGate = { eyebrow: string; title: string; sub: string; /** 0…100, or null for no bar */ pct: number | null; tappable: boolean };

export type KVoiceDetailViewProps = CommonViewModifierProps &
  KScreenBaseProps & {
    strings: KVoiceDetailStrings;
    rows: KVoiceDetailRow[];
    gate: KVoiceDetailGate | null;
    /** her snapshot beside the last line */
    bird: KImageRefProps | null;
    onBack?: () => void;
    onGate?: () => void;
  };

type None = (e: { nativeEvent: Record<string, never> }) => void;
type NativeGate = { shown: boolean; eyebrow: string; title: string; sub: string; pct: number; tappable: boolean };

type NativeKVoiceDetailViewProps = Omit<KVoiceDetailViewProps, "letterFont" | "insets" | "rev" | "gate" | "bird" | "onBack" | "onGate"> &
  Required<Pick<KVoiceDetailViewProps, "letterFont" | "insets" | "rev">> & {
    ref?: Ref<KScreenHandle>;
    gate: NativeGate;
    bird: KImageRefProps;
    onVdBack?: None;
    onVdGate?: None;
  };

const NO_INSETS: KInsets = { top: 0, bottom: 0, tabBarRoom: 0 };
const NO_IMAGE: KImageRefProps = { uri: "", key: "", kind: "image" };
const NO_GATE: NativeGate = { shown: false, eyebrow: "", title: "", sub: "", pct: -1, tappable: false };

const NativeKVoiceDetailView = requireNativeView<NativeKVoiceDetailViewProps>("KindredlyUI", "KVoiceDetailView");

/** The bare SwiftUI page. Only inside an @expo/ui <Host>. Pass the records memoised with a rev. */
export const KVoiceDetailView = forwardRef<KScreenHandle, KVoiceDetailViewProps>(function KVoiceDetailView(
  { modifiers, letterFont, insets, rev, gate, bird, onBack, onGate, ...rest },
  ref,
) {
  const sentBird = useMemo(() => (bird ? { uri: bird.uri, key: bird.key, kind: bird.kind ?? "image" } : NO_IMAGE), [bird]);
  // a record can't be null: no gate is shown false, no bar is -1
  const sentGate = useMemo<NativeGate>(() => (gate ? { shown: true, ...gate, pct: gate.pct ?? -1 } : NO_GATE), [gate]);
  return (
    <NativeKVoiceDetailView
      ref={ref}
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont={letterFont ?? "newsreader"}
      insets={insets ?? NO_INSETS}
      rev={rev ?? 0}
      gate={sentGate}
      bird={sentBird}
      onVdBack={onBack ? () => onBack() : undefined}
      onVdGate={onGate ? () => onGate() : undefined}
    />
  );
});
