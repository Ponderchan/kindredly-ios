// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE TRACE TRAY: the room's + opens it in the keyboard's place (the software keyboard's last
 height, or 260 above the home indicator before any), never shorter than its 2x2 grid of cards
 at their least height (an SE's keyboard is 216 or 260 with no home inset: the grid needs 275);
 on soft with a line on top; the four choices as KChoiceCards two by two, 10 apart, inset 12 (a
 fold, a question, a moment, a song); larger Dynamic Type scrolls inside. It rises on the
 composer sheet's curve, a plain ease with Reduce Motion (KChatMotion.tray). Choosing closes it;
 the owner hears the key. Focusing a field closes it too (KChatDockView). VoiceOver's escape
 (two-finger Z) on a card closes it, rather than going back out of the room.
 */
struct KChatTray: View {
  let theme: KTheme
  let traces: [KChatTrace]
  let bottomInset: CGFloat
  @ObservedObject var driver: KConversationDriver
  let actions: KConversationActions
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// the grid's 12 inset above and below
  private static let inset: CGFloat = 12
  /// between the cards and the rows
  private static let gap: CGFloat = 10

  /// The tray's height: the keyboard's, and never less than the whole grid (two rows of cards at
  /// their least height, outline included, the gap, the inset, the line on top, the home inset).
  static func height(lastKeyboard: CGFloat, bottomInset: CGFloat) -> CGFloat {
    let keyboard = lastKeyboard > 0 ? lastKeyboard : 260 + bottomInset
    let grid = 2 * (KChoiceCard.minimumContentHeight + 4) + gap + 2 * inset + 1 + bottomInset
    return max(keyboard, grid)
  }

  var body: some View {
    if driver.trayOpen && !traces.isEmpty {
      VStack(spacing: 0) {
        Rectangle()
          .fill(theme.line)
          .frame(height: 1)
        ScrollView {
          KChoiceGrid(traces, spacing: Self.gap) { trace in
            KChoiceCard(theme: theme, title: trace.title, subtitle: trace.subtitle, glyph: trace.glyph) {
              select(trace.key)
            }
          }
          // the cards' hard shadows hang 3 outside
          .padding(.trailing, 3)
          .padding(Self.inset)
          .padding(.bottom, bottomInset)
        }
        .scrollBounceBehavior(.basedOnSize)
      }
      .frame(height: Self.height(lastKeyboard: driver.lastKeyboardHeight, bottomInset: bottomInset))
      .background(theme.soft)
      .transition(reduceMotion ? .opacity : .move(edge: .bottom).combined(with: .opacity))
      .accessibilityElement(children: .contain)
      .accessibilityAction(.escape) { close() }
    }
  }

  private func select(_ key: String) {
    close()
    actions.onTrace(key)
  }

  private func close() {
    withAnimation(KChatMotion.tray(reduceMotion: reduceMotion)) { driver.trayOpen = false }
  }
}
