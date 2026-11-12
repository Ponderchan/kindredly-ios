// Catch a line (the empty Kindreds tab, 2d): the drifting sky and an opened letter, light and dark.
//   design/courier-planet/checks/render-fast.sh design/kindreds-catch/catch-sheet.swift <out.png>
import SwiftUI
import UIKit
#if canImport(KPortable)
@testable import KPortable
#endif

func frost(_ i: Int, dark: Bool) -> KFrostSpec {
  let bases = dark ? ["#4A4478", "#3F5A55", "#5A4A3E", "#3F4A7A", "#57405A"] : ["#C9C2EC", "#BFDCD3", "#E6D2BF", "#B4BCEA", "#DCC4E0"]
  let lights = dark ? ["#3F4A7A", "#4A5A3E", "#5A3F4A", "#3E5A5A"] : ["#B4BCEA", "#C4D3B8", "#EAC0CC", "#B8DCDC"]
  return KFrostSpec(
    dark: dark,
    base: Color(hex: bases[i % bases.count]),
    lights: [
      .init(color: Color(hex: lights[i % lights.count]), x: 0.26, y: 0.32, r: 0.6643, alpha: 0.9),
      .init(color: Color(hex: lights[(i + 1) % lights.count]), x: 0.7, y: 0.78, r: 0.7214, alpha: 0.9),
    ],
    silhouetteAlpha: dark ? 0.13 : 0.22,
    head: .init(x: 0.5, y: 0.4, r: 0.235, solid: 0.62),
    shoulders: .init(x: 0.5, y: 1.04, rx: 0.52, ry: 0.36, solid: 0.55),
    sheenAlpha: 0.18, sheenTo: 0.55, hairlineAlpha: 0.35, hairlineWidth: 1
  )
}

// (line, body, topic, light slip, light card, dark slip, dark card, dark edge, tag fill, name)
let DATA: [(String, String, String, String, String, String, String, String, String, String)] = [
  ("It's 2am and I'm listening to the dishwasher because it…", "It's 2am and I'm listening to the dishwasher because it sounds like rain. I used to hate this hour. Now it's the only one that feels like mine.", "#can't sleep", "#d4e5fb", "#bdd6fa", "#1b2535", "#1c2a3e", "#295086", "#3C87EF", "Sunday Kite"),
  ("I fixed the wobbly chair today.", "I fixed the wobbly chair today. It took an hour and one wrong screw.", "#tiny win", "#fffade", "#fef7cc", "#323125", "#3b3928", "#8a7f43", "#FDE669", "Quiet Harbor"),
  ("Tell me a street you've never walked down.", "Tell me a street you've never walked down.", "#growing", "#d8f6e6", "#c2f1d8", "#1c2f29", "#1f372e", "#317854", "#4CD78C", "Paper Lantern"),
  ("I keep rehearsing a conversation I'll never have.", "I keep rehearsing a conversation I'll never have. Does that ever stop?", "#off my chest", "#f0ecfd", "#e7e2fc", "#2a2936", "#302f3f", "#686189", "#B9A9F5", "Low Tide"),
  ("Someone held the lift for me and I thought about it for…", "Someone held the lift for me and I thought about it for an hour.", "#overthinking", "#e6effd", "#d8e6fc", "#242b36", "#29313f", "#526689", "#8DB4F5", "Slow Comet"),
  ("Hello!", "Hello!", "", "#e5e4eb", "#d7d6e0", "#24252c", "#292a32", "#504f60", "", "Tin Whistle"),
]

func slips(dark: Bool) -> [KCatchSlip] {
  DATA.enumerated().map { i, d in
    var s = KCatchSlip()
    s.id = "s\(i)"
    s.line = d.0
    s.body = d.1
    s.topic = d.2
    s.wash = dark ? d.5 : d.3
    s.cardWash = dark ? d.6 : d.4
    s.edge = dark ? d.7 : ""
    s.tagFill = d.8
    s.who = KCardWho(name: d.9, mark: nil, sign: KLineGlyph.sign(["gemini", "leo", "pisces", "virgo", "aries", "libra"][i]), face: .frost(frost(i, dark: dark)))
    s.a11y = d.0
    return s
  }
}

func content(dark: Bool) -> KKindredsEmptyContent {
  var c = KKindredsEmptyContent()
  c.title = "Kindreds"
  c.status = "NONE YET"
  c.you = "YOU"
  c.slips = slips(dark: dark)
  c.catchTitle = "Letters are passing through."
  c.catchSub = "Tap one before it drifts off."
  c.letGo = "Let it go"
  c.writeBack = "Write back"
  c.top = 59
  c.tabBarRoom = 96
  var d = KKindredsEmptyDesk()
  d.name = "Wren"
  d.tag = "OFFICIAL"
  d.ago = "9d"
  d.line = "Some nights are heavier than a letter can hold."
  c.desk = d
  return c
}

struct Opened: View {
  let theme: KTheme
  let index: Int
  var body: some View {
    let c = content(dark: theme.isDark)
    VStack(spacing: 10) {
      KCatchSky(theme: theme, width: 361, you: "YOU", slips: c.slips, picked: c.slips[index].id, active: true) { _ in }
      KKindredsEmptyDeskCard(theme: theme, desk: c.desk, onTap: {})
      KCatchLetter(theme: theme, slip: c.slips[index], letGo: c.letGo, writeBack: c.writeBack, onLetGo: {}, onWriteBack: {})
        .padding(.top, 4)
    }
    .padding(16)
    .frame(width: 393, height: 780, alignment: .top)
    .background(theme.bg)
  }
}

struct Drifting: View {
  let theme: KTheme
  var body: some View {
    let c = content(dark: theme.isDark)
    VStack(spacing: 10) {
      KCatchSky(theme: theme, width: 361, you: "YOU", slips: c.slips, picked: nil, active: true) { _ in }
      KKindredsEmptyDeskCard(theme: theme, desk: c.desk, onTap: {})
      VStack(spacing: 8) {
        Text(c.catchTitle).kText(.system(22, .semibold, lineHeight: 28.0 / 22)).foregroundStyle(theme.ink)
        Text(c.catchSub).kText(.system(15, lineHeight: 22.0 / 15)).foregroundStyle(theme.sub)
      }
      .padding(.top, 18)
    }
    .padding(16)
    .frame(width: 393, height: 780, alignment: .top)
    .background(theme.bg)
  }
}

struct Sheet: View {
  var body: some View {
    VStack(spacing: 0) {
      ForEach([KTheme.classic, KTheme.midnight], id: \.key) { theme in
        HStack(spacing: 0) {
          Drifting(theme: theme)
          Opened(theme: theme, index: 0)
          Opened(theme: theme, index: 1)
        }
      }
    }
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
