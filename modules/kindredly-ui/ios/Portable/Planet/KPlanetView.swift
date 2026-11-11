import SwiftUI

/* THE PLANET, AS A VIEW.
   One Canvas on a TimelineView: the engine is brought up to the frame's time
   inside the renderer, then painted. Gestures speak to the engine directly.

   - one finger turns it (the point under the finger follows the finger); a
     drag that barely moves is a tap, reported with what it landed on;
   - on the page two fingers zoom, and a double tap steps between near and far;
   - on the card only the planet and the air round it take the finger (KPlanetTouchShape):
     the card sits in a page that scrolls;
   - the clock stops when the surface is not on show. Under Reduce Motion the
     planet still turns under the finger, but nothing glides, drifts or twinkles. */

/// What a surface round the planet reads from it each frame without becoming part of its state:
/// where she is (a speech bubble's tail follows her).
public final class KPlanetProbe {
  /// her x in the planet view, in points, eased so a tail does not jitter
  public internal(set) var wrenX: CGFloat = 0
  var seeded = false
  /// the planet this probe is given to, once it has drawn a frame
  weak var engine: KPlanetEngine?
  /// a check's world, already run on: the view it is given to adopts it instead of starting its own
  var seed: KPlanetEngine?

  public init() {}

  /// For checks: a probe whose planet starts from `seed` (design/courier-planet/checks).
  init(seed: KPlanetEngine) {
    self.seed = seed
  }

  /// The page's + and − : nearer or further by a factor, within the planet's range. The planet
  /// eases to it.
  public func zoom(by factor: CGFloat) {
    guard let engine, factor > 0 else { return }
    let range = KPlanetEngine.zoomRange
    engine.zoom = min(max(engine.zoom * factor, range.lowerBound), range.upperBound)
  }

  /// The zoom asked for (1 = as the page opens).
  public var zoom: CGFloat { engine?.zoom ?? 1 }
}

public struct KPlanetView: View {
  private let kind: KPlanetKind
  private let content: KPlanetContent
  private let probe: KPlanetProbe?
  private let onTap: (KPlanetTap) -> Void
  private let onPick: (String) -> Void
  private let onTurned: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var engine = KPlanetEngine()
  @State private var began: (at: CGPoint, time: Date)?
  @State private var zoomAtStart: CGFloat?
  @State private var turnedTold = false

  /// - Parameters:
  ///   - kind: the card's small planet, or the page's
  ///   - content: what it shows
  ///   - onTap: a tap landed on something
  ///   - onPick: the page only — the planet was turned by hand and this letter's stamp now faces the reader
  ///   - onTurned: a finger turned the planet (once per drag): the hint can go
  public init(
    kind: KPlanetKind,
    content: KPlanetContent,
    probe: KPlanetProbe? = nil,
    onTap: @escaping (KPlanetTap) -> Void = { _ in },
    onPick: @escaping (String) -> Void = { _ in },
    onTurned: @escaping () -> Void = {}
  ) {
    self.kind = kind
    self.content = content
    self.probe = probe
    self.onTap = onTap
    self.onPick = onPick
    self.onTurned = onTurned
    if let seed = probe?.seed { _engine = State(initialValue: seed) }
  }

  public var body: some View {
    GeometryReader { geo in
      let size = geo.size
      TimelineView(.animation(minimumInterval: nil, paused: !content.live)) { timeline in
        Canvas { context, _ in
          var ctx = context
          let now = timeline.date.timeIntervalSinceReferenceDate
          engine.reduceMotion = reduceMotion
          engine.onPick = onPick
          KPlanetView.render(&ctx, engine: engine, kind: kind, content: content, size: size, now: now)
          if let probe { KPlanetView.report(engine, to: probe, kind: kind, size: size) }
        }
      }
      .contentShape(KPlanetTouchShape(kind: kind))
      .gesture(turning(size))
      .simultaneousGesture(zooming)
      .onTapGesture(count: 2) {
        guard kind == .page else { return }
        engine.zoom = engine.zoom > 1.3 ? 1 : 1.8
      }
    }
    .accessibilityHidden(true)
  }

