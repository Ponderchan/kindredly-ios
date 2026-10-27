// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE UPDATE PROMPT: WREN BRINGS A PARCEL (OTA 2026-10-25, owner's copy set A), drawn by SwiftUI
 behind the "parcel" switch. src/components/UpdatePrompt.tsx keeps the React Native faces as the
 fallback; src/screens/today/TodayUpdate.tsx (and lib/update-prompt-core) still decide when any of
 it shows, and TS keeps every timer that does something (the App Store opening 0.82s after Update,
 hard mode's reset, the dev preview's self-pressing Update). Swift draws and reports two taps.

 KParcelSheet: the sheet, in a full-screen Host inside a transparent React Native Modal (window
 level, over the tab bar). The app's iOS sheet face (sheet-chrome: a card 8 in from the edges,
 corners 34 continuous, sf, a soft shadow; capsule keys 50 tall in the system face) with a grabber,
 over the dim (rgba(30,27,53,.3), Midnight black .45). The dim fades in over .16s as the card
 rises over .3s (only fades in, .2s, under Reduce Motion). The card can be pulled down by the
 grabber (soft mode): far enough (90) or fast enough (900/s) and it goes (.2s), else it springs
 back; Later, a tap on the dim and VoiceOver's escape put it away the same way (.22s, at once under
 Reduce Motion). Hard mode has no grabber, no Later and none of those ways out. Once Update is
 pressed nothing puts it away.

 THE SCENE (KParcelScene, 214 tall, its top corners rounded inside the card's): Wren flies in from
 beyond the top right with the parcel hanging from her feet, lets it drop, and sits on it; now and
 then the parcel shakes and she looks at it, curious; Update: the bow flies off, the flaps pop, a
 few stars, she is delighted and hops. Every number is TS's (components/update-parcel: the paths,
 the geometry for this width, the beats), the curves are React Native's (Reanimated's: out cubic,
 in quad, in-out cubic, out back 1.8, and its in-out quad default), and every position is a pure
 function of the time since the scene started, since the shake began and since Update, drawn in a
 TimelineView that runs only while something moves. Under Reduce Motion nothing flies, shakes or
 pops: she is simply sitting on the parcel.

 WREN is never redrawn: her four pictures (flying with no letter of her own, content, curious,
 delight; the grown bird at 96 in her own look) are BirdSnapshots captures, all mounted and
 swapped by opacity. TS holds `ready` until they are there (or a moment has passed), so the
 fly-in never starts without her.

 KParcelBanner: the slim bar on Today after Later, in a Host of its own pinned under the status
 bar: the closed parcel 26 across, "a parcel's waiting for you" (shrinking to .65 before it is cut),
 "Update ›" (ind; ink on Midnight, where ind on lav is under AA); one button on the lav wash,
 corners 14 continuous, .7 while pressed. Its words grow with Dynamic Type only to xLarge.
 */

// MARK: - the data

/// The parcel's drawing (components/update-parcel PARCEL_ART), read once into paths in the box's
/// own units (PW × PH: one unit is one point in the scene).
struct KParcelArt: Equatable {
  var box = CGSize(width: 120, height: 100)
  var front = Path()
  var frontShade = Path()
  var top = Path()
  var flapL = Path()
  var flapR = Path()
  var ribbonFront = Path()
  var ribbonL = Path()
  var ribbonR = Path()
  var bowLoops = Path()
  var bowShade = Path()
  var bowTails = Path()
  var knot = CGRect(x: 55.5, y: 21.5, width: 9, height: 9)
  var knotRadius: CGFloat = 3
  /// the star in its 20 box
  var star = Path()
  var stamp = CGRect(x: 18, y: 52, width: 84, height: 24)
  var foot = CGPoint(x: 60, y: 96)
  var knotPivot = CGPoint(x: 60, y: 26)
  var flapLHinge = CGPoint(x: 4, y: 26)
  var flapRHinge = CGPoint(x: 116, y: 26)

  static func == (a: KParcelArt, b: KParcelArt) -> Bool {
    a.box == b.box && a.front == b.front && a.top == b.top && a.bowLoops == b.bowLoops && a.stamp == b.stamp && a.foot == b.foot
  }
}

