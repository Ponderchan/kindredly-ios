import SwiftUI
import UIKit
import ExpoModulesCore
import ExpoUI

/*
 THE NOTES COMPOSER as React Native sees it: <KNoteComposeView … /> on the JS side
 (modules/kindredly-ui/src/NoteCompose.tsx), drawn by src/screens/journal-entry/
 NoteComposeNative.tsx in one full-screen Host that keeps the keyboard's safe area (SurfaceHost
 field). This file turns records into Portable values and taps into events; the page itself is
 Portable/Notes/KNoteComposePage.swift and knows nothing about Expo.

 Built as every step-5 screen is (KScreenProps.swift; registered in KindredlyUIModule.swift with
 the "command" AsyncFunction), inside ONE @expo/ui <Host>. It holds a text field, so it is an
 ExpoSwiftUI.FocusableView (the expo focus/unmount crash's guard), as KComposeView is.

 Props, beyond KScreenProps (insets: top = the status bar, bottom = the home indicator):
 - strings: KNoteComposeStringsRecord (every word that isn't in a list)
 - wrenLine: Wren's line, already in quotes
 - mood: { group, artKey, path, a11yLabel }, group "" for none chosen
 - panel: none | plus | mood
 - groups: [{ group, name, faces: [{ id, name, artKey, path, a11yLabel }] }], converted once per rev
 - openGroup (the group whose faces show), chosenGroup ("" for none), chosenFace ("" for none)
 - cards: [{ kind: photo | video | voice, label, enabled, a11yValue }]
 - thumbs: [{ id, kind: photo | video, image: KImageRefRecord, a11yLabel, a11yHint }]
 - coverHint, voice, hasSomething, busy, sealed, needsMood
 - children: <KIsland name="wren">, <KIsland name="recorder">

 Commands (KCommandBus): setText { target: "body", value } · focus { target: "body" } · blur {} ·
 reset {} (blurs) · recorder { showBar, bar, showCard, card: { look, playing, label }, island }:
 the voice slot (KVoiceSlot, Portable/Voice), the island alone until TS says Swift draws the
 recording bar and/or the take's card (the "recorder" and "audiocard" switches;
 src/components/VoiceSlot.tsx).

 Events, with what nativeEvent carries:
 - onNoteClose {} · onNoteTextChange { text } · onNoteFieldFocus { focused }
 - onNotePanel { which: plus | mood } (toggles)
 - onNotePickGroup { group } · onNotePickFace { id }
 - onNoteCard { kind } · onNoteThumb { index } · onNoteRemoveMedia {}
 - onNoteSeal { text } (the words as typed) · onNoteWren {}
 - onNoteSealEnd {} — the seal moment has played (sealed true): go back to Notes
 - onNoteVoice { action } — press | discard | toggle: a tap in the voice slot's Swift bar or card

 Unknown enum strings fall back rather than fail (a panel this binary doesn't know is none; a
 group is Calm). This file imports ExpoUI, so no bare Button / Text / Image / Label is written here.
 */

struct KNoteComposeStringsRecord: Record {
  @Field var date: String = ""
  @Field var justForMe: String = ""
  @Field var closeLabel: String = ""
  @Field var editorLabel: String = ""
  @Field var placeholder: String = ""
  @Field var plusLabel: String = ""
  @Field var moodEmptyLabel: String = ""
  @Field var sealLabel: String = ""
  @Field var sealingLabel: String = ""
  @Field var sealHint: String = ""
  @Field var keptLine: String = ""
  @Field var keptSpoken: String = ""
  @Field var coverHint: String = ""
  @Field var removeVideo: String = ""

  var strings: KNoteComposeStrings {
    var s = KNoteComposeStrings()
    s.date = date
    s.justForMe = justForMe
    s.closeLabel = closeLabel
    s.editorLabel = editorLabel
    s.placeholder = placeholder
    s.plusLabel = plusLabel
    s.moodEmptyLabel = moodEmptyLabel
    s.sealLabel = sealLabel
    s.sealingLabel = sealingLabel
    s.sealHint = sealHint
    s.keptLine = keptLine
    s.keptSpoken = keptSpoken
    s.coverHint = coverHint
    s.removeVideo = removeVideo
    return s
  }
}

