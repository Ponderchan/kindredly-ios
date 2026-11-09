import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 THE DOORS INTO THE APP, as React Native sees them (batch 3, 2026-11-09), each behind its own
 switch (off by default) with its React Native page as the fallback:

 - <KLaunchView …/>        the launch on every cold start and its held last frame
                           (src/components/LaunchAnimation.tsx: LaunchAnimation and LaunchFrame,
                           "launch") → Portable/Launch/KLaunch.swift
 - <KAuthCallbackView …/>  where the magic link lands (src/app/auth-callback.tsx, "authcallback")
                           → Portable/Launch/KAuthCallback.swift

 TS bindings: modules/kindredly-ui/src/Launch.tsx. Each turns props into Portable values and its
 tap into an event; nothing is decided here. The props subclass KScreenProps for theme; no
 insets, rev or commands. Each sits alone in a full-screen @expo/ui <Host> (SurfaceHost).

 KLaunchView
   mode ("full" | "short" | "still" | "frame"), startAt (ms), colors { bg, ink, word, mute }
   ("#RRGGBB"), tag, sub, showWord, showTag · event onLaunchTap
 KAuthCallbackView
   dark, line
 */

/// "#RRGGBB" from TS, or the fallback for anything else (Color(hex:) would draw magenta).
private func launchColor(_ hex: String, _ fallback: Color) -> Color {
  hex.count == 7 && hex.hasPrefix("#") ? Color(hex: hex) : fallback
}

// MARK: - The launch

struct KLaunchColorsRecord: Record {
  @Field var bg: String = ""
  @Field var ink: String = ""
  @Field var word: String = ""
  @Field var mute: String = ""

  var inks: KLaunchInks {
    let day = KLaunchInks.day
    return KLaunchInks(
      bg: launchColor(bg, day.bg),
      ink: launchColor(ink, day.ink),
      word: launchColor(word, day.word),
      mute: launchColor(mute, day.mute)
    )
  }
}

final class KLaunchViewProps: KScreenProps {
  @Field var mode: String = "frame"
  @Field var startAt: Double = 0
  @Field var colors: KLaunchColorsRecord = KLaunchColorsRecord()
  @Field var tag: String = ""
  @Field var sub: String = ""
  @Field var showWord: Bool = true
  @Field var showTag: Bool = true

  var onLaunchTap = EventDispatcher()

  /// when this view was made: the clock's start if TS sent none
  let madeAt = Date()

  var content: KLaunchContent {
    KLaunchContent(
      mode: KLaunchMode(rawValue: mode) ?? .frame,
      startAt: startAt > 0 ? Date(timeIntervalSince1970: startAt / 1000) : madeAt,
      inks: colors.inks,
      tag: tag,
      sub: sub,
      showWord: showWord,
      showTag: showTag
    )
  }
}

struct KLaunchView: ExpoSwiftUI.View {
  @ObservedObject var props: KLaunchViewProps

  var body: some View {
    KLaunch(content: props.content) {
      props.onLaunchTap()
    }
    .kScreenEnvironment(props)
  }
}

// MARK: - Where the magic link lands

final class KAuthCallbackViewProps: KScreenProps {
  @Field var dark: Bool = false
  @Field var line: String = ""
}

struct KAuthCallbackView: ExpoSwiftUI.View {
  @ObservedObject var props: KAuthCallbackViewProps

  var body: some View {
    KAuthCallback(theme: props.kTheme, dark: props.dark, line: props.line)
      .kScreenEnvironment(props)
  }
}
