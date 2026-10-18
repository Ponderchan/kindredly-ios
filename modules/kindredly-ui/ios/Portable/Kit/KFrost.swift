// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 A STRANGER'S FROSTED WINDOW (identity Phase 1, FROST v1, variant A: the owner, 2026-10-18).

 Before two people have signed, a stranger is shown as a generated glassine window, never as a
 picture of anyone: a base tone, two soft lights, the SAME faint head-and-shoulders shape for
 everybody (it says "a person" and nothing about which person), a diagonal sheen and a thin white
 edge. There is nothing behind it to unblur, so "strangers never see your face" stays true.

 TS DECIDES, SWIFT DRAWS. Every colour and every position is worked out once, in TypeScript
 (src/lib/frost.ts frostSpec, the same function the web and React Native draw from, locked by
 shared vectors), and arrives here as a KFrostSpec: hexes and positions in units of the window's
 side. Swift never hashes and never picks a colour, so the window someone has on the desk is the
 window they have in the chat, in the orbit and on the web, to the pixel. The adapters read the
 TS FrostSpec into this struct (KFrostRecord in Adapters/KScreenProps.swift).

 GRADIENTS ONLY, NO LIVE BLUR. One window is a handful of gradient fills in a Canvas, so a list
 of fifty costs fifty small drawings, not fifty blur passes. The drawing order is the spec's
 (frost.ts, COORDINATES):
   1. the base fill;
   2. each light: a radial gradient at (x, y), radius r × side, its colour at `alpha` in the
      middle fading to nothing at the radius;
   3. the silhouette: the head, a circle, and the shoulders, an ellipse whose gradient runs along
      both radii (drawn as a circle in a squashed space); white at the silhouette's alpha, flat
      out to `solid` of the radius, then to nothing;
   4. the sheen: white at its alpha in the top-left corner, gone `to` of the way to the
      bottom-right one;
   5. the hairline: a `width`-pt white line at its alpha, inset half its width, its corners
      following the window's.
 Everything is clipped to the window: a square with circular corners at `corner` × side (25%),
 the same radius CSS and react-native-svg draw, so the three platforms' corners agree.

 SMALL WINDOWS (the orbit's 9-12pt faces, the legend's glyph, a chip's 18) draw the base, the
 lights and the hairline only: below KFrostSpec.detailMinPt (20, frost.ts FROST_DETAIL_MIN_PT)
 the silhouette and the sheen are mush. One rule for every place; the size decides it.

 ACCESSIBILITY.
 - Reduce Transparency: a flat tile in the base tone (no lights, no silhouette, no sheen, no
   hairline): the window is still that person's colour.
 - Increase Contrast: a 1.5pt (`edge`) line in the theme's ink at the window's own edge, the
   hairline moved inside it, so the window holds on any page.
 - VoiceOver skips it: the name, the mark and the sign beside it carry who it is.

 THE VEIL (KFrostVeil): a deleted account has no window. With the identity switch on its letters
 show a flat tile, the theme's soft2 with a 1pt hairline in its line, the same for every ghost
 because it claims nothing (React Native's VeilTile draws the same; the switch-off world keeps the
 mosaic veil, KMosaic.veil).

 KFrostPainter.draw is the drawing itself, for any GraphicsContext: the KFrost view calls it, and
 so does the orbit's one Canvas (KOrbit), which draws every stranger in a single pass.
 */

/// One frosted window as TS worked it out (src/lib/frost.ts FrostSpec). Positions and radii are
/// in units of the window's side; (0, 0) is its top-left corner.
public struct KFrostSpec: Equatable, Sendable {
  /// One soft light: a radial gradient at (x, y) with radius r, `color` at `alpha` in the middle.
  public struct Light: Equatable, Sendable {
    public var color: Color
    public var x: CGFloat
    public var y: CGFloat
    public var r: CGFloat
    public var alpha: Double

    public init(color: Color, x: CGFloat, y: CGFloat, r: CGFloat, alpha: Double) {
      self.color = color
      self.x = x
      self.y = y
      self.r = r
      self.alpha = alpha
    }
  }

  /// The shared head: a circle at (x, y), radius r, flat out to `solid` of it.
  public struct Head: Equatable, Sendable {
    public var x: CGFloat
    public var y: CGFloat
    public var r: CGFloat
    public var solid: CGFloat

    public init(x: CGFloat, y: CGFloat, r: CGFloat, solid: CGFloat) {
      self.x = x
      self.y = y
      self.r = r
      self.solid = solid
    }
  }

  /// The shared shoulders: an ellipse at (x, y) with radii rx and ry, flat out to `solid`.
  public struct Shoulders: Equatable, Sendable {
    public var x: CGFloat
    public var y: CGFloat
    public var rx: CGFloat
    public var ry: CGFloat
    public var solid: CGFloat

    public init(x: CGFloat, y: CGFloat, rx: CGFloat, ry: CGFloat, solid: CGFloat) {
      self.x = x
      self.y = y
      self.rx = rx
      self.ry = ry
      self.solid = solid
    }
  }

  /// Below this side (pt) a window draws base, lights and hairline only (frost.ts FROST_DETAIL_MIN_PT).
  public static let detailMinPt: CGFloat = 20

  /// Midnight's tones and the dark silhouette step (for the record: the colours already say it)
  public var dark: Bool
  /// the window's fill, and the whole flat tile under Reduce Transparency
  public var base: Color
  /// the two lights, drawn in this order
  public var lights: [Light]
  /// the silhouette's white
  public var silhouetteAlpha: Double
  public var head: Head
  public var shoulders: Shoulders
  /// the sheen's white in the top-left corner, and how far along the diagonal it lasts
  public var sheenAlpha: Double
  public var sheenTo: CGFloat
  /// the edge: a white line this wide at this alpha
  public var hairlineAlpha: Double
  public var hairlineWidth: CGFloat
  /// the corner radius as a fraction of the side (0.25)
  public var corner: CGFloat
  /// Increase Contrast's ink line, in points (1.5)
  public var edge: CGFloat

  public init(
    dark: Bool,
    base: Color,
    lights: [Light],
    silhouetteAlpha: Double,
    head: Head,
    shoulders: Shoulders,
    sheenAlpha: Double,
    sheenTo: CGFloat,
    hairlineAlpha: Double,
    hairlineWidth: CGFloat,
    corner: CGFloat = 0.25,
    edge: CGFloat = 1.5
  ) {
    self.dark = dark
    self.base = base
    self.lights = lights
    self.silhouetteAlpha = silhouetteAlpha
    self.head = head
    self.shoulders = shoulders
    self.sheenAlpha = sheenAlpha
    self.sheenTo = sheenTo
    self.hairlineAlpha = hairlineAlpha
    self.hairlineWidth = hairlineWidth
    self.corner = corner
    self.edge = edge
  }

  /// The corner radius of a window of this side.
  public func radius(side: CGFloat) -> CGFloat {
    corner * side
  }
}

/// The drawing itself, for any GraphicsContext (the KFrost view's Canvas, the orbit's).
public enum KFrostPainter {
  /// Draws one window into the square centred in `rect`.
  /// - Parameters:
  ///   - flat: Reduce Transparency: the base tone alone
  ///   - detail: the silhouette and the sheen (false below KFrostSpec.detailMinPt)
  ///   - edge: Increase Contrast's ink, or nil
  ///   - opacity: the whole window's opacity (the orbit's arrival fade)
  public static func draw(_ spec: KFrostSpec, in rect: CGRect, context: GraphicsContext, flat: Bool, detail: Bool, edge: Color?, opacity: Double = 1) {
    let side = min(rect.width, rect.height)
    guard side > 0, opacity > 0 else { return }
    let box = CGRect(x: rect.midX - side / 2, y: rect.midY - side / 2, width: side, height: side)
    let radius = spec.radius(side: side)
    let window = Path(roundedRect: box, cornerRadius: radius, style: .circular)

    // a copy: the clip and the opacity stay with this window (copies share the canvas)
    var gc = context
    gc.opacity = opacity
    gc.clip(to: window)
    gc.fill(window, with: .color(spec.base))

    let point = { (x: CGFloat, y: CGFloat) in CGPoint(x: box.minX + x * side, y: box.minY + y * side) }

    if !flat {
      // 2. the two lights
      for light in spec.lights {
        let c = point(light.x, light.y)
        let r = max(0.01, light.r * side)
        gc.fill(
          Path(box),
          with: .radialGradient(
            Gradient(colors: [light.color.opacity(light.alpha), light.color.opacity(0)]),
            center: c,
            startRadius: 0,
            endRadius: r
          )
        )
      }

      if detail {
        // 3. the shared silhouette: flat to `solid`, then gone at the radius
        let white = Color.white
        let a = spec.silhouetteAlpha
        func soft(_ solid: CGFloat) -> Gradient {
          Gradient(stops: [
            .init(color: white.opacity(a), location: 0),
            .init(color: white.opacity(a), location: min(max(solid, 0), 0.999)),
            .init(color: white.opacity(0), location: 1),
          ])
        }
        let head = spec.head
        let hc = point(head.x, head.y)
        let hr = max(0.01, head.r * side)
        gc.fill(
          Path(ellipseIn: CGRect(x: hc.x - hr, y: hc.y - hr, width: 2 * hr, height: 2 * hr)),
          with: .radialGradient(soft(head.solid), center: hc, startRadius: 0, endRadius: hr)
        )
        // the shoulders: a circle of radius rx in a space squashed to ry / rx, so the gradient
        // runs along both radii (an elliptical radial gradient, as SVG and CSS draw it)
        let sh = spec.shoulders
        let sc = point(sh.x, sh.y)
        let rx = max(0.01, sh.rx * side)
        let ry = max(0.01, sh.ry * side)
        var squashed = gc
        squashed.translateBy(x: sc.x, y: sc.y)
        squashed.scaleBy(x: 1, y: ry / rx)
        squashed.fill(
          Path(ellipseIn: CGRect(x: -rx, y: -rx, width: 2 * rx, height: 2 * rx)),
          with: .radialGradient(soft(sh.solid), center: .zero, startRadius: 0, endRadius: rx)
        )

        // 4. the glassine sheen, corner to corner
        gc.fill(
          Path(box),
          with: .linearGradient(
            Gradient(stops: [
              .init(color: white.opacity(spec.sheenAlpha), location: 0),
              .init(color: white.opacity(0), location: min(max(spec.sheenTo, 0.001), 1)),
            ]),
            startPoint: CGPoint(x: box.minX, y: box.minY),
            endPoint: CGPoint(x: box.maxX, y: box.maxY)
          )
        )
      }
    }

    // Increase Contrast: the ink line at the window's own edge, the hairline inside it
    var inset: CGFloat = 0
    if let edge {
      let w = spec.edge
      gc.stroke(
        Path(roundedRect: box.insetBy(dx: w / 2, dy: w / 2), cornerRadius: max(0, radius - w / 2), style: .circular),
        with: .color(edge),
        lineWidth: w
      )
      inset = w
    }

    // 5. the hairline (not on the flat tile: Reduce Transparency is the base tone alone)
    if !flat {
      let w = spec.hairlineWidth
      let d = inset + w / 2
      gc.stroke(
        Path(roundedRect: box.insetBy(dx: d, dy: d), cornerRadius: max(0, radius - d), style: .circular),
        with: .color(Color.white.opacity(spec.hairlineAlpha)),
        lineWidth: w
      )
    }
  }
}

/// A stranger's frosted window, `size` square. Decorative: label the row or button that holds it.
public struct KFrost: View {
  private let theme: KTheme
  private let spec: KFrostSpec
  private let size: CGFloat

  @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
  @Environment(\.colorSchemeContrast) private var contrast

  /// - Parameters:
  ///   - spec: the window, from TS (KFrostRecord)
  ///   - size: its side in points; the corners are 25% of it
  public init(theme: KTheme, spec: KFrostSpec, size: CGFloat) {
    self.theme = theme
    self.spec = spec
    self.size = size
  }

  public var body: some View {
    let flat = reduceTransparency
    let edge: Color? = contrast == .increased ? theme.ink : nil
    let detail = size >= KFrostSpec.detailMinPt
    Canvas { gc, canvas in
      KFrostPainter.draw(spec, in: CGRect(origin: .zero, size: canvas), context: gc, flat: flat, detail: detail, edge: edge)
    }
    .frame(width: size, height: size)
    .accessibilityHidden(true)
  }
}

/// A deleted account's face with the identity switch on: a flat soft2 tile with a 1pt line
/// hairline, the window's shape and corners, the same for every ghost (React Native's VeilTile).
/// Decorative.
public struct KFrostVeil: View {
  private let theme: KTheme
  private let size: CGFloat

  @Environment(\.colorSchemeContrast) private var contrast

  public init(theme: KTheme, size: CGFloat) {
    self.theme = theme
    self.size = size
  }

  public var body: some View {
    let shape = RoundedRectangle(cornerRadius: size * 0.25, style: .circular)
    shape
      .fill(theme.soft2)
      .overlay {
        shape.strokeBorder(contrast == .increased ? theme.ink : theme.line, lineWidth: contrast == .increased ? 1.5 : 1)
      }
      .frame(width: size, height: size)
      .accessibilityHidden(true)
  }
}
