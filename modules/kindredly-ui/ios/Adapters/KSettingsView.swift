import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 STUB (step 5, batch 0a). Settings, in the Me stack (src/app/(tabs)/me/settings.tsx), as React
 Native sees it: <KSettingsView … /> on the JS side (modules/kindredly-ui/src/Settings.tsx).

 The "settings-profile" slice replaces this file wholesale with the real adapter and its screen in
 Portable/Settings/. It keeps the two type names, KSettingsView and KSettingsViewProps, because
 KindredlyUIModule.swift already registers them (with the "command" AsyncFunction that feeds
 props.commands) and index.ts already exports the JS wrapper; no screen slice edits either.

 Until then it draws KScreenPlaceholder: the theme's page colour and a few skeleton blocks, no
 words. The real view has no text field.

 Built as every step-5 screen is (KScreenProps.swift): the props subclass KScreenProps (theme,
 letterFont, insets, rev, commands), the view is registered with ExpoUIView, and it MUST sit in an
 @expo/ui <Host>: one Host for the whole screen, never one per row.
 */
final class KSettingsViewProps: KScreenProps {}

struct KSettingsView: ExpoSwiftUI.View {
  @ObservedObject var props: KSettingsViewProps

  var body: some View {
    KScreenPlaceholder(theme: props.kTheme, insets: props.insets)
      .kScreenEnvironment(props)
  }
}
