import SwiftUI
import UIKit
import ExpoModulesCore
import ExpoUI

/*
 THE STEP-5 SPIKE LAB as React Native sees it (batch 0b, dev only): <KLabView … /> on the JS
 side (modules/kindredly-ui/src/Lab.tsx), drawn by src/app/dev/step5-lab.tsx in one full-screen
 Host. This file turns props into Portable values and the lab's actions into events; the
 surface itself is Portable/Kit/KLab.swift.

 Built as every step-5 screen is (KScreenProps.swift): the props subclass KScreenProps (theme,
 letterFont, insets, rev, commands), the view is registered with ExpoUIView and the "command"
 AsyncFunction, and it MUST sit in an @expo/ui <Host>. It holds a KField, so it is an
 ExpoSwiftUI.FocusableView: the virtual view resigns it before the view is taken off screen
 (SwiftUIVirtualView.swift:131-133, 400-411), the expo focus/unmount crash's guard.

 Props, beyond KScreenProps:
 - rows: [{ id, body, mine, meta, menu: [KMenuAction] }], oldest first; convert once per rev
 - strings: every word (KLabStringsRecord)
 - assetImage, remoteImage, posterImage, birdImage: KImageRefRecord, uri "" for none
 - stamp: Date.now() in ms when TS changed it; a change reports onLabMeasure kind "stamp" with
   how long it took to reach here (the props round trip, whole props map included)
 - children: one <KIsland name="cord">

 Commands (KCommandBus): setText { target: "reply", value }, focus { target: "reply" }, blur,
 scrollTo { key: "top" | "end" | <row id>, animated }, playback { key, playing, positionS,
 durationS, at, failed }, composer { canSend }, reset, and the lab's own ping { at } (reports
 onLabMeasure kind "command": the command round trip, for the same comparison).

 Events, with what nativeEvent carries:
 - onLabSend { text }: Return in the field, or the send key
 - onLabDraft { text }: the reader's edits
 - onLabRowAction { id, key }: a menu item on a row
 - onLabVoiceToggle {}: the voice card's disc
 - onLabFacts { atBottom, topRowId, keyboardInset, focused }: on every change
 - onLabPull { depth }: a pull past the top ended, its deepest point in points
 - onLabNearTop {}: the list came within reach of its top
 - onLabMeasure { kind: "stamp" | "command", ms, n }: n is how many rows the props hold
 - onLabToggle { on }: the switch

 This file imports ExpoUI, whose public Button would make a bare "Button" ambiguous, so nothing
 of that kind is written here.
 */

/// One row as TS sends it.
struct KLabRowRecord: Record {
  @Field var id: String = ""
  @Field var body: String = ""
  @Field var mine: Bool = false
  @Field var meta: String = ""
  @Field var menu: [KMenuActionRecord] = []

  var labRow: KLabRow {
    KLabRow(
      id: id,
      body: body,
      mine: mine,
      meta: meta,
      menu: menu.map { KMenuItem(key: $0.key, title: $0.title, systemImage: $0.icon, destructive: $0.destructive) }
    )
  }
}

/// Every word of the lab, as TS sends it (KLabStrings).
struct KLabStringsRecord: Record {
  @Field var placeholder: String = ""
  @Field var sendLabel: String = ""
  @Field var plusLabel: String = ""
  @Field var hint: String = ""
  @Field var trayText: String = ""
  @Field var islandTitle: String = ""
  @Field var mediaTitle: String = ""
  @Field var assetCaption: String = ""
  @Field var remoteCaption: String = ""
  @Field var posterCaption: String = ""
  @Field var birdCaption: String = ""
  @Field var voiceTitle: String = ""
  @Field var voiceDuration: String = ""
  @Field var playLabel: String = ""
  @Field var pauseLabel: String = ""
  @Field var toggleLabel: String = ""
  @Field var listTitle: String = ""

  var labStrings: KLabStrings {
    var s = KLabStrings()
    s.placeholder = placeholder
    s.sendLabel = sendLabel
    s.plusLabel = plusLabel
    s.hint = hint
    s.trayText = trayText
    s.islandTitle = islandTitle
    s.mediaTitle = mediaTitle
    s.assetCaption = assetCaption
    s.remoteCaption = remoteCaption
    s.posterCaption = posterCaption
    s.birdCaption = birdCaption
    s.voiceTitle = voiceTitle
    s.voiceDuration = voiceDuration
    s.playLabel = playLabel
    s.pauseLabel = pauseLabel
    s.toggleLabel = toggleLabel
    s.listTitle = listTitle
    return s
  }
}

final class KLabViewProps: KScreenProps {
  @Field var rows: [KLabRowRecord] = []
  @Field var strings: KLabStringsRecord = KLabStringsRecord()
  @Field var assetImage: KImageRefRecord = KImageRefRecord()
  @Field var remoteImage: KImageRefRecord = KImageRefRecord()
  @Field var posterImage: KImageRefRecord = KImageRefRecord()
  @Field var birdImage: KImageRefRecord = KImageRefRecord()
  /// Date.now() (ms) when TS set it; 0 for none
  @Field var stamp: Double = 0

