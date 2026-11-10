import SwiftUI
import UIKit
import ExpoModulesCore
import ExpoUI

/*
 A ROOM WITH A KINDRED AND A PEN-PAL CHAT, as React Native sees them (10a step 5, batch 1): one
 view for both, <KConversationView … /> on the JS side (modules/kindredly-ui/src/Conversation.tsx),
 drawn by src/screens/chat/ConversationNative.tsx with its own header (chat composers,
 2026-10-18: header, below; a pen-pal chat already revealed keeps a React Native one above).
 This file turns props into Portable values and the surface's actions into events; the surface
 itself is Portable/Chat/KConversation.swift (rows KChatRows, dock KDock with its bars KReplyBar
 and KKindredBar, tray KTraceTray, values KChatModel).

 Built as every step-5 screen is (KScreenProps.swift): the props subclass KScreenProps (theme,
 letterFont, insets, rev, commands), the view is registered with ExpoUIView and the "command"
 AsyncFunction (KindredlyUIModule.swift), and it MUST sit in an @expo/ui <Host> — one Host for
 the whole screen, never one per row. It holds two fields (the composer, a KComposerField in both
 bars, and the question's prompt, a KField), so it is an
 ExpoSwiftUI.FocusableView: the virtual view resigns them before the view is taken off screen
 (the expo focus/unmount crash's guard; the TS side also blurs on unmount).

 Props, beyond KScreenProps:
 - variant: "room" | "letters"
 - items: [KChatItemRecord], the render window, oldest first; converted once per rev
 - hasOlder, hasNewer: the window has items before it / has slid away from the newest
 - dock: KChatDockRecord (small; converted on each body run); hint is the pen-pal reply bar's,
   emojiLabel both bars', ideasLabel and trayTitle the Kindreds bar's (B; ideasLabel "" for none)
 - header: KChatHeaderRecord, the conversation's own header (the pen-pal chat's, A2; the
   kindreds chat's, room: true, B, with the face flattened: faceKind image | mosaic | veil |
   placeholder, faceUri, faceKey, faceOverscan, faceMask; with the identity switch on the pen
   pal's frost, mark and sign, "" / NO_FROST for none, and identity, which turns the veil into
   the flat veil tile); show: false (the default) draws none,
   and a React Native header stands above
 - strings: KChatStringsRecord
 - toolBird, noticeBird, expiredBird: Wren's dock snapshots (KImageRefRecord, uri "" for none);
   toolBird is drawn by nothing since the Kindreds bar (B) and is no longer sent
 - insets.bottom: the home indicator's inset (the Host ignores it); insets.top: the status bar's
   room over the conversation's own header (0 under a React Native header)

 Commands (KCommandBus), everything that changes often:
 - setText  { target: "body" | "prompt", value }   seed, clear after a send, restore after a failure
 - focus    { target: "body" | "prompt" }
 - blur     { }
 - scrollTo { key: "end" | "top" | <item key>, animated, highlight?, onlyAtBottom? }
 - playback { key, playing, positionS, durationS, at, failed }
 - composer { canSend, status, statusAlarm, clearOnSend }
 - tray     { open }
 - deck     { title, shuffleLabel, closeLabel, sendLabel, anotherLabel, status, cards: [{ key,
              kind, label, prompt, a, b, sky, skyLabel, line, disabled, note, a11y }] }
                                                    the openers deck the ✦ key opens (Sparkle)
 - reset    { }

 Events, with what nativeEvent carries (named onChat… so none clashes with React Native's own):
 - onChatReachTop {}, onChatReachBottom {}, onChatBottomChange { atBottom }
 - onChatItemPress { key, part }            part: body | photo | song | quote | fold | shelf | voice |
                                            pickA | pickB (a This or That's choice) | waveBack
 - onChatItemAction { key, action }
 - onChatText { value }, onChatPromptText { value }
 - onChatSend { value, prompt, cleared }
 - onChatFocus { focused }
 - onChatTool { tool }                      "wren" (nothing sends it since the Kindreds bar; kept for the type)
 - onChatTrace { key }
 - onChatDock { action }                    replyClose | modeClose | noticeClose | closingLink | rekindle | sign,
                                            and the header's back | page | more
 - onChatVoice { key }
 - onChatDeck { action, key, choice }       the openers deck: open | close | shuffle | another
                                            (key: the card's) | send (key, choice 0/1, -1 for the
                                            Wave card)

 Unknown enum strings fall back (theme to Classic in KScreenProps, a kind to line, a glyph to
 note, a state to its resting value). This file imports ExpoUI, whose public Button, Text and
 Image would make the bare names ambiguous, so nothing of that kind is written here.
 */

// MARK: - Records

