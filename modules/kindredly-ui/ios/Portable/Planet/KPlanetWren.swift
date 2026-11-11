import SwiftUI

/* WREN ON THE PLANET.
   ─────────────────────────────────────────────────────────────────────────────
   She is not painted on the ground. She keeps her place on the screen and
   answers the hand: the planet turns under her, and what she feels is how fast
   the ground at her feet is moving (the engine's swirl).

   Five states, each with its own stillness and its own answer to a turn:

   home      asleep on top, breathing. A turn wakes her; she runs against the
             ground to stay put; a hard flick sends her up, she lands when it
             slows, star eyes on landing, and sleeps again later.
   out       flies her own loop round the planet with the letter, passing behind
             it. A turn sweeps her along — faster, leaning, speed lines — and
             she eases back to her cruise.
   waiting   perched on the right shoulder, facing out. Every few seconds she
             glances back and taps a foot.
   back      flies in with the reply, lands on top, three hops, the letter set
             down beside her; a hop every few seconds until it is read.
   dayOff    laps through two gates in the sky, empty-handed, a dotted trail
             behind her.

   A tap on her: a hop and a face. Every number is the prototype's
   (design/courier-planet/prototype, stepWren / drawWren), per 60 Hz step. */

public enum KPlanetWrenState: String, Sendable {
  case home, out, waiting, back, dayOff
}

/// Who is on the planet, and what she is doing.
public struct KPlanetWren: Equatable, Sendable {
  /// her skin, stage and what she wears; the planet sets her mood and pose itself
  public var look = KWrenLook()
  public var state: KPlanetWrenState = .home
  /// at home with letters behind her she naps; with an empty bag she waits awake
  public var napping = true

  public init() {}
}

/// Where she is this frame, for the painter.
struct KWrenNow {
  var side: CGFloat = 32
  var pop: CGFloat = 1
  var facing: CGFloat = 1
  var flap: CGFloat = 1
  var breath: CGFloat = 1
  var mood: KWrenMood = .content
  var flying = false
  /// the flying pose carries the letter
  var letter = true
  // on the rim (home, waiting, back): the angle from the top, how high off the ground, the lean
  var onRim = false
  var phi: CGFloat = 0
  var height: CGFloat = 0
  var lean: CGFloat = 0
  /// the reply, set down beside her
  var setDown = false
  // on her loop (out, dayOff)
  var at = CGPoint.zero
  var behind = false
  var hidden = false
  var tilt: CGFloat = 0
  var scale: CGFloat = 1
  var whoosh: CGFloat = 0
  var gates = false
}

struct KWrenMotion {
  static let cruise: CGFloat = -0.0075
  /// the axis her loop goes round: straight up, tipped thirty degrees toward the reader
  static let loopAxis = KVec(0, -cos(30 * CGFloat.pi / 180), sin(30 * CGFloat.pi / 180))

  private var th: CGFloat = -.pi / 2 - 0.9
  private var w: CGFloat = 0
  private var phi: CGFloat = 0
  private var dphi: CGFloat = 0
  private var air: CGFloat = 0
  private var airUntil: TimeInterval = 0
  private var awakeUntil: TimeInterval = 0
  private var wheeUntil: TimeInterval = 0
  private var tapAt: TimeInterval = -1e9
  private var swapAt: TimeInterval = 0
  private var facing: CGFloat = 1
  private var lastX: CGFloat = 0
  private var state: KPlanetWrenState?
  private var ticks = 0
  private(set) var trail: [(at: CGPoint, behind: Bool, hidden: Bool)] = []
  private(set) var now = KWrenNow()

  /// A tap landed on her.
  mutating func tapped(_ time: TimeInterval) {
    tapAt = time
    wheeUntil = time + 1.0
    awakeUntil = time + 2.2
  }

  /// One 60 Hz step. `swirl`: what the planet did this step. `loop`, `lift`: her loop's width
  /// (degrees from its axis) and how far above the ground she flies.
  mutating func step(_ wren: KPlanetWren, swirl: KSwirl, layout: KPlanetLayout, loop: CGFloat, lift: CGFloat, time: TimeInterval, reduceMotion rm: Bool) {
    if state != wren.state {
      let first = state == nil
      state = wren.state
      w = 0
      trail.removeAll()
      swapAt = first ? time - 10 : time
      awakeUntil = first ? 0 : time + 1.2
      wheeUntil = 0
      if wren.state == .back, !first {
        // she flies in with it
        phi = -1.15
        dphi = 0
        air = 1
        airUntil = time + 0.5
      } else if wren.state == .home || wren.state == .waiting, !first {
        // she flies to her new place
        airUntil = time + 0.5
      }
      if first, wren.state == .waiting { phi = 1.02 }
    }
    let r = layout.radius
    var out = KWrenNow()
    out.side = min(max(r * 0.42, 32), 44)
    out.pop = rm ? 1 : min(1, 0.55 + CGFloat(time - swapAt) / 0.26 * 0.45)
    let sinceTap = time - tapAt
    let jump: CGFloat = sinceTap < 0.42 ? sin(CGFloat(sinceTap) / 0.42 * .pi) * 9 : 0
    let egg = wren.look.stage == .egg

    if !egg, wren.state == .out || wren.state == .dayOff {
      flyStep(wren, swirl: swirl, layout: layout, loop: loop, lift: lift, time: time, rm: rm, jump: jump, into: &out)
    } else {
      rimStep(wren, swirl: swirl, time: time, rm: rm, jump: jump, egg: egg, into: &out)
    }
    now = out
  }

