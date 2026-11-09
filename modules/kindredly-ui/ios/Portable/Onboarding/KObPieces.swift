// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE RUN'S LAST FOUR PIECES IN SWIFT (2026-11-09, batch 3 slice 2). Until now four things on the
 Swift onboarding were React Native islands; each can now be drawn here, behind its own switch
 (app_surfaces "obroutebird", "obchick", "obflight", "hatch", all off by default). With a switch
 off — or the run's pictures not yet captured — TS sends no piece and the island is placed exactly
 as before (KOnboardingScreen).

 Wren is never redrawn: every bird here is a picture captured from the real WrenBird /
 HatchlingRig by TS (screens/onboarding/ob-pieces.tsx), in the RUN's look — the hatchling the
 read made of your letter, the birthmark of the shell you picked, Sky and bare — never the look
 the phone's account has on. The motion is SwiftUI's, on those pictures.

 - route  Wren flying on the doorstep's slide 2 (s01-showcase, WrenBird 50 fly): the snapshot
          bird-images "obRoute" in the island's place; KObSlide2 already flies and turns her.
 - chick  the named chick (screens/s10-chick Chick) on 10, 11 and 13: KObSnapChick, below.
 - flight the first flight on 12 and, landed and still, behind 13: KFirstFlight (Moments) drawn by
          the run, with its four slots filled here — her (the chick's pictures at the flight's
          90), S12Flight's head and line, and YOUR envelope front (KObEnvelopeFront, as on 8)
          instead of the React Native EnvelopeFront. KObFlightStage, below.
 - hatch  the hatch on 9 (components/HatchStage, burst "flood"): KObHatchStage
          (KObHatchStage.swift), the egg and shards as Paths, the hatchling as the rig's parts.
 */

/// The four pieces: each nil (or empty) while TS keeps its island.
public struct KObPieces: Equatable, Sendable {
  /// slide 2's flying Wren (bird-images "obRoute"); nil keeps the "routeBird" island
  public var route: KImageRef?
  /// the run's hatchling, whole (WrenBird stage hatch at 104), by mood: the chick's and the flight's
  public var birds: [String: KImageRef] = [:]
  public var chick: KObChickPiece?
  public var flight: KObFlightPiece?
  public var hatch: KObHatchPiece?
  public init() {}

  /// her picture for `mood`: that face, else her resting one, else content
  func bird(_ mood: String, rest: String = "content") -> KImageRef? {
    birds[mood] ?? birds[rest] ?? birds["content"]
  }
}

/// The named chick (Chick's props, as OnboardingNative passes them).
public struct KObChickPiece: Equatable, Sendable {
  /// her face at rest (the read's; delight on 13)
  public var mood = "content"
  /// the name tag round her neck (10), in capitals; "" for none
  public var tag = ""
  /// VoiceOver: "Your courier" or "Your courier, Otis"
  public var a11y = ""
  /// bumped by TS to make her react: typing (chirp), a pronoun (tilt), the dice or a chip (happy)
  public var nudge = 0
  /// chirp | tilt | happy
  public var nudgeRe = "chirp"
  public init() {}
}

/// The first flight as the run flies it (S12Flight through FirstFlight; still behind 13).
public struct KObFlightPiece: Equatable, Sendable {
  public var startAt = Date()
  public var still = false
  /// her face on the clock (curious, content once she's off, delight as she lands)
  public var mood = "curious"
  /// the reader's theme key (the envelopes' depth reads it, as FirstFlightRN's objectDepth does)
  public var theme = "classic"
  /// S12Flight's head: "Otis's first flight." and its label
  public var head = ""
  public var sub = ""
  /// the line under the chart ("" for none) and how many lines it may take
  public var line = ""
  public var lineLines = 2
  /// the stamp in your envelope's corner
  public var stamp = ""
  public var opener = ""
  public var openerLines = 3
  public var carried = ""
  public var yourCity = ""
  public var chart = ""
  public var skip = ""
  public var stops: [KFirstFlightStop] = []
  public var stopWordsSize: CGFloat = 11
  public var loop = ""
  public var home: CGPoint = .zero
  public var stopPoints: [CGPoint] = []
  public var trail: [KFirstFlightPoint] = []
  public var curves = KFirstFlightCurves()
  public var bird = KFirstFlightTrack(t: [0], x: [0], y: [0])
  public var envelope = KFirstFlightTrack(t: [0], x: [0], y: [0])
  /// the envelope's box on the board (S12Flight CARRY_W 152, with room for its depth)
  public var envelopeSize = CGSize(width: 156, height: 98)
  public var total: Double = 3.05
  public init() {}
}

