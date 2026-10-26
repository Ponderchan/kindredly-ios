// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 8 · YOUR FIRST STAMP (+ 8a, today's tray) — screens/S08Stamp.

 Back on the blue, the egg waiting in its nest. A big stamp floats at the Me size (80 × 96): the one
 the letter suggests (or the one picked from the tray), its name big and lower case, and under it
 your envelope front with its stamp corner glowing. A dotted line says where the stamp goes.

 "Stick it on": the stamp shrinks onto the corner on a short arc (440 ms) and lands with THE THUNK
 (the launch crack's light impact), the envelope dips 3 and back, the stamp settles at its small
 tilt. 600 ms after the thunk the stamped envelope shrinks and flies up into the nest egg, and the
 run goes on with the stamp (advance). Reduce Motion: the big stamp fades, the corner fills, the
 thunk, then on. "Pick another" opens 8a: today's tray (KStampTray, the compose page's own) in a
 sheet over the dimmed blue; a pick puts that stamp up big and closes the sheet.

 Rule B: the envelope is an object (no ink edge, the depth); the tray's sheet has no ink edge.
 */
struct KObStampScreen: View {
  static let big: CGFloat = 80
  static let bigTilt = -4.0
  static let envTilt = -2.0
  static let envMinW: CGFloat = 150

  enum Phase { case idle, flying, landed }

  let ctx: KObCtx

  @State private var phase: Phase = .idle
  @State private var bigFrame: CGRect = .zero
  @State private var cornerFrame: CGRect = .zero
  @State private var envFrame: CGRect = .zero
  @State private var flight: Double = 0
  @State private var bigGone = false
  @State private var dip = 0
  @State private var feed: Double = 0
  @State private var floating = false

  private var shown: String { ctx.content.stamp.shown }

  var body: some View {
    ZStack(alignment: .topLeading) {
      KObFrame(
        topInset: ctx.top,
        bottomInset: ctx.bottom,
        backLabel: ctx.w("back"),
        onBack: ctx.content.hasBack && phase == .idle ? { ctx.send("back") } : nil,
        nest: true
      ) {
        VStack(spacing: 0) {
          Text(ctx.w("eyebrow"))
            .kText(.obLabel)
            .foregroundStyle(KOb.white)
            .multilineTextAlignment(.center)
          KStamp(id: shown, width: Self.big, dark: false)
            .rotationEffect(.degrees(Self.bigTilt))
            .offset(y: floating ? 3 : -3)
            .opacity(bigGone ? 0 : 1)
            .onGeometryChange(for: CGRect.self) { $0.frame(in: .named(KObSpace.root)) } action: { bigFrame = $0 }
            .padding(.top, 12)
            .accessibilityElement()
            .accessibilityLabel(ctx.w("name"))
            .accessibilityAddTraits(.isImage)
          envelopeSlot
            .padding(.vertical, 8)
          VStack(spacing: 0) {
            Text(ctx.w("name"))
              .kText(.system(31, .heavy, tracking: -0.8 / 31, lineHeight: 36 / 31))
              .foregroundStyle(KOb.white)
              .lineLimit(1)
              .minimumScaleFactor(0.7)
            Text(ctx.w("line"))
              .kText(.obLineSmall)
              .foregroundStyle(KOb.white)
              .multilineTextAlignment(.center)
              .lineLimit(3)
              .minimumScaleFactor(0.8)
              .padding(.top, 6)
              .padding(.bottom, 4)
          }
          .opacity(1 - feed)
          .obFocusOnAppear()
        }
        .frame(maxWidth: .infinity)
      } primary: {
        KObAcidKey(label: ctx.w("key"), disabled: !ctx.content.canAdvance, action: stickItOn)
      } secondary: {
        Button {
          if phase == .idle { ctx.send("side", "tray") }
        } label: {
          Text(ctx.w("another"))
            .kText(.obKey)
            .foregroundStyle(KOb.white)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(KOb.white, lineWidth: 2))
            .contentShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(KObPressStyle(pressedOpacity: 0.7))
      }

      if phase == .idle && bigFrame != .zero && cornerFrame != .zero {
        KObDottedWay(from: bigFrame, to: cornerFrame)
      }

      if phase == .flying && !ctx.reduceMotion {
        KObStampFlight(id: shown, from: bigFrame, to: cornerFrame, p: flight)
      }

    }
    .onAppear {
      guard !ctx.reduceMotion else { return }
      withAnimation(.easeInOut(duration: 1.4).repeatForever(autoreverses: true)) { floating = true }
    }
  }

  private var envelopeSlot: some View {
    let minH = ceil(Self.envMinW * KObEnvelopeFront.h / KObEnvelopeFront.w) + 6
    return GeometryReader { geo in
      let w = max(Self.envMinW, min(ctx.size.width - 2 * KOb.gutter - 6, geo.size.width, (geo.size.height - 6) * KObEnvelopeFront.w / KObEnvelopeFront.h))
      KObEnvelopeFront(
        ctx: ctx,
        stamp: shown,
        corner: phase == .landed ? .filled : phase == .flying ? .empty : .glow,
        width: w,
        onCorner: { cornerFrame = $0 }
      )
      .rotationEffect(.degrees(Self.envTilt))
      .keyframeAnimator(initialValue: 0.0, trigger: dip) { v, d in
        v.offset(y: 3 * d)
      } keyframes: { _ in
        CubicKeyframe(1.0, duration: 0.06)
        CubicKeyframe(0.0, duration: 0.06)
      }
      .onGeometryChange(for: CGRect.self) { $0.frame(in: .named(KObSpace.root)) } action: { envFrame = $0 }
      .scaleEffect(1 - 0.9 * feed)
      .offset(y: CGFloat(feed) * feedDy)
      .opacity(1 - 0.85 * feed)
      .frame(width: geo.size.width, height: geo.size.height)
    }
    .frame(minHeight: minH)
    .frame(maxHeight: .infinity)
  }

