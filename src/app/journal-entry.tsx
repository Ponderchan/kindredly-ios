import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { P, PF } from "../theme/post";
import { SelfCompose } from "../components/SelfCompose";

/* The sealed room's desk — its own page again.

   Merging this with the letter desk was tried and pulled: a journal entry and
   a letter are genuinely different objects (this one has a date, a mood and up
   to nine photos; that one has a stamp, a channel and a floor), so a switch
   between them promised an interchangeability the data model can't honour.
   You'd attach three photos, flip to "drift", and they'd have nowhere to go.

   The ambiguous thought — the one that doesn't know yet where it belongs — is
   served instead by letting a finished entry drift LATER, from its own page in
   Sealed. Choosing up front stops being a verdict once you can change it
   afterwards, and a thought that sits for two days before you release it is
   more this product than one you toggled while typing. */
export default function JournalEntryRoute() {
  const router = useRouter();
  const [text, setText] = useState("");
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/journal"));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, flexDirection: "row", alignItems: "center" }}>
        <Pressable onPress={goBack} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 17, color: P.ink }}>✕</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1.6, color: P.ink }}>JUST FOR ME</Text>
        </View>
        <View style={{ width: 42 }} />
      </View>
      <SelfCompose text={text} setText={setText} onDone={goBack} />
    </SafeAreaView>
  );
}
