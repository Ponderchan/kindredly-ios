import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 THE PLANET PAGE as React Native sees it (2026-11-11, docs/courier-planet.md): <KPlanetPageView … />
 (modules/kindredly-ui/src/PlanetPage.tsx), drawn by src/screens/planet/PlanetNative.tsx in one
 full-screen Host for the route src/app/planet.tsx. This file turns records into Portable values
 and taps into events; the page is Portable/Planet/KPlanetPage.swift (KPlanetScreen) and knows
 nothing about Expo. Built as every step-5 screen is (KScreenProps: theme, letterFont, insets,
 rev). It has no text field and takes no commands.

 Props, beyond KScreenProps (insets.top the status bar the sky runs under, insets.bottom the
 home indicator):
 - planet: { live, palette (KCourierPaletteRecord), letters: [KPlanetLetterRecord], state (home |
   out | waiting | back | dayOff), napping, look: KWrenLookRecord } — Adapters/KMePlanetView.swift
   has the three records
 - words: { chip, hint, name, time, line, aside, track, myLetters, myLettersCount, back, zoomIn,
   zoomOut, a11y }
 - figures: [{ id (way | carried | desks), value, label, lamp, a11y }]
 - slips: [{ id, letter ("" = no stamp), stamp, hex, head, body, rows, lamp (-1 for none), cta
   ("" for none), a11y }]
 - emptyRows: the two rows shown when there is no slip
 - open: the slip to be on ("" = the first): the page follows it until the reader picks one
 Converted once per rev (useRev in TS).

 Events:
 - onPlBack {}            the chevron
 - onPlGo { id }          Go to the Door on a slip (the slip's id)
 - onPlMyLetters {}       the My letters row

 This file imports ExpoUI, so no bare Button / Text / Image / Label is written here.
 */

struct KPlanetSceneRecord: Record {
  @Field var live: Bool = false
  @Field var palette: KCourierPaletteRecord = KCourierPaletteRecord()
  @Field var letters: [KPlanetLetterRecord] = []
  @Field var state: String = "home"
  @Field var napping: Bool = true
  @Field var look: KWrenLookRecord = KWrenLookRecord()

  var planet: KPlanetContent {
    var p = KPlanetContent()
    p.palette = palette.palette
    var seen = Set<String>()
    p.letters = letters.compactMap { r in
      guard !r.id.isEmpty, r.ordinal > 0, seen.insert(r.id).inserted else { return nil }
      return r.letter
    }
    var who = KPlanetWren()
    who.look = look.look
    who.state = KPlanetWrenState(rawValue: state) ?? .home
    who.napping = napping
    p.wren = who
    p.live = live
    return p
  }
}

struct KPlanetWordsRecord: Record {
  @Field var chip: String = ""
  @Field var hint: String = ""
  @Field var name: String = ""
  @Field var time: String = ""
  @Field var line: String = ""
  @Field var aside: String = ""
  @Field var track: String = ""
  @Field var myLetters: String = ""
  @Field var myLettersCount: String = ""
  @Field var back: String = ""
  @Field var zoomIn: String = ""
  @Field var zoomOut: String = ""
  @Field var a11y: String = ""
}

struct KPlanetFigureRecord: Record {
  @Field var id: String = ""
  @Field var value: String = ""
  @Field var label: String = ""
  @Field var lamp: Bool = false
  @Field var a11y: String = ""
}

struct KPlanetSlipRecord: Record {
  @Field var id: String = ""
  @Field var letter: String = ""
  @Field var stamp: String = ""
  @Field var hex: String = ""
  @Field var head: String = ""
  @Field var body: String = ""
  @Field var rows: [String] = []
  @Field var lamp: Int = -1
  @Field var cta: String = ""
  @Field var a11y: String = ""

  var slip: KPlanetSlip {
    KPlanetSlip(id: id, letter: letter, stamp: stamp, stampHex: hex, head: head, body: body, rows: rows, lamp: lamp, cta: cta, a11y: a11y)
  }
}

final class KPlanetPageViewProps: KScreenProps {
  @Field var planet: KPlanetSceneRecord = KPlanetSceneRecord()
  @Field var words: KPlanetWordsRecord = KPlanetWordsRecord()
  @Field var figures: [KPlanetFigureRecord] = []
  @Field var slips: [KPlanetSlipRecord] = []
  @Field var emptyRows: [String] = []
  @Field var open: String = ""

  var onPlBack = EventDispatcher()
  var onPlGo = EventDispatcher()
  var onPlMyLetters = EventDispatcher()

  private(set) lazy var actions: KPlanetPageActions = {
    let a = KPlanetPageActions()
    a.onBack = { [weak self] in self?.onPlBack() }
    a.onGo = { [weak self] id in self?.onPlGo(["id": id]) }
    a.onMyLetters = { [weak self] in self?.onPlMyLetters() }
    return a
  }()

  /// Everything the page shows, converted once per rev.
  var content: KPlanetPageContent {
    cached("content") {
      var c = KPlanetPageContent()
      c.planet = planet.planet
      c.chip = words.chip
      c.hint = words.hint
      c.name = words.name
      c.time = words.time
      c.line = words.line
      c.aside = words.aside
      c.track = words.track
      c.myLetters = words.myLetters
      c.myLettersCount = words.myLettersCount
      c.back = words.back
      c.zoomIn = words.zoomIn
      c.zoomOut = words.zoomOut
      c.a11y = words.a11y
      var figureIds = Set<String>()
      c.figures = figures.compactMap { f in
        guard !f.id.isEmpty, figureIds.insert(f.id).inserted else { return nil }
        return KPlanetFigure(id: f.id, value: f.value, label: f.label, lamp: f.lamp, a11y: f.a11y)
      }
      var slipIds = Set<String>()
      c.slips = slips.compactMap { s in
        guard !s.id.isEmpty, slipIds.insert(s.id).inserted else { return nil }
        return s.slip
      }
      c.emptyRows = emptyRows
      c.open = open
      return c
    }
  }
}

struct KPlanetPageView: ExpoSwiftUI.View {
  @ObservedObject var props: KPlanetPageViewProps

  var body: some View {
    let insets = props.insets
    return KPlanetScreen(
      content: props.content,
      topInset: insets.top,
      bottomInset: insets.bottom,
      actions: props.actions
    )
    .kScreenEnvironment(props)
  }
}
