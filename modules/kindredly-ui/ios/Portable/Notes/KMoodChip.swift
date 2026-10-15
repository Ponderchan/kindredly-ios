// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE FOUR MOOD GROUPS (10a, owner 2026-10-15). A page stores one of thirty faces; 10a draws it as
 one of four colours with a line face: Calm, Happy, Tired, Low (the angry faces are Low). TS works
 out the group from the stored face (src/data/moods.ts moodGroup) and sends its key; Swift only
 draws it. The colours are KMood (themes.json "mood"), the same in every theme; the faces are
 KLineGlyph's four mood drawings (the Notes mock's FACE, H:155).

 KMoodChip is the group drawn small: a rounded square in the group's fill with its face in the
 group's ink. Four sizes on the Notes screen (H:55, H:111, H:113):
   .card     36, corners 11, face 22 at stroke 2   a note's head on a Card
   .compact  28, corners 9,  face 18 at stroke 2   a note's head in Grid and List
   .chip     18, corners 5,  face 13 at stroke 2.4 the floating date chip
   .legend   18, corners 6,  face 12 at stroke 2.4 the calendar's legend
 It is decorative: VoiceOver hears the mood in the label of whatever holds it.
 */

/// One of the four 10a mood groups. The raw value is the key TS sends.
public enum KMoodGroup: String, CaseIterable, Sendable {
  case calm
  case happy
  case tired
  case low

  /// The group's fill and ink, the same in every theme.
  public var mood: KMood {
    switch self {
    case .calm: return .calm
    case .happy: return .happy
    case .tired: return .tired
    case .low: return .low
    }
  }

  /// The group's line face.
  public var face: KLineGlyph {
    switch self {
    case .calm: return .moodCalm
    case .happy: return .moodHappy
    case .tired: return .moodTired
    case .low: return .moodLow
    }
  }

  /// The group for a key TS sent; Calm for a key this binary doesn't know (the colour a page with
  /// no readable mood is drawn in).
  public static func from(_ key: String) -> KMoodGroup {
    KMoodGroup(rawValue: key) ?? .calm
  }
}

public struct KMoodChip: View {
  /// A chip's size, corners and face.
  public struct Metrics: Equatable, Sendable {
    public let size: CGFloat
    public let cornerRadius: CGFloat
    public let faceSize: CGFloat
    public let faceStroke: CGFloat

    public init(size: CGFloat, cornerRadius: CGFloat, faceSize: CGFloat, faceStroke: CGFloat) {
      self.size = size
      self.cornerRadius = cornerRadius
      self.faceSize = faceSize
      self.faceStroke = faceStroke
    }

    /// a note's head on a Card (H:55)
    public static let card = Metrics(size: 36, cornerRadius: 11, faceSize: 22, faceStroke: 2)
    /// a note's head in Grid and List (H:345)
    public static let compact = Metrics(size: 28, cornerRadius: 9, faceSize: 18, faceStroke: 2)
    /// the floating date chip (H:111)
    public static let chip = Metrics(size: 18, cornerRadius: 5, faceSize: 13, faceStroke: 2.4)
    /// the calendar's legend (H:113)
    public static let legend = Metrics(size: 18, cornerRadius: 6, faceSize: 12, faceStroke: 2.4)
  }

  private let group: KMoodGroup
  private let metrics: Metrics

  public init(group: KMoodGroup, metrics: Metrics = .card) {
    self.group = group
    self.metrics = metrics
  }

  public var body: some View {
    RoundedRectangle(cornerRadius: metrics.cornerRadius, style: .circular)
      .fill(group.mood.fill)
      .frame(width: metrics.size, height: metrics.size)
      .overlay {
        KLineIcon(group.face, size: metrics.faceSize, lineWidth: metrics.faceStroke, color: group.mood.ink)
      }
      .accessibilityHidden(true)
  }
}
