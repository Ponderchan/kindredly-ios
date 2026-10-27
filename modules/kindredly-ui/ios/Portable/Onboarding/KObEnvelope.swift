// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 6 · YOU, TO A STRANGER (screens/S06Envelope) and YOUR ENVELOPE FRONT (s08-envelope, for 8).

 Screen 6 is the Today card's docket at 1.25×, assembled from your answers one beat at a time
 (about 1.2 s; a tap on the card finishes it): your frost window frosts in over the face you
 picked, your courier name types itself in label-maker style (the whole name laid out from the
 first frame, only inked letter by letter, so its size never changes), ♀ or ♂ pops after it, then
 your sign, then the date and the dashed stamp corner. Under it the caption, the two switches
 (they show and hide the glyphs on the card) and the reveal strip on a loop. No session yet: the
 window waits, pulsing, and the name's place says the courier is thinking of a name.

 "Looks right": a gold ring of warmth opens behind the egg, the card turns over, and the letter's
 paper grows out of it until the sheet is the screen (7's ground). Reduce Motion: assembled at
 once, the strip at rest on its cleared frame, the key goes straight on.

 Rule B: the envelope card, the switch card and the strip's card are objects (no ink edge, the
 deep purple depth on the blue); the switches are flat.
 */

struct KObEnvelopeScreen: View {
  static let k: CGFloat = 1.25
  static let frostIn = 420.0
  static let nameFrom = 360.0
  static let nameChar = 42.0

  let ctx: KObCtx

  @State private var asmStart: Date?
  @State private var finished: Bool
  @State private var cardFrame: CGRect = .zero
  @State private var out: Double = 0
  @State private var leaving = false

  init(ctx: KObCtx) {
    self.ctx = ctx
    _finished = State(initialValue: ctx.reduceMotion)
  }

  private var env: KObEnvelope { ctx.content.env }
  private var showMark: Bool { env.mark != nil && env.showMark }
  private var showSign: Bool { env.sign != nil && env.showSign }

  var body: some View {
    let nest = KOb.nestEggRect(width: ctx.size.width, topInset: ctx.top)
    let r = min(1, out / 0.3)
    ZStack(alignment: .topLeading) {
      // the ring of warmth opening behind the egg as you go on (the root draws the egg over it)
      Circle()
        .strokeBorder(KOb.gold, lineWidth: 3)
        .frame(width: KOb.nestEgg * 1.24, height: KOb.nestEgg * 1.24)
        .scaleEffect(0.7 + 0.3 * r)
        .opacity(r)
        .position(x: nest.midX, y: nest.midY)
        .allowsHitTesting(false)

      KObFrame(topInset: ctx.top, bottomInset: ctx.bottom, backLabel: ctx.w("back"), onBack: ctx.content.hasBack ? { ctx.send("back") } : nil, nest: true) {
        ScrollView {
          VStack(spacing: 0) {
            Text(ctx.w("head"))
              .kText(.obHeadline)
              .foregroundStyle(KOb.white)
              .lineLimit(1)
              .minimumScaleFactor(0.72)
              .frame(maxWidth: .infinity)
              .accessibilityAddTraits(.isHeader)
              .obFocusOnAppear()
              .padding(.top, 4)

            TimelineView(.animation(paused: finished || asmStart == nil)) { tl in
              envelopeCard(asm: asm(tl.date))
            }
            .padding(.top, 12)
            .padding(.horizontal, 4)
            .padding(.trailing, 4)
            .onGeometryChange(for: CGRect.self) { $0.frame(in: .named(KObSpace.root)) } action: { cardFrame = $0 }
            .rotation3DEffect(.degrees(90 * r * r), axis: (x: 0, y: 1, z: 0), perspective: 0.5)
            .contentShape(Rectangle())
            .onTapGesture { finishNow() }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(ctx.w("cardA11y"))
            .accessibilityAddTraits(.isImage)

            Text(ctx.w("caption"))
              .kText(.system(13, .regular, lineHeight: 17.5 / 13))
              .foregroundStyle(KOb.white)
              .multilineTextAlignment(.center)
              .padding(.top, 9)

            if env.mark != nil || env.sign != nil {
              switches.padding(.top, 10)
            }

            KObPaperCard {
              KObRevealStrip(ctx: ctx)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
            }
            .padding(.top, 10)
          }
          .padding(.bottom, 8)
        }
        .obMoreBelow()
        .scrollBounceBehavior(.basedOnSize)
      } primary: {
        KObAcidKey(label: ctx.w("key"), disabled: !ctx.content.canAdvance, action: looksRight)
      } secondary: {
        EmptyView()
      }

      // the letter's paper, growing out of the card until it is the screen (7's ground)
      if out > 0 {
        KObSheetGrow(from: cardFrame, to: CGSize(width: ctx.size.width, height: ctx.size.height), out: out)
      }
    }
    .onChange(of: env.hasUid, initial: true) { _, has in
      if has && asmStart == nil && !finished { asmStart = Date() }
    }
  }