/// Where everything stands in the scene and when it moves (update-parcel sceneGeometry and BEATS).
struct KParcelScene: Equatable {
  var height: CGFloat = 214
  /// Wren's size
  var size: CGFloat = 96
  var cx: CGFloat = 0
  var ground: CGFloat = 200
  var restX: CGFloat = 0
  var restY: CGFloat = 104
  var perchX: CGFloat = 0
  var perchY: CGFloat = 30
  var hoverX: CGFloat = 0
  var hoverY: CGFloat = 0
  var landX: CGFloat = 0
  var landY: CGFloat = 0
  var startX: CGFloat = 0
  var startY: CGFloat = -120
  var carryDx: CGFloat = -9
  var carryDy: CGFloat = 69
  /// her shake pivot, in her own box
  var perchOrigin = CGPoint(x: 0, y: 0)
  // the beats, ms
  var start: Double = 280
  var fly: Double = 950
  var hover: Double = 220
  var drop: Double = 300
  var land: Double = 640
  var settle: Double = 160
  var firstShake: Double = 1400
  var shakeMin: Double = 3400
  var shakeMax: Double = 5200
  var curious: Double = 1300
  var bow: Double = 520
  var flapDelay: Double = 90
  var flap: Double = 320
  var starsDelay: Double = 140
  var stars: Double = 760
  var starRun: Double = 560
  var starList: [KParcelStar] = []
}

struct KParcelStar: Equatable, Identifiable {
  var id: Int
  var dx: CGFloat
  var dy: CGFloat
  var size: CGFloat
  /// waxGold | lime | postRed
  var tone: String
  var delay: Double

  var color: Color {
    switch tone {
    case "lime": return KBrand.lime
    case "postRed": return KBrand.postRed
    default: return KBrand.waxGold
    }
  }
}

/// Her four pictures (BirdSnapshots), nil until captured.
struct KParcelBirds: Equatable {
  var fly: KImageRef?
  var content: KImageRef?
  var curious: KImageRef?
  var delight: KImageRef?
}

struct KParcelSheetContent: Equatable {
  var title = ""
  var line = ""
  var update = ""
  var later = ""
  /// "VERSION 1.0.7" on the stamp; "" while the App Store's version is unknown (no stamp)
  var version = ""
  /// hard mode: no Later, no grabber, no way to put it away
  var force = false
  /// Update was pressed (TS's): the parcel opens
  var opening = false
  /// hard mode sets the scene back on its parcel after each Update: a fresh scene, no fly-in
  var round = 0
  /// her pictures are there (or TS stopped waiting): the scene's clock may start
  var ready = false
  var art = KParcelArt()
  var scene = KParcelScene()
  var birds = KParcelBirds()
}

final class KParcelSheetActions {
  var onUpdate: () -> Void = {}
  var onLater: () -> Void = {}
}

// MARK: - the curves (Reanimated's)

enum KParcelEase {
  static func clamp(_ t: Double) -> Double { min(1, max(0, t)) }
  static func outCubic(_ t: Double) -> Double { let u = 1 - t; return 1 - u * u * u }
  static func inQuad(_ t: Double) -> Double { t * t }
  static func inOutCubic(_ t: Double) -> Double { t < 0.5 ? 4 * t * t * t : 1 - pow(2 - 2 * t, 3) / 2 }
  /// Reanimated's withTiming default
  static func inOutQuad(_ t: Double) -> Double { t < 0.5 ? 2 * t * t : 1 - pow(2 - 2 * t, 2) / 2 }
  /// Easing.out(Easing.back(s))
  static func outBack(_ t: Double, _ s: Double = 1.8) -> Double { let u = 1 - t; return 1 - u * u * ((s + 1) * u - s) }

  /// One timing from `from` to `to`, `duration` ms long, starting at `at`, read at `t` (ms).
  static func seg(_ t: Double, at: Double, duration: Double, from: Double, to: Double, _ ease: (Double) -> Double) -> Double {
    from + (to - from) * ease(clamp((t - at) / max(1, duration)))
  }
}

// MARK: - one frame of the scene

/// Where everything is at one moment.
struct KParcelFrame {
  var wx: Double = 0
  var wy: Double = 0
  var px: Double = 0
  var py: Double = 0
  /// the parcel's jiggle, which she rides (degrees)
  var shake: Double = 0
  /// the parcel's own landing, which she doesn't (degrees)
  var wobble: Double = 0
  var flying = false
  var bow: Double = 0
  var flaps: Double = 0
  /// ms into the stars' burst (0 … stars)
  var burst: Double = 0

