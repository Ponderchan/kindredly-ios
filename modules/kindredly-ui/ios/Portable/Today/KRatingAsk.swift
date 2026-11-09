// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE RATING ASK, IN SWIFT (behind the "ratingask" switch, 2026-11-09): the inside of the sheet
 Today raises at a calm moment (src/screens/today/TodayUpdate.tsx), drawn as the React Native
 RatingAskSheet draws it (src/components/RatingAsk.tsx; owner 2026-11-01, the design canvas
 UmibsHqWgMSwDeJ5QRcFeS). The window it rises in (a transparent Modal sliding up, its onShow, the
 hardware back) stays TS's, and so does every rule and event (lib/rating-ask*): this draws, and
 says which key was pressed. Every word is TS's; Wren is her snapshot (bird-images rateStamp50,
 rateWorry118), her motion SwiftUI's.

 THE DIM over everything the Host is given (scrimColor(dark, .3): KChatScrim), a tap on it is Not
 now; VoiceOver skips it, stays in the sheet, and the escape is Not now. The sheet sits
 max(home indicator − 26, 8) over the bottom edge (TS's number). One of two:

 A · THE FOUNDER'S LETTER                        ┌───────╮  the stamp: 74 × 88 in #5B55FF, turned
   ╭──────────────────────────────────────╮      │ (w)   │  4°, a 1.5 dashed cream frame 4 in, a
   │ A LETTER FROM MARK · ABOUT WREN    ███│     │ FROM… │  hard #3A34D6 shadow at 3/3; Wren 50
   │ Hi,                                     │    └───────╯  flying, happy; mono 7 in white
   │ …three paragraphs…                     │   paper #FFFDF8 (Midnight: sf), corners 6, padding 22
   │ — Mark                                  │   (24 on top), 10 between; a hard shadow at 5/6 in
   │ ( ★  Rate Kindredly )                   │   #C9C3EE (Midnight: line), no edge (rule B); 12 in
   │ ( Not now )                             │   from the sides, 24 of room above for the stamp.
   │ P.S. Wren …                             │   Label mono 600 10.5 at .8 in mute (84 clear of the
   ╰─────────────────────────────────────────╯   stamp); the letter in the Letter font 16/24 in ink;
                                                  the P.S. its italic 13.5/19 in mute.
 B · WREN'S PERFORMANCE REVIEW
   ( "Is it… my review?" )      the bubble: sf, corners 18 (4 at bottom left), 12 · 15, a hard
                (w) 118           3/3 shadow; 24 in, at most 250; the Letter font 16/22. It rises
   ╭──────────────────────╮       8 and fades in on a spring (RN friction 6, tension 80). Wren,
   │ PERFORMANCE REVIEW  WREN │    worried, 118, 34 from the right, 4 into the bubble's room and 24
   │ Letters carried     12 │      over the card; she fidgets (a sway and a hop, 3.2s, linear) and a
   │ Replies brought home 9 │      bead of sweat runs down (3.2s, ease-in quad). The card: sf, the
   │ Letters lost         0 │      sheet's 34 continuous corners, 12 in, 20 · 20 · 14, 8 between,
   │ ( ★  … )  ( … )        │      the same hard 5/6 shadow. Its head mono 600 11.5 in ind beside
   ╰──────────────────────╯       the courier's line in mute; rows system 15 in ink, the numbers
                                   mono 600 15 (a count under 10 in post red), 10 above and below,
                                   a dashed 1pt line rule between them (3 on, 3 off, as RN draws one).

 The keys are the sheets' capsules (KSheetChrome.Key): ★ and the CTA filled, Not now quiet.
 Reduce Motion: nothing moves (the bubble simply there, Wren still, no bead). Words stop growing
 at React Native's caps (1.3: xxLarge; 1.4: xxxLarge).
 */
public struct KRatingAskRow: Equatable, Sendable, Identifiable {
  public var id: String { label }
  public var label: String
  public var value: String
  /// Apple's count, under ten: in post red
  public var warn: Bool

  public init(label: String, value: String, warn: Bool) {
    self.label = label
    self.value = value
    self.warn = warn
  }
}

public struct KRatingAskContent: Equatable, Sendable {
  /// "letter" (A) or "review" (B)
  public var review = false
  /// the room under the sheet: max(the home indicator − 26, 8)
  public var bottom: CGFloat = 8
  /// the filled key's words (TS's; the ★ is drawn here, as React Native writes it)
  public var cta = ""
  public var later = ""
  // A
  /// the stamp's line (ra.letter.stamp)
  public var stamp = ""
  /// "A LETTER FROM MARK · …"
  public var label = ""
  /// hi, the three paragraphs and the signature
  public var paragraphs: [String] = []
  public var ps = ""
  // B
  public var say = ""
  public var reviewLabel = ""
  public var who = ""
  public var rows: [KRatingAskRow] = []
  /// Wren flying, happy, 50 (A's stamp)
  public var stampBird: KImageRef?
  /// Wren worried, 118 (B)
  public var worryBird: KImageRef?

  public init() {}
}

public final class KRatingAskActions {
  /// the ★ key
  public var onTap: () -> Void = {}
  /// Not now, the dim or VoiceOver's escape
  public var onLater: () -> Void = {}

  public init() {}
}

public struct KRatingAsk: View {
  static let paper = Color(hex: "#FFFDF8")
  static let lightShadow = Color(hex: "#C9C3EE")
  static let stampBlue = Color(hex: "#5B55FF")
  static let stampShadow = Color(hex: "#3A34D6")
  static let bead = Color(hex: "#8FC8F2")

  let theme: KTheme
  let content: KRatingAskContent
  let actions: KRatingAskActions

  public init(theme: KTheme, content: KRatingAskContent, actions: KRatingAskActions) {
    self.theme = theme
    self.content = content
    self.actions = actions
  }

  private var shadow: Color { theme.isDark ? theme.line : Self.lightShadow }

  public var body: some View {
    ZStack(alignment: .bottom) {
      KChatScrim.color(theme, 0.3)
        .contentShape(Rectangle())
        .onTapGesture { actions.onLater() }
        .accessibilityHidden(true)
      Group {
        if content.review {
          KRatingAskReview(theme: theme, content: content, actions: actions, shadow: shadow)
        } else {
          letter
        }
      }
      .padding(.bottom, content.bottom)
      .accessibilityElement(children: .contain)
      .accessibilityAddTraits(.isModal)
      .accessibilityAction(.escape) { actions.onLater() }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
    .ignoresSafeArea()
  }

  // ── A · the founder's letter ──
  private var letter: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(content.label)
        .kText(.mono(10.5, .semibold, tracking: 0.8 / 10.5))
        .foregroundStyle(theme.mute)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.trailing, 84)
        .dynamicTypeSize(...DynamicTypeSize.xxLarge)
      ForEach(Array(content.paragraphs.enumerated()), id: \.offset) { _, p in
        Text(p)
          .kText(.content(16, lineHeight: 24.0 / 16.0))
          .foregroundStyle(theme.ink)
          .fixedSize(horizontal: false, vertical: true)
          .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
      }
      KRatingAskKeys(theme: theme, cta: content.cta, later: content.later, actions: actions)
      Text(content.ps)
        .kText(.content(13.5, italic: true, lineHeight: 19.0 / 13.5))
        .foregroundStyle(theme.mute)
        .fixedSize(horizontal: false, vertical: true)
        .dynamicTypeSize(...DynamicTypeSize.xxLarge)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 22)
    .padding(.top, 24)
    .padding(.bottom, 22)
    .background(theme.isDark ? theme.sf : Self.paper, in: RoundedRectangle(cornerRadius: 6, style: .circular))
    .kObjectDepthLike(RoundedRectangle(cornerRadius: 6, style: .circular), color: shadow, x: 5, y: 6)
    .overlay(alignment: .topTrailing) {
      stamp
        .padding(.trailing, 16)
        .offset(y: -20)
    }
    .padding(.horizontal, 12)
    .padding(.top, 24)
  }

  /// Wren in flight, FROM THE FOUNDER: a printed thing, so VoiceOver passes it by.
  private var stamp: some View {
    VStack(spacing: 0) {
      KImage(content.stampBird, size: CGSize(width: 50, height: 50), contentMode: .fit, placeholder: .clear)
        .frame(width: 50, height: 50)
      Spacer(minLength: 0)
      Text(content.stamp)
        .kText(.mono(7, .semibold, tracking: 0.5 / 7))
        .foregroundStyle(Color.white)
        .multilineTextAlignment(.center)
    }
    .padding(.vertical, 6)
    .frame(width: 74, height: 88)
    .background(Self.stampBlue)
    .overlay {
      Rectangle()
        .strokeBorder(Self.paper, style: StrokeStyle(lineWidth: 1.5, dash: [4.5, 4.5]))
        .padding(4)
    }
    .kObjectDepthLike(Rectangle(), color: Self.stampShadow, x: 3, y: 3)
    .rotationEffect(.degrees(4))
    .accessibilityHidden(true)
  }
}

