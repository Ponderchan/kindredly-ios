import { useEffect } from "react";
import { View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../lib/theme";
import { devFaceReady } from "../../screens/make-face/useMakeFaceModel";

/* dev only — THE FACE-READY BANNER, WITHOUT A DRAWING (batch 3, slice 4).
   kindredly:///dev/face-ready            (the lav disc: no face known)
   kindredly:///dev/face-ready?id=made-…  (a face Wren made you, from Edit profile's strip)

   Goes back to the tabs and, a moment later, drops "knock knock. your face is done." as a face
   Wren finished would (components/FaceReadyBanner, mounted in the tabs layout): nothing is drawn,
   nothing is spent. Force "faceready" on or off in /ui-lab to see the SwiftUI card or the React
   Native one. See it opens Make your own face (it needs the "makeface" switch). */
export default function DevFaceReady() {
  const router = useRouter();
  const { t: tk } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  useEffect(() => {
    if (!__DEV__) return;
    if (router.canGoBack()) router.back();
    else router.replace("/");
    // not cleared when this page goes: it goes at once, and the banner is for the tabs under it
    setTimeout(() => devFaceReady({ from: "me", avatarId: typeof id === "string" && id.startsWith("made-") ? id : "made-dev" }), 400);
    // once, on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!__DEV__) return <Redirect href="/" />;
  return <View style={{ flex: 1, backgroundColor: tk.bg }} />;
}
