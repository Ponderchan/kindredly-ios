// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE VOICE REPORT, IN SWIFT (2026-10-27): Wren's night letter about how you write (/report, from
 Me's report door). The React Native page (src/app/report.tsx) stays as the "report" switch's
 fallback. Every word, every card and the sky's stars are TS's (src/screens/report: report-model,
 lib/constellation); this draws them, keeps which card is up, and reports Share and Done.

   ━━━━ ━━━━ ━━━━ ━━━━ ━━━━ ━━━━ ━━━━      the progress: one 3pt bar per card, white up to this one
                                    ×       the close key (KLineIcon .close 20 at 2.2), 38 box
     YOUR AURA · WRAPPED                    every card: its eyebrow in mono 10 .22em, starlight
     An unhurried writer                    then its fact, centred in the space below
     (chips) …
 One fact per card; a tap on the left 30% goes back, on the right 55% goes on (from 90 under the
 status bar down), and the last card holds its own exits: Share (the outlined key) and Done (the
 white one). A new card fades in over 320ms (at once under Reduce Motion). VoiceOver: the bar is
 one adjustable element (the card's eyebrow, "3/7"): swipe up or down on it to move.

 THE SAME NIGHT IN EVERY THEME, as the React Native page: every colour belongs to the letter's
 night sky, not to the reader's theme. The keepsake card on the last page is an object (rule B):
 no edge, the night's deep-purple hard shadow (KObjectDepth's dark tint). Wren is her own
 snapshot (lib/bird-images), never a new drawing.
 */

/// The cards a report can have, in the order they come.
public enum KReportCard: String, Sendable, CaseIterable {
  case cover, stars, hour, words, punct, quote, end
}

/// One punctuation mark's share.
public struct KReportMark: Equatable, Sendable, Identifiable {
  public let mark: String
  public let pct: Int
  /// the bar's width, 6…100 (%)
  public let bar: Double

  public var id: String { mark }

  public init(mark: String, pct: Int, bar: Double) {
    self.mark = mark
    self.pct = pct
    self.bar = bar
  }
}

/// One star of the sky, in points on its square.
public struct KReportStar: Equatable, Sendable {
  public let x: CGFloat
  public let y: CGFloat
  public let big: Bool
  public let w: Double

  public init(x: CGFloat, y: CGFloat, big: Bool, w: Double) {
    self.x = x
    self.y = y
    self.big = big
    self.w = w
  }
}

/// The writer's constellation at one size (lib/constellation, worked out in TS).
public struct KReportSky: Equatable, Sendable {
  public var size: CGFloat = 150
  public var stars: [KReportStar] = []
  /// [star, the earlier star it hangs from], flattened in pairs
  public var links: [Int] = []

  public init(size: CGFloat = 150, stars: [KReportStar] = [], links: [Int] = []) {
    self.size = size
    self.stars = stars
    self.links = links
  }
}

public struct KVoiceReportContent: Equatable, Sendable {
  /// false until TS has built the report: nothing but the night and the close key
  public var loaded = false
  public var cards: [KReportCard] = []
  public var eyebrows: [KReportCard: String] = [:]
  public var archetype = ""
  public var chips: [String] = []
  public var written = ""
  public var brightestTitle = ""
  public var brightest = ""
  public var hourBand = ""
  public var hourLine = ""
  public var firstWord = ""
  public var otherWords = ""
  public var wordsLine = ""
  public var topMark = ""
  public var marks: [KReportMark] = []
  public var breathe = ""
  /// “the quote”
  public var quote = ""
  /// — Wren
  public var signature = ""
  public var brand = ""
  public var share = ""
  public var done = ""
  /// VoiceOver for the close key
  public var close = ""
  /// her snapshot under the quote, 44; nil while it is captured
  public var bird: KImageRef?
  /// the sky card's constellation (150) and the keepsake card's (110)
  public var sky = KReportSky()
  public var keepSky = KReportSky(size: 110)

