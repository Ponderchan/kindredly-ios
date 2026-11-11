import SwiftUI

/* THE PLANET'S ARITHMETIC.
   ─────────────────────────────────────────────────────────────────────────────
   A unit sphere seen straight on (orthographic): a point (x, y, z) on it lands
   on the screen at centre + radius · (x, y); z > 0 faces the reader, z < 0 is
   the far side. y runs down, as the screen does, so "north" is (0, −1, 0).

   The planet's attitude is one rotation matrix. It only ever changes by being
   multiplied on the left by a small rotation about an axis in screen space —
   under the finger, while it glides, or when the planet page turns to a letter.
   Ported from the approved prototype (design/courier-planet/prototype), number
   for number. */

struct KVec: Equatable, Sendable {
  var x: CGFloat
  var y: CGFloat
  var z: CGFloat

  init(_ x: CGFloat, _ y: CGFloat, _ z: CGFloat) {
    self.x = x
    self.y = y
    self.z = z
  }

  static let zero = KVec(0, 0, 0)
  /// the top of the planet when nothing has turned it
  static let north = KVec(0, -1, 0)

  /// A direction from a longitude and a latitude in degrees: (0, 0) faces the reader, latitude 90 is north.
  static func dir(_ lon: CGFloat, _ lat: CGFloat) -> KVec {
    let a = lon * .pi / 180
    let b = lat * .pi / 180
    return KVec(cos(b) * sin(a), -sin(b), cos(b) * cos(a))
  }

  var length: CGFloat {
    (x * x + y * y + z * z).squareRoot()
  }

  var normalized: KVec {
    let l = length
    return l > 0 ? KVec(x / l, y / l, z / l) : self
  }

  /// how far from the planet's centre this lands on the screen (0 dead centre, 1 on the rim)
  var reach: CGFloat {
    (x * x + y * y).squareRoot()
  }

  func dot(_ o: KVec) -> CGFloat {
    x * o.x + y * o.y + z * o.z
  }

  func cross(_ o: KVec) -> KVec {
    KVec(y * o.z - z * o.y, z * o.x - x * o.z, x * o.y - y * o.x)
  }

  static func + (a: KVec, b: KVec) -> KVec {
    KVec(a.x + b.x, a.y + b.y, a.z + b.z)
  }

  static func * (a: KVec, k: CGFloat) -> KVec {
    KVec(a.x * k, a.y * k, a.z * k)
  }

  /// a·s + b·t
  static func mix(_ a: KVec, _ b: KVec, _ s: CGFloat, _ t: CGFloat) -> KVec {
    KVec(a.x * s + b.x * t, a.y * s + b.y * t, a.z * s + b.z * t)
  }
}

/// A rotation, row-major 3 × 3.
struct KTurn: Equatable, Sendable {
  var m: [CGFloat]

  static let identity = KTurn(m: [1, 0, 0, 0, 1, 0, 0, 0, 1])

  /// A turn of `angle` radians about a unit `axis` (Rodrigues).
  static func about(_ axis: KVec, _ angle: CGFloat) -> KTurn {
    let x = axis.x
    let y = axis.y
    let z = axis.z
    let c = cos(angle)
    let s = sin(angle)
    let t = 1 - c
    let row0: [CGFloat] = [t * x * x + c, t * x * y - s * z, t * x * z + s * y]
    let row1: [CGFloat] = [t * x * y + s * z, t * y * y + c, t * y * z - s * x]
    let row2: [CGFloat] = [t * x * z - s * y, t * y * z + s * x, t * z * z + c]
    return KTurn(m: row0 + row1 + row2)
  }

  /// The smallest turn that carries unit vector `from` onto unit vector `to`; nil when they already agree.
  static func carrying(_ from: KVec, to: KVec, fraction: CGFloat = 1) -> KTurn? {
    let c = max(-1, min(1, from.dot(to)))
    if c > 0.99999 { return nil }
    let axis = from.cross(to).normalized
    if axis.length < 0.5 { return nil }
    return about(axis, acos(c) * fraction)
  }

  /// self, then `first` before it: (a * b)(v) = a(b(v))
  static func * (a: KTurn, b: KTurn) -> KTurn {
    var out = [CGFloat](repeating: 0, count: 9)
    for r in 0..<3 {
      for c in 0..<3 {
        let p0 = a.m[r * 3] * b.m[c]
        let p1 = a.m[r * 3 + 1] * b.m[3 + c]
        let p2 = a.m[r * 3 + 2] * b.m[6 + c]
        out[r * 3 + c] = p0 + p1 + p2
      }
    }
    return KTurn(m: out)
  }

  func apply(_ v: KVec) -> KVec {
    let x = m[0] * v.x + m[1] * v.y + m[2] * v.z
    let y = m[3] * v.x + m[4] * v.y + m[5] * v.z
    let z = m[6] * v.x + m[7] * v.y + m[8] * v.z
    return KVec(x, y, z)
  }

  /// The same turn with its rows made square to each other again: thousands of small
  /// multiplications drift, and a drifted matrix shears the planet.
  var tidied: KTurn {
    let a = KVec(m[0], m[1], m[2]).normalized
    let raw = KVec(m[3], m[4], m[5])
    let k = a.dot(raw)
    let b = KVec(raw.x - k * a.x, raw.y - k * a.y, raw.z - k * a.z).normalized
    let c = a.cross(b)
    return KTurn(m: [a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z])
  }
}

/// A small rotation as a vector on the screen: its direction the axis, its length the angle in
/// radians. What the planet did in one step, which is what Wren feels under her feet.
struct KSwirl: Equatable, Sendable {
  var v = KVec.zero

  mutating func add(_ axis: KVec, _ angle: CGFloat) {
    v = v + axis * angle
  }

