import { Redirect } from "expo-router";
import { View } from "react-native";
import { useAuth } from "../lib/auth";
import { P } from "../theme/post";

/* Entry gate. Splash covers font load; this covers the auth session check.
   Not signed in OR not onboarded → the story. Otherwise → the app. */
export default function Index() {
  const { ready, isGuest, onboarded } = useAuth();
  /* the ground both doors open onto — cream here would flash pale for as long
     as the session check takes, right as the launch screen is fading out */
  if (!ready) return <View style={{ flex: 1, backgroundColor: P.penWash }} />;
  /* isGuest, not !session: with anonymous auth a guest HAS a session, and
     `!session` here would have waved them straight past onboarding into an
     app they had never set up. */
  if (isGuest || !onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/letters" />;
}
