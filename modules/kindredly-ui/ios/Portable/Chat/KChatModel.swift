// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE CONVERSATION KIT'S VALUES (10a step 5, batch 1): what a room with a kindred and a pen-pal
 chat are drawn from. Everything here is plain data, already worded and dated by whoever owns
 the screen (in the React Native app, TS: src/screens/chat/build-items.ts builds every item,
 menu and dock line with today's rules, Adapters/KConversationView.swift turns its records into
 these). Swift decides nothing about who may take a line back or what a fold says.

 - KChatItem: one row of the list, by kind (a room line, a pen-pal letter block, a moment, a
   song, a fold, a line taken back, the voice opening).
 - KChatDock: everything above and in place of the composer (the closing line, Wren's notice,
   the sign door, the reply quote, the mode box, the strip or the gone line or the expired card)
   and the trace tray's four choices.
 - KConversationDriver: the live channel (the two fields' controllers, canSend and the status
   line, playback, scroll requests, the keyboard's height, the tray). Things that change often
   travel through it, never through the items.
 - KConversationActions: one object holding every event the surface reports.
 */

/// Which conversation this is: a named room (bubbles, folds, songs, moments, the + tray) or a
/// pen-pal chat before names (letter blocks, the sign door).
public enum KChatVariant: String, Sendable {
  case room
  case letters
}

/// What a row draws.
public enum KChatItemKind: String, Sendable {
  /// a room line: a bubble on its writer's side
  case line
  /// a pen-pal letter block, with its label line and time
  case letter
  /// a tiny moment: a square photo
  case photo
  /// a song card, and the shelf link under the last one
  case song
  /// a folded note or question, sealed or opened
  case fold
  /// a line its writer took back: the small note where it was
  case recalled
  /// the voice opening: a voice card (a room line or a letter block by variant)
  case voice
}

/// A translation under a line.
public enum KChatTranslation: String, Sendable {
  case none
  /// being translated: "translating…"
  case busy
  /// shown under the line
  case shown
}

/// Which part of a row was tapped.
public enum KChatPart: String, Sendable {
  /// the letter block (opens the reader)
  case body
  case photo
  case song
  /// the quote inside a reply (jumps to the original)
  case quote
  /// ANSWER TO OPEN on a sealed fold
  case fold
  /// "{n} songs between you"
  case shelf
  /// the voice card's disc
  case voice
}

/// The line a reply quotes.
public struct KChatQuote: Equatable, Sendable {
  /// whose it was, already in capitals
  public let speaker: String
  /// a few of its words, or "taken back" when it was
  public let excerpt: String
  /// it was taken back: the excerpt is drawn in italics
  public let gone: Bool
  /// the quoted item's key, "" when it can't be jumped to
  public let target: String

  public init(speaker: String, excerpt: String, gone: Bool, target: String) {
    self.speaker = speaker
    self.excerpt = excerpt
    self.gone = gone
    self.target = target
  }
}

/// One half of an opened fold: each is a line with its own menu.
public struct KChatFoldHalf: Identifiable, Equatable, Sendable {
  public let key: String
  public let mine: Bool
  /// YOU or their name, in capitals
  public let speaker: String
  public let body: String
  public let menu: [KMenuItem]
  public let translation: KChatTranslation
  public let translationText: String

  public var id: String { key }

  public init(key: String, mine: Bool, speaker: String, body: String, menu: [KMenuItem], translation: KChatTranslation, translationText: String) {
    self.key = key
    self.mine = mine
    self.speaker = speaker
    self.body = body
    self.menu = menu
    self.translation = translation
    self.translationText = translationText
  }
}

/// Where a fold stands for this reader.
public enum KChatFoldState: String, Sendable {
  /// both halves are open
  case open
  /// mine, waiting for theirs
  case waiting
  /// theirs, sealed until I fold one back
  case sealed
}

public struct KChatFold: Equatable, Sendable {
  /// A FOLDED QUESTION / A FOLDED NOTE
  public let kindLabel: String
  /// the question's prompt, "" for a note
  public let prompt: String
  public let state: KChatFoldState
  /// waiting: "folded — waiting for …"; sealed: "answer it to open both"
  public let hint: String
  /// sealed: ANSWER TO OPEN / FOLD YOURS, without the ›
  public let answerKey: String
  /// open: the two halves, the opener first
  public let halves: [KChatFoldHalf]

  public init(kindLabel: String, prompt: String, state: KChatFoldState, hint: String, answerKey: String, halves: [KChatFoldHalf]) {
    self.kindLabel = kindLabel
    self.prompt = prompt
    self.state = state
    self.hint = hint
    self.answerKey = answerKey
    self.halves = halves
  }
}

/// One row of the conversation, everything already worded and dated.
public struct KChatItem: Identifiable, Equatable, Sendable {
  /// stable for the life of the row: the message id (or the send's client key), "opening",
  /// "fold:<id>"
  public let key: String
  public let kind: KChatItemKind
  public let mine: Bool
  /// the day rule above the row, "" for none
  public let dayLabel: String
  /// the space above the row (below its day rule), in points
  public let gap: CGFloat
  /// letters: "YOU · OCT 14" above the block, "" for none
  public let speakerLabel: String
  /// letters: the 24-hour time at the block's foot, "" for none
  public let timeLabel: String
  /// the words (a recalled line: its note; the voice opening: its caption)
  public let body: String
  /// what VoiceOver reads for the row: whose, the words, the day
  public let a11yLabel: String
  /// a tap does something (letters: open the reader)
  public let tappable: Bool
  public let quote: KChatQuote?
  public let translation: KChatTranslation
  public let translationText: String
  /// the long-press menu, [] for none
  public let menu: [KMenuItem]
  /// a moment's picture (nil while its link isn't signed yet)
  public let photo: KImageRef?
  public let songTitle: String
  public let songHost: String
  /// "{n} songs between you", under the last song; "" for none
  public let shelfLink: String
  /// the voice opening's playback key, "" for none
  public let voiceKey: String
  /// its length, e.g. "1:14"
  public let voiceDuration: String
  public let fold: KChatFold?

  public var id: String { key }

  public init(
    key: String,
    kind: KChatItemKind,
    mine: Bool,
    dayLabel: String = "",
    gap: CGFloat = 0,
    speakerLabel: String = "",
    timeLabel: String = "",
    body: String = "",
    a11yLabel: String = "",
    tappable: Bool = false,
    quote: KChatQuote? = nil,
    translation: KChatTranslation = .none,
    translationText: String = "",
    menu: [KMenuItem] = [],
    photo: KImageRef? = nil,
    songTitle: String = "",
    songHost: String = "",
    shelfLink: String = "",
    voiceKey: String = "",
    voiceDuration: String = "",
    fold: KChatFold? = nil
  ) {
    self.key = key
    self.kind = kind
    self.mine = mine
    self.dayLabel = dayLabel
    self.gap = gap
    self.speakerLabel = speakerLabel
    self.timeLabel = timeLabel
    self.body = body
    self.a11yLabel = a11yLabel
    self.tappable = tappable
    self.quote = quote
    self.translation = translation
    self.translationText = translationText
    self.menu = menu
    self.photo = photo
    self.songTitle = songTitle
    self.songHost = songHost
    self.shelfLink = shelfLink
    self.voiceKey = voiceKey
    self.voiceDuration = voiceDuration
    self.fold = fold
  }
}

/// The few words the rows say that aren't any one item's.
public struct KChatStrings: Equatable, Sendable {
  /// the VoiceOver action on a reply that jumps to the line it quotes
  public var goToQuote = ""
  /// under a line being translated
  public var translating = ""
  /// VoiceOver's name for a moment ("Open photo")
  public var photoOpen = ""
  /// VoiceOver's names for the voice card
  public var playLabel = ""
  public var pauseLabel = ""

  public init() {}
}

/// Wren's notice at the foot of a room.
public struct KChatNotice: Equatable, Sendable {
  /// "WREN NOTICED", in capitals
  public let label: String
  /// what was counted, e.g. "3 LETTERS"
  public let evidence: String
  public let line: String
  /// the shared word, without its #; "" for none
  public let word: String
  /// VoiceOver's name for the ×
  public let closeLabel: String

  public init(label: String, evidence: String, line: String, word: String, closeLabel: String) {
    self.label = label
    self.evidence = evidence
    self.line = line
    self.word = word
    self.closeLabel = closeLabel
  }
}

/// The pen-pal chat's door to names, from the fifth letter on.
public enum KChatSignDoor: String, Sendable {
  case none
  /// SEND THEM YOUR NAME
  case offer
  /// THEY WENT FIRST — SEND YOURS, in gold
  case theirsFirst
  /// YOU WENT FIRST — WAITING ON THEIRS, plain
  case waiting
}

/// What stands in the composer's place.
public enum KChatTerminal: String, Sendable {
  /// the composer
  case none
  /// their account is gone: the room stays readable, nothing can be left
  case gone
  /// thirty days quiet: the REKINDLE card
  case expired
}

/// What the composer is for while not an ordinary line.
public struct KChatMode: Equatable, Sendable {
  /// FOLD A NOTE / ASK SOMETHING / …
  public let title: String
  /// VoiceOver's name for the ×
  public let closeLabel: String
  /// the question's prompt field is shown (ask)
  public let showsPrompt: Bool
  public let promptPlaceholder: String
  /// answering a question: its prompt, read-only; "" for none
  public let promptText: String

  public init(title: String, closeLabel: String, showsPrompt: Bool, promptPlaceholder: String, promptText: String) {
    self.title = title
    self.closeLabel = closeLabel
    self.showsPrompt = showsPrompt
    self.promptPlaceholder = promptPlaceholder
    self.promptText = promptText
  }
}

/// One card of the room's trace tray.
public struct KChatTrace: Identifiable, Equatable, Sendable {
  public let key: String
  public let title: String
  public let subtitle: String
  public let glyph: KLineGlyph

  public var id: String { key }

  public init(key: String, title: String, subtitle: String, glyph: KLineGlyph) {
    self.key = key
    self.title = title
    self.subtitle = subtitle
    self.glyph = glyph
  }
}

/// Everything above and in place of the composer, worded by the owner.
public struct KChatDock: Equatable, Sendable {
  /// "Closes in 3 days…", "" for none
  public var closingText = ""
  /// FIRST CLASS KEEPS IT OPEN, without the ›
  public var closingLink = ""
  public var notice: KChatNotice?
  public var signDoor: KChatSignDoor = .none
  public var signLabel = ""
  /// REPLYING TO …, in capitals; "" for none
  public var replyLabel = ""
  public var replyExcerpt = ""
  public var replyCloseLabel = ""
  public var mode: KChatMode?
  public var terminal: KChatTerminal = .none
  public var goneText = ""
  /// EXPIRED · 31 DAYS QUIET
  public var expiredLabel = ""
  public var expiredBody = ""
  /// REKINDLE
  public var expiredButton = ""
  public var placeholder = ""
  /// SEND, the disabled pill's word and the key's VoiceOver name
  public var sendLabel = ""
  /// sentences; false in song mode (a link)
  public var autocapitalize = true
  /// the Wren tool's VoiceOver name; "" for no tools (the pen-pal chat)
  public var wrenToolLabel = ""
  /// the +'s VoiceOver name, closed and open
  public var plusLabel = ""
  public var plusCloseLabel = ""
  /// the trace tray; [] for none
  public var traces: [KChatTrace] = []

  public init() {}

  /// whether the composer row has the room's two round tools
  public var hasTools: Bool { !wrenToolLabel.isEmpty }
}

/// The dock's three snapshots of Wren (nil until captured: the SF Symbol bird stands in).
public struct KChatBirds: Equatable, Sendable {
  /// the Wren tool, 24pt
  public var tool: KImageRef?
  /// the notice, 20pt
  public var notice: KImageRef?
  /// the expired card, 20pt
  public var expired: KImageRef?

  public init(tool: KImageRef? = nil, notice: KImageRef? = nil, expired: KImageRef? = nil) {
    self.tool = tool
    self.notice = notice
    self.expired = expired
  }
}

/// Where a scroll request goes.
public enum KChatScrollTarget: Equatable, Sendable {
  case top
  case end
  case item(String)
}

/// What the screen's owner says through the live channel. Not observed by the list: only the
/// small views that show these values (the dock, the voice cards, the tray) are.
public final class KConversationDriver: ObservableObject {
  /// One scroll request; the serial makes two requests for the same place two requests.
  public struct ScrollRequest: Equatable, Sendable {
    public let target: KChatScrollTarget
    public let animated: Bool
    /// light the item for a moment (a quote jump)
    public let highlight: Bool
    /// only if the list is at its end when it arrives (a new line to follow)
    public let onlyAtBottom: Bool
    public let serial: Int
  }

  /// the composer's field ("body")
  public let body = KFieldController()
  /// the question's prompt field ("prompt")
  public let prompt = KFieldController()

  /// the words as typed may go (the send key turns on)
  @Published public var canSend = false
  /// the line above the reply quote: over the limit, or a slow network; "" for none
  @Published public var status = ""
  /// the status is a refusal (postmark red), not a note (mute)
  @Published public var statusAlarm = false
  /// a send of what is in the field now is a plain line that goes as soon as it is handed over:
  /// the field clears itself at once (see KConversationActions.onSend)
  public var clearOnSend = false

  /// the voice card's state, for the item whose key is playbackKey
  @Published public var playback: KPlayback?
  @Published public var playbackKey = ""
  /// the voice can't be played yet: there is no signed link at all. The card then takes no taps,
  /// so the owner never says this for a load that failed (offline, a lapsed link): that card stays
  /// pressable, and the press loads it again.
  @Published public var voiceUnavailable = false

  /// the keyboard's overlap at the bottom of the surface, 0 while it is down
  @Published public internal(set) var keyboardHeight: CGFloat = 0
  /// the software keyboard's height at its last rise (the tray takes its place at this height); 0
  /// before any. Only a real software keyboard counts: a hardware keyboard's shortcut bar (55-70pt)
  /// and the heights an interactive dismissal passes through on the way down never do.
  public internal(set) var lastKeyboardHeight: CGFloat = 0
  /// the highest overlap of the keyboard's current rise
  private var risePeak: CGFloat = 0
  /// below this an overlap is a hardware keyboard's shortcut bar, not a keyboard (an SE's is 216)
  static let softwareKeyboardMin: CGFloat = 200
  /// the room's trace tray is open (Swift owns it; the + toggles it)
  @Published public var trayOpen = false

  @Published public private(set) var scrollRequest: ScrollRequest?
  private var serial = 0

  public init() {}

  /// Scrolls the list to its top, its end, or an item.
  public func scroll(to target: KChatScrollTarget, animated: Bool, highlight: Bool = false, onlyAtBottom: Bool = false) {
    serial += 1
    scrollRequest = ScrollRequest(target: target, animated: animated, highlight: highlight, onlyAtBottom: onlyAtBottom, serial: serial)
  }

  /// The keyboard's measured overlap (KConversation calls this).
  func setKeyboard(_ height: CGFloat) {
    let h = max(0, height.rounded())
    if h > 0 {
      // a new rise starts from nothing; on the way down (an interactive dismissal) the peak holds
      if keyboardHeight == 0 { risePeak = 0 }
      risePeak = max(risePeak, h)
      if risePeak > Self.softwareKeyboardMin { lastKeyboardHeight = risePeak }
    }
    if h != keyboardHeight { keyboardHeight = h }
  }

  /// Takes the keyboard from both fields.
  public func blurAll() {
    body.blur()
    prompt.blur()
  }
}

/// What the conversation tells its owner. One object for the life of the surface, so the rows'
/// closures don't make them unequal to themselves between renders. Set the closures once.
public final class KConversationActions {
  /// the list came within reach of its top (load older items)
  public var onReachTop: () -> Void = {}
  /// the list reached its end while the window sits away from the newest (load newer items)
  public var onReachBottom: () -> Void = {}
  /// the end of the list came into reach, or left it
  public var onBottomChange: (Bool) -> Void = { _ in }
  /// a row's part was tapped: the item's key and the part
  public var onItemPress: (_ key: String, _ part: KChatPart) -> Void = { _, _ in }
  /// a menu item (or its VoiceOver action) was chosen: the item's (or fold half's) key, the action's key
  public var onItemAction: (_ key: String, _ action: String) -> Void = { _, _ in }
  /// the reader's edits in the composer (never a setText)
  public var onText: (String) -> Void = { _ in }
  /// the reader's edits in the question's prompt
  public var onPromptText: (String) -> Void = { _ in }
  /// Return or the send key: the body and the prompt as they are, and whether the field cleared
  /// itself (KConversationDriver.clearOnSend). The owner validates exactly these words, puts
  /// them back with a setText if it refuses a cleared send, and clears a send it took that
  /// wasn't cleared.
  public var onSend: (_ value: String, _ prompt: String, _ cleared: Bool) -> Void = { _, _, _ in }
  /// the composer gained or lost the keyboard
  public var onFocus: (Bool) -> Void = { _ in }
  /// a round tool was pressed: "wren" (the + is the surface's own)
  public var onTool: (String) -> Void = { _ in }
  /// a card of the trace tray was chosen
  public var onTrace: (String) -> Void = { _ in }
  /// something in the dock was pressed: replyClose, modeClose, noticeClose, closingLink,
  /// rekindle, sign
  public var onDock: (String) -> Void = { _ in }
  /// the voice card's disc on an item
  public var onVoiceToggle: (String) -> Void = { _ in }

  public init() {}
}

/// The kit's motion, beside KMotion's: the trace tray rising (the composer sheet's curve,
/// .45s cubic-bezier(.25,1.25,.45,1), H:129) and the lit row after a quote jump.
public enum KChatMotion {
  public static let panelRise = Animation.timingCurve(0.25, 1.25, 0.45, 1, duration: 0.45)
  /// The tray opening or closing: the rise, or under Reduce Motion a plain ease with no overshoot
  /// (the list and the dock reflow inside the same transaction, so the curve moves them too).
  public static func tray(reduceMotion: Bool) -> Animation {
    reduceMotion ? .easeOut(duration: 0.2) : panelRise
  }
  /// how long a quoted line stays lit after a jump to it
  public static let litSeconds: Double = 1.4
}
