import SwiftUI
import UIKit
#if canImport(KPortable)
@testable import KPortable
#endif

/* Me with the planet as its cover: her card (her badge, her journey, her flight log, her looks),
   the two tiles about your writing in their states, and the whole page — at rest, pulled, at
   night.
   design/courier-planet/checks/render-fast.sh me-sheet.swift out.png   (or render.sh) */

func palette(_ name: String) -> KCourierPalette {
  var p = KCourierPalette()
  switch name {
  case "morning":
    p.text = Color(hex: "#1E1B35"); p.scrim = Color(hex: "#C4E1C6"); p.button = Color(hex: "#2D5B3A"); p.buttonText = .white
    p.sky0 = Color(hex: "#FBE3D6"); p.sky1 = Color(hex: "#EAF1E4"); p.sea = Color(hex: "#9CC8E6"); p.land = Color(hex: "#B4DCA6")
    p.forest = Color(hex: "#4E9A5C"); p.rock = Color(hex: "#9AA3B0"); p.ink = Color(hex: "#2D5B3A"); p.chip = Color(hex: "#2D5B3A"); p.chipText = .white
    p.sun = Color(hex: "#FFD79A"); p.sunAt = CGPoint(x: 0.1, y: 0.42); p.moon = false; p.stars = false; p.lit = false; p.cloud = .white
  case "day":
    p.text = Color(hex: "#1E1B35"); p.scrim = Color(hex: "#ADDBB5"); p.button = Color(hex: "#1F5C33"); p.buttonText = .white
    p.sky0 = Color(hex: "#BFE3F8"); p.sky1 = Color(hex: "#E3F3FB"); p.sea = Color(hex: "#6FB6E8"); p.land = Color(hex: "#9CD48C")
    p.forest = Color(hex: "#3F8F52"); p.rock = Color(hex: "#8E9AA6"); p.ink = Color(hex: "#1F5C33"); p.chip = Color(hex: "#1F5C33"); p.chipText = .white
    p.sun = Color(hex: "#FFD54A"); p.sunAt = CGPoint(x: 0.82, y: 0.16); p.moon = false; p.stars = false; p.lit = false; p.cloud = .white
  case "evening":
    p.text = Color(hex: "#3B2634"); p.scrim = Color(hex: "#E6CBD3"); p.button = Color(hex: "#4A2F3F"); p.buttonText = .white
    p.sky0 = Color(hex: "#F6C39A"); p.sky1 = Color(hex: "#E8C7E6"); p.sea = Color(hex: "#8FA6CF"); p.land = Color(hex: "#93BB8C")
    p.forest = Color(hex: "#3A6F46"); p.rock = Color(hex: "#7E7A8E"); p.ink = Color(hex: "#4A2F3F"); p.chip = Color(hex: "#4A2F3F"); p.chipText = .white
    p.sun = Color(hex: "#FF9A57"); p.sunAt = CGPoint(x: 0.9, y: 0.42); p.moon = false; p.stars = false; p.lit = true; p.cloud = Color(hex: "#FFE0CC")
  default:
    break // the record's own defaults are the night
  }
  return p
}

let IDS = ["off-chest", "crush", "cant-sleep", "ordinary", "growing", "miss-someone", "made-my-day", "tiny-win", "homesick", "a-song", "letting-go", "what-if"]
func letters(_ n: Int) -> [KPlanetLetter] {
  (0..<n).map { i in KPlanetLetter(id: "l\(i)", ordinal: n - i, stamp: IDS[i % IDS.count], reads: (i * 7 + 3) % 9, answered: i % 5 == 1, day: "NOV \(i + 1)") }
}

