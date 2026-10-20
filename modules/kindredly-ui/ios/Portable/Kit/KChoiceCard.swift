// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE CHOICE CARD, the composer-card material (H:131-133), made public from the + sheet's own
 card (KPlusPanel) so every tray of choices is drawn the same way: the + sheet's WRITE A LETTER
 and NEW NOTE, the room's trace tray (a note, a question, a moment, a song), Wren's desk (a
 picture, a bug, an idea) and compose's More tray.

 Corners of 18, a 2pt ln outline, a hard 3/3 ln shadow (pressed, the card goes down onto it), and
 inside, centred and 6 apart: the glyph 28 across in ink at 2pt, the title in System 600 15 as
 written 4 lower, and the subtitle in System 13 in sub (the card is a button, its words UI: owner,
 2026-10-20; they had been mono capitals and the serif's italic). The mock's card is
 116 tall inside its outline, 120 overall; that is the least it is, so a longer translation or
 a larger Dynamic Type size makes it taller. Put cards side by side in KChoiceGrid, which gives
 both cards in a row one height, as the mock's grid does.

 Three faces: sf (plain, the trays), lav2 (lavender, the letter card) and #F6E7C6 (warm, the
 note card: the happy mood's fill, the same in every theme). The mock writes ink on that pale
 fill even in Midnight, where ink is pale too and the words vanish (a mock bug); in a dark theme
 the warm card's words are Classic's ink and sub instead.

 A locked choice (a feature that isn't open to this reader yet) stays in its place, dimmed, with
 a small lock on an ind disc at its corner, and can't be pressed: a row that plainly says "not
 yet" is an honest promise (LeaveATrace.tsx). VoiceOver reads it as a dimmed button.

 Every word comes from the caller, already translated.
 */
public struct KChoiceCard: View {
  /// the three faces a choice card comes in
  public enum Tone: String, Sendable {
    /// sf, the trays
    case plain
    /// lav2, the + sheet's letter card (H:132)
    case lavender
    /// #F6E7C6, the happy mood's fill: the + sheet's note card (H:133)
    case warm
  }

  /// the least height inside the outline, as the mock draws the card (H:132)
  public static let minimumContentHeight: CGFloat = 116

  private let theme: KTheme
  private let title: String
  private let subtitle: String
  private let glyph: KLineGlyph
  private let tone: Tone
  private let locked: Bool
  private let action: () -> Void

  /// - Parameters:
  ///   - title: set in capitals
  ///   - subtitle: the italic line under it; "" for none
  ///   - glyph: the line drawing, 28 across at a 2pt stroke
  ///   - tone: the card's face; .plain (sf) unless it is one of the + sheet's two cards
  ///   - locked: shown dimmed with a lock, and not pressable
  public init(theme: KTheme, title: String, subtitle: String, glyph: KLineGlyph, tone: Tone = .plain, locked: Bool = false, action: @escaping () -> Void) {
    self.theme = theme
    self.title = title
    self.subtitle = subtitle
    self.glyph = glyph
    self.tone = tone
    self.locked = locked
    self.action = action
  }

  public var body: some View {
    let fill: Color
    switch tone {
    case .plain: fill = theme.sf
    case .lavender: fill = theme.lav2
    case .warm: fill = KMood.happy.fill
    }
    // the warm fill is pale in every theme, so its words stay dark in a dark one
    let fixedInk = tone == .warm && theme.isDark
    let ink = fixedInk ? KTheme.classic.ink : theme.ink
    let sub = fixedInk ? KTheme.classic.sub : theme.sub
    return SwiftUI.Button(action: action) {
      VStack(spacing: 6) {
        // 2pt on screen at 28 across, whatever grid the drawing came from
        KLineIcon(glyph, size: 28, lineWidth: 2 * KLineGlyphTable.grid / 28, color: ink)
        Text(title)
          .kText(.system(15, .semibold))
          .foregroundStyle(ink)
          .lineLimit(2)
          .minimumScaleFactor(0.8)
          .padding(.top, 4)
        if !subtitle.isEmpty {
          Text(subtitle)
            .kText(.system(13))
            .foregroundStyle(sub)
            .lineLimit(2)
            .minimumScaleFactor(0.8)
        }
      }
      .multilineTextAlignment(.center)
      // the mock's card has no padding of its own; a little here keeps a long translation off
      // the outline. 2 of each side is the outline itself, which sits outside the content.
      .padding(.horizontal, 8 + 2)
      .padding(.vertical, 12 + 2)
      .frame(maxWidth: .infinity, minHeight: Self.minimumContentHeight + 2 * 2, maxHeight: .infinity)
      .overlay(alignment: .topTrailing) {
        if locked {
          KLineIcon(.lock, size: 11, lineWidth: 2.2, color: theme.bg)
            .frame(width: 20, height: 20)
            .background(Circle().fill(theme.ind))
            .padding(8)
        }
      }
    }
    .buttonStyle(KStickerButtonStyle(
      shape: RoundedRectangle(cornerRadius: 18, style: .circular),
      fill: fill,
      stroke: theme.ln,
      lineWidth: 2,
      shadow: theme.ln,
      shadowOffset: 3
    ))
    // flattened first, so the hard shadow doesn't show through the dimmed face
    .compositingGroup()
    .opacity(locked ? 0.45 : 1)
    .disabled(locked)
  }
}

/*
 CHOICE CARDS IN ROWS OF TWO, 10 apart, as the mock's grid lays them (H:131: grid-template-columns
 1fr 1fr, gap 10). Both cards in a row take the taller one's height and no more; a row of one
 keeps its card at half the width. The grid is as tall as its rows.
 */
public struct KChoiceGrid<Item: Identifiable, Card: View>: View {
  private let items: [Item]
  private let spacing: CGFloat
  private let card: (Item) -> Card

  /// - Parameters:
  ///   - items: the choices, left to right and top to bottom
  ///   - spacing: between the cards and between the rows (the mock's 10)
  ///   - card: the card for one choice, usually a KChoiceCard
  public init(_ items: [Item], spacing: CGFloat = 10, @ViewBuilder card: @escaping (Item) -> Card) {
    self.items = items
    self.spacing = spacing
    self.card = card
  }

  /// the items' indices in rows of two
  private var rows: [Range<Int>] {
    stride(from: 0, to: items.count, by: 2).map { $0..<min($0 + 2, items.count) }
  }

  public var body: some View {
    VStack(spacing: spacing) {
      ForEach(rows, id: \.lowerBound) { row in
        HStack(spacing: spacing) {
          ForEach(items[row]) { card($0) }
          if row.count == 1 {
            Color.clear.frame(maxWidth: .infinity).accessibilityHidden(true)
          }
        }
        // both cards take the taller one's height (the grid's row), and no more
        .fixedSize(horizontal: false, vertical: true)
      }
    }
  }
}
