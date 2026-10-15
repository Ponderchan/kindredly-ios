import { Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CloseOfDay } from "../components/CloseOfDay";
import { MONO, PF } from "../theme/post";
import { useP } from "../lib/theme";

/* Dev-only: the close of day on its own, inside a two-page vertical pager
   like the React Native Today's, so the cord's pull can be tried against
   the scroll it has to win over. Reachable at /close-preview; nothing here
   is saved. Painted from the theme like the page it hosts (the page colour
   since 10a step 5: the blind's room is the stack's ground, lav2 only
   behind the glass), so the dev theme switch shows it whole. The SwiftUI
   desk's version of the same test — the blind as a React Native island in
   a Swift ScrollView — is the last page of kindredly:///dev/step5-today
   (and the spike lab's S2). */

export default function ClosePreview() {
  const P = useP(); // above the dev gate, so it runs every render
  const [sealed, setSealed] = useState(false);
  const [held, setHeld] = useState(false);
  const [vh, setVh] = useState(600);
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }} edges={["top"]}>
      <View style={{ flex: 1 }} onLayout={(e) => setVh(e.nativeEvent.layout.height)}>
        <ScrollView pagingEnabled scrollEnabled={!held} showsVerticalScrollIndicator={false} decelerationRate="fast">
          <View style={{ height: vh, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.title, letterSpacing: 1.4, color: P.ink40 }}>THE FIFTEENTH LETTER · SWIPE UP</Text>
          </View>
          <View style={{ height: vh }}>
            <CloseOfDay
              sealed={sealed}
              facts={{ read: 15, replied: 2, waiting: 3 }}
              onSeal={() => setSealed(true)}
              onGrab={setHeld}
            />
            {/* dev only: roll it back up to try the pull again */}
            <Pressable onPress={() => setSealed(false)} style={{ position: "absolute", bottom: 14, alignSelf: "center", padding: 10 }}>
              <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.label, letterSpacing: 1.4, color: P.ink40 }}>ROLL IT BACK UP</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
