// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE COURIER'S CARD ON ME, drawn by SwiftUI (2026-10-27, behind the "couriercard" switch, off by
 default): the React Native CourierCard's framed card (src/components/CourierCard.tsx, the owner's
 V9/V10 sheet in the 10a frame), number for number, so KCourierFrame can hold this instead of the
 React Native island. Every word and colour is TS's (src/components/courier-card-model.ts
 courierCardModel: the hour's palette, her place on the arc, her line); this draws them.

   ┌ YOUR COURIER ┐            ☀︎ / ☾ ✦        the hour's sky (morning, day, evening, night)
          ⌂ - - - - 🐦 - - - - ▢              the route over the globe, YOU and SOMEWHERE
        YOU     ( the planet )   SOMEWHERE
   ███████████████████████████████████████   the band (92): name · time, her line, the aside,
   Pip · 2H AGO  her line …           [Open]  and the button (Play on her day off)

 - The scene (236 tall, as wide as the frame): the sky's gradient, the stars (night: two groups
   that blink against each other, 1.1 s each way), the sun or the moon (between the pillars on
   her day off), two clouds drifting 24 over 9 s each way, then the planet (a globe 0.44 of the
   width across, its top at 66, sea, three continents, a snowy range, four woods, waves, two
   latitude lines, lit towns after dark) — or on her day off the course (two pairs of pillars,
   the ground, the dotted trail).
 - The route, once a letter has left: a dashed quadratic arc from your window to theirs over
   y 4, its dashes marching (1.4 s a period; backwards while she brings something home); your
   window with its roof (lit at dusk and night, or while she brings something, with a glow that
   pulses 0.9 s each way), theirs with its cross (faint while nothing has gone).
 - Her picture is her snapshot (lib/bird-images card-*), never redrawn: 50 on the arc (flying)
   or on the sill, flipped while she flies home, bobbing 5 (1.3 s each way) in the air; on the
   sill breathing 3.5% (1.6 s) with a 7 hop every 4.58 s, or, with nothing sent, tilting her head
   9° (every 3.54 s). On her day off, the 44 cover bird and the K key bob and rock together.
 - Words: the chip (SF Mono 600 12, .14em; corners 6), DAY OFF on its lime sticker (−4°), YOU and
   SOMEWHERE (mono 600 9) under the windows; in the band her name (system 600 14), the time (mono
   500 10 at .7), her line (the Letter font 13/1.4, two lines) and the aside (the Letter font's
   italic 12 at .75, one line), the roomier faces a step smaller (KLetterFace.fitSize); the
   button flat in the hour's own colours (system 600 13), or the lime Play. The chip and the band
   stop growing at XXL, as the React Native card's type stops at 1.3×.
 - Motion stops under Reduce Motion (everything at rest) and while TS says the card isn't on show
   (`live`). The card is a picture: KCourierFrame owns the tap and VoiceOver's one sentence.
 */

/// The hour's sky as TS sends it (courier-card-model PALETTE[daylight]): nil sun or cloud for none.
public struct KCourierPalette: Equatable, Sendable {
  public var text = Color.white
  public var scrim = Color(hex: "#2B2660")
  public var button = Color.white
  public var buttonText = Color(hex: "#1E1B35")
  public var sky0 = Color(hex: "#1E1B35")
  public var sky1 = Color(hex: "#2E2A6B")
  public var sea = Color(hex: "#1F2E5E")
  public var land = Color(hex: "#2F5148")
  public var forest = Color(hex: "#1B3530")
  public var rock = Color(hex: "#3A3F5C")
  public var ink = Color(hex: "#DAD6F2")
  public var chip = Color.white
  public var chipText = Color(hex: "#1E1B35")
  public var sun: Color?
  /// the sun's (or the moon's) place, as fractions of the width and the scene's height
  public var sunAt = CGPoint(x: 0.84, y: 0.18)
  public var moon = true
  public var stars = true
  public var lit = true
  public var cloud: Color?

  public init() {}
}

/// Where she is.
public enum KCourierState: String, Equatable, Sendable {
  case unsent, home, exploring, delivery, bringing
}

