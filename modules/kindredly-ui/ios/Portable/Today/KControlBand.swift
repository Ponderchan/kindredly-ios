// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE CONTROL BAND (Today 3d × 25b, Prompt 3, the owner's 2026-10-16 revision: "3b arc × 2b glass").
 80 tall under the card, full width, its own coordinates (origin at the band's top left; the
 design's band sits at y 672 on a 393 × 852 phone):

          · ˙ ˙ ˙ ˙ ˙ ˙ (Wren, 48, on the arc's top) ˙ ˙ ˙ ˙ ˙ ·        the dashed arc,
        ·                                                     ·      "M98 30 Q196 -14 295 30"
      (  3  )  NEXT: frosted glass, the count          (  ✉  )  REPLY: a solid ink disc
       NEXT                                             REPLY

 - THE ARC is the road Wren flies today, from above NEXT's centre to above REPLY's. Two layers of
   the same path in ink 2.5 with round caps: dashed [3, 6] at flow.dashOpacity, and solid, trimmed
   0 → flow.arcFill. In done the flow draws the solid layer to the end (600ms, .4 0 .3 1) while the
   dashes fade, and it stays drawn. The arc never moves for done; it goes with the band when the
   band is hidden or slides away for the keyboard.
 - NEXT and REPLY are told apart by material, not by size: NEXT is seen through (frosted glass,
   the count inside), REPLY is pressed (solid ink, the envelope in bg, which stays legible on
   Midnight's pale ink). Both shrink to .94 under the finger (KPressScaleStyle).
 - The glass (CSS: rgba(255,255,255,.45), backdrop blur 18 + saturate 170%, an inset 1px white .75
   edge, 0 6 18 -8 rgba(30,27,53,.35)) is .ultraThinMaterial under a white .45 tint, in the
   theme's own colour scheme so Midnight gets the dark material; Midnight's tint is rgba(26,24,48,.5)
   and its edge white .18, its shadow black .5. CSS paints an outer box-shadow only outside the
   box, so under a see-through disc the shadow is masked to outside the circle here too:
   otherwise its core (spread -8, so mostly inside the disc) would grey the glass.
 - Glass needs something behind it to read as glass, so the page gets a faint radial ground
   (KTodayGround, below), which the desk puts behind everything.

 Every word is TS's: NEXT, REPLY, the count (deck.pendingLeft while a pass awaits TS, else TS's
 left) and what VoiceOver says. Its states:
 - hidden (a send in flight, the reader open, the + open): everything, arc too, fades out and
   takes no touches (bandFade);
 - typing (the reply field has the keyboard): the whole band slides down 160 (bandSlide; a fade
   under Reduce Motion), as the tab bar goes under the keyboard;
 - done (flow.bandShown false): the buttons and their labels fade and drop 12, the arc stays;
 - not enabled (loading, offline): the buttons at .4 with no touches, nothing in NEXT's disc.
 Taps are also refused while a card is moving (deck.animating: no re-entry) and while typing.
 */

/// The band's geometry, in band-local points: origin at the band's top left, W the Host's width.
/// The design's numbers are for W = 393; the buttons keep the design's space-evenly spacing at
/// any width, and the arc and Wren's three stops are placed from them. KWireWren and the done
/// pieces read the same numbers.
enum KBandLayout {
  static let height: CGFloat = 80, disc: CGFloat = 58, labelGap: CGFloat = 7

  /// NEXT's centre: two 58 discs spaced evenly across W (121.33 at 393)
  static func nextX(_ W: CGFloat) -> CGFloat { (W - 116) / 3 + 29 }
  /// REPLY's centre (271.67 at 393)
  static func replyX(_ W: CGFloat) -> CGFloat { W - nextX(W) }

  /// The dashed arc: from above NEXT's centre over to above REPLY's, as a quadratic.
  /// 98 / 196 / 295 at 393: "M98 30 Q196 -14 295 30".
  static func arc(_ W: CGFloat) -> (start: CGPoint, control: CGPoint, end: CGPoint) {
    (
      CGPoint(x: nextX(W) - 23.33, y: 30),
      CGPoint(x: W / 2 - 0.5, y: -14),
      CGPoint(x: replyX(W) + 23.33, y: 30)
    )
  }

  /// Wren's centre on the arc's top, at 48 (the design's left 173, top 640)
  static func wire(_ W: CGFloat) -> CGPoint { CGPoint(x: W / 2 + 0.5, y: -8) }
  /// Wren's centre at the REPLY end of the arc, at 44 (the design's 262, 662)
  static func arcEnd(_ W: CGFloat) -> CGPoint { CGPoint(x: replyX(W) + 12.33, y: 12) }
  /// Wren's centre in the flight window's scene, at 34 (the design's 36, 702)
  static let window = CGPoint(x: 53, y: 47)
  /// the flight window's frame, band-local: 14 down, 64 tall (x 16…W−16)
  static let windowFrameTop: CGFloat = 14, windowHeight: CGFloat = 64

  /// Wren's size at her three stops
  static let wireSize: CGFloat = 48, arcEndSize: CGFloat = 44, windowSize: CGFloat = 34

  /// The arc as a path.
  static func arcPath(_ W: CGFloat) -> Path {
    let a = arc(W)
    var p = Path()
    p.move(to: a.start)
    p.addQuadCurve(to: a.end, control: a.control)
    return p
  }

  /// The point at t (0…1) along the arc's quadratic.
  static func arcPoint(_ W: CGFloat, _ t: CGFloat) -> CGPoint {
    let a = arc(W)
    let u = 1 - t
    return CGPoint(
      x: u * u * a.start.x + 2 * u * t * a.control.x + t * t * a.end.x,
      y: u * u * a.start.y + 2 * u * t * a.control.y + t * t * a.end.y
    )
  }

  /// Wren's centre and size at flight f (0 = wire, 1 = arc end, 2 = window), band-local.
  /// 0…1 rides the arc's second half, her feet kept above it (the offset from the arc blends from
  /// the wire's to the arc end's); 1…2 is the straight dive into the window.
  static func flightPlace(_ W: CGFloat, _ flight: CGFloat) -> (center: CGPoint, size: CGFloat) {
    let f = min(max(flight, 0), 2)
    if f <= 1 {
      let q = arcPoint(W, 0.5 + 0.5 * f)
      let top = arcPoint(W, 0.5), end = arcPoint(W, 1)
      let w = wire(W), e = arcEnd(W)
      let dx = (w.x - top.x) + ((e.x - end.x) - (w.x - top.x)) * f
      let dy = (w.y - top.y) + ((e.y - end.y) - (w.y - top.y)) * f
      return (CGPoint(x: q.x + dx, y: q.y + dy), wireSize + (arcEndSize - wireSize) * f)
    }
    let g = f - 1
    let e = arcEnd(W)
    return (
      CGPoint(x: e.x + (window.x - e.x) * g, y: e.y + (window.y - e.y) * g),
      arcEndSize + (windowSize - arcEndSize) * g
    )
  }
}

struct KControlBand: View {
  private let theme: KTheme
  private let left: Int
  private let labels: KTodayLabels
  private let leftA11y: String
  private let enabled: Bool
  private let hidden: Bool
  @ObservedObject private var deck: KDeckState
  @ObservedObject private var flow: KDayFlow
  private let onNext: () -> Void
  private let onReply: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// - Parameters:
  ///   - left: TS's count of letters on today's desk not yet passed (NEXT shows deck.pendingLeft
  ///     instead while a pass awaits TS)
  ///   - labels: NEXT, REPLY and REPLY's VoiceOver words (labels.next, .reply, .replyA11y)
  ///   - leftA11y: what VoiceOver says for NEXT ("Next letter. 3 left today.")
  ///   - enabled: false while loading or offline: the buttons at .4, no touches, NEXT empty
  ///   - hidden: hideBand or the + open: the band and its arc fade out, no touches
  ///   - onNext: NEXT (the desk calls deck.requestNext())
  ///   - onReply: REPLY (the desk routes it to the shown card's reply)
  init(
    theme: KTheme,
    left: Int,
    labels: KTodayLabels,
    leftA11y: String,
    enabled: Bool,
    hidden: Bool,
    deck: KDeckState,
    flow: KDayFlow,
    onNext: @escaping () -> Void,
    onReply: @escaping () -> Void
  ) {
    self.theme = theme
    self.left = left
    self.labels = labels
    self.leftA11y = leftA11y
    self.enabled = enabled
    self.hidden = hidden
    self._deck = ObservedObject(wrappedValue: deck)
    self._flow = ObservedObject(wrappedValue: flow)
    self.onNext = onNext
    self.onReply = onReply
  }

  /// the buttons take a touch now
  private var active: Bool {
    enabled && !hidden && flow.bandShown && !deck.typing && !deck.animating
  }

  var body: some View {
    let typing = deck.typing
    GeometryReader { geo in
      let W = geo.size.width
      ZStack(alignment: .topLeading) {
        KBandArc(theme: theme, width: W, dashOpacity: flow.dashOpacity, fill: flow.arcFill)
        buttons(W)
      }
      .frame(width: W, height: KBandLayout.height, alignment: .topLeading)
    }
    .frame(height: KBandLayout.height)
    // the keyboard: down 160 with the tab bar; a fade under Reduce Motion
    .offset(y: typing && !reduceMotion ? 160 : 0)
    .opacity(typing && reduceMotion ? 0 : 1)
    .animation(reduceMotion ? KTodayMotion.reduced : KTodayMotion.bandSlide, value: typing)
    .opacity(hidden ? 0 : 1)
    .animation(KTodayMotion.bandFade, value: hidden)
    .allowsHitTesting(!hidden)
    .accessibilityHidden(hidden)
  }

  // ── the two buttons ──

  private func buttons(_ W: CGFloat) -> some View {
    let nx = KBandLayout.nextX(W), rx = KBandLayout.replyX(W)
    // each column is centred on its disc; wide enough for a long label, never overlapping
    let column = max(KBandLayout.disc, min(140, rx - nx - 8))
    let shown = flow.bandShown
    return ZStack(alignment: .topLeading) {
      control(
        disc: nextDisc,
        label: labels.next,
        labelColor: theme.mute,
        a11y: leftA11y,
        action: onNext
      )
      .frame(width: column, alignment: .top)
      .offset(x: nx - column / 2)

      control(
        disc: replyDisc,
        label: labels.reply,
        labelColor: theme.ink,
        a11y: labels.replyA11y,
        action: onReply
      )
      .frame(width: column, alignment: .top)
      .offset(x: rx - column / 2)
    }
    // loading or offline: at .4 until the desk is there
    .opacity(enabled ? 1 : 0.4)
    .animation(KTodayMotion.bandFade, value: enabled)
    // done: the buttons fade (.3s) and drop 12 (.35s); the arc stays. A fade alone under Reduce
    // Motion. Each curve pinned here: the flow may land several values in one transaction, and
    // its rest and reset disable animations, which .animation(_:value:) honours.
    .opacity(shown ? 1 : 0)
    .animation(reduceMotion ? KTodayMotion.reduced : KTodayMotion.bandFade, value: shown)
    .offset(y: shown || reduceMotion ? 0 : 12)
    .animation(KTodayMotion.bandSlide, value: shown)
    .allowsHitTesting(active)
    .accessibilityHidden(!shown)
  }

  /// A disc that is the button, and its label 7 under it (a tap on the label presses too; VoiceOver
  /// hears the button's own words, so the label is hidden from it).
  private func control<Disc: View>(disc: Disc, label: String, labelColor: Color, a11y: String, action: @escaping () -> Void) -> some View {
    let act = { if active { action() } }
    return VStack(spacing: KBandLayout.labelGap) {
      Button(action: act) {
        disc
          .frame(width: KBandLayout.disc, height: KBandLayout.disc)
          .contentShape(Circle())
      }
      .buttonStyle(KPressScaleStyle())
      .disabled(!enabled)
      .accessibilityLabel(a11y)

      Text(label)
        .kText(.mono(10, .medium, tracking: 0.16))
        .foregroundStyle(labelColor)
        .lineLimit(1)
        .minimumScaleFactor(0.6)
        .contentShape(Rectangle())
        .onTapGesture(perform: act)
        .accessibilityHidden(true)
    }
    .dynamicTypeSize(...DynamicTypeSize.large)
  }

  /// NEXT: the glass disc with the count (nothing while loading or offline).
  private var nextDisc: some View {
    ZStack {
      if enabled {
        Text(verbatim: String(deck.pendingLeft ?? left))
          .kText(.mono(16, .semibold))
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          .padding(.horizontal, 6)
      }
    }
    .frame(width: KBandLayout.disc, height: KBandLayout.disc)
    .background { KGlassDisc(theme: theme) }
  }

  /// REPLY: the ink disc with the envelope in bg.
  private var replyDisc: some View {
    KLineIcon(.envelope, size: 24, lineWidth: 2, color: theme.bg)
      .frame(width: KBandLayout.disc, height: KBandLayout.disc)
      .background(Circle().fill(theme.ink))
  }
}

/// The arc, two layers of one path: the dashes (fading out in done, .3s) and the solid line the
/// flow draws over them (600ms, .4 0 .3 1). Each pins its own curve: the flow may land several
/// values in one transaction, and its rest and reset disable animations, which
/// .animation(_:value:) honours. Under Reduce Motion both land on the 200ms ease.
private struct KBandArc: View {
  let theme: KTheme
  let width: CGFloat
  let dashOpacity: Double
  let fill: CGFloat
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    let path = KBandLayout.arcPath(width)
    let style = StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round)
    let drawn = min(max(fill, 0), 1)
    ZStack {
      path
        .stroke(theme.ink, style: StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round, dash: [3, 6]))
        .opacity(dashOpacity)
        .animation(reduceMotion ? KTodayMotion.reduced : .easeOut(duration: 0.3), value: dashOpacity)
      path
        .trim(from: 0, to: drawn)
        .stroke(theme.ink, style: style)
        .animation(reduceMotion ? KTodayMotion.reduced : KTodayMotion.arcDraw, value: drawn)
        // an empty trim shows nothing; the snap keeps a round cap from leaving a dot at the start
        .opacity(drawn > 0.0005 ? 1 : 0)
        .animation(nil, value: drawn)
    }
    .frame(width: width, height: KBandLayout.height, alignment: .topLeading)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

/// NEXT's frosted glass: the material, its tint and inner edge, and a soft shadow painted only
/// outside the circle (as CSS paints box-shadow).
private struct KGlassDisc: View {
  let theme: KTheme

  private var tint: Color {
    theme.isDark ? Color(.sRGB, red: 26 / 255, green: 24 / 255, blue: 48 / 255, opacity: 0.5) : Color.white.opacity(0.45)
  }

  private var edge: Color {
    Color.white.opacity(theme.isDark ? 0.18 : 0.75)
  }

  private var shadow: KSoftShadow {
    KSoftShadow(
      y: 6,
      blur: 18,
      spread: -8,
      color: theme.isDark ? Color.black.opacity(0.5) : Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.35)
    )
  }

  var body: some View {
    let s = shadow
    ZStack {
      Circle().fill(.ultraThinMaterial)
      Circle().fill(tint)
      Circle().strokeBorder(edge, lineWidth: 1)
    }
    .environment(\.colorScheme, theme.isDark ? .dark : .light)
    .background {
      Circle()
        .inset(by: -s.spread)
        .fill(s.color)
        .blur(radius: s.blur / 2)
        .offset(x: s.x, y: s.y)
        .mask { KOutsideCircle(margin: 40).fill(style: FillStyle(eoFill: true)) }
    }
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

/// Everything around a circle: a rectangle `margin` bigger than the frame with the frame's circle
/// cut out (fill it even-odd). Used as a mask so a shadow shows only outside its disc.
private struct KOutsideCircle: Shape {
  let margin: CGFloat

  func path(in rect: CGRect) -> Path {
    var p = Path()
    p.addRect(rect.insetBy(dx: -margin, dy: -margin))
    p.addEllipse(in: rect)
    return p
  }
}

/*
 THE RADIAL GROUND (Prompt 3): without it the glass reads as a grey disc on white. The design's
 "radial-gradient(120% 60% at 50% 100%, …)" in the theme's lav2, faint: lav2 at the bottom centre,
 .35 of it at 45%, nothing at the edge, over bg. The ellipse has radii 1.2W × 0.6H about the
 bottom centre: a 2.4W × 1.2H rectangle centred on (W/2, H) with an elliptical gradient out to half
 of it, clipped to the frame. The desk puts it behind everything, in the Host's full frame; it
 draws bg itself, so it can stand in for the page colour.
 */
struct KTodayGround: View {
  let theme: KTheme

  init(theme: KTheme) {
    self.theme = theme
  }

  var body: some View {
    GeometryReader { geo in
      let w = geo.size.width, h = geo.size.height
      Rectangle()
        .fill(EllipticalGradient(
          stops: [
            .init(color: theme.lav2, location: 0),
            .init(color: theme.lav2.opacity(0.35), location: 0.45),
            .init(color: theme.lav2.opacity(0), location: 1),
          ],
          center: .center,
          startRadiusFraction: 0,
          endRadiusFraction: 0.5
        ))
        .frame(width: 2.4 * w, height: 1.2 * h)
        .position(x: w / 2, y: h)
    }
    .background(theme.bg)
    .clipped()
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}
