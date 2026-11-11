import SwiftUI

/* THE COURIER'S PLANET — what it shows, and how it moves.
   ─────────────────────────────────────────────────────────────────────────────
   docs/courier-planet.md is the spec; design/courier-planet/prototype is what
   the owner signed off, and this is that page's script in Swift.

   THE PLANET NEVER TURNS BY ITSELF. It turns under the finger (the point you
   touch follows the finger), glides to a stop when thrown, and — on the planet
   page only — turns to the letter that was just picked. Nothing else moves it.

   One engine per planet on screen: a class, mutated from the gesture and from
   the Canvas's renderer (main thread, once a frame), never published. The
   world advances in fixed 60 Hz steps whatever the screen's refresh rate, so a
   throw glides as far on a 120 Hz phone as on a 60 Hz one. */

// MARK: - What it shows

/// One letter she has carried: a stamp on the planet.
public struct KPlanetLetter: Identifiable, Equatable, Sendable {
  public var id: String
  /// 1 = the first letter she ever carried. It decides where the stamp sits, for good.
  public var ordinal: Int
  /// the letter's stamp (a KStamp id); "" for none
  public var stamp: String
  /// the stamp's colour when this build doesn't know the id ("#RRGGBB")
  public var stampHex: String?
  /// how many strangers have had it on their desk: a lamp each (eight at most are drawn)
  public var reads: Int
  /// someone wrote back: the stamp is postmarked
  public var answered: Bool
  /// the day it left, as the slip writes it ("NOV 3"): shown under the stamp close in
  public var day: String

  public init(id: String, ordinal: Int, stamp: String, stampHex: String? = nil, reads: Int = 0, answered: Bool = false, day: String = "") {
    self.id = id
    self.ordinal = ordinal
    self.stamp = stamp
    self.stampHex = stampHex
    self.reads = reads
    self.answered = answered
    self.day = day
  }
}

/// The card on Me (a small whole planet), or the planet page (larger, zoomable, one letter on show).
public enum KPlanetKind: Sendable {
  case card
  case page
}

public struct KPlanetContent: Equatable, Sendable {
  /// the hour's sky (courier-card-model PALETTE)
  public var palette = KCourierPalette()
  /// newest first; the planet shows as many as it has places for
  public var letters: [KPlanetLetter] = []
  /// the planet page: the letter whose slip is on show
  public var selected: String?
  /// TS says the surface is on show; false stops the clock
  public var live = true

  public init() {}
}

// MARK: - Where it sits

struct KPlanetLayout: Equatable {
  var size: CGSize
  var radius: CGFloat
  var centre: CGPoint

  /// The prototype's numbers: a 66-point planet in a 200-point scene, centred two thirds down;
  /// on the page a 100-point planet (times the zoom) in a 380-point scene.
  static func make(_ kind: KPlanetKind, size: CGSize, zoom: CGFloat) -> KPlanetLayout {
    switch kind {
    case .card:
      let r = min(66, size.height * 0.33)
      return KPlanetLayout(size: size, radius: r, centre: CGPoint(x: size.width / 2, y: size.height * 0.64))
    case .page:
      let base = min(100, size.height * 0.27)
      return KPlanetLayout(size: size, radius: base * zoom, centre: CGPoint(x: size.width / 2, y: size.height * 0.595))
    }
  }

  func point(_ v: KVec) -> CGPoint {
    CGPoint(x: centre.x + radius * v.x, y: centre.y + radius * v.y)
  }
}

/// Something under a tap.
enum KPlanetHit: Equatable {
  case stamp(String)
  case wren
  case letter
}

// MARK: - The engine

final class KPlanetEngine {
  static let zoomRange: ClosedRange<CGFloat> = 0.8...2.3
  /// where a picked letter's stamp comes to rest: a little above the middle, facing the reader
  static let front = KVec(0, -0.3, 0.95).normalized

  /// the planet's attitude
  private(set) var turn = KTurn.about(KVec(1, 0, 0), -24 * .pi / 180)
  /// what the planet did in the step just taken (Wren reads it)
  private(set) var swirl = KSwirl()
  /// the page's zoom, asked and shown
  var zoom: CGFloat = 1
  private(set) var zoomShown: CGFloat = 1
  var reduceMotion = false
  /// the planet page: a turn by hand ended with this letter's stamp facing the reader
  var onPick: ((String) -> Void)?

  private var grab: KVec?
  private var lastMove: (axis: KVec, angle: CGFloat, at: TimeInterval)?
  private var glide: (axis: KVec, angle: CGFloat)?
  private var fromFinger = KSwirl()
  private var settling = false
  private var pickOwed = false
  private var ping: (ordinal: Int, at: TimeInterval)?
  private var clock: TimeInterval?
  private var owed: TimeInterval = 0
  private var steps = 0
  private var selected: String?
  private(set) var hits: [(at: CGPoint, reach: CGFloat, what: KPlanetHit)] = []

  init() {}

  // ── the finger ──

  func touchDown(_ at: CGPoint, layout: KPlanetLayout) {
    grab = KPlanetBall.point(at, centre: layout.centre, radius: layout.radius)
    glide = nil
    settling = false
    lastMove = nil
  }

  func touchMove(_ at: CGPoint, layout: KPlanetLayout, now: TimeInterval) {
    guard let from = grab else { return }
    let to = KPlanetBall.point(at, centre: layout.centre, radius: layout.radius)
    let c = max(-1, min(1, from.dot(to)))
    let angle = acos(c)
    guard angle > 1e-4 else { return }
    let axis = from.cross(to).normalized
    turn = KTurn.about(axis, angle) * turn
    fromFinger.add(axis, angle)
    lastMove = (axis, angle, now)
    grab = to
  }

