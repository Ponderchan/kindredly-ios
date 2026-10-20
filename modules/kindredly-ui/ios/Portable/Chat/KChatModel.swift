// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE CONVERSATION KIT'S VALUES (10a step 5, batch 1): what a room with a kindred and a pen-pal
 chat are drawn from. Everything here is plain data, already worded and dated by whoever owns
 the screen (in the React Native app, TS: src/screens/chat/build-items.ts builds every item,
 menu and dock line with today's rules, Adapters/KConversationView.swift turns its records into
 these). Swift decides nothing about who may take a line back or what a fold says.

 - KChatItem: one row of the list, by kind (a room line, a pen-pal letter block, a moment, a
   song, a fold, a line taken back, the voice opening, a This or That, a sky wave).
 - KChatDock: everything above and in place of the composer (the closing line, Wren's notice,
   the sign door, the reply quote, the mode box, the composer bar or the gone line or the expired
   card) and the + tray's four choices; for the pen-pal chat the reply bar's hint, for a room the
   Kindreds bar's words (the ✦ key, the tray's title).
 - KDeck: the openers deck the ✦ key opens (Sparkle, 2026-10-21): a Wave card and four This or
   That cards, worded by TS (build-items buildDeck), sent as the deck command.
 - KChatHeaderModel: the conversation's own header (chat composers, 2026-10-18), drawn by
   KChatHeader above the list: the pen-pal chat's (A2) and the kindreds chat's (B).
 - KConversationDriver: the live channel (the two fields' controllers, canSend and the status
   line, playback, scroll requests, the keyboard's height, the tray, the openers deck). Things
   that change often travel through it, never through the items.
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
  /// a This or That (a fold of kind pick, web 0044): the question, two choices, who picked what
  case pick
  /// a sky wave (a message of kind wave): one postcard, or a wave and its wave back as a pair
  case wave
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
  /// a This or That's first / second choice (only while its state is .choose)
  case pickA
  case pickB
  /// Wave Back under their postcard
  case waveBack
}

/// The sky a wave was sent under, from the sender's local hour only (dawn 5–8, day 8–17, dusk
/// 17–20, night 20–5). Never the time, the place or the weather.
public enum KSky: String, Sendable {
  case dawn
  case day
  case dusk
  case night
}

/// Where a This or That stands for this reader.
public enum KChatPickState: String, Sendable {
  /// mine, waiting for their pick (my own pick shows)
  case waiting
  /// theirs, not picked yet: both choices are buttons
  case choose
  /// theirs, my tap is on its way
  case sending
  /// both have picked: who picked what, and the verdict
  case open
  /// theirs, not picked, in a room nothing can be left in
  case closed
}

/// One choice of a This or That.
public struct KChatPickChoice: Equatable, Sendable {
  public let text: String
  /// "You" | their name | "Both of you" | "", worded by TS
  public let tag: String
  /// "Spicy, you picked it"
  public let a11y: String
  /// I picked it (my own pick shows from the start)
  public let mine: Bool
  /// they picked it (only once open)
  public let theirs: Bool

  public init(text: String, tag: String, a11y: String, mine: Bool, theirs: Bool) {
    self.text = text
    self.tag = tag
    self.a11y = a11y
    self.mine = mine
    self.theirs = theirs
  }
}

/// A This or That in the chat (the pick card).
public struct KChatPick: Equatable, Sendable {
  /// THIS OR THAT, in capitals
  public let label: String
  /// YOU ASKED / MIRA ASKED, in capitals
  public let asker: String
  public let prompt: String
  /// waiting / choose / sending / closed: the line under the choices; open: ""
  public let hint: String
  /// open only: "Opposites. Discuss."
  public let verdict: String
  /// always two
  public let choices: [KChatPickChoice]
  public let state: KChatPickState
  /// open, and both picked the same
  public let same: Bool

  public init(label: String, asker: String, prompt: String, hint: String, verdict: String, choices: [KChatPickChoice], state: KChatPickState, same: Bool) {
    self.label = label
    self.asker = asker
    self.prompt = prompt
    self.hint = hint
    self.verdict = verdict
    self.choices = choices
    self.state = state
    self.same = same
  }
}

/// One sky postcard.
public struct KChatWaveCard: Identifiable, Equatable, Sendable {
  /// the message's key: its menu's actions and its translation are keyed by it
  public let key: String
  public let mine: Bool
  public let sky: KSky
  /// NIGHT, in capitals
  public let label: String
  /// the sender's line
  public let line: String
  /// a pair only: YOUR SKY / MIRA'S SKY, in capitals; "" on a single postcard
  public let whose: String
  /// VoiceOver: "Mira waved. Night sky. Stars are out here."
  public let a11y: String
  public let menu: [KMenuItem]
  public let translation: KChatTranslation
  public let translationText: String