/// Everything the card draws (TS: courier-card-model courierCardModel, plus her picture).
public struct KCourierCardModel: Equatable, Sendable {
  /// "day" draws the larger sun; the palette carries the rest of the hour
  public var daylight = "night"
  public var palette = KCourierPalette()
  public var state: KCourierState = .home
  /// her place on the arc, 0 (your window) to 1 (theirs)
  public var at: CGFloat = 0.06
  /// her day off: the course and the game's cover
  public var playing = false
  /// in the air: on the arc; else on the sill
  public var flying = false
  /// her snapshot: 50 on the arc or the sill, 44 on the day-off cover; nil until captured
  public var bird: KImageRef?
  public var chip = ""
  public var you = ""
  public var somewhere = ""
  public var dayOffTag = ""
  public var name = ""
  public var time = ""
  public var line = ""
  /// "" for none
  public var aside = ""
  /// Open, or Play on her day off
  public var cta = ""
  /// the loops run (TS: the card is on show); false holds everything at rest
  public var live = true

  public init() {}
}

/// The card's numbers (CourierCard.tsx and courier-card-model.ts; the node test reads these lines).
enum KCourierCardMetrics {
  static let sceneHeight: CGFloat = 236
  static let bandHeight: CGFloat = 92
  static let globeTop: CGFloat = 66
  static let globeRadius: CGFloat = 0.44
  static let globeShoulder: CGFloat = 0.3
  /// the arc's control point's height
  static let arcControlY: CGFloat = 4
  static let birdSize: CGFloat = 50
  static let coverBirdSize: CGFloat = 44
  static let lime = Color(hex: "#C3E84F")
  static let coverInk = Color(hex: "#1E1B35")
  static let lamp = Color(hex: "#FFD98A")
}

/// The scene's geometry at a width: the globe, the two windows on its shoulders, the arc.
struct KCourierGeometry: Equatable {
  let width: CGFloat
  let radius: CGFloat
  let cx: CGFloat
  let cy: CGFloat
  /// your window and theirs
  let x0: CGFloat
  let x1: CGFloat
  /// the windows' height on the globe's shoulders (rounded, as Math.round)
  let arcY: CGFloat

  init(width w: CGFloat) {
    width = w
    radius = w * KCourierCardMetrics.globeRadius
    cx = w / 2
    cy = KCourierCardMetrics.globeTop + radius
    let dx = w * KCourierCardMetrics.globeShoulder
    x0 = cx - dx
    x1 = cx + dx
    arcY = (KCourierCardMetrics.globeTop + radius - (max(0, radius * radius - dx * dx)).squareRoot()).rounded()
  }

  /// A point on the quadratic arc from (x0, arcY) over (cx, 4) to (x1, arcY).
  func onArc(_ t: CGFloat) -> CGPoint {
    let u = 1 - t
    let mid = (x0 + x1) / 2
    let cy = KCourierCardMetrics.arcControlY
    return CGPoint(x: u * u * x0 + 2 * u * t * mid + t * t * x1, y: u * u * arcY + 2 * u * t * cy + t * t * arcY)
  }

  /// A point on the globe, in fractions of its radius from its centre.
  func onGlobe(_ fx: CGFloat, _ fy: CGFloat) -> CGPoint {
    CGPoint(x: cx + radius * fx, y: cy + radius * fy)
  }
}

/// Where every loop is at a moment (all 0 at rest). The curves are React Native's: the sine
/// in-out of Easing.inOut(Easing.sin), the hop's quad out and bounce back.
struct KCourierMotion: Equatable {
  var dash: CGFloat = 0
  var pulse: CGFloat = 0
  var twinkle: CGFloat = 0
  var drift: CGFloat = 0
  var bob: CGFloat = 0
  var breathe: CGFloat = 0
  var hop: CGFloat = 0
  var tilt: CGFloat = 0

  static let rest = KCourierMotion()

  /// Easing.inOut(Easing.sin)
  static func sine(_ x: Double) -> Double { (1 - cos(Double.pi * x)) / 2 }

  /// 0 → 1 → 0 on the sine, `half` seconds each way
  static func wave(_ e: Double, half: Double) -> CGFloat {
    let p = e.truncatingRemainder(dividingBy: 2 * half) / half
    return CGFloat(p < 1 ? sine(p) : sine(2 - p))
  }