  /// In the air, on her own loop round the planet.
  private mutating func flyStep(_ wren: KPlanetWren, swirl: KSwirl, layout: KPlanetLayout, loop: CGFloat, lift: CGFloat, time: TimeInterval, rm: Bool, jump: CGFloat, into out: inout KWrenNow) {
    let dayOff = wren.state == .dayOff
    let c = loop * .pi / 180
    let sc = sin(c)
    let cc = cos(c)
    let a = KWrenMotion.loopAxis
    let u = a.cross(KVec(0, 0, 1)).normalized
    let v = a.cross(u)
    let round = KVec.mix(u, v, cos(th), sin(th))
    let p = KVec.mix(a, round, cc, sc)
    let tangent = KVec.mix(u, v, -sin(th), cos(th)).normalized

    // the ground under her, moving: it drags the air with it
    let push = swirl.ground(at: p).dot(tangent) / sc * 0.8
    if abs(push) > abs(w) {
      w += (push - w) * 0.3
    } else {
      w *= 0.962
    }
    let cruise: CGFloat = rm ? 0 : KWrenMotion.cruise * (dayOff ? 2.4 : 1)
    th += cruise + w

    let fast = abs(w)
    let rho = layout.radius + lift + min(16, fast * 150)
    let bob: CGFloat = rm ? 0 : sin(CGFloat(time) * 2.2) * 2
    let x = layout.centre.x + rho * p.x
    let y = layout.centre.y + rho * p.y + bob - jump
    out.at = CGPoint(x: x, y: y)
    out.behind = p.z < 0
    out.hidden = p.z < 0 && hypot(rho * p.x, rho * p.y) < layout.radius - 4
    let dx = x - lastX
    if abs(dx) > 0.08 { facing = dx > 0 ? 1 : -1 }
    lastX = x
    out.facing = facing
    out.tilt = min(max(fast * 4.5, 0), 0.5) + (dayOff ? 0.12 : 0)
    out.whoosh = min(max((fast - 0.008) * 60, 0), 1)
    out.scale = (1 + p.z * 0.08) * out.pop
    out.flap = rm ? 1 : 1 + 0.05 * sin(CGFloat(time) * (13 + fast * 300))
    out.flying = true
    out.letter = !dayOff
    out.gates = dayOff

    if dayOff, !rm {
      ticks += 1
      if ticks % 4 == 0 {
        trail.append((out.at, out.behind, out.hidden))
        if trail.count > 16 { trail.removeFirst() }
      }
    }
  }