  public var id: String { key }

  public init(key: String, mine: Bool, sky: KSky, label: String, line: String, whose: String, a11y: String, menu: [KMenuItem], translation: KChatTranslation, translationText: String) {
    self.key = key
    self.mine = mine
    self.sky = sky
    self.label = label
    self.line = line
    self.whose = whose
    self.a11y = a11y
    self.menu = menu
    self.translation = translation
    self.translationText = translationText
  }
}

/// A wave in the chat: one postcard, or a wave and its wave back side by side (mine first).
public struct KChatWave: Equatable, Sendable {
  public let cards: [KChatWaveCard]
  /// "Wave Back" under their single postcard; "" for none
  public let backKey: String
  /// VoiceOver: "Wave back with your sky"
  public let backA11y: String

  public init(cards: [KChatWaveCard], backKey: String, backA11y: String) {
    self.cards = cards
    self.backKey = backKey
    self.backA11y = backA11y
  }
}

/// A card of the openers deck.
public enum KDeckCardKind: String, Sendable {
  case wave
  case pick
}

/// One card of the openers deck, worded by TS.
public struct KDeckCard: Identifiable, Equatable, Sendable {
  /// "wave" | "pick:<n>"
  public let key: String
  public let kind: KDeckCardKind
  /// WAVE / THIS OR THAT, in capitals
  public let label: String
  /// pick only: the question and its two choices
  public let prompt: String
  public let a: String
  public let b: String
  /// wave: NIGHT, in capitals
  public let skyLabel: String
  /// wave: the line that will go; pick: "Pick yours, then send."
  public let line: String
  /// shown in place of the send disc while disabled: "Waved" | "3 waiting"
  public let note: String
  public let a11y: String
  /// wave: the live sky now; pick: .day (unused)
  public let sky: KSky
  public let disabled: Bool

  public var id: String { key }

  public init(key: String, kind: KDeckCardKind, label: String, prompt: String, a: String, b: String, skyLabel: String, line: String, note: String, a11y: String, sky: KSky, disabled: Bool) {
    self.key = key
    self.kind = kind
    self.label = label
    self.prompt = prompt
    self.a = a
    self.b = b
    self.skyLabel = skyLabel
    self.line = line
    self.note = note
    self.a11y = a11y
    self.sky = sky
    self.disabled = disabled
  }
}

/// The openers deck the ✦ key opens: [wave, pick × 4]. Empty = no deck (the pen-pal chat).
public struct KDeck: Equatable, Sendable {
  /// "Openers"
  public var title = ""
  /// VoiceOver names of the header keys and the send disc, and the cards' "Another"
  public var shuffleLabel = ""
  public var closeLabel = ""
  public var sendLabel = ""
  public var anotherLabel = ""
  /// "" or the waiting-cap line
  public var status = ""
  public var cards: [KDeckCard] = []

  public init() {}

  public var isEmpty: Bool { cards.isEmpty }
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
  /// letters (the React Native fallback): "YOU · OCT 14" above the block, "" for none
  public let speakerLabel: String
  /// letters (the SwiftUI cards, A2): the head line inside the card, "LETTER 3 · NO. 5422" or
  /// "LETTER 3 · YOU" (the opening: "WHERE IT BEGAN · NO. 5422"), already in capitals; "" for none
  public let head: String
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
  /// a This or That (kind .pick)
  public let pick: KChatPick?
  /// a sky wave (kind .wave)
  public let wave: KChatWave?

  public var id: String { key }

