import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { PFM } from "../../../theme/post";
import { useP } from "../../../lib/theme";
import { BackChevron } from "../../../components/10a/BackChevron";
import { SealedEntry } from "../../../components/SealedEntry";
import { dayKey } from "../../../components/SealedCalendar";
import { loadJournal, type JournalEntry } from "../../../lib/journal";
import { demoJournal } from "../../../data/demo";
import { localeTag } from "../../../lib/format";
import { t, useLang } from "../../../lib/i18n";
import "../../../data/strings-step5-kitrn"; // a11y.back

/* One day of the sealed thread — every scrap you left on this date, oldest at
   the top of the day. Tap one to open the full page. Reached from the Notes
   fallback's calendar (the SwiftUI calendar scrolls to the day instead).

   10a step 5: the title is the reader's own date (known bug 5b: it was
   always en-US, "Wednesday, October 14" in every language), the header has
   no rule (10a's sub-page headers), the mono at 11, and in a dev build every
   sample page opens (demoJournal, store mode or not). */
export default function SealedDay() {
  useLang(); // repaint when the reader changes language
  const P = useP();
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const [day, setDay] = useState<JournalEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadJournal().then((real) => {
        if (!alive) return;
        const all = __DEV__ ? [...real, ...demoJournal({ store: false })] : real;
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
  const title = date ? new Date(`${date}T12:00:00`).toLocaleDateString(localeTag(), { weekday: "long", month: "long", day: "numeric" }) : "";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      <View style={{ height: 52, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 56 }}>
        <BackChevron onPress={goBack} color={P.ink} />
        {/* the secondary title (SecondaryHeader's): System 500 17, centred, as written */}
        <Text accessibilityRole="header" numberOfLines={1} style={{ flexShrink: 1, fontSize: 17, fontWeight: "500", color: P.ink }}>
          {title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {day.map((e) => (
          <SealedEntry key={e.id} e={e} onPress={() => router.push(`/journal/${e.id}`)} />
        ))}
        <Text style={{ ...PFM.monoMed, fontSize: 10, letterSpacing: 0.8, color: P.ink40, textAlign: "center", marginTop: 10 }}>
          {t("jd.onThisDay", { n: String(day.length) })}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
