import SwiftUI
import UIKit
import ExpoModulesCore
import ExpoUI

/*
 THE TODAY TAB as React Native sees it: <KTodayView … /> on the JS side
 (modules/kindredly-ui/src/Today.tsx), drawn by src/screens/today/TodayNative.tsx in one
 full-screen Host (SurfaceHost field: ignoreSafeArea "container", so the keyboard's safe area
 stays and the reply strip rides it). This file turns records into Portable values and taps into
 events; the desk itself is Portable/Today/KTodayDesk.swift and knows nothing about Expo.

 Built as every step-5 screen is (KScreenProps.swift): the props subclass KScreenProps (theme,
 letterFont, insets, rev, commands), the view is registered with ExpoUIView and the "command"
 AsyncFunction (KindredlyUIModule.swift), and it MUST sit in an @expo/ui <Host>: one Host for the
 whole screen, never one per card. It holds a KField, so it is an ExpoSwiftUI.FocusableView: the
 virtual view resigns it before the view is taken off screen (the expo focus/unmount crash's guard;
 TS also blurs it on unmount).

 Props, beyond KScreenProps (insets: top = the status bar the desk draws its strip for,
 tabBarRoom = the floating bar's room, the pill sits 6 above it):
 - strings: the plate (title, rightLabel), the desk strip's line ("" = none) and every fixed word
   of the cards and the dock (KTodayStringsRecord)
 - arrival: { open, line, states: [sealed | current | opened], labels, values }
 - cards: one record per desk letter (KTodayCardRecord), converted once per rev
 - freshUnfold: the first card unfolds as it arrives
 - endPage: the desk has loaded, so the blind is the last page
 - pillHidden: a send in flight, the reader open or the + sheet up
 - anchor: { id, serial } where the reader's page goes after the cards changed under it
 - children: <KSlot name="deskBird">, <KSlot name="arrivalBird">, <KSlot name="endPage">, every
   one on every render (src/Slot.tsx)

 Commands (KCommandBus):
 - setText { target: "reply", value }   seed the reply field (the bound letter's draft)
 - focus { target: "reply" } · blur {}
 - scrollTo { key: "top" | <card id>, animated }
 - playback { key, playing, positionS, durationS, at, failed }   the one voice player
 - composer { letterId, sendState, hint, hintWarn, preview, sending, sendSerial }
 - lock { held }   the blind's cord is held: the stack stops scrolling
 - reset {}   the field lets go

 Events, with what nativeEvent carries:
 - onTodayCardIndex { index }               the card the stack settled on (cards.count = the blind)
 - onTodayReplyChange { letterId, text }    the reader's edit
 - onTodayReplySend { letterId, text, serial }   the send key (enabled or dimmed)
 - onTodayReplyFocus { focused }
 - onTodayCardAction { letterId, action }   unfold | translate | report | block | voice
 - onTodayDeskStrip {}
 - onTodayEnvelope { index }

 Unknown enum strings fall back rather than fail (a capsule kind this binary doesn't know draws
 none, an unknown send state is disabled, an unknown envelope is sealed). This file imports
 ExpoUI, whose public Button would make a bare "Button" ambiguous, so nothing of that kind is
 written here.
 */

struct KTodayCapsuleRecord: Record {
  /// none | translate | signal
  @Field var kind: String = "none"
  @Field var code: String = ""
  @Field var label: String = ""
  @Field var enabled: Bool = true
  @Field var value: String = ""
  /// rings | clock | stickers
  @Field var glyph: String = "rings"

  var capsule: KCardCapsule {
    switch kind {
    case "translate": return .translate(code: code, label: label, enabled: enabled, value: value)
    case "signal": return .signal(label: label, glyph: KAurasClose.Glyph(rawValue: glyph) ?? .rings)
    default: return .none
    }
  }
}

struct KTodayCardRecord: Record {
  @Field var id: String = ""
  @Field var postmark: String = ""
  @Field var mask: Int = 0
  @Field var ghost: Bool = false
  @Field var stampId: String = ""
  @Field var stampHex: String = ""
  @Field var stampName: String = ""
  @Field var topic: String = ""
  @Field var topicWash: String = ""
  @Field var topicInk: String = ""
  @Field var topicLine: String = ""
  @Field var body: String = ""
  @Field var bodySize: Double = 30
  @Field var bodyLine: Double = 40
  @Field var bodyCenter: Bool = true
  @Field var isVoice: Bool = false
  @Field var voiceReady: Bool = false
  @Field var caption: String = ""
  @Field var durationLabel: String = ""
  @Field var capsule: KTodayCapsuleRecord = KTodayCapsuleRecord()
  @Field var menu: [KMenuActionRecord] = []
  @Field var a11yLabel: String = ""

