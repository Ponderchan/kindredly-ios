// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE BOTTOM FADE (H:108): on every tab, the content dissolves into the page colour before it
 reaches the floating tab bar. 176 tall at the bottom of the screen, from the page colour at no
 opacity at its top to the full page colour 42% of the way down, and solid below. The mock
 starts it from white (rgba(255,255,255,0)), which greys the page on Lavender and Paper and
 glows on Midnight; here it starts from the theme's own bg at no opacity.

     ScrollView { … }
       .contentMargins(.bottom, KBottomFade.contentMargin(height: fade), for: .scrollContent)
       .overlay(alignment: .bottom) { KBottomFade(theme: t, height: fade) }

 It never takes a touch and VoiceOver doesn't see it. Give the scroll content a bottom margin
 of the fade's height less 6 (contentMargin), so the last row can be scrolled clear of the
 solid part (list_host_pattern: tabBarRoom + 12 where there is no fade).
 */
public struct KBottomFade: View {
  /// the mock's height (H:108)
  public static let defaultHeight: CGFloat = 176
  /// where the fade turns solid, as a fraction of its height (H:108)
  public static let solidFrom: CGFloat = 0.42

  /// The bottom content margin a scroll view under a fade of this height needs.
  public static func contentMargin(height: CGFloat = defaultHeight) -> CGFloat {
    max(0, height - 6)
  }

  private let theme: KTheme
  private let height: CGFloat

  /// - Parameter height: from the screen's bottom edge up; 176 in the mock
  public init(theme: KTheme, height: CGFloat = KBottomFade.defaultHeight) {
    self.theme = theme
    self.height = height
  }

  public var body: some View {
    LinearGradient(
      stops: [
        .init(color: theme.bg.opacity(0), location: 0),
        .init(color: theme.bg, location: Self.solidFrom),
      ],
      startPoint: .top,
      endPoint: .bottom
    )
    .frame(height: height)
    .frame(maxWidth: .infinity)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}