  private func asm(_ now: Date) -> Double {
    if finished { return 1e6 }
    guard let asmStart else { return 0 }
    return now.timeIntervalSince(asmStart) * 1000
  }

  private func finishNow() {
    guard env.hasUid else { return }
    finished = true
  }

  private func looksRight() {
    guard ctx.content.canAdvance, !leaving else { return }
    leaving = true
    finishNow()
    if ctx.reduceMotion {
      ctx.send("advance")
      return
    }
    ctx.haptic("pip")
    withAnimation(.linear(duration: 0.56)) { out = 1 } completion: {
      ctx.send("advance")
    }
  }

  private func envelopeCard(asm a: Double) -> some View {
    let k = Self.k
    let name = env.name
    let nameEnd = Self.nameFrom + Double(max(1, name.count)) * Self.nameChar
    let typed = max(0, Int(floor((a - Self.nameFrom) / Self.nameChar)))
    let beat = a >= nameEnd + 300 ? 3 : a >= nameEnd + 160 ? 2 : a >= nameEnd + 40 ? 1 : 0
    let dateOpacity = min(1, max(0, (a - nameEnd - 300) / 200))
    let shape = RoundedRectangle(cornerRadius: 20, style: .continuous)
    let h: CGFloat = 2 * 9 + 2 * 12 + 48 * k + 8 + 22 + 6
    return KObAirmailPaper(radius: 20) {
      KObDocket(k: k) {
        faceSlot(size: 40 * k, frost: min(1, a / Self.frostIn))
      } name: {
        if env.hasUid {
          fittedName(name, typed: typed, beat: beat)
        } else {
          Text(ctx.w("thinking"))
            .kText(.content(16, italic: true, lineHeight: 21 / 16))
            .foregroundStyle(KOb.inkSoft)
        }
      } date: {
        KObDocketDate(text: env.date, k: k).opacity(dateOpacity)
      } stamp: {
        KStampSlot(width: 40 * k, stroke: Color(hex: "#B3B0C9")).opacity(dateOpacity)
      }
      Text(ctx.w("to"))
        .kText(.content(16, italic: true))
        .foregroundStyle(KOb.ink)
        .lineLimit(1)
        .frame(height: 22)
        .padding(.top, 8)
    }
    .frame(height: h)
    // a picture of the card at 1.25×, so its type stays the size it was drawn at, as 8's envelope
    // does: under Larger Text the name grew past its room
    .environment(\.dynamicTypeSize, .large)
    .clipShape(shape)
    .obDepth(shape, onBlue: true)
    .rotationEffect(.degrees(-2))
  }