  var model: KLetterCardModel {
    var m = KLetterCardModel()
    m.id = id
    m.postmark = postmark
    m.mask = mask
    m.ghost = ghost
    m.stampId = stampId
    m.stampHex = stampHex
    m.stampName = stampName
    m.topic = topic
    m.topicWash = topicWash
    m.topicInk = topicInk
    m.topicLine = topicLine
    m.body = body
    m.bodySize = CGFloat(bodySize)
    m.bodyLine = CGFloat(bodyLine)
    m.bodyCenter = bodyCenter
    m.isVoice = isVoice
    m.voiceReady = voiceReady
    m.caption = caption
    m.durationLabel = durationLabel
    m.capsule = capsule.capsule
    m.menu = menu.map { KMenuItem(key: $0.key, title: $0.title, systemImage: $0.icon, destructive: $0.destructive) }
    m.a11yLabel = a11yLabel
    return m
  }
}

struct KTodayArrivalRecord: Record {
  @Field var open: Bool = false
  @Field var line: String = ""
  @Field var states: [String] = []
  @Field var labels: [String] = []
  @Field var values: [String] = []

  var arrival: KTodayArrival {
    var a = KTodayArrival()
    a.open = open
    a.line = line
    a.states = states.map { KEnvelopeState(rawValue: $0) ?? .sealed }
    a.labels = labels
    a.values = values
    return a
  }
}

/// Every word of the desk that isn't on a card's record (KTodayStrings in TS).
struct KTodayStringsRecord: Record {
  @Field var title: String = ""
  @Field var rightLabel: String = ""
  @Field var deskStrip: String = ""
  @Field var pass: String = ""
  @Field var reply: String = ""
  @Field var replyA11y: String = ""
  @Field var unfold: String = ""
  @Field var unfoldA11y: String = ""
  @Field var voiceLetter: String = ""
  @Field var more: String = ""
  @Field var next: String = ""
  @Field var previous: String = ""
  @Field var play: String = ""
  @Field var pause: String = ""
  @Field var placeholder: String = ""
  @Field var send: String = ""

  var labels: KTodayLabels {
    var l = KTodayLabels()
    l.pass = pass
    l.reply = reply
    l.replyA11y = replyA11y
    l.unfold = unfold
    l.unfoldA11y = unfoldA11y
    l.voiceLetter = voiceLetter
    l.more = more
    l.next = next
    l.previous = previous
    l.play = play
    l.pause = pause
    l.placeholder = placeholder
    l.send = send
    return l
  }
}

struct KTodayAnchorRecord: Record {
  @Field var id: String = ""
  @Field var serial: Int = 0
}

final class KTodayViewProps: KScreenProps {
  @Field var strings: KTodayStringsRecord = KTodayStringsRecord()
  @Field var arrival: KTodayArrivalRecord = KTodayArrivalRecord()
  @Field var cards: [KTodayCardRecord] = []
  @Field var freshUnfold: Bool = false
  @Field var endPage: Bool = false
  @Field var pillHidden: Bool = false
  @Field var anchor: KTodayAnchorRecord = KTodayAnchorRecord()

  var onTodayCardIndex = EventDispatcher()
  var onTodayReplyChange = EventDispatcher()
  var onTodayReplySend = EventDispatcher()
  var onTodayReplyFocus = EventDispatcher()
  var onTodayCardAction = EventDispatcher()
  var onTodayDeskStrip = EventDispatcher()
  var onTodayEnvelope = EventDispatcher()

  /// The stack's scroll state, the dock (with the field) and the voice: as long-lived as the view.
  let driver = KTodayDriver()
  let dock = KTodayDock()
  let voice = KTodayVoice()

