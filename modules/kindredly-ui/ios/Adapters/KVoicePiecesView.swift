import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 THE RECORDING BAR AND THE VOICE CARD as React Native sees them (2026-10-27; the "recorder" and
 "audiocard" switches, off by default): <KRecorderView … /> and <KAudioCardView … /> on the JS side
 (modules/kindredly-ui/src/VoicePieces.tsx), each alone in a small @expo/ui <Host> that takes its
 width from React Native and its height from the piece (matchContents vertical), drawn by
 src/components/Recorder.tsx and AudioCard.tsx where those are used on a React Native screen.
 Inside the two Swift composers the same pieces are drawn by the page itself (KVoiceSlot), told
 through the composer's `recorder` command: KVoiceSlotState(args:) below reads it.

 The props subclass KScreenProps for theme; no insets, rev or commands. Everything drawn is TS's
 (src/components/recorder-model.ts, audio-card-model.ts), colours as "#RRGGBB" (or "transparent").

 KRecorderView
 - bar { phase: idle | recording | done, clock, timeA11y, bars [number], recordLabel, stopLabel,
   discardLabel }
 - onRecorderPress {}   the key: TS starts or stops the recording
 - onRecorderDiscard {} the take's ✕

 KAudioCardView
 - look { ink, glyph, panel, edge ("" none), timeInk, time, padding, radius, disc, discRadius,
   glyphSize, glyphNudge, barRadius, bars [{ h, color, alpha }], mono: regular | semibold }
 - playing, label (VoiceOver's name for the disc right now)
 - onAudioToggle {}     the disc: TS plays or pauses

 This file imports ExpoUI, whose public Button, Text, Image and Label would make the bare names
 ambiguous, so none of them is written here.
 */

/// A colour as TS sends it: "#RRGGBB", or "transparent" (and anything unreadable) for none.
func kVoiceColor(_ value: String) -> Color {
  let digits = value.hasPrefix("#") ? String(value.dropFirst()) : value
  guard digits.count == 6, digits.allSatisfy(\.isHexDigit) else { return .clear }
  return Color(hex: digits)
}

// ── the recording bar ──

struct KRecorderBarRecord: Record {
  @Field var phase: String = "idle"
  @Field var clock: String = ""
  @Field var timeA11y: String = ""
  @Field var bars: [Double] = []
  @Field var recordLabel: String = ""
  @Field var stopLabel: String = ""
  @Field var discardLabel: String = ""

  var state: KRecorderBarState {
    KRecorderBarState(
      phase: KRecorderBarState.Phase(rawValue: phase) ?? .idle,
      clock: clock,
      timeA11y: timeA11y,
      bars: bars.isEmpty ? KRecorderBarState.restBars : bars.map { CGFloat($0) },
      recordLabel: recordLabel,
      stopLabel: stopLabel,
      discardLabel: discardLabel
    )
  }
}

extension KRecorderBarState {
  /// From the composer's `recorder` command (the same fields as KRecorderBarRecord).
  init(args: [String: Any]) {
    let bars = (args["bars"] as? [Any])?.compactMap { ($0 as? NSNumber).map { CGFloat($0.doubleValue) } } ?? []
    self.init(
      phase: Phase(rawValue: args.kString("phase") ?? "") ?? .idle,
      clock: args.kString("clock") ?? "",
      timeA11y: args.kString("timeA11y") ?? "",
      bars: bars.isEmpty ? KRecorderBarState.restBars : bars,
      recordLabel: args.kString("recordLabel") ?? "",
      stopLabel: args.kString("stopLabel") ?? "",
      discardLabel: args.kString("discardLabel") ?? ""
    )
  }
}

final class KRecorderViewProps: KScreenProps {
  @Field var bar: KRecorderBarRecord = KRecorderBarRecord()

  var onRecorderPress = EventDispatcher()
  var onRecorderDiscard = EventDispatcher()
}

struct KRecorderView: ExpoSwiftUI.View {
  @ObservedObject var props: KRecorderViewProps

  var body: some View {
    KRecorderBar(
      theme: props.kTheme,
      state: props.bar.state,
      onPress: { props.onRecorderPress() },
      onDiscard: { props.onRecorderDiscard() }
    )
    .kScreenEnvironment(props)
  }
}

// ── the voice card ──

struct KAudioCardBarRecord: Record {
  @Field var h: Double = 0
  @Field var color: String = ""
  @Field var alpha: Double = 1
}

struct KAudioCardLookRecord: Record {
  @Field var ink: String = ""
  @Field var glyph: String = ""
  @Field var panel: String = ""
  @Field var edge: String = ""
  @Field var timeInk: String = ""
  @Field var time: String = ""
  @Field var padding: Double = 14
  @Field var radius: Double = 14
  @Field var disc: Double = 44
  @Field var discRadius: Double = 22
  @Field var glyphSize: Double = 15
  @Field var glyphNudge: Double = 2
  @Field var barRadius: Double = 2
  @Field var bars: [KAudioCardBarRecord] = []
  @Field var mono: String = "semibold"

  var look: KAudioCardLook {
    KAudioCardLook(
      ink: kVoiceColor(ink),
      glyph: kVoiceColor(glyph),
      panel: kVoiceColor(panel),
      edge: edge.isEmpty ? nil : kVoiceColor(edge),
      timeInk: kVoiceColor(timeInk),
      time: time,
      padding: padding,
      radius: radius,
      disc: disc,
      discRadius: discRadius,
      glyphSize: glyphSize,
      glyphNudge: glyphNudge,
      barRadius: barRadius,
      bars: bars.map { KAudioCardLook.Bar(height: $0.h, color: kVoiceColor($0.color), alpha: $0.alpha) },
      monoRegular: mono == "regular"
    )
  }
}

extension KAudioCardLook {
  /// From the composer's `recorder` command (the same fields as KAudioCardLookRecord).
  init(args: [String: Any]) {
    let bars: [Bar] = (args["bars"] as? [Any])?.compactMap { item in
      guard let b = item as? [String: Any] else { return nil }
      return Bar(height: b.kDouble("h") ?? 0, color: kVoiceColor(b.kString("color") ?? ""), alpha: b.kDouble("alpha") ?? 1)
    } ?? []
    let edge = args.kString("edge") ?? ""
    self.init(
      ink: kVoiceColor(args.kString("ink") ?? ""),
      glyph: kVoiceColor(args.kString("glyph") ?? ""),
      panel: kVoiceColor(args.kString("panel") ?? ""),
      edge: edge.isEmpty ? nil : kVoiceColor(edge),
      timeInk: kVoiceColor(args.kString("timeInk") ?? ""),
      time: args.kString("time") ?? "",
      padding: args.kDouble("padding") ?? 10,
      radius: args.kDouble("radius") ?? 14,
      disc: args.kDouble("disc") ?? 36,
      discRadius: args.kDouble("discRadius") ?? 22,
      glyphSize: args.kDouble("glyphSize") ?? 13,
      glyphNudge: args.kDouble("glyphNudge") ?? 2,
      barRadius: args.kDouble("barRadius") ?? 2,
      bars: bars,
      monoRegular: args.kString("mono") == "regular"
    )
  }
}

final class KAudioCardViewProps: KScreenProps {
  @Field var look: KAudioCardLookRecord = KAudioCardLookRecord()
  @Field var playing: Bool = false
  @Field var label: String = ""

  var onAudioToggle = EventDispatcher()
}

struct KAudioCardView: ExpoSwiftUI.View {
  @ObservedObject var props: KAudioCardViewProps

  var body: some View {
    KAudioCardRow(look: props.look.look, playing: props.playing, label: props.label) {
      props.onAudioToggle()
    }
    .kScreenEnvironment(props)
  }
}

// ── the composers' voice slot ──

extension KVoiceSlotState {
  /// The composer's `recorder` command: { showBar, bar, showCard, card: { look, playing, label },
  /// island } (src/components/VoiceSlot.tsx). A part not sent reads as its resting value.
  init(args: [String: Any]) {
    let card = args.kObject("card")
    self.init(
      showBar: args.kBool("showBar") ?? false,
      bar: args.kObject("bar").map { KRecorderBarState(args: $0) } ?? KRecorderBarState(),
      showCard: args.kBool("showCard") ?? false,
      card: card?.kObject("look").map { KAudioCardLook(args: $0) },
      cardPlaying: card?.kBool("playing") ?? false,
      cardLabel: card?.kString("label") ?? "",
      island: args.kBool("island") ?? true
    )
  }
}
