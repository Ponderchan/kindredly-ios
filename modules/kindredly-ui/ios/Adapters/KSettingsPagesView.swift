import SwiftUI
import UIKit
import ExpoModulesCore
import ExpoUI

/*
 THE PAGES UNDER SETTINGS, AS REACT NATIVE SEES THEM (owner, 2026-10-27: "make Me all Swift"):
 one field on its own page, Blocked & reported, How Kindredly works, and Write to us. Each is a
 screen view like every step-5 screen (KScreenProps.swift), registered with ExpoUIView and the
 "command" AsyncFunction in KindredlyUIModule.swift, alone in one @expo/ui <Host> (SurfaceHost;
 `field` for the two with text fields, so the keyboard's safe area is kept). The screens are in
 Portable/Settings (KEditFieldScreen, KBlockedScreen, KHelpScreen, KWriteToUsScreen) and know
 nothing of Expo. This file imports ExpoUI, whose public Button, Text and Image would make bare
 names ambiguous, so nothing of that kind is written here.

 KEditFieldView (modules/kindredly-ui/src/EditField.tsx, src/screens/settings/EditFieldNative.tsx)
 - strings: { title, backLabel, placeholder, hint, reserved, clearLabel }
 - maxLength: Int, capitalizeWords: Bool
 Commands: setText { target: "field", value }, focus { target: "field" }, blur {}
 Events: onEfBack {}, onEfChange { text } (every edit, never a setText), onEfSubmit {} (Done)

 KBlockedView (src/Blocked.tsx, src/screens/settings/BlockedNative.tsx)
 - strings: { title, backLabel, count, countA11y, loadFail, emptyTitle, emptyBody, footer,
   noReach, unblock }
 - state: loading | ok | empty | failed (unknown reads as loading); identity: Bool
 - rows: [{ id, name, mark, sign, face { kind: mosaic | frost | veil, mask, frost }, since, spoken,
   unblockA11y }]
 Events: onBlBack {}, onBlUnblock { id }, onBlRetry {}

 KHelpView (src/Help.tsx, src/screens/settings/HelpNative.tsx)
 - strings: { title, backLabel, intro, expanded, collapsed }; bird: image ref
 - items: [{ q, a }]
 Events: onHpBack {}

 KWriteToUsView (src/WriteToUs.tsx, src/screens/settings/WriteToUsNative.tsx)
 - strings: { title, backLabel, intro, placeholder, addrLabel, addrPlaceholder, addrHint, fail,
   send, travelsWith, sentTitle, sentBody, done }
 - bird, sentBird: image refs; canSend, sending, sent: Bool
 Commands: setText { target: "body" | "email", value }, focus { target }, blur {}
 Events: onWuBack {}, onWuBody { text }, onWuEmail { text }, onWuSend {}, onWuDone {}

 The two with fields are ExpoSwiftUI.FocusableView: before the view is taken off screen the
 keyboard is let go, so a field is never torn down as first responder (KField.swift).
 */

// MARK: - One field

struct KEditFieldStringsRecord: Record {
  @Field var title: String = ""
  @Field var backLabel: String = ""
  @Field var placeholder: String = ""
  @Field var hint: String = ""
  @Field var reserved: String = ""
  @Field var clearLabel: String = ""
}

final class KEditFieldViewProps: KScreenProps {
  @Field var strings: KEditFieldStringsRecord = KEditFieldStringsRecord()
  @Field var maxLength: Int = 20
  @Field var capitalizeWords: Bool = false

  var onEfBack = EventDispatcher()
  var onEfChange = EventDispatcher()
  var onEfSubmit = EventDispatcher()

  /// the field's handle, as long-lived as the view, like `commands`
  let field = KFieldController()

  private(set) lazy var actions: KEditFieldActions = {
    let a = KEditFieldActions()
    a.onBack = { [weak self] in self?.onEfBack() }
    a.onChange = { [weak self] text in self?.onEfChange(["text": text]) }
    a.onSubmit = { [weak self] in self?.onEfSubmit() }
    return a
  }()

  var content: KEditFieldContent {
    var c = KEditFieldContent()
    c.title = strings.title
    c.backLabel = strings.backLabel
    c.placeholder = strings.placeholder
    c.hint = strings.hint
    c.reserved = strings.reserved
    c.clearLabel = strings.clearLabel
    c.maxLength = max(1, maxLength)
    c.capitalizeWords = capitalizeWords
    return c
  }

  func handle(_ name: String, _ args: [String: Any]) {
    switch name {
    case KCommandName.setText:
      field.setText(args.kString("value") ?? "")
    case KCommandName.focus:
      field.focus()
    case KCommandName.blur, KCommandName.reset:
      field.blur()
    default:
      break
    }
  }
}

struct KEditFieldView: ExpoSwiftUI.View {
  @ObservedObject var props: KEditFieldViewProps

  var body: some View {
    KEditFieldScreen(
      theme: props.kTheme,
      content: props.content,
      controller: props.field,
      topInset: props.insets.top,
      actions: props.actions
    )
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
  }
}