/// One opened half of a fold, as TS sends it.
struct KChatFoldHalfRecord: Record {
  @Field var key: String = ""
  @Field var mine: Bool = false
  @Field var speaker: String = ""
  @Field var body: String = ""
  @Field var menu: [KMenuActionRecord] = []
  /// "none" | "busy" | "shown"
  @Field var translation: String = "none"
  @Field var translationText: String = ""

  var half: KChatFoldHalf {
    KChatFoldHalf(
      key: key,
      mine: mine,
      speaker: speaker,
      body: body,
      menu: menu.map(\.chatMenuItem),
      translation: KChatTranslation(rawValue: translation) ?? .none,
      translationText: translationText
    )
  }
}

/// One choice of a This or That, as TS sends it.
struct KChatPickChoiceRecord: Record {
  @Field var text: String = ""
  @Field var mine: Bool = false
  @Field var theirs: Bool = false
  @Field var tag: String = ""
  @Field var a11y: String = ""

  var choice: KChatPickChoice {
    KChatPickChoice(text: text, tag: tag, a11y: a11y, mine: mine, theirs: theirs)
  }
}

/// One sky postcard, as TS sends it.
struct KChatWaveCardRecord: Record {
  @Field var key: String = ""
  @Field var mine: Bool = false
  /// dawn | day | dusk | night
  @Field var sky: String = "day"
  @Field var label: String = ""
  @Field var line: String = ""
  @Field var whose: String = ""
  @Field var menu: [KMenuActionRecord] = []
  /// "none" | "busy" | "shown"
  @Field var translation: String = "none"
  @Field var translationText: String = ""
  @Field var a11y: String = ""

  var card: KChatWaveCard {
    KChatWaveCard(
      key: key,
      mine: mine,
      sky: KSky(rawValue: sky) ?? .day,
      label: label,
      line: line,
      whose: whose,
      a11y: a11y,
      menu: menu.map(\.chatMenuItem),
      translation: KChatTranslation(rawValue: translation) ?? .none,
      translationText: translationText
    )
  }
}

/// One row, everything already worded and dated by TS (src/screens/chat/build-items.ts).
/// Flat, so every field has a value: TS sends "" and false for what a kind doesn't use.
struct KChatItemRecord: Record {
  @Field var key: String = ""
  /// line | letter | photo | song | fold | recalled | voice | pick | wave
  @Field var kind: String = "line"
  @Field var mine: Bool = false
  @Field var dayLabel: String = ""
  @Field var gap: Double = 0
  @Field var speakerLabel: String = ""
  /// letters: the card's head line, "LETTER 3 · NO. 5422"
  @Field var head: String = ""
  @Field var timeLabel: String = ""
  @Field var body: String = ""
  @Field var a11yLabel: String = ""
  @Field var tappable: Bool = false
  @Field var hasQuote: Bool = false
  @Field var quoteSpeaker: String = ""
  @Field var quoteExcerpt: String = ""
  @Field var quoteGone: Bool = false
  @Field var quoteTarget: String = ""
  @Field var translation: String = "none"
  @Field var translationText: String = ""
  @Field var menu: [KMenuActionRecord] = []
  @Field var photo: KImageRefRecord = KImageRefRecord()
  @Field var songTitle: String = ""
  @Field var songHost: String = ""
  @Field var shelfLink: String = ""
  @Field var voiceKey: String = ""
  @Field var voiceDuration: String = ""
  @Field var foldKindLabel: String = ""
  @Field var foldPrompt: String = ""
  /// open | waiting | sealed
  @Field var foldState: String = "sealed"
  @Field var foldHint: String = ""
  @Field var foldAnswerKey: String = ""
  @Field var foldHalves: [KChatFoldHalfRecord] = []
  /// a This or That (kind pick)
  @Field var pickLabel: String = ""
  @Field var pickAsker: String = ""
  @Field var pickPrompt: String = ""
  /// waiting | choose | sending | open | closed
  @Field var pickState: String = "waiting"
  @Field var pickHint: String = ""
  @Field var pickVerdict: String = ""
  @Field var pickSame: Bool = false
  @Field var pickChoices: [KChatPickChoiceRecord] = []
  /// a sky wave (kind wave): one card, or two for a wave and its wave back
  @Field var waveCards: [KChatWaveCardRecord] = []
  @Field var waveBackKey: String = ""
  @Field var waveBackA11y: String = ""

