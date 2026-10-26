// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE EGG ON SCREENS 3–6 AND 8 (parts/nest-egg NestEgg): the egg in its nest spot with its gold
 warmth, the four warmth pips that replace the progress bar (one lit by each of 3, 4, 5 and 6 —
 with a pop, a soft haptic, one rock and a slightly bigger glow) and its one voice line. It
 breathes (±2.6°, a 3 s swing) unless Reduce Motion is on or the run is at 3x (still). The root
 draws ONE of these over the frame's nest slot, so it never remounts between those screens.
 */
struct KObNestEgg: View {
  let shell: Int
  let lit: Int
  let voice: String
  var still = false
  var label = ""
  var value = ""
  let actions: KObActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var rock = 0
  @State private var seen: Int

  init(shell: Int, lit: Int, voice: String, still: Bool, label: String = "", value: String = "", actions: KObActions) {
    self.shell = shell
    self.lit = lit
    self.voice = voice
    self.still = still
    self.label = label
    self.value = value
    self.actions = actions
    self._seen = State(initialValue: lit)
  }

  private var heat: Double { Double(min(4, max(0, lit))) / 4 }

  var body: some View {
    let size = KOb.nestEgg
    let glow = size * (1.55 + 0.25 * heat)
    VStack(spacing: 0) {
      ZStack {
        KObWarmth(size: glow, heat: heat)
          .animation(.easeOut(duration: 0.3), value: heat)
        TimelineView(.animation(paused: reduceMotion || still)) { tl in
          let b = reduceMotion || still ? 0 : sin(2 * .pi * tl.date.timeIntervalSinceReferenceDate / 3)
          KObEgg(shell: shell, size: size)
            .scaleEffect(1 + b * 0.012)
            .rotationEffect(.degrees(b * 2.6))
        }
        .keyframeAnimator(initialValue: 0.0, trigger: rock) { egg, v in
          egg.rotationEffect(.degrees(v * 7))
        } keyframes: { _ in
          LinearKeyframe(1.0, duration: 0.11)
          LinearKeyframe(-0.6, duration: 0.14)
          SpringKeyframe(0.0, duration: 0.45, spring: Spring(mass: 1, stiffness: 200, damping: 8))
        }
      }
      .frame(width: size, height: size)

      HStack(spacing: 8) {
        ForEach(0..<4, id: \.self) { i in
          KObPip(lit: i < lit)
        }
      }
      .frame(height: KOb.nestPipsH)

      Text(voice)
        .kText(.obVoice)
        .foregroundStyle(KOb.white)
        .lineLimit(1)
        .frame(height: KOb.nestVoiceH)
    }
    .frame(maxWidth: .infinity)
    .allowsHitTesting(false)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(label)
    .accessibilityValue(value)
    .onChange(of: lit) { _, now in
      if now > seen {
        actions.send("haptic", "pip")
        if !reduceMotion { rock += 1 }
      }
      seen = now
    }
  }
}

/// One warmth pip: gold when lit, an empty white ring when not; it pops as it lights.
private struct KObPip: View {
  let lit: Bool
  @State private var scale: CGFloat

  init(lit: Bool) {
    self.lit = lit
    self._scale = State(initialValue: lit ? 1 : 0)
  }

  var body: some View {
    ZStack {
      Circle().strokeBorder(KOb.white, lineWidth: 1.5)
      Circle()
        .fill(KOb.gold)
        .overlay(Circle().strokeBorder(KOb.white, lineWidth: 1.5))
        .scaleEffect(scale)
    }
    .frame(width: 11, height: 11)
    .onChange(of: lit) { _, on in
      if on {
        withAnimation(.easeOut(duration: 0.14)) { scale = 1.4 } completion: {
          withAnimation(.spring(response: 0.3, dampingFraction: 0.45)) { scale = 1 }
        }
      } else {
        withAnimation(.easeOut(duration: 0.16)) { scale = 0 }
      }
    }
  }
}

/*
 A GLYPH FLYING INTO THE EGG'S WARMTH (s03-glyph-flight): the answer just given (♊ on 3, ♀ or ♂
 on 4) curves up from where it is to the nest egg's middle, shrinks to a third and fades as it
 arrives, in about 380 ms. Animatable: `p` runs 0 → 1 under one withAnimation.
 */
struct KObGlyphFlight: View, Animatable {
  let glyph: KLineGlyph
  let from: CGPoint
  let to: CGPoint
  let size: CGFloat
  var p: Double

  var animatableData: Double {
    get { p }
    set { p = newValue }
  }

  var body: some View {
    let u = p
    let v = 1 - p
    let cx = from.x + (to.x - from.x) * 0.25
    let cy = min(from.y, to.y) - 30
    let x = v * v * from.x + 2 * v * u * cx + u * u * to.x
    let y = v * v * from.y + 2 * v * u * cy + u * u * to.y
    KLineIcon(glyph, size: size, lineWidth: 2, color: KOb.ink)
      .scaleEffect(1 - 0.65 * u)
      .opacity(u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3)
      .position(x: x, y: y)
      .allowsHitTesting(false)
  }
}

/// Where a flying glyph lands: the nest egg's middle, a little low (s03-glyph-flight `to`).
func kObNestTarget(width: CGFloat, top: CGFloat) -> CGPoint {
  let nest = KOb.nestEggRect(width: width, topInset: top)
  return CGPoint(x: nest.midX, y: nest.minY + nest.height * 0.55)
}