  /// how fast the ground under unit point `p` is moving, as a vector
  func ground(at p: KVec) -> KVec {
    v.cross(p)
  }
}

enum KPlanetBall {
  /// The point of a virtual trackball under a touch: on the ball near its middle, on a
  /// hyperbolic sheet further out, so a drag that leaves the planet still turns it smoothly.
  /// The ball is never smaller than 105 points, or a small planet would spin at a touch.
  static func point(_ at: CGPoint, centre: CGPoint, radius: CGFloat) -> KVec {
    let rb = max(radius, 105)
    let x = (at.x - centre.x) / rb
    let y = (at.y - centre.y) / rb
    let d = x * x + y * y
    let z = d < 0.5 ? (1 - d).squareRoot() : 0.5 / d.squareRoot()
    return KVec(x, y, z).normalized
  }
}

// MARK: - What stands on it

enum KPlanetWorld {
  /// A patch of land: a cap of the sphere, its rim sampled once.
  struct Cap: Sendable {
    let centre: KVec
    /// sine of its angular radius: wholly out of sight once centre.z < −sinA
    let sinA: CGFloat
    let rim: [KVec]
  }

  /// Where a letter's stamp sits: the spot, the stamp's own east and south on the ground there
  /// (each one stuck on a little crooked), and the places its readers' lamps stand.
  struct Site: Sendable {
    let p: KVec
    let east: KVec
    let south: KVec
    let lamps: [KVec]
  }

  static let trees: [KVec] = [
    KVec.dir(-88, 14), KVec.dir(86, 8), KVec.dir(18, 30), KVec.dir(-150, 40),
    KVec.dir(170, -20), KVec.dir(96, -34), KVec.dir(-20, -62), KVec.dir(122, 60),
  ]
  static let peak = KVec.dir(-96, -24)
  static let waves: [KVec] = [KVec.dir(0, 20), KVec.dir(-10, -10), KVec.dir(100, -20), KVec.dir(-170, 10), KVec.dir(60, -35)]
  /// the two faint lines that say "sphere"
  static let latitudes: [[KVec]] = [35, -20].map { (la: CGFloat) -> [KVec] in
    (0...72).map { i in KVec.dir(CGFloat(i) * 5, la) }
  }

  /// longitude, latitude, angular radius — flat shapes, no map: nobody can ask "where am I"
  private static let capSpec: [[CGFloat]] = [
    [-50, 35, 30], [-25, 50, 22], [-70, 10, 20], [-85, 45, 18], [45, 20, 28], [70, 40, 20], [30, -5, 18], [0, -45, 26],
    [30, -60, 18], [150, 30, 32], [180, 5, 22], [130, 55, 18], [-140, -20, 28], [-115, 10, 16], [0, 82, 14],
  ]

  static let caps: [Cap] = capSpec.map { spec in
    let c = KVec.dir(spec[0], spec[1])
    let side = abs(c.y) < 0.9 ? KVec(0, 1, 0) : KVec(1, 0, 0)
    let u = c.cross(side).normalized
    let v = c.cross(u)
    let a = spec[2] * .pi / 180
    let rim: [KVec] = (0..<30).map { i in
      let th = CGFloat(i) / 30 * 2 * .pi
      let around = KVec.mix(u, v, cos(th), sin(th))
      return KVec.mix(c, around, cos(a), sin(a)).normalized
    }
    return Cap(centre: c, sinA: sin(a), rim: rim)
  }

  /// The places stamps go, in the order letters take them. A golden-angle spiral, so they spread
  /// evenly; the pole and the peak are kept clear; the order starts on the side that faces the
  /// reader when nothing has turned the planet, then steps round it.
  static let sites: [Site] = {
    let count = 52
    let clear = cos(17 * CGFloat.pi / 180)
    var points: [KVec] = []
    for i in 0..<count {
      let y = 1 - 2 * (CGFloat(i) + 0.5) / CGFloat(count)
      let r = (1 - y * y).squareRoot()
      let th = CGFloat(i) * 2.399963
      let p = KVec(r * cos(th), y, r * sin(th))
      if p.dot(KVec.north) < clear, p.dot(peak) < clear { points.append(p) }
    }
    let rest = KTurn.about(KVec(1, 0, 0), -22 * .pi / 180)
    points.sort { rest.apply($0).z > rest.apply($1).z }
    let n = points.count
    let step = n % 3 == 0 ? 5 : 3
    var out: [Site] = []
    for i in 0..<n {
      let p = points[(i * step) % n]
      var e = p.cross(KVec.north).normalized
      if abs(p.y) > 0.97 { e = p.cross(KVec(1, 0, 0)).normalized }
      let s0 = p.cross(e)
      let crooked = CGFloat((i * 37) % 31 - 15) * .pi / 180
      let east = KVec.mix(e, s0, cos(crooked), sin(crooked))
      let south = KVec.mix(e, s0, -sin(crooked), cos(crooked))
      let lamps: [KVec] = (0..<8).map { k in
        let a = CGFloat(k) * 2.4 + CGFloat(i)
        let away = (10 + CGFloat(k % 3) * 4) * .pi / 180
        let around = KVec.mix(east, south, cos(a), sin(a))
        return KVec.mix(p, around, cos(away), sin(away)).normalized
      }
      out.append(Site(p: p, east: east, south: south, lamps: lamps))
    }
    return out
  }()

  /// The site of the letter with this ordinal (1 = the first she ever carried). A letter keeps its
  /// place for good; past the last site the oldest places are taken again.
  static func site(ordinal: Int) -> Site {
    let n = sites.count
    let i = ((max(1, ordinal) - 1) % n + n) % n
    return sites[i]
  }
}
