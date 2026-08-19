import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path, Rect } from "react-native-svg";
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

  /* Same guard as the letter desk, minus the draft. A sealed page has no
     draft shelf — and it shouldn't get one here: this room's whole promise is
     that nothing leaves it, so a half-written page either becomes an entry or
     it never existed. Two ways out, and the accidental tap is the default. */
  const closeWithGuard = () => {
    if (!text.trim()) return goBack();
    Alert.alert("Leave this page?", "You've written something. Nothing is saved until you seal it.", [
      { text: "Keep writing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: goBack },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      {/* One line, not two. The date was a headline of its own below the
          header, which gave the page two beginnings — and a date is a label,
          not a title. It sits with the close button; the promise sits opposite
          it. */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 12, paddingRight: 20, paddingTop: 6, paddingBottom: 10 }}>
        <Pressable onPress={closeWithGuard} hitSlop={10} style={{ width: 34, height: 38, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 17, color: P.ink }}>✕</Text>
        </Pressable>
        <Text style={{ fontFamily: PF.letter, fontSize: 22, fontWeight: "700", color: P.ink, marginLeft: 6 }}>
          {new Date().toLocaleString("en-US", { month: "short", day: "numeric" }).toLowerCase()}
        </Text>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Svg width={12} height={12} viewBox="0 0 12 12">
            <Path d="M3.7 5.6V4.1a2.3 2.3 0 0 1 4.6 0v1.5" fill="none" stroke={P.ink40} strokeWidth={1.3} strokeLinecap="round" />
            <Rect x={2.5} y={5.6} width={7} height={5} fill={P.ink40} />
          </Svg>
          <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 1.4, color: P.ink40 }}>JUST FOR ME</Text>
        </View>
      </View>
      <SelfCompose text={text} setText={setText} onDone={goBack} />
    </SafeAreaView>
  );
}
