// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 WREN ON THE BAND (Today 3d × 25b, Prompts 3 and 6; the owner's 2026-10-16 18:05 decision and his
 2026-10-18 reactions). The reader's own Wren, always: five pictures of her (idle, curious,
 delight, sleepy, fly) captured from her own look by BirdSnapshots and handed over by TS, in her
 wilted set while she's starving (TS picks the set: useTodayBirds). Never the design's SVGs.

 One overlay over the whole desk. She stands on the page ground between Next and Reply (40, her
 centre on the discs' midline, B8: KBandLayout.spot), reacts to what the reader does, and
 on the last letter flies straight from her spot into the flight window (the done flow's
 timeline, KDayFlow, moves her; this only draws where it says). Only her own figure takes a
 touch, and only while she stands on the band.

 HER FACE, first that applies: the flow's (sleepy or content as the day closes, fly in the air,
 fly or content in the window); fly while she is away with a reply; delight for 600ms after a tap,
 and while the reader writes back (deck.typing); curious while a long letter unfolds; curious
 while a card is dragged up past 8%; curious for 1.2s after a letter is passed (not the last);
 and otherwise her resting face, which is TS's (wren.rest: sleepy from 21:00 to 07:59 by the
 reader's clock, else content), so every reaction comes back to it. The five pictures sit stacked
 in her 36 frame, scaled to her place's size, and crossfade in 200ms. A picture not captured yet
 shows her resting one instead, then idle; with neither, nothing (never the design's stand-in). A
 fledgling or hatchling has no fly art: TS sends her perch picture as fly with flyIsPerch, drawn
 tilted -12°.

 HER REACTIONS:
 - THE LEAN: as a card is dragged up she leans toward it from her feet (anchor 50% 90%): rotate
   -16° × p, scale 1 + .1 p, following the finger with no animation (p is the deck's drag
   progress, never a JS round trip); pulled DOWN (the damped drag) she leans back away from it,
   +8° × the pull (KDeckMotion.pull), her face unchanged. Let go and she comes back in 250ms.
 - UNFOLD: the letter's UNFOLD (a beat from the deck, as the reader is asked for, never delaying
   it) leans her all the way toward the card with the curious face; she straightens up when the
   reader closes (wren.reader), or after 1.5s if it never opened.
 - THE HOP: tap her (VoiceOver: activate) and she hops 8 up and back (300ms) with a light haptic
   (SwiftUI's sensoryFeedback .impact(weight: .light), the UIImpactFeedbackGenerator .light
   tap, so this file stays SwiftUI-only), delighted for 600ms. Not while the reader types, while
   she's away, or once the day is ending.
 - SHE TAKES THE LETTER: each time TS's wren.carry moves (a reply leaving the phone) she picks
   the envelope up in her beak and holds it a beat (pickUp, 450ms; owner, 2026-10-21: the send
   must read as her carrying it, not just leaving), then switches to fly and lifts off, up and out
   past the top right (900ms, climbing first); 2.5s after take-off she comes back in from the top left, drops onto her spot
   (700ms) and settles in her resting face. This is the send's only bird: no React Native fly-by
   sits over the Host. If that reply was the last letter, the day's end takes over: she flies
   into the window from wherever the errand has taken her.
 - The pass's curious beat, delight while typing, and the day's end, as before.

 HER FLIGHT, flight f from the flow (0 her spot on the band, 1 the window), through an Animatable
 modifier on the flight curve (550ms, .4 0 .3 1, pinned here; the flow's rest and reset disable
 it): a straight line from her spot into the window (40 → 34). The errand rides the same
 modifier as an offset from her spot. In the window she takes the design's small drop shadow
 and flaps while the flow loops (y 0 → -7 → 0, rotate -4° → 6° → -4°, 1.1s ease-in-out,
 repeating), only when she can play and never under Reduce Motion.

 REDUCE MOTION: faces change, nothing moves. She doesn't fly to the window (she fades out on the
 band and in at the window), the errand is the fly face with the envelope and then a fade out and
 back in on her spot, the hop is the face and the haptic alone, the unfold is the curious face
 alone. The drag's lean stays, up or down: it is the finger's, as the card's following it is.

 She hides (opacity, bandFade) when the desk says (the + open) and while the reader is open, and
 fades out with the band while the reader writes back (the chat composers' A1, owner 2026-10-18:
 the band goes to opacity 0 in place, she is part of it; she used to slide down 160 with it).
 Not while she is away: a reply she takes off comes into sight on her spot as she lifts off with
 it, while the band is still out (deck.typing holds until TS answers the send).

 THE ARRIVAL BUBBLE (owner question 7): on her first day her line from TS sits in a speech bubble
 just over her head while the first three letters are up. It shows only while she is on the band,
 not hidden or away, and the reader isn't typing; it pops in 400ms after that, and fades when it
 goes. A tap on it, or on her under it, puts it away for good (owner, 2026-10-21: it stayed and
 couldn't be tapped away): TS hears onArrivalDismiss (KArrivalDismiss, from the environment) and
 clears the line, and the bubble fades; TS also clears it by itself 10 s after it first shows.
 VoiceOver reads it as a "Close" button saying her line, after the card. Every word is TS's.
 */

/// Her arrival bubble's tap: the word VoiceOver calls the button, and what the tap does (TS settles
/// the arrival). KTodayView sets it in the environment; the desk passes nothing else of it.
public struct KArrivalDismiss {
  public var label: String
  public var act: () -> Void
  public init(label: String = "", act: @escaping () -> Void = {}) {
    self.label = label
    self.act = act
  }
}

private struct KArrivalDismissKey: EnvironmentKey {
  static let defaultValue = KArrivalDismiss()
}

extension EnvironmentValues {
  public var kArrivalDismiss: KArrivalDismiss {
    get { self[KArrivalDismissKey.self] }
    set { self[KArrivalDismissKey.self] = newValue }
  }
}

/// What Wren keeps without drawing: the generations that make a superseded delayed step a no-op,
/// and the latest facts such a step reads (never a captured copy of the view).
final class KWireWrenBox {
  var errand = 0
  var hop = 0
  var lean = 0
  /// TS's reader is open, as of the last body
  var reader = false
}

struct KWireWren: View {
  private let theme: KTheme
  private let birds: KTodayBirds
  private let wren: KTodayWren
  private let width: CGFloat
  private let controlTop: CGFloat
  private let canPlay: Bool
  private let arrivalLine: String
  private let hidden: Bool
  private let motion: KDeckMotion
  @ObservedObject private var deck: KDeckState
  @ObservedObject private var flow: KDayFlow

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.kArrivalDismiss) private var arrivalDismiss
  @State private var box = KWireWrenBox()
  /// the pass beat keeping her curious for 1.2s, nil once it has run out
  @State private var curiousBeat: Int?
  /// leaning all the way toward the card while its letter unfolds, until the reader closes
  @State private var unfoldLean = false
  /// each tap's serial: the hop and the haptic run on it
  @State private var hopSerial = 0
  /// delighted for 600ms after a tap
  @State private var hopping = false
  /// the errand's place: 0 her spot, up to 1 gone past the top right (out), from −1 past the top
  /// left (coming back)
  @State private var errand: CGFloat = 0
  /// she is on her errand (out, away, or coming back): the fly face, and the band's moves aren't hers
  @State private var away = false
  /// the reply's envelope at her feet, on the way out
  @State private var carrying = false
  /// Reduce Motion's errand: faded out with the letter
  @State private var gone = false

  /// how long she is away with a reply before she comes back in (from take-off)
  static let errandAway = 2.5
  /// out of sight by then (the take-off's 900ms)
  static let errandOut = 0.9
  /// the beat she holds the letter before lifting off
  static let pickUp = 0.45
  /// the unfold's lean waits this long for the reader before she straightens up
  static let leanWait = 1.5
  /// delighted this long after a tap
  static let hopFace = 0.6

  /// - Parameters:
  ///   - birds: her five pictures (TS: useTodayBirds; the wilted set while she's starving)
  ///   - wren: TS's word on her: the face she rests in, the reply serial she carries off, the
  ///     reader being open, what VoiceOver calls her
  ///   - width: the Host's width (the band's W)
  ///   - controlTop: the band's top in the desk's coordinates; she is placed from it
  ///   - canPlay: she can play the flight game: she only flaps in the window when she can
  ///   - arrivalLine: her first-day line, "" for none
  ///   - hidden: the + panel is open
  ///   - motion: the deck's drag (only her figure reads it, per frame)
  ///   - deck: the beats, typing
  ///   - flow: the done flow (her face override, flight and loop)
  init(
    theme: KTheme,
    birds: KTodayBirds,
    wren: KTodayWren,
    width: CGFloat,
    controlTop: CGFloat,
    canPlay: Bool,
    arrivalLine: String,
    hidden: Bool,
    motion: KDeckMotion,
    deck: KDeckState,
    flow: KDayFlow
  ) {
    self.theme = theme
    self.birds = birds
    self.wren = wren
    self.width = width
    self.controlTop = controlTop
    self.canPlay = canPlay
    self.arrivalLine = arrivalLine
    self.hidden = hidden
    self.motion = motion
    self._deck = ObservedObject(wrappedValue: deck)
    self._flow = ObservedObject(wrappedValue: flow)
  }

  var body: some View {
    let _ = remember()
    let typing = deck.typing
    let onBand = flow.isReading
    // the day's end has her from its first beat (her face at t = 0)
    let ending = flow.faceOverride != nil
    let down = typing && onBand && !away
    let hide = hidden || (wren.reader && onBand)
    // her rest on the band: the bubble's tail points at her head
    let rest = KBandLayout.flightPlace(width, 0)
    let bubbleWanted = !arrivalLine.isEmpty && onBand && !hide && !typing && !away
    ZStack(alignment: .topLeading) {
      bird(tappable: onBand && !ending && !typing && !away && !hide)
        // out with the band while the reader writes back, in place (the band's own fade)
        .opacity(down || hide ? 0 : 1)
        .animation(KTodayMotion.bandFade, value: down || hide)

      KArrivalBubble(
        theme: theme,
        line: arrivalLine,
        wanted: bubbleWanted,
        dismissLabel: arrivalDismiss.label,
        onDismiss: arrivalDismiss.act,
        herX: rest.center.x,
        width: width,
        tipY: controlTop + rest.center.y - rest.size / 2 - 6
      )
      // only the bubble itself takes a touch, and only while it is up
      .allowsHitTesting(bubbleWanted)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    // the hop's light tap (UIImpactFeedbackGenerator .light underneath)
    .sensoryFeedback(.impact(weight: .light), trigger: hopSerial)
    .onChange(of: deck.beat) { _, beat in beatChanged(beat) }
    .onChange(of: wren.carry) { old, now in
      if now > old { takeOff() }
    }
    .onChange(of: wren.reader) { old, now in
      // the reader closed: she straightens up (the lean's own 250ms)
      if old, !now { unfoldLean = false }
    }
    .onChange(of: flow.isReading) { _, reading in
      if !reading { dayEnds() }
    }
    .task(id: curiousBeat) {
      guard curiousBeat != nil else { return }
      try? await Task.sleep(for: .milliseconds(1200))
      guard !Task.isCancelled else { return }
      curiousBeat = nil
    }
  }

  // ── her face ──

  /// The face before the drag and her rest are considered: the flow's, the errand's, then
  /// delight (a tap, or typing), then curious while a letter unfolds.
  private var leadingFace: KWrenFace? {
    if let f = flow.faceOverride { return f }
    if away { return .fly }
    if hopping || deck.typing { return .delight }
    if unfoldLean { return .curious }
    return nil
  }

  private func figure() -> KWrenFigure {
    KWrenFigure(
      theme: theme,
      birds: birds,
      leading: leadingFace,
      beatCurious: curiousBeat != nil,
      rest: wren.rest,
      leanFull: unfoldLean,
      carrying: carrying,
      looping: flow.looping && canPlay && !reduceMotion,
      hop: hopSerial,
      still: reduceMotion,
      motion: motion
    )
  }

  /// Her figure as the one standing on the band: a tap (VoiceOver: activate) makes her hop, and
  /// puts her arrival bubble away while it is up. The touch area is her frame and 6 around it, so
  /// it never reaches NEXT or REPLY.
  private func courier(tappable: Bool) -> some View {
    figure()
      .contentShape(Rectangle().inset(by: -6))
      .onTapGesture { tapped() }
      .allowsHitTesting(tappable)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(wren.a11y)
      .accessibilityValue(wren.name)
      .accessibilityAddTraits(.isButton)
      .accessibilityAction { tapped() }
      .accessibilityHidden(!tappable)
  }

  /// A tap on her: her bubble goes (TS settles the arrival) while it is up; she hops either way.
  private func tapped() {
    if !arrivalLine.isEmpty { arrivalDismiss.act() }
    hop()
  }

  /// Her figure where the flow (and an errand) says. Each curve is pinned here: the flow may land
  /// several values in one transaction, and its rest and reset disable animations, which
  /// .animation(_:value:) honours.
  @ViewBuilder
  private func bird(tappable: Bool) -> some View {
    if reduceMotion {
      // nothing moves: she fades out on the band and in at the window (200ms), and an errand is a
      // fade out and back in on her spot
      let inWindow = flow.flight >= 1
      ZStack {
        courier(tappable: tappable)
          .modifier(KWrenPlacement(flight: 0, errand: 0, width: width, controlTop: controlTop))
          .opacity(inWindow || gone ? 0 : 1)
        figure()
          .modifier(KWrenPlacement(flight: 1, errand: 0, width: width, controlTop: controlTop))
          .opacity(inWindow ? 1 : 0)
          .allowsHitTesting(false)
          .accessibilityHidden(true)
      }
      .animation(KTodayMotion.reduced, value: inWindow)
    } else {
      // the flight on its curve (550ms, .4 0 .3 1): one straight segment into the window; the
      // errand's offset goes with whatever transaction set it
      courier(tappable: tappable)
        .modifier(KWrenPlacement(flight: flow.flight, errand: errand, width: width, controlTop: controlTop))
        .animation(KTodayMotion.flight, value: flow.flight)
    }
  }

  // ── what she does ──

  private func remember() {
    box.reader = wren.reader
  }

  private func beatChanged(_ beat: KDeckBeat) {
    switch beat.kind {
    case .passed(last: false):
      curiousBeat = beat.serial
      unfoldLean = false
    case .passed(last: true), .left, .broughtBack, .replyOpened:
      curiousBeat = nil
      unfoldLean = false
    case .unfolded:
      // all the way toward the card, curious, while the reader opens (it isn't waited for)
      curiousBeat = nil
      unfoldLean = true
      box.lean &+= 1
      let lean = box.lean
      // no reader after all (the letter left under the tap): she straightens up
      later(Self.leanWait, if: { [box] in box.lean == lean && !box.reader }) { unfoldLean = false }
    case .none, .keyboardDown:
      break
    }
  }

  /// A tap on her: 8 up and back with a light haptic, delighted for 600ms.
  private func hop() {
    guard flow.isReading, flow.faceOverride == nil, !deck.typing, !away, !hidden, !wren.reader else { return }
    hopSerial &+= 1
    hopping = true
    box.hop &+= 1
    let hop = box.hop
    later(Self.hopFace, if: { [box] in box.hop == hop }) { hopping = false }
  }

  /// A reply left the phone: she takes the letter up and out of sight, and comes back to her spot.
  private func takeOff() {
    // once the day is ending the flow has her (a last reply's day's end takes over)
    guard flow.isReading else { return }
    box.errand &+= 1
    let errandRun = box.errand
    let current: () -> Bool = { [box] in box.errand == errandRun }
    box.hop &+= 1
    hopping = false
    unfoldLean = false
    curiousBeat = nil
    away = true
    carrying = true
    if reduceMotion {
      later(0.6, if: current) { withAnimation(KTodayMotion.reduced) { gone = true } }
      later(Self.errandAway, if: current) {
        carrying = false
        withAnimation(KTodayMotion.reduced) {
          gone = false
          away = false
        }
      }
      return
    }
    later(Self.pickUp, if: current) { withAnimation(KTodayMotion.takeOff) { errand = 1 } }
    later(Self.pickUp + Self.errandOut, if: current) {
      // out of sight: round to the other side, where she comes back from
      carrying = false
      still { errand = -1 }
    }
    later(Self.pickUp + Self.errandAway, if: current) {
      withAnimation(KTodayMotion.landing) { errand = 0 }
    }
    later(Self.pickUp + Self.errandAway + 0.7, if: current) { away = false }
  }

  /// The day's end has begun: whatever she was doing gives way. Away with a reply, she flies into
  /// the window from wherever she is: the errand's offset folds into the flight, on its curve.
  private func dayEnds() {
    box.hop &+= 1
    hopping = false
    unfoldLean = false
    guard away else { return }
    box.errand &+= 1
    carrying = false
    withAnimation(reduceMotion ? KTodayMotion.reduced : KTodayMotion.flight) {
      errand = 0
      gone = false
    }
    away = false
  }

  /// runs `work` after `seconds` on the main queue, if `valid` still says so then
  private func later(_ seconds: Double, if valid: @escaping () -> Bool, _ work: @escaping () -> Void) {
    DispatchQueue.main.asyncAfter(deadline: .now() + seconds) {
      guard valid() else { return }
      work()
    }
  }

  /// a change that must not animate
  private func still(_ change: () -> Void) {
    var transaction = Transaction(animation: nil)
    transaction.disablesAnimations = true
    withTransaction(transaction, change)
  }
}

/// Her figure in her 36 frame (scaled to her place's size by KWrenPlacement): the five pictures
/// crossfading, the reply's envelope, the lean (per frame, from the deck's drag; all the way for an
/// unfold), the hop and the flap. Only this reads KDeckMotion, so a drag frame redraws her and
/// nothing else.
private struct KWrenFigure: View {
  static let size: CGFloat = KBandLayout.wrenSize
  static let feet = UnitPoint(x: 0.5, y: KBandLayout.feetY)
  /// the envelope's top, down her frame (LetterInFlight: just under her, overlapping by 6 of 34)
  /// the envelope in her beak: past her right edge (the fly art faces right), a little above centre
  static let envelopeOut: CGFloat = 0.30
  static let envelopeUp: CGFloat = 0.08

  let theme: KTheme
  let birds: KTodayBirds
  /// the flow's face, the errand's, delight or the unfold's curious: wins over the drag
  let leading: KWrenFace?
  /// a letter was just passed (not the last)
  let beatCurious: Bool
  /// TS's resting face (sleepy in her night hours)
  let rest: KWrenFace
  /// a letter is unfolding: the lean at full progress
  let leanFull: Bool
  let carrying: Bool
  let looping: Bool
  /// the taps' serial: each one hops her
  let hop: Int
  /// Reduce Motion: the hop and the unfold's lean don't move her
  let still: Bool
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
    let drag: CGFloat = min(max(motion.progress, 0), 1)
    // the unfold's lean is hers, not the finger's: under Reduce Motion only her face changes
    let p: CGFloat = leanFull && !still ? 1 : drag
    let q: CGFloat = min(max(motion.pull, 0), 1)
    // toward a card pulled up (−16° × p), back from one pulled down (+8° × the pull)
    let angle: Double = -16 * Double(p) + 8 * Double(q)
    let grow: CGFloat = 1 + 0.1 * p
    let curious: Bool = (motion.dragging && drag > 0.08) || beatCurious
    let wanted: KWrenFace = leading ?? (curious ? .curious : rest)
    // a picture not captured yet: her resting one in its place, then idle
    let visible: KWrenFace = ref(wanted) != nil ? wanted : (ref(rest) != nil ? rest : .idle)
    faces(visible)
      // the lean follows the finger; let go, it comes back in 250ms
      .animation(motion.dragging ? nil : KTodayMotion.leanBack) {
        $0
          .rotationEffect(.degrees(angle), anchor: Self.feet)
          .scaleEffect(grow, anchor: Self.feet)
      }
      // the hop: 8 up and back, 300ms
      .keyframeAnimator(initialValue: CGFloat(0), trigger: hop) { content, y in
        content.offset(y: still ? 0 : y)
      } keyframes: { _ in
        KeyframeTrack {
          CubicKeyframe(-8, duration: 0.14)
          CubicKeyframe(0, duration: 0.16)
        }
      }
      .modifier(KWrenFlap(active: looping))
  }

  /// The five pictures stacked in her frame, the one shown crossfading in, and the envelope at her
  /// feet while she carries a reply.
  private func faces(_ visible: KWrenFace) -> some View {
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
    .overlay(alignment: .center) {
      if carrying {
        KWrenEnvelope(theme: theme)
          .rotationEffect(.degrees(-8))
          .offset(x: Self.size * Self.envelopeOut, y: -Self.size * Self.envelopeUp)
          .transition(.opacity)
      }
    }
    .animation(KTodayMotion.face, value: carrying)
  }

  private func layer(_ face: KWrenFace, _ visible: KWrenFace) -> some View {
    KImage(ref(face), size: CGSize(width: Self.size, height: Self.size), contentMode: .fit, placeholder: .clear)
      .opacity(face == visible ? 1 : 0)
  }
}

