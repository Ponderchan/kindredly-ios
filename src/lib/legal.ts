import { Appearance } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { P } from "../theme/post";
import { THEMES } from "../theme/themes";

/* THE LEGAL PAGES OPEN INSIDE THE APP.
   ────────────────────────────────────────────────────────────────────────
   Terms and Privacy have to be links — Apple requires a live URL, and a
   page that ships inside the binary can't be corrected without a release.
   But Linking.openURL hands the reader to Safari and does not hand them
   back, which on the PAYWALL means losing someone at the exact moment they
   were deciding to pay. openBrowserAsync keeps the page in a sheet over
   the app: same URL, same freshness, and Done returns you to where you
   were. Dressed in the app's own paper so it doesn't arrive as a foreign
   window. */

/* AND IN MIDNIGHT'S PAPER AT NIGHT. A fixed white bar came up over Midnight
   as a white slab, and the old pen Done is 2.5:1 once Safari's chrome goes
   dark. These are plain functions (the paywall hands one straight to
   onPress), so they ask the window instead of the theme: lib/theme sets the
   window's light or dark from the theme in effect, and SFSafariViewController
   draws its own URL text and buttons by that same window, so a bar chosen by
   it always matches the type Safari puts on it. Dark → Midnight's sheet face
   and accent (Done 5.9:1 on it); light → the white and the pen it has always
   had, in Classic, Lavender and Paper alike. */
const NIGHT = THEMES.midnight; // the one dark theme (theme/themes)
const barColours = () =>
  Appearance.getColorScheme() === "dark"
    ? { controlsColor: NIGHT.ind, toolbarColor: NIGHT.sf }
    : { controlsColor: P.pen, toolbarColor: P.paper };

const open = (url: string) =>
  WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    ...barColours(),
  }).catch(() => {
    /* a reader who cannot open the page is not blocked from the app */
  });

export const openTerms = () => open("https://kindredly.io/terms");
export const openPrivacy = () => open("https://kindredly.io/privacy");
