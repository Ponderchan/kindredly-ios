// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE TODAY TAB (10a, H:28-46 and H:108-125 with the owner's decisions), drawn by SwiftUI. Every
 word, date, count, which letters are on the desk and in what order, every menu and every rule
 is TS's (src/screens/today/today-cards.ts, useTodayDesk): this draws them and reports taps. Its
 own state is only what belongs to the gesture and the keyboard: which card has settled, how far
 the stack is scrolled, whether the field has the keyboard, and a few measured heights.

   TODAY ........................................................ ALL READ   (52, fixed)
   [Wren] Wren left something on her desk.                      ›     ┐ scroll with the cards
   [Wren] Your letter is on its way. I brought back three.  ✉ ✉ ✉    ┘ (never take their height)
   ┌ card ───────────────────────────────────────────────────────┐   one card per swipe,
   │ ▦ SEP.23 · NO.7273                               [stamp] (⋯) │   snapped 12 under the band
   │                 the letter, in its tier, folded                │
   │ #made my day                                    ES→EN read it │
   │ ──────────────────────────────────────────────────────────── │
   │ ↑ PASS                                               REPLY ↓ │
   └──────────────────────────────────────────────────────────────┘
   (the next card peeks 132 below, under the fade)
   … the close-of-day blind as the last page (a React Native island)
   [✎ write back…                                            (↑)]   the pill, bottomRoom up
   (fade 176, solid from 42%)                         (the tab bar, its own Host, below)

 LAYOUT. Two layers in one ZStack, so the keyboard moves only what it should:
 - the desk (status-bar strip, the plate, the card stack, the bottom fade) ignores the keyboard's
   safe area, so typing never resizes or re-snaps the cards;
 - the dock (the pill, the reply strip and its hint, the tap-catcher) sits in a VStack that
   respects it (the Host ignores only the container safe area: ignoreSafeArea "container"), so
   the strip rides the keyboard in its own transaction. Never a .safeAreaInset: iOS 18 reports
   one twice (spike pattern 1).
 The keyboard's height is measured, not assumed (spike pattern 5): the desk layer's height (which
 ignores the keyboard) less the dock layer's (which respects it). Only the dock reads it.

 THE PLATE: TODAY at 22, shrinking into a centred postmark over the first 40pt of scroll, driven
 here from the scroll offset (KScrollModel, read by the plate alone; never a JS round trip, which
 would stutter). The band stays 52 in layout, so the stack's frame never changes mid-scroll.

 One Host covers the full desk, the quiet day (no cards: the plate says CLOSED, the strip and the
 blind stay) and the first load (nothing on the desk yet: the plate blank, no blind). The toast,
 the send's fly-by, the reader and the sheets are React Native, over the Host.
 */

// MARK: - Geometry

/// The desk's numbers from the Host's height: src/screens/today/today-cards.ts deskGeometry, the same
/// formula (change them together). The card scales with the screen (owner): about 559 on a 393 × 852
/// phone, 427 on an iPhone SE, never under 360.
public struct KTodayGeometry: Equatable, Sendable {
  /// the plate band, fixed in layout
  public static let band: CGFloat = 52
  /// the first card sits this far under the band: the snap line (H:28's scroll-padding)
  public static let contentTop: CGFloat = 12
  /// from one card's foot to the next card's top (H:39's 12 + 120)
  public static let cardGap: CGFloat = 132
  /// the gutter on either side of the cards (H:28)
  public static let gutter: CGFloat = 16
  public static let pillHeight: CGFloat = 52
  public static let pillAir: CGFloat = 14
  public static let cardMin: CGFloat = 360
  /// the blind's own height before it scales (CloseOfDay's 312 × 404 window, capsule and cue)
  public static let blindHeight: CGFloat = 520
  public static let endMin: CGFloat = 300

  /// the pill's bottom above the screen's: the tab bar's room + 6 (H:115's 104 on Face ID)
  public let bottomRoom: CGFloat
  /// the stack's scroll view: the Host less the status bar and the band
  public let viewHeight: CGFloat
  public let cardHeight: CGFloat
  /// one card and the gap after it
  public let stride: CGFloat
  /// the blind's page; the pill is hidden there
  public let endHeight: CGFloat

  public init(hostHeight: CGFloat, safeTop: CGFloat, tabBarRoom: CGFloat) {
    let room = tabBarRoom + 6
    let view = max(0, hostHeight - safeTop - Self.band)
    bottomRoom = room
    viewHeight = view
    cardHeight = max(Self.cardMin, (view - Self.contentTop - (room + Self.pillHeight + Self.pillAir)).rounded())
    stride = cardHeight + Self.cardGap
    endHeight = max(Self.endMin, (view - Self.contentTop - room).rounded())
  }
}

