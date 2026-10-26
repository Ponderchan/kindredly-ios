// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 AN OBJECT'S DEPTH (visual rule "B", owner 2026-10-26).
 Controls are flat: no ink outline and no hard shadow on a chip, a capsule or a button. A thing
 that is a physical object on the page (a ticket, a slip, a stamp card) keeps its depth instead,
 drawn here: no ink edge, and a hard offset shadow in the deep page purple, the same block the
 10a cards drop but never in ink:
   light themes  #C9C4F2, 6 right and 6 down
   dark themes   #3A3580, the same
 The shadow is the object's own shape (a rounded rectangle of `radius`) offset by `offset`, drawn
 behind it; put it on the object after its fill and its clip. Hidden from VoiceOver.

 Shared by every screen that draws an object under rule B. Keep this exact name and signature:
     func kObjectDepth(_ theme: KTheme, offset: CGFloat = 6, radius: CGFloat = 20) -> some View
 */

/// The two depth colours of rule B.
public enum KObjectDepthColor {
  /// the deep page purple on a light theme
  public static let light = Color(hex: "#C9C4F2")
  /// …and on a dark one (Midnight)
  public static let dark = Color(hex: "#3A3580")

  /// the depth colour for `theme`
  public static func of(_ theme: KTheme) -> Color {
    theme.isDark ? dark : light
  }
}

public extension View {
  /// Rule B's depth for a physical object: a hard offset shadow in the deep page purple, no ink
  /// edge. `radius` is the object's corner radius, `offset` how far right and down it falls.
  func kObjectDepth(_ theme: KTheme, offset: CGFloat = 6, radius: CGFloat = 20) -> some View {
    background(
      RoundedRectangle(cornerRadius: radius, style: .circular)
        .fill(KObjectDepthColor.of(theme))
        .offset(x: offset, y: offset)
        .accessibilityHidden(true)
    )
  }
}
