import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/auth";
import { LaunchAnimation } from "../components/LaunchAnimation";

/* Entry gate. The native splash covers the font load; the launch piece
   covers the session check — the egg, the hatch, the flight, the mark —
   on the same lavender the splash shows, so nothing flashes. It plays
   once per cold start and holds on the wordmark until the session is
   known; only then, and only after the mark has landed, does it leave.
   Not signed in OR not onboarded → the story. Otherwise → the app. */
export default function Index() {
  const router = useRouter();
  const { ready, isGuest, onboarded } = useAuth();
  const [done, setDone] = useState(false);
  const onDone = useCallback(() => setDone(true), []);
  /* the launch stays on screen, on its last frame, while the next screen
     fades in over it — a Redirect here unmounted it first and left a frame
     of bare lavender before the page arrived.
     isGuest, not !session: with anonymous auth a guest HAS a session, and
     `!session` here would have waved them straight past onboarding into an
     app they had never set up. */
  useEffect(() => {
    if (!ready || !done) return;
    router.replace(isGuest || !onboarded ? "/onboarding" : "/(tabs)/letters");
  }, [ready, done, isGuest, onboarded, router]);
  return <LaunchAnimation ready={ready} onDone={onDone} />;
}
