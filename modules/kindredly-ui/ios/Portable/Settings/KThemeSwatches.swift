// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE THEME SWATCHES (H:99, H:440), the top of Settings' APPEARANCE. Each swatch is a little phone
 drawn in ITS OWN theme, so the reader sees what they would get before choosing it:

   ┌───────┐   a tile 3:4, corners of 12, padding 9 7 7, 5 between its parts, on that theme's bg:
   │ ▬     │   - a 3pt bar 42% across in its ln (corners of 2): the page title;
   │┌─────┐│   - a card filling the rest: its sf, corners of 7, a 1.5 outline in its ln and a hard
   ││     ││     2/2 shadow in its ln;
   │└─────┘│   - a 9pt bar, corners of 5, its sf with a 1.5 ln outline, holding a 5pt dot in its
   │(  •  )│     ind in its middle: the tab bar.
   └───────┘
    Classic    the name under it, 7 below, system 500 11: ind when selected, sub otherwise (.2s).

 FIVE APPEARANCES (owner, 2026-10-19, FC2 decision 5): System, Light, Dark, Lavender, Paper, in
 five columns 10 apart. A swatch's key is the APPEARANCE (system / light / dark / lavender /
 paper), drawn as the theme it stands for (light → Classic, dark → Midnight); System draws one
 phone split on the diagonal from its top-right to its bottom-left corner, Classic above it,
 Midnight below (it follows the phone). An older theme key (classic, midnight) still draws as
 itself, and anything else as Classic.
 The selected one (the reader's APPEARANCE, decided by the caller: System at night is still
 System) wears the selected look in the CURRENT theme (KSelectableTile: a 2pt ind border and a
 3pt lav halo); the others a 2pt line border. Each swatch is one button; VoiceOver reads its
 name with the selected trait, and its hint when it has one (System: what it follows).

 At the accessibility text sizes five columns leave a name far too narrow:
 there the swatches go two to a row, each phone no wider than 110 and centred over its name, and
 the name wraps (up to three lines) instead of being cut.
 */
public struct KThemeSwatch: Identifiable, Equatable, Sendable {
  /// an appearance: system, light, dark, lavender, paper (an old theme key still draws)
  public let key: String
  /// its name, already translated
  public let label: String
  /// VoiceOver's hint, already translated; "" for none
  public let hint: String

  public var id: String { key }

  public init(key: String, label: String, hint: String = "") {
    self.key = key
    self.label = label
    self.hint = hint
  }

  /// The theme a swatch draws: an appearance's theme, an old theme key as itself, nil for System
  /// (the split phone), Classic for anything unknown.
  static func theme(for key: String) -> KTheme? {
    switch key {
    case "system": return nil
    case "light": return .classic
    case "dark": return .midnight
    default: return KTheme.named(key) ?? .classic
    }
  }
}

public struct KThemeSwatches: View {
  private let theme: KTheme
  private let options: [KThemeSwatch]
  private let selectedKey: String
  private let onPick: (String) -> Void

  /// - Parameters:
  ///   - theme: the theme the page is drawn in (the selected look uses its ind and lav)
  ///   - options: the swatches offered, in order
  ///   - selectedKey: the reader's appearance
  ///   - onPick: a swatch was tapped
  public init(theme: KTheme, options: [KThemeSwatch], selectedKey: String, onPick: @escaping (String) -> Void) {
    self.theme = theme
    self.options = options
    self.selectedKey = selectedKey
    self.onPick = onPick
  }

  @Environment(\.dynamicTypeSize) private var typeSize

  private static let columns = Array(repeating: GridItem(.flexible(), spacing: 10, alignment: .top), count: 5)
  /// at the accessibility sizes: two to a row, the phone at most this wide
  private static let largeColumns = Array(repeating: GridItem(.flexible(), spacing: 10, alignment: .top), count: 2)
  private static let largePhone: CGFloat = 110
  /// the little phone's widest at the usual sizes (owner, 2026-11-13: "appearance 和 font 那里能不能
  /// 小点 太大了夸张"): it used to fill its fifth of the row, about 66 wide and 88 tall on a phone
  private static let phone: CGFloat = 50

