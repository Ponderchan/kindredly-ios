import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { useFocusEffect, useRouter } from "expo-router";
import { C, F } from "../../theme/tokens";
import { SealedEntry } from "../../components/SealedEntry";
import { SealedCalendar, dayKey } from "../../components/SealedCalendar";
import { loadJournal, type JournalEntry } from "../../lib/journal";
import { DEMO_JOURNAL } from "../../data/demo";

/* Sealed — letters to yourself, on a quiet taped timeline (design 2a). The
   line only grows downward and nothing on it ever leaves. Top-right flips to a
   calendar where each day wears its mood face; tap a day to read it. */

type View2 = "line" | "calendar";

export default function JournalTab() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View2>("line");

  const refresh = useCallback(() => {
    loadJournal().then((e) => {
      setEntries(e);
      setLoaded(true);
    });
  }, []);
  useFocusEffect(useCallback(() => refresh(), [refresh]));

  // newest first, across real + sample pages (dev preview)
  const all = useMemo(
    () => (__DEV__ ? [...entries, ...DEMO_JOURNAL] : [...entries]).sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [entries],
  );
  const empty = loaded && all.length === 0;

  const openDay = (key: string) => {
    const day = all.filter((e) => dayKey(e.date) === key);
    if (day.length === 1) router.push(`/journal/${day[0].id}`);
    else if (day.length > 1) router.push(`/journal/day/${key}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }} edges={["top"]}>
      {/* header — quiet eyebrow + count + view toggle */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 10, paddingBottom: 6 }}>
        <Text style={{ fontFamily: F.sansExtra, fontSize: 13, letterSpacing: 3.5, color: C.ink }}>SEALED</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          {!empty && <Text style={{ fontFamily: F.sansBold, fontSize: 11, letterSpacing: 1, color: C.faint }}>{all.length}</Text>}
          {!empty && (
            <Pressable onPress={() => setView(view === "line" ? "calendar" : "line")} hitSlop={10} style={{ width: 30, height: 30, alignItems: "center", justifyContent: "center" }}>
              {view === "line" ? <CalendarIcon /> : <ListIcon />}
            </Pressable>
          )}
        </View>
      </View>

      {empty ? (
        <Empty onWrite={() => router.push("/journal-entry")} />
      ) : view === "calendar" ? (
        <Animated.ScrollView entering={FadeIn.duration(220)} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          <SealedCalendar entries={all} onPickDay={openDay} />
          <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.faint, textAlign: "center", marginTop: 22 }}>
            🔒 Sealed on this device.
          </Text>
        </Animated.ScrollView>
      ) : (
        <Animated.ScrollView entering={FadeIn.duration(220)} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          <Timeline entries={all} onOpen={(id) => router.push(`/journal/${id}`)} />
          <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.faint, textAlign: "center", marginTop: 10 }}>
            🔒 Sealed on this device.
          </Text>
        </Animated.ScrollView>
      )}
    </SafeAreaView>
  );
}

function Timeline({ entries, onOpen }: { entries: JournalEntry[]; onOpen: (id: string) => void }) {
  const rows: React.ReactNode[] = [];
  let prevMonth: string | null = null;
  entries.forEach((e, i) => {
    const d = new Date(e.date);
    const mk = `${d.getFullYear()}-${d.getMonth()}`;
    if (prevMonth && mk !== prevMonth) {
      rows.push(<MonthLabel key={`m-${mk}-${i}`} label={d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()} />);
    }
    rows.push(
      <SealedEntry
        key={e.id}
        e={e}
        onPress={() => onOpen(e.id)}
        first={i === 0}
        last={i === entries.length - 1}
        tapeIndex={i}
      />,
    );
    prevMonth = mk;
  });
  return <>{rows}</>;
}

/* a month marker that keeps the spine unbroken */
function MonthLabel({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: "row" }}>
      <View style={{ width: 40 }}>
        <View style={{ position: "absolute", left: 18, width: 2, top: 0, bottom: 0, backgroundColor: "#E4DBC7" }} />
      </View>
      <View style={{ flex: 1, paddingLeft: 4, paddingVertical: 10 }}>
        <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 2, color: "#B9B29E" }}>{label}</Text>
      </View>
    </View>
  );
}

function Empty({ onWrite }: { onWrite: () => void }) {
  const rows: [string, string][] = [
    ["Write it", "TEXT"],
    ["Snap it", "PHOTO"],
    ["Say it", "VOICE"],
    ["Film it", "VIDEO"],
  ];
  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, paddingHorizontal: 30, justifyContent: "center", paddingBottom: 70 }}>
      {/* taped headline card */}
      <View style={{ alignSelf: "flex-start", marginBottom: 40 }}>
        <View style={{ position: "absolute", left: 18, top: -10, width: 60, height: 22, backgroundColor: "#BFE0C8", opacity: 0.85, transform: [{ rotate: "-6deg" }], borderRadius: 2, zIndex: 2 }} />
        <View style={{ backgroundColor: "#fff", borderRadius: 6, paddingHorizontal: 24, paddingVertical: 26, shadowColor: "#2A2620", shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }}>
          <Text style={{ fontFamily: F.serif, fontSize: 27, color: C.ink, lineHeight: 34 }}>Tape the first{"\n"}scrap here.</Text>
          <Text style={{ fontFamily: F.sans, fontSize: 14, lineHeight: 21, color: C.muted, marginTop: 12, maxWidth: 250 }}>
            The line only grows downward. Nothing you stick on it ever leaves.
          </Text>
        </View>
      </View>

      {rows.map(([label, kind], i) => (
        <Pressable key={kind} onPress={onWrite} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.line }}>
          <Text style={{ fontFamily: F.serifMed, fontSize: 20, color: C.ink }}>{label}</Text>
          <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.4, color: C.faint }}>{kind}</Text>
        </Pressable>
      ))}
    </Animated.View>
  );
}

/* two tiny icons drawn from Views (no emoji, renders identically everywhere) */
function CalendarIcon() {
  return (
    <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1.6, borderColor: C.ink, padding: 3, justifyContent: "space-between" }}>
      {[0, 1].map((r) => (
        <View key={r} style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {[0, 1, 2].map((c) => (
            <View key={c} style={{ width: 2.4, height: 2.4, borderRadius: 1.2, backgroundColor: C.ink }} />
          ))}
        </View>
      ))}
    </View>
  );
}
function ListIcon() {
  return (
    <View style={{ width: 20, height: 20, justifyContent: "center", gap: 4.5 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ height: 2, borderRadius: 1, backgroundColor: C.ink }} />
      ))}
    </View>
  );
}