/// One idle motion (chick-motions): its weight in the draw, its length and its face ("" keeps hers).
public struct KObMotionRow: Equatable, Sendable {
  public var m: String
  public var w: Double
  public var s: Double
  public var face: String
  public init(m: String, w: Double, s: Double, face: String) {
    self.m = m
    self.w = w
    self.s = s
    self.face = face
  }
}

/// The hatch on 9: the rig's pictures and what the read decided.
public struct KObHatchPiece: Equatable, Sendable {
  /// the rig's parts at rest: tail, farWing, legL, base, nearWing (HatchlingPart at 148)
  public var layers: [String: KImageRef] = [:]
  /// the face part, by mood
  public var faces: [String: KImageRef] = [:]
  /// her face at rest (the read's)
  public var mood = "content"
  /// the words thrown out of the burst (HatchStage tokens)
  public var words: [String] = []
  /// her first word ("" for none: she just chirps)
  public var quote = ""
  /// what she does on her own once she's out
  public var motions: [KObMotionRow] = []
  /// bumped by TS as the key goes: she hops
  public var celebrate = 0
  /// a dark theme: the egg's shadow is black at .35 (EggShell eggShadow)
  public var shadowDark = false
  public init() {}
}

// MARK: - a value on Reanimated's clock

/// One animated value as Reanimated drives it: a sequence of timings, springs (from rest, with
/// Reanimated's default mass and rest thresholds, so a spring followed by more takes as long as
/// it does there) and waits, started from wherever the value is. Times are seconds on the
/// owner's clock.
struct KObTrack {
  enum Ease {
    case inOutQuad
    case outQuad
    case outBack(Double)

    func at(_ x: Double) -> Double {
      switch self {
      case .inOutQuad: return KObEase.inOutQuad(x)
      case .outQuad: return KObEase.outQuad(x)
      case .outBack(let s): return KObEase.outBack(x, s)
      }
    }
  }

  enum Step {
    /// withTiming(to, { duration }) with this easing (Reanimated's default is in-out quad)
    case to(Double, Double, Ease)
    /// withSpring(to, { stiffness, damping })
    case spring(Double, Double, Double)
    /// withDelay's wait
    case wait(Double)
  }

  private var start: Double = 0
  private var from: Double
  private var steps: [Step] = []
  /// each step's length and the value it starts from, worked out once when the sequence starts
  private var lengths: [Double] = []
  private var starts: [Double] = []

  init(_ value: Double = 0) {
    from = value
  }

  /// Start `steps` at `t`, from the value it has then.
  mutating func run(_ t: Double, _ steps: [Step]) {
    let v0 = value(t)
    start = t
    from = v0
    self.steps = steps
    lengths = []
    starts = []
    var v = v0
    for s in steps {
      starts.append(v)
      switch s {
      case let .to(target, d, _):
        lengths.append(max(0.0001, d))
        v = target
      case let .spring(target, k, c):
        lengths.append(Self.settle(v - target, k, c))
        v = target
      case let .wait(d):
        lengths.append(max(0, d))
      }
    }
  }

  func value(_ t: Double) -> Double {
    var c = start
    var v = from
    for (i, s) in steps.enumerated() {
      let len = lengths[i]
      let local = t - c
      switch s {
      case let .to(target, _, ease):
        if local < len { return starts[i] + (target - starts[i]) * ease.at(max(0, local) / len) }
        v = target
      case let .spring(target, k, damping):
        if local < len { return target + Self.spring(starts[i] - target, k, damping, max(0, local)).x }
        v = target
      case .wait:
        if local < len { return v }
      }
      c += len
    }
    return v
  }

