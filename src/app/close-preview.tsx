import { Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CloseOfDay } from "../components/CloseOfDay";
import { P, PF } from "../theme/post";

/* Dev-only: the close of day on its own, inside a two-page vertical pager
   like Today's, so the cord's pull can be tried against the scroll it has
   to win over. Reachable at /close-preview; nothing here is saved. */

export default function ClosePreview() {
  if (!__DEV__) return <Redirect href="/" />;
  const [sealed, setSealed] = useState(false);
  const [held, setHeld] = useState(false);
  const [vh, setVh] = useState(600);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
      <View style={{ flex: 1 }} onLayout={(e) => setVh(e.nativeEvent.layout.height)}>
        <ScrollView pagingEnabled scrollEnabled={!held} showsVerticalScrollIndicator={false} decelerationRate="fast">
          <View style={{ height: vh, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 1.4, color: P.ink40 }}>THE FIFTEENTH LETTER · SWIPE UP</Text>
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
              <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 1.4, color: P.ink40 }}>ROLL IT BACK UP</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
