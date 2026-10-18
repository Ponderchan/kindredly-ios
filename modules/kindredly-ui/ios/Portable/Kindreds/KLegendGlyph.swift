// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE SMALL MARKS THAT SAY WHAT KINDREDS' PICTURES MEAN (H:62).

 - kindred: the group chip's mark for someone whose name you know. An 18 square with corners of
   5 in the courier's green (KBrand.greenText, a fixed object colour), holding a 12 white face:
   two dot eyes and a smile at stroke 2.6 (KLineGlyph.smile).
 - penPal: the group chip's mark for a stranger: an 18 square outlined in ind (1.8), a 2 x 2
   grid inside it (padding 3, gap 1) with the top-left and bottom-right cells inked.
 - rings: the orbit legend's "closer = more letters": two dashed ellipses round the cell that
   is you, in sub (RN's RingsMark, KindredsSky.tsx).
 - turn: the orbit legend's "your turn": a tiny pen-pal face inked in ind, the way a your-turn
   face is drawn on the orbit itself. The mock's 7 x 7 square stood for its squares; the real
   orbit draws faces (owner), and nothing on the 10a page is a dot (critic-kindreds).

 WITH THE IDENTITY SWITCH ON (identity-plan §6, the build plan's orbit rule), TS sends `frost`, a
 fixed sample window that is nobody's (kindreds-model LEGEND_FROST_SEED), and the two marks that
 mean "a stranger" follow the orbit: penPal becomes a small frosted square (KFrost, base, lights
 and hairline at these sizes) instead of the half-filled grid, and turn the same little window
 with the 1.5pt ind ring a your-turn window wears on the orbit. kindred and rings don't change.

 Decorative: label the chip or the legend line that holds it.
 */
public struct KLegendGlyph: View {
  public enum Kind: String, Sendable {
    case kindred
    case penPal
    case rings
    case turn
  }

  /// The legend's your-turn face: a fixed, symmetric little face (bits row * 5 + column).
  static let turnMask: Int = {
    let cells: [(Int, Int)] = [(0, 1), (0, 3), (1, 0), (1, 2), (1, 4), (2, 1), (2, 3), (3, 0), (3, 2), (3, 4), (4, 1), (4, 3)]
    return cells.reduce(0) { $0 | (1 << ($1.0 * 5 + $1.1)) }
  }()

  private let theme: KTheme
  private let kind: Kind
  private let size: CGFloat
  private let frost: KFrostSpec?

  /// - Parameters:
  ///   - kind: which mark
  ///   - size: the chips' marks are 18 (the mock's); the legend's 12
  ///   - frost: identity switch on: the sample window penPal and turn are drawn as; nil keeps the
  ///     mosaic marks
  public init(theme: KTheme, kind: Kind, size: CGFloat = 18, frost: KFrostSpec? = nil) {
    self.theme = theme
    self.kind = kind
    self.size = size
    self.frost = frost
  }

  public var body: some View {
    mark
      .frame(width: size, height: size)
      .accessibilityHidden(true)
  }

  @ViewBuilder
  private var mark: some View {
    if let frost, kind == .penPal || kind == .turn {
      window(frost, ring: kind == .turn)
    } else {
      mosaicMark
    }
  }

  /// The sample window (identity switch on); `ring`: inset by the your-turn ring, 1.5 of ind 1pt
  /// clear of the window (KOrbitGeometry), as the orbit draws it.
  @ViewBuilder
  private func window(_ frost: KFrostSpec, ring: Bool) -> some View {
    if ring {
      let out = KOrbitGeometry.turnGap + KOrbitGeometry.turnRing
      let side = max(1, size - 2 * out)
      KFrost(theme: theme, spec: frost, size: side)
        .frame(width: size, height: size)
        .overlay {
          RoundedRectangle(cornerRadius: frost.radius(side: side) + out, style: .circular)
            .strokeBorder(theme.ind, lineWidth: KOrbitGeometry.turnRing)
        }
    } else {
      KFrost(theme: theme, spec: frost, size: size)
    }
  }

  @ViewBuilder
  private var mosaicMark: some View {
    let u = size / 18
    switch kind {
    case .kindred:
      RoundedRectangle(cornerRadius: 5 * u, style: .circular)
        .fill(KBrand.greenText)
        .overlay {
          KLineIcon(.smile, size: 12 * u, lineWidth: 2.6, color: KBrand.paperWhite)
        }
    case .penPal:
      let border = 1.8 * u
      let pad = 3 * u
      let gap = 1 * u
      let cell = (size - 2 * border - 2 * pad - gap) / 2
      RoundedRectangle(cornerRadius: 5 * u, style: .circular)
        .strokeBorder(theme.ind, lineWidth: border)
        .overlay {
          VStack(spacing: gap) {
            HStack(spacing: gap) {
              Rectangle().fill(theme.ind).frame(width: cell, height: cell)
              Color.clear.frame(width: cell, height: cell)
            }
            HStack(spacing: gap) {
              Color.clear.frame(width: cell, height: cell)
              Rectangle().fill(theme.ind).frame(width: cell, height: cell)
            }
          }
        }
    case .rings:
      KRingsMark(color: theme.sub)
    case .turn:
      // five cells and four gaps across the frame, as KFace draws a bare mosaic
      let cell = size / (5 + 4 * 0.32)
      KMosaic(mask: Self.turnMask, cell: cell, gap: cell * 0.32, color: theme.ind)
    }
  }
}

/// Two dashed orbits round the cell that is you, on an 18 x 14 box scaled into the frame.
private struct KRingsMark: View {
  let color: Color

  var body: some View {
    Canvas { gc, size in
      let s = min(size.width / 18, size.height / 14)
      let ox = (size.width - 18 * s) / 2
      let oy = (size.height - 14 * s) / 2
      func ellipse(rx: CGFloat, ry: CGFloat) -> Path {
        Path(ellipseIn: CGRect(x: ox + (9 - rx) * s, y: oy + (7 - ry) * s, width: 2 * rx * s, height: 2 * ry * s))
      }
      gc.stroke(ellipse(rx: 8, ry: 6), with: .color(color.opacity(0.75)), style: StrokeStyle(lineWidth: 1, dash: [2 * s, 2 * s]))
      gc.stroke(ellipse(rx: 4.5, ry: 3.4), with: .color(color), style: StrokeStyle(lineWidth: 1, dash: [2 * s, 1.6 * s]))
      gc.fill(Path(CGRect(x: ox + 7.6 * s, y: oy + 5.6 * s, width: 2.8 * s, height: 2.8 * s)), with: .color(color))
    }
  }
}
