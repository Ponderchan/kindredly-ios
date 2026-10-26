import { useEffect } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { makeFaceOn } from "../lib/make-face";
import { asFrom } from "../lib/make-face-core";
import { MakeFaceNative } from "../screens/make-face/MakeFaceNative";
import { useMakeFaceModel } from "../screens/make-face/useMakeFaceModel";

/* MAKE YOUR OWN FACE — /make-face?from=onboarding|me[&dob=YYYY-MM-DD][&resume=1] (owner,
   2026-10-26; the design is V1, the easel in a floating card, with V4's word chips).
   A transparent route (app/_layout: presentation transparentModal): the SwiftUI page draws its
   own dim and floating card over the screen it was opened from, and the full-screen done page.
   Swift only, behind the app_surfaces key "makeface" (off by default; lib/make-face makeFaceOn):
   with the switch off or a binary without KMakeFaceView it goes straight back — the doors hide
   themselves the same way, so this is only a guard.

   Params: from = where it was opened (the done page's ground, and who saves the face: Me saves it
   here, onboarding with its profile); dob = onboarding's birthday when the account doesn't hold
   it yet (under 18: words only); resume = opened from the knock ("wren finished your face"). */
export default function MakeFace() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string; dob?: string; resume?: string }>();
  const on = makeFaceOn();

  useEffect(() => {
    if (on) return;
    console.log("[make-face] the switch is off or this binary has no KMakeFaceView; leaving");
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/me" as never);
  }, [on, router]);

  if (!on) return <View style={{ flex: 1 }} />;
  return <MakeFaceFlow from={asFrom(params.from)} dob={typeof params.dob === "string" ? params.dob : null} resume={params.resume === "1"} />;
}

function MakeFaceFlow(p: { from: "onboarding" | "me"; dob: string | null; resume: boolean }) {
  const model = useMakeFaceModel(p);
  return <MakeFaceNative model={model} />;
}
