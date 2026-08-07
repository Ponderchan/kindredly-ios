import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { C, F, cardStyle } from "../theme/tokens";
import { Wren } from "../components/Wren";
import { dLong } from "../lib/format";
import { loadKept, unkeep, type KeptPassage } from "../lib/kept";

/* Kept — "The lines you didn't want to cool." (web framing). Local-only. */
export default function KeptScreen() {
  const router = useRouter();
  const [kept, setKept] = useState<KeptPassage[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadKept().then((k) => {
        setKept(k);
        setLoaded(true);
      });
    }, []),
  );

  const FROM_LABEL: Record<KeptPassage["from"], string> = {
    morning: "a morning page",
    letter: "a stranger's letter",
    thread: "a correspondence",
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 26, color: C.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: F.serif, fontSize: 19, color: C.ink }}>Kept</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.muted, lineHeight: 22 }}>
          The lines you didn't want to cool. Conversations get sealed away — kept lines stay.
        </Text>

        {kept.map((k) => (
          <View key={k.id} style={[cardStyle, { padding: 20, marginTop: 14 }]}>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 17, lineHeight: 27, color: C.ink }}>“{k.text}”</Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <Text style={{ fontFamily: F.sans, fontSize: 11.5, color: C.faint }}>
                from {k.who || FROM_LABEL[k.from]} · {dLong(k.date)}
              </Text>
              <Pressable onPress={async () => setKept(await unkeep(k.id))} hitSlop={8}>
                <Text style={{ fontFamily: F.sansBold, fontSize: 11.5, color: C.faint }}>let it cool</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {loaded && kept.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <Wren size={40} mode="line" color={C.faint} />
            <Text style={{ fontFamily: F.serifSemi, fontSize: 20, color: C.ink, marginTop: 16 }}>Nothing kept yet.</Text>
            <Text style={{ fontFamily: F.sans, fontSize: 13, lineHeight: 20, color: C.muted, marginTop: 8, textAlign: "center", maxWidth: 280 }}>
              Tap the ♡ on a morning page or a letter, and the line stays here — even after the thread cools.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
