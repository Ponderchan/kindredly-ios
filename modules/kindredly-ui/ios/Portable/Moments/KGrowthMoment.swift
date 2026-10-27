// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 WREN GROWS UP: THE MOMENT, in SwiftUI (2026-10-27; behind the "growthmoment" switch, off by
 default). The React Native scene (src/components/GrowthMoment.tsx Scene) stays the fallback;
 when it shows (once per stage, lib/growth-moment) is TS's, and so is the tap of haptics and the
 line VoiceOver hears. This draws the same scene on the same clock (lib/growth-moment-core
 GROWTH_BEATS, sent as `beats`), in ms from `startAt`:

   ground   the page's lavender (lav2) fades in over the tabs
   shake    her old form shakes left and right (linear steps), then swells a quarter and gives way
   burst    fourteen pieces fly out from her middle: every third a gold spark, the rest lilac
            feathers, turning, growing, fading (the burst curve)
   pop      her new form pops in larger, overshooting a little (the pop curve), then bobs for as
            long as the moment is up
   stamp    a pill with the stage's name and the day lands under her at -6°, from 1.6× (the stamp
            curve)
   words    her line in the Letter font's italic, and the one glad key, rise into place

 STILL (Reduce Motion, TS's `still`): no shake, no burst, no bob; the ground over groundStill and
 the new form, the stamp and the line over `still`, all from the start — React Native's own
 reduced scene. The clock stops once they are in.

 Her two forms are pictures of the real WrenBird (src/lib/bird-images "grow-…" and "grown-…",
 captured at the moment's sizes), never redrawn here. VoiceOver reads the stamp, the line and the
 key; her pictures and the burst are hidden.
 */

/// The moment's clock, in ms from its start (TS GROWTH_BEATS and GROWTH_CURVES).
public struct KGrowthBeats: Equatable, Sendable {
  public var ground: Double = 300
  public var shakeAt: Double = 450
  public var shakeStep: Double = 110
  public var shake: [Double] = [-6, 6, -5, 5, -3, 0]
  public var outAt: Double = 1150
  public var outMs: Double = 220
  public var burstAt: Double = 1150
  public var burstMs: Double = 900
  public var popAt: Double = 1270
  public var popMs: Double = 520
  public var stampAt: Double = 1850
  public var stampMs: Double = 360
  public var wordsAt: Double = 2150
  public var wordsMs: Double = 300
  public var bobAt: Double = 2500
  public var bobMs: Double = 1200
  public var bobBy: Double = 5
  public var groundStill: Double = 250
  public var still: Double = 300
  /// the burst's pieces
  public var burst: Int = 14
  /// cubic Béziers, four numbers each (Easing.bezier)
  public var burstCurve: [Double] = [0.2, 0.8, 0.3, 1]
  public var popCurve: [Double] = [0.3, 1.4, 0.5, 1]
  public var stampCurve: [Double] = [0.5, 0, 0.6, 1.4]

  public init() {}
}

/// What the moment shows: every word is TS's.
public struct KGrowthMomentContent: Equatable {
  /// when the moment started: every beat counts from it
  public var startAt: Date
  /// Reduce Motion: the reduced scene
  public var still: Bool
  public var beats: KGrowthBeats
  /// her old form and her new one (bird-images snapshots), each drawn at its own size
  public var oldBird: KImageRef?
  public var newBird: KImageRef?
  public var oldSize: CGFloat
  public var newSize: CGFloat
  /// the stamp's words: "FLEDGLING · OCT.27"
  public var mark: String
  /// her line, without the quotes
  public var line: String
  /// the one glad key ("Yay")
  public var ok: String

  public init(startAt: Date, still: Bool, beats: KGrowthBeats, oldBird: KImageRef?, newBird: KImageRef?, oldSize: CGFloat, newSize: CGFloat, mark: String, line: String, ok: String) {
    self.startAt = startAt
    self.still = still
    self.beats = beats
    self.oldBird = oldBird
    self.newBird = newBird
    self.oldSize = oldSize
    self.newSize = newSize
    self.mark = mark
    self.line = line
    self.ok = ok
  }
}

public struct KGrowthMoment: View {
  private let theme: KTheme
  private let content: KGrowthMomentContent
  private let onClose: () -> Void

  /// the reduced scene is all in: the clock stops (the full one bobs for as long as it is up)
  @State private var settled = false

  /// the box her forms stand in, as React Native's (280 × 250, her feet on its bottom edge)
  private static let box = CGSize(width: 280, height: 250)

  public init(theme: KTheme, content: KGrowthMomentContent, onClose: @escaping () -> Void) {
    self.theme = theme
    self.content = content
    self.onClose = onClose
  }

  public var body: some View {
    TimelineView(.animation(minimumInterval: nil, paused: settled)) { tl in
      scene(settled ? .greatestFiniteMagnitude : max(0, tl.date.timeIntervalSince(content.startAt) * 1000))
    }
    .accessibilityElement(children: .contain)
    .accessibilityAddTraits(.isModal)
    .task(id: content.startAt) {
      settled = false
      guard content.still else { return }
      let b = content.beats
      let left = max(b.groundStill, b.still) / 1000 - Date().timeIntervalSince(content.startAt)
      if left > 0 { try? await Task.sleep(for: .seconds(left)) }
      if Task.isCancelled { return }
      settled = true
    }
  }

  // MARK: the scene at `ms`

  @ViewBuilder
  private func scene(_ ms: Double) -> some View {
    let b = content.beats
    let still = content.still
    let ground = KMomentClock.beat(ms, at: 0, ms: still ? b.groundStill : b.ground)
    let oldOut = still ? 1 : KMomentClock.beat(ms, at: b.outAt, ms: b.outMs)
    let pop = still ? KMomentClock.beat(ms, at: 0, ms: b.still) : KMomentClock.beat(ms, at: b.popAt, ms: b.popMs, curve: KMomentBezier(b.popCurve).callAsFunction)
    let stamp = still ? KMomentClock.beat(ms, at: 0, ms: b.still) : KMomentClock.beat(ms, at: b.stampAt, ms: b.stampMs, curve: KMomentBezier(b.stampCurve).callAsFunction)
    let words = still ? KMomentClock.beat(ms, at: 0, ms: b.still) : KMomentClock.beat(ms, at: b.wordsAt, ms: b.wordsMs)
    let burst = still ? 0 : KMomentClock.beat(ms, at: b.burstAt, ms: b.burstMs, curve: KMomentBezier(b.burstCurve).callAsFunction)

    ZStack {
      theme.lav2
        .opacity(ground)
        .ignoresSafeArea()
        .accessibilityHidden(true)

      VStack(spacing: 0) {
        birds(ms, oldOut: oldOut, pop: pop, burst: burst)
          .frame(width: Self.box.width, height: Self.box.height)
          .accessibilityHidden(true)
        stampPill(stamp)
          .padding(.top, 22)
        Text("“\(content.line)”")
          .kText(.content(19, italic: true, lineHeight: 26.0 / 19))
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
          .opacity(words)
          .offset(y: (1 - words) * 6)
          .padding(.horizontal, 36)
          .padding(.top, 22)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)

      key(words)
    }
  }

  @ViewBuilder
  private func birds(_ ms: Double, oldOut: Double, pop: Double, burst: Double) -> some View {
    let b = content.beats
    let w = Self.box.width
    let h = Self.box.height
    ZStack(alignment: .topLeading) {
      if !content.still {
        ForEach(0..<max(0, b.burst), id: \.self) { i in
          bit(i, of: b.burst, burst: burst)
        }
      }
      // the old form: shakes, then swells a quarter and gives way
      KImage(content.oldBird, size: CGSize(width: content.oldSize, height: content.oldSize), contentMode: .fit, placeholder: .clear)
        .scaleEffect(1 + oldOut * 0.25)
        .offset(x: content.still ? 0 : shake(ms))
        .opacity(1 - oldOut)
        .position(x: w / 2, y: h - content.oldSize / 2)
      // the new form: pops in larger, then bobs
      KImage(content.newBird, size: CGSize(width: content.newSize, height: content.newSize), contentMode: .fit, placeholder: .clear)
        .scaleEffect(0.6 + pop * 0.4)
        .offset(y: content.still ? 0 : bob(ms))
        .opacity(min(1, pop * 1.6))
        .position(x: w / 2, y: h - content.newSize / 2)
    }
  }

  /// One piece of the burst, flying out from her middle (React Native's Bit).
  private func bit(_ i: Int, of count: Int, burst: Double) -> some View {
    let angle = Double(i) / Double(max(1, count)) * .pi * 2
    let reach = 90 + Double(i % 4) * 22
    let spark = i % 3 == 0
    let size = spark ? CGSize(width: 9, height: 9) : CGSize(width: 10, height: 16)
    return RoundedRectangle(cornerRadius: spark ? 2 : 6, style: .circular)
      .fill(spark ? Self.spark : Self.feather)
      .frame(width: size.width, height: size.height)
      .scaleEffect(0.4 + burst * 0.6)
      .rotationEffect(.degrees(Double(i) * 40 * burst))
      .offset(x: cos(angle) * reach * burst, y: sin(angle) * reach * burst + 30 * burst)
      .opacity(burst == 0 ? 0 : 1 - burst)
      // React Native's left 140 − 5, top 125: the piece's own corner there, whatever its width
      .position(x: 135 + size.width / 2, y: 125 + size.height / 2)
  }

  private static let spark = Color(hex: "#F2C14E")
  private static let feather = Color(hex: "#B9A8FF")

  /// the shake's x at `ms`: each step a straight line from the last, over shakeStep
  private func shake(_ ms: Double) -> Double {
    let b = content.beats
    let t = ms - b.shakeAt
    guard t > 0, b.shakeStep > 0 else { return 0 }
    var from = 0.0
    for (i, to) in b.shake.enumerated() {
      let start = Double(i) * b.shakeStep
      if t < start + b.shakeStep {
        return from + (to - from) * KMomentClock.clamp01((t - start) / b.shakeStep)
      }
      from = to
    }
    return b.shake.last ?? 0
  }

  /// the bob's y at `ms`: up bobBy over bobMs, back over bobMs, for ever (each leg in-out quad)
  private func bob(_ ms: Double) -> Double {
    let b = content.beats
    let t = ms - b.bobAt
    guard t > 0, b.bobMs > 0 else { return 0 }
    let phase = t.truncatingRemainder(dividingBy: 2 * b.bobMs)
    if phase < b.bobMs {
      return -b.bobBy * KMomentClock.inOutQuad(phase / b.bobMs)
    }
    return -b.bobBy * (1 - KMomentClock.inOutQuad((phase - b.bobMs) / b.bobMs))
  }

  private func stampPill(_ stamp: Double) -> some View {
    Text(content.mark)
      .kText(.mono(10, .semibold, tracking: 0.16))
      .foregroundStyle(theme.ind)
      .padding(.horizontal, 14)
      .padding(.vertical, 7)
      .overlay(Capsule(style: .circular).strokeBorder(theme.ind, lineWidth: 2))
      .rotationEffect(.degrees(-6))
      .scaleEffect(1.6 - stamp * 0.6)
      .opacity(min(1, stamp * 2))
  }

  /// the one glad key, 32 in from the sides and 56 up from the bottom edge, rising with her line
  private func key(_ words: Double) -> some View {
    SwiftUI.Button(action: onClose) {
      Text(content.ok)
        .kText(.system(17, .semibold))
        // the page colour on ind, as every filled key (KTheme.bg): white in the light themes, the
        // night in Midnight, where ind is a pale violet white words vanished on
        .foregroundStyle(theme.bg)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .frame(maxWidth: .infinity, minHeight: 52)
        .background(Capsule(style: .circular).fill(theme.ind))
        .contentShape(Capsule(style: .circular))
    }
    .buttonStyle(KMomentPressStyle(opacity: 0.8))
    .opacity(words)
    .offset(y: (1 - words) * 6)
    .padding(.horizontal, 32)
    .padding(.bottom, 56)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
  }
}
