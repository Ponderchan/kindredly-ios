// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 LET IT TRAVEL, IN SWIFTUI (LetterTravel.tsx; the "lettertravel" switch, off by default): the
 send-off that plays over the compose page while a letter goes. Beat for beat the React Native
 piece (the owner's Travel Animation sheet, 2026-09-19), on the same numbers
 (KLetterTravelFrame, ported from src/components/letter-travel-model.ts):

   Fold 0      the written page folds itself into an envelope; the coral wax seal drops on,
               with a light tap (the haptic) just before the pickup
   Pickup 0.9  the courier swoops in and takes it in her beak
   World 1.6   the camera pulls back from the desk until the daylit planet is in frame, the desk
               becoming the YOU pin
   Cross 2.5   she arcs over the globe on a dotted route, other people's letters crossing beside
               her, to the SOMEWHERE pin on the night side; the words come in
   3.7         the frame fades to the page

 She flies the whole way without waiting for the network: the clock rests on the arrival card
 (holdAt) until TS says the send has landed (`ready`), and the card says so for doneSeconds before
 the fade. Past waitSeconds at the card it says she is still flying. Then `onDone` (once).

 The illustration keeps its own colours in every theme (the paper, the envelope, the planet with
 its day and night sides). The ground is the page's (`ground`, the theme's bg by default), so the
 piece opens on the page the writer left and closes on it. The sky is the theme's day or night:
 Midnight gets the night sky (the courier cover's night, deepening to C.night at the horizon)
 with a few faint stars where the day has clouds, its words in the theme's ink and sub, the desk
 in its line and soft2, and the paper's shadow in black at .35.

 Wren is never drawn here: `bird` is her snapshot (bird-images "travelFly": the fly pose,
 empty-handed — the envelope at her beak is drawn here, beneath her), at a fixed 112 and scaled,
 so the picture is loaded once.

 Reduce Motion: the last tableau (stillT), held; once the send has landed, stillHoldSeconds more,
 then a .26s fade to nothing and `onDone`. No haptic.

 The sheet is 393 × 852 and covers the screen (slice: the larger scale, centred); the bird and
 the words sit over it in the same coordinates, in real type: the title in System 800 30
 (-.7 tracking, 36 line), the line under it in SF Mono 600 11 at 2.4 tracking, both scaled with
 the sheet. VoiceOver reads the two lines.
 */

public struct KLetterTravelWords: Equatable {
  /// "Off to the other side" (or the morning's title)
  public var title: String
  /// the usual second line, upper-cased
  public var sub: String
  /// "STILL FLYING…"
  public var wait: String
  /// "SENT"
  public var done: String

  public init(title: String = "", sub: String = "", wait: String = "", done: String = "") {
    self.title = title
    self.sub = sub
    self.wait = wait
    self.done = done
  }
}

public struct KLetterTravel: View {
  /// the bird's picture is drawn at this side and scaled (132 × .74 × the sheet's scale, at most)
  static let birdSide: CGFloat = 112

  private let theme: KTheme
  private let ground: Color
  private let ready: Bool
  private let words: KLetterTravelWords
  private let bird: KImageRef?
  private let onDone: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var clock = KLetterTravelClock()
  /// the haptic's trigger: the clock's tap, seen
  @State private var taps = 0
  /// the end has been told (once)
  @State private var finished = false
  /// Reduce Motion's fade
  @State private var fade: Double = 1

  /// - Parameters:
  ///   - ground: the page the piece opens on and closes to
  ///   - ready: the send has landed (TS)
  ///   - words: the card's lines, already translated and cased
  ///   - bird: her flying snapshot, empty-handed; nil until captured (she is then not drawn)
  ///   - onDone: the piece is over (once): TS uncovers the page or moves on
  public init(theme: KTheme, ground: Color, ready: Bool, words: KLetterTravelWords, bird: KImageRef?, onDone: @escaping () -> Void) {
    self.theme = theme
    self.ground = ground
    self.ready = ready
    self.words = words
    self.bird = bird
    self.onDone = onDone
  }

  public var body: some View {
    GeometryReader { geo in
      if reduceMotion {
        let line = KLetterTravelFrame.cardLine(reduce: true, T: KLetterTravelFrame.stillT, ready: ready, heldFor: 0, beat: 0)
        scene(size: geo.size, frame: KLetterTravelFrame(T: KLetterTravelFrame.stillT, beat: 0), beat: 0, line: line)
      } else {
        TimelineView(.animation(paused: finished)) { timeline in
          let now = timeline.date
          let step = clock.step(now: now, ready: ready)
          let line = KLetterTravelFrame.cardLine(reduce: false, T: step.T, ready: ready, heldFor: clock.heldFor(now: now), beat: step.beat)
          scene(size: geo.size, frame: KLetterTravelFrame(T: step.T, beat: step.beat), beat: step.beat, line: line)
            .onChange(of: clock.tapped) { _, tapped in
              if tapped { taps += 1 }
            }
            .onChange(of: clock.done) { _, done in
              if done { finish() }
            }
        }
      }
    }
    .opacity(fade)
    .background(ground)
    .ignoresSafeArea()
    .sensoryFeedback(.impact(weight: .light), trigger: taps)
    // Reduce Motion: once the send has landed, the tableau a little longer, then out
    .task(id: reduceMotion && ready) {
      guard reduceMotion && ready else { return }
      try? await Task.sleep(nanoseconds: UInt64(KLetterTravelFrame.stillHoldSeconds * 1_000_000_000))
      guard !Task.isCancelled else { return }
      withAnimation(.easeInOut(duration: KLetterTravelFrame.stillFadeSeconds)) {
        fade = 0
      } completion: {
        finish()
      }
    }
  }

  private func finish() {
    guard !finished else { return }
    finished = true
    onDone()
  }

  // ── one frame ──

  private static let W = KLetterTravelFrame.width
  private static let H = KLetterTravelFrame.height

  @ViewBuilder
  private func scene(size: CGSize, frame f: KLetterTravelFrame, beat: Double, line: KLetterTravelFrame.CardLine?) -> some View {
    // the authored frame covers the screen (slice); the bird and the words overlay it in its points
    let k = max(size.width / Self.W, size.height / Self.H)
    let ox = (size.width - Self.W * k) / 2
    let oy = (size.height - Self.H * k) / 2
    let px = { (x: Double) in ox + x * k }
    let py = { (y: Double) in oy + y * k }
    let birdPx = 132 * max(f.birdS, 0.001) * k

    ZStack(alignment: .topLeading) {
      Canvas { context, _ in
        var ctx = context
        ctx.translateBy(x: ox, y: oy)
        ctx.scaleBy(x: k, y: k)
        drawSheet(&ctx, f, beat: beat)
      }
      .frame(width: size.width, height: size.height)
      .accessibilityHidden(true)

      // the courier: her own snapshot, flying right, empty-handed
      if f.swoop > 0.01 {
        KImage(bird, size: CGSize(width: Self.birdSide, height: Self.birdSide), contentMode: .fit, placeholder: .clear)
          .scaleEffect(birdPx / Self.birdSide)
          .rotationEffect(.degrees(f.heading))
          .opacity(1 - f.outro)
          .position(x: px(f.birdX), y: py(f.birdY + f.bob))
          .allowsHitTesting(false)
          .accessibilityHidden(true)
      }

      // the words, in real type on the sheet's grid
      words(k: k, line: line)
        .frame(width: size.width)
        .offset(y: py(84) + (1 - f.markIn) * 8 * k)
        .opacity(f.markIn * (1 - f.outro))
        .allowsHitTesting(false)
    }
    .frame(width: size.width, height: size.height, alignment: .topLeading)
  }

  private func words(k: Double, line: KLetterTravelFrame.CardLine?) -> some View {
    let dark = theme.isDark
    let wordInk = dark ? theme.ink : Pal.ink
    let noteInk = dark ? theme.sub : Pal.ink.opacity(0.62)
    let second: String
    switch line {
    case .done: second = words.done
    case .wait: second = words.wait
    case nil: second = words.sub
    }
    return VStack(spacing: 0) {
      Text(words.title)
        .kText(.system(30 * k, .heavy, tracking: -0.7 / 30, lineHeight: 36.0 / 30.0))
        .foregroundStyle(wordInk)
        .multilineTextAlignment(.center)
        .padding(.horizontal, 24)
      Text(second)
        .kText(.mono(11 * k, .semibold, tracking: 2.4 / 11))
        .foregroundStyle(noteInk)
        .multilineTextAlignment(.center)
        .padding(.top, 12 * k)
        .padding(.horizontal, 24)
    }
  }

  // ── the sheet (LetterTravel.tsx's SVG, element for element) ──

  /// The illustration's own colours, the same in every theme (LetterTravel.tsx C).
  enum Pal {
    static let ink = Color(hex: "#1E1B35")
    static let pen = Color(hex: "#5B55FF")
    static let sky = Color(hex: "#BFE0FF")
    static let skyHi = Color(hex: "#7AC7FF")
    static let skyTop = Color(hex: "#E8F4FF")
    static let sea = Color(hex: "#7AB8E8")
    static let seaD = Color(hex: "#5B99CF")
    static let land = Color(hex: "#6DAE78")
    static let ylw = Color(hex: "#FFE14D")
    static let cream = Color(hex: "#FFE7BE")
    static let coral = Color(hex: "#F2887E")
    static let rule = Color(hex: "#DDD9F0")
    static let legs = Color(hex: "#E4E1F6")
    static let night = Color(hex: "#2B2650")
    static let nightTop = Color(hex: "#1E1B35")
    static let nightLow = Color(hex: "#2E2A6B")
    static let gold = Color(hex: "#C9A93A")
    static let lines = Color(hex: "#B9B3E0")
  }

  /// Midnight's stars, in the sheet's points: x, y, r, opacity (LetterTravel.tsx STARS)
  static let stars: [(Double, Double, Double, Double)] = [
    (28, 214, 1.1, 0.55), (74, 252, 0.9, 0.4), (122, 206, 1.3, 0.62), (168, 238, 0.8, 0.36),
    (232, 214, 1, 0.5), (284, 248, 1.2, 0.58), (338, 206, 0.9, 0.42), (368, 270, 1.1, 0.5),
    (18, 300, 0.8, 0.38), (376, 352, 0.9, 0.4), (14, 372, 1, 0.45), (44, 764, 1.1, 0.5),
    (118, 812, 0.8, 0.36), (318, 748, 1, 0.48), (366, 818, 1.2, 0.56),
  ]

  /// the lands: centre and radii in units of the globe's radius, the turn, the opacity
  static let lands: [(Double, Double, Double, Double, Double, Double)] = [
    (-0.52, -0.42, 0.3, 0.17, -18, 1),
    (-0.2, -0.62, 0.2, 0.1, 12, 1),
    (0.12, -0.5, 0.26, 0.15, 8, 1),
    (0.56, -0.3, 0.22, 0.13, -14, 1),
    (-0.06, -0.18, 0.34, 0.12, 4, 0.9),
    (0.4, -0.66, 0.13, 0.07, 22, 1),
  ]

  /// other people's letters crossing: their angle on the globe, where on their arc, their scale
  static let others: [(Double, Double, Double)] = [(-138, 0.3, 0.52), (-96, 0.6, 0.44), (-52, 0.5, 0.4), (152, 0.4, 0.46), (64, 0.3, 0.4)]

  private static func circle(_ x: Double, _ y: Double, _ r: Double) -> Path {
    Path(ellipseIn: CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r))
  }

  private static func ellipse(_ x: Double, _ y: Double, _ rx: Double, _ ry: Double) -> Path {
    Path(ellipseIn: CGRect(x: x - rx, y: y - ry, width: 2 * rx, height: 2 * ry))
  }

  private func drawSheet(_ ctx: inout GraphicsContext, _ f: KLetterTravelFrame, beat: Double) {
    let W = Self.W
    let H = Self.H
    let dark = theme.isDark
    let full = Path(CGRect(x: 0, y: 0, width: W, height: H))

    // the room, then the sky: daylight, or Midnight's night
    ctx.fill(full, with: .color(ground))
    if f.out > 0 {
      let sky: [Color] = dark ? [Pal.nightTop, Pal.night, Pal.nightLow] : [Pal.skyTop, Pal.sky, Pal.skyHi]
      var s = ctx
      s.opacity = f.out
      s.fill(full, with: .linearGradient(
        Gradient(stops: [.init(color: sky[0], location: 0), .init(color: sky[1], location: 0.46), .init(color: sky[2], location: 1)]),
        startPoint: CGPoint(x: 0, y: 0),
        endPoint: CGPoint(x: 0, y: H)
      ))
    }

    if dark {
      // the night's stars come in with the sky and stay, each breathing on the wall clock
      if f.out > 0 {
        for (i, star) in Self.stars.enumerated() {
          var c = ctx
          c.opacity = f.out * star.3 * (0.72 + 0.28 * sin(beat * 1.6 + Double(i) * 1.7))
          c.fill(Self.circle(star.0, star.1, star.2), with: .color(.white))
        }
      }
    } else {
      // a few clouds only while we are still near the ground
      let o = f.out * (1 - f.cross) * 0.8
      if o > 0 {
        var c = ctx
        c.opacity = o * 0.78
        c.fill(Self.ellipse(74, f.gTop - 96, 48, 14), with: .color(.white))
        c.opacity = o * 0.62
        c.fill(Self.ellipse(300, f.gTop - 150, 40, 12), with: .color(.white))
      }
    }

    // the desk, which sinks away as the camera pulls back (the room's furniture: the theme's)
    if f.out < 1 {
      var d = ctx
      d.opacity = 1 - f.out
      let drop = f.out * 110
      d.fill(Path(roundedRect: CGRect(x: 0, y: 588 + drop, width: W, height: 4), cornerRadius: 2), with: .color(dark ? theme.line : Pal.rule))
      let legs = dark ? theme.soft2 : Pal.legs
      d.fill(Path(CGRect(x: 46, y: 592 + drop, width: 10, height: 150)), with: .color(legs))
      d.fill(Path(CGRect(x: 337, y: 592 + drop, width: 10, height: 150)), with: .color(legs))
    }

    // ═══ the planet ═══
    if f.out > 0 {
      var p = ctx
      p.opacity = f.out
      p.drawLayer { layer in
        drawPlanet(&layer, f)
      }
    }

    // the page folding into a sealed envelope, on your desk
    if f.envOnDesk > 0 {
      var e = ctx
      e.opacity = f.envOnDesk
      e.drawLayer { layer in
        drawEnvelope(&layer, f, dark: dark)
      }
    }
    let glowR = max(64 * f.seal * (1 - f.taken) * (1 - f.out), 0.001)
    let glowO = (1 - f.taken) * (1 - f.out) * 0.8
    if glowO > 0 {
      var g = ctx
      g.opacity = glowO
      let c = CGPoint(x: f.deskX + 47, y: f.deskY + 14)
      g.fill(Self.circle(c.x, c.y, glowR), with: .radialGradient(
        Gradient(colors: [Pal.ylw.opacity(0.5), Pal.ylw.opacity(0)]),
        center: c, startRadius: 0, endRadius: glowR
      ))
    }

    // the envelope in her beak — under the bird, in her coordinates
    if f.taken > 0.01 {
      var b = ctx
      b.translateBy(x: f.birdX, y: f.birdY + f.bob)
      b.rotate(by: .degrees(f.heading))
      b.scaleBy(x: max(f.birdS, 0.001), y: max(f.birdS, 0.001))
      b.translateBy(x: 52, y: 10 + f.taken * 8)
      b.rotate(by: .degrees(-4 + f.taken * 10))
      let s = 0.42 + f.taken * 0.5
      b.scaleBy(x: s, y: s)
      b.opacity = f.taken
      b.drawLayer { l in
        l.fill(Path(roundedRect: CGRect(x: -26, y: -17, width: 52, height: 34), cornerRadius: 2), with: .color(Pal.ylw))
        var flap = Path()
        flap.move(to: CGPoint(x: -26, y: -17))
        flap.addLine(to: CGPoint(x: 0, y: 3))
        flap.addLine(to: CGPoint(x: 26, y: -17))
        l.stroke(flap, with: .color(Pal.gold), lineWidth: 2.4)
        l.fill(Self.circle(17, 10, 6), with: .color(Pal.coral))
      }
    }

    if f.outro > 0 {
      var o = ctx
      o.opacity = f.outro
      o.fill(full, with: .color(ground))
    }
  }

  private func drawPlanet(_ ctx: inout GraphicsContext, _ f: KLetterTravelFrame) {
    let gR = f.gR
    let gCX = f.gCX
    let gCY = f.gCY
    var halo = ctx
    halo.opacity = 0.3
    halo.fill(Self.circle(gCX, gCY, gR + 12), with: .color(Pal.skyHi))
    // the sea: the gradient across the globe's box, from .1,0 to .9,1
    ctx.fill(Self.circle(gCX, gCY, gR), with: .linearGradient(
      Gradient(colors: [Pal.sea, Pal.seaD]),
      startPoint: CGPoint(x: gCX - gR + 0.1 * 2 * gR, y: gCY - gR),
      endPoint: CGPoint(x: gCX - gR + 0.9 * 2 * gR, y: gCY + gR)
    ))

    var globe = ctx
    globe.clip(to: Self.circle(gCX, gCY, gR))
    for land in Self.lands {
      var l = globe
      l.translateBy(x: gCX + land.0 * gR, y: gCY + land.1 * gR)
      l.rotate(by: .degrees(land.4))
      l.opacity = land.5
      l.fill(Self.ellipse(0, 0, land.2 * gR, land.3 * gR), with: .color(Pal.land))
    }
    // latitude hairlines — a globe, not a ball
    for y in [-0.62, -0.42, -0.22, -0.02] {
      var h = globe
      h.opacity = 0.22
      h.stroke(Self.ellipse(gCX, gCY + y * gR, gR * max(0.02, 1 - y * y).squareRoot(), gR * 0.052), with: .color(.white), lineWidth: 1)
    }
    // the far side is in night — somewhere it is late
    globe.fill(Path(CGRect(x: gCX + gR * 0.34, y: gCY - gR, width: gR * 0.7, height: gR * 2)), with: .linearGradient(
      Gradient(colors: [Pal.night.opacity(0), Pal.night.opacity(0.62)]),
      startPoint: CGPoint(x: gCX + gR * 0.34, y: gCY),
      endPoint: CGPoint(x: gCX + gR * 1.02, y: gCY)
    ))
    for (x, y) in [(0.52, -0.52), (0.66, -0.34), (0.58, -0.14)] {
      var c = globe
      c.opacity = f.cross > 0.4 ? 0.9 : 0.5
      c.fill(Self.circle(gCX + x * gR, gCY + y * gR, 2.2), with: .color(Pal.ylw))
    }

    var rim = ctx
    rim.opacity = 0.5
    rim.stroke(Self.circle(gCX, gCY, gR), with: .color(.white), lineWidth: 1.6)

    // the route, drawn as she flies it
    for i in 0...25 {
      let p = Double(i) / 25
      if p > f.cross + 0.001 { continue }
      let pt = f.arc(p)
      var d = ctx
      d.opacity = 0.72
      d.fill(Self.circle(pt.x, pt.y, i % 4 == 0 ? 2.4 : 1.6), with: .color(.white))
    }

    // departure pin (you) — the arrival pin comes in as she nears it
    ctx.fill(Self.circle(f.home.x, f.home.y, 9), with: .color(.white))
    ctx.fill(Self.circle(f.home.x, f.home.y, 4.4), with: .color(Pal.pen))
    let awayO = KLetterTravelFrame.clamp((f.cross - 0.55) * 3, 0, 1)
    if awayO > 0 {
      var a = ctx
      a.opacity = awayO
      a.drawLayer { l in
        l.stroke(Self.circle(f.away.x, f.away.y, 11), with: .color(.white), lineWidth: 2.4)
        l.fill(Self.circle(f.away.x, f.away.y, 4.4), with: .color(Pal.coral))
      }
    }

    // other people's letters crossing at the same time
    let a = KLetterTravelFrame.clamp((f.cross - 0.1) * 2.4, 0, 1) * 0.72
    if a >= 0.02 {
      for other in Self.others {
        let ang = other.0 * .pi / 180
        let r = gR + 4 + sin(other.1 * .pi) * 34
        var o = ctx
        o.translateBy(x: gCX + cos(ang) * r, y: gCY + sin(ang) * r)
        o.scaleBy(x: other.2, y: other.2)
        o.rotate(by: .degrees(other.0 + 90))
        o.opacity = a
        o.drawLayer { l in
          let body = Path(roundedRect: CGRect(x: -11, y: -7.5, width: 22, height: 15), cornerRadius: 1.6)
          l.fill(body, with: .color(Pal.cream))
          l.stroke(body, with: .color(Pal.gold), lineWidth: 1.4)
          var flap = Path()
          flap.move(to: CGPoint(x: -11, y: -7.5))
          flap.addLine(to: CGPoint(x: 0, y: 1.5))
          flap.addLine(to: CGPoint(x: 11, y: -7.5))
          l.stroke(flap, with: .color(Pal.gold), lineWidth: 1.4)
        }
      }
    }
  }

  private func drawEnvelope(_ ctx: inout GraphicsContext, _ f: KLetterTravelFrame, dark: Bool) {
    var e = ctx
    e.translateBy(x: f.deskX, y: f.deskY)
    e.rotate(by: .degrees(KLetterTravelFrame.lerp(f.fold, 0, -7)))
    let w = f.foldW
    let h = f.foldH

    // its shadow on the desk
    var shadow = e
    shadow.opacity = (dark ? 0.35 : 0.1) * (1 - f.out)
    shadow.fill(Self.ellipse(0, h / 2 + 16, w / 2 - 8, 8), with: .color(dark ? .black : Pal.ink))

    let sheet = Path(roundedRect: CGRect(x: -w / 2, y: -h / 2, width: w, height: h), cornerRadius: 3)
    e.fill(sheet, with: .color(f.sealed ? Pal.ylw : .white))
    e.stroke(sheet, with: .color(f.sealed ? Pal.gold : Pal.rule), lineWidth: 2)

    // the written lines, going as it folds
    let linesO = KLetterTravelFrame.clamp(1 - f.fold * 1.15, 0, 1)
    if linesO > 0 {
      var l = e
      l.opacity = linesO
      for (i, lw) in [150.0, 120, 164, 96, 140, 74].enumerated() {
        l.fill(Path(roundedRect: CGRect(x: -w / 2 + 22, y: -h / 2 + 30 + Double(i) * 26, width: lw, height: 6), cornerRadius: 3), with: .color(Pal.lines))
      }
    }
    // the flap
    let flapO = KLetterTravelFrame.clamp((f.fold - 0.3) * 2.6, 0, 1)
    if flapO > 0 {
      var fl = e
      fl.opacity = flapO
      var flap = Path()
      flap.move(to: CGPoint(x: -w / 2, y: -h / 2))
      flap.addLine(to: CGPoint(x: 0, y: -h / 2 + h * 0.42))
      flap.addLine(to: CGPoint(x: w / 2, y: -h / 2))
      fl.stroke(flap, with: .color(f.sealed ? Pal.gold : Pal.rule), style: StrokeStyle(lineWidth: 2.4, lineJoin: .round))
    }
    // the seal, popping on with a squash
    var s = e
    s.translateBy(x: w * 0.22, y: h * 0.16)
    let k = max(f.seal * f.sealSquash, 0.001)
    s.scaleBy(x: k, y: k)
    s.fill(Self.circle(0, 0, 14), with: .color(Pal.coral))
    s.opacity = 0.72
    s.stroke(Self.circle(0, 0, 6.5), with: .color(.white), lineWidth: 2)
  }
}