extension KEditFieldView: ExpoSwiftUI.FocusableView {
  func forceResignFirstResponder() {
    if props.field.isFocused {
      _ = UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
    props.field.blur()
  }
}

// MARK: - Blocked & reported

struct KBlockedStringsRecord: Record {
  @Field var title: String = ""
  @Field var backLabel: String = ""
  @Field var count: String = ""
  @Field var countA11y: String = ""
  @Field var loadFail: String = ""
  @Field var emptyTitle: String = ""
  @Field var emptyBody: String = ""
  @Field var footer: String = ""
  @Field var noReach: String = ""
  @Field var unblock: String = ""
}

struct KBlockedFaceRecord: Record {
  /// mosaic | frost | veil (lib/stranger-who WhoFace)
  @Field var kind: String = "veil"
  @Field var mask: Int = 0
  @Field var frost: KFrostRecord = KFrostRecord()
}

struct KBlockedRowRecord: Record {
  @Field var id: String = ""
  @Field var name: String = ""
  /// "she" | "he" | ""
  @Field var mark: String = ""
  /// a Zodiac name or ""
  @Field var sign: String = ""
  @Field var face: KBlockedFaceRecord = KBlockedFaceRecord()
  @Field var since: String = ""
  @Field var spoken: String = ""
  @Field var unblockA11y: String = ""
}

final class KBlockedViewProps: KScreenProps {
  @Field var strings: KBlockedStringsRecord = KBlockedStringsRecord()
  @Field var state: String = "loading"
  @Field var identity: Bool = false
  @Field var rows: [KBlockedRowRecord] = []

  var onBlBack = EventDispatcher()
  var onBlUnblock = EventDispatcher()
  var onBlRetry = EventDispatcher()

  private(set) lazy var actions: KBlockedActions = {
    let a = KBlockedActions()
    a.onBack = { [weak self] in self?.onBlBack() }
    a.onUnblock = { [weak self] id in self?.onBlUnblock(["id": id]) }
    a.onRetry = { [weak self] in self?.onBlRetry() }
    return a
  }()

  /// The face as the React Native row draws it: with the identity switch off the bare FACE v1
  /// mosaic at 41 (MosaicId, cell 7), the veil as the full grid in faint; with it on the frosted
  /// window at 40, the flat veil tile, or (no window to draw) the mask at 70% of 40.
  private func face(_ r: KBlockedFaceRecord, ink: Color) -> (KFaceSource, CGFloat) {
    switch r.kind {
    case "frost":
      if let spec = r.frost.spec { return (.frost(spec), 40) }
      return (identity ? .frostVeil : .veil, identity ? 40 : 41)
    case "mosaic":
      return (.mosaic(mask: r.mask, tint: ink), identity ? 28 : 41)
    default:
      return (identity ? .frostVeil : .veil, identity ? 40 : 41)
    }
  }

  /// depends on the theme too (a mosaic's ink): its slot is named for it
  var content: KBlockedContent {
    let theme = kTheme
    return cached("content:\(theme.key)") {
      let s = strings
      var c = KBlockedContent()
      c.title = s.title
      c.backLabel = s.backLabel
      c.count = s.count
      c.countA11y = s.countA11y
      c.state = KBlockedContent.State(rawValue: state) ?? .loading
      c.loadFail = s.loadFail
      c.emptyTitle = s.emptyTitle
      c.emptyBody = s.emptyBody
      c.footer = s.footer
      c.noReach = s.noReach
      c.unblock = s.unblock
      var seen = Set<String>()
      c.rows = rows.compactMap { r in
        guard !r.id.isEmpty, seen.insert(r.id).inserted else { return nil }
        let (source, size) = face(r.face, ink: theme.ink)
        return KBlockedRow(
          id: r.id,
          name: r.name,
          mark: KLineGlyph.mark(r.mark),
          sign: KLineGlyph.sign(r.sign),
          face: source,
          faceSize: size,
          since: r.since,
          spoken: r.spoken,
          unblockA11y: r.unblockA11y
        )
      }
      return c
    }
  }
}

struct KBlockedView: ExpoSwiftUI.View {
  @ObservedObject var props: KBlockedViewProps

  var body: some View {
    let insets = props.insets
    return KBlockedScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: insets.top,
      // the React Native footer's tabBar + 6 (the home indicator outside the tabs)
      bottomInset: max(insets.tabBarRoom, insets.bottom) + 6,
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}

// MARK: - How Kindredly works

struct KHelpStringsRecord: Record {
  @Field var title: String = ""
  @Field var backLabel: String = ""
  @Field var intro: String = ""
  @Field var expanded: String = ""
  @Field var collapsed: String = ""
}

struct KHelpItemRecord: Record {
  @Field var q: String = ""
  @Field var a: String = ""
}

final class KHelpViewProps: KScreenProps {
  @Field var strings: KHelpStringsRecord = KHelpStringsRecord()
  @Field var bird: KImageRefRecord = KImageRefRecord()
  @Field var items: [KHelpItemRecord] = []

