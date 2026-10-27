import SwiftUI
import UIKit
import ExpoModulesCore
import ExpoUI

/*
 THE PIECES OVER THE CHAT, AS REACT NATIVE SEES THEM (2026-10-27): a photo opened full screen,
 a kindred room's song shelf and the signing sheet of the pen-pal chat. Each was a React Native
 Modal over the Swift conversation; each keeps its Modal (the window, its fade or slide, the
 dim's timing) and now draws its inside in SwiftUI, behind its own switch, with the React Native
 piece kept as the fallback. Each is alone in one @expo/ui <Host> inside its Modal (SurfaceHost;
 `field` for the sheet, which holds a text field), under a NativeSurface that arms the crash
 breadcrumb each time it opens (src/components/OverlayNativeSurface.tsx). The props subclass
 KScreenProps for the theme, the Letter font, the insets and kScreenEnvironment's image loader;
 they take no rev (nothing is cached). The pieces themselves are Portable/Chat/KPhotoLightbox,
 KSongShelf and KSignSheet, and know nothing of Expo. This file imports ExpoUI, whose public
 Button, Text and Image would make bare names ambiguous, so nothing of that kind is written here.

 KPhotoLightboxView (modules/kindredly-ui/src/ChatOverlays.tsx, src/components/PhotoLightbox.tsx)
 - photo: image ref (a moments path signed and keyed by it, or a plain uri); closeLabel
 - insets.top places the ×
 Event: onLbClose {}

 KSongShelfView (src/ChatOverlays.tsx, src/screens/chat/SongShelfNative.tsx)
 - title, closeLabel, says ("" none), evidence, bird (image ref), rows [{ key, title, who }]
 Events: onShClose {}, onShOpen { key }

 KSignSheetView (src/ChatOverlays.tsx, src/screens/chat/SignSheetNative.tsx)
 - strings: { title, closeLabel, lead, faceLabel, faceNote, faceNone, nameLabel, namePlaceholder,
   nameNote, nameError, clearLabel, signLabel, typeToggle, typeHint, legal, undo, clear,
   guestText, guestLink, send, foot, typedEmpty, caption, padLabel, padValue }
 - errorInk "#RRGGBB"; faces [{ kind, uri, key, overscan, mask, label, none }], chosen
 - typed, typedName, typedUpright, typedEmptyUpright, guide, guideUpright
 - padWidth, padHeight; ink (SVG path in pad points), strokeCount, full; canSend, busy
 - insets.bottom: room under the last line
 Commands: setText { target: "name", value }, blur {}
 Events: onSsClose {}, onSsName { text }, onSsFace { index }, onSsType {}, onSsStroke { points },
   onSsUndo {}, onSsClear {}, onSsGuest {}, onSsSend {}

 The sheet is an ExpoSwiftUI.FocusableView: before it is taken off screen the keyboard is let go,
 so its field is never torn down as first responder (Kit/KField.swift).
 */

// MARK: - A photo, big

final class KPhotoLightboxViewProps: KScreenProps {
  @Field var photo: KImageRefRecord = KImageRefRecord()
  @Field var closeLabel: String = ""

  var onLbClose = EventDispatcher()

  var content: KPhotoLightboxContent {
    var c = KPhotoLightboxContent()
    c.photo = photo.ref
    c.closeLabel = closeLabel
    return c
  }
}

struct KPhotoLightboxView: ExpoSwiftUI.View {
  @ObservedObject var props: KPhotoLightboxViewProps

  var body: some View {
    KPhotoLightbox(content: props.content, topInset: props.insets.top) {
      props.onLbClose()
    }
    .kScreenEnvironment(props)
  }
}

// MARK: - The song shelf

struct KSongShelfRowRecord: Record {
  /// the song's link
  @Field var key: String = ""
  @Field var title: String = ""
  @Field var who: String = ""
}

final class KSongShelfViewProps: KScreenProps {
  @Field var title: String = ""
  @Field var closeLabel: String = ""
  @Field var says: String = ""
  @Field var evidence: String = ""
  @Field var bird: KImageRefRecord = KImageRefRecord()
  @Field var rows: [KSongShelfRowRecord] = []

  var onShClose = EventDispatcher()
  var onShOpen = EventDispatcher()

  private(set) lazy var actions: KSongShelfActions = {
    let a = KSongShelfActions()
    a.onClose = { [weak self] in self?.onShClose() }
    a.onOpen = { [weak self] key in self?.onShOpen(["key": key]) }
    return a
  }()

  var content: KSongShelfContent {
    var c = KSongShelfContent()
    c.title = title
    c.closeLabel = closeLabel
    c.says = says
    c.evidence = evidence
    c.bird = bird.ref
    c.rows = rows.map { KSongShelfRow(id: $0.key, title: $0.title, who: $0.who) }
    return c
  }
}

struct KSongShelfView: ExpoSwiftUI.View {
  @ObservedObject var props: KSongShelfViewProps

  var body: some View {
    KSongShelf(theme: props.kTheme, content: props.content, actions: props.actions)
      .kScreenEnvironment(props)
  }
}

// MARK: - The signing sheet