  public init() {}
}

public final class KVoiceReportActions {
  /// the keepsake card's Share
  public var onShare: () -> Void = {}
  /// Done, and the close key
  public var onDone: () -> Void = {}

  public init() {}
}

/// The night's own colours (the React Native page's NIGHT, NIGHT2, STARLIGHT and DIM).
enum KReportNight {
  static let ground = Color(hex: "#1E1B2E")
  static let card = Color(hex: "#2A2450")
  static let starlight = Color(hex: "#B9B2FF")
  static let dim = Color(hex: "#B9B4D6")
  static let chipInk = Color(hex: "#CFC9F2")
  static let chipEdge = Color(red: 185 / 255, green: 178 / 255, blue: 1).opacity(0.45)
  static let bar = Color(hex: "#6D6DF6")
  static let brand = Color(hex: "#8C86E8")
  static let moon = Color(hex: "#F5D98F")
  static let farStar = Color(hex: "#4A4478")
  /// the constellation's inks (VoiceCard's ConstellationOverlay on a light ground, as the page draws it)
  static let starBig = Color(hex: "#6D6DF6")
  static let starSmall = Color(hex: "#9A93E8")
  static let gold = Color(hex: "#F0B95A")
}

public struct KVoiceReportScreen: View {
  private let content: KVoiceReportContent
  private let topInset: CGFloat
  private let bottomInset: CGFloat
  private let actions: KVoiceReportActions

  /// the card up now
  @State private var idx = 0
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  public init(content: KVoiceReportContent, topInset: CGFloat, bottomInset: CGFloat, actions: KVoiceReportActions) {
    self.content = content
    self.topInset = topInset
    self.bottomInset = bottomInset
    self.actions = actions
  }

  private var cards: [KReportCard] { content.loaded ? content.cards : [] }
  /// a new report can have fewer cards than the one before: never past the last
  private var shown: Int { min(idx, max(0, cards.count - 1)) }

  public var body: some View {
    GeometryReader { geo in
      ZStack(alignment: .topLeading) {
        VStack(spacing: 0) {
          Color.clear.frame(height: topInset)
          progress
            .padding(.horizontal, 18)
            .padding(.top, 8)
          ZStack {
            if let card = cards.indices.contains(shown) ? cards[shown] : nil {
              cardView(card)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .id(card)
                .transition(.asymmetric(insertion: .opacity, removal: .identity))
            }
          }
          .padding(.horizontal, 30)
          .padding(.bottom, 28 + bottomInset)
          // the first card fades in as the report arrives, as every card after it does
          .animation(reduceMotion ? nil : .easeOut(duration: 0.32), value: content.loaded)
        }
        closeKey
          .padding(.top, topInset + 20)
          .padding(.trailing, 12)
          .frame(maxWidth: .infinity, alignment: .topTrailing)
      }
      .frame(width: geo.size.width, height: geo.size.height)
      // the moon and the far stars: 400 wide whatever the phone, so they sit behind the page and
      // never widen it (React Native's Svg runs off a narrower screen's edge the same way)
      .background(alignment: .topLeading) {
        KReportFarSky()
          .padding(.top, topInset)
          .allowsHitTesting(false)
          .accessibilityHidden(true)
      }
      .clipped()
      // the story's two tap zones (left 30% back, right 55% on, from 90 under the status bar);
      // the cards' own keys and the close key take their taps first
      .contentShape(Rectangle())
      .onTapGesture(coordinateSpace: .local) { at in
        guard at.y >= topInset + 90 else { return }
        if at.x < geo.size.width * 0.30 { advance(-1) } else if at.x > geo.size.width * 0.45 { advance(1) }
      }
    }
    .background { KReportNight.ground.ignoresSafeArea() }
    .onChange(of: cards.count) { _, n in
      if idx >= n { idx = max(0, n - 1) }
    }
  }

