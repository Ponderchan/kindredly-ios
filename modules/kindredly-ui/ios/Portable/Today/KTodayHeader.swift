// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE TODAY PLATE (design Prompt 5, 15c): TODAY at the page title's 22, 22 from the screen's edge,
 shrinking into a centred postmark as the card is pulled up, and staying small once a letter has
 gone. Nothing on the right (owner). A fixed 52 band in the page colour, above the card in z: the
 slot's frame never changes mid-drag.

 p is the deck's drag progress (KDeckMotion: clamp(−dy/110, 0, 1)), or 1 once locked. Locked is
 the desk's `content.titleLocked || deck.pendingLeft != nil`: TS's lock (a letter passed today, or
 the day done) survives a relaunch, and the pending pass holds it while TS confirms. While the
 finger drags, p follows it with no transaction; a short release springs back with the deck's own
 springBack (it animates motion.progress), and a flip of the lock animates with springBack here.

 At p: the title stays set at 22 and is scaled (to .5 at p = 1, from its leading edge, so 22 → 11),
 its tracking set so that, scaled, it is .24em of the visual 11 (.04em at rest); it moves by the
 measured width to the centre rather than the mock's fixed translateX 150, so it lands centred in
 all nine languages (AUJOURD'HUI, HEUTE, 今日…). It also rises 9 (offset y −9p), so the band
 reads 52 → 34 as the design draws it; the layout band stays 52. Reduce Motion keeps all of it: it
 follows the finger, it isn't an animation.

 VoiceOver hears the title as the page's header; a long one shrinks to .7 rather than clipping.
 */
struct KTodayHeader: View {
  static let height: CGFloat = KTodayGeometry.band
  static let edge: CGFloat = 22
  /// how far the title rises at p = 1: the band's visual 52 → 34, centre to centre
  static let rise: CGFloat = 9

  let theme: KTheme
  let title: String
  let locked: Bool
  @ObservedObject var motion: KDeckMotion

  @State private var titleWidth: CGFloat = 0
  @State private var bandWidth: CGFloat = 0

  init(theme: KTheme, title: String, locked: Bool, motion: KDeckMotion) {
    self.theme = theme
    self.title = title
    self.locked = locked
    self.motion = motion
  }

  var body: some View {
    let p = locked ? 1 : min(max(motion.progress, 0), 1)
    let scale = 1 - 0.5 * p
    // tracking at the set 22: .04em resting, .24em of the visual size once scaled
    let tracking = 0.04 + 0.20 * p
    let visual = titleWidth * scale
    let shift = max(0, (bandWidth - visual) / 2 - Self.edge) * p
    HStack(alignment: .center, spacing: 0) {
      Text(title)
        .kText(.system(22, .semibold, tracking: tracking))
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width in
          if abs(width - titleWidth) > 0.5 { titleWidth = width }
        }
        .scaleEffect(scale, anchor: .leading)
        .offset(x: shift, y: -Self.rise * p)
        .accessibilityAddTraits(.isHeader)
      Spacer(minLength: 0)
    }
    // a flip of the lock (a pass confirmed, the day turned, the last letter brought back) springs;
    // the finger's own frames carry no animation, and a short release animates motion.progress
    .animation(KTodayMotion.springBack, value: locked)
    .padding(.horizontal, Self.edge)
    .frame(height: Self.height)
    .frame(maxWidth: .infinity)
    .background(theme.bg)
    .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width in
      if abs(width - bandWidth) > 0.5 { bandWidth = width }
    }
    // a fixed band: the title stops growing at the first accessibility size
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
    .accessibilityElement(children: .contain)
  }
}
