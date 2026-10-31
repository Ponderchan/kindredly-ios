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
   That's 12. I counted twice.                         the lines, 20/1.3 in the reader's Letter
   You wrote back to 3.                                font (her words are content), 8 apart
   I'm back with the next ones at 8:00 AM.
   Go find one small thing worth putting in a letter — or come fly a lap with me.
   — W.  ⋔                                             the signature and her foot
            ╭──( OPENS AT 8:00 AM )──╮                 the bag: tomorrow's desk, three sealed
            │  ✉      ✉              │                 envelopes inside and no number (the
            │      ✉                 │                 design's 1→5 WAITING was invented; three
             ╰──────────────────────╯                  is only a picture of "some", owner 10-19)
   ──────────────────────────────────────────────
   WREN IS BACK IN                          8H 06M     the foot, the countdown in ind

 The material is the Me InkCard's (sf, a 2.5 ln outline, corners of 24, a hard 5/5 ln shadow),
 padded 0 18 12 inside the outline. The bag takes whatever height is left (margins 14 above, 56
 at the sides, 8 below), never less than the design's 120: it is the done state's main object, so
 the lines give way first. The whole letter is laid out at 20 (the design's), 18, then 16 with the
 bag's 120 kept, and only when even 16 leaves less than that (a small phone, large text) does the
 bag stand aside, the lines then taking the room back at 20, 18 or 16, and at the last truncating
 rather than spilling out of the card. A roomier Letter font (SF Mono wider, Garamond taller) gets
 one more, smaller step (KLetterFace.fitSize(16)) before anything is cut.

 The envelopes (design 25b): 52 × 36 white cards, a 2 outline, corners of 4, a V flap and an 11
 wax-gold dot, drawn in the brand ink on white whatever the theme (Midnight's pale ln would vanish
 on the white), resting at (14,26,−8°) (78,36,6°) (44,62,−3°) in the bag, the cluster moved
 sideways with the bag's width so it sits where the design's 205-wide bag put it. When the letter
 comes in through the timeline they drop in one by one (kdrop .6 s cubic-bezier(.3,1.1,.4,1)
 from 70 up and nothing, .35 s apart); at rest and under Reduce Motion they are simply there.

 Taps: the letter bounces (.6 s) and shows the chip (THAT'S ALL FOR TODAY, System: a sentence,
 not a label) under the card for 1.6 s; the bag jiggles (.45 s) and shows NOT YET · 8H 06M for 1.5 s, and its tap stays its own.
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
  /// the line sizes, tried in order until the letter fits (20 is the design's)
  static let lineSizes: [CGFloat] = [20, 18, 16]

  /// One layout ViewThatFits may choose: a line size, with or without the bag. Its own id, so the
  /// with-bag and the without-bag tries at the same size are two children, not one id twice
  /// (iOS 26.5's ViewThatFits traps on a repeated child id: two ForEach over lineSizes with
  /// `id: \.self` both said 20.0, and the app died as the card was first measured, even off
  /// screen inside a view snapshot, 2026-10-18).
  struct Try: Identifiable, Sendable {
    let size: CGFloat
    let bag: Bool
    var id: String { "\(bag ? "bag" : "nobag"):\(size)" }
  }

  /// the line sizes for a face: a roomy one (SF Mono, Garamond) gets one more, smaller step
  static func sizes(for face: KLetterFace) -> [CGFloat] {
    face.isRoomy ? lineSizes + [face.fitSize(lineSizes.last ?? 16)] : lineSizes
  }

  /// every size with the bag, then every size without it
  static func tries(for face: KLetterFace) -> [Try] {
    let ladder = sizes(for: face)
    return ladder.map { Try(size: $0, bag: true) } + ladder.map { Try(size: $0, bag: false) }
  }
  /// the bag's margins: above, either side, below
  static let bagTop: CGFloat = 14
  static let bagSide: CGFloat = 56
  static let bagBottom: CGFloat = 8
  /// the bag's least height (the design's min-height 120): the lines step down to keep it
  static let bagMin: CGFloat = 120

  /// the envelopes' resting spots in the design's bag (left, top, turn), and its width
  static let envelopes: [(x: CGFloat, y: CGFloat, angle: Double)] = [(14, 26, -8), (78, 36, 6), (44, 62, -3)]
  static let designBagWidth: CGFloat = 205
  /// the first drop (once the letter has risen) and the gap between drops
  static let dropFirst: Double = 0.35
  static let dropGap: Double = 0.35

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
  /// drop the bag's envelopes in one by one (the letter came in through the timeline)
  let animateIn: Bool
  /// the ⋯'s Bring back (shown while model.bringBack says so)
  let onBringBack: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// the reader's Letter font: her lines are set in it
  @Environment(\.kLetterFace) private var face
  @AccessibilityFocusState private var letterFocused: Bool
  @State private var bounce = 0
  @State private var jiggle = 0
  @State private var chipShown = false
  @State private var chipSerial = 0
  @State private var notYetShown = false
  @State private var notYetSerial = 0
  /// how many envelopes have dropped in (only read while they are dropping in)
  @State private var dropped = 0

  init(theme: KTheme, model: KWrenLetterModel, stampBird: KImageRef?, focusOnAppear: Bool = false, animateIn: Bool = false, onBringBack: @escaping () -> Void = {}) {
    self.theme = theme
    self.model = model
    self.stampBird = stampBird
    self.focusOnAppear = focusOnAppear
    self.animateIn = animateIn
    self.onBringBack = onBringBack
  }

  /// the envelopes in the bag now: all three at rest and under Reduce Motion
  private var envelopesIn: Int {
    animateIn && !reduceMotion ? dropped : Self.envelopes.count
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
          chip(model.chip, style: .system(13, .semibold), vertical: 8, horizontal: 14, radius: 14)
            .offset(y: 16)
            .transition(popTransition)
        }
      }
      .accessibilityElement(children: .contain)
      // a card of a fixed height, like the tab bar: the text stops growing at the largest
      // standard size (the lines then step down to fit)
      .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
      .onAppear {
        if animateIn && !reduceMotion {
          for i in Self.envelopes.indices {
            DispatchQueue.main.asyncAfter(deadline: .now() + Self.dropFirst + Self.dropGap * Double(i)) {
              dropped = max(dropped, i + 1)
            }
          }
        }
        guard focusOnAppear else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { letterFocused = true }
      }
  }

  // ── the card ──
  private var card: some View {
    // the first layout that fits: the bag's 120 kept at 20, 18, 16 (and a roomy face's smaller
    // step); then without the bag at the same sizes; then the smallest truncating. Each is
    // measured at its ideal height, the bag's room at its 120 (+ margins), so the one chosen
    // always leaves the bag at least that.
    ViewThatFits(in: .vertical) {
      ForEach(Self.tries(for: face)) { t in
        layout(size: t.size, fixed: true, bag: t.bag)
      }
      layout(size: Self.sizes(for: face).last ?? 16, fixed: false, bag: false)
    }
    // padding 0 18 12 inside the 2.5 outline (border-box)
    .padding(EdgeInsets(top: Self.border, leading: 18 + Self.border, bottom: 12 + Self.border, trailing: 18 + Self.border))
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .background {
      KStickerBackground(
        shape: RoundedRectangle(cornerRadius: Self.radius, style: .circular),
        fill: theme.sf,
        stroke: theme.isDark ? theme.line : theme.ln,
        lineWidth: Self.border,
        shadow: theme.isDark ? nil : theme.ln,
        shadowOffset: Self.shadow
      )
    }
  }

  /// one whole letter: the letter, the bag's room (or, without the bag, the space it leaves) and
  /// the foot at the bottom
  private func layout(size: CGFloat, fixed: Bool, bag: Bool) -> some View {
    VStack(spacing: 0) {
      letter(size: size, fixed: fixed)
        .layoutPriority(1)
      if bag {
        bagRoom
          .frame(minHeight: Self.bagTop + Self.bagMin + Self.bagBottom)
      } else {
        Spacer(minLength: 0)
      }
      foot
    }
  }

  // ── the letter: holes, header, lines; one tap target and one VoiceOver element ──
  private func letter(size: CGFloat, fixed: Bool) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      holes
      header
        .padding(.top, 12)
      lines(size: size, fixed: fixed)
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
      // the ⋯ a letter card has, with its one item: the day's last pass, brought back
      if !model.bringBack.isEmpty {
        Menu {
          SwiftUI.Button(action: onBringBack) {
            Label(model.bringBack, systemImage: "arrow.uturn.backward")
          }
        } label: {
          KLineIcon(.more, size: KLetterCard.moreGlyph, lineWidth: 3.2, color: theme.sub)
            .frame(width: KLetterCard.moreTarget, height: KLetterCard.moreTarget)
            .contentShape(Rectangle())
        }
        .menuIndicator(.hidden)
        .padding(.horizontal, -(KLetterCard.moreTarget - KLetterCard.moreGlyph) / 2)
        .accessibilityLabel(model.more)
      }
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
    let style = KTextStyle.content(size, lineHeight: 1.3)
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

  // ── the bag: tomorrow's desk, three sealed envelopes in it ──
  private var bagRoom: some View {
    GeometryReader { geo in
      let height = geo.size.height - Self.bagTop - Self.bagBottom
      let width = geo.size.width - 2 * Self.bagSide
      // the layout that carries the bag keeps it at bagMin or more (see card)
      if height > 0 && width > 0 {
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
      // the envelopes, inside the outline (CSS's absolute children of a 2.5 border) and clipped
      // by the bag (overflow hidden)
      ZStack(alignment: .topLeading) {
        let shift = max(0, (w - Self.designBagWidth) / 2)
        ForEach(Self.envelopes.indices, id: \.self) { i in
          let e = Self.envelopes[i]
          KWrenEnvelope(shown: i < envelopesIn, angle: e.angle)
            .position(
              x: Self.border + shift + e.x + KWrenEnvelope.size.width / 2,
              y: Self.border + e.y + KWrenEnvelope.size.height / 2
            )
        }
      }
      .frame(width: w, height: h)
      .clipShape(shape)
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
          KStickerBackground(shape: Capsule(style: .circular), fill: theme.sf, stroke: theme.isDark ? theme.line : theme.ln, lineWidth: 2.5)
        }
        .offset(y: -15)
    }
    .overlay(alignment: .bottom) {
      if notYetShown {
        chip(model.notYet, style: .system(12, .semibold), vertical: 7, horizontal: 11, radius: 12)
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

/// One sealed envelope in the bag (design 25b): a 52 × 36 white card, a 2 outline, corners of 4,
/// the V of its flap and an 11 wax-gold dot with a 1.5 outline, in the brand ink on white in every
/// theme. It drops in (kdrop) when `shown` turns true: from 70 up and nothing, on .6 s of
/// cubic-bezier(.3,1.1,.4,1), fully there by 55%.
private struct KWrenEnvelope: View {
  static let size = CGSize(width: 52, height: 36)
  static let drop = Animation.timingCurve(0.3, 1.1, 0.4, 1, duration: 0.6)
  static let fade = Animation.linear(duration: 0.33)

  let shown: Bool
  let angle: Double

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: 4, style: .circular)
    ZStack(alignment: .topLeading) {
      shape.fill(KBrand.paperWhite)
      KWrenEnvelopeFlap()
        .stroke(KBrand.inkOnBrand, style: StrokeStyle(lineWidth: 2, lineJoin: .round))
      Circle()
        .fill(KBrand.waxGold)
        .overlay(Circle().strokeBorder(KBrand.inkOnBrand, lineWidth: 1.5))
        .frame(width: 11, height: 11)
        // left 50%, top 8 inside the 2 outline
        .position(x: Self.size.width / 2, y: 2 + 8 + 5.5)
      shape.strokeBorder(KBrand.inkOnBrand, lineWidth: 2)
    }
    .frame(width: Self.size.width, height: Self.size.height)
    .rotationEffect(.degrees(angle))
    .offset(y: shown ? 0 : -70)
    .animation(Self.drop, value: shown)
    .opacity(shown ? 1 : 0)
    .animation(Self.fade, value: shown)
  }
}

/// The envelope's flap: the design's M1 1l28 18L57 1 on a 58 × 38 box, met into the 48 × 32
/// inside the 2 outline (so at 2 × 0.83 from the card's corner), in the card's own points.
private struct KWrenEnvelopeFlap: Shape {
  func path(in rect: CGRect) -> Path {
    let s = min(48 / 58.0, 32 / 38.0)
    let ox = rect.minX + 2
    let oy = rect.minY + 2 + (32 - 38 * s) / 2
    func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: ox + x * s, y: oy + y * s) }
    var p = Path()
    p.move(to: pt(1, 1))
    p.addLine(to: pt(29, 19))
    p.addLine(to: pt(57, 1))
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