  /// Easing.bounce
  static func bounce(_ t: Double) -> Double {
    if t < 1 / 2.75 { return 7.5625 * t * t }
    if t < 2 / 2.75 { let u = t - 1.5 / 2.75; return 7.5625 * u * u + 0.75 }
    if t < 2.5 / 2.75 { let u = t - 2.25 / 2.75; return 7.5625 * u * u + 0.9375 }
    let u = t - 2.625 / 2.75
    return 7.5625 * u * u + 0.984375
  }

  /// The loops `elapsed` seconds after they started, for a card in this state.
  init(elapsed e: Double, card: KCourierCardModel) {
    let flyingNow = card.playing || card.state == .exploring || card.state == .delivery || card.state == .bringing
    // the route marches every 1.4 s while a letter is out
    if flyingNow { dash = CGFloat(e.truncatingRemainder(dividingBy: 1.4) / 1.4) }
    // the lit window pulses while she brings something home
    if card.state == .bringing { pulse = Self.wave(e, half: 0.9) }
    if card.palette.stars { twinkle = Self.wave(e, half: 1.1) }
    if card.palette.cloud != nil { drift = Self.wave(e, half: 9) }
    if flyingNow {
      bob = Self.wave(e, half: 1.3)
    } else if card.state == .unsent {
      // wait 1.8, tilt 0.42, hold 0.9, back 0.42
      let p = e.truncatingRemainder(dividingBy: 3.54)
      if p < 1.8 { tilt = 0 }
      else if p < 2.22 { tilt = CGFloat(Self.sine((p - 1.8) / 0.42)) }
      else if p < 3.12 { tilt = 1 }
      else { tilt = CGFloat(1 - Self.sine((p - 3.12) / 0.42)) }
    } else {
      breathe = Self.wave(e, half: 1.6)
      // wait 4.2, up 0.16 (quad out), down 0.22 (bounce)
      let p = e.truncatingRemainder(dividingBy: 4.58)
      if p < 4.2 { hop = 0 }
      else if p < 4.36 { let x = (p - 4.2) / 0.16; hop = CGFloat(1 - (1 - x) * (1 - x)) }
      else { hop = CGFloat(1 - Self.bounce((p - 4.36) / 0.22)) }
    }
  }

  init() {}
}

/// The courier's card: the scene and its band, as wide as it is placed and 236 tall.
public struct KCourierCard: View {
  public static var sceneHeight: CGFloat { KCourierCardMetrics.sceneHeight }

  private let card: KCourierCardModel

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// when the loops started
  @State private var start = Date()

  public init(card: KCourierCardModel) {
    self.card = card
  }

  public var body: some View {
    GeometryReader { g in
      let w = g.size.width
      if w > 0 {
        scene(KCourierGeometry(width: w))
      }
    }
    .frame(height: KCourierCardMetrics.sceneHeight)
    .background(card.palette.sky1)
    .clipped()
    .accessibilityHidden(true)
  }

  private var running: Bool { card.live && !reduceMotion }

  private func scene(_ geo: KCourierGeometry) -> some View {
    let h = KCourierCardMetrics.sceneHeight
    return ZStack(alignment: .topLeading) {
      // the layers in the React Native SVG's order: the sky and the sun or moon (still), the
      // stars and the clouds (moving), the planet or the course (still: over the clouds, which
      // pass behind the pillars on her day off), the route and the windows (moving), then her.
      // The still ones are drawn again only when they change.
      KCourierBackdrop(layer: .sky, palette: card.palette, daylight: card.daylight, playing: card.playing, geo: geo)
        .equatable()
      TimelineView(.animation(paused: !running)) { context in
        let m = running ? KCourierMotion(elapsed: max(0, context.date.timeIntervalSince(start)), card: card) : .rest
        ZStack(alignment: .topLeading) {
          Canvas { gc, _ in
            KCourierLive.drawWeather(in: &gc, card: card, geo: geo, motion: m)
          }
          .frame(width: geo.width, height: h)
          KCourierBackdrop(layer: .ground, palette: card.palette, daylight: card.daylight, playing: card.playing, geo: geo)
            .equatable()
          Canvas { gc, _ in
            KCourierLive.drawRoute(in: &gc, card: card, geo: geo, motion: m)
          }
          .frame(width: geo.width, height: h)
          bird(geo, motion: m)
        }
      }
      labels(geo)
      band
        .frame(width: geo.width, height: h, alignment: .bottom)
    }
    .frame(width: geo.width, height: h, alignment: .topLeading)
    .onChange(of: running, initial: true) { _, on in
      if on { start = Date() }
    }
  }