  var chatItem: KChatItem {
    let kind = KChatItemKind(rawValue: kind) ?? .line
    return KChatItem(
      key: key,
      kind: kind,
      mine: mine,
      dayLabel: dayLabel,
      gap: CGFloat(max(0, gap)),
      speakerLabel: speakerLabel,
      head: head,
      timeLabel: timeLabel,
      body: body,
      a11yLabel: a11yLabel,
      tappable: tappable,
      quote: hasQuote ? KChatQuote(speaker: quoteSpeaker, excerpt: quoteExcerpt, gone: quoteGone, target: quoteTarget) : nil,
      translation: KChatTranslation(rawValue: translation) ?? .none,
      translationText: translationText,
      menu: menu.map(\.chatMenuItem),
      photo: photo.ref,
      songTitle: songTitle,
      songHost: songHost,
      shelfLink: shelfLink,
      voiceKey: voiceKey,
      voiceDuration: voiceDuration,
      fold: kind == .fold
        ? KChatFold(
          kindLabel: foldKindLabel,
          prompt: foldPrompt,
          state: KChatFoldState(rawValue: foldState) ?? .sealed,
          hint: foldHint,
          answerKey: foldAnswerKey,
          halves: foldHalves.map(\.half)
        )
        : nil,
      pick: kind == .pick
        ? KChatPick(
          label: pickLabel,
          asker: pickAsker,
          prompt: pickPrompt,
          hint: pickHint,
          verdict: pickVerdict,
          choices: pickChoices.map(\.choice),
          state: KChatPickState(rawValue: pickState) ?? .waiting,
          same: pickSame
        )
        : nil,
      wave: kind == .wave
        ? KChatWave(cards: waveCards.map(\.card), backKey: waveBackKey, backA11y: waveBackA11y)
        : nil
    )
  }
}

/// The openers deck command's cards (args, not a Record: commands carry plain dictionaries).
extension KDeck {
  init(args: [String: Any]) {
    self.init()
    title = args.kString("title") ?? ""
    shuffleLabel = args.kString("shuffleLabel") ?? ""
    closeLabel = args.kString("closeLabel") ?? ""
    sendLabel = args.kString("sendLabel") ?? ""
    anotherLabel = args.kString("anotherLabel") ?? ""
    status = args.kString("status") ?? ""
    cards = (args["cards"] as? [[String: Any]] ?? []).compactMap { c in
      guard let key = c.kString("key"), !key.isEmpty else { return nil }
      return KDeckCard(
        key: key,
        kind: KDeckCardKind(rawValue: c.kString("kind") ?? "") ?? .pick,
        label: c.kString("label") ?? "",
        prompt: c.kString("prompt") ?? "",
        a: c.kString("a") ?? "",
        b: c.kString("b") ?? "",
        skyLabel: c.kString("skyLabel") ?? "",
        line: c.kString("line") ?? "",
        note: c.kString("note") ?? "",
        a11y: c.kString("a11y") ?? "",
        sky: KSky(rawValue: c.kString("sky") ?? "") ?? .day,
        disabled: c.kBool("disabled") ?? false
      )
    }
  }
}

/// One card of the + tray.
struct KChatTraceRecord: Record {
  @Field var key: String = ""
  @Field var title: String = ""
  @Field var subtitle: String = ""
  /// a KLineGlyph name: foldNote | askSomething | tinyMoment | leaveSong (the I1 four), or note |
  /// ask | moment | song | photo | bug | idea
  @Field var glyph: String = "note"
  /// calm | tired | low | happy | none
  @Field var tint: String = "none"

  var trace: KChatTrace {
    KChatTrace(key: key, title: title, subtitle: subtitle, glyph: KLineGlyph(rawValue: glyph) ?? .note, tint: KChatTraceTint(rawValue: tint) ?? .none)
  }
}

/// Everything above and in place of the composer, worded by TS. "" means none for every text.
struct KChatDockRecord: Record {
  @Field var closingText: String = ""
  @Field var closingLink: String = ""
  @Field var noticeLabel: String = ""
  @Field var noticeEvidence: String = ""
  @Field var noticeLine: String = ""
  @Field var noticeWord: String = ""
  @Field var noticeCloseLabel: String = ""
  /// none | offer | theirsFirst | waiting
  @Field var signDoor: String = "none"
  @Field var signLabel: String = ""
  /// what the door does, for VoiceOver ("" for none)
  @Field var signHint: String = ""
  @Field var replyLabel: String = ""
  @Field var replyExcerpt: String = ""
  @Field var replyCloseLabel: String = ""
  @Field var modeTitle: String = ""
  @Field var modeCloseLabel: String = ""
  @Field var modeShowsPrompt: Bool = false
  @Field var modePromptPlaceholder: String = ""
  @Field var modePromptText: String = ""
  /// none | gone | expired
  @Field var terminal: String = "none"
  @Field var goneText: String = ""
  @Field var expiredLabel: String = ""
  @Field var expiredBody: String = ""
  @Field var expiredButton: String = ""
  @Field var placeholder: String = ""
  @Field var sendLabel: String = ""
  @Field var autocapitalize: Bool = true
  @Field var wrenToolLabel: String = ""
  @Field var plusLabel: String = ""
  @Field var plusCloseLabel: String = ""
  @Field var traces: [KChatTraceRecord] = []
  /// the pen-pal reply bar's hint (already in capitals) and the bars' emoji key's VoiceOver name
  @Field var hint: String = ""
  @Field var emojiLabel: String = ""
  /// the Kindreds bar (B): the ✦ key's VoiceOver name ("" for no Kindreds bar), the + tray's title
  @Field var ideasLabel: String = ""
  @Field var trayTitle: String = ""

