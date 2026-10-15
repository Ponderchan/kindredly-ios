// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 A VOICE LETTER, DRAWN (AudioCard.tsx in 10a dress): a play/pause disc, sixteen bars that light
 up as it plays, and the time. Display only: the player lives with whoever owns the screen (in
 the React Native app, one expo-audio player per screen in TS, src/lib/voice-playback.ts), which
 says what is happening through a KPlayback and hears a tap through onToggle.

 KPlayback arrives only when something changes (play, pause, seek, the end), never at 4Hz:
 while it says "playing", the card moves its own progress on from where and when it was told
 (positionS at `at`), a few times a second, inside a TimelineView that only this card's bars
 and time sit in. Paused, it holds still.

 The pieces (chat spec, AudioCard.tsx):
 - the disc: ind, 36 across (44 when not compact), with a solid play or pause mark in bg;
 - the bars: AudioCard's sixteen heights (× .75 compact), 2 apart, corners of 2, ind at .9 up
   to the progress and .3 after;
 - the time in mono 600 11 at .1em in sub: the running time while playing (digits only, so it
   is drawn here; formatTime turns seconds into m:ss), the caller's positionLabel while paused
   part-way, and the caller's durationLabel otherwise;
 - on a lav2 panel with corners of 14 (padding 10, 14 when not compact), or bare.
 - unavailable (the URL isn't signed yet, or the file can't be had): the disc in faint, not
   pressable, the duration only. The caption is never drawn as the letter's body.

 VoiceOver reads one element: playLabel or pauseLabel as its label and the time as its value;
 a double tap toggles.
 */

/// What the screen's player is doing, as it reports it on each change.
public struct KPlayback: Equatable, Sendable {
  public let playing: Bool
  /// where it was, in seconds, at `at`
  public let positionS: Double
  /// the whole length in seconds; 0 when not yet known
  public let durationS: Double
  /// when positionS was read
  public let at: Date

  public init(playing: Bool, positionS: Double, durationS: Double, at: Date) {
    self.playing = playing
    self.positionS = positionS
    self.durationS = durationS
    self.at = at
  }

  /// Where it is at `now`: moved on from positionS while playing, held while paused, never past
  /// the end.
  public func position(at now: Date) -> Double {
    let moved = playing ? positionS + max(0, now.timeIntervalSince(at)) : positionS
    return durationS > 0 ? min(max(0, moved), durationS) : max(0, moved)
  }

  /// How far through, 0...1, at `now`; 0 while the length isn't known.
  public func progress(at now: Date) -> Double {
    durationS > 0 ? position(at: now) / durationS : 0
  }
}

public struct KVoiceCard: View {
  /// AudioCard's sixteen bar heights, at full size
  public static let barHeights: [CGFloat] = [12, 18, 24, 16, 20, 26, 14, 22, 18, 24, 20, 14, 22, 16, 24, 18]

  /// m:ss, the running time while playing (AudioCard's fmt)
  public static func clock(_ seconds: Double) -> String {
    let s = max(0, Int(seconds.rounded(.down)))
    return "\(s / 60):" + (s % 60 < 10 ? "0" : "") + "\(s % 60)"
  }

  private let theme: KTheme
  private let playback: KPlayback?
  private let durationLabel: String
  private let positionLabel: String
  private let playLabel: String
  private let pauseLabel: String
  private let unavailable: Bool
  private let compact: Bool
  private let panel: Bool
  private let formatTime: (Double) -> String
  private let onToggle: () -> Void

  /// - Parameters:
  ///   - playback: this voice's state, or nil when it isn't the one playing (shows at rest)
  ///   - durationLabel: the whole length, e.g. "0:35", shown at rest
  ///   - positionLabel: where it was paused, e.g. "0:12", shown while paused part-way; "" to
  ///     show the duration instead
  ///   - playLabel, pauseLabel: what VoiceOver calls the toggle, already translated (vo.play, vo.pause)
  ///   - unavailable: can't play yet (no signed URL): the disc greys and doesn't take taps
  ///   - compact: the 36 disc and .75 bars (the default, as chat and Today use it); false for 44 and full bars
  ///   - panel: on the lav2 panel (the default); false draws it bare, for a card that is already a panel
  ///   - formatTime: the running time while playing, from seconds; m:ss by default
  ///   - onToggle: the disc was tapped; the owner of the player plays or pauses it
  public init(
    theme: KTheme,
    playback: KPlayback?,
    durationLabel: String,
    positionLabel: String = "",
    playLabel: String,
    pauseLabel: String,
    unavailable: Bool = false,
    compact: Bool = true,
    panel: Bool = true,
    formatTime: @escaping (Double) -> String = KVoiceCard.clock,
    onToggle: @escaping () -> Void
  ) {
    self.theme = theme
    self.playback = playback
    self.durationLabel = durationLabel
    self.positionLabel = positionLabel
    self.playLabel = playLabel
    self.pauseLabel = pauseLabel
    self.unavailable = unavailable
    self.compact = compact
    self.panel = panel
    self.formatTime = formatTime
    self.onToggle = onToggle
  }

  private var playing: Bool { !unavailable && (playback?.playing ?? false) }

  public var body: some View {
    HStack(spacing: 12) {
      disc
      // only the bars and the time tick while playing
      TimelineView(.animation(minimumInterval: 0.1, paused: !playing)) { context in
        let now = context.date
        HStack(spacing: 12) {
          bars(progress: unavailable ? 0 : playback?.progress(at: now) ?? 0)
          Text(timeLabel(now: now))
            .kText(.monoAction)
            .foregroundStyle(theme.sub)
            .lineLimit(1)
            .fixedSize()
        }
      }
    }
    .padding(panel ? (compact ? 10 : 14) : 0)
    .background {
      if panel {
        RoundedRectangle(cornerRadius: 14, style: .circular).fill(theme.lav2)
      }
    }
    .contentShape(Rectangle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(playing ? pauseLabel : playLabel)
    .accessibilityValue(timeLabel(now: Date()))
    .accessibilityAddTraits(.isButton)
    .accessibilityAction {
      if !unavailable { onToggle() }
    }
    .disabled(unavailable)
  }

  private func timeLabel(now: Date) -> String {
    guard !unavailable, let playback else { return durationLabel }
    if playback.playing { return formatTime(playback.position(at: now)) }
    return playback.positionS > 0 && !positionLabel.isEmpty ? positionLabel : durationLabel
  }

  private var disc: some View {
    let side: CGFloat = compact ? 36 : 44
    return SwiftUI.Button(action: onToggle) {
      KLineIcon(playing ? .pause : .play, size: side * 0.42, lineWidth: 0, color: theme.bg)
        .frame(width: side, height: side)
        .background(Circle().fill(unavailable ? theme.faint : theme.ind))
        .contentShape(Circle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityHidden(true)
  }

  private func bars(progress: Double) -> some View {
    let scale: CGFloat = compact ? 0.75 : 1
    let count = Self.barHeights.count
    return HStack(alignment: .bottom, spacing: 2) {
      ForEach(0..<count, id: \.self) { i in
        // lit as AudioCard lights them: a bar is on once the progress reaches its start
        let lit = progress > 0 && Double(i) / Double(count) <= progress
        RoundedRectangle(cornerRadius: 2, style: .circular)
          .fill(theme.ind)
          .opacity(lit ? 0.9 : 0.3)
          .frame(maxWidth: .infinity)
          .frame(height: Self.barHeights[i] * scale)
      }
    }
    .frame(height: 26 * scale, alignment: .bottom)
    .accessibilityHidden(true)
  }
}
