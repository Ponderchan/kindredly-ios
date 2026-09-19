import { Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { P, PF } from "../theme/post";
import { endAllActivities, previewLetterOut, startDayClosed, startLetterOut, syncActivities } from "../lib/activities";

/* Dev-only: fire her lock-screen activities by hand, then lock the phone or
   long-press the island. Nothing here writes to the server except the
   activity token a real letter would also register. /activity-preview */

export default function ActivityPreview() {
  if (!__DEV__) return <Redirect href="/" />;
  const [log, setLog] = useState<string[]>([]);
  const say = (s: string) => setLog((l) => [`${new Date().toLocaleTimeString()} ${s}`, ...l].slice(0, 12));
  const run = (label: string, f: () => Promise<void>) => async () => {
    say(`${label}…`);
    try {
      await f();
      say(`${label} ok`);
    } catch (e) {
      say(`${label} failed: ${String((e as Error)?.message ?? e)}`);
    }
  };
  const Btn = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={({ pressed }) => ({ borderWidth: 1.5, borderColor: P.ink, paddingVertical: 12, paddingHorizontal: 16, marginTop: 10, opacity: pressed ? 0.6 : 1 })}>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.4, color: P.ink }}>{label}</Text>
    </Pressable>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 2, color: P.ink }}>LOCK SCREEN · DEV</Text>
        <Btn label="DAY CLOSED · 15 READ · 2 WAITING" onPress={run("day closed", () => startDayClosed({ read: 15, waiting: 2 }))} />
        <Btn label="DAY CLOSED · NOTHING TODAY" onPress={run("day closed (0)", () => startDayClosed({ read: 0, waiting: 0 }))} />
        <Btn label="LETTER OUT · FAKE ID" onPress={run("letter out", () => startLetterOut("preview-letter", "cant-sleep"))} />
        <Btn label="↳ 7 DESKS" onPress={run("7 desks", () => previewLetterOut({ reads: 7, replied: false }))} />
        <Btn label="↳ REPLIED" onPress={run("replied", () => previewLetterOut({ reads: 7, replied: true }))} />
        <Btn label="SYNC (FOREGROUND PASS)" onPress={run("sync", syncActivities)} />
        <Btn label="END ALL" onPress={run("end all", endAllActivities)} />
        <View style={{ marginTop: 20 }}>
          {log.map((l, i) => (
            <Text key={i} style={{ fontFamily: PF.mono, fontSize: 10, color: P.ink60, marginTop: 4 }}>{l}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
