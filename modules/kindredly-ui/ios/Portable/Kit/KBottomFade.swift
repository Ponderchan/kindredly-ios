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
  /* WITH THE TAB BAR IN THE BAND (iPhone Duo, both screens) there is no bar along the bottom to
     dissolve into, and 176 of fade left the foot of the page blank: Me's card was cut off a
     hundred points above the glass's edge (owner, 2026-11-12, at the outer screen: "me 在这个
     屏幕是这样子的吗"). There the fade is only what keeps a line of text off the home indicator:
     72, so 30 of dissolve over 42 of page colour (the indicator's 34 and a little air). */
  public static let railHeight: CGFloat = 72

  /// the fade's height on this window
  public static func height(in fold: KFoldFrame) -> CGFloat {
    fold.rail ? railHeight : defaultHeight
  }

  /// The bottom content margin a scroll view under a fade of this height needs.
  public static func contentMargin(height: CGFloat = defaultHeight) -> CGFloat {
    max(0, height - 6)
  }

  /// What a page keeps clear at its foot, given what its host asked for. A host's number is
  /// never less than the tall fade's margin (176 - 6); with the bar in the band that no longer
  /// applies, and the page ends where the short fade does.
  public static func foot(_ asked: CGFloat, in fold: KFoldFrame) -> CGFloat {
    fold.rail ? min(asked, contentMargin(height: railHeight)) : asked
  }

  private let theme: KTheme
  private let height: CGFloat?
  @ObservedObject private var fold = KFold.shared

  /// - Parameter height: from the screen's bottom edge up; nil for this window's own (176 in
  ///   the mock, 72 with the tab bar in the band)
  public init(theme: KTheme, height: CGFloat? = nil) {
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
    .frame(height: height ?? Self.height(in: fold.frame))
    .frame(maxWidth: .infinity)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}
