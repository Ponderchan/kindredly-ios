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
   │(•    )│     ind: the tab bar.
   └───────┘
    Classic    the name under it, 7 below, system 500 11: ind when selected, sub otherwise (.2s).

 Four columns, 10 apart (H:99), whatever number is offered, so the tiles keep their size when
 Midnight joins them (it is offered only once the dark theme is ready: the caller decides).
 The selected one (the theme IN EFFECT, H:440, decided by the caller) wears the selected look in
 the CURRENT theme (KSelectableTile: a 2pt ind border and a 3pt lav halo); the others a 2pt line
 border. Each swatch is one button; VoiceOver reads its name with the selected trait. The tiles
 are drawn from KTheme, so a key this binary doesn't know draws as Classic.
 */
public struct KThemeSwatch: Identifiable, Equatable, Sendable {
  /// a themes.json key: classic, midnight, lavender, paper
  public let key: String
  /// its name, already translated
  public let label: String

  public var id: String { key }

  public init(key: String, label: String) {
    self.key = key
    self.label = label
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
  ///   - selectedKey: the theme in effect
  ///   - onPick: a swatch was tapped
  public init(theme: KTheme, options: [KThemeSwatch], selectedKey: String, onPick: @escaping (String) -> Void) {
    self.theme = theme
    self.options = options
    self.selectedKey = selectedKey
    self.onPick = onPick
  }

  private static let columns = Array(repeating: GridItem(.flexible(), spacing: 10, alignment: .top), count: 4)

  public var body: some View {
    LazyVGrid(columns: Self.columns, alignment: .leading, spacing: 10) {
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
        KMiniPhone(theme: KTheme.named(option.key) ?? .classic)
          .aspectRatio(3.0 / 4.0, contentMode: .fit)
          .kSelectableTile(theme: theme, selected: selected, cornerRadius: 12)
        Text(option.label)
          .kText(.swatchLabel)
          .foregroundStyle(selected ? theme.ind : theme.sub)
          .lineLimit(1)
          .minimumScaleFactor(0.75)
          .animation(.easeInOut(duration: 0.2), value: selected)
      }
      .contentShape(Rectangle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(option.label)
    .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
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
          stroke: theme.ln,
          lineWidth: 1.5,
          shadow: theme.ln,
          shadowOffset: 2
        )
        .padding(.trailing, 2) // the shadow's room inside the tile
        .frame(maxHeight: .infinity)
        ZStack(alignment: .leading) {
          RoundedRectangle(cornerRadius: 5, style: .circular).fill(theme.sf)
          RoundedRectangle(cornerRadius: 5, style: .circular).strokeBorder(theme.ln, lineWidth: 1.5)
          Circle()
            .fill(theme.ind)
            .frame(width: 5, height: 5)
            .padding(.leading, 6)
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
