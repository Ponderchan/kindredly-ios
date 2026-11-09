// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE DECK (Today 3d × 25b, design Prompts 1 and 4): one letter in the slot under the plate, the
 slot the desk places at x 16…W−16, y cardTop, `height` tall (KTodayGeometry). It replaces the
 old scrolling stack: there is no previous letter and no page under the reader's thumb, only the
 card on screen and the one that comes after it. While the reader writes back (the chat
 composers' A1, owner 2026-10-18) the desk gives it a shorter `height` (replyCardHeight: room
 for the keyboard and the reply box) and `compact`, and the card on screen sets its letter at the
 compact size (KCardText), folding what still doesn't fit; both go back when the keyboard does.

 WHAT IT DRAWS, by TS's phase:
 - .loading: KTodayStatusCard(.loading), an empty .me card face VoiceOver hears as loadingA11y;
 - .offline: KTodayStatusCard(.offline): offlineTitle over offlineBody, centred;
 - .reading: one KLetterCard, the card for deck.shownId;
 - .done: nothing, once the last card's out-animation has finished (the desk draws Wren's letter
   in the same slot).

 THE DRAG. One DragGesture (minimumDistance 10, so the card's own buttons and ⋯ still take taps),
 always attached: it is never swapped under a finger. Up follows the finger; down only gives
 (×.25, there is no previous letter); opacity is 1 − .35p with p = clamp(−dy/110, 0, 1), published
 to KDeckMotion with `dragging` for Wren (nothing else observes it, so a drag frame
 redraws the deck and Wren only), and a pull down as `pull` = clamp(dy/110, 0, 1) (Wren
 leans back from it). A release at p ≥ 1 passes the card; anything short (or a cancelled gesture)
 springs back with springBack. Whether a gesture counts is decided on its FIRST move and kept to
 its end (box.armed): it is dead when the desk says the deck isn't enabled (typing, the + panel, a
 send, the reader, a transition, the done flow) and in the .4 s after the keyboard lets go, while
 the card grows back and the band fades in (keyboardQuiet); a drag the deck turns off under (the keyboard rising, the +
 opening, the card leaving) springs back there and its release does nothing.

 NOTHING BUT A FINGER PASSES A CARD (round 3: on the dev page two letters passed by themselves while
 the desk's layout changed under the card). A pass comes from exactly two places: a release at p ≥ 1 of a drag that began
 on the card while the deck took the finger, or deck.nextRequest moving (NEXT, VoiceOver's "Next
 letter") after this deck appeared. The drag is measured in the global space, so it is the
 finger's travel alone: a card slot that moves or changes height under a finger (a geometry
 change, the + panel's step back) adds nothing to it. A drag in progress when the slot's height
 changes is over (it springs back; its release does nothing), and a release passes only the card
 the drag began on (box.dragCard). A re-mounted deck starts with nextServed at the request count it
 finds, so an old NEXT is never served again, and onChange never fires for a value it starts with.
 The card follows the finger under Reduce Motion too.

 THE PASS (a release, NEXT, or VoiceOver's "Next letter": the last two arrive as
 deck.nextRequest). The out card is the shown one, the next is the card after it in
 content.cards. NEXT's number drops at once (deck.pendingLeft = left − 1) and TS hears onPass, then
 the beat (.passed(last:)). The out card goes from where the finger left it to −120, .97, 0
 (cardOut; opacity over .24); at 300 ms the next card is shown and comes in from +70, .98, 0
 (cardIn); the deck takes input again at 640 ms, and VoiceOver's focus moves to the new card at
 400 ms. Reduce Motion: a 200 ms crossfade instead.

 Swift advances before TS confirms, so the deck RECONCILES by id whenever content.cards changes
 (TS wins), and again at the end of each transition:
 - the passed id is gone from the cards: the pass is confirmed, pendingLeft goes;
 - a pass TS hasn't taken yet: wait (after 1.5 s the deck snaps to cards.first);
 - cards.first is the card shown: nothing to do;
 - the shown card is still there but no longer first (bring back put the last letter in front of
   it): the reverse plays, the shown card going out down (+70, .98, 0) and the restored one coming
   in from above (−120, .97, 0), and the beat says .broughtBack;
 - the shown card left (answered, blocked, withdrawn): it goes out up as for a pass, cards.first
   comes in, and the beat says .left(last:); nothing calls onPass;
 - anything else (the first deal after loading, the day turning): cards.first comes in.

 HOW THE MOTION IS BUILT. The card's pose (offset, scale, opacity) is the deck's state, applied
 inside the card's identity (.id(letter id)), so the finger and the out-animation move the view
 that is on screen. The card coming in is a new identity, and its starting pose is its insertion
 transition: no "set, then animate on the next frame" trick. A card being removed keeps the pose it
 was last drawn with (already invisible after an out-animation) and fades as it goes. While a card
 animates out, the deck draws a snapshot of its model (`held`), so a props update (TS confirming
 the pass, a translation landing) never changes it mid-flight.
 */

/// What the deck keeps without drawing: the latest cards, requests already served, the pass in
/// flight and a generation token that makes any delayed step of a superseded transition a no-op.
final class KCardDeckBox {
  /// content.cards as of the last body (delayed steps read this, never a captured copy)
  var cards: [KLetterCardModel] = []
  /// the model last drawn: drawn on for a moment when the shown card has already left the cards
  var lastShown: KLetterCardModel?
  /// the pass this deck sent that TS hasn't confirmed (its id is still in the cards)
  var pending: String?
  var pendingSerial = 0
  /// the id this deck last passed (cleared by a bring back or a snap)
  var lastPassed: String?
  /// the last deck.nextRequest served
  var nextServed = 0
  /// bumps on every transition, appear and disappear
  var generation = 0
  /// a drag is in progress (onChanged ran) and no release has been handled yet
  var dragging = false
  /// that drag began while the deck took the finger (takesFinger): it moves the card and its
  /// release can pass. Decided on the first move and kept for the whole gesture, so a drag that
  /// began over the keyboard, mid-transition or in the quiet after the keyboard stays dead
  var armed = false
  /// no drag counts before this: the band is still sliding back after the keyboard
  var quietUntil = Date.distantPast
  /// the card an armed drag began on: its release passes that card or nothing
  var dragCard: String?
  /// the card the arrival's unfold belongs to (the first letter she brought back)
  var freshId: String?
}

struct KCardDeck: View {
  let theme: KTheme
  let content: KTodayContent
  let height: CGFloat
  /// the reader is writing back and the slot has shrunk: the letter at the compact size
  let compact: Bool
  let enabled: Bool
  @ObservedObject var deck: KDeckState
  /// written, never observed: per-frame values are for Wren
  let motion: KDeckMotion
  let voice: KTodayVoice
  let actions: KTodayActions
  let onReply: (String) -> Void

  /// where a card that comes in starts from
  private enum Entry {
    /// +70, .98, 0: the next letter (a pass, a card leaving, a deal)
    case below
    /// −120, .97, 0: the last letter, brought back
    case above
    /// opacity only (Reduce Motion)
    case fade
  }

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.accessibilityVoiceOverEnabled) private var voiceOver
  /// the card drawn (mirrored to deck.shownId)
  @State private var showing: String?
  /// the out card's snapshot while it animates
  @State private var held: KLetterCardModel?
  @State private var y: CGFloat = 0
  @State private var scale: CGFloat = 1
  @State private var alpha: Double = 1
  @State private var entry: Entry = .below
  @State private var box = KCardDeckBox()
  @State private var cardActions = KLetterCardActions()
  @GestureState private var touching = false
  @AccessibilityFocusState private var voFocus: String?

  /// the out card's opacity: cardOut's curve over .24 s (the design's `opacity .24s`)
  static let fadeOut = Animation.timingCurve(0.4, 0, 0.7, 1, duration: 0.24)
  /// how far up a release must reach for p = 1
  static let passDistance: CGFloat = 110
  /// no drag counts for this long after the keyboard lets go (the card grows back and the band
  /// fades in over .35)
  static let keyboardQuiet = 0.4
  /// a pass TS hasn't confirmed by then is dropped (TS wins)
  static let confirmWait = 1.5

  init(
    theme: KTheme,
    content: KTodayContent,
    height: CGFloat,
    compact: Bool = false,
    enabled: Bool,
    deck: KDeckState,
    motion: KDeckMotion,
    voice: KTodayVoice,
    actions: KTodayActions,
    onReply: @escaping (String) -> Void
  ) {
    self.theme = theme
    self.content = content
    self.height = height
    self.compact = compact
    self.enabled = enabled
    self.deck = deck
    self.motion = motion
    self.voice = voice
    self.actions = actions
    self.onReply = onReply
    _showing = State(initialValue: content.cards.first?.id)
  }

  /// The model on screen: the snapshot in flight, else the shown card in `cards`, else (for the
  /// moment between TS removing it and the deck animating it out) the model last drawn for it.
  /// The body passes content.cards; a delayed step passes box.cards (its captured `content` is old).
  private func shownModel(in cards: [KLetterCardModel]) -> KLetterCardModel? {
    if let held { return held }
    guard let id = showing else { return nil }
    if let card = cards.first(where: { $0.id == id }) { return card }
    if let last = box.lastShown, last.id == id { return last }
    return nil
  }

  private var insertion: AnyTransition {
    switch entry {
    case .below: return .offset(y: 70).combined(with: .scale(scale: 0.98)).combined(with: .opacity)
    case .above: return .offset(y: -120).combined(with: .scale(scale: 0.97)).combined(with: .opacity)
    case .fade: return .opacity
    }
  }

  var body: some View {
    let model = shownModel(in: content.cards)
    // not state changes: the box and the card actions are plain classes, refreshed from this body
    let _ = remember(model)
    let _ = bindCardActions()
    ZStack {
      if model == nil, content.phase == .loading {
        KTodayStatusCard(.loading, theme: theme, labels: content.labels)
          .transition(.opacity)
      } else if model == nil, content.phase == .offline {
        KTodayStatusCard(.offline, theme: theme, labels: content.labels)
          .transition(.opacity)
      } else if let model {
        KLetterCard(theme: theme, card: model, labels: content.labels, compact: compact, voice: voice, actions: cardActions)
          .equatable()
          .modifier(KFreshUnfold(active: content.freshUnfold && model.id == box.freshId))
          .frame(height: height)
          .accessibilityFocused($voFocus, equals: model.id)
          .allowsHitTesting(held == nil)
          .scaleEffect(scale)
          .offset(y: y)
          .opacity(alpha)
          .id(model.id)
          .transition(.asymmetric(insertion: insertion, removal: .opacity))
      }
    }
    .frame(maxWidth: .infinity)
    .frame(height: height)
    .contentShape(Rectangle())
    // always attached: the gate is inside the gesture (box.armed), so turning the deck off never
    // swaps the gesture under a finger and leaves its release unanswered
    .gesture(drag)
    // an empty slot (done, a status card) takes no touches: Wren's letter shares the slot
    .allowsHitTesting(model != nil)
    .onChange(of: content.cards.map(\.id)) { _, _ in
      reconcile()
    }
    .onChange(of: deck.nextRequest) { _, request in
      guard request != box.nextServed else { return }
      box.nextServed = request
      if enabled { pass(.next) }
    }
    .onChange(of: enabled) { _, on in
      // the deck turned off under a finger (the keyboard rising, the + opening, the card
      // leaving): that drag is over, and its release does nothing
      if !on, box.armed {
        box.armed = false
        springBack()
      }
    }
    .onChange(of: deck.typing) { _, typing in
      // the keyboard let go: no drag counts while the card grows back and the band fades in
      if !typing { box.quietUntil = Date().addingTimeInterval(Self.keyboardQuiet) }
    }
    .onChange(of: height) { _, _ in
      // the slot changed under a finger (the geometry): that drag is over, and its release does nothing
      if box.armed {
        box.armed = false
        springBack()
      }
    }
    .onChange(of: touching) { _, now in
      // the gesture ended without onEnded (cancelled: a system gesture took it)
      if !now, box.dragging {
        box.dragging = false
        if box.armed {
          box.armed = false
          springBack()
        }
      }
    }
    .onAppear { appear() }
    .onDisappear { disappear() }
  }

  // ── the finger ──

  private var drag: some Gesture {
    // global: the translation is the finger's travel alone, never the slot moving under it
    DragGesture(minimumDistance: 10, coordinateSpace: .global)
      .updating($touching) { _, state, _ in state = true }
      .onChanged { value in
        if !box.dragging {
          // the first move decides for the whole gesture
          box.dragging = true
          box.armed = takesFinger && showing != nil
          box.dragCard = box.armed ? showing : nil
        }
        guard box.armed else { return }
        let dy = value.translation.height
        let p = Self.progress(dy)
        let q = Self.pullDown(dy)
        y = dy < 0 ? dy : dy * 0.25
        alpha = 1 - 0.35 * Double(p)
        if !motion.dragging { motion.dragging = true }
        if motion.progress != p { motion.progress = p }
        if motion.pull != q { motion.pull = q }
      }
      .onEnded { value in
        guard box.dragging else { return }
        box.dragging = false
        guard box.armed else { return }
        box.armed = false
        let dy = value.translation.height
        // only the card the finger took: a card that changed under it isn't passed
        if Self.progress(dy) >= 1, let card = box.dragCard, card == showing {
          box.dragCard = nil
          pass(.drag(dy: dy))
        } else {
          box.dragCard = nil
          springBack()
        }
      }
  }

  /// The deck takes the finger now: the desk says so (`enabled`: reading, no keyboard, no + panel,
  /// no send or reader, no transition, not done; typing and animating are read live as well, in
  /// case the body hasn't caught up), and the band has finished sliding back after the keyboard.
  private var takesFinger: Bool {
    enabled && !deck.typing && !deck.animating && Date() >= box.quietUntil
  }

  static func progress(_ dy: CGFloat) -> CGFloat {
    min(max(-dy / passDistance, 0), 1)
  }

  /// the damped pull down, 0…1 over the same 110 of finger travel (Wren leans back from it)
  static func pullDown(_ dy: CGFloat) -> CGFloat {
    min(max(dy / passDistance, 0), 1)
  }

  /// The drag is over without a pass: Wren straightens up, and the card goes back to
  /// rest unless a transition owns its pose by now (the card left under the finger).
  private func springBack() {
    withAnimation(KTodayMotion.springBack) {
      if !deck.animating {
        y = 0
        alpha = 1
      }
      motion.dragging = false
      motion.progress = 0
      motion.pull = 0
    }
  }

  // ── the pass ──

  /// What asked for the pass; the dev breadcrumb names it.
  private enum Trigger: CustomStringConvertible {
    /// a release at p ≥ 1, with the finger's dy
    case drag(dy: CGFloat)
    /// NEXT, or VoiceOver's "Next letter" (deck.nextRequest)
    case next

    var description: String {
      switch self {
      case .drag(let dy): return "drag dy=\(Int(dy.rounded()))"
      case .next: return "next"
      }
    }
  }

  private func pass(_ trigger: Trigger) {
    // no re-entry: a transition in flight owns the pose
    guard !deck.animating else { return }
    let cards = content.cards
    guard
      box.pending == nil, content.phase == .reading,
      let id = showing, let i = cards.firstIndex(where: { $0.id == id })
    else {
      springBack()
      return
    }
    let out = cards[i]
    let next = i + 1 < cards.count ? cards[i + 1] : nil
    #if DEBUG
    // a breadcrumb for the simulator: a pass nobody meant names what asked for it
    NSLog("[KCardDeck] pass %@ via %@ left=%ld", out.id, trigger.description, content.left)
    #endif
    let gen = begin()
    deck.pendingLeft = max(0, content.left - 1)
    box.pending = out.id
    box.lastPassed = out.id
    box.pendingSerial &+= 1
    let serial = box.pendingSerial
    actions.onPass(out.id)
    deck.emit(.passed(last: next == nil))
    // Wren straightens up
    withAnimation(KTodayMotion.springBack) {
      motion.dragging = false
      motion.progress = 0
      motion.pull = 0
    }
    if reduceMotion {
      withAnimation(KTodayMotion.reduced) {
        entry = .fade
        show(next?.id)
      }
      after(0.20, gen) { finish() }
    } else {
      goOut(out, toY: -120, scale: 0.97)
      after(0.30, gen) {
        // the next card, unless TS has taken it away meanwhile
        let latest = box.cards
        let target = latest.contains(where: { $0.id == next?.id }) ? next?.id : latest.first(where: { $0.id != out.id })?.id
        withAnimation(KTodayMotion.cardIn) {
          entry = .below
          show(target)
        }
      }
      after(0.64, gen) { finish() }
    }
    focusShown(after: 0.40, gen)
    DispatchQueue.main.asyncAfter(deadline: .now() + Self.confirmWait) { [box] in
      guard box.pendingSerial == serial, box.pending == out.id else { return }
      snap()
    }
  }

  // ── reconciling with TS (by id; TS wins) ──

  private func reconcile() {
    let ids = box.cards.map(\.id)
    if let pending = box.pending, !ids.contains(pending) {
      box.pending = nil
      if deck.pendingLeft != nil { deck.pendingLeft = nil }
    }
    // a transition reconciles again when it ends; a pass TS hasn't taken waits for it (or the snap)
    guard !deck.animating, box.pending == nil else { return }
    let shown = showing
    if ids.first == shown { return }
    if let shown, let i = ids.firstIndex(of: shown), i >= 1 {
      bringBack()
    } else if shown != nil {
      // still shown but no longer in the cards
      shownLeft()
    } else {
      comeIn(ids.first)
    }
  }

  /// The last letter came back in front of the shown one: the reverse of a pass.
  private func bringBack() {
    guard let model = shownModel(in: box.cards) else { return comeIn(box.cards.first?.id) }
    let gen = begin()
    box.lastPassed = nil
    if reduceMotion {
      withAnimation(KTodayMotion.reduced) {
        entry = .fade
        show(box.cards.first?.id)
      }
      after(0.20, gen) { finish() }
    } else {
      goOut(model, toY: 70, scale: 0.98)
      after(0.30, gen) {
        withAnimation(KTodayMotion.cardIn) {
          entry = .above
          show(box.cards.first?.id)
        }
      }
      after(0.64, gen) { finish() }
    }
    deck.emit(.broughtBack)
    focusShown(after: 0.40, gen)
  }

  /// The shown card left the desk without a pass (answered, blocked, withdrawn): out up, as for a
  /// pass, then the first card comes in.
  private func shownLeft() {
    let gen = begin()
    deck.emit(.left(last: box.cards.isEmpty))
    let model = shownModel(in: box.cards)
    if reduceMotion || model == nil {
      withAnimation(reduceMotion ? KTodayMotion.reduced : KTodayMotion.cardIn) {
        entry = reduceMotion ? .fade : .below
        show(box.cards.first?.id)
      }
      after(reduceMotion ? 0.20 : 0.34, gen) { finish() }
    } else if let model {
      goOut(model, toY: -120, scale: 0.97)
      after(0.30, gen) {
        withAnimation(KTodayMotion.cardIn) {
          entry = .below
          show(box.cards.first?.id)
        }
      }
      after(0.64, gen) { finish() }
    }
    focusShown(after: 0.40, gen)
  }

  /// Anything else: the first card comes in (the first deal after loading, the day turning).
  private func comeIn(_ id: String?) {
    let gen = begin()
    withAnimation(reduceMotion ? KTodayMotion.reduced : KTodayMotion.cardIn) {
      entry = reduceMotion ? .fade : .below
      show(id)
    }
    after(reduceMotion ? 0.20 : 0.34, gen) { finish() }
  }

  /// TS didn't take the pass in time: snap to its first card, no animation.
  private func snap() {
    box.generation &+= 1
    box.pending = nil
    box.lastPassed = nil
    var instant = Transaction()
    instant.disablesAnimations = true
    withTransaction(instant) {
      entry = .below
      show(box.cards.first?.id)
    }
    if deck.pendingLeft != nil { deck.pendingLeft = nil }
    if deck.animating { deck.animating = false }
  }

  // ── the steps ──

  /// A new transition: input stops and any older transition's delayed steps lapse.
  private func begin() -> Int {
    box.generation &+= 1
    if !deck.animating { deck.animating = true }
    return box.generation
  }

  /// The shown card leaves from its current pose (the finger's, or rest).
  private func goOut(_ model: KLetterCardModel, toY: CGFloat, scale target: CGFloat) {
    held = model
    withAnimation(KTodayMotion.cardOut) {
      y = toY
      scale = target
    }
    withAnimation(Self.fadeOut) { alpha = 0 }
  }

  /// Shows `id` at rest; the caller's transaction animates its insertion. deck.shownId follows
  /// in a plain transaction, so the band, the dock and the desk don't inherit the card's motion.
  private func show(_ id: String?) {
    held = nil
    y = 0
    scale = 1
    alpha = 1
    showing = id
    if deck.shownId != id {
      withTransaction(Transaction()) { deck.shownId = id }
    }
  }

  /// The transition is over: input again, then whatever TS changed meanwhile.
  private func finish() {
    if deck.animating { deck.animating = false }
    reconcile()
  }

  private func after(_ seconds: Double, _ gen: Int, _ work: @escaping () -> Void) {
    DispatchQueue.main.asyncAfter(deadline: .now() + seconds) { [box] in
      guard box.generation == gen else { return }
      work()
    }
  }

  /// VoiceOver's focus follows the deck to the card now shown.
  private func focusShown(after seconds: Double, _ gen: Int) {
    guard voiceOver else { return }
    after(seconds, gen) {
      if let id = deck.shownId { voFocus = id }
    }
  }

  // ── appearing ──

  private func appear() {
    box.generation &+= 1
    box.nextServed = deck.nextRequest
    box.pending = nil
    box.dragging = false
    box.armed = false
    box.dragCard = nil
    var instant = Transaction()
    instant.disablesAnimations = true
    withTransaction(instant) {
      entry = .below
      show(content.cards.first?.id)
    }
    if deck.pendingLeft != nil { deck.pendingLeft = nil }
    if deck.animating { deck.animating = false }
  }

  private func disappear() {
    box.generation &+= 1
    box.pending = nil
    box.dragging = false
    box.armed = false
    box.dragCard = nil
    if deck.pendingLeft != nil { deck.pendingLeft = nil }
    if deck.animating { deck.animating = false }
    if motion.dragging { motion.dragging = false }
    if motion.progress != 0 { motion.progress = 0 }
    if motion.pull != 0 { motion.pull = 0 }
  }

  // ── plain bookkeeping, from the body ──

  private func remember(_ model: KLetterCardModel?) {
    box.cards = content.cards
    if let model { box.lastShown = model }
    // the arrival's unfold belongs to the first letter she brought back: the first card, shown
    // before any letter has gone today; once taken, it never moves to another card
    if box.freshId == nil, content.freshUnfold, !content.titleLocked, box.lastPassed == nil,
       let model, model.id == content.cards.first?.id {
      box.freshId = model.id
    }
  }

  private func bindCardActions() {
    cardActions.onReply = { [onReply] id in onReply(id) }
    cardActions.onAction = { [actions, deck] id, key in
      if key == "bringBack" {
        actions.onBringBack()
      } else {
        // Wren leans toward the letter as it unfolds; the reader is asked for at once
        if key == "unfold" { deck.emit(.unfolded) }
        actions.onCardAction(id, key)
      }
    }
    cardActions.onNext = { [deck] _ in deck.requestNext() }
  }
}

/// The slot when there is no letter to show yet: the first load (an empty card face) or an
/// offline cold start with nothing kept, which says so instead of looking like a quiet day.
/// On the letter sheet (no black frame, 2026-11-09), so the letter that replaces it lands in the
/// same frame.
struct KTodayStatusCard: View {
  enum Kind: Equatable {
    case loading
    case offline
  }

  let kind: Kind
  let theme: KTheme
  let labels: KTodayLabels

  init(_ kind: Kind, theme: KTheme, labels: KTodayLabels) {
    self.kind = kind
    self.theme = theme
    self.labels = labels
  }

  var body: some View {
    switch kind {
    case .loading:
      InkCard(theme: theme, variant: .me, letter: true) {
        Color.clear
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      }
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(labels.loadingA11y)
    case .offline:
      InkCard(theme: theme, variant: .me, letter: true) {
        VStack(spacing: 10) {
          Text(labels.offlineTitle)
            .kText(.system(20, .semibold))
            .foregroundStyle(theme.ink)
          Text(labels.offlineBody)
            .kText(.system(18, lineHeight: 1.4))
            .foregroundStyle(theme.sub)
        }
        .multilineTextAlignment(.center)
        .minimumScaleFactor(0.8)
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .dynamicTypeSize(...DynamicTypeSize.accessibility2)
      }
      .accessibilityElement(children: .combine)
    }
  }
}

/// The first of what she brought back opens the way the reader's letter folded, in reverse: scaleY
/// .55 → 1 and opacity .5 → 1 over 520ms after 140ms; a plain fade under Reduce Motion.
struct KFreshUnfold: ViewModifier {
  let active: Bool
  @State private var open = false
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  func body(content: Content) -> some View {
    if active {
      content
        .scaleEffect(x: 1, y: open || reduceMotion ? 1 : 0.55, anchor: .top)
        .opacity(open ? 1 : 0.5)
        .onAppear {
          withAnimation(.timingCurve(0.3, 1, 0.3, 1, duration: 0.52).delay(0.14)) { open = true }
        }
    } else {
      content
    }
  }
}
