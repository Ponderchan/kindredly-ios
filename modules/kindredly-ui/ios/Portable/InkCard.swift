// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.
// The Expo side lives in Adapters/KInkCardView.swift and never leaks in here.

import SwiftUI

/*
 THE INKCARD, the 10a material for letters and writing. A face in the theme's sf, a 2.5pt
 outline in ln, round corners, and a hard shadow: the same rounded shape in ln, moved right and
 down, with no blur. It comes in two variants (InkCardVariant below). The default, .today, has
 corners of 28 and a 6/6 shadow: the Today letter card's numbers in the mock
 (.claude/mock/k10/Kindredly 10 Final.dc.html:32, "border:2.5px … border-radius:28px;
 box-shadow:6px 6px 0 … padding:18px 20px 14px; box-sizing:border-box"). The prompts file
 says 24 and 5/5 for InkCards in general; where the two disagree the mock wins
 (tokens-10a.md §11 item 1), and the mock's own Me cards are the 24 and 5/5 one, .me.

 Read the way the browser reads that CSS:
 - box-sizing is border-box, so the content sits inside the outline AND the padding:
   18 + 2.5 from the top, 20 + 2.5 from each side, 14 + 2.5 from the bottom (.me: 16 + 2.5
   all round; the mock's Me cards are flex columns whose content-box padding reads the same).
 - the corners are plain circular arcs, as CSS draws them (and as React Native draws its own
   borderRadius), not SwiftUI's continuous corners, so a card here matches a card there.
 - like box-shadow, the shadow takes no room. It hangs 6pt (5pt for .me) outside the card's
   frame to the right and below, and whoever places the card leaves that room (the mock's 16
   gutter and 12 gap between cards do). The card does not clip it, and SwiftUI draws past a
   view's frame unless something clips; @expo/ui's Host sets no clipping on its hosting view
   either (read in expo-modules-core SwiftUIHostingView.swift, still to be seen on a device in
   ui-lab).

 The card spans the width it is offered and is as tall as its content, which it stacks
 top-down from the leading edge (the mock card is a flex column: no gap on Today, 12 or 14 on
 Me, which is the spacing parameter). For a card of a
 fixed height (the Today card is 576 tall), make the content flexible, e.g. give it a
 Spacer() or .frame(maxHeight: .infinity), and put .frame(height:) on the InkCard.
 */
/// The two InkCards the mock draws (tokens-10a.md §7): the Today letter card and the Me cards.
public enum InkCardVariant: Equatable, Sendable {
  /// The Today letter card: corners of 28, a 6/6 shadow, padding 18 20 14 (H:32). The
  /// default. (The composer sheet shares the corners and shadow but pads 16 with a gap of
  /// 10, H:129, so it is not this variant.)
  case today
  /// The Me cards (profile, Aura, Stamps): corners of 24, a 5/5 shadow, padding 16
  /// (H:72, 78, 81). The calendar popover has the same 5/5. The Courier card (H:75) is not
  /// one: it has no padding, a courier-green face and clips its sky to the corners.
  case me

  public var cornerRadius: CGFloat {
    switch self {
    case .today: return 28
    case .me: return 24
    }
  }

  /// how far the hard shadow sits right of and below the card
  public var shadowOffset: CGFloat {
    switch self {
    case .today: return 6
    case .me: return 5
    }
  }

  /// the CSS padding, inside the outline
  public var padding: EdgeInsets {
    switch self {
    case .today: return EdgeInsets(top: 18, leading: 20, bottom: 14, trailing: 20)
    case .me: return EdgeInsets(top: 16, leading: 16, bottom: 16, trailing: 16)
    }
  }

  /// where the content actually starts: the padding plus the outline, as border-box lays it out
  public var contentInsets: EdgeInsets {
    let p = padding
    let b = InkCardMetrics.borderWidth
    return EdgeInsets(top: p.top + b, leading: p.leading + b, bottom: p.bottom + b, trailing: p.trailing + b)
  }
}

/// The Today card's numbers, by name. The JS side's InkCardHost insets its React Native content
/// by these (modules/kindredly-ui/src/InkCard.tsx); change them together.
public enum InkCardMetrics {
  /// the outline, the same on every InkCard (H:32, 72)
  public static let borderWidth: CGFloat = 2.5
  public static let cornerRadius: CGFloat = InkCardVariant.today.cornerRadius
  /// how far the hard shadow sits right of and below the card
  public static let shadowOffset: CGFloat = InkCardVariant.today.shadowOffset
  /// the CSS padding, inside the outline
  public static let padding = InkCardVariant.today.padding
  /// where the content actually starts: the padding plus the outline, as border-box lays it out
  public static let contentInsets = InkCardVariant.today.contentInsets
}

public struct InkCard<Content: View>: View {
  private let theme: KTheme
  private let variant: InkCardVariant
  private let spacing: CGFloat
  private let content: Content

  /// - Parameters:
  ///   - variant: .today (28, 6/6, 18 20 14) or .me (24, 5/5, 16)
  ///   - spacing: the gap between the content's pieces, CSS's gap. The Today card has none;
  ///     the Me cards use 14 (profile) or 12 (Aura, Stamps).
  public init(theme: KTheme, variant: InkCardVariant = .today, spacing: CGFloat = 0, @ViewBuilder content: () -> Content) {
    self.theme = theme
    self.variant = variant
    self.spacing = spacing
    self.content = content()
  }

  public var body: some View {
    VStack(alignment: .leading, spacing: spacing) {
      content
    }
    .frame(maxWidth: .infinity, alignment: .topLeading)
    .padding(variant.contentInsets)
    .background {
      // back to front: the shadow, the face, the outline (drawn inside the edge, as a CSS border is)
      KStickerBackground(
        shape: RoundedRectangle(cornerRadius: variant.cornerRadius, style: .circular),
        fill: theme.sf,
        stroke: theme.ln,
        lineWidth: InkCardMetrics.borderWidth,
        shadow: theme.ln,
        shadowOffset: variant.shadowOffset
      )
    }
  }
}