  // ── her ─────────────────────────────────────────────────────────────

  @ViewBuilder
  private func bird(_ geo: KCourierGeometry, motion m: KCourierMotion) -> some View {
    if card.playing {
      // her day off: mid-flap before the first gap, the letter she needs on a key
      let s = KCourierCardMetrics.coverBirdSize
      HStack(alignment: .center, spacing: 6) {
        KImage(card.bird, size: CGSize(width: s, height: s), contentMode: .fit, placeholder: .clear)
        Text(verbatim: "K")
          .kText(.mono(12, .semibold))
          .foregroundStyle(KCourierCardMetrics.coverInk)
          .frame(width: 24, height: 24)
          .background(Circle().fill(Color.white))
          .overlay(Circle().strokeBorder(KCourierCardMetrics.coverInk, lineWidth: 2))
      }
      .rotationEffect(.degrees(Double(10 - 18 * m.bob)))
      .offset(x: geo.width * 0.3 - 22, y: 98 - 22 + (5 - 13 * m.bob))
    } else {
      let s = KCourierCardMetrics.birdSize
      let p = geo.onArc(card.at)
      let top = (card.flying ? p.y : geo.arcY - 6) - s + 8
      KImage(card.bird, size: CGSize(width: s, height: s), contentMode: .fit, placeholder: .clear)
        .rotationEffect(.degrees(Double(-9 * m.tilt)))
        .scaleEffect(1 + 0.035 * m.breathe)
        .offset(y: -5 * m.bob - 7 * m.hop)
        .scaleEffect(x: card.state == .bringing ? -1 : 1, y: 1)
        .offset(x: p.x - s / 2, y: top)
    }
  }

  // ── the labels on the scene ─────────────────────────────────────────

  @ViewBuilder
  private func labels(_ geo: KCourierGeometry) -> some View {
    // the chip, inside the scene: 12pt, not 9.5 — readers couldn't make it out (owner, 2026-09-23)
    Text(card.chip)
      .kText(.monoCourier)
      .foregroundStyle(card.palette.chipText)
      .lineLimit(1)
      .padding(.horizontal, 9)
      .padding(.vertical, 5)
      .background(RoundedRectangle(cornerRadius: 6, style: .circular).fill(card.palette.chip))
      .dynamicTypeSize(...DynamicTypeSize.xxLarge)
      .offset(x: 12, y: 12)
    if card.playing {
      // on her day off: a sticker beside the chip
      Text(card.dayOffTag)
        .kText(.mono(10, .semibold, tracking: 0.14))
        .foregroundStyle(KCourierCardMetrics.coverInk)
        .lineLimit(1)
        .padding(.horizontal, 9)
        .padding(.vertical, 4)
        .background(RoundedRectangle(cornerRadius: 6, style: .circular).fill(KCourierCardMetrics.lime))
        .rotationEffect(.degrees(-4))
        .offset(x: 12, y: 46)
    } else {
      Text(card.you)
        .kText(.mono(9, .semibold, tracking: 1.4 / 9))
        .foregroundStyle(card.palette.ink)
        .multilineTextAlignment(.center)
        .frame(width: max(0, geo.x0 * 2))
        .offset(y: geo.arcY + 14)
      Text(card.somewhere)
        .kText(.mono(9, .semibold, tracking: 1.4 / 9))
        .foregroundStyle(card.palette.ink)
        .opacity(card.state == .unsent ? 0.4 : 1)
        .multilineTextAlignment(.center)
        .frame(width: max(0, (geo.width - geo.x1) * 2))
        .offset(x: geo.width - max(0, (geo.width - geo.x1) * 2), y: geo.arcY + 14)
    }
  }

