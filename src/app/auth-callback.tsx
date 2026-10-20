import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { P, PFM } from "../theme/post";
import { t, useLang } from "../lib/i18n";

/* WHERE THE MAGIC LINK LANDS. The deep-link listener in lib/auth does the
   actual code-for-session exchange the moment the URL arrives; this screen
   exists so that arrival has somewhere to BE. Without it, expo-router met
   kindredly://auth-callback with its unmatched-route page — a person tapped
   a sign-in link and was shown an error while the sign-in quietly succeeded
   underneath it. This holds the door for a few seconds, then hands over to
   the entry gate either way: signed in → the app; not → onboarding, where
   they can simply try again. */
export default function AuthCallback() {
  useLang();
  const { t: tk, dark } = useTheme();
  const { ready, isGuest, refresh } = useAuth();
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    // the anonymous → email-attach path confirms server-side without a new
    // code; a refresh picks the upgraded session up
    void refresh();
    const timer = setTimeout(() => setWaited(true), 4000);
    return () => clearTimeout(timer);
  }, [refresh]);

  if (ready && !isGuest) return <Redirect href="/" />;
  if (waited) return <Redirect href="/" />;
  /* the light themes keep the wash this page has always had; Midnight paints
     its own page, or the hop from Safari back into a dark app flashed
     lavender (under a light status bar it couldn't carry) */
  return (
    <View style={{ flex: 1, backgroundColor: dark ? tk.bg : P.penWash, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ ...PFM.mono, fontSize: 12, letterSpacing: 1.4, color: dark ? tk.sub : P.ink60 }}>{t("cb.line")}</Text>
    </View>
  );
}