/// The two capsule keys, 6 apart, 6 under what is above them.
private struct KRatingAskKeys: View {
  let theme: KTheme
  let cta: String
  let later: String
  let actions: KRatingAskActions

  var body: some View {
    VStack(spacing: 6) {
      KSheetChrome.Key(theme: theme, kind: .primary, label: "★  \(cta)", action: actions.onTap)
      KSheetChrome.Key(theme: theme, kind: .quiet, label: later, action: actions.onLater)
    }
    .padding(.top, 6)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }
}

// ── B · Wren's performance review ──
private struct KRatingAskReview: View {
  let theme: KTheme
  let content: KRatingAskContent
  let actions: KRatingAskActions
  let shadow: Color

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var bubbleIn = false

  var body: some View {
    let shown = bubbleIn || reduceMotion
    VStack(alignment: .leading, spacing: 0) {
      Text(content.say)
        .kText(.content(16, lineHeight: 22.0 / 16.0))
        .foregroundStyle(theme.ink)
        .fixedSize(horizontal: false, vertical: true)
        .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
        .padding(.vertical, 12)
        .padding(.horizontal, 15)
        .background(theme.sf, in: Self.bubbleShape)
        .kObjectDepthLike(Self.bubbleShape, color: shadow, x: 3, y: 3)
        .frame(maxWidth: 250, alignment: .leading)
        .opacity(shown ? 1 : 0)
        .offset(y: shown ? 0 : 8)
        .padding(.leading, 24)
      KRatingAskWren(bird: content.worryBird, still: reduceMotion)
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding(.trailing, 34)
        .padding(.top, -4)
        .padding(.bottom, -24)
        .zIndex(2)
      card
    }
    .onAppear {
      guard !reduceMotion else { return }
      // React Native's spring(friction 6, tension 80), as origami converts it
      withAnimation(.interpolatingSpring(mass: 1, stiffness: 375, damping: 19)) { bubbleIn = true }
    }
  }

