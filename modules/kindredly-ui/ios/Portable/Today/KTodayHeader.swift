// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE TODAY PLATE: TODAY as the main tabs' page title (.pageTitle, System bold 22), leading, 22 from
 the screen's edge, like Notes, Kindreds and Me (owner's type system, 10-20), shrinking into a
 small centred title as the card is pulled up (an iOS nav bar's inline title: System semibold 17,
 no tracking, no capitals added), and staying small once a letter has gone (owner, TestFlight
 1.2.4: the morph comes back, in System). Nothing on the right (owner). A fixed 52 band in the page
 colour, above the card in z: the slot's frame never changes mid-drag.

 p is the deck's drag progress (KDeckMotion: clamp(−dy/110, 0, 1)), or 1 once locked. Locked is
 the desk's `content.titleLocked || deck.pendingLeft != nil`: TS's lock (a letter passed today, or
 the day done) survives a relaunch, and the pending pass holds it while TS confirms. While the
 finger drags, p follows it with no transaction; a short release springs back with the deck's own
 springBack (it animates motion.progress), and a flip of the lock animates with springBack here.

 At p: two copies of the title sit in the same place, the bold one fading out and the semibold one
 in, both set at 22 and scaled (to 17/22 at p = 1, from their leading edge); each moves by its own
 measured width to the centre, so it lands centred in all nine languages (AUJOURD'HUI, HEUTE,
 今日…). It also rises 9 (offset y −9p), so the band reads 52 → 34; the layout band stays 52.
 Reduce Motion keeps all of it: it follows the finger, it isn't an animation.

 VoiceOver hears the title once, as the page's header; a long one shrinks to .7 rather than clipping.
 */
struct KTodayHeader: View {
  static let height: CGFloat = KTodayGeometry.band
  static let edge: CGFloat = 22
  /// how far the title rises at p = 1: the band's visual 52 → 34, centre to centre
  static let rise: CGFloat = 9
  /// the small title at p = 1: an inline nav title's 17 out of the page title's 22
  static let collapsed: CGFloat = 17.0 / 22.0
  /// the small title's weight (the page title's own 22, so the two copies scale alike)
  static let smallStyle = KTextStyle.system(22, .semibold)

  let theme: KTheme
  let title: String
  let locked: Bool
  @ObservedObject var motion: KDeckMotion

  @State private var largeWidth: CGFloat = 0
  @State private var smallWidth: CGFloat = 0
  @State private var bandWidth: CGFloat = 0

  init(theme: KTheme, title: String, locked: Bool, motion: KDeckMotion) {
    self.theme = theme
    self.title = title
    self.locked = locked
    self.motion = motion
  }

  var body: some View {
    let p = locked ? 1 : min(max(motion.progress, 0), 1)
    let scale = 1 - (1 - Self.collapsed) * p
    HStack(alignment: .center, spacing: 0) {
      ZStack(alignment: .leading) {
        plate(.pageTitle, width: $largeWidth, scale: scale, p: p)
          .opacity(1 - p)
          .accessibilityAddTraits(.isHeader)
        plate(Self.smallStyle, width: $smallWidth, scale: scale, p: p)
          .opacity(p)
          .accessibilityHidden(true)
      }
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

  /// one copy of the title at `style`, scaled from its leading edge and moved by its own width
  /// to the band's centre as p goes to 1
  private func plate(_ style: KTextStyle, width: Binding<CGFloat>, scale: CGFloat, p: CGFloat) -> some View {
    let visual = width.wrappedValue * scale
    let shift = max(0, (bandWidth - visual) / 2 - Self.edge) * p
    return Text(title)
      .kText(style)
      .foregroundStyle(theme.ink)
      .lineLimit(1)
      .minimumScaleFactor(0.7)
      .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { w in
        if abs(w - width.wrappedValue) > 0.5 { width.wrappedValue = w }
      }
      .scaleEffect(scale, anchor: .leading)
      .offset(x: shift, y: -Self.rise * p)
  }
}