  private func advance(_ dir: Int) {
    let next = shown + dir
    // the end card holds its own exits
    guard next >= 0, next < cards.count else { return }
    withAnimation(reduceMotion ? nil : .easeOut(duration: 0.32)) { idx = next }
  }

  // MARK: the chrome

  private var progress: some View {
    HStack(spacing: 5) {
      ForEach(Array(cards.enumerated()), id: \.element) { i, _ in
        RoundedRectangle(cornerRadius: 2, style: .circular)
          .fill(i <= shown ? Color.white : Color.white.opacity(0.22))
          .frame(height: 3)
      }
    }
    .frame(height: 3)
    .accessibilityElement()
    .accessibilityLabel(cards.indices.contains(shown) ? (content.eyebrows[cards[shown]] ?? "") : "")
    .accessibilityValue(cards.isEmpty ? "" : "\(shown + 1)/\(cards.count)")
    .accessibilityAdjustableAction { dir in
      switch dir {
      case .increment: advance(1)
      case .decrement: advance(-1)
      @unknown default: break
      }
    }
    .accessibilityHidden(cards.isEmpty)
  }

  private var closeKey: some View {
    SwiftUI.Button {
      actions.onDone()
    } label: {
      KLineIcon(.close, size: 20, lineWidth: 2.2, color: Color.white.opacity(0.75))
        .frame(width: 38, height: 38)
        .padding(3)
        .contentShape(Rectangle())
    }
    .buttonStyle(KFadePressStyle())
    .accessibilityLabel(content.close)
    .padding(-3)
  }

  // MARK: the cards

  private func eyebrow(_ card: KReportCard) -> some View {
    Text(content.eyebrows[card] ?? "")
      .kText(.mono(10, .semibold, tracking: 0.22))
      .foregroundStyle(KReportNight.starlight)
      .frame(maxWidth: .infinity, alignment: .leading)
      .accessibilityAddTraits(.isHeader)
  }

  @ViewBuilder
  private func cardView(_ card: KReportCard) -> some View {
    switch card {
    case .cover: cover
    case .stars: stars
    case .hour: hour
    case .words: words
    case .punct: punct
    case .quote: quote
    case .end: end
    }
  }

