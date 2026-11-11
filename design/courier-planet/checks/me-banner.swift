import SwiftUI
import UIKit
#if canImport(KPortable)
@testable import KPortable
#endif

/* THE COVER IDEA (owner, 2026-11-11 night: "me tab 的结构就改成和我老产品一模一样的"): the pieces the
   prototype in design/courier-planet/cover-prototype is put together from — the planet's scene
   as a cover (with plain sky above and below it to stretch into), the planet page a pull-down
   opens, her card as a miniature of her own page two ways (A a fixed sky, B on white), and the
   Aura and report tiles side by side over the First Class card. Not built in the app.
   design/courier-planet/checks/render-fast.sh me-banner.swift <out dir>

   The helpers below are me-sheet.swift's.
   Her card on Me (the planet, her flight log, her looks), the tiles under it, and the whole Me
   page with the planet.
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
  /// her flight log: the rows, how many have happened, a line of hers the rows cannot say
  var rows = ["NOTHING IN TRANSIT", "WRITE, AND SHE FLIES"]
  var done = 0
  var note = ""
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
  p.log.title = "PIP · FLIGHT LOG"
  p.log.rows = c.rows
  p.log.done = c.done
  p.log.note = c.note
  p.cta = c.cta
  p.track = "Track"
  p.shelf = shelf(worn: c.worn, member: c.member, kindred: c.kindred, skin: c.look.skin, dress: c.look.accessory)
  p.allLooks = "All looks →"
  p.auraChip = "AURA"
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

let CASES: [Case] = [
  Case(label: "home · asleep · nothing worn · free reader, no kindred"),
  Case(label: "on the way · beanie worn", state: .out, look: KWrenLook(skin: .sticker, accessory: .beanie), worn: "dress:beanie", rows: OUT_ROWS, done: 2),
  Case(label: "waiting at their door · evening · moss", pal: "evening", state: .waiting, look: KWrenLook(skin: .moss), worn: "skin:moss", kindred: true, rows: DOOR_ROWS, done: 2),
  Case(label: "back with a reply · night · member · peach", pal: "night", state: .back, look: KWrenLook(skin: .peach), worn: "skin:peach", member: true, kindred: true, rows: BACK_ROWS, done: 3),
  Case(label: "day off · morning · a line of hers", pal: "morning", state: .dayOff, chip: "DAY OFF", note: "Day off. I'm doing laps between the pillars.", cta: "Play"),
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


// ── the planet page (ported from page-sheet.swift) ──
let BODIES = [
  "I keep a list of small things that went right today. It is longer than I expected.",
  "Does anyone else rehearse conversations in the shower and then never have them?",
  "The bus driver waved at me like we were old friends. Maybe we are.",
  "I moved cities in August and still take the long way home on purpose.",
]
let NAMES = ["OFF MY CHEST", "CRUSH", "CAN'T SLEEP", "ORDINARY", "GROWING", "MISS SOMEONE", "MADE MY DAY", "TINY WIN", "HOMESICK", "A SONG", "LETTING GO", "WHAT IF"]

func slips(_ c: Case) -> [KPlanetSlip] {
  letters(c.n).enumerated().map { i, l in
    var rows = ["YOUR LETTER LEFT — \(l.day)"]
    var lamp = -1
    if l.reads > 0 {
      rows.append(l.reads == 1 ? "ON ONE STRANGER'S DESK" : "ON \(l.reads) STRANGERS' DESKS")
      lamp = 1
    }
    rows.append(l.answered ? (i % 2 == 0 ? "NOA REPLIED" : "ANSWERED") : "WAITING FOR AN ANSWER")
    return KPlanetSlip(id: l.id, letter: l.id, stamp: l.stamp, head: "\(l.day) · \(NAMES[i % NAMES.count])", body: BODIES[i % BODIES.count], rows: rows, lamp: lamp, cta: "")
  }
}

func pageContent(_ c: Case) -> KPlanetPageContent {
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
  p.time = "2H AGO"
  p.line = "your letter's out. no one has written back yet"
  p.aside = "i'll bring it the second someone does"
  let reads = letters(c.n).reduce(0) { $0 + $1.reads }
  p.figures = [
    KPlanetFigure(id: "way", value: "1", label: "ON THE WAY"),
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

@MainActor func planetPage(_ c: Case) -> some View {
  let page = pageContent(c)
  let all = page.slips
  let width: CGFloat = 402
  let topInset: CGFloat = 54
  let sceneSize = CGSize(width: width, height: topInset + 326)
  var planet = page.planet
  planet.selected = all.first?.letter
  let engine = KPlanetEngine()
  let probe = KPlanetProbe(seed: engine)
  for i in 0...150 {
    engine.advance(to: 1000 + Double(i) / 60, kind: .page, content: planet, size: sceneSize)
    KPlanetView.report(engine, to: probe, kind: .page, size: sceneSize)
  }
  let final = planet
  let slipWidth = width - 36
  return VStack(spacing: 0) {
    KPlanetPageScene(content: page, planet: final, topInset: topInset, probe: probe, turned: false, onBack: {}, onTap: { _ in }, onPick: { _ in }, onTurned: {})
      .frame(width: width)
    KPlanetBubble(palette: page.planet.palette, name: page.name, time: page.time, line: page.line, aside: page.aside, probe: probe, live: false)
    KPlanetFigures(figures: page.figures, palette: page.planet.palette)
    VStack(alignment: .leading, spacing: 0) {
      KPlanetTrackHead(title: page.track, count: "1 / \(all.count)", palette: page.planet.palette)
      HStack(alignment: .top, spacing: 10) {
        ForEach(all) { slip in
          KPlanetSlipCard(slip: slip, palette: page.planet.palette, onShow: slip.id == all[0].id, onGo: {})
            .frame(width: slipWidth)
        }
      }
      .offset(x: 18)
      .frame(width: width, alignment: .leading)
      .clipped()
      KPlanetMyLettersRow(title: page.myLetters, count: page.myLettersCount, palette: page.planet.palette) {}
    }
    .padding(.top, 10)
    .fixedSize(horizontal: false, vertical: true)
    Spacer(minLength: 0)
  }
  .frame(width: width, height: 874)
  .background(page.planet.palette.scrim)
}

// ── the banner's scene: the card's scene, with plain sky above and below it to stretch into ──
@MainActor func bannerScene(_ c: Case) -> some View {
  let p = planet(c)
  return VStack(spacing: 0) {
    p.planet.palette.sky0.frame(width: 402, height: 300)
    KPlanetView(kind: .card, content: p.planet, probe: KPlanetProbe())
      .frame(width: 402, height: 236)
    p.planet.palette.sky1.frame(width: 402, height: 300)
  }
}

// ── her card as a miniature of her page ──
func cover(_ pal: String) -> KCourierCover {
  var c = KCourierCover()
  if pal == "night" {
    c.sky0 = Color(hex: "#1E1B35"); c.sky1 = Color(hex: "#2E2A6B"); c.ink = .white; c.band = Color(hex: "#2B2660")
    c.scrim = Color(hex: "#2B2660"); c.moon = true; c.stars = true; c.night = true; c.sun = nil
  } else {
    c.sun = Color(hex: "#FFD54A")
  }
  return c
}

@MainActor func miniScene(_ c: Case, bubble: String) -> some View {
  let cv = cover(c.pal)
  let w: CGFloat = 370
  let h: CGFloat = 150
  let night = c.pal == "night"
  return ZStack(alignment: .topLeading) {
    LinearGradient(colors: [cv.sky0, cv.sky1], startPoint: .top, endPoint: .bottom)
      .frame(width: w, height: h)
    KCourierSky(cover: cv, width: w, height: h)
    Ellipse().fill(Color.white.opacity(night ? 0.10 : 0.55))
      .frame(width: 300, height: 120)
      .position(x: w * 0.6, y: h + 22)
    KWrenBird(c.look, size: 112)
      .position(x: w * 0.6, y: h - 60)
    Text(bubble)
      .font(.system(size: 15))
      .foregroundColor(Color(hex: "#1E1B35"))
      .padding(.horizontal, 12)
      .padding(.vertical, 8)
      .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Color.white))
      .position(x: 16 + 82, y: h - 30)
    Text("YOUR COURIER")
      .kText(.mono(11, .bold, tracking: 0.16))
      .foregroundStyle(palette(c.pal).chipText)
      .padding(.horizontal, 10)
      .padding(.vertical, 6)
      .background(RoundedRectangle(cornerRadius: 7, style: .circular).fill(palette(c.pal).chip))
      .offset(x: 12, y: 12)
    Text("DAY 12")
      .kText(.mono(10, .bold, tracking: 0.16))
      .foregroundStyle(night ? Color.white : Color(hex: "#1F5C33"))
      .padding(.horizontal, 10)
      .padding(.vertical, 6)
      .background(Capsule().fill(night ? Color.white.opacity(0.14) : Color.white.opacity(0.7)))
      .fixedSize()
      .position(x: w - 42, y: 25)
  }
  .frame(width: w, height: h, alignment: .topLeading)
  .clipped()
}

@MainActor func herBody(_ c: Case) -> some View {
  let p = planet(c)
  return VStack(alignment: .leading, spacing: 0) {
    KMeFlightLogBlock(log: p.log, cta: p.cta, palette: p.planet.palette, theme: .classic, live: false) {}
    Rectangle().fill(KTheme.classic.line).frame(height: 1).padding(.vertical, 12)
    KMeShelf(card: p, actions: KMePlanetActions(), theme: .classic)
  }
  .padding(.horizontal, 16)
  .padding(.top, 8)
  .padding(.bottom, 12)
}

/// A: her page's hero, small, on top of the log.
@MainActor func miniA(_ c: Case) -> some View {
  VStack(spacing: 0) {
    miniScene(c, bubble: "someone's out there…")
    herBody(c)
  }
  .background(Color.white)
  .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
  .kSoftLift(.classic, radius: 26)
  .frame(width: 370)
  .padding(.horizontal, 16)
  .padding(.top, 6)
  .padding(.bottom, 26)
  .background(Color.white)
}

/// B: no second sky: her on a small hill on the white card, what she says beside her.
@MainActor func miniB(_ c: Case) -> some View {
  VStack(alignment: .leading, spacing: 0) {
    HStack(alignment: .center, spacing: 14) {
      ZStack(alignment: .bottom) {
        Ellipse().fill(KTheme.classic.soft2).frame(width: 104, height: 30)
        KWrenBird(c.look, size: 88).offset(y: -10)
      }
      .frame(width: 108, height: 96)
      VStack(alignment: .leading, spacing: 6) {
        Text("PIP · DAY 12")
          .kText(.mono(9.5, .semibold, tracking: 0.14))
          .foregroundStyle(KTheme.classic.sub)
        Text("someone's out there…")
          .font(.system(size: 18))
          .foregroundColor(KTheme.classic.ink)
      }
      Spacer(minLength: 0)
    }
    .padding(.horizontal, 16)
    .padding(.top, 14)
    herBody(c)
  }
  .background(Color.white)
  .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
  .kSoftLift(.classic, radius: 26)
  .frame(width: 370)
  .padding(.horizontal, 16)
  .padding(.top, 6)
  .padding(.bottom, 26)
  .background(Color.white)
}

@MainActor func rest() -> some View {
  var fc = KMeFirstClass()
  fc.eyebrow = "FIRST CLASS"
  fc.headline = "More room for your people."
  fc.rows = ["Rooms that never close", "Pip's full wardrobe", "Voice letters"]
  fc.cta = "See First Class →"
  fc.stampLabel = "1ST"
  var onStamp = KWrenLook(skin: .sticker, stage: .wren, mood: .curious, accessory: .none)
  onStamp.letter = false
  fc.wren = onStamp
  var rep = KMeAura()
  rep.label = "REPORT"
  rep.title = "Your first writing report"
  rep.from = "READY TO READ"
  return VStack(spacing: 14) {
    HStack(alignment: .top, spacing: 14) {
      KMeAuraTile(aura: aura(), chip: "AURA", hint: "", onTap: {}) { art() }
      KMeAuraTile(aura: rep, chip: "REPORT", hint: "", onTap: {}) {
        HStack(spacing: 8) {
          ZStack {
            RoundedRectangle(cornerRadius: 11, style: .continuous).fill(KTheme.classic.ink.opacity(0.07))
            KLineIcon(.ruledCard, size: 24, lineWidth: 1.9, color: KTheme.classic.ink)
          }
          .frame(width: 44, height: 44)
          Spacer(minLength: 0)
        }
      }
    }
    .fixedSize(horizontal: false, vertical: true)
    KMeFirstClassCard(card: fc) {}
  }
  .frame(width: 370)
  .padding(.horizontal, 16)
  .padding(.bottom, 30)
  .background(Color.white)
}

@MainActor func save<V: View>(_ v: V, _ path: String) {
  let r = ImageRenderer(content: v.environment(\.colorScheme, .light))
  r.scale = 2
  guard let data = r.uiImage?.pngData() else { fatalError("no image: \(path)") }
  try! data.write(to: URL(fileURLWithPath: path))
}

@main
struct Shot {
  @MainActor static func main() {
    let dir = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "."
    for pal in ["day", "night"] {
      let c = Case(label: "", pal: pal, state: .out, rows: OUT_ROWS, done: 2)
      save(bannerScene(c), "\(dir)/scene-\(pal).png")
      save(planetPage(c), "\(dir)/page-\(pal).png")
      save(miniA(c), "\(dir)/mini-a-\(pal).png")
      save(miniB(c), "\(dir)/mini-b-\(pal).png")
    }
    save(rest(), "\(dir)/rest.png")
    print("wrote the banner mock's pieces to", dir)
  }
}
