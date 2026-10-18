// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE STAMP TRAY (ComposeTray.tsx StampTray, drawn the 10a way): where the keyboard was, 296
 above the home indicator, on soft with a 1pt line along its top. It scrolls: FOR THIS LETTER
 (stamps read off the letter itself), RECENTLY USED, then the six categories of six — each under
 its head in mono 600 10 at .14em in mute, six to a row. A tile is the stamp itself at the
 ladder's trayTile, 30×36 (the owner, 2026-10-18: the App Store tray's size, after 40×48 read too
 big for a picker of 36; stamps v2: KStamp, your own stamp so flat, and nothing
 framed round it, since a stamp is never put inside another tile's border; stamps keep their
 colours in every theme, only the paper turns Midnight's), and the one on the envelope keeps the
 selection it always had, the 2pt ind ring with corners of 7, 2 out from the stamp's edge; its
 name under it in mono in its channel ink (worked out by TS against this tray's soft, so a
 deep stamp's name still reads on Midnight's dark tray), on ONE line wherever it fits (the
 owner's call: most names one line): at 9, else at 8, and only a name that fits neither wraps to
 two centred lines at 9 (in English 31 of 36 stay on one line; never told anyone, situationship,
 hat meinen tag gerettet wrap; a row of the grid grows to its tallest name). Never truncated.
 The names are drawn exactly as TS sends them: lower
 case since the owner's call of 2026-10-18 (useComposeState traySections), so nothing here
 upper-cases them or sets a textCase; the section heads stay in capitals, also as sent. The tiles
 stop growing at accessibility1, as the + tray's cells do.
 A tap picks it (TS closes the tray and notes it as recently used).

 The custom stamp and the stamp cam are doors not built yet (ComposeTray DOORS_OPEN = false):
 there is no tab row until they are.

 The sections come from TS (compose-model stampSections), already in the reader's language,
 with ids no stamp has already dropped.
 */
struct KStampTray: View {
  static let columns = 6
  /// the tile's stamp width (the ladder's trayTile: 30 × 36)
  static let tile: CGFloat = KStampLadder.trayTile.w

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
        KStamp(id: item.id, width: Self.tile, dark: theme.isDark)
          // the ring: 2 of room and its own 2pt, as ComposeTray's padding 2 + borderWidth 2
          .padding(4)
          .overlay {
            RoundedRectangle(cornerRadius: 7, style: .circular)
              .strokeBorder(on ? theme.ind : Color.clear, lineWidth: 2)
          }
        // one line at 9, else one line at 8, else two lines at 9 (see the header): the first that fits
        ViewThatFits(in: .horizontal) {
          name(item, size: 9).lineLimit(1).fixedSize()
          name(item, size: 8).lineLimit(1).fixedSize()
          name(item, size: 9)
            .lineLimit(2)
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
        }
        // 3 either side, so two neighbours' names never read as one (can't sleep made my day)
        .padding(.horizontal, 3)
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

  private func name(_ item: KComposeStampItem, size: CGFloat) -> some View {
    Text(item.name)
      .kText(.mono(size, .medium, tracking: 0))
      .foregroundStyle(item.ink)
  }
}
