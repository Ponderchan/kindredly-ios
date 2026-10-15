// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE TODAY PLATE (H:31): TODAY at the page title's 22, 22 from the screen's edge, shrinking into a
 centred postmark over the first 40pt of scroll; the plate's one fact on the right (CLOSED on a
 quiet day, ALL READ on the end page, nothing while the first load is in flight). No rule under
 it (owner). A fixed 52 band in the page colour: the stack's frame never changes mid-scroll.

 H's shrink is a function of the scroll offset sc (clamped 0...40): font 22 → 11, letter-spacing
 .04em → .24em, and the title moved to the centre. Here the title stays set at 22 and is scaled
 (to .5 at p = 1, from its leading edge), its tracking set so that, scaled, it is .24em of the
 visual 11; it moves by the measured width rather than H's fixed 3.75pt per point of scroll, so it
 lands centred in all nine languages. p comes from the scroll model only this view reads, so a
 scroll frame redraws the plate and nothing else. Reduce Motion keeps it: it follows the finger,
 it isn't an animation.

 VoiceOver hears the title as the page's header; a long one (AUJOURD'HUI, GESCHLOSSEN beside it)
 shrinks to .7 rather than running into the label.
 */
struct KTodayHeader: View {
  static let height: CGFloat = KTodayGeometry.band
  /// how far the shrink runs, in points of scroll (H:31)
  static let shrinkOver: CGFloat = 40
  static let edge: CGFloat = 22
  static let label = KTextStyle.monoAction

  let theme: KTheme
  let title: String
  let rightLabel: String
  @ObservedObject var chrome: KScrollModel

  @State private var titleWidth: CGFloat = 0
  @State private var bandWidth: CGFloat = 0

  var body: some View {
    let p = min(max(chrome.offset / Self.shrinkOver, 0), 1)
    let scale = 1 - 0.5 * p
    // tracking at the set 22: .04em resting, .24em of the visual size once scaled
    let tracking = 0.04 + 0.20 * p
    let visual = titleWidth * scale
    let shift = max(0, (bandWidth - visual) / 2 - Self.edge) * p
    HStack(alignment: .center, spacing: 12) {
      Text(title)
        .kText(.system(22, .semibold, tracking: tracking))
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width in
          if abs(width - titleWidth) > 0.5 { titleWidth = width }
        }
        .scaleEffect(scale, anchor: .leading)
        .offset(x: shift)
        .accessibilityAddTraits(.isHeader)
      Spacer(minLength: 0)
      if !rightLabel.isEmpty {
        Text(rightLabel)
          .kText(Self.label)
          .foregroundStyle(theme.mute)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
          .layoutPriority(1)
      }
    }
    .padding(.horizontal, Self.edge)
    .frame(height: Self.height)
    .frame(maxWidth: .infinity)
    .background(theme.bg)
    .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width in
      if abs(width - bandWidth) > 0.5 { bandWidth = width }
    }
    // a fixed band: the title and the label stop growing at the first accessibility size
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
    .accessibilityElement(children: .contain)
  }
}
