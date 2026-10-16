// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 WREN'S LETTER (design 3d × 25b "Wren 的信", build contract §3.7): what rises into the card's slot
 when the desk is done. Every word is TS's (today-cards buildWrenLetter): her counted note (how
 many came past and were answered, how many you wrote back to, how many still wait on you, each
 line only when it is true, with its zero and plural forms), when she is back, the invitation,
 her signature, the bag's opening time and the countdown. Nothing here counts or invents.

   ● ● ● ● ● ● ● ● ● ● ● ● ● ●                       14 punched holes
   FROM YOUR COURIER                          ┌╌╌╌╌┐  her stamp: her own picture,
   OCT.15 · 22:14                             ╎ ^v ╎  46 × 56, dotted, turned 4°
                                              └╌╌╌╌┘
   That's 12. I counted twice.                         the lines, Newsreader 20/1.3, 8 apart
   You wrote back to 3.                                (her serif, not the reader's Letter font)
   I'm back with the next ones at 8:00 AM.
   Go find one small thing worth putting in a letter — or come fly a lap with me.
   — W.  ⋔                                             the signature and her foot
            ╭──( OPENS AT 8:00 AM )──╮                 the bag: tomorrow's desk, closed, no number,
            │ ⌣⌣⌣⌣⌣⌣⌣⌣● ⌣⌣⌣⌣⌣⌣⌣⌣  │                 the flap and its wax seal
             ╰──────────────────────╯
   ──────────────────────────────────────────────
   WREN IS BACK IN                          8H 06M     the foot, the countdown in ind

 The material is the Me InkCard's (sf, a 2.5 ln outline, corners of 24, a hard 5/5 ln shadow),
 padded 0 18 12 inside the outline. The bag takes whatever height is left (margins 14 above, 56
 at the sides, 8 below) and stands aside when less than 96 is left. Where the lines don't fit at
 20 (a small phone, large text) they step down to 18, then 16, and at the last truncate rather
 than spill out of the card.

 Taps: the letter bounces (.6 s) and shows the chip (THAT'S ALL FOR TODAY) under the card for
 1.6 s; the bag jiggles (.45 s) and shows NOT YET · 8H 06M for 1.5 s, and its tap stays its own.
 Under Reduce Motion the chips fade in and nothing bounces or jiggles. VoiceOver reads the letter
 as one element (her name, then the lines, the foot and the countdown) and the bag as another.
 */
struct KWrenLetter: View {
  static let radius: CGFloat = 24
  static let border: CGFloat = 2.5
  static let shadow: CGFloat = 5
  static let holes = 14
  static let hole: CGFloat = 7
  static let stampSize = CGSize(width: 46, height: 56)
  static let stampBird: CGFloat = 32
  /// the line sizes, tried in order until the lines fit (20 is the design's)
  static let lineSizes: [CGFloat] = [20, 18, 16]
  /// the bag's margins: above, either side, below
  static let bagTop: CGFloat = 14
  static let bagSide: CGFloat = 56
  static let bagBottom: CGFloat = 8
  /// below this the bag stands aside (the design wants 120; it gives way down to here first)
  static let bagLeast: CGFloat = 96

  /// the chips' pop: kpop .3s with CSS's default ease
  static let popIn = Animation.timingCurve(0.25, 0.1, 0.25, 1, duration: 0.3)
  static let popOut = Animation.easeOut(duration: 0.2)
  /// kband's cubic-bezier(.3,.9,.3,1), on each step as CSS times keyframes
  static let bounceCurve = UnitCurve.bezier(startControlPoint: UnitPoint(x: 0.3, y: 0.9), endControlPoint: UnitPoint(x: 0.3, y: 1))

  let theme: KTheme
  let model: KWrenLetterModel
  let stampBird: KImageRef?
  /// move VoiceOver to the letter once it is up (it came in through the timeline, not at rest)
  let focusOnAppear: Bool

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @AccessibilityFocusState private var letterFocused: Bool
  @State private var bounce = 0
  @State private var jiggle = 0
  @State private var chipShown = false
  @State private var chipSerial = 0
  @State private var notYetShown = false
  @State private var notYetSerial = 0

  init(theme: KTheme, model: KWrenLetterModel, stampBird: KImageRef?, focusOnAppear: Bool = false) {
    self.theme = theme
    self.model = model
    self.stampBird = stampBird
    self.focusOnAppear = focusOnAppear
  }

  var body: some View {
    card
      // kband: up 30 at 35%, down 7 at 70%, home at .6 s
      .keyframeAnimator(initialValue: CGFloat(0), trigger: bounce) { content, y in
        content.offset(y: y)
      } keyframes: { _ in
        KeyframeTrack {
          LinearKeyframe(-30, duration: 0.21, timingCurve: Self.bounceCurve)
          LinearKeyframe(7, duration: 0.21, timingCurve: Self.bounceCurve)
          LinearKeyframe(0, duration: 0.18, timingCurve: Self.bounceCurve)
        }
      }
      // the chip sits under the card (its bottom 16 below the card's), outside the bounce
      .overlay(alignment: .bottom) {
        if chipShown {
          chip(model.chip, style: .mono(11, .semibold, tracking: 0.14), vertical: 8, horizontal: 14, radius: 14)
            .offset(y: 16)
            .transition(popTransition)
        }
      }
      .accessibilityElement(children: .contain)
      // a card of a fixed height, like the tab bar: the text stops growing at the largest
      // standard size (the lines then step down to fit)
      .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
      .onAppear {
        guard focusOnAppear else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { letterFocused = true }
      }
  }

  // ── the card ──
  private var card: some View {
    VStack(spacing: 0) {
      letter
        .layoutPriority(1)
      bagRoom
      foot
    }
    // padding 0 18 12 inside the 2.5 outline (border-box)
    .padding(EdgeInsets(top: Self.border, leading: 18 + Self.border, bottom: 12 + Self.border, trailing: 18 + Self.border))
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .background {
      KStickerBackground(
        shape: RoundedRectangle(cornerRadius: Self.radius, style: .circular),
        fill: theme.sf,
        stroke: theme.ln,
        lineWidth: Self.border,
        shadow: theme.ln,
        shadowOffset: Self.shadow
      )
    }
  }

  // ── the letter: holes, header, lines; one tap target and one VoiceOver element ──
  private var letter: some View {
    VStack(alignment: .leading, spacing: 0) {
      holes
      header
        .padding(.top, 12)
      ViewThatFits(in: .vertical) {
        ForEach(Self.lineSizes, id: \.self) { size in
          lines(size: size, fixed: true)
        }
        lines(size: Self.lineSizes.last ?? 16, fixed: false)
      }
      .padding(.top, 10)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .contentShape(Rectangle())
    .onTapGesture(perform: tapLetter)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(model.a11y)
    .accessibilityValue(a11yValue)
    .accessibilityFocused($letterFocused)
  }

  /// the lines, the foot and the countdown, in reading order
  private var a11yValue: String {
    let foot = [model.foot, model.countdown].filter { !$0.isEmpty }.joined(separator: " ")
    return (model.lines + [foot]).filter { !$0.isEmpty }.joined(separator: "\n")
  }

  private var holes: some View {
    HStack(spacing: 0) {
      ForEach(0..<Self.holes, id: \.self) { i in
        if i > 0 { Spacer(minLength: 0) }
        Circle()
          .fill(theme.ink.opacity(0.9))
          .frame(width: Self.hole, height: Self.hole)
      }
    }
    .padding(.top, 8)
    .padding(.horizontal, 4)
  }

  private var header: some View {
    HStack(alignment: .top, spacing: 10) {
      VStack(alignment: .leading, spacing: 3) {
        Text(model.from)
          .kText(.mono(10, .semibold, tracking: 0.16))
          .foregroundStyle(theme.mute)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
        Text(model.stamp)
          .kText(.mono(12, .semibold, tracking: 0.08))
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      stamp
    }
  }

  /// her stamp: her own picture in a dotted frame, turned 4°
  private var stamp: some View {
    let shape = RoundedRectangle(cornerRadius: 4, style: .circular)
    return KImage(stampBird, size: CGSize(width: Self.stampBird, height: Self.stampBird), contentMode: .fit, placeholder: .clear)
      .frame(width: Self.stampSize.width, height: Self.stampSize.height)
      .background { shape.fill(theme.soft) }
      .overlay {
        // CSS's 2.5px dotted: round dots, one every 4.6
        shape.strokeBorder(theme.ln, style: StrokeStyle(lineWidth: 2.5, lineCap: .round, dash: [0.1, 4.5]))
      }
      .rotationEffect(.degrees(4))
  }

  private func lines(size: CGFloat, fixed: Bool) -> some View {
    let style = KTextStyle.letter(size, lineHeight: 1.3)
    return VStack(alignment: .leading, spacing: 8) {
      ForEach(Array(model.lines.enumerated()), id: \.offset) { _, line in
        Text(line)
          .kText(style)
          .foregroundStyle(theme.ink)
          .frame(maxWidth: .infinity, alignment: .leading)
          .fixedSize(horizontal: false, vertical: fixed)
          .minimumScaleFactor(fixed ? 1 : 0.85)
      }
      HStack(alignment: .center, spacing: 8) {
        Text(model.sign)
          .kText(style)
          .foregroundStyle(theme.ink)
          .lineLimit(1)
        KWrenFootGlyph()
          .stroke(theme.ink, style: StrokeStyle(lineWidth: KWrenFootGlyph.lineWidth, lineCap: .round))
          .frame(width: 20, height: 16)
      }
      .fixedSize(horizontal: false, vertical: true)
    }
  }

  // ── the bag: tomorrow's desk, closed ──
  private var bagRoom: some View {
    GeometryReader { geo in
      let height = geo.size.height - Self.bagTop - Self.bagBottom
      let width = geo.size.width - 2 * Self.bagSide
      if height >= Self.bagLeast && width > 0 {
        bag(width: width, height: height)
          .position(x: geo.size.width / 2, y: Self.bagTop + height / 2)
      }
    }
  }

  private func bag(width w: CGFloat, height h: CGFloat) -> some View {
    let shape = Self.bagShape(width: w, height: h)
    let fill = theme.isDark ? theme.soft2 : theme.soft
    return ZStack(alignment: .topLeading) {
      shape.fill(fill)
      // the closed flap: M0 30 Q 50% 52 100% 30, and its wax seal where the curve dips lowest
      KWrenBagFlap()
        .stroke(theme.ln, lineWidth: 2)
        .clipShape(shape)
      Circle()
        .fill(KBrand.waxGold)
        .overlay(Circle().strokeBorder(theme.ln, lineWidth: 1.5))
        .frame(width: 14, height: 14)
        .position(x: w / 2, y: KWrenBagFlap.lowest)
      shape.strokeBorder(theme.ln, lineWidth: 2.5)
    }
    .frame(width: w, height: h)
    // the label straddles the bag's top edge: 28 tall, its top 15 above the bag
    .overlay(alignment: .top) {
      Text(model.bag)
        .kText(.mono(10, .semibold, tracking: 0.14))
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        .fixedSize()
        .padding(.horizontal, 12 + 2.5)
        .frame(minHeight: 28)
        .background {
          KStickerBackground(shape: Capsule(style: .circular), fill: theme.sf, stroke: theme.ln, lineWidth: 2.5)
        }
        .offset(y: -15)
    }
    .overlay(alignment: .bottom) {
      if notYetShown {
        chip(model.notYet, style: .mono(10, .semibold, tracking: 0.12), vertical: 7, horizontal: 11, radius: 12)
          .padding(.bottom, 20)
          .transition(popTransition)
      }
    }
    .contentShape(Rectangle())
    // kjig: rotate/x −3°/−5, 3°/5, −2°/−3, 2°/2, home, ease-in-out each fifth of .45 s
    .keyframeAnimator(initialValue: KWrenBagJig(), trigger: jiggle) { content, jig in
      content
        .offset(x: jig.x)
        .rotationEffect(.degrees(jig.angle))
    } keyframes: { _ in
      KeyframeTrack(\.angle) {
        LinearKeyframe(-3, duration: 0.09, timingCurve: .easeInOut)
        LinearKeyframe(3, duration: 0.09, timingCurve: .easeInOut)
        LinearKeyframe(-2, duration: 0.09, timingCurve: .easeInOut)
        LinearKeyframe(2, duration: 0.09, timingCurve: .easeInOut)
        LinearKeyframe(0, duration: 0.09, timingCurve: .easeInOut)
      }
      KeyframeTrack(\.x) {
        LinearKeyframe(-5, duration: 0.09, timingCurve: .easeInOut)
        LinearKeyframe(5, duration: 0.09, timingCurve: .easeInOut)
        LinearKeyframe(-3, duration: 0.09, timingCurve: .easeInOut)
        LinearKeyframe(2, duration: 0.09, timingCurve: .easeInOut)
        LinearKeyframe(0, duration: 0.09, timingCurve: .easeInOut)
      }
    }
    .onTapGesture(perform: tapBag)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(model.bag)
    .accessibilityValue(model.countdown)
  }

  /// CSS's border-radius 22 22 96 96, scaled down together where the corners don't fit the side
  /// (as the browser does) instead of left to overlap
  static func bagShape(width w: CGFloat, height h: CGFloat) -> UnevenRoundedRectangle {
    let top: CGFloat = 22
    let bottom: CGFloat = 96
    let f = min(1, w / (2 * top), w / (2 * bottom), h / (top + bottom))
    return UnevenRoundedRectangle(
      cornerRadii: RectangleCornerRadii(topLeading: top * f, bottomLeading: bottom * f, bottomTrailing: bottom * f, topTrailing: top * f),
      style: .circular
    )
  }

  // ── the foot ──
  private var foot: some View {
    VStack(spacing: 0) {
      Rectangle()
        .fill(theme.ln)
        .frame(height: 2)
      HStack(alignment: .firstTextBaseline, spacing: 10) {
        Text(model.foot)
          .kText(.mono(11, .semibold, tracking: 0.12))
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
        Spacer(minLength: 0)
        Text(model.countdown)
          .kText(.mono(11, .semibold, tracking: 0.12))
          .foregroundStyle(theme.ind)
          .lineLimit(1)
          .fixedSize()
      }
      .padding(.top, 9)
    }
    // read with the letter (its value carries the foot and the countdown)
    .accessibilityHidden(true)
  }

  // ── the chips ──
  private func chip(_ text: String, style: KTextStyle, vertical: CGFloat, horizontal: CGFloat, radius: CGFloat) -> some View {
    Text(text)
      .kText(style)
      .foregroundStyle(theme.bg)
      .lineLimit(1)
      .fixedSize()
      .padding(.vertical, vertical)
      .padding(.horizontal, horizontal)
      .background(RoundedRectangle(cornerRadius: radius, style: .circular).fill(theme.ink))
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }

  private var popTransition: AnyTransition {
    if reduceMotion { return .opacity }
    return .asymmetric(insertion: .scale(scale: 0.7).combined(with: .opacity), removal: .opacity)
  }

  // ── taps ──
  private func tapLetter() {
    if !reduceMotion { bounce &+= 1 }
    chipSerial &+= 1
    let serial = chipSerial
    withAnimation(reduceMotion ? KTodayMotion.reduced : Self.popIn) { chipShown = true }
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) {
      guard chipSerial == serial else { return }
      withAnimation(Self.popOut) { chipShown = false }
    }
  }

  private func tapBag() {
    if !reduceMotion { jiggle &+= 1 }
    notYetSerial &+= 1
    let serial = notYetSerial
    withAnimation(reduceMotion ? KTodayMotion.reduced : Self.popIn) { notYetShown = true }
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
      guard notYetSerial == serial else { return }
      withAnimation(Self.popOut) { notYetShown = false }
    }
  }
}

/// The bag's jiggle: a turn and a sideways nudge.
private struct KWrenBagJig {
  var angle: Double = 0
  var x: CGFloat = 0
}

/// The bag's closed flap, in the bag's own points: M0 30 Q 50% 52 100% 30.
private struct KWrenBagFlap: Shape {
  static let edge: CGFloat = 30
  static let dip: CGFloat = 52
  /// where the curve is lowest, under the middle (a quadratic's midpoint): the seal sits there
  static let lowest: CGFloat = (edge + dip) / 2

  func path(in rect: CGRect) -> Path {
    var p = Path()
    p.move(to: CGPoint(x: rect.minX, y: rect.minY + Self.edge))
    p.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.minY + Self.edge), control: CGPoint(x: rect.midX, y: rect.minY + Self.dip))
    return p
  }
}

