import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 THE COURIER'S PLANET ON ME (2026-11-11, docs/courier-planet.md), as React Native sends it: the
 `planet` record of <KMeView> (modules/kindredly-ui/src/Planet.ts KMePlanetData; built by
 src/screens/me/planet-model.ts and me-pieces.ts), and the binary's marker for it.

 With `on`, KMeView's page is the planet's one page (Portable/Me/KMeScreen.swift KMePlanetPage,
 KMePlanetCard.swift): her card (a small whole planet drawn by Portable/Planet, Wren drawn by
 KWrenBird — no snapshots, no islands), the Aura and Stamps tiles and the report row. Off (the
 default, and all a record from an older TS can be), Me is the page of segments as before.

 The record:
 - on, live (the planet's clock runs: the tab is focused)
 - palette: the hour's sky (KCourierPaletteRecord, as the courier's card takes it)
 - letters: [{ id, ordinal (1 = the first letter ever: where its stamp sits, for good), stamp, hex
   ("" for none), reads, answered, day }], newest first
 - state (home | out | waiting | back | dayOff), napping, look: KWrenLookRecord
 - stampsEntry, lettersEntry: { count, a11y, hint } (the cover's two ways in)
 - me: { mark (he | she | ""), sign (its emoji), signName, signA11y, stats: [{ key (kindreds |
   notes), count, unit, a11y, hint }], edit } (you, under the cover)
 - her: { name, day (DAY 12), tag (GROWN, or ""), journeyTitle, stops: [{ id (egg | hatch |
   fledge | wren), name, state (done | now | later) }], next, a11y } (her badge and her journey)
 - reportTile: { state (none | progress | ready | done | locked), have, need, tag }, reportChip
 - chip, hint, cta, track, a11y
 - log: { title (PIP · FLIGHT LOG), rows (the run she is on, as her page's slip files it), done
   (how many rows have happened: the lamp is on the last of them), note (a line of hers the rows
   cannot say; "" for none), a11y }
 - shelf: [{ id ("dress:beanie", "skin:moss"), name, look, worn, firstClass, dim, a11y, hint }]
 - allLooks, allLooksHint
 - stamps: { label, title, caption, fan: [{ id, hex }], make, a11y, hint }
 - auraHint, auraChip (the Aura tile's chip: AURA)

 KWrenLookRecord: { skin, stage, mood, accessory, wilt, hasForm, form: { bodyStretch, crestLift,
 eyeScale, eyeSpread, cheek, beakScale, tail }, mark ("" for none) }: how KWrenBird draws her. An
 unknown skin, stage, mood or piece falls back to the default rather than fail.

 Events (KMeView): onMeTrack {} (her card's round button: the planet page) and
 onMePlanetTap { what: wren | letter | stamp, id } (a tap on the planet landed on something);
 Open / Play is onMeCourier, a look is onMeLook { id }, All looks → is onMeAllLooks, the Aura tile
 is onMeAuraOpen, the Stamps tile is onMeStamps { action: "album" }, the report row is onMeReport.

 KMePlanetView below draws nothing: a binary whose KMeView predates the `planet` record would
 ignore it and show the page of segments, which is harmless, but TS also changes what the taps
 do; so TS asks isKindredlyUIViewAvailable("KMePlanetView") before it turns the planet on (as
 KCourierCardView is the courier card's marker). This file imports ExpoUI, so no bare Button /
 Text / Image / Label is written here.
 */

struct KWrenFormRecord: Record {
  @Field var bodyStretch: Double = 1
  @Field var crestLift: Double = 0
  @Field var eyeScale: Double = 1
  @Field var eyeSpread: Double = 0
  @Field var cheek: Double = 1
  @Field var beakScale: Double = 1
  @Field var tail: Bool = false

  var form: KHatchlingForm {
    var f = KHatchlingForm()
    f.bodyStretch = CGFloat(bodyStretch)
    f.crestLift = CGFloat(crestLift)
    f.eyeScale = CGFloat(eyeScale)
    f.eyeSpread = CGFloat(eyeSpread)
    f.cheek = CGFloat(cheek)
    f.beakScale = CGFloat(beakScale)
    f.tail = tail
    return f
  }
}

/// How she is drawn (KWrenBird): her colour, her stage, what she wears.
struct KWrenLookRecord: Record {
  @Field var skin: String = "sticker"
  @Field var stage: String = "wren"
  @Field var mood: String = "content"
  @Field var accessory: String = "none"
  @Field var wilt: Bool = false
  /// the hatchling's own proportions are in `form`
  @Field var hasForm: Bool = false
  @Field var form: KWrenFormRecord = KWrenFormRecord()
  /// the shell's birthmark, "#RRGGBB"; "" for none
  @Field var mark: String = ""

  var look: KWrenLook {
    var l = KWrenLook()
    l.skin = KWrenSkin(rawValue: skin) ?? .sticker
    l.stage = KWrenStage(rawValue: stage) ?? .wren
    l.mood = KWrenMood(rawValue: mood) ?? .content
    l.accessory = KWrenAccessory(rawValue: accessory) ?? .none
    l.wilt = wilt
    l.form = hasForm ? form.form : nil
    l.mark = mark.isEmpty ? nil : mark
    return l
  }
}

struct KPlanetLetterRecord: Record {
  @Field var id: String = ""
  @Field var ordinal: Int = 0
  @Field var stamp: String = ""
  @Field var hex: String = ""
  @Field var reads: Int = 0
  @Field var answered: Bool = false
  @Field var day: String = ""

  var letter: KPlanetLetter {
    KPlanetLetter(id: id, ordinal: ordinal, stamp: stamp, stampHex: hex.isEmpty ? nil : hex, reads: max(0, reads), answered: answered, day: day)
  }
}

struct KMeShelfLookRecord: Record {
  @Field var id: String = ""
  @Field var name: String = ""
  @Field var look: KWrenLookRecord = KWrenLookRecord()
  @Field var worn: Bool = false
  @Field var firstClass: Bool = false
  @Field var dim: Bool = false
  @Field var a11y: String = ""
  @Field var hint: String = ""

  var shelfLook: KMeShelfLook {
    KMeShelfLook(id: id, name: name, look: look.look, worn: worn, firstClass: firstClass, dim: dim, a11y: a11y, hint: hint)
  }
}

struct KMeFanStampRecord: Record {
  @Field var id: String = ""
  @Field var hex: String = ""
}

struct KMeStampsTileRecord: Record {
  @Field var label: String = ""
  @Field var title: String = ""
  @Field var caption: String = ""
  @Field var fan: [KMeFanStampRecord] = []
  @Field var make: Bool = false
  @Field var a11y: String = ""
  @Field var hint: String = ""

  var tile: KMeStampsTileContent {
    var t = KMeStampsTileContent()
    t.label = label
    t.title = title
    t.caption = caption
    var seen = Set<String>()
    t.fan = fan.compactMap { s in
      guard !s.id.isEmpty, seen.insert(s.id).inserted else { return nil }
      return KMeStampCell(id: s.id, date: "", a11yLabel: "", hex: s.hex)
    }
    t.make = make
    t.a11y = a11y
    t.hint = hint
    return t
  }
}

struct KMeCoverEntryRecord: Record {
  @Field var count: String = ""
  @Field var a11y: String = ""
  @Field var hint: String = ""

  var entry: KMeCoverEntry {
    var e = KMeCoverEntry()
    e.count = count
    e.a11y = a11y
    e.hint = hint
    return e
  }
}

struct KMeJourneyStopRecord: Record {
  @Field var id: String = ""
  @Field var name: String = ""
  @Field var state: String = "later"
}

struct KMeHerRecord: Record {
  @Field var name: String = ""
  @Field var day: String = ""
  @Field var tag: String = ""
  @Field var journeyTitle: String = ""
  @Field var stops: [KMeJourneyStopRecord] = []
  @Field var next: String = ""
  @Field var a11y: String = ""

  var her: KMeHerBadge {
    var h = KMeHerBadge()
    h.name = name
    h.day = day
    h.tag = tag
    h.journeyTitle = journeyTitle
    var seen = Set<String>()
    h.stops = stops.compactMap { s in
      guard !s.id.isEmpty, seen.insert(s.id).inserted else { return nil }
      return KMeJourneyStop(id: s.id, name: s.name, state: s.state)
    }
    h.next = next
    h.a11y = a11y
    return h
  }
}

struct KMeSelfRecord: Record {
  @Field var mark: String = ""
  @Field var sign: String = ""
  @Field var signName: String = ""
  @Field var signA11y: String = ""
  @Field var stats: [KMeStatRecord] = []
  @Field var edit: String = ""

  var me: KMeSelf {
    var m = KMeSelf()
    m.mark = mark
    m.sign = sign
    m.signName = signName
    m.signA11y = signA11y
    var seen = Set<String>()
    m.stats = stats.compactMap { s in
      guard !s.key.isEmpty, seen.insert(s.key).inserted else { return nil }
      return s.stat
    }
    m.edit = edit
    return m
  }
}

struct KMeReportTileRecord: Record {
  @Field var state: String = "none"
  @Field var have: Int = 0
  @Field var need: Int = 0
  @Field var tag: String = ""

  var tile: KMeReportTile {
    var t = KMeReportTile()
    t.state = state
    t.have = max(0, have)
    t.need = max(0, need)
    t.tag = tag
    return t
  }
}

struct KMeFlightLogRecord: Record {
  @Field var title: String = ""
  @Field var rows: [String] = []
  @Field var done: Int = 0
  @Field var note: String = ""
  @Field var a11y: String = ""

  var log: KMeFlightLog {
    var l = KMeFlightLog()
    l.title = title
    l.rows = rows.filter { !$0.isEmpty }
    l.done = max(0, min(done, l.rows.count))
    l.note = note
    l.a11y = a11y
    return l
  }
}

/// Her card and the tiles under it, as TS sends them (KMePlanetData).
struct KMePlanetRecord: Record {
  @Field var on: Bool = false
  @Field var live: Bool = false
  @Field var palette: KCourierPaletteRecord = KCourierPaletteRecord()
  @Field var letters: [KPlanetLetterRecord] = []
  @Field var state: String = "home"
  @Field var napping: Bool = true
  @Field var look: KWrenLookRecord = KWrenLookRecord()
  @Field var chip: String = ""
  @Field var hint: String = ""
  @Field var log: KMeFlightLogRecord = KMeFlightLogRecord()
  @Field var cta: String = ""
  @Field var track: String = ""
  @Field var a11y: String = ""
  @Field var shelf: [KMeShelfLookRecord] = []
  @Field var allLooks: String = ""
  @Field var allLooksHint: String = ""
  @Field var stamps: KMeStampsTileRecord = KMeStampsTileRecord()
  @Field var auraHint: String = ""
  @Field var auraChip: String = ""
  @Field var stampsEntry: KMeCoverEntryRecord = KMeCoverEntryRecord()
  @Field var lettersEntry: KMeCoverEntryRecord = KMeCoverEntryRecord()
  @Field var me: KMeSelfRecord = KMeSelfRecord()
  @Field var her: KMeHerRecord = KMeHerRecord()
  @Field var reportTile: KMeReportTileRecord = KMeReportTileRecord()
  @Field var reportChip: String = ""

  /// nil while the planet is off: Me is then the page of segments
  var planet: KMePlanet? {
    guard on else { return nil }
    var p = KMePlanet()
    p.planet.palette = palette.palette
    var seen = Set<String>()
    p.planet.letters = letters.compactMap { r in
      guard !r.id.isEmpty, r.ordinal > 0, seen.insert(r.id).inserted else { return nil }
      return r.letter
    }
    var who = KPlanetWren()
    who.look = look.look
    who.state = KPlanetWrenState(rawValue: state) ?? .home
    who.napping = napping
    p.planet.wren = who
    p.planet.live = live
    p.chip = chip
    p.hint = hint
    p.log = log.log
    p.cta = cta
    p.track = track
    p.a11y = a11y
    var ids = Set<String>()
    p.shelf = shelf.compactMap { r in
      guard !r.id.isEmpty, ids.insert(r.id).inserted else { return nil }
      return r.shelfLook
    }
    p.allLooks = allLooks
    p.allLooksHint = allLooksHint
    p.stamps = stamps.tile
    p.auraHint = auraHint
    p.auraChip = auraChip
    p.stampsEntry = stampsEntry.entry
    p.lettersEntry = lettersEntry.entry
    p.me = me.me
    p.her = her.her
    p.reportTile = reportTile.tile
    p.reportChip = reportChip
    return p
  }
}

// MARK: - The marker

final class KMePlanetViewProps: KScreenProps {}

/// Draws nothing: the binary's answer to "can KMeView draw the courier's planet?" (see the top).
struct KMePlanetView: ExpoSwiftUI.View {
  @ObservedObject var props: KMePlanetViewProps

  var body: some View {
    Color.clear
      .kScreenEnvironment(props)
  }
}