// MARK: - What TS sends

/// One envelope of the first arrival.
public enum KEnvelopeState: String, Sendable {
  case opened
  case current
  case sealed
}

/// Her return from the first crossing: the line and the three envelopes she brought back.
public struct KTodayArrival: Equatable, Sendable {
  public var open = false
  public var line = ""
  public var states: [KEnvelopeState] = []
  /// VoiceOver: "Letter 1 of 3", one per envelope
  public var labels: [String] = []
  /// VoiceOver: "read", "open now", "not opened yet", one per envelope
  public var values: [String] = []

  public init() {}
}

/// The capsule slot at a card's foot: translation wins over the signal (owner).
public enum KCardCapsule: Equatable, Sendable {
  case none
  /// "ES→EN" + "Read it in yours" (or "EN←ES" + "Show original"; busy: not enabled)
  case translate(code: String, label: String, enabled: Bool, value: String)
  /// the lime capsule: "auras close" with the rings, "Night owl, like you" with the clock, …
  case signal(label: String, glyph: KAurasClose.Glyph)
}

/// One desk letter, every word already set by TS (today-cards buildCard).
public struct KLetterCardModel: Identifiable, Equatable, Sendable {
  public var id = ""
  /// "SEP.23 · NO.7273"
  public var postmark = ""
  /// FACE v1, bit row × 5 + column
  public var mask = 0
  /// a deleted account: the veil in faint
  public var ghost = false
  public var stampId = ""
  public var stampHex = ""
  /// VoiceOver's name for the stamp ("" hides it)
  public var stampName = ""
  /// "#made my day", "" for none
  public var topic = ""
  public var topicWash = ""
  public var topicInk = ""
  public var topicLine = ""
  /// the text shown (the translation when it is on); "" for a voice letter
  public var body = ""
  public var bodySize: CGFloat = 30
  public var bodyLine: CGFloat = 40
  public var bodyCenter = true
  public var isVoice = false
  /// the voice letter's link is signed
  public var voiceReady = false
  public var caption = ""
  public var durationLabel = ""
  public var capsule: KCardCapsule = .none
  /// Report / Block; [] for an unsigned letter
  public var menu: [KMenuItem] = []
  public var a11yLabel = ""

  public init() {}
}

/// Every word on the desk that isn't on a card, and the card's own fixed words.
public struct KTodayLabels: Equatable, Sendable {
  /// "↑ PASS"
  public var pass = ""
  /// "REPLY ↓"
  public var reply = ""
  /// VoiceOver: "Write back"
  public var replyA11y = ""
  /// "UNFOLD ↓"
  public var unfold = ""
  /// VoiceOver: "Unfold the whole letter"
  public var unfoldA11y = ""
  /// "VOICE LETTER"
  public var voiceLetter = ""
  /// VoiceOver: the ⋯, "Report or block"
  public var more = ""
  /// VoiceOver actions: "Next letter", "Previous letter"
  public var next = ""
  public var previous = ""
  /// VoiceOver: the voice letter's toggle
  public var play = ""
  public var pause = ""
  /// "write back…"
  public var placeholder = ""
  /// "SEND"
  public var send = ""

  public init() {}
}

/// Where the reader's page should be after the cards changed under it (a letter answered or
/// blocked): the card now in its place, or "" for the end page. Sent in the same props update as
/// the cards, so it never lands on the old list.
public struct KTodayAnchor: Equatable, Sendable {
  public var id = ""
  public var serial = 0

  public init(id: String = "", serial: Int = 0) {
    self.id = id
    self.serial = serial
  }
}

/// Everything the desk shows, from TS.
public struct KTodayContent: Equatable, Sendable {
  public var title = ""
  /// CLOSED / ALL READ / ""
  public var rightLabel = ""
  /// the desk strip's line; "" draws no strip
  public var deskStrip = ""
  public var arrival = KTodayArrival()
  /// the first card unfolds as it arrives (her return)
  public var freshUnfold = false
  public var cards: [KLetterCardModel] = []
  /// the desk has loaded: the blind is the last page
  public var endPage = false
  /// TS hides the pill: a send in flight, the reader open, the + sheet open
  public var pillHidden = false
  public var labels = KTodayLabels()
  public var anchor = KTodayAnchor()

  public init() {}
}

// MARK: - Live state (each read only by the small views that need it)