  /// the way up into the nest egg, from the envelope's middle
  private var feedDy: CGFloat {
    guard envFrame != .zero else { return 0 }
    return ctx.top + KOb.topBarH + KOb.nestEgg / 2 - envFrame.midY
  }

  private func stickItOn() {
    guard phase == .idle, ctx.content.canAdvance else { return }
    if ctx.reduceMotion || bigFrame == .zero || cornerFrame == .zero {
      phase = .flying
      withAnimation(.easeOut(duration: ctx.reduceMotion ? 0.16 : 0)) { bigGone = true }
      Task {
        try? await Task.sleep(nanoseconds: ctx.reduceMotion ? 160_000_000 : 0)
        landed()
      }
      return
    }
    bigGone = true
    flight = 0
    phase = .flying
    withAnimation(.timingCurve(0.33, 1, 0.68, 1, duration: 0.44)) { flight = 1 } completion: {
      landed()
    }
  }

  private func landed() {
    phase = .landed
    ctx.haptic("thunk")
    dip += 1
    Task {
      try? await Task.sleep(nanoseconds: 600_000_000)
      handOver()
    }
  }

  /// the stamped envelope shrinks and flies up into the nest egg, and the egg takes it to 9
  private func handOver() {
    if ctx.reduceMotion || envFrame == .zero {
      ctx.send("advance", shown)
      return
    }
    withAnimation(.easeIn(duration: 0.38)) { feed = 1 } completion: {
      ctx.send("advance", shown)
    }
  }
}

/// The stamp in flight, from the big one to the corner on a short arc.
struct KObStampFlight: View, Animatable {
  let id: String
  let from: CGRect
  let to: CGRect
  var p: Double

  var animatableData: Double {
    get { p }
    set { p = newValue }
  }

  var body: some View {
    let e = CGFloat(p)
    let x = from.midX + (to.midX - from.midX) * e
    let y = from.midY + (to.midY - from.midY) * e - sin(.pi * e) * 26
    let big = KObStampScreen.big
    KStamp(id: id, width: big, dark: false)
      .scaleEffect(1 + (to.width / big - 1) * e)
      .rotationEffect(.degrees(KObStampScreen.bigTilt * Double(1 - e)))
      .position(x: x, y: y)
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }
}

/// A dashed white curve from under the big stamp to the corner's top.
struct KObDottedWay: View {
  let from: CGRect
  let to: CGRect

  var body: some View {
    let x0 = from.midX + KObStampScreen.big * 0.42
    let y0 = from.midY + KObStampScreen.big * 0.5
    let x1 = to.midX
    let y1 = to.midY - to.width * 0.7
    if y1 - y0 >= 12 {
      Path { p in
        p.move(to: CGPoint(x: x0, y: y0))
        p.addQuadCurve(to: CGPoint(x: x1, y: y1), control: CGPoint(x: max(x0, x1) + 18, y: (y0 + y1) / 2))
      }
      .stroke(KOb.white, style: StrokeStyle(lineWidth: 2.5, lineCap: .round, dash: [1, 7]))
      .allowsHitTesting(false)
      .accessibilityHidden(true)
    }
  }
}

/// 8a: today's tray in a sheet over the dimmed blue (fades in, the sheet slides up).
struct KObTraySheet: View {
  let ctx: KObCtx
  @State private var up = false

  var body: some View {
    ZStack(alignment: .bottom) {
      Rectangle().fill(KOb.scrim)
        .opacity(up ? 1 : 0)
        .ignoresSafeArea()
        .onTapGesture { ctx.send("closeSide") }
        .accessibilityElement()
        .accessibilityLabel(ctx.w("trayDone"))
        .accessibilityAddTraits(.isButton)
        .accessibilityAction { ctx.send("closeSide") }
      VStack(spacing: 0) {
        HStack {
          Text(ctx.w("trayHead"))
            .kText(.system(19, .heavy, tracking: -0.4 / 19))
            .foregroundStyle(KOb.ink)
            .accessibilityAddTraits(.isHeader)
          Spacer()
          KObTextKey(label: ctx.w("trayDone"), color: KOb.ink) { ctx.send("closeSide") }
        }
        .padding(.leading, KOb.gutter)
        .padding(.trailing, 8)
        .padding(.top, 10)
        .padding(.bottom, 4)
        KStampTray(theme: .classic, sections: ctx.content.stamp.sections, selectedId: ctx.content.stamp.shown, bottomInset: ctx.bottom) { id in
          ctx.send("stampPick", id)
        }
        .frame(height: 296 + ctx.bottom)
      }
      .background(
        UnevenRoundedRectangle(topLeadingRadius: 22, topTrailingRadius: 22, style: .continuous)
          .fill(KOb.paper)
          .ignoresSafeArea(edges: .bottom)
      )
      .clipShape(UnevenRoundedRectangle(topLeadingRadius: 22, topTrailingRadius: 22, style: .continuous))
      .offset(y: up ? 0 : 420)
    }
    .accessibilityAddTraits(.isModal)
    .accessibilityAction(.escape) { ctx.send("closeSide") }
    .onAppear {
      withAnimation(ctx.reduceMotion ? .easeOut(duration: 0.2) : .timingCurve(0.33, 1, 0.68, 1, duration: 0.28)) { up = true }
    }
  }
}
