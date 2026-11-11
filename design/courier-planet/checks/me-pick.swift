import SwiftUI
import UIKit
#if canImport(KPortable)
@testable import KPortable
#endif

/* Me, one phone per choice, for the owner's picker page (2026-11-11: "me 页面 看不清 啊 还没选呢"):
   her card as built (A) or as one white body (B) x three colour schemes x day / evening / night
   x the five days of First Class. Writes <out dir>/<A|B>-<1|2|3>-<hour>-<day>.png, 402pt wide at 2x.
   design/courier-planet/checks/render-fast.sh me-pick.swift <out dir>

   The rest of this header is me-by-day.swift's.
   Me, the whole page, by the day — how the page is arranged for a reader on day 1, day 3, after
   seven days of writing, from day 30, and for a member (owner, 2026-11-11: "你整体画一下 看看现有
   方案怎么排列最好 对用户来说 还有要结合我们的 firstclass 的以天为基数的现实策略").
   The arrangement drawn: her card (the one-white-body variant) always first; Aura and Stamps side
   by side; the report row; First Class arriving by the day as lib/fc-rollout-core decides —
   nothing on days 1–2, the Post's letter on her card from day 3, the boarding pass over her card
   after a seven-day streak, the sealed report taking the report row's own place from day 30 with
   the pull-tab on the edge, and one quiet First Class card at the foot from day 3 that steps aside
   whenever a large First Class form is on the page. The tiles take the hour's tint.
   design/courier-planet/checks/render.sh me-by-day.swift out.png */

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

func art(night: Bool = false) -> some View {
  let ground: Color = night ? Color(hex: "#2B2660") : .white
  let stroke: Color = night ? .white : Color(hex: "#1E1B35")
  var model = KAuraArtModel()
  model.desk.fidelity = .sketch
  model.desk.ground = ground
  model.desk.stroke = stroke
  model.desk.sun = true
  model.desk.sunStroke = stroke
  return KAuraArt(theme: .classic, art: model, cover: true, ground: ground)
}


/// The alternative: sky on top, one white body under it.
struct CardB: View {
  let card: KMePlanet
  let theme: KTheme
  @State private var probe = KPlanetProbe()
  @Environment(\.kLetterFace) private var face

