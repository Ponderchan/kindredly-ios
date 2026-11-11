import SwiftUI
import UIKit

func palette(_ name: String) -> KCourierPalette {
  var p = KCourierPalette()
  switch name {
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
    break   // the struct's defaults are the night
  }
  return p
}

let IDS = ["off-chest", "crush", "cant-sleep", "ordinary", "growing", "miss-someone", "made-my-day", "tiny-win", "homesick", "a-song", "letting-go", "what-if"]
func letters(_ n: Int) -> [KPlanetLetter] {
  (0..<n).map { i in
    let reads = (i * 7 + 3) % 9
    let answered = i % 5 == 1 || i % 5 == 3 || i % 7 == 4
    return KPlanetLetter(id: "l\(i)", ordinal: n - i, stamp: IDS[i % IDS.count], reads: answered && reads == 0 ? 1 : reads, answered: answered, day: "NOV \(max(1, 9 - i * 2 > 0 ? 9 - i * 2 : 30 + (9 - i * 2)))")
  }
}

@MainActor func cell(_ kind: KPlanetKind, _ pal: String, n: Int, size: CGSize, zoom: CGFloat = 1, selected: String? = nil, prep: (KPlanetEngine, KPlanetContent) -> Void = { _, _ in }, label: String) -> some View {
  var content = KPlanetContent()
  content.palette = palette(pal)
  content.letters = letters(n)
  content.selected = selected
  content.wren = nil
  let engine = KPlanetEngine()
  engine.zoom = zoom
  // let the world run a few seconds: a page settles on its letter, the zoom arrives
  var t: TimeInterval = 1000
  engine.advance(to: t, kind: kind, content: content, size: size)
  prep(engine, content)
  for _ in 0..<240 { t += 1.0 / 60; engine.advance(to: t, kind: kind, content: content, size: size) }
  let now = t
  return VStack(alignment: .leading, spacing: 4) {
    Canvas { context, sz in
      var ctx = context
      KPlanetView.render(&ctx, engine: engine, kind: kind, content: content, size: sz, now: now)
    }
    .frame(width: size.width, height: size.height)
    .clipShape(RoundedRectangle(cornerRadius: 26))
    Text(label).font(.system(size: 11, weight: .semibold, design: .monospaced)).foregroundColor(Color(hex: "#55506E"))
  }
}

struct Sheet: View {
  let card = CGSize(width: 370, height: 200)
  let page = CGSize(width: 402, height: 380)
  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(alignment: .top, spacing: 14) {
        cell(.card, "day", n: 12, size: card, label: "card · day · 12 letters")
        cell(.card, "day", n: 12, size: card, prep: { e, _ in e.set(turn: KTurn.about(KVec(0, 1, 0), 2.2) * e.turn) }, label: "card · turned to the far side")
        cell(.card, "night", n: 40, size: card, label: "card · night · 40 letters")
      }
      HStack(alignment: .top, spacing: 14) {
        cell(.card, "evening", n: 1, size: card, label: "card · evening · first letter")
        cell(.card, "day", n: 0, size: card, label: "card · nothing sent")
        cell(.card, "day", n: 12, size: card, prep: { e, c in
          let lay = KPlanetLayout.make(.card, size: CGSize(width: 370, height: 200), zoom: 1)
          e.touchDown(CGPoint(x: 150, y: 130), layout: lay)
          for i in 1...10 { e.touchMove(CGPoint(x: 150 + CGFloat(i) * 9, y: 130 - CGFloat(i) * 2), layout: lay, now: 1000 + Double(i) * 0.016) }
          e.touchUp(now: 1000.17)
        }, label: "card · thrown, then left to stop")
      }
      HStack(alignment: .top, spacing: 14) {
        cell(.page, "day", n: 12, size: page, selected: "l3", label: "page · settled on letter 4")
        cell(.page, "day", n: 12, size: page, zoom: 1.9, selected: "l3", label: "page · zoomed in: days shown")
        cell(.page, "night", n: 12, size: page, selected: "l1", label: "page · night · letter 2 on show")
      }
    }
    .padding(16)
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
