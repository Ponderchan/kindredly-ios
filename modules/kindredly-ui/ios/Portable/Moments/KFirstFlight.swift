// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE FIRST FLIGHT, in SwiftUI (2026-10-27; behind the "firstflight" switch, off by default). The
 React Native flight (src/components/FirstFlight.tsx FirstFlightRN) stays the fallback. The seam
 between "let her go" and the first letter you read, as one shot, on one clock in seconds from
 `startAt` (src/components/first-flight-model: the board, the loop, her track, the envelope's,
 every curve — sent by TS, nothing re-derived here):

   1 · your letter folds itself in place and an envelope takes its place;
   2 · she picks it up and flies one loop of the route chart past the three stops, leaving a
       trail; the chart comes up as she leaves;
   3 · she comes home to the middle, larger, with three envelopes; the chart dims.

 The board is 390 × 844, scaled to the window by TS's `scale` and centred, on the ground colour.
 A tap anywhere skips it (TS's onSkip). STILL (`still`): the landed chart alone, dimmed — the
 ground screen 13 asks its question over: no title, no letter, no bird, no clock, no tap. Reduce
 Motion: the first frame, held (TS lands it at once, as React Native does).

 What stays React Native, as islands this moves (the adapter's KSlots): her ("bird": WrenBird at the
 hatchling's stage, in the caller's look, her mood TS's), and whatever the caller passes in place of
 the default title ("head"), the plain envelope ("envelope") and the line under the chart ("line").
 Wren is never redrawn here.

 Type (owner, 10-20): the title System; the words carried (your opener, the stops' first words)
 content, in the reader's Letter font's italic; the chart's labels SF Mono, at the chart's fixed
 size (they don't grow with the text size: at the accessibility sizes they ran over each other);
 TAP TO SKIP System, growing to 1.35× at most. Rule B: the letter and the envelopes are objects —
 no ink edge, a faint hairline, the deep purple hard shadow (kObjectDepth), the flap a soft purple
 line. The stops' pale gold and their squares keep their own colours.

 VoiceOver: the title is a header (a caller's head island speaks for itself), TAP TO SKIP is a
 button that skips; the chart, the letter and the envelopes are pictures and are hidden.
 */

/// The flight's colours (TS: the theme's, or the new onboarding's own day colours).
public struct KFirstFlightColors: Equatable {
  /// the ground under the board
  public var ground: Color
  /// type on the chart and the title
  public var ink: Color
  /// the quieter type (the stops' words, the title's label)
  public var sub: Color
  /// the faintest type (TAP TO SKIP, the chart's footnote, CARRIED BY)
  public var faint: Color
  /// the chart's lines and every ring
  public var line: Color
  /// the letter's and the envelopes' face, and your city's ring
  public var card: Color
  /// the trail and the envelopes' stamp squares
  public var pen: Color
  /// the stops' squares
  public var post: Color

  public init(ground: Color, ink: Color, sub: Color, faint: Color, line: Color, card: Color, pen: Color, post: Color) {
    self.ground = ground
    self.ink = ink
    self.sub = sub
    self.faint = faint
    self.line = line
    self.card = card
    self.pen = pen
    self.post = post
  }
}

/// One value on the clock: at t[i] seconds it is v[i] (Reanimated's interpolate, clamped).
public struct KFirstFlightCurve: Equatable, Sendable {
  public var t: [Double]
  public var v: [Double]

  public init(t: [Double], v: [Double]) {
    self.t = t
    self.v = v
  }

  func at(_ s: Double) -> Double { KMomentClock.interpolate(s, t, v) }
}

/// Every value on the clock that isn't a place (first-flight-model FLIGHT_CURVES and TRAIL).
public struct KFirstFlightCurves: Equatable, Sendable {
  public var cardFold = KFirstFlightCurve(t: [0.05, 0.55], v: [1, 0.04])
  public var cardFade = KFirstFlightCurve(t: [0.5, 0.6], v: [1, 0])
  public var envFade = KFirstFlightCurve(t: [0.3, 0.55, 2.5, 2.65], v: [0, 1, 1, 0])
  public var envScale = KFirstFlightCurve(t: [0.3, 0.6, 0.8, 1.05], v: [0.6, 1, 1, 0.5])
  public var envTurn = KFirstFlightCurve(t: [0.8, 1.05], v: [0, -12])
  public var title = KFirstFlightCurve(t: [0.6, 1.0], v: [1, 0.18])
  public var chart = KFirstFlightCurve(t: [0.55, 0.9, 2.7, 3.0], v: [0, 1, 1, 0.35])
  public var birdScale = KFirstFlightCurve(t: [0, 0.8, 1.1, 2.6, 2.9], v: [1, 1, 0.78, 0.78, 1.5])
  public var birdTurn = KFirstFlightCurve(t: [0.75, 1.05, 2.35, 2.6], v: [0, -16, -16, 0])
  public var trayFade = KFirstFlightCurve(t: [2.55, 2.85], v: [0, 1])
  public var trayRise = KFirstFlightCurve(t: [2.55, 2.9], v: [24, 0])
  /// a trail dot: from `lead` before she passes to `peak` as she does, held to `hold`, `end` by the end
  public var trailLead: Double = 0.02
  public var trailPeak: Double = 0.7
  public var trailHold: Double = 2.9
  public var trailEnd: Double = 0.3

  public init() {}
}

/// A place on the clock: at t[i] seconds it is at (x[i], y[i]).
public struct KFirstFlightTrack: Equatable, Sendable {
  public var t: [Double]
  public var x: [Double]
  public var y: [Double]

  public init(t: [Double], x: [Double], y: [Double]) {
    self.t = t
    self.x = x
    self.y = y
  }

  func at(_ s: Double) -> CGPoint {
    CGPoint(x: KMomentClock.interpolate(s, t, x), y: KMomentClock.interpolate(s, t, y))
  }
}

/// A point of the loop and when she passes it (seconds): the trail.
public struct KFirstFlightPoint: Equatable, Sendable {
  public var x: CGFloat
  public var y: CGFloat
  public var at: Double

  public init(x: CGFloat, y: CGFloat, at: Double) {
    self.x = x
    self.y = y
    self.at = at
  }
}

/// A stop on the chart: its label (the letter's #stamp, or STOP n) and the letter's first words.
public struct KFirstFlightStop: Equatable, Sendable {
  public var label: String
  /// "" for none; drawn with "…" after it
  public var words: String

  public init(label: String, words: String) {
    self.label = label
    self.words = words
  }
}

/// Everything the flight shows: every word, place and time is TS's.
public struct KFirstFlightContent: Equatable {
  public var startAt: Date
  /// the landed chart alone, dimmed
  public var still: Bool
  /// the board's scale to the window (min of width / 390 and height / 844)
  public var scale: CGFloat
  /// the flight's length, seconds
  public var total: Double
  public var colors: KFirstFlightColors
  /// the caller's own title block (the "head" island) in place of the default one
  public var hasHead: Bool
  /// the default title: "{name}'s first" and, in italic, "flight." and the label under it
  public var title: String
  public var titleEm: String
  public var sub: String
  /// your letter's opening, and how many lines it may take (the Letter font's fit)
  public var opener: String
  public var openerLines: Int
  /// CARRIED BY OTIS
  public var carried: String
  public var yourCity: String
  /// the chart's footnote
  public var chart: String
  public var skip: String
  public var stops: [KFirstFlightStop]
  /// the stops' words' size (the Letter font's fit of 11)
  public var stopWordsSize: CGFloat
  /// the loop, as SVG path data on the board
  public var loop: String
  public var home: CGPoint
  public var stopPoints: [CGPoint]
  public var trail: [KFirstFlightPoint]
  public var curves: KFirstFlightCurves
  /// her centre
  public var bird: KFirstFlightTrack
  /// the envelope's top-left corner
  public var envelope: KFirstFlightTrack
  public var envelopeSize: CGSize
  /// the caller's own envelope (the "envelope" island) in place of the plain one
  public var hasEnvelope: Bool
  /// a line under the chart (the "line" island)
  public var hasLine: Bool

  public init(
    startAt: Date, still: Bool, scale: CGFloat, total: Double, colors: KFirstFlightColors,
    hasHead: Bool, title: String, titleEm: String, sub: String,
    opener: String, openerLines: Int, carried: String,
    yourCity: String, chart: String, skip: String,
    stops: [KFirstFlightStop], stopWordsSize: CGFloat,
    loop: String, home: CGPoint, stopPoints: [CGPoint], trail: [KFirstFlightPoint],
    curves: KFirstFlightCurves, bird: KFirstFlightTrack, envelope: KFirstFlightTrack, envelopeSize: CGSize,
    hasEnvelope: Bool, hasLine: Bool
  ) {
    self.startAt = startAt
    self.still = still
    self.scale = scale
    self.total = total
    self.colors = colors
    self.hasHead = hasHead
    self.title = title
    self.titleEm = titleEm
    self.sub = sub
    self.opener = opener
    self.openerLines = openerLines
    self.carried = carried
    self.yourCity = yourCity
    self.chart = chart
    self.skip = skip
    self.stops = stops
    self.stopWordsSize = stopWordsSize
    self.loop = loop
    self.home = home
    self.stopPoints = stopPoints
    self.trail = trail
    self.curves = curves
    self.bird = bird
    self.envelope = envelope
    self.envelopeSize = envelopeSize
    self.hasEnvelope = hasEnvelope
    self.hasLine = hasLine
  }
}

public struct KFirstFlight<Slot: View>: View {
  private let theme: KTheme
  private let content: KFirstFlightContent
  private let onSkip: () -> Void
  private let slot: (String) -> Slot

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// she has landed: the clock stops on the last frame
  @State private var landed = false

  /// the board, in points
  static var board: CGSize { CGSize(width: 390, height: 844) }

  /// - Parameters:
  ///   - onSkip: a tap anywhere (or VoiceOver's TAP TO SKIP); never while `still`
  ///   - slot: an island by name: "bird", "head", "envelope", "line"
  public init(theme: KTheme, content: KFirstFlightContent, onSkip: @escaping () -> Void, slot: @escaping (String) -> Slot) {
    self.theme = theme
    self.content = content
    self.onSkip = onSkip
    self.slot = slot
  }

  public var body: some View {
    ZStack {
      content.colors.ground
        .ignoresSafeArea()
        .accessibilityHidden(true)
      if content.still {
        board(content.total)
          .allowsHitTesting(false)
      } else {
        TimelineView(.animation(minimumInterval: nil, paused: landed || reduceMotion)) { tl in
          board(reduceMotion ? 0 : landed ? content.total : max(0, tl.date.timeIntervalSince(content.startAt)))
        }
        .contentShape(Rectangle())
        .onTapGesture { onSkip() }
      }
    }
    .ignoresSafeArea()
    .task(id: content.startAt) {
      landed = false
      guard !content.still else { return }
      let left = content.total - Date().timeIntervalSince(content.startAt)
      if left > 0 { try? await Task.sleep(for: .seconds(left)) }
      if Task.isCancelled { return }
      landed = true
    }
  }

  // MARK: the board at `s` seconds

  @ViewBuilder
  private func board(_ s: Double) -> some View {
    let w = Self.board.width
    let h = Self.board.height
    let c = content.curves
    ZStack(alignment: .topLeading) {
      KFirstFlightChart(theme: theme, content: content)
        .equatable()
        .opacity(c.chart.at(s))
      trail(s)
      if !content.still {
        moving(s)
      }
    }
    .frame(width: w, height: h, alignment: .topLeading)
    .scaleEffect(content.scale)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .accessibilityElement(children: .contain)
  }

  /// the trail she leaves: a dot at every point she has passed
  private func trail(_ s: Double) -> some View {
    let c = content.curves
    let pen = content.colors.pen
    let points = content.trail
    let total = content.total
    return Canvas { gc, _ in
      for p in points {
        let a = KMomentClock.interpolate(s, [p.at - c.trailLead, p.at, c.trailHold, total], [0, c.trailPeak, c.trailPeak, c.trailEnd])
        guard a > 0 else { continue }
        gc.fill(Path(ellipseIn: CGRect(x: p.x - 2.2, y: p.y - 2.2, width: 4.4, height: 4.4)), with: .color(pen.opacity(a)))
      }
    }
    .frame(width: Self.board.width, height: Self.board.height)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }

  /// everything but the chart and the trail, in React Native's order (each over the last)
  @ViewBuilder
  private func moving(_ s: Double) -> some View {
    let c = content.curves
    let colors = content.colors
    let h = Self.board.height

    // the title of the moment, stepping back once she's gone
    Group {
      if content.hasHead {
        slot("head")
      } else {
        defaultTitle
      }
    }
    .frame(width: Self.board.width, alignment: .top)
    .opacity(c.title.at(s))
    .offset(y: 96)

    // 1 · the letter, folding
    let fold = c.cardFold.at(s)
    letter
      .scaleEffect(x: 1, y: fold, anchor: .center)
      .opacity(c.cardFade.at(s))
      .offset(x: 52, y: 300 - 70 * (1 - fold))
      .accessibilityHidden(true)

    // the envelope appears where the letter folded, then rides under her
    let env = content.envelopeSize
    let corner = content.envelope.at(s)
    Group {
      if content.hasEnvelope {
        slot("envelope")
      } else {
        plainEnvelope
      }
    }
    .frame(width: env.width, height: env.height, alignment: .topLeading)
    .scaleEffect(c.envScale.at(s))
    .rotationEffect(.degrees(c.envTurn.at(s)))
    .opacity(c.envFade.at(s))
    .offset(x: corner.x, y: corner.y)
    .accessibilityHidden(true)

    // 3 · what she brings back
    tray
      .opacity(c.trayFade.at(s))
      .offset(x: 70, y: 440 + c.trayRise.at(s))
      .accessibilityHidden(true)

    // her
    let at = content.bird.at(s)
    slot("bird")
      .frame(width: 90, height: 90)
      .scaleEffect(c.birdScale.at(s))
      .rotationEffect(.degrees(c.birdTurn.at(s)))
      .offset(x: at.x - 45, y: at.y - 45)

    // the caller's line under the chart, its foot 98 over the board's bottom
    if content.hasLine {
      slot("line")
        .frame(width: Self.board.width - 48)
        .frame(width: Self.board.width, height: h - 98, alignment: .bottom)
    }

    Text(content.skip)
      .kText(.system(12, .medium, tracking: 0.4 / 12))
      .foregroundStyle(colors.faint)
      .multilineTextAlignment(.center)
      .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
      .frame(width: Self.board.width)
      .frame(height: h - 22, alignment: .bottom)
      .accessibilityAddTraits(.isButton)
      .accessibilityAction { onSkip() }
  }

  /// "Otis's first flight." over YOUR LETTER, IN THE POST
  private var defaultTitle: some View {
    VStack(spacing: 0) {
      (Text(content.title) + Text(" ") + Text(content.titleEm).italic())
        .kText(.system(30, .bold, tracking: -0.5 / 30))
        .foregroundStyle(content.colors.ink)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityAddTraits(.isHeader)
      Text(content.sub)
        .kText(.mono(10, .semibold, tracking: 0.16))
        .foregroundStyle(content.colors.sub)
        .multilineTextAlignment(.center)
        .padding(.top, 10)
    }
  }

  /// your letter: its opening in the Letter font's italic, CARRIED BY under it
  private var letter: some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(content.opener)
        .kText(.content(15, italic: true, lineHeight: 22.0 / 15))
        .foregroundStyle(content.colors.ink)
        .lineLimit(max(1, content.openerLines))
        .fixedSize(horizontal: false, vertical: true)
      Text(content.carried)
        .kText(.mono(8.5, .semibold, tracking: 1.4 / 8.5))
        .foregroundStyle(content.colors.faint)
        .padding(.top, 8)
    }
    .padding(.horizontal, 18)
    .padding(.vertical, 14)
    .frame(width: 286, alignment: .leading)
    .background(paper)
  }

  /// the plain envelope she carries out (120 × 80)
  private var plainEnvelope: some View {
    envelope(width: 120, height: 80, flapTip: 44, square: CGRect(x: 120 - 9 - 20, y: 7, width: 20, height: 18))
  }

  /// the three she brings back, fanned
  private var tray: some View {
    ZStack(alignment: .topLeading) {
      ForEach(Array([-14.0, -2.0, 10.0].enumerated()), id: \.offset) { i, r in
        envelope(width: 150, height: 99, flapTip: 54, square: CGRect(x: 150 - 11 - 22, y: 8, width: 22, height: 20))
          .rotationEffect(.degrees(r))
          .offset(x: CGFloat(i) * 50, y: i == 1 ? 10 : 0)
      }
    }
    .frame(width: 250, height: 120, alignment: .topLeading)
  }

  private func envelope(width: CGFloat, height: CGFloat, flapTip: CGFloat, square: CGRect) -> some View {
    ZStack(alignment: .topLeading) {
      paper
      Path { p in
        p.move(to: CGPoint(x: 2, y: 2))
        p.addLine(to: CGPoint(x: width / 2, y: flapTip))
        p.addLine(to: CGPoint(x: width - 2, y: 2))
      }
      .stroke(KObjectDepth.color(for: theme), style: StrokeStyle(lineWidth: 1.8, lineJoin: .round))
      Rectangle()
        .fill(content.colors.pen)
        .frame(width: square.width, height: square.height)
        .offset(x: square.minX, y: square.minY)
    }
    .frame(width: width, height: height, alignment: .topLeading)
  }

  /// a letter's or an envelope's face: the card colour, a faint hairline (not ink, so overlapping
  /// envelopes stay apart), and the deep purple hard shadow
  private var paper: some View {
    let shape = RoundedRectangle(cornerRadius: 3, style: .circular)
    return shape
      .fill(content.colors.card)
      .overlay(shape.strokeBorder(theme.isDark ? Color.white.opacity(0.12) : Color(hex: "#1E1B35").opacity(0.10), lineWidth: 1))
      .kObjectDepth(theme, offset: KObjectDepth.offset, radius: 3)
  }
}

/// The route chart: the grid, the meridians, the loop, the four stops and their labels. Fixed: it
/// only fades, so it is drawn once and compared, not redrawn every frame.
struct KFirstFlightChart: View, Equatable {
  let theme: KTheme
  let content: KFirstFlightContent

  static func == (a: Self, b: Self) -> Bool {
    a.theme == b.theme
      && a.content.colors == b.content.colors
      && a.content.loop == b.content.loop
      && a.content.home == b.content.home
      && a.content.stopPoints == b.content.stopPoints
      && a.content.stops == b.content.stops
      && a.content.stopWordsSize == b.content.stopWordsSize
      && a.content.yourCity == b.content.yourCity
      && a.content.chart == b.content.chart
  }

  /// the stops' pale gold (your city's ring is the card colour)
  private static let stopFill = Color(hex: "#FFF3C4")

  var body: some View {
    let w: CGFloat = 390
    let h: CGFloat = 844
    let colors = content.colors
    let loop = KSVGPath.path(content.loop)
    let rings = [content.home] + content.stopPoints
    ZStack(alignment: .topLeading) {
      Canvas { gc, _ in
        var grid = Path()
        for i in 0..<16 {
          let x = CGFloat(i) * 26
          grid.move(to: CGPoint(x: x, y: 0))
          grid.addLine(to: CGPoint(x: x, y: h))
        }
        for i in 0..<33 {
          let y = CGFloat(i) * 26
          grid.move(to: CGPoint(x: 0, y: y))
          grid.addLine(to: CGPoint(x: w, y: y))
        }
        gc.stroke(grid, with: .color(colors.line.opacity(0.06)), lineWidth: 1)
        var meridians = Path()
        for y in [180.0, 330.0, 480.0, 630.0] as [CGFloat] {
          meridians.move(to: CGPoint(x: 0, y: y))
          meridians.addQuadCurve(to: CGPoint(x: w, y: y), control: CGPoint(x: w / 2, y: y - 26))
        }
        gc.stroke(meridians, with: .color(colors.line.opacity(0.16)), style: StrokeStyle(lineWidth: 1, dash: [4, 6]))
        gc.stroke(loop, with: .color(colors.line.opacity(0.14)), lineWidth: 1)
        for (i, p) in rings.enumerated() {
          let outer = Path(ellipseIn: CGRect(x: p.x - 16, y: p.y - 16, width: 32, height: 32))
          gc.fill(outer, with: .color(i == 0 ? colors.card : Self.stopFill))
          gc.stroke(outer, with: .color(colors.line), lineWidth: 1.5)
          let inner = Path(ellipseIn: CGRect(x: p.x - 10, y: p.y - 10, width: 20, height: 20))
          gc.stroke(inner, with: .color(colors.line.opacity(0.7)), style: StrokeStyle(lineWidth: 0.8, dash: [1.5, 2.5]))
          gc.fill(Path(CGRect(x: p.x - 3, y: p.y - 3, width: 6, height: 6)), with: .color(i == 0 ? colors.line : colors.post))
        }
      }
      .frame(width: w, height: h)

      Text(content.yourCity)
        .font(.system(size: 9, weight: .semibold, design: .monospaced))
        .tracking(1.4)
        .foregroundStyle(colors.ink)
        .fixedSize()
        .offset(x: 40, y: 664)

      ForEach(Array(zip(content.stopPoints.indices, content.stopPoints)), id: \.0) { i, p in
        let stop = i < content.stops.count ? content.stops[i] : KFirstFlightStop(label: "", words: "")
        VStack(spacing: 0) {
          Text(stop.label)
            .font(.system(size: 9, weight: .semibold, design: .monospaced))
            .tracking(1.2)
            .foregroundStyle(colors.ink)
            .lineLimit(1)
          if !stop.words.isEmpty {
            Text(stop.words + "…")
              .kText(.content(content.stopWordsSize, italic: true))
              .foregroundStyle(colors.sub)
              .lineLimit(1)
              .padding(.top, 2)
          }
        }
        .frame(width: 140)
        .offset(x: p.x - 70, y: p.y + 22)
      }

      Text(content.chart)
        .font(.system(size: 9, weight: .regular, design: .monospaced))
        .tracking(1.6)
        .foregroundStyle(colors.faint)
        .fixedSize()
        .offset(x: 20, y: 756)
    }
    .frame(width: w, height: h, alignment: .topLeading)
    // drawn at the chart's fixed geometry: the labels never grow past the default size
    .dynamicTypeSize(...DynamicTypeSize.large)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}
