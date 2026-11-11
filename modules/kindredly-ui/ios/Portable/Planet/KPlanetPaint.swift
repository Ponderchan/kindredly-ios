import SwiftUI

/* PAINTING THE PLANET — one frame, back to front.
   ─────────────────────────────────────────────────────────────────────────────
   1  the sky of the hour: gradient, stars and a moon or a sun, two clouds;
   2  whatever stands on the far side and shows past the rim;
   3  the planet: its thin air, the sea, land, two faint latitudes, waves, a
      lamp for every reader, the stamps where the letters landed (postmarked if
      someone wrote back), and a soft terminator so it reads as a ball;
   4  whatever stands on the near side;
   5  the ring round the letter just picked.

   Things on the ground are found by geometry every frame: a point p on the
   planet lands at centre + radius · turn(p). A stamp is flat on the ground —
   its own east and south, turned, are the two columns of an affine transform,
   which is exact for a flat thing seen without perspective. A tree stands
   along the planet's radius, so it leans with the curve and pokes past the rim
   when it reaches the edge. */

enum KPlanetPaint {
  static let lampLit = Color(hex: "#FFD98A")
  static let lampDay = Color(hex: "#FFF6CF")
  static let dayInk = Color(hex: "#1E1B35")

  struct Frame {
    let kind: KPlanetKind
    let layout: KPlanetLayout
    let palette: KCourierPalette
    let turn: KTurn
    /// seconds, for the things that drift and twinkle
    let time: TimeInterval
    let reduceMotion: Bool
    /// the page's zoom as shown (1 on the card)
    let zoom: CGFloat
  }

  // MARK: 1 — the sky

  static func sky(_ ctx: inout GraphicsContext, _ f: Frame) {
    let w = f.layout.size.width
    let h = f.layout.size.height
    let whole = Path(CGRect(x: 0, y: 0, width: w, height: h))
    let wash = Gradient(colors: [f.palette.sky0, f.palette.sky1])
    ctx.fill(whole, with: .linearGradient(wash, startPoint: .zero, endPoint: CGPoint(x: 0, y: h)))

    let sunX = f.palette.sunAt.x * w
    let sunY = f.palette.sunAt.y * 236 + max(0, h - 210) * 0.14
    if f.palette.moon {
      if f.palette.stars {
        for i in 0..<26 {
          let x = (CGFloat(i) * 97.3 + 31).truncatingRemainder(dividingBy: w)
          let y = (CGFloat(i) * 53.7 + 11).truncatingRemainder(dividingBy: h)
          let twinkle = f.reduceMotion ? 0.8 : 0.55 + 0.45 * sin(f.time * 1.3 + Double(i))
          let r: CGFloat = i % 5 == 0 ? 1.4 : 0.9
          let star = Path(ellipseIn: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2))
          ctx.fill(star, with: .color(Color.white.opacity(twinkle)))
        }
      }
      let moon = Path(ellipseIn: CGRect(x: sunX - 12, y: sunY - 12, width: 24, height: 24))
      ctx.fill(moon, with: .color(Color(hex: "#F3EFD8")))
      let bite = Path(ellipseIn: CGRect(x: sunX + 5 - 10, y: sunY - 3 - 10, width: 20, height: 20))
      ctx.fill(bite, with: .color(f.palette.sky0))
    } else if let sun = f.palette.sun {
      let disc = Path(ellipseIn: CGRect(x: sunX - 13, y: sunY - 13, width: 26, height: 26))
      ctx.fill(disc, with: .color(sun))
    }

