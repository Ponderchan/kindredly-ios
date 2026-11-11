import SwiftUI
import UIKit

/* The planet page: the scene, her words, the three figures, one slip at a time.
   design/courier-planet/checks/render.sh page-sheet.swift out.png
   The page is composed by hand from its parts (ImageRenderer draws nothing inside a ScrollView):
   the pager is shown as the slip on show with its neighbours peeking. The planet's world is run
   on first, so it has turned to the letter on show (it eases there over about a second). */

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


struct Case {
  var label: String
  var pal = "day"
  var state: KPlanetWrenState = .out
  var look = KWrenLook()
  var n = 12
  var onShow = 0
  var zoom: CGFloat = 1
  var chip = "YOUR COURIER"
  var time = "2H AGO"
  var line = "your letter's out. no one has written back yet"
  var aside = "i'll bring it the second someone does"
  var way = "1"
}

let BODIES = [
  "I keep a list of small things that went right today. It is longer than I expected.",
  "Does anyone else rehearse conversations in the shower and then never have them?",
  "The bus driver waved at me like we were old friends. Maybe we are.",
  "I moved cities in August and still take the long way home on purpose.",
]
let NAMES = ["OFF MY CHEST", "CRUSH", "CAN'T SLEEP", "ORDINARY", "GROWING", "MISS SOMEONE", "MADE MY DAY", "TINY WIN", "HOMESICK", "A SONG", "LETTING GO", "WHAT IF"]

func slips(_ c: Case) -> [KPlanetSlip] {
  let ls = letters(c.n)
  return ls.enumerated().map { i, l in
    var rows = ["YOUR LETTER LEFT — \(l.day)"]
    var lamp = -1
    if l.reads > 0 {
      rows.append(l.reads == 1 ? "ON ONE STRANGER'S DESK" : "ON \(l.reads) STRANGERS' DESKS")
      lamp = 1
    }
    var cta = ""
    if c.state == .back, i == 2 {
      rows = ["MIRA WROTE BACK — NOV 10", "PIP CARRIED IT HOME", "IT'S WAITING FOR YOU"]
      lamp = -1
      cta = "Go to the Door"
    } else if c.state == .waiting, i == 0 {
      rows = ["YOUR LETTER LEFT — \(l.day)", "AT MIRA'S DOOR", "WAITING FOR AN ANSWER"]
      lamp = -1
    } else {
      rows.append(l.answered ? (i % 2 == 0 ? "NOA REPLIED" : "ANSWERED") : "WAITING FOR AN ANSWER")
    }
    return KPlanetSlip(id: l.id, letter: l.id, stamp: l.stamp, head: "\(l.day) · \(NAMES[i % NAMES.count])", body: BODIES[i % BODIES.count], rows: rows, lamp: lamp, cta: cta)
  }
}

func content(_ c: Case) -> KPlanetPageContent {
  var p = KPlanetPageContent()
  p.planet.palette = palette(c.pal)
  p.planet.letters = letters(c.n)
  var who = KPlanetWren()
  who.look = c.look
  who.state = c.state
  p.planet.wren = who
  p.chip = c.chip
  p.hint = "DRAG TO SPIN · PINCH TO ZOOM"
  p.name = "Pip"
  p.time = c.time
  p.line = c.line
  p.aside = c.aside
  let reads = letters(c.n).reduce(0) { $0 + $1.reads }
  p.figures = [
    KPlanetFigure(id: "way", value: c.way, label: "ON THE WAY"),
    KPlanetFigure(id: "carried", value: "\(c.n)", label: "CARRIED"),
    KPlanetFigure(id: "desks", value: "\(reads)", label: "ON DESKS", lamp: true),
  ]
  p.track = "TRACK"
  p.slips = slips(c)
  p.emptyRows = ["NOTHING IN TRANSIT", "WRITE, AND SHE FLIES"]
  p.myLetters = "My letters"
  p.myLettersCount = "\(c.n)"
  return p
}