  /// the courier name on one line: the whole name laid out, inked letter by letter; the glyphs'
  /// room kept from the start so nothing moves when they pop in
  private func fittedName(_ name: String, typed: Int, beat: Int) -> some View {
    let k = Self.k
    let size = 17 * k
    let g = (size * 0.8).rounded()
    let n = min(typed, name.count)
    let inked = String(name.prefix(n))
    let rest = String(name.dropFirst(n))
    let room: CGFloat = (showMark || showSign ? 6 * k : 0) + (showMark ? g : 0) + (showSign ? g : 0) + (showMark && showSign ? 4 * k : 0)
    return HStack(spacing: 0) {
      (Text(inked).foregroundStyle(KOb.ink) + Text(rest).foregroundStyle(Color.clear))
        .kText(.system(size, .semibold, tracking: -0.2 / size))
        .lineLimit(1)
        // down to half, as the React Native card goes: an SE leaves the name about 96pt, and
        // "Summery Modem" needs 122 at 70% and 97 at 55% (it ended "Summery M…", 2026-10-27);
        // a 402pt phone fits it at 70%
        .minimumScaleFactor(0.5)
        .layoutPriority(1)
      HStack(spacing: 4 * k) {
        if showMark, let mark = env.mark, beat >= 1 {
          KLineIcon(mark, size: g, lineWidth: 2, color: KOb.inkSoft)
            .transition(.scale(scale: 0.01).animation(ctx.reduceMotion ? nil : .timingCurve(0.34, 2.2, 0.64, 1, duration: 0.26)))
        }
        if showSign, let sign = env.sign, beat >= 2 {
          KLineIcon(sign, size: g, lineWidth: 2, color: KOb.inkSoft)
            .transition(.scale(scale: 0.01).animation(ctx.reduceMotion ? nil : .timingCurve(0.34, 2.2, 0.64, 1, duration: 0.26)))
        }
      }
      .padding(.leading, showMark || showSign ? 6 * k : 0)
      .frame(width: room, height: g, alignment: .leading)
    }
  }

  /// your face as it frosts over (the face picked on 5 underneath; a pulsing blank while the
  /// session is on its way)
  private func faceSlot(size: CGFloat, frost: Double) -> some View {
    ZStack {
      KOb.lavenderSoft
      if env.hasFace {
        KImage(env.face, size: CGSize(width: size, height: size), contentMode: .fill, placeholder: KOb.lavenderSoft)
      }
      if !env.hasUid {
        KObPulse()
      } else if let spec = env.frost {
        KFrost(theme: .classic, spec: spec, size: size).opacity(frost)
      }
    }
    .frame(width: size, height: size)
    .clipShape(RoundedRectangle(cornerRadius: size * 0.25, style: .continuous))
  }

  private var switches: some View {
    KObPaperCard {
      VStack(spacing: 0) {
        if let mark = env.mark {
          switchRow(glyph: mark, on: env.showMark, a11y: ctx.w("markA11y")) { ctx.send("mark") }
        }
        if env.mark != nil && env.sign != nil {
          Rectangle().fill(Color(hex: "#ECEAF4")).frame(height: 1.5).padding(.horizontal, 14)
        }
        if let sign = env.sign {
          switchRow(glyph: sign, on: env.showSign, a11y: ctx.w("signA11y")) { ctx.send("sign") }
        }
      }
    }
  }

  private func switchRow(glyph: KLineGlyph, on: Bool, a11y: String, toggle: @escaping () -> Void) -> some View {
    Button {
      ctx.haptic("tick")
      toggle()
    } label: {
      HStack(spacing: 0) {
        if !ctx.w("sw.before").isEmpty {
          Text(ctx.w("sw.before")).kText(.system(15, .semibold)).foregroundStyle(KOb.ink).padding(.trailing, 4)
        }
        KLineIcon(glyph, size: 16, lineWidth: 2, color: KOb.ink).padding(.trailing, 7)
        Text(ctx.w("sw.after")).kText(.system(15, .semibold)).foregroundStyle(KOb.ink).lineLimit(2)
        Spacer(minLength: 8)
        KObToggle(on: on)
      }
      .padding(.horizontal, 14)
      .frame(minHeight: 41)
      .contentShape(Rectangle())
    }
    .buttonStyle(KObPressStyle(pressedOpacity: 0.8))
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(a11y)
    .accessibilityValue(on ? "1" : "0")
    .accessibilityAddTraits(.isToggle)
  }
}