  public init(
    key: String,
    kind: KChatItemKind,
    mine: Bool,
    dayLabel: String = "",
    gap: CGFloat = 0,
    speakerLabel: String = "",
    head: String = "",
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
    fold: KChatFold? = nil,
    pick: KChatPick? = nil,
    wave: KChatWave? = nil
  ) {
    self.key = key
    self.kind = kind
    self.mine = mine
    self.dayLabel = dayLabel
    self.gap = gap
    self.speakerLabel = speakerLabel
    self.head = head
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
    self.pick = pick
    self.wave = wave
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

/// A + tray card's ground (chat composers B, Prompt 6): a 10a mood's fill, or the theme's sf.
public enum KChatTraceTint: String, Sendable {
  /// #DDEFD6: Fold a note
  case calm
  /// #E4E2F4: Ask something
  case tired
  /// #CFE3F5: Tiny moment
  case low
  /// #F6E7C6: Leave a song
  case happy
  case none

  var mood: KMood? {
    switch self {
    case .calm: return .calm
    case .tired: return .tired
    case .low: return .low
    case .happy: return .happy
    case .none: return nil
    }
  }
}

/// One card of the room's + tray.
public struct KChatTrace: Identifiable, Equatable, Sendable {
  public let key: String
  public let title: String
  public let subtitle: String
  public let glyph: KLineGlyph
  public let tint: KChatTraceTint

  public var id: String { key }

  public init(key: String, title: String, subtitle: String, glyph: KLineGlyph, tint: KChatTraceTint = .none) {
    self.key = key
    self.title = title
    self.subtitle = subtitle
    self.glyph = glyph
    self.tint = tint
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
  /// what the door does, for VoiceOver (identity on: it opens the signing sheet); "" for none
  public var signHint = ""
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
  /// the React Native room's Wren tool, for VoiceOver (the Kindreds bar has the ideas key in its
  /// place, and doesn't read this); "" in the pen-pal chat
  public var wrenToolLabel = ""
  /// the +'s VoiceOver name, closed and open
  public var plusLabel = ""
  public var plusCloseLabel = ""
  /// the + tray; [] for none
  public var traces: [KChatTrace] = []
  /// the Kindreds bar's ✦ key (it opens the openers deck), for VoiceOver; "" for no Kindreds bar
  /// (the pen-pal chat)
  public var ideasLabel = ""
  /// over the + tray's cards: "Leave something small", as written
  public var trayTitle = ""
  /// the pen-pal chat's reply bar hint, over the bar while the keyboard is up: "LETTER 4 OF 5",
  /// "LETTER 5 OF 5 · ONE MORE AND NAMES", once your five are in the band's line; already in
  /// capitals, "" for none
  public var hint = ""
  /// the reply bar's emoji key, for VoiceOver
  public var emojiLabel = ""

  public init() {}

  /// whether the composer is the Kindreds bar (a room: the ✦ key, the capsule, the +), not
  /// the reply bar (the pen-pal chat)
  public var hasTools: Bool { !ideasLabel.isEmpty }
}

/// The dock's three snapshots of Wren (nil until captured: the SF Symbol bird stands in).
public struct KChatBirds: Equatable, Sendable {
  /// the Wren tool, 24pt: drawn by nothing since the Kindreds bar put the ideas key in its place
  /// (chat composers B); kept so an older owner that still sends it decodes
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

/// The colour the pen-pal header's line under the name wears (lib/thread-state's tone key).
public enum KChatTone: String, Sendable {
  /// the theme's mute: LETTER 3 OF 5 · THEIRS, ACCOUNT CLOSED, YOU WENT FIRST
  case mute
  /// the theme's ind
  case ind
  /// the seal's brass: SWAP NAMES?, THEY WENT FIRST (wax gold on Midnight)
  case brass
}

/// The frame around a pen pal's face once it has come through (components/CorrespondentFace):
/// none while it develops, a quiet line when their five are in, brass when they also went first.
public enum KChatFaceFrame: String, Sendable {
  case none
  case line
  case brass
}

/// The conversation's own header, worded by TS: the pen-pal chat's (chat composers A2,
/// build-items lettersHeader) or the kindreds chat's (B, roomHeader).
public struct KChatHeaderModel: Equatable, Sendable {
  /// the kindreds chat's: `face` round, 44 across, and no band; false for the pen-pal chat's
  /// FACE v1 (mask, veil, frame) and the progress band under it
  public var room = false
  /// room: the kindred's face as TS resolved it (their portrait, the glyph, the veil)
  public var face: KFaceSource = .placeholder
  /// "No. 5422" (identity switch on: the courier name, "Sunday Kite")
  public var name = ""
  /// the line under it, already in capitals: "LETTER 3 OF 5 · THEIRS", or the state when it is
  /// past the letters (SWAP NAMES?, ACCOUNT CLOSED, …); "" for none
  public var sub = ""
  public var tone: KChatTone = .mute
  /// FACE v1, bit row × 5 + column (TS mosaicMask with their letters' develop)
  public var mask = 0
  /// identity switch on: the pen pal's frosted window, drawn in the face slot instead of the
  /// mosaic (it never develops; the frame and the band stay); nil while the switch is off
  public var frost: KFrostSpec?
  /// identity switch on: the ♀/♂ mark after the name (an ink glyph in sub); nil for none
  public var mark: KLineGlyph?
  /// identity switch on: the star sign after the mark; nil for none
  public var sign: KLineGlyph?
  /// a deleted account (or not loaded yet): the veil in faint
  public var veil = true
  /// the identity switch is on: the veil is the flat veil tile (a square, like the windows)
  /// rather than the mosaic's
  public var veilTile = false
  public var frame: KChatFaceFrame = .none
  /// a First Class member's stamp round the face (C2): "1ST" or "007"; "" for none. In the
  /// pen-pal header it replaces the frame (decision D-8); never on a veil
  public var stamp = ""
  /// the progress band under the header's rule (live 1.0.4's, owner 2026-10-19); nil for none
  /// (names traded, a deleted account, the kindreds chat)
  public var band: KChatBandModel?
  /// VoiceOver: the face, the name and the line, as one (the band says the counts)
  public var a11yLabel = ""
  /// the face and name open their page (only once you know their voice)
  public var canOpenPage = false
  /// VoiceOver: the back chevron
  public var backLabel = ""
  /// VoiceOver: the ⋯ (Report or block); "" hides it (nobody to report)
  public var moreLabel = ""

  public init() {}
}

/// The pen-pal chat's progress band, worded by TS (build-items lettersBand, bandFacts):
///   YOU ■■□□□   NO. 8768 ■□□□□
///   3 MORE FROM YOU · 4 FROM THEM → NAMES
public struct KChatBandModel: Equatable, Sendable {
  /// your letters, 0…5; a side with all five is drawn in ind
  public var me = 0
  /// theirs, 0…5
  public var them = 0
  /// the second line, already in capitals
  public var line = ""
  /// both fives are in: the line in ind
  public var named = false
  /// "YOU"
  public var youLabel = ""
  /// the pen pal's name in capitals: "NO. 8768" (identity switch on: the courier name)
  public var themLabel = ""
  /// VoiceOver: the band as one element
  public var a11y = ""

  public init() {}
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
  /// the room's + tray is open (Swift owns it; the + toggles it)
  @Published public var trayOpen = false
  /// the room's openers deck is open (Swift owns it; the ✦ key toggles it). Never with the
  /// tray, never with the keyboard (Prompt 3: the three panels shut each other)
  @Published public var ideasOpen = false
  /// the openers deck (TS's deck command: TS keeps the walk, the sky and the cap)
  @Published public var deck = KDeck()

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
  /// rekindle, sign; or in the pen-pal header: back, page (the face and name), more (the ⋯)
  public var onDock: (String) -> Void = { _ in }
  /// the voice card's disc on an item
  public var onVoiceToggle: (String) -> Void = { _ in }
  /// the openers deck: open, close, shuffle, another (a card's key), send (a card's key and the
  /// chip chosen on it, 0/1, or -1 for the Wave card)
  public var onDeck: (_ action: String, _ key: String, _ choice: Int) -> Void = { _, _, _ in }

  public init() {}
}

/// The kit's motion, beside KMotion's (chat composers B, 2026-10-18): the + tray rising, the +
/// turning, the ideas bubble and the tray's cards popping in, and the lit row after a quote jump.
public enum KChatMotion {
  /// the + tray's rise: height 0 → 270, .45s cubic-bezier(.3,1,.3,1) (Prompt 6), no overshoot
  public static let panelRise = Animation.timingCurve(0.3, 1, 0.3, 1, duration: 0.45)
  /// The tray opening or closing: the rise, or under Reduce Motion a plain ease (the list and the
  /// dock reflow inside the same transaction, so the curve moves them too; the tray itself only
  /// fades then).
  public static func tray(reduceMotion: Bool) -> Animation {
    reduceMotion ? .easeOut(duration: 0.2) : panelRise
  }
  /// The Kindreds bar's + turning 45° and filling: .35s cubic-bezier(.3,1.3,.4,1), a springy
  /// overshoot (Prompt 3; KMotion.plusTurn's sibling); a plain ease under Reduce Motion.
  public static func plusTurn(reduceMotion: Bool) -> Animation {
    reduceMotion ? .easeInOut(duration: 0.2) : .timingCurve(0.3, 1.3, 0.4, 1, duration: 0.35)
  }
  /// kpopin (Prompts 4 and 6): translateY 10 → 0, scale .96 → 1, opacity 0 → 1 on CSS's default
  /// ease; the bubble takes .3s, the tray's cards .35s.
  public static func popIn(_ duration: Double) -> Animation {
    .timingCurve(0.25, 0.1, 0.25, 1, duration: duration)
  }
  /// how long a quoted line stays lit after a jump to it
  public static let litSeconds: Double = 1.4
}
