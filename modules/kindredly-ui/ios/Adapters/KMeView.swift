import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 THE ME TAB as React Native sees it: <KMeView … /> on the JS side (modules/kindredly-ui/src/Me.tsx),
 drawn by src/screens/me/MeNative.tsx in one full-screen Host. This file turns records into
 Portable values and taps into events, and places the React Native islands; the screen itself is
 Portable/Me/KMeScreen.swift and knows nothing about Expo.

 Built as every step-5 screen is (KScreenProps.swift): the props subclass KScreenProps (theme,
 letterFont, insets, rev, commands), the view is registered with ExpoUIView and the "command"
 AsyncFunction (KindredlyUIModule.swift), and it MUST sit in an @expo/ui <Host>: one Host for the
 whole screen, never one per card. It has no text field.

 Props, beyond KScreenProps (insets: top = the status bar the screen draws its strip for,
 tabBarRoom = the floating bar the last of the page clears, plus 12, and never less than the
 bottom fade's height - 6, since the fade is always drawn):
 - strings: { title, penName, settingsLabel, courierA11y, segments: [4] }
 - profile: { name, joined, cofounder, editLabel, stats: [{ key, glyph, count, unit, a11y }] }
 - aura: { present (false = the skeleton), label, title, from, chips: [{ id, name, emerging }],
   meterKind (ticks | slots), filled, total, slipsN, slipsOf (-1 for none), caption, cta, share,
   shareLabel }
 - stamps: { label, count, cells: [{ id, date, a11y, hex }], emptyText, emptyCta }
 - keepsakes: { header, count, note, a11y, tiles: [{ id ("" = empty), name, image, fresh, a11y }] }
 - firstClass: { eyebrow, headline, sub, cta, stampLabel, bird }
 - initialSegment: the segment to open on (read when the view first draws)
 Every record above is converted once per rev (useRev in TS); the strings with them.

 Children: three <KIsland>s, found by name — "avatar" (56 × 56), "courier" (the frame's inside
 × 236) and "auraArt" (the Aura card's inside × 110). The courier and aura islands are placed
 only while their card shows; TS fills them only then.

 Commands (KCommandBus): scrollTo { key: "top", animated } (Me pressed again while showing), and
 segment { index }, which shows a card as its chip would and sends onMeSegment as a chip does, so
 TS fills that card's island.

 Events, with what nativeEvent carries:
 - onMeSettings {}             the sliders
 - onMeEdit {}                 the pencil
 - onMeStat { key }            a figure: letters | kindreds
 - onMeSegment { index }       a chip or a segment command (the card is already showing)
 - onMeCourier {}              the courier's scene
 - onMeKeepsakes {}            the keepsakes header or an empty tile
 - onMeKeepsake { id }         a keepsake tile
 - onMeAuraOpen {}             the top of the Aura card
 - onMeAuraCta {}              its call to action
 - onMeAuraShare {}            its share key
 - onMeStampsEmpty {}          "Write a letter" under no stamps
 - onMeFirstClass {}           the First Class card

 Unknown enum strings fall back rather than fail (a glyph draws the envelope, a meter kind the
 ticks), as KTabBarView does. This file imports ExpoUI, whose public Button, Text and Image would
 make bare names ambiguous, so nothing of that kind is written here.
 */

struct KMeStringsRecord: Record {
  @Field var title: String = ""
  @Field var penName: String = ""
  @Field var settingsLabel: String = ""
  @Field var courierA11y: String = ""
  @Field var segments: [String] = []
}

struct KMeStatRecord: Record {
  @Field var key: String = ""
  /// envelope | bubbles
  @Field var glyph: String = "envelope"
  @Field var count: String = ""
  @Field var unit: String = ""
  @Field var a11y: String = ""

  var stat: KMeStat {
    KMeStat(key: key, glyph: glyph == "bubbles" ? .bubbles : .envelope, count: count, unit: unit, a11yLabel: a11y)
  }
}

struct KMeProfileRecord: Record {
  @Field var name: String = ""
  @Field var joined: String = ""
  @Field var cofounder: String = ""
  @Field var editLabel: String = ""
  @Field var stats: [KMeStatRecord] = []

  var profile: KMeProfile {
    var p = KMeProfile()
    p.name = name
    p.joined = joined
    p.cofounder = cofounder
    p.editLabel = editLabel
    p.stats = stats.map(\.stat)
    return p
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

struct KMeKeepsakeTileRecord: Record {
  /// "" for an empty (dashed) tile
  @Field var id: String = ""
  @Field var name: String = ""
  @Field var image: KImageRefRecord = KImageRefRecord()
  @Field var fresh: Bool = false
  /// VoiceOver's label: "{name}, new" while unopened; "" falls back to the name
  @Field var a11y: String = ""
}

struct KMeKeepsakesRecord: Record {
  @Field var header: String = ""
  @Field var count: String = ""
  @Field var note: String = ""
  @Field var a11y: String = ""
  @Field var tiles: [KMeKeepsakeTileRecord] = []

  var keepsakes: KMeKeepsakes {
    var k = KMeKeepsakes()
    k.header = header
    k.count = count
    k.note = note
    k.a11yLabel = a11y
    var tiles: [KMeKeepsakeTile?] = self.tiles.prefix(2).map { t in
      t.id.isEmpty ? nil : KMeKeepsakeTile(id: t.id, name: t.name, image: t.image.ref, fresh: t.fresh, a11yLabel: t.a11y.isEmpty ? t.name : t.a11y)
    }
    while tiles.count < 2 { tiles.append(nil) }
    k.tiles = tiles
    return k
  }
}

struct KMeFirstClassRecord: Record {
  @Field var eyebrow: String = ""
  @Field var headline: String = ""
  @Field var sub: String = ""
  @Field var cta: String = ""
  @Field var stampLabel: String = ""
  @Field var bird: KImageRefRecord = KImageRefRecord()

  var firstClass: KMeFirstClass {
    var f = KMeFirstClass()
    f.eyebrow = eyebrow
    f.headline = headline
    f.sub = sub
    f.cta = cta
    f.stampLabel = stampLabel
    f.bird = bird.ref
    return f
  }
}

final class KMeViewProps: KScreenProps {
  @Field var strings: KMeStringsRecord = KMeStringsRecord()
  @Field var profile: KMeProfileRecord = KMeProfileRecord()
  @Field var aura: KMeAuraRecord = KMeAuraRecord()
  @Field var stamps: KMeStampsRecord = KMeStampsRecord()
  @Field var keepsakes: KMeKeepsakesRecord = KMeKeepsakesRecord()
  @Field var firstClass: KMeFirstClassRecord = KMeFirstClassRecord()
  @Field var initialSegment: Int = 0

  var onMeSettings = EventDispatcher()
  var onMeEdit = EventDispatcher()
  var onMeStat = EventDispatcher()
  var onMeSegment = EventDispatcher()
  var onMeCourier = EventDispatcher()
  var onMeKeepsakes = EventDispatcher()
  var onMeKeepsake = EventDispatcher()
  var onMeAuraOpen = EventDispatcher()
  var onMeAuraCta = EventDispatcher()
  var onMeAuraShare = EventDispatcher()
  var onMeStampsEmpty = EventDispatcher()
  var onMeFirstClass = EventDispatcher()

  /// The scroll and segment requests: as long-lived as the view, like `commands`.
  let driver = KMeDriver()

  /// The screen's taps, made once: each closure reaches this props object's events.
  private(set) lazy var actions: KMeActions = {
    let a = KMeActions()
    a.onSettings = { [weak self] in self?.onMeSettings() }
    a.onEdit = { [weak self] in self?.onMeEdit() }
    a.onStat = { [weak self] key in self?.onMeStat(["key": key]) }
    a.onSegment = { [weak self] index in self?.onMeSegment(["index": index]) }
    a.onCourier = { [weak self] in self?.onMeCourier() }
    a.onKeepsakes = { [weak self] in self?.onMeKeepsakes() }
    a.onKeepsake = { [weak self] id in self?.onMeKeepsake(["id": id]) }
    a.onAuraOpen = { [weak self] in self?.onMeAuraOpen() }
    a.onAuraCta = { [weak self] in self?.onMeAuraCta() }
    a.onAuraShare = { [weak self] in self?.onMeAuraShare() }
    a.onStampsEmpty = { [weak self] in self?.onMeStampsEmpty() }
    a.onFirstClass = { [weak self] in self?.onMeFirstClass() }
    return a
  }()

  /// Everything the screen shows, converted once per rev.
  var content: KMeContent {
    cached("content") {
      var c = KMeContent()
      c.title = strings.title
      c.penName = strings.penName
      c.settingsLabel = strings.settingsLabel
      c.courierA11y = strings.courierA11y
      c.segments = strings.segments
      c.profile = profile.profile
      c.aura = aura.aura
      c.stamps = stamps.stamps
      c.keepsakes = keepsakes.keepsakes
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