func shelf(worn: String, member: Bool, kindred: Bool, skin: KWrenSkin = .sticker, dress: KWrenAccessory = .none) -> [KMeShelfLook] {
  [
    KMeShelfLook(id: "dress:beanie", name: "BEANIE", look: KWrenLook(skin: skin, accessory: .beanie), worn: worn == "dress:beanie"),
    KMeShelfLook(id: "dress:scarf", name: "SCARF", look: KWrenLook(skin: skin, accessory: .scarf), worn: worn == "dress:scarf"),
    KMeShelfLook(id: "skin:moss", name: "MOSS", look: KWrenLook(skin: .moss, accessory: dress), worn: worn == "skin:moss", dim: !kindred),
    KMeShelfLook(id: "skin:peach", name: "PEACH", look: KWrenLook(skin: .peach, accessory: dress), worn: worn == "skin:peach", firstClass: !member && worn != "skin:peach"),
    KMeShelfLook(id: "skin:ink", name: "NIGHT", look: KWrenLook(skin: .ink, accessory: dress), worn: worn == "skin:ink", firstClass: !member && worn != "skin:ink"),
    KMeShelfLook(id: "dress:phones", name: "HEADPHONES", look: KWrenLook(skin: skin, accessory: .phones), worn: worn == "dress:phones", firstClass: !member && worn != "dress:phones"),
  ]
}

struct Case {
  var label: String
  var pal = "day"
  var state: KPlanetWrenState = .home
  var look = KWrenLook()
  var worn = ""
  var member = false
  var kindred = false
  var chip = "YOUR COURIER"
  /// her flight log: the rows, how many have happened, a line of hers the rows cannot say
  var rows = ["NOTHING IN TRANSIT", "WRITE, AND SHE FLIES"]
  var done = 0
  var note = ""
  var cta = "Open"
  /// she is grown (the journey folds away); else she is a fledgling
  var grown = false
  /// the Aura tile: lines | pencil | sketch | named;  the report: none | progress | ready | done | locked
  var auraAt = "named"
  var report = "ready"
  var n = 12
}

func planet(_ c: Case) -> KMePlanet {
  var p = KMePlanet()
  p.planet.palette = palette(c.pal)
  p.planet.letters = letters(c.n)
  var who = KPlanetWren()
  who.look = c.look
  who.state = c.state
  p.planet.wren = who
  p.chip = c.chip
  p.hint = "DRAG TO SPIN"
  p.log.title = "PIP · FLIGHT LOG"
  p.log.rows = c.rows
  p.log.done = c.done
  p.log.note = c.note
  p.cta = c.cta
  p.her.name = "Pip"
  p.her.day = "DAY 12"
  if c.grown {
    p.her.tag = "GROWN"
  } else {
    p.her.journeyTitle = "PIP'S JOURNEY"
    p.her.stops = [
      KMeJourneyStop(id: "egg", name: "EGG", state: "done"),
      KMeJourneyStop(id: "hatch", name: "HATCH", state: "done"),
      KMeJourneyStop(id: "fledge", name: "FLEDGE", state: "now"),
      KMeJourneyStop(id: "wren", name: "GROWN", state: "later"),
    ]
    p.her.next = "GROWN — FIRST KINDRED"
    var young = who
    young.look.stage = .fledge
    p.planet.wren = young
  }
  p.stampsEntry.count = "7"
  p.lettersEntry.count = "14"
  p.me.mark = c.pal == "evening" ? "she" : "he"
  p.me.sign = "♏️"
  p.me.signName = "Scorpio"
  p.me.stats = [
    KMeStat(key: "kindreds", count: "2", unit: "kindreds", a11yLabel: "", hint: ""),
    KMeStat(key: "notes", count: "9", unit: "notes", a11yLabel: "", hint: ""),
  ]
  p.me.edit = "Edit"
  p.reportTile.state = c.report
  p.reportTile.have = 4
  p.reportTile.need = 10
  p.reportTile.tag = c.report == "ready" ? "NO. 1" : "NOV"
  p.reportChip = "WRITING REPORT"
  p.track = "Track"
  p.shelf = shelf(worn: c.worn, member: c.member, kindred: c.kindred, skin: c.look.skin, dress: c.look.accessory)
  p.allLooks = "All looks →"
  p.auraChip = "WRITING AURA"
  p.stamps.label = "STAMPS"
  p.stamps.title = "Snap a moment."
  p.stamps.caption = "7 USED"
  p.stamps.fan = [
    KMeStampCell(id: "tiny-win", date: "", a11yLabel: "", hex: ""),
    KMeStampCell(id: "cant-sleep", date: "", a11yLabel: "", hex: ""),
    KMeStampCell(id: "crush", date: "", a11yLabel: "", hex: ""),
  ]
  p.stamps.make = true
  return p
}

