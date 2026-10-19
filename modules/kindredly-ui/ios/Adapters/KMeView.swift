import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 THE ME TAB as React Native sees it: <KMeView … /> on the JS side (modules/kindredly-ui/src/Me.tsx),
 drawn by src/screens/me/MeNative.tsx in one full-screen Host. This file turns records into
 Portable values and taps into events, and places the React Native islands; the screen itself is
 Portable/Me/KMeScreen.swift (4a, 2026-10-19) and knows nothing about Expo.

 Built as every step-5 screen is (KScreenProps.swift): the props subclass KScreenProps (theme,
 letterFont, insets, rev, commands), the view is registered with ExpoUIView and the "command"
 AsyncFunction (KindredlyUIModule.swift), and it MUST sit in an @expo/ui <Host>: one Host for the
 whole screen, never one per card. It has no text field.

 Props, beyond KScreenProps (insets: top = the status bar the screen draws its strip for,
 tabBarRoom = the floating bar the last of the page clears, plus 12, and never less than the
 bottom fade's height - 6, since the fade is always drawn):
 - strings: { settingsLabel, courierA11y, segments: [4], expanded, collapsed, seeAllAction,
   openKindredsAction, locked }
 - profile: { name, joined ("joined Jul 27[ · COFOUNDER No. 007]", "" for none), editLabel,
   stamp ("1ST" | "007" | "": your C2 stamp round the avatar), stats: [{ key, count, unit, a11y, hint }] }
 - peekLetters: { state (loading | empty | ready), items: [{ id, date, stampId, stampHex, body,
   tone (quiet | answered | replied), status, a11y }], seeAll, emptyText, emptyCta }
 - peekKindreds: { state, items: [{ id, name, line, face (KKindredsFaceRecord), a11y }], open,
   emptyText }
 - looks: { header, all, allHint, tiles: [{ id (none | beanie | scarf | fc), label, name, bird,
   selected, locked, dim, hint }] }
 - aura: { present (false = the skeleton), label, title, from, chips: [{ id, name, emerging }],
   meterKind (ticks | slots), filled, total, slipsN, slipsOf (-1 for none), caption, cta, share,
   shareLabel }
 - report: { show, title, sub, enabled, locked, hint }
 - stamps: { label, count, cells: [{ id, date, a11y, hex }], emptyText, emptyCta }
 - firstClass: { eyebrow, headline, rows, cta, trial ("" = none), stampLabel, bird, member }
 - initialSegment: the segment to open on (read when the view first draws)
 Every record above is converted once per rev (useRev in TS).

 Children: three <KIsland>s, found by name — "avatar" (72 × 72, scaled by the header as it
 collapses), "courier" (the frame's inside × 236) and "auraArt" (the Aura card's inside × 110).
 The courier and aura islands are placed only while their card shows; TS fills them only then.

 Commands (KCommandBus): scrollTo { key: "top", animated } (Me pressed again while showing), and
 segment { index }, which shows a card as its chip would and sends onMeSegment as a chip does, so
 TS fills that card's island (the locked First Class look tile and "All looks →" use it).

 Events, with what nativeEvent carries:
 - onMeSettings {}             the gear
 - onMeEdit {}                 the pencil or the avatar
 - onMePeek { key, open }      a peek opened or closed (analytics only)
 - onMePeekLetter { id }       a mini letter card
 - onMePeekKindred { id }      a kindred card
 - onMeSeeAll {}               "See all n →" (and the letters button's custom action)
 - onMeOpenKindreds {}         "Open kindreds →" (and the kindreds button's custom action)
 - onMeWrite {}                the empty letters peek's "Write a letter →"
 - onMeSegment { index }       a chip or a segment command (the card is already showing)
 - onMeCourier {}              the courier's scene
 - onMeLook { id }             a looks tile: none | beanie | scarf | fc
 - onMeAllLooks {}             "All looks →"
 - onMeAuraOpen {}             the top of the Aura card
 - onMeAuraCta {}              its call to action
 - onMeAuraShare {}            its share key
 - onMeReport {}               the report door
 - onMeStampsEmpty {}          "Write a letter" under no stamps
 - onMeFirstClass {}           the First Class card

 Unknown enum strings fall back rather than fail (a meter kind draws the ticks, a peek state the
 skeleton, a tone the quiet colour), as KTabBarView does. This file imports ExpoUI, whose public
 Button, Text and Image would make bare names ambiguous, so nothing of that kind is written here.
 */

struct KMeStringsRecord: Record {
  @Field var settingsLabel: String = ""
  @Field var courierA11y: String = ""
  @Field var segments: [String] = []
  @Field var expanded: String = ""
  @Field var collapsed: String = ""
  @Field var seeAllAction: String = ""
  @Field var openKindredsAction: String = ""
  @Field var locked: String = ""

  var a11y: KMeA11yWords {
    var w = KMeA11yWords()
    w.expanded = expanded
    w.collapsed = collapsed
    w.seeAllAction = seeAllAction
    w.openKindredsAction = openKindredsAction
    w.locked = locked
    return w
  }
}

struct KMeStatRecord: Record {
  @Field var key: String = ""
  @Field var count: String = ""
  @Field var unit: String = ""
  @Field var a11y: String = ""
  @Field var hint: String = ""

  var stat: KMeStat {
    KMeStat(key: key, count: count, unit: unit, a11yLabel: a11y, hint: hint)
  }
}

struct KMeProfileRecord: Record {
  @Field var name: String = ""
  @Field var joined: String = ""
  @Field var editLabel: String = ""
  /// your stamp when you are a member (C2): "1ST" | "007" | ""
  @Field var stamp: String = ""
  @Field var stats: [KMeStatRecord] = []

  var profile: KMeProfile {
    var p = KMeProfile()
    p.name = name
    p.joined = joined
    p.editLabel = editLabel
    p.stamp = stamp
    // only the two keys the header knows, each once
    var seen = Set<String>()
    p.stats = stats.compactMap { s in
      guard s.key == "letters" || s.key == "kindreds", seen.insert(s.key).inserted else { return nil }
      return s.stat
    }
    return p
  }
}

struct KMePeekLetterRecord: Record {
  @Field var id: String = ""
  @Field var date: String = ""
  @Field var stampId: String = ""
  @Field var stampHex: String = ""
  @Field var body: String = ""
  /// quiet | answered | replied
  @Field var tone: String = "quiet"
  @Field var status: String = ""
  @Field var a11y: String = ""
}

struct KMePeekLettersRecord: Record {
  /// loading | empty | ready
  @Field var state: String = "loading"
  @Field var items: [KMePeekLetterRecord] = []
  @Field var seeAll: String = ""
  @Field var emptyText: String = ""
  @Field var emptyCta: String = ""

  var peek: KMePeekLetters {
    var p = KMePeekLetters()
    p.state = KMePeekState(rawValue: state) ?? .loading
    var seen = Set<String>()
    p.items = items.compactMap { l in
      guard !l.id.isEmpty, seen.insert(l.id).inserted else { return nil }
      return KMePeekLetter(id: l.id, date: l.date, stampId: l.stampId, stampHex: l.stampHex, body: l.body, tone: KMePeekLetter.Tone(rawValue: l.tone) ?? .quiet, status: l.status, a11y: l.a11y)
    }
    if p.state == .ready && p.items.isEmpty { p.state = .empty }
    p.seeAll = seeAll
    p.emptyText = emptyText
    p.emptyCta = emptyCta
    return p
  }
}

struct KMePeekKindredRecord: Record {
  @Field var id: String = ""
  @Field var name: String = ""
  @Field var line: String = ""
  @Field var face: KKindredsFaceRecord = KKindredsFaceRecord()
  @Field var a11y: String = ""
}

struct KMePeekKindredsRecord: Record {
  @Field var state: String = "loading"
  @Field var items: [KMePeekKindredRecord] = []
  @Field var open: String = ""
  @Field var emptyText: String = ""

  var peek: KMePeekKindreds {
    var p = KMePeekKindreds()
    p.state = KMePeekState(rawValue: state) ?? .loading
    var seen = Set<String>()
    p.items = items.compactMap { k in
      guard !k.id.isEmpty, seen.insert(k.id).inserted else { return nil }
      return KMePeekKindred(id: k.id, name: k.name, line: k.line, face: k.face.face, a11y: k.a11y, stamp: k.face.memberStamp)
    }
    if p.state == .ready && p.items.isEmpty { p.state = .empty }
    p.open = open
    p.emptyText = emptyText
    return p
  }
}

struct KMeLookTileRecord: Record {
  @Field var id: String = ""
  @Field var label: String = ""
  @Field var name: String = ""
  @Field var bird: KImageRefRecord = KImageRefRecord()
  @Field var selected: Bool = false
  @Field var locked: Bool = false
  @Field var dim: Bool = false
  @Field var hint: String = ""
}

struct KMeLooksRecord: Record {
  @Field var header: String = ""
  @Field var all: String = ""
  @Field var allHint: String = ""
  @Field var tiles: [KMeLookTileRecord] = []

  var looks: KMeLooks {
    var l = KMeLooks()
    l.header = header
    l.all = all
    l.allHint = allHint
    var seen = Set<String>()
    l.tiles = tiles.compactMap { t in
      guard !t.id.isEmpty, seen.insert(t.id).inserted else { return nil }
      return KMeLookTile(id: t.id, label: t.label, name: t.name, bird: t.bird.ref, selected: t.selected, locked: t.locked, dim: t.dim, hint: t.hint)
    }
    return l
  }
}

struct KMeAuraChipRecord: Record {
  @Field var id: String = ""
  @Field var name: String = ""
  @Field var emerging: Bool = false
}

struct KMeAuraRecord: Record {
  /// false: no aura read yet (the card's skeleton)
  @Field var present: Bool = false
  @Field var label: String = ""
  @Field var title: String = ""
  @Field var from: String = ""
  @Field var chips: [KMeAuraChipRecord] = []
  /// ticks | slots
  @Field var meterKind: String = "ticks"
  @Field var filled: Int = 0
  @Field var total: Int = 5
  /// -1 for no slips
  @Field var slipsN: Int = -1
  @Field var slipsOf: Int = -1
  @Field var caption: String = ""
  @Field var cta: String = ""
  @Field var share: Bool = false
  @Field var shareLabel: String = ""

  var aura: KMeAura? {
    guard present else { return nil }
    var a = KMeAura()
    a.label = label
    a.title = title
    a.from = from
    a.chips = chips.enumerated().map { i, c in KMeAuraChip(id: c.id.isEmpty ? "chip\(i)" : c.id, name: c.name, emerging: c.emerging) }
    var m = KMeAuraMeter()
    m.kind = KMeAuraMeter.Kind(rawValue: meterKind) ?? .ticks
    m.filled = filled
    m.total = max(0, min(total, 12))
    m.slips = slipsN >= 0 && slipsOf >= 0 ? (n: slipsN, of: slipsOf) : nil
    a.meter = m
    a.caption = caption
    a.cta = cta
    a.share = share
    a.shareLabel = shareLabel
    return a
  }
}

struct KMeReportRecord: Record {
  @Field var show: Bool = false
  @Field var title: String = ""
  @Field var sub: String = ""
  @Field var enabled: Bool = false
  @Field var locked: Bool = false
  @Field var hint: String = ""

  var report: KMeReport {
    var r = KMeReport()
    r.show = show && !title.isEmpty
    r.title = title
    r.sub = sub
    r.enabled = enabled
    r.locked = locked
    r.hint = hint
    return r
  }
}

struct KMeStampCellRecord: Record {
  @Field var id: String = ""
  @Field var date: String = ""
  @Field var a11y: String = ""
  @Field var hex: String = ""
}

struct KMeStampsRecord: Record {
  @Field var label: String = ""
  @Field var count: String = ""
  @Field var cells: [KMeStampCellRecord] = []
  @Field var emptyText: String = ""
  @Field var emptyCta: String = ""

  var stamps: KMeStamps {
    var s = KMeStamps()
    s.label = label
    s.count = count
    // ids are the grid's identity: a repeat (never sent by TS) is dropped rather than drawn twice
    var seen = Set<String>()
    s.cells = cells.compactMap { c in
      guard !c.id.isEmpty, seen.insert(c.id).inserted else { return nil }
      return KMeStampCell(id: c.id, date: c.date, a11yLabel: c.a11y, hex: c.hex)
    }
    s.emptyText = emptyText
    s.emptyCta = emptyCta
    return s
  }
}

struct KMeFirstClassRecord: Record {
  @Field var eyebrow: String = ""
  @Field var headline: String = ""
  @Field var rows: [String] = []
  @Field var cta: String = ""
  /// "" for none
  @Field var trial: String = ""
  @Field var stampLabel: String = ""
  @Field var bird: KImageRefRecord = KImageRefRecord()
  @Field var member: Bool = false

  var firstClass: KMeFirstClass {
    var f = KMeFirstClass()
    f.eyebrow = eyebrow
    f.headline = headline
    f.rows = rows
    f.cta = cta
    f.trial = trial
    f.stampLabel = stampLabel
    f.bird = bird.ref
    f.member = member
    return f
  }
}

final class KMeViewProps: KScreenProps {
  @Field var strings: KMeStringsRecord = KMeStringsRecord()
  @Field var profile: KMeProfileRecord = KMeProfileRecord()
  @Field var peekLetters: KMePeekLettersRecord = KMePeekLettersRecord()
  @Field var peekKindreds: KMePeekKindredsRecord = KMePeekKindredsRecord()
  @Field var looks: KMeLooksRecord = KMeLooksRecord()
  @Field var aura: KMeAuraRecord = KMeAuraRecord()
  @Field var report: KMeReportRecord = KMeReportRecord()
  @Field var stamps: KMeStampsRecord = KMeStampsRecord()
  @Field var firstClass: KMeFirstClassRecord = KMeFirstClassRecord()
  @Field var initialSegment: Int = 0

  var onMeSettings = EventDispatcher()
  var onMeEdit = EventDispatcher()
  var onMePeek = EventDispatcher()
  var onMePeekLetter = EventDispatcher()
  var onMePeekKindred = EventDispatcher()
  var onMeSeeAll = EventDispatcher()
  var onMeOpenKindreds = EventDispatcher()
  var onMeWrite = EventDispatcher()
  var onMeSegment = EventDispatcher()
  var onMeCourier = EventDispatcher()
  var onMeLook = EventDispatcher()
  var onMeAllLooks = EventDispatcher()
  var onMeAuraOpen = EventDispatcher()
  var onMeAuraCta = EventDispatcher()
  var onMeAuraShare = EventDispatcher()
  var onMeReport = EventDispatcher()
  var onMeStampsEmpty = EventDispatcher()
  var onMeFirstClass = EventDispatcher()

  /// The scroll and segment requests: as long-lived as the view, like `commands`.
  let driver = KMeDriver()

  /// The screen's taps, made once: each closure reaches this props object's events.
  private(set) lazy var actions: KMeActions = {
    let a = KMeActions()
    a.onSettings = { [weak self] in self?.onMeSettings() }
    a.onEdit = { [weak self] in self?.onMeEdit() }
    a.onPeek = { [weak self] key, open in self?.onMePeek(["key": key, "open": open]) }
    a.onPeekLetter = { [weak self] id in self?.onMePeekLetter(["id": id]) }
    a.onPeekKindred = { [weak self] id in self?.onMePeekKindred(["id": id]) }
    a.onSeeAll = { [weak self] in self?.onMeSeeAll() }
    a.onOpenKindreds = { [weak self] in self?.onMeOpenKindreds() }
    a.onWrite = { [weak self] in self?.onMeWrite() }
    a.onSegment = { [weak self] index in self?.onMeSegment(["index": index]) }
    a.onCourier = { [weak self] in self?.onMeCourier() }
    a.onLook = { [weak self] id in self?.onMeLook(["id": id]) }
    a.onAllLooks = { [weak self] in self?.onMeAllLooks() }
    a.onAuraOpen = { [weak self] in self?.onMeAuraOpen() }
    a.onAuraCta = { [weak self] in self?.onMeAuraCta() }
    a.onAuraShare = { [weak self] in self?.onMeAuraShare() }
    a.onReport = { [weak self] in self?.onMeReport() }
    a.onStampsEmpty = { [weak self] in self?.onMeStampsEmpty() }
    a.onFirstClass = { [weak self] in self?.onMeFirstClass() }
    return a
  }()

  /// Everything the screen shows, converted once per rev.
  var content: KMeContent {
    cached("content") {
      var c = KMeContent()
      c.settingsLabel = strings.settingsLabel
      c.courierA11y = strings.courierA11y
      c.segments = strings.segments
      c.a11y = strings.a11y
      c.profile = profile.profile
      c.peekLetters = peekLetters.peek
      c.peekKindreds = peekKindreds.peek
      c.looks = looks.looks
      c.aura = aura.aura
      c.report = report.report
      c.stamps = stamps.stamps
      c.firstClass = firstClass.firstClass
      return c
    }
  }

  /// One command from the bus (see the list at the top of the file).
  func handle(_ name: String, _ args: [String: Any]) {
    switch name {
    case KCommandName.scrollTo:
      if case .top = KScrollRequest(args) {
        driver.scrollToTop(animated: args.kBool("animated") ?? true)
      }
    case "segment":
      if let index = args.kInt("index") { driver.showSegment(index) }
    default:
      break
    }
  }
}

struct KMeView: ExpoSwiftUI.View {
  @ObservedObject var props: KMeViewProps

  var body: some View {
    let insets = props.insets
    let content = props.content
    return KMeScreen(
      theme: props.kTheme,
      content: content,
      initialSegment: props.initialSegment,
      topInset: insets.top,
      // the floating bar's room plus 12 (list_host_pattern), never less than the fade that is
      // always drawn over the bottom asks (KBottomFade.contentMargin(): 176 - 6, H:28's 170)
      bottomInset: max(insets.tabBarRoom + 12, KBottomFade.contentMargin()),
      driver: props.driver,
      actions: props.actions
    ) {
      props.children?.kSlot("avatar")
    } courier: {
      props.children?.kSlot("courier")
    } auraArt: {
      props.children?.kSlot("auraArt")
    }
    .kScreenEnvironment(props)
    .onKCommand(props.commands) { name, args in
      props.handle(name, args)
    }
  }
}
