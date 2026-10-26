// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE PIECES EVERY 10a SURFACE IS DRAWN WITH. The mock draws its things two ways
 (tokens-10a.md §6, §7):

 - as a STICKER: a face, an outline in ln, and a hard shadow, which is the same shape again in
   ln (or ind), moved right and down, with no blur at all. InkCards, tags, chips and the
   tertiary button are stickers.
 - as a FLOAT: a face with a soft, blurred shadow and no outline (Midnight's has a 1pt edge,
   see KFloat). The tab bar and the round + are floats.

 Shapes follow the CSS: corners are plain circular arcs (RoundedRectangle style .circular), as
 the browser and React Native draw border-radius, not SwiftUI's continuous corners. An outline
 is drawn inside the edge, as a CSS border is. Neither kind of shadow takes room: like
 box-shadow it hangs outside the frame, and whoever places the thing leaves room for it.

 Sizes follow the mock's CSS too. It sets no box-sizing on its tags, chips and buttons, so
 those are content-box: the outline sits outside the padding, and a chip with "padding:8px
 12px; border:2px" starts its text 10 and 14 in. The cards say border-box, and InkCard keeps
 that. Each component's padding below is the mock's, with its outline added where CSS adds it.
 */

/// The mock's motion curves, as the CSS states them.
public enum KMotion {
  /// The + turning to × and back: transform .4s cubic-bezier(.3,1.2,.4,1), a small overshoot (H:119).
  public static let plusTurn = Animation.timingCurve(0.3, 1.2, 0.4, 1, duration: 0.4)
  /// Me chips changing state: transition all .25s cubic-bezier(.3,1.2,.5,1) (H:73).
  public static let chip = Animation.timingCurve(0.3, 1.2, 0.5, 1, duration: 0.25)
  /// A finger going down on a sticker and coming back up. Not in the mock, which has no
  /// pressed states; kept short so it reads as a press, not as an animation.
  public static let press = Animation.easeOut(duration: 0.1)
}

/// A sticker's back layers: the hard shadow, the face, and the outline drawn inside the edge.
/// Put it behind the content with .background { KStickerBackground(…) }.
public struct KStickerBackground<S: InsettableShape>: View {
  let shape: S
  let fill: Color
  let stroke: Color?
  let lineWidth: CGFloat
  let shadow: Color?
  let shadowOffset: CGFloat

  /// - Parameters:
  ///   - stroke: the outline colour, or nil for none (the secondary button has none)
  ///   - shadow: the hard shadow's colour, or nil for none
  ///   - shadowOffset: how far the hard shadow sits right of and below the face
  public init(shape: S, fill: Color, stroke: Color? = nil, lineWidth: CGFloat = 2, shadow: Color? = nil, shadowOffset: CGFloat = 0) {
    self.shape = shape
    self.fill = fill
    self.stroke = stroke
    self.lineWidth = lineWidth
    self.shadow = shadow
    self.shadowOffset = shadowOffset
  }

  public var body: some View {
    ZStack {
      if let shadow, shadowOffset != 0 {
        shape.fill(shadow).offset(x: shadowOffset, y: shadowOffset)
      }
      shape.fill(fill)
      if let stroke, lineWidth > 0 {
        shape.strokeBorder(stroke, lineWidth: lineWidth)
      }
    }
  }
}

/*
 PRESSING A STICKER. The mock has no pressed states, so this is ours, kept small: the face goes
 down onto its own hard shadow, the way a sticker pressed with a finger would, so for the moment
 the finger is down the shadow is hidden under it. It moves 2 or 3 points, the shadow's own
 offset, and comes back when the finger lifts. A sticker with no shadow dips 1 point.

 lift is for a sticker that sits raised: the Me chip that is on is moved up and left 1pt
 (transform: translate(-1px,-1px), H:465). CSS moves its shadow with it, so the shadow is
 drawn shadowOffset - lift from the slot and the face -lift from it.
 */
public struct KStickerButtonStyle<S: InsettableShape>: ButtonStyle {
  let shape: S
  let fill: Color
  let stroke: Color?
  let lineWidth: CGFloat
  let shadow: Color?
  let shadowOffset: CGFloat
  let lift: CGFloat

  public init(shape: S, fill: Color, stroke: Color? = nil, lineWidth: CGFloat = 2, shadow: Color? = nil, shadowOffset: CGFloat = 0, lift: CGFloat = 0) {
    self.shape = shape
    self.fill = fill
    self.stroke = stroke
    self.lineWidth = lineWidth
    self.shadow = shadow
    self.shadowOffset = shadowOffset
    self.lift = lift
  }

  public func makeBody(configuration: Configuration) -> some View {
    let hasShadow = shadow != nil && shadowOffset != 0
    let rest = -lift
    let down = hasShadow ? shadowOffset - lift : 1
    let at = configuration.isPressed ? down : rest
    configuration.label
      .background {
        ZStack {
          shape.fill(fill)
          if let stroke, lineWidth > 0 {
            shape.strokeBorder(stroke, lineWidth: lineWidth)
          }
        }
      }
      .contentShape(shape)
      // only the press offset takes the press spring; a colour or lift change made by the
      // caller (a Me chip being chosen) keeps its own transaction
      .animation(KMotion.press) { $0.offset(x: at, y: at) }
      // drawn after the offset, so it stays where it is while the face moves onto it
      .background {
        if let shadow, hasShadow {
          shape.fill(shadow).offset(x: shadowOffset - lift, y: shadowOffset - lift)
        }
      }
  }
}