  var body: some View {
    let palette = card.planet.palette
    let night = palette.moon
    let accent: Color = night ? theme.ind : palette.button
    VStack(spacing: 0) {
      ZStack(alignment: .topLeading) {
        KPlanetView(kind: .card, content: card.planet, probe: probe)
        Text(card.chip)
          .kText(.mono(11, .bold, tracking: 0.16))
          .foregroundStyle(palette.chipText)
          .padding(.horizontal, 10)
          .padding(.vertical, 6)
          .background(RoundedRectangle(cornerRadius: 7, style: .circular).fill(palette.chip))
          .offset(x: 12, y: 12)
        Text(card.hint)
          .kText(.mono(9.5, .semibold, tracking: 0.14))
          .foregroundStyle(palette.ink)
          .opacity(0.6)
          .offset(x: 14, y: 44)
        ZStack {
          Circle().fill(Color.white.opacity(0.72))
          KLineIcon(.globe, size: 18, lineWidth: 1.9, color: KBrand.inkOnBrand)
        }
        .frame(width: 34, height: 34)
        .frame(maxWidth: .infinity, alignment: .topTrailing)
        .padding(.trailing, 12)
        .padding(.top, 10)
      }
      .frame(height: 200)
      // the body's tail: it points up at her, wherever she is
      .overlay(alignment: .bottom) {
        Canvas { context, size in
          let x = min(max(probe.wrenX, 40), size.width - 40)
          var tail = Path()
          tail.move(to: CGPoint(x: x - 9, y: size.height + 0.5))
          tail.addLine(to: CGPoint(x: x, y: 0))
          tail.addLine(to: CGPoint(x: x + 9, y: size.height + 0.5))
          tail.closeSubpath()
          context.fill(tail, with: .color(theme.sf))
        }
        .frame(height: 8)
      }
      VStack(alignment: .leading, spacing: 0) {
        HStack(alignment: .firstTextBaseline, spacing: 0) {
          Text(card.name.uppercased())
          if !card.time.isEmpty {
            Text(verbatim: " · ")
            Text(card.time)
          }
        }
        .kText(.mono(9.5, .semibold, tracking: 0.14))
        .foregroundStyle(theme.sub)
        Text(card.line)
          .kText(.content(face.fitSize(14), lineHeight: 18.0 / 14.0))
          .foregroundStyle(theme.ink)
          .lineLimit(3)
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: .infinity, minHeight: 36, alignment: .topLeading)
          .padding(.top, 2)
        HStack(alignment: .center, spacing: 10) {
          Text(card.aside)
            .kText(.content(face.fitSize(12.5), italic: true))
            .foregroundStyle(theme.sub)
            .lineLimit(2)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
          Text(card.cta)
            .kText(.system(13.5, .semibold))
            .foregroundStyle(night ? theme.bg : palette.buttonText)
            .padding(.horizontal, 15)
            .frame(minHeight: 30)
            .background(Capsule().fill(night ? theme.ink : palette.button))
        }
        Rectangle().fill(theme.line).frame(height: 1).padding(.top, 12).padding(.bottom, 12)
        HStack(alignment: .top, spacing: 10) {
          ForEach(card.shelf) { item in
            VStack(spacing: 5) {
              ZStack {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                  .fill(item.firstClass ? KMePlanetMetrics.chipPaper : theme.soft2)
                if item.firstClass {
                  RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .strokeBorder(KBrand.waxGold, style: StrokeStyle(lineWidth: 2, dash: [5, 4]))
                }
                KWrenBird(item.look, size: 42).opacity(item.dim ? 0.45 : 1)
              }
              .frame(width: 52, height: 52)
              .overlay {
                if item.worn {
                  RoundedRectangle(cornerRadius: 18.5, style: .continuous).strokeBorder(accent, lineWidth: 2.5).padding(-2.5)
                }
              }
              .overlay(alignment: .topLeading) {
                if item.worn { badge(KMePlanetMetrics.tick, .check).offset(x: -5, y: -5) }
              }
              .overlay(alignment: .topTrailing) {
                if item.firstClass { badge(KBrand.waxGold, .lock).offset(x: 5, y: -5) }
              }
              Text(item.name)
                .kText(.mono(7.5, .semibold, tracking: 0.08))
                .foregroundStyle(theme.sub)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .frame(width: 62)
            }
            .frame(width: 52)
          }
          Spacer(minLength: 4)
          Text(card.allLooks)
            .kText(.system(12.5, .semibold))
            .foregroundStyle(accent)
            .lineLimit(1)
            .fixedSize()
            .padding(.top, 18)
        }
      }
      .padding(.horizontal, 16)
      .padding(.top, 10)
      .padding(.bottom, 14)
    }
    .background(theme.sf)
    .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
    .overlay(RoundedRectangle(cornerRadius: 26, style: .continuous).strokeBorder(theme.line, lineWidth: 1))
  }

  private func badge(_ fill: Color, _ glyph: KLineGlyph) -> some View {
    ZStack {
      Circle().fill(Color.white)
      Circle().fill(fill).padding(2)
      KLineIcon(glyph, size: 9, lineWidth: 3, color: .white)
    }
    .frame(width: 21, height: 21)
  }
}


func rgb(_ hex: String) -> (Double, Double, Double) {
  let v = UInt32(hex.dropFirst(), radix: 16) ?? 0
  return (Double((v >> 16) & 0xFF) / 255, Double((v >> 8) & 0xFF) / 255, Double(v & 0xFF) / 255)
}
/// `a` mixed toward `b` by `t`
func mix(_ a: String, _ b: String, _ t: Double) -> Color {
  let x = rgb(a), y = rgb(b)
  return Color(.sRGB, red: x.0 + (y.0 - x.0) * t, green: x.1 + (y.1 - x.1) * t, blue: x.2 + (y.2 - x.2) * t, opacity: 1)
}

struct Scheme {
  var name: String
  var aura: (String) -> KMeTileTone
  var stamps: (String) -> KMeTileTone
  var report: (String) -> KMeTileTone
}

