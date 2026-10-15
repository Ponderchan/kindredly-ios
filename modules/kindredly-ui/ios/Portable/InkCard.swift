// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.
// The Expo side lives in Adapters/KInkCardView.swift and never leaks in here.

import SwiftUI

/*
 THE INKCARD, the 10a material for letters and writing. A face in the theme's sf, a 2.5pt
 outline in ln, corners of 28, and a hard shadow: the same rounded shape in ln, moved 6 right
 and 6 down, with no blur. These are the Today letter card's numbers in the mock
 (.claude/mock/k10/Kindredly 10 Final.dc.html:32, "border:2.5px … border-radius:28px;
 box-shadow:6px 6px 0 … padding:18px 20px 14px; box-sizing:border-box"). The prompts file
 says 24 and 5/5 for InkCards in general; where the two disagree the mock wins
 (tokens-10a.md §11 item 1).

 Read the way the browser reads that CSS:
 - box-sizing is border-box, so the content sits inside the outline AND the padding:
   18 + 2.5 from the top, 20 + 2.5 from each side, 14 + 2.5 from the bottom.
 - the corners are plain circular arcs, as CSS draws them (and as React Native draws its own
   borderRadius), not SwiftUI's continuous corners, so a card here matches a card there.
 - like box-shadow, the shadow takes no room. It hangs 6pt outside the card's frame to the
   right and below, and whoever places the card leaves that room (the mock's 16 gutter and 12
   gap between cards do). The card does not clip it, and SwiftUI draws past a view's frame
   unless something clips; @expo/ui's Host sets no clipping on its hosting view either (read
   in expo-modules-core SwiftUIHostingView.swift, still to be seen on a device in ui-lab).

 The card spans the width it is offered and is as tall as its content, which it stacks
 top-down from the leading edge (the mock card is a flex column with no gap). For a card of a
 fixed height (the Today card is 576 tall), make the content flexible, e.g. give it a
 Spacer() or .frame(maxHeight: .infinity), and put .frame(height:) on the InkCard.
 */
public enum InkCardMetrics {
  public static let cornerRadius: CGFloat = 28
  public static let borderWidth: CGFloat = 2.5
  /// how far the hard shadow sits right of and below the card
  public static let shadowOffset: CGFloat = 6
  /// the CSS padding, inside the outline
  public static let padding = EdgeInsets(top: 18, leading: 20, bottom: 14, trailing: 20)
  /// where the content actually starts: the padding plus the outline, as border-box lays it out
  public static let contentInsets = EdgeInsets(
    top: padding.top + borderWidth,
    leading: padding.leading + borderWidth,
    bottom: padding.bottom + borderWidth,
    trailing: padding.trailing + borderWidth
  )
}

public struct InkCard<Content: View>: View {
  private let theme: KTheme
  private let content: Content

  public init(theme: KTheme, @ViewBuilder content: () -> Content) {
    self.theme = theme
    self.content = content()
  }

  public var body: some View {
    let shape = RoundedRectangle(cornerRadius: InkCardMetrics.cornerRadius, style: .circular)
    VStack(alignment: .leading, spacing: 0) {
      content
    }
    .frame(maxWidth: .infinity, alignment: .topLeading)
    .padding(InkCardMetrics.contentInsets)
    .background {
      ZStack {
        // back to front: the shadow, the face, the outline (drawn inside the edge, as a CSS border is)
        shape
          .fill(theme.ln)
          .offset(x: InkCardMetrics.shadowOffset, y: InkCardMetrics.shadowOffset)
        shape.fill(theme.sf)
        shape.strokeBorder(theme.ln, lineWidth: InkCardMetrics.borderWidth)
      }
    }
  }
}
