// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE CARD STACK (H:28-46): one ScrollView, one card per swipe.

   [desk strip]                 leading items: they scroll with the cards and never take height
   [the arrival]                from them (an SE's card stays 427, its REPLY ↓ clear of the pill)
   12                           the snap line, 12 under the band (H's scroll-padding 64)
   card 0 (cardHeight)
   132                          H's 12 + 120 between cards: the next card peeks under the fade
   card 1 …
   the blind (endHeight)        the last page once the desk has loaded (a React Native island)
   tail                         enough for the last page to reach the snap line

 PAGES. The top of the desk (offset 0) is a page: it shows the strip and the arrival with the first
 card under them. Each card is a page where it sits on the snap line (leading + i × stride), and
 so is the blind. With nothing leading, the top and the first card are the same page.

 SNAPPING. KTodaySnap moves at most one page from the page the drag began on, whatever the fling:
 past 15% of the way (56pt at least) it goes, short of that it springs back. The natural target
 already carries the fling, so a quick flick goes too. Nothing is a "viewAligned" guess: the
 offsets are the stack's own.

 SETTLING. When the scroll comes to rest, the nearest page is the reader's: its card index goes to
 TS (cards.count = the blind), which counts it as seen, starts its read receipt and binds the
 reply to it. The page is remembered by what it holds (the top, a card, the blind), so a strip that
 appears, an arrival that folds or a card that leaves keeps the reader on what they were reading
 (re-seated without animation when the offsets move under it).

 Requests: TS's scrollTo (the top, a card by id: an envelope's tap, the day turning, re-pressing
 the tab) and the anchor that comes with the cards after a letter is answered or blocked. While the
 blind's cord is held, or the reply field has the keyboard, the stack doesn't scroll (TS's lock
 command; the dock's focus): the words are bound to the settled card, and a drag under them must
 not move them to another letter. It ignores the keyboard.

 A CARD'S MOVES NAME THE CARD. Write back, next and previous come with the card's id, and the
 stack starts from THAT card's page, not from `settled`: VoiceOver scrolls the card it reads into
 view itself, which may never pass through an idle scroll phase, so `settled` can still be a page
 behind. Write back settles on the card (go(), which tells TS and the dock) before the field opens,
 so the reply is bound to the letter it was asked for. Next and previous move VoiceOver's focus to
 the page they land on once it is on screen.
 */

/// A page of the stack: what it holds and where it sits.
struct KTodayPage: Equatable {
  enum Key: Hashable {
    case top
    case card(Int)
    case end
  }

  let key: Key
  let offset: CGFloat
  /// the card index TS hears (cards.count for the blind)
  let card: Int

  /// The pages for a stack: the top, each card on the snap line, the blind.
  static func make(leading: CGFloat, count: Int, endPage: Bool, stride: CGFloat) -> [KTodayPage] {
    var out = [KTodayPage(key: .top, offset: 0, card: count > 0 ? 0 : count)]
    for i in 0..<count {
      let o = leading + CGFloat(i) * stride
      if o > 0.5 { out.append(KTodayPage(key: .card(i), offset: o, card: i)) }
    }
    if endPage {
      let o = leading + CGFloat(count) * stride
      if o > 0.5 { out.append(KTodayPage(key: .end, offset: o, card: count)) }
    }
    return out
  }

  /// The page holding `key`, else the page showing the same card, else the nearest end.
  static func index(of key: Key, card: Int, in pages: [KTodayPage]) -> Int {
    if let i = pages.firstIndex(where: { $0.key == key }) { return i }
    if let i = pages.lastIndex(where: { $0.card == card }) { return i }
    return max(0, pages.count - 1)
  }

  static func nearest(_ offset: CGFloat, in pages: [KTodayPage]) -> Int {
    var best = 0
    var gap = CGFloat.infinity
    for (i, p) in pages.enumerated() where abs(p.offset - offset) < gap {
      gap = abs(p.offset - offset)
      best = i
    }
    return best
  }
}

/// One page per swipe, from the page the drag began on (see SNAPPING above).
struct KTodaySnap: ScrollTargetBehavior {
  let offsets: [CGFloat]
  let current: Int

  func updateTarget(_ target: inout ScrollTarget, context: TargetContext) {
    guard !offsets.isEmpty else { return }
    let from = min(max(current, 0), offsets.count - 1)
    let here = offsets[from]
    let delta = target.rect.minY - here
    var to = from
    if delta > 0, from + 1 < offsets.count {
      let span = offsets[from + 1] - here
      if delta >= max(56, span * 0.15) { to = from + 1 }
    } else if delta < 0, from > 0 {
      let span = here - offsets[from - 1]
      if -delta >= max(56, span * 0.15) { to = from - 1 }
    }
    target.rect.origin.y = offsets[to]
  }
}

/// What the stack keeps without drawing: the raw offset and the requests already served.
final class KCardStackBox {
  var offset: CGFloat = 0
  var scrollSerial = 0
  var anchorSerial = 0
}

struct KCardStack: View {
  let theme: KTheme
  let content: KTodayContent
  let geometry: KTodayGeometry
  @ObservedObject var driver: KTodayDriver
  let dock: KTodayDock
  let voice: KTodayVoice
  let actions: KTodayActions
  let chrome: KScrollModel
  let deskBird: AnyView?
  let arrivalBird: AnyView?
  let endPage: AnyView?

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var position = ScrollPosition(edge: .top)
  @State private var leading: CGFloat = 0
  /// the page the reader is on, by what it holds
  @State private var settled: KTodayPage.Key = .top
  @State private var box = KCardStackBox()
  @State private var cardActions = KLetterCardActions()
  /// VoiceOver's focus, by card id (or `endFocus`): next and previous move it with the page
  @AccessibilityFocusState private var voFocus: String?

  /// the page motion: H's .45s ease, instant under Reduce Motion
  static let motion = Animation.timingCurve(0.3, 0.9, 0.3, 1, duration: 0.45)
  /// VoiceOver's focus key for the blind's page (no letter id can be it)
  static let endFocus = "\u{0}end"

  private var cards: [KLetterCardModel] { content.cards }
  private var showsEnd: Bool { content.endPage && endPage != nil }

  private var pages: [KTodayPage] {
    KTodayPage.make(leading: leading, count: cards.count, endPage: showsEnd, stride: geometry.stride)
  }

  private var settledCardIndex: Int {
    switch settled {
    case .top: return cards.isEmpty ? cards.count : 0
    case let .card(i): return min(i, cards.count)
    case .end: return cards.count
    }
  }

  private var currentIndex: Int {
    KTodayPage.index(of: settled, card: settledCardIndex, in: pages)
  }

  /// what follows the last page so it can reach the snap line
  private var tail: CGFloat {
    let view = geometry.viewHeight - KTodayGeometry.contentTop
    if showsEnd { return max(0, view - geometry.endHeight) }
    if !cards.isEmpty { return max(0, view - geometry.cardHeight - KTodayGeometry.cardGap) }
    return 0
  }

  var body: some View {
    let pages = self.pages
    // not a state change: the cards' actions object is a plain class, refreshed with this body's
    // values each time (the cards are Equatable without it, so they don't redraw for it)
    let _ = bindCardActions()
    ScrollView(.vertical) {
      VStack(spacing: 0) {
        leadingItems
          .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { height in
            if abs(height - leading) > 0.5 { leading = height }
          }
        Color.clear
          .frame(height: KTodayGeometry.contentTop)
          .accessibilityHidden(true)
        ForEach(Array(cards.enumerated()), id: \.element.id) { i, card in
          KLetterCard(theme: theme, card: card, labels: content.labels, voice: voice, actions: cardActions)
            .equatable()
            .accessibilityFocused($voFocus, equals: card.id)
            .frame(height: geometry.cardHeight)
            .modifier(KFreshUnfold(active: content.freshUnfold && i == 0))
            .padding(.bottom, KTodayGeometry.cardGap)
            .transition(.opacity.combined(with: .scale(scale: 0.96, anchor: .top)))
        }
        .padding(.horizontal, KTodayGeometry.gutter)
        if showsEnd, let endPage {
          endPage
            .frame(height: geometry.endHeight)
            .frame(maxWidth: .infinity)
            .accessibilityFocused($voFocus, equals: Self.endFocus)
            .padding(.horizontal, KTodayGeometry.gutter)
        }
        Color.clear
          .frame(height: tail)
          .accessibilityHidden(true)
      }
      .animation(reduceMotion ? nil : .easeInOut(duration: 0.35), value: cards.map(\.id))
    }
    .scrollIndicators(.hidden)
    .scrollTargetBehavior(KTodaySnap(offsets: pages.map(\.offset), current: currentIndex))
    .scrollPosition($position)
    // the cord is held, or the field has the keyboard (the words stay on their letter)
    .scrollDisabled(driver.scrollLocked || driver.typing)
    .kScrollChrome(chrome)
    .onScrollGeometryChange(for: CGFloat.self) { geo in
      geo.contentOffset.y + geo.contentInsets.top
    } action: { _, offset in
      box.offset = offset
    }
    .onScrollPhaseChange { _, phase in
      if phase == .idle { settle() }
    }
    .onReceive(driver.$scrollRequest) { request in
      guard let request, request.serial > box.scrollSerial else { return }
      box.scrollSerial = request.serial
      serve(request)
    }
    .onChange(of: leading) { _, _ in
      // the strip came or the arrival folded: keep the reader on what they were reading
      reseat()
    }
    .onChange(of: content.anchor) { _, anchor in
      guard anchor.serial > box.anchorSerial else { return }
      box.anchorSerial = anchor.serial
      follow(anchor)
    }
    .onChange(of: pages.count) { _, _ in
      // a card left or the blind arrived: the page under the reader may have changed
      DispatchQueue.main.async { settle(report: true) }
    }
    .onAppear {
      box.anchorSerial = content.anchor.serial
    }
  }

  private func bindCardActions() {
    cardActions.onReply = { id in reply(to: id) }
    cardActions.onAction = { [actions] id, action in actions.onCardAction(id, action) }
    cardActions.onNext = { id in step(from: id, by: 1) }
    cardActions.onPrevious = { id in step(from: id, by: -1) }
  }

  // ── the leading items: the desk strip and the arrival ──
  private var leadingItems: some View {
    VStack(spacing: 0) {
      if !content.deskStrip.isEmpty {
        KDeskStrip(theme: theme, text: content.deskStrip, bird: deskBird) { actions.onDeskStrip() }
      }
      if content.arrival.open {
        KArrival(theme: theme, arrival: content.arrival, bird: arrivalBird) { i in actions.onEnvelope(i) }
          .transition(.kArrivalFold)
      }
    }
    .frame(maxWidth: .infinity)
    // folds where the reader can see it; off screen (paged past it) it goes at once, and the page re-seats
    .animation(reduceMotion || settled != .top ? nil : .easeOut(duration: 0.38), value: content.arrival.open)
  }

  // ── settling and requests ──

  private func settle(report: Bool = true) {
    let pages = self.pages
    guard !pages.isEmpty else { return }
    let page = pages[KTodayPage.nearest(box.offset, in: pages)]
    settled = page.key
    if driver.settledCard != page.card { driver.settledCard = page.card }
    if report { actions.onCardIndex(page.card) }
  }

  private func go(to index: Int, animated: Bool) {
    let pages = self.pages
    guard pages.indices.contains(index) else { return }
    let page = pages[index]
    // the behaviour clamps to one page from `settled`: set it first, so a jump of several isn't cut short
    settled = page.key
    if driver.settledCard != page.card { driver.settledCard = page.card }
    actions.onCardIndex(page.card)
    if abs(box.offset - page.offset) < 0.5 { return }
    if animated && !reduceMotion {
      withAnimation(Self.motion) { position.scrollTo(y: page.offset) }
    } else {
      // where it lands, at once: a settle asked for before the scroll reports must not read the old offset
      box.offset = page.offset
      var instant = Transaction()
      instant.disablesAnimations = true
      withTransaction(instant) { position.scrollTo(y: page.offset) }
    }
  }

  private func serve(_ request: KTodayDriver.ScrollRequest) {
    switch request.target {
    case .top:
      go(to: 0, animated: request.animated)
    case let .card(id):
      guard let i = cards.firstIndex(where: { $0.id == id }) else { return }
      go(to: KTodayPage.index(of: .card(i), card: i, in: pages), animated: request.animated)
    }
  }

  private func follow(_ anchor: KTodayAnchor) {
    let pages = self.pages
    if let i = cards.firstIndex(where: { $0.id == anchor.id }) {
      // the page that card is on now; if it is where the reader already is, the removal animates in place
      let target = settled == .top && i == 0 ? 0 : KTodayPage.index(of: .card(i), card: i, in: pages)
      go(to: target, animated: false)
    } else {
      go(to: KTodayPage.index(of: .end, card: cards.count, in: pages), animated: false)
    }
  }

  private func reseat() {
    guard settled != .top else { return }
    let pages = self.pages
    let index = KTodayPage.index(of: settled, card: settledCardIndex, in: pages)
    guard pages.indices.contains(index), abs(box.offset - pages[index].offset) > 0.5 else { return }
    box.offset = pages[index].offset
    var instant = Transaction()
    instant.disablesAnimations = true
    withTransaction(instant) { position.scrollTo(y: pages[index].offset) }
  }

  /// Write back on a card: settle on THAT card first (go() tells TS and binds the dock to it), then
  /// open the field, so the words can only go to the letter they were asked for.
  private func reply(to id: String) {
    if let i = cards.firstIndex(where: { $0.id == id }), driver.settledCard != i {
      go(to: KTodayPage.index(of: .card(i), card: i, in: pages), animated: false)
    }
    dock.reply.focus()
  }

  /// Next / previous letter from the card the action came from (not from `settled`, which a
  /// VoiceOver scroll may have left behind), with VoiceOver's focus following the page.
  private func step(from id: String, by: Int) {
    let pages = self.pages
    let from: Int
    if let i = cards.firstIndex(where: { $0.id == id }) {
      from = KTodayPage.index(of: .card(i), card: i, in: pages)
    } else {
      from = currentIndex
    }
    let to = from + by
    guard pages.indices.contains(to) else { return }
    go(to: to, animated: true)
    let target: String?
    switch pages[to].key {
    case .top: target = cards.first?.id
    case let .card(i): target = cards.indices.contains(i) ? cards[i].id : nil
    case .end: target = Self.endFocus
    }
    guard let target else { return }
    // once the page is on screen (the move is .45s; at once under Reduce Motion), or VoiceOver's
    // own scroll to the element would fight the stack's
    DispatchQueue.main.asyncAfter(deadline: .now() + (reduceMotion ? 0.05 : 0.5)) { voFocus = target }
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