/// The reply she carries: LetterInFlight's envelope at 22 × 16 (owner, 2026-10-21: large enough to
/// read as a letter in her beak), corners of 1.5, on the card face with a 1pt ink outline and the
/// flap's V.
private struct KWrenEnvelope: View {
  let theme: KTheme

  var body: some View {
    ZStack {
      RoundedRectangle(cornerRadius: 1.5).fill(theme.sf)
      RoundedRectangle(cornerRadius: 1.5).strokeBorder(theme.ink, lineWidth: 1)
      KEnvelopeFlap().stroke(theme.ink, style: StrokeStyle(lineWidth: 1, lineJoin: .round))
    }
    .frame(width: 22, height: 16)
    .accessibilityHidden(true)
  }
}

/// The flap's V across an envelope's top (LetterInFlight's "M0.6 1.4 L7.5 6.4 L14.4 1.4" in 15 × 11).
private struct KEnvelopeFlap: Shape {
  func path(in rect: CGRect) -> Path {
    var p = Path()
    p.move(to: CGPoint(x: rect.minX + rect.width * 0.04, y: rect.minY + rect.height * 0.13))
    p.addLine(to: CGPoint(x: rect.midX, y: rect.minY + rect.height * 0.58))
    p.addLine(to: CGPoint(x: rect.maxX - rect.width * 0.04, y: rect.minY + rect.height * 0.13))
    return p
  }
}

