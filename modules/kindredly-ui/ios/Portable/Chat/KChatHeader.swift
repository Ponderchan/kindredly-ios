// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE CONVERSATION'S HEADER (chat composers, the owner's final, 2026-10-18), drawn at the top of
 the conversation's one Host: the pen-pal chat's while names aren't traded (Prompt 2 A2), and the
 kindreds chat's (B). A pen-pal chat that turns out to be revealed already keeps the React Native
 header (ChatHeader.tsx).

   ‹  ▦  No. 5422                         ●●●○○  ···      72 tall, on the page, a 1.5 line rule
         LETTER 3 OF 5 · THEIRS                            under it; padding 0 18 0 14, 12 apart

   ‹  ◯  Luna                                    ···      the kindreds chat (model.room): the
         KINDRED SINCE OCTOBER 8                           kindred's face, round, 44 across

 THE KINDREDS CHAT'S (B) is the same header with the kindred in it: their face as their Kindreds
 row draws it (KFace round, 44: the portrait they chose, the glyph when they gave none, the veil
 once gone; TS resolves it, lib/faces), the name, and under it KINDRED SINCE {the day names were
 traded}, or how they write, in mute; no dots. The face and name always open their page. The
 React Native room header's lore button and its "Wren found you two" line are not in the
 owner's B.

 THE PEN-PAL CHAT'S (A2):
 - ‹ the back chevron, 22 at 2.2 in ink, in a 44 target (VoiceOver: Back).
 - THE FACE: FACE v1 as the rest of the app draws it (KMosaic, the mask from TS's mosaicMask with
   their letters' develop; the veil in faint for a deleted account), in a 44 × 36 slot. The
   prototype's 5 × 4 placeholder grid is not the face: FACE v1 is frozen at 5 × 5 square cells
   (src/lib/mosaic.ts), so the face is 31 square in the slot, and the frame CorrespondentFace
   gives a face that has come through (a quiet line, brass once they went first) closes it to 36.
 - THE NAME: "No. 5422" in system 600 18 on one line; under it mono 500 10 at .12em in mute on one
   line: LETTER {k} OF 5 · THEIRS | YOURS (whose letter is owed, the Kindreds rows' rule), or past
   the letters the state in its tone (SWAP NAMES?, THEY WENT FIRST in brass; ACCOUNT CLOSED).
   TS words it all (build-items lettersHeader). Face and name are one button that opens their
   page once you know their voice (canOpenPage), and otherwise one element.
 - THE DOTS: five, 8 across with a 1.5 ln outline, 4 apart; one filled (ln) for each exchange
   that went both ways. VoiceOver hears them in the name's element.
 - ··· Report or block (TS opens ReportSheet: it rises from here), 22 in ink, in a 44 target;
   none when there is nobody on the other side to report.

 Every tap leaves the screen or covers it, so they all go to TS (actions.onDock: back, page,
 more), which lets go of the keyboard first (blurThen). The header grows with Dynamic Type up to
 accessibility2, keeping its 72 at least.
 */
struct KChatHeader: View {
  let theme: KTheme
  let model: KChatHeaderModel
  /// the status bar's room (the Host ignores the safe area)
  let topInset: CGFloat
  let actions: KConversationActions

  static let height: CGFloat = 72

  private var subColor: Color {
    switch model.tone {
    case .mute: return theme.mute
    case .ind: return theme.ind
    case .brass: return theme.isDark ? KBrand.waxGold : KBrand.brassSeal
    }
  }

  var body: some View {
    HStack(spacing: 0) {
      SwiftUI.Button {
        actions.onDock("back")
      } label: {
        KLineIcon(.chevronLeft, size: 22, lineWidth: 2.2, color: theme.ink)
          .frame(width: 40, height: 44)
          .contentShape(Rectangle())
      }
      .buttonStyle(KFloatPressStyle())
      .accessibilityLabel(model.backLabel)
      .padding(.trailing, 3)

      identity
        .frame(maxWidth: .infinity, alignment: .leading)

      if !model.room {
        dots
          .padding(.leading, 12)
          .accessibilityHidden(true)
      }

      if !model.moreLabel.isEmpty {
        SwiftUI.Button {
          actions.onDock("more")
        } label: {
          KLineIcon(.more, size: 22, lineWidth: 4, color: theme.ink)
            .frame(width: 40, height: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(KFloatPressStyle())
        .accessibilityLabel(model.moreLabel)
        .padding(.leading, 3)
      }
    }
    // padding 0 18 0 14 to the icons' own edges: the 40 targets reach 9 past each 22 icon
    .padding(.leading, 14 - 9)
    .padding(.trailing, model.moreLabel.isEmpty ? 18 : 18 - 9)
    .frame(minHeight: Self.height)
    .padding(.top, topInset)
    .background(theme.bg)
    .overlay(alignment: .bottom) {
      Rectangle()
        .fill(theme.line)
        .frame(height: 1.5)
        .accessibilityHidden(true)
    }
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
  }

  @ViewBuilder
  private var identity: some View {
    let content = HStack(spacing: 12) {
      if model.room {
        KFace(theme: theme, source: model.face, size: 44)
          .accessibilityHidden(true)
      } else {
        KChatHeaderFace(theme: theme, mask: model.mask, veil: model.veil, frame: model.frame)
      }
      VStack(alignment: .leading, spacing: 3) {
        Text(model.name)
          .kText(.system(18, .semibold))
          .foregroundStyle(theme.ink)
          .lineLimit(1)
        if !model.sub.isEmpty {
          Text(model.sub)
            .kText(.mono(10, .medium, tracking: 0.12))
            .foregroundStyle(subColor)
            .lineLimit(1)
            .truncationMode(.tail)
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    if model.canOpenPage {
      SwiftUI.Button {
        actions.onDock("page")
      } label: {
        content.contentShape(Rectangle())
      }
      .buttonStyle(KChatPlainPress())
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(model.a11yLabel)
      .accessibilityAddTraits(.isButton)
    } else {
      content
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(model.a11yLabel)
        .accessibilityAddTraits(.isHeader)
    }
  }

  private var dots: some View {
    HStack(spacing: 4) {
      ForEach(0..<5, id: \.self) { i in
        Circle()
          .fill(i < model.dots ? theme.ln : Color.clear)
          .overlay(Circle().strokeBorder(theme.ln, lineWidth: 1.5))
          .frame(width: 8, height: 8)
      }
    }
  }
}

/// A pen pal's face in the header's 44 × 36 slot: FACE v1 (31 square), framed to 36 once it has
/// come through (CorrespondentFace's rule), the veil for no one.
struct KChatHeaderFace: View {
  let theme: KTheme
  let mask: Int
  let veil: Bool
  let frame: KChatFaceFrame

  static let cell: CGFloat = 5.2
  static let gap: CGFloat = 1.3

  private var frameColor: Color? {
    switch frame {
    case .none: return nil
    case .line: return theme.line
    case .brass: return theme.isDark ? KBrand.waxGold : KBrand.brassSeal
    }
  }

  var body: some View {
    Group {
      if veil {
        KMosaic.veil(theme: theme, cell: Self.cell, gap: Self.gap)
      } else {
        KMosaic(mask: mask, cell: Self.cell, gap: Self.gap, color: theme.ink)
      }
    }
    // the frame's 1pt line inside a 36 square, 1.4 clear of the face
    .padding(2.4)
    .overlay {
      if let frameColor {
        Rectangle().strokeBorder(frameColor, lineWidth: 1)
      }
    }
    .frame(width: 44, height: 36)
    .accessibilityHidden(true)
  }
}