  // ── the band: who, what she is doing, one button ────────────────────

  private var band: some View {
    let P = card.palette
    return HStack(alignment: .center, spacing: 12) {
      // her diary: name · when, the entry, the aside
      VStack(alignment: .leading, spacing: 4) {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
          Text(card.name)
            .kText(.system(14, .semibold))
            .foregroundStyle(P.text)
          Text(card.time)
            .kText(.mono(10, .medium, tracking: 0.1))
            .foregroundStyle(P.text)
            .opacity(0.7)
        }
        KCourierBandLine(text: card.line, aside: card.aside, color: P.text)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      button
        .fixedSize()
    }
    .padding(.horizontal, 16)
    .frame(height: KCourierCardMetrics.bandHeight)
    .frame(maxWidth: .infinity)
    // the second tier: a solid panel with a hard edge (the owner's V10)
    .background(P.scrim)
    .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }

  @ViewBuilder
  private var button: some View {
    if card.playing {
      // flat, as every control (owner's rule B, 2026-10-26): the lime, no ink edge
      HStack(alignment: .center, spacing: 6) {
        Text(verbatim: "▶")
          .kText(.system(9))
        Text(card.cta)
          .kText(.system(13, .semibold))
      }
      .foregroundStyle(KCourierCardMetrics.coverInk)
      .lineLimit(1)
      .padding(.horizontal, 16)
      .padding(.vertical, 9)
      .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(KCourierCardMetrics.lime))
    } else {
      Text(card.cta)
        .kText(.system(13, .semibold))
        .foregroundStyle(card.palette.buttonText)
        .lineLimit(1)
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(RoundedRectangle(cornerRadius: 16, style: .circular).fill(card.palette.button))
    }
  }
}

/// Her line (the Letter font 13/1.4, two lines) and its aside (the italic 12 at .75, one line),
/// a step smaller in a roomier face so the fixed band never cuts them.
private struct KCourierBandLine: View {
  let text: String
  let aside: String
  let color: Color

  @Environment(\.kLetterFace) private var face

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(text)
        .kText(.content(face.fitSize(13), lineHeight: 1.4))
        .foregroundStyle(color)
        .lineLimit(2)
      if !aside.isEmpty {
        Text(aside)
          .kText(.content(face.fitSize(12), italic: true))
          .foregroundStyle(color)
          .opacity(0.75)
          .lineLimit(1)
      }
    }
  }
}

// MARK: - The still layer

/// What doesn't move, in two layers: the sky with the sun or the moon, and the ground (the
/// planet, or her day off's course).
struct KCourierBackdrop: View, Equatable {
  enum Layer: Equatable {
    case sky, ground
  }

  let layer: Layer
  let palette: KCourierPalette
  let daylight: String
  let playing: Bool
  let geo: KCourierGeometry

  var body: some View {
    Canvas { gc, _ in
      switch layer {
      case .sky: sky(in: &gc)
      case .ground: if playing { course(in: &gc) } else { planet(in: &gc) }
      }
    }
    .frame(width: geo.width, height: KCourierCardMetrics.sceneHeight)
  }

  private func sky(in gc: inout GraphicsContext) {
    let w = geo.width
    let h = KCourierCardMetrics.sceneHeight
    let P = palette
    // the sky, top to bottom
    gc.fill(
      Path(CGRect(x: 0, y: 0, width: w, height: h)),
      with: .linearGradient(Gradient(colors: [P.sky0, P.sky1]), startPoint: .zero, endPoint: CGPoint(x: 0, y: h))
    )
    // the sun or moon — between the pillars on her day off
    let c = playing ? CGPoint(x: w * 0.69, y: 26) : CGPoint(x: w * P.sunAt.x, y: h * P.sunAt.y)
    if let sun = P.sun {
      gc.fill(Self.circle(c, daylight == "day" ? 13 : 11), with: .color(sun))
    }
    if P.moon {
      gc.fill(Self.circle(c, 11), with: .color(Color(hex: "#FFF3D6")))
      gc.fill(Self.circle(CGPoint(x: c.x + 6, y: c.y - 4), 9.5), with: .color(P.sky0))
    }
  }