/// Where she is at flight f and on her errand, in the desk's coordinates (the band's, moved down by
/// controlTop), and at what size: animatable, so the flow's transaction carries her from the band
/// into the window, and an errand's carries her off and back.
private struct KWrenPlacement: ViewModifier, Animatable {
  var flight: CGFloat
  /// 0 her spot; toward 1 out past the top right; from −1 back from past the top left
  var errand: CGFloat
  let width: CGFloat
  let controlTop: CGFloat

  /// how far past the edges an errand takes her: out of sight with her envelope
  static let beyond: CGFloat = 60
  static let above: CGFloat = 80

  var animatableData: AnimatablePair<CGFloat, CGFloat> {
    get { AnimatablePair(flight, errand) }
    set {
      flight = newValue.first
      errand = newValue.second
    }
  }

  func body(content: Content) -> some View {
    let place = KBandLayout.flightPlace(width, flight)
    // the errand, as an offset from her spot: she climbs first (y with k) and veers late (x with
    // k²), so she lifts straight off the band and comes down straight onto it
    let e = min(max(errand, -1), 1)
    let k = abs(e)
    let home = KBandLayout.spot(width)
    let outX = e >= 0 ? width + Self.beyond : -Self.beyond
    let outY = -controlTop - Self.above
    let x = place.center.x + (outX - home.x) * k * k
    let y = place.center.y + (outY - home.y) * k
    // the design's drop shadow (0 2 0 rgba(0,0,0,.25)) as she comes into the window
    let shade = 0.25 * Double(min(max(flight, 0), 1))
    content
      .scaleEffect(place.size / KWrenFigure.size)
      .compositingGroup()
      .shadow(color: Color.black.opacity(shade), radius: 0, x: 0, y: 2)
      .position(x: x, y: controlTop + y)
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
 line in the reader's Letter font, italic 15 at 1.3 (upright in Garamond and SF Mono), ink, at
 most 3 lines (4 in a roomier face: KLetterFace.fitLines) and 232 wide. Centred on her, kept 16
 from either edge, its 10 × 7 tail pointing down at her with its tip 6 over her head. It pops in
 (scale .7 → 1 from the tail, with opacity, .3s) 400ms after it is wanted, and goes with a .25s
 fade; under Reduce Motion it only fades. A tap on it (VoiceOver: a "Close" button saying her
 line) calls onDismiss; TS clears the line and it fades.
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
  /// what VoiceOver calls the bubble's button
  let dismissLabel: String
  /// the tap: TS settles the arrival
  let onDismiss: () -> Void
  /// her centre's x
  let herX: CGFloat
  let width: CGFloat
  /// where the tail's tip sits, in the desk's coordinates
  let tipY: CGFloat

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// the reader's Letter font: Wren's line is set in it (upright in Garamond and SF Mono)
  @Environment(\.kLetterFace) private var face
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
      // the touch is the bubble's own box (the frame below is the whole desk's width)
      .contentShape(Rectangle())
      .onTapGesture { onDismiss() }
      .allowsHitTesting(visible)
      .scaleEffect(popped || reduceMotion ? 1 : 0.7, anchor: anchor)
      .opacity(visible ? 1 : 0)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(dismissLabel)
      .accessibilityValue(shownLine)
      .accessibilityAddTraits(.isButton)
      .accessibilityAction { onDismiss() }
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
      .kText(.content(15, italic: true, lineHeight: 1.3))
      .foregroundStyle(theme.ink)
      // a roomier face (SF Mono wider, Garamond taller) gets a fourth line rather than a cut; the
      // bubble grows up from its tail
      .lineLimit(face.fitLines(3))
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
          stroke: theme.isDark ? theme.line : theme.ln,
          lineWidth: Self.outline,
          shadow: theme.isDark ? nil : theme.ln,
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
