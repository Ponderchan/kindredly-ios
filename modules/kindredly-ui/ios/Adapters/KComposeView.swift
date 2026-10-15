import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 STUB (step 5, batch 0a). The compose page (src/app/compose.tsx), as React Native sees it:
 <KComposeView … /> on the JS side (modules/kindredly-ui/src/Compose.tsx).

 The "compose" slice replaces this file wholesale with the real adapter and its screen in
 Portable/Compose/. It keeps the two type names, KComposeView and KComposeViewProps, because
 KindredlyUIModule.swift already registers them (with the "command" AsyncFunction that feeds
 props.commands) and index.ts already exports the JS wrapper; no screen slice edits either.

 Until then it draws KScreenPlaceholder: the theme's page colour and a few skeleton blocks, no
 words. The real view holds the editor's KField, so the compose slice makes it an
 ExpoSwiftUI.FocusableView.

 Built as every step-5 screen is (KScreenProps.swift): the props subclass KScreenProps (theme,
 letterFont, insets, rev, commands), the view is registered with ExpoUIView, and it MUST sit in an
 @expo/ui <Host>: one Host for the whole screen, never one per row.
 */
final class KComposeViewProps: KScreenProps {}

struct KComposeView: ExpoSwiftUI.View {
  @ObservedObject var props: KComposeViewProps

  var body: some View {
    KScreenPlaceholder(theme: props.kTheme, insets: props.insets)
      .kScreenEnvironment(props)
  }
}