  var chatDock: KChatDock {
    var d = KChatDock()
    d.closingText = closingText
    d.closingLink = closingLink
    d.notice = noticeLine.isEmpty
      ? nil
      : KChatNotice(label: noticeLabel, evidence: noticeEvidence, line: noticeLine, word: noticeWord, closeLabel: noticeCloseLabel)
    d.signDoor = KChatSignDoor(rawValue: signDoor) ?? .none
    d.signLabel = signLabel
    d.signHint = signHint
    d.replyLabel = replyLabel
    d.replyExcerpt = replyExcerpt
    d.replyCloseLabel = replyCloseLabel
    d.mode = modeTitle.isEmpty
      ? nil
      : KChatMode(title: modeTitle, closeLabel: modeCloseLabel, showsPrompt: modeShowsPrompt, promptPlaceholder: modePromptPlaceholder, promptText: modePromptText)
    d.terminal = KChatTerminal(rawValue: terminal) ?? .none
    d.goneText = goneText
    d.expiredLabel = expiredLabel
    d.expiredBody = expiredBody
    d.expiredButton = expiredButton
    d.placeholder = placeholder
    d.sendLabel = sendLabel
    d.autocapitalize = autocapitalize
    d.wrenToolLabel = wrenToolLabel
    d.plusLabel = plusLabel
    d.plusCloseLabel = plusCloseLabel
    d.traces = traces.map(\.trace)
    d.hint = hint
    d.emojiLabel = emojiLabel
    d.ideasLabel = ideasLabel
    d.trayTitle = trayTitle
    return d
  }
}

/// The pen-pal chat's progress band (build-items lettersBand). show: false draws none.
struct KChatBandRecord: Record {
  @Field var show: Bool = false
  @Field var me: Int = 0
  @Field var them: Int = 0
  @Field var line: String = ""
  @Field var named: Bool = false
  @Field var youLabel: String = ""
  @Field var themLabel: String = ""
  @Field var a11y: String = ""

  var band: KChatBandModel? {
    guard show else { return nil }
    var b = KChatBandModel()
    b.me = min(5, max(0, me))
    b.them = min(5, max(0, them))
    b.line = line
    b.named = named
    b.youLabel = youLabel
    b.themLabel = themLabel
    b.a11y = a11y
    return b
  }
}

/// The conversation's own header (build-items lettersHeader, roomHeader). show: false draws none.
struct KChatHeaderRecord: Record {
  @Field var show: Bool = false
  /// the kindreds chat's (B): the round face below, no band
  @Field var room: Bool = false
  /// image | mosaic | veil | placeholder (lib/faces faceRecord, flattened)
  @Field var faceKind: String = "placeholder"
  @Field var faceUri: String = ""
  @Field var faceKey: String = ""
  @Field var faceOverscan: Double = 0
  @Field var faceMask: Int = 0
  @Field var name: String = ""
  @Field var sub: String = ""
  /// mute | ind | brass
  @Field var tone: String = "mute"
  @Field var mask: Int = 0
  /// identity switch on: the pen pal's frosted window (NO_FROST off, and for the room)
  @Field var frost: KFrostRecord = KFrostRecord()
  /// identity switch on: she | he | "" after the name
  @Field var mark: String = ""
  /// identity switch on: aries … pisces | "" after the mark
  @Field var sign: String = ""
  @Field var veil: Bool = true
  /// the identity switch is on: the veil is the flat veil tile
  @Field var identity: Bool = false
  /// none | line | brass
  @Field var frame: String = "none"
  /// a First Class member's stamp round the face (C2): "1ST" | "007" | ""
  @Field var stamp: String = ""
  /// the progress band under the rule (lettersBand); show: false for none
  @Field var band: KChatBandRecord = KChatBandRecord()
  @Field var a11yLabel: String = ""
  @Field var canOpenPage: Bool = false
  @Field var backLabel: String = ""
  @Field var moreLabel: String = ""
  /// a pen-pal chat seen in place after names are traded ("chatheader"): the React Native
  /// ChatHeader's "letters" variant, drawn by KChatHeaderRevealed (room true for the round face)
  @Field var revealed: Bool = false
  /// this reader muted the correspondence: the bell.slash after the name
  @Field var muted: Bool = false

