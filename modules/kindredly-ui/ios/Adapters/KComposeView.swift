import SwiftUI
import UIKit
import ExpoModulesCore
import ExpoUI

/*
 THE COMPOSE PAGE as React Native sees it: <KComposeView … /> on the JS side
 (modules/kindredly-ui/src/Compose.tsx), drawn by src/screens/compose/ComposeNative.tsx in one
 full-screen Host that keeps the keyboard's safe area (SurfaceHost field). This file turns records
 into Portable values and taps into events; the page itself is Portable/Compose/KComposePage.swift
 and knows nothing about Expo.

 Built as every step-5 screen is (KScreenProps.swift): the props subclass KScreenProps (theme,
 letterFont, insets, rev, commands), the view is registered with ExpoUIView and the "command"
 AsyncFunction (KindredlyUIModule.swift), and it MUST sit in an @expo/ui <Host>: one Host for the
 whole page. It holds text fields, so it is an ExpoSwiftUI.FocusableView: the virtual view
 resigns them before the view is taken off screen (the expo focus/unmount crash's guard), and
 the JS side blurs too (useKCommands blurOnUnmount).

 Props, beyond KScreenProps (insets: top = the status bar, bottom = the home indicator):
 - strings: every word that isn't live or in a list (KComposeStringsRecord)
 - stamp: { id, name, washHex, inkHex, lineHex, a11yLabel }, id "" for none chosen
 - mode: write | speak;  tray: none | stamps | more
 - sections: [{ title, items: [{ id, name, inkHex, a11yLabel }] }], converted once per rev
 - askOn, more { askOn, askDisabled, voiceOn, voiceLocked }, plusDot, quota, capPanel, busy
 - children: <KIsland name="wren">, <KIsland name="recorder">

 Commands (KCommandBus):
 - setText { target: "body" | "ask", value }   a draft resumed, a seed, a remount's reseed
 - focus { target: "body" | "ask" }            the autofocus, the question just attached
 - blur {}                                      before a sheet, an Alert, a push
 - composer { wrenLine, key: { stage, label, narrowLabel, tone, enabled, progress, nudge },
              count: { text, tone } }           the live state, sent when it changes
 - reset {}                                     blurs (nothing else to put back)

 Events, with what nativeEvent carries:
 - onComposeClose {}
 - onComposeTextChange { target, text }     every edit (never a setText)
 - onComposeTray { which }                  stamps | more (toggles)
 - onComposePickStamp { id }
 - onComposeAskToggle {}
 - onComposeVoiceToggle {}
 - onComposeKeyPress { text, ask }          the main key, with the words as typed
 - onComposeCapLink {}
 - onComposeFieldFocus { target, focused }

 Unknown enum strings fall back rather than fail (a mode or tray this binary doesn't know is
 write / none; a tone draws mute). This file imports ExpoUI, whose public Button, Text, Image and
 Label would make the bare names ambiguous, so none of them is written here.
 */

/// Every word of the page that isn't live or in a list (KComposeStrings in TS).
struct KComposeStringsRecord: Record {
  @Field var title: String = ""
  @Field var closeLabel: String = ""
  @Field var stampLabel: String = ""
  @Field var plusLabel: String = ""
  @Field var editorLabel: String = ""
  @Field var placeholder: String = ""
  @Field var captionPlaceholder: String = ""
  @Field var voiceNote: String = ""
  @Field var askLabel: String = ""
  @Field var askPlaceholder: String = ""
  @Field var moreAsk: String = ""
  @Field var moreVoice: String = ""
  @Field var voiceLocked: String = ""
  @Field var askDisabled: String = ""
  @Field var capText: String = ""
  @Field var capSub: String = ""
  @Field var capLink: String = ""

