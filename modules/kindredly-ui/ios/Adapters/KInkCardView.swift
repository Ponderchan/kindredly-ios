import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 The InkCard as React Native sees it: <KInkCard theme="midnight">…</KInkCard> on the JS side
 (modules/kindredly-ui/src/InkCard.tsx). This file only turns props into plain values; the card
 itself is Portable/InkCard.swift and knows nothing about Expo.

 The JS name of this view is the struct's name, "KInkCardView" (ExpoUIView names a view with
 String(describing:), @expo/ui ios/UIBaseView.swift:63), hence the K: a bare "InkCardView"
 would be one generic name away from clashing with someone else's. Subclassing
 UIBaseViewProps and registering through ExpoUIView is what gives it testID and the
 @expo/ui modifiers (extending.md, "Creating a SwiftUI view").

 It is a SwiftUI view without a hosting controller of its own, so it MUST sit inside an
 @expo/ui <Host>. Outside one, a dev build shows a RedBox and a release build crashes
 ("Wrap your component with <Host>", expo-modules-core SwiftUIVirtualViewObjC.mm). The JS
 side's <InkCardHost> does the wrapping.

 React Native children (wrapped in <RNHostView> on the JS side) arrive through Children().
 */
final class KInkCardViewProps: UIBaseViewProps {
  /// a key of src/theme/themes.json: classic, midnight, lavender or paper
  @Field var theme: String = "classic"
}

struct KInkCardView: ExpoSwiftUI.View {
  @ObservedObject var props: KInkCardViewProps

  var body: some View {
    // the JS side only passes the four keys (its prop is typed from themes.json), so the
    // Classic fallback is for a theme added to the JSON without regenerating KTheme.swift
    InkCard(theme: KTheme.named(props.theme) ?? .classic) {
      Children()
    }
  }
}