/// A paper card on the blue: white, rule B's depth, no ink edge (16 corners).
struct KObPaperCard<Content: View>: View {
  var radius: CGFloat = 16
  @ViewBuilder let content: Content

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
    content
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(shape.fill(KOb.paper))
      .obDepth(shape, onBlue: true)
  }
}

/// A blank window breathing while the session is on its way.
struct KObPulse: View {
  @State private var on = false
  var body: some View {
    KOb.lavenderWait
      .opacity(on ? 0.85 : 0.45)
      .onAppear {
        withAnimation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true)) { on = true }
      }
  }
}

/// The sheet of paper growing from the card to the whole window (eased in and out).
struct KObSheetGrow: View, Animatable {
  let from: CGRect
  let to: CGSize
  var out: Double

  var animatableData: Double {
    get { out }
    set { out = newValue }
  }

  var body: some View {
    let g = KObEase.clamp01((out - 0.25) / 0.75)
    let e = CGFloat(KObEase.eio(g))
    let w = from.width + (to.width - from.width) * e
    let h = from.height + (to.height - from.height) * e
    RoundedRectangle(cornerRadius: 20 * (1 - e), style: .continuous)
      .fill(KOb.sheet)
      .frame(width: w, height: h)
      .offset(x: from.minX * (1 - e), y: from.minY * (1 - e))
      .opacity(g > 0 ? 1 : 0)
      .allowsHitTesting(false)
  }
}

/*
 THE REVEAL STRIP (S06Envelope RevealStrip): AFTER FIVE LETTERS EACH, the frost wipes clear into
 your face and the square turns round; beside it an empty signature line with a small × and a pen
 hovering over it, nothing written (your pen name is signed there later, at the first trade).
 */
struct KObRevealStrip: View {
  static let wipeFrom = 0.9
  static let wipeTo = 1.3
  static let roundTo = 1.6
  static let backFrom = 3.2
  static let loop = 3.6
  static let sq: CGFloat = 40

  let ctx: KObCtx
  @State private var start = Date()

  var body: some View {
    TimelineView(.animation(paused: ctx.reduceMotion)) { tl in
      let c = ctx.reduceMotion ? Self.roundTo : tl.date.timeIntervalSince(start).truncatingRemainder(dividingBy: Self.loop)
      VStack(alignment: .leading, spacing: 0) {
        Text(ctx.w("stripLabel"))
          .kText(.mono(9.5, .semibold, tracking: 0.18))
          .foregroundStyle(KOb.ink)
        HStack(spacing: 0) {
          window(c)
          VStack(alignment: .leading, spacing: 0) {
            Text(ctx.w("stripSign"))
              .kText(.mono(9, .semibold, tracking: 0.18))
              .foregroundStyle(KOb.inkSoft)
            signature(c)
          }
          .padding(.leading, 16)
        }
        .padding(.top, 8)
        Text(ctx.w("stripLine"))
          .kText(.obSmall)
          .foregroundStyle(KOb.inkSoft)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.top, 8)
      }
    }
  }

  private func window(_ c: Double) -> some View {
    let env = ctx.content.env
    let sq = Self.sq
    let s = KObEase.clamp01((c - Self.wipeTo) / (Self.roundTo - Self.wipeTo))
    let back = KObEase.clamp01((c - Self.backFrom) / (Self.loop - Self.backFrom))
    let open = KObEase.clamp01((c - Self.wipeFrom) / (Self.wipeTo - Self.wipeFrom))
    let clipW = sq * CGFloat(1 - open) + sq * CGFloat(back) * (open >= 1 ? 1 : 0)
    return ZStack(alignment: .topTrailing) {
      KOb.lavenderSoft
      if env.hasFace {
        KImage(env.face, size: CGSize(width: sq, height: sq), contentMode: .fill, placeholder: KOb.lavenderSoft)
      } else {
        KObPersonGlyph().frame(width: sq * 0.62, height: sq * 0.62).frame(width: sq, height: sq)
      }
      Group {
        if let spec = env.frost {
          KFrost(theme: .classic, spec: spec, size: sq)
        } else {
          KOb.lavenderWait
        }
      }
      .frame(width: clipW, height: sq, alignment: .trailing)
      .clipped()
    }
    .frame(width: sq, height: sq)
    .clipShape(RoundedRectangle(cornerRadius: sq * 0.25 + sq * 0.25 * CGFloat(s * (1 - back)), style: .continuous))
  }

  private func signature(_ c: Double) -> some View {
    let k = c / Self.loop * .pi * 2
    let still = ctx.reduceMotion
    return HStack(alignment: .bottom, spacing: 0) {
      Text(verbatim: "×")
        .kText(.mono(13, .medium))
        .foregroundStyle(KOb.ink)
        .padding(.trailing, 6)
        .padding(.bottom, 1)
      Rectangle()
        .fill(Color.clear)
        .frame(height: 2)
        .overlay {
          GeometryReader { g in
            Path { p in
              p.move(to: CGPoint(x: 0, y: 1))
              p.addLine(to: CGPoint(x: g.size.width, y: 1))
            }
            .stroke(KOb.ink, style: StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
          }
        }
        .padding(.bottom, 4)
    }
    .frame(height: 30)
    .overlay(alignment: .bottomTrailing) {
      KObPen()
        .frame(width: 22, height: 22)
        .rotationEffect(.degrees(still ? 0 : 4 * sin(k * 2)))
        .offset(x: still ? 0 : 6 * sin(k), y: still ? 0 : -3 + 3 * sin(k * 2))
        .padding(.trailing, 6)
        .padding(.bottom, 6)
    }
    .padding(.top, 4)
  }
}