  var strings: KComposeStrings {
    var s = KComposeStrings()
    s.title = title
    s.closeLabel = closeLabel
    s.stampLabel = stampLabel
    s.plusLabel = plusLabel
    s.editorLabel = editorLabel
    s.placeholder = placeholder
    s.captionPlaceholder = captionPlaceholder
    s.voiceNote = voiceNote
    s.askLabel = askLabel
    s.askPlaceholder = askPlaceholder
    s.moreAsk = moreAsk
    s.moreVoice = moreVoice
    s.voiceLocked = voiceLocked
    s.askDisabled = askDisabled
    s.capText = capText
    s.capSub = capSub
    s.capLink = capLink
    return s
  }
}

/// The chosen stamp, coloured by TS for this page (theme/post channelColors).
struct KComposeStampRecord: Record {
  @Field var id: String = ""
  @Field var name: String = ""
  @Field var washHex: String = ""
  @Field var inkHex: String = ""
  @Field var lineHex: String = ""
  @Field var a11yLabel: String = ""

  /// nil while none is chosen
  func stamp(theme: KTheme) -> KComposeStamp? {
    guard !id.isEmpty else { return nil }
    return KComposeStamp(
      id: id,
      name: name,
      wash: kComposeColor(washHex) ?? theme.soft2,
      ink: kComposeColor(inkHex) ?? theme.ink,
      line: kComposeColor(lineHex) ?? theme.ln,
      accessibilityLabel: a11yLabel
    )
  }
}

struct KComposeStampItemRecord: Record {
  @Field var id: String = ""
  @Field var name: String = ""
  @Field var inkHex: String = ""
  @Field var a11yLabel: String = ""
}

struct KComposeSectionRecord: Record {
  @Field var title: String = ""
  @Field var items: [KComposeStampItemRecord] = []
}

struct KComposeMoreRecord: Record {
  @Field var askOn: Bool = false
  @Field var askDisabled: Bool = false
  @Field var voiceOn: Bool = false
  @Field var voiceLocked: Bool = false
}

/// A stamp colour as TS sends it ("#RRGGBB", from channelColors), or nil for anything else, so a
/// bad value falls back to a theme colour instead of Color(hex:)'s loud magenta.
func kComposeColor(_ hex: String) -> Color? {
  let digits = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
  guard digits.count == 6, digits.allSatisfy(\.isHexDigit) else { return nil }
  return Color(hex: digits)
}

final class KComposeViewProps: KScreenProps {
  @Field var strings: KComposeStringsRecord = KComposeStringsRecord()
  @Field var stamp: KComposeStampRecord = KComposeStampRecord()
  @Field var mode: String = "write"
  @Field var tray: String = "none"
  @Field var sections: [KComposeSectionRecord] = []
  @Field var askOn: Bool = false
  @Field var more: KComposeMoreRecord = KComposeMoreRecord()
  @Field var plusDot: Bool = false
  @Field var quota: String = ""
  @Field var capPanel: Bool = false
  @Field var busy: Bool = false

  var onComposeClose = EventDispatcher()
  var onComposeTextChange = EventDispatcher()
  var onComposeTray = EventDispatcher()
  var onComposePickStamp = EventDispatcher()
  var onComposeAskToggle = EventDispatcher()
  var onComposeVoiceToggle = EventDispatcher()
  var onComposeKeyPress = EventDispatcher()
  var onComposeCapLink = EventDispatcher()
  var onComposeFieldFocus = EventDispatcher()

  /// The fields and the live state: as long-lived as the view, like `commands`.
  let driver = KComposeDriver()

  /// The page's taps and edits, made once: each closure reaches this props object's events.
  private(set) lazy var actions: KComposeActions = {
    let a = KComposeActions()
    a.onClose = { [weak self] in self?.onComposeClose() }
    a.onTextChange = { [weak self] field, text in self?.onComposeTextChange(["target": field.rawValue, "text": text]) }
    a.onTray = { [weak self] tray in
      guard tray != .none else { return }
      self?.onComposeTray(["which": tray.rawValue])
    }
    a.onPickStamp = { [weak self] id in self?.onComposePickStamp(["id": id]) }
    a.onAskToggle = { [weak self] in self?.onComposeAskToggle() }
    a.onVoiceToggle = { [weak self] in self?.onComposeVoiceToggle() }
    a.onKey = { [weak self] text, ask in self?.onComposeKeyPress(["text": text, "ask": ask]) }
    a.onCapLink = { [weak self] in self?.onComposeCapLink() }
    a.onFieldFocus = { [weak self] field, focused in self?.onComposeFieldFocus(["target": field.rawValue, "focused": focused]) }
    return a
  }()

