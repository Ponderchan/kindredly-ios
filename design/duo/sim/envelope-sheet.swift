// The envelope on the letter composer's left page (iPhone Duo), with a signed-in account's name,
// frosted window and star sign: no stamp yet, a stamp picked, a long name, and no sign.
//   design/courier-planet/checks/render-fast.sh design/duo/sim/envelope-sheet.swift <out.png>
import SwiftUI
import UIKit
#if canImport(KPortable)
@testable import KPortable
#endif

func frost(_ i: Int) -> KFrostSpec {
  let bases = ["#C9C2EC", "#BFDCD3", "#E6D2BF", "#B4BCEA"]
  let lights = ["#B4BCEA", "#C4D3B8", "#EAC0CC", "#B8DCDC"]
  return KFrostSpec(
    dark: false,
    base: Color(hex: bases[i % bases.count]),
    lights: [
      .init(color: Color(hex: lights[i % lights.count]), x: 0.26, y: 0.32, r: 0.6643, alpha: 0.9),
      .init(color: Color(hex: lights[(i + 1) % lights.count]), x: 0.7, y: 0.78, r: 0.7214, alpha: 0.9),
    ],
    silhouetteAlpha: 0.22,
    head: .init(x: 0.5, y: 0.4, r: 0.235, solid: 0.62),
    shoulders: .init(x: 0.5, y: 1.04, rx: 0.52, ry: 0.36, solid: 0.55),
    sheenAlpha: 0.18, sheenTo: 0.55, hairlineAlpha: 0.35, hairlineWidth: 1
  )
}

func env(_ name: String, _ i: Int, sign: KLineGlyph?) -> KComposeEnvelope {
  var e = KComposeEnvelope()
  e.name = name
  e.frost = frost(i)
  e.sign = sign
  e.date = "NOV 12"
  e.to = "to: someone who writes like you"
  e.a11y = "Your envelope"
  return e
}

func stamp(_ id: String) -> KComposeStamp {
  KComposeStamp(id: id, name: "#can't sleep", wash: Color(hex: "#DCE8FF"), ink: Color(hex: "#1D4ED8"), line: Color(hex: "#93B4F5"), accessibilityLabel: "")
}

struct Cell: View {
  let theme: KTheme
  let label: String
  let envelope: KComposeEnvelope
  let stamp: KComposeStamp?
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(label).font(.system(size: 11, weight: .semibold, design: .monospaced)).foregroundStyle(theme.mute)
      KComposeEnvelopeFront(theme: theme, envelope: envelope, stamp: stamp, width: 340)
    }
    .padding(28)
    .background(theme.bg)
  }
}

struct All: View {
  var body: some View {
    VStack(spacing: 0) {
      HStack(spacing: 0) {
        Cell(theme: .classic, label: "CLASSIC · no stamp yet", envelope: env("Summery Modem", 0, sign: .gemini), stamp: nil)
        Cell(theme: .classic, label: "CLASSIC · a stamp picked", envelope: env("Rainy Clamp", 1, sign: .leo), stamp: stamp("cant-sleep"))
      }
      HStack(spacing: 0) {
        Cell(theme: .midnight, label: "DARK · a long name, no sign", envelope: env("Wanderlustige Schreibmaschine", 2, sign: nil), stamp: stamp("growing"))
        Cell(theme: .classic, label: "CLASSIC · no account (the demo)", envelope: { var e = KComposeEnvelope(); e.date = "NOV 12"; e.to = "to: someone who writes like you"; return e }(), stamp: nil)
      }
    }
  }
}

@main
struct Main {
  @MainActor static func main() {
    let r = ImageRenderer(content: All())
    r.scale = 2
    guard let img = r.uiImage, let data = img.pngData() else { print("render failed"); exit(1) }
    try! data.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
    print("wrote", img.size)
  }
}