/// "Later" on 5: a plain head and shoulders.
struct KObPersonGlyph: View {
  static let shoulders = KSVGPath.path("M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6")
  var body: some View {
    Canvas { gc, canvas in
      var g = gc
      g.scaleBy(x: canvas.width / 24, y: canvas.width / 24)
      g.stroke(Path(ellipseIn: CGRect(x: 8, y: 4.5, width: 8, height: 8)), with: .color(KOb.ink), lineWidth: 1.8)
      g.stroke(Self.shoulders, with: .color(KOb.ink), style: StrokeStyle(lineWidth: 1.8, lineCap: .round))
    }
    .accessibilityHidden(true)
  }
}

/// The pen hovering over the signature line.
struct KObPen: View {
  static let pen = KSVGPath.path("M4 20l1.2-4.4L15.6 5.2a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.4 18.8z M14 6.8l3.2 3.2")
  var body: some View {
    Canvas { gc, canvas in
      var g = gc
      g.scaleBy(x: canvas.width / 24, y: canvas.width / 24)
      g.stroke(Self.pen, with: .color(KOb.ink), style: StrokeStyle(lineWidth: 1.8, lineCap: .round, lineJoin: .round))
    }
    .accessibilityHidden(true)
  }
}

/*
 YOUR ENVELOPE FRONT (s08-envelope EnvelopeFront): drawn at one design size (340 × 214) and
 scaled to `width`, so the corner the stamp flies to is the same drawing at any size. White paper
 inside an airmail band, your frost window, your courier name with ♀/♂ and the sign, the date,
 "to: someone who writes like you", and the stamp corner: empty (dashed), glowing (8, waiting for
 your first stamp), or filled with your stamp at its small tilt. Rule B: no ink edge, the depth.
 */
struct KObEnvelopeFront: View {
  static let w: CGFloat = 340
  static let h: CGFloat = 214
  static let corner = CGRect(x: 340 - 22 - 60, y: 22, width: 60, height: 72)
  static let settle = 2.0

  enum Corner { case empty, glow, filled }

  let ctx: KObCtx
  let stamp: String
  let corner: Corner
  var width: CGFloat = 340
  /// where the corner is, in the run's window (8 flies its stamp there)
  var onCorner: ((CGRect) -> Void)? = nil