  static let bubbleShape = UnevenRoundedRectangle(topLeadingRadius: 18, bottomLeadingRadius: 4, bottomTrailingRadius: 18, topTrailingRadius: 18, style: .circular)
  static let cardShape = RoundedRectangle(cornerRadius: KSheetChrome.radius, style: .continuous)

  private var card: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(alignment: .firstTextBaseline, spacing: 8) {
        Text(content.reviewLabel)
          .kText(.mono(11.5, .semibold, tracking: 1 / 11.5))
          .foregroundStyle(theme.ind)
          .fixedSize(horizontal: false, vertical: true)
        Spacer(minLength: 0)
        Text(content.who)
          .kText(.mono(11.5, .medium))
          .foregroundStyle(theme.mute)
          .lineLimit(1)
      }
      .dynamicTypeSize(...DynamicTypeSize.xxLarge)
      VStack(spacing: 0) {
        ForEach(Array(content.rows.enumerated()), id: \.offset) { i, r in
          HStack(alignment: .top, spacing: 12) {
            Text(r.label)
              .kText(.system(15))
              .foregroundStyle(theme.ink)
              .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
            Text(r.value)
              .kText(.mono(15, .semibold))
              .monospacedDigit()
              .foregroundStyle(r.warn ? KBrand.postRed : theme.ink)
          }
          .padding(.vertical, 10)
          .overlay(alignment: .bottom) {
            if i < content.rows.count - 1 {
              KRatingAskDash()
                .stroke(theme.line, style: StrokeStyle(lineWidth: 1, dash: [3, 3]))
                .frame(height: 1)
            }
          }
          .accessibilityElement(children: .combine)
        }
      }
      .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
      KRatingAskKeys(theme: theme, cta: content.cta, later: content.later, actions: actions)
    }
    .padding(.horizontal, 20)
    .padding(.top, 20)
    .padding(.bottom, KSheetChrome.bottomPad)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(theme.sf, in: Self.cardShape)
    .kObjectDepthLike(Self.cardShape, color: shadow, x: 5, y: 6)
    .padding(.horizontal, 12)
    .padding(.bottom, 8)
  }
}

/// A horizontal line through the middle of its frame (the rows' dashed rule).
private struct KRatingAskDash: Shape {
  func path(in rect: CGRect) -> Path {
    var p = Path()
    p.move(to: CGPoint(x: rect.minX, y: rect.midY))
    p.addLine(to: CGPoint(x: rect.maxX, y: rect.midY))
    return p
  }
}

