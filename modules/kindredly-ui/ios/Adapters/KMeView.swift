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
 - stamps: { label, count, cells: [{ id, date, a11y, hex }], emptyText, emptyCta, yoursSlots,
   madeShow, madeLabel, madeQuota, madeQuotaGold, seeAll, makeOne, emptyTitle, emptySub, makeA11y,
   made: [{ id, topic, fresh, note, a11y }], newLabel, full, fullTitle, fullSub, fullCta, notNow,
   ready, readyCta, readyId, strangersLabel, strangersCount, strangers: [{ id, from, a11y }],
   strangersEmpty, album } (custom stamps: Portable/Me/KStampsCard.swift)
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
 - onMeStamps { action, id }   the Stamps card: make | fullCta | seeAll | album | stamp (id) | ready (id)
 - onMeFirstClass {}           the First Class card
 - onMeFcOpen { form }          a First Class rollout form (invite | seat | report | tab)

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

struct KMeMadeCellRecord: Record {
  @Field var id: String = ""
  @Field var topic: String = ""
  @Field var fresh: Bool = false
  @Field var note: String = ""
  @Field var a11y: String = ""
}

struct KMeStrangerCellRecord: Record {
  @Field var id: String = ""
  @Field var from: String = ""
  @Field var a11y: String = ""
}

struct KMeStampsRecord: Record {
  @Field var label: String = ""
  @Field var count: String = ""
  @Field var cells: [KMeStampCellRecord] = []
  @Field var emptyText: String = ""
  @Field var emptyCta: String = ""
  @Field var yoursSlots: [String] = []
  // custom stamps (Prompt 1): MADE BY YOU, FROM STRANGERS, the album
  @Field var madeShow: Bool = false
  @Field var madeLabel: String = ""
  @Field var madeQuota: String = ""
  @Field var madeQuotaGold: Bool = false
  @Field var seeAll: String = ""
  @Field var makeOne: String = ""
  @Field var emptyTitle: String = ""
  @Field var emptySub: String = ""
  @Field var makeA11y: String = ""
  @Field var made: [KMeMadeCellRecord] = []
  @Field var newLabel: String = ""
  @Field var full: Bool = false
  @Field var fullTitle: String = ""
  @Field var fullSub: String = ""
  @Field var fullCta: String = ""
  @Field var notNow: String = ""
  @Field var ready: String = ""
  @Field var readyCta: String = ""
  @Field var readyId: String = ""
  @Field var strangersLabel: String = ""
  @Field var strangersCount: String = ""
  @Field var strangers: [KMeStrangerCellRecord] = []
  @Field var strangersEmpty: String = ""
  @Field var album: String = ""

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
    s.yoursSlots = yoursSlots
    s.madeShow = madeShow
    s.madeLabel = madeLabel
    s.madeQuota = madeQuota
    s.madeQuotaGold = madeQuotaGold
    s.seeAll = seeAll
    s.makeOne = makeOne
    s.emptyTitle = emptyTitle
    s.emptySub = emptySub
    s.makeA11y = makeA11y
    var seenMade = Set<String>()
    s.made = made.compactMap { m in
      guard m.id.hasPrefix("c:"), seenMade.insert(m.id).inserted else { return nil }
      return KMeMadeCell(id: m.id, topic: m.topic, fresh: m.fresh, note: m.note, a11yLabel: m.a11y)
    }
    s.newLabel = newLabel
    s.full = full
    s.fullTitle = fullTitle
    s.fullSub = fullSub
    s.fullCta = fullCta
    s.notNow = notNow
    s.ready = ready
    s.readyCta = readyCta
    s.readyId = readyId
    s.strangersLabel = strangersLabel
    s.strangersCount = strangersCount
    var seenS = Set<String>()
    s.strangers = strangers.compactMap { x in
      guard x.id.hasPrefix("c:"), seenS.insert(x.id).inserted else { return nil }
      return KMeStrangerCell(id: x.id, from: x.from, a11yLabel: x.a11y)
    }
    s.strangersEmpty = strangersEmpty
    s.album = album
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

struct KMeFcRolloutRecord: Record {
  @Field var form: String = "none"
  @Field var tab: Bool = false
  @Field var firstClass: String = ""
  @Field var post: String = ""
  @Field var envelopeA11y: String = ""
  @Field var seatTimer: String = ""
  @Field var seatHead: String = ""
  @Field var seatPerks: String = ""
  @Field var open: String = ""
  @Field var reportEyebrow: String = ""
  @Field var reportSealed: String = ""
  @Field var reportHead: String = ""
  @Field var reportCta: String = ""
  @Field var tabA11y: String = ""

