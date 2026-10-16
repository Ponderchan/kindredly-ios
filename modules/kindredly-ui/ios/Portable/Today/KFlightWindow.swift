// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE WINDOW (design 3d × 25b "夜空窗", build contract §3.7): where Wren dives at the end of the
 day, and the way into Flappy Words. It sits under the card slot, in the band's place, 64 tall.

   ┌────────────┬───────────────────────────────────────────┐
   │ ·  ▌   ▐ · │ THAT'S ALL FOR TODAY                  (▶) │  eyebrow, the line, the play disc
   │  [Wren]    │ Fly a lap with Wren                       │
   │    ▐   ▌   │                                           │
   └────────────┴───────────────────────────────────────────┘

 - The sky follows the hour, in the game's own palette (CourierCard PALETTE[daylight(hour)]):
   TS sends the gradient, the pillars' fill and ink, the text colour and whether there are stars.
   The frame is the theme's (a 2 ln outline, a hard 3/3 ln shadow).
 - The scene, the left 104: the stars when the sky has them, and a strip of pillars in the game's
   style that slides left 104 every 2.6 s while she plays (not under Reduce Motion). Her spot is
   left empty: the overlay bird (KWireWren) lands there, at 34.
 - When she can't play (an egg, or wilting: the PLAY sticker's rule) there is no disc, and TS's
   line is the countdown to her next post instead of the invitation.
 - The whole window is one button while she can play (TS's a11yLabel and hint); otherwise it is
   static text.
 Text stops growing at .xLarge: the window has a fixed height.
 */
struct KFlightWindow: View {
  static let radius: CGFloat = 20
  static let border: CGFloat = 2
  static let shadow: CGFloat = 3
  static let scene: CGFloat = 104
  static let disc: CGFloat = 40

  let theme: KTheme
  let model: KFlightWindowModel
  /// the flow's flap loop has begun: the pipes run with it
  let looping: Bool
  let onTap: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  init(theme: KTheme, model: KFlightWindowModel, looping: Bool, onTap: @escaping () -> Void) {
    self.theme = theme
    self.model = model
    self.looping = looping
    self.onTap = onTap
  }

  var body: some View {
    Group {
      if model.canPlay {
        SwiftUI.Button(action: onTap) {
          face
        }
        .buttonStyle(KFlightWindowPressStyle())
        .accessibilityLabel(model.a11yLabel)
        .accessibilityHint(model.a11yHint)
      } else {
        face
          .accessibilityElement(children: .ignore)
          .accessibilityLabel(model.a11yLabel)
      }
    }
    .dynamicTypeSize(...DynamicTypeSize.xLarge)
  }

  private var face: some View {
    let sky = model.sky
    let shape = RoundedRectangle(cornerRadius: Self.radius, style: .circular)
    return HStack(spacing: 10) {
      KFlightWindowScene(sky: sky, running: looping && model.canPlay && !reduceMotion)
        .frame(width: Self.scene)
        .frame(maxHeight: .infinity)
      VStack(alignment: .leading, spacing: 3) {
        Text(model.eyebrow)
          .kText(.mono(10, .semibold, tracking: 0.12))
          .foregroundStyle(sky.text.opacity(0.62))
          .lineLimit(1)
          .minimumScaleFactor(0.8)
        Text(model.line)
          .kText(.system(15, .semibold))
          .foregroundStyle(sky.text)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      if model.canPlay {
        playDisc
      }
    }
    .padding(.trailing, 8)
    // inside the outline (border-box), and clipped to the frame as overflow:hidden does
    .padding(Self.border)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .background(LinearGradient(colors: [sky.top, sky.bottom], startPoint: .top, endPoint: .bottom))
    .clipShape(shape)
    .overlay(shape.strokeBorder(theme.ln, lineWidth: Self.border))
    .background(shape.fill(theme.ln).offset(x: Self.shadow, y: Self.shadow))
    .contentShape(shape)
  }

  /// the lime disc: a 2 ln outline, a hard 2/2 ln shadow, the play triangle in the brand ink
  private var playDisc: some View {
    ZStack {
      Circle().fill(KBrand.lime)
      Circle().strokeBorder(theme.ln, lineWidth: 2)
      KWindowPlayGlyph()
        .fill(KBrand.inkOnBrand)
        .frame(width: 12, height: 14)
    }
    .frame(width: Self.disc, height: Self.disc)
    .background(Circle().fill(theme.ln).offset(x: 2, y: 2))
    .accessibilityHidden(true)
  }
}

/// The window's left 104: the stars and the moving pillars, and the divider on its right.
private struct KFlightWindowScene: View {
  static let divider: CGFloat = 1.5
  /// (left, top, opacity) of the four 2 × 2 stars
  static let stars: [(CGFloat, CGFloat, Double)] = [(14, 9, 0.7), (48, 18, 0.5), (84, 8, 0.6), (94, 40, 0.4)]
  /// the pairs' left edges on the 208 strip; they repeat every 104, so the strip loops seamlessly
  static let pairs: [CGFloat] = [56, 108, 160, 212]
  /// the short and the tall pillar of a pair (top/bottom alternate 12/22, 22/12)
  static let short: CGFloat = 12
  static let tall: CGFloat = 22
  static let pillar: CGFloat = 10
  static let pillarLine: CGFloat = 1.5
  static let pillarCorner: CGFloat = 3
  /// how far the strip slides in one period
  static let travel: CGFloat = 104

  let sky: KTodaySky
  let running: Bool

  /// when the pillars started moving, so they start from where they rest
  @State private var start = Date()

  var body: some View {
    HStack(spacing: 0) {
      TimelineView(.animation(paused: !running)) { context in
        let shift = running ? Self.shift(at: context.date.timeIntervalSince(start)) : 0
        Canvas { gc, size in
          draw(in: &gc, size: size, shift: shift)
        }
      }
      .clipped()
      Rectangle()
        .fill(sky.night ? Color.white.opacity(0.12) : KBrand.inkOnBrand.opacity(0.12))
        .frame(width: Self.divider)
    }
    .onChange(of: running, initial: true) { _, on in
      if on { start = Date() }
    }
    .accessibilityHidden(true)
  }

  /// kpipes: 0 → −104, linear, every 2.6 s
  static func shift(at elapsed: TimeInterval) -> CGFloat {
    let period = KTodayMotion.pipesPeriod
    guard period > 0, elapsed > 0 else { return 0 }
    let phase = elapsed.truncatingRemainder(dividingBy: period) / period
    return -travel * CGFloat(phase)
  }

  private func draw(in gc: inout GraphicsContext, size: CGSize, shift: CGFloat) {
    if sky.stars {
      for (x, y, opacity) in Self.stars {
        gc.fill(Path(ellipseIn: CGRect(x: x, y: y, width: 2, height: 2)), with: .color(Color.white.opacity(opacity)))
      }
    }
    for (i, left) in Self.pairs.enumerated() {
      let x = left + shift
      guard x + Self.pillar > 0, x < size.width else { continue }
      let topHeight = i.isMultiple(of: 2) ? Self.short : Self.tall
      let bottomHeight = i.isMultiple(of: 2) ? Self.tall : Self.short
      pillar(in: &gc, rect: CGRect(x: x, y: 0, width: Self.pillar, height: topHeight), openAtTop: true)
      pillar(in: &gc, rect: CGRect(x: x, y: size.height - bottomHeight, width: Self.pillar, height: bottomHeight), openAtTop: false)
    }
  }

  /// One pillar: the fill, and its outline inside the edge on the three sides that show (the edge
  /// it grows from has none), the inner corners rounded 3.
  private func pillar(in gc: inout GraphicsContext, rect: CGRect, openAtTop: Bool) {
    let r = min(Self.pillarCorner, rect.width / 2, rect.height)
    let fill = UnevenRoundedRectangle(
      cornerRadii: openAtTop
        ? RectangleCornerRadii(topLeading: 0, bottomLeading: r, bottomTrailing: r, topTrailing: 0)
        : RectangleCornerRadii(topLeading: r, bottomLeading: 0, bottomTrailing: 0, topTrailing: r),
      style: .circular
    ).path(in: rect)
    gc.fill(fill, with: .color(sky.pillarFill))

    let half = Self.pillarLine / 2
    let left = rect.minX + half
    let right = rect.maxX - half
    let inner = max(0, r - half)
    var line = Path()
    if openAtTop {
      let bottom = rect.maxY - half
      line.move(to: CGPoint(x: left, y: rect.minY))
      line.addArc(tangent1End: CGPoint(x: left, y: bottom), tangent2End: CGPoint(x: right, y: bottom), radius: inner)
      line.addArc(tangent1End: CGPoint(x: right, y: bottom), tangent2End: CGPoint(x: right, y: rect.minY), radius: inner)
      line.addLine(to: CGPoint(x: right, y: rect.minY))
    } else {
      let top = rect.minY + half
      line.move(to: CGPoint(x: left, y: rect.maxY))
      line.addArc(tangent1End: CGPoint(x: left, y: top), tangent2End: CGPoint(x: right, y: top), radius: inner)
      line.addArc(tangent1End: CGPoint(x: right, y: top), tangent2End: CGPoint(x: right, y: rect.maxY), radius: inner)
      line.addLine(to: CGPoint(x: right, y: rect.maxY))
    }
    gc.stroke(line, with: .color(sky.pillarInk), lineWidth: Self.pillarLine)
  }
}

/// The play triangle: M1 1l10 6-10 6z on a 12 × 14 box.
private struct KWindowPlayGlyph: Shape {
  func path(in rect: CGRect) -> Path {
    let sx = rect.width / 12
    let sy = rect.height / 14
    var p = Path()
    p.move(to: CGPoint(x: rect.minX + 1 * sx, y: rect.minY + 1 * sy))
    p.addLine(to: CGPoint(x: rect.minX + 11 * sx, y: rect.minY + 7 * sy))
    p.addLine(to: CGPoint(x: rect.minX + 1 * sx, y: rect.minY + 13 * sy))
    p.closeSubpath()
    return p
  }
}

/// The window pressed: it sinks a little. Gentler than the round buttons' .94, for something
/// the width of the screen.
private struct KFlightWindowPressStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .scaleEffect(configuration.isPressed ? 0.97 : 1)
      .animation(KTodayMotion.press, value: configuration.isPressed)
  }
}