  static func circle(_ c: CGPoint, _ r: CGFloat) -> Path {
    Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r))
  }

  /* THE PLANET — a real globe, not a horizon (CourierCard Planet): sea, continents that follow
     the curve, forests, one snowy range, two faint latitude lines and a thin atmosphere; after
     dark a few lit towns. */
  private func planet(in gc: inout GraphicsContext) {
    let P = palette
    let R = geo.radius
    let g = geo.onGlobe
    let centre = CGPoint(x: geo.cx, y: geo.cy)
    // atmosphere
    gc.stroke(Self.circle(centre, R + 5), with: .color(Color.white.opacity(0.35)), lineWidth: 4)
    let globe = Self.circle(centre, R)
    gc.fill(globe, with: .color(P.sea))
    var inside = gc
    inside.clip(to: globe)
    // continents, drawn to lean with the curve
    var a = Path()
    a.move(to: g(-1.05, -0.55))
    a.addCurve(to: g(0.02, -0.7), control1: g(-0.7, -1.02), control2: g(-0.15, -0.98))
    a.addCurve(to: g(-0.6, -0.38), control1: g(0.1, -0.45), control2: g(-0.35, -0.3))
    a.addCurve(to: g(-1.05, -0.55), control1: g(-0.85, -0.44), control2: g(-1.02, -0.3))
    a.closeSubpath()
    inside.fill(a, with: .color(P.land))
    var b = Path()
    b.move(to: g(0.3, -0.9))
    b.addCurve(to: g(1.02, -0.4), control1: g(0.6, -0.98), control2: g(0.95, -0.7))
    b.addCurve(to: g(0.38, -0.55), control1: g(0.9, -0.2), control2: g(0.55, -0.3))
    b.addCurve(to: g(0.3, -0.9), control1: g(0.28, -0.7), control2: g(0.24, -0.84))
    b.closeSubpath()
    inside.fill(b, with: .color(P.land))
    var c = Path()
    c.move(to: g(-0.2, -0.1))
    c.addCurve(to: g(0.22, 0.02), control1: g(-0.05, -0.25), control2: g(0.2, -0.2))
    c.addCurve(to: g(-0.2, -0.1), control1: g(0.1, 0.12), control2: g(-0.15, 0.08))
    c.closeSubpath()
    inside.fill(c, with: .color(P.land))
    // one snowy range on the big continent
    inside.fill(Self.polygon([g(-0.4, -0.62), g(-0.34, -0.76), g(-0.28, -0.62)]), with: .color(P.rock))
    inside.fill(
      Self.polygon([g(-0.36, -0.713), g(-0.34, -0.76), g(-0.32, -0.713), g(-0.33, -0.7), g(-0.34, -0.715), g(-0.35, -0.7)]),
      with: .color(Color.white.opacity(0.9))
    )
    inside.fill(Self.polygon([g(-0.3, -0.6), g(-0.25, -0.71), g(-0.2, -0.6)]), with: .color(P.rock.opacity(0.85)))
    // forests
    func trees(_ at: CGPoint, _ n: Int, _ r: CGFloat) {
      for i in 0..<n {
        let x = at.x + (CGFloat(i) - CGFloat(n - 1) / 2) * r * 1.5
        let y = at.y - CGFloat(i % 2) * r * 0.6
        inside.fill(Self.circle(CGPoint(x: x, y: y), r), with: .color(P.forest))
      }
    }
    trees(g(-0.8, -0.5), 4, 3.2)
    trees(g(-0.08, -0.66), 3, 3)
    trees(g(0.66, -0.62), 4, 3.2)
    trees(g(0.02, -0.06), 3, 2.8)
    // waves on the open sea: M x y q 3.5 -2.5 7 0 t 7 0
    for (fx, fy) in [(-0.35, -0.15), (0.45, -0.1), (-0.05, 0.25), (0.8, -0.05)] as [(CGFloat, CGFloat)] {
      let s = CGPoint(x: geo.cx + R * fx - 7, y: geo.cy + R * fy)
      var wave = Path()
      wave.move(to: s)
      wave.addQuadCurve(to: CGPoint(x: s.x + 7, y: s.y), control: CGPoint(x: s.x + 3.5, y: s.y - 2.5))
      wave.addQuadCurve(to: CGPoint(x: s.x + 14, y: s.y), control: CGPoint(x: s.x + 10.5, y: s.y + 2.5))
      inside.stroke(wave, with: .color(Color.white.opacity(0.5)), lineWidth: 1.2)
    }
    // latitude — two faint lines that say "sphere"
    var lat = Path()
    lat.move(to: CGPoint(x: geo.cx - R, y: geo.cy - R * 0.35))
    lat.addQuadCurve(to: CGPoint(x: geo.cx + R, y: geo.cy - R * 0.35), control: CGPoint(x: geo.cx, y: geo.cy - R * 0.62))
    lat.move(to: CGPoint(x: geo.cx - R, y: geo.cy + R * 0.05))
    lat.addQuadCurve(to: CGPoint(x: geo.cx + R, y: geo.cy + R * 0.05), control: CGPoint(x: geo.cx, y: geo.cy - R * 0.2))
    inside.stroke(lat, with: .color(Color.white.opacity(0.22)), lineWidth: 1)
    // towns, lit after dark
    if P.lit {
      for (fx, fy) in [(-0.9, -0.6), (-0.5, -0.45), (0.55, -0.5), (0.85, -0.55), (0.1, -0.12)] as [(CGFloat, CGFloat)] {
        inside.fill(Self.circle(g(fx, fy), 1.4), with: .color(KCourierCardMetrics.lamp))
      }
    }
  }

  /* HER DAY OFF — the course instead of the planet (CourierCard Course): a strip of ground at the
     band's edge, two pairs of pillars in the palette's own colours, and a dotted trail where she's
     been flapping. */
  private func course(in gc: inout GraphicsContext) {
    let P = palette
    let w = geo.width
    let h = KCourierCardMetrics.sceneHeight
    let ground = h - KCourierCardMetrics.bandHeight - 8
    let ink = P.moon ? Color(hex: "#DAD6F2") : P.chip
    var trail = Path()
    trail.move(to: CGPoint(x: w * 0.02, y: ground - 6))
    trail.addQuadCurve(to: CGPoint(x: w * 0.25, y: 96), control: CGPoint(x: w * 0.14, y: 58))
    gc.stroke(trail, with: .color(ink.opacity(0.6)), style: StrokeStyle(lineWidth: 1.6, dash: [3, 5]))
    func block(_ r: CGRect) {
      let shape = Path(roundedRect: r, cornerRadius: 3, style: .circular)
      gc.fill(shape, with: .color(P.scrim))
      gc.stroke(shape, with: .color(ink), lineWidth: 2)
    }
    for (fx, gap) in [(0.52, 94), (0.82, 72)] as [(CGFloat, CGFloat)] {
      let x = w * fx
      block(CGRect(x: x, y: -4, width: 26, height: gap - 26 + 4))
      block(CGRect(x: x - 4, y: gap - 34, width: 34, height: 9))
      block(CGRect(x: x, y: gap + 26, width: 26, height: ground - gap - 26 + 2))
      block(CGRect(x: x - 4, y: gap + 26, width: 34, height: 9))
    }
    gc.fill(Path(CGRect(x: 0, y: ground, width: w, height: h - ground)), with: .color(P.land))
    gc.fill(Path(CGRect(x: 0, y: ground, width: w, height: 2)), with: .color(P.moon ? Color(hex: "#DAD6F2") : P.forest))
  }

  static func polygon(_ points: [CGPoint]) -> Path {
    var p = Path()
    p.addLines(points)
    p.closeSubpath()
    return p
  }
}

