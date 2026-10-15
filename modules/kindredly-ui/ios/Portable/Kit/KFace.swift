// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE ONE FACE VIEW, for every person in a Swift surface: a kindred's portrait or photo, a pen
 pal's FACE v1 mosaic, the veil of a deleted account, or a soft placeholder while a picture is
 on its way. What a person looks like is decided in TypeScript (src/lib/faces.ts, faceSource);
 this draws the answer.

     KFace(theme: t, source: .image(ref, overscan: 0.05), size: 52)               // a kindred
     KFace(theme: t, source: .mosaic(mask: m, tint: t.ink), size: 52)              // a pen pal
     KFace(theme: t, source: .mosaic(mask: m, tint: t.ink), size: 28, round: false) // a card's docket

 ROUND (the default): the list face. A circle; behind a mosaic, the veil and the placeholder a
 soft2 disc, with the mosaic 52% across it (52 → cells of 4.5 with gaps of 1.2, 34 → 2.9 and
 .8, as Kindreds draws them today). Owner, 10-15: a round face is a person in a list, a kindred
 or a pen pal alike; a faceless kindred is drawn round too.

 NOT ROUND: the bare mosaic filling its frame, as the Today card's docket and the reader's
 header set it (no disc); a picture there is a rounded square.

 - dim: the face at .45, for a closed or quiet row; the official badge never dims.
 - badge: the official mark (KOfficialBadge) at the bottom right, 1pt outside the circle, its
   edge cut in `ground`, the colour the face sits on (the page by default; a card passes sf).
 - The frame is always size × size, loaded or not, so a row never jumps when a portrait lands
   (portraits and snapshots arrive a beat later through KImage).
 It is decorative: label the row or button that holds it.
 */

/// What a face shows, as TS resolves it (faceSource in src/lib/faces.ts).
public enum KFaceSource: Equatable, Sendable {
  /// a portrait, a photo or a snapshot; overscan draws it that much larger than the circle,
  /// centred and cropped (the six legacy portraits use .05). A nil ref shows the placeholder.
  case image(KImageRef?, overscan: CGFloat = 0)
  /// a pen pal's FACE v1 mosaic (KMosaic): the 25-bit mask from TS, in this ink
  case mosaic(mask: Int, tint: Color)
  /// a deleted account: every cell, in faint
  case veil
  /// nothing to show yet: the soft2 disc alone
  case placeholder
}

public struct KFace: View {
  /// the round face's mosaic, as a fraction of the face: 52 → 4.5 and 1.2 (kindreds.tsx)
  static let roundCell: CGFloat = 4.5 / 52
  static let roundGap: CGFloat = 1.2 / 52
  /// the gap as a fraction of a cell, for a bare mosaic filling its frame
  static let bareGapRatio: CGFloat = 1.2 / 4.5

  private let theme: KTheme
  private let source: KFaceSource
  private let size: CGFloat
  private let round: Bool
  private let dim: Bool
  private let badge: Bool
  private let ground: Color?

  /// - Parameters:
  ///   - source: what to show (KFaceSource)
  ///   - size: the face's side, in points
  ///   - round: a circle on a soft2 disc (the default); false for a bare mosaic or a rounded
  ///     square, as the Today card's docket is drawn
  ///   - dim: draw the face at .45 (a closed or quiet row)
  ///   - badge: the official mark at the bottom right (Wren)
  ///   - ground: the colour the face sits on, which cuts the badge's edge; nil for theme.bg
  public init(theme: KTheme, source: KFaceSource, size: CGFloat, round: Bool = true, dim: Bool = false, badge: Bool = false, ground: Color? = nil) {
    self.theme = theme
    self.source = source
    self.size = size
    self.round = round
    self.dim = dim
    self.badge = badge
    self.ground = ground
  }

  /// The official badge's side on a face of this size, as OfficialBird sizes it (WrenDesk.tsx).
  public static func badgeSize(for size: CGFloat) -> CGFloat {
    max(16, (size * 0.34).rounded())
  }

  private var shape: AnyShape {
    round ? AnyShape(Circle()) : AnyShape(RoundedRectangle(cornerRadius: size * 0.22, style: .circular))
  }

  public var body: some View {
    face
      .frame(width: size, height: size)
      // flattened first, so the disc doesn't show through a dimmed mosaic
      .compositingGroup()
      .opacity(dim ? 0.45 : 1)
      .overlay(alignment: .bottomTrailing) {
        if badge {
          KOfficialBadge(theme: theme, size: Self.badgeSize(for: size), ground: ground ?? theme.bg)
            .offset(x: 1, y: 1)
        }
      }
      .accessibilityHidden(true)
  }

  @ViewBuilder
  private var face: some View {
    switch source {
    case let .image(ref, overscan):
      KImage(ref, size: CGSize(width: size, height: size), placeholder: theme.soft2, overscan: overscan)
        .clipShape(shape)
    case let .mosaic(mask, tint):
      mosaic(mask: mask, color: tint, veil: false)
    case .veil:
      mosaic(mask: KMosaic.fullMask, color: theme.faint, veil: true)
    case .placeholder:
      shape.fill(theme.soft2)
    }
  }

  @ViewBuilder
  private func mosaic(mask: Int, color: Color, veil: Bool) -> some View {
    if round {
      ZStack {
        Circle().fill(theme.soft2)
        KMosaic(mask: mask, cell: size * Self.roundCell, gap: size * Self.roundGap, color: color, veil: veil)
      }
    } else {
      // the bare mosaic fills the frame: 5 cells and 4 gaps across
      let cell = size / (5 + 4 * Self.bareGapRatio)
      KMosaic(mask: mask, cell: cell, gap: cell * Self.bareGapRatio, color: color, veil: veil)
    }
  }
}

/*
 THE OFFICIAL MARK (WrenDesk.tsx OfficialMark): the account that is the product's own, Wren's.
 An ind disc with a tick stroked in the page colour (3.4 on the 24 grid, drawn half the disc
 across) and a 2pt edge in the colour it sits on, so it reads cut out of the face under it. The
 tick is the kindreds' green tick in the system's blue: "verified", the way the phone taught it.
 */
public struct KOfficialBadge: View {
  private let theme: KTheme
  private let size: CGFloat
  private let ground: Color

  /// - Parameters:
  ///   - size: the badge's side, edge included
  ///   - ground: the colour it sits on, for its 2pt edge (theme.bg on the page, sf on a card)
  public init(theme: KTheme, size: CGFloat = 16, ground: Color) {
    self.theme = theme
    self.size = size
    self.ground = ground
  }

  public var body: some View {
    KLineIcon(.tick, size: size * 0.5, lineWidth: 3.4, color: theme.bg)
      .frame(width: size, height: size)
      .background(Circle().fill(theme.ind))
      .overlay(Circle().strokeBorder(ground, lineWidth: 2))
      .accessibilityHidden(true)
  }
}