let INK = Color(hex: "#1E1B35")
let SKY0 = ["morning": "#FBE3D6", "day": "#BFE3F8", "evening": "#F6C39A", "night": "#2E2A6B"]
let CHIP = ["morning": "#2D5B3A", "day": "#1F5C33", "evening": "#4A2F3F", "night": "#FFFFFF"]

func withSky(_ hour: String, lighter: Double) -> KMeTileTone {
  if hour == "night" {
    var t = KMeTileTone(fill: Color(hex: "#2B2660"), chip: .white, chipText: INK, ink: .white, sub: Color.white.opacity(0.72))
    t.multiply = false
    return t
  }
  return KMeTileTone(fill: mix(SKY0[hour]!, "#FFFFFF", lighter), chip: Color(hex: CHIP[hour]!))
}

let SCHEMES: [Scheme] = [
  Scheme(name: "1 · 各一种颜色(现在的):Aura 桃 / Stamps 蓝 / 报告 绿", aura: { _ in .aura }, stamps: { _ in .stamps }, report: { _ in .report }),
  Scheme(
    name: "2 · 安静:只有天空有颜色,下面全是中性灰,标签用墨色",
    aura: { _ in KMeTileTone(fill: Color(hex: "#F1F0EE"), chip: INK) },
    stamps: { _ in KMeTileTone(fill: Color(hex: "#F1F0EE"), chip: INK) },
    report: { _ in KMeTileTone(fill: Color(hex: "#F1F0EE"), chip: Color(hex: "#2E7D4F")) }
  ),
  Scheme(
    name: "3 · 跟着天色:下面几格取当时天空的颜色,整页随时间一起变",
    aura: { withSky($0, lighter: 0.45) },
    stamps: { withSky($0, lighter: 0.45) },
    report: { withSky($0, lighter: 0.6) }
  ),
]

func meContent(_ c: Case) -> KMeContent {
  var m = KMeContent()
  m.settingsLabel = "Settings"
  m.profile.name = "Sunday Kite"
  m.profile.joined = "joined Jul 27"
  m.profile.stats = [
    KMeStat(key: "letters", count: "14", unit: "letters", a11yLabel: "", hint: ""),
    KMeStat(key: "kindreds", count: "2", unit: "kindreds", a11yLabel: "", hint: ""),
  ]
  m.planet = planet(c)
  return m
}

func firstClass(_ c: Case) -> KMeFirstClass {
  var f = KMeFirstClass()
  f.eyebrow = "FIRST CLASS"
  f.headline = "More room for your people."
  f.rows = ["Rooms that never close", "Pip's full wardrobe", "Voice letters"]
  f.cta = "See First Class →"
  f.stampLabel = "1ST"
  f.wren = KWrenLook(skin: c.look.skin, stage: .wren, mood: .curious, accessory: c.look.accessory)
  return f
}


struct Day {
  var title: String
  var note: String
  var pal = "day"
  var form = "none"      // none | invite | seat | report
  var tab = false
  var bottom = false     // the quiet First Class card at the foot
  var member = false
  var state: KPlanetWrenState = .out
  var line = "your letter's out. no one has written back yet"
  var aside = "i'll bring it the second someone does"
  var reportTitle = "Your writing report"
  var reportSub = "The first one comes at 10 pieces · 4 so far"
  var reportOpens = false
  var worn = ""
  var look = KWrenLook()
}

func rollout(_ d: Day) -> KMeFcRollout {
  var f = KMeFcRollout()
  f.form = d.form
  f.tab = d.tab
  f.firstClass = "First Class"
  f.post = "THE POST"
  f.seatTimer = "YOUR WEEK · 48H"
  f.seatHead = "7 days in a row. you've earned a seat."
  f.seatPerks = "Voice letters · wardrobe · all stamps"
  f.open = "Open"
  f.reportEyebrow = "YOUR OCTOBER REPORT"
  f.reportSealed = "SEALED"
  f.reportHead = "What 31 days of your letters add up to."
  f.reportCta = "Break the seal"
  return f
}