  func header(theme: KTheme) -> KChatHeaderModel? {
    guard show else { return nil }
    var h = KChatHeaderModel()
    h.room = room
    h.revealed = revealed
    h.muted = muted
    switch faceKind {
    case "image": h.face = .image(faceUri.isEmpty ? nil : KImageRef(uri: faceUri, key: faceKey), overscan: CGFloat(faceOverscan))
    case "mosaic": h.face = .mosaic(mask: faceMask, tint: theme.ink)
    case "veil": h.face = .veil
    default: h.face = .placeholder
    }
    h.name = name
    h.sub = sub
    h.stamp = stamp
    h.tone = KChatTone(rawValue: tone) ?? .mute
    h.mask = mask
    h.frost = frost.spec
    h.mark = KLineGlyph.mark(mark)
    h.sign = KLineGlyph.sign(sign)
    h.veil = veil
    h.veilTile = identity
    h.frame = KChatFaceFrame(rawValue: frame) ?? .none
    h.band = room ? nil : band.band
    h.a11yLabel = a11yLabel
    h.canOpenPage = canOpenPage
    h.backLabel = backLabel
    h.moreLabel = moreLabel
    return h
  }
}

/// The words the rows share.
struct KChatStringsRecord: Record {
  @Field var goToQuote: String = ""
  @Field var translating: String = ""
  @Field var photoOpen: String = ""
  @Field var playLabel: String = ""
  @Field var pauseLabel: String = ""

  var chatStrings: KChatStrings {
    var s = KChatStrings()
    s.goToQuote = goToQuote
    s.translating = translating
    s.photoOpen = photoOpen
    s.playLabel = playLabel
    s.pauseLabel = pauseLabel
    return s
  }
}

extension KMenuActionRecord {
  /// kit-portable's menu item for .kMenu (named for this file, so another adapter can add its own)
  var chatMenuItem: KMenuItem {
    KMenuItem(key: key, title: title, systemImage: icon, destructive: destructive)
  }
}

// MARK: - Props

final class KConversationViewProps: KScreenProps {
  /// "room" | "letters"
  @Field var variant: String = "room"
  @Field var items: [KChatItemRecord] = []
  @Field var hasOlder: Bool = false
  @Field var hasNewer: Bool = false
  @Field var dock: KChatDockRecord = KChatDockRecord()
  @Field var header: KChatHeaderRecord = KChatHeaderRecord()
  @Field var strings: KChatStringsRecord = KChatStringsRecord()
  @Field var toolBird: KImageRefRecord = KImageRefRecord()
  @Field var noticeBird: KImageRefRecord = KImageRefRecord()
  @Field var expiredBird: KImageRefRecord = KImageRefRecord()

  var onChatReachTop = EventDispatcher()
  var onChatReachBottom = EventDispatcher()
  var onChatBottomChange = EventDispatcher()
  var onChatItemPress = EventDispatcher()
  var onChatItemAction = EventDispatcher()
  var onChatText = EventDispatcher()
  var onChatPromptText = EventDispatcher()
  var onChatSend = EventDispatcher()
  var onChatFocus = EventDispatcher()
  var onChatTool = EventDispatcher()
  var onChatTrace = EventDispatcher()
  var onChatDock = EventDispatcher()
  var onChatVoice = EventDispatcher()
  var onChatDeck = EventDispatcher()

  /// The fields, canSend and the status line, playback, scroll requests, the keyboard, the
  /// tray: as long-lived as the view, like `commands`.
  let driver = KConversationDriver()

  /// The surface's actions, made once: each closure reaches this props object's events.
  private(set) lazy var actions: KConversationActions = {
    let a = KConversationActions()
    a.onReachTop = { [weak self] in self?.onChatReachTop() }
    a.onReachBottom = { [weak self] in self?.onChatReachBottom() }
    a.onBottomChange = { [weak self] in self?.onChatBottomChange(["atBottom": $0]) }
    a.onItemPress = { [weak self] key, part in self?.onChatItemPress(["key": key, "part": part.rawValue]) }
    a.onItemAction = { [weak self] key, action in self?.onChatItemAction(["key": key, "action": action]) }
    a.onText = { [weak self] in self?.onChatText(["value": $0]) }
    a.onPromptText = { [weak self] in self?.onChatPromptText(["value": $0]) }
    a.onSend = { [weak self] value, prompt, cleared in
      self?.onChatSend(["value": value, "prompt": prompt, "cleared": cleared])
    }
    a.onFocus = { [weak self] in self?.onChatFocus(["focused": $0]) }
    a.onTool = { [weak self] in self?.onChatTool(["tool": $0]) }
    a.onTrace = { [weak self] in self?.onChatTrace(["key": $0]) }
    a.onDock = { [weak self] in self?.onChatDock(["action": $0]) }
    a.onVoiceToggle = { [weak self] in self?.onChatVoice(["key": $0]) }
    a.onDeck = { [weak self] in self?.onChatDeck(["action": $0, "key": $1, "choice": $2]) }
    return a
  }()

  var chatVariant: KChatVariant {
    KChatVariant(rawValue: variant) ?? .room
  }

  /// The field a command names: "prompt" is the question's prompt, anything else the composer.
  private func field(_ target: String?) -> KFieldController {
    target == "prompt" ? driver.prompt : driver.body
  }