/// A float pressed: it sinks a little (scale .94). Also ours; the mock has no pressed states.
public struct KFloatPressStyle: ButtonStyle {
  public init() {}

  public func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .scaleEffect(configuration.isPressed ? 0.94 : 1)
      .animation(KMotion.press, value: configuration.isPressed)
  }
}

/*
 A SOFT SHADOW, as a CSS box-shadow states it: x, y, blur, spread and a colour. SwiftUI's
 .shadow has no spread and draws from the view's own pixels, so it is drawn here instead: the
 shape, grown by the spread (shrunk, for a negative one; RoundedRectangle's corners shrink with
 it, as CSS's do), filled, blurred and moved. CSS's blur is twice the Gaussian's standard
 deviation, which is about what SwiftUI's blur radius is, so the radius here is blur / 2. That
 is the usual conversion and close, not exact; compare on a device.

 The light themes keep the mock's colours (H:117, H:119). Midnight doesn't: in the mock they
 nearly disappear there (tokens-10a.md §7), the float's navy shadow coming out lighter than the
 page and the glows a darker blue than the button they light. So the float's shadow is black in
 Midnight (float(for:), and KFloat gives it an edge), and the glows are drawn in the theme's own
 ind, which in the light themes is the mock's rgba(58,52,214) exactly.
 */
public struct KSoftShadow: Sendable {
  public let x: CGFloat
  public let y: CGFloat
  public let blur: CGFloat
  public let spread: CGFloat
  public let color: Color

  public init(x: CGFloat = 0, y: CGFloat, blur: CGFloat, spread: CGFloat = 0, color: Color) {
    self.x = x
    self.y = y
    self.blur = blur
    self.spread = spread
    self.color = color
  }

  /// The float's two layers in the light themes: 0 10 28 -10 rgba(30,27,53,.45), 0 2 6 -2
  /// rgba(30,27,53,.18) (H:117, P:50).
  public static let float: [KSoftShadow] = [
    KSoftShadow(y: 10, blur: 28, spread: -10, color: Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.45)),
    KSoftShadow(y: 2, blur: 6, spread: -2, color: Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.18)),
  ]

  /// Midnight's float: the same two layers in black at .6 and .35. The mock's navy is lighter
  /// than Midnight's page (its core lands at #161427 on #0F0E1C), so it lit the ground instead of
  /// shading it; black at least darkens what the bar passes over (at the core, 1.14:1 on a card,
  /// against the navy's 1.01:1). No shadow shows much on a near-black page, so KFloat adds a 1pt
  /// edge too.
  public static let floatDark: [KSoftShadow] = [
    KSoftShadow(y: 10, blur: 28, spread: -10, color: Color.black.opacity(0.6)),
    KSoftShadow(y: 2, blur: 6, spread: -2, color: Color.black.opacity(0.35)),
  ]

  /// The float's shadow in this theme: the mock's in the light themes, black in Midnight.
  public static func float(for theme: KTheme) -> [KSoftShadow] {
    theme.isDark ? floatDark : float
  }

  /// The round +'s glow: 0 6 14 -4 in the theme's ind at .55 (H:119: rgba(58,52,214,.55), the
  /// light themes' ind). The mock keeps that indigo in Midnight too, where it glows a darker blue
  /// than the #8E89FF disc it sits under; the theme's ind keeps the glow the button's own light.
  public static func primaryGlow(for theme: KTheme) -> [KSoftShadow] {
    [KSoftShadow(y: 6, blur: 14, spread: -4, color: theme.ind.opacity(0.55))]
  }
}

public extension View {
  /// Draws soft shadows of this shape behind the view, as CSS box-shadow would.
  func kSoftShadows<S: InsettableShape>(_ shadows: [KSoftShadow], in shape: S) -> some View {
    background {
      ZStack {
        ForEach(shadows.indices, id: \.self) { i in
          let s = shadows[i]
          shape
            .inset(by: -s.spread)
            .fill(s.color)
            .blur(radius: s.blur / 2)
            .offset(x: s.x, y: s.y)
        }
      }
      .allowsHitTesting(false)
      .accessibilityHidden(true)
    }
  }
}

/*
 OBJECT DEPTH (owner's rule B, 2026-10-26). Controls are flat. A thing in the story (the Writing
 Aura card, an envelope, a letter preview, the First Class ticket) keeps its depth, but with no
 ink edge: only a hard shadow in a deep tint of the page purple, #C9C4F2 at 6/6 in the light
 themes and #3A3580 in Midnight. A small object takes a smaller offset (6 × its scale). Put it
 after the face's own background. objectDepth in src/components/10a/StickerBox.tsx is the React
 Native twin; change them together.
 */
public enum KObjectDepth {
  public static let offset: CGFloat = 6
  public static let light = Color(hex: "#C9C4F2")
  public static let dark = Color(hex: "#3A3580")

  public static func color(for theme: KTheme) -> Color {
    theme.isDark ? dark : light
  }
}

public extension View {
  /// Rule B's depth for an object: the shape again in the page purple's deep tint, moved right
  /// and down with no blur, behind the view. Like box-shadow it takes no room.
  func kObjectDepth<S: Shape>(_ shape: S, theme: KTheme, offset: CGFloat = KObjectDepth.offset) -> some View {
    background {
      shape.fill(KObjectDepth.color(for: theme))
        .offset(x: offset, y: offset)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
  }
}
