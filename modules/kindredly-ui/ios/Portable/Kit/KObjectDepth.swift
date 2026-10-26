// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 A PHYSICAL OBJECT'S DEPTH (owner, visual rule "B", 2026-10-26). Controls are flat: no ink
 outline and no hard shadow (a primary is a pen-filled capsule, a secondary a soft-filled one).
 Things that are objects in the hand (the Writing Aura card, the share card) keep their depth,
 but not by an ink edge: they lose the outline and stand on a hard offset shadow, no blur, in a
 deep tint of the page purple:

   light themes      #C9C4F2, 6 right and 6 down
   Midnight (dark)   #3A3580, 6 right and 6 down

 Use it on the object's face, after its fill, so the shadow goes behind:

     content
       .padding(18)
       .background(RoundedRectangle(cornerRadius: 24, style: .circular).fill(theme.sf))
       .kObjectDepth(theme, cornerRadius: 24)

 Like CSS box-shadow, the shadow takes no room: it hangs 6 outside the frame to the right and
 below, so whoever places the object leaves that room (a 16 gutter does). It is decoration:
 VoiceOver never sees it. One modifier for every screen that draws an object (other screens'
 branches use the same name, kObjectDepth); change the numbers here only.
 */
public enum KObjectDepth {
  /// how far the shadow sits right of and below the object
  public static let offset: CGFloat = 6
  /// the light themes' shadow, a deep tint of the page purple
  public static let light = Color(hex: "#C9C4F2")
  /// Midnight's: the same purple, deep enough to read on the near-black page
  public static let dark = Color(hex: "#3A3580")

  /// The shadow's colour in this theme.
  public static func color(for theme: KTheme) -> Color {
    theme.isDark ? dark : light
  }
}

public extension View {
  /// The object's hard purple shadow behind it, in `shape` (KObjectDepth above).
  func kObjectDepth<S: Shape>(_ theme: KTheme, in shape: S) -> some View {
    background {
      shape
        .fill(KObjectDepth.color(for: theme))
        .offset(x: KObjectDepth.offset, y: KObjectDepth.offset)
        .accessibilityHidden(true)
    }
  }

  /// The object's hard purple shadow behind it, as a rounded rectangle with circular corners
  /// (the way CSS and React Native draw them).
  func kObjectDepth(_ theme: KTheme, cornerRadius: CGFloat = 24) -> some View {
    kObjectDepth(theme, in: RoundedRectangle(cornerRadius: cornerRadius, style: .circular))
  }
}