  /// One command from the bus (see the list at the top of the file).
  func handle(_ name: String, _ args: [String: Any]) {
    switch name {
    case KCommandName.setText:
      field(args.kString("target")).setText(args.kString("value") ?? "")
    case KCommandName.focus:
      // a composer collapsed under the gone line or the expired card never takes the keyboard
      guard dock.terminal == "none" else { return }
      let target = field(args.kString("target"))
      // the keyboard takes the tray's place and the deck's (the panels shut each other)
      if driver.trayOpen { driver.trayOpen = false }
      if driver.ideasOpen { driver.ideasOpen = false }
      target.focus()
    case KCommandName.blur:
      driver.blurAll()
    case KCommandName.scrollTo:
      guard let request = KScrollRequest(args) else { return }
      let animated = args.kBool("animated") ?? true
      let highlight = args.kBool("highlight") ?? false
      let onlyAtBottom = args.kBool("onlyAtBottom") ?? false
      switch request {
      case .top: driver.scroll(to: .top, animated: animated, onlyAtBottom: onlyAtBottom)
      case .end: driver.scroll(to: .end, animated: animated, onlyAtBottom: onlyAtBottom)
      case let .key(key): driver.scroll(to: .item(key), animated: animated, highlight: highlight, onlyAtBottom: onlyAtBottom)
      }
    case KCommandName.playback:
      let key = args.kString("key") ?? ""
      driver.playbackKey = key
      driver.voiceUnavailable = args.kBool("failed") ?? false
      driver.playback = key.isEmpty ? nil : KPlayback(
        playing: args.kBool("playing") ?? false,
        positionS: args.kDouble("positionS") ?? 0,
        durationS: args.kDouble("durationS") ?? 0,
        at: args.kDate("at") ?? Date()
      )
    case KCommandName.composer:
      let canSend = args.kBool("canSend") ?? false
      if driver.canSend != canSend { driver.canSend = canSend }
      let status = args.kString("status") ?? ""
      if driver.status != status { driver.status = status }
      let alarm = args.kBool("statusAlarm") ?? false
      if driver.statusAlarm != alarm { driver.statusAlarm = alarm }
      driver.clearOnSend = args.kBool("clearOnSend") ?? false
    case "tray":
      let open = args.kBool("open") ?? false
      if open {
        driver.blurAll()
        if driver.ideasOpen { driver.ideasOpen = false }
      }
      if driver.trayOpen != open { driver.trayOpen = open }
    case "deck":
      let deck = KDeck(args: args)
      if driver.deck != deck { driver.deck = deck }
    case KCommandName.reset:
      driver.blurAll()
      driver.body.clear()
      driver.prompt.clear()
      driver.canSend = false
      driver.status = ""
      driver.statusAlarm = false
      driver.clearOnSend = false
      driver.trayOpen = false
      driver.ideasOpen = false
      driver.deck = KDeck()
      driver.playback = nil
      driver.playbackKey = ""
    default:
      break
    }
  }
}

// MARK: - The view

struct KConversationView: ExpoSwiftUI.View {
  @ObservedObject var props: KConversationViewProps

  var body: some View {
    let items = props.cached("items") { props.items.map(\.chatItem) }
    KConversation(
      theme: props.kTheme,
      variant: props.chatVariant,
      items: items,
      hasOlder: props.hasOlder,
      hasNewer: props.hasNewer,
      dock: props.dock.chatDock,
      strings: props.strings.chatStrings,
      birds: KChatBirds(tool: props.toolBird.ref, notice: props.noticeBird.ref, expired: props.expiredBird.ref),
      bottomInset: props.insets.bottom,
      header: props.header.header(theme: props.kTheme),
      topInset: props.insets.top,
      driver: props.driver,
      actions: props.actions
    )
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
  }
}