/// The page, its planet's world run on two and a half seconds first (so it has turned to the letter
/// on show): the probe is seeded with that world and the page's planet adopts it.
@MainActor func page(_ c: Case) -> some View {
  let page = content(c)
  let all = page.slips
  let width: CGFloat = 402
  let topInset: CGFloat = 54
  let sceneSize = CGSize(width: width, height: topInset + 326)
  var planet = page.planet
  planet.selected = all.isEmpty ? nil : all[min(c.onShow, all.count - 1)].letter
  let engine = KPlanetEngine()
  engine.zoom = c.zoom
  let probe = KPlanetProbe(seed: engine)
  for i in 0...150 {
    engine.advance(to: 1000 + Double(i) / 60, kind: .page, content: planet, size: sceneSize)
    KPlanetView.report(engine, to: probe, kind: .page, size: sceneSize)
  }
  let final = planet
  let slipWidth = width - 36
  let shown = min(c.onShow, max(0, all.count - 1))
  return VStack(spacing: 0) {
    KPlanetPageScene(content: page, planet: final, topInset: topInset, probe: probe, turned: false, onBack: {}, onTap: { _ in }, onPick: { _ in }, onTurned: {})
      .frame(width: width)
    KPlanetBubble(palette: page.planet.palette, name: page.name, time: page.time, line: page.line, aside: page.aside, probe: probe, live: false)
    KPlanetFigures(figures: page.figures, palette: page.planet.palette)
    VStack(alignment: .leading, spacing: 0) {
      KPlanetTrackHead(title: page.track, count: all.isEmpty ? "" : "\(shown + 1) / \(all.count)", palette: page.planet.palette)
      if all.isEmpty {
        KPlanetSlipCard(slip: KPlanetSlip(id: "", letter: "", stamp: "", head: "", body: "", rows: page.emptyRows), palette: page.planet.palette, onShow: true, onGo: {})
          .padding(.horizontal, 18)
      } else {
        HStack(alignment: .top, spacing: 10) {
          ForEach(all) { slip in
            KPlanetSlipCard(slip: slip, palette: page.planet.palette, onShow: slip.id == all[shown].id, onGo: {})
              .frame(width: slipWidth)
          }
        }
        .offset(x: 18 - CGFloat(shown) * (slipWidth + 10))
        .frame(width: width, alignment: .leading)
        .clipped()
      }
      KPlanetMyLettersRow(title: page.myLetters, count: page.myLettersCount, palette: page.planet.palette) {}
    }
    .padding(.top, 10)
    // as tall as it needs, as in the page's scroll view (here the Spacer would squeeze it)
    .fixedSize(horizontal: false, vertical: true)
    Spacer(minLength: 0)
  }
  .frame(width: width, height: 874)
  .background(page.planet.palette.scrim)
  .clipShape(RoundedRectangle(cornerRadius: 36))
}

let CASES: [Case] = [
  Case(label: "on the way · day · the newest letter on show"),
  Case(label: "back with a reply · night · opens on the answered letter", pal: "night", state: .back, look: KWrenLook(skin: .peach), onShow: 2, time: "JUST NOW", line: "BACK. Mira wrote you and i flew it here in one go", aside: "it's on your desk. read it read it read it", way: "0"),
  Case(label: "waiting at their door · evening · zoomed in (the days show)", pal: "evening", state: .waiting, look: KWrenLook(skin: .moss, accessory: .scarf), zoom: 1.8, time: "1D AGO", line: "dropped your reply at Mira's sill. sitting here till they're back", aside: "just got here. i can wait, i'm great at waiting"),
  Case(label: "nothing sent yet · morning", pal: "morning", state: .home, n: 0, time: "JUST NOW", line: "bag's empty. give me one and watch me go", aside: "i'm fast. promise", way: "0"),
]

struct Sheet: View {
  var body: some View {
    VStack(alignment: .leading, spacing: 18) {
      Text("THE PLANET PAGE").font(.system(size: 13, weight: .bold, design: .monospaced)).foregroundColor(Color(hex: "#1E1B35"))
      HStack(alignment: .top, spacing: 22) {
        ForEach(0..<CASES.count, id: \.self) { i in
          VStack(alignment: .leading, spacing: 6) {
            page(CASES[i])
            Text(CASES[i].label).font(.system(size: 10.5, weight: .semibold, design: .monospaced)).foregroundColor(Color(hex: "#55506E"))
          }
        }
      }
    }
    .padding(28)
    .background(Color(hex: "#F6F5F9"))
  }
}

@main
struct Shot {
  @MainActor static func main() {
    let out = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "page-sheet.png"
    let renderer = ImageRenderer(content: Sheet().environment(\.colorScheme, .light))
    renderer.scale = 2
    guard let data = renderer.uiImage?.pngData() else { fatalError("no image") }
    try! data.write(to: URL(fileURLWithPath: out))
    print("wrote", out)
  }
}
