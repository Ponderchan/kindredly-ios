import SwiftUI
import UIKit
#if canImport(KPortable)
@testable import KPortable
#endif

/* THE COVER IDEA (owner, 2026-11-11 night: "me tab 的结构就改成和我老产品一模一样的"): the pieces the
   prototype in design/courier-planet/cover-prototype is put together from — the planet's scene
   as a cover (a smaller planet, with plain sky above and below it to stretch into), the planet
   page a pull-down opens, her card as a miniature of her own page (round one: a fixed sky, or on
   white; round two: her hill, an ink perch, her badge, her journey; round three, what the owner
   took: the badge's head with her standing on her mound, and her journey while she grows —
   miniCombo), the cover's two ways in as small pictures (two real stamps, a red postbox), and,
   round four ("writing aura 和 writing report 两块好好设计一下 … 得有一个初始状态"), the two tiles
   about your writing as a pair with every state they have (auraTileV2, reportTileV2). Not built
   in the app.
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
  var p = planet(c)
  p.planet.palette.sunAt = CGPoint(x: 0.86, y: 0.46)
  return VStack(spacing: 0) {
    p.planet.palette.sky0.frame(width: 402, height: 300)
    KPlanetView(kind: .card, content: p.planet, probe: KPlanetProbe())
      .frame(width: 402, height: 176)
    p.planet.palette.sky1.frame(width: 402, height: 360)
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

// ── round two: her card four more ways, none of them a sky, none changing with the hour ──
let SCENE_FILE = "/Users/redbeardlord/Desktop/claude-projects/kindredly-ios/assets/aura-scenes/01-quiet-observer.webp"
let INK2 = Color(hex: "#1E1B35")
let SOFT2 = KTheme.classic.soft2
let SUB2 = KTheme.classic.sub

@MainActor func herCard<Top: View>(_ c: Case, @ViewBuilder top: () -> Top) -> some View {
  VStack(spacing: 0) {
    top()
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

/// what she says, in a bubble with a tail toward her
@MainActor func saying(_ text: String, fill: Color = SOFT2) -> some View {
  Text(text)
    .font(.system(size: 17))
    .foregroundColor(INK2)
    .padding(.horizontal, 13)
    .padding(.vertical, 9)
    .fixedSize()
    .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(fill))
    .background(alignment: .leading) {
      Path { p in
        p.move(to: CGPoint(x: 0, y: 6)); p.addLine(to: CGPoint(x: -8, y: 12)); p.addLine(to: CGPoint(x: 0, y: 18)); p.closeSubpath()
      }
      .fill(fill)
      .frame(width: 1, height: 24)
    }
}

@MainActor func tag(_ text: String) -> some View {
  Text(text)
    .kText(.mono(9.5, .semibold, tracking: 0.14))
    .foregroundStyle(INK2)
    .padding(.horizontal, 8)
    .padding(.vertical, 5)
    .background(RoundedRectangle(cornerRadius: 7, style: .continuous).fill(SOFT2))
}

/// 1 — on white, on a perch drawn in ink (the Aura tile's own kind of drawing); only she is coloured
@MainActor func miniPerch(_ c: Case) -> some View {
  herCard(c) {
    HStack(alignment: .center, spacing: 10) {
      ZStack(alignment: .bottom) {
        Canvas { ctx, size in
          let y = size.height - 16
          var branch = Path()
          branch.move(to: CGPoint(x: 2, y: y + 2))
          branch.addQuadCurve(to: CGPoint(x: size.width - 2, y: y - 6), control: CGPoint(x: size.width * 0.5, y: y + 9))
          ctx.stroke(branch, with: .color(INK2), style: StrokeStyle(lineWidth: 2.6, lineCap: .round))
          var twig = Path()
          twig.move(to: CGPoint(x: size.width - 26, y: y - 3))
          twig.addQuadCurve(to: CGPoint(x: size.width - 10, y: y - 22), control: CGPoint(x: size.width - 14, y: y - 8))
          ctx.stroke(twig, with: .color(INK2), style: StrokeStyle(lineWidth: 2, lineCap: .round))
          var leaf = Path()
          leaf.move(to: CGPoint(x: size.width - 10, y: y - 22))
          leaf.addQuadCurve(to: CGPoint(x: size.width - 2, y: y - 34), control: CGPoint(x: size.width - 14, y: y - 32))
          leaf.addQuadCurve(to: CGPoint(x: size.width - 10, y: y - 22), control: CGPoint(x: size.width + 2, y: y - 24))
          ctx.stroke(leaf, with: .color(INK2), style: StrokeStyle(lineWidth: 1.8, lineCap: .round, lineJoin: .round))
        }
        KWrenBird(c.look, size: 104).offset(x: -10, y: -17)
      }
      .frame(width: 128, height: 122)
      VStack(alignment: .leading, spacing: 9) {
        Text("PIP · DAY 12")
          .kText(.mono(9.5, .semibold, tracking: 0.14))
          .foregroundStyle(SUB2)
        saying("someone's out there…")
      }
      Spacer(minLength: 0)
    }
    .padding(.horizontal, 14)
    .padding(.top, 12)
  }
}

/// 2 — her badge: the Post's courier, her picture, her name, how long
@MainActor func miniBadge(_ c: Case) -> some View {
  herCard(c) {
    VStack(spacing: 0) {
      Capsule().fill(SOFT2).frame(width: 42, height: 8).padding(.top, 11)
      HStack(alignment: .center, spacing: 14) {
        ZStack(alignment: .bottom) {
          RoundedRectangle(cornerRadius: 16, style: .continuous).fill(SOFT2)
          KWrenBird(c.look, size: 84).offset(x: 5, y: 4)
        }
        .frame(width: 98, height: 106)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        VStack(alignment: .leading, spacing: 0) {
          Text("KINDREDLY POST")
            .kText(.mono(8.5, .semibold, tracking: 0.18))
            .foregroundStyle(SUB2)
          Text("Pip")
            .font(.system(size: 28, weight: .bold))
            .foregroundColor(INK2)
            .padding(.top, 3)
          Text("YOUR COURIER")
            .kText(.mono(10, .bold, tracking: 0.16))
            .foregroundStyle(Color(hex: "#1F5C33"))
            .padding(.top, 5)
          HStack(spacing: 6) {
            tag("DAY 12")
            tag("GROWN")
          }
          .padding(.top, 9)
        }
        Spacer(minLength: 0)
      }
      .padding(.horizontal, 16)
      .padding(.top, 8)
    }
  }
}

/// 3 — her own hill, in her green, the same at any hour
@MainActor func miniHill(_ c: Case) -> some View {
  let w: CGFloat = 370
  let h: CGFloat = 138
  return herCard(c) {
    ZStack(alignment: .topLeading) {
      Color(hex: "#F1F8ED").frame(width: w, height: h)
      Ellipse().fill(Color(hex: "#E1F0DA")).frame(width: 300, height: 150).position(x: w * 0.1, y: h + 34)
      Ellipse().fill(Color(hex: "#CFE7C4")).frame(width: 400, height: 170).position(x: w * 0.66, y: h + 44)
      KWrenBird(c.look, size: 108).position(x: w * 0.62, y: h - 60)
      saying("someone's out there…", fill: .white)
        .fixedSize()
        .position(x: 16 + 86, y: h - 30)
      Text("YOUR COURIER")
        .kText(.mono(11, .bold, tracking: 0.16))
        .foregroundStyle(Color.white)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(RoundedRectangle(cornerRadius: 7, style: .circular).fill(Color(hex: "#1F5C33")))
        .offset(x: 12, y: 12)
      Text("DAY 12")
        .kText(.mono(10, .bold, tracking: 0.16))
        .foregroundStyle(Color(hex: "#1F5C33"))
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Capsule().fill(Color.white.opacity(0.85)))
        .fixedSize()
        .position(x: w - 42, y: 25)
    }
    .frame(width: w, height: h, alignment: .topLeading)
    .clipped()
  }
}

/// 4 — her journey: where she is on the way from an egg, and what comes next
@MainActor func miniJourney(_ c: Case) -> some View {
  let now = 2 // fledge
  let stages: [(KWrenStage, String)] = [(.egg, "EGG"), (.hatch, "HATCH"), (.fledge, "FLEDGE"), (.wren, "GROWN")]
  var young = c
  young.look = KWrenLook(skin: .sticker, stage: .fledge)
  return herCard(young) {
    VStack(alignment: .leading, spacing: 12) {
      HStack(alignment: .center, spacing: 12) {
        ZStack(alignment: .bottom) {
          Ellipse().fill(SOFT2).frame(width: 96, height: 26)
          KWrenBird(young.look, size: 86).offset(y: -9)
        }
        .frame(width: 104, height: 92)
        VStack(alignment: .leading, spacing: 9) {
          Text("PIP · DAY 12")
            .kText(.mono(9.5, .semibold, tracking: 0.14))
            .foregroundStyle(SUB2)
          saying("someone's out there…")
        }
        Spacer(minLength: 0)
      }
      VStack(alignment: .leading, spacing: 8) {
        Text("PIP'S JOURNEY")
          .kText(.mono(8.5, .semibold, tracking: 0.18))
          .foregroundStyle(SUB2)
        HStack(alignment: .top, spacing: 0) {
          ForEach(Array(stages.enumerated()), id: \.offset) { i, st in
            VStack(spacing: 5) {
              ZStack {
                Circle().fill(i == now ? Color.white : SOFT2)
                if i == now { Circle().strokeBorder(Color(hex: "#1F5C33"), lineWidth: 2.2) }
                KWrenBird(KWrenLook(skin: .sticker, stage: st.0), size: 32).opacity(i > now ? 0.3 : 1)
              }
              .frame(width: 48, height: 48)
              Text(st.1)
                .kText(.mono(8.5, i == now ? .bold : .semibold, tracking: 0.12))
                .foregroundStyle(i == now ? INK2 : SUB2)
            }
            .frame(maxWidth: .infinity)
          }
        }
        .background(alignment: .top) {
          Rectangle().fill(KTheme.classic.line).frame(height: 1.5).padding(.horizontal, 44).offset(y: 23)
        }
        Text("NEXT · GROWN — FIRST KINDRED")
          .kText(.mono(9.5, .semibold, tracking: 0.12))
          .foregroundStyle(SUB2)
      }
    }
    .padding(.horizontal, 16)
    .padding(.top, 12)
  }
}

/// Round three (owner: the badge's head without KINDREDLY POST, her standing as the journey's
/// card has her, and her journey): her badge with her journey on it while she is still growing;
/// grown, the journey folds away and the badge says so.
@MainActor func miniCombo(_ c: Case, grown: Bool) -> some View {
  let now = 2 // fledge
  let stages: [(KWrenStage, String)] = [(.egg, "EGG"), (.hatch, "HATCH"), (.fledge, "FLEDGE"), (.wren, "GROWN")]
  var who = c
  who.look = KWrenLook(skin: .sticker, stage: grown ? .wren : .fledge)
  return herCard(who) {
    VStack(alignment: .leading, spacing: 0) {
      Capsule().fill(SOFT2).frame(width: 42, height: 8)
        .frame(maxWidth: .infinity)
        .padding(.top, 11)
      HStack(alignment: .center, spacing: 12) {
        ZStack(alignment: .bottom) {
          Ellipse().fill(SOFT2).frame(width: 100, height: 26)
          KWrenBird(who.look, size: 92).offset(y: -9)
        }
        .frame(width: 108, height: 98)
        VStack(alignment: .leading, spacing: 0) {
          Text("Pip")
            .font(.system(size: 28, weight: .bold))
            .foregroundColor(INK2)
          Text("YOUR COURIER")
            .kText(.mono(10, .bold, tracking: 0.16))
            .foregroundStyle(Color(hex: "#1F5C33"))
            .padding(.top, 4)
          HStack(spacing: 6) {
            tag("DAY 12")
            if grown { tag("GROWN") }
          }
          .padding(.top, 9)
        }
        Spacer(minLength: 0)
      }
      .padding(.top, 4)
      if !grown {
        VStack(alignment: .leading, spacing: 7) {
          Text("PIP'S JOURNEY")
            .kText(.mono(8.5, .semibold, tracking: 0.18))
            .foregroundStyle(SUB2)
          HStack(alignment: .top, spacing: 0) {
            ForEach(Array(stages.enumerated()), id: \.offset) { i, st in
              VStack(spacing: 4) {
                ZStack {
                  Circle().fill(i == now ? Color.white : SOFT2)
                  if i == now { Circle().strokeBorder(Color(hex: "#1F5C33"), lineWidth: 2.2) }
                  KWrenBird(KWrenLook(skin: .sticker, stage: st.0), size: 28).opacity(i > now ? 0.3 : 1)
                }
                .frame(width: 42, height: 42)
                Text(st.1)
                  .kText(.mono(8.5, i == now ? .bold : .semibold, tracking: 0.12))
                  .foregroundStyle(i == now ? INK2 : SUB2)
              }
              .frame(maxWidth: .infinity)
            }
          }
          .background(alignment: .top) {
            Rectangle().fill(KTheme.classic.line).frame(height: 1.5).padding(.horizontal, 44).offset(y: 20)
          }
          Text("NEXT · GROWN — FIRST KINDRED")
            .kText(.mono(9.5, .semibold, tracking: 0.12))
            .foregroundStyle(SUB2)
        }
        .padding(.top, 12)
      }
    }
    .padding(.horizontal, 16)
  }
}

// ── round four: the two tiles about your writing, as a pair, with every state they have ──
enum AuraStage { case none, some, forming, named }
enum ReportStage { case none, some, ready, done, locked }

@MainActor func tileShell<Art: View, Foot: View>(chip: String, title: String, @ViewBuilder art: () -> Art, @ViewBuilder foot: () -> Foot) -> some View {
  VStack(alignment: .leading, spacing: 0) {
    KMeTileChip(text: chip, fill: INK2, ink: .white)
    art()
      .frame(maxWidth: .infinity)
      .frame(height: 84)
      .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(SOFT2))
      .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
      .padding(.top, 10)
    Text(title)
      .kText(.system(15, .semibold, lineHeight: 19.0 / 15.0))
      .foregroundStyle(INK2)
      .lineLimit(2)
      .multilineTextAlignment(.leading)
      .fixedSize(horizontal: false, vertical: true)
      .frame(maxWidth: .infinity, minHeight: 38, alignment: .topLeading)
      .padding(.top, 10)
    foot()
      .frame(maxWidth: .infinity, minHeight: 28, alignment: .topLeading)
      .padding(.top, 6)
  }
  .padding(14)
  .frame(width: 178, alignment: .topLeading)
  .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(Color.white))
  .kSoftLift(.classic, radius: 24)
}

@MainActor func footLine(_ text: String, ink: Color = SUB2) -> some View {
  Text(text)
    .kText(.mono(9.5, .semibold, tracking: 0.1))
    .foregroundStyle(ink)
    .lineLimit(2)
    .multilineTextAlignment(.leading)
    .fixedSize(horizontal: false, vertical: true)
}

@MainActor func ticks(_ filled: Int, of total: Int, caption: String) -> some View {
  VStack(alignment: .leading, spacing: 6) {
    HStack(spacing: 4) {
      ForEach(0..<total, id: \.self) { i in
        Capsule().fill(i < filled ? INK2 : KTheme.classic.line).frame(width: 18, height: 4)
      }
    }
    footLine(caption)
  }
}

@MainActor func auraArtV2(_ stage: AuraStage) -> some View {
  var model = KAuraArtModel()
  model.desk.ground = SOFT2
  model.desk.lines = INK2
  switch stage {
  case .none:
    model.desk.fidelity = .lines
  case .some:
    model.desk.fidelity = .pencil
    model.desk.stroke = Color(hex: "#8A86A3")
  case .forming, .named:
    model.desk.fidelity = .sketch
    model.desk.stroke = INK2
    model.desk.window = .white
    model.desk.head = .white
    model.desk.body = .white
    model.desk.page = .white
    model.desk.sun = true
    model.desk.sunStroke = INK2
  }
  return ZStack {
    if stage == .named, let scene = UIImage(contentsOfFile: SCENE_FILE) {
      Image(uiImage: scene).resizable().aspectRatio(contentMode: .fill)
    } else {
      // the whole desk, never cropped: it sits in the panel at its own shape
      KAuraArt(theme: .classic, art: model, cover: false, ground: SOFT2)
        .frame(width: 150, height: 48)
    }
  }
}

@MainActor func auraTileV2(_ stage: AuraStage) -> some View {
  let title = stage == .named ? "The Quiet Observer" : "What your writing says about you"
  return tileShell(chip: "WRITING AURA", title: title) {
    auraArtV2(stage)
  } foot: {
    switch stage {
    case .none: ticks(0, of: 3, caption: "0 OF 3 LETTERS")
    case .some: ticks(4, of: 5, caption: "4 OF 5 LETTERS")
    case .forming: ticks(2, of: 3, caption: "2 OF 3 LABELS HELD")
    case .named: footLine("FROM 14 LETTERS")
    }
  }
}

/// the report as a thing: a card to punch until the first one, then a sheet
@MainActor func reportArtV2(_ stage: ReportStage) -> some View {
  ZStack {
    switch stage {
    case .none, .some:
      let have = stage == .some ? 4 : 0
      VStack(spacing: 7) {
        ForEach(0..<2, id: \.self) { r in
          HStack(spacing: 7) {
            ForEach(0..<5, id: \.self) { c in
              let i = r * 5 + c
              ZStack {
                if i < have {
                  Circle().fill(INK2)
                  KLineIcon(.check, size: 9, lineWidth: 3.2, color: .white)
                } else {
                  Circle().strokeBorder(Color(hex: "#C9C6D6"), style: StrokeStyle(lineWidth: 1.6, dash: [3, 3]))
                }
              }
              .frame(width: 18, height: 18)
            }
          }
        }
      }
    case .ready, .done, .locked:
      let quiet = stage != .ready
      ZStack {
        RoundedRectangle(cornerRadius: 7, style: .continuous).fill(Color.white)
          .frame(width: 58, height: 66)
          .shadow(color: INK2.opacity(0.10), radius: 3, x: 0, y: 2)
          .rotationEffect(.degrees(6))
          .offset(x: 9, y: 2)
        VStack(alignment: .leading, spacing: 5) {
          Text(stage == .ready ? "NO. 1" : "NOV")
            .kText(.mono(8.5, .bold, tracking: 0.12))
            .foregroundStyle(quiet ? SUB2 : INK2)
          Capsule().fill(quiet ? KTheme.classic.line : INK2).frame(width: 38, height: 4)
          Capsule().fill(KTheme.classic.line).frame(width: 26, height: 4)
          Capsule().fill(KTheme.classic.line).frame(width: 32, height: 4)
          Capsule().fill(KTheme.classic.line).frame(width: 20, height: 4)
        }
        .padding(9)
        .frame(width: 58, height: 66, alignment: .topLeading)
        .background(RoundedRectangle(cornerRadius: 7, style: .continuous).fill(Color.white))
        .shadow(color: INK2.opacity(0.14), radius: 4, x: 0, y: 3)
        .rotationEffect(.degrees(-4))
        .overlay(alignment: .bottomTrailing) {
          if stage == .done {
            ZStack { Circle().fill(Color(hex: "#2E7D4F")); KLineIcon(.check, size: 10, lineWidth: 3.2, color: .white) }
              .frame(width: 20, height: 20)
              .offset(x: 8, y: 6)
          } else if stage == .locked {
            ZStack { Circle().fill(KBrand.waxGold); KLineIcon(.lock, size: 10, lineWidth: 2.6, color: INK2) }
              .frame(width: 22, height: 22)
              .offset(x: 9, y: 7)
          }
        }
      }
    }
  }
}

@MainActor func reportTileV2(_ stage: ReportStage) -> some View {
  let title: String = {
    switch stage {
    case .none, .some: return "Your writing report"
    case .ready: return "Your first writing report"
    case .done: return "This month's report is read"
    case .locked: return "A monthly writing report"
    }
  }()
  return tileShell(chip: "WRITING REPORT", title: title) {
    reportArtV2(stage)
  } foot: {
    switch stage {
    case .none: footLine("0 OF 10 PIECES")
    case .some: footLine("4 OF 10 PIECES")
    case .ready:
      HStack(spacing: 6) {
        ZStack {
          Circle().fill(KPlanetBubble.lampGold.opacity(0.45)).frame(width: 14, height: 14)
          Circle().fill(KPlanetBubble.lampGold).frame(width: 8, height: 8)
            .overlay(Circle().strokeBorder(INK2.opacity(0.3), lineWidth: 1))
        }
        .frame(width: 12, height: 12)
        footLine("READY TO READ", ink: INK2)
      }
    case .done: footLine("THE NEXT ONE COMES IN DECEMBER")
    case .locked: footLine("ONE EVERY MONTH WITH FIRST CLASS")
    }
  }
}

@MainActor func restV2(_ aura: AuraStage, _ report: ReportStage) -> some View {
  var fc = KMeFirstClass()
  fc.eyebrow = "FIRST CLASS"
  fc.headline = "More room for your people."
  fc.rows = ["Rooms that never close", "Pip's full wardrobe", "Voice letters"]
  fc.cta = "See First Class →"
  fc.stampLabel = "1ST"
  var onStamp = KWrenLook(skin: .sticker, stage: .wren, mood: .curious, accessory: .none)
  onStamp.letter = false
  fc.wren = onStamp
  return VStack(spacing: 14) {
    HStack(alignment: .top, spacing: 14) {
      auraTileV2(aura)
      reportTileV2(report)
    }
    .fixedSize(horizontal: false, vertical: true)
    KMeFirstClassCard(card: fc) {}
  }
  .frame(width: 370)
  .padding(.horizontal, 16)
  .padding(.bottom, 30)
  .background(Color.white)
}

// ── the cover's two ways in: small pictures of the things themselves ──
@MainActor func iconStamps() -> some View {
  ZStack(alignment: .leading) {
    KStamp(id: "cant-sleep", width: 15, dark: false, fallbackHex: nil).rotationEffect(.degrees(9)).offset(x: 10, y: 1)
    KStamp(id: "tiny-win", width: 15, dark: false, fallbackHex: nil).rotationEffect(.degrees(-9)).offset(x: 1)
  }
  .frame(width: 28, height: 24, alignment: .leading)
}

@MainActor func iconMailbox() -> some View {
  Canvas { ctx, size in
    let roof = Color(hex: "#D2574A"), body = Color(hex: "#E46A5A")
    ctx.fill(Path(roundedRect: CGRect(x: 3, y: 6, width: 16, height: 14), cornerRadius: 1.5), with: .color(body))
    var dome = Path()
    dome.move(to: CGPoint(x: 1.5, y: 8.5))
    dome.addQuadCurve(to: CGPoint(x: 20.5, y: 8.5), control: CGPoint(x: 11, y: -4.5))
    dome.closeSubpath()
    ctx.fill(dome, with: .color(roof))
    ctx.fill(Path(roundedRect: CGRect(x: 6, y: 10.5, width: 10, height: 2.6), cornerRadius: 1.3), with: .color(INK2))
    ctx.fill(Path(roundedRect: CGRect(x: 7, y: 14.6, width: 8, height: 3.2), cornerRadius: 1), with: .color(.white.opacity(0.92)))
    ctx.fill(Path(roundedRect: CGRect(x: 1.5, y: 19.5, width: 19, height: 3), cornerRadius: 1.5), with: .color(roof))
  }
  .frame(width: 22, height: 24)
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
    let d = Case(label: "", pal: "day", state: .out, rows: OUT_ROWS, done: 2)
    save(miniPerch(d), "\(dir)/mini-perch.png")
    save(miniBadge(d), "\(dir)/mini-badge.png")
    save(miniHill(d), "\(dir)/mini-hill.png")
    save(miniJourney(d), "\(dir)/mini-journey.png")
    save(iconStamps(), "\(dir)/ic-stamps.png")
    save(iconMailbox(), "\(dir)/ic-mailbox.png")
    save(miniCombo(d, grown: false), "\(dir)/mini-combo.png")
    save(miniCombo(d, grown: true), "\(dir)/mini-grown.png")
    save(restV2(.none, .none), "\(dir)/rest-new.png")
    save(restV2(.some, .some), "\(dir)/rest-some.png")
    save(restV2(.forming, .some), "\(dir)/rest-forming.png")
    save(restV2(.named, .ready), "\(dir)/rest-ready.png")
    save(restV2(.named, .done), "\(dir)/rest-done.png")
    save(restV2(.named, .locked), "\(dir)/rest-locked.png")
    save(rest(), "\(dir)/rest.png")
    print("wrote the banner mock's pieces to", dir)
  }
}
