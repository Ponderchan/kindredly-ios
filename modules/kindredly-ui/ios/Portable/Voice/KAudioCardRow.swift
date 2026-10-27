// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE VOICE CARD (AudioCard.tsx's AudioCardView in SwiftUI; the "audiocard" switch, off by
 default): a play/pause disc, sixteen bars lit as far as it has played, and the time. Display
 only: the player stays with whoever owns it (in the React Native app, an expo-audio player in TS:
 AudioCard's own, or a screen's one player), and every colour, the time and each bar come in
 resolved from src/components/audio-card-model.ts, the model the React Native row draws from too.
 So the four themes, a caller's mood tint, Midnight's mood fill with its ringed disc and walked
 time ink, and the postal `system` dress all arrive as plain colours and sizes here.

 Not KVoiceCard (the kit's chat and Today card, which keeps its own clock and the sub time): this
 is AudioCard's row exactly — the time in the card's ink at SF Mono 12 (600, or 400 in system),
 the bars bottom-aligned in a 26 row, the ▶ 2 right of centre, the ❚❚ centred. Flat under rule B;
 no press feedback, as the React Native Pressable has none.

 VoiceOver: the disc alone, named by the caller (vo.play / vo.pause, or a journal page's own),
 with the time as its value; the bars and the time are hidden.
 */

/// The row's look for one moment of playback (audio-card-model's AudioCardLook, resolved).
public struct KAudioCardLook: Equatable {
  public struct Bar: Equatable {
    public var height: CGFloat
    public var color: Color
    public var alpha: Double

    public init(height: CGFloat, color: Color, alpha: Double) {
      self.height = height
      self.color = color
      self.alpha = alpha
    }
  }

  public var ink: Color
  public var glyph: Color
  public var panel: Color
  /// the disc's 1.5 ring, nil for none
  public var edge: Color?
  public var timeInk: Color
  public var time: String
  public var padding: CGFloat
  public var radius: CGFloat
  public var disc: CGFloat
  public var discRadius: CGFloat
  public var glyphSize: CGFloat
  public var glyphNudge: CGFloat
  public var barRadius: CGFloat
  public var bars: [Bar]
  /// the time at 400 (system) rather than 600
  public var monoRegular: Bool

  public init(
    ink: Color,
    glyph: Color,
    panel: Color,
    edge: Color?,
    timeInk: Color,
    time: String,
    padding: CGFloat,
    radius: CGFloat,
    disc: CGFloat,
    discRadius: CGFloat,
    glyphSize: CGFloat,
    glyphNudge: CGFloat,
    barRadius: CGFloat,
    bars: [Bar],
    monoRegular: Bool
  ) {
    self.ink = ink
    self.glyph = glyph
    self.panel = panel
    self.edge = edge
    self.timeInk = timeInk
    self.time = time
    self.padding = padding
    self.radius = radius
    self.disc = disc
    self.discRadius = discRadius
    self.glyphSize = glyphSize
    self.glyphNudge = glyphNudge
    self.barRadius = barRadius
    self.bars = bars
    self.monoRegular = monoRegular
  }

  /// AudioCard at rest in a theme, before TS has said anything (compact: the composers' take)
  public static func rest(_ theme: KTheme, compact: Bool = true) -> KAudioCardLook {
    let heights: [CGFloat] = [12, 18, 24, 16, 20, 26, 14, 22, 18, 24, 20, 14, 22, 16, 24, 18]
    return KAudioCardLook(
      ink: theme.ind,
      glyph: theme.bg,
      panel: theme.lav2,
      edge: nil,
      timeInk: theme.ind,
      time: "0:00",
      padding: compact ? 10 : 14,
      radius: 14,
      disc: compact ? 36 : 44,
      discRadius: 22,
      glyphSize: compact ? 13 : 15,
      glyphNudge: 2,
      barRadius: 2,
      bars: heights.enumerated().map { i, h in Bar(height: compact ? h * 0.75 : h, color: theme.ind, alpha: i == 0 ? 0.9 : 0.3) },
      monoRegular: false
    )
  }
}

public struct KAudioCardRow: View {
  private let look: KAudioCardLook
  private let playing: Bool
  private let label: String
  private let onToggle: () -> Void

  /// the time's 12, scaled with Dynamic Type as React Native's text is
  @ScaledMetric(relativeTo: .caption) private var timeSize: CGFloat = 12

  /// - Parameters:
  ///   - look: everything drawn (TS's audio-card-model)
  ///   - playing: the ❚❚ rather than the ▶
  ///   - label: VoiceOver's name for the disc right now (play or pause), already translated
  ///   - onToggle: the disc: the player's owner plays or pauses
  public init(look: KAudioCardLook, playing: Bool, label: String, onToggle: @escaping () -> Void) {
    self.look = look
    self.playing = playing
    self.label = label
    self.onToggle = onToggle
  }

  public var body: some View {
    HStack(spacing: 12) {
      disc
      bars
      Text(look.time)
        .font(.system(size: timeSize, weight: look.monoRegular ? .regular : .semibold, design: .monospaced))
        .foregroundStyle(look.timeInk)
        .lineLimit(1)
        .fixedSize()
        .accessibilityHidden(true)
    }
    .padding(look.padding)
    .background(RoundedRectangle(cornerRadius: look.radius, style: .circular).fill(look.panel))
  }

  private var disc: some View {
    let shape = RoundedRectangle(cornerRadius: look.discRadius, style: .circular)
    return SwiftUI.Button(action: onToggle) {
      Text(playing ? "❚❚" : "▶")
        .kText(.system(look.glyphSize))
        .foregroundStyle(look.glyph)
        .padding(.leading, look.glyphNudge)
        .frame(width: look.disc, height: look.disc)
        .background(shape.fill(look.ink))
        .overlay {
          if let edge = look.edge {
            shape.strokeBorder(edge, lineWidth: 1.5)
          }
        }
        .contentShape(shape)
    }
    .buttonStyle(KAsIsButtonStyle())
    .accessibilityLabel(label)
    .accessibilityValue(look.time)
  }

  private var bars: some View {
    HStack(alignment: .bottom, spacing: 2) {
      ForEach(Array(look.bars.enumerated()), id: \.offset) { _, bar in
        RoundedRectangle(cornerRadius: look.barRadius, style: .circular)
          .fill(bar.color)
          .opacity(bar.alpha)
          .frame(maxWidth: .infinity)
          .frame(height: max(0, bar.height))
      }
    }
    .frame(height: 26, alignment: .bottom)
    .accessibilityHidden(true)
  }
}