  /// A spring released at rest `d0` from its target, `tau` seconds on (mass 1): (offset, speed).
  static func spring(_ d0: Double, _ k: Double, _ damping: Double, _ tau: Double) -> (x: Double, v: Double) {
    let w0 = sqrt(k)
    let zeta = damping / (2 * w0)
    if zeta < 1 {
      let a = zeta * w0
      let wd = w0 * sqrt(1 - zeta * zeta)
      let e = exp(-a * tau)
      return (d0 * e * (cos(wd * tau) + a / wd * sin(wd * tau)), -d0 * e * (w0 * w0 / wd) * sin(wd * tau))
    }
    let e = exp(-w0 * tau)
    return (d0 * (1 + w0 * tau) * e, -d0 * w0 * w0 * tau * e)
  }

  /// When Reanimated calls the spring done: within 0.01 of its target and slower than 2 a second.
  static func settle(_ d0: Double, _ k: Double, _ damping: Double) -> Double {
    if abs(d0) < 0.01 { return 0.0001 }
    var tau = 0.0
    while tau < 4 {
      tau += 1.0 / 120
      let s = spring(d0, k, damping, tau)
      if abs(s.x) < 0.01 && abs(s.v) < 2 { return tau }
    }
    return 4
  }
}

/// Reanimated's withRepeat(withSequence(to 1, to 0), -1) breath at 1700 ms each way, in-out quad.
enum KObBreath {
  static func at(_ t: Double) -> Double {
    let phase = t.truncatingRemainder(dividingBy: 3.4)
    return phase < 1.7 ? KObEase.inOutQuad(phase / 1.7) : 1 - KObEase.inOutQuad((phase - 1.7) / 1.7)
  }
}

/// Pictures drawn once, unseen, at the size they will be shown: a face that changes is then
/// already in KImage's memory and swaps on the same frame instead of fading in.
struct KObWarmPictures: View {
  let refs: [KImageRef]
  let size: CGFloat