let OUT_ROWS = ["YOUR LETTER LEFT — 2H AGO", "ON 3 STRANGERS' DESKS", "WAITING FOR AN ANSWER"]
let DOOR_ROWS = ["YOUR LETTER LEFT — 5H AGO", "AT PAPER LANTERN'S DOOR", "WAITING FOR AN ANSWER"]
let BACK_ROWS = ["PAPER LANTERN WROTE BACK — 5M AGO", "PIP CARRIED IT HOME", "IT'S WAITING FOR YOU"]


func aura(_ at: String) -> KMeAura {
  var a = KMeAura()
  a.label = "WRITING AURA"
  switch at {
  case "lines":
    a.title = "What your writing says about you"
    a.caption = "0 of 3 letters"
    a.meter.total = 3
    a.meter.filled = 0
  case "pencil":
    a.title = "What your writing says about you"
    a.caption = "4 of 5 letters"
    a.meter.total = 5
    a.meter.filled = 4
  case "sketch":
    a.title = "What your writing says about you"
    a.caption = "2 of 3 labels held"
    a.meter.total = 3
    a.meter.filled = 2
  default:
    a.title = "The Quiet Observer"
    a.from = "FROM 14 LETTERS"
    a.share = true
  }
  return a
}

func report(_ state: String) -> KMeReport {
  var r = KMeReport()
  r.show = state != "none"
  r.enabled = state != "progress"
  switch state {
  case "progress":
    r.title = "Your writing report"
    r.sub = "The first one comes at 10 pieces · 4 so far"
  case "done":
    r.title = "This month's report is read"
    r.sub = "The next one comes in December"
  case "locked":
    r.title = "A monthly writing report"
    r.sub = "One every month with First Class"
    r.locked = true
  default:
    r.title = "Your first writing report"
    r.sub = "Ready to read"
  }
  return r
}

let SCENE_FILE = "/Users/redbeardlord/Desktop/claude-projects/kindredly-ios/assets/aura-scenes/01-quiet-observer.webp"

/// the Aura tile's picture as the adapter lays it in the panel: the named scene filling it, or
/// the ladder's desk whole, at its own shape
@MainActor func art(_ at: String) -> some View {
  var model = KAuraArtModel()
  model.desk.ground = KTheme.classic.soft2
  switch at {
  case "lines":
    model.desk.fidelity = .lines
  case "pencil":
    model.desk.fidelity = .pencil
    model.desk.stroke = Color(hex: "#8A86A3")
  default:
    model.desk.fidelity = .sketch
    model.desk.stroke = Color(hex: "#1E1B35")
    model.desk.window = .white
    model.desk.head = .white
    model.desk.body = .white
    model.desk.page = .white
    model.desk.sun = true
    model.desk.sunStroke = Color(hex: "#1E1B35")
  }
  return ZStack {
    if at == "named", let scene = UIImage(contentsOfFile: SCENE_FILE) {
      Image(uiImage: scene).resizable().aspectRatio(contentMode: .fill)
    } else {
      KAuraArt(theme: .classic, art: model, cover: false, ground: KTheme.classic.soft2)
        .aspectRatio(357.0 / 114.0, contentMode: .fit)
        .padding(.horizontal, 4)
    }
  }
}

@MainActor func cardCell(_ c: Case) -> some View {
  VStack(alignment: .leading, spacing: 8) {
    KMePlanetCard(card: planet(c), actions: KMePlanetActions())
      .frame(width: 370)
    Text(c.label).font(.system(size: 10.5, weight: .semibold, design: .monospaced)).foregroundColor(Color(hex: "#55506E"))
  }
}

@MainActor func tiles(_ auraAt: String, _ reportAt: String) -> some View {
  var c = Case(label: "")
  c.report = reportAt
  return VStack(alignment: .leading, spacing: 8) {
    HStack(alignment: .top, spacing: 14) {
      KMeAuraTile(aura: aura(auraAt), chip: "WRITING AURA", hint: "", onTap: {}) { art(auraAt) }
      KMeReportTileView(report: report(reportAt), tile: planet(c).reportTile, chip: "WRITING REPORT") {}
    }
    .fixedSize(horizontal: false, vertical: true)
    .frame(width: 370)
    Text("aura \(auraAt) · report \(reportAt)").font(.system(size: 10.5, weight: .semibold, design: .monospaced)).foregroundColor(Color(hex: "#55506E"))
  }
}

