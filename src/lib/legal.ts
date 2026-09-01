import * as WebBrowser from "expo-web-browser";
import { P } from "../theme/post";

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

const open = (url: string) =>
  WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    controlsColor: P.pen,
    toolbarColor: P.paper,
  }).catch(() => {
    /* a reader who cannot open the page is not blocked from the app */
  });

export const openTerms = () => open("https://kindredly.io/terms");
export const openPrivacy = () => open("https://kindredly.io/privacy");
