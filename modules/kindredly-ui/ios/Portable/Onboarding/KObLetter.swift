// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 7 · THE FIRST LETTER — the sheet is the screen (screens/S07Letter, s07-flap).

 You are inside your envelope: the ground is the letter's paper, with a slim strip of Post Blue
 and the open flap at the very top, and the egg sitting on the flap's point, listening (it twitches
 on every keystroke and warms the more there is on the page; the four pips joined into one gold
 ring as 6 handed over). Top to bottom: the egg's voice, the clock line, the headline and its
 line (left-aligned like a page), the cue chip (a tap deals another), the ruled page in the
 reader's Letter font (italic), and above the keyboard the meter to the 20-character mark, the
 house rule and "Stamp it". TS decides the meter, the rule and the key (weighted-count and
 lib/wren screenNow); the words typed stay in the field (uncontrolled) and each edit goes to TS.

 THE EGG IS THE NEST EGG: on the way in it comes down out of the nest slot onto the flap's point
 as the page rises a little under the flap; "Stamp it" folds the page up and closes the blue flap
 down over it while the egg goes back up into the slot, so 8 opens on all blue. Reduce Motion: no
 fold, no rise, no travel. COMPACT (a short room with the keyboard up): no voice, no line, no cue
 chip; the meter shares the key's row; the house rule only shows when it bites.

 Rule B: the cue chip and the ↻ are flat; the flap's edge has no ink line.
 */
struct KObLetterScreen: View {
  static let flapEgg: CGFloat = 46
  static let pitch: CGFloat = 28
  static let point: CGFloat = 18
  static let meterW: CGFloat = 132

  let ctx: KObCtx

  @Environment(\.dynamicTypeSize) private var typeSize
  @State private var rise: Double
  @State private var fold: Double = 0
  @State private var close: Double = 0
  @State private var leaving = false
  @State private var pageH: CGFloat = 0

  init(ctx: KObCtx) {
    self.ctx = ctx
    _rise = State(initialValue: ctx.reduceMotion ? 0 : 1)
  }

  private var letter: KObLetter { ctx.content.letter }
  private var fontScale: CGFloat {
    switch typeSize {
    case .xSmall: return 0.82
    case .small: return 0.88
    case .medium: return 0.94
    case .large: return 1
    case .xLarge: return 1.12
    case .xxLarge: return 1.24
    default: return 1.35
    }
  }

  var body: some View {
    let W = ctx.size.width
    let H = ctx.size.height
    let flapH = ctx.top + 58
    let room = H - ctx.keyboard - ctx.top
    let compact = ctx.keyboardUp && room < 440 * fontScale
    ZStack(alignment: .topLeading) {
      VStack(spacing: 0) {
        page(compact: compact)
          .padding(.top, flapH + Self.point + 6)
          .padding(.horizontal, KOb.gutter)
          .opacity(1 - fold * 0.9)
          .scaleEffect(x: 1, y: 1 - 0.66 * fold, anchor: .top)
          .offset(y: 22 * rise - 60 * fold)
        bar(compact: compact)
      }
      .padding(.bottom, ctx.keyboard)

      // the flap panel is taller than the window; as an overlay it doesn't make the stack taller
      // (a ZStack places its children in its own bounds, so the page would have been laid out
      // past the bottom)
      Color.clear
        .frame(width: W, height: H)
        .overlay(alignment: .topLeading) { flap(W: W, H: H, flapH: flapH) }
        .allowsHitTesting(false)

      flapEgg(W: W, flapH: flapH)

      if ctx.content.hasBack && !leaving {
        KObBackKey(label: ctx.w("back"), color: KOb.white) { ctx.send("back") }
          .padding(.leading, 6)
          .offset(y: ctx.top)
      }
    }
    .frame(width: W, height: H, alignment: .topLeading)
    .onAppear {
      if !ctx.reduceMotion {
        withAnimation(.timingCurve(0.33, 1, 0.68, 1, duration: 0.36)) { rise = 0 }
      }
      ctx.driver.letter.focus()
    }
  }

  // MARK: the page

