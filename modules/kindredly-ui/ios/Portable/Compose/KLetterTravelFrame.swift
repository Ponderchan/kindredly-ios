// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 LET IT TRAVEL, AS NUMBERS: a line-for-line port of src/components/letter-travel-model.ts
 (travelFrame, travelArc, stepTravel, travelCardLine), which the React Native piece draws from.
 SwiftUI can't ask TypeScript for sixty frames a second, so the numbers live twice: change them
 together. letter-travel-model.test.ts pins a probe frame (T 1.9, beat 2.2) that this port must
 give too.

 Authored seconds, 3.7 in all: Fold 0, Pickup 0.9, World 1.6, Cross 2.5, in the sheet's own
 393 × 852 points (KLetterTravel scales them to cover the screen).
 */

public struct KLetterTravelFrame {
  public static let width: Double = 393
  public static let height: Double = 852
  public static let pickup: Double = 0.9
  public static let world: Double = 1.6
  public static let crossCue: Double = 2.5
  public static let total: Double = 3.7
  /// the arrival card, before the fade: the clock rests here until the send has landed
  public static let holdAt: Double = total - 0.18
  /// past this long at the hold, the card says she is still flying
  public static let waitSeconds: Double = 2.5
  /// once the send has landed, how long the card says so before the fade
  public static let doneSeconds: Double = 0.9
  /// Reduce Motion: the last tableau, held at this T
  public static let stillT: Double = total - 0.3
  /// Reduce Motion: how long the tableau stays once the send has landed, then the fade
  public static let stillHoldSeconds: Double = 0.9 + doneSeconds
  public static let stillFadeSeconds: Double = 0.26

  static func clamp(_ v: Double, _ a: Double, _ b: Double) -> Double { min(b, max(a, v)) }
  static func lerp(_ t: Double, _ a: Double, _ b: Double) -> Double { a + (b - a) * t }
  static func ramp(_ t: Double, _ stops: [Double], _ vals: [Double]) -> Double {
    for i in 1..<stops.count where t <= stops[i] {
      let span = stops[i] - stops[i - 1]
      let f = (t - stops[i - 1]) / (span == 0 ? 1 : span)
      return lerp(clamp(f, 0, 1), vals[i - 1], vals[i])
    }
    return vals[vals.count - 1]
  }
  static func easeOutCubic(_ t: Double) -> Double { 1 - pow(1 - t, 3) }
  static func easeInOutQuad(_ t: Double) -> Double { t < 0.5 ? 2 * t * t : 1 - pow(-2 * t + 2, 2) / 2 }
  static func easeOutBack(_ t: Double) -> Double {
    let c1 = 1.70158
    let c3 = c1 + 1
    return 1 + c3 * pow(t - 1, 3) + c1 * pow(t - 1, 2)
  }
  static func animate(_ from: Double, _ to: Double, _ start: Double, _ end: Double, _ T: Double, _ ease: (Double) -> Double) -> Double {
    from + (to - from) * ease(clamp((T - start) / (end - start), 0, 1))
  }
  static func enter(_ from: Double, _ to: Double, _ start: Double, _ end: Double, _ T: Double) -> Double { animate(from, to, start, end, T, easeOutCubic) }
  static func draw(_ from: Double, _ to: Double, _ start: Double, _ end: Double, _ T: Double) -> Double { animate(from, to, start, end, T, easeInOutQuad) }
  static func pop(_ from: Double, _ to: Double, _ start: Double, _ end: Double, _ T: Double) -> Double { animate(from, to, start, end, T, easeOutBack) }

  public let T: Double
  public let fold: Double
  public let seal: Double
  public let sealSquash: Double
  public let swoop: Double
  public let lift: Double
  public let taken: Double
  public let out: Double
  public let cross: Double
  public let markIn: Double
  public let outro: Double
  public let gR: Double
  public let gCX: Double
  public let gCY: Double
  public let gTop: Double
  public let home: CGPoint
  public let away: CGPoint
  public let deskX: Double
  public let deskY: Double
  public let birdX: Double
  public let birdY: Double
  public let birdS: Double
  public let heading: Double
  public let bob: Double
  public let envOnDesk: Double
  public let foldW: Double
  public let foldH: Double
  public let sealed: Bool

  /// a point on the route: a great-circle arc over the top of the globe, 0 at home, 1 away
  static func arc(gR: Double, gCX: Double, gCY: Double, _ p: Double) -> CGPoint {
    let ang = lerp(p, -168, -12) * .pi / 180
    let r = gR + 6 + sin(p * .pi) * 62
    return CGPoint(x: gCX + cos(ang) * r, y: gCY + sin(ang) * r)
  }

  public func arc(_ p: Double) -> CGPoint { Self.arc(gR: gR, gCX: gCX, gCY: gCY, p) }