  var fc: KMeFcRollout {
    var f = KMeFcRollout()
    f.form = form
    f.tab = tab
    f.firstClass = firstClass
    f.post = post
    f.envelopeA11y = envelopeA11y
    f.seatTimer = seatTimer
    f.seatHead = seatHead
    f.seatPerks = seatPerks
    f.open = open
    f.reportEyebrow = reportEyebrow
    f.reportSealed = reportSealed
    f.reportHead = reportHead
    f.reportCta = reportCta
    f.tabA11y = tabA11y
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
  @Field var fc: KMeFcRolloutRecord = KMeFcRolloutRecord()
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
  var onMeStamps = EventDispatcher()
  var onMeFirstClass = EventDispatcher()
  var onMeFcOpen = EventDispatcher()

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
    a.onStamps = { [weak self] action, id in self?.onMeStamps(["action": action, "id": id]) }
    a.onFirstClass = { [weak self] in self?.onMeFirstClass() }
    a.onFcOpen = { [weak self] form in self?.onMeFcOpen(["form": form]) }
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
      c.fc = fc.fc
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

/*
 THE ALBUM as React Native sees it: <KStampAlbumView … /> (modules/kindredly-ui/src/Me.tsx
 StampAlbum), drawn by src/app/album.tsx in one Host. Appended here so the module needs no pod
 install; the page is KStampAlbumScreen in Portable/Me/KStampsCard.swift.

 Props, beyond KScreenProps (insets.top the status bar, insets.bottom the home indicator):
 - strings: { title, back, makeOne, makeA11y, fullTitle, fullSub, fullCta, notNow, yoursEmpty,
   yoursCta }
 - sections: [{ key (made | strangers | yours), title, make, cells: [{ id, under, tag, tagHex, info,
   a11y, actions: [{ key, title, style (ink | plain | danger) }] }] }]
 - full: Free has made all three (the blank stamp opens the small card)
 - yoursSlots: three "#RRGGBB" for the empty YOUR STAMPS
 - focus: the section to open at ("" for the top)

 Events: onAlbumBack {}, onAlbumMake {}, onAlbumFullCta {}, onAlbumWrite {},
 onAlbumAction { id, action } (write | rename | recolour | filter | delete | remove | report).
 */

struct KAlbumStringsRecord: Record {
  @Field var title: String = ""
  @Field var back: String = ""
  @Field var makeOne: String = ""
  @Field var makeA11y: String = ""
  @Field var fullTitle: String = ""
  @Field var fullSub: String = ""
  @Field var fullCta: String = ""
  @Field var notNow: String = ""
  @Field var yoursEmpty: String = ""
  @Field var yoursCta: String = ""
}

struct KAlbumActionRecord: Record {
  @Field var key: String = ""
  @Field var title: String = ""
  @Field var style: String = "plain"
}

struct KAlbumCellRecord: Record {
  @Field var id: String = ""
  @Field var under: String = ""
  @Field var tag: String = ""
  @Field var tagHex: String = ""
  @Field var info: String = ""
  @Field var a11y: String = ""
  @Field var actions: [KAlbumActionRecord] = []
}

struct KAlbumSectionRecord: Record {
  @Field var key: String = ""
  @Field var title: String = ""
  @Field var make: Bool = false
  @Field var cells: [KAlbumCellRecord] = []
}

final class KStampAlbumViewProps: KScreenProps {
  @Field var strings: KAlbumStringsRecord = KAlbumStringsRecord()
  @Field var sections: [KAlbumSectionRecord] = []
  @Field var full: Bool = false
  @Field var yoursSlots: [String] = []
  @Field var focus: String = ""

  var onAlbumBack = EventDispatcher()
  var onAlbumMake = EventDispatcher()
  var onAlbumFullCta = EventDispatcher()
  var onAlbumWrite = EventDispatcher()
  var onAlbumAction = EventDispatcher()

  private(set) lazy var actions: KStampAlbumActions = {
    let a = KStampAlbumActions()
    a.onBack = { [weak self] in self?.onAlbumBack() }
    a.onMake = { [weak self] in self?.onAlbumMake() }
    a.onFullCta = { [weak self] in self?.onAlbumFullCta() }
    a.onWrite = { [weak self] in self?.onAlbumWrite() }
    a.onAction = { [weak self] id, action in self?.onAlbumAction(["id": id, "action": action]) }
    return a
  }()

  var content: KStampAlbumContent {
    cached("content") {
      var c = KStampAlbumContent()
      c.title = strings.title
      c.backLabel = strings.back
      c.makeOne = strings.makeOne
      c.makeA11y = strings.makeA11y
      c.full = full
      c.fullTitle = strings.fullTitle
      c.fullSub = strings.fullSub
      c.fullCta = strings.fullCta
      c.notNow = strings.notNow
      c.yoursEmpty = strings.yoursEmpty
      c.yoursCta = strings.yoursCta
      c.yoursSlots = yoursSlots
      c.focus = focus
      var seenSections = Set<String>()
      c.sections = sections.compactMap { sec in
        guard ["made", "strangers", "yours"].contains(sec.key), seenSections.insert(sec.key).inserted else { return nil }
        var seen = Set<String>()
        let cells: [KAlbumCell] = sec.cells.compactMap { r in
          guard !r.id.isEmpty, seen.insert(r.id).inserted else { return nil }
          let acts = r.actions.compactMap { a -> KAlbumAction? in
            guard !a.key.isEmpty, !a.title.isEmpty else { return nil }
            return KAlbumAction(key: a.key, title: a.title, style: KAlbumAction.Style(rawValue: a.style) ?? .plain)
          }
          return KAlbumCell(id: r.id, under: r.under, tag: r.tag, tagHex: r.tagHex, info: r.info, actions: acts, a11yLabel: r.a11y)
        }
        guard !cells.isEmpty || sec.make else { return nil }
        return KAlbumSection(key: sec.key, title: sec.title, cells: cells, make: sec.make)
      }
      return c
    }
  }
}

struct KStampAlbumView: ExpoSwiftUI.View {
  @ObservedObject var props: KStampAlbumViewProps

  var body: some View {
    let insets = props.insets
    return KStampAlbumScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: insets.top,
      bottomInset: insets.bottom,
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}
