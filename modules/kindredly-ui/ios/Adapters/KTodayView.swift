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
 whole screen, never one per card. It holds a field (the reply bar's KComposerField, a UITextView
 since the chat composers' emoji key, 2026-10-18), so it is an ExpoSwiftUI.FocusableView: the
 virtual view resigns it before the view is taken off screen (the expo focus/unmount crash's guard;
 TS also blurs it on unmount). It has no children and no islands: Wren is drawn here, from her own
 BirdSnapshots pictures (birds).

 Props, beyond KScreenProps (insets: top = the status bar the desk draws its strip for,
 tabBarRoom = the floating bar's room, the band sits 2 above it, bottom = the home indicator, over
 which the reply bar sits with a hardware keyboard while the tab bar is away):
 - strings: the plate's title and every fixed word of the cards, the band and the dock (emoji:
   the reply bar's emoji key, for VoiceOver)
 - phase: loading | offline | reading | done (anything else is loading)
 - left, leftA11y: kept for the record; the B8 band shows no count and says strings.nextA11y
 - cards: the letters not passed yet, the one on screen first (KTodayCardRecord: who wrote it,
   KTodayWhoRecord, with the frosted window as a KFrostRecord, when, the switch-off postmark
   line that keeps the old docket while the identity switch is off, and the paper id the card is
   drawn on), converted once per rev
 - titleLocked: the plate stays small (a letter passed today, or the day done)
 - freshUnfold, arrivalLine: her first arrival (the first card unfolds; her line over her head)
 - wrenLetter: her counted note in done; window: the window to her game, its sky by the hour
 - birds: her five pictures { idle, curious, delight, sleepy, fly, flyIsPerch } (an empty uri = none)
 - night: her yawn hours; plus: closed | sheet | pop (anything else is closed); hideBand (NEXT and
   REPLY step aside: a send in flight, or the reader open)
 - wren: Wren on the band { rest: idle | sleepy (anything else is idle), carry (moves as each reply
   leaves: she takes the letter and comes back), reader (the reader is open), a11y, name }. Her
   hop's haptic is SwiftUI's sensoryFeedback in Portable (KWireWren), so nothing here for it

 Commands (KCommandBus):
 - setText { target: "reply", value }   seed the reply field (the bound letter's draft)
 - focus { target: "reply" } · blur {}
 - playback { key, playing, positionS, durationS, at, failed }   the one voice player
 - composer { letterId, sendState, hint, hintWarn, preview, sending, sendSerial }
 - reset {}   the field lets go

 Events, with what nativeEvent carries:
 - onTodayPass { letterId }                 a card passed (the swipe, NEXT, VoiceOver's "Next letter")
 - onTodayBringBack {}                      the ⋯'s Bring back the last letter
 - onTodayReplyOpen { letterId }            REPLY opened the field for the shown letter
 - onTodayWindow {}                         the window, while she can play
 - onTodayReplyChange { letterId, text }    the reader's edit
 - onTodayReplySend { letterId, text, serial }   the send key (enabled or dimmed)
 - onTodayReplyFocus { focused }        reply mode (the chat composers' A1, owner 2026-10-18): TS
                                        slides the tab bar away while it is true (another Host)
 - onTodayCardAction { letterId, action }   unfold | translate | report | block | voice
 - onTodayStampMenu { letterId, action }    a stranger's photo stamp, long-pressed: keep | report

 Unknown enum strings fall back rather than fail (a capsule kind this binary doesn't know draws
 none, an unknown send state is disabled, an unknown phase is loading, an unknown plus is closed,
 a colour that isn't #RRGGBB keeps the night sky's). This file imports ExpoUI, whose public Button
 would make a bare "Button" ambiguous, so nothing of that kind is written here.
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

/// Who wrote a card (today-cards CardWho, flattened by Today.tsx nativeTodayCards): the name, the
/// mark and the sign ("" for none), and the face slot: mosaic (mask) | frost (frost) | veil | tile
/// (the identity switch's veil, a flat veil tile). Unknown strings draw nothing for a glyph and
/// the veil for a face.
struct KTodayWhoRecord: Record {
  @Field var name: String = ""
  /// she | he | ""
  @Field var mark: String = ""
  /// aries … pisces | ""
  @Field var sign: String = ""
  /// mosaic | frost | veil | tile
  @Field var face: String = "veil"
  @Field var mask: Int = 0
  @Field var frost: KFrostRecord = KFrostRecord()

  var who: KCardWho {
    let slot: KCardWho.Face
    switch face {
    case "mosaic": slot = .mosaic(mask)
    case "frost": slot = frost.spec.map { .frost($0) } ?? .frostVeil
    case "tile": slot = .frostVeil
    default: slot = .veil
    }
    return KCardWho(name: name, mark: KLineGlyph.mark(mark), sign: KLineGlyph.sign(sign), face: slot)
  }
}

struct KTodayCardRecord: Record {
  @Field var id: String = ""
  @Field var who: KTodayWhoRecord = KTodayWhoRecord()
  /// "SEP.23", the date alone
  @Field var when: String = ""
  /// the switch-off docket line ("SEP.23 · NO.7273"); "" with the identity switch on
  @Field var postmark: String = ""
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
  @Field var replyPlaceholder: String = ""
  /// the letter's paper id ("plain" … "riso", src/data/papers.ts); "" or unknown is plain
  @Field var paper: String = "plain"

  var model: KLetterCardModel {
    var m = KLetterCardModel()
    m.id = id
    m.who = who.who
    m.when = when
    m.postmark = postmark
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
    m.replyPlaceholder = replyPlaceholder
    m.paper = KPaper(key: paper)
    return m
  }
}

/// Every word of the desk that isn't on a card's record (KTodayStrings in TS).
struct KTodayStringsRecord: Record {
  @Field var title: String = ""
  @Field var next: String = ""
  @Field var reply: String = ""
  @Field var replyA11y: String = ""
  @Field var unfold: String = ""
  @Field var unfoldA11y: String = ""
  @Field var voiceLetter: String = ""
  @Field var more: String = ""
  @Field var nextA11y: String = ""
  @Field var bringBack: String = ""
  @Field var play: String = ""
  @Field var pause: String = ""
  @Field var send: String = ""
  @Field var placeholder: String = ""
  /// the reply bar's emoji key, for VoiceOver
  @Field var emoji: String = ""
  @Field var offlineTitle: String = ""
  @Field var offlineBody: String = ""
  @Field var loadingA11y: String = ""

  var labels: KTodayLabels {
    var l = KTodayLabels()
    l.next = next
    l.reply = reply
    l.replyA11y = replyA11y
    l.unfold = unfold
    l.unfoldA11y = unfoldA11y
    l.voiceLetter = voiceLetter
    l.more = more
    l.nextA11y = nextA11y
    l.bringBack = bringBack
    l.play = play
    l.pause = pause
    l.send = send
    l.placeholder = placeholder
    l.emoji = emoji
    l.offlineTitle = offlineTitle
    l.offlineBody = offlineBody
    l.loadingA11y = loadingA11y
    return l
  }
}

/// Her counted note when the desk is done (today-cards WrenLetterVM).
struct KTodayWrenLetterRecord: Record {
  @Field var from: String = ""
  @Field var stamp: String = ""
  @Field var lines: [String] = []
  @Field var sign: String = ""
  @Field var bag: String = ""
  @Field var foot: String = ""
  @Field var countdown: String = ""
  @Field var notYet: String = ""
  @Field var chip: String = ""
  @Field var a11y: String = ""

  var model: KWrenLetterModel {
    var m = KWrenLetterModel()
    m.from = from
    m.stamp = stamp
    m.lines = lines
    m.sign = sign
    m.bag = bag
    m.foot = foot
    m.countdown = countdown
    m.notYet = notYet
    m.chip = chip
    m.a11y = a11y
    return m
  }
}

/// A "#RRGGBB" from TS, or nil for anything else (the sky then keeps its night default rather
/// than Color(hex:)'s loud magenta).
private func kTodayColor(_ hex: String) -> Color? {
  let digits = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
  guard digits.count == 6, digits.allSatisfy(\.isHexDigit) else { return nil }
  return Color(hex: digits)
}

/// The window's sky by the hour (today-cards WindowSky): the defaults are the night palette.
struct KTodaySkyRecord: Record {
  @Field var top: String = "#1E1B35"
  @Field var bottom: String = "#2E2A6B"
  @Field var pillarFill: String = "#2B2660"
  @Field var pillarInk: String = "#DAD6F2"
  @Field var text: String = "#FFFFFF"
  @Field var stars: Bool = true
  @Field var night: Bool = true

  var sky: KTodaySky {
    var s = KTodaySky()
    if let c = kTodayColor(top) { s.top = c }
    if let c = kTodayColor(bottom) { s.bottom = c }
    if let c = kTodayColor(pillarFill) { s.pillarFill = c }
    if let c = kTodayColor(pillarInk) { s.pillarInk = c }
    if let c = kTodayColor(text) { s.text = c }
    s.stars = stars
    s.night = night
    return s
  }
}

/// The window to her game (today-cards WindowVM).
struct KTodayWindowRecord: Record {
  @Field var canPlay: Bool = false
  @Field var eyebrow: String = ""
  @Field var line: String = ""
  @Field var a11yLabel: String = ""
  @Field var a11yHint: String = ""
  @Field var sky: KTodaySkyRecord = KTodaySkyRecord()

  var model: KFlightWindowModel {
    var m = KFlightWindowModel()
    m.canPlay = canPlay
    m.eyebrow = eyebrow
    m.line = line
    m.a11yLabel = a11yLabel
    m.a11yHint = a11yHint
    m.sky = sky.sky
    return m
  }
}

/// Wren on the band (useTodayDesk view.wren): her resting face, the reply she carries off, the
/// reader being open, her VoiceOver words.
struct KTodayWrenRecord: Record {
  /// idle | sleepy
  @Field var rest: String = "idle"
  @Field var carry: Int = 0
  @Field var reader: Bool = false
  @Field var a11y: String = ""
  @Field var name: String = ""

  var wren: KTodayWren {
    var w = KTodayWren()
    w.rest = rest == KWrenFace.sleepy.rawValue ? .sleepy : .idle
    w.carry = carry
    w.reader = reader
    w.a11y = a11y
    w.name = name
    return w
  }
}

/// Her five pictures (today-birds useTodayBirds); an empty uri is a picture not captured yet.
struct KTodayBirdsRecord: Record {
  @Field var idle: KImageRefRecord = KImageRefRecord()
  @Field var curious: KImageRefRecord = KImageRefRecord()
  @Field var delight: KImageRefRecord = KImageRefRecord()
  @Field var sleepy: KImageRefRecord = KImageRefRecord()
  @Field var fly: KImageRefRecord = KImageRefRecord()
  @Field var flyIsPerch: Bool = false

  var birds: KTodayBirds {
    var b = KTodayBirds()
    b.idle = idle.ref
    b.curious = curious.ref
    b.delight = delight.ref
    b.sleepy = sleepy.ref
    b.fly = fly.ref
    b.flyIsPerch = flyIsPerch
    return b
  }
}

final class KTodayViewProps: KScreenProps {
  @Field var strings: KTodayStringsRecord = KTodayStringsRecord()
  @Field var phase: String = "loading"
  @Field var left: Int = 0
  @Field var leftA11y: String = ""
  @Field var cards: [KTodayCardRecord] = []
  @Field var titleLocked: Bool = false
  @Field var freshUnfold: Bool = false
  @Field var arrivalLine: String = ""
  @Field var wrenLetter: KTodayWrenLetterRecord = KTodayWrenLetterRecord()
  @Field var window: KTodayWindowRecord = KTodayWindowRecord()
  @Field var birds: KTodayBirdsRecord = KTodayBirdsRecord()
  @Field var night: Bool = false
  @Field var plus: String = "closed"
  @Field var hideBand: Bool = false
  @Field var wren: KTodayWrenRecord = KTodayWrenRecord()

  var onTodayPass = EventDispatcher()
  var onTodayBringBack = EventDispatcher()
  var onTodayReplyOpen = EventDispatcher()
  var onTodayWindow = EventDispatcher()
  var onTodayReplyChange = EventDispatcher()
  var onTodayReplySend = EventDispatcher()
  var onTodayReplyFocus = EventDispatcher()
  var onTodayCardAction = EventDispatcher()
  var onTodayStampMenu = EventDispatcher()

  /// The dock (with the field), the voice, the deck, the drag and the day's end: as long-lived as the view.
  let dock = KTodayDock()
  let voice = KTodayVoice()
  let deck = KDeckState()
  let motion = KDeckMotion()
  let flow = KDayFlow()

  /// The desk's taps, made once: each closure reaches this props object's events.
  private(set) lazy var actions: KTodayActions = {
    let a = KTodayActions()
    a.onPass = { [weak self] id in self?.onTodayPass(["letterId": id]) }
    a.onBringBack = { [weak self] in self?.onTodayBringBack() }
    a.onReplyOpen = { [weak self] id in self?.onTodayReplyOpen(["letterId": id]) }
    a.onWindow = { [weak self] in self?.onTodayWindow() }
    a.onReplyChange = { [weak self] id, text in self?.onTodayReplyChange(["letterId": id, "text": text]) }
    a.onReplySend = { [weak self] id, text, serial in self?.onTodayReplySend(["letterId": id, "text": text, "serial": serial]) }
    a.onReplyFocus = { [weak self] focused in self?.onTodayReplyFocus(["focused": focused]) }
    a.onCardAction = { [weak self] id, action in
      // the photo stamp's long press (KLetterCardStamp): "stamp.keep" | "stamp.report"
      if action.hasPrefix("stamp.") {
        self?.onTodayStampMenu(["letterId": id, "action": String(action.dropFirst("stamp.".count))])
      } else {
        self?.onTodayCardAction(["letterId": id, "action": action])
      }
    }
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
    content.labels = strings.labels
    content.phase = KTodayPhase(rawValue: props.phase) ?? .loading
    content.left = props.left
    content.leftA11y = props.leftA11y
    content.cards = props.cached("cards") { props.cards.map(\.model) }
    content.titleLocked = props.titleLocked
    content.freshUnfold = props.freshUnfold
    content.arrivalLine = props.arrivalLine
    content.wrenLetter = props.wrenLetter.model
    content.window = props.window.model
    content.birds = props.birds.birds
    content.night = props.night
    content.plus = KTodayPlus(rawValue: props.plus) ?? .closed
    content.hideBand = props.hideBand
    content.wren = props.wren.wren
    return KTodayDesk(
      theme: props.kTheme,
      content: content,
      topInset: props.insets.top,
      tabBarRoom: props.insets.tabBarRoom,
      bottomInset: props.insets.bottom,
      dock: props.dock,
      voice: props.voice,
      deck: props.deck,
      motion: props.motion,
      flow: props.flow,
      actions: props.actions
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
