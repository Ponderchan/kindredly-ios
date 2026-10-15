// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 A PEN PAL'S FACE, FACE v1 (src/components/MosaicId.tsx): a 5 × 5 grid of square cells, inked
 or empty. Which cells, and how many of them have come through ("develop", the letters they
 have sent you), is decided once, in TypeScript (src/lib/mosaic.ts, mosaicMask), so the two
 renderers can never disagree about a face people recognise like handwriting. Swift receives
 the result as a 25-bit mask and only draws it:

     bit (row × 5 + column) set = that cell is inked, rows and columns from the top left

 The cells are square, `gap` apart, so the face is 5 × cell + 4 × gap across and down.

 THE VEIL. A deleted account's letters stay, unsigned, and their face is no one's: every cell
 drawn, all in one quiet colour, the same for every ghost because it claims nothing. Pass
 veil: true and theme.faint as the colour (the old ink12 grey of MosaicId is invisible on soft2;
 faint holds on every face colour), or use KMosaic.veil(theme:cell:gap:).

 It is decorative: label the element that holds it.
 */
public struct KMosaic: View {
  /// every cell, for the veil and for checks
  public static let fullMask = (1 << 25) - 1

  private let mask: Int
  private let cell: CGFloat
  private let gap: CGFloat
  private let color: Color
  private let veil: Bool

  /// - Parameters:
  ///   - mask: the inked cells, bit row × 5 + column (from TS mosaicMask)
  ///   - cell: one cell's side, in points
  ///   - gap: the room between cells, in points
  ///   - color: the ink (the theme's ink, or ind for a pen pal whose turn it is to write to)
  ///   - veil: draw every cell, in `color` (pass theme.faint): the face of a deleted account
  public init(mask: Int, cell: CGFloat, gap: CGFloat, color: Color, veil: Bool = false) {
    self.mask = mask
    self.cell = cell
    self.gap = gap
    self.color = color
    self.veil = veil
  }

  /// The veil in the theme's faint.
  public static func veil(theme: KTheme, cell: CGFloat, gap: CGFloat) -> KMosaic {
    KMosaic(mask: fullMask, cell: cell, gap: gap, color: theme.faint, veil: true)
  }

  /// The face's side for a cell and gap: 5 cells and 4 gaps.
  public static func side(cell: CGFloat, gap: CGFloat) -> CGFloat {
    5 * cell + 4 * gap
  }

  public var body: some View {
    let side = Self.side(cell: cell, gap: gap)
    KMosaicShape(mask: veil ? Self.fullMask : mask, cell: cell, gap: gap)
      .fill(color)
      .frame(width: side, height: side)
      .accessibilityHidden(true)
  }
}

/// The inked cells of a mask as one path, laid out from the top left of the frame.
public struct KMosaicShape: Shape {
  public let mask: Int
  public let cell: CGFloat
  public let gap: CGFloat

  public init(mask: Int, cell: CGFloat, gap: CGFloat) {
    self.mask = mask
    self.cell = cell
    self.gap = gap
  }

  public func path(in rect: CGRect) -> Path {
    var p = Path()
    for r in 0..<5 {
      for c in 0..<5 where mask & (1 << (r * 5 + c)) != 0 {
        p.addRect(CGRect(
          x: rect.minX + CGFloat(c) * (cell + gap),
          y: rect.minY + CGFloat(r) * (cell + gap),
          width: cell,
          height: cell
        ))
      }
    }
    return p
  }
}