struct KSignSheetStringsRecord: Record {
  @Field var title: String = ""
  @Field var closeLabel: String = ""
  @Field var lead: String = ""
  @Field var faceLabel: String = ""
  @Field var faceNote: String = ""
  @Field var faceNone: String = ""
  @Field var nameLabel: String = ""
  @Field var namePlaceholder: String = ""
  @Field var nameNote: String = ""
  @Field var nameError: String = ""
  @Field var clearLabel: String = ""
  @Field var signLabel: String = ""
  @Field var typeToggle: String = ""
  @Field var typeHint: String = ""
  @Field var legal: String = ""
  @Field var undo: String = ""
  @Field var clear: String = ""
  @Field var guestText: String = ""
  @Field var guestLink: String = ""
  @Field var send: String = ""
  @Field var foot: String = ""
  @Field var typedEmpty: String = ""
  @Field var caption: String = ""
  @Field var padLabel: String = ""
  @Field var padValue: String = ""
}

/// A face in the row as TS sends it (faces.ts faceRecord), with what VoiceOver says for it.
struct KSignSheetFaceRecord: Record {
  @Field var kind: String = "placeholder"
  @Field var uri: String = ""
  @Field var key: String = ""
  @Field var overscan: Double = 0
  @Field var mask: Int = 0
  @Field var label: String = ""
  @Field var none: Bool = false

  func source(_ theme: KTheme) -> KFaceSource {
    switch kind {
    case "image": return .image(KImageRef(uri: uri, key: key), overscan: CGFloat(overscan))
    case "mosaic": return .mosaic(mask: mask, tint: theme.ink)
    case "veil": return .veil
    default: return .placeholder
    }
  }
}

final class KSignSheetViewProps: KScreenProps {
  @Field var strings: KSignSheetStringsRecord = KSignSheetStringsRecord()
  @Field var errorInk: String = "#C0392B"
  @Field var faces: [KSignSheetFaceRecord] = []
  @Field var chosen: Int = 0
  @Field var typed: Bool = false
  @Field var typedName: String = ""
  @Field var typedUpright: Bool = false
  @Field var typedEmptyUpright: Bool = false
  @Field var guide: String = ""
  @Field var guideUpright: Bool = false
  @Field var padWidth: Double = 343
  @Field var padHeight: Double = 110
  @Field var ink: String = ""
  @Field var strokeCount: Int = 0
  @Field var full: Bool = false
  @Field var canSend: Bool = false
  @Field var busy: Bool = false

  var onSsClose = EventDispatcher()
  var onSsName = EventDispatcher()
  var onSsFace = EventDispatcher()
  var onSsType = EventDispatcher()
  var onSsStroke = EventDispatcher()
  var onSsUndo = EventDispatcher()
  var onSsClear = EventDispatcher()
  var onSsGuest = EventDispatcher()
  var onSsSend = EventDispatcher()

  /// the pen name's field, as long-lived as the view, like `commands`
  let field = KFieldController()

  private(set) lazy var actions: KSignSheetActions = {
    let a = KSignSheetActions()
    a.onClose = { [weak self] in self?.onSsClose() }
    a.onName = { [weak self] text in self?.onSsName(["text": text]) }
    a.onFace = { [weak self] index in self?.onSsFace(["index": index]) }
    a.onTypeToggle = { [weak self] in self?.onSsType() }
    a.onStroke = { [weak self] points in self?.onSsStroke(["points": points]) }
    a.onUndo = { [weak self] in self?.onSsUndo() }
    a.onClear = { [weak self] in self?.onSsClear() }
    a.onGuest = { [weak self] in self?.onSsGuest() }
    a.onSend = { [weak self] in self?.onSsSend() }
    return a
  }()

  var content: KSignSheetContent {
    let theme = kTheme
    let s = strings
    var c = KSignSheetContent()
    c.title = s.title
    c.closeLabel = s.closeLabel
    c.lead = s.lead
    c.faceLabel = s.faceLabel
    c.faceNote = s.faceNote
    c.faceNone = s.faceNone
    c.nameLabel = s.nameLabel
    c.namePlaceholder = s.namePlaceholder
    c.nameNote = s.nameNote
    c.nameError = s.nameError
    c.errorInk = errorInk.hasPrefix("#") ? Color(hex: errorInk) : theme.ink
    c.clearLabel = s.clearLabel
    c.signLabel = s.signLabel
    c.typeToggle = s.typeToggle
    c.typeHint = s.typeHint
    c.legal = s.legal
    c.undo = s.undo
    c.clear = s.clear
    c.guestText = s.guestText
    c.guestLink = s.guestLink
    c.send = s.send
    c.foot = s.foot
    c.faces = faces.enumerated().map { i, f in KSignSheetFace(id: i, source: f.source(theme), label: f.label, none: f.none) }
    c.chosen = chosen
    c.typed = typed
    c.typedName = typedName
    c.typedUpright = typedUpright
    c.typedEmpty = s.typedEmpty
    c.typedEmptyUpright = typedEmptyUpright
    c.padSize = CGSize(width: max(1, padWidth), height: max(1, padHeight))
    c.guide = guide
    c.guideUpright = guideUpright
    c.caption = s.caption
    c.padLabel = s.padLabel
    c.padValue = s.padValue
    c.ink = ink
    c.strokeCount = strokeCount
    c.full = full
    c.canSend = canSend
    c.busy = busy
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

struct KSignSheetView: ExpoSwiftUI.View {
  @ObservedObject var props: KSignSheetViewProps

  var body: some View {
    KSignSheet(theme: props.kTheme, content: props.content, field: props.field, bottomInset: props.insets.bottom, actions: props.actions)
      .kScreenEnvironment(props)
      .onKCommand(props.commands) { name, args in
        props.handle(name, args)
      }
  }
}

extension KSignSheetView: ExpoSwiftUI.FocusableView {
  func forceResignFirstResponder() {
    if props.field.isFocused {
      _ = UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
    props.field.blur()
  }
}
