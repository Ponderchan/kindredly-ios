import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 STUB (step 5, batch 0a). A room with a kindred and a pen-pal chat (one view for both:
 src/app/room/[id].tsx and src/app/chat/[id].tsx), as React Native sees it; the JS wrapper is
 modules/kindredly-ui/src/Conversation.tsx.

 The "chat" slice replaces this file wholesale with the real adapter and its screen in
 Portable/Chat/. It keeps the two type names, KConversationView and KConversationViewProps,
 because KindredlyUIModule.swift already registers them (with the "command" AsyncFunction that
 feeds props.commands) and index.ts already exports the JS wrapper; no screen slice edits either.

 Until then it draws KScreenPlaceholder: the theme's page colour and a few skeleton blocks, no
 words. The real view holds the reply strip's KField, so the chat slice makes it an
 ExpoSwiftUI.FocusableView.

 Built as every step-5 screen is (KScreenProps.swift): the props subclass KScreenProps (theme,
 letterFont, insets, rev, commands), the view is registered with ExpoUIView, and it MUST sit in an
 @expo/ui <Host>: one Host for the whole screen, never one per row.
 */
final class KConversationViewProps: KScreenProps {}

struct KConversationView: ExpoSwiftUI.View {
  @ObservedObject var props: KConversationViewProps

  var body: some View {
    KScreenPlaceholder(theme: props.kTheme, insets: props.insets)
      .kScreenEnvironment(props)
  }
}
