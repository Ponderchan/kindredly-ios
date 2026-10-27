// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE AURA CARD'S PICTURE, drawn by SwiftUI (2026-10-27, behind the "auraart" switch, off by
 default): the React Native AuraArtSlot (src/components/AuraCard.tsx) and the desk it draws
 (src/components/AuraScene.tsx), for KAuraCard's art slot on Me and in the aura room, instead of
 the React Native island. TS decides everything (src/components/aura-art-model.ts): which
 picture, how far in it sits, and every colour of the desk; this draws it.

 - A PICTURE (one of the fifty: the title's scene in colour once named, its sketch while the name
   forms) is fitted by height, never cover-cropped: as wide as the height allows at 16:9, centred
   on the slot's soft2. On a dark theme it is laid in as a print, 6 in from every edge with
   corners of 8 (auraArtFit).
 - THE DESK (no picture): AuraScene's one drawing on its 357 × 114 box, scaled to cover the slot
   and centred (SVG's xMidYMid slice), at the rung's fidelity: the lines waiting to be written and
   a brass star; a pencil outline with no sun; a one-ink sketch with an outlined sun; colour, on
   the hour's sky (its gradient corner to corner of the box, as objectBoundingBox draws it), with
   two small lights in the corner. The paths are AuraScene's own path data, read by KSVGPath, so
   the two renderers draw the same shapes (the node test checks every one is here, verbatim).
 The slot's corners and the tap are KAuraCard's; this is a picture, hidden from VoiceOver.
 */

/// Every colour the desk is drawn with (TS: aura-art-model nativeDeskPaint); nil for none.
public struct KDeskPaint: Equatable, Sendable {
  public enum Fidelity: String, Equatable, Sendable {
    case lines, pencil, sketch, colour
  }

  public var fidelity: Fidelity = .lines
  /// the colour rung's sky, top-left to bottom-right of the box
  public var sky0: Color?
  public var sky1: Color?
  /// the other rungs' ground
  public var ground = Color.white
  /// the lines rung's waiting lines (at 30% down to 15%) and its star
  public var lines = Color(hex: "#1E1B35")
  public var brass = Color(hex: "#D8A63F")
  /// the figure's one stroke
  public var stroke: Color?
  public var window: Color?
  public var head: Color?
  public var hair: Color?
  public var body: Color?
  public var page: Color?
  /// the sun: drawn or not, its fill and its outline
  public var sun = false
  public var sunFill: Color?
  public var sunStroke: Color?
  /// the colour rung's two small lights
  public var dots: Color?
  public var dotsOpacity: Double = 1

  public init() {}
}

/// What the slot shows (TS: aura-art-model auraArtPlan, nativeDeskPaint).
public struct KAuraArtModel: Equatable, Sendable {
  /// true: `image` fitted by height; false: the desk in `desk`'s paint
  public var picture = false
  /// the picture, nil until resolved (the slot's ground meanwhile)
  public var image: KImageRef?
  /// how far in the picture sits (6 on a dark theme), with corners of 8 when it does
  public var inset: CGFloat = 0
  public var desk = KDeskPaint()

  public init() {}
}

/// The numbers (AuraScene.tsx and aura-art-model.ts; the node test reads these lines).
enum KAuraArtMetrics {
  static let deskWidth: CGFloat = 357
  static let deskHeight: CGFloat = 114
  /// the pictures' 16:9
  static let ratio: CGFloat = 9 / 16
}

/// The Aura card's picture, as large as it is placed (the slot: the card's inside × 110).
public struct KAuraArt: View {
  private let theme: KTheme
  private let art: KAuraArtModel

  public init(theme: KTheme, art: KAuraArtModel) {
    self.theme = theme
    self.art = art
  }

  public var body: some View {
    GeometryReader { g in
      if art.picture {
        let fit = Self.fit(g.size, inset: art.inset)
        KImage(art.image, size: fit, contentMode: .fit, placeholder: .clear)
          .clipShape(RoundedRectangle(cornerRadius: art.inset > 0 ? 8 : 0, style: .circular))
          .frame(width: g.size.width, height: g.size.height)
      } else {
        KAuraDesk(paint: art.desk)
          .equatable()
      }
    }
    .background(theme.soft2)
    .clipped()
    .accessibilityHidden(true)
  }

  /// A picture's size in the slot: fitted by height (rounded as Math.round), never wider than
  /// the slot, `inset` in from every edge (aura-art-model auraArtFit).
  static func fit(_ size: CGSize, inset: CGFloat) -> CGSize {
    let w = min(size.width - 2 * inset, ((size.height - 2 * inset) / KAuraArtMetrics.ratio).rounded())
    guard w > 0 else { return .zero }
    return CGSize(width: w, height: (w * KAuraArtMetrics.ratio).rounded())
  }
}

/// The desk: a window, a desk, someone bent over a page, at the rung's fidelity (AuraScene).
struct KAuraDesk: View, Equatable {
  let paint: KDeskPaint

  // AuraScene's path data, verbatim
  static let star = KSVGPath.path("M296 28l2.6 6.4 6.4 2.6-6.4 2.6-2.6 6.4-2.6-6.4-6.4-2.6 6.4-2.6z")
  static let mullions = KSVGPath.path("M253 14V84M192 49H314")
  static let deskTop = KSVGPath.path("M24 96H334")
  static let hair = KSVGPath.path("M90 46q18 -25 36 0")
  static let body = KSVGPath.path("M75 96q6 -36 33 -36q27 0 33 36")
  static let arm = KSVGPath.path("M127 74q21 4 33 15")
  static let writing = KSVGPath.path("M160 88h28M160 92h19")

  var body: some View {
    Canvas { gc, size in
      draw(in: &gc, size: size)
    }
  }

  private func draw(in gc: inout GraphicsContext, size: CGSize) {
    let W = KAuraArtMetrics.deskWidth
    let H = KAuraArtMetrics.deskHeight
    guard size.width > 0, size.height > 0 else { return }
    // viewBox 0 0 357 114, xMidYMid slice: cover the slot, centred
    let s = max(size.width / W, size.height / H)
    var ctx = gc
    ctx.translateBy(x: (size.width - W * s) / 2, y: (size.height - H * s) / 2)
    ctx.scaleBy(x: s, y: s)

    let p = paint
    // the ground, or the colour rung's sky (an objectBoundingBox gradient from corner to corner:
    // drawn on the unit square and stretched to the box, so its bands lean as SVG's do)
    if p.fidelity == .colour, let a = p.sky0, let b = p.sky1 {
      var unit = ctx
      unit.scaleBy(x: W, y: H)
      unit.fill(Path(CGRect(x: 0, y: 0, width: 1, height: 1)), with: .linearGradient(Gradient(colors: [a, b]), startPoint: .zero, endPoint: CGPoint(x: 1, y: 1)))
    } else {
      ctx.fill(Path(CGRect(x: 0, y: 0, width: W, height: H)), with: .color(p.ground))
    }

    if p.fidelity == .lines {
      // the lines waiting to be written, and one small star
      for (i, line) in [(24.0, 124.0), (38, 84), (52, 106), (66, 54)].enumerated() {
        let rect = CGRect(x: 108, y: CGFloat(line.0), width: CGFloat(line.1), height: 5)
        ctx.fill(Path(roundedRect: rect, cornerRadius: 2.5, style: .circular), with: .color(p.lines.opacity(0.3 - Double(i) * 0.05)))
      }
      ctx.fill(Self.star, with: .color(p.brass))
      return
    }

    // pencil, sketch, colour: the one figure in the rung's paint
    guard let stroke = p.stroke else { return }
    func shape(_ path: Path, fill: Color?, width: CGFloat, cap: CGLineCap = .butt) {
      if let fill { ctx.fill(path, with: .color(fill)) }
      ctx.stroke(path, with: .color(stroke), style: StrokeStyle(lineWidth: width, lineCap: cap, miterLimit: 4))
    }
    shape(Path(roundedRect: CGRect(x: 192, y: 14, width: 122, height: 70), cornerRadius: 3, style: .circular), fill: p.window, width: 1.7)
    shape(Self.mullions, fill: nil, width: 1.16)
    // the pencil rung has no sun yet — it arrives with the sketch
    if p.sun {
      let sun = Path(ellipseIn: CGRect(x: 288 - 10, y: 32 - 10, width: 20, height: 20))
      if let fill = p.sunFill { ctx.fill(sun, with: .color(fill)) }
      if let line = p.sunStroke { ctx.stroke(sun, with: .color(line), lineWidth: 1.7) }
    }
    shape(Self.deskTop, fill: nil, width: 2.55, cap: .round)
    shape(Path(ellipseIn: CGRect(x: 108 - 18, y: 42 - 18, width: 36, height: 36)), fill: p.head, width: 1.7)
    shape(Self.hair, fill: p.hair, width: 1.7)
    shape(Self.body, fill: p.body, width: 1.7)
    shape(Self.arm, fill: nil, width: 2.72, cap: .round)
    shape(Path(CGRect(x: 152, y: 83, width: 52, height: 13)), fill: p.page, width: 1.7)
    shape(Self.writing, fill: nil, width: 1.16)

    if p.fidelity == .colour, let dots = p.dots {
      // two small lights in the corner — stars at night, sun-dust by day
      let c = dots.opacity(p.dotsOpacity)
      ctx.fill(Path(ellipseIn: CGRect(x: 40 - 3, y: 26 - 3, width: 6, height: 6)), with: .color(c))
      ctx.fill(Path(ellipseIn: CGRect(x: 60 - 2, y: 17 - 2, width: 4, height: 4)), with: .color(c))
    }
  }
}