extension KConversationView: ExpoSwiftUI.FocusableView {
  /// Before the view goes: the keyboard away if one of our fields has it, then both fields told
  /// they have lost focus (as @expo/ui's TextFieldView does, TextFieldView.swift:57-64).
  func forceResignFirstResponder() {
    let driver = props.driver
    if driver.body.isFocused || driver.prompt.isFocused {
      _ = UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
    driver.blurAll()
  }
}

// MARK: - THE ONE-LETTER READER

/*
 THE ONE-LETTER READER as React Native sees it: <KReaderView … /> (modules/kindredly-ui/src/
 Reader.tsx), drawn by src/screens/chat/ReaderNative.tsx on the model the React Native reader
 shares (src/screens/chat/useReaderModel.ts), for src/app/thread/[id].tsx behind the "reader"
 NativeSurface switch. The surface is KReaderScreen at the end of Portable/Chat/KChatRows.swift;
 this adapter lives here, beside the conversation's, so the module needs no pod install.

 Props, beyond KScreenProps:
 - hero: KReaderHeroRecord, the letter being read with every word resolved (show false: none
   yet). The face flattened: faceKind none | image | mosaic | frost | veil | tile | placeholder
   (tile: a deleted account with the identity switch on), faceUri, faceKey, faceOverscan,
   faceMask, faceFrost (NO_FROST for none); paper is the letter's paper id (KPaper(key:)).
 - earlier: [KReaderLetterRecord], the other letters, oldest first (converted once per rev)
 - strings: KReaderStringsRecord: the header, the offline lines, the closed line, the bar's words
 - insets.top: the status bar's room over the header; insets.bottom: the home indicator's

 Commands: setText { value } (the reply bar; any target), focus, blur, composer { canSend, hint,
 hintAlarm } (per keystroke), playback { key, playing, positionS, durationS, at, failed }, reset.

 Events (onReader…, so none clashes with React Native's own): onReaderBack {}, onReaderMore
 { top } (window points), onReaderTranslate {}, onReaderText { value }, onReaderSend { value },
 onReaderFocus { focused }, onReaderVoice { key }, onReaderStamp { action: keep | report }.

 It holds a field, so it is an ExpoSwiftUI.FocusableView like the conversation.
 */

struct KReaderHeroRecord: Record {
  @Field var show: Bool = false
  @Field var key: String = ""
  @Field var paper: String = "plain"
  @Field var faceKind: String = "none"
  @Field var faceUri: String = ""
  @Field var faceKey: String = ""
  @Field var faceOverscan: Double = 0
  @Field var faceMask: Int = 0
  @Field var faceFrost: KFrostRecord = KFrostRecord()
  @Field var faceRound: Bool = false
  @Field var faceSize: Double = 24
  @Field var memberStamp: String = ""
  @Field var name: String = ""
  @Field var mark: String = ""
  @Field var sign: String = ""
  @Field var when: String = ""
  @Field var postmark: String = ""
  @Field var state: String = ""
  /// mute | ind | brass
  @Field var tone: String = "mute"
  @Field var headA11y: String = ""
  @Field var stampId: String = ""
  @Field var stampHex: String = ""
  @Field var delivered: Bool = false
  @Field var stampLetterId: String = ""
  @Field var stampA11y: String = ""
  @Field var isVoice: Bool = false
  @Field var voiceKey: String = ""
  @Field var voiceDuration: String = ""
  @Field var body: String = ""
  @Field var size: Double = 21
  @Field var line: Double = 33
  @Field var center: Bool = false
  @Field var topic: String = ""
  @Field var topicHex: String = ""
  @Field var translates: Bool = false
  @Field var translateCode: String = ""
  @Field var translateLabel: String = ""
  @Field var translateBusy: Bool = false
  @Field var betweenLabel: String = ""
  @Field var hideLabel: String = ""
  @Field var replyLabel: String = ""

  var hero: KReaderHero? {
    guard show else { return nil }
    var h = KReaderHero()
    h.key = key
    h.paper = KPaper(key: paper)
    switch faceKind {
    case "image": h.face = .image(faceUri.isEmpty ? nil : KImageRef(uri: faceUri, key: faceKey), overscan: CGFloat(faceOverscan))
    case "mosaic": h.face = .mosaic(faceMask)
    case "frost": h.face = faceFrost.spec.map { .frost($0) } ?? .veil
    case "veil": h.face = .veil
    case "tile": h.face = .frostVeil
    case "placeholder": h.face = .placeholder
    default: h.face = .none
    }
    h.faceRound = faceRound
    h.faceSize = CGFloat(faceSize)
    h.memberStamp = memberStamp
    h.name = name
    h.mark = KLineGlyph.mark(mark)
    h.sign = KLineGlyph.sign(sign)
    h.when = when
    h.postmark = postmark
    h.state = state
    h.tone = KChatTone(rawValue: tone) ?? .mute
    h.headA11y = headA11y
    h.stampId = stampId
    h.stampHex = stampHex
    h.delivered = delivered
    h.stampLetterId = stampLetterId
    h.stampA11y = stampA11y
    h.isVoice = isVoice
    h.voiceKey = voiceKey
    h.voiceDuration = voiceDuration
    h.body = body
    h.size = CGFloat(size)
    h.line = CGFloat(line)
    h.center = center
    h.topic = topic
    h.topicHex = topicHex
    h.translates = translates
    h.translateCode = translateCode
    h.translateLabel = translateLabel
    h.translateBusy = translateBusy
    h.betweenLabel = betweenLabel
    h.hideLabel = hideLabel
    h.replyLabel = replyLabel
    return h
  }
}

struct KReaderLetterRecord: Record {
  @Field var key: String = ""
  @Field var mine: Bool = false
  @Field var body: String = ""
  @Field var signature: String = ""
  @Field var isVoice: Bool = false
  @Field var a11y: String = ""

