import { useEffect } from "react";
import { View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { makeFaceHref } from "../../lib/make-face";
import { asFrom } from "../../lib/make-face-core";
import { devStartPainting } from "../../screens/make-face/useMakeFaceModel";

/* dev only — WREN PAINTING, WITHOUT A DRAWING (owner's report, 2026-11-11).
   kindredly:///dev/face-painting                 (from onboarding, painting for 60 s)
   kindredly:///dev/face-painting?from=me&s=20    (from Me, 20 s)

   Opens Make your own face on its "painting" screen, with the knock card, over whatever page is
   under this one: nothing is drawn and nothing is spent (useMakeFaceModel devStartPainting; the
   job ends as "unavailable"). For trying what leaving mid-drawing does — open onboarding on
   screen 5 first (kindredly:///dev/onboarding2?jump=face), then this: "Knock when done" (or
   Leave) should close the page and take the run on to its next screen. It needs the "makeface"
   switch (force it in /ui-lab). */
export default function DevFacePainting() {
  const router = useRouter();
  const { from, s } = useLocalSearchParams<{ from?: string; s?: string }>();
  useEffect(() => {
    if (!__DEV__) return;
    const who = from === "me" ? "me" : asFrom("onboarding");
    const seconds = Math.max(5, Math.min(600, Number(s) || 60));
    devStartPainting(who, seconds * 1000);
    router.replace(makeFaceHref(who) as never);
    // once, on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!__DEV__) return <Redirect href="/" />;
  return <View style={{ flex: 1 }} />;
}
