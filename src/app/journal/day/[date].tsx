import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { P, PF, rule } from "../../../theme/post";
import { SealedEntry } from "../../../components/SealedEntry";
import { dayKey } from "../../../components/SealedCalendar";
import { loadJournal, type JournalEntry } from "../../../lib/journal";
import { DEMO_JOURNAL } from "../../../data/demo";

/* One day of the sealed thread — every scrap you left on this date, oldest at
   the top of the day. Tap one to open the full page. */
export default function SealedDay() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const [day, setDay] = useState<JournalEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadJournal().then((real) => {
        if (!alive) return;
        const all = __DEV__ ? [...real, ...DEMO_JOURNAL] : real;
        // oldest → newest within the day reads like a diary
        const d = all.filter((e) => dayKey(e.date) === date).sort((a, b) => +new Date(a.date) - +new Date(b.date));
        setDay(d);
      });
      return () => {
        alive = false;
      };
    }, [date]),
  );

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/journal"));
  const title = date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, marginHorizontal: 16, paddingBottom: 4 }, rule]}>
        <Pressable onPress={goBack} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1.4, color: P.ink }}>{title.toUpperCase()}</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {day.map((e) => (
          <SealedEntry key={e.id} e={e} onPress={() => router.push(`/journal/${e.id}`)} />
        ))}
        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.8, color: P.ink40, textAlign: "center", marginTop: 10 }}>
          {day.length} ON THIS DAY
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
