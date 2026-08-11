import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { C, F, cardStyle } from "../../theme/tokens";
import { MoodIcon } from "../../components/MoodIcon";
import { JournalCard } from "../../components/JournalCard";
import { LinePicker } from "../../components/LinePicker";
import { PrimaryButton } from "../../components/ui";
import { MOOD_IDS } from "../../data/moods";
import { getMood } from "../../data/moods";
import { loadJournal, setDrift, type JournalEntry } from "../../lib/journal";
import { insertMorningFragment } from "../../lib/db";
import { DEMO_JOURNAL } from "../../data/demo";

export default function JournalTab() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [drifting, setDrifting] = useState<JournalEntry | null>(null);

  const refresh = useCallback(() => {
    loadJournal().then((e) => {
      setEntries(e);
      setLoaded(true);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onToggleDrift = (e: JournalEntry) => {
    if (e.id.startsWith("demo-")) {
      Alert.alert("A sample page", "This one's just here to show the shape. Your own pages can drift.");
      return;
    }
    if (e.driftedLine) {
      Alert.alert("Already out", "A drifted line can't be called back — it's someone's Morning Page now.");
      return;
    }
    setDrifting(e);
  };

  const onPickLine = async (line: string) => {
    const e = drifting;
    setDrifting(null);
    if (!e) return;
    await insertMorningFragment(line, e.mood, "en"); // anonymous → shared morning pool
    const next = await setDrift(e.id, line);
    setEntries(next);
  };

  // dev preview: sample pages after the real ones, so every card form is visible
  const showEntries = __DEV__ ? [...entries, ...DEMO_JOURNAL] : entries;
  // mood counts
  const counts = MOOD_IDS.map((id) => ({ id, n: showEntries.filter((e) => e.mood === id).length })).filter((c) => c.n > 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 130, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontFamily: F.serif, fontSize: 30, color: C.ink, letterSpacing: -0.5 }}>Sealed</Text>
        <Text style={{ fontFamily: F.sans, fontSize: 13.5, color: C.muted, marginTop: 4 }}>
          A space for your quietest thoughts.
        </Text>

        {loaded && showEntries.length === 0 && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 50 }}>
            <View style={{ flexDirection: "row", marginBottom: 24 }}>
              {MOOD_IDS.slice(0, 5).map((m, i) => (
                <View key={m} style={{ transform: [{ rotate: `${(i - 2) * 8}deg` }], marginHorizontal: -4 }}>
                  <MoodIcon id={m} size={44} />
                </View>
              ))}
            </View>
            <Text style={{ fontFamily: F.serif, fontSize: 22, color: C.ink, textAlign: "center" }}>Nothing here yet —</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 22, color: C.purple, textAlign: "center" }}>which is the point.</Text>
            <Text style={{ fontFamily: F.sans, fontSize: 13.5, lineHeight: 21, color: C.muted, marginTop: 16, textAlign: "center", maxWidth: 290 }}>
              This room is sealed on your device. Write freely — later, a line can drift out and become someone's
              Morning Page.
            </Text>
            <View style={{ width: "80%", marginTop: 26 }}>
              <PrimaryButton label="WRITE THE FIRST PAGE" onPress={() => router.push("/journal-entry")} />
            </View>
          </View>
        )}

        {showEntries.length > 0 && (
          <>
            {counts.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18, marginBottom: 18 }}>
                {counts.map((c) => (
                  <View key={c.id} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: getMood(c.id).bg }}>
                    <MoodIcon id={c.id} size={20} plate={false} />
                    <Text style={{ fontFamily: F.sansBold, fontSize: 11, color: C.muted }}>{c.n}</Text>
                  </View>
                ))}
              </View>
            )}

            {showEntries.map((e) => (
              <JournalCard
                key={e.id}
                e={e}
                onToggleDrift={() => onToggleDrift(e)}
                onPress={() => router.push(`/journal/${e.id}`)}
              />
            ))}

            <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.faint, textAlign: "center", marginTop: 8, marginBottom: 18 }}>
              🔒 Sealed on this device.
            </Text>
            <PrimaryButton label="WRITE A NEW PAGE" onPress={() => router.push("/journal-entry")} />
          </>
        )}
      </ScrollView>

      <LinePicker visible={!!drifting} body={drifting?.body || ""} onPick={onPickLine} onClose={() => setDrifting(null)} />
    </SafeAreaView>
  );
}