  /// The desk's taps, made once: each closure reaches this props object's events.
  private(set) lazy var actions: KTodayActions = {
    let a = KTodayActions()
    a.onCardIndex = { [weak self] index in self?.onTodayCardIndex(["index": index]) }
    a.onReplyChange = { [weak self] id, text in self?.onTodayReplyChange(["letterId": id, "text": text]) }
    a.onReplySend = { [weak self] id, text, serial in self?.onTodayReplySend(["letterId": id, "text": text, "serial": serial]) }
    a.onReplyFocus = { [weak self] focused in self?.onTodayReplyFocus(["focused": focused]) }
    a.onCardAction = { [weak self] id, action in self?.onTodayCardAction(["letterId": id, "action": action]) }
    a.onDeskStrip = { [weak self] in self?.onTodayDeskStrip() }
    a.onEnvelope = { [weak self] index in self?.onTodayEnvelope(["index": index]) }
    return a
  }()

  /// One command from the bus (see the list at the top of the file).
  func handle(_ name: String, _ args: [String: Any]) {
    switch name {
    case KCommandName.setText:
      if args.kString("target") == "reply" { dock.reply.setText(args.kString("value") ?? "") }
    case KCommandName.focus:
      if args.kString("target") == "reply" { dock.reply.focus() }
    case KCommandName.blur, KCommandName.reset:
      dock.reply.blur()
    case KCommandName.scrollTo:
      guard let request = KScrollRequest(args) else { return }
      let animated = args.kBool("animated") ?? true
      switch request {
      case .top: driver.scroll(to: .top, animated: animated)
      case .end: break
      case let .key(id): driver.scroll(to: .card(id), animated: animated)
      }
    case KCommandName.playback:
      let key = args.kString("key") ?? ""
      let playback = key.isEmpty ? nil : KPlayback(
        playing: args.kBool("playing") ?? false,
        positionS: args.kDouble("positionS") ?? 0,
        durationS: args.kDouble("durationS") ?? 0,
        at: args.kDate("at") ?? Date()
      )
      voice.apply(key: key, playback: playback, failed: args.kBool("failed") ?? false)
    case KCommandName.composer:
      var c = KTodayComposer()
      c.letterId = args.kString("letterId") ?? ""
      c.sendState = KSendState(rawValue: args.kString("sendState") ?? "") ?? .disabled
      c.hint = args.kString("hint") ?? ""
      c.hintWarn = args.kBool("hintWarn") ?? false
      c.preview = args.kString("preview") ?? ""
      c.sending = args.kBool("sending") ?? false
      c.sendSerial = args.kInt("sendSerial") ?? 0
      dock.apply(c)
    case "lock":
      let held = args.kBool("held") ?? false
      if driver.scrollLocked != held { driver.scrollLocked = held }
    default:
      break
    }
  }
}

struct KTodayView: ExpoSwiftUI.View {
  @ObservedObject var props: KTodayViewProps

  var body: some View {
    var content = KTodayContent()
    let strings = props.strings
    content.title = strings.title
    content.rightLabel = strings.rightLabel
    content.deskStrip = strings.deskStrip
    content.labels = strings.labels
    content.arrival = props.arrival.arrival
    content.freshUnfold = props.freshUnfold
    content.cards = props.cached("cards") { props.cards.map(\.model) }
    content.endPage = props.endPage
    content.pillHidden = props.pillHidden
    content.anchor = KTodayAnchor(id: props.anchor.id, serial: props.anchor.serial)
    let children = props.children
    return KTodayDesk(
      theme: props.kTheme,
      content: content,
      topInset: props.insets.top,
      tabBarRoom: props.insets.tabBarRoom,
      driver: props.driver,
      dock: props.dock,
      voice: props.voice,
      actions: props.actions,
      deskBird: children?.kSlot("deskBird").map { AnyView($0) },
      arrivalBird: children?.kSlot("arrivalBird").map { AnyView($0) },
      endPage: children?.kSlot("endPage").map { AnyView($0) }
    )
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
  }
}

extension KTodayView: ExpoSwiftUI.FocusableView {
  /// Before the view goes: the keyboard away if the reply field has it, then the field told it has
  /// lost focus (as @expo/ui's TextFieldView does, TextFieldView.swift:57-64).
  func forceResignFirstResponder() {
    let reply = props.dock.reply
    if reply.isFocused {
      _ = UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
    reply.blur()
  }
}