  /// The finger lifts after a drag: a fresh move throws the planet, and the page owes a pick.
  func touchUp(now: TimeInterval) {
    grab = nil
    pickOwed = true
    if let last = lastMove, now - last.at < 0.09, !reduceMotion {
      glide = (last.axis, min(last.angle, 0.22))
    }
    lastMove = nil
  }

  func cancelTouch() {
    grab = nil
    lastMove = nil
  }

  /// The arrow keys of a keyboard, and VoiceOver's adjust: a twelfth of a turn-and-a-half.
  func nudge(_ axis: KVec, _ direction: CGFloat) {
    let angle = direction * 12 * .pi / 180
    turn = KTurn.about(axis, angle) * turn
    fromFinger.add(axis, angle * 0.4)
    glide = nil
    settling = false
    pickOwed = true
  }

  /// What a tap at `at` lands on: the nearest thing within 22 points, a bird before a stamp.
  func hit(at: CGPoint) -> KPlanetHit? {
    var best: KPlanetHit?
    var bestDistance: CGFloat = 22
    for h in hits {
      let d = hypot(h.at.x - at.x, h.at.y - at.y) - h.reach
      if d < bestDistance {
        bestDistance = d
        best = h.what
      }
    }
    return best
  }

  /// The planet page picked a letter (its slip was swiped to, or its stamp tapped): turn to it.
  func show(_ letter: KPlanetLetter?, now: TimeInterval) {
    guard let letter else { return }
    glide = nil
    pickOwed = false
    settling = true
    ping = (letter.ordinal, now)
  }

  // ── the clock ──

  /// Brings the world up to `now` in fixed steps. A slow frame is caught up (to 1.2 s), not stretched.
  func advance(to now: TimeInterval, kind: KPlanetKind, content: KPlanetContent) {
    if selected != content.selected {
      let first = selected == nil && clock == nil
      selected = content.selected
      // the page opens on its letter; a letter picked later turns the planet to it
      if kind == .page, let id = selected, let letter = content.letters.first(where: { $0.id == id }) {
        if first { settling = true } else { show(letter, now: now) }
      }
    }
    guard let last = clock else {
      clock = now
      step(kind: kind, content: content)
      return
    }
    owed += min(1.2, max(0, now - last))
    clock = now
    var done = 0
    while owed >= 1.0 / 60, done < 80 {
      step(kind: kind, content: content)
      owed -= 1.0 / 60
      done += 1
    }
    let target = kind == .page ? zoom : 1
    zoomShown += (target - zoomShown) * (reduceMotion ? 1 : 0.2)
  }

  private func step(kind: KPlanetKind, content: KPlanetContent) {
    var did = fromFinger
    fromFinger = KSwirl()

    if grab != nil {
      settling = false
    } else if var g = glide {
      turn = KTurn.about(g.axis, g.angle) * turn
      did.add(g.axis, g.angle)
      g.angle *= 0.955
      glide = g.angle < 5e-4 ? nil : g
    } else if kind == .page, !content.letters.isEmpty {
      if pickOwed {
        pickOwed = false
        pickFacing(content)
      }
      if settling {
        settleStep(content, into: &did)
      }
    } else {
      pickOwed = false
    }

    steps += 1
    if steps % 240 == 0 { turn = turn.tidied }
    swirl = did
  }

  /// You turned it yourself: the stamp now facing you is the letter on show.
  private func pickFacing(_ content: KPlanetContent) {
    var best: KPlanetLetter?
    var bestDot: CGFloat = -2
    for letter in shown(content) {
      let p = turn.apply(KPlanetWorld.site(ordinal: letter.ordinal).p)
      let d = p.dot(KPlanetEngine.front)
      if d > bestDot {
        bestDot = d
        best = letter
      }
    }
    guard let pick = best, pick.id != selected else { return }
    selected = pick.id
    ping = (pick.ordinal, clock ?? 0)
    let report = onPick
    let id = pick.id
    DispatchQueue.main.async { report?(id) }
  }

  private func settleStep(_ content: KPlanetContent, into did: inout KSwirl) {
    guard let id = selected, let letter = content.letters.first(where: { $0.id == id }) else {
      settling = false
      return
    }
    let at = turn.apply(KPlanetWorld.site(ordinal: letter.ordinal).p)
    let c = max(-1, min(1, at.dot(KPlanetEngine.front)))
    if c >= 0.9998 {
      settling = false
      return
    }
    let axis = at.cross(KPlanetEngine.front).normalized
    let angle = acos(c) * (reduceMotion ? 1 : 0.09)
    turn = KTurn.about(axis, angle) * turn
    did.add(axis, angle)
  }

  /// The letters with a stamp on the planet: the newest, as many as there are places.
  func shown(_ content: KPlanetContent) -> ArraySlice<KPlanetLetter> {
    content.letters.prefix(KPlanetWorld.sites.count)
  }

  // ── for the drawing ──

  var pingNow: (ordinal: Int, at: TimeInterval)? { ping }
  var selectedNow: String? { selected }
  var time: TimeInterval { clock ?? 0 }

  func clearPing() {
    ping = nil
  }

  func resetHits() {
    hits.removeAll(keepingCapacity: true)
  }

  func noteHit(_ at: CGPoint, reach: CGFloat, _ what: KPlanetHit) {
    hits.append((at, reach, what))
  }

  /// For checks and previews: put the planet at an attitude.
  func set(turn: KTurn) {
    self.turn = turn
  }
}
