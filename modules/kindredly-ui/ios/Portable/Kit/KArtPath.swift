// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 ART DRAWN FROM SVG: a picture made in the design set and kept as a flat list of SVG shapes on a
 square grid, drawn by SwiftUI from the very path data React Native hands react-native-svg. The
 mood icons are drawn this way (Kit/KMoodArt.swift; Kit/KMoodArtData.swift from
 src/data/mood-line-art.ts by scripts/gen-mood-art-swift.mjs, itself imported from the owner's
 SVG files by scripts/import-mood-art.mjs), AS A TEMPLATE: one-colour line faces in a
 placeholder ink, painted at draw time (below). Their generator shares scripts/art-path.mjs, the
 reader that checks every path the way KSVGPath reads it.

 The stamps were the other set, drawn AS BAKED (each shape in its own colours and widths) from
 the 64-grid stamp-art.ts, until stamps v2 (2026-10-18): their marks now carry no paint at all and
 sit on a 5:6 box, so they have their own small types (KStampMark, KStampArtEntry) and their own
 renderer (KStamp in Kit/KStampArt.swift, over the frame in Kit/KStampFrame.swift). Nothing about
 a stamp goes through KArtPath any more; KArt's baked draw stays for any art kept the old way.

 KArtPath is one shape: its path data `d` on the art's grid, read by the module's SVG reader
 (KSVGPath in Kit/KLineGlyph.swift: M L H V C S Q T A Z, absolute and relative, arcs as cubic
 curves), and its paint, as SVG paints it:
   - the fill first, then the stroke over it (SVG's paint order); the fill by the nonzero rule;
   - colours as 0xRRGGBBAA, nil for none, drawn in sRGB as given and never themed;
   - width, cap, join and dash in grid units, so they scale with the art as stroke-width does
     with the viewBox; a width of 0 strokes nothing (CoreGraphics would draw a hairline);
   - the miter limit is SVG's 4, not CoreGraphics' 10.
 There is no opacity and no transform. The generator refuses art that needs either (a mood icon
 falls back to its group's icon), so nothing reaches this file to be drawn half right.

 KArt is a whole picture: the paths read once into SwiftUI paths, then drawn into a
 GraphicsContext scaled from the grid to the box it's given (centred, if the box isn't square)
 and clipped to the grid, as an SVG viewport clips. Draw it in a Canvas:

     Canvas { context, box in art.draw(in: context, size: box) }

 THE TEMPLATE DRAW, draw(in:size:tint:strokeScale:), is the only runtime override, and it is for
 art made to be painted: every fill and every stroke the art has (each non-nil one) is painted in
 `tint`, whatever colour the table holds, and every stroke width is multiplied by `strokeScale`
 (the dash pattern stays as drawn). KMoodArt uses it to paint a mood icon in its group's face ink
 and to give one 2-unit master the size's optical step (2.4 / 2.0 / 1.75: a scale of 1.2 / 1 /
 0.875). MoodFace does the same in React Native (ArtShapes's tint and strokeScale).
 */

/// One SVG shape of a piece of art: its path data on the art's grid, and how it is painted.
public struct KArtPath: Equatable, Sendable {
  /// SVG path data, on the art's grid.
  public let d: String
  /// The fill, 0xRRGGBBAA, or nil for none.
  public let fill: UInt32?
  /// The stroke, 0xRRGGBBAA, or nil for none.
  public let stroke: UInt32?
  /// stroke-width, in grid units.
  public let width: CGFloat
  /// stroke-linecap.
  public let cap: CGLineCap
  /// stroke-linejoin.
  public let join: CGLineJoin
  /// stroke-dasharray in grid units, an even count (the generator repeats an odd list, as SVG
  /// does); empty for a solid line.
  public let dash: [CGFloat]

  /// The defaults are SVG's, except the fill, which is always written out (nil for none).
  public init(
    _ d: String,
    fill: UInt32?,
    stroke: UInt32? = nil,
    width: CGFloat = 1,
    cap: CGLineCap = .butt,
    join: CGLineJoin = .miter,
    dash: [CGFloat] = []
  ) {
    self.d = d
    self.fill = fill
    self.stroke = stroke
    self.width = width
    self.cap = cap
    self.join = join
    self.dash = dash
  }

  /// The path data read into a path on the art's grid.
  public var path: Path {
    KSVGPath.path(d)
  }

  /// The stroke as SVG draws it, in grid units.
  public var strokeStyle: StrokeStyle {
    StrokeStyle(lineWidth: width, lineCap: cap, lineJoin: join, miterLimit: 4, dash: dash, dashPhase: 0)
  }

  /// A colour as art carries it, 0xRRGGBBAA, in sRGB.
  public static func color(_ rgba: UInt32) -> Color {
    Color(
      .sRGB,
      red: Double((rgba >> 24) & 0xFF) / 255,
      green: Double((rgba >> 16) & 0xFF) / 255,
      blue: Double((rgba >> 8) & 0xFF) / 255,
      opacity: Double(rgba & 0xFF) / 255
    )
  }
}

/// A picture of KArtPath shapes on a square grid, its paths read once.
public struct KArt: Sendable {
  /// The side of the grid the paths are drawn on (an SVG viewBox of 0 0 grid grid).
  public let grid: CGFloat
  /// The shapes, bottom first.
  public let paths: [KArtPath]
  private let shapes: [Path]

  public init(grid: CGFloat, paths: [KArtPath]) {
    self.grid = grid
    self.paths = paths
    self.shapes = paths.map(\.path)
  }

  /// Draws the picture into `context`, the grid scaled to fit `size` and centred in it, each shape
  /// in its own colours and widths.
  public func draw(in context: GraphicsContext, size: CGSize) {
    guard let ctx = gridContext(context, size: size) else { return }
    for (shape, p) in zip(shapes, paths) {
      if let fill = p.fill {
        ctx.fill(shape, with: .color(KArtPath.color(fill)))
      }
      if let stroke = p.stroke, p.width > 0 {
        ctx.stroke(shape, with: .color(KArtPath.color(stroke)), style: p.strokeStyle)
      }
    }
  }

  /// Draws the picture as a template: every fill and stroke the art has painted in `tint`, every
  /// stroke width times `strokeScale` (the mood icons: their group's face ink, the size's step).
  public func draw(in context: GraphicsContext, size: CGSize, tint: Color, strokeScale: CGFloat) {
    guard let ctx = gridContext(context, size: size) else { return }
    let paint = GraphicsContext.Shading.color(tint)
    for (shape, p) in zip(shapes, paths) {
      if p.fill != nil {
        ctx.fill(shape, with: paint)
      }
      if p.stroke != nil, p.width > 0, strokeScale > 0 {
        var style = p.strokeStyle
        style.lineWidth = p.width * strokeScale
        ctx.stroke(shape, with: paint, style: style)
      }
    }
  }

  /// `context` moved onto the grid: scaled to fit `size`, centred, clipped to the grid as the
  /// viewBox clips in react-native-svg (nothing past the grid's edge); nil for an empty box.
  private func gridContext(_ context: GraphicsContext, size: CGSize) -> GraphicsContext? {
    guard grid > 0, size.width > 0, size.height > 0 else { return nil }
    var ctx = context
    let scale = min(size.width, size.height) / grid
    ctx.translateBy(x: (size.width - grid * scale) / 2, y: (size.height - grid * scale) / 2)
    ctx.scaleBy(x: scale, y: scale)
    ctx.clip(to: Path(CGRect(x: 0, y: 0, width: grid, height: grid)))
    return ctx
  }
}