struct KNoteMoodRecord: Record {
  /// calm | happy | tired | low; "" for none chosen
  @Field var group: String = ""
  @Field var artKey: String = ""
  @Field var path: String = ""
  @Field var a11yLabel: String = ""
}

struct KNoteMoodFaceRecord: Record {
  @Field var id: String = ""
  @Field var name: String = ""
  @Field var artKey: String = ""
  @Field var path: String = ""
  @Field var a11yLabel: String = ""
}

struct KNoteMoodGroupRecord: Record {
  @Field var group: String = "calm"
  @Field var name: String = ""
  @Field var faces: [KNoteMoodFaceRecord] = []
}

struct KNoteMediaCardRecord: Record {
  @Field var kind: String = "photo"
  @Field var label: String = ""
  @Field var enabled: Bool = true
  @Field var a11yValue: String = ""
}

struct KNoteThumbRecord: Record {
  @Field var id: String = ""
  @Field var kind: String = "photo"
  @Field var image: KImageRefRecord = KImageRefRecord()
  @Field var a11yLabel: String = ""
  @Field var a11yHint: String = ""
}

final class KNoteComposeViewProps: KScreenProps {
  @Field var strings: KNoteComposeStringsRecord = KNoteComposeStringsRecord()
  @Field var wrenLine: String = ""
  @Field var mood: KNoteMoodRecord = KNoteMoodRecord()
  @Field var panel: String = "none"
  @Field var groups: [KNoteMoodGroupRecord] = []
  @Field var openGroup: String = "calm"
  @Field var chosenGroup: String = ""
  @Field var chosenFace: String = ""
  @Field var cards: [KNoteMediaCardRecord] = []
  @Field var thumbs: [KNoteThumbRecord] = []
  @Field var coverHint: Bool = false
  @Field var voice: Bool = false
  @Field var hasSomething: Bool = false
  @Field var busy: Bool = false
  @Field var sealed: Bool = false
  @Field var needsMood: Bool = false
  /// batch 3 ("notewren"; Adapters/KLastIslandsView.swift): her content snapshot at 30, drawn
  /// still in place of the "wren" island while `on`
  @Field var wren: KWrenPictureRecord = KWrenPictureRecord()

  var onNoteClose = EventDispatcher()
  var onNoteTextChange = EventDispatcher()
  var onNoteFieldFocus = EventDispatcher()
  var onNotePanel = EventDispatcher()
  var onNotePickGroup = EventDispatcher()
  var onNotePickFace = EventDispatcher()
  var onNoteCard = EventDispatcher()
  var onNoteThumb = EventDispatcher()
  var onNoteRemoveMedia = EventDispatcher()
  var onNoteSeal = EventDispatcher()
  var onNoteWren = EventDispatcher()
  var onNoteSealEnd = EventDispatcher()
  var onNoteVoice = EventDispatcher()

  /// The field: as long-lived as the view, like `commands`.
  let driver = KNoteComposeDriver()
  /// The voice slot's state, from the `recorder` command (as long-lived as the view).
  let voiceSlot = KVoiceSlotModel()

  /// The page's taps and edits, made once: each closure reaches this props object's events.
  private(set) lazy var actions: KNoteComposeActions = {
    let a = KNoteComposeActions()
    a.onClose = { [weak self] in self?.onNoteClose() }
    a.onTextChange = { [weak self] text in self?.onNoteTextChange(["text": text]) }
    a.onFieldFocus = { [weak self] focused in self?.onNoteFieldFocus(["focused": focused]) }
    a.onPanel = { [weak self] panel in
      guard panel != .none else { return }
      self?.onNotePanel(["which": panel.rawValue])
    }
    a.onPickGroup = { [weak self] group in self?.onNotePickGroup(["group": group.rawValue]) }
    a.onPickFace = { [weak self] id in self?.onNotePickFace(["id": id]) }
    a.onCard = { [weak self] kind in self?.onNoteCard(["kind": kind.rawValue]) }
    a.onThumb = { [weak self] index in self?.onNoteThumb(["index": index]) }
    a.onRemoveMedia = { [weak self] in self?.onNoteRemoveMedia() }
    a.onSeal = { [weak self] text in self?.onNoteSeal(["text": text]) }
    a.onWren = { [weak self] in self?.onNoteWren() }
    a.onSealEnd = { [weak self] in self?.onNoteSealEnd() }
    return a
  }()

