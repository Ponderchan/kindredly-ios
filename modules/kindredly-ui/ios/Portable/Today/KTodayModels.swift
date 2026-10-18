// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 TODAY'S SHARED TYPES (Today 3d × 25b, build contract §3.0). What TS sends (KTodayContent and the
 pieces in it), the live state the small views each observe (the dock, the voice, the deck, the
 drag), where the desk's taps go (KTodayActions) and the motion every Today piece times itself by
 (KTodayMotion). The deck, the band, Wren, the done flow and the desk all code against exactly
 these; nothing here draws.
 */

// MARK: - What TS sends

/// TS's phase of the desk (today-cards deskPhase): the first load, an offline cold start with
/// nothing kept, letters still to read, or the day done (a quiet day is done too).
public enum KTodayPhase: String, Sendable {
  case loading
  case offline
  case reading
  case done
}

/// The tab bar's + panel over Today: closed, the first-week sheet, or the two round buttons.
public enum KTodayPlus: String, Sendable {
  case closed
  case sheet
  case pop
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
  /// Report / Block, then Bring back the last letter (the card on screen, after a pass); only
  /// Bring back, or nothing, on an unsigned letter
  public var menu: [KMenuItem] = []
  public var a11yLabel = ""
  /// the reply field's placeholder for this letter: "write back to No. 7273…" ("write back…" unsigned)
  public var replyPlaceholder = ""

  public init() {}
}

/// Every word on the desk that isn't on a card, and the card's own fixed words.
public struct KTodayLabels: Equatable, Sendable {
  /// "NEXT", under the glass disc
  public var next = ""
  /// "REPLY", under the ink disc
  public var reply = ""
  /// VoiceOver: "Write back"
  public var replyA11y = ""
  /// "UNFOLD ↓"
  public var unfold = ""
  /// VoiceOver: "Unfold the whole letter"
  public var unfoldA11y = ""
  /// "VOICE LETTER"
  public var voiceLetter = ""
  /// VoiceOver: the ⋯
  public var more = ""
  /// VoiceOver's "Next letter" (the card's action)
  public var nextA11y = ""
  /// "Bring back the last letter" (the menu carries TS's own item; kept for the record)
  public var bringBack = ""
  /// VoiceOver: the voice letter's toggle
  public var play = ""
  public var pause = ""
  /// "SEND"
  public var send = ""
  /// "write back…": the field's placeholder when the shown card has none of its own
  public var placeholder = ""
  /// the offline cold start's card
  public var offlineTitle = ""
  public var offlineBody = ""
  /// VoiceOver: the first load's empty card
  public var loadingA11y = ""

  public init() {}
}

/// Wren's letter when the desk is done (today-cards buildWrenLetter): her counted note, the
/// closed bag with the opening time, and the foot's countdown.
public struct KWrenLetterModel: Equatable, Sendable {
  /// "FROM YOUR COURIER"
  public var from = ""
  /// the done moment: "OCT.15 · 22:14"
  public var stamp = ""
  /// her counted lines, already worded and ordered
  public var lines: [String] = []
  /// "— W."
  public var sign = ""
  /// the bag's label: "OPENS AT 8:00 AM"
  public var bag = ""
  /// "WREN IS BACK IN"
  public var foot = ""
  /// "8H 06M"
  public var countdown = ""
  /// the bag's tap: "NOT YET · 8H 06M"
  public var notYet = ""
  /// the letter's tap: "THAT'S ALL FOR TODAY"
  public var chip = ""
  /// VoiceOver: "A letter from Wren"
  public var a11y = ""

  public init() {}
}

/// The window's sky by the hour, in the game's palette (CourierCard PALETTE[daylight(hour)]).
/// The default is the night palette.
public struct KTodaySky: Equatable, Sendable {
  public var top: Color = Color(hex: "#1E1B35")
  public var bottom: Color = Color(hex: "#2E2A6B")
  public var pillarFill: Color = Color(hex: "#2B2660")
  public var pillarInk: Color = Color(hex: "#DAD6F2")
  public var text: Color = .white
  public var stars = true
  public var night = true

  public init() {}
}

/// The window to her game under the slot in done (today-cards buildWindow).
public struct KFlightWindowModel: Equatable, Sendable {
  /// she can play (the PLAY sticker's rule): the play disc, and the window is a button
  public var canPlay = false
  /// "THAT'S ALL FOR TODAY"
  public var eyebrow = ""
  /// "Fly a lap with Wren", or the countdown to her next post when she can't play
  public var line = ""
  public var a11yLabel = ""
  public var a11yHint = ""
  public var sky = KTodaySky()