  /// The frame at `now`. `t0`: when the scene's clock started (nil: not yet); `flying`: she flies
  /// in with it; `shakeAt`: the last shake's start; `openAt`: Update; `still`: Reduce Motion.
  static func at(_ now: Date, scene g: KParcelScene, t0: Date?, flying: Bool, shakeAt: Date?, openAt: Date?, still: Bool) -> KParcelFrame {
    typealias E = KParcelEase
    var f = KParcelFrame()
    let rest = { (f: inout KParcelFrame) in
      f.wx = Double(g.perchX)
      f.wy = Double(g.perchY)
      f.px = Double(g.restX)
      f.py = Double(g.restY)
    }
    // Update: everything to its place first (it may come mid-flight), then the bow, the flaps, the stars and her hop
    if let openAt {
      rest(&f)
      guard !still else { return f }
      let e = now.timeIntervalSince(openAt) * 1000
      f.bow = E.outCubic(E.clamp(e / g.bow))
      f.flaps = e < g.flapDelay ? 0 : E.outBack(E.clamp((e - g.flapDelay) / g.flap))
      f.burst = min(g.stars, max(0, e - g.starsDelay))
      let py = Double(g.perchY)
      f.wy = e < 200 ? E.seg(e, at: 0, duration: 200, from: py, to: py - 22, E.outCubic) : E.seg(e, at: 200, duration: 260, from: py - 22, to: py - 4, E.inQuad)
      return f
    }
    guard flying else {
      rest(&f)
      if let shakeAt { f.shake = shakeAngle(now.timeIntervalSince(shakeAt) * 1000) }
      return f
    }
    // the arrival: flown in together (the same curves keep the parcel on her feet), dropped, landed on
    let e = t0.map { now.timeIntervalSince($0) * 1000 } ?? 0
    let a = g.start, b = a + g.fly, t1 = b + g.hover, t2 = t1 + g.land
    let sx = Double(g.startX), sy = Double(g.startY), hx = Double(g.hoverX), hy = Double(g.hoverY)
    let cdx = Double(g.carryDx), cdy = Double(g.carryDy)
    let restY = Double(g.restY)
    f.flying = e < t2
    // her x
    if e < b { f.wx = E.seg(e, at: a, duration: g.fly, from: sx, to: hx, E.outCubic) }
    else if e < t1 { f.wx = hx }
    else if e < t2 { f.wx = E.seg(e, at: t1, duration: g.land, from: hx, to: Double(g.landX), E.inOutCubic) }
    else { f.wx = Double(g.perchX) }
    // her y: a little lift as the weight goes, then down onto the lid, and the settle
    if e < b { f.wy = E.seg(e, at: a, duration: g.fly, from: sy, to: hy, E.inOutCubic) }
    else if e < t1 { f.wy = hy }
    else if e < t1 + 200 { f.wy = E.seg(e, at: t1, duration: 200, from: hy, to: hy - 8, E.outCubic) }
    else if e < t2 { f.wy = E.seg(e, at: t1 + 200, duration: g.land - 200, from: hy - 8, to: Double(g.landY), E.inOutCubic) }
    else { f.wy = E.seg(e, at: t2, duration: g.settle, from: Double(g.perchY) + 3, to: Double(g.perchY), E.outCubic) }
    // the parcel: carried, then dropped with a little bounce
    f.px = e < b ? E.seg(e, at: a, duration: g.fly, from: sx + cdx, to: hx + cdx, E.outCubic) : hx + cdx
    if e < b { f.py = E.seg(e, at: a, duration: g.fly, from: sy + cdy, to: hy + cdy, E.inOutCubic) }
    else if e < t1 { f.py = hy + cdy }
    else {
      let d = e - t1
      if d < g.drop { f.py = E.seg(d, at: 0, duration: g.drop, from: hy + cdy, to: restY, E.inQuad) }
      else if d < g.drop + 110 { f.py = E.seg(d, at: g.drop, duration: 110, from: restY, to: restY - 7, E.outCubic) }
      else { f.py = E.seg(d, at: g.drop + 110, duration: 120, from: restY - 7, to: restY, E.inQuad) }
      // its own landing wobble
      let w = d - g.drop
      if w >= 0 && w < 250 {
        f.wobble = w < 80 ? E.seg(w, at: 0, duration: 80, from: 0, to: -3, E.inOutQuad)
          : w < 170 ? E.seg(w, at: 80, duration: 90, from: -3, to: 2, E.inOutQuad)
          : E.seg(w, at: 170, duration: 80, from: 2, to: 0, E.inOutQuad)
      }
    }
    if !f.flying, let shakeAt { f.shake = shakeAngle(now.timeIntervalSince(shakeAt) * 1000) }
    return f
  }

