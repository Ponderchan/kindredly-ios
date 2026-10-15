import { requireNativeView } from "expo";
import { useState, type ReactElement, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { Host, RNHostView, type CommonViewModifierProps } from "@expo/ui/swift-ui";
import { createViewModifierEventListener } from "@expo/ui/swift-ui/modifiers";
// the one table of theme colours; the Swift side reads its generated copy (ios/Portable/KTheme.swift)
import THEMES from "../../../src/theme/themes.json";

/* THE INKCARD, drawn by SwiftUI (ios/Portable/InkCard.swift): the 10a card for letters and
   writing, an sf face, a 2.5 ln outline, corners of 28 and a hard 6/6 ln shadow, in the
   theme you name. React Native content sits inside it.

   Two ways in:
   - <InkCardHost theme="…">…</InkCardHost> for a card on its own in a React Native screen. It
     brings its own @expo/ui Host and sizes itself to its content.
   - <KInkCard theme="…"> when the card is one piece of a larger SwiftUI surface that already
     has a Host. A KInkCard OUTSIDE a Host is a RedBox in dev and a CRASH in a release build
     (expo-modules-core SwiftUIVirtualViewObjC.mm, "Wrap your component with <Host>").

   Each Host is a UIHostingController of its own, so one card per Host is right for a single
   card and wrong for a list: a feed of letters wants one Host around the whole SwiftUI list,
   not an InkCardHost per row.

   Both are iOS only, and only in a binary built with this module; check
   isKindredlyUIAvailable() first and fall back to the React Native card otherwise. */

export type KThemeKey = keyof typeof THEMES.themes;

/* what the card takes off each side before its content starts: the 20 padding plus the 2.5
   outline, as border-box lays them out. The same numbers as InkCardMetrics.contentInsets in
   ios/Portable/InkCard.swift; change them together. */
const CONTENT_INSET_X = 20 + 2.5;

type NativeInkCardProps = CommonViewModifierProps & {
  theme?: KThemeKey;
  children?: ReactNode;
};

// the view's JS name is the Swift struct's name (ios/Adapters/KInkCardView.swift)
const NativeInkCard = requireNativeView<NativeInkCardProps>("KindredlyUI", "KInkCardView");

export type KInkCardProps = NativeInkCardProps;

/** The bare SwiftUI card. Only inside an @expo/ui <Host>; see InkCardHost for one that brings its own. */
export function KInkCard({ modifiers, ...rest }: KInkCardProps) {
  return (
    <NativeInkCard
      modifiers={modifiers}
      // lets event modifiers (onTapGesture, onAppear…) reach this view, as @expo/ui's own views do
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
    />
  );
}

export type InkCardHostProps = {
  theme?: KThemeKey;
  /** One React Native element (RNHostView lays out only its first child); wrap several in a View. */
  children: ReactElement;
  /** The outer box: margins, width. The card fills its width, and its shadow hangs 6pt to the right of and below it. */
  style?: StyleProp<ViewStyle>;
};

/* A card on its own in a React Native screen.

   The Host takes its width from React Native and its height from the card (matchContents
   vertical, which is fixed at mount). React Native content inside SwiftUI is measured by
   React Native, and with nothing to stop it a line of text measures as one long line. So the
   card waits one layout pass to learn its own width, then gives the content exactly the width
   left inside the outline and padding, and the text wraps where the card's edge is.

   The Host ignores safe areas for the reason MessageMenu's does: inside a scroll view, a card
   passing under the status bar must not be nudged by its inset. Its color scheme follows the
   theme, so anything system-drawn inside a Midnight card is drawn for the dark. */
export function InkCardHost({ theme = "classic", children, style }: InkCardHostProps) {
  const [width, setWidth] = useState(0);
  const dark = THEMES.themes[theme].dark;
  return (
    <View style={style} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Host matchContents={{ vertical: true }} colorScheme={dark ? "dark" : "light"} ignoreSafeArea="all">
          <KInkCard theme={theme}>
            <RNHostView matchContents>
              <View style={{ width: Math.max(0, width - 2 * CONTENT_INSET_X) }}>{children}</View>
            </RNHostView>
          </KInkCard>
        </Host>
      ) : null}
    </View>
  );
}
