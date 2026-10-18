// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE END OF THE DAY ON TODAY (design 3d × 25b as revised 2026-10-16; build contract §3.7; the
 owner's 18:05 decision on the band, and his 2026-10-18 one: the ground band only). When the last
 letter on the desk goes, Wren's evening plays as one timeline. t = 0 is the release of the last
 card; the deck runs that card's own out-animation.

   t    0  her face: sleepy in her yawn hours (21:00 to 08:00, TS's `night`), otherwise content
      300  the band leaves: NEXT and REPLY fade (300 ms) and drop 12; she takes off (fly) straight
           from her spot between them into the window, one segment (550 ms); her letter rises into
           the card's slot from 70 below (the new-card curve)
      700  the window rises in (450 ms)
     1300  when she can play: the flap loop and the pipes start; otherwise she settles, content

 If she is away with a reply when the day ends (the last letter answered), she flies into the
 window from wherever her errand has taken her (KWireWren folds the errand into this flight).

 KDayFlow holds that timeline as published state, and the band's buttons, Wren, the window and
 this slot each read the part they draw. TS decides when the day is
 done and says every word; the flow only times the pictures. Opening Today on a desk that is
 already done draws the final state at once (rest), with no replay; a day that turns, or a pass
 TS doesn't confirm, puts everything back to reading (reset). Every pending step carries the
 generation it was scheduled in, so a reset or a rest cancels whatever was still to come.

 Reduce Motion: the face changes at 0, and at 300 every final value lands at once on a 200 ms
 ease (KTodayMotion.reduced); Wren crossfades from the band to the window (KWireWren draws that),
 and nothing loops.

 CURVES. Several values change at the same instant (t = 300) on different curves, and changes an
 ObservableObject makes in one turn of the run loop can reach SwiftUI as one update under the
 first transaction. So each step below sets the flight first (the one value read through an
 Animatable modifier), and every reader that needs its own curve pins it with
 .animation(_:value:), as this slot does for the letter. rest and reset run under a transaction
 that disables animations, which .animation(_:value:) honours.

 KDoneView is the slot's done content: Wren's letter (KWrenLetter), present from 300 on. It sits
 over the deck in the card slot and takes no touches until the window is up (t = 1000): while the
 letter is still rising its bag passes over NEXT's disc, and the second tap of a quick double-tap
 on NEXT (the last letter's pass) would otherwise land on the bag and show NOT YET.
 */

/// One of Wren's five faces (the five BirdSnapshots captures TS sends as KTodayBirds).
public enum KWrenFace: String, Sendable {
  case idle
  case curious
  case delight
  case sleepy
  case fly
}

/// The end-of-day timeline's state (see the note at the top of KDoneView.swift). One per surface,
/// owned by the adapter; the desk starts and resets it.
public final class KDayFlow: ObservableObject {
  /// NEXT, REPLY and their labels: they leave at t = 300
  @Published public private(set) var bandShown = true
  /// where Wren is: 0 on her spot on the band, 1 in the window
  @Published public private(set) var flight: CGFloat = 0
  /// the face the timeline asks for; nil leaves her to the desk's own rules
  @Published public private(set) var faceOverride: KWrenFace? = nil
  /// Wren's letter in the card slot
  @Published public private(set) var letterShown = false
  /// the window under the slot
  @Published public private(set) var windowShown = false
  /// her flap loop and the window's pipes (only when she can play)
  @Published public private(set) var looping = false

  /// The desk is the reading desk: nothing of the day's end is showing.
  public var isReading: Bool { !letterShown && flight == 0 && bandShown }

  private enum Stage {
    case reading
    case playing
    case done
  }

  private var stage = Stage.reading
  /// bumped by play, rest and reset; a scheduled step from an older generation does nothing
  private var generation = 0
  /// the letter came in through play, not rest: KDoneView moves VoiceOver to it once it is up
  private(set) var played = false

  public init() {}

  /// The timeline, from the last card's release. Ignored unless the desk is reading, so a second
  /// trigger for the same moment (the deck's beat, then TS's phase) plays it once.
  /// - Parameters:
  ///   - night: her yawn hours (TS's isNightHour): sleepy at t = 0, otherwise content
  ///   - canPlay: she can play (the PLAY sticker's rule): she flaps and the pipes run at the end
  public func play(night: Bool, canPlay: Bool, reduceMotion: Bool) {
    guard stage == .reading else { return }
    stage = .playing
    played = true
    generation &+= 1
    let token = generation
    withAnimation(KTodayMotion.face) { put(\.faceOverride, night ? KWrenFace.sleepy : KWrenFace.idle) }

    if reduceMotion {
      after(0.3, token) { flow in
        withAnimation(KTodayMotion.reduced) { flow.land(canPlay: canPlay, looping: false) }
        flow.stage = .done
      }
      return
    }

    // one straight flight, the window close behind her
    after(0.3, token) { flow in
      withAnimation(KTodayMotion.flight) { flow.put(\.flight, 1) }
      withAnimation(KTodayMotion.bandFade) { flow.put(\.bandShown, false) }
      withAnimation(KTodayMotion.face) { flow.put(\.faceOverride, KWrenFace.fly) }
      withAnimation(KTodayMotion.cardIn) { flow.put(\.letterShown, true) }
    }
    after(0.7, token) { flow in
      withAnimation(KTodayMotion.windowIn) { flow.put(\.windowShown, true) }
    }
    after(1.3, token) { flow in
      flow.settle(canPlay: canPlay)
    }
  }

  /// The timeline's last step: she flaps and the pipes run when she can play, else she settles.
  private func settle(canPlay: Bool) {
    withAnimation(KTodayMotion.face) { put(\.faceOverride, canPlay ? KWrenFace.fly : KWrenFace.idle) }
    put(\.looping, canPlay)
    stage = .done
  }

  /// The final state at once, with no animation: Today opened on a desk that is already done.
  /// Cancels anything still scheduled. Under Reduce Motion nothing loops.
  public func rest(canPlay: Bool, reduceMotion: Bool = false) {
    generation &+= 1
    stage = .done
    played = false
    still { land(canPlay: canPlay, looping: canPlay && !reduceMotion) }
  }

  /// Once the day's end has landed, what can change under it: she became able to play (or no
  /// longer can), or Reduce Motion was switched. Nothing happens while reading or mid-timeline.
  public func refresh(canPlay: Bool, reduceMotion: Bool) {
    guard stage == .done else { return }
    withAnimation(KTodayMotion.face) { put(\.faceOverride, canPlay ? KWrenFace.fly : KWrenFace.idle) }
    put(\.looping, canPlay && !reduceMotion)
  }

  /// Back to the reading desk at once, with no animation (the day turned, or TS didn't confirm
  /// the pass that started the timeline). Cancels anything still scheduled.
  public func reset() {
    generation &+= 1
    stage = .reading
    played = false
    still {
      put(\.bandShown, true)
      put(\.flight, 0)
      put(\.faceOverride, nil)
      put(\.letterShown, false)
      put(\.windowShown, false)
      put(\.looping, false)
    }
  }

  // ── helpers ──

  /// every final value of the day's end (the flight first: see CURVES)
  private func land(canPlay: Bool, looping loops: Bool) {
    put(\.flight, 1)
    put(\.bandShown, false)
    put(\.letterShown, true)
    put(\.windowShown, true)
    put(\.faceOverride, canPlay ? KWrenFace.fly : KWrenFace.idle)
    put(\.looping, loops)
  }

  /// a change that must not animate, whatever a reader pins with .animation(_:value:)
  private func still(_ change: () -> Void) {
    var transaction = Transaction(animation: nil)
    transaction.disablesAnimations = true
    withTransaction(transaction, change)
  }

  /// runs `step` after `seconds` on the main queue, unless play, rest or reset has run since
  private func after(_ seconds: Double, _ token: Int, _ step: @escaping (KDayFlow) -> Void) {
    DispatchQueue.main.asyncAfter(deadline: .now() + seconds) { [weak self] in
      guard let self, self.generation == token else { return }
      step(self)
    }
  }

  /// sets a published value only when it changes, so a reader isn't redrawn for nothing
  private func put<T: Equatable>(_ key: ReferenceWritableKeyPath<KDayFlow, T>, _ value: T) {
    if self[keyPath: key] != value { self[keyPath: key] = value }
  }
}

/// The card slot's done content: Wren's letter, from the moment the flow brings it in.
struct KDoneView: View {
  let theme: KTheme
  let letter: KWrenLetterModel
  let birds: KTodayBirds
  @ObservedObject var flow: KDayFlow

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  init(theme: KTheme, letter: KWrenLetterModel, birds: KTodayBirds, flow: KDayFlow) {
    self.theme = theme
    self.letter = letter
    self.birds = birds
    self.flow = flow
  }

  var body: some View {
    ZStack {
      if flow.letterShown {
        // her stamp is her own picture, at rest (the content capture: TS's fallback for them all)
        KWrenLetter(theme: theme, model: letter, stampBird: birds.idle, focusOnAppear: flow.played)
          .transition(reduceMotion ? .opacity : .kWrenLetterRise)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    // the letter comes in on the new-card curve (a crossfade under Reduce Motion), whatever
    // transaction the flow's step arrived in; rest and reset disable it
    .animation(reduceMotion ? KTodayMotion.reduced : KTodayMotion.cardIn, value: flow.letterShown)
    // touches only once the window is up (true at rest, and from t = 1000 in play): the letter
    // has landed by then, and a second tap meant for NEXT can no longer find the rising bag
    .allowsHitTesting(flow.windowShown)
  }
}

/// Wren's letter coming in as a new card does: from 70 below, at .98, from nothing.
private struct KWrenLetterRise: ViewModifier {
  let shown: Bool

  func body(content: Content) -> some View {
    content
      .scaleEffect(shown ? 1 : 0.98)
      .offset(y: shown ? 0 : 70)
      .opacity(shown ? 1 : 0)
  }
}

private extension AnyTransition {
  static var kWrenLetterRise: AnyTransition {
    .modifier(active: KWrenLetterRise(shown: false), identity: KWrenLetterRise(shown: true))
  }
}
