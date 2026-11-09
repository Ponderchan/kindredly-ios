import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 THREE NOTES PAGES, AS REACT NATIVE SEES THEM (2026-10-27): one journal page, one day of them, and
 the photo roll the ＋ opens for a new note. Each is a screen view like every step-5 screen
 (KScreenProps.swift: theme, letterFont, insets, rev, commands), registered with ExpoUIView and the
 "command" AsyncFunction in KindredlyUIModule.swift, alone in one @expo/ui <Host> (SurfaceHost).
 This file turns records into Portable values and taps into events; the screens are
 Portable/Notes/KNotePageScreen.swift, KNoteDayScreen.swift and KPhotoRollScreen.swift and know
 nothing of Expo. This file imports ExpoUI, whose public Button, Text and Image would make bare
 names ambiguous, so nothing of that kind is written here.

 KNotePageView (modules/kindredly-ui/src/NotePages.tsx, src/screens/note-page/NotePageNative.tsx)
 - strings: { backLabel, moreLabel, driftLabel, deleteLabel, dateLine, notFound, oneLineOut,
   tomorrowStranger, coverHint, photoHint, makeCover }
 - state: loading | ready | missing (an unknown one reads as loading)
 - kind: text | photo | voice | video; group, icon (the mood); body, pure, drifted, canDrift
 - photos: [{ id, index, image (KImageRefRecord), a11y }] in drawing order, the cover first
 - canSetCover, coverHint, voice, film
 - children: <KIsland name="voice"> (AudioCard), <KIsland name="film"> (the player)
 Events: onNpBack {}, onNpDrift {}, onNpDelete {}, onNpPhoto { index }, onNpCover { index }
 Batch 3 (2026-11-09), each behind its own switch, the island kept for when it is off:
 - the voice card ("notevoice"): the voice slot is KVoiceSlot (Portable/Voice), the island alone
   until TS sends the `voice` command { showCard, card: { look, playing, label }, island } (the
   composers' `recorder` shape; TS keeps the player, src/screens/note-page/NoteVoiceDriver.tsx);
   the disc comes back as onNpVoice { action: "toggle" }
 - the film ("notefilm"): swiftFilm { url, playLabel, pauseLabel } with a url draws KNoteFilm
   (Portable/Notes/KNoteFilm.swift) in the film slot instead of the island

 KNoteDayView (the same TS file, src/screens/note-page/NoteDayNative.tsx)
 - strings: { title, backLabel, footer, play, pause }
 - notes: the Notes tab's own note records (KNoteRecord, Adapters/KNotesView.swift), oldest first
 Commands: playback { key, playing, positionS, durationS, at, failed } (the Notes tab's)
 Events: onNdBack {}, onNdOpen { id }, onNdVoiceToggle { id }

 KPhotoRollView (the same TS file, src/screens/photo-roll/PhotoRollNative.tsx)
 - strings: { closeLabel, title, camera, write, say, denied, settings, none, limited }
 - keys: ["camera" | "text" | "voice"]; lead (a frame record, id "" for none); leadBlank
 - frames: [{ id, uri (ph://… or a file), video, duration, a11y }] — the roll after the first row
 - empty: "" | "nothing" | "denied"
 Pictures with a ph:// uri are read from the phone's library (KPhotoLibraryLoader); anything else
 goes to the shared KImageStore.
 Commands (what changes with a tap; a prop change would re-send the whole roll):
 - selection { picked: [asset id] in the order chosen, next (Next as drawn), nextLive }
 - albums { open, loaded, rows: [{ key, title, count, cover (uri), current }] }
 Events: onPrClose {}, onPrAlbums {}, onPrAlbum { index }, onPrNext {}, onPrKey { key },
 onPrFrame { id }, onPrReachEnd {}, onPrSettings {}, onPrLimited {}
 */

// MARK: - One journal page

struct KNotePageStringsRecord: Record {
  @Field var backLabel: String = ""
  @Field var moreLabel: String = ""
  @Field var driftLabel: String = ""
  @Field var deleteLabel: String = ""
  @Field var dateLine: String = ""
  @Field var notFound: String = ""
  @Field var oneLineOut: String = ""
  @Field var tomorrowStranger: String = ""
  @Field var coverHint: String = ""
  @Field var photoHint: String = ""
  @Field var makeCover: String = ""

  var strings: KNotePageStrings {
    var s = KNotePageStrings()
    s.backLabel = backLabel
    s.moreLabel = moreLabel
    s.driftLabel = driftLabel
    s.deleteLabel = deleteLabel
    s.dateLine = dateLine
    s.notFound = notFound
    s.oneLineOut = oneLineOut
    s.tomorrowStranger = tomorrowStranger
    s.coverHint = coverHint
    s.photoHint = photoHint
    s.makeCover = makeCover
    return s
  }
}

struct KNotePagePhotoRecord: Record {
  @Field var id: String = ""
  /// its place in the page's album
  @Field var index: Int = 0
  @Field var image: KImageRefRecord = KImageRefRecord()
  @Field var a11y: String = ""
}

final class KNotePageViewProps: KScreenProps {
  @Field var strings: KNotePageStringsRecord = KNotePageStringsRecord()
  @Field var state: String = "loading"
  @Field var kind: String = "text"
  @Field var group: String = "calm"
  @Field var icon: String = ""
  @Field var body: String = ""
  @Field var pure: Bool = false
  @Field var drifted: String = ""
  @Field var canDrift: Bool = false
  @Field var photos: [KNotePagePhotoRecord] = []
  @Field var canSetCover: Bool = false
  @Field var coverHint: Bool = false
  @Field var voice: Bool = false
  @Field var film: Bool = false
  // batch 3: notevoice, notefilm
  @Field var swiftFilm: KNoteFilmRecord = KNoteFilmRecord()
  var onNpVoice = EventDispatcher()
  /// The voice slot's state, from the `voice` command (as long-lived as the view).
  let voiceSlot = KVoiceSlotModel()

  func handle(_ name: String, _ args: [String: Any]) {
    if name == "voice" { voiceSlot.update(KVoiceSlotState(args: args)) }
  }

  var onNpBack = EventDispatcher()
  var onNpDrift = EventDispatcher()
  var onNpDelete = EventDispatcher()
  var onNpPhoto = EventDispatcher()
  var onNpCover = EventDispatcher()

  private(set) lazy var actions: KNotePageActions = {
    let a = KNotePageActions()
    a.onBack = { [weak self] in self?.onNpBack() }
    a.onDrift = { [weak self] in self?.onNpDrift() }
    a.onDelete = { [weak self] in self?.onNpDelete() }
    a.onPhoto = { [weak self] index in self?.onNpPhoto(["index": index]) }
    a.onCover = { [weak self] index in self?.onNpCover(["index": index]) }
    return a
  }()

  var content: KNotePageContent {
    var c = KNotePageContent()
    c.strings = strings.strings
    c.state = KNotePageState(rawValue: state) ?? .loading
    c.kind = KNoteKind(rawValue: kind) ?? .text
    c.group = KMoodGroup.from(group)
    c.icon = icon
    c.body = body
    c.pure = pure
    c.drifted = drifted
    c.canDrift = canDrift
    c.photos = cached("photos") {
      var seen = Set<String>()
      return photos.compactMap { r in
        guard !r.id.isEmpty, seen.insert(r.id).inserted else { return nil }
        return KNotePagePhoto(id: r.id, index: r.index, image: r.image.ref, accessibilityLabel: r.a11y)
      }
    }
    c.canSetCover = canSetCover
    c.coverHint = coverHint
    c.voice = voice
    c.film = film
    return c
  }
}

struct KNotePageView: ExpoSwiftUI.View {
  @ObservedObject var props: KNotePageViewProps

  var body: some View {
    KNotePageScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: props.insets.top,
      bottomInset: props.insets.bottom,
      actions: props.actions
    ) {
      // the island alone until TS says Swift draws the card (batch 3: notevoice)
      KVoiceSlot(model: props.voiceSlot, theme: props.kTheme, spacing: 0, island: props.children?.kSlot("voice")) { action in
        props.onNpVoice(["action": action.rawValue])
      }
    } film: {
      // batch 3: notefilm
      if let url = KMediaURL.from(props.swiftFilm.url) {
        KNoteFilm(url: url, playLabel: props.swiftFilm.playLabel, pauseLabel: props.swiftFilm.pauseLabel)
      } else {
        props.children?.kSlot("film")
      }
    }
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
  }
}

/// The film Swift draws (batch 3: notefilm); no url keeps the island.
struct KNoteFilmRecord: Record {
  @Field var url: String = ""
  @Field var playLabel: String = ""
  @Field var pauseLabel: String = ""
}

// MARK: - One day of pages

struct KNoteDayStringsRecord: Record {
  @Field var title: String = ""
  @Field var backLabel: String = ""
  @Field var footer: String = ""
  @Field var play: String = ""
  @Field var pause: String = ""
}

final class KNoteDayViewProps: KScreenProps {
  @Field var strings: KNoteDayStringsRecord = KNoteDayStringsRecord()
  @Field var notes: [KNoteRecord] = []

  var onNdBack = EventDispatcher()
  var onNdOpen = EventDispatcher()
  var onNdVoiceToggle = EventDispatcher()

  /// The one player's state, as on the Notes tab: as long-lived as the view, like `commands`.
  let driver = KNotesDriver()

  /// The cards' taps (a card only opens its note and plays its voice), made once.
  private(set) lazy var actions: KNotesActions = {
    let a = KNotesActions()
    a.onOpen = { [weak self] id in self?.onNdOpen(["id": id]) }
    a.onToggleVoice = { [weak self] id in self?.onNdVoiceToggle(["id": id]) }
    return a
  }()

  func handle(_ name: String, _ args: [String: Any]) {
    if name == KCommandName.playback {
      driver.setPlayback(KNotesViewProps.playback(args))
    }
  }

  var content: KNoteDayContent {
    var c = KNoteDayContent()
    c.title = strings.title
    c.backLabel = strings.backLabel
    c.footer = strings.footer
    c.play = strings.play
    c.pause = strings.pause
    c.notes = cached("notes") {
      var seen = Set<String>()
      return notes.compactMap { r in
        guard !r.id.isEmpty, seen.insert(r.id).inserted else { return nil }
        return r.note
      }
    }
    return c
  }
}

struct KNoteDayView: ExpoSwiftUI.View {
  @ObservedObject var props: KNoteDayViewProps

  var body: some View {
    KNoteDayScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: props.insets.top,
      bottomInset: props.insets.bottom,
      driver: props.driver,
      actions: props.actions
    ) {
      props.onNdBack()
    }
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
  }
}

// MARK: - The photo roll

struct KPhotoRollStringsRecord: Record {
  @Field var closeLabel: String = ""
  @Field var title: String = ""
  @Field var camera: String = ""
  @Field var write: String = ""
  @Field var say: String = ""
  @Field var denied: String = ""
  @Field var settings: String = ""
  @Field var none: String = ""
  @Field var limited: String = ""

  var strings: KPhotoRollStrings {
    var s = KPhotoRollStrings()
    s.closeLabel = closeLabel
    s.title = title
    s.camera = camera
    s.write = write
    s.say = say
    s.denied = denied
    s.settings = settings
    s.none = none
    s.limited = limited
    return s
  }
}

struct KPhotoRollFrameRecord: Record {
  /// the library's asset id; "" for none
  @Field var id: String = ""
  /// ph://… (read from the library) or a file
  @Field var uri: String = ""
  @Field var video: Bool = false
  @Field var duration: String = ""
  @Field var a11y: String = ""

  var frame: KPhotoRollFrame? {
    guard !id.isEmpty else { return nil }
    return KPhotoRollFrame(id: id, image: KPhotoLibraryLoader.ref(uri), video: video, duration: duration, accessibilityLabel: a11y)
  }
}

final class KPhotoRollViewProps: KScreenProps {
  @Field var strings: KPhotoRollStringsRecord = KPhotoRollStringsRecord()
  @Field var keys: [String] = []
  @Field var lead: KPhotoRollFrameRecord = KPhotoRollFrameRecord()
  @Field var leadBlank: Bool = false
  @Field var frames: [KPhotoRollFrameRecord] = []
  @Field var empty: String = ""

  var onPrClose = EventDispatcher()
  var onPrAlbums = EventDispatcher()
  var onPrAlbum = EventDispatcher()
  var onPrNext = EventDispatcher()
  var onPrKey = EventDispatcher()
  var onPrFrame = EventDispatcher()
  var onPrReachEnd = EventDispatcher()
  var onPrSettings = EventDispatcher()
  var onPrLimited = EventDispatcher()

  private(set) lazy var actions: KPhotoRollActions = {
    let a = KPhotoRollActions()
    a.onClose = { [weak self] in self?.onPrClose() }
    a.onAlbums = { [weak self] in self?.onPrAlbums() }
    a.onAlbum = { [weak self] index in self?.onPrAlbum(["index": index]) }
    a.onNext = { [weak self] in self?.onPrNext() }
    a.onKey = { [weak self] key in self?.onPrKey(["key": key.rawValue]) }
    a.onFrame = { [weak self] id in self?.onPrFrame(["id": id]) }
    a.onReachEnd = { [weak self] in self?.onPrReachEnd() }
    a.onSettings = { [weak self] in self?.onPrSettings() }
    a.onLimited = { [weak self] in self?.onPrLimited() }
    return a
  }()

  /// The picks, Next and the album list: as long-lived as the view, like `commands`.
  let driver = KPhotoRollDriver()

  /// One command from the bus (see the list at the top of the file).
  func handle(_ name: String, _ args: [String: Any]) {
    switch name {
    case "selection":
      let picked = (args["picked"] as? [Any] ?? []).compactMap { $0 as? String }
      driver.setSelection(picked: picked, next: args.kString("next") ?? "", nextLive: args.kBool("nextLive") ?? false)
    case "albums":
      driver.setAlbums(open: args.kBool("open") ?? false, loaded: args.kBool("loaded") ?? false, albums: Self.albums(args["rows"]))
    default:
      break
    }
  }

  /// The 'albums' command's rows; a row without a key is keyed by its place, a repeated key dropped.
  static func albums(_ raw: Any?) -> [KPhotoRollAlbum] {
    var seen = Set<String>()
    return (raw as? [Any] ?? []).enumerated().compactMap { index, item in
      guard let r = item as? [String: Any] else { return nil }
      let given = r.kString("key") ?? ""
      let key = given.isEmpty ? "#\(index)" : given
      guard seen.insert(key).inserted else { return nil }
      return KPhotoRollAlbum(
        id: key,
        index: index,
        title: r.kString("title") ?? "",
        count: r.kString("count") ?? "",
        cover: KPhotoLibraryLoader.ref(r.kString("cover") ?? ""),
        current: r.kBool("current") ?? false
      )
    }
  }

  var content: KPhotoRollContent {
    var c = KPhotoRollContent()
    c.strings = strings.strings
    c.keys = keys.compactMap(KPhotoRollKey.init(rawValue:))
    c.lead = lead.frame
    c.leadBlank = leadBlank
    c.frames = cached("frames") {
      var seen = Set<String>()
      return frames.compactMap { r in
        guard let f = r.frame, seen.insert(f.id).inserted else { return nil }
        return f
      }
    }
    c.empty = KPhotoRollEmpty(rawValue: empty) ?? .none
    return c
  }
}

struct KPhotoRollView: ExpoSwiftUI.View {
  @ObservedObject var props: KPhotoRollViewProps

  var body: some View {
    KPhotoRollScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: props.insets.top,
      bottomInset: props.insets.bottom,
      driver: props.driver,
      actions: props.actions
    )
    // the library's pictures first; the shared store for the rest (the innermost loader wins)
    .kImageLoader(KPhotoLibraryLoader.shared)
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
  }
}