  var body: some View {
    let s = width / Self.w
    let env = ctx.content.env
    let shape = RoundedRectangle(cornerRadius: 12, style: .continuous)
    ZStack(alignment: .topLeading) {
      KObAirmail(period: 28, bar: 8, red: Color(hex: "#E2453C"))
      RoundedRectangle(cornerRadius: 5, style: .continuous)
        .fill(KOb.paper)
        .padding(13)

      cornerView
        .frame(width: Self.corner.width, height: Self.corner.height)
        .onGeometryChange(for: CGRect.self) { $0.frame(in: .named(KObSpace.root)) } action: { onCorner?($0) }
        .offset(x: Self.corner.minX, y: Self.corner.minY)

      HStack(spacing: 0) {
        if let spec = env.frost {
          KFrost(theme: .classic, spec: spec, size: 56)
        } else {
          RoundedRectangle(cornerRadius: 14, style: .continuous)
            .strokeBorder(KOb.inkSoft, style: StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
            .frame(width: 56, height: 56)
        }
        VStack(alignment: .leading, spacing: 3) {
          HStack(spacing: 0) {
            Text(env.name.isEmpty ? " " : env.name)
              .font(.system(size: 23, weight: .bold))
              .tracking(-0.4)
              .foregroundStyle(KOb.ink)
              .lineLimit(1)
              .minimumScaleFactor(0.7)
            let mark = env.showMark ? env.mark : nil
            let sign = env.showSign ? env.sign : nil
            if mark != nil || sign != nil {
              HStack(spacing: 4) {
                if let mark { KLineIcon(mark, size: 18, lineWidth: 2, color: KOb.inkSoft) }
                if let sign { KLineIcon(sign, size: 18, lineWidth: 2, color: KOb.inkSoft) }
              }
              .padding(.leading, 6)
              .fixedSize()
            }
          }
          Text(env.envDate)
            .font(.system(size: 12.5, weight: .medium, design: .monospaced))
            .tracking(1.4)
            .foregroundStyle(KOb.inkSoft)
            .lineLimit(1)
        }
        .padding(.leading, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .frame(width: Self.w - 26 - 22)
      .offset(x: 26, y: 104)

      Text(ctx.w("env.to"))
        .kText(.content(15.5, italic: true))
        .foregroundStyle(KOb.ink)
        .lineLimit(1)
        .frame(width: Self.w - 26 - 22, alignment: .leading)
        .offset(x: 26, y: Self.h - 50)
    }
    .frame(width: Self.w, height: Self.h, alignment: .topLeading)
    .clipShape(shape)
    .obDepth(shape, onBlue: true, offset: 5)
    .environment(\.dynamicTypeSize, .large)
    .scaleEffect(s, anchor: .topLeading)
    .frame(width: width, height: Self.h * s, alignment: .topLeading)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(ctx.w("env.a11y"))
    .accessibilityAddTraits(.isImage)
  }

  @ViewBuilder
  private var cornerView: some View {
    switch corner {
    case .glow:
      KObCornerGlow()
    case .empty:
      KStampSlot(width: Self.corner.width, stroke: KOb.inkSoft)
    case .filled:
      KStamp(id: stamp, width: Self.corner.width, dark: false)
        .rotationEffect(.degrees(Self.settle))
    }
  }
}

/// The corner waiting for your first stamp: the stamp's dashed silhouette in acid, breathing.
struct KObCornerGlow: View {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var pulse = false

  var body: some View {
    ZStack {
      RoundedRectangle(cornerRadius: 10, style: .continuous)
        .fill(Color(.sRGB, red: 195 / 255, green: 232 / 255, blue: 79 / 255, opacity: 0.38))
        .padding(-7)
        .opacity(pulse ? 0.8 : 0.35)
        .scaleEffect(pulse ? 1.06 : 1)
      RoundedRectangle(cornerRadius: 6, style: .continuous)
        .fill(Color(.sRGB, red: 195 / 255, green: 232 / 255, blue: 79 / 255, opacity: 0.32))
        .padding(4)
      KStampSlot(width: KObEnvelopeFront.corner.width, stroke: Color(hex: "#8DB51F"))
    }
    .onAppear {
      guard !reduceMotion else { return }
      withAnimation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true)) { pulse = true }
    }
  }
}