  var onHpBack = EventDispatcher()

  private(set) lazy var actions: KHelpActions = {
    let a = KHelpActions()
    a.onBack = { [weak self] in self?.onHpBack() }
    return a
  }()

  var content: KHelpContent {
    cached("content") {
      var c = KHelpContent()
      c.title = strings.title
      c.backLabel = strings.backLabel
      c.intro = strings.intro
      c.bird = bird.ref
      c.expanded = strings.expanded
      c.collapsed = strings.collapsed
      c.items = items.enumerated().map { i, r in KHelpItem(id: i, question: r.q, answer: r.a) }
      return c
    }
  }
}

struct KHelpView: ExpoSwiftUI.View {
  @ObservedObject var props: KHelpViewProps

  var body: some View {
    let insets = props.insets
    return KHelpScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: insets.top,
      // as Settings: the floating bar's room plus 12, never less than the fade drawn over the foot
      bottomInset: max(insets.tabBarRoom + 12, insets.bottom + 12, KBottomFade.contentMargin()),
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}

// MARK: - Write to us

struct KWriteToUsStringsRecord: Record {
  @Field var title: String = ""
  @Field var backLabel: String = ""
  @Field var intro: String = ""
  @Field var placeholder: String = ""
  @Field var addrLabel: String = ""
  @Field var addrPlaceholder: String = ""
  @Field var addrHint: String = ""
  @Field var fail: String = ""
  @Field var send: String = ""
  @Field var travelsWith: String = ""
  @Field var sentTitle: String = ""
  @Field var sentBody: String = ""
  @Field var done: String = ""
}

final class KWriteToUsViewProps: KScreenProps {
  @Field var strings: KWriteToUsStringsRecord = KWriteToUsStringsRecord()
  @Field var bird: KImageRefRecord = KImageRefRecord()
  @Field var sentBird: KImageRefRecord = KImageRefRecord()
  @Field var canSend: Bool = false
  @Field var sending: Bool = false
  @Field var sent: Bool = false

  var onWuBack = EventDispatcher()
  var onWuBody = EventDispatcher()
  var onWuEmail = EventDispatcher()
  var onWuSend = EventDispatcher()
  var onWuDone = EventDispatcher()

  /// the two fields' handles, as long-lived as the view
  let letter = KFieldController()
  let email = KFieldController()

  private(set) lazy var actions: KWriteToUsActions = {
    let a = KWriteToUsActions()
    a.onBack = { [weak self] in self?.onWuBack() }
    a.onBodyChange = { [weak self] text in self?.onWuBody(["text": text]) }
    a.onEmailChange = { [weak self] text in self?.onWuEmail(["text": text]) }
    a.onSend = { [weak self] in self?.onWuSend() }
    a.onDone = { [weak self] in self?.onWuDone() }
    return a
  }()

  var content: KWriteToUsContent {
    let s = strings
    var c = KWriteToUsContent()
    c.title = s.title
    c.backLabel = s.backLabel
    c.intro = s.intro
    c.bird = bird.ref
    c.placeholder = s.placeholder
    c.addrLabel = s.addrLabel
    c.addrPlaceholder = s.addrPlaceholder
    c.addrHint = s.addrHint
    c.fail = s.fail
    c.send = s.send
    c.travelsWith = s.travelsWith
    c.canSend = canSend
    c.sending = sending
    c.sent = sent
    c.sentTitle = s.sentTitle
    c.sentBody = s.sentBody
    c.done = s.done
    c.sentBird = sentBird.ref
    return c
  }

  private func controller(_ target: String?) -> KFieldController? {
    switch target {
    case "body": return letter
    case "email": return email
    default: return nil
    }
  }

  func handle(_ name: String, _ args: [String: Any]) {
    switch name {
    case KCommandName.setText:
      controller(args.kString("target"))?.setText(args.kString("value") ?? "")
    case KCommandName.focus:
      controller(args.kString("target"))?.focus()
    case KCommandName.blur, KCommandName.reset:
      letter.blur()
      email.blur()
    default:
      break
    }
  }
}

struct KWriteToUsView: ExpoSwiftUI.View {
  @ObservedObject var props: KWriteToUsViewProps

  var body: some View {
    let insets = props.insets
    return KWriteToUsScreen(
      theme: props.kTheme,
      content: props.content,
      letter: props.letter,
      email: props.email,
      topInset: insets.top,
      // the React Native page's tabBar + 24 (the home indicator outside the tabs)
      bottomInset: max(insets.tabBarRoom, insets.bottom) + 24,
      actions: props.actions
    )
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
  }
}

extension KWriteToUsView: ExpoSwiftUI.FocusableView {
  func forceResignFirstResponder() {
    if props.letter.isFocused || props.email.isFocused {
      _ = UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
    props.letter.blur()
    props.email.blur()
  }
}
