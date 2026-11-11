import SwiftUI
import UIKit

/* Her card on Me, the tiles under it, and the whole Me page with the planet.
   design/courier-planet/checks/render.sh me-sheet.swift out.png */

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
    KMeShelfLook(id: "skin:moss", name: "MOSS", look: KWrenLook(skin: .moss, accessory: dress), worn: worn == "skin:moss", dim: !kindred),
    KMeShelfLook(id: "skin:peach", name: "PEACH", look: KWrenLook(skin: .peach, accessory: dress), worn: worn == "skin:peach", firstClass: !member),
    KMeShelfLook(id: "dress:phones", name: "HEADPHONES", look: KWrenLook(skin: skin, accessory: .phones), worn: worn == "dress:phones", firstClass: !member),
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
  var time = "2H AGO"
  var line = "your letter's out. no one has written back yet"
  var aside = "i'll bring it the second someone does"
  var cta = "Open"
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
  p.name = "Pip"
  p.time = c.time
  p.line = c.line
  p.aside = c.aside
  p.cta = c.cta
  p.track = "Track"
  p.shelf = shelf(worn: c.worn, member: c.member, kindred: c.kindred, skin: c.look.skin, dress: c.look.accessory)
  p.allLooks = "All looks →"
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

let CASES: [Case] = [
  Case(label: "home · asleep · nothing worn · free reader, no kindred", line: "home. nothing in the bag", aside: "write one and i'll take it"),
  Case(label: "on the way · beanie worn", state: .out, look: KWrenLook(skin: .sticker, accessory: .beanie), worn: "dress:beanie"),
  Case(label: "waiting at their door · evening · moss", pal: "evening", state: .waiting, look: KWrenLook(skin: .moss), worn: "skin:moss", kindred: true, line: "it's on someone's desk", aside: "they're reading. i'm staying put"),
  Case(label: "back with a reply · night · member · peach", pal: "night", state: .back, look: KWrenLook(skin: .peach), worn: "skin:peach", member: true, kindred: true, time: "JUST NOW", line: "someone wrote back", aside: "it's right here"),
  Case(label: "day off · morning", pal: "morning", state: .dayOff, chip: "DAY OFF", time: "DAY OFF", line: "no letters to carry today", aside: "race me through the gates?", cta: "Play"),
]

func aura() -> KMeAura {
  var a = KMeAura()
  a.label = "YOUR WRITING AURA"
  a.title = "The Quiet Observer"
  a.from = "FROM YOUR 14 LETTERS"
  return a
}

func report() -> KMeReport {
  var r = KMeReport()
  r.show = true
  r.title = "Your first writing report"
  r.sub = "Ready to read"
  r.enabled = true
  return r
}

func art() -> some View {
  var model = KAuraArtModel()
  model.desk.fidelity = .sketch
  model.desk.ground = .white
  model.desk.stroke = Color(hex: "#1E1B35")
  model.desk.sun = true
  model.desk.sunStroke = Color(hex: "#1E1B35")
  return KAuraArt(theme: .classic, art: model, cover: true, ground: .white)
}

@MainActor func cardCell(_ c: Case) -> some View {
  VStack(alignment: .leading, spacing: 4) {
    KMePlanetCard(card: planet(c), actions: KMePlanetActions())
      .frame(width: 358)
    Text(c.label).font(.system(size: 10.5, weight: .semibold, design: .monospaced)).foregroundColor(Color(hex: "#55506E"))
  }
}

@MainActor func tiles(_ c: Case) -> some View {
  VStack(spacing: 12) {
    HStack(alignment: .top, spacing: 12) {
      KMeAuraTile(aura: aura(), hint: "", onTap: {}) { art() }
      KMeStampsTile(tile: planet(c).stamps) {}
    }
    KMeReportRow(report: report()) {}
  }
  .frame(width: 358)
}

func meContent(_ c: Case) -> KMeContent {
  var m = KMeContent()
  m.settingsLabel = "Settings"
  m.segments = ["Courier", "Aura", "Stamps"]
  m.profile.name = "Sunday Kite"
  m.profile.joined = "joined Jul 27"
  m.profile.stats = [
    KMeStat(key: "letters", count: "14", unit: "letters", a11yLabel: "14 letters", hint: ""),
    KMeStat(key: "kindreds", count: "2", unit: "kindreds", a11yLabel: "2 kindreds", hint: ""),
  ]
  m.aura = aura()
  m.report = report()
  m.firstClass.eyebrow = "FIRST CLASS"
  m.firstClass.headline = "Give your letters a first-class seat."
  m.firstClass.rows = ["Every look and colour for Pip", "Your writing report, every month", "Unlimited photo stamps"]
  m.firstClass.cta = "See First Class →"
  m.firstClass.stampLabel = "1ST"
  m.planet = planet(c)
  return m
}

/// The Me page as KMeScreen lays it out: the status strip, the sticky header, the page under it.
/// Composed by hand because ImageRenderer draws nothing inside a ScrollView; `scrolled` is how far
/// the page has been pushed up (the header collapses over the first 40).
@MainActor func page(_ c: Case, scrolled: CGFloat = 0, fc: String = "none") -> some View {
  var content = meContent(c)
  content.fc.form = fc
  content.fc.post = "THE POST"
  let chrome = KScrollModel(offsetCap: 48, quantum: 0.5)
  chrome.update(offset: scrolled, distanceToBottom: 400, endOffset: 600)
  return VStack(spacing: 0) {
    Color.clear.frame(height: 54)
    KMeHeader(theme: .classic, content: content, chrome: chrome, selection: .constant(0), actions: KMeActions(), onMetrics: { _ in }) {
      Circle().fill(Color(hex: "#CFE3F5"))
    }
    .zIndex(1)
    Color.clear
      .overlay(alignment: .top) {
        KMePlanetPage(content: content, planet: content.planet!, actions: KMeActions()) { art() }
          .padding(.horizontal, 16)
          .padding(.top, 12)
          .offset(y: -scrolled)
      }
      .clipped()
  }
  .frame(width: 402, height: 874)
  .background(Color.white)
  .clipShape(RoundedRectangle(cornerRadius: 36))
  .overlay(RoundedRectangle(cornerRadius: 36).stroke(Color(hex: "#E6E4EC"), lineWidth: 1))
}

struct Sheet: View {
  var body: some View {
    VStack(alignment: .leading, spacing: 26) {
      Text("HER CARD ON ME · the tiles · the page (Classic)").font(.system(size: 13, weight: .bold, design: .monospaced)).foregroundColor(Color(hex: "#1E1B35"))
      HStack(alignment: .top, spacing: 22) {
        ForEach(0..<3, id: \.self) { i in cardCell(CASES[i]) }
      }
      HStack(alignment: .top, spacing: 22) {
        cardCell(CASES[3])
        cardCell(CASES[4])
        VStack(alignment: .leading, spacing: 4) {
          tiles(CASES[0])
          Text("under the card: happy sand · low blue · calm green").font(.system(size: 10.5, weight: .semibold, design: .monospaced)).foregroundColor(Color(hex: "#55506E"))
        }
      }
      HStack(alignment: .top, spacing: 22) {
        page(CASES[1])
        page(CASES[1], scrolled: 260)
        page(CASES[3], fc: "invite")
      }
      Text("the page at rest · pushed up 260 (the header stuck and collapsed) · night, with the Post's letter on the card").font(.system(size: 10.5, weight: .semibold, design: .monospaced)).foregroundColor(Color(hex: "#55506E"))
    }
    .padding(28)
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