  /// On the rim: at home on top, on the right shoulder while she waits, on top again with the
  /// letter. The planet rolls under her.
  private mutating func rimStep(_ wren: KPlanetWren, swirl: KSwirl, time: TimeInterval, rm: Bool, jump: CGFloat, egg: Bool, into out: inout KWrenNow) {
    let waiting = wren.state == .waiting && !egg
    let back = wren.state == .back && !egg
    let home: CGFloat = waiting ? 1.02 : 0
    if rm || egg {
      phi = home
      dphi = 0
    }
    let q = KVec(sin(phi), -cos(phi), 0)
    let along = KVec(cos(phi), sin(phi), 0)
    let ground = egg ? KVec.zero : swirl.ground(at: q)
    let vt = ground.dot(along)
    let gs = ground.length
    let off = phi - home
    if gs > 0.004 { awakeUntil = time + 1.6 }
    // too fast to run: up she goes
    if !rm, !egg, gs > 0.075 || (air < 0.5 && abs(off) > 0.9) {
      airUntil = max(airUntil, time + 0.9)
    }
    let stayUp = air > 0.5 && (gs > 0.022 || abs(off) > 0.22)
    let want: CGFloat = (time < airUntil || stayUp) && !egg ? 1 : 0
    let was = air
    air += (want - air) * (rm ? 1 : 0.16)
    if was > 0.5, air <= 0.5 { wheeUntil = max(wheeUntil, time + 1.1) }
    if air < 0.5 {
      // the ground carries her; she runs back to her place
      dphi += (vt - dphi) * 0.4
      dphi -= off * 0.05
    } else {
      // in the air only the wind does
      dphi += (vt * 0.35 - dphi) * 0.08
      dphi -= off * 0.012
      dphi *= 0.95
    }
    phi = min(max(phi + dphi, -1.5), 1.5)

    let run = vt - dphi
    let up = air > 0.5
    let calm = !up && gs < 0.004 && time > awakeUntil && time > wheeUntil
    if up {
      if abs(dphi) > 0.004 { facing = dphi > 0 ? 1 : -1 }
    } else if abs(run) > 0.003 {
      // she runs against the ground
      facing = run > 0 ? -1 : 1
    }
    var hop: CGFloat = (!up && !rm) ? abs(sin(CGFloat(time) * 1000 / 42)) * min(5, gs * 150) : 0
    var look = false
    let since = CGFloat(time - swapAt)
    if !up, !rm, !egg {
      // what she does when nobody is touching anything
      if back {
        if since < 3.4 {
          hop += abs(sin(since * 7)) * 6
          wheeUntil = max(wheeUntil, time + 0.12)
        } else {
          let k = since.truncatingRemainder(dividingBy: 2.8) / 0.42
          if k < 1 { hop += sin(k * .pi) * 4 }
        }
      }
      if waiting, calm {
        let c = since.truncatingRemainder(dividingBy: 6.5)
        look = c > 5.1
        facing = look ? -1 : 1
        if c < 0.4 { hop += sin(c / 0.4 * .pi) * 4 }
      }
      if wren.state == .home, wren.napping, calm {
        out.breath = 1 + 0.035 * sin(CGFloat(time) * 1.7)
      }
    }
    let bob: CGFloat = (up && !rm) ? sin(CGFloat(time) * 2.4) * 2 : 0
    out.onRim = true
    out.phi = phi
    out.height = air * 24 + hop + bob + jump
    out.lean = up ? min(max(dphi * 8, -0.45), 0.45) : min(max(-run * 7, -0.4), 0.4)
    out.facing = facing
    out.flap = (up && !rm) ? 1 + 0.06 * sin(CGFloat(time) * 16) : 1
    out.flying = up
    out.letter = back
    out.setDown = back && !up
    if time < wheeUntil {
      out.mood = .delight
    } else if gs > 0.004 || time < awakeUntil || look {
      out.mood = .curious
    } else if wren.state == .home, wren.napping {
      out.mood = .sleepy
    } else {
      out.mood = .content
    }
  }

  /// Where she is on the screen: what a speech bubble's tail follows.
  func x(_ layout: KPlanetLayout) -> CGFloat {
    if now.onRim { return layout.centre.x + (layout.radius + now.height) * sin(now.phi) }
    return now.at.x
  }
}

// MARK: - Painting her

extension KPlanetPaint {
  static let letterEdge = Color(hex: "#D8D2C2")
  static let letterWax = Color(hex: "#E8A63C")

  static func wrenLook(_ wren: KPlanetWren, _ now: KWrenNow) -> KWrenLook {
    var look = wren.look
    look.pose = now.flying ? .fly : .perch
    look.mood = now.mood
    look.letter = now.letter
    return look
  }