  var onLabSend = EventDispatcher()
  var onLabDraft = EventDispatcher()
  var onLabRowAction = EventDispatcher()
  var onLabVoiceToggle = EventDispatcher()
  var onLabFacts = EventDispatcher()
  var onLabPull = EventDispatcher()
  var onLabNearTop = EventDispatcher()
  var onLabMeasure = EventDispatcher()
  var onLabToggle = EventDispatcher()

  /// The field, scroll requests, the voice, canSend: as long-lived as the view, like `commands`.
  let driver = KLabDriver()

  /// The lab's actions, made once: each closure reaches this props object's events.
  private(set) lazy var actions: KLabActions = {
    let a = KLabActions()
    a.onSend = { [weak self] in self?.onLabSend(["text": $0]) }
    a.onDraft = { [weak self] in self?.onLabDraft(["text": $0]) }
    a.onRowAction = { [weak self] id, key in self?.onLabRowAction(["id": id, "key": key]) }
    a.onVoiceToggle = { [weak self] in self?.onLabVoiceToggle() }
    a.onFacts = { [weak self] facts in
      self?.onLabFacts([
        "atBottom": facts.atBottom,
        "topRowId": facts.topRowId,
        "keyboardInset": Double(facts.keyboardInset),
        "focused": facts.focused,
      ])
    }
    a.onPullRelease = { [weak self] in self?.onLabPull(["depth": Double($0)]) }
    a.onNearTop = { [weak self] in self?.onLabNearTop() }
    a.onToggle = { [weak self] in self?.onLabToggle(["on": $0]) }
    return a
  }()

  /// JS's clock, in the same units (ms since 1970, as Date.now()).
  private static var nowMs: Double { Date().timeIntervalSince1970 * 1000 }

  /// A stamp arrived: how long its props round took to reach the body.
  func measureStamp(_ stamp: Double) {
    guard stamp > 0 else { return }
    onLabMeasure(["kind": "stamp", "ms": Self.nowMs - stamp, "n": rows.count])
  }

  /// One command from the bus (see the list at the top of the file).
  func handle(_ name: String, _ args: [String: Any]) {
    switch name {
    case KCommandName.setText:
      if args.kString("target") == "reply" { driver.reply.setText(args.kString("value") ?? "") }
    case KCommandName.focus:
      if args.kString("target") == "reply" { driver.reply.focus() }
    case KCommandName.blur:
      driver.reply.blur()
    case KCommandName.scrollTo:
      guard let request = KScrollRequest(args) else { return }
      let animated = args.kBool("animated") ?? true
      switch request {
      case .top: driver.scroll(to: .top, animated: animated)
      case .end: driver.scroll(to: .end, animated: animated)
      case let .key(id): driver.scroll(to: .row(id), animated: animated)
      }
    case KCommandName.playback:
      let key = args.kString("key") ?? ""
      driver.voiceUnavailable = args.kBool("failed") ?? false
      driver.playback = key.isEmpty ? nil : KPlayback(
        playing: args.kBool("playing") ?? false,
        positionS: args.kDouble("positionS") ?? 0,
        durationS: args.kDouble("durationS") ?? 0,
        at: args.kDate("at") ?? Date()
      )
    case KCommandName.composer:
      driver.canSend = args.kBool("canSend") ?? false
    case KCommandName.reset:
      driver.reply.blur()
      driver.reply.clear()
      driver.canSend = false
      driver.playback = nil
    case "ping":
      guard let at = args.kDouble("at") else { return }
      onLabMeasure(["kind": "command", "ms": Self.nowMs - at, "n": rows.count])
    default:
      break
    }
  }
}

struct KLabView: ExpoSwiftUI.View {
  @ObservedObject var props: KLabViewProps

  var body: some View {
    let rows = props.cached("rows") { props.rows.map(\.labRow) }
    KLab(
      theme: props.kTheme,
      rows: rows,
      media: KLabMedia(
        asset: props.assetImage.ref,
        remote: props.remoteImage.ref,
        poster: props.posterImage.ref,
        bird: props.birdImage.ref
      ),
      strings: props.strings.labStrings,
      bottomInset: props.insets.bottom,
      driver: props.driver,
      actions: props.actions
    ) {
      props.children?.kSlot("cord")
    }
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
    .onChange(of: props.stamp) { _, stamp in
      props.measureStamp(stamp)
    }
  }
}

