// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE HATCH ON 9, IN SWIFT (behind "hatch" in app_surfaces, off by default; 2026-11-09). A port of
 components/HatchStage as the Swift run's screen 9 uses it (burst "flood", the run's chrome, tap
 helps, no footer: KObHatchScreen draws the copy under it), with the same clock:

   the egg sits still 0.7 s, then knocks three times as a crack draws itself along it (2.4 s; a
   tap on the egg brings the next knock 0.45 s closer) and lights up from inside; it bursts — a
   gold ring, your own words thrown out of it, sixteen motes of dust, six shards on real gravity
   (the first half-second at 0.4× so they can be seen leaving). The top three fly and fade; the
   bottom three land and lie there as her nest. She rises out of it and is born 1.5 s after the
   burst; her first word (one of yours) comes up in a bubble.

 THEN SHE ANSWERS A FINGER: her body (a hop, a chirp, happy, sleepy, a wink — a different one
 each time), her head (a heart), the nest (she looks down at it). And on her own she does what
 the read says (chick-motions: a hop, a peck, a look about, a flap, a foot, a doze, a shake, a
 stretch, a wag; TS sends each one's weight, length and face).

 What is deliberately not React Native's: nothing drawn. The egg, the crack, the shards, the dust
 and the ring are Paths on HatchStage's own 320 × 300 canvas at 0.8 (EggShell's geometry, Y_ART's
 ink); SHE is the rig's pictures (HatchlingRig HatchlingPart, captured by TS in the run's look),
 each part moved by the same poses (chick-motions poseAt) — Wren is never redrawn. The burst's
 dark and flash are the old run's, not this one's (the screen floods with Shell instead, under
 this stage: KObHatchScreen). The haptics are TS's ("hatchKnock": light, or heavy at the burst);
 the crack's place ("hatchBurst", window points) and the birth ("hatchBorn", her first word) go
 to TS, which floods the screen and lets the key go, as with React Native.

 Reduce Motion: the born tableau at once (it still bursts: the flood is TS's cross-fade). Her
 breath, her hops and her habits are not gated, as in React Native. VoiceOver: the egg is a
 button while it can be helped (the "tap" line); she and the nest are pictures.
 */

// MARK: - the canvas

enum KObHatchGeo {
  static let w: CGFloat = 320
  static let h: CGFloat = 300
  static let cx: CGFloat = 160
  static let cy: CGFloat = 130
  static let k: CGFloat = 0.8
  static func sx(_ x: CGFloat) -> CGFloat { 160 + k * (x - 160) }
  static func sy(_ y: CGFloat) -> CGFloat { 150 + k * (y - 130) }

  static let crackAt = 0.7
  static let crackFor = 2.4
  static let bornAt = 1.5
  static let gravity = 980.0

  static let crack = KSVGPath.path("M-74 6 L-52 -8 L-30 4 L-8 -12 L14 0 L36 -14 L56 -2 L74 6")
  /// the crack's length: its dash of 200 draws `200 × crack` of it
  static let crackLength: CGFloat = {
    let pts: [CGPoint] = [(-74, 6), (-52, -8), (-30, 4), (-8, -12), (14, 0), (36, -14), (56, -2), (74, 6)].map { CGPoint(x: $0.0, y: $0.1) }
    return zip(pts, pts.dropFirst()).reduce(0) { $0 + hypot($1.1.x - $1.0.x, $1.1.y - $1.0.y) }
  }()
  static let twigs = KSVGPath.path("M-8 -12 L-12 -50 M36 -14 L42 -48")
  static let gold = Color(hex: "#FFD98A")

  /// the shell, cut along the crack into six: the top three fly, the bottom three land as her nest
  struct Shard {
    let path: Path
    let top: Bool
    let vx, vy, vr: Double
    var tx: Double = 0
    var ty: Double = 0
    var trot: Double = 0
    var tsc: Double = 1
  }

  static func polygon(_ s: String) -> Path {
    let n = s.split(separator: " ").map { $0.split(separator: ",").compactMap { Double($0) } }.filter { $0.count == 2 }
    var p = Path()
    for (i, q) in n.enumerated() {
      let pt = CGPoint(x: q[0], y: q[1])
      if i == 0 { p.move(to: pt) } else { p.addLine(to: pt) }
    }
    p.closeSubpath()
    return p
  }

  static let shards: [Shard] = [
    Shard(path: polygon("-74,6 -72,-20 -64,-50 -48,-76 -26,-92 -20,-40 -30,4 -52,-8"), top: true, vx: -128, vy: -268, vr: -300),
    Shard(path: polygon("-26,-92 0,-96 26,-92 30,-30 14,0 -8,-12 -30,4 -20,-40"), top: true, vx: -14, vy: -330, vr: 150),
    Shard(path: polygon("26,-92 48,-76 64,-50 72,-20 74,6 56,-2 36,-14 14,0 30,-30"), top: true, vx: 136, vy: -262, vr: 320),
    Shard(path: polygon("-74,6 -52,-8 -30,4 -26,40 -40,74 -52,68 -68,38"), top: false, vx: -108, vy: -92, vr: -110, tx: -78, ty: 4, trot: -30, tsc: 0.46),
    Shard(path: polygon("-30,4 -8,-12 14,0 20,44 12,92 0,96 -30,88 -40,74 -26,40"), top: false, vx: 8, vy: -58, vr: 26, tx: -2, ty: 17, trot: 8, tsc: 0.44),
    Shard(path: polygon("14,0 36,-14 56,-2 74,6 68,38 52,68 30,88 12,92 20,44"), top: false, vx: 112, vy: -86, vr: 124, tx: 74, ty: 2, trot: 32, tsc: 0.46),
  ]
}

/// What she does when poked, and the face, the mark and the head-tilt that go with it.
enum KObReaction: String {
  case hop, chirp, happy, sleepy, wink, curious, love

  static let body: [KObReaction] = [.hop, .chirp, .happy, .sleepy, .wink]

  var face: String {
    switch self {
    case .hop, .love: return "delight"
    case .chirp: return "listen"
    case .happy: return "happy"
    case .sleepy: return "sleepy"
    case .wink: return "wink"
    case .curious: return "curious"
    }
  }

  var mark: String {
    switch self {
    case .chirp: return "♪"
    case .happy: return "✦"
    case .sleepy: return "z"
    case .love: return "♥"
    default: return ""
    }
  }

  var tilt: Double {
    switch self {
    case .curious: return 9
    case .love: return -6
    default: return 0
    }
  }
}

// MARK: - the clock (HatchStage's tick, one step per frame)

final class KObHatchSim {
  struct Shard {
    let spec: Int
    var x = 0.0, y = 0.0, rot = 0.0, sc = 1.0, op = 1.0
    var vx: Double, vy: Double, vr: Double
    var life = 0.0
    var landed = false
    var done = false
  }

  struct Word {
    let w: String
    var x, y, vx, vy, rot, vr, life: Double
    let sz: Double
  }

  struct Dust {
    var x, y, vx, vy, life: Double
    let r: Double
  }

  let t0 = Date()
  private var last: Date?
  var t = 0.0
  var ct = 0.0
  var crack = 0.0
  var knocks = 0
  var wob = 0.0
  var pop = 0.0
  /// -1 until the shell goes, then seconds since
  var burst = -1.0
  var rise = 0.0
  var shake = 0.0
  var shards: [Shard] = []
  var words: [Word] = []
  var dust: [Dust] = []
  var quote = ""
  var re: KObReaction?
  private var reT = 0.0
  private var reI = 0
  var born = false

  var squish = KObTrack()
  var tilt = KObTrack()
  var spark = KObTrack()

  /// her habit playing now, and when it started; when the next one starts
  var idle: KObMotionRow?
  var idleAt = 0.0
  private var idleNext: Double?

  /// the stage's top-left in the run's window (the crack's place is from it)
  var stageOrigin: CGPoint?

  private var fed: [String] = []
  private var said = ""
  private var motions: [KObMotionRow] = []
  private var actions: KObActions?
  private var configured = false

  func clock(_ d: Date = Date()) -> Double { d.timeIntervalSince(t0) }

  /// what TS decided and where to say things; once (the run's words don't change on 9)
  func configure(_ piece: KObHatchPiece, _ actions: KObActions) {
    self.actions = actions
    motions = piece.motions
    guard !configured else { return }
    configured = true
    fed = piece.words
    said = piece.quote
  }

  private func say(_ type: String, _ s: String = "", _ n: Double = 0) {
    // out of the frame's update: the view is being drawn when the clock decides these
    let actions = actions
    DispatchQueue.main.async { actions?.send(type, s, n) }
  }

  private func knock(_ heavy: Bool = false) { say("hatchKnock", "", heavy ? 1 : 0) }

  /// One frame at `now`. The first call lands it at once under Reduce Motion.
  func step(_ now: Date, reduce: Bool) {
    guard let last else {
      last = now
      if reduce && !born {
        landAll()
        born = true
        say("hatchBorn", quote)
      }
      return
    }
    var dt = min(now.timeIntervalSince(last), 0.05)
    guard dt > 0 else { return }
    self.last = now
    t += dt
    wob *= pow(0.0016, dt)
    pop *= pow(0.0009, dt)
    if burst < 0 {
      ct += dt
      crack = min(1, max(0, (ct - KObHatchGeo.crackAt) / KObHatchGeo.crackFor))
      let kn = crack >= 1 ? 3 : Int(floor(crack * 3))
      if kn > knocks {
        knocks = kn
        wob = 1
        pop = 0.7
        knock()
      }
      if crack >= 1 { burstNow() }
    }
    // the first half-second after the burst runs slow, so the shards can be seen leaving
    let rdt = dt
    if burst >= 0 && burst < 0.55 { dt *= 0.4 }
    if burst >= 0 { burst += rdt }
    shake = max(0, shake - dt * 3.2)
    for i in words.indices {
      words[i].life += dt
      words[i].x += words[i].vx * dt
      words[i].y += words[i].vy * dt
      words[i].vy += 260 * dt
      words[i].vx *= 1 - 1.6 * dt
      words[i].rot += words[i].vr * dt
      words[i].vr *= 1 - 2 * dt
    }
    if burst > 0.34 { rise = min(1, rise + dt * 1.5) }
    for i in shards.indices {
      let spec = KObHatchGeo.shards[shards[i].spec]
      if shards[i].landed {
        let k = 1 - pow(0.004, dt)
        shards[i].x += (spec.tx - shards[i].x) * k
        shards[i].y += (spec.ty - shards[i].y) * k
        shards[i].rot += (spec.trot - shards[i].rot) * k
        shards[i].sc += (spec.tsc - shards[i].sc) * k
        continue
      }
      if shards[i].done { continue }
      shards[i].vy += KObHatchGeo.gravity * dt
      shards[i].x += shards[i].vx * dt
      shards[i].y += shards[i].vy * dt
      shards[i].rot += shards[i].vr * dt
      if !spec.top && shards[i].y > spec.ty { shards[i].landed = true }
      if spec.top {
        shards[i].life += dt
        if shards[i].life > 0.42 { shards[i].op = max(0, shards[i].op - dt * 1.7) }
        if shards[i].op <= 0 { shards[i].done = true }
      }
    }
    for i in dust.indices {
      dust[i].life += dt
      dust[i].x += dust[i].vx * dt
      dust[i].y += dust[i].vy * dt
      dust[i].vy += 240 * dt
    }
    dust.removeAll { $0.life >= 0.7 }
    if let r = re {
      reT += dt
      if reT > (r == .sleepy ? 1.9 : 1.15) {
        re = nil
        reT = 0
        tilt.run(clock(now), [.spring(0, 160, 11)])
      }
    }
    if burst > KObHatchGeo.bornAt && !born {
      born = true
      say("hatchBorn", quote)
    }
    stepIdle(clock(now))
  }

  /* what she does on her own once she's out (useChickIdle): a rest of 1.8–4.6 s, a motion, a rest */
  private func stepIdle(_ c: Double) {
    guard born else { return }
    if let m = idle {
      if (c - idleAt) / max(0.01, m.s) >= 1 {
        idle = nil
        idleNext = c + 1.8 + Double.random(in: 0..<1) * 2.8
      }
      return
    }
    guard let next = idleNext else {
      idleNext = c + 1.8 + Double.random(in: 0..<1) * 2.8
      return
    }
    if c >= next {
      let m = pick()
      idle = m
      lastIdle = m.m
      idleAt = c
      idleNext = nil
    }
  }

  /// chick-motions pickMotion: weighted by the read, never the last one twice running
  private func pick() -> KObMotionRow {
    let rows = motions.filter { $0.m != lastIdle }
    guard !rows.isEmpty else { return KObMotionRow(m: "look", w: 1, s: 1.6, face: "listen") }
    let total = rows.reduce(0) { $0 + $1.w }
    var x = Double.random(in: 0..<1) * total
    for r in rows {
      x -= r.w
      if x <= 0 { return r }
    }
    return rows[rows.count - 1]
  }

  private var lastIdle: String?

  /// the playing habit and how far through it is (nothing while she reacts to a finger)
  func idleNow(_ c: Double) -> (KObMotionRow, Double)? {
    guard re == nil, let m = idle else { return nil }
    return (m, min(1, max(0, (c - idleAt) / max(0.01, m.s))))
  }

  private func burstNow() {
    burst = 0
    wob = 1
    shake = 1
    knock(true)
    let origin = stageOrigin ?? .zero
    say("hatchBurst", "\(Double(origin.x + KObHatchGeo.sx(KObHatchGeo.cx))),\(Double(origin.y + KObHatchGeo.sy(KObHatchGeo.cy)))")
    let n = fed.count
    words = fed.enumerated().map { i, w in
      let an = -Double.pi * (0.15 + 0.7 * (Double(i) / Double(max(1, n - 1)))) + (Double.random(in: 0..<1) - 0.5) * 0.4
      let sp = 170 + Double.random(in: 0..<1) * 170
      return Word(w: w, x: 0, y: -10, vx: cos(an) * sp, vy: sin(an) * sp, rot: (Double.random(in: 0..<1) - 0.5) * 40, vr: (Double.random(in: 0..<1) - 0.5) * 120, life: 0, sz: 11 + Double.random(in: 0..<1) * 8)
    }
    quote = said
    shards = KObHatchGeo.shards.enumerated().map { i, s in
      Shard(spec: i, vx: s.vx * (0.9 + Double.random(in: 0..<1) * 0.25), vy: s.vy * (0.9 + Double.random(in: 0..<1) * 0.2), vr: s.vr * (0.85 + Double.random(in: 0..<1) * 0.35))
    }
    dust = (0..<16).map { _ in
      let an = Double.random(in: 0..<1) * 2 * .pi
      let sp = 60 + Double.random(in: 0..<1) * 190
      return Dust(x: 0, y: -6, vx: cos(an) * sp, vy: sin(an) * sp - 80, life: 0, r: 1.4 + Double.random(in: 0..<1) * 2.4)
    }
  }

  /// Reduce Motion: the born tableau at once
  private func landAll() {
    burstNow()
    burst = KObHatchGeo.bornAt + 1
    rise = 1
    shake = 0
    words = []
    dust = []
    for i in shards.indices {
      let spec = KObHatchGeo.shards[shards[i].spec]
      if spec.top {
        shards[i].done = true
      } else {
        shards[i].landed = true
        shards[i].x = spec.tx
        shards[i].y = spec.ty
        shards[i].rot = spec.trot
        shards[i].sc = spec.tsc
      }
    }
  }

  // MARK: a finger

  private func hop(_ c: Double) {
    squish.run(c, [.to(-1, 0.09, .outQuad), .to(1, 0.22, .outBack(2.6)), .spring(0, 220, 9)])
  }

  func react(_ r: KObReaction) {
    let c = clock()
    re = r
    reT = 0
    pop = 1
    knock()
    if r == .hop || r == .love || r == .happy { hop(c) }
    tilt.run(c, [.spring(r.tilt, 160, 11)])
    if !r.mark.isEmpty {
      spark.run(c, [.to(1, 0.16, .inOutQuad), .wait(r == .sleepy ? 0.9 : 0.38), .to(0, 0.32, .inOutQuad)])
    }
  }

  func pokeBody() {
    reI = (reI + 1 + Int(floor(Double.random(in: 0..<1) * 2))) % KObReaction.body.count
    react(KObReaction.body[reI])
  }

  /// a tap on the whole egg: the next knock comes sooner, and the egg answers the finger
  func help() {
    ct += 0.45
    pop = 0.6
    knock()
  }
}

// MARK: - the rig's poses (chick-motions poseAt)

/// Where each part of her is at a moment of a habit, in the rig's 200 box.
struct KObRigPose {
  var all = CGAffineTransform.identity
  var tail = CGAffineTransform.identity
  var farWing = CGAffineTransform.identity
  var nearWing = CGAffineTransform.identity
  var face = CGAffineTransform.identity
  var legL = CGAffineTransform.identity
  var seed = false

  static let rest = KObRigPose()

  /// an SVG transform list ("A B C" applies C first)
  private static func svg(_ ts: CGAffineTransform...) -> CGAffineTransform {
    ts.reversed().reduce(CGAffineTransform.identity) { $0.concatenating($1) }
  }

  private static func tr(_ x: Double, _ y: Double) -> CGAffineTransform { CGAffineTransform(translationX: x, y: y) }

  private static func rot(_ deg: Double, _ p: CGPoint) -> CGAffineTransform {
    CGAffineTransform(translationX: p.x, y: p.y).rotated(by: deg * .pi / 180).translatedBy(x: -p.x, y: -p.y)
  }

  private static let body = CGPoint(x: 100, y: 113.5)
  private static let feet = CGPoint(x: 100, y: 166)
  private static let near = CGPoint(x: 145, y: 116)
  private static let far = CGPoint(x: 58, y: 114)
  private static let tailRoot = CGPoint(x: 54, y: 128)
  private static let hip = CGPoint(x: 91, y: 147)

  private static func bump(_ p: Double) -> Double { sin(.pi * min(1, max(0, p))) }

  static func at(_ m: String?, _ p: Double) -> KObRigPose {
    guard let m else { return .rest }
    var o = KObRigPose()
    let b = bump(p)
    switch m {
    case "hop":
      o.all = tr(0, -14 * b)
    case "foot":
      o.legL = svg(tr(0, -7 * b), rot(-22 * b, hip))
    case "peck":
      let d = bump(min(1, p / 0.75))
      o.all = rot(9 * d, feet)
      o.face = svg(rot(26 * d, body), tr(0, 5 * d))
      o.seed = p < 0.5
    case "flap":
      let f = abs(sin(2 * .pi * p))
      o.all = tr(0, -4 * f)
      o.nearWing = rot(-46 * f, near)
      o.farWing = rot(46 * f, far)
    case "look":
      let s = sin(2 * .pi * p)
      let k = (s < 0 ? -1.0 : s > 0 ? 1.0 : 0) * sqrt(abs(s))
      o.face = tr(-8 * k, 0)
    case "doze":
      let e = p < 0.2 ? KObEase.inOutQuad(p / 0.2) : p > 0.8 ? 1 - KObEase.inOutQuad((p - 0.8) / 0.2) : 1
      o.all = tr(0, 3 * e)
      o.face = tr(0, 2 * e)
    case "shake":
      o.face = tr(6 * sin(4 * .pi * p) * (1 - p), 0)
    case "stretch":
      o.all = svg(tr(feet.x, feet.y), CGAffineTransform(scaleX: 1 - 0.06 * b, y: 1 + 0.1 * b), tr(-feet.x, -feet.y))
      o.face = tr(0, -6 * b)
    case "wag":
      o.tail = rot(24 * sin(5 * .pi * p) * (1 - p * 0.3), tailRoot)
    default:
      break
    }
    return o
  }
}

/// HatchlingRig from its pictures: each part on the 200 box, moved by the pose, scaled to `size`.
struct KObRig: View {
  let layers: [String: KImageRef]
  let face: KImageRef?
  let pose: KObRigPose
  let size: CGFloat

  var body: some View {
    ZStack(alignment: .topLeading) {
      // the seed she's after, on the ground in front of her
      if pose.seed {
        Ellipse().fill(Color(hex: "#E8A63C")).frame(width: 8, height: 5.2).offset(x: 146, y: 167.4)
      }
      part(layers["tail"]).transformEffect(pose.tail)
      part(layers["farWing"]).transformEffect(pose.farWing)
      part(layers["legL"]).transformEffect(pose.legL)
      part(layers["base"])
      part(layers["nearWing"]).transformEffect(pose.nearWing)
      part(face).transformEffect(pose.face)
    }
    .frame(width: 200, height: 200, alignment: .topLeading)
    .transformEffect(pose.all)
    .scaleEffect(size / 200, anchor: .topLeading)
    .frame(width: size, height: size, alignment: .topLeading)
  }

  private func part(_ ref: KImageRef?) -> some View {
    KImage(ref, size: CGSize(width: 200, height: 200), contentMode: .fit, placeholder: .clear)
      .frame(width: 200, height: 200)
  }
}

// MARK: - the stage

struct KObHatchStage: View {
  let ctx: KObCtx
  let piece: KObHatchPiece

  @Environment(\.accessibilityReduceMotion) private var reduce
  @State private var sim = KObHatchSim()

  private typealias G = KObHatchGeo

  var body: some View {
    VStack(spacing: 0) {
      // HatchStage's header: the top bar's room, as on the React Native screen
      Color.clear.frame(height: ctx.top + KOb.topBarH)
      TimelineView(.animation) { tl in
        let _ = sim.configure(piece, ctx.actions)
        let _ = sim.step(tl.date, reduce: reduce)
        frame(sim.clock(tl.date))
      }
      .frame(width: G.w, height: G.h)
      .onGeometryChange(for: CGRect.self) { $0.frame(in: .named(KObSpace.root)) } action: { sim.stageOrigin = $0.origin }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    .background(warm)
    .onChange(of: piece.celebrate) { _, _ in sim.react(.hop) }
  }

  /// every picture of her drawn once, unseen, so a face that changes is already in memory
  private var warm: some View {
    KObWarmPictures(refs: Array(piece.faces.values) + Array(piece.layers.values), size: 200)
  }

  @ViewBuilder
  private func frame(_ c: Double) -> some View {
    let s = sim
    let crackPhase = s.burst < 0
    let air = KObBreath.at(c)
    let squish = s.squish.value(c)
    let tilt = s.tilt.value(c)
    let spark = s.spark.value(c)
    let shakeX = sin(s.t * 90) * s.shake * 4
    let shakeY = cos(s.t * 70) * s.shake * 3
    let scale = 0.9 + s.rise * 0.28
    let size = (148 * (scale / 1.18)).rounded()
    let bx = G.sx(G.cx)
    let by = G.sy(G.cy + 40 - CGFloat(s.rise) * 28)
    let face = s.re?.face ?? piece.mood
    let idle = s.idleNow(c)
    let rigFace = idle.map { $0.0.face.isEmpty ? face : $0.0.face } ?? face
    let pose = idle.map { KObRigPose.at($0.0.m, $0.1) } ?? .rest
    let qs = s.born ? min(1, max(0, (s.burst - 1.3) / 0.35)) : 0
    let snap = Snapshot(s)
    ZStack(alignment: .topLeading) {
      Canvas { g, _ in back(&g, snap) }
        .frame(width: G.w, height: G.h)
        .allowsHitTesting(false)

      // a tap helps it out: the next knock comes sooner
      if crackPhase {
        Button { sim.help() } label: {
          Color.clear.frame(width: G.k * 160, height: G.k * 200).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(ctx.w("tap"))
        .offset(x: G.sx(G.cx - 80), y: G.sy(G.cy - 100))
      }

      // the nest answers a tap: she looks down at it
      if s.born {
        Color.clear
          .frame(width: 260, height: G.k * 64)
          .contentShape(Rectangle())
          .onTapGesture { sim.react(.curious) }
          .offset(x: 30, y: G.sy(G.cy - 20))
          .accessibilityHidden(true)
      }

      // her, covered by the whole shell until it goes
      if s.burst >= 0 {
        bird(size: size, face: piece.faces[rigFace] ?? piece.faces[piece.mood] ?? piece.faces["content"], pose: pose, spark: spark, born: s.born)
          .rotationEffect(.degrees(tilt))
          .scaleEffect(x: 1 - squish * 0.12 + air * 0.01, y: 1 + squish * 0.16 + air * 0.015)
          .offset(y: -air * 2.5 - squish * 14)
          .offset(x: bx - size / 2, y: by - size * 0.62)
      }

      // in front of her: the ring and the flying shards
      Canvas { g, _ in front(&g, snap) }
        .frame(width: G.w, height: G.h)
        .allowsHitTesting(false)

      // your words, thrown (on Shell: one in three in blue, the rest ink)
      ForEach(Array(snap.words.enumerated()), id: \.offset) { i, w in
        let op = min(1, max(0, 1 - (w.life - 1.4) / 0.8))
        if op > 0 {
          Text(w.w)
            .kText(.content(w.sz * G.k + 2, italic: true))
            .foregroundStyle(i % 3 == 0 ? KOb.blue : KOb.ink)
            .lineLimit(1)
            .frame(width: 140)
            .rotationEffect(.degrees(w.rot))
            .opacity(op)
            .offset(x: G.sx(G.cx + w.x) - 70, y: G.sy(G.cy + w.y) - 10)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
        }
      }

      // the one word she says first
      if qs > 0 && !s.quote.isEmpty {
        let qb = 1 + sin(.pi * qs) * 0.12
        quote(s.quote)
          .scaleEffect(qs * qb)
          .opacity(qs)
          .offset(x: G.sx(G.cx + 80) - 90, y: G.sy(G.cy - 92 - CGFloat(s.rise) * 20) - 18)
          .allowsHitTesting(false)
      }
    }
    .frame(width: G.w, height: G.h, alignment: .topLeading)
    .offset(x: shakeX, y: shakeY)
  }

  private func bird(size: CGFloat, face: KImageRef?, pose: KObRigPose, spark: Double, born: Bool) -> some View {
    let r = sim.re
    let markColor: Color = r == .love ? Color(hex: "#F2887E") : r == .chirp ? KOb.blue : KOb.ink
    return ZStack(alignment: .topLeading) {
      KObRig(layers: piece.layers, face: face, pose: pose, size: size)
        .accessibilityHidden(true)
      Text(verbatim: r?.mark ?? "")
        .font(.system(size: 19))
        .foregroundStyle(markColor)
        .scaleEffect(0.6 + spark * 0.5)
        .offset(y: -spark * 18)
        .opacity(spark)
        .offset(x: size * 0.18, y: 2)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
      if born {
        // her head: a heart; her body: a different reaction each time
        Color.clear
          .frame(width: size * 0.72, height: size * 0.44)
          .contentShape(Rectangle())
          .onTapGesture { sim.react(.love) }
          .offset(x: size * 0.14)
          .accessibilityHidden(true)
        Color.clear
          .frame(width: size, height: size * 0.56)
          .contentShape(Rectangle())
          .onTapGesture { sim.pokeBody() }
          .offset(y: size * 0.44)
          .accessibilityHidden(true)
      }
    }
    .frame(width: size, height: size, alignment: .topLeading)
  }

  private func quote(_ q: String) -> some View {
    let box = RoundedRectangle(cornerRadius: 8, style: .continuous)
    return VStack(spacing: 0) {
      Text(verbatim: "“\(q)…”")
        .kText(.content(15, italic: true))
        .foregroundStyle(KOb.ink)
        .lineLimit(1)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(box.fill(KOb.paper))
        .overlay(box.strokeBorder(KOb.ink, lineWidth: 2))
      // the bubble's tail: a square turned 45°, its two lower edges inked
      ZStack {
        Rectangle().fill(KOb.paper)
        Path { p in
          p.move(to: CGPoint(x: 9, y: 0))
          p.addLine(to: CGPoint(x: 9, y: 9))
          p.addLine(to: CGPoint(x: 0, y: 9))
        }
        .stroke(KOb.ink, lineWidth: 2)
      }
      .frame(width: 10, height: 10)
      .rotationEffect(.degrees(45))
      .padding(.top, -6)
      .offset(x: -38)
    }
    .frame(width: 180)
    .accessibilityElement(children: .combine)
  }

  // MARK: drawing

  /// one frame's state, copied for the canvases
  private struct Snapshot {
    let t, crack, wob, pop, burst: Double
    let shards: [KObHatchSim.Shard]
    let words: [KObHatchSim.Word]
    let dust: [KObHatchSim.Dust]

    init(_ s: KObHatchSim) {
      t = s.t
      crack = s.crack
      wob = s.wob
      pop = s.pop
      burst = s.burst
      shards = s.shards
      words = s.words
      dust = s.dust
    }
  }

  private func stageSpace(_ g: inout GraphicsContext) {
    g.translateBy(x: 160, y: 150)
    g.scaleBy(x: G.k, y: G.k)
    g.translateBy(x: -160, y: -130)
  }

  private var art: KObShellArt { KObShellArt.at(ctx.content.shell) }

  private func shellShading() -> GraphicsContext.Shading {
    .linearGradient(
      Gradient(stops: [.init(color: .white, location: 0), .init(color: art.base, location: 0.46), .init(color: art.mid, location: 1)]),
      startPoint: CGPoint(x: -40, y: -96),
      endPoint: CGPoint(x: 50, y: 96)
    )
  }

  private func drawShard(_ g: GraphicsContext, _ s: KObHatchSim.Shard) {
    var sg = g
    sg.translateBy(x: G.cx + s.x, y: G.cy + s.y)
    sg.rotate(by: .degrees(s.rot))
    sg.scaleBy(x: s.sc, y: s.sc)
    sg.opacity = s.op
    let path = G.shards[s.spec].path
    sg.fill(path, with: shellShading())
    sg.stroke(path, with: .color(KOb.eggLine), style: StrokeStyle(lineWidth: 2, lineJoin: .round))
  }

  /// behind her: the ground's shadow, the glow, the egg while it's whole, the nest, the dust
  private func back(_ g: inout GraphicsContext, _ f: Snapshot) {
    stageSpace(&g)
    let shadow: Color = piece.shadowDark ? Color.black.opacity(0.35) : KOb.eggLine.opacity(0.1)
    g.fill(Path(ellipseIn: CGRect(x: G.cx - 66, y: G.cy + 58 - 9, width: 132, height: 18)), with: .color(shadow))

    let crackPhase = f.burst < 0
    let lit = crackPhase ? f.crack : 1
    let glowK = 0.5 + lit * 0.5
    let glowOp = crackPhase ? 0.12 + lit * 0.48 : max(0, 0.6 - f.burst * 0.5)
    if glowOp > 0 {
      var gg = g
      gg.translateBy(x: G.cx, y: G.cy)
      gg.scaleBy(x: glowK, y: glowK)
      gg.opacity = glowOp
      gg.fill(
        Path(ellipseIn: CGRect(x: -150, y: -150, width: 300, height: 300)),
        with: .radialGradient(Gradient(stops: [.init(color: G.gold.opacity(0.95), location: 0), .init(color: G.gold.opacity(0), location: 1)]), center: .zero, startRadius: 0, endRadius: 150)
      )
    }

    if crackPhase {
      var eg = g
      let breathe = 1 + sin(f.t * 2.3) * 0.014
      eg.translateBy(x: G.cx, y: G.cy)
      eg.rotate(by: .degrees(f.wob * sin(f.t * 26) * 8))
      eg.scaleBy(x: breathe * (1 + f.pop * 0.04), y: breathe * (1 - f.pop * 0.05))
      eg.fill(KObEggPaths.rim, with: shellShading())
      eg.stroke(KObEggPaths.rim, with: .color(KOb.eggLine), style: StrokeStyle(lineWidth: 2.4, lineJoin: .round))
      for (x, y, r) in KObEggPaths.specks {
        eg.fill(Path(ellipseIn: CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r)), with: .color(art.deep.opacity(0.55)))
      }
      if let mark = art.mark { eg.fill(KObEggPaths.mark, with: .color(mark.opacity(0.7))) }
      let drawn = min(1, 200 * f.crack / G.crackLength)
      if drawn > 0 {
        eg.stroke(
          G.crack.trimmedPath(from: 0, to: drawn),
          with: .color(KOb.eggLine.opacity(0.85)),
          style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round)
        )
      }
      if f.crack > 0.62 {
        eg.stroke(G.twigs, with: .color(KOb.eggLine.opacity(min(1, (f.crack - 0.62) * 2.4))), style: StrokeStyle(lineWidth: 2.4, lineCap: .round))
      }
    }

    for s in f.shards where s.landed { drawShard(g, s) }
    for d in f.dust {
      g.fill(
        Path(ellipseIn: CGRect(x: G.cx + d.x - d.r, y: G.cy + d.y - d.r, width: 2 * d.r, height: 2 * d.r)),
        with: .color(G.gold.opacity(max(0, 1 - d.life / 0.7)))
      )
    }
  }

  /// in front of her: the ring and the shards still flying
  private func front(_ g: inout GraphicsContext, _ f: Snapshot) {
    stageSpace(&g)
    if f.burst >= 0 && f.burst < 0.3 {
      let r = 60 + f.burst * 380
      let a = 1 - f.burst / 0.3
      g.stroke(Path(ellipseIn: CGRect(x: G.cx - r, y: G.cy - r, width: 2 * r, height: 2 * r)), with: .color(G.gold.opacity(a)), lineWidth: 12 * a)
    }
    for s in f.shards where !s.landed && !s.done { drawShard(g, s) }
  }
}