  /// One command from the bus (see the list at the top of the file).
  func handle(_ name: String, _ args: [String: Any]) {
    switch name {
    case KCommandName.setText:
      driver.body.setText(args.kString("value") ?? "")
    case KCommandName.focus:
      driver.body.focus()
    case KCommandName.blur, KCommandName.reset:
      driver.blurAll()
    case "recorder":
      voiceSlot.update(KVoiceSlotState(args: args))
    default:
      break
    }
  }

  /// The page's content from the props; the groups are converted once per rev.
  func content() -> KNoteComposeContent {
    var c = KNoteComposeContent()
    c.strings = strings.strings
    c.wrenLine = wrenLine
    if let group = KMoodGroup(rawValue: mood.group) {
      c.mood = KNoteChosenMood(group: group, artKey: mood.artKey, path: mood.path)
      c.moodLabel = mood.a11yLabel
    }
    c.panel = KNoteComposePanel(rawValue: panel) ?? .none
    c.groups = cached("groups") {
      groups.map { g in
        KNoteMoodGroup(
          group: KMoodGroup.from(g.group),
          name: g.name,
          faces: g.faces.map { KNoteMoodFace(id: $0.id, name: $0.name, artKey: $0.artKey, path: $0.path, accessibilityLabel: $0.a11yLabel) }
        )
      }
    }
    c.openGroup = KMoodGroup.from(openGroup)
    c.chosenGroup = KMoodGroup(rawValue: chosenGroup)
    c.chosenFace = chosenFace
    c.cards = cards.compactMap { card in
      guard let kind = KNoteMediaKind(rawValue: card.kind) else { return nil }
      return KNoteMediaCard(kind: kind, label: card.label, enabled: card.enabled, accessibilityValue: card.a11yValue)
    }
    c.thumbs = thumbs.map { t in
      KNoteThumb(
        id: t.id,
        image: t.image.ref,
        kind: KNoteMediaKind(rawValue: t.kind) ?? .photo,
        accessibilityLabel: t.a11yLabel,
        accessibilityHint: t.a11yHint
      )
    }
    c.coverHint = coverHint
    c.voice = voice
    c.hasSomething = hasSomething
    c.busy = busy
    c.sealed = sealed
    c.needsMood = needsMood
    return c
  }
}

struct KNoteComposeView: ExpoSwiftUI.View {
  @ObservedObject var props: KNoteComposeViewProps

  var body: some View {
    KNoteComposePage(
      theme: props.kTheme,
      content: props.content(),
      topInset: props.insets.top,
      bottomInset: props.insets.bottom,
      driver: props.driver,
      actions: props.actions
    ) {
      if props.wren.on {
        // NoteComposeNative's island: 30, still and content
        KWrenPicture(props.wren.ref, size: 30)
      } else {
        props.children?.kSlot("wren")
      }
    } recorder: {
      // the island's gap (NoteComposeNative's RecorderIsland): 10
      KVoiceSlot(model: props.voiceSlot, theme: props.kTheme, spacing: 10, island: props.children?.kSlot("recorder")) { action in
        props.onNoteVoice(["action": action.rawValue])
      }
    }
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
  }
}

extension KNoteComposeView: ExpoSwiftUI.FocusableView {
  /// Before the view goes: the keyboard away if our field has it, then the field told it has
  /// lost focus (as KComposeView does).
  func forceResignFirstResponder() {
    let driver = props.driver
    if driver.anyFocused {
      _ = UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
    driver.blurAll()
  }
}