  @ViewBuilder
  private func page(compact: Bool) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      if !compact {
        Text(ctx.w("voice"))
          .kText(.obVoice)
          .foregroundStyle(KOb.inkSoft)
          .lineLimit(1)
          .frame(maxWidth: .infinity)
          .padding(.bottom, 12)
      }
      Text(ctx.w("clock"))
        .kText(.system(13.5, .semibold))
        .foregroundStyle(KOb.inkSoft)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
      Text(ctx.w("head"))
        .kText(.obHeadline)
        .foregroundStyle(KOb.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.75)
        .padding(.top, 4)
        .accessibilityAddTraits(.isHeader)
        .obFocusOnAppear()
      if !compact {
        Text(ctx.w("line"))
          .kText(.obLineSmall)
          .foregroundStyle(KOb.inkSoft)
          .lineLimit(2)
          .padding(.top, 4)
        cueChip.padding(.top, 14)
      }
      ruledPage
        .padding(.top, 12)
    }
    .frame(maxHeight: .infinity, alignment: .top)
  }

  private var cueChip: some View {
    Button { ctx.send("cue") } label: {
      HStack(spacing: 0) {
        KLineIcon(.idea, size: 18, lineWidth: 2.2, color: Color(hex: "#7A5A12"))
        Text(ctx.w("cue"))
          .kText(.content(14.5, italic: true, lineHeight: 19 / 14.5))
          .foregroundStyle(KOb.ink)
          .lineLimit(3)
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.leading, 9)
          .padding(.trailing, 6)
        KObDeal(turn: letter.cueTurn)
      }
      .padding(.leading, 14)
      .padding(.trailing, 5)
      .padding(.vertical, 7)
      .frame(minHeight: 40)
      .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Color(hex: "#FFF3D6")))
      .contentShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
    .buttonStyle(KObPressStyle(pressedOpacity: 0.75))
    .accessibilityLabel("\(ctx.w("stuck")) \(ctx.w("cue"))")
    .accessibilityHint(ctx.w("stuckA11y"))
  }

  private var ruledPage: some View {
    let rules = max(3, Int(floor((pageH - 4) / Self.pitch)))
    return ZStack(alignment: .topLeading) {
      ForEach(0..<rules, id: \.self) { i in
        Rectangle()
          .fill(Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.12))
          .frame(height: 1)
          .offset(y: Self.pitch - 1 + CGFloat(i) * Self.pitch)
          .allowsHitTesting(false)
      }
      KField(
        controller: ctx.driver.letter,
        placeholder: ctx.w("ph"),
        style: .content(19.5, italic: true, lineHeight: Self.pitch / 19.5),
        axis: .vertical,
        lines: nil,
        returnSends: false,
        maxLength: 2000,
        tint: KOb.blue,
        textColor: KOb.ink,
        placeholderColor: Color(.sRGB, red: 74 / 255, green: 70 / 255, blue: 100 / 255, opacity: 0.6),
        accessibilityLabel: ctx.w("head"),
        onChange: { text in ctx.send("letter", text) }
      )
      .padding(.top, 2)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
    .frame(minHeight: Self.pitch * 3)
    .frame(maxHeight: .infinity, alignment: .top)
    .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { pageH = $0 }
    .clipped()
  }

  // MARK: the bar above the keyboard

  private func bar(compact: Bool) -> some View {
    let barCap: DynamicTypeSize = compact ? .xLarge : .xxxLarge
    return VStack(alignment: .leading, spacing: 0) {
      if compact {
        if !letter.clean {
          Text(ctx.w("ruleHit"))
            .kText(.system(12.5, .semibold, lineHeight: 17 / 12.5))
            .foregroundStyle(KOb.stop)
            .padding(.bottom, 8)
        }
        HStack(spacing: 12) {
          meter(width: min(Self.meterW, ctx.size.width - 2 * KOb.gutter - 156 - 12))
            .frame(maxWidth: .infinity, alignment: .leading)
          stampKey
        }
      } else {
        meter(width: Self.meterW)
        HStack(spacing: 14) {
          Text(letter.clean ? ctx.w("rule") : ctx.w("ruleHit"))
            .kText(.system(12.5, letter.clean ? .regular : .semibold, lineHeight: 17 / 12.5))
            .foregroundStyle(letter.clean ? KOb.inkSoft : KOb.stop)
            .frame(maxWidth: .infinity, alignment: .leading)
          stampKey
        }
        .padding(.top, 8)
      }
    }
    .dynamicTypeSize(...barCap)
    .padding(.horizontal, KOb.gutter)
    .padding(.top, 8)
    .padding(.bottom, ctx.keyboardUp ? 10 : max(ctx.bottom, 14))
    .background(KOb.sheet)
  }

  private var stampKey: some View {
    KObAcidKey(label: ctx.w("key"), disabled: !letter.ready, action: stampIt)
      .frame(width: 156)
  }

  private func meter(width: CGFloat) -> some View {
    let words = letter.left > 0 ? ctx.w("left") : ctx.w("ready")
    let go = letter.left == 0
    return HStack(spacing: 10) {
      // the bar gives way to the words on a narrow phone (an SE stacked "20 more to travel" one
      // letter to a line, 2026-10-27): up to `width`, as little as 28
      GeometryReader { g in
        ZStack(alignment: .leading) {
          Capsule().fill(Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.14))
          Capsule().fill(go ? KOb.go : KOb.ink).frame(width: max(0, g.size.width * CGFloat(letter.fill)))
        }
        .frame(height: 4)
        .frame(maxHeight: .infinity, alignment: .center)
      }
      .frame(minWidth: 28, maxWidth: max(28, width))
      .frame(height: 4)
      Text(words)
        .kText(.mono(11.5, .semibold, tracking: 0.4 / 11.5))
        .foregroundStyle(go ? KOb.go : KOb.inkSoft)
        // one line; it shrinks a little rather than push the key past the gutter
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .layoutPriority(1)
    }
    .animation(.easeOut(duration: 0.2), value: letter.fill)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(words)
  }

  // MARK: the flap and the egg on it

  private func flap(W: CGFloat, H: CGFloat, flapH: CGFloat) -> some View {
    let panelH = H + Self.point + 60
    let edge = panelH - Self.point - 20
    let y = flapH - edge + CGFloat(close) * (H + Self.point + 12 - flapH)
    return Path { p in
      p.move(to: .zero)
      p.addLine(to: CGPoint(x: W, y: 0))
      p.addLine(to: CGPoint(x: W, y: edge))
      p.addLine(to: CGPoint(x: W / 2, y: edge + Self.point))
      p.addLine(to: CGPoint(x: 0, y: edge))
      p.closeSubpath()
    }
    .fill(KOb.blue)
    .frame(width: W, height: panelH)
    .offset(y: y)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }

  private func flapEgg(W: CGFloat, flapH: CGFloat) -> some View {
    let size = Self.flapEgg
    let toNest = ctx.top + KOb.topBarH + KOb.nestEgg / 2 - (flapH + Self.point - size / 2 - 2)
    let k = CGFloat(max(close, rise))
    return KObFlapEgg(shell: ctx.content.shell, len: letter.len, size: size, ring: 1 - Double(k))
      .scaleEffect(1 + k * (KOb.nestEgg / size - 1))
      .offset(x: W / 2 - size / 2, y: flapH + Self.point - size - 2 + k * toNest)
      .allowsHitTesting(false)
  }

  private func stampIt() {
    guard letter.ready, !leaving else { return }
    leaving = true
    ctx.driver.letter.blur()
    if ctx.reduceMotion {
      ctx.send("advance")
      return
    }
    withAnimation(.easeIn(duration: 0.3)) { fold = 1 }
    withAnimation(.timingCurve(0.65, 0, 0.35, 1, duration: 0.3).delay(0.12)) { close = 1 } completion: {
      ctx.send("advance")
    }
  }
}