  /// The parcel's jiggle, `e` ms in: -5, 5, -4, 3, 0 over 70, 90, 90, 80, 70.
  static func shakeAngle(_ e: Double) -> Double {
    typealias E = KParcelEase
    let steps: [(Double, Double)] = [(70, -5), (90, 5), (90, -4), (80, 3), (70, 0)]
    var at = 0.0
    var from = 0.0
    for (duration, to) in steps {
      if e < at + duration { return E.seg(e, at: at, duration: duration, from: from, to: to, E.inOutQuad) }
      at += duration
      from = to
    }
    return 0
  }

  /// how long the shake lasts, ms
  static let shakeLength: Double = 400
  /// the opening's longest part (the stars), ms
  static func openLength(_ g: KParcelScene) -> Double { max(g.bow, g.flapDelay + g.flap, g.starsDelay + g.stars, 460) }
}

// MARK: - the scene

struct KParcelSceneView: View {
  let theme: KTheme
  let width: CGFloat
  let content: KParcelSheetContent
  /// she flies in with it (the first round); otherwise she is already sitting on it
  let enter: Bool

  @Environment(\.accessibilityReduceMotion) private var still
  @State private var t0: Date?
  @State private var flying = false
  @State private var openAt: Date?
  @State private var shakeAt: Date?
  @State private var curious = false
  @State private var running = false

  private var g: KParcelScene { content.scene }
  private var art: KParcelArt { content.art }

  private struct TaskKey: Equatable {
    let started: Bool
    let opening: Bool
    let still: Bool
  }

  var body: some View {
    TimelineView(.animation(minimumInterval: nil, paused: !running)) { context in
      let f = KParcelFrame.at(context.date, scene: g, t0: t0, flying: flying, shakeAt: shakeAt, openAt: openAt, still: still)
      layers(f)
    }
    .frame(width: width, height: g.height)
    // clipped, its top corners rounded inside the card's
    .clipShape(UnevenRoundedRectangle(topLeadingRadius: 18, bottomLeadingRadius: 0, bottomTrailingRadius: 0, topTrailingRadius: 18, style: .circular))
    .onChange(of: content.ready, initial: true) { _, ready in
      guard ready, t0 == nil else { return }
      t0 = Date()
      flying = enter && !still
    }
    .onChange(of: content.opening, initial: true) { _, opening in
      if opening && openAt == nil { openAt = Date() }
    }
    .task(id: TaskKey(started: t0 != nil, opening: content.opening, still: still)) {
      await run()
    }
  }

  /// The scene's clock: the arrival, then the shakes now and then; or the opening. Runs the
  /// TimelineView only while something moves (and 50ms past it, so the resting frame is drawn).
  private func run() async {
    let tail = 0.05
    if content.opening {
      guard !still else { return }
      running = true
      try? await Task.sleep(for: .seconds(KParcelFrame.openLength(g) / 1000 + tail))
      if !Task.isCancelled { running = false }
      return
    }
    guard let t0 else { return }
    var idleFrom = t0
    if flying {
      let landed = t0.addingTimeInterval((g.start + g.fly + g.hover + g.land + g.settle) / 1000)
      idleFrom = t0.addingTimeInterval((g.start + g.fly + g.hover + g.land) / 1000)
      if landed > Date() {
        running = true
        try? await Task.sleep(for: .seconds(landed.timeIntervalSinceNow + tail))
        guard !Task.isCancelled else { return }
        running = false
      }
    }
    // waiting: now and then the parcel shakes and she looks at it (none of it under Reduce Motion)
    guard !still else { return }
    var next = idleFrom.addingTimeInterval(g.firstShake / 1000)
    while !Task.isCancelled {
      let wait = next.timeIntervalSinceNow
      if wait > 0 { try? await Task.sleep(for: .seconds(wait)) }
      guard !Task.isCancelled else { return }
      let at = Date()
      shakeAt = at
      curious = true
      running = true
      try? await Task.sleep(for: .seconds(KParcelFrame.shakeLength / 1000 + tail))
      guard !Task.isCancelled else { return }
      running = false
      let back = at.addingTimeInterval(g.curious / 1000).timeIntervalSinceNow
      if back > 0 { try? await Task.sleep(for: .seconds(back)) }
      guard !Task.isCancelled else { return }
      curious = false
      next = at.addingTimeInterval(Double.random(in: g.shakeMin...max(g.shakeMin, g.shakeMax)) / 1000)
    }
  }

