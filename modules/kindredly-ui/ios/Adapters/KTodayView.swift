import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 STUB (step 5, batch 0a). The Today tab: the desk, its cards and the reply dock
 (src/app/(tabs)/letters.tsx), as React Native sees it: <KTodayView … /> on the JS side
 (modules/kindredly-ui/src/Today.tsx).

 The "today" slice replaces this file wholesale with the real adapter and its screen in
 Portable/Today/. It keeps the two type names, KTodayView and KTodayViewProps, because
 KindredlyUIModule.swift already registers them (with the "command" AsyncFunction that feeds
 props.commands) and index.ts already exports the JS wrapper; no screen slice edits either.

 Until then it draws KScreenPlaceholder: the theme's page colour and a few skeleton blocks, no
 words. The real view holds the reply dock's KField, so the today slice makes it an
 ExpoSwiftUI.FocusableView.

 Built as every step-5 screen is (KScreenProps.swift): the props subclass KScreenProps (theme,
 letterFont, insets, rev, commands), the view is registered with ExpoUIView, and it MUST sit in an
 @expo/ui <Host>: one Host for the whole screen, never one per row.
 */
final class KTodayViewProps: KScreenProps {}

struct KTodayView: ExpoSwiftUI.View {
  @ObservedObject var props: KTodayViewProps

  var body: some View {
    KScreenPlaceholder(theme: props.kTheme, insets: props.insets)
      .kScreenEnvironment(props)
  }
}
