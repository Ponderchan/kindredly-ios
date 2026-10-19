// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE ORBIT (Kindreds' band, H:62 / H:383-384, with the owner's changes).

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
 Reduce Motion (the faces then rest at a0), and when the watermark has faded out.

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

/// H's orbit, in its own units.
public enum KOrbitGeometry {
  /// the SVG's viewBox
  public static let box = CGSize(width: 340, height: 200)
  /// how tall the drawing is laid out (H: height 212px)
  public static let height: CGFloat = 212
  public static let rings: [CGFloat] = [40, 60, 80, 100, 120]
  /// ry / rx
  public static let squash: CGFloat = 0.78
  /// outside every ring: someone who hasn't written back yet
  public static let voidRadius: CGFloat = 134
  /// you, the centre cell
  public static let you: CGFloat = 10
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
    letters <= 0 ? voidRadius : 120 - CGFloat(min(letters, 5) - 1) * 20
  }

  /// a face's side in units: it fits its 20-unit lane
  public static func faceSide(letters: Int) -> CGFloat {
    9 + 0.6 * CGFloat(max(0, min(letters, 5)))
  }
}

public struct KOrbit: View, Equatable {
  private let theme: KTheme
  private let items: [KOrbitItem]
  private let active: Bool

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
  @Environment(\.colorSchemeContrast) private var contrast
  @State private var arrivals = KOrbitArrivals()

  /// - Parameters:
  ///   - items: the strangers, in TS's order
  ///   - active: the drawing may move (the tab is focused and the orbit can be seen)
  public init(theme: KTheme, items: [KOrbitItem], active: Bool) {
    self.theme = theme
    self.items = items
    self.active = active
  }

  public static func == (a: KOrbit, b: KOrbit) -> Bool {
    a.theme == b.theme && a.items == b.items && a.active == b.active
  }

  public var body: some View {
    let running = active && !reduceMotion
    TimelineView(.animation(minimumInterval: 1.0 / 20, paused: !running)) { context in
      Canvas { gc, size in
        draw(in: &gc, size: size, date: context.date, running: running)
      }
    }
    .frame(height: KOrbitGeometry.height)
    .frame(maxWidth: .infinity)
    .onAppear { arrivals.note(items.map(\.id), at: Date()) }
    .onChange(of: items.map(\.id)) { _, ids in arrivals.note(ids, at: Date()) }
    .accessibilityHidden(true)
  }

  private func draw(in gc: inout GraphicsContext, size: CGSize, date: Date, running: Bool) {
    let box = KOrbitGeometry.box
    let s = min(size.width / box.width, size.height / box.height)
    guard s > 0 else { return }
    let cx = size.width / 2
    let cy = size.height / 2
    let squash = KOrbitGeometry.squash

    // the rings: ink at .22, 1.2 wide, dashed 3 4 (H)
    let ringStyle = StrokeStyle(lineWidth: 1.2, dash: [3, 4])
    for r in KOrbitGeometry.rings {
      let rect = CGRect(x: cx - r * s, y: cy - r * squash * s, width: 2 * r * s, height: 2 * r * squash * s)
      gc.stroke(Path(ellipseIn: rect), with: .color(theme.ink.opacity(0.22)), style: ringStyle)
    }

    // you
    let you = KOrbitGeometry.you * s
    gc.fill(Path(CGRect(x: cx - you / 2, y: cy - you / 2, width: you, height: you)), with: .color(theme.ink))

    // them
    let t = date.timeIntervalSince1970
    for (order, item) in items.enumerated() {
      let angle: Double
      if reduceMotion {
        angle = item.a0
      } else {
        let phase = t.truncatingRemainder(dividingBy: item.period) / item.period
        angle = item.a0 + item.dir * 2 * Double.pi * phase
      }
      let r = KOrbitGeometry.radius(letters: item.ring)
      let x = cx + r * s * CGFloat(cos(angle))
      let y = cy + r * squash * s * CGFloat(sin(angle))
      let side = KOrbitGeometry.faceSide(letters: item.ring) * s
      let box = CGRect(x: x - side / 2, y: y - side / 2, width: side, height: side)
      let opacity = running ? arrivals.opacity(item.id, order: order, at: date) : 1
      guard opacity > 0 else { continue }
      if item.stamp {
        drawStampEdge(around: box, clearOfTurnRing: item.frost != nil && item.turn, opacity: opacity, context: gc)
      }
      if let frost = item.frost {
        drawWindow(frost, in: box, turn: item.turn, opacity: opacity, context: gc)
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
  private func drawWindow(_ frost: KFrostSpec, in box: CGRect, turn: Bool, opacity: Double, context gc: GraphicsContext) {
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
      with: .color(theme.ind.opacity(opacity)),
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