/// The reply strip's state for one letter, sent by TS on every change (the composer command).
public struct KTodayComposer: Equatable, Sendable {
  public var letterId = ""
  public var sendState: KSendState = .disabled
  public var hint = ""
  /// the hint in the postmark red (over the limit)
  public var hintWarn = false
  /// the draft's first line for the resting pill; "" shows the placeholder
  public var preview = ""
  /// a send is in flight
  public var sending = false
  /// the last send press TS has answered
  public var sendSerial = 0

  public init() {}
}

/// The dock's state: the field, what TS says about it, focus and the keyboard. Read by the dock alone,
/// so a keystroke never redraws the cards.
public final class KTodayDock: ObservableObject {
  /// the reply field; the adapter blurs it before the view goes (FocusableView)
  public let reply = KFieldController()
  @Published public private(set) var composer = KTodayComposer()
  @Published public private(set) var focused = false
  /// a send was pressed and TS hasn't answered it yet: the dock stays hidden (the fly-by is TS's)
  @Published private(set) var awaitingSend = false
  /// focused with no software keyboard (a hardware one): the strip sits above the tab bar instead
  @Published private(set) var hardwareKeyboard = false
  /// the dock layer's height (it respects the keyboard) and the desk layer's (it doesn't)
  @Published var respectingHeight: CGFloat = 0
  @Published var fullHeight: CGFloat = 0
  private(set) var pressSerial = 0
  private var focusSerial = 0

  public init() {}

  /// the keyboard's overlap at the bottom of the Host (0 while it is down)
  var keyboardInset: CGFloat { max(0, fullHeight - respectingHeight) }

  /// TS's composer command.
  public func apply(_ next: KTodayComposer) {
    if awaitingSend && next.sendSerial >= pressSerial && !next.sending {
      awaitingSend = false
    }
    if next != composer { composer = next }
  }

  /// The send key, enabled: the field lets go and the dock hides until TS answers. Returns the press's serial.
  func pressSend() -> Int {
    pressSerial += 1
    awaitingSend = true
    reply.blur()
    return pressSerial
  }

  /// The send key, dimmed (a full pouch): TS explains; nothing hides.
  func pressDimmed() -> Int {
    pressSerial += 1
    return pressSerial
  }

  func setFocused(_ now: Bool) {
    guard now != focused else { return }
    focused = now
    focusSerial += 1
    if !now {
      hardwareKeyboard = false
      return
    }
    // a software keyboard is up within its animation; no inset by then means a hardware one
    let serial = focusSerial
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in
      guard let self, self.focused, self.focusSerial == serial else { return }
      let hardware = self.keyboardInset < 40
      if hardware != self.hardwareKeyboard { self.hardwareKeyboard = hardware }
    }
  }
}

/// The one voice letter playing, as TS's single player reports it (the playback command, on
/// transitions only). Read by the voice block on each voice card alone.
public final class KTodayVoice: ObservableObject {
  @Published public private(set) var key = ""
  @Published public private(set) var playback: KPlayback?
  /// the loaded item wouldn't load (an expired link, offline)
  @Published public private(set) var failed = false

  public init() {}

  public func apply(key: String, playback: KPlayback?, failed: Bool) {
    if key != self.key { self.key = key }
    if playback != self.playback { self.playback = playback }
    if failed != self.failed { self.failed = failed }
  }
}

/// The stack's scroll state: which card has settled, the cord's lock, and TS's scroll requests.
public final class KTodayDriver: ObservableObject {
  /// Where a scroll request goes.
  public enum Target: Equatable, Sendable {
    /// the top of the desk (the strip and the arrival in view)
    case top
    /// a card by its id
    case card(String)
  }

  struct ScrollRequest: Equatable {
    let target: Target
    let animated: Bool
    let serial: Int
  }

  /// the card on screen once the scroll settles (cards.count = the end page)
  @Published public internal(set) var settledCard = 0
  /// the blind's cord is held: the stack must not scroll under the pull
  @Published public var scrollLocked = false
  @Published private(set) var scrollRequest: ScrollRequest?
  private var serial = 0

  public init() {}

  public func scroll(to target: Target, animated: Bool) {
    serial += 1
    scrollRequest = ScrollRequest(target: target, animated: animated, serial: serial)
  }
}

