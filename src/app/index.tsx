import { useCallback, useState } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../lib/auth";
import { LaunchAnimation } from "../components/LaunchAnimation";

/* Entry gate. The native splash covers the font load; the launch piece
   covers the session check — the egg, the hatch, the flight, the mark —
   on the same lavender the splash shows, so nothing flashes. It plays
   once per cold start and holds on the wordmark until the session is
   known; only then, and only after the mark has landed, does it leave.
   Not signed in OR not onboarded → the story. Otherwise → the app. */
export default function Index() {
  const { ready, isGuest, onboarded } = useAuth();
  const [done, setDone] = useState(false);
  const onDone = useCallback(() => setDone(true), []);
  if (!ready || !done) return <LaunchAnimation ready={ready} onDone={onDone} />;
  /* isGuest, not !session: with anonymous auth a guest HAS a session, and
     `!session` here would have waved them straight past onboarding into an
     app they had never set up. */
  if (isGuest || !onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/letters" />;
}