  var letter: KReaderLetter {
    KReaderLetter(id: key, mine: mine, body: body, signature: signature, isVoice: isVoice, a11y: a11y)
  }
}

struct KReaderStringsRecord: Record {
  @Field var title: String = ""
  @Field var backLabel: String = ""
  @Field var moreLabel: String = ""
  @Field var offlineTitle: String = ""
  @Field var offlineBody: String = ""
  @Field var closed: String = ""
  @Field var composer: Bool = false
  @Field var placeholder: String = ""
  @Field var sendLabel: String = ""
  @Field var emojiLabel: String = ""
  @Field var playLabel: String = ""
  @Field var pauseLabel: String = ""
}

final class KReaderViewProps: KScreenProps {
  @Field var hero: KReaderHeroRecord = KReaderHeroRecord()
  @Field var earlier: [KReaderLetterRecord] = []
  @Field var strings: KReaderStringsRecord = KReaderStringsRecord()

  var onReaderBack = EventDispatcher()
  var onReaderMore = EventDispatcher()
  var onReaderTranslate = EventDispatcher()
  var onReaderText = EventDispatcher()
  var onReaderSend = EventDispatcher()
  var onReaderFocus = EventDispatcher()
  var onReaderVoice = EventDispatcher()
  var onReaderStamp = EventDispatcher()

  /// The reply field, canSend and the hint, playback: as long-lived as the view.
  let driver = KReaderDriver()

  private(set) lazy var actions: KReaderActions = {
    let a = KReaderActions()
    a.onBack = { [weak self] in self?.onReaderBack() }
    a.onMore = { [weak self] in self?.onReaderMore(["top": Double($0)]) }
    a.onTranslate = { [weak self] in self?.onReaderTranslate() }
    a.onText = { [weak self] in self?.onReaderText(["value": $0]) }
    a.onSend = { [weak self] in self?.onReaderSend(["value": $0]) }
    a.onFocus = { [weak self] in self?.onReaderFocus(["focused": $0]) }
    a.onVoice = { [weak self] in self?.onReaderVoice(["key": $0]) }
    a.onStamp = { [weak self] in self?.onReaderStamp(["action": $0]) }
    return a
  }()

  /// The page as KReaderScreen takes it; the earlier letters converted once per rev.
  var content: KReaderContent {
    var c = KReaderContent()
    c.title = strings.title
    c.backLabel = strings.backLabel
    c.moreLabel = strings.moreLabel
    c.hero = hero.hero
    c.earlier = cached("earlier") { earlier.map(\.letter) }
    c.offlineTitle = strings.offlineTitle
    c.offlineBody = strings.offlineBody
    c.closed = strings.closed
    c.composer = strings.composer
    c.placeholder = strings.placeholder
    c.sendLabel = strings.sendLabel
    c.emojiLabel = strings.emojiLabel
    c.playLabel = strings.playLabel
    c.pauseLabel = strings.pauseLabel
    return c
  }

  func handle(_ name: String, _ args: [String: Any]) {
    switch name {
    case KCommandName.setText:
      driver.reply.setText(args.kString("value") ?? "")
    case KCommandName.focus:
      guard strings.composer, strings.closed.isEmpty else { return }
      driver.reply.focus()
    case KCommandName.blur:
      driver.reply.blur()
    case KCommandName.composer:
      let canSend = args.kBool("canSend") ?? false
      if driver.canSend != canSend { driver.canSend = canSend }
      let hint = args.kString("hint") ?? ""
      if driver.hint != hint { driver.hint = hint }
      let alarm = args.kBool("hintAlarm") ?? false
      if driver.hintAlarm != alarm { driver.hintAlarm = alarm }
    case KCommandName.playback:
      let key = args.kString("key") ?? ""
      driver.playbackKey = key
      driver.voiceUnavailable = args.kBool("failed") ?? false
      driver.playback = key.isEmpty ? nil : KPlayback(
        playing: args.kBool("playing") ?? false,
        positionS: args.kDouble("positionS") ?? 0,
        durationS: args.kDouble("durationS") ?? 0,
        at: args.kDate("at") ?? Date()
      )
    case KCommandName.reset:
      driver.reply.blur()
      driver.reply.clear()
      driver.canSend = false
      driver.hint = ""
      driver.hintAlarm = false
      driver.playback = nil
      driver.playbackKey = ""
    default:
      break
    }
  }
}

struct KReaderView: ExpoSwiftUI.View {
  @ObservedObject var props: KReaderViewProps

  var body: some View {
    KReaderScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: props.insets.top,
      bottomInset: props.insets.bottom,
      driver: props.driver,
      actions: props.actions
    )
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
  }
}

extension KReaderView: ExpoSwiftUI.FocusableView {
  /// Before the view goes: the keyboard away if the reply field has it, then the field told.
  func forceResignFirstResponder() {
    let reply = props.driver.reply
    if reply.isFocused {
      _ = UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
    reply.blur()
  }
}
