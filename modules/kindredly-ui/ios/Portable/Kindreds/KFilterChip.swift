// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 A GROUP CHIP under the Kindreds band (H:62, with the owner's 16.5 text): All / Kindreds n /
 Pen pals n.

 - On: the theme's lav fill and border, the words in ind. Off: sf, the words in ink, a line
   border. 1.5 border, capsule. The mock's padding is 9 / 16 inside the border (content-box, as
   KSticker notes), so the drawn padding adds the border.
 - Optional mark before the words (KLegendGlyph kindred / penPal, 18), the count after them at
   14.5 and .55, and a 6pt ind dot after that when someone in an unselected group is waiting on
   you (kindreds.tsx's group dot, kept).
 - Changes state over .25s (H: transition all .25s).
 - VoiceOver: one button with the label TS gives ("Kindreds, 3") and the selected trait.

 Not KSegmentChips: that is the Me sticker chip with its hard shadow.
 */
public struct KFilterChip: View {
  public enum Glyph: String, Sendable {
    case none
    case kindred
    case penPal
  }

  /// the mock's 9 / 16 inside the 1.5 border
  static let border: CGFloat = 1.5
  static let padV: CGFloat = 9 + border
  static let padH: CGFloat = 16 + border
  /// the owner's chip text (kindreds.tsx: 16.5 / 500), its count at 14.5
  static let label = KTextStyle.system(16.5, .medium)
  static let count = KTextStyle.system(14.5, .medium)

  private let theme: KTheme
  private let label: String
  private let count: String
  private let glyph: Glyph
  private let selected: Bool
  private let dot: Bool
  private let a11yLabel: String
  private let action: () -> Void

  /// - Parameters:
  ///   - label: the group's name, already cased for a chip ("Pen pals")
  ///   - count: the number after it, "" for none (All)
  ///   - glyph: the group's mark before the words
  ///   - selected: the group being shown
  ///   - dot: someone in this group is waiting on you (drawn only while not selected)
  ///   - a11yLabel: what VoiceOver reads ("Pen pals, 21")
  public init(theme: KTheme, label: String, count: String = "", glyph: Glyph = .none, selected: Bool, dot: Bool = false, a11yLabel: String, action: @escaping () -> Void) {
    self.theme = theme
    self.label = label
    self.count = count
    self.glyph = glyph
    self.selected = selected
    self.dot = dot
    self.a11yLabel = a11yLabel
    self.action = action
  }

  public var body: some View {
    let ink = selected ? theme.ind : theme.ink
    SwiftUI.Button(action: action) {
      HStack(spacing: 7) {
        switch glyph {
        case .none: EmptyView()
        case .kindred: KLegendGlyph(theme: theme, kind: .kindred)
        case .penPal: KLegendGlyph(theme: theme, kind: .penPal)
        }
        Text(label)
          .kText(Self.label)
          .foregroundStyle(ink)
          .lineLimit(1)
          .fixedSize()
        if !count.isEmpty {
          Text(count)
            .kText(Self.count)
            .foregroundStyle(ink)
            .opacity(0.55)
            .lineLimit(1)
            .fixedSize()
        }
        if dot && !selected {
          Circle()
            .fill(theme.ind)
            .frame(width: 6, height: 6)
        }
      }
      .padding(.vertical, Self.padV)
      .padding(.horizontal, Self.padH)
      .background(Capsule().fill(selected ? theme.lav : theme.sf))
      .overlay(Capsule().strokeBorder(selected ? theme.lav : theme.line, lineWidth: Self.border))
      .contentShape(Capsule())
    }
    .buttonStyle(KFadePressStyle())
    .animation(.easeInOut(duration: 0.25), value: selected)
    .accessibilityLabel(a11yLabel)
    .accessibilityAddTraits(selected ? .isSelected : [])
  }
}