  var body: some View {
    ZStack {
      ForEach(refs, id: \.self) { r in
        KImage(r, size: CGSize(width: size, height: size), contentMode: .fit, placeholder: .clear)
      }
    }
    .opacity(0)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

// MARK: - the named chick

/// The chick's motion, held as one object for the view's life (its tracks run on its own clock).
final class KObChickMotion {
  let born = Date()
  var squish = KObTrack()
  var tilt = KObTrack()
  var spark = KObTrack()
  var swing = KObTrack()

  func now(_ d: Date = Date()) -> Double { d.timeIntervalSince(born) }
}

/*
 THE NAMED CHICK (screens/s10-chick Chick), from the run's own pictures. Out of its shell and
 standing on Shell: it breathes, and it ANSWERS — a letter typed into its name makes it chirp (a
 squish and a ♪), a pronoun makes it tilt its head, the dice or a chip makes it happy (a hop), and
 a finger on it gets a reaction of its own (a hop, the next face in delight · curious · wink ·
 happy, a ♪). On 10 its name fills in on a tag; 11's envelope is drawn by the run over it. Reduce
 Motion: no breath, no hop, no tilt, no swing; the faces and the ♪ still change. Every timing and
 spring is the React Native chick's.
 */
struct KObSnapChick: View {
  let piece: KObChickPiece
  let pieces: KObPieces
  /// the chick's size (the box is 1.6 × 1.12 of it)
  let size: CGFloat

  @Environment(\.accessibilityReduceMotion) private var reduce
  @State private var motion = KObChickMotion()
  @State private var said: String?
  @State private var saidTurn = 0
  @State private var pokes = 0
  /// the nudge count TS sent first: only a change from it is a nudge
  @State private var firstNudge: Int?

  private static let pokeFaces = ["delight", "curious", "wink", "happy"]
  /// the pictures' size (ob-pieces-model CHICK_SHOT)
  static let shot: CGFloat = 104

  private var face: String {
    switch said {
    case "chirp": return "listen"
    case "tilt": return "curious"
    case "happy": return "happy"
    default: return pokes > 0 ? Self.pokeFaces[(pokes - 1) % Self.pokeFaces.count] : piece.mood
    }
  }

  var body: some View {
    TimelineView(.animation) { tl in
      let t = motion.now(tl.date)
      let air = reduce ? 0 : KObBreath.at(t)
      let squish = motion.squish.value(t)
      let spark = motion.spark.value(t)
      ZStack(alignment: .bottom) {
        Text(verbatim: "♪")
          .font(.system(size: 18))
          .foregroundStyle(KOb.blue)
          .scaleEffect(0.6 + spark * 0.5)
          .offset(y: -spark * 16)
          .opacity(spark)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
          .padding(.leading, size * 0.32)

        // drawn at the capture's size and scaled, so the keyboard resizing her (104 → 64) never
        // asks KImage for a new size (a blank frame while it loads)
        KImage(pieces.bird(face, rest: piece.mood), size: CGSize(width: Self.shot, height: Self.shot), contentMode: .fit, placeholder: .clear)
          .scaleEffect(size / Self.shot)
          .frame(width: size, height: size)
          .rotationEffect(.degrees(motion.tilt.value(t)))
          .scaleEffect(x: 1 - squish * 0.12 + air * 0.01, y: 1 + squish * 0.16 + air * 0.015)
          .offset(y: -air * 2.5 - squish * 14)

        if !piece.tag.isEmpty {
          tag(swing: motion.swing.value(t))
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
            .padding(.trailing, size * 0.1)
            .padding(.bottom, size * 0.06)
            .transition(.scale(scale: 0.01))
        }
      }
    }
    .frame(width: size * 1.6, height: size * 1.12)
    .background(alignment: .bottom) { KObWarmPictures(refs: Array(pieces.birds.values), size: Self.shot) }
    .animation(.easeOut(duration: 0.22), value: piece.tag.isEmpty)
    .contentShape(Rectangle().inset(by: -10))
    .onTapGesture { poke() }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(piece.a11y)
    .accessibilityAddTraits(.isImage)
    .onChange(of: piece.nudge, initial: true) { _, n in
      if firstNudge == nil {
        firstNudge = n
        return
      }
      nudged(piece.nudgeRe)
    }
  }

  private func tag(swing: Double) -> some View {
    let box = RoundedRectangle(cornerRadius: 6, style: .continuous)
    return Text(piece.tag)
      .kText(.mono(11, .semibold, tracking: 1.2 / 11))
      .foregroundStyle(KOb.ink)
      .lineLimit(1)
      .padding(.horizontal, 8)
      .padding(.vertical, 3)
      .background(box.fill(KOb.acid))
      .overlay(box.strokeBorder(KOb.ink, lineWidth: 2.5))
      .rotationEffect(.degrees(-6 + swing))
      .allowsHitTesting(false)
  }

  private func hop(_ t: Double) {
    guard !reduce else { return }
    motion.squish.run(t, [.to(-1, 0.09, .outQuad), .to(1, 0.22, .outBack(2.6)), .spring(0, 220, 9)])
  }

  private func poke() {
    let t = motion.now()
    pokes += 1
    hop(t)
    motion.spark.run(t, [.to(1, 0.16, .inOutQuad), .wait(0.28), .to(0, 0.32, .inOutQuad)])
  }

  private func nudged(_ re: String) {
    let t = motion.now()
    said = re
    saidTurn += 1
    let turn = saidTurn
    if !reduce { motion.swing.run(t, [.to(-7, 0.09, .inOutQuad), .spring(0, 200, 6)]) }
    if re == "chirp" {
      if !reduce { motion.squish.run(t, [.to(0.5, 0.08, .inOutQuad), .spring(0, 240, 9)]) }
      motion.spark.run(t, [.to(1, 0.12, .inOutQuad), .wait(0.2), .to(0, 0.28, .inOutQuad)])
    } else if re == "tilt" {
      if !reduce { motion.tilt.run(t, [.spring(-12, 180, 10), .wait(0.7), .spring(0, 180, 10)]) }
    } else {
      hop(t)
    }
    let after = re == "tilt" ? 1.0 : 0.7
    Task { @MainActor in
      try? await Task.sleep(for: .seconds(after))
      if saidTurn == turn { said = nil }
    }
  }
}

// MARK: - the first flight

/*
 THE FIRST FLIGHT ON THE RUN'S GROUND (S12Flight → FirstFlight with the run's colours; and its
 landed chart, still and dimmed, behind 13). KFirstFlight draws the board on its clock; its four
 slots are filled here instead of by React Native islands: her (the run's hatchling at 90, her
 face TS's on the flight's beats), S12Flight's title block, YOUR envelope front at 152 (the
 stamp in its corner) and the courier's line under the chart. A tap anywhere skips (TS lands it).
 */
struct KObFlightStage: View {
  let ctx: KObCtx
  let piece: KObFlightPiece

  /// the run's day colours (OnboardingNative FLIGHT_COLORS, as FirstFlightSwift lays them over the theme)
  private static let colors = KFirstFlightColors(
    ground: KOb.shell, ink: KOb.ink, sub: KOb.inkSoft, faint: KOb.inkSoft, line: KOb.ink, card: KOb.paper, pen: KOb.blue, post: KOb.blue
  )

  var body: some View {
    let k = min(ctx.size.width / 390, ctx.size.height / 844)
    KFirstFlight(theme: KTheme.named(piece.theme) ?? .classic, content: content(k), onSkip: { ctx.send("flightSkip") }) { name in
      slot(name)
    }
    .background { KObWarmPictures(refs: Array(ctx.content.pieces.birds.values), size: 90) }
  }

  private func content(_ k: CGFloat) -> KFirstFlightContent {
    KFirstFlightContent(
      startAt: piece.startAt, still: piece.still, scale: k, total: piece.total, colors: Self.colors,
      hasHead: !piece.still, title: "", titleEm: "", sub: "",
      opener: piece.opener, openerLines: piece.openerLines, carried: piece.carried,
      yourCity: piece.yourCity, chart: piece.chart, skip: piece.skip,
      stops: piece.stops, stopWordsSize: piece.stopWordsSize,
      loop: piece.loop, home: piece.home, stopPoints: piece.stopPoints, trail: piece.trail,
      curves: piece.curves, bird: piece.bird, envelope: piece.envelope, envelopeSize: piece.envelopeSize,
      hasEnvelope: !piece.still, hasLine: !piece.still && !piece.line.isEmpty
    )
  }

  @ViewBuilder
  private func slot(_ name: String) -> some View {
    switch name {
    case "bird":
      KImage(ctx.content.pieces.bird(piece.mood), size: CGSize(width: 90, height: 90), contentMode: .fit, placeholder: .clear)
        .frame(width: 90, height: 90)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    case "head":
      // S12Flight's FlightHead: the headline (two lines, shrinking to .75) over its label
      VStack(spacing: 0) {
        Text(piece.head)
          .kText(.obHeadline)
          .foregroundStyle(KOb.ink)
          .multilineTextAlignment(.center)
          .lineLimit(2)
          .minimumScaleFactor(0.75)
          .accessibilityAddTraits(.isHeader)
        Text(piece.sub)
          .kText(.obLabel)
          .foregroundStyle(KOb.inkSoft)
          .padding(.top, 10)
      }
      .padding(.horizontal, 24)
      .allowsHitTesting(false)
    case "envelope":
      KObEnvelopeFront(ctx: ctx, stamp: piece.stamp, corner: .filled, width: 152)
        .frame(width: piece.envelopeSize.width, height: piece.envelopeSize.height, alignment: .topLeading)
        .allowsHitTesting(false)
    case "line":
      // S12Flight's FlightLine: the courier's line in the Letter font's italic
      Text(piece.line)
        .kText(.content(17, italic: true, lineHeight: 23.0 / 17))
        .foregroundStyle(KOb.ink)
        .multilineTextAlignment(.center)
        .lineLimit(max(1, piece.lineLines))
        .allowsHitTesting(false)
    default:
      EmptyView()
    }
  }
}
