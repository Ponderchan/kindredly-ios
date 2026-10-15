import SwiftUI
import UIKit
import ExpoModulesCore
import ExpoUI

/*
 A ROOM WITH A KINDRED AND A PEN-PAL CHAT, as React Native sees them (10a step 5, batch 1): one
 view for both, <KConversationView … /> on the JS side (modules/kindredly-ui/src/Conversation.tsx),
 drawn by src/screens/chat/ConversationNative.tsx under the React Native header. This file turns
 props into Portable values and the surface's actions into events; the surface itself is
 Portable/Chat/KConversation.swift (rows KChatRows, dock KDock, tray KTraceTray, values
 KChatModel).

 Built as every step-5 screen is (KScreenProps.swift): the props subclass KScreenProps (theme,
 letterFont, insets, rev, commands), the view is registered with ExpoUIView and the "command"
 AsyncFunction (KindredlyUIModule.swift), and it MUST sit in an @expo/ui <Host> — one Host for
 the whole screen, never one per row. It holds two KFields (the composer and the question's
 prompt), so it is an ExpoSwiftUI.FocusableView: the virtual view resigns them before the view
 is taken off screen (the expo focus/unmount crash's guard; the TS side also blurs on unmount).

 Props, beyond KScreenProps:
 - variant: "room" | "letters"
 - items: [KChatItemRecord], the render window, oldest first; converted once per rev
 - hasOlder, hasNewer: the window has items before it / has slid away from the newest
 - dock: KChatDockRecord (small; converted on each body run)
 - strings: KChatStringsRecord
 - toolBird, noticeBird, expiredBird: Wren's dock snapshots (KImageRefRecord, uri "" for none)
 - insets.bottom: the home indicator's inset (the Host ignores it)

 Commands (KCommandBus), everything that changes often:
 - setText  { target: "body" | "prompt", value }   seed, clear after a send, restore after a failure
 - focus    { target: "body" | "prompt" }
 - blur     { }
 - scrollTo { key: "end" | "top" | <item key>, animated, highlight?, onlyAtBottom? }
 - playback { key, playing, positionS, durationS, at, failed }
 - composer { canSend, status, statusAlarm, clearOnSend }
 - tray     { open }
 - reset    { }

 Events, with what nativeEvent carries (named onChat… so none clashes with React Native's own):
 - onChatReachTop {}, onChatReachBottom {}, onChatBottomChange { atBottom }
 - onChatItemPress { key, part }            part: body | photo | song | quote | fold | shelf | voice
 - onChatItemAction { key, action }
 - onChatText { value }, onChatPromptText { value }
 - onChatSend { value, prompt, cleared }
 - onChatFocus { focused }
 - onChatTool { tool }                      "wren"
 - onChatTrace { key }
 - onChatDock { action }                    replyClose | modeClose | noticeClose | closingLink | rekindle | sign
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

/// One card of the trace tray.
struct KChatTraceRecord: Record {
  @Field var key: String = ""
  @Field var title: String = ""
  @Field var subtitle: String = ""
  /// a KLineGlyph name: note | ask | moment | song | photo | bug | idea
  @Field var glyph: String = "note"

  var trace: KChatTrace {
    KChatTrace(key: key, title: title, subtitle: subtitle, glyph: KLineGlyph(rawValue: glyph) ?? .note)
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

  var chatDock: KChatDock {
    var d = KChatDock()
    d.closingText = closingText
    d.closingLink = closingLink
    d.notice = noticeLine.isEmpty
      ? nil
      : KChatNotice(label: noticeLabel, evidence: noticeEvidence, line: noticeLine, word: noticeWord, closeLabel: noticeCloseLabel)
    d.signDoor = KChatSignDoor(rawValue: signDoor) ?? .none
    d.signLabel = signLabel
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
    return d
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
      if driver.trayOpen { driver.trayOpen = false }
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
      if open { driver.blurAll() }
      if driver.trayOpen != open { driver.trayOpen = open }
    case KCommandName.reset:
      driver.blurAll()
      driver.body.clear()
      driver.prompt.clear()
      driver.canSend = false
      driver.status = ""
      driver.statusAlarm = false
      driver.clearOnSend = false
      driver.trayOpen = false
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