// MARK: - The moving layer

/// What moves, at one moment of the loops: the stars and the clouds (under the ground), the route
/// and the two windows (over it).
enum KCourierLive {
  static func drawWeather(in gc: inout GraphicsContext, card: KCourierCardModel, geo: KCourierGeometry, motion m: KCourierMotion) {
    let P = card.palette
    let w = geo.width
    let circle = KCourierBackdrop.circle
    if P.stars {
      // two groups that blink against each other
      let a = Double(0.35 + 0.65 * m.twinkle)
      for (i, s) in [(0.12, 22.0), (0.47, 30.0), (0.75, 34.0), (0.55, 48.0)].enumerated() {
        gc.fill(circle(CGPoint(x: w * CGFloat(s.0), y: CGFloat(s.1)), i % 2 == 0 ? 1.6 : 1), with: .color(Color.white.opacity(a)))
      }
      let b = Double(1 - 0.65 * m.twinkle)
      for (i, s) in [(0.3, 12.0), (0.62, 16.0), (0.93, 26.0), (0.2, 46.0)].enumerated() {
        gc.fill(circle(CGPoint(x: w * CGFloat(s.0), y: CGFloat(s.1)), i % 2 == 0 ? 1.2 : 1), with: .color(Color.white.opacity(b)))
      }
    }
    if let cloud = P.cloud {
      let x = w * 0.6 - 10 + 24 * m.drift
      gc.fill(Path(ellipseIn: CGRect(x: x - 22, y: 30 - 8, width: 44, height: 16)), with: .color(cloud.opacity(0.9)))
      gc.fill(Path(ellipseIn: CGRect(x: x + 12 - 13, y: 26 - 9, width: 26, height: 18)), with: .color(cloud.opacity(0.9)))
    }
  }

