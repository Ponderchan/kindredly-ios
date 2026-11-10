import SwiftUI
import ExpoModulesCore
import ExpoUI

/*
 The gallery as React Native sees it: <KGalleryHost theme="midnight" /> on the JS side
 (modules/kindredly-ui/src/Gallery.tsx), shown on the dev page ui-lab. This file only turns the
 prop into a KTheme; the gallery itself is Portable/KGallery.swift and knows nothing about Expo.

 Built exactly as KInkCardView is (see there for why): the JS name is the struct's name,
 "KGalleryView"; the props subclass UIBaseViewProps and the view is registered with
 ExpoUIView in KindredlyUIModule, which gives it testID and the @expo/ui modifiers; and it MUST
 sit inside an @expo/ui <Host>, which KGalleryHost brings. It has no React Native children.

 The gallery's buttons are SwiftUI's; this file imports ExpoUI, whose own public Button would
 make a bare "Button" here ambiguous, so nothing of that kind is written in this file.

 `page` (journal book, 2026-11-10): "" draws the gallery; "book" draws the journal book lab
 instead (Portable/Book/KBookLab.swift: every template of the First Class book from a built-in
 sample), so that dev page needed no view registration of its own. A binary from before this
 prop ignores it and draws the gallery (src/app/dev/journal-book-lab.tsx says so on the page).
 */
final class KGalleryViewProps: UIBaseViewProps {
  /// a key of src/theme/themes.json: classic, midnight, lavender or paper
  @Field var theme: String = "classic"
  /// "" the gallery; "book" the journal book lab
  @Field var page: String = ""
}

struct KGalleryView: ExpoSwiftUI.View {
  @ObservedObject var props: KGalleryViewProps

  var body: some View {
    // the JS side only passes the four keys (its prop is typed from themes.json), so the
    // Classic fallback is for a theme added to the JSON without regenerating KTheme.swift
    let theme = KTheme.named(props.theme) ?? .classic
    // a Group around the choice, as the other adapters with two bodies have (KReelView)
    Group {
      if props.page == "book" {
        KBookLab(theme: theme)
      } else {
        KGallery(theme: theme)
      }
    }
  }
}