  // ── the layers, back to front ──
  @ViewBuilder
  private func layers(_ f: KParcelFrame) -> some View {
    let box = art.box
    let footAnchor = UnitPoint(x: art.foot.x / box.width, y: art.foot.y / box.height)
    let parcelTurn = Angle.degrees(f.shake + f.wobble)
    ZStack(alignment: .topLeading) {
      shadow(f)
      // the body: the inside, the front, the ribbon, the flaps and the stamp
      parcelBody(f)
        .frame(width: box.width, height: box.height)
        .rotationEffect(parcelTurn, anchor: footAnchor)
        .offset(x: f.px, y: f.py)
      wren(f)
      // the bow, over her feet: the same box as the body, moving with it
      bowLayer(f)
        .frame(width: box.width, height: box.height)
        .rotationEffect(parcelTurn, anchor: footAnchor)
        .offset(x: f.px, y: f.py)
      ForEach(g.starList) { s in
        star(s, f)
      }
    }
    .frame(width: width, height: g.height, alignment: .topLeading)
  }

  private func shadow(_ f: KParcelFrame) -> some View {
    let h = KParcelEase.clamp((Double(g.restY) - f.py) / 160)
    return Capsule(style: .circular)
      .fill(theme.isDark ? Color.black.opacity(0.45) : Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.12))
      .frame(width: art.box.width - 8, height: 10)
      .scaleEffect(x: 1 - 0.55 * h, y: 1)
      .opacity(1 - 0.85 * h)
      .offset(x: 4 + f.px, y: g.ground - 5)
      .accessibilityHidden(true)
  }

  private func shape(_ path: Path) -> KParcelPathShape {
    KParcelPathShape(path: path, box: art.box)
  }

  private func parcelBody(_ f: KParcelFrame) -> some View {
    let box = art.box
    return ZStack(alignment: .topLeading) {
      Group {
        shape(art.top).fill(KBrand.brassSeal)
        shape(art.front).fill(KBrand.waxGold)
        shape(art.frontShade).fill(Color.black.opacity(0.08))
        shape(art.ribbonFront).fill(KBrand.postRed)
      }
      .accessibilityHidden(true)
      ZStack {
        shape(art.flapL).fill(KBrand.creamBorder)
        shape(art.ribbonL).fill(KBrand.postRed)
      }
      .rotationEffect(.degrees(-120 * f.flaps), anchor: UnitPoint(x: art.flapLHinge.x / box.width, y: art.flapLHinge.y / box.height))
      .accessibilityHidden(true)
      ZStack {
        shape(art.flapR).fill(KBrand.creamBorder)
        shape(art.ribbonR).fill(KBrand.postRed)
      }
      .rotationEffect(.degrees(120 * f.flaps), anchor: UnitPoint(x: art.flapRHinge.x / box.width, y: art.flapRHinge.y / box.height))
      .accessibilityHidden(true)
      if !content.version.isEmpty {
        KParcelVersionStamp(label: content.version)
          .frame(width: art.stamp.width, height: art.stamp.height)
          .offset(x: art.stamp.minX, y: art.stamp.minY)
      }
    }
    .frame(width: box.width, height: box.height, alignment: .topLeading)
  }

  private func bowLayer(_ f: KParcelFrame) -> some View {
    let box = art.box
    let p = f.bow
    let knot = UnitPoint(x: art.knotPivot.x / box.width, y: art.knotPivot.y / box.height)
    return ZStack(alignment: .topLeading) {
      shape(art.bowTails).fill(KBrand.postRed)
      shape(art.bowLoops).fill(KBrand.postRed)
      shape(art.bowShade).fill(Color.black.opacity(0.14))
      RoundedRectangle(cornerRadius: art.knotRadius, style: .circular)
        .fill(KBrand.postRed)
        .frame(width: art.knot.width, height: art.knot.height)
        .offset(x: art.knot.minX, y: art.knot.minY)
    }
    .frame(width: box.width, height: box.height, alignment: .topLeading)
    .scaleEffect(1 - 0.3 * p, anchor: knot)
    .rotationEffect(.degrees(240 * p), anchor: knot)
    .offset(x: 50 * p, y: -90 * p)
    .opacity(1 - p * p)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }

  private func wren(_ f: KParcelFrame) -> some View {
    let s = g.size
    let face: KImageRef? = {
      if f.flying { return content.birds.fly }
      if openAt != nil { return content.birds.delight }
      return curious ? content.birds.curious : content.birds.content
    }()
    let pictures: [KImageRef?] = [content.birds.fly, content.birds.content, content.birds.curious, content.birds.delight]
    return ZStack {
      // all four mounted, so a change of face never waits on a picture
      ForEach(0 ..< pictures.count, id: \.self) { i in
        KImage(pictures[i], size: CGSize(width: s, height: s), contentMode: .fit, placeholder: .clear)
          .opacity(pictures[i] != nil && pictures[i] == face ? 1 : 0)
      }
    }
    .frame(width: s, height: s)
    // she rides the parcel's shake, about the parcel's foot
    .rotationEffect(.degrees(f.shake), anchor: UnitPoint(x: g.perchOrigin.x / s, y: g.perchOrigin.y / s))
    .offset(x: f.wx, y: f.wy)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }

  private func star(_ s: KParcelStar, _ f: KParcelFrame) -> some View {
    let p = KParcelEase.clamp((f.burst - s.delay) / g.starRun)
    let e = 1 - pow(1 - p, 3)
    let opacity = p <= 0 ? 0 : p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45
    return KParcelPathShape(path: art.star, box: CGSize(width: 20, height: 20))
      .fill(s.color)
      .frame(width: s.size, height: s.size)
      .rotationEffect(.degrees(90 * p))
      .scaleEffect(0.3 + 0.7 * min(1, p * 2.4))
      .offset(x: s.dx * e, y: s.dy * e)
      .opacity(opacity)
      .offset(x: g.cx - s.size / 2, y: g.restY + 14 - s.size / 2)
      .allowsHitTesting(false)
      .accessibilityHidden(true)
  }
}

