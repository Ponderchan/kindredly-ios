// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE STAMPS CARD (H:81 as the owner's placeholder): the stamps you have put on your letters,
 newest first. An InkCard .me, 12 between its pieces:
 - the header: the ink label YOUR STAMPS (mono 600 10 at .14em in the page colour on ink,
   padding 6 10, corners 12) and, at the right, "7 USED" (mono 500 10 at .12em, mute);
 - a grid of three, 12 apart, and the stamp IS the cell (stamps v2, 2026-10-18; MeRN's
   StampsCardRN draws the same): each one stands at the ladder's meYourStamps, 80×96, centred in
   its third of the card, with the day you last used it 6 under it in mono 600 9 (the mock's 8,
   lifted by the 9/10/11 rule), sub, on one line. No dotted frame round it any more, which made a
   perforated stamp look perforated twice, and no "n of 36": the count beside the title says how
   many you've used. Your own stamps, so flat (0°, no postmark); the paper follows the theme
   (Midnight's #ECE9F4, no keyline on dark). A card too narrow for three 80s side by side (cells
   under 80 wide) steps down the ladder to 60×72 rather than off it. H:81 labels the cells by
   date, not name; the name is VoiceOver's.
 - with none yet: the serif italic hint and a tertiary "Write a letter" (sf, 2 ln, corners 14).
 Not built (owner, later): the gold 1ST / 9 MORE FRAMES cell, "3 of 12 frames", UPLOAD and
 STAMP CAM.
 */
public struct KStampsCard: View {
  static var dateStyle: KTextStyle { .monoStamp }

  private let theme: KTheme
  private let stamps: KMeStamps
  private let actions: KMeActions

  public init(theme: KTheme, stamps: KMeStamps, actions: KMeActions) {
    self.theme = theme
    self.stamps = stamps
    self.actions = actions
  }

  private let columns = Array(repeating: GridItem(.flexible(), spacing: 12, alignment: .top), count: 3)

  /// the grid's width as laid out (0 until it is)
  @State private var gridWidth: CGFloat = 0

  /// a third of the grid, less its two 12 gaps (MeRN: floor((inner − 24) / 3))
  private var cellWidth: CGFloat {
    gridWidth > 0 ? ((gridWidth - 2 * 12) / 3).rounded(.down) : 0
  }

  /// the ladder's meYourStamps (80), or the reader head's 60 when a cell is under 80 wide; 80
  /// until the grid is measured, as on every phone the app runs on
  private var stampWidth: CGFloat {
    cellWidth == 0 || cellWidth >= KStampLadder.meYourStamps.w ? KStampLadder.meYourStamps.w : KStampLadder.readerHead.w
  }

  public var body: some View {
    InkCard(theme: theme, variant: .me, spacing: 12) {
      HStack(alignment: .center, spacing: 12) {
        Text(stamps.label)
          .kText(.monoSection)
          .foregroundStyle(theme.bg)
          .lineLimit(1)
          .padding(.vertical, 6)
          .padding(.horizontal, 10)
          .background(RoundedRectangle(cornerRadius: 12, style: .circular).fill(theme.ink))
          .accessibilityAddTraits(.isHeader)
        Spacer(minLength: 0)
        Text(stamps.count)
          .kText(.monoMeta)
          .foregroundStyle(theme.mute)
          .lineLimit(1)
      }
      if stamps.cells.isEmpty {
        empty
      } else {
        LazyVGrid(columns: columns, alignment: .leading, spacing: 12) {
          ForEach(stamps.cells) { cell in
            KStampCellView(theme: theme, cell: cell, cellWidth: cellWidth, stampWidth: stampWidth)
          }
        }
        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width in
          if abs(width - gridWidth) > 0.5 { gridWidth = width }
        }
      }
    }
  }

  private var empty: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text(stamps.emptyText)
        .kText(.letterHint)
        .foregroundStyle(theme.sub)
        .fixedSize(horizontal: false, vertical: true)
      SwiftUI.Button {
        actions.onStampsEmpty()
      } label: {
        Text(stamps.emptyCta)
          .kText(.chip)
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .padding(.vertical, 10)
          .padding(.horizontal, 14)
          .background {
            RoundedRectangle(cornerRadius: 14, style: .circular).fill(theme.sf)
            RoundedRectangle(cornerRadius: 14, style: .circular).strokeBorder(theme.ln, lineWidth: 2)
          }
          .contentShape(Rectangle())
      }
      .buttonStyle(KFadePressStyle())
    }
  }
}

/// One stamp you have used, the day under it.
struct KStampCellView: View {
  let theme: KTheme
  let cell: KMeStampCell
  /// the cell's width (0 until the grid is measured: the date is then only held to one line)
  let cellWidth: CGFloat
  let stampWidth: CGFloat

  var body: some View {
    VStack(spacing: 6) {
      KStamp(id: cell.id, width: stampWidth, dark: theme.isDark, fallbackHex: cell.hex.isEmpty ? nil : cell.hex)
      if !cell.date.isEmpty {
        Text(cell.date)
          .kText(KStampsCard.dateStyle)
          .foregroundStyle(theme.sub)
          .lineLimit(1)
          .frame(maxWidth: cellWidth > 0 ? cellWidth : nil)
      }
    }
    .frame(maxWidth: .infinity)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(cell.a11yLabel)
    .accessibilityAddTraits(.isImage)
    .accessibilityHidden(cell.a11yLabel.trimmingCharacters(in: .whitespaces).isEmpty)
  }
}