    if let cloud = f.palette.cloud {
      let clouds: [[CGFloat]] = [[0.62, 0.17, 5, 1], [0.12, 0.3, 3, 0.7]]
      for c in clouds {
        let drift = f.reduceMotion ? 0 : CGFloat(f.time) * c[2]
        let x = (c[0] * w + drift).truncatingRemainder(dividingBy: w + 80) - 40
        let y = c[1] * min(h, 236)
        let k = c[3]
        var puff = Path()
        puff.addEllipse(in: CGRect(x: x - 20 * k, y: y - 8 * k, width: 40 * k, height: 16 * k))
        puff.addEllipse(in: CGRect(x: x + 15 * k - 13 * k, y: y - 5 * k - 8 * k, width: 26 * k, height: 16 * k))
        ctx.fill(puff, with: .color(cloud.opacity(0.9)))
      }
    }
  }

  // MARK: things that stand

  /// Draws something standing on the ground at unit point `p` (already turned): the context is
  /// moved to its foot and turned so "up" is away from the planet's centre; seen from above
  /// (near the middle of the disc) it is squashed, unless it is someone, who never is.
  static func standing(_ ctx: GraphicsContext, _ f: Frame, at p: KVec, upright: Bool, _ body: (inout GraphicsContext) -> Void) {
    let reach = p.reach
    let ux: CGFloat = reach > 1e-3 ? p.x / reach : 0
    let uy: CGFloat = reach > 1e-3 ? p.y / reach : -1
    var c = ctx
    let foot = f.layout.point(p)
    c.translateBy(x: foot.x, y: foot.y)
    c.rotate(by: .radians(Double(atan2(uy, ux)) + .pi / 2))
    if !upright { c.scaleBy(x: 1, y: 0.42 + 0.58 * reach) }
    body(&c)
  }

  static func tree(_ ctx: inout GraphicsContext, _ colour: Color) {
    let blobs: [[CGFloat]] = [[-4, -4, 4.2], [3.5, -5, 4.6], [0, -9.5, 4.2]]
    var crown = Path()
    for b in blobs {
      crown.addEllipse(in: CGRect(x: b[0] - b[2], y: b[1] - b[2], width: b[2] * 2, height: b[2] * 2))
    }
    ctx.fill(crown, with: .color(colour))
  }

  static func peak(_ ctx: inout GraphicsContext, rock: Color) {
    var big = Path()
    big.move(to: CGPoint(x: -11, y: 1))
    big.addLine(to: CGPoint(x: -1, y: -18))
    big.addLine(to: CGPoint(x: 9, y: 1))
    big.closeSubpath()
    ctx.fill(big, with: .color(rock))
    var small = Path()
    small.move(to: CGPoint(x: 2, y: 1))
    small.addLine(to: CGPoint(x: 9, y: -12))
    small.addLine(to: CGPoint(x: 16, y: 1))
    small.closeSubpath()
    ctx.fill(small, with: .color(rock.opacity(0.85)))
    var snow = Path()
    snow.move(to: CGPoint(x: -4.4, y: -11.5))
    snow.addLine(to: CGPoint(x: -1, y: -18))
    snow.addLine(to: CGPoint(x: 2.2, y: -11.5))
    snow.addLine(to: CGPoint(x: 0.6, y: -10))
    snow.addLine(to: CGPoint(x: -1, y: -12))
    snow.addLine(to: CGPoint(x: -2.6, y: -10))
    snow.closeSubpath()
    ctx.fill(snow, with: .color(.white))
  }

  /// The trees and the peak on one side of the planet (`near`: facing the reader).
  static func scenery(_ ctx: inout GraphicsContext, _ f: Frame, near: Bool) {
    var things: [(p: KVec, peak: Bool)] = KPlanetWorld.trees.map { (f.turn.apply($0), false) }
    things.append((f.turn.apply(KPlanetWorld.peak), true))
    let side = things.filter { ($0.p.z >= 0) == near }.sorted { $0.p.z < $1.p.z }
    for thing in side {
      standing(ctx, f, at: thing.p, upright: false) { c in
        if thing.peak {
          peak(&c, rock: f.palette.rock)
        } else {
          tree(&c, f.palette.forest)
        }
      }
    }
  }

  // MARK: 3 — the planet

  static func globe(_ ctx: inout GraphicsContext, _ f: Frame, letters: ArraySlice<KPlanetLetter>, selected: String?, note: (CGPoint, CGFloat, KPlanetHit) -> Void) {
    let r = f.layout.radius
    let centre = f.layout.centre
    let disc = Path(ellipseIn: CGRect(x: centre.x - r, y: centre.y - r, width: r * 2, height: r * 2))
    if f.palette.moon {
      // at night, no ring: white at 35% on the night sky is a grey band round the planet (the
      // owner, 2026-11-11: "这星球上怎么又个黑圈呢"). Its air is a glow that fades out, with no edge.
      let reach = r + 12
      let glow = Path(ellipseIn: CGRect(x: centre.x - reach, y: centre.y - reach, width: reach * 2, height: reach * 2))
      let air = Gradient(stops: [
        .init(color: Color.white.opacity(0), location: 0),
        .init(color: Color.white.opacity(0.18), location: r / reach),
        .init(color: Color.white.opacity(0), location: 1),
      ])
      ctx.fill(glow, with: .radialGradient(air, center: centre, startRadius: 0, endRadius: reach))
    } else {
      let air = Path(ellipseIn: CGRect(x: centre.x - r - 5, y: centre.y - r - 5, width: (r + 5) * 2, height: (r + 5) * 2))
      ctx.stroke(air, with: .color(Color.white.opacity(0.35)), lineWidth: 4)
    }
    ctx.fill(disc, with: .color(f.palette.sea))

    var inside = ctx
    inside.clip(to: disc)
    land(&inside, f)
    lines(&inside, f)
    lamps(&inside, f, letters: letters, selected: selected)
    stamps(&inside, f, letters: letters, note: note)

    // a soft terminator, so it reads as a ball and not a disc
    let stops: [Gradient.Stop] = [
      Gradient.Stop(color: Color.white.opacity(0.12), location: 0),
      Gradient.Stop(color: Color.white.opacity(0), location: 0.42),
      Gradient.Stop(color: Color(.sRGB, red: 24.0 / 255, green: 20.0 / 255, blue: 70.0 / 255, opacity: 0.26), location: 1),
    ]
    let lit = CGPoint(x: centre.x - r * 0.38, y: centre.y - r * 0.42)
    inside.fill(disc, with: .radialGradient(Gradient(stops: stops), center: lit, startRadius: r * 0.15, endRadius: r * 1.6))
  }

  static func land(_ ctx: inout GraphicsContext, _ f: Frame) {
    var all = Path()
    for cap in KPlanetWorld.caps {
      let c = f.turn.apply(cap.centre)
      if c.z < -cap.sinA { continue }
      var first = true
      for b in cap.rim {
        var q = f.turn.apply(b)
        if q.z < 0 {
          // past the rim: slide it onto the rim, so the visible part closes along the edge
          let l = max(q.reach, 1e-6)
          q = KVec(q.x / l, q.y / l, 0)
        }
        let at = f.layout.point(q)
        if first {
          all.move(to: at)
          first = false
        } else {
          all.addLine(to: at)
        }
      }
      all.closeSubpath()
    }
    ctx.fill(all, with: .color(f.palette.land))
  }

  static func lines(_ ctx: inout GraphicsContext, _ f: Frame) {
    var faint = Path()
    for circle in KPlanetWorld.latitudes {
      var pen = false
      for p in circle {
        let q = f.turn.apply(p)
        if q.z > 0 {
          let at = f.layout.point(q)
          if pen { faint.addLine(to: at) } else { faint.move(to: at) }
          pen = true
        } else {
          pen = false
        }
      }
    }
    ctx.stroke(faint, with: .color(Color.white.opacity(0.22)), lineWidth: 1)

    var ripples = Path()
    for wave in KPlanetWorld.waves {
      let q = f.turn.apply(wave)
      if q.z < 0.3 { continue }
      let at = f.layout.point(q)
      let x = at.x - 7
      let y = at.y
      ripples.move(to: CGPoint(x: x, y: y))
      ripples.addQuadCurve(to: CGPoint(x: x + 7, y: y), control: CGPoint(x: x + 3.5, y: y - 2.5))
      ripples.addQuadCurve(to: CGPoint(x: x + 14, y: y), control: CGPoint(x: x + 10.5, y: y + 2.5))
    }
    ctx.stroke(ripples, with: .color(Color.white.opacity(0.5)), lineWidth: 1.2)
  }

  /// A lamp for every stranger who has had that letter on their desk: a pale dot by day, lit after
  /// dark, brighter for the letter on show.
  static func lamps(_ ctx: inout GraphicsContext, _ f: Frame, letters: ArraySlice<KPlanetLetter>, selected: String?) {
    for letter in letters {
      let count = min(max(letter.reads, 0), 8)
      if count == 0 { continue }
      let site = KPlanetWorld.site(ordinal: letter.ordinal)
      let chosen = f.kind == .page && letter.id == selected
      for k in 0..<count {
        let q = f.turn.apply(site.lamps[k])
        if q.z < 0.1 { continue }
        let at = f.layout.point(q)
        if f.palette.lit || chosen {
          let rad: CGFloat = chosen ? 2.7 : 1.8
          let glow = Path(ellipseIn: CGRect(x: at.x - rad * 2.6, y: at.y - rad * 2.6, width: rad * 5.2, height: rad * 5.2))
          ctx.fill(glow, with: .color(lampLit.opacity(chosen ? 0.34 : 0.22)))
          let lamp = Path(ellipseIn: CGRect(x: at.x - rad, y: at.y - rad, width: rad * 2, height: rad * 2))
          ctx.fill(lamp, with: .color(lampLit))
        } else {
          let lamp = Path(ellipseIn: CGRect(x: at.x - 1.7, y: at.y - 1.7, width: 3.4, height: 3.4))
          ctx.fill(lamp, with: .color(lampDay))
          ctx.stroke(lamp, with: .color(dayInk.opacity(0.32)), lineWidth: 0.8)
        }
      }
    }
  }

  /// The letters she has carried, stuck where they landed; one that was answered is postmarked.
  static func stamps(_ ctx: inout GraphicsContext, _ f: Frame, letters: ArraySlice<KPlanetLetter>, note: (CGPoint, CGFloat, KPlanetHit) -> Void) {
    let r = f.layout.radius
    let widest: CGFloat = f.kind == .page ? 48 : 26
    let sw = min(max(r * 0.32, 20), widest)
    let sh = sw * 1.2
    let near: CGFloat = f.kind == .page ? min(max((f.zoom - 1.3) * 3, 0), 1) : 0
    let night = f.palette.moon

    for letter in letters {
      let site = KPlanetWorld.site(ordinal: letter.ordinal)
      let q = f.turn.apply(site.p)
      if q.z < 0.06 { continue }
      let e = f.turn.apply(site.east)
      let s = f.turn.apply(site.south)
      let at = f.layout.point(q)

      var flat = ctx
      flat.concatenate(CGAffineTransform(a: e.x, b: e.y, c: s.x, d: s.y, tx: at.x, ty: at.y))
      if night { flat.opacity = ctx.opacity * 0.85 }
      var face = flat
      face.translateBy(x: -sw / 2, y: -sh / 2)
      if !letter.stamp.isEmpty || letter.stampHex != nil {
        let plan = KStampPlan.plan(id: letter.stamp, width: sw, fallbackHex: letter.stampHex)
        plan.draw(in: face, width: sw, pad: 0)
      }
      if letter.answered {
        postmark(&flat, width: sw, height: sh, night: night)
      }

      if near > 0, q.z > 0.35, !letter.day.isEmpty {
        let fade = near * min(1, (q.z - 0.35) * 4)
        let label = Text(letter.day)
          .font(.system(size: 8.5, weight: .semibold, design: .monospaced))
          .kerning(1)
          .foregroundColor((night ? Color.white : dayInk).opacity(fade))
        ctx.draw(label, at: CGPoint(x: at.x, y: at.y + sh * 0.5 + 3), anchor: .top)
      }
      if q.z > 0.25 {
        note(at, 0, .stamp(letter.id))
      }
    }
  }

  /// A cancellation over the stamp's top right corner: two rings and three wavy lines.
  static func postmark(_ ctx: inout GraphicsContext, width sw: CGFloat, height sh: CGFloat, night: Bool) {
    let px = sw * 0.34
    let py = -sh * 0.3
    let pr = sw * 0.3
    let ink: Color = night ? Color.white.opacity(0.85) : dayInk.opacity(0.62)
    var mark = Path()
    mark.addEllipse(in: CGRect(x: px - pr, y: py - pr, width: pr * 2, height: pr * 2))
    let inner = pr * 0.55
    mark.addEllipse(in: CGRect(x: px - inner, y: py - inner, width: inner * 2, height: inner * 2))
    let offsets: [CGFloat] = [-pr * 0.5, 0, pr * 0.5]
    for dy in offsets {
      let y = py + dy
      mark.move(to: CGPoint(x: px - pr * 2.3, y: y))
      mark.addQuadCurve(to: CGPoint(x: px - pr * 1.4, y: y), control: CGPoint(x: px - pr * 1.85, y: y - 1.5))
      mark.addQuadCurve(to: CGPoint(x: px - pr * 0.95, y: y), control: CGPoint(x: px - pr * 1.1, y: y + 1.2))
    }
    ctx.stroke(mark, with: .color(ink), style: StrokeStyle(lineWidth: 1.1, lineCap: .round))
  }

  // MARK: 5 — the ring round the letter just picked

  /// Returns false once the ring has run its 3.2 seconds.
  static func ring(_ ctx: inout GraphicsContext, _ f: Frame, ordinal: Int, since: TimeInterval) -> Bool {
    if since > 3.2 { return false }
    let q = f.turn.apply(KPlanetWorld.site(ordinal: ordinal).p)
    if q.z <= -0.05 { return true }
    let k = CGFloat(since.truncatingRemainder(dividingBy: 1.1) / 1.1)
    let at = f.layout.point(q)
    let rad = 12 + 16 * k
    let circle = Path(ellipseIn: CGRect(x: at.x - rad, y: at.y - rad, width: rad * 2, height: rad * 2))
    ctx.stroke(circle, with: .color(f.palette.ink.opacity(1 - k)), lineWidth: 2)
    return true
  }
}