/// A path in its box's units, drawn into whatever frame it gets.
struct KParcelPathShape: Shape {
  let path: Path
  let box: CGSize

  func path(in rect: CGRect) -> Path {
    guard box.width > 0, box.height > 0 else { return path }
    return path.applying(CGAffineTransform(a: rect.width / box.width, b: 0, c: 0, d: rect.height / box.height, tx: rect.minX, ty: rect.minY))
  }
}

/// The stamp on the front: "VERSION 1.0.6" on a scrap of white paper with a dashed post-red border,
/// in SF Mono 600 9.5 caps that never grow (a label on a drawing). The one thing VoiceOver reads in
/// the scene.
struct KParcelVersionStamp: View {
  static let paperEdge = Color(hex: "#D8D2C2")
  let label: String

  var body: some View {
    ZStack {
      RoundedRectangle(cornerRadius: 2, style: .circular)
        .fill(KBrand.paperWhite)
        .overlay(RoundedRectangle(cornerRadius: 2, style: .circular).strokeBorder(Self.paperEdge, lineWidth: 1))
      RoundedRectangle(cornerRadius: 1, style: .circular)
        .stroke(KBrand.postRed, style: StrokeStyle(lineWidth: 0.8, dash: [2.5, 2]))
        .padding(3)
      Text(label)
        .kText(.mono(9.5, .semibold, tracking: 0.4 / 9.5))
        .foregroundStyle(KBrand.inkOnBrand)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .padding(.horizontal, 4)
    }
    .environment(\.dynamicTypeSize, .large)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(label)
  }
}

/// The closed parcel as one small picture (the banner's glyph).
struct KParcelGlyph: View {
  let art: KParcelArt
  let width: CGFloat

