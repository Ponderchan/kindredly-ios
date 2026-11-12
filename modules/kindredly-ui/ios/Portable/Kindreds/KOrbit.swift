// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE ORBIT (Kindreds' band, H:62 / H:383-384, with the owner's changes).

 (As first built; the section YOU, YOUR KINDREDS, AND STRANGERS COMING CLOSER below is what is
 drawn since 2026-11-12, and where the two disagree, that one is right.)
 You are the 10 x 10 ink cell in the middle. Five dashed rings round you, one per letter: the
 ring a stranger rides is how many letters THEY have sent you (ring 1 the outermost, 5 the
 innermost), and someone who hasn't written back yet waits just outside, in the void. Each
 stranger is drawn as their own FACE v1 mosaic (the 25-bit mask TS sends, developed as far as
 their letters have carried it), inked in ind when it is your turn to write to them, in ink
 otherwise. Named people are never drawn: once names are traded they have left the orbit
 (owner B3), and TS doesn't send them.

 GEOMETRY. H's SVG: a 340 x 200 viewBox, origin at its centre, rings r = 40 / 60 / 80 / 100 /
 120 squashed vertically by .78, drawn 212 tall and as wide as the band allows, aspect fit.
 Ring p sits at r = 120 - (p - 1) * 20; the void at 134. The rings are 20 units apart (15.6 in
 height after the squash), so a face is capped to fit its lane: 9 units across in the void,
 growing .6 per letter to 12 at the centre (critic-kindreds: the 17.6pt RN faces would sit on
 each other and on you), cells .32 of a cell apart.

 DRIFT. Each face circles at its own speed and direction (period and dir from TS, from the
 correspondent's id, 150-270 s a circuit), and its angle comes from the wall clock, so a face is
 where it would have been when the tab comes back, never snapped back to its start, and a list
 that re-sorts moves nobody (a0 is computed by TS over a stable order). The canvas redraws in a
 TimelineView at 20 frames a second while `active`, and stops otherwise: off the tab, under
 Reduce Motion (the faces then rest at a0), and while the band is folded (rings only, below).

 Faces that arrive fade in over .32s, a little after each other (OrbitMap.tsx's arrival).

 WITH THE IDENTITY SWITCH ON (the owner, 2026-10-18 night: "轨道那里也要同步"), each stranger is
 their frosted window instead (KFrostPainter, the same FROST v1 spec TS sends for their row and
 their chat, so a person is one colour everywhere), a rounded square with corners at 25% of its
 side, at the same lane sizes. At 9-12 units the window is far under 20pt, so it draws the base,
 the lights and the hairline only (the one size rule). It NEVER develops: the window is the same
 on every ring, and the ring itself is the progress. Your turn is a 1.5pt ind ring round the
 window (instead of the mosaic inked in ind). Reduce Transparency draws the windows flat,
 Increase Contrast gives them their ink edge, as KFrost does anywhere. The centre cell, the
 rings, the drift and the arrival fade are unchanged; switch off is exactly the mosaic above.

 A FIRST CLASS MEMBER (C2) gets a 1pt dotted wax-gold edge 1.5pt outside their face, nothing more:
 the stamp's full rule would leave a 6pt face at these sizes (decision D-6).

 VoiceOver doesn't see the drawing; the legend and the Orbit chip's hint say what it means.

 RINGS ONLY (owner's audit, 2026-11-10). Folded, the band keeps the orbit's middle strip as a
 faint watermark behind the chips, and the centre cell and whichever faces were passing poked
 out above a chip as stray grey blocks: it read as a glitch. With `ringsOnly` the drawing is
 the five dashed rings and nothing else: you and the faces fade out over KOrbit.fade (.4s CSS
 ease, the curve the band's own opacity folds on) and back in when it opens. The rings are
 their own still layer, so nothing has to redraw while they are all there is.

 YOU, YOUR KINDREDS, AND STRANGERS COMING CLOSER (owner, 2026-11-12: "最中心应该是我头像的小缩略 …
 由小模糊慢慢变大的模糊到内环清晰小缩略", then "好 开工"). Given `me`, the picture is three kinds of
 people, told apart by shape alone:
   · YOU, in the middle: your own face, round, 20 units across, no ring round it (the 10-unit ink
     cell stays only for a holder that sends no face: the gallery);
   · YOUR KINDREDS, on a home ring 28 units out, just inside the five rings: their real faces,
     round and clear, 14 units, at most eight (TS picks who). They turn together, one slow
     circuit every five minutes, evenly spaced, so two faces never slide over each other. Names
     are traded, so they are back on the orbit: this replaces B3's "they have left it";
   · STRANGERS, on the five rings and in the void: their frosted windows, rounded squares, SMALL
     AND FAINT FAR OUT, LARGER AND SOLID CLOSE IN (7 units and 50% in the void, a unit and 10%
     more per letter, 12 units and whole on the fifth ring). The window itself never sharpens:
     it is no photograph, and nobody's face is shown before names are traded; only its size and
     its strength say how near they are. The moment it clears is the trade, when the square
     becomes a round face one step further in.
 Sizes only ever grow on the way in (7 … 12, then 14, then you at 20). The five rings are 17
 units apart now (52 … 120, where they were 20 apart from 40) to make that room in the middle;
 the outermost ring and the void are where they were.
 A kindred with letters you have not read wears the same 1.5pt ind ring as a stranger whose turn
 it is, round instead of square. A tap on a kindred opens their room, as their row does.

 TAPS (owner's audit, 2026-11-10: readers tapped a square and nothing happened). With `onTap`
 set, a tap on a stranger's face, or within 24pt of it, reports their id (the nearest face wins),
 and the screen opens that correspondence as their row would. The faces move, so the tap is
 tested against where each one is at that moment: KOrbitGeometry.faceBox is the one place a
 face's position is worked out, for the drawing and for the tap alike. A tap on empty sky does
 nothing. The orbit stays hidden from VoiceOver: the rows under it are the accessible way in.
 */

/// One stranger on the orbit, as TS computes it.
public struct KOrbitItem: Identifiable, Equatable, Sendable {
  public let id: String
  /// their FACE v1 cells (bit row * 5 + column), developed (switch off)
  public let mask: Int
  /// their frosted window instead (identity switch on): never develops; nil draws the mosaic
  public let frost: KFrostSpec?
  /// how many letters they have sent you, 0 ... 5 (0 waits in the void)
  public let ring: Int
  /// where they start, in radians, from TS's stable order
  public let a0: Double
  /// +1 or -1
  public let dir: Double
  /// seconds per full circuit
  public let period: Double
  /// it is your turn to write to them: inked in ind (a window: a 1.5pt ind ring round it)
  public let turn: Bool
  /// a First Class member (C2): at these sizes only a 1pt dotted wax-gold edge round the face
  public let stamp: Bool

  public init(id: String, mask: Int, frost: KFrostSpec? = nil, ring: Int, a0: Double, dir: Double, period: Double, turn: Bool, stamp: Bool = false) {
    self.id = id
    self.mask = mask
    self.frost = frost
    self.ring = ring
    self.a0 = a0
    self.dir = dir >= 0 ? 1 : -1
    self.period = max(1, period)
    self.turn = turn
    self.stamp = stamp
  }
}

/// One kindred on the home ring, beside you (names are traded: their real face, round).
public struct KOrbitKin: Identifiable, Equatable, Sendable {
  public let id: String
  /// their face as their row draws it (a portrait, or the placeholder disc while it loads)
  public let face: KPersonFace
  /// where they start, in radians: TS spaces them evenly, in a stable order
  public let a0: Double
  /// letters of theirs you have not read: the 1.5pt ind ring round the face
  public let turn: Bool

  public init(id: String, face: KPersonFace, a0: Double, turn: Bool) {
    self.id = id
    self.face = face
    self.a0 = a0
    self.turn = turn
  }
}

/// H's orbit, in its own units.
public enum KOrbitGeometry {
  /// the SVG's viewBox
  public static let box = CGSize(width: 340, height: 200)
  /// how tall the drawing is laid out (H: height 212px)
  public static let height: CGFloat = 212
  /// the five rings, 17 apart (20 from 40 until 2026-11-12: the middle now holds you and your kindreds)
  public static let rings: [CGFloat] = [52, 69, 86, 103, 120]
  public static let lane: CGFloat = 17
  /// ry / rx
  public static let squash: CGFloat = 0.78
  /// outside every ring: someone who hasn't written back yet
  public static let voidRadius: CGFloat = 134
  /// you, the centre cell (a holder that sends no face of yours)
  public static let you: CGFloat = 10
  /// you, as your own round face
  public static let youFace: CGFloat = 20
  /// your kindreds' home ring, their faces, and the seconds they take to go round together
  /// 28, not 30: with both wearing a turn ring, a kindred and a stranger on the fifth ring passing
  /// over the top or the bottom (where the squash brings the rings closest) touched at 30
  public static let kinRadius: CGFloat = 28
  public static let kinSide: CGFloat = 14
  public static let kinPeriod: Double = 300
  /// the room between cells, as a fraction of a cell
  public static let gapRatio: CGFloat = 0.32
  /// your turn round a window: a ring this wide (pt), this far clear of the window's edge
  public static let turnRing: CGFloat = 1.5
  public static let turnGap: CGFloat = 1
  /// a member's edge (C2): this wide (pt), this far clear of the face's box
  public static let stampEdge: CGFloat = 1
  public static let stampGap: CGFloat = 1.5

  /// the ring of someone who has sent you `letters`
  public static func radius(letters: Int) -> CGFloat {
    letters <= 0 ? voidRadius : 120 - CGFloat(min(letters, 5) - 1) * lane
  }

  /// a stranger's side in units: small far out, larger close in (7 in the void, 12 on the fifth
  /// ring), and never more than its lane takes after the squash (17 x .78)
  public static func faceSide(letters: Int) -> CGFloat {
    7 + CGFloat(max(0, min(letters, 5)))
  }

  /// how strongly a stranger is drawn: faint far out, whole close in (.5 in the void, 1 on the
  /// fifth ring; at .4 a pale window on Classic's white page was all but gone)
  public static func presence(letters: Int) -> Double {
    0.5 + 0.1 * Double(max(0, min(letters, 5)))
  }

  /// how far outside a face a tap still counts as on it (pt): the faces are 7 to 15pt across
  public static let tapReach: CGFloat = 24

  /// points per unit when the viewBox is drawn in `size`, aspect fit
  public static func scale(in size: CGSize) -> CGFloat {
    min(size.width / box.width, size.height / box.height)
  }

  /// Where a stranger's face is, in a drawing of `size`, at `date`: its box. `still` rests it at
  /// a0 (Reduce Motion). The drawing and the tap both ask here, so a tap lands on what is seen.
  public static func faceBox(_ item: KOrbitItem, in size: CGSize, at date: Date, still: Bool) -> CGRect {
    let s = scale(in: size)
    let angle: Double
    if still {
      angle = item.a0
    } else {
      let phase = date.timeIntervalSince1970.truncatingRemainder(dividingBy: item.period) / item.period
      angle = item.a0 + item.dir * 2 * Double.pi * phase
    }
    let r = radius(letters: item.ring)
    let x = size.width / 2 + r * s * CGFloat(cos(angle))
    let y = size.height / 2 + r * squash * s * CGFloat(sin(angle))
    let side = faceSide(letters: item.ring) * s
    return CGRect(x: x - side / 2, y: y - side / 2, width: side, height: side)
  }

  /// Where a kindred's face is at `date`: its box. They all turn together (one period, one way),
  /// so the even spacing TS gave them holds; `still` rests them at a0 (Reduce Motion).
  public static func kinBox(_ kin: KOrbitKin, in size: CGSize, at date: Date, still: Bool) -> CGRect {
    let s = scale(in: size)
    let angle: Double
    if still {
      angle = kin.a0
    } else {
      let phase = date.timeIntervalSince1970.truncatingRemainder(dividingBy: kinPeriod) / kinPeriod
      angle = kin.a0 + 2 * Double.pi * phase
    }
    let x = size.width / 2 + kinRadius * s * CGFloat(cos(angle))
    let y = size.height / 2 + kinRadius * squash * s * CGFloat(sin(angle))
    let side = kinSide * s
    return CGRect(x: x - side / 2, y: y - side / 2, width: side, height: side)
  }

  /// Whose face a tap at `point` is on: the nearest one whose box is within `tapReach` of it, or
  /// nil for empty sky. Of two equally near, the one drawn later (on top). Kindreds count as
  /// strangers do; you, in the middle, are not a way anywhere.
  public static func hit(_ point: CGPoint, items: [KOrbitItem], kin: [KOrbitKin] = [], in size: CGSize, at date: Date, still: Bool) -> String? {
    guard scale(in: size) > 0 else { return nil }
    var best: (id: String, distance: CGFloat)?
    let boxes: [(String, CGRect)] = items.map { ($0.id, faceBox($0, in: size, at: date, still: still)) }
      + kin.map { ($0.id, kinBox($0, in: size, at: date, still: still)) }
    for (id, face) in boxes {
      let dx = max(face.minX - point.x, 0, point.x - face.maxX)
      let dy = max(face.minY - point.y, 0, point.y - face.maxY)
      guard (dx * dx + dy * dy).squareRoot() <= tapReach else { continue }
      let cx = face.midX - point.x
      let cy = face.midY - point.y
      let centre = (cx * cx + cy * cy).squareRoot()
      if let nearest = best, centre > nearest.distance { continue }
      best = (id, centre)
    }
    return best?.id
  }
}

public struct KOrbit: View, Equatable {
  private let theme: KTheme
  private let items: [KOrbitItem]
  private let me: KPersonFace?
  private let kin: [KOrbitKin]
  private let active: Bool
  private let ringsOnly: Bool
  private let onTap: ((String) -> Void)?

  /// you and the faces leaving or coming back: .4s CSS ease, as the band's opacity folds (H:62)
  public static let fade = Animation.timingCurve(0.25, 0.1, 0.25, 1, duration: 0.4)

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
  @Environment(\.colorSchemeContrast) private var contrast
  @State private var arrivals = KOrbitArrivals()

  /// - Parameters:
  ///   - items: the strangers, in TS's order
  ///   - me: your own face for the middle; nil keeps the 10-unit ink cell
  ///   - kin: your kindreds on the home ring, in TS's order (at most eight)
  ///   - active: the drawing may move (the tab is focused and the orbit can be seen)
  ///   - ringsOnly: draw the dashed rings alone (the folded watermark): you and the faces fade out
  ///   - onTap: a face was tapped, with its id; nil and the drawing takes no taps. Not compared
  ///     (hand it a closure that stays good for the life of the screen)
  public init(theme: KTheme, items: [KOrbitItem], me: KPersonFace? = nil, kin: [KOrbitKin] = [], active: Bool, ringsOnly: Bool = false, onTap: ((String) -> Void)? = nil) {
    self.theme = theme
    self.items = items
    self.me = me
    self.kin = kin
    self.active = active
    self.ringsOnly = ringsOnly
    self.onTap = onTap
  }

  public static func == (a: KOrbit, b: KOrbit) -> Bool {
    a.theme == b.theme && a.items == b.items && a.me == b.me && a.kin == b.kin && a.active == b.active && a.ringsOnly == b.ringsOnly
      && (a.onTap == nil) == (b.onTap == nil)
  }

  public var body: some View {
    // nothing moves while only the rings show
    let running = active && !reduceMotion && !ringsOnly
    ZStack {
      // the rings: still, and all that is left of the orbit as the folded watermark
      Canvas { gc, size in
        drawRings(in: &gc, size: size)
      }
      // you and them
      TimelineView(.animation(minimumInterval: 1.0 / 20, paused: !running)) { context in
        ZStack {
          // the strangers (and the ink cell, for a holder that sends no face of yours)
          Canvas { gc, size in
            drawFaces(in: &gc, size: size, date: context.date, running: running)
          }
          // you and your kindreds: real faces, so real views, placed where the geometry says
          if me != nil || !kin.isEmpty {
            GeometryReader { geo in
              people(in: geo.size, date: context.date, running: running)
            }
          }
        }
      }
      .opacity(ringsOnly ? 0 : 1)
      .animation(Self.fade, value: ringsOnly)
    }
    .frame(height: KOrbitGeometry.height)
    .frame(maxWidth: .infinity)
    .overlay {
      if let onTap {
        // the whole drawing listens; only a tap on or near a face goes anywhere
        GeometryReader { geo in
          Color.clear
            .contentShape(Rectangle())
            .gesture(
              SpatialTapGesture().onEnded { tap in
                if let id = KOrbitGeometry.hit(tap.location, items: items, kin: kin, in: geo.size, at: Date(), still: reduceMotion) {
                  onTap(id)
                }
              }
            )
        }
      }
    }
    .onAppear { arrivals.note(items.map(\.id) + kin.map(\.id), at: Date()) }
    .onChange(of: items.map(\.id) + kin.map(\.id)) { _, ids in arrivals.note(ids, at: Date()) }
    .accessibilityHidden(true)
  }

  /// You in the middle and your kindreds on their ring: round faces (KFace), no ring round yours.
  /// A kindred with unread letters wears the ind ring a stranger's turn does, as a circle.
  @ViewBuilder
  private func people(in size: CGSize, date: Date, running: Bool) -> some View {
    let s = KOrbitGeometry.scale(in: size)
    if s > 0 {
      ZStack {
        ForEach(Array(kin.enumerated()), id: \.element.id) { order, k in
          let box = KOrbitGeometry.kinBox(k, in: size, at: date, still: reduceMotion)
          let out = KOrbitGeometry.turnGap + KOrbitGeometry.turnRing / 2
          KFace(theme: theme, source: k.face.source(theme), size: box.width)
            .overlay {
              if k.turn {
                Circle()
                  .stroke(theme.ind, lineWidth: KOrbitGeometry.turnRing)
                  .padding(-out)
              }
            }
            .opacity(running ? arrivals.opacity(k.id, order: items.count + order, at: date) : 1)
            .position(x: box.midX, y: box.midY)
        }
        if let me {
          KFace(theme: theme, source: me.source(theme), size: KOrbitGeometry.youFace * s)
            .position(x: size.width / 2, y: size.height / 2)
        }
      }
      .frame(width: size.width, height: size.height)
      .allowsHitTesting(false)
    }
  }

  /// The five rings: ink at .22, 1.2 wide, dashed 3 4 (H).
  private func drawRings(in gc: inout GraphicsContext, size: CGSize) {
    let s = KOrbitGeometry.scale(in: size)
    guard s > 0 else { return }
    let cx = size.width / 2
    let cy = size.height / 2
    let squash = KOrbitGeometry.squash
    let ringStyle = StrokeStyle(lineWidth: 1.2, dash: [3, 4])
    for r in KOrbitGeometry.rings {
      let rect = CGRect(x: cx - r * s, y: cy - r * squash * s, width: 2 * r * s, height: 2 * r * squash * s)
      gc.stroke(Path(ellipseIn: rect), with: .color(theme.ink.opacity(0.22)), style: ringStyle)
    }
  }

  /// You (the centre cell) and every stranger's face, where each is at `date`.
  private func drawFaces(in gc: inout GraphicsContext, size: CGSize, date: Date, running: Bool) {
    let s = KOrbitGeometry.scale(in: size)
    guard s > 0 else { return }
    let cx = size.width / 2
    let cy = size.height / 2

    // you: the ink cell, unless your face is drawn over the middle (people(in:date:running:))
    if me == nil {
      let you = KOrbitGeometry.you * s
      gc.fill(Path(CGRect(x: cx - you / 2, y: cy - you / 2, width: you, height: you)), with: .color(theme.ink))
    }

    // them
    for (order, item) in items.enumerated() {
      let box = KOrbitGeometry.faceBox(item, in: size, at: date, still: reduceMotion)
      let side = box.width
      // the arrival fade needs the timeline; without it (Reduce Motion, off the tab, rings only) a face is simply there.
      // Then how near they are: faint in the void, whole on the fifth ring (KOrbitGeometry.presence)
      let arrived = running ? arrivals.opacity(item.id, order: order, at: date) : 1
      guard arrived > 0 else { continue }
      let opacity = arrived * KOrbitGeometry.presence(letters: item.ring)
      if item.stamp {
        drawStampEdge(around: box, clearOfTurnRing: item.frost != nil && item.turn, opacity: opacity, context: gc)
      }
      if let frost = item.frost {
        // the turn ring keeps its full strength however far out they are: it is what asks for you
        drawWindow(frost, in: box, turn: item.turn, opacity: opacity, ringOpacity: arrived, context: gc)
        continue
      }
      let cell = side / (5 + 4 * KOrbitGeometry.gapRatio)
      let gap = cell * KOrbitGeometry.gapRatio
      let shape = KMosaicShape(mask: item.mask, cell: cell, gap: gap).path(in: box)
      gc.fill(shape, with: .color((item.turn ? theme.ind : theme.ink).opacity(opacity)))
    }
  }

  /// A member's stamp at orbit size (C2, decision D-6): a face under 20pt can't take the full
  /// rule, so only a 1pt dotted wax-gold rounded rect (radius 2) 1.5pt outside the face's box, no
  /// ground and no denomination; outside the turn ring when a window has one.
  private func drawStampEdge(around box: CGRect, clearOfTurnRing: Bool, opacity: Double, context gc: GraphicsContext) {
    var out: CGFloat = KOrbitGeometry.stampGap + KOrbitGeometry.stampEdge / 2
    if clearOfTurnRing { out += KOrbitGeometry.turnGap + KOrbitGeometry.turnRing }
    let edge = box.insetBy(dx: -out, dy: -out)
    gc.stroke(
      Path(roundedRect: edge, cornerRadius: 2, style: .circular),
      with: .color(KBrand.waxGold.opacity(opacity)),
      style: StrokeStyle(lineWidth: KOrbitGeometry.stampEdge, lineCap: .round, dash: [0.001, 2])
    )
  }

  /// A stranger's frosted window on the orbit (identity switch on): base, lights and hairline at
  /// these sizes, and the 1.5pt ind ring round it when it is your turn.
  private func drawWindow(_ frost: KFrostSpec, in box: CGRect, turn: Bool, opacity: Double, ringOpacity: Double, context gc: GraphicsContext) {
    KFrostPainter.draw(
      frost,
      in: box,
      context: gc,
      flat: reduceTransparency,
      detail: box.width >= KFrostSpec.detailMinPt,
      edge: contrast == .increased ? theme.ink : nil,
      opacity: opacity
    )
    guard turn else { return }
    let out = KOrbitGeometry.turnGap + KOrbitGeometry.turnRing / 2
    let ring = box.insetBy(dx: -out, dy: -out)
    gc.stroke(
      Path(roundedRect: ring, cornerRadius: frost.radius(side: box.width) + out, style: .circular),
      with: .color(theme.ind.opacity(ringOpacity)),
      lineWidth: KOrbitGeometry.turnRing
    )
  }
}

/// When each face first appeared, for its fade in. A plain object kept in @State: noting an
/// arrival changes nothing on screen by itself (the timeline redraws).
final class KOrbitArrivals {
  private var firstSeen: [String: Date] = [:]
  static let fade: TimeInterval = 0.32
  static let delay: TimeInterval = 0.06
  static let stagger: TimeInterval = 0.03

  func note(_ ids: [String], at now: Date) {
    for id in ids where firstSeen[id] == nil {
      firstSeen[id] = now
    }
  }

  func opacity(_ id: String, order: Int, at now: Date) -> Double {
    guard let seen = firstSeen[id] else { return 1 }
    let t = now.timeIntervalSince(seen) - Self.delay - Double(order) * Self.stagger
    return min(1, max(0, t / Self.fade))
  }
}