  private var large: Bool { typeSize.isAccessibilitySize }

  public var body: some View {
    LazyVGrid(columns: large ? Self.largeColumns : Self.columns, alignment: .leading, spacing: large ? 14 : 10) {
      ForEach(options) { option in
        swatch(option)
      }
    }
  }

  private func swatch(_ option: KThemeSwatch) -> some View {
    let selected = option.key == selectedKey
    return SwiftUI.Button {
      onPick(option.key)
    } label: {
      VStack(spacing: 7) {
        swatchPhone(option.key)
          .aspectRatio(3.0 / 4.0, contentMode: .fit)
          .kSelectableTile(theme: theme, selected: selected, cornerRadius: 12)
          .frame(maxWidth: large ? Self.largePhone : Self.phone)
        Text(option.label)
          .kText(.swatchLabel)
          .foregroundStyle(selected ? theme.ind : theme.sub)
          .multilineTextAlignment(.center)
          .lineLimit(large ? 3 : 1)
          .minimumScaleFactor(large ? 1 : 0.75)
          .fixedSize(horizontal: false, vertical: large)
          .animation(.easeInOut(duration: 0.2), value: selected)
      }
      .frame(maxWidth: .infinity)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(option.label)
    .accessibilityHint(option.hint)
    .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
  }

  @ViewBuilder
  private func swatchPhone(_ key: String) -> some View {
    if let t = KThemeSwatch.theme(for: key) {
      KMiniPhone(theme: t)
    } else {
      KSplitMiniPhone()
    }
  }
}

/// System's swatch: Classic's phone above the diagonal from the top-right to the bottom-left
/// corner, Midnight's below it, each half clipped to its triangle.
struct KSplitMiniPhone: View {
  var body: some View {
    ZStack {
      KMiniPhone(theme: .classic)
        .clipShape(KDiagonalHalf(lower: false))
      KMiniPhone(theme: .midnight)
        .clipShape(KDiagonalHalf(lower: true))
    }
    .accessibilityHidden(true)
  }
}

/// One triangle of a rectangle cut from its top-right corner to its bottom-left one: the upper
/// left half, or (lower) the bottom right half.
struct KDiagonalHalf: Shape {
  let lower: Bool

  func path(in rect: CGRect) -> Path {
    var p = Path()
    if lower {
      p.move(to: CGPoint(x: rect.maxX, y: rect.minY))
      p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
      p.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
    } else {
      p.move(to: CGPoint(x: rect.minX, y: rect.minY))
      p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
      p.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
    }
    p.closeSubpath()
    return p
  }
}

/// One theme as a tiny phone (H:99), filling the frame it is given.
struct KMiniPhone: View {
  let theme: KTheme

  var body: some View {
    GeometryReader { geo in
      VStack(alignment: .leading, spacing: 5) {
        RoundedRectangle(cornerRadius: 2, style: .circular)
          .fill(theme.ln)
          .frame(width: max(0, (geo.size.width - 14) * 0.42), height: 3)
        KStickerBackground(
          shape: RoundedRectangle(cornerRadius: 7, style: .circular),
          fill: theme.sf,
          stroke: theme.isDark ? theme.line : theme.ln,
          lineWidth: 1.5,
          shadow: theme.isDark ? nil : theme.ln,
          shadowOffset: 2
        )
        .padding(.trailing, 2) // the shadow's room inside the tile
        .frame(maxHeight: .infinity)
        // the tab bar, its dot in the middle (H:99: display flex, justify-content center)
        ZStack(alignment: .center) {
          RoundedRectangle(cornerRadius: 5, style: .circular).fill(theme.sf)
          RoundedRectangle(cornerRadius: 5, style: .circular).strokeBorder(theme.ln, lineWidth: 1.5)
          Circle()
            .fill(theme.ind)
            .frame(width: 5, height: 5)
        }
        .frame(height: 9)
      }
      .padding(.top, 9)
      .padding(.horizontal, 7)
      .padding(.bottom, 7)
      .frame(width: geo.size.width, height: geo.size.height, alignment: .topLeading)
    }
    .background(theme.bg)
    .accessibilityHidden(true)
  }
}