  var body: some View {
    let box = art.box
    let k = width / box.width
    ZStack(alignment: .topLeading) {
      Group {
        KParcelPathShape(path: art.front, box: box).fill(KBrand.waxGold)
        KParcelPathShape(path: art.frontShade, box: box).fill(Color.black.opacity(0.08))
        KParcelPathShape(path: art.flapL, box: box).fill(KBrand.creamBorder)
        KParcelPathShape(path: art.flapR, box: box).fill(KBrand.creamBorder)
        KParcelPathShape(path: art.ribbonFront, box: box).fill(KBrand.postRed)
        KParcelPathShape(path: art.ribbonL, box: box).fill(KBrand.postRed)
        KParcelPathShape(path: art.ribbonR, box: box).fill(KBrand.postRed)
        KParcelPathShape(path: art.bowTails, box: box).fill(KBrand.postRed)
        KParcelPathShape(path: art.bowLoops, box: box).fill(KBrand.postRed)
        KParcelPathShape(path: art.bowShade, box: box).fill(Color.black.opacity(0.14))
      }
      RoundedRectangle(cornerRadius: art.knotRadius * k, style: .circular)
        .fill(KBrand.postRed)
        .frame(width: art.knot.width * k, height: art.knot.height * k)
        .offset(x: art.knot.minX * k, y: art.knot.minY * k)
    }
    .frame(width: width, height: box.height * k, alignment: .topLeading)
    .accessibilityHidden(true)
  }
}

// MARK: - the sheet

struct KParcelSheet: View {
  static let cardRadius: CGFloat = 34
  static let sideGap: CGFloat = 8
  static func quadInOut(_ d: Double) -> Animation { .timingCurve(0.455, 0.03, 0.515, 0.955, duration: d) }
  static func quadIn(_ d: Double) -> Animation { .timingCurve(0.55, 0.085, 0.68, 0.53, duration: d) }

  let theme: KTheme
  let content: KParcelSheetContent
  /// the home indicator's room: the card sits max(bottom − 26, 8) over the screen's foot
  let bottomInset: CGFloat
  let actions: KParcelSheetActions

  @Environment(\.accessibilityReduceMotion) private var still
  @State private var risen = false
  @State private var drag: CGFloat = 0
  /// Update was pressed here: nothing puts it away from now on (TS's `opening` follows)
  @State private var pressed = false
  @State private var leaving = false

  private var busy: Bool { pressed || content.opening }
  private var canGo: Bool { !content.force && !busy && !leaving }

  private var scrim: Color {
    theme.isDark ? Color.black.opacity(0.45) : Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.3)
  }

  var body: some View {
    GeometryReader { geo in
      let height = geo.size.height
      ZStack(alignment: .bottom) {
        scrim
          .opacity(risen ? 1 - min(1, drag / 400) : 0)
          .contentShape(Rectangle())
          .onTapGesture { dismiss(height: height) }
          .accessibilityHidden(true)
        card(width: geo.size.width - 2 * Self.sideGap, height: height)
          .padding(.horizontal, Self.sideGap)
          .padding(.bottom, max(bottomInset - 26, 8))
          .offset(y: still ? drag : (risen ? drag : height))
          .opacity(still && !risen ? 0 : 1)
      }
      .frame(width: geo.size.width, height: height, alignment: .bottom)
      .onAppear {
        guard !risen else { return }
        withAnimation(still ? Self.quadInOut(0.2) : Self.quadInOut(0.3)) { risen = true }
      }
      .accessibilityElement(children: .contain)
      .accessibilityAddTraits(.isModal)
      .accessibilityAction(.escape) { dismiss(height: height) }
    }
    .ignoresSafeArea()
    .onChange(of: content.round) { _, _ in
      // hard mode's next round: she is on her parcel again, and Update may be pressed again
      pressed = false
    }
  }

  private func card(width: CGFloat, height: CGFloat) -> some View {
    VStack(spacing: 0) {
      // the grabber says it can be pulled down; hard mode can't be, so it has none
      ZStack {
        if !content.force {
          Capsule(style: .circular)
            .fill(theme.line)
            .frame(width: 36, height: 5)
        }
      }
      .frame(height: 18)
      .frame(maxWidth: .infinity)
      .accessibilityHidden(true)

      KParcelSceneView(theme: theme, width: width, content: content, enter: content.round == 0)
        .id(content.round)

      VStack(spacing: 0) {
        Text(content.title)
          .kText(.system(20, .semibold, lineHeight: 25.0 / 20.0))
          .foregroundStyle(theme.ink)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
          .accessibilityAddTraits(.isHeader)
        Text(content.line)
          .kText(.system(15, lineHeight: 21.0 / 15.0))
          .foregroundStyle(theme.sub)
          .multilineTextAlignment(.center)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.top, 8)
      }
      .frame(maxWidth: .infinity)
      .padding(.horizontal, 24)
      .padding(.top, 2)
      .dynamicTypeSize(...DynamicTypeSize.accessibility1)

      VStack(spacing: 10) {
        KParcelKey(label: content.update, primary: true, theme: theme) {
          guard !busy else { return }
          pressed = true
          actions.onUpdate()
        }
        if !content.force {
          KParcelKey(label: content.later, primary: false, theme: theme) { dismiss(height: height) }
            .disabled(busy)
        }
      }
      .padding(.horizontal, 16)
      .padding(.top, 22)
      .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
    }
    .padding(.bottom, 14)
    .background {
      RoundedRectangle(cornerRadius: Self.cardRadius, style: .continuous)
        .fill(theme.sf)
        .shadow(color: Color.black.opacity(0.12), radius: 12, x: 0, y: 8)
    }
    .contentShape(RoundedRectangle(cornerRadius: Self.cardRadius, style: .continuous))
    .gesture(pull(height: height), including: canGo ? .all : .subviews)
  }

  /// pulled down by the grabber (soft mode): far or fast enough and it goes, else it springs back
  private func pull(height: CGFloat) -> some Gesture {
    DragGesture(minimumDistance: 8)
      .onChanged { value in
        guard canGo else { return }
        drag = max(0, value.translation.height)
      }
      .onEnded { value in
        guard canGo else { return }
        if value.translation.height > 90 || value.velocity.height > 900 {
          away(height: height, duration: 0.2)
        } else {
          withAnimation(.interpolatingSpring(stiffness: 260, damping: 22)) { drag = 0 }
        }
      }
  }

  /// Later, the dim, VoiceOver's escape: down and away, then TS hears it (at once under Reduce Motion)
  private func dismiss(height: CGFloat) {
    guard canGo else { return }
    if still {
      leaving = true
      actions.onLater()
      return
    }
    away(height: height, duration: 0.22)
  }

  private func away(height: CGFloat, duration: Double) {
    leaving = true
    withAnimation(Self.quadIn(duration)) {
      drag = height
    } completion: {
      actions.onLater()
    }
  }
}