let PICK_DAYS: [(String, Day)] = [
  ("d1", Day(title: "", note: "")),
  ("d3", Day(title: "", note: "", form: "invite", bottom: true, state: .home, line: "the Post asked me to bring you a letter. it's on your sill", aside: "gold edges. fancy")),
  ("d7", Day(title: "", note: "", form: "seat", state: .waiting, line: "it's on someone's desk", aside: "they're reading. i'm staying put", worn: "dress:beanie", look: KWrenLook(skin: .sticker, accessory: .beanie))),
  ("d30", Day(title: "", note: "", form: "report", state: .back, line: "BACK. someone wrote you and i flew it here in one go", aside: "it's on your desk. read it read it read it")),
  ("fc", Day(title: "", note: "", member: true, state: .home, line: "home. nothing in the bag", aside: "write one and i'll take it",
             reportTitle: "This month's writing report", reportSub: "Ready to read", reportOpens: true, worn: "skin:peach", look: KWrenLook(skin: .peach))),
]

@MainActor func phone(body: String, scheme: Scheme, hour: String, d: Day) -> some View {
  var c = Case(label: "", pal: hour, state: d.state, look: d.look, worn: d.worn, member: d.member, kindred: d.member)
  c.line = d.line
  c.aside = d.aside
  let content = meContent(c)
  let chrome = KScrollModel(offsetCap: 48, quantum: 0.5)
  let fc = rollout(d)
  var rep = KMeReport()
  rep.show = true
  rep.title = d.reportTitle
  rep.sub = d.reportSub
  rep.enabled = d.reportOpens
  let auraTone = scheme.aura(hour)
  return VStack(spacing: 0) {
    Color.clear.frame(height: 54)
    KMeHeader(theme: .classic, content: content, chrome: chrome, selection: .constant(0), actions: KMeActions(), onMetrics: { _ in }) {
      Circle().fill(Color(hex: "#CFE3F5"))
    }
    VStack(alignment: .leading, spacing: 12) {
      if d.form == "seat" { KFcBoardingPass(fc: fc) {} }
      if d.form == "report" { KFcSealedReport(fc: fc) {} }
      Group {
        if body == "A" {
          KMePlanetCard(card: planet(c), actions: KMePlanetActions())
        } else {
          CardB(card: planet(c), theme: .classic)
        }
      }
      .overlay(alignment: .topTrailing) {
        if d.form == "invite" {
          KFcEnvelope(fc: fc) {}.padding(.trailing, 58).offset(y: -12)
        }
      }
      HStack(alignment: .top, spacing: 12) {
        KMeAuraTile(aura: aura(), chip: "AURA", hint: "", tone: auraTone, onTap: {}) { art(night: !auraTone.multiply) }
        KMeStampsTile(tile: planet(c).stamps, tone: scheme.stamps(hour)) {}
      }
      .fixedSize(horizontal: false, vertical: true)
      if d.form != "report" {
        KMeReportRow(report: rep, tone: scheme.report(hour)) {}
      }
      if d.bottom { KMeFirstClassCard(card: firstClass(c)) {} }
    }
    .padding(.horizontal, 16)
    .padding(.top, 12)
    .fixedSize(horizontal: false, vertical: true)
    Spacer(minLength: 0)
  }
  .frame(width: 402, height: 1240, alignment: .top)
  .background(Color.white)
}

@main
struct Shot {
  @MainActor static func main() {
    let dir = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "."
    var n = 0
    for body in ["A", "B"] {
      for (i, scheme) in SCHEMES.enumerated() {
        for hour in ["day", "evening", "night"] {
          for (key, d) in PICK_DAYS {
            let renderer = ImageRenderer(content: phone(body: body, scheme: scheme, hour: hour, d: d).environment(\.colorScheme, .light))
            renderer.scale = 2
            guard let data = renderer.uiImage?.pngData() else { fatalError("no image") }
            try! data.write(to: URL(fileURLWithPath: "\(dir)/\(body)-\(i + 1)-\(hour)-\(key).png"))
            n += 1
          }
        }
      }
    }
    print("wrote", n, "phones to", dir)
  }
}