  /// One frame: advance, then paint. Static so a check can render a frame without a view.
  static func render(_ ctx: inout GraphicsContext, engine: KPlanetEngine, kind: KPlanetKind, content: KPlanetContent, size: CGSize, now: TimeInterval) {
    engine.advance(to: now, kind: kind, content: content, size: size)
    let layout = KPlanetLayout.make(kind, size: size, zoom: engine.zoomShown)
    let time = engine.worldTime
    let frame = KPlanetPaint.Frame(kind: kind, layout: layout, palette: content.palette, turn: engine.turn, time: time, reduceMotion: engine.reduceMotion, zoom: engine.zoomShown)
    let letters = engine.shown(content)
    let who = content.wren
    let her = engine.wren.now
    let note: (CGPoint, CGFloat, KPlanetHit) -> Void = { at, reach, what in
      engine.noteHit(at, reach: reach, what)
    }

    engine.resetHits()
    KPlanetPaint.sky(&ctx, frame)
    // what is behind the planet
    KPlanetPaint.scenery(&ctx, frame, near: false)
    if her.gates { KPlanetPaint.trail(&ctx, frame, engine.wren.trail, behind: true) }
    if let who, !her.onRim, her.behind { KPlanetPaint.wren(&ctx, frame, who, her, note: note) }
    // the planet
    KPlanetPaint.globe(&ctx, frame, letters: letters, selected: engine.selectedNow, note: note)
    // what is in front
    KPlanetPaint.scenery(&ctx, frame, near: true)
    if her.gates {
      KPlanetPaint.gates(&ctx, frame, loop: layout.loop, lift: layout.lift, side: her.side)
      KPlanetPaint.trail(&ctx, frame, engine.wren.trail, behind: false)
    }
    if let who, her.onRim || !her.behind { KPlanetPaint.wren(&ctx, frame, who, her, note: note) }
    if let ping = engine.pingNow {
      let alive = KPlanetPaint.ring(&ctx, frame, ordinal: ping.ordinal, since: time - ping.at)
      if !alive { engine.clearPing() }
    }
  }

  /// Where she is, eased toward: a fifth of the way a frame.
  static func report(_ engine: KPlanetEngine, to probe: KPlanetProbe, kind: KPlanetKind, size: CGSize) {
    let layout = KPlanetLayout.make(kind, size: size, zoom: engine.zoomShown)
    let x = engine.wren.x(layout)
    if probe.engine !== engine { probe.engine = engine }
    if probe.seeded {
      probe.wrenX += (x - probe.wrenX) * (engine.reduceMotion ? 1 : 0.2)
    } else {
      probe.wrenX = x
      probe.seeded = true
    }
  }

  private func layout(_ size: CGSize) -> KPlanetLayout {
    KPlanetLayout.make(kind, size: size, zoom: engine.zoomShown)
  }

  private func turning(_ size: CGSize) -> some Gesture {
    DragGesture(minimumDistance: 0, coordinateSpace: .local)
      .onChanged { value in
        let now = Date()
        if began == nil {
          began = (value.startLocation, now)
          engine.touchDown(value.startLocation, layout: layout(size))
        }
        engine.touchMove(value.location, layout: layout(size), now: now.timeIntervalSinceReferenceDate)
        if !turnedTold, hypot(value.translation.width, value.translation.height) > 6 {
          turnedTold = true
          onTurned()
        }
      }
      .onEnded { value in
        let start = began
        began = nil
        turnedTold = false
        let moved = hypot(value.translation.width, value.translation.height)
        let held = start.map { Date().timeIntervalSince($0.time) } ?? 1
        if moved <= 6, held < 0.5 {
          engine.cancelTouch()
          if let what = engine.hit(at: value.location) {
            if what == .wren { engine.wrenTapped() }
            onTap(KPlanetTap(what))
          }
        } else {
          engine.touchUp(now: Date().timeIntervalSinceReferenceDate)
        }
      }
  }

  private var zooming: some Gesture {
    MagnifyGesture()
      .onChanged { value in
        guard kind == .page else { return }
        let from = zoomAtStart ?? engine.zoom
        if zoomAtStart == nil {
          zoomAtStart = from
          engine.cancelTouch()
        }
        let asked = from * value.magnification
        engine.zoom = min(max(asked, KPlanetEngine.zoomRange.lowerBound), KPlanetEngine.zoomRange.upperBound)
      }
      .onEnded { _ in
        zoomAtStart = nil
      }
  }
}

/// Where a finger takes hold of the planet. The page: the whole scene. The card sits in a page
/// that scrolls, so only the planet and the air her loop crosses take the finger there, and the
/// scene's sides still scroll the page.
struct KPlanetTouchShape: Shape {
  let kind: KPlanetKind

  func path(in rect: CGRect) -> Path {
    guard kind == .card else { return Path(rect) }
    let layout = KPlanetLayout.make(.card, size: rect.size, zoom: 1)
    let reach = layout.radius + layout.lift + 22
    let round = CGRect(x: layout.centre.x - reach, y: layout.centre.y - reach, width: reach * 2, height: reach * 2)
    return Path(ellipseIn: round).intersection(Path(rect))
  }
}

/// What a tap on the planet landed on.
public enum KPlanetTap: Equatable, Sendable {
  /// a letter's stamp
  case stamp(String)
  case wren
  /// the reply she set down beside her
  case letter

  init(_ hit: KPlanetHit) {
    switch hit {
    case let .stamp(id): self = .stamp(id)
    case .wren: self = .wren
    case .letter: self = .letter
    }
  }
}
