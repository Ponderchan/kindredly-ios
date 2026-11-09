// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE CROSSING, IN SWIFT (behind the "inflight" switch, 2026-11-09): Wren flies the reply you just
 sent across a dashed route, at the foot of the unfolded letter (KLetterReaderScreen) while a reply
 from the desk is still in the air. It was the "inflight" React Native island
 (src/components/LetterInFlight.tsx); this draws exactly what that draws. Every word is TS's;
 Wren is her snapshot (bird-images inflightFly34 / inflightStill26), never redrawn here.

   ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ◎      62 tall, a 1pt line rule under it
   ━━━━━━━━━━━━━━━ 🐦                                   the route at 40: dashes 2 · 5 in ink at
   SLOW CONNECTION                            JUNO      .22, the flown part solid in ind behind her

 - SHE CROSSES ONCE: p runs 0 → 1 over TS's cycle (the send beat less 70ms, at least 380ms) on
   in-out sine, and she stays on the mark. span = width − 34 − 30; she is at p × span, rises
   5 × sin(pπ) on one glide, pitches from −3° to +3°, and fades in from .35 over the first 5%.
   The solid part of the route is p × span + 17 wide.
 - Where she is going: a 16 ring (r 6.6, 1pt ink at .3) round a dot (r 2.4, ink at .22), right,
   top 26; the name under it (mono 500 10 at .06em, in mute) and, on a slow send, the headwind
   line on the left in the same style (TS sends it in capitals).
 - Her: 34 flying, delighted, the letter under her feet (the snapshot) and the small envelope
   drawn 6 into her, 15 × 11 on the card face with a 1pt ink edge and its flap. Not bare and not
   flipped: the die-cut edge keeps a lavender bird visible on a lavender desk.
 - Reduce Motion: the words instead of the flight, as React Native: her still at 26 beside
   "ON ITS WAY · JUNO" in mono 600 11 at .12em in ind, 16 above and below, the same rule.
 */
public struct KLetterInFlightContent: Equatable, Sendable {
  /// who it is flying to, in capitals ("JUNO"); "" for nobody named
  public var to = ""
  /// the headwind line, already in capitals (net.slow); "" while the send is not slow
  public var slow = ""
  /// "ON ITS WAY" (ld.onItsWay), for the still row
  public var onItsWay = ""
  /// the crossing's length, in seconds
  public var cycle: Double = 0.93
  /// her flying, 34 (the letter under her feet)
  public var bird: KImageRef?
  /// her flying, 26, for the still row
  public var stillBird: KImageRef?

  public init() {}
}

public struct KLetterInFlight: View {
  static let bird: CGFloat = 34
  static let height: CGFloat = 62
  static let routeY: CGFloat = 40
  static let smallStyle = KTextStyle.mono(10, .medium, tracking: 0.06)

  let theme: KTheme
  let content: KLetterInFlightContent

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var p: CGFloat = 0

  public init(theme: KTheme, content: KLetterInFlightContent) {
    self.theme = theme
    self.content = content
  }

  public var body: some View {
    if reduceMotion {
      still
    } else {
      GeometryReader { geo in
        KLetterInFlightRoute(theme: theme, content: content, width: geo.size.width, p: p)
      }
      .frame(height: Self.height)
      .overlay(alignment: .bottom) { rule }
      .onAppear {
        // in-out sine: the gentlest ease that still starts and stops at rest
        withAnimation(.timingCurve(0.37, 0, 0.63, 1, duration: max(0.38, content.cycle))) { p = 1 }
      }
    }
  }

  private var rule: some View {
    Rectangle().fill(theme.line).frame(height: 1).accessibilityHidden(true)
  }

  private var still: some View {
    HStack(spacing: 10) {
      KImage(content.stillBird, size: CGSize(width: 26, height: 26), contentMode: .fit, placeholder: .clear)
        .frame(width: 26, height: 26)
        .accessibilityHidden(true)
      Text(content.to.isEmpty ? content.onItsWay : "\(content.onItsWay) · \(content.to)")
        .kText(.mono(11, .semibold, tracking: 1.3 / 11))
        .foregroundStyle(theme.ind)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.vertical, 16)
    .overlay(alignment: .bottom) { rule }
  }
}

/// The route and her on it at `p` (0…1): an Animatable view, so one withAnimation on p drives
/// every part of the crossing from the same number, as the Reanimated styles read one value.
private struct KLetterInFlightRoute: View, Animatable {
  let theme: KTheme
  let content: KLetterInFlightContent
  let width: CGFloat
  var p: CGFloat

  var animatableData: CGFloat {
    get { p }
    set { p = newValue }
  }

  var body: some View {
    let bird = KLetterInFlight.bird
    let span = max(0, width - bird - 30)
    let y = KLetterInFlight.routeY
    return ZStack(alignment: .topLeading) {
      // the route: dashes ahead
      Path { path in
        path.move(to: CGPoint(x: 0, y: y + 0.5))
        path.addLine(to: CGPoint(x: width, y: y + 0.5))
      }
      .stroke(theme.ink, style: StrokeStyle(lineWidth: 1, dash: [2, 5]))
      .opacity(0.22)
      // ink behind
      Rectangle()
        .fill(theme.ind)
        .frame(width: max(0, p * span + bird / 2), height: 1)
        .offset(y: y)
      // where she is going
      ZStack {
        Circle().stroke(theme.ink, lineWidth: 1).frame(width: 13.2, height: 13.2).opacity(0.3)
        Circle().fill(theme.ink).frame(width: 4.8, height: 4.8).opacity(0.22)
      }
      .frame(width: 16, height: 16)
      .offset(x: width - 16, y: 26)
      if !content.to.isEmpty {
        Text(content.to)
          .kText(KLetterInFlight.smallStyle)
          .foregroundStyle(theme.mute)
          .lineLimit(1)
          .frame(width: width, alignment: .trailing)
          .offset(y: 46)
      }
      if !content.slow.isEmpty {
        Text(content.slow)
          .kText(KLetterInFlight.smallStyle)
          .foregroundStyle(theme.mute)
          .lineLimit(1)
          .offset(y: 46)
      }
      // the courier, and what she is carrying
      VStack(spacing: -6) {
        KImage(content.bird, size: CGSize(width: bird, height: bird), contentMode: .fit, placeholder: .clear)
          .frame(width: bird, height: bird)
        envelope
      }
      .frame(width: bird)
      .rotationEffect(.degrees(-3 + Double(p) * 6))
      .opacity(p < 0.05 ? 0.35 + Double(p / 0.05) * 0.65 : 1)
      .offset(x: p * span, y: 6 - 5 * sin(p * .pi))
      .accessibilityHidden(true)
    }
    .frame(width: width, height: KLetterInFlight.height, alignment: .topLeading)
  }

  private var envelope: some View {
    ZStack {
      RoundedRectangle(cornerRadius: 1, style: .circular)
        .fill(theme.sf)
        .overlay(RoundedRectangle(cornerRadius: 1, style: .circular).stroke(theme.ink, lineWidth: 1))
        .frame(width: 13.8, height: 9.8)
      Path { path in
        path.move(to: CGPoint(x: 0.6, y: 1.4))
        path.addLine(to: CGPoint(x: 7.5, y: 6.4))
        path.addLine(to: CGPoint(x: 14.4, y: 1.4))
      }
      .stroke(theme.ink, lineWidth: 1)
      .frame(width: 15, height: 11)
    }
    .frame(width: 15, height: 11)
  }
}
