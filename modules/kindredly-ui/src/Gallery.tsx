import { requireNativeView } from "expo";
import { type StyleProp, type ViewStyle } from "react-native";
import { Host, type CommonViewModifierProps } from "@expo/ui/swift-ui";
// the one table of theme colours; the Swift side reads its generated copy (ios/Portable/KTheme.swift)
import THEMES from "../../../src/theme/themes.json";
import type { KThemeKey } from "./InkCard";

/* THE GALLERY, drawn by SwiftUI (ios/Portable/KGallery.swift): every 10a piece in the module
   (type, both InkCards, SoftGroup, Float, the buttons, the capsules, the Me chips) laid out once
   in the theme you name, on that theme's page colour. Dev only: ui-lab shows it, to check the
   library on a device before screens are built from it.

   It brings its own @expo/ui Host, one for the whole gallery, so it can sit straight in a React
   Native screen. iOS only, and only in a binary built with this module; check
   isKindredlyUIAvailable() first.

   `page="book"` (journal book, 2026-11-10) draws the journal book lab in the gallery's place
   (ios/Portable/Book/KBookLab.swift: every page template of the First Class book, from a built-in
   sample), for src/app/dev/journal-book-lab.tsx. A binary from before the book ignores the prop
   and draws the gallery, so that page asks the module's hasJournalBook() first. */

type NativeGalleryProps = CommonViewModifierProps & {
  theme?: KThemeKey;
  page?: "book";
};

// the view's JS name is the Swift struct's name (ios/Adapters/KGalleryView.swift)
const NativeGallery = requireNativeView<NativeGalleryProps>("KindredlyUI", "KGalleryView");

export type KGalleryHostProps = {
  theme?: KThemeKey;
  /** "book": the journal book lab instead of the gallery (dev) */
  page?: "book";
  /** The outer box: margins. The gallery takes the full width it is given and is as tall as its content. */
  style?: StyleProp<ViewStyle>;
};

/* The Host takes its width from React Native and its height from the gallery (matchContents
   vertical), so it belongs in a scroll view, not in a box of fixed height. Its color scheme
   follows the theme, so the switch in the gallery is drawn for the dark in Midnight. It ignores
   safe areas for the reason InkCardHost does: inside a scroll view, passing under the status bar
   must not nudge it. */
export function KGalleryHost({ theme = "classic", page, style }: KGalleryHostProps) {
  const dark = THEMES.themes[theme].dark;
  return (
    <Host matchContents={{ vertical: true }} colorScheme={dark ? "dark" : "light"} ignoreSafeArea="all" style={style}>
      <NativeGallery theme={theme} page={page} />
    </Host>
  );
}
