// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 WREN AS A PICTURE, STILL OR BREATHING (batch 3, slice 4, 2026-11-09). Swift never redraws her:
 she is a snapshot of the reader's own WrenBird (her skin, what she has on, her stage, the
 hatchling's shape and mark), captured by React Native's BirdSnapshots and handed over as a
 KImageRef. This draws that picture where React Native used to put a WrenBird island:

 - KWrenPicture: the picture at its capture size, centred in its frame (the PNG has no @3x
   suffix, so the frame is always given). nil (not captured yet) keeps the frame and draws
   nothing, as bird-images asks. Used still by the Notes composer (30 in 30, content), Make your
   own face (72 / 64 / 56, the page bobs her itself) and the face-ready banner (30, delighted).

 - KBreathingWren: the compose toolbar's Wren (src/screens/compose/ComposeNative WrenIsland):
   her picture at 38 in a 46 frame, breathing up 6 and back over 2.6 s (useBreathe(6, 2600):
   Reanimated's withTiming each way on Easing.inOut(Easing.ease), repeating), and a ZoomIn
   (scale 0 → 1, .34 s, Reanimated's timing default Easing.inOut(Easing.quad)) each time she
   appears and each time her mood changes. React Native remounts the bird on a new mood (key=
   {mood}), so the old face goes at once and the breath starts again from rest: the same here,
   by giving each mood its own identity (`.id`). A mood whose picture isn't captured yet keeps
   the frame empty, and she zooms in when it lands. Under Reduce Motion nothing moves (Reanimated's
   default ReduceMotion.System: the zoom lands at once and the breath stays at rest); the face
   still changes.

 Both are decorative: VoiceOver skips them (the island never spoke either).
 */

/// Her picture at its capture size, centred in a fixed frame.
public struct KWrenPicture: View {
  private let ref: KImageRef?
  private let size: CGFloat
  private let frame: CGFloat

  /// - Parameters:
  ///   - ref: her snapshot; nil keeps the frame empty
  ///   - size: the size it was captured at (the React Native WrenBird's `size`)
  ///   - frame: the frame it sits in (the island's side); nil for `size`
  public init(_ ref: KImageRef?, size: CGFloat, frame: CGFloat? = nil) {
    self.ref = ref
    self.size = size
    self.frame = frame ?? size
  }

  public var body: some View {
    KImage(ref, size: CGSize(width: size, height: size), contentMode: .fit, placeholder: .clear)
      .frame(width: frame, height: frame)
      .accessibilityHidden(true)
  }
}

/// The compose toolbar's Wren: her picture breathing, zooming in on each new mood.
public struct KBreathingWren: View {
  private let ref: KImageRef?
  private let mood: String
  private let size: CGFloat
  private let frame: CGFloat
  private let distance: CGFloat
  private let period: Double
  private let zoom: Double

  /// - Parameters:
  ///   - ref: her snapshot in this mood; nil keeps the frame empty
  ///   - mood: what identifies the face; a change zooms the new one in and restarts the breath
  ///   - size, frame: as KWrenPicture (compose: 38 in 46)
  ///   - distance: how far up a breath takes her (compose: 6)
  ///   - period: one breath, up and back, in seconds (compose: 2.6)
  ///   - zoom: the ZoomIn's length in seconds (compose: .34)
  public init(_ ref: KImageRef?, mood: String, size: CGFloat = 38, frame: CGFloat = 46, distance: CGFloat = 6, period: Double = 2.6, zoom: Double = 0.34) {
    self.ref = ref
    self.mood = mood
    self.size = size
    self.frame = frame
    self.distance = distance
    self.period = period
    self.zoom = zoom
  }

  public var body: some View {
    KBreathingWrenFace(ref: ref, size: size, frame: frame, distance: distance, period: period, zoom: zoom)
      // a new face, or her picture landing (the first capture comes a beat after the page opens):
      // she zooms in then, as React Native's bird did when it mounted
      .id("\(mood)|\(ref == nil ? 0 : 1)")
      .frame(width: frame, height: frame)
  }
}

/// One mood's face: zooms in once, then breathes for as long as it is shown.
private struct KBreathingWrenFace: View {
  let ref: KImageRef?
  let size: CGFloat
  let frame: CGFloat
  let distance: CGFloat
  let period: Double
  let zoom: Double

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var zoomed = false
  @State private var up = false

  var body: some View {
    KWrenPicture(ref, size: size, frame: frame)
      // each animation scoped to its own effect, so neither carries the page's layout with it
      .animation(.timingCurve(0.455, 0.03, 0.515, 0.955, duration: zoom)) {
        // never 0: a zero scale is a transform SwiftUI can't invert
        $0.scaleEffect(zoomed || reduceMotion ? 1 : 0.001)
      }
      .animation(Animation(KEaseInOutEase(duration: period / 2)).repeatForever(autoreverses: true)) {
        $0.offset(y: up && !reduceMotion ? -distance : 0)
      }
      .onAppear {
        guard !reduceMotion else { return }
        zoomed = true
        up = true
      }
  }
}

/*
 Reanimated's Easing.inOut(Easing.ease) — useBreathe's curve — as a SwiftUI animation. ease is the
 cubic bezier (.42, 0, 1, 1); inOut runs it forward over the first half and mirrored over the
 second. The curve is symmetric, so an autoreversing repeat plays the breath down exactly as
 useBreathe's second withTiming does.
 */
struct KEaseInOutEase: CustomAnimation {
  let duration: TimeInterval

  private static let ease = UnitCurve.bezier(startControlPoint: UnitPoint(x: 0.42, y: 0), endControlPoint: UnitPoint(x: 1, y: 1))

  /// Easing.inOut(Easing.ease) at t in 0…1
  static func value(at t: Double) -> Double {
    let t = min(max(t, 0), 1)
    return t < 0.5 ? ease.value(at: t * 2) / 2 : 1 - ease.value(at: (1 - t) * 2) / 2
  }

  func animate<V: VectorArithmetic>(value: V, time: TimeInterval, context: inout AnimationContext<V>) -> V? {
    guard duration > 0, time < duration else { return nil }
    return value.scaled(by: Self.value(at: time / duration))
  }
}
