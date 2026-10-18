import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Redirect, useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { WARDROBE_SLIP, setFlag, unsetFlag } from "../../lib/flags";
import { WardrobeSlip } from "../../screens/today/WardrobeSlip";
import { FONT, OB } from "../../screens/onboarding/parts/tokens";

/* dev only — THE FIRST ARRIVAL'S WARDROBE SLIP, ON ITS OWN.
   kindredly:///dev/wardrobe-slip

   The new onboarding's run ends by setting WARDROBE_SLIP and opening Today,
   where the slip floats over the desk (screens/today/WardrobeSlip). A DEMO
   run ends back at its dev entry instead and sets no flags, so the slip can
   be looked at here:
   · the slip in DEMO, over a stand-in desk: it opens the real sheet (the
     WardrobeRack, everything tries on, the fare for a First Class piece),
     but Keep only logs — the phone's bird is never dressed and the flag is
     never read or cleared;
   · "on the demo Today": sets this phone's WARDROBE_SLIP flag and opens the
     Today desk on fixtures (dev/step5-today), to see where it sits over the
     real desk. That one is the real slip: open it and close it, but don't
     Keep there (it would dress this phone's bird). Opening or closing it
     clears the flag; "clear the flag" does too. */
export default function DevWardrobeSlip() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [n, setN] = useState(0); // remount the demo slip after it was put away
  if (!__DEV__) return <Redirect href="/" />;
  const btn = (label: string, onPress: () => void) => (
    <Pressable onPress={onPress} style={({ pressed }) => ({ borderWidth: 2, borderColor: OB.ink, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9, marginRight: 8, marginTop: 8, opacity: pressed ? 0.6 : 1 })}>
      <Text style={{ fontFamily: FONT.semi, fontSize: 14, color: OB.ink }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flex: 1, backgroundColor: OB.shell, paddingTop: insets.top + 12, paddingHorizontal: 18 }}>
      <StatusBar style="dark" />
      <Text style={{ fontFamily: FONT.head, fontSize: 24, color: OB.ink }}>Wardrobe slip · dev</Text>
      <Text style={{ fontFamily: FONT.body, fontSize: 13, color: OB.inkSoft, marginTop: 4 }}>DEMO below: Keep only logs. The demo Today shows the real slip (don't Keep there).</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
        {btn("show the demo slip again", () => setN((x) => x + 1))}
        {btn("on the demo Today (sets the flag)", () => void setFlag(WARDROBE_SLIP).then(() => router.push("/dev/step5-today" as Href)))}
        {btn("clear the flag", () => void unsetFlag(WARDROBE_SLIP))}
      </View>
      {/* a stand-in for the desk's card */}
      <View style={{ marginTop: 18, flex: 1, marginBottom: 190, borderRadius: 20, borderWidth: 3, borderColor: OB.ink, backgroundColor: OB.paper }} />
      <WardrobeSlip key={n} demo bottom={110} />
    </View>
  );
}
