// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE RECORDING BAR (Recorder.tsx in SwiftUI; the "recorder" switch, off by default). Display
 only: the recording itself (the microphone's permission, the three-minute cap, the file, the
 alerts and what VoiceOver is told as it starts and stops) stays with whoever holds it, in the
 React Native app TS (src/components/Recorder.tsx useRecording). It says what to draw through a
 KRecorderBarState (src/components/recorder-model.ts, the same model the React Native bar draws)
 and hears the key and the take's ✕.

 The pieces, as Recorder.tsx draws them:
 - idle and recording: a card face (sf, corners of 14, a 1pt edge in line, 16 inside), the 42 key
   (ind with the page colour's 🎙 on it; while recording the red of a recording, #D66C3E, with a
   white ■), 13 apart from twenty bars (3 wide, 2 apart, corners of 2, at .65: ind, red while
   recording, moving with the seconds) and the time (SF Mono 600 12.5, "0:12 / 3:00", in ind or
   the red). The red is a signal, not chrome: the same in every theme.
 - done: the take on the accent's palest wash (lav2, no edge): the ✓ disc, the bars still, the
   take's length, and a ✕ in faint whose 44 target overhangs the row (the row keeps its drawn
   size, as the React Native negative margin does).
 Flat controls under rule B: nothing here is an object. No press feedback, as the React Native
 Pressables have none.

 VoiceOver: the key is "Record" / "Stop recording" (its value the time while recording, and it
 updates frequently then); the time reads "0:12 of 3:00"; the ✓ is hidden; the ✕ is
 "Delete recording".
 */

/// What the bar shows (recorder-model's RecorderBarModel).
public struct KRecorderBarState: Equatable {
  public enum Phase: String {
    case idle
    case recording
    case done
  }

  /// the twenty bar heights at rest (recorder-model RECORDER_BARS)
  public static let restBars: [CGFloat] = [10, 16, 22, 18, 14, 20, 24, 12, 18, 22, 26, 14, 10, 18, 22, 24, 20, 14, 18, 22]

  public var phase: Phase
  /// "0:12 / 3:00", or the take's length when done
  public var clock: String
  /// "0:12 of 3:00"
  public var timeA11y: String
  public var bars: [CGFloat]
  public var recordLabel: String
  public var stopLabel: String
  public var discardLabel: String

  public init(
    phase: Phase = .idle,
    clock: String = "0:00 / 3:00",
    timeA11y: String = "",
    bars: [CGFloat] = KRecorderBarState.restBars,
    recordLabel: String = "",
    stopLabel: String = "",
    discardLabel: String = ""
  ) {
    self.phase = phase
    self.clock = clock
    self.timeA11y = timeA11y
    self.bars = bars
    self.recordLabel = recordLabel
    self.stopLabel = stopLabel
    self.discardLabel = discardLabel
  }
}

public struct KRecorderBar: View {
  /// the red of a recording in progress (recorder-model RECORDING, the old C.ember)
  public static let recordingRed = Color(hex: "#D66C3E")

  private let theme: KTheme
  private let state: KRecorderBarState
  private let onPress: () -> Void
  private let onDiscard: () -> Void

  /// - Parameters:
  ///   - state: what to draw (TS's recorder-model)
  ///   - onPress: the key: TS starts or stops the recording
  ///   - onDiscard: the take's ✕: TS lets the take go
  public init(theme: KTheme, state: KRecorderBarState, onPress: @escaping () -> Void, onDiscard: @escaping () -> Void) {
    self.theme = theme
    self.state = state
    self.onPress = onPress
    self.onDiscard = onDiscard
  }

  private var recording: Bool { state.phase == .recording }

  public var body: some View {
    if state.phase == .done {
      take
    } else {
      live
    }
  }

  // ── idle and recording ──

  private var live: some View {
    let tint = recording ? Self.recordingRed : theme.ind
    return HStack(spacing: 13) {
      SwiftUI.Button(action: onPress) {
        Text(recording ? "■" : "🎙")
          .kText(.system(15))
          .foregroundStyle(recording ? Color.white : theme.bg)
          .frame(width: 42, height: 42)
          .background(Circle().fill(tint))
          .contentShape(Circle())
      }
      .buttonStyle(KAsIsButtonStyle())
      .accessibilityLabel(recording ? state.stopLabel : state.recordLabel)
      .accessibilityValue(recording ? state.timeA11y : "")
      .accessibilityAddTraits(recording ? .updatesFrequently : [])

      bars(tint: tint)

      Text(state.clock)
        .kText(.mono(12.5, .semibold))
        .foregroundStyle(tint)
        .lineLimit(1)
        .fixedSize()
        .accessibilityLabel(state.timeA11y)
    }
    .padding(16)
    // the card face's 1pt edge sits outside the 16, as React Native's border does
    .padding(1)
    .background(RoundedRectangle(cornerRadius: 14, style: .circular).fill(theme.sf))
    .overlay(RoundedRectangle(cornerRadius: 14, style: .circular).strokeBorder(theme.line, lineWidth: 1))
  }

  // ── the take ──

  private var take: some View {
    HStack(spacing: 13) {
      Text("✓")
        .kText(.system(16))
        .foregroundStyle(theme.bg)
        .frame(width: 42, height: 42)
        .background(Circle().fill(theme.ind))
        .accessibilityHidden(true)

      bars(tint: theme.ind)

      Text(state.clock)
        .kText(.mono(12.5, .semibold))
        .foregroundStyle(theme.ind)
        .lineLimit(1)
        .fixedSize()

      // a 44 target drawn in the 16 the React Native ✕ takes in the row (44 less 14 each side)
      SwiftUI.Button(action: onDiscard) {
        Text("✕")
          .kText(.system(13))
          .foregroundStyle(theme.faint)
          .frame(width: 44, height: 44)
          .contentShape(Rectangle())
      }
      .buttonStyle(KAsIsButtonStyle())
      .padding(-14)
      .accessibilityLabel(state.discardLabel)
    }
    .padding(16)
    .background(RoundedRectangle(cornerRadius: 14, style: .circular).fill(theme.lav2))
  }

  /// twenty bars, 3 wide and 2 apart, centred in a 26 row that takes what is left (a moving bar
  /// may stand past it, as in React Native)
  private func bars(tint: Color) -> some View {
    HStack(alignment: .center, spacing: 2) {
      ForEach(Array(state.bars.enumerated()), id: \.offset) { _, h in
        RoundedRectangle(cornerRadius: 2, style: .circular)
          .fill(tint)
          .opacity(0.65)
          .frame(width: 3, height: max(0, h))
      }
    }
    .frame(maxWidth: .infinity, minHeight: 26, maxHeight: 26, alignment: .leading)
    .accessibilityHidden(true)
  }
}
