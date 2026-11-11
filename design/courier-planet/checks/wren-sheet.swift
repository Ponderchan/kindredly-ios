import SwiftUI
import UIKit

/* Her motion, checked by running the world to chosen moments and rendering each.
   design/courier-planet/checks/render.sh wren-sheet.swift out.png */

func palette(_ name: String) -> KCourierPalette {
  var p = KCourierPalette()
  if name == "day" {
    p.text = Color(hex: "#1E1B35"); p.scrim = Color(hex: "#ADDBB5"); p.button = Color(hex: "#1F5C33"); p.buttonText = .white
    p.sky0 = Color(hex: "#BFE3F8"); p.sky1 = Color(hex: "#E3F3FB"); p.sea = Color(hex: "#6FB6E8"); p.land = Color(hex: "#9CD48C")
    p.forest = Color(hex: "#3F8F52"); p.rock = Color(hex: "#8E9AA6"); p.ink = Color(hex: "#1F5C33"); p.chip = Color(hex: "#1F5C33"); p.chipText = .white
    p.sun = Color(hex: "#FFD54A"); p.sunAt = CGPoint(x: 0.82, y: 0.16); p.moon = false; p.stars = false; p.lit = false; p.cloud = .white
  }
  return p
}

let IDS = ["off-chest", "crush", "cant-sleep", "ordinary", "growing", "miss-someone", "made-my-day", "tiny-win", "homesick", "a-song", "letting-go", "what-if"]
func letters(_ n: Int) -> [KPlanetLetter] {
  (0..<n).map { i in KPlanetLetter(id: "l\(i)", ordinal: n - i, stamp: IDS[i % IDS.count], reads: (i * 7 + 3) % 9, answered: i % 5 == 1, day: "NOV \(i + 1)") }
}

struct Run {
  var label: String
  var until: Double
  var state: (Int) -> KPlanetWrenState
  var look = KWrenLook()
  var napping = true
  var pal = "day"
  var n = 12
  var events: (Int, KPlanetEngine, KPlanetLayout) -> Void = { _, _, _ in }
}

let SIZE = CGSize(width: 370, height: 200)

/// a slow drag across the planet between two steps
func drag(_ i: Int, _ e: KPlanetEngine, _ lay: KPlanetLayout, from a: Int, to b: Int, x0: CGFloat, x1: CGFloat, y: CGFloat = 130) {
  if i == a { e.touchDown(CGPoint(x: x0, y: y), layout: lay) }
  if i > a, i <= b {
    let k = CGFloat(i - a) / CGFloat(b - a)
    e.touchMove(CGPoint(x: x0 + (x1 - x0) * k, y: y), layout: lay, now: 1000 + Double(i) / 60)
  }
  if i == b { e.touchUp(now: 1000 + Double(i) / 60) }
}

@MainActor func cell(_ r: Run) -> some View {
  let engine = KPlanetEngine()
  var content = KPlanetContent()
  content.palette = palette(r.pal)
  content.letters = letters(r.n)
  var who = KPlanetWren()
  who.look = r.look
  who.napping = r.napping
  let steps = Int(r.until * 60)
  let layout = KPlanetLayout.make(.card, size: SIZE, zoom: 1)
  who.state = r.state(0)
  content.wren = who
  engine.advance(to: 1000, kind: .card, content: content, size: SIZE)
  if steps > 0 {
    for i in 1...steps {
      who.state = r.state(i)
      content.wren = who
      r.events(i, engine, layout)
      engine.advance(to: 1000 + Double(i) / 60, kind: .card, content: content, size: SIZE)
    }
  }
  let final = content
  let now = 1000 + Double(steps) / 60
  return VStack(alignment: .leading, spacing: 3) {
    Canvas { context, sz in
      var ctx = context
      KPlanetView.render(&ctx, engine: engine, kind: .card, content: final, size: sz, now: now)
    }
    .frame(width: SIZE.width, height: SIZE.height)
    .clipShape(RoundedRectangle(cornerRadius: 22))
    Text(r.label).font(.system(size: 10.5, weight: .semibold, design: .monospaced)).foregroundColor(Color(hex: "#55506E"))
  }
}

