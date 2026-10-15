// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE PIECES EVERY 10a SURFACE IS DRAWN WITH. The mock draws its things two ways
 (tokens-10a.md §6, §7):

 - as a STICKER: a face, an outline in ln, and a hard shadow, which is the same shape again in
   ln (or ind), moved right and down, with no blur at all. InkCards, tags, chips and the
   tertiary button are stickers.
 - as a FLOAT: a face with a soft, blurred shadow and no outline. The tab bar and the round +
   are floats.

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

 The colours are the mock's, fixed and not themed (H:117, H:119), so they nearly disappear in
 Midnight, as they do in the mock (tokens-10a.md §7).
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

  /// The float's two layers: 0 10 28 -10 rgba(30,27,53,.45), 0 2 6 -2 rgba(30,27,53,.18)
  /// (H:117, P:50).
  public static let float: [KSoftShadow] = [
    KSoftShadow(y: 10, blur: 28, spread: -10, color: Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.45)),
    KSoftShadow(y: 2, blur: 6, spread: -2, color: Color(.sRGB, red: 30 / 255, green: 27 / 255, blue: 53 / 255, opacity: 0.18)),
  ]

  /// The round +'s indigo glow: 0 6 14 -4 rgba(58,52,214,.55) (H:119). The mock keeps the
  /// light theme's indigo in Midnight too.
  public static let primaryGlow: [KSoftShadow] = [
    KSoftShadow(y: 6, blur: 14, spread: -4, color: Color(.sRGB, red: 58 / 255, green: 52 / 255, blue: 214 / 255, opacity: 0.55)),
  ]
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
