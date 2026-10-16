// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE FLOAT, the 10a material for navigation and popovers (tokens-10a.md §7.3): a solid face in
 sf, no outline, and a soft two-layer shadow, 0 10 28 -10 and 0 2 6 -2 in rgba(30,27,53,.45)
 and (…,.18) (P:50, H:117). No blur behind it and no glass: the prompts say "不要毛玻璃", and
 the mock's frosted bar is one of its unrendered leftovers.

 Midnight departs from the mock here. Its sf is only 1.11:1 off the page and no shadow shows on
 a near-black ground, so the mock's float there is a slab with no edge: lists scroll under
 something you can barely see. So in Midnight the shadow is black (KSoftShadow.float(for:)) and
 the face has a 1pt edge in line, drawn inside it like a CSS border, the colour of the theme's
 own dividers. The light themes are drawn as the mock draws them.

 Two sizes of corner: 34 for the tab bar (H:117, 62 tall, set 16 in from the sides and 30 up
 from the bottom) and 20 for a popover (P:50). The float clips what it holds to its shape, as
 the tab bar's overflow:hidden does (the sliding lens stays inside it), and the shadow, drawn
 behind and outside, is not clipped.

 Named KFloat, not Float: a type called Float in this module would hide Swift's own.
 */
public struct KFloat<Content: View>: View {
  /// the two corners the 10a floats have
  public enum Corner: Equatable, Sendable {
    /// 34: the tab bar
    case bar
    /// 20: a popover
    case popover

    public var radius: CGFloat {
      switch self {
      case .bar: return 34
      case .popover: return 20
      }
    }
  }

  private let theme: KTheme
  private let corner: Corner
  private let content: Content

  /// The float is as big as its content; give the content its padding and size (the tab bar is
  /// .frame(height: 62)).
  public init(theme: KTheme, corner: Corner = .popover, @ViewBuilder content: () -> Content) {
    self.theme = theme
    self.corner = corner
    self.content = content()
  }

  public var body: some View {
    let shape = RoundedRectangle(cornerRadius: corner.radius, style: .circular)
    content
      .background(shape.fill(theme.sf))
      .clipShape(shape)
      .overlay {
        // Midnight's edge (see the note at the top); over the content, so nothing inside covers it
        if theme.isDark {
          shape.strokeBorder(theme.line, lineWidth: 1).allowsHitTesting(false)
        }
      }
      .kSoftShadows(KSoftShadow.float(for: theme), in: shape)
  }
}
