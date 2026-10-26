import { useEffect, useState } from "react";
import { LaunchFrame } from "../components/LaunchAnimation";
import { NativeSurface } from "../components/NativeSurface";
import { identityOn } from "../lib/identity";
import { surfacesReady, surfacesSettled } from "../lib/surfaces";
import LegacyOnboarding from "../screens/onboarding/legacy/LegacyOnboarding";
import Onboarding2 from "../screens/onboarding/Onboarding2";
import { OnboardingNative } from "../screens/onboarding/OnboardingNative";

/* THE ONBOARDING ROUTE: WHICH RUN (2026-10-19).
   ────────────────────────────────────────────────────────────────────────
   The new onboarding (screens/onboarding/Onboarding2, the storyboard of
   2026-10-18) ships WITH identity Phase 1 — its screen 6 is "you, to a
   stranger" in the new identity, and the owner ruled out a fallback form
   (decision 5). So the route follows the identity switch
   (app_surfaces('identity'), lib/identity):
     on  (or its dev preview, lib/identity setDevIdentityPreview) → the new run;
     off → the old run, exactly as it shipped (screens/onboarding/legacy,
           moved here from this file without a change but its imports).
   Every way in keeps working unchanged: app/index after the launch,
   Settings after a sign-out or a deletion, a deep link.

   DECIDED ONCE, AT MOUNT. The switch can turn while someone is half-way
   through (lib/surfaces asks again at launch and on every return to the
   front); swapping runs under their thumb would throw their answers away.
   So the choice is made when the route mounts and kept until it unmounts —
   but only after this phone's own copy of the table is in memory
   (surfacesReady: a local read of a few milliseconds, never the network),
   so a cold start doesn't pick the old run just because the cache hadn't
   been read yet. While it waits (in practice never: the launch takes far
   longer), the launch's last frame stays up, so nothing blinks.

   TWO RENDERERS OF THE NEW RUN (binary 1.2.6, App Store 1.0.7). NativeSurface picks once, at
   mount ("onboarding" in app_surfaces — OFF by default until the owner has tried it on a
   device — the binary having KOnboardingView, no JS error, no crash strikes):
   - OnboardingNative: SwiftUI, the same run (Onboarding2's useObRun) drawn by KOnboardingView;
   - Onboarding2: the React Native screens, as they shipped: what people see while it is off.
   While the phone's answers and the crash mark are read, the launch's last frame stays up. */
export default function OnboardingRoute() {
  const [which, setWhich] = useState<"new" | "old" | null>(() => (surfacesSettled() ? (identityOn() ? "new" : "old") : null));
  useEffect(() => {
    if (which) return;
    let alive = true;
    void surfacesReady().then(() => {
      if (alive) setWhich(identityOn() ? "new" : "old");
    });
    return () => {
      alive = false;
    };
  }, [which]);
  if (!which) return <LaunchFrame />;
  if (which === "old") return <LegacyOnboarding />;
  return (
    <NativeSurface
      surface="onboarding"
      view="KOnboardingView"
      mode="mount"
      native={(host) => <OnboardingNative host={host} />}
      fallback={() => <Onboarding2 />}
      pending={() => <LaunchFrame />}
    />
  );
}
