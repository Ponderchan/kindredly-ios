import { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { LaunchFrame } from "../components/LaunchAnimation";

/* A LINK THE APP DOESN'T KNOW (batch 3, 2026-11-09). Without this route,
   expo-router answers any unknown kindredly:// address with its built-in
   Unmatched Route page — the developer's error screen, which is what a
   person once saw after tapping a sign-in link (app/auth-callback has the
   story). An old link, a mistyped one, a release's link this build doesn't
   carry: none of them is an error to the reader, so this sends them where
   the entry gate (app/index) would, without the launch playing again —
   signed in and set up → Today; a guest or someone not yet set up → the
   onboarding. dismissTo goes back to that screen if it is already under
   this one (a link tapped while the app was open), and replaces this one
   with it otherwise (a cold start from the link).

   It waits only for the session to be known (lib/auth: a local read).
   On a cold start that wait shows the launch's last frame, the colour the
   splash just left, and the next screen fades in over it as it does after
   the launch; with the app already open it is the page colour for a frame. */
export default function NotFound() {
  const router = useRouter();
  const { ready, isGuest, onboarded } = useAuth();
  const { t: tk } = useTheme();
  const [cold] = useState(() => !ready);

  useEffect(() => {
    if (!ready) return;
    router.dismissTo(isGuest || !onboarded ? "/onboarding" : "/(tabs)/letters");
  }, [ready, isGuest, onboarded, router]);

  return cold ? <LaunchFrame /> : <View style={{ flex: 1, backgroundColor: tk.bg }} />;
}
