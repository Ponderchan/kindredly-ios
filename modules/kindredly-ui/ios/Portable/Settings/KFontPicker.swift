// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE LETTER FONT PICKER (owner, 10a; styled after the swatches, H:99): the face letters are set in
 when you read them. Three tiles in three columns, 10 apart, each corners of 12, padding 10, on
 sf: the specimen ("Aa", from TS) at 24 in its own face (Newsreader, New York — the system serif —
 or EB Garamond), and under it the face's name in system 500 11. The names are proper nouns and
 come in untranslated. The selected tile wears the swatches' selected look (KSelectableTile: 2pt
 ind border, 3pt lav halo) and its name turns ind. Each tile is one button; VoiceOver reads the
 face's name with the selected trait (the specimen is a picture of the face, not read).

 Only the faces this binary can draw are offered (the caller passes the choices: no Garamond
 until its file is in the app). A face's specimen is drawn with KType's own letter font, so New
 York scales with Dynamic Type as .kText does, and an unembedded Garamond draws as Newsreader,
 never as the system sans.

 At the accessibility text sizes three columns leave a name ~80 wide ("News…", "EB Ga…" at AX3):
 there the tiles stack, one to a row, the specimen at the left and the name beside it, wrapping
 (up to three lines) instead of being cut.
 */
public struct KFontOption: Identifiable, Equatable, Sendable {
  /// the key TS sends: newsreader, newyork, garamond
  public let key: String
  /// the face's own name, untranslated
  public let name: String
  /// the specimen drawn in the face
  public let sample: String

  public var id: String { key }

  public init(key: String, name: String, sample: String) {
    self.key = key
    self.name = name
    self.sample = sample
  }

  /// the face drawn for this key (anything unknown is Newsreader)
  public var face: KLetterFace { KLetterFace(key: key) }
}

public struct KFontPicker: View {
  private let theme: KTheme
  private let options: [KFontOption]
  private let selectedKey: String
  private let onPick: (String) -> Void

  public init(theme: KTheme, options: [KFontOption], selectedKey: String, onPick: @escaping (String) -> Void) {
    self.theme = theme
    self.options = options
    self.selectedKey = selectedKey
    self.onPick = onPick
  }

  @Environment(\.dynamicTypeSize) private var typeSize

  private static let columns = Array(repeating: GridItem(.flexible(), spacing: 10, alignment: .top), count: 3)

  private var large: Bool { typeSize.isAccessibilitySize }

  public var body: some View {
    if large {
      VStack(alignment: .leading, spacing: 10) {
        ForEach(options) { option in
          tile(option)
        }
      }
    } else {
      LazyVGrid(columns: Self.columns, alignment: .leading, spacing: 10) {
        ForEach(options) { option in
          tile(option)
        }
      }
    }
  }

  private func tile(_ option: KFontOption) -> some View {
    let selected = option.key == selectedKey
    return SwiftUI.Button {
      onPick(option.key)
    } label: {
      let layout = large
        ? AnyLayout(HStackLayout(alignment: .center, spacing: 12))
        : AnyLayout(VStackLayout(spacing: 4))
      layout {
        KFontSpecimen(face: option.face, sample: option.sample)
          .foregroundStyle(theme.ink)
          .fixedSize()
        Text(option.name)
          .kText(.swatchLabel)
          .foregroundStyle(selected ? theme.ind : theme.sub)
          .lineLimit(large ? 3 : 1)
          .minimumScaleFactor(large ? 1 : 0.7)
          .fixedSize(horizontal: false, vertical: large)
          .frame(maxWidth: large ? .infinity : nil, alignment: .leading)
          .animation(.easeInOut(duration: 0.2), value: selected)
      }
      .padding(10)
      .frame(maxWidth: .infinity, alignment: large ? .leading : .center)
      .background(theme.sf)
      .kSelectableTile(theme: theme, selected: selected, cornerRadius: 12)
      .contentShape(RoundedRectangle(cornerRadius: 12, style: .circular))
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(option.name)
    .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
  }
}

/// The specimen at 24 in one Letter face, scaling with Dynamic Type up to the first accessibility
/// size (past it the three tiles would burst; the names under them keep growing).
struct KFontSpecimen: View {
  let face: KLetterFace
  let sample: String

  var body: some View {
    KFontSpecimenText(face: face, sample: sample)
      .dynamicTypeSize(...DynamicTypeSize.accessibility1)
      .accessibilityHidden(true)
  }
}

private struct KFontSpecimenText: View {
  let face: KLetterFace
  let sample: String
  @ScaledMetric(relativeTo: .title2) private var scaled: CGFloat = 24

  var body: some View {
    Text(sample)
      .font(KType.letterFont(face, italic: false, size: 24, scaledSize: scaled, relativeTo: .title2))
      .lineLimit(1)
      .minimumScaleFactor(0.6)
  }
}
