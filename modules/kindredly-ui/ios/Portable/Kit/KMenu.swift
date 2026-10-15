// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE LONG-PRESS MENU, inside the screen's one Host. It replaces MessageMenu's Host + ContextMenu
 + RNHostView per row (MessageMenu.tsx:40-60), the cause of the chat and Kindreds jank: a list
 row is a plain SwiftUI view with .kMenu on it.

     KPersonRow(…)
       .background(theme.bg)                     // so the lifted copy isn't transparent
       .kMenu(row.menu, preview: .rect) { key in onRowAction(row.id, key) }

 What the menu holds stays the caller's (in the React Native app, TS builds the items with
 today's rules: take back only inside two minutes, report only with someone on the other side,
 no menu on gone, demo or Wren rows). This only draws them:
 - .contextMenu with one button per item, a Label of the title and its SF Symbol, the
   destructive ones in red with the destructive role;
 - the lifted preview cut to the row's shape (.contentShape(.contextMenuPreview, …)): a rounded
   rectangle for a bubble, a plain rectangle for a list row (give the row its background first);
 - the same items as VoiceOver actions, so the menu is reachable without a long press.
 An empty list adds no menu and no actions, and the modifier is always applied the same way, so
 a row whose items come and go keeps its identity (an open menu stays open through a live
 update as long as the row's id is stable).

 The tap that closes a menu doesn't fall through to React Native: every Host installs
 SystemMenuTouchGate on its window. Menus are drawn light or dark from the Host's colorScheme.
 */

/// One item of a .kMenu: a title already translated, an SF Symbol, and whether it is destructive.
/// The key comes back to the caller when the item is chosen.
public struct KMenuItem: Identifiable, Equatable, Sendable {
  /// what the caller is told when this item is chosen
  public let key: String
  /// already translated
  public let title: String
  /// an SF Symbol name, e.g. "flag"; "" for none
  public let systemImage: String
  /// drawn red, with the destructive role (report, block, take back)
  public let destructive: Bool

  public var id: String { key }

  public init(key: String, title: String, systemImage: String = "", destructive: Bool = false) {
    self.key = key
    self.title = title
    self.systemImage = systemImage
    self.destructive = destructive
  }
}

/// The shape the lifted copy of a row is cut to.
public enum KMenuPreview: Equatable, Sendable {
  /// a rounded rectangle with this corner radius: a bubble, a card
  case rounded(CGFloat)
  /// a plain rectangle: a full-width list row (give the row a background first)
  case rect
  /// a circle: a face
  case circle

  var shape: AnyShape {
    switch self {
    case let .rounded(radius): return AnyShape(RoundedRectangle(cornerRadius: radius, style: .circular))
    case .rect: return AnyShape(Rectangle())
    case .circle: return AnyShape(Circle())
    }
  }
}

public extension View {
  /// A long-press menu of these items, and the same items as VoiceOver actions. An empty list
  /// adds neither. See the note at the top of KMenu.swift.
  /// - Parameters:
  ///   - items: the menu, in order; [] for none
  ///   - preview: the shape the lifted copy is cut to
  ///   - onAction: an item was chosen, with its key
  func kMenu(_ items: [KMenuItem], preview: KMenuPreview = .rect, onAction: @escaping (String) -> Void) -> some View {
    modifier(KMenuModifier(items: items, preview: preview, onAction: onAction))
  }
}

struct KMenuModifier: ViewModifier {
  let items: [KMenuItem]
  let preview: KMenuPreview
  let onAction: (String) -> Void

  func body(content: Content) -> some View {
    content
      .contentShape(.contextMenuPreview, preview.shape)
      // with no items the menu builder is empty, and SwiftUI shows no menu
      .contextMenu {
        ForEach(items) { item in
          SwiftUI.Button(role: item.destructive ? .destructive : nil) {
            onAction(item.key)
          } label: {
            if item.systemImage.isEmpty {
              Text(item.title)
            } else {
              Label(item.title, systemImage: item.systemImage)
            }
          }
        }
      }
      .accessibilityActions {
        ForEach(items) { item in
          SwiftUI.Button(item.title) { onAction(item.key) }
        }
      }
  }
}
