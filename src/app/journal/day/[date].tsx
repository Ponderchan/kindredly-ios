import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { C, F } from "../../../theme/tokens";
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
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={goBack} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 26, color: C.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: F.serif, fontSize: 17, color: C.ink }}>{title}</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {day.map((e) => (
          <SealedEntry key={e.id} e={e} onPress={() => router.push(`/journal/${e.id}`)} />
        ))}
        <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.faint, textAlign: "center", marginTop: 8 }}>
          🔒 {day.length} on this day, sealed on this device.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