func moss() -> KWrenLook { KWrenLook(skin: .moss, accessory: .beanie) }

struct Sheet: View {
  var rows: [[Run]] {
    let home: (Int) -> KPlanetWrenState = { _ in .home }
    let out: (Int) -> KPlanetWrenState = { _ in .out }
    let wait: (Int) -> KPlanetWrenState = { _ in .waiting }
    let off: (Int) -> KPlanetWrenState = { _ in .dayOff }
    let back: (Int) -> KPlanetWrenState = { i in i < 2 ? .out : .back }
    let slow: (Int, KPlanetEngine, KPlanetLayout) -> Void = { i, e, l in drag(i, e, l, from: 60, to: 180, x0: 120, x1: 250) }
    let flick: (Int, KPlanetEngine, KPlanetLayout) -> Void = { i, e, l in drag(i, e, l, from: 60, to: 66, x0: 110, x1: 290) }
    let sweep: (Int, KPlanetEngine, KPlanetLayout) -> Void = { i, e, l in drag(i, e, l, from: 60, to: 84, x0: 90, x1: 300) }
    return [
      [Run(label: "home · asleep", until: 3, state: home),
       Run(label: "home · slow turn, 1.0 s in: running", until: 2.0, state: home, events: slow),
       Run(label: "home · the turn ended 1.5 s ago", until: 4.5, state: home, events: slow),
       Run(label: "home · 6 s after: asleep again", until: 9, state: home, events: slow)],
      [Run(label: "home · flicked, 0.25 s after", until: 1.35, state: home, events: flick),
       Run(label: "home · flicked, 0.9 s after: up", until: 2.0, state: home, events: flick),
       Run(label: "home · flicked, 3 s after: landed", until: 4.1, state: home, events: flick),
       Run(label: "home · tapped 0.2 s ago", until: 3.2, state: home, events: { i, e, _ in if i == 180 { e.wrenTapped() } })],
      [Run(label: "on the way · 1 s", until: 1, state: out),
       Run(label: "on the way · 4 s", until: 4, state: out),
       Run(label: "on the way · 7 s: behind the planet", until: 7.4, state: out),
       Run(label: "on the way · swept by a turn", until: 1.3, state: out, events: sweep)],
      [Run(label: "waiting · on the right shoulder", until: 3, state: wait),
       Run(label: "waiting · glancing back (5.5 s)", until: 15.5, state: wait),
       Run(label: "back · flying in (0.3 s)", until: 0.33, state: back),
       Run(label: "back · landed, hopping (1.6 s)", until: 1.6, state: back)],
      [Run(label: "back · 8 s: the letter beside her", until: 8, state: back),
       Run(label: "day off · gates and a trail (3 s)", until: 3, state: off),
       Run(label: "day off · night", until: 5, state: off, pal: "night"),
       Run(label: "moss + beanie · empty bag, awake", until: 3, state: home, look: moss(), napping: false, n: 0)],
      [Run(label: "hatchling at home", until: 3, state: home, look: KWrenLook(stage: .hatch)),
       Run(label: "fledgling on the way", until: 4, state: out, look: KWrenLook(stage: .fledge)),
       Run(label: "an egg: nothing flies yet", until: 3, state: out, look: KWrenLook(stage: .egg), n: 0),
       Run(label: "night · waiting · scarf", until: 3, state: wait, look: KWrenLook(skin: .peach, accessory: .scarf), pal: "night")],
    ]
  }
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      ForEach(0..<rows.count, id: \.self) { r in
        HStack(alignment: .top, spacing: 12) {
          ForEach(0..<rows[r].count, id: \.self) { c in cell(rows[r][c]) }
        }
      }
    }
    .padding(14)
    .background(Color.white)
  }
}

@main
struct Main {
  @MainActor static func main() {
    let r = ImageRenderer(content: Sheet())
    r.scale = 2
    guard let img = r.uiImage, let data = img.pngData() else { print("render failed"); exit(1) }
    try! data.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
    print("wrote", img.size)
  }
}