extension KLabView: ExpoSwiftUI.FocusableView {
  /// Before the view goes: the keyboard away if our field has it, then the field told it has
  /// lost focus (as @expo/ui's TextFieldView does, TextFieldView.swift:57-64).
  func forceResignFirstResponder() {
    let reply = props.driver.reply
    if reply.isFocused {
      _ = UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
    reply.blur()
  }
}

// MARK: - STAMP PRESS (custom stamps, build agent A, 2026-10-19)

/*
 THE STAMP PRESS CAMERA as React Native sees it: <KStampPressView … /> on the JS side
 (modules/kindredly-ui/src/StampPress.tsx), drawn by src/screens/stamp-press/StampPressNative.tsx
 in one full-screen Host from the /stamp-press route (a full-screen modal). Appended here rather
 than in a file of its own so the module needs no pod install. The page itself is
 KStampPressCamera at the end of Portable/Kit/KLab.swift.

 Props, beyond KScreenProps (insets: top = the status bar, bottom = the home indicator):
 - strings: every word (KStampPressStringsRecord, the Portable KStampPressStrings field for field)

 Events, with what nativeEvent carries:
 - onSpClose {}                         the ×
 - onSpPressed { uri, width, height, source }
     the pressed photo: a file:// JPEG in Caches/stamp-press/, the photo stamp's cut bounds,
     1280 × 1408 (10:11, KPhotoStamp.originalSize), upright, unfiltered, no EXIF;
     source "camera" | "library". Files there older than a day are swept on the next press.
 - onSpError { message }                the photo could not be written (never silent)
 */

struct KStampPressStringsRecord: Record {
  @Field var title: String = ""
  @Field var hint: String = ""
  @Field var upload: String = ""
  @Field var zoom: String = ""
  @Field var close: String = ""
  @Field var flashOn: String = ""
  @Field var flashOff: String = ""
  @Field var zoomA11y: String = ""
  @Field var shutter: String = ""
  @Field var viewfinder: String = ""
  @Field var choosePhoto: String = ""
  @Field var permission: String = ""
  @Field var allow: String = ""
  @Field var openSettings: String = ""
  @Field var instead: String = ""
  @Field var cropHint: String = ""
  @Field var cropA11y: String = ""
  @Field var useThis: String = ""
  @Field var back: String = ""
  @Field var noCamera: String = ""
  @Field var failed: String = ""
  @Field var pressed: String = ""

  /// the Portable strings; a field TS left empty keeps the English
  var portable: KStampPressStrings {
    var s = KStampPressStrings()
    func put(_ v: String, _ k: WritableKeyPath<KStampPressStrings, String>) { if !v.isEmpty { s[keyPath: k] = v } }
    put(title, \.title)
    put(hint, \.hint)
    put(upload, \.upload)
    put(zoom, \.zoom)
    put(close, \.close)
    put(flashOn, \.flashOn)
    put(flashOff, \.flashOff)
    put(zoomA11y, \.zoomA11y)
    put(shutter, \.shutter)
    put(viewfinder, \.viewfinder)
    put(choosePhoto, \.choosePhoto)
    put(permission, \.permission)
    put(allow, \.allow)
    put(openSettings, \.openSettings)
    put(instead, \.instead)
    put(cropHint, \.cropHint)
    put(cropA11y, \.cropA11y)
    put(useThis, \.useThis)
    put(back, \.back)
    put(noCamera, \.noCamera)
    put(failed, \.failed)
    put(pressed, \.pressed)
    return s
  }
}

final class KStampPressViewProps: KScreenProps {
  @Field var strings: KStampPressStringsRecord = KStampPressStringsRecord()

  var onSpClose = EventDispatcher()
  var onSpPressed = EventDispatcher()
  var onSpError = EventDispatcher()

  /// Writes the pressed photo where TS can read it and says where.
  func deliver(_ photo: KPressedPhoto) {
    let fm = FileManager.default
    guard let caches = fm.urls(for: .cachesDirectory, in: .userDomainMask).first else {
      onSpError(["message": "no caches directory"])
      return
    }
    let dir = caches.appendingPathComponent("stamp-press", isDirectory: true)
    try? fm.createDirectory(at: dir, withIntermediateDirectories: true)
    // yesterday's presses that never became stamps
    if let old = try? fm.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.contentModificationDateKey]) {
      let dayAgo = Date().addingTimeInterval(-86_400)
      for url in old {
        let date = (try? url.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate
        if let date, date < dayAgo { try? fm.removeItem(at: url) }
      }
    }
    let url = dir.appendingPathComponent(UUID().uuidString.lowercased() + ".jpg")
    do {
      try photo.jpeg.write(to: url, options: .atomic)
    } catch {
      onSpError(["message": "could not write the pressed photo: \(error.localizedDescription)"])
      return
    }
    onSpPressed([
      "uri": url.absoluteString,
      "width": Int(photo.image.size.width),
      "height": Int(photo.image.size.height),
      "source": photo.source.rawValue,
    ])
  }
}

struct KStampPressView: ExpoSwiftUI.View {
  @ObservedObject var props: KStampPressViewProps

  var body: some View {
    KStampPressCamera(
      strings: props.strings.portable,
      topInset: props.insets.top,
      bottomInset: props.insets.bottom,
      onClose: { props.onSpClose() },
      onPressed: { photo in props.deliver(photo) }
    )
    .kScreenEnvironment(props)
  }
}