  /// The sheet at authored second T; `beat` is the wall clock (the wings and the stars).
  public init(T: Double, beat: Double) {
    let S = Self.self
    self.T = T
    fold = S.draw(0, 1, 0.24, S.pickup - 0.1, T)
    seal = S.pop(0, 1, S.pickup - 0.4, S.pickup + 0.05, T)
    sealSquash = 1 - max(0, sin(S.clamp((T - (S.pickup - 0.4)) / 0.45, 0, 1) * .pi)) * 0.16

    swoop = S.enter(0, 1, S.pickup - 0.05, S.world - 0.08, T)
    lift = S.enter(0, 1, S.world - 0.24, S.world + 0.16, T)
    taken = S.clamp((lift - 0.15) / 0.85, 0, 1)

    out = S.draw(0, 1, S.world - 0.05, S.crossCue + 0.1, T)
    cross = S.draw(0, 1, S.crossCue + 0.05, S.total - 0.5, T)
    markIn = S.enter(0, 1, S.total - 0.78, S.total - 0.3, T)
    outro = S.draw(0, 1, S.total - 0.16, S.total, T)

    // the globe grows in from below as we pull back
    let gR = S.ramp(out, [0, 1], [86, 166])
    let gCX = S.width / 2
    let gCY = S.ramp(out, [0, 1], [S.height + 150, 530])
    self.gR = gR
    self.gCX = gCX
    self.gCY = gCY
    gTop = gCY - gR
    let home = S.arc(gR: gR, gCX: gCX, gCY: gCY, 0)
    self.home = home
    away = S.arc(gR: gR, gCX: gCX, gCY: gCY, 1)

    let deskX = S.width / 2
    let deskY: Double = 452
    self.deskX = deskX
    self.deskY = deskY

    // desk pickup → up → along the arc, carried with the desk to home as the world pulls in
    let a = S.arc(gR: gR, gCX: gCX, gCY: gCY, cross)
    let flyUp = S.enter(0, 1, S.world - 0.2, S.crossCue + 0.05, T)
    let preX = S.lerp(swoop, -120, deskX - 78) + flyUp * 34
    let preY = S.lerp(swoop, 700, deskY - 6) - lift * 44 - flyUp * 120
    birdX = cross > 0.001 ? Double(a.x) : S.lerp(out, preX, Double(home.x))
    birdY = cross > 0.001 ? Double(a.y) : S.lerp(out, preY, Double(home.y))
    birdS = (0.6 + swoop * 0.14) * (1 - out * 0.62)
    // one steady wing beat, easing into a slow breath and level as she lands
    let landing = S.enter(0, 1, S.total - 0.9, S.total - 0.5, T)
    let behind = S.arc(gR: gR, gCX: gCX, gCY: gCY, max(cross - 0.02, 0))
    let ahead = S.arc(gR: gR, gCX: gCX, gCY: gCY, min(cross + 0.02, 1))
    let arcHeading = atan2(Double(ahead.y - behind.y), Double(ahead.x - behind.x)) * 180 / .pi
    heading = cross > 0.001 ? arcHeading * (1 - landing) : -8 + swoop * 6 - flyUp * 14
    let since = beat - (S.pickup - 0.05)
    let flap = sin(since * 2.4 * .pi * 2) * 3
    let breath = sin(since * 0.8 * .pi * 2) * 1.2
    bob = swoop > 0.01 ? flap * (1 - landing) + breath * landing : 0

    envOnDesk = (1 - taken) * (1 - out)
    foldW = S.ramp(fold, [0, 0.52, 1], [214, 210, 132])
    foldH = S.ramp(fold, [0, 0.52, 1], [268, 252, 86])
    sealed = fold > 0.62
  }

  /// The card's second line: "sent" once the send has landed, "still flying…" once the rest at
  /// the card runs long, else the usual one (nil). `beat` stays 0 under Reduce Motion.
  public enum CardLine { case done, wait }
  public static func cardLine(reduce: Bool, T: Double, ready: Bool, heldFor: Double, beat: Double) -> CardLine? {
    let atCard = reduce || T >= holdAt - 0.01
    guard atCard else { return nil }
    if ready { return .done }
    return heldFor >= waitSeconds || (reduce && beat > waitSeconds) ? .wait : nil
  }
}

/// The send-off's clock (stepTravel): authored seconds from the first frame, resting at holdAt
/// until the send has landed and the card has said so for doneSeconds, the rest taken off after.
/// A reference so a TimelineView's frames can move it on; nothing observes it.
public final class KLetterTravelClock {
  private var t0: Date?
  /// seconds spent resting at the hold
  private var paused: Double = 0
  private var pauseAt: Date?
  public private(set) var holdAt: Date?
  private var readyAt: Date?
  /// the seal's tap has played (Pickup − 0.12)
  public private(set) var tapped = false
  /// the clock has reached the end
  public private(set) var done = false

  public init() {}

  /// One frame at `now`. Calling it again at the same moment changes nothing.
  public func step(now: Date, ready: Bool) -> (T: Double, beat: Double) {
    let F = KLetterTravelFrame.self
    if t0 == nil { t0 = now }
    if ready, readyAt == nil { readyAt = now }
    let wall = now.timeIntervalSince(t0 ?? now)
    var T = wall - paused
    var confirmed = false
    if ready, let readyAt {
      confirmed = now.timeIntervalSince(max(readyAt, holdAt ?? now)) >= F.doneSeconds
    }
    if T >= F.holdAt && !confirmed {
      if pauseAt == nil { pauseAt = now }
      if holdAt == nil { holdAt = now }
      T = F.holdAt
    } else if let at = pauseAt {
      paused += now.timeIntervalSince(at)
      pauseAt = nil
      T = wall - paused
    }
    if !tapped && T >= F.pickup - 0.12 { tapped = true }
    if !done && T >= F.total { done = true }
    return (T, wall)
  }

  /// how long it has rested at the card, at `now` (0 before the hold)
  public func heldFor(now: Date) -> Double {
    holdAt.map { now.timeIntervalSince($0) } ?? 0
  }
}
