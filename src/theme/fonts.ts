import { useFonts } from "expo-font";

/* v20 typography — Fraunces (serif) + Inter (sans), on the blue-white palette.
   IBM Plex Mono carries the postal system's own voice: counters, dockets,
   dates, numbers. It's the machine talking; the letter itself stays serif.

   The letter itself is READ in Newsreader: a text face, made for long reading
   on a screen. Fraunces stays the display voice — headlines and her italic —
   but its f (a ball terminal, and ligatures that hook over the next letter)
   is a mannerism at 40px in the middle of someone's sentence (owner,
   2026-09-20).

   THE FACES ARE EMBEDDED NOW. The thirteen files in assets/fonts (each named
   by its PostScript name) are listed under the expo-font plugin in app.json,
   so a native build puts them in the app and registers them before any JS
   runs. They used to be imported from the Expo Google Fonts package roots,
   and a root import ships every weight the package has: 68 files, 11.8 MB in
   the 1.2.3 ipa, for 12 faces actually set. The family tokens (theme/post PF,
   theme/tokens F, theme/y2k F2) are the PostScript names, which is what iOS
   knows an embedded font by.

   Italic needs saying twice: fontFamily the italic face AND fontStyle
   "italic". With the faces embedded, iOS groups Fraunces-Italic into the one
   Fraunces family, and React Native picks the face in that family whose
   style matches fontStyle — so the italic face asked for alone comes out
   upright.

   This loader is transitional. A dev client built before this change has
   none of the files embedded, so it still needs them loaded at runtime from
   the same local files, under the same names. On a build that has them,
   expo-font already lists every name as loaded and useFonts returns true on
   the first render without loading anything. Once a build with the embedded
   fonts is verified, this hook and the splash gate in app/_layout.tsx can go. */
export function useAppFonts() {
  return useFonts({
    "Fraunces-Regular": require("../../assets/fonts/Fraunces-Regular.ttf"),
    "Fraunces-SemiBold": require("../../assets/fonts/Fraunces-SemiBold.ttf"),
    "Fraunces-Italic": require("../../assets/fonts/Fraunces-Italic.ttf"),
    "Inter-Regular": require("../../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("../../assets/fonts/Inter-Medium.ttf"),
    "Inter-SemiBold": require("../../assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Bold": require("../../assets/fonts/Inter-Bold.ttf"),
    "Inter-ExtraBold": require("../../assets/fonts/Inter-ExtraBold.ttf"),
    "IBMPlexMono-Regular": require("../../assets/fonts/IBMPlexMono-Regular.ttf"),
    "IBMPlexMono-Medium": require("../../assets/fonts/IBMPlexMono-Medium.ttf"),
    "IBMPlexMono-SemiBold": require("../../assets/fonts/IBMPlexMono-SemiBold.ttf"),
    "Newsreader-Regular": require("../../assets/fonts/Newsreader-Regular.ttf"),
    "Newsreader-Italic": require("../../assets/fonts/Newsreader-Italic.ttf"),
  });
}
