// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE CONVERSATION'S HEADER (chat composers, the owner's final, 2026-10-18), drawn at the top of
 the conversation's one Host: the pen-pal chat's while names aren't traded (Prompt 2 A2), and the
 kindreds chat's (B). A pen-pal chat that turns out to be revealed already keeps the React Native
 header (ChatHeader.tsx).

   ‹  ▦  No. 5422                                ···      72 tall, on the page, a 1.5 line rule
         LETTER 3 OF 5 · THEIRS                            under it; padding 0 18 0 14, 12 apart
   ────────────────────────────────────────────────
   YOU ■■■□□   NO. 5422 ■■□□□                              the progress band (KChatBand), on
   2 MORE FROM YOU · 3 FROM THEM → NAMES                   the page under the rule

   ‹  ◯  Luna                                    ···      the kindreds chat (model.room): the
         KINDRED SINCE OCTOBER 8                           kindred's face, round, 44 across

 THE KINDREDS CHAT'S (B) is the same header with the kindred in it: their face as their Kindreds
 row draws it (KFace round, 44: the portrait they chose, the glyph when they gave none, the veil
 once gone; TS resolves it, lib/faces), the name, and under it KINDRED SINCE {the day names were
 traded}, or how they write, in mute; no band. The face and name always open their page. The
 React Native room header's lore button and its "Wren found you two" line are not in the
 owner's B.

 THE PEN-PAL CHAT'S (A2):
 - ‹ the back chevron: KBackChevron, the app's one (Settings' 18 at 2.2 in ink, its 36 box 12 from
   the edge, a 44 target; VoiceOver: Back). It stays centred with the face and name in the 72 row
   (by design), so it sits 10 lower than Settings' does; size and x are the same.
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
 - WITH THE IDENTITY SWITCH ON (identity Phase 1) the same slot and the same metrics hold the
   new identity, as data: the frosted window (KFrost) takes the mosaic's exact place, 31.2
   square inside the 36 the frame closes (corners of a quarter, the frame's corners following
   them), never developing; the courier name ("Sunday Kite") takes the number's, with the ♀/♂
   mark 6pt after it and the star sign 4pt after that (KWhoMarks at 14, ink glyphs in sub). The
   glyphs never give way: a name too long for the room left beside the ⋯ is the one that is
   cut, and VoiceOver hears it whole (TS's label, "Sunday Kite, she, Gemini, …"). A deleted
   account is the flat veil tile instead of the mosaic's veil.
 - THE BAND (live 1.0.4's progress band, brought back by the owner 2026-10-19 in place of the
   five round dots that sat beside the ⋯): under the rule, on the page, padding 9 16 10. YOU and
   the pen pal's name in capitals ("NO. 8768"; the courier name with the switch on), mono 600 10
   at .12em in sub, each followed 6pt later by five square cells 8 across, 2 apart (ink filled,
   the theme's line empty, all five in ind), the two groups 16 apart; 7 under them bandFacts'
   line in mono 600 10 at .12em, ink (ind once names can be traded). One VoiceOver element (TS's
   ch.band.a11y). The groups stack and the line wraps when there's no room (Dynamic Type), rather
   than clip. None for a deleted account or the kindreds chat (TS sends none).
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
  /// the mark and the sign beside the 18pt name (KWhoMarks: 0.8 × the name)
  static let markSize: CGFloat = 14

  private var subColor: Color {
    switch model.tone {
    case .mute: return theme.mute
    case .ind: return theme.ind
    case .brass: return theme.isDark ? KBrand.waxGold : KBrand.brassSeal
    }
  }

  var body: some View {
    VStack(spacing: 0) {
      bar
      if !model.room, let band = model.band {
        KChatBand(theme: theme, model: band)
      }
    }
    .background(theme.bg)
    .dynamicTypeSize(...DynamicTypeSize.accessibility2)
  }

  private var bar: some View {
    HStack(spacing: 0) {
      // the app's one back chevron (KBackChevron, Settings' size and x): its 44 target at
      // KBackChevron.leading, so the 18 glyph spans 21–39; the face keeps 12 after it (at 51)
      KBackChevron(theme: theme, label: model.backLabel) {
        actions.onDock("back")
      }
      .padding(.trailing, -1)   // the target ends at 52; the face 12 after the glyph's 39

      identity
        .frame(maxWidth: .infinity, alignment: .leading)

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
    // the chevron at Settings' place (KBackChevron.leading); 18 at the right to the ⋯'s own edge,
    // whose 40 target reaches 9 past its 22 icon
    .padding(.leading, KBackChevron.leading)
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
  }

  @ViewBuilder
  private var identity: some View {
    let content = HStack(spacing: 12) {
      if model.room {
        KFace(theme: theme, source: model.face, size: 44)
          .accessibilityHidden(true)
      } else {
        KChatHeaderFace(theme: theme, mask: model.mask, frost: model.frost, veil: model.veil, veilTile: model.veilTile, frame: model.frame)
      }
      VStack(alignment: .leading, spacing: 3) {
        HStack(alignment: .firstTextBaseline, spacing: 0) {
          Text(model.name)
            .kText(.system(18, .semibold))
            .foregroundStyle(theme.ink)
            .lineLimit(1)
          KWhoMarks(mark: model.mark, sign: model.sign, size: Self.markSize, color: theme.sub)
        }
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

}

/// The pen-pal chat's progress band under the header's rule (live 1.0.4's; ReachBand is its React
/// Native twin): both sides' five cells and the line that says who still owes what.
struct KChatBand: View {
  let theme: KTheme
  let model: KChatBandModel

  static let cell: CGFloat = 8
  static let total = 5

  private static let label = KTextStyle.mono(10, .semibold, tracking: 0.12)

  var body: some View {
    VStack(alignment: .leading, spacing: 7) {
      // side by side, 16 apart; stacked when they don't fit (large Dynamic Type, a long name)
      ViewThatFits(in: .horizontal) {
        HStack(spacing: 16) {
          side(model.youLabel, model.me)
          side(model.themLabel, model.them)
        }
        VStack(alignment: .leading, spacing: 4) {
          side(model.youLabel, model.me)
          side(model.themLabel, model.them, wraps: true)
        }
      }
      // one line; it wraps rather than clip when there's no room
      ViewThatFits(in: .horizontal) {
        line.lineLimit(1)
        line.fixedSize(horizontal: false, vertical: true)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 16)
    .padding(.top, 9)
    .padding(.bottom, 10)
    .background(theme.bg)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(model.a11y)
  }

  private var line: some View {
    Text(model.line)
      .kText(.mono(10, .semibold, tracking: 0.12))
      .foregroundStyle(model.named ? theme.ind : theme.ink)
  }

  private func side(_ label: String, _ n: Int, wraps: Bool = false) -> some View {
    HStack(alignment: .center, spacing: 6) {
      Text(label)
        .kText(Self.label)
        .foregroundStyle(theme.sub)
        .lineLimit(wraps ? nil : 1)
        .fixedSize(horizontal: !wraps, vertical: wraps)
      cells(n)
    }
  }

  private func cells(_ n: Int) -> some View {
    HStack(spacing: 2) {
      ForEach(0..<Self.total, id: \.self) { i in
        Rectangle()
          .fill(n >= Self.total ? theme.ind : i < n ? theme.ink : theme.line)
          .frame(width: Self.cell, height: Self.cell)
      }
    }
  }
}

/// A pen pal's face in the header's 44 × 36 slot: FACE v1 (31 square), framed to 36 once it has
/// come through (CorrespondentFace's rule), the veil for no one. With the identity switch on, the
/// frosted window in the same 31.2 square (the frame's corners rounding with it) and the flat
/// veil tile for no one.
struct KChatHeaderFace: View {
  let theme: KTheme
  let mask: Int
  let frost: KFrostSpec?
  let veil: Bool
  let veilTile: Bool
  let frame: KChatFaceFrame

  static let cell: CGFloat = 5.2
  static let gap: CGFloat = 1.3
  /// the room between the face and the frame's 36 square
  static let pad: CGFloat = 2.4
  /// the frame's square
  static let framed: CGFloat = 36

  /// a window (or its tile) is drawn instead of the mosaic: its square has rounded corners
  private var rounded: Bool { (!veil && frost != nil) || (veil && veilTile) }

  private var frameColor: Color? {
    switch frame {
    case .none: return nil
    case .line: return theme.line
    case .brass: return theme.isDark ? KBrand.waxGold : KBrand.brassSeal
    }
  }

  var body: some View {
    let side = Self.framed - 2 * Self.pad
    Group {
      if veil && veilTile {
        KFrostVeil(theme: theme, size: side)
      } else if veil {
        KMosaic.veil(theme: theme, cell: Self.cell, gap: Self.gap)
      } else if let frost {
        KFrost(theme: theme, spec: frost, size: side)
      } else {
        KMosaic(mask: mask, cell: Self.cell, gap: Self.gap, color: theme.ink)
      }
    }
    // the frame's 1pt line inside a 36 square, 1.4 clear of the face
    .padding(Self.pad)
    .overlay {
      if let frameColor {
        if rounded {
          RoundedRectangle(cornerRadius: Self.framed * 0.25, style: .circular).strokeBorder(frameColor, lineWidth: 1)
        } else {
          Rectangle().strokeBorder(frameColor, lineWidth: 1)
        }
      }
    }
    .frame(width: 44, height: 36)
    .accessibilityHidden(true)
  }
}
