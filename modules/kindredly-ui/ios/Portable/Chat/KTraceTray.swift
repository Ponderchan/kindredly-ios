// Portable: this file imports SwiftUI only, so the 1.1.0 pure-Swift app can take it as is.

import SwiftUI

/*
 THE TRACE TRAY: the room's + opens it in the keyboard's place (the last keyboard height seen, or
 260 above the home indicator before any), on soft with a line on top; the four choices as
 KChoiceCards two by two, 10 apart, inset 12 (a fold, a question, a moment, a song). It rises on
 the composer sheet's curve, a fade with Reduce Motion. Choosing closes it; the owner hears the
 key. Focusing a field closes it too (KChatDockView).
 */
struct KChatTray: View {
  let theme: KTheme
  let traces: [KChatTrace]
  let bottomInset: CGFloat
  @ObservedObject var driver: KConversationDriver
  let actions: KConversationActions
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  var body: some View {
    if driver.trayOpen && !traces.isEmpty {
      let height = driver.lastKeyboardHeight > 0 ? driver.lastKeyboardHeight : 260 + bottomInset
      VStack(spacing: 0) {
        Rectangle()
          .fill(theme.line)
          .frame(height: 1)
        ScrollView {
          KChoiceGrid(traces) { trace in
            KChoiceCard(theme: theme, title: trace.title, subtitle: trace.subtitle, glyph: trace.glyph) {
              select(trace.key)
            }
          }
          // the cards' hard shadows hang 3 outside
          .padding(.trailing, 3)
          .padding(12)
          .padding(.bottom, bottomInset)
        }
        .scrollBounceBehavior(.basedOnSize)
      }
      .frame(height: height)
      .background(theme.soft)
      .transition(reduceMotion ? .opacity : .move(edge: .bottom).combined(with: .opacity))
      .accessibilityElement(children: .contain)
    }
  }

  private func select(_ key: String) {
    withAnimation(KChatMotion.panelRise) { driver.trayOpen = false }
    actions.onTrace(key)
  }
}
