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
   emojiLabel both bars', ideasLabel … trayTitle the Kindreds bar's (B; ideasLabel "" for none)
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
 - idea     { text }                                the sentence the room's ideas bubble offers
 - reset    { }

 Events, with what nativeEvent carries (named onChat… so none clashes with React Native's own):
 - onChatReachTop {}, onChatReachBottom {}, onChatBottomChange { atBottom }
 - onChatItemPress { key, part }            part: body | photo | song | quote | fold | shelf | voice
 - onChatItemAction { key, action }
 - onChatText { value }, onChatPromptText { value }
 - onChatSend { value, prompt, cleared }
 - onChatFocus { focused }
 - onChatTool { tool }                      "wren" (nothing sends it since the Kindreds bar; kept for the type)
 - onChatTrace { key }
 - onChatDock { action }                    replyClose | modeClose | noticeClose | closingLink | rekindle | sign,
                                            ideaNext | ideaUse (the ideas bubble),
                                            and the header's back | page | more
 - onChatVoice { key }

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

/// One row, everything already worded and dated by TS (src/screens/chat/build-items.ts).
/// Flat, so every field has a value: TS sends "" and false for what a kind doesn't use.
struct KChatItemRecord: Record {
  @Field var key: String = ""
  /// line | letter | photo | song | fold | recalled | voice
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
        : nil
    )
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
  /// the Kindreds bar (B): the ideas key's VoiceOver name ("" for no Kindreds bar), the bubble's
  /// three words in capitals, the + tray's title
  @Field var ideasLabel: String = ""
  @Field var ideaLabel: String = ""
  @Field var ideaAnother: String = ""
  @Field var ideaUse: String = ""
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
    d.ideaLabel = ideaLabel
    d.ideaAnother = ideaAnother
    d.ideaUse = ideaUse
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

  func header(theme: KTheme) -> KChatHeaderModel? {
    guard show else { return nil }
    var h = KChatHeaderModel()
    h.room = room
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
      // the keyboard takes the tray's place and the ideas bubble's (the panels shut each other)
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
    case "idea":
      let text = args.kString("text") ?? ""
      if driver.idea != text { driver.idea = text }
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
      driver.idea = ""
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
