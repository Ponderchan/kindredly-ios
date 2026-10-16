// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 WREN ON THE ARC (Today 3d × 25b, Prompts 3 and 6, revised 2026-10-16). The reader's own Wren,
 always: five pictures of her (idle, curious, delight, sleepy, fly) captured from her own look by
 BirdSnapshots and handed over by TS. Never the design's SVGs.

 One overlay over the whole desk, taking no touches. She stands at the dashed arc's top (48, the
 design's left 173 / top 640, centre 16 above the arc), reacts to what the reader does, and on the
 last letter flies the road the arc drew: along it to the REPLY end, then a dive into the flight
 window (the done flow's timeline, KDayFlow, moves her; this only draws where it says).

 HER FACE, first that applies: the flow's (sleepy or idle as the day closes, fly in the air,
 fly or idle in the window); delight while the reader writes back (deck.typing); curious while a
 card is dragged past 8%; curious for 1.2s after a letter is passed (not the last); idle. The five
 pictures sit stacked in a 48 frame and crossfade in 200ms. A picture not captured yet shows idle
 instead; with no idle either, nothing (never the design's stand-in). A fledgling or hatchling has
 no fly art: TS sends her perch picture as fly with flyIsPerch, drawn tilted -12°.

 THE LEAN: as a card is dragged up she leans toward it from her feet (anchor 50% 90%): rotate
 -16° × p, scale 1 + .1 p, following the finger with no animation (p is the deck's drag progress,
 never a JS round trip); let go and she comes back in 250ms. Reduce Motion keeps it (it follows
 the finger).

 HER FLIGHT, flight f from the flow (0 wire, 1 arc end, 2 window), through an Animatable modifier
 on the flight curve (550ms, .4 0 .3 1, pinned here; the flow's rest and reset disable it): 0…1
 rides the arc's second half (48 → 44), 1…2 dives straight into the window (44 → 34), where she
 takes the design's small drop shadow. In the
 window she flaps while the flow loops (y 0 → -7 → 0, rotate -4° → 6° → -4°, 1.1s ease-in-out,
 repeating), only when she can play and never under Reduce Motion. Under Reduce Motion she doesn't
 fly: she fades out on the arc and in at the window.

 She hides (opacity, bandFade) when the desk says (the + open; a send or the reader while she is
 on the arc), and slides down 160 with the band while the reader types.

 THE ARRIVAL BUBBLE (owner question 7): on her first day her line from TS sits in a speech bubble
 just over her head while the first three letters are up. It shows only while she is on the arc,
 not hidden, and the reader isn't typing; it pops in 400ms after that, and fades when it goes.
 VoiceOver reads it as text after the card. Every word is TS's.
 */
struct KWireWren: View {
  private let theme: KTheme
  private let birds: KTodayBirds
  private let width: CGFloat
  private let controlTop: CGFloat
  private let night: Bool
  private let canPlay: Bool
  private let arrivalLine: String
  private let hidden: Bool
  private let motion: KDeckMotion
  @ObservedObject private var deck: KDeckState
  @ObservedObject private var flow: KDayFlow

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// the pass beat keeping her curious for 1.2s, nil once it has run out
  @State private var curiousBeat: Int?

  /// - Parameters:
  ///   - birds: her five pictures (TS: useTodayBirds)
  ///   - width: the Host's width (the band's W)
  ///   - controlTop: the band's top in the desk's coordinates; she is placed from it
  ///   - night: the reader's night hours (the flow already picks the yawn; kept for the pictures' sake)
  ///   - canPlay: she can play the flight game: she only flaps in the window when she can
  ///   - arrivalLine: her first-day line, "" for none
  ///   - hidden: the desk's rule (the + open, or a send or the reader while she is on the arc)
  ///   - motion: the deck's drag (only her figure reads it, per frame)
  ///   - deck: the beats, typing
  ///   - flow: the done flow (her face override, flight and loop)
  init(
    theme: KTheme,
    birds: KTodayBirds,
    width: CGFloat,
    controlTop: CGFloat,
    night: Bool,
    canPlay: Bool,
    arrivalLine: String,
    hidden: Bool,
    motion: KDeckMotion,
    deck: KDeckState,
    flow: KDayFlow
  ) {
    self.theme = theme
    self.birds = birds
    self.width = width
    self.controlTop = controlTop
    self.night = night
    self.canPlay = canPlay
    self.arrivalLine = arrivalLine
    self.hidden = hidden
    self.motion = motion
    self._deck = ObservedObject(wrappedValue: deck)
    self._flow = ObservedObject(wrappedValue: flow)
  }

  var body: some View {
    let typing = deck.typing
    let onWire = flow.isReading
    let down = typing && onWire
    ZStack(alignment: .topLeading) {
      bird
        // down 160 with the band while the reader types; a fade under Reduce Motion
        .offset(y: down && !reduceMotion ? 160 : 0)
        .opacity(down && reduceMotion ? 0 : 1)
        .animation(reduceMotion ? KTodayMotion.reduced : KTodayMotion.bandSlide, value: down)
        .opacity(hidden ? 0 : 1)
        .animation(KTodayMotion.bandFade, value: hidden)
        .accessibilityHidden(true)

      KArrivalBubble(
        theme: theme,
        line: arrivalLine,
        wanted: !arrivalLine.isEmpty && onWire && !hidden && !typing,
        herX: KBandLayout.wire(width).x,
        width: width,
        tipY: controlTop + KBandLayout.wire(width).y - KBandLayout.wireSize / 2 - 6
      )
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .allowsHitTesting(false)
    .onChange(of: deck.beat) { _, beat in
      switch beat.kind {
      case .passed(last: false):
        curiousBeat = beat.serial
      case .passed(last: true), .left, .broughtBack, .replyOpened:
        curiousBeat = nil
      case .none, .keyboardDown:
        break
      }
    }
    .task(id: curiousBeat) {
      guard curiousBeat != nil else { return }
      try? await Task.sleep(for: .milliseconds(1200))
      guard !Task.isCancelled else { return }
      curiousBeat = nil
    }
  }

  /// The face before the drag is considered: the flow's, then delight while typing.
  private var leadingFace: KWrenFace? {
    if let f = flow.faceOverride { return f }
    if deck.typing { return .delight }
    return nil
  }

  private func figure() -> KWrenFigure {
    KWrenFigure(
      birds: birds,
      leading: leadingFace,
      beatCurious: curiousBeat != nil,
      looping: flow.looping && canPlay && !reduceMotion,
      motion: motion
    )
  }

  /// Her figure where the flow says. Each curve is pinned here: the flow may land several values in
  /// one transaction, and its rest and reset disable animations, which .animation(_:value:) honours.
  @ViewBuilder
  private var bird: some View {
    if reduceMotion {
      // no flight: she fades out on the arc and in at the window (200ms)
      let away = flow.flight >= 1
      ZStack {
        figure()
          .modifier(KWrenPlacement(flight: 0, width: width, controlTop: controlTop))
          .opacity(away ? 0 : 1)
        figure()
          .modifier(KWrenPlacement(flight: 2, width: width, controlTop: controlTop))
          .opacity(away ? 1 : 0)
      }
      .animation(KTodayMotion.reduced, value: away)
    } else {
      // along the arc, then the dive: both segments on the flight curve (550ms, .4 0 .3 1)
      figure()
        .modifier(KWrenPlacement(flight: flow.flight, width: width, controlTop: controlTop))
        .animation(KTodayMotion.flight, value: flow.flight)
    }
  }
}

/// Her figure at 48: the five pictures crossfading, the lean (per frame, from the deck's drag) and
/// the flap. Only this reads KDeckMotion, so a drag frame redraws her and nothing else.
private struct KWrenFigure: View {
  static let size: CGFloat = KBandLayout.wireSize
  static let feet = UnitPoint(x: 0.5, y: 0.9)

  let birds: KTodayBirds
  /// the flow's face or delight (typing): wins over the drag
  let leading: KWrenFace?
  /// a letter was just passed (not the last)
  let beatCurious: Bool
  let looping: Bool
  @ObservedObject var motion: KDeckMotion

  private func ref(_ face: KWrenFace) -> KImageRef? {
    switch face {
    case .idle: return birds.idle
    case .curious: return birds.curious
    case .delight: return birds.delight
    case .sleepy: return birds.sleepy
    case .fly: return birds.fly ?? (birds.flyIsPerch ? birds.idle : nil)
    }
  }

  var body: some View {
    let p = min(max(motion.progress, 0), 1)
    let wanted: KWrenFace = leading
      ?? ((motion.dragging && p > 0.08) || beatCurious ? .curious : .idle)
    // a picture not captured yet: idle in its place
    let visible: KWrenFace = ref(wanted) != nil ? wanted : .idle
    ZStack {
      layer(.idle, visible)
      layer(.curious, visible)
      layer(.delight, visible)
      layer(.sleepy, visible)
      layer(.fly, visible)
        .rotationEffect(.degrees(birds.flyIsPerch ? -12 : 0))
    }
    .frame(width: Self.size, height: Self.size)
    .animation(KTodayMotion.face, value: visible)
    // the lean follows the finger; let go, it comes back in 250ms
    .animation(motion.dragging ? nil : KTodayMotion.leanBack) {
      $0
        .rotationEffect(.degrees(-16 * Double(p)), anchor: Self.feet)
        .scaleEffect(1 + 0.1 * p, anchor: Self.feet)
    }
    .modifier(KWrenFlap(active: looping))
  }

  private func layer(_ face: KWrenFace, _ visible: KWrenFace) -> some View {
    KImage(ref(face), size: CGSize(width: Self.size, height: Self.size), contentMode: .fit, placeholder: .clear)
      .opacity(face == visible ? 1 : 0)
  }
}

/// Where she is at flight f, in the desk's coordinates (the band's, moved down by controlTop),
/// and at what size: animatable, so the flow's transaction carries her along the arc and the dive.
private struct KWrenPlacement: ViewModifier, Animatable {
  var flight: CGFloat
  let width: CGFloat
  let controlTop: CGFloat

  var animatableData: CGFloat {
    get { flight }
    set { flight = newValue }
  }

  func body(content: Content) -> some View {
    let place = KBandLayout.flightPlace(width, flight)
    // the design's drop shadow (0 2 0 rgba(0,0,0,.25)) as she comes into the window
    let shade = 0.25 * Double(min(max(flight - 1, 0), 1))
    content
      .scaleEffect(place.size / KWrenFigure.size)
      .compositingGroup()
      .shadow(color: Color.black.opacity(shade), radius: 0, x: 0, y: 2)
      .position(x: place.center.x, y: controlTop + place.center.y)
  }
}

/// The flap in the window: y 0 → -7 → 0 and rotate -4° → 6° → -4° from her feet, 1.1s, ease-in-out
/// each way, repeating (the design's kfly). Paused, it draws her at rest; the TimelineView stays in
/// place either way, so her pictures aren't rebuilt when the loop starts or stops.
private struct KWrenFlap: ViewModifier {
  let active: Bool
  @State private var start = Date()

  func body(content: Content) -> some View {
    TimelineView(.animation(minimumInterval: nil, paused: !active)) { context in
      let (y, angle) = active ? pose(context.date) : (0, 0)
      content
        .rotationEffect(.degrees(angle), anchor: KWrenFigure.feet)
        .offset(y: y)
    }
    .onChange(of: active, initial: true) { _, now in
      if now { start = Date() }
    }
  }

  private func pose(_ date: Date) -> (CGFloat, Double) {
    let period = KTodayMotion.flapPeriod
    let t = date.timeIntervalSince(start).truncatingRemainder(dividingBy: period) / period
    let half = t < 0.5
    let u = UnitCurve.easeInOut.value(at: half ? t * 2 : (t - 0.5) * 2)
    let k = half ? u : 1 - u
    return (CGFloat(-7 * k), -4 + 10 * k)
  }
}

/*
 THE ARRIVAL BUBBLE: sf, a 2 ln outline, corners of 16, a hard 3/3 ln shadow, padding 10 14; her
 line in the serif, italic 15 at 1.3, ink, at most 3 lines and 232 wide. Centred on her, kept 16
 from either edge, its 10 × 7 tail pointing down at her with its tip 6 over her head. It pops in
 (scale .7 → 1 from the tail, with opacity, .3s) 400ms after it is wanted, and goes with a .25s
 fade; under Reduce Motion it only fades.
 */
private struct KArrivalBubble: View {
  static let tail: CGFloat = 7
  static let tailWidth: CGFloat = 10
  static let radius: CGFloat = 16
  static let outline: CGFloat = 2
  static let edge: CGFloat = 16
  static let maxText: CGFloat = 232

  let theme: KTheme
  let line: String
  let wanted: Bool
  /// her centre's x
  let herX: CGFloat
  let width: CGFloat
  /// where the tail's tip sits, in the desk's coordinates
  let tipY: CGFloat

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var visible = false
  @State private var popped = false
  /// the line last shown, kept while the bubble fades after TS clears it
  @State private var shownLine = ""
  @State private var size: CGSize = .zero

  var body: some View {
    let w = size.width
    let room = width - 2 * Self.edge
    let cx = w <= 0 || w >= room ? width / 2 : min(max(herX, Self.edge + w / 2), width - Self.edge - w / 2)
    let tipX = w > 0 ? herX - (cx - w / 2) : 0
    let anchor = UnitPoint(x: w > 0 ? tipX / w : 0.5, y: 1)
    bubble(tipX: tipX)
      .onGeometryChange(for: CGSize.self) { $0.size } action: { new in
        if abs(new.width - size.width) > 0.5 || abs(new.height - size.height) > 0.5 { size = new }
      }
      .scaleEffect(popped || reduceMotion ? 1 : 0.7, anchor: anchor)
      .opacity(visible ? 1 : 0)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(shownLine)
      .accessibilityAddTraits(.isStaticText)
      .accessibilityHidden(!visible || shownLine.isEmpty)
      .accessibilitySortPriority(-1)
      // its bottom (the tail's tip) at tipY, centred on cx
      .frame(width: width, height: max(0, tipY), alignment: .bottom)
      .offset(x: cx - width / 2)
      .onChange(of: line, initial: true) { _, now in
        if !now.isEmpty { shownLine = now }
      }
      .task(id: wanted) {
        if wanted {
          try? await Task.sleep(for: .milliseconds(400))
          guard !Task.isCancelled else { return }
          withAnimation(.timingCurve(0.25, 0.1, 0.25, 1, duration: 0.3)) {
            popped = true
            visible = true
          }
        } else {
          withAnimation(.easeOut(duration: 0.25)) { visible = false }
          try? await Task.sleep(for: .milliseconds(250))
          guard !Task.isCancelled else { return }
          popped = false
        }
      }
  }

  private func bubble(tipX: CGFloat) -> some View {
    Text(shownLine)
      .kText(.letter(15, italic: true, lineHeight: 1.3))
      .foregroundStyle(theme.ink)
      .lineLimit(3)
      .multilineTextAlignment(.leading)
      .layoutMaxWidth(Self.maxText)
      // padding 10 14 inside the 2 outline, and the tail's room under it
      .padding(.vertical, 10 + Self.outline)
      .padding(.horizontal, 14 + Self.outline)
      .padding(.bottom, Self.tail)
      .background {
        KStickerBackground(
          shape: KBubbleShape(tipX: tipX, tail: Self.tail, tailWidth: Self.tailWidth, radius: Self.radius),
          fill: theme.sf,
          stroke: theme.ln,
          lineWidth: Self.outline,
          shadow: theme.ln,
          shadowOffset: 3
        )
      }
      .dynamicTypeSize(...DynamicTypeSize.xxLarge)
  }
}

/// A rounded box with a tail under it, pointing down, its tip at (tipX, maxY). Insettable, so the
/// sticker's outline is drawn inside its edge like every other sticker's.
private struct KBubbleShape: InsettableShape {
  var tipX: CGFloat
  var tail: CGFloat
  var tailWidth: CGFloat
  var radius: CGFloat
  var inset: CGFloat = 0

  func inset(by amount: CGFloat) -> KBubbleShape {
    var s = self
    s.inset += amount
    return s
  }

  func path(in rect: CGRect) -> Path {
    let box = CGRect(x: rect.minX, y: rect.minY, width: rect.width, height: max(0, rect.height - tail))
    let b = box.insetBy(dx: inset, dy: inset)
    guard b.width > 0, b.height > 0 else { return Path() }
    let r = max(0, min(radius - inset, b.width / 2, b.height / 2))
    // the tail's two sides moved in by the inset, like the box's: where they meet the inset box's
    // bottom (its base narrows) and each other (its tip rises)
    let a = tailWidth / 2
    let side = (tail * tail + a * a).squareRoot()
    let half = a > 0 && tail > 0 ? max(0, a - inset * tail / side + inset * a * (1 - a / side) / tail) : 0
    let tipY = a > 0 ? box.maxY + tail - inset * side / a : box.maxY
    let lo = b.minX + r + half, hi = b.maxX - r - half
    let tx = lo <= hi ? min(max(rect.minX + tipX, lo), hi) : b.midX

    var p = Path()
    p.move(to: CGPoint(x: b.minX + r, y: b.minY))
    p.addArc(tangent1End: CGPoint(x: b.maxX, y: b.minY), tangent2End: CGPoint(x: b.maxX, y: b.maxY), radius: r)
    p.addArc(tangent1End: CGPoint(x: b.maxX, y: b.maxY), tangent2End: CGPoint(x: b.minX, y: b.maxY), radius: r)
    p.addLine(to: CGPoint(x: tx + half, y: b.maxY))
    p.addLine(to: CGPoint(x: tx, y: max(b.maxY, tipY)))
    p.addLine(to: CGPoint(x: tx - half, y: b.maxY))
    p.addArc(tangent1End: CGPoint(x: b.minX, y: b.maxY), tangent2End: CGPoint(x: b.minX, y: b.minY), radius: r)
    p.addArc(tangent1End: CGPoint(x: b.minX, y: b.minY), tangent2End: CGPoint(x: b.maxX, y: b.minY), radius: r)
    p.closeSubpath()
    return p
  }
}

/// Proposes at most `max` wide to its one subview and takes the subview's own size, so a short
/// line hugs its words and a long one wraps at `max` (a frame(maxWidth:) would always take `max`).
private struct KMaxWidthLayout: Layout {
  let max: CGFloat

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    guard let s = subviews.first else { return .zero }
    let w = Swift.min(proposal.width ?? max, max)
    return s.sizeThatFits(ProposedViewSize(width: w, height: nil))
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    subviews.first?.place(at: bounds.origin, proposal: ProposedViewSize(width: bounds.width, height: bounds.height))
  }
}

private extension View {
  func layoutMaxWidth(_ max: CGFloat) -> some View {
    KMaxWidthLayout(max: max) { self }
  }
}
