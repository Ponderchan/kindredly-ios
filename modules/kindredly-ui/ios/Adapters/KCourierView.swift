import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 WREN'S JOURNEY as React Native sees it: <KCourierView … /> (modules/kindredly-ui/src/
 Courier.tsx), drawn by src/screens/courier/CourierNative.tsx in one full-screen Host from the
 /courier route, behind the "courier" switch (owner 2026-10-26; binary 1.2.6, App Store 1.0.7).
 This file turns records into Portable values and taps into events; the page itself is
 Portable/Courier/KCourierScreen.swift and knows nothing about Expo.

 Built as every step-5 screen is (KScreenProps.swift): the props subclass KScreenProps (theme,
 letterFont, insets, rev, commands), the view is registered with ExpoUIView and the "command"
 AsyncFunction (KindredlyUIModule.swift), and it MUST sit in an @expo/ui <Host>. It has no text
 field and no React Native island. A new file in this module: the next native build needs a pod
 install (not a clean prebuild) so Xcode sees it and Portable/Courier/KCourierScreen.swift and
 Portable/Kit/KObjectDepth.swift.

 Props, beyond KScreenProps (insets.top the status bar the cover runs under, insets.bottom the
 home indicator):
 - strings: { title, back, hints [], tapHint, play, playA11y, playHint, logHint, expanded,
   collapsed, track, trackClose, slip, slipGo, log, journey, keepsakes, allKept, wrenUpper }
 - cover: { sky0, sky1, ink, band, pillarInk, scrim, sun ("" none), moon, stars, night, dayOff,
   dayChip, cofounder, bubble, bubbleOpens, canPlay } — colours "#RRGGBB"
 - hero: { mood, faces: [{ mood, bird }], state, stage, wilt, label }
 - band: { show, line, sub, bringing }; slip: { rows, lit, threadId }; log: { rows, line }
 - name, kindLine, facts: [{ icon (letter | kindred | date | next), text }]
 - journey: [{ id, name, sub, state (done | now | later) }]
 - keepsakes: [{ id, name, evidence, fresh, a11y, icon }]
 - cells: [{ key (looks | dress), label, value, count, swatch }]
 - looks, dress: [{ id, label, lock, hint, on, bird }]
 - firstClass: Me's 4a card (KMeFirstClassRecord)
 Every record is converted once per rev (useRev in TS).

 Commands: none (nothing on the page changes from outside but its props).

 Events, with what nativeEvent carries:
 - onCrBack {}              the chevron
 - onCrPlay {}              Play (TS opens Free Flight in React Native)
 - onCrSlipGo { id }        "Go to the Door" on the tracking slip (the thread's id)
 - onCrKeepsake { id }      a keepsake tile
 - onCrAllKeepsakes {}      "All n →"
 - onCrLook { id }          a looks tile (a WrenSkin)
 - onCrDress { id }         a dress tile (a WrenAccessory)
 - onCrFirstClass {}        the First Class card
 - onCrRack { open }        the rack opened on "looks" or "dress", or shut ("")
 - onCrUnderSky { under }   the cover went out from under the status bar, or came back

 Unknown enum strings fall back rather than fail (a fact icon reads as a date, a stop as one
 still ahead, a cell key is skipped), and a colour that isn't "#RRGGBB" takes the day sky's.
 This file imports ExpoUI, whose public Button, Text and Image would make bare names ambiguous,
 so nothing of that kind is written here.
 */

/// "#RRGGBB" as a Color, or `fallback` for anything else (Color(hex:) shows magenta for junk).
private func courierColor(_ hex: String, _ fallback: String) -> Color {
  let digits = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
  guard digits.count == 6, digits.allSatisfy(\.isHexDigit) else { return Color(hex: fallback) }
  return Color(hex: digits)
}

struct KCourierStringsRecord: Record {
  @Field var title: String = ""
  @Field var back: String = ""
  @Field var hints: [String] = []
  @Field var tapHint: String = ""
  @Field var play: String = ""
  @Field var playA11y: String = ""
  @Field var playHint: String = ""
  @Field var logHint: String = ""
  @Field var expanded: String = ""
  @Field var collapsed: String = ""
  @Field var track: String = ""
  @Field var trackClose: String = ""
  @Field var slip: String = ""
  @Field var slipGo: String = ""
  @Field var log: String = ""
  @Field var journey: String = ""
  @Field var keepsakes: String = ""
  @Field var allKept: String = ""
  @Field var wrenUpper: String = ""

  var strings: KCourierStrings {
    var s = KCourierStrings()
    s.title = title
    s.back = back
    s.hints = hints
    s.tapHint = tapHint
    s.play = play
    s.playA11y = playA11y
    s.playHint = playHint
    s.logHint = logHint
    s.expanded = expanded
    s.collapsed = collapsed
    s.track = track
    s.trackClose = trackClose
    s.slip = slip
    s.slipGo = slipGo
    s.log = log
    s.journey = journey
    s.keepsakes = keepsakes
    s.allKept = allKept
    s.wrenUpper = wrenUpper
    return s
  }
}

struct KCourierCoverRecord: Record {
  @Field var sky0: String = "#BFE3F8"
  @Field var sky1: String = "#E3F3FB"
  @Field var ink: String = "#1F5C33"
  @Field var band: String = "#1F5C33"
  @Field var pillarInk: String = "#1F5C33"
  @Field var scrim: String = "#ADDBB5"
  /// "" for no sun
  @Field var sun: String = ""
  @Field var moon: Bool = false
  @Field var stars: Bool = false
  @Field var night: Bool = false
  @Field var dayOff: Bool = false
  @Field var dayChip: String = ""
  @Field var cofounder: String = ""
  @Field var bubble: String = ""
  @Field var bubbleOpens: Bool = false
  @Field var canPlay: Bool = false

  var cover: KCourierCover {
    var c = KCourierCover()
    c.sky0 = courierColor(sky0, "#BFE3F8")
    c.sky1 = courierColor(sky1, "#E3F3FB")
    c.ink = courierColor(ink, "#1F5C33")
    c.band = courierColor(band, "#1F5C33")
    c.pillarInk = courierColor(pillarInk, "#1F5C33")
    c.scrim = courierColor(scrim, "#ADDBB5")
    c.sun = sun.isEmpty ? nil : courierColor(sun, "#FFD54A")
    c.moon = moon
    c.stars = stars
    c.night = night
    c.dayOff = dayOff
    c.dayChip = dayChip
    c.cofounder = cofounder
    c.bubble = bubble
    c.bubbleOpens = bubbleOpens
    c.canPlay = canPlay
    return c
  }
}

struct KCourierFaceRecord: Record {
  @Field var mood: String = ""
  @Field var bird: KImageRefRecord = KImageRefRecord()
}

struct KCourierHeroRecord: Record {
  @Field var mood: String = "content"
  @Field var faces: [KCourierFaceRecord] = []
  @Field var state: String = "home"
  @Field var stage: String = "wren"
  @Field var wilt: Bool = false
  @Field var label: String = ""

  var hero: KCourierHero {
    var h = KCourierHero()
    h.mood = mood
    var seen = Set<String>()
    h.faces = faces.compactMap { f in
      guard !f.mood.isEmpty, seen.insert(f.mood).inserted else { return nil }
      return KCourierFace(mood: f.mood, bird: f.bird.ref)
    }
    h.state = state
    h.stage = stage
    h.wilt = wilt
    h.label = label
    return h
  }
}

struct KCourierBandRecord: Record {
  @Field var show: Bool = false
  @Field var line: String = ""
  @Field var sub: String = ""
  @Field var bringing: Bool = false
}

struct KCourierSlipRecord: Record {
  @Field var rows: [String] = []
  @Field var lit: Bool = false
  @Field var threadId: String = ""
}

struct KCourierLogRecord: Record {
  @Field var rows: [String] = []
  @Field var line: String = ""
}

struct KCourierFactRecord: Record {
  @Field var icon: String = "date"
  @Field var text: String = ""
}

struct KCourierStopRecord: Record {
  @Field var id: String = ""
  @Field var name: String = ""
  @Field var sub: String = ""
  @Field var state: String = "later"
}

struct KCourierKeepsakeRecord: Record {
  @Field var id: String = ""
  @Field var name: String = ""
  @Field var evidence: String = ""
  @Field var fresh: Bool = false
  @Field var a11y: String = ""
  @Field var icon: KImageRefRecord = KImageRefRecord()
}

struct KCourierCellRecord: Record {
  @Field var key: String = ""
  @Field var label: String = ""
  @Field var value: String = ""
  @Field var count: String = ""
  @Field var swatch: String = ""
}

struct KCourierTileRecord: Record {
  @Field var id: String = ""
  @Field var label: String = ""
  @Field var lock: String = ""
  @Field var hint: String = ""
  @Field var on: Bool = false
  @Field var bird: KImageRefRecord = KImageRefRecord()

  var tile: KCourierTile {
    KCourierTile(id: id, label: label, lock: lock, hint: hint, on: on, bird: bird.ref)
  }
}

final class KCourierViewProps: KScreenProps {
  @Field var strings: KCourierStringsRecord = KCourierStringsRecord()
  @Field var cover: KCourierCoverRecord = KCourierCoverRecord()
  @Field var hero: KCourierHeroRecord = KCourierHeroRecord()
  @Field var band: KCourierBandRecord = KCourierBandRecord()
  @Field var slip: KCourierSlipRecord = KCourierSlipRecord()
  @Field var log: KCourierLogRecord = KCourierLogRecord()
  @Field var name: String = ""
  @Field var kindLine: String = ""
  @Field var facts: [KCourierFactRecord] = []
  @Field var journey: [KCourierStopRecord] = []
  @Field var keepsakes: [KCourierKeepsakeRecord] = []
  @Field var cells: [KCourierCellRecord] = []
  @Field var looks: [KCourierTileRecord] = []
  @Field var dress: [KCourierTileRecord] = []
  @Field var firstClass: KMeFirstClassRecord = KMeFirstClassRecord()

  var onCrBack = EventDispatcher()
  var onCrPlay = EventDispatcher()
  var onCrSlipGo = EventDispatcher()
  var onCrKeepsake = EventDispatcher()
  var onCrAllKeepsakes = EventDispatcher()
  var onCrLook = EventDispatcher()
  var onCrDress = EventDispatcher()
  var onCrFirstClass = EventDispatcher()
  var onCrRack = EventDispatcher()
  var onCrUnderSky = EventDispatcher()

  private(set) lazy var actions: KCourierActions = {
    let a = KCourierActions()
    a.onBack = { [weak self] in self?.onCrBack() }
    a.onPlay = { [weak self] in self?.onCrPlay() }
    a.onSlipGo = { [weak self] id in self?.onCrSlipGo(["id": id]) }
    a.onKeepsake = { [weak self] id in self?.onCrKeepsake(["id": id]) }
    a.onAllKeepsakes = { [weak self] in self?.onCrAllKeepsakes() }
    a.onLook = { [weak self] id in self?.onCrLook(["id": id]) }
    a.onDress = { [weak self] id in self?.onCrDress(["id": id]) }
    a.onFirstClass = { [weak self] in self?.onCrFirstClass() }
    a.onRack = { [weak self] open in self?.onCrRack(["open": open]) }
    a.onUnderSky = { [weak self] under in self?.onCrUnderSky(["under": under]) }
    return a
  }()

  var content: KCourierContent {
    cached("content") {
      var c = KCourierContent()
      c.strings = strings.strings
      c.cover = cover.cover
      c.hero = hero.hero
      c.bandShow = band.show
      c.bandLine = band.line
      c.bandSub = band.sub
      c.bandBringing = band.bringing
      c.slipRows = slip.rows
      c.slipLit = slip.lit
      c.slipThread = slip.threadId
      c.logRows = log.rows
      c.logLine = log.line
      c.name = name
      c.kindLine = kindLine
      c.facts = facts.enumerated().map { i, f in
        KCourierFact(id: i, icon: KCourierFact.Icon(rawValue: f.icon) ?? .date, text: f.text)
      }
      var seenStops = Set<String>()
      c.journey = journey.compactMap { s in
        guard !s.id.isEmpty, seenStops.insert(s.id).inserted else { return nil }
        return KCourierStop(id: s.id, name: s.name, sub: s.sub, state: KCourierStop.State(rawValue: s.state) ?? .later)
      }
      var seenK = Set<String>()
      c.keepsakes = keepsakes.compactMap { k in
        guard !k.id.isEmpty, seenK.insert(k.id).inserted else { return nil }
        return KCourierKeepsake(id: k.id, name: k.name, evidence: k.evidence, fresh: k.fresh, a11y: k.a11y, icon: k.icon.ref)
      }
      var seenC = Set<String>()
      c.cells = cells.compactMap { r in
        guard let key = KCourierCell.Key(rawValue: r.key), seenC.insert(r.key).inserted else { return nil }
        return KCourierCell(key: key, label: r.label, value: r.value, count: r.count, swatch: courierColor(r.swatch, key == .looks ? "#A9D0F2" : "#F2887E"))
      }
      var seenL = Set<String>()
      c.looks = looks.filter { !$0.id.isEmpty && seenL.insert($0.id).inserted }.map(\.tile)
      var seenD = Set<String>()
      c.dress = dress.filter { !$0.id.isEmpty && seenD.insert($0.id).inserted }.map(\.tile)
      c.firstClass = firstClass.firstClass
      return c
    }
  }
}

struct KCourierView: ExpoSwiftUI.View {
  @ObservedObject var props: KCourierViewProps

  var body: some View {
    let insets = props.insets
    return KCourierScreen(
      theme: props.kTheme,
      content: props.content,
      topInset: insets.top,
      bottomInset: insets.bottom,
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}
