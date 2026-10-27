// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE FULL-SCREEN MOMENTS' CLOCK (2026-10-27): Wren growing up (KGrowthMoment) and the first flight
 (KFirstFlight). Each draws every beat as a pure function of the time since its start, in a
 TimelineView, from React Native's own numbers (lib/growth-moment-core, components/
 first-flight-model), so these are Reanimated's curves and its interpolate, written out:

 - inOutQuad: withTiming's default easing, Easing.inOut(Easing.quad);
 - KMomentBezier: Easing.bezier(x1, y1, x2, y2), the CSS cubic-bezier, solved for x as WebKit's
   UnitBezier does (y may overshoot past 1, as the stamp's and the pop's do);
 - interpolate: interpolate(x, input, output, Extrapolation.CLAMP), segment for segment.
 */
enum KMomentClock {
  static func clamp01(_ x: Double) -> Double { min(1, max(0, x)) }

  /// Reanimated's default withTiming curve, Easing.inOut(Easing.quad).
  static func inOutQuad(_ t: Double) -> Double {
    t < 0.5 ? 2 * t * t : 1 - pow(-2 * t + 2, 2) / 2
  }

  static func linear(_ t: Double) -> Double { t }

  /// How far a beat that starts `at` ms and lasts `ms` has gone at `now`, eased: 0 before it, 1 after.
  static func beat(_ now: Double, at: Double, ms: Double, curve: (Double) -> Double = inOutQuad) -> Double {
    guard ms > 0 else { return now >= at ? 1 : 0 }
    let t = (now - at) / ms
    if t <= 0 { return 0 }
    if t >= 1 { return 1 }
    return curve(t)
  }

  /// Reanimated's interpolate with Extrapolation.CLAMP: the first segment whose end is at or past
  /// x, a straight line along it, the end values outside the range.
  static func interpolate(_ x: Double, _ input: [Double], _ output: [Double]) -> Double {
    let n = min(input.count, output.count)
    guard n > 0 else { return 0 }
    guard n > 1 else { return output[0] }
    var l = 0
    var r = 1
    if x < input[0] {
      l = 0
      r = 1
    } else if x > input[n - 1] {
      l = n - 2
      r = n - 1
    } else {
      for i in 1..<n where x <= input[i] {
        l = i - 1
        r = i
        break
      }
    }
    let span = input[r] - input[l]
    if span == 0 { return output[l] }
    let p = (x - input[l]) / span
    if p <= 0 { return output[l] }
    if p >= 1 { return output[r] }
    return output[l] + p * (output[r] - output[l])
  }
}

/// Easing.bezier(x1, y1, x2, y2): CSS's cubic-bezier, through (0, 0) and (1, 1).
struct KMomentBezier {
  private let ax, bx, cx, ay, by, cy: Double

  init(_ x1: Double, _ y1: Double, _ x2: Double, _ y2: Double) {
    cx = 3 * x1
    bx = 3 * (x2 - x1) - cx
    ax = 1 - cx - bx
    cy = 3 * y1
    by = 3 * (y2 - y1) - cy
    ay = 1 - cy - by
  }

  /// From TS's four numbers; a list that isn't four long is linear.
  init(_ points: [Double]) {
    if points.count == 4 {
      self.init(points[0], points[1], points[2], points[3])
    } else {
      self.init(0, 0, 1, 1)
    }
  }

  private func sampleX(_ t: Double) -> Double { ((ax * t + bx) * t + cx) * t }
  private func sampleY(_ t: Double) -> Double { ((ay * t + by) * t + cy) * t }
  private func slopeX(_ t: Double) -> Double { (3 * ax * t + 2 * bx) * t + cx }

  /// the curve's parameter where it reaches x: Newton's method, then bisection if that stalls
  private func solve(_ x: Double) -> Double {
    var t = x
    for _ in 0..<8 {
      let err = sampleX(t) - x
      if abs(err) < 1e-7 { return t }
      let d = slopeX(t)
      if abs(d) < 1e-6 { break }
      t -= err / d
    }
    var lo = 0.0
    var hi = 1.0
    t = x
    for _ in 0..<60 {
      let v = sampleX(t)
      if abs(v - x) < 1e-7 { return t }
      if x > v { lo = t } else { hi = t }
      t = (lo + hi) / 2
    }
    return t
  }

  func callAsFunction(_ x: Double) -> Double {
    if x <= 0 { return 0 }
    if x >= 1 { return 1 }
    return sampleY(solve(x))
  }
}

/// React Native's Pressable feedback on the moments' keys: the key fades while the finger is down.
struct KMomentPressStyle: ButtonStyle {
  let opacity: Double

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .opacity(configuration.isPressed ? opacity : 1)
  }
}