/// Her foot after the signature: M11 17V6 M11 9L4 2 M11 9l7-7 M11 11l-5-2 M11 11l5-2 on a 22 × 18
/// box, fitted (as SVG's meet does) into whatever frame it gets.
private struct KWrenFootGlyph: Shape {
  static let box = CGSize(width: 22, height: 18)
  /// the SVG's stroke 2, at the 20 × 16 the design draws it (16/18 of its box)
  static let lineWidth: CGFloat = 2 * 16 / 18

  func path(in rect: CGRect) -> Path {
    let s = min(rect.width / Self.box.width, rect.height / Self.box.height)
    let ox = rect.minX + (rect.width - Self.box.width * s) / 2
    let oy = rect.minY + (rect.height - Self.box.height * s) / 2
    func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: ox + x * s, y: oy + y * s) }
    var p = Path()
    let strokes: [(CGFloat, CGFloat, CGFloat, CGFloat)] = [
      (11, 17, 11, 6),
      (11, 9, 4, 2),
      (11, 9, 18, 2),
      (11, 11, 6, 9),
      (11, 11, 16, 9),
    ]
    for (x0, y0, x1, y1) in strokes {
      p.move(to: pt(x0, y0))
      p.addLine(to: pt(x1, y1))
    }
    return p
  }
}
