import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { NativeSurface } from "../../components/NativeSurface";
import { useTheme } from "../../lib/theme";
import { KindredPage } from "../../screens/chat/KindredPage";
import { KindredPageNative } from "../../screens/chat/KindredPageNative";

/* A KINDRED'S PAGE — the room behind the name (10a step 5). The screen is
   screens/chat/KindredPage and its rules screens/chat/kindred-page.
   Reached from the room's and the chat's header and from a Kindreds row's
   long press.

   2026-10-27: it is drawn in Swift too (screens/chat/KindredPageNative,
   KKindredPageView), behind the "kindredpage" switch (OFF by default,
   lib/surfaces), with the React Native page as the fallback, unchanged
   (NativeSurface in mount mode: the held signature's card must not lose
   its page). */
export default function KindredRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t: tk } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <NativeSurface surface="kindredpage" view="KKindredPageView" mode="mount" native={() => <KindredPageNative id={id} />} fallback={() => <KindredPage id={id} />} />
    </View>
  );
}