  /// One command from the bus (see the list at the top of the file).
  func handle(_ name: String, _ args: [String: Any]) {
    switch name {
    case KCommandName.setText:
      guard let field = KComposeField(rawValue: args.kString("target") ?? "") else { return }
      driver.controller(field).setText(args.kString("value") ?? "")
    case KCommandName.focus:
      guard let field = KComposeField(rawValue: args.kString("target") ?? "") else { return }
      driver.controller(field).focus()
    case KCommandName.blur, KCommandName.reset:
      driver.blurAll()
    case KCommandName.composer:
      let live = Self.live(args)
      if driver.live != live { driver.live = live }
    default:
      break
    }
  }

  /// The composer command's args as the live state; a missing part reads as its resting value.
  static func live(_ args: [String: Any]) -> KComposeLive {
    let k = args.kObject("key") ?? [:]
    let c = args.kObject("count") ?? [:]
    let key = KComposeKey(
      stage: KComposeKey.Stage(rawValue: k.kString("stage") ?? "") ?? .filling,
      label: k.kString("label") ?? "",
      narrowLabel: k.kString("narrowLabel") ?? "",
      tone: KComposeKey.Tone(rawValue: k.kString("tone") ?? "") ?? .mute,
      enabled: k.kBool("enabled") ?? false,
      progress: k.kDouble("progress") ?? -1,
      nudge: k.kBool("nudge") ?? false
    )
    let count = KComposeCount(
      text: c.kString("text") ?? "",
      tone: KComposeCount.Tone(rawValue: c.kString("tone") ?? "") ?? .mute
    )
    return KComposeLive(wrenLine: args.kString("wrenLine") ?? "", key: key, count: count)
  }

  /// The page's content from the props: everything but the sections is cheap; those are
  /// converted once per rev, in a slot per theme (a bad colour falls back to the theme's ink).
  func content() -> KComposeContent {
    let theme = kTheme
    var c = KComposeContent()
    c.strings = strings.strings
    c.stamp = stamp.stamp(theme: theme)
    c.mode = KComposeMode(rawValue: mode) ?? .write
    c.tray = KComposeTray(rawValue: tray) ?? .none
    c.sections = cached("sections:\(theme.key)") {
      sections.enumerated().map { index, s in
        KComposeStampSection(
          id: "\(index):\(s.title)",
          title: s.title,
          items: s.items.map { item in
            KComposeStampItem(id: item.id, name: item.name, ink: kComposeColor(item.inkHex) ?? theme.ink, accessibilityLabel: item.a11yLabel)
          }
        )
      }
    }
    c.askOn = askOn
    c.askCellOn = more.askOn
    c.askCellDisabled = more.askDisabled
    c.voiceCellOn = more.voiceOn
    c.voiceLocked = more.voiceLocked
    c.plusDot = plusDot
    c.quota = quota
    c.capPanel = capPanel
    c.busy = busy
    return c
  }
}

struct KComposeView: ExpoSwiftUI.View {
  @ObservedObject var props: KComposeViewProps

  var body: some View {
    KComposePage(
      theme: props.kTheme,
      content: props.content(),
      topInset: props.insets.top,
      bottomInset: props.insets.bottom,
      driver: props.driver,
      actions: props.actions
    ) {
      props.children?.kSlot("wren")
    } recorder: {
      props.children?.kSlot("recorder")
    }
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
  }
}

extension KComposeView: ExpoSwiftUI.FocusableView {
  /// Before the view goes: the keyboard away if one of our fields has it, then both fields told
  /// they have lost focus (as @expo/ui's TextFieldView does, TextFieldView.swift:57-64).
  func forceResignFirstResponder() {
    let driver = props.driver
    if driver.anyFocused {
      _ = UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
    driver.blurAll()
  }
}
