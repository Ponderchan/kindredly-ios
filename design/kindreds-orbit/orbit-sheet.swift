// The Kindreds orbit in a few layouts, side by side, dark and light.
//   design/courier-planet/checks/render-fast.sh design/kindreds-orbit/orbit-sheet.swift <out.png>
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

/// thirteen strangers over the rings, as the demo list has them: most of them far out
func strangers(dark: Bool) -> [KOrbitItem] {
  let rings = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]
  return rings.enumerated().map { i, ring in
    KOrbitItem(id: "s\(i)", mask: 0x1F3A5C7 ^ (i * 7919), frost: frost(i, dark: dark), ring: ring,
               a0: -Double.pi / 2 + Double(i) / 13 * 2 * Double.pi + Double((i * 37) % 44 - 22) * Double.pi / 180,
               dir: i % 2 == 0 ? 1 : -1, period: 200, turn: i % 3 == 0)
  }
}

func kindreds(_ n: Int) -> [KOrbitKin] {
  (0..<n).map { i in
    KOrbitKin(id: "k\(i)", face: .mosaic(mask: 0x15AF3B1 ^ (i * 104729), turn: false), a0: -Double.pi / 2 + Double(i) / Double(n) * 2 * Double.pi, turn: i % 2 == 0)
  }
}

let OLD = KOrbitLayout(squash: 0.78, radii: [134, 120, 103, 86, 69, 52], sides: [7, 8, 9, 10, 11, 12], strengths: [0.5, 0.6, 0.7, 0.8, 0.9, 1], kinRadius: 28, kinSide: 14, youFace: 20)
let NEW = KOrbitLayout.standard
/// the same stack with you 22 and your kindreds 15, the gaps a little tighter
let BIG = KOrbitLayout(squash: 0.78, radii: [97.5, 89.3, 79.4, 67.9, 54.8, 40].map { $0 / 0.78 }, sides: [5, 6.4, 7.8, 9.2, 10.6, 12], strengths: [0.5, 0.6, 0.7, 0.8, 0.9, 1], kinRadius: 22 / 0.78, kinSide: 15, youFace: 22)
/// the same vertical stack on flatter rings, which use more of the band's width
let FLAT = KOrbitLayout(squash: 0.68, radii: [97.5, 89.3, 79.2, 67.7, 54.3, 39].map { $0 / 0.68 }, sides: [5, 6.4, 7.8, 9.2, 10.6, 12], strengths: [0.5, 0.6, 0.7, 0.8, 0.9, 1], kinRadius: 21 / 0.68, kinSide: 14, youFace: 20)

/// what ships
let PICK = KOrbitLayout.standard

struct Cell: View {
  let label: String
  let layout: KOrbitLayout
  let theme: KTheme
  let kin: Int
  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(label).font(.system(size: 11, weight: .semibold, design: .monospaced)).foregroundStyle(theme.isDark ? Color.white : Color.black)
      KOrbit(theme: theme, items: strangers(dark: theme.isDark), me: .mosaic(mask: 0x1FFFFFF, turn: false), kin: kindreds(kin), layout: layout, active: false)
        .frame(width: 370)
    }
    .padding(12)
    .background(theme.bg)
  }
}

struct Sheet: View {
  var body: some View {
    VStack(spacing: 0) {
      ForEach([KTheme.midnight, KTheme.classic], id: \.key) { theme in
        HStack(spacing: 0) {
          Cell(label: "BEFORE · even lanes, 7…12", layout: OLD, theme: theme, kin: 5)
          Cell(label: "STANDARD · 5 kindreds", layout: PICK, theme: theme, kin: 5)
          Cell(label: "STANDARD · 8 kindreds", layout: PICK, theme: theme, kin: 8)
          Cell(label: "STANDARD · 1 kindred", layout: PICK, theme: theme, kin: 1)
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
