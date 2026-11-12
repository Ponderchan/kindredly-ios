// The tab bar with the raised +, the ink + and the red accents (2026-11-12), light and dark.
//   design/courier-planet/checks/render-fast.sh design/tab-bar-raised/bar-sheet.swift <out.png>
import SwiftUI
import UIKit
#if canImport(KPortable)
@testable import KPortable
#endif

func items(_ badge: Int) -> [KTabItem] {
  [
    KTabItem(glyph: .today, label: "Today"),
    KTabItem(glyph: .notes, label: "Notes"),
    KTabItem(glyph: .kindreds, label: "Kindreds", badge: badge),
    KTabItem(glyph: .me, label: "Me"),
  ]
}

struct Cell: View {
  let theme: KTheme
  let selected: Int
  let raised: Bool
  let open: Bool
  let label: String
  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(label).font(.system(size: 11, weight: .semibold, design: .monospaced)).foregroundStyle(theme.mute)
      ZStack(alignment: .bottom) {
        // something under the glass: a card's edge and a line of a letter
        VStack(spacing: 0) {
          RoundedRectangle(cornerRadius: 22).fill(theme.sf).frame(height: 70)
            .overlay(alignment: .topLeading) {
              Text("four minutes.").font(.system(size: 17)).foregroundStyle(theme.ink).padding(16)
            }
            .padding(.horizontal, 16)
          Spacer(minLength: 0)
        }
        KTabBar(theme: theme, items: items(12), selectedIndex: selected, isPanelOpen: open, plusLabel: "Post", closeLabel: "Close", raised: raised, onSelect: { _ in }, onPlus: {})
          .padding(.horizontal, 16)
          .padding(.bottom, 26)
      }
      .frame(width: 393, height: 150)
      .background(theme.bg)
    }
    .padding(12)
    .background(theme.isDark ? Color(hex: "#101114") : Color(hex: "#EEEDF3"))
  }
}

struct Sheet: View {
  var body: some View {
    VStack(spacing: 0) {
      ForEach([KTheme.classic, KTheme.midnight], id: \.key) { theme in
        HStack(spacing: 0) {
          Cell(theme: theme, selected: 0, raised: false, open: false, label: "IN THE ROW (as it was) · Today on")
          Cell(theme: theme, selected: 0, raised: true, open: false, label: "RAISED · Today on")
          Cell(theme: theme, selected: 3, raised: true, open: false, label: "RAISED · Me on")
          Cell(theme: theme, selected: 1, raised: true, open: true, label: "RAISED · open (no tray here)")
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
