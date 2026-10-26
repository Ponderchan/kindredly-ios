// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 VISUAL RULE B (owner, 2026-10-26). Controls are flat: no ink outlines, no hard shadows, and the
 primary one is a pen-filled capsule. Physical objects (envelopes, signed cards, the things a
 person could pick up) have no ink edge either; their depth is a hard offset shadow in the deep
 page purple: the same rounded shape again, moved right and down, with no blur.

   light themes  #C9C4F2, offset 6, 6
   dark themes   #3A3580

 Like a CSS box-shadow it takes no room: it hangs outside the frame, and whoever places the
 object leaves room for it. Put it on the object's face: .kObjectDepth(theme) after the fill.
 */
extension View {
  func kObjectDepth(_ theme: KTheme, offset: CGFloat = 6, radius: CGFloat = 20) -> some View {
    background(
      RoundedRectangle(cornerRadius: radius, style: .circular)
        .fill(theme.isDark ? Color(hex: "#3A3580") : Color(hex: "#C9C4F2"))
        .offset(x: offset, y: offset)
    )
  }
}
