// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 A PHYSICAL OBJECT'S DEPTH (owner, visual rule "B", 2026-10-26) — the convenience forms.
 Controls are flat: no ink outline and no hard shadow. Things that are objects in the hand (the
 Writing Aura card, the share card, the ceremony's envelopes and signed cards) keep their depth
 by a hard offset shadow, no blur, in a deep tint of the page purple (#C9C4F2 light, #3A3580
 Midnight; KObjectDepth and the shape form `kObjectDepth(_:theme:offset:)` live in KSticker.swift).
 Like CSS box-shadow it takes no room; it is decoration, so VoiceOver never sees it.
 */
public extension View {
  /// The object's shadow as a rounded rectangle (the ceremony's cards and envelopes).
  func kObjectDepth(_ theme: KTheme, offset: CGFloat = KObjectDepth.offset, radius: CGFloat = 20) -> some View {
    kObjectDepth(RoundedRectangle(cornerRadius: radius, style: .circular), theme: theme, offset: offset)
  }

  /// The object's shadow in `shape` at the standard offset.
  func kObjectDepth<S: Shape>(_ theme: KTheme, in shape: S) -> some View {
    kObjectDepth(shape, theme: theme, offset: KObjectDepth.offset)
  }

  /// The object's shadow as a rounded rectangle with circular corners (the Aura card).
  func kObjectDepth(_ theme: KTheme, cornerRadius: CGFloat) -> some View {
    kObjectDepth(RoundedRectangle(cornerRadius: cornerRadius, style: .circular), theme: theme, offset: KObjectDepth.offset)
  }
}
