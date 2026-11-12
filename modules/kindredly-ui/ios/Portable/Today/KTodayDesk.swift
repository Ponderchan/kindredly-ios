// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE TODAY TAB (Today 3d × 25b, 2026-10-16), drawn by SwiftUI. Every word, date, count, which
 letters are on the desk and in what order, every menu and every rule is TS's
 (src/screens/today/today-cards.ts, useTodayDesk): this draws them and reports taps. Its own
 state is only what belongs to the gesture, the keyboard and the day's-end pictures: the card on
 screen (KDeckState), the drag (KDeckMotion), the field (KTodayDock) and the done flow (KDayFlow).

   TODAY                                                     (52, fixed; the page title, never morphs)
   ┌ card ───────────────────────────────────────────────────┐  one letter (KCardDeck), or Wren's
   │ ▦ SEP.23 · NO.7273                           [stamp] (⋯) │  letter in done (KDoneView), in
   │                 the letter, in its tier, folded            │  the same slot: x 16…W−16,
   │ #made my day                                ES→EN read it │  y cardTop, cardHeight tall
   └───────────────────────────────────────────────────────────┘
      (  3  )          (Wren, on the ground)      (  ✉  )         the control band, 68, 14 under
       NEXT                                        REPLY          the card (KControlBand), with Wren
                                                                  over it (KWireWren); in done the
                                                                  window (KFlightWindow) in its place
   (the tab bar, its own Host, below)

 THE BAND is the owner's 2026-10-16 pick ("image 2" of his option sheet; the only band since
 2026-10-18): two discs on the page ground with Wren standing between them.

 WRITING BACK (the chat composers' A1, owner 2026-10-18; the Reddit-style reply box, owner
 2026-11-09). At rest there is no reply box on Today, only the band and the tab bar. REPLY (or
 the card's VoiceOver "Write back") gives the field the keyboard, and that is reply mode
 (KReplyStage.open):

   TODAY
   ┌ card, shrunk ────────────────────────────────────────────┐  the card's top stays; its foot
   │ ▦ SEP.23 · NO.7273                           [stamp] (⋯) │  comes up to 14 over the box, so
   │   the letter at the compact size, folded (UNFOLD ↓)       │  it shrinks by the keyboard and the
   │ #made my day                                ES→EN read it │  box (replyCardHeight, from the
   └───────────────────────────────────────────────────────────┘  real ones)
  ╭──────────────────────────────────────────────────────────────╮  the reply box (KReplyDock), full
  │ ▦ Replying to No. 7273                                 (⤢)  │  width, up from the bottom onto
  │ write back to No. 7273…                                      │  the keyboard; ⤢ turns it into a
  │ ☺                                                      (✈)  │  full page over the desk
  ═══════════════════════════ keyboard ═══════════════════════════

 - the band (NEXT, the arc, REPLY) and Wren on it fade to nothing and take no touches (they don't
   slide: the prototype's opacity 0 + pointer-events none);
 - the tab bar slides 160 down out of sight over .35s: it is another Host, so TS does it, from the
   field's focus (onReplyFocus → useTabBarAway → NativeTabBar's barHidden);
 - the card shrinks with the keyboard (bandSlide) and its letter drops to the compact size (the
   telegram's 30 to 20, the prototype's 29 → 20; KCardText.compact), folding with UNFOLD ↓ when it
   still doesn't fit, never overflowing. Never under replyCardMin: the letter's head and two lines
   stay readable on an iPhone SE;
 - the box rises from below the screen onto the keyboard.
 The keyboard's done, a tap on the dimmed desk (the dock's scrim), VoiceOver's escape or a send
 all end it the same way: the field lets go, and everything goes back (the box down and away, the
 card back to its height, the band in, the tab bar up). A send keeps all it did before: deck.typing
 holds until TS answers it, so the band stays out while Wren takes the letter off her spot, and
 then the card passes. With a hardware keyboard (no keyboard inset) it is still reply mode: the
 band stays out and the tab bar away, and the box stands on the screen's foot, its keys over the
 home indicator; the card shrinks only if the box would reach it. Under Reduce Motion the box and
 the band fade instead of moving.

 LAYOUT. Two layers in one ZStack, so the keyboard moves only what it should:
 - the desk (the radial ground, the card slot, the plate, the band, the window, Wren) ignores the
   keyboard's safe area, so the keyboard never pushes it: the card's shrinking is the desk's own,
   from the measured keyboard (KReplyStage);
 - the dock (the scrim and the reply box) is a layer that respects it (the Host ignores only the
   container safe area: ignoreSafeArea "container"), so the box rides the keyboard in its own
   transaction. Never a .safeAreaInset: iOS 18 reports one twice (spike pattern 1).
 The keyboard's height is measured, not assumed (spike pattern 5): the desk layer's height (which
 ignores the keyboard) less the dock layer's (which respects it). The dock reads it, and hands it
 to the desk through KReplyStage with the compact box's measured height.

 THE DAY'S END. The desk starts the flow: the deck's last pass (optimistic; TS has to confirm
 within 1.5 s or the flow resets and the deck snaps back to TS's first card), the shown card
 leaving as the last one while TS says done, or TS's phase turning from reading to done by a
 removal the deck didn't see. A desk that opens done, or comes up done from loading or offline
 (a relaunch reading the kept day, a quiet day's first load), is drawn at rest with no replay; a
 phase that leaves done (the day turned) resets it.

 One Host covers the full desk, the quiet day, the first load and the offline cold start. The
 toast, the reader and the sheets are React Native, over the Host; a reply in the air is Wren's
 to carry (KWireWren: she takes it off the band and comes back), not a React Native fly-by.

 OWNER'S AUDIT, 2026-11-10. Two additions, the desk otherwise as it was approved:
 - UNDO AFTER NEXT. For five seconds after a pass TS sets content.undoId, and a small Undo
   capsule (KUndoCapsule, in KControlBand.swift) stands just over the band, centred, in the card's
   bottom margin and the air under it, above Wren's head. A tap is the ⋯'s bring back
   (actions.onBringBack), so the deck plays its brought-back reverse. TS takes the offer away on
   time and for every early reason; the desk also keeps it out of sight at once while the reader
   writes back, the band steps aside, the + is open or the day's end has begun. Her first-day
   arrival bubble shares that spot over her head, so it waits while the capsule is up and pops
   back after.
 - WHO IS THIS. A tap on the shown card's face or name (KLetterCard) raises KWhoSheet, an iOS
   sheet with the Help page's own answer; its quiet link goes to TS as the card action "help"
   once the sheet is down. Wren on the band already answered a tap (she hops), so she is as
   she was.
 - HER BIRTHDAY LETTER. On the reader's birthday TS puts a letter from their courier first in
   content.cards (KLetterCardModel.wren; KLetterCard draws it on the same sheet). The desk treats
   it as the card on screen in every way but one: REPLY (the band's, and VoiceOver's "Write
   back") doesn't open the reply box, it reports the card action "wren", and TS opens her room.
 */

// MARK: - Geometry

/// The desk's numbers from the Host's height: src/screens/today/today-cards.ts deskGeometry, the same
/// formula (change them together). 393 × 852, status bar 54, tab bar room 98 → card top 110, card
/// 560, band top 684. Never a card under 360 at rest; while replying the card shrinks to make room
/// for the keyboard and the reply box (replyCardHeight, never under replyCardMin).
public struct KTodayGeometry: Equatable, Sendable {
  /// the plate band, fixed in layout
  public static let band: CGFloat = 52
  /// the card sits this far under the band
  public static let contentTop: CGFloat = 4
  /// from the card's foot to the band's top
  public static let cardAir: CGFloat = 14
  /// the control band: NEXT, REPLY and Wren on the ground between them
  public static let controlHeight: CGFloat = 68
  /// the band's bottom sits this far above the tab bar's room
  public static let controlLift: CGFloat = 2
  /// the gutter on either side of the card
  public static let gutter: CGFloat = 16
  public static let cardMin: CGFloat = 360

  /// y from the Host's top
  public let cardTop: CGFloat
  public let cardHeight: CGFloat
  /// the control band's top, y from the Host's top
  public let controlTop: CGFloat

  /// THE SPREAD: the band floats this far over the sheet's foot
  public static let floatLift: CGFloat = 12
  /// THE SPREAD: the gap either side of the crease, between the two pages
  public static let pageGap: CGFloat = 6
  /// THE SPREAD: the longest a line of the letter runs across the open sheet
  public static let spreadMeasure: CGFloat = 640

  /// `floating` (THE SPREAD, on KTodayDesk): the sheet runs down to the foot and the control
  /// band floats over its bottom edge instead of standing under it.
  public init(hostHeight: CGFloat, safeTop: CGFloat, tabBarRoom: CGFloat, floating: Bool = false) {
    cardTop = safeTop + Self.band + Self.contentTop
    if floating {
      cardHeight = max(Self.cardMin, (hostHeight - cardTop - (tabBarRoom + Self.controlLift)).rounded())
      controlTop = cardTop + cardHeight - Self.controlHeight - Self.floatLift
    } else {
      cardHeight = max(Self.cardMin, (hostHeight - cardTop - Self.cardAir - Self.controlHeight - (tabBarRoom + Self.controlLift)).rounded())
      controlTop = cardTop + cardHeight + Self.cardAir
    }
  }

  // ── writing back: the reply box (owner, 2026-11-09). The React Native fallback keeps the old
  // bar's formula (today-cards.ts replyCardHeight, a hint over a bar 12 over the keyboard); the
  // box stands right on the keyboard with no hint, so it is measured from the box's top here ──

  /// the shortest the card shrinks to while replying: the docket, two lines of the letter folded
  /// with UNFOLD under them, and the foot (an iPhone SE's keyboard leaves about 230)
  public static let replyCardMin: CGFloat = 200

  /// The card's height while replying: its top stays, its foot comes up to cardAir over the top
  /// of the compact reply box (`box` tall, standing on the software keyboard, or on the Host's
  /// foot with a hardware keyboard: `keyboard` 0), never under replyCardMin. nil when the card
  /// needn't shrink (a hardware keyboard's short box under its foot).
  public func replyCardHeight(hostHeight: CGFloat, keyboard: CGFloat, box: CGFloat) -> CGFloat? {
    let boxTop = hostHeight - keyboard - box
    let fit = (boxTop - Self.cardAir - cardTop).rounded(.down)
    guard fit < cardHeight else { return nil }
    return max(Self.replyCardMin, fit)
  }
}

// MARK: - The desk

/// The letter a "who is this" sheet was raised for (its id, for the sheet's identity and the
/// link's report).
struct KWhoAsk: Identifiable, Equatable {
  let id: String
}

/// What the desk keeps without drawing: the latest phase (for a delayed check) and the optimistic
/// play waiting for TS to say done.
final class KTodayDeskBox {
  var phase: KTodayPhase = .loading
  /// bumps whenever an optimistic play is started or settled, so an older check lapses
  var confirmSerial = 0
}

public struct KTodayDesk: View {
  private let theme: KTheme
  private let content: KTodayContent
  private let topInset: CGFloat
  private let tabBarRoom: CGFloat
  private let bottomInset: CGFloat
  private let dock: KTodayDock
  /// reply mode, the keyboard and the reply box's height (the dock writes it; the card shrinks by it)
  @ObservedObject private var stage: KReplyStage
  private let voice: KTodayVoice
  @ObservedObject private var deck: KDeckState
  /// written by the deck, read per frame by the plate and Wren only: never observed here
  private let motion: KDeckMotion
  @ObservedObject private var flow: KDayFlow
  private let actions: KTodayActions

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var box = KTodayDeskBox()
  /// the letter whose face or name was tapped, while its "who is this" sheet is up
  @State private var who: KWhoAsk?

  /* THE SPREAD (iPhone Duo's inner screen; owner, 2026-11-12, at the letter in a column in the
     middle of that screen: "就不能把信全屏幕展开 他两悬浮在信上不行么", and "要把整个屏都利用起来").
     Opening the phone opens the letter. While the window is two pages (KFold twoPages; the Host
     is then the window less the system's band, so the crease's x is this view's own):

       reading   the sheet lies open across both pages, down to the foot; its lines keep a
                 reader's length in the middle. NEXT, Wren and REPLY float over its bottom edge
                 on the RIGHT page, by the hand that holds the phone and next to the rail.
       replying  the sheet steps over to the left page, whole, and the right page is the
                 reader's own: the reply box as a page (KReplyDock, THE RIGHT PAGE), from the
                 letter's top to the keyboard. The right page is always where you write.

     Everything that hangs off the band (the flight window, Wren on her wire, Undo) is laid out
     in the right page with it. On a phone, and on the Duo's outer screen, none of this runs:
     `crease(in:)` is nil and every number is what it was. */
  @ObservedObject private var fold = KFold.shared

  /// the crease's x in a Host `width` wide, when the window is two pages and the Host spans it
  private func crease(in width: CGFloat) -> CGFloat? {
    let f = fold.frame
    guard f.twoPages, f.crease > 160, width - f.crease > 240 else { return nil }
    return f.crease
  }

  /// a pass TS hasn't confirmed by then, when it started the day's end, puts the desk back
  static let confirmWait = 1.5

  /// - Parameters:
  ///   - topInset: the status bar (the Host ignores the container safe area)
  ///   - tabBarRoom: the floating tab bar's room (useTabBarSpace()); the band sits 2 above it
  ///   - bottomInset: the home indicator's inset: with a hardware keyboard the reply box's keys
  ///     stand over it (the box itself reaches the screen's foot), the tab bar being away
  public init(
    theme: KTheme,
    content: KTodayContent,
    topInset: CGFloat,
    tabBarRoom: CGFloat,
    bottomInset: CGFloat = 0,
    dock: KTodayDock,
    voice: KTodayVoice,
    deck: KDeckState,
    motion: KDeckMotion,
    flow: KDayFlow,
    actions: KTodayActions
  ) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.tabBarRoom = tabBarRoom
    self.bottomInset = bottomInset
    self.dock = dock
    self._stage = ObservedObject(wrappedValue: dock.stage)
    self.voice = voice
    self._deck = ObservedObject(wrappedValue: deck)
    self.motion = motion
    self._flow = ObservedObject(wrappedValue: flow)
    self.actions = actions
  }

  /// the deck takes the finger, NEXT and the card's moves
  private var deckEnabled: Bool {
    content.phase == .reading && !deck.typing && content.plus == .closed && !content.hideBand
      && !deck.animating && flow.isReading
  }

  /// The Undo capsule is up: TS offers the last pass back (content.undoId, its five seconds), and
  /// nothing of the desk's own is in the way (the keyboard, the band stepping aside, the + panel,
  /// the day's end, which starts here before TS says done).
  private var undoShown: Bool {
    !content.undoId.isEmpty && !content.labels.undo.isEmpty && content.phase == .reading
      && content.plus == .closed && !content.hideBand && !deck.typing && flow.isReading
  }

  /// the card the deck shows, which the reply answers (nil in done)
  private var shownCard: KLetterCardModel? {
    guard let id = deck.shownId else { return nil }
    return content.cards.first(where: { $0.id == id })
  }

  /// the field's placeholder: the shown card's own, else the plain one
  private var placeholder: String {
    if let card = shownCard, !card.replyPlaceholder.isEmpty {
      return card.replyPlaceholder
    }
    return content.labels.placeholder
  }

  /// The card slot's height now: shrunk while replying (reply mode, and the box would otherwise
  /// reach the card), else the geometry's. The second value says it is shrunk: the letter is
  /// set at the compact size.
  private func cardHeight(_ g: KTodayGeometry, hostHeight: CGFloat, spread: Bool = false) -> (CGFloat, compact: Bool) {
    if spread {
      // on the left page while replying: no box under it, only the keyboard to clear
      guard stage.open else { return (g.cardHeight, false) }
      let fit = (hostHeight - stage.keyboard - KTodayGeometry.cardAir - g.cardTop).rounded(.down)
      let h = max(KTodayGeometry.replyCardMin, min(g.cardHeight, fit))
      return (h, h < KTodayGeometry.cardMin)
    }
    guard stage.open,
          let h = g.replyCardHeight(hostHeight: hostHeight, keyboard: stage.keyboard, box: stage.strip)
    else { return (g.cardHeight, false) }
    return (h, true)
  }

  public var body: some View {
    let _ = remember()
    ZStack(alignment: .bottom) {
      // the desk: never moves for the keyboard (the card shrinks for it, from KReplyStage)
      GeometryReader { geo in
        let W = geo.size.width
        let split = crease(in: W)
        let geometry = KTodayGeometry(hostHeight: geo.size.height, safeTop: topInset, tabBarRoom: tabBarRoom, floating: split != nil)
        desk(width: W, geometry: geometry, card: cardHeight(geometry, hostHeight: geo.size.height, spread: split != nil), crease: split)
          .frame(width: W, height: geo.size.height, alignment: .topLeading)
          .onChange(of: geo.size.height, initial: true) { _, height in
            if abs(dock.fullHeight - height) > 0.5 { dock.fullHeight = height }
          }
      }
      .coordinateSpace(name: "kToday")
      .ignoresSafeArea(.keyboard)

      // the dock: rides the keyboard
      KReplyDock(
        theme: theme,
        labels: content.labels,
        card: shownCard,
        placeholder: placeholder,
        topInset: topInset,
        bottomInset: bottomInset,
        dock: dock,
        deck: deck,
        page: fold.frame.twoPages,
        pageTop: topInset + KTodayGeometry.band + KTodayGeometry.contentTop,
        pageFoot: tabBarRoom + KTodayGeometry.controlLift,
        actions: actions
      )
      // THE SPREAD: the reply is the right page. Only the sides: the dock's own height is how
      // the keyboard is measured (dock.respectingHeight), so nothing outside it may change it
      .padding(.leading, fold.frame.twoPages ? fold.frame.crease + KTodayGeometry.pageGap : 0)
      .padding(.trailing, fold.frame.twoPages ? KTodayGeometry.gutter : 0)
    }
    .background { theme.bg.ignoresSafeArea() }
    // who is this: the Help page's answer, in an iOS sheet over the desk
    .sheet(item: $who) { asked in
      KWhoSheet(theme: theme, labels: content.labels, onClose: { who = nil }) { [actions] in
        who = nil
        // once the sheet has gone, so the Help page isn't pushed under it
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { actions.onCardAction(asked.id, "help") }
      }
    }
    .onAppear { appear() }
    .onChange(of: content.phase) { old, now in phaseChanged(from: old, to: now) }
    .onChange(of: deck.beat) { _, beat in beatChanged(beat) }
    .onChange(of: content.window.canPlay) { _, can in
      flow.refresh(canPlay: can, reduceMotion: reduceMotion)
    }
    .onChange(of: reduceMotion) { _, reduce in
      flow.refresh(canPlay: content.window.canPlay, reduceMotion: reduce)
    }
  }

  /// The desk layer, back to front, in the Host's coordinates. `card` is the slot's height now
  /// (shrunk while replying) and whether the letter is set at the compact size.
  private func desk(width W: CGFloat, geometry g: KTodayGeometry, card: (CGFloat, compact: Bool), crease: CGFloat? = nil) -> some View {
    let plus = content.plus
    let windowShown = flow.windowShown && plus == .closed
    let (slotHeight, compact) = card
    // THE SPREAD: the sheet across both pages, or on the left one while replying; the band and
    // what hangs off it in the right page
    let slotWidth: CGFloat = {
      guard let crease else { return max(0, W - 2 * KTodayGeometry.gutter) }
      return stage.open ? max(0, crease - KTodayGeometry.gutter - KTodayGeometry.pageGap) : max(0, W - 2 * KTodayGeometry.gutter)
    }()
    let bandX = crease ?? 0
    let bandW = crease.map { W - $0 } ?? W
    return ZStack(alignment: .topLeading) {
      // 1. the page's ground: the page colour, flat (the radial wash went on 2026-11-12)
      KTodayGround(theme: theme)
        .frame(width: W)
        .frame(maxHeight: .infinity)

      // 2. the card slot: the deck, and Wren's letter over it in done (neither clips: the
      // letter's chip and the bag's label hang outside the card). While replying it shrinks with
      // the keyboard, its top where it was (the slot is placed by its top), and grows back after.
      ZStack {
        KCardDeck(
          theme: theme,
          content: content,
          height: slotHeight,
          compact: compact,
          enabled: deckEnabled,
          deck: deck,
          motion: motion,
          voice: voice,
          actions: actions,
          onReply: { id in reply(id) },
          onWho: { id in askWho(id) }
        )
        KDoneView(theme: theme, letter: content.wrenLetter, birds: content.birds, flow: flow) { [actions] in actions.onBringBack() }
      }
      // THE SPREAD: the open sheet's lines keep a reader's length
      .environment(\.kCardSpread, crease != nil && !stage.open ? KCardSpread(measure: KTodayGeometry.spreadMeasure) : nil)
      .frame(width: slotWidth, height: slotHeight)
      // the keyboard's own length, so the card and the bar move together; a short ease under
      // Reduce Motion (a change of size, not a slide)
      .animation(reduceMotion ? KTodayMotion.reduced : KTodayMotion.bandSlide, value: slotHeight)
      .animation(reduceMotion ? KTodayMotion.reduced : KTodayMotion.bandSlide, value: slotWidth)
      // the + panel: the card steps back a little
      .scaleEffect(plus == .sheet ? 0.98 : plus == .pop ? 0.97 : 1)
      .offset(y: plus == .sheet ? -10 : 0)
      .animation(reduceMotion ? KTodayMotion.reduced : KTodayMotion.stepBack, value: plus)
      .offset(x: KTodayGeometry.gutter, y: g.cardTop)

      // 3. the status bar's strip and the plate, over the card (a card pulled up goes under it)
      VStack(spacing: 0) {
        theme.bg.frame(height: topInset)
        KTodayHeader(
          theme: theme,
          title: content.title,
          locked: content.titleLocked || deck.pendingLeft != nil,
          motion: motion
        )
      }
      .frame(width: W)

      // 4. the control band: NEXT and REPLY
      KControlBand(
        theme: theme,
        left: content.left,
        labels: content.labels,
        leftA11y: content.leftA11y,
        desk: content.desk,
        deskAt: content.deskAt,
        enabled: content.phase == .reading || content.phase == .done,
        hidden: content.hideBand || plus != .closed,
        deck: deck,
        flow: flow,
        onNext: { [deck] in deck.requestNext() },
        onReply: { if let id = deck.shownId { reply(id) } }
      )
      .frame(width: bandW, height: KBandLayout.height)
      .offset(x: bandX, y: g.controlTop)

      // 5. the window to her game, in the band's place once the day is done
      KFlightWindow(theme: theme, model: content.window, looping: flow.looping) { [actions] in
        if content.window.canPlay { actions.onWindow() }
      }
      .frame(width: max(0, bandW - 2 * KTodayGeometry.gutter), height: KBandLayout.windowHeight)
      .opacity(windowShown ? 1 : 0)
      .offset(y: flow.windowShown || reduceMotion ? 0 : 10)
      .animation(reduceMotion ? KTodayMotion.reduced : KTodayMotion.windowIn, value: flow.windowShown)
      .animation(KTodayMotion.bandFade, value: plus)
      .allowsHitTesting(windowShown)
      .accessibilityHidden(!windowShown)
      .offset(x: bandX + KTodayGeometry.gutter, y: g.controlTop + KBandLayout.windowFrameTop)

      // 6. Wren, over everything; only her own figure takes a touch (a tap: she hops), and only
      // while she stands on the band
      KWireWren(
        theme: theme,
        birds: content.birds,
        wren: content.wren,
        width: bandW,
        controlTop: g.controlTop,
        canPlay: content.window.canPlay,
        // her arrival bubble stands where the Undo capsule does: it waits while the capsule is up
        arrivalLine: undoShown ? "" : content.arrivalLine,
        hidden: plus != .closed,
        motion: motion,
        deck: deck,
        flow: flow
      )
      .frame(width: bandW)
      .frame(maxHeight: .infinity)
      .offset(x: bandX)

      // 7. Undo after Next (owner's audit, 2026-11-10): over the band, centred, for the five
      // seconds TS offers the last pass back; the tap is the ⋯'s bring back
      KUndoCapsule(theme: theme, label: content.labels.undo, hint: content.labels.undoHint, shown: undoShown) { [actions] in
        actions.onBringBack()
      }
      .position(x: bandX + bandW / 2, y: g.controlTop - KUndoCapsule.lift)
    }
  }

  // ── routing ──

  /// The shown card's face or name: the "who is this" sheet, unless the reader is writing back or
  /// something else has the desk (the + panel, a send, the reader).
  private func askWho(_ id: String) {
    guard !content.labels.whoTitle.isEmpty, id == deck.shownId, content.phase == .reading,
          !deck.typing, content.plus == .closed, !content.hideBand
    else { return }
    who = KWhoAsk(id: id)
  }

  /// REPLY and the card's "Write back": only for the card on screen, while it can be answered.
  private func reply(_ id: String) {
    guard id == deck.shownId, content.phase == .reading, deckEnabled else { return }
    // her birthday letter: her room, never the reply box (there is no stranger to answer)
    if shownCard?.wren == true {
      actions.onCardAction(id, "wren")
      return
    }
    dock.reply.focus()
    deck.emit(.replyOpened)
    actions.onReplyOpen(id)
  }

  // ── the day's end ──

  private func remember() {
    box.phase = content.phase
  }

  private func appear() {
    box.confirmSerial &+= 1
    if content.phase == .done {
      flow.rest(canPlay: content.window.canPlay, reduceMotion: reduceMotion)
    } else {
      flow.reset()
    }
  }

  private func play() {
    flow.play(night: content.night, canPlay: content.window.canPlay, reduceMotion: reduceMotion)
  }

  private func phaseChanged(from old: KTodayPhase, to now: KTodayPhase) {
    box.phase = now
    if now == .done {
      // TS confirmed (an optimistic play stands), or a removal the deck didn't see as a beat;
      // a desk that comes up done (a relaunch reading the kept day, a quiet day's first load)
      // is drawn at rest, never replayed
      box.confirmSerial &+= 1
      guard flow.isReading else { return }
      if old == .reading {
        play()
      } else {
        flow.rest(canPlay: content.window.canPlay, reduceMotion: reduceMotion)
      }
    } else if old == .done || !flow.isReading {
      // the day turned (or an unconfirmed play is still showing): back to the reading desk
      box.confirmSerial &+= 1
      flow.reset()
    }
  }

  private func beatChanged(_ beat: KDeckBeat) {
    switch beat.kind {
    case .passed(last: true):
      // optimistic: TS has to say done within confirmWait, or the desk goes back to reading
      guard flow.isReading else { return }
      play()
      guard content.phase != .done else { return }
      box.confirmSerial &+= 1
      let serial = box.confirmSerial
      DispatchQueue.main.asyncAfter(deadline: .now() + Self.confirmWait) { [box, flow] in
        guard box.confirmSerial == serial, box.phase != .done else { return }
        box.confirmSerial &+= 1
        flow.reset()
      }
    case .left(last: true):
      // the shown card left as the last one: only TS's done ends the day (a day turning empties
      // the cards too, with the phase back at loading)
      if content.phase == .done, flow.isReading { play() }
    default:
      break
    }
  }
}