  public init() {}
}

/// Her five pictures, captured from her own look by BirdSnapshots (TS: useTodayBirds). A
/// picture not captured yet is nil; TS already falls back to the content capture.
public struct KTodayBirds: Equatable, Sendable {
  public var idle: KImageRef?
  public var curious: KImageRef?
  public var delight: KImageRef?
  public var sleepy: KImageRef?
  public var fly: KImageRef?
  /// a hatchling or fledgling has no fly art: `fly` is her perch picture, drawn tilted −12°
  public var flyIsPerch = false

  public init() {}
}

/// Wren on the band, as TS decides it (useTodayDesk view.wren); KWireWren draws her reactions.
public struct KTodayWren: Equatable, Sendable {
  /// the face she rests in: .sleepy in her night hours (21:00–07:59, the reader's clock), else .idle
  public var rest: KWrenFace = .idle
  /// moves each time a reply leaves the phone: she takes the letter off the band and comes back
  public var carry = 0
  /// the unfolded reader is open: she steps aside, and straightens up when it closes
  public var reader = false
  /// VoiceOver's name for her ("Your courier")
  public var a11y = ""
  /// her name, VoiceOver's value
  public var name = ""

  public init() {}
}

/// Everything the desk shows, from TS.
public struct KTodayContent: Equatable, Sendable {
  /// "TODAY"
  public var title = ""
  public var phase: KTodayPhase = .loading
  /// letters on today's desk not yet passed (NEXT's number)
  public var left = 0
  /// VoiceOver for NEXT: "Next letter. 3 left today."
  public var leftA11y = ""
  /// the letters not passed yet, the one on screen first
  public var cards: [KLetterCardModel] = []
  /// the title has shrunk for the day: a letter was passed, or the desk is done
  public var titleLocked = false
  /// the first card unfolds as it arrives (her first arrival)
  public var freshUnfold = false
  /// her first-arrival line over her head, "" for none
  public var arrivalLine = ""
  public var wrenLetter = KWrenLetterModel()
  public var window = KFlightWindowModel()
  public var birds = KTodayBirds()
  /// her yawn hours (21:00–07:59)
  public var night = false
  /// the + panel over the tab
  public var plus: KTodayPlus = .closed
  /// NEXT and REPLY step aside: a send in flight, or the reader open (Wren only for the reader:
  /// a reply in the air is hers to carry, wren.carry)
  public var hideBand = false
  public var wren = KTodayWren()
  public var labels = KTodayLabels()

  public init() {}
}

/// The reply strip's state for one letter, sent by TS on every change (the composer command).
public struct KTodayComposer: Equatable, Sendable {
  public var letterId = ""
  public var sendState: KSendState = .disabled
  public var hint = ""
  /// the hint in the postmark red (over the limit)
  public var hintWarn = false
  /// the draft's first line; "" shows the placeholder
  public var preview = ""
  /// a send is in flight
  public var sending = false
  /// the last send press TS has answered
  public var sendSerial = 0

  public init() {}
}

// MARK: - Live state (each read only by the small views that need it)

/// The dock's state: the field, what TS says about it, focus and the keyboard. Read by the dock alone,
/// so a keystroke never redraws the cards.
public final class KTodayDock: ObservableObject {
  /// the reply field; the adapter blurs it before the view goes (FocusableView)
  public let reply = KFieldController()
  @Published public private(set) var composer = KTodayComposer()
  @Published public private(set) var focused = false
  /// a send was pressed and TS hasn't answered it yet: the dock stays hidden (Wren carries it: KWireWren)
  @Published private(set) var awaitingSend = false
  /// focused with no software keyboard (a hardware one): the strip sits on the band's line instead
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

/// The deck's rare changes: the deck, the band, the dock, Wren and the desk observe it.
public final class KDeckState: ObservableObject {
  /// the card on screen; the dock binds to it (nil in done)
  @Published public internal(set) var shownId: String? = nil
  /// NEXT's number while a pass awaits TS (TS's left − 1)
  @Published public internal(set) var pendingLeft: Int? = nil
  /// what just happened on the deck (Wren and the desk react)
  @Published public internal(set) var beat = KDeckBeat(kind: .none, serial: 0)
  /// the reply field has the keyboard, or a send it let go of awaits TS (set by KReplyDock)
  @Published public internal(set) var typing = false
  /// NEXT and VoiceOver's "Next letter"; the deck serves it
  @Published public internal(set) var nextRequest = 0
  /// a card transition is running (no re-entry)
  @Published public internal(set) var animating = false

