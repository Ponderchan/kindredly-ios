// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE PROFILE CARD (H:72): an InkCard .me (sf, 2.5 ln, corners 24, a 5/5 ln shadow, padding
 16), 14 between its row and its figures.

 THE ROW (14 apart): the avatar, 56 across in a circle on the theme's line colour with a 2pt ln
 ring — the real one (a photo, a portrait, an old drawn face or the mosaic), which the app hands
 in as a React Native island; then the name (system 600 18), JOINED (mono 500 10 at .12em, mute)
 and, for a cofounder, the gold mark; and at the trailing edge the pencil, 20 across at stroke
 1.9 in a 34 box (Edit profile).

 THE FIGURES: two cells 2 apart in a 14-cornered clip, each soft2 with 12 of padding: the glyph
 16 across (the envelope in ind, the bubbles in ink, the mock's 2.4 stroke on its 28 grid), the
 figure (mono 600 13: a figure, not a label, so owner question 2 keeps it at 13 — KMonoSizes)
 and the unit (mono 600 10 at .12em, mute); when the unit doesn't fit beside the figure (a long
 language, a narrow phone, large text) it goes under it, centred, on up to two lines, and the two
 cells keep one height. Each cell is a button that VoiceOver reads as the count ("12 letters").
 */
public struct KProfileCard<Avatar: View>: View {
  /// the avatar's side (H:72)
  public static var avatarSize: CGFloat { 56 }

  static var unitStyle: KTextStyle { .mono(10, .semibold, tracking: 0.12) }
  /// the mock's 2.4 stroke on the glyphs' 28 grid, in KLineGlyph's 24-grid units
  static var statStroke: CGFloat { 2.4 * 24 / 28 }

  private let theme: KTheme
  private let profile: KMeProfile
  private let actions: KMeActions
  private let avatar: Avatar

  public init(theme: KTheme, profile: KMeProfile, actions: KMeActions, @ViewBuilder avatar: () -> Avatar) {
    self.theme = theme
    self.profile = profile
    self.actions = actions
    self.avatar = avatar()
  }

  public var body: some View {
    InkCard(theme: theme, variant: .me, spacing: 14) {
      row
      figures
    }
  }

  private var row: some View {
    HStack(alignment: .center, spacing: 14) {
      ZStack {
        Circle().fill(theme.line)
        avatar
          .frame(width: Self.avatarSize, height: Self.avatarSize)
      }
      .frame(width: Self.avatarSize, height: Self.avatarSize)
      .clipShape(Circle())
      .overlay(Circle().strokeBorder(theme.ln, lineWidth: 2))
      .accessibilityHidden(true)

      VStack(alignment: .leading, spacing: 3) {
        Text(profile.name)
          .kText(.profileName)
          .foregroundStyle(theme.ink)
          .lineLimit(2)
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityAddTraits(.isHeader)
        if !profile.joined.isEmpty {
          Text(profile.joined)
            .kText(.monoMeta)
            .foregroundStyle(theme.mute)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
        }
        if !profile.cofounder.isEmpty {
          KCofounderMark(theme: theme, label: profile.cofounder)
            .padding(.top, 3)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)

      SwiftUI.Button {
        actions.onEdit()
      } label: {
        KLineIcon(.pen, size: 20, lineWidth: 1.9, color: theme.ink)
          .frame(width: 34, height: 34)
          .padding(5)
          .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
      .padding(-5)
      .accessibilityLabel(profile.editLabel)
    }
  }

  private var figures: some View {
    HStack(spacing: 2) {
      ForEach(profile.stats) { stat in
        SwiftUI.Button {
          actions.onStat(stat.key)
        } label: {
          figure(stat)
            .padding(12)
            // both cells take the taller one's height (the row is fixed-size vertically)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(theme.soft2)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFadePressStyle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(stat.a11yLabel)
        .accessibilityAddTraits(.isButton)
      }
    }
    .fixedSize(horizontal: false, vertical: true)
    .clipShape(RoundedRectangle(cornerRadius: 14, style: .circular))
    .dynamicTypeSize(...DynamicTypeSize.accessibility3)
  }

  /// One cell's glyph, figure and unit: in a row while the unit fits beside the figure, else the
  /// glyph and figure over the unit, which may then take two lines (SEELENVERWANDTE with three
  /// figures on an SE, or any language at the AX3 cap, used to be cut to an ellipsis).
  private func figure(_ stat: KMeStat) -> some View {
    let glyph = KLineIcon(stat.glyph, size: 16, lineWidth: Self.statStroke, color: stat.glyph == .envelope ? theme.ind : theme.ink)
    let count = Text(stat.count)
      .kText(.monoFigure)
      .foregroundStyle(theme.ink)
      .lineLimit(1)
      .fixedSize()
    let unit = Text(stat.unit)
      .kText(Self.unitStyle)
      .foregroundStyle(theme.mute)
    return ViewThatFits(in: .horizontal) {
      HStack(alignment: .center, spacing: 8) {
        glyph
        count
        unit
          .lineLimit(1)
          .fixedSize()
      }
      VStack(alignment: .center, spacing: 4) {
        HStack(alignment: .center, spacing: 8) {
          glyph
          count
        }
        unit
          .lineLimit(2)
          .minimumScaleFactor(0.7)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
      }
    }
  }
}

/*
 THE COFOUNDER MARK (CofounderMark.tsx in SwiftUI): a square gold dot and COFOUNDER No. 007 in
 mono 600 9 (the owner's 9/10/11 rule lifts the old 8.5) inside a 1pt gold outline. Never shown
 to strangers (the caller only draws it on your own Me). The gold is a brand colour: the wax
 gold outline and dot in every theme, the number in the brass of a seal on a light card and in
 wax gold on a dark one, where the brass would sit near 3.6:1.
 */
public struct KCofounderMark: View {
  static var style: KTextStyle { .mono(9, .semibold, tracking: 0.13) }

  private let theme: KTheme
  private let label: String

  public init(theme: KTheme, label: String) {
    self.theme = theme
    self.label = label
  }

  public var body: some View {
    HStack(alignment: .center, spacing: 6) {
      Rectangle()
        .fill(KBrand.waxGold)
        .frame(width: 5, height: 5)
        .accessibilityHidden(true)
      Text(label)
        .kText(Self.style)
        .foregroundStyle(theme.isDark ? KBrand.waxGold : KBrand.brassSeal)
        .lineLimit(1)
        // shrinks rather than pushing the row past the card (it used to be fixed-size: at AX1,
        // or MITGRÜNDER NR. 007 on an SE at xxxLarge, the avatar and pencil were pushed out)
        .minimumScaleFactor(0.7)
    }
    .padding(.horizontal, 7)
    .padding(.vertical, 3)
    .overlay(Rectangle().strokeBorder(KBrand.waxGold, lineWidth: 1))
    // a 9pt mark: it grows with the text up to AX1, no further
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
    .accessibilityElement(children: .combine)
  }
}
