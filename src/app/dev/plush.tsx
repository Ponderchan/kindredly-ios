import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { unsetFlag } from "../../lib/flags";
import { useTheme } from "../../lib/theme";
import { PlushCelebration } from "../../components/PlushCelebration";

/* dev only — THE PLUSH MOMENT, ON DEMAND (batch 3, 2026-11-09).
   kindredly:///dev/plush

   PlushCelebration shows once ever, the first time Kindreds or Me sees a
   kindred, and sets plush_celebrated. "Show it again" clears that flag and
   mounts it afresh with one kindred, so it rises here; flip the "plush"
   switch on /ui-lab (SWIFT / RN) to see either renderer. "Wear Plush" really
   dresses this phone's bird in Plush (as the moment does); "Keep" leaves her
   as she is. The panel's words are English: a dev page. */
export default function DevPlush() {
  const insets = useSafeAreaInsets();
  const { t: tk } = useTheme();
  const [n, setN] = useState(0);
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, backgroundColor: tk.bg, paddingTop: insets.top + 12, paddingHorizontal: 18 }}>
      <Text style={{ fontWeight: "700", fontSize: 22, color: tk.ink }}>Plush moment · dev</Text>
      <Text style={{ fontSize: 13, color: tk.sub, marginTop: 4 }}>Wear really dresses the bird in Plush. The switch is "plush" on /ui-lab.</Text>
      <Pressable
        onPress={() => void unsetFlag("plush_celebrated").then(() => setN((x) => x + 1))}
        style={({ pressed }) => ({ alignSelf: "flex-start", borderWidth: 2, borderColor: tk.ink, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9, marginTop: 14, opacity: pressed ? 0.6 : 1 })}
      >
        <Text style={{ fontWeight: "600", fontSize: 14, color: tk.ink }}>show it again</Text>
      </Pressable>
      {n > 0 && <PlushCelebration key={n} kindreds={1} />}
    </View>
  );
}
