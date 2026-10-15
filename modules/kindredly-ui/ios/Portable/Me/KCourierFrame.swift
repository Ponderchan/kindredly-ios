// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE COURIER'S FRAME (10a, H:75 with the owner's decisions): the courier's live scene — her
 hour's sky, the globe, her skin and accessory, hunger's grey, her day off; the app's own
 CourierCard, drawn by React Native and handed in as an island (owner: the animation stays
 React Native) — inside the 10a frame: a 2.5 ln outline, corners 24, a 5/5 ln hard shadow,
 everything clipped to the corners, the theme's sf face below the scene.

 THE TAP IS SWIFTUI'S. A plain Button lies over the scene and its band (and only those), so a
 drag that starts on the card scrolls the page and opens nothing — an RN Pressable inside a
 SwiftUI scroll view keeps its press across a scroll. The island takes no touches and is hidden
 from VoiceOver: the button is the one element, reading `a11yLabel` (her name, the time, her
 line, and what the tap does — on her day off, the game). What comes under the scene (the
 keepsakes block) has buttons of its own, outside the overlay, so a keepsake tap never opens
 her room (critic).

 While the island is on its way (the card was just shown, TS fills it a frame later) the scene's
 room is held at `sceneHeight` on soft2, so nothing below jumps.
 */
public struct KCourierFrame<Scene: View, Footer: View>: View {
  /// the frame's corners (H:75)
  public static var corner: CGFloat { 24 }
  /// its outline
  public static var line: CGFloat { InkCardMetrics.borderWidth }

  private let theme: KTheme
  private let a11yLabel: String
  private let sceneHeight: CGFloat
  private let onTap: () -> Void
  private let scene: Scene
  private let footer: Footer

  /// - Parameters:
  ///   - a11yLabel: the one sentence VoiceOver reads for the card
  ///   - sceneHeight: the scene's height (the island is drawn this tall)
  ///   - onTap: the scene was tapped
  ///   - scene: the courier's live scene, as wide as the frame's inside
  ///   - footer: what sits under the scene, inside the frame (the keepsakes)
  public init(theme: KTheme, a11yLabel: String, sceneHeight: CGFloat, onTap: @escaping () -> Void, @ViewBuilder scene: () -> Scene, @ViewBuilder footer: () -> Footer) {
    self.theme = theme
    self.a11yLabel = a11yLabel
    self.sceneHeight = sceneHeight
    self.onTap = onTap
    self.scene = scene()
    self.footer = footer()
  }

  public var body: some View {
    let shape = RoundedRectangle(cornerRadius: Self.corner, style: .circular)
    VStack(spacing: 0) {
      scene
        .frame(maxWidth: .infinity)
        .frame(height: sceneHeight)
        .background(theme.soft2)
        .clipped()
        .accessibilityHidden(true)
        .overlay {
          SwiftUI.Button(action: onTap) {
            Color.clear
              .contentShape(Rectangle())
          }
          .buttonStyle(KCourierPressStyle(tint: theme.ln))
          .accessibilityLabel(a11yLabel)
        }
      footer
    }
    .padding(Self.line)
    .background(theme.sf)
    .clipShape(shape)
    .overlay(shape.strokeBorder(theme.ln, lineWidth: Self.line))
    .background {
      // the hard shadow, which takes no room (as box-shadow), behind the clipped frame
      shape
        .fill(theme.ln)
        .offset(x: InkCardVariant.me.shadowOffset, y: InkCardVariant.me.shadowOffset)
    }
    .accessibilityElement(children: .contain)
  }
}

/// The scene dims a little under the finger (CourierCard's own .94): a 6% veil of the theme's
/// line colour over it.
struct KCourierPressStyle: ButtonStyle {
  let tint: Color

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .background(tint.opacity(configuration.isPressed ? 0.06 : 0))
      .animation(KMotion.press, value: configuration.isPressed)
  }
}