func meContent(_ c: Case) -> KMeContent {
  var m = KMeContent()
  m.settingsLabel = "Settings"
  m.profile.name = "Sunday Kite"
  m.profile.editLabel = "Edit profile"
  m.aura = aura(c.auraAt)
  m.report = report(c.report)
  m.firstClass.eyebrow = "FIRST CLASS"
  m.firstClass.headline = "More room for your people."
  m.firstClass.rows = ["Rooms that never close", "Pip's full wardrobe", "Voice letters"]
  m.firstClass.cta = "See First Class →"
  m.firstClass.stampLabel = "1ST"
  m.firstClass.member = c.member
  var onStamp = KWrenLook(skin: c.look.skin, stage: .wren, mood: .curious, accessory: c.look.accessory)
  onStamp.letter = false
  m.firstClass.wren = onStamp
  m.planet = planet(c)
  return m
}

/// The page as KMeScreen lays its cover out: the cover (taller by `pull`), you under it, the
/// page. Composed by hand because ImageRenderer draws nothing inside a ScrollView.
@MainActor func page(_ c: Case, pull: CGFloat = 0, fc: String = "none") -> some View {
  var content = meContent(c)
  content.fc.form = fc
  content.fc.post = "THE POST"
  let p = content.planet!
  let top: CGFloat = 54
  return VStack(spacing: 0) {
    KMeCover(planet: p, topInset: top, pull: pull, actions: KMePlanetActions())
      .frame(height: top + KMeCoverMetrics.body + pull)
    KMeIdentity(theme: .classic, profile: content.profile, me: p.me, settingsLabel: content.settingsLabel, actions: KMeActions(), avatar: Circle().fill(Color(hex: "#CFE3F5")))
    KMePlanetPage(content: content, planet: p, theme: .classic, actions: KMeActions()) { art(c.auraAt) }
      .padding(.horizontal, 16)
      .fixedSize(horizontal: false, vertical: true)
    Spacer(minLength: 0)
  }
  .frame(width: 402, height: 874, alignment: .top)
  .background(Color.white)
  .clipShape(RoundedRectangle(cornerRadius: 36))
  .overlay(RoundedRectangle(cornerRadius: 36).stroke(Color(hex: "#E6E4EC"), lineWidth: 1))
}

struct Sheet: View {
  var body: some View {
    VStack(alignment: .leading, spacing: 30) {
      HStack(alignment: .top, spacing: 22) {
        cardCell(Case(label: "growing · on the way", state: .out, rows: OUT_ROWS, done: 2))
        cardCell(Case(label: "grown · back with a reply · peach worn", pal: "night", state: .back, look: KWrenLook(skin: .peach), worn: "skin:peach", member: true, kindred: true, rows: BACK_ROWS, done: 3, grown: true))
        cardCell(Case(label: "day off · a line of hers", pal: "morning", state: .dayOff, chip: "DAY OFF", note: "Day off. I'm doing laps between the pillars.", cta: "Play", grown: true))
      }
      HStack(alignment: .top, spacing: 22) {
        tiles("lines", "progress")
        tiles("sketch", "ready")
        tiles("named", "done")
      }
      HStack(alignment: .top, spacing: 22) {
        tiles("pencil", "locked")
        tiles("named", "none")
      }
      HStack(alignment: .top, spacing: 22) {
        page(Case(label: "", state: .out, rows: OUT_ROWS, done: 2, auraAt: "pencil", report: "progress"))
        page(Case(label: "", state: .out, rows: OUT_ROWS, done: 2), pull: 96)
        page(Case(label: "", pal: "night", state: .back, look: KWrenLook(skin: .peach), worn: "skin:peach", rows: BACK_ROWS, done: 3, grown: true), fc: "invite")
      }
    }
    .padding(30)
    .background(Color(hex: "#F6F5F9"))
  }
}

@main
struct Shot {
  @MainActor static func main() {
    let out = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "me-sheet.png"
    let renderer = ImageRenderer(content: Sheet().environment(\.colorScheme, .light))
    renderer.scale = 2
    guard let data = renderer.uiImage?.pngData() else { fatalError("no image") }
    try! data.write(to: URL(fileURLWithPath: out))
    print("wrote", out)
  }
}