/// Wren worried at 118, fidgeting, and the bead of sweat running down by her brow.
private struct KRatingAskWren: View {
  let bird: KImageRef?
  let still: Bool

  static let size: CGFloat = 118
  static let cycle: Double = 3.2

  // React Native's interpolations, over one 3.2s loop
  private static let fidgetAt: [Double] = [0, 0.08, 0.16, 0.24, 0.32, 0.6, 0.66, 0.72, 1]
  private static let rotateTo: [Double] = [0, -4, 3, -2, 0, 0, 6, 0, 0]
  private static let hopTo: [Double] = [0, -3, 0, -2, 0, 0, -8, 0, 0]
  private static let dropYAt: [Double] = [0, 0.4, 0.48, 0.8, 1]
  private static let dropYTo: [Double] = [0, 0, 0, 22, 30]
  private static let dropOAt: [Double] = [0, 0.4, 0.48, 0.8, 0.9, 1]
  private static let dropOTo: [Double] = [0, 0, 1, 1, 0, 0]

  @State private var start = Date()

  var body: some View {
    TimelineView(.animation(minimumInterval: nil, paused: still)) { ctx in
      let phase = still ? 0 : ctx.date.timeIntervalSince(start).truncatingRemainder(dividingBy: Self.cycle) / Self.cycle
      // the bead's loop runs on ease-in quad
      let drip = phase * phase
      ZStack(alignment: .topLeading) {
        KImage(bird, size: CGSize(width: Self.size, height: Self.size), contentMode: .fit, placeholder: .clear)
          .frame(width: Self.size, height: Self.size)
        KRatingAskBead()
          .fill(KRatingAsk.bead)
          .frame(width: 11, height: 15)
          .offset(x: 16, y: 18 + Self.lerp(drip, Self.dropYAt, Self.dropYTo))
          .opacity(still ? 0 : Self.lerp(drip, Self.dropOAt, Self.dropOTo))
      }
      .frame(width: Self.size, height: Self.size, alignment: .topLeading)
      .rotationEffect(.degrees(Self.lerp(phase, Self.fidgetAt, Self.rotateTo)))
      .offset(y: Self.lerp(phase, Self.fidgetAt, Self.hopTo))
    }
    .frame(width: Self.size, height: Self.size)
    .accessibilityHidden(true)
  }

  /// Piecewise-linear, as Animated's interpolate (clamped at both ends).
  static func lerp(_ x: Double, _ at: [Double], _ to: [Double]) -> Double {
    guard let first = at.first, let last = at.last else { return 0 }
    if x <= first { return to[0] }
    if x >= last { return to[to.count - 1] }
    for i in 1..<at.count where x <= at[i] {
      let a = at[i - 1], b = at[i]
      let f = b > a ? (x - a) / (b - a) : 1
      return to[i - 1] + (to[i] - to[i - 1]) * f
    }
    return to[to.count - 1]
  }
}

/// The bead: M6 1C6 1 1 8 1 11a5 5 0 0 0 10 0C11 8 6 1 6 1z in a 12 × 16 box, scaled to its frame.
private struct KRatingAskBead: Shape {
  func path(in rect: CGRect) -> Path {
    let sx = rect.width / 12, sy = rect.height / 16
    func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: rect.minX + x * sx, y: rect.minY + y * sy) }
    // the half circle under it as two cubics (k = .5523 × 5)
    let k: CGFloat = 2.761
    var p = Path()
    p.move(to: pt(6, 1))
    p.addCurve(to: pt(1, 11), control1: pt(6, 1), control2: pt(1, 8))
    p.addCurve(to: pt(6, 16), control1: pt(1, 11 + k), control2: pt(6 - k, 16))
    p.addCurve(to: pt(11, 11), control1: pt(6 + k, 16), control2: pt(11, 11 + k))
    p.addCurve(to: pt(6, 1), control1: pt(11, 8), control2: pt(6, 1))
    p.closeSubpath()
    return p
  }
}

extension View {
  /// A hard shadow (no blur) in `shape`, `x` right and `y` down, behind the view: React Native's
  /// shadowRadius 0 at full opacity. Rule B's object depth (kObjectDepth) when the colour and the
  /// offsets are its own; this sheet's are not (its #C9C3EE and 5/6 are the design canvas's).
  func kObjectDepthLike<S: Shape>(_ shape: S, color: Color, x: CGFloat, y: CGFloat) -> some View {
    background {
      shape.fill(color)
        .offset(x: x, y: y)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
  }
}