/// Where the desk's taps go. One object for the life of the surface; set the closures once.
public final class KTodayActions {
  /// the card the stack settled on (cards.count = the end page)
  public var onCardIndex: (Int) -> Void = { _ in }
  /// the reader's edit in the reply field, for the letter it is bound to
  public var onReplyChange: (_ letterId: String, _ text: String) -> Void = { _, _ in }
  /// the send key (enabled or dimmed), with the words and the press's serial
  public var onReplySend: (_ letterId: String, _ text: String, _ serial: Int) -> Void = { _, _, _ in }
  /// the field took or let go of the keyboard
  public var onReplyFocus: (Bool) -> Void = { _ in }
  /// a card's action: unfold, translate, report, block, voice
  public var onCardAction: (_ letterId: String, _ action: String) -> Void = { _, _ in }
  /// the desk strip (to her desk)
  public var onDeskStrip: () -> Void = {}
  /// an arrival envelope, 0...2
  public var onEnvelope: (Int) -> Void = { _ in }

  public init() {}
}

// MARK: - The desk

public struct KTodayDesk: View {
  private let theme: KTheme
  private let content: KTodayContent
  private let topInset: CGFloat
  private let tabBarRoom: CGFloat
  private let driver: KTodayDriver
  private let dock: KTodayDock
  private let voice: KTodayVoice
  private let actions: KTodayActions
  private let deskBird: AnyView?
  private let arrivalBird: AnyView?
  private let endPage: AnyView?

  /// The plate reads this (offset capped at 40: past it nothing changes); the screen itself never
  /// observes it, so a scroll frame redraws the plate alone.
  @State private var chrome = KScrollModel(offsetCap: 40)

  /// - Parameters:
  ///   - topInset: the status bar (the Host ignores the container safe area)
  ///   - tabBarRoom: the floating tab bar's room (useTabBarSpace()); the pill sits 6 above it
  ///   - deskBird, arrivalBird: Wren as React Native islands (22, 34), placed only while their row shows
  ///   - endPage: the close-of-day blind (a React Native island), the stack's last page once loaded
  public init(
    theme: KTheme,
    content: KTodayContent,
    topInset: CGFloat,
    tabBarRoom: CGFloat,
    driver: KTodayDriver,
    dock: KTodayDock,
    voice: KTodayVoice,
    actions: KTodayActions,
    deskBird: AnyView? = nil,
    arrivalBird: AnyView? = nil,
    endPage: AnyView? = nil
  ) {
    self.theme = theme
    self.content = content
    self.topInset = topInset
    self.tabBarRoom = tabBarRoom
    self.driver = driver
    self.dock = dock
    self.voice = voice
    self.actions = actions
    self.deskBird = deskBird
    self.arrivalBird = arrivalBird
    self.endPage = endPage
  }

  public var body: some View {
    ZStack(alignment: .bottom) {
      // the desk: never moves for the keyboard
      GeometryReader { geo in
        let geometry = KTodayGeometry(hostHeight: geo.size.height, safeTop: topInset, tabBarRoom: tabBarRoom)
        VStack(spacing: 0) {
          // the status bar's strip: the page colour
          Color.clear.frame(height: topInset)
          KTodayHeader(theme: theme, title: content.title, rightLabel: content.rightLabel, chrome: chrome)
          KCardStack(
            theme: theme,
            content: content,
            geometry: geometry,
            driver: driver,
            dock: dock,
            voice: voice,
            actions: actions,
            chrome: chrome,
            deskBird: deskBird,
            arrivalBird: arrivalBird,
            endPage: endPage
          )
        }
        .overlay(alignment: .bottom) {
          KTodayFade(theme: theme, driver: driver, cardCount: content.cards.count, endPage: content.endPage)
        }
        .onChange(of: geo.size.height, initial: true) { _, height in
          if abs(dock.fullHeight - height) > 0.5 { dock.fullHeight = height }
        }
      }
      .ignoresSafeArea(.keyboard)

      // the dock: rides the keyboard
      KReplyDock(
        theme: theme,
        labels: content.labels,
        bottomRoom: tabBarRoom + 6,
        cardIds: content.cards.map(\.id),
        pillHidden: content.pillHidden,
        dock: dock,
        driver: driver,
        actions: actions
      )
    }
    .background { theme.bg.ignoresSafeArea() }
  }
}

/// The bottom fade (H:108) over the stack, under the pill. It fades itself out once the blind has
/// settled, where its solid part would cover the cue and the sill (critic).
struct KTodayFade: View {
  let theme: KTheme
  @ObservedObject var driver: KTodayDriver
  let cardCount: Int
  let endPage: Bool
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    let onBlind = endPage && driver.settledCard >= cardCount
    KBottomFade(theme: theme)
      .opacity(onBlind ? 0 : 1)
      .animation(reduceMotion ? nil : .easeOut(duration: 0.25), value: onBlind)
  }
}
