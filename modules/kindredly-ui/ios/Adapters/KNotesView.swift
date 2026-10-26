import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 THE NOTES TAB as React Native sees it: <KNotesView … /> on the JS side
 (modules/kindredly-ui/src/Notes.tsx), drawn by src/screens/notes/NotesNative.tsx in one
 full-screen Host. This file turns records into Portable values and taps into events; the screen
 itself is Portable/Notes/KNotesScreen.swift and knows nothing about Expo.

 Built as every step-5 screen is (KScreenProps.swift): the props subclass KScreenProps (theme,
 letterFont, insets, rev, commands), the view is registered with ExpoUIView and the "command"
 AsyncFunction (KindredlyUIModule.swift), and it MUST sit in an @expo/ui <Host>: one Host for the
 whole screen, never one per row. It has no text field. Pictures (photos, video frames, her bird)
 load through the shared KImageStore that kScreenEnvironment installs.

 Props, beyond KScreenProps (insets.top = the status bar the screen draws its strip for,
 insets.tabBarRoom = the floating bar the bottom fade and the last note clear):
 - strings: KNotesStringsRecord (every word that isn't on a note; weekdays as an array; Notes E1's
   neTitle, neLines × 4, neAsks × 4, neTime, neA11yCard, neGroupNames × 4)
 - notes: [{ id, kind, group, icon, label, textTier, shortLabel, listLabel, body,
   listLine, photo, photos, photoCount, photoMore, video, duration, playable, waveSeed, a11y }] —
   the window TS sends (60, then 60 more), newest first; icon is the mood icon's art key (moods.ts
   moodArtKey: "mood-sleepy", "mood-group-low"; KMoodChip draws the group's icon for one it has no
   drawing for, "" included); label is Card's "OCT 16 · 08:12", textTier none | short | mid | long
   the words' size (the owner's card layouts, 2026-10-18; all in the system face); photo (the detail page's cover), each of photos (the first four in the
   order taken) and video are image refs ({ uri, key, kind }; uri "" for none; video's kind is
   "videoPoster"); photoCount is how many pictures the note holds and photoMore the +N past the four
   shown. A bundle from before the card layouts (no textTier, no photos) still draws: its words as
   mid, its cover as the one picture. Converted once per rev.
 - hasMore: more notes lie past the window
 - empty: no notes at all (the empty state)
 - view: card | grid | list
 - calendarOpen: the overlay is up
 - recentGroups: the calendar button's six squares, ["calm" | "happy" | "tired" | "low"]
 - wrenLine: her first-visit line, "" for none
 - wrenFirst: the line is Notes E1's one-time "first one down…" (drawn in the system font)
 - bird, birdMini: her snapshots ({ uri, key }; uri "" until captured)
 - evening: none | ask | on; eveningBusy
 - palette: { keyText, keyVoice, tape, sticker } as "#RRGGBB" (the empty state's fixed colours)

 Commands (KCommandBus):
 - month { key, title, lead, days: [{ n, label, group ("" for none), icon, targetId, future, today,
   a11y }], counts: [String × 4], footer, footerA11y, legendA11y: [String × 4], canPrev,
   canNext } — the calendar's month, one at a time
 - playback { key, playing, positionS, durationS, at, failed } — the one player's transitions
   (key "" = nothing loaded)
 - scrollTo { key: "top" | <a note id>, animated }
 - popIn { key: <a note id> } — the page just sealed pops into its place (send it once the note is
   in `notes`)

 Events, with what nativeEvent carries:
 - onNotesOpen { id }              a note
 - onNotesViewCycle {}             the view button
 - onNotesCalendarToggle { open }  the calendar button, the dim, escape
 - onNotesCalendarMonth { delta }  a month chevron (-1 | 1)
 - onNotesDayPick { id }           a calendar day: its newest page
 - onNotesVoiceToggle { id }       a voice note's play mark or VoiceOver action
 - onNotesEveningAnswer { answer } yes | no | off
 - onNotesWrenLineDismiss {}       her line tapped away
 - onNotesCompose { kind }         an empty-state key: text | voice
 - onNotesReachEnd {}              the list nears the end of the window
 - onNotesEmptyWrite { group }     Notes E1: the draft card under a chosen mood (calm | happy |
                                   tired | low)

 Unknown enum strings fall back rather than fail (a kind or a view this binary doesn't know
 draws as text / card, a group as calm, an evening as none). This file imports ExpoUI, whose public
 Button would make a bare "Button" ambiguous, so nothing of that kind is written here.
 */

struct KNoteRecord: Record {
  @Field var id: String = ""
  /// text | photo | voice | video
  @Field var kind: String = "text"
  /// calm | happy | tired | low
  @Field var group: String = "calm"
  /// the mood icon's art key ("mood-sleepy", "mood-group-low"); "" from a bundle that sends none
  @Field var icon: String = ""
  /// Card: "OCT 16 · 08:12"
  @Field var label: String = ""
  /// none | short | mid | long; "" from a bundle that sends none
  @Field var textTier: String = ""
  @Field var shortLabel: String = ""
  @Field var listLabel: String = ""
  @Field var body: String = ""
  @Field var listLine: String = ""
  /// the detail page's cover
  @Field var photo: KImageRefRecord = KImageRefRecord()
  /// the pictures the card shows, the first four in the order taken
  @Field var photos: [KImageRefRecord] = []
  /// how many pictures the note holds
  @Field var photoCount: Int = 0
  /// the +N on the last tile: the pictures past the four shown
  @Field var photoMore: Int = 0
  /// a video note's file, kind "videoPoster"
  @Field var video: KImageRefRecord = KImageRefRecord()
  @Field var duration: String = ""
  @Field var playable: Bool = false
  /// a 32-bit seed (JS numbers up to 2^32 - 1)
  @Field var waveSeed: Double = 0
  @Field var a11y: String = ""

  var note: KNote {
    let video = KImageRef(uri: self.video.uri, key: self.video.key, kind: .videoPoster)
    let cover = photo.ref
    // a bundle from before the card layouts sends no photos: its cover is the one picture
    let legacy = photos.isEmpty && photoCount == 0 && cover != nil
    let hasWords = !body.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    return KNote(
      id: id,
      kind: KNoteKind(rawValue: kind) ?? .text,
      group: KMoodGroup.from(group),
      icon: icon,
      label: label,
      textTier: KNoteTextTier(rawValue: textTier) ?? (hasWords ? .mid : .empty),
      shortLabel: shortLabel,
      listLabel: listLabel,
      body: body,
      listLine: listLine,
      photo: cover,
      photos: legacy ? [cover] : photos.map(\.ref),
      photoCount: legacy ? 1 : photoCount,
      photoMore: legacy ? 0 : photoMore,
      video: video,
      duration: duration,
      playable: playable,
      waveSeed: waveSeed.isFinite ? UInt32(truncatingIfNeeded: Int64(max(0, min(waveSeed, 4_294_967_295)))) : 0,
      a11yLabel: a11y
    )
  }
}

/// Every word of the screen that isn't on a note (NotesStrings in TS).
struct KNotesStringsRecord: Record {
  @Field var title: String = ""
  @Field var justYou: String = ""
  @Field var viewA11y: String = ""
  @Field var viewCard: String = ""
  @Field var viewGrid: String = ""
  @Field var viewList: String = ""
  @Field var calendarA11y: String = ""
  @Field var prevMonth: String = ""
  @Field var nextMonth: String = ""
  @Field var close: String = ""
  @Field var moments: String = ""
  @Field var play: String = ""
  @Field var pause: String = ""
  @Field var emptyTitle: String = ""
  @Field var emptyBody: String = ""
  @Field var newLabel: String = ""
  @Field var textKey: String = ""
  @Field var voiceKey: String = ""
  @Field var textKeyUpper: String = ""
  @Field var voiceKeyUpper: String = ""
  @Field var eveningAsk: String = ""
  @Field var eveningYes: String = ""
  @Field var eveningNo: String = ""
  @Field var eveningFoot: String = ""
  @Field var eveningOn: String = ""
  @Field var eveningOff: String = ""
  @Field var weekdays: [String] = []
  /// Notes E1 (the empty page); a bundle from before E1 sends none (the title then reads "")
  @Field var neTitle: String = ""
  @Field var neLines: [String] = []
  @Field var neAsks: [String] = []
  @Field var neTime: String = ""
  @Field var neA11yCard: String = ""
  @Field var neGroupNames: [String] = []

  var strings: KNotesStrings {
    var s = KNotesStrings()
    s.title = title
    s.justYou = justYou
    s.viewA11y = viewA11y
    s.viewCard = viewCard
    s.viewGrid = viewGrid
    s.viewList = viewList
    s.calendarA11y = calendarA11y
    s.prevMonth = prevMonth
    s.nextMonth = nextMonth
    s.close = close
    s.moments = moments
    s.play = play
    s.pause = pause
    s.emptyTitle = emptyTitle
    s.emptyBody = emptyBody
    s.newLabel = newLabel
    s.textKey = textKey
    s.voiceKey = voiceKey
    s.textKeyUpper = textKeyUpper
    s.voiceKeyUpper = voiceKeyUpper
    s.eveningAsk = eveningAsk
    s.eveningYes = eveningYes
    s.eveningNo = eveningNo
    s.eveningFoot = eveningFoot
    s.eveningOn = eveningOn
    s.eveningOff = eveningOff
    s.weekdays = weekdays
    s.neTitle = neTitle
    s.neLines = neLines
    s.neAsks = neAsks
    s.neTime = neTime
    s.neA11yCard = neA11yCard
    s.neGroupNames = neGroupNames
    return s
  }
}

/// The empty state's fixed colours, as "#RRGGBB".
struct KNotesPaletteRecord: Record {
  @Field var keyText: String = ""
  @Field var keyVoice: String = ""
  @Field var tape: String = ""
  @Field var sticker: String = ""

  /// an empty or unreadable colour draws nothing rather than the magenta of a bad hex
  private static func color(_ hex: String) -> Color {
    let digits = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
    guard digits.count == 6, digits.allSatisfy(\.isHexDigit) else { return .clear }
    return Color(hex: hex)
  }

  var palette: KNotesEmptyPalette {
    KNotesEmptyPalette(keyText: Self.color(keyText), keyVoice: Self.color(keyVoice), tape: Self.color(tape), sticker: Self.color(sticker))
  }
}

final class KNotesViewProps: KScreenProps {
  @Field var strings: KNotesStringsRecord = KNotesStringsRecord()
  @Field var notes: [KNoteRecord] = []
  @Field var hasMore: Bool = false
  @Field var empty: Bool = false
  @Field var view: String = "card"
  @Field var calendarOpen: Bool = false
  @Field var recentGroups: [String] = []
  @Field var wrenLine: String = ""
  @Field var wrenFirst: Bool = false
  @Field var bird: KImageRefRecord = KImageRefRecord()
  @Field var birdMini: KImageRefRecord = KImageRefRecord()
  @Field var evening: String = "none"
  @Field var eveningBusy: Bool = false
  @Field var palette: KNotesPaletteRecord = KNotesPaletteRecord()

  var onNotesOpen = EventDispatcher()
  var onNotesViewCycle = EventDispatcher()
  var onNotesCalendarToggle = EventDispatcher()
  var onNotesCalendarMonth = EventDispatcher()
  var onNotesDayPick = EventDispatcher()
  var onNotesVoiceToggle = EventDispatcher()
  var onNotesEveningAnswer = EventDispatcher()
  var onNotesWrenLineDismiss = EventDispatcher()
  var onNotesCompose = EventDispatcher()
  var onNotesReachEnd = EventDispatcher()
  var onNotesEmptyWrite = EventDispatcher()

  /// The month, the player, the scroll requests: as long-lived as the view, like `commands`.
  let driver = KNotesDriver()

  /// The screen's taps, made once: each closure reaches this props object's events.
  private(set) lazy var actions: KNotesActions = {
    let a = KNotesActions()
    a.onOpen = { [weak self] id in self?.onNotesOpen(["id": id]) }
    a.onCycleView = { [weak self] in self?.onNotesViewCycle() }
    a.onCalendarToggle = { [weak self] open in self?.onNotesCalendarToggle(["open": open]) }
    a.onCalendarMonth = { [weak self] delta in self?.onNotesCalendarMonth(["delta": delta]) }
    a.onDayPick = { [weak self] id in self?.onNotesDayPick(["id": id]) }
    a.onToggleVoice = { [weak self] id in self?.onNotesVoiceToggle(["id": id]) }
    a.onEvening = { [weak self] answer in self?.onNotesEveningAnswer(["answer": answer]) }
    a.onWrenLineDismiss = { [weak self] in self?.onNotesWrenLineDismiss() }
    a.onCompose = { [weak self] kind in self?.onNotesCompose(["kind": kind]) }
    a.onReachEnd = { [weak self] in self?.onNotesReachEnd() }
    a.onEmptyWrite = { [weak self] group in self?.onNotesEmptyWrite(["group": group]) }
    return a
  }()

  /// One command from the bus (see the list at the top of the file).
  func handle(_ name: String, _ args: [String: Any]) {
    switch name {
    case "month":
      driver.setMonth(Self.month(args))
    case KCommandName.playback:
      driver.setPlayback(Self.playback(args))
    case "popIn":
      if let id = args.kString("key"), !id.isEmpty { driver.popIn(id) }
    case KCommandName.scrollTo:
      let animated = args.kBool("animated") ?? true
      switch args.kString("key") {
      case nil, "":
        break
      case "top":
        driver.scroll(to: .top, animated: animated)
      case let id?:
        driver.scroll(to: .note(id), animated: animated)
      }
    default:
      break
    }
  }

  /// The 'month' command's record as a KNotesMonth; nil for one without a key.
  static func month(_ a: [String: Any]) -> KNotesMonth? {
    guard let key = a.kString("key"), !key.isEmpty else { return nil }
    let days: [KNotesDay] = (a["days"] as? [Any] ?? []).compactMap { item in
      guard let d = item as? [String: Any], let n = d.kInt("n") else { return nil }
      let group = d.kString("group").flatMap { KMoodGroup(rawValue: $0) }
      let target = d.kString("targetId").flatMap { $0.isEmpty ? nil : $0 }
      return KNotesDay(
        n: n,
        label: d.kString("label") ?? "",
        group: group,
        icon: d.kString("icon") ?? "",
        targetId: group == nil ? nil : target,
        future: d.kBool("future") ?? false,
        today: d.kBool("today") ?? false,
        a11yLabel: d.kString("a11y") ?? ""
      )
    }
    let strings: (String) -> [String] = { name in (a[name] as? [Any] ?? []).map { ($0 as? String) ?? "" } }
    return KNotesMonth(
      key: key,
      title: a.kString("title") ?? "",
      lead: a.kInt("lead") ?? 0,
      days: days,
      counts: strings("counts"),
      footer: a.kString("footer") ?? "",
      footerA11y: a.kString("footerA11y") ?? "",
      legendA11y: strings("legendA11y"),
      canPrev: a.kBool("canPrev") ?? false,
      canNext: a.kBool("canNext") ?? false
    )
  }

  /// The 'playback' command's state; nil when nothing is loaded (key "").
  static func playback(_ a: [String: Any]) -> KNotesPlayback? {
    guard let key = a.kString("key"), !key.isEmpty else { return nil }
    return KNotesPlayback(
      key: key,
      playback: KPlayback(
        playing: a.kBool("playing") ?? false,
        positionS: a.kDouble("positionS") ?? 0,
        durationS: a.kDouble("durationS") ?? 0,
        at: a.kDate("at") ?? Date()
      ),
      failed: a.kBool("failed") ?? false
    )
  }
}

struct KNotesView: ExpoSwiftUI.View {
  @ObservedObject var props: KNotesViewProps

  var body: some View {
    var content = KNotesContent()
    content.strings = props.strings.strings
    let notes = props.cached("notes") { () -> (notes: [KNote], index: [String: Int]) in
      let notes = props.notes.map(\.note)
      return (notes, KNotesContent.makeIndex(notes))
    }
    content.setNotes(notes.notes, index: notes.index)
    content.hasMore = props.hasMore
    content.empty = props.empty
    content.layout = KNoteLayout(rawValue: props.view) ?? .card
    content.calendarOpen = props.calendarOpen
    content.recentGroups = props.recentGroups.prefix(6).map(KMoodGroup.from)
    content.wrenLine = props.wrenLine
    content.wrenFirst = props.wrenFirst
    content.bird = props.bird.ref
    content.birdMini = props.birdMini.ref
    content.evening = KNotesEvening(rawValue: props.evening) ?? .none
    content.eveningBusy = props.eveningBusy
    content.palette = props.palette.palette
    let insets = props.insets
    return KNotesScreen(
      theme: props.kTheme,
      content: content,
      topInset: insets.top,
      tabBarRoom: insets.tabBarRoom,
      driver: props.driver,
      actions: props.actions
    )
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
  }
}