  /// Her on the planet, and what a tap on her (or on the letter beside her) should hit.
  static func wren(_ ctx: inout GraphicsContext, _ f: Frame, _ wren: KPlanetWren, _ now: KWrenNow, note: (CGPoint, CGFloat, KPlanetHit) -> Void) {
    let look = wrenLook(wren, now)
    let r = f.layout.radius
    let centre = f.layout.centre

    if now.onRim {
      let ux = sin(now.phi)
      let uy = -cos(now.phi)
      let reach = r + now.height
      let foot = CGPoint(x: centre.x + reach * ux, y: centre.y + reach * uy)
      let side = now.side * (now.flying ? 1 : 0.92) * now.pop

      if now.setDown {
        // the letter, set down beside her
        let a = now.phi + (30 + 200 / r) * .pi / 180
        let bounce: CGFloat = f.reduceMotion ? 0 : abs(sin(CGFloat(f.time) / 0.3)) * 2.5
        let out = r + 7 + bounce
        let spot = CGPoint(x: centre.x + out * sin(a), y: centre.y - out * cos(a))
        var e = ctx
        e.translateBy(x: spot.x, y: spot.y)
        e.rotate(by: .radians(Double(a)))
        let paper = Path(roundedRect: CGRect(x: -8, y: -6, width: 16, height: 12), cornerRadius: 2)
        e.fill(paper, with: .color(.white))
        e.stroke(paper, with: .color(letterEdge), lineWidth: 1)
        var flapLine = Path()
        flapLine.move(to: CGPoint(x: -8, y: -6))
        flapLine.addLine(to: CGPoint(x: 0, y: 1))
        flapLine.addLine(to: CGPoint(x: 8, y: -6))
        e.stroke(flapLine, with: .color(letterEdge), lineWidth: 1)
        let wax = Path(ellipseIn: CGRect(x: -2, y: 0.5, width: 4, height: 4))
        e.fill(wax, with: .color(letterWax))
        note(spot, 6, .letter)
      }

      var c = ctx
      c.translateBy(x: foot.x, y: foot.y)
      c.rotate(by: .radians(Double(now.phi + now.lean)))
      c.scaleBy(x: now.facing, y: now.flap * now.breath)
      // standing, her feet are 87% down her square; flying, she hangs a little lower
      let top: CGFloat = now.flying ? -side * 0.8 : -side * 0.87
      KWrenBird.draw(look, in: &c, rect: CGRect(x: -side / 2, y: top, width: side, height: side))
      note(CGPoint(x: foot.x + ux * side * 0.45, y: foot.y + uy * side * 0.45), 10, .wren)
      return
    }

    let side = now.side
    var c = ctx
    c.translateBy(x: now.at.x, y: now.at.y)
    c.scaleBy(x: now.facing * now.scale, y: now.scale * now.flap)
    c.rotate(by: .radians(Double(now.tilt)))
    if now.whoosh > 0 {
      // a few lines of speed behind her
      let lines: [[CGFloat]] = [[-9, 0.62, 1.05], [0, 0.7, 1.25], [8, 0.6, 0.98]]
      var streaks = Path()
      for l in lines {
        streaks.move(to: CGPoint(x: -side * l[1], y: l[0]))
        streaks.addLine(to: CGPoint(x: -side * (l[1] + (l[2] - l[1]) * now.whoosh), y: l[0]))
      }
      c.stroke(streaks, with: .color(f.palette.ink.opacity(0.7 * now.whoosh)), style: StrokeStyle(lineWidth: 1.8, lineCap: .round))
    }
    KWrenBird.draw(look, in: &c, rect: CGRect(x: -side / 2, y: -side / 2, width: side, height: side))
    if !now.hidden { note(now.at, 10, .wren) }
  }

  /// Her day off: two gates in the sky at either side of the planet (the pillars of the day-off
  /// card), each a stub from the ground and a pillar above, with her height between them.
  static func gates(_ ctx: inout GraphicsContext, _ f: Frame, loop: CGFloat, lift: CGFloat, side: CGFloat) {
    let c = loop * .pi / 180
    let sc = sin(c)
    let cc = cos(c)
    let a = KWrenMotion.loopAxis
    let r = f.layout.radius
    let rho = r + lift
    let gap = side * 0.44
    let tall = min(max(r * 0.2, 13), 22)
    let signs: [CGFloat] = [-1, 1]
    for sgn in signs {
      let px = cc * a.x + sc * sgn
      let py = cc * a.y
      var g = ctx
      g.translateBy(x: f.layout.centre.x, y: f.layout.centre.y)
      g.rotate(by: .radians(Double(atan2(py, px)) + .pi / 2))
      let stub = max(4, rho - gap - r - 3)
      let pieces: [[CGFloat]] = [[-(rho - gap), stub, 0], [-(rho + gap + tall), tall, tall - 4]]
      for piece in pieces {
        let pillar = Path(roundedRect: CGRect(x: -4.5, y: piece[0], width: 9, height: piece[1]), cornerRadius: 2)
        g.fill(pillar, with: .color(f.palette.scrim))
        g.stroke(pillar, with: .color(f.palette.ink), lineWidth: 1.6)
        let cap = Path(roundedRect: CGRect(x: -6.5, y: piece[0] + piece[2], width: 13, height: 4), cornerRadius: 1.5)
        g.fill(cap, with: .color(f.palette.scrim))
        g.stroke(cap, with: .color(f.palette.ink), lineWidth: 1.6)
      }
    }
  }

  /// The dots she leaves behind her on a day off, on one side of the planet.
  static func trail(_ ctx: inout GraphicsContext, _ f: Frame, _ trail: [(at: CGPoint, behind: Bool, hidden: Bool)], behind: Bool) {
    let n = CGFloat(max(trail.count, 1))
    for (i, dot) in trail.enumerated() where dot.behind == behind && !dot.hidden {
      let alpha = 0.12 + 0.5 * CGFloat(i) / n
      let mark = Path(ellipseIn: CGRect(x: dot.at.x - 1.7, y: dot.at.y - 1.7, width: 3.4, height: 3.4))
      ctx.fill(mark, with: .color(f.palette.ink.opacity(alpha)))
    }
  }
}