  private var cover: some View {
    VStack(alignment: .leading, spacing: 0) {
      eyebrow(.cover)
      Text(content.archetype)
        .kText(.system(30, .bold, lineHeight: 40.0 / 30.0))
        .foregroundStyle(Color.white)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 12)
      KMeFlowLayout(spacing: 7, lineSpacing: 7) {
        ForEach(Array(content.chips.enumerated()), id: \.offset) { _, chip in
          Text(chip)
            .kText(.system(11.5, .semibold))
            .foregroundStyle(KReportNight.chipInk)
            .padding(.horizontal, 11)
            .padding(.vertical, 5)
            .overlay(RoundedRectangle(cornerRadius: 13, style: .circular).strokeBorder(KReportNight.chipEdge, lineWidth: 1))
        }
      }
      .padding(.top, 16)
      Text(content.written)
        .kText(.system(13))
        .foregroundStyle(KReportNight.dim)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 16)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }

  private var stars: some View {
    VStack(spacing: 0) {
      eyebrow(.stars)
      KReportConstellation(sky: content.sky)
      Text(content.brightestTitle)
        .kText(.system(18, .bold))
        .foregroundStyle(Color.white)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 6)
      Text(content.brightest)
        .kText(.system(14, .semibold, lineHeight: 24.0 / 14.0))
        .foregroundStyle(KReportNight.starlight)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 10)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  private var hour: some View {
    VStack(alignment: .leading, spacing: 0) {
      eyebrow(.hour)
      Text(content.hourBand)
        .kText(.system(34, .bold))
        .foregroundStyle(Color.white)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 14)
      Text(content.hourLine)
        .kText(.content(15, italic: true, lineHeight: 23.0 / 15.0))
        .foregroundStyle(KReportNight.dim)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 12)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }

  private var words: some View {
    VStack(spacing: 0) {
      eyebrow(.words)
      Text(content.firstWord)
        .kText(.system(40, .bold))
        .foregroundStyle(Color.white)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 22)
      Text(content.otherWords)
        .kText(.content(16, italic: true, lineHeight: 26.0 / 16.0))
        .foregroundStyle(KReportNight.starlight)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 14)
      Text(content.wordsLine)
        .kText(.system(13))
        .foregroundStyle(KReportNight.dim)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 18)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  private var punct: some View {
    VStack(alignment: .leading, spacing: 0) {
      eyebrow(.punct)
      Text(content.topMark)
        .kText(.system(56, .bold))
        .foregroundStyle(Color.white)
        .padding(.top, 8)
        .accessibilityHidden(true)
      VStack(spacing: 10) {
        ForEach(content.marks) { m in
          HStack(spacing: 10) {
            Text(m.mark)
              .kText(.mono(15, .medium))
              .foregroundStyle(KReportNight.dim)
              .frame(width: 16, alignment: .leading)
            GeometryReader { g in
              ZStack(alignment: .leading) {
                Capsule().fill(KReportNight.card)
                Rectangle()
                  .fill(KReportNight.bar)
                  .frame(width: g.size.width * CGFloat(min(100, max(0, m.bar))) / 100)
              }
              .clipShape(RoundedRectangle(cornerRadius: 4, style: .circular))
            }
            .frame(height: 7)
            Text(verbatim: "\(m.pct)%")
              .kText(.mono(KMonoSizes.label(12), .semibold))
              .foregroundStyle(KReportNight.dim)
              .frame(width: 38, alignment: .trailing)
          }
          .accessibilityElement(children: .ignore)
          .accessibilityLabel("\(m.mark) \(m.pct)%")
        }
      }
      .padding(.top, 8)
      Text(content.breathe)
        .kText(.content(14.5, italic: true))
        .foregroundStyle(KReportNight.dim)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 18)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }

  private var quote: some View {
    VStack(alignment: .leading, spacing: 0) {
      eyebrow(.quote)
      Text(content.quote)
        .kText(.content(21, italic: true, lineHeight: 33.0 / 21.0))
        .foregroundStyle(Color.white)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.top, 16)
      Text(content.signature)
        .kText(.system(12))
        .foregroundStyle(KReportNight.starlight)
        .padding(.top, 14)
      KImage(content.bird, size: CGSize(width: 44, height: 44), contentMode: .fit, placeholder: .clear)
        .padding(.top, 26)
        .accessibilityHidden(true)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }

  private var end: some View {
    VStack(alignment: .leading, spacing: 0) {
      eyebrow(.end)
      VStack(alignment: .leading, spacing: 0) {
        Text(content.brand)
          .kText(.mono(9, .semibold, tracking: 0.2))
          .foregroundStyle(KReportNight.brand)
        Text(content.archetype)
          .kText(.system(20, .bold))
          .foregroundStyle(Color.white)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.top, 8)
        KReportConstellation(sky: content.keepSky)
        Text(content.quote)
          .kText(.content(13.5, italic: true, lineHeight: 20.0 / 13.5))
          .foregroundStyle(KReportNight.dim)
          .fixedSize(horizontal: false, vertical: true)
      }
      .padding(18)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(RoundedRectangle(cornerRadius: 18, style: .circular).fill(KReportNight.card))
      .kObjectDepth(RoundedRectangle(cornerRadius: 18, style: .circular), theme: .midnight)
      .accessibilityElement(children: .combine)
      .padding(.top, 14)
      HStack(spacing: 10) {
        SwiftUI.Button {
          actions.onShare()
        } label: {
          Text(content.share)
            .kText(.system(13.5, .bold))
            .foregroundStyle(Color.white)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .frame(maxWidth: .infinity, minHeight: 44)
            .overlay(RoundedRectangle(cornerRadius: 16, style: .circular).strokeBorder(Color.white.opacity(0.4), lineWidth: 1))
            .contentShape(RoundedRectangle(cornerRadius: 16, style: .circular))
        }
        .buttonStyle(KFadePressStyle())
        SwiftUI.Button {
          actions.onDone()
        } label: {
          Text(content.done)
            .kText(.system(13.5, .bold))
            .foregroundStyle(KReportNight.ground)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .frame(maxWidth: .infinity, minHeight: 44)
            .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(Color.white))
            .contentShape(RoundedRectangle(cornerRadius: 16, style: .circular))
        }
        .buttonStyle(KFadePressStyle())
      }
      .padding(.top, 16)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