  static func drawRoute(in gc: inout GraphicsContext, card: KCourierCardModel, geo: KCourierGeometry, motion m: KCourierMotion) {
    guard !card.playing else { return }
    let P = card.palette
    let circle = KCourierBackdrop.circle
    let ink = P.ink
    let x0 = geo.x0
    let x1 = geo.x1
    let y = geo.arcY
    // the route — only once a letter has left
    if card.state != .unsent {
      var route = Path()
      route.move(to: CGPoint(x: x0, y: y))
      route.addQuadCurve(to: CGPoint(x: x1, y: y), control: CGPoint(x: (x0 + x1) / 2, y: KCourierCardMetrics.arcControlY))
      let phase = card.state == .bringing ? m.dash * 9 : 9 - m.dash * 9
      gc.stroke(route, with: .color(ink.opacity(0.7)), style: StrokeStyle(lineWidth: 1.6, dash: [4, 5], dashPhase: phase))
    }
    // your window, its glow while she brings something, its roof
    let bringing = card.state == .bringing
    let yours = Path(roundedRect: CGRect(x: x0 - 7, y: y - 2, width: 14, height: 12), cornerRadius: 2, style: .circular)
    gc.fill(yours, with: .color(P.lit || bringing ? KCourierCardMetrics.lamp : Color.white))
    gc.stroke(yours, with: .color(ink), lineWidth: 1.6)
    if bringing {
      gc.fill(circle(CGPoint(x: x0, y: y + 4), 13), with: .color(KCourierCardMetrics.lamp.opacity(Double(0.55 * m.pulse))))
    }
    var roof = Path()
    roof.move(to: CGPoint(x: x0 - 9, y: y - 2))
    roof.addLine(to: CGPoint(x: x0, y: y - 9))
    roof.addLine(to: CGPoint(x: x0 + 9, y: y - 2))
    gc.stroke(roof, with: .color(ink), style: StrokeStyle(lineWidth: 1.6, lineJoin: .round))
    // theirs, faint while nothing has gone (the frame and its fill fade together, as SVG's opacity)
    var theirs = gc
    theirs.opacity = card.state == .unsent ? 0.35 : 1
    theirs.drawLayer { layer in
      let pane = Path(roundedRect: CGRect(x: x1 - 7, y: y - 4, width: 14, height: 14), cornerRadius: 2, style: .circular)
      layer.fill(pane, with: .color(P.lit ? KCourierCardMetrics.lamp : Color.white))
      layer.stroke(pane, with: .color(ink), lineWidth: 1.6)
      var cross = Path()
      cross.move(to: CGPoint(x: x1, y: y - 4))
      cross.addLine(to: CGPoint(x: x1, y: y + 10))
      cross.move(to: CGPoint(x: x1 - 7, y: y + 3))
      cross.addLine(to: CGPoint(x: x1 + 7, y: y + 3))
      layer.stroke(cross, with: .color(ink), lineWidth: 1.2)
    }
  }
}