  public func requestNext() { nextRequest &+= 1 }
  func emit(_ k: KDeckBeat.Kind) { beat = KDeckBeat(kind: k, serial: beat.serial &+ 1) }
  public init() {}
}

/// One thing that happened on the deck, with a serial so the same kind twice is two beats.
public struct KDeckBeat: Equatable, Sendable {
  public enum Kind: Equatable, Sendable {
    case none
    /// a pass the deck started (last: no card after it)
    case passed(last: Bool)
    /// the shown card left without a pass (answered, blocked, withdrawn)
    case left(last: Bool)
    case broughtBack
    case replyOpened
    case keyboardDown
    /// the shown letter's UNFOLD (or its VoiceOver action): the reader is about to open
    case unfolded
  }

  public let kind: Kind
  public let serial: Int
}

/// Per frame while dragging: only the header and Wren observe it.
public final class KDeckMotion: ObservableObject {
  /// clamp(−dy/110, 0, 1); back to 0 with KTodayMotion.springBack
  @Published public internal(set) var progress: CGFloat = 0
  /// the card pulled down instead (the damped drag): clamp(dy/110, 0, 1); Wren leans back from it
  @Published public internal(set) var pull: CGFloat = 0
  @Published public internal(set) var dragging = false
  public init() {}
}

/// Where the desk's taps go. One object for the life of the surface; set the closures once.
public final class KTodayActions {
  /// a card passed (the swipe up, NEXT, VoiceOver's "Next letter")
  public var onPass: (_ letterId: String) -> Void = { _ in }
  /// the ⋯'s Bring back the last letter
  public var onBringBack: () -> Void = {}
  /// REPLY (or the card's "Write back") opened the field for the shown letter
  public var onReplyOpen: (_ letterId: String) -> Void = { _ in }
  /// the window, while she can play
  public var onWindow: () -> Void = {}
  /// the reader's edit in the reply field, for the letter it is bound to
  public var onReplyChange: (_ letterId: String, _ text: String) -> Void = { _, _ in }
  /// the send key (enabled or dimmed), with the words and the press's serial
  public var onReplySend: (_ letterId: String, _ text: String, _ serial: Int) -> Void = { _, _, _ in }
  /// the field took or let go of the keyboard
  public var onReplyFocus: (Bool) -> Void = { _ in }
  /// a card's action: unfold, translate, report, block, voice
  public var onCardAction: (_ letterId: String, _ action: String) -> Void = { _, _ in }
  public init() {}
}

/// Every Today piece's timing (the design's curves).
enum KTodayMotion {
  /// a card going out; its opacity fades over .24 (KCardDeck.fadeOut)
  static let cardOut = Animation.timingCurve(0.4, 0, 0.7, 1, duration: 0.30)
  static let cardIn = Animation.timingCurve(0.3, 1, 0.3, 1, duration: 0.34)
  static let springBack = Animation.timingCurve(0.3, 1, 0.3, 1, duration: 0.30)
  static let press = Animation.easeOut(duration: 0.15)
  static let face = Animation.easeInOut(duration: 0.20)
  static let leanBack = Animation.easeOut(duration: 0.25)
  static let bandSlide = Animation.easeInOut(duration: 0.35)
  static let bandFade = Animation.easeOut(duration: 0.30)
  static let flight = Animation.timingCurve(0.4, 0, 0.3, 1, duration: 0.55)
  /// Wren taking a reply off the band: up and out of sight, speeding up
  static let takeOff = Animation.timingCurve(0.45, 0, 0.8, 0.6, duration: 0.90)
  /// and back onto her spot, slowing to land
  static let landing = Animation.timingCurve(0.2, 0.6, 0.35, 1, duration: 0.70)
  static let windowIn = Animation.easeOut(duration: 0.45)
  static let stepBack = Animation.timingCurve(0.3, 1, 0.3, 1, duration: 0.40)
  static let reduced = Animation.easeInOut(duration: 0.20)
  static let flapPeriod = 1.1, pipesPeriod = 2.6
}