/// The moon and a few fixed stars, 400 × 300 from the top-left under the status bar.
struct KReportFarSky: View {
  private static let farStars: [(CGFloat, CGFloat, CGFloat)] = [(40, 90, 1.6), (300, 40, 1.3), (240, 140, 1.8), (90, 210, 1.2), (340, 230, 1.5)]

  var body: some View {
    Canvas { ctx, _ in
      ctx.fill(Path(ellipseIn: CGRect(x: 352 - 13, y: 64 - 13, width: 26, height: 26)), with: .color(KReportNight.moon.opacity(0.85)))
      for (x, y, r) in Self.farStars {
        ctx.fill(Path(ellipseIn: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2)), with: .color(KReportNight.farStar))
      }
    }
    .frame(width: 400, height: 300)
  }
}

/// The writer's star-tree at its size: links, then the stars (the four-point big ones and the
/// dots), the second one gilded. VoiceCard's ConstellationOverlay, drawn from the same numbers.
struct KReportConstellation: View {
  let sky: KReportSky

  var body: some View {
    Canvas { ctx, _ in
      let pts = sky.stars
      var i = 0
      while i + 1 < sky.links.count {
        let a = sky.links[i], b = sky.links[i + 1]
        i += 2
        guard pts.indices.contains(a), pts.indices.contains(b) else { continue }
        var line = Path()
        line.move(to: CGPoint(x: pts[a].x, y: pts[a].y))
        line.addLine(to: CGPoint(x: pts[b].x, y: pts[b].y))
        ctx.stroke(line, with: .color(KReportNight.starBig.opacity(0.15)), lineWidth: 1)
      }
      for (n, p) in pts.enumerated() {
        let gilded = n == 1
        if p.big {
          var star = Path()
          star.move(to: CGPoint(x: p.x, y: p.y - 6))
          star.addQuadCurve(to: CGPoint(x: p.x + 6, y: p.y), control: CGPoint(x: p.x + 1.6, y: p.y - 1.6))
          star.addQuadCurve(to: CGPoint(x: p.x, y: p.y + 6), control: CGPoint(x: p.x + 1.6, y: p.y + 1.6))
          star.addQuadCurve(to: CGPoint(x: p.x - 6, y: p.y), control: CGPoint(x: p.x - 1.6, y: p.y + 1.6))
          star.addQuadCurve(to: CGPoint(x: p.x, y: p.y - 6), control: CGPoint(x: p.x - 1.6, y: p.y - 1.6))
          star.closeSubpath()
          ctx.fill(star, with: .color((gilded ? KReportNight.gold : KReportNight.starBig).opacity(0.55 + p.w * 0.45)))
        } else {
          let r = 1.6 + p.w * 1.6
          let ink = gilded ? KReportNight.gold : (n % 2 == 1 ? KReportNight.starSmall : KReportNight.starBig)
          ctx.fill(Path(ellipseIn: CGRect(x: p.x - r, y: p.y - r, width: r * 2, height: r * 2)), with: .color(ink.opacity(0.4 + p.w * 0.55)))
        }
      }
    }
    .frame(width: sky.size, height: sky.size)
    .accessibilityHidden(true)
  }
}