/// ↻ in a white disc, half a turn each time a cue is dealt (still under Reduce Motion). Flat.
struct KObDeal: View {
  let turn: Int
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  static let arrow = KSVGPath.path("M20 12a8 8 0 1 1-2.6-5.9 M20 4v5h-5")

  var body: some View {
    Canvas { gc, canvas in
      var g = gc
      g.translateBy(x: (canvas.width - 14) / 2, y: (canvas.height - 14) / 2)
      g.scaleBy(x: 14 / 24, y: 14 / 24)
      g.stroke(Self.arrow, with: .color(KOb.ink), style: StrokeStyle(lineWidth: 2.6, lineCap: .round, lineJoin: .round))
    }
    .frame(width: 28, height: 28)
    .background(Circle().fill(KOb.paper))
    .rotationEffect(.degrees(Double(turn) * 180))
    .animation(reduceMotion ? nil : .timingCurve(0.33, 1, 0.68, 1, duration: 0.38), value: turn)
    .accessibilityHidden(true)
  }
}

/// The egg on the flap (s07-flap FlapEgg): it twitches on every keystroke, alternating sides, and
/// swells and warms the more there is on the page; the gold ring round it gives way while it travels.
struct KObFlapEgg: View {
  let shell: Int
  let len: Int
  let size: CGFloat
  let ring: Double
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    let warm = Double(min(len, 80)) / 80
    let glow = size * (1.9 + CGFloat(warm) * 0.5)
    ZStack {
      KObWarmth(size: glow, heat: 0.55 + warm * 0.45)
      Circle()
        .strokeBorder(KOb.gold, lineWidth: 2.5)
        .frame(width: size * 1.24, height: size * 1.24)
        .opacity(ring)
      KObEgg(shell: shell, size: size)
        .keyframeAnimator(initialValue: 0.0, trigger: len) { egg, v in
          egg.rotationEffect(.degrees(v * 2.4))
        } keyframes: { _ in
          LinearKeyframe(reduceMotion || len == 0 ? 0 : (len % 2 == 1 ? 1.0 : -1.0), duration: 0.05)
          LinearKeyframe(0.0, duration: 0.18)
        }
    }
    .frame(width: size, height: size)
    .scaleEffect(1 + CGFloat(warm) * 0.06)
    .accessibilityHidden(true)
  }
}