/// A capsule key of the iOS sheet face: 50 tall at least, corners 25 continuous, System 600 17;
/// primary on ind with the page colour, quiet on soft with ink; .7 while pressed.
struct KParcelKey: View {
  let label: String
  let primary: Bool
  let theme: KTheme
  let action: () -> Void

  var body: some View {
    SwiftUI.Button(action: action) {
      Text(label)
        .kText(.system(17, .semibold, lineHeight: 22.0 / 17.0))
        .foregroundStyle(primary ? theme.bg : theme.ink)
        .multilineTextAlignment(.center)
        .padding(.horizontal, 20)
        .padding(.vertical, 13)
        .frame(maxWidth: .infinity, minHeight: 50)
        .background(RoundedRectangle(cornerRadius: 25, style: .continuous).fill(primary ? theme.ind : theme.soft))
        .contentShape(RoundedRectangle(cornerRadius: 25, style: .continuous))
    }
    .buttonStyle(KParcelKeyStyle())
  }
}

private struct KParcelKeyStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label.opacity(configuration.isPressed ? 0.7 : 1)
  }
}

// MARK: - the banner

struct KParcelBannerContent: Equatable {
  /// "a parcel's waiting for you"
  var line = ""
  /// "Update ›"
  var cta = ""
  /// VoiceOver: "a parcel's waiting for you, Update"
  var a11y = ""
  var art = KParcelArt()
}

struct KParcelBanner: View {
  let theme: KTheme
  let content: KParcelBannerContent
  let onPress: () -> Void

  var body: some View {
    SwiftUI.Button(action: onPress) {
      HStack(spacing: 10) {
        KParcelGlyph(art: content.art, width: 26)
        // the line gives way to the key: it shrinks before it would be cut
        Text(content.line)
          .kText(.system(15))
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.65)
          .frame(maxWidth: .infinity, alignment: .leading)
        Text(content.cta)
          .kText(.system(15, .semibold))
          .foregroundStyle(theme.isDark ? theme.ink : theme.ind)
          .lineLimit(1)
          .fixedSize()
      }
      .padding(.leading, 12)
      .padding(.trailing, 14)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(theme.lav))
      .contentShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
    .buttonStyle(KParcelKeyStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(content.a11y)
    .accessibilityAddTraits(.isButton)
    // the bar's 42 inside its room: 4 above, 6 below, 16 in
    .padding(.horizontal, 16)
    .padding(.top, 4)
    .padding(.bottom, 6)
    .dynamicTypeSize(...DynamicTypeSize.xLarge)
  }
}
