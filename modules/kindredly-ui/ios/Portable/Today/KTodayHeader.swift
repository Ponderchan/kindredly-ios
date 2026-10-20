// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE TODAY PLATE: TODAY as the main tabs' page title (.pageTitle, System bold 22, Dynamic Type
 scaled), leading, 22 from the screen's edge, like Notes, Kindreds and Me (owner's type system,
 10-20). It no longer shrinks into a centred, letter-spaced postmark as the card is pulled up or
 once a letter has gone: at rest and mid-drag it is the same title. Nothing on the right (owner).
 A fixed 52 band in the page colour, above the card in z: the slot's frame never changes mid-drag.

 VoiceOver hears the title as the page's header; a long one shrinks to .7 rather than clipping.
 */
struct KTodayHeader: View {
  static let height: CGFloat = KTodayGeometry.band
  static let edge: CGFloat = 22

  let theme: KTheme
  let title: String

  init(theme: KTheme, title: String) {
    self.theme = theme
    self.title = title
  }

  var body: some View {
    HStack(alignment: .center, spacing: 0) {
      Text(title)
        .kText(.pageTitle)
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .accessibilityAddTraits(.isHeader)
      Spacer(minLength: 0)
    }
    .padding(.horizontal, Self.edge)
    .frame(height: Self.height)
    .frame(maxWidth: .infinity)
    .background(theme.bg)
    // a fixed band: the title stops growing at the first accessibility size
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
    .accessibilityElement(children: .contain)
  }
}
