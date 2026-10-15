// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE STAMP TRAY (ComposeTray.tsx StampTray, drawn the 10a way): where the keyboard was, 296
 above the home indicator, on soft with a 1pt line along its top. It scrolls: FOR THIS LETTER
 (stamps read off the letter itself), RECENTLY USED, then the six categories of six — each under
 its head in mono 600 10 at .14em in mute, six to a row. A tile is the stamp's own art at 40
 (KStampArt: stamps keep their colours in every theme), ringed 2pt in ind with corners of 7
 when it is the one on the envelope, its name under it in mono 9 in its channel ink (worked out
 by TS against this tray's soft, so a deep stamp's name still reads on Midnight's dark tray), on
 up to two centred lines (NEVER TOLD ANYONE, HAT MEINEN TAG GERETTET, MI HA FATTO LA GIORNATA
 don't fit one line of 58 even at .8; a row of the grid grows to its tallest name). The tiles
 stop growing at accessibility1, as the + tray's cells do.
 A tap picks it (TS closes the tray and notes it as recently used).

 The custom stamp and the stamp cam are doors not built yet (ComposeTray DOORS_OPEN = false):
 there is no tab row until they are.

 The sections come from TS (compose-model stampSections), already in the reader's language,
 with ids no stamp has already dropped.
 */
struct KStampTray: View {
  static let columns = 6
  static let tile: CGFloat = 40

  let theme: KTheme
  let sections: [KComposeStampSection]
  let selectedId: String
  let bottomInset: CGFloat
  let onPick: (String) -> Void

  private var grid: [GridItem] {
    Array(repeating: GridItem(.flexible(), spacing: 0, alignment: .top), count: Self.columns)
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 6) {
        ForEach(sections) { section in
          VStack(alignment: .leading, spacing: 4) {
            Text(section.title)
              .kText(.monoSection)
              .foregroundStyle(theme.mute)
              .padding(.horizontal, 6)
              .padding(.top, 10)
              .accessibilityAddTraits(.isHeader)
            LazyVGrid(columns: grid, spacing: 0) {
              ForEach(section.items) { item in
                tile(item)
              }
            }
          }
        }
      }
      .padding(.horizontal, 10)
      .padding(.top, 4)
      .padding(.bottom, 18 + bottomInset)
    }
    .scrollIndicators(.hidden)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(theme.soft)
    .overlay(alignment: .top) {
      Rectangle().fill(theme.line).frame(height: 1)
    }
  }

  private func tile(_ item: KComposeStampItem) -> some View {
    let on = item.id == selectedId
    return SwiftUI.Button {
      onPick(item.id)
    } label: {
      VStack(spacing: 2) {
        KStampArt(id: item.id, size: Self.tile, fallbackCorner: 5)
          .padding(4)
          .overlay {
            RoundedRectangle(cornerRadius: 7, style: .circular)
              .strokeBorder(on ? theme.ind : Color.clear, lineWidth: 2)
          }
        Text(item.name)
          .kText(.mono(9, .medium, tracking: 0.02))
          .foregroundStyle(item.ink)
          .lineLimit(2)
          .multilineTextAlignment(.center)
          .minimumScaleFactor(0.8)
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: 58)
      }
      .padding(.top, 6)
      .padding(.bottom, 4)
      .frame(maxWidth: .infinity)
      .contentShape(Rectangle())
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(item.accessibilityLabel)
    .accessibilityAddTraits(on ? [.isButton, .isSelected] : .isButton)
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
  }
}
