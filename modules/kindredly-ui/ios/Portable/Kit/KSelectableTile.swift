// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE SELECTED LOOK of a tile among tiles (H:99, the APPEARANCE swatches; also the Letter font
 tiles, the Notes view switch and the mood picker): a 2pt border, ind when selected and line when
 not, and around a selected tile a 3pt lav halo outside its edge (box-shadow 0 0 0 3px lav). Both
 change over .2s (transition: border-color .2s, box-shadow .2s).

     KSelectableTile(theme: t, selected: key == chosen, cornerRadius: 12, accessibilityLabel: name) {
       pick(key)
     } content: {
       MiniPhone(theme: KTheme.named(key)!)
     }

 KSelectableTile is the button: VoiceOver reads it with the selected trait. For a tile that is
 pressed some other way, .kSelectableTile(theme:selected:cornerRadius:) draws the look alone.
 The tile's own face (its fill, its padding) is the content's; this draws only the border and
 the halo, on top of it and around it. The halo takes no room, like the shadow it is in CSS.
 */
public extension View {
  /// The selected-tile border and halo, drawn around this view's frame.
  func kSelectableTile(theme: KTheme, selected: Bool, cornerRadius: CGFloat) -> some View {
    modifier(KSelectableTileLook(theme: theme, selected: selected, cornerRadius: cornerRadius))
  }
}

struct KSelectableTileLook: ViewModifier {
  let theme: KTheme
  let selected: Bool
  let cornerRadius: CGFloat

  func body(content: Content) -> some View {
    let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .circular)
    content
      .clipShape(shape)
      .overlay(shape.strokeBorder(selected ? theme.ind : theme.line, lineWidth: 2))
      // the halo: 3pt outside the edge, corners grown with it, as CSS spreads a box-shadow
      .background {
        shape
          .inset(by: -3)
          .fill(theme.lav)
          .opacity(selected ? 1 : 0)
      }
      .animation(.easeInOut(duration: 0.2), value: selected)
  }
}

public struct KSelectableTile<Content: View>: View {
  private let theme: KTheme
  private let selected: Bool
  private let cornerRadius: CGFloat
  private let accessibilityLabel: String?
  private let action: () -> Void
  private let content: Content

  /// - Parameters:
  ///   - selected: draw the ind border and the lav halo
  ///   - cornerRadius: the tile's corners (12 for the swatches)
  ///   - accessibilityLabel: what VoiceOver calls the tile, already translated; nil reads the content
  ///   - action: the tile was tapped
  ///   - content: the tile's face, which fills it
  public init(theme: KTheme, selected: Bool, cornerRadius: CGFloat, accessibilityLabel: String? = nil, action: @escaping () -> Void, @ViewBuilder content: () -> Content) {
    self.theme = theme
    self.selected = selected
    self.cornerRadius = cornerRadius
    self.accessibilityLabel = accessibilityLabel
    self.action = action
    self.content = content()
  }

  public var body: some View {
    SwiftUI.Button(action: action) {
      content
        .kSelectableTile(theme: theme, selected: selected, cornerRadius: cornerRadius)
        .contentShape(RoundedRectangle(cornerRadius: cornerRadius, style: .circular))
    }
    .buttonStyle(KFloatPressStyle())
    .accessibilityElement(children: accessibilityLabel == nil ? .combine : .ignore)
    .modifier(KOptionalLabel(label: accessibilityLabel))
    .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
  }
}

/// An accessibility label when there is one.
struct KOptionalLabel: ViewModifier {
  let label: String?

  func body(content: Content) -> some View {
    if let label {
      content.accessibilityLabel(label)
    } else {
      content
    }
  }
}
