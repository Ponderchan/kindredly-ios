// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE FOUR MOOD GROUPS (10a, owner 2026-10-15 / 2026-10-16). A page stores one of thirty faces, or a
 group alone; 10a draws it as one of four colours with a line face: Calm, Happy, Tired, Low (the
 angry faces are Low). TS works out the group from the stored mood (src/data/moods.ts moodGroup)
 and sends its key, with the icon's art key (moodArtKey: "mood-sleepy", or "mood-group-low" for a
 page that chose only a group); Swift only draws them. The colours are KMood (themes.json "mood"),
 the same in every theme; the faces are painted in the group's FACE ink (KMood.faceInk: the ink,
 except Happy's darker #94681C, 4.0:1 on its fill where the brand gold is 2.7:1).

 KMoodChip is the mood drawn small: a rounded square in the group's fill with its icon on it. Four
 sizes on the Notes screen (H:55, H:111, H:113), the stroke the optical step for the face size
 (KMoodArt.strokeStep: 2.4 at 14pt or less, 2.0 up to 29pt, 1.75 from 30pt):
   .card     36, corners 11, face 22 at stroke 2   a note's head on a Card
   .compact  28, corners 9,  face 18 at stroke 2   a note's head in Grid and List
   .chip     18, corners 5,  face 13 at stroke 2.4 the floating date chip
   .legend   18, corners 6,  face 12 at stroke 2.4 the calendar's legend (group icons only)

 THE FACE, in order of preference:
   1. the icon `icon` names, from the generated table (Kit/KMoodArt) — any of the 34;
   2. the group's own icon (mood-group-<g>), when that icon isn't drawn yet or the key is unknown
      or empty;
   3. the group's 10a line face (KLineGlyph .moodCalm …), while the group icon itself isn't drawn.
 So a partial delivery from the owner — the four group icons first — shows the new group icon on
 every page of that group until its face arrives.

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

  /// The group's 10a line face: the last fallback, while its icon isn't drawn.
  public var face: KLineGlyph {
    switch self {
    case .calm: return .moodCalm
    case .happy: return .moodHappy
    case .tired: return .moodTired
    case .low: return .moodLow
    }
  }

  /// The group's own icon's art key (a page that chose only this group): "mood-group-calm".
  public var iconKey: String {
    "mood-group-\(rawValue)"
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
    /// the face's stroke in 24-grid units
    public let faceStroke: CGFloat

    /// `faceStroke` nil: the optical step for `faceSize` (KMoodArt.strokeStep).
    public init(size: CGFloat, cornerRadius: CGFloat, faceSize: CGFloat, faceStroke: CGFloat? = nil) {
      self.size = size
      self.cornerRadius = cornerRadius
      self.faceSize = faceSize
      self.faceStroke = faceStroke ?? KMoodArt.strokeStep(forFaceSize: faceSize)
    }

    /// a note's head on a Card (H:55): face 22, stroke 2
    public static let card = Metrics(size: 36, cornerRadius: 11, faceSize: 22)
    /// a note's head in Grid and List (H:345): face 18, stroke 2
    public static let compact = Metrics(size: 28, cornerRadius: 9, faceSize: 18)
    /// the floating date chip (H:111): face 13, stroke 2.4
    public static let chip = Metrics(size: 18, cornerRadius: 5, faceSize: 13)
    /// the calendar's legend (H:113): face 12, stroke 2.4
    public static let legend = Metrics(size: 18, cornerRadius: 6, faceSize: 12)
  }

  private let group: KMoodGroup
  private let icon: String
  private let metrics: Metrics

  /// - Parameters:
  ///   - group: the tile's colours
  ///   - icon: the art key to draw ("mood-sleepy", "mood-group-low"); nil or "" draws the group's
  ///     icon
  ///   - metrics: the chip's size, corners and face
  public init(group: KMoodGroup, icon: String? = nil, metrics: Metrics = .card) {
    self.group = group
    self.icon = icon ?? ""
    self.metrics = metrics
  }

  public var body: some View {
    RoundedRectangle(cornerRadius: metrics.cornerRadius, style: .circular)
      .fill(group.mood.fill)
      .frame(width: metrics.size, height: metrics.size)
      .overlay { face }
      .accessibilityHidden(true)
  }

  @ViewBuilder private var face: some View {
    let ink = group.mood.faceInk
    let scale = metrics.faceStroke / KMoodArt.masterStroke
    if let art = KMoodArt(key: icon, size: metrics.faceSize, ink: ink, strokeScale: scale) {
      art
    } else if let art = KMoodArt(key: group.iconKey, size: metrics.faceSize, ink: ink, strokeScale: scale) {
      art
    } else {
      KLineIcon(group.face, size: metrics.faceSize, lineWidth: metrics.faceStroke, color: ink)
    }
  }
}
