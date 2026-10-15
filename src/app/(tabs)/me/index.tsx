import { View } from "react-native";
import { useTheme } from "../../../lib/theme";
import { NativeSurface } from "../../../components/NativeSurface";
import { PlushCelebration } from "../../../components/PlushCelebration";
import { useMeModel } from "../../../screens/me/useMeModel";
import { MeNative } from "../../../screens/me/MeNative";
import { MeRN } from "../../../screens/me/MeRN";
import "../../../data/strings-step5-me";

/* THE ME TAB (10a step 5). A mirror, not a profile: who you are here (the
   pen name, the day you joined, the two figures), the courier growing
   beside you and what she has kept, how you sound (the writing aura), the
   stamps you have put on your letters, and First Class.

   This route only chooses who draws it. The model (screens/me: useMeModel
   over the pure me-model) knows everything — every word, figure, card and
   destination — and both renderers draw exactly its view:
   - MeNative: SwiftUI, one Host for the whole screen (KMeView), with the
     avatar, the courier's scene and the aura's picture as React Native
     islands;
   - MeRN: the React Native page, the remote switch's fallback.
   NativeSurface picks between them ("me" in app_surfaces, the binary
   having the view, no JS error, no crash strikes) in live mode: a flip
   reaches a running app, but only while the tab isn't on show.

   The Plush moment (once ever, at the first kindred) is a React Native
   Modal above either. The sliders push /me/settings and the pencil
   /me/edit-profile, in this tab's own stack (me/_layout). */
export default function MeTab() {
  const { t: tk } = useTheme();
  const model = useMeModel();

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <NativeSurface surface="me" view="KMeView" mode="live" native={() => <MeNative model={model} />} fallback={() => <MeRN model={model} />} />
      <PlushCelebration kindreds={model.kindreds} />
    </View>
  );
}
