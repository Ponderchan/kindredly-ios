// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE STAMPS CARD (H:81 as the owner's placeholder): the stamps you have put on your letters,
 newest first. An InkCard .me, 12 between its pieces:
 - the header: the ink label YOUR STAMPS (mono 600 10 at .14em in the page colour on ink,
   padding 6 10, corners 12) and, at the right, "7 USED" (mono 500 10 at .12em, mute);
 - a grid of three, 12 apart: each cell 4:5, a 3pt dotted ln frame with corners 4 round 4 of
   padding, the inside soft2 with corners 2, the stamp's own art in the middle (KStampArt, in
   its own colours in every theme) and the day you last used it at the bottom left in mono 600
   9 (the mock's 8, lifted by the 9/10/11 rule), sub. H:81 labels the cells by date, not name;
   the name is VoiceOver's.
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
            KStampCellView(theme: theme, cell: cell)
          }
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

/// One stamp in its dotted frame, with the day you last used it.
struct KStampCellView: View {
  let theme: KTheme
  let cell: KMeStampCell

  var body: some View {
    Color.clear
      .aspectRatio(4.0 / 5.0, contentMode: .fit)
      .overlay {
        GeometryReader { geo in
          let side = max(0, min(geo.size.width, geo.size.height) * 0.62)
          ZStack(alignment: .bottomLeading) {
            RoundedRectangle(cornerRadius: 2, style: .circular)
              .fill(theme.soft2)
            KStampArt(id: cell.id, size: side, fallbackHex: cell.hex.isEmpty ? nil : cell.hex)
              .frame(maxWidth: .infinity, maxHeight: .infinity)
            if !cell.date.isEmpty {
              Text(cell.date)
                .kText(KStampsCard.dateStyle)
                .foregroundStyle(theme.sub)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .padding(.leading, 5)
                .padding(.trailing, 4)
                .padding(.bottom, 4)
            }
          }
        }
        .padding(4)
      }
      .background(RoundedRectangle(cornerRadius: 4, style: .circular).fill(theme.sf))
      // CSS's 3px dotted: round dots 3 across, a dot apart
      .overlay(RoundedRectangle(cornerRadius: 4, style: .circular).strokeBorder(theme.ln, style: StrokeStyle(lineWidth: 3, lineCap: .round, dash: [0.001, 6])))
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(cell.a11yLabel)
      .accessibilityAddTraits(.isImage)
      .accessibilityHidden(cell.a11yLabel.trimmingCharacters(in: .whitespaces).isEmpty)
  }
}
