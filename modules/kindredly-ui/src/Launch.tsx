import { requireNativeView } from "expo";
import type { CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
import type { KScreenBaseProps } from "./types";

/* THE DOORS INTO THE APP, drawn by SwiftUI (batch 3, 2026-11-09), each behind its own switch (off
   by default) with its React Native page as the fallback: ios/Adapters/KLaunchView.swift →
   ios/Portable/Launch.

   - KLaunchView: the launch on every cold start (src/components/LaunchAnimation.tsx
     LaunchAnimation, modes full / short / still) and its held last frame (LaunchFrame, mode
     "frame"), "launch"
   - KAuthCallbackView: where the magic link lands (src/app/auth-callback.tsx), "authcallback"

   TS decides everything (how the launch plays, its inks, the words, when it may leave, the
   haptic, the routing); Swift draws on the clock from `startAt` and reports a tap. Each sits
   alone in one full-screen @expo/ui <Host> (SurfaceHost). */

/* ── The launch ──────────────────────────────────────────────────────── */

/** full / short / still play (LaunchAnimation LaunchMode); frame is LaunchFrame, at rest. */
export type KLaunchMode = "full" | "short" | "still" | "frame";
/** "#RRGGBB" each (LaunchAnimation launchInks). */
export type KLaunchColors = { bg: string; ink: string; word: string; mute: string };

export type KLaunchViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme"> & {
    mode: KLaunchMode;
    /** Date.now() when it was mounted: the clock counts from it */
    startAt: number;
    colors: KLaunchColors;
    /** launch.tag and launch.sub, resolved */
    tag: string;
    sub: string;
    /** "envelope": Wren peeking out of the letter, the cobalt icon's launch (2026-11-13). Only for a
        binary that has it: kindredlyUIViewHasProp("KLaunchView", "art") */
    art?: "envelope";
    /** LaunchFrame's word and tag (true while it plays) */
    showWord?: boolean;
    showTag?: boolean;
    /** any tap while it plays (TS decides whether it skips) */
    onTap?: () => void;
  };

type NativeLaunchProps = Omit<KLaunchViewProps, "onTap"> & {
  letterFont: string;
  onLaunchTap?: () => void;
};

// the views' JS names are the Swift structs' names (ios/Adapters/KLaunchView.swift)
const NativeKLaunchView = requireNativeView<NativeLaunchProps>("KindredlyUI", "KLaunchView");

/** The bare SwiftUI launch. Only inside an @expo/ui <Host>. */
export function KLaunchView({ modifiers, onTap, showWord = true, showTag = true, ...rest }: KLaunchViewProps) {
  return (
    <NativeKLaunchView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      showWord={showWord}
      showTag={showTag}
      letterFont="system"
      onLaunchTap={onTap ? () => onTap() : undefined}
    />
  );
}

/* ── Where the magic link lands ──────────────────────────────────────── */

export type KAuthCallbackViewProps = CommonViewModifierProps &
  Pick<KScreenBaseProps, "theme"> & {
    /** Midnight: its own page and tk.sub; otherwise the lavender wash and ink at 60% */
    dark: boolean;
    /** cb.line, resolved */
    line: string;
  };

type NativeCallbackProps = KAuthCallbackViewProps & { letterFont: string };

const NativeKAuthCallbackView = requireNativeView<NativeCallbackProps>("KindredlyUI", "KAuthCallbackView");

/** The bare SwiftUI landing page. Only inside an @expo/ui <Host>. */
export function KAuthCallbackView({ modifiers, ...rest }: KAuthCallbackViewProps) {
  return (
    <NativeKAuthCallbackView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
      letterFont="system"
    />
  );
}
