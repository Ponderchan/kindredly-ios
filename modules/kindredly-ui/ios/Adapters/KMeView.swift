import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 STUB (step 5, batch 0a). The Me tab (src/app/(tabs)/me/index.tsx), as React Native sees it:
 <KMeView … /> on the JS side (modules/kindredly-ui/src/Me.tsx).

 The "me" slice replaces this file wholesale with the real adapter and its screen in Portable/Me/.
 It keeps the two type names, KMeView and KMeViewProps, because KindredlyUIModule.swift already
 registers them (with the "command" AsyncFunction that feeds props.commands) and index.ts already
 exports the JS wrapper; no screen slice edits either.

 Until then it draws KScreenPlaceholder: the theme's page colour and a few skeleton blocks, no
 words. The real view has no text field.

 Built as every step-5 screen is (KScreenProps.swift): the props subclass KScreenProps (theme,
 letterFont, insets, rev, commands), the view is registered with ExpoUIView, and it MUST sit in an
 @expo/ui <Host>: one Host for the whole screen, never one per row.
 */
final class KMeViewProps: KScreenProps {}

struct KMeView: ExpoSwiftUI.View {
  @ObservedObject var props: KMeViewProps

  var body: some View {
    KScreenPlaceholder(theme: props.kTheme, insets: props.insets)
      .kScreenEnvironment(props)
  }
}
