import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";
import { useFocusEffect, useRouter } from "expo-router";
import { C, F } from "../../theme/tokens";
import { SealedEntry } from "../../components/SealedEntry";
import { SealedCalendar, dayKey } from "../../components/SealedCalendar";
import { loadJournal, type JournalEntry } from "../../lib/journal";
import { DEMO_JOURNAL } from "../../data/demo";

/* Sealed — letters to yourself. Clean stacked cards (design 1a): mood shows as
   its face alone, no label; a line can drift out from the card. Top-right flips
   to a calendar where each day wears its mood face. */

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
        {empty ? (
          <View style={{ backgroundColor: C.ink, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontFamily: F.sansExtra, fontSize: 9.5, letterSpacing: 1.5, color: "#fff" }}>JUST YOU</Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Text style={{ fontFamily: F.sansBold, fontSize: 11, letterSpacing: 1, color: C.faint }}>{all.length}</Text>
            <Pressable onPress={() => setView(view === "line" ? "calendar" : "line")} hitSlop={10} style={{ width: 30, height: 30, alignItems: "center", justifyContent: "center" }}>
              {view === "line" ? <CalendarIcon /> : <ListIcon />}
            </Pressable>
          </View>
        )}
      </View>

      {empty ? (
        <Empty onWrite={(start) => router.push(start ? `/journal-entry?start=${start}` : "/journal-entry")} />
      ) : view === "calendar" ? (
        <Animated.ScrollView entering={FadeIn.duration(220)} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          <SealedCalendar entries={all} onPickDay={openDay} />
          <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.faint, textAlign: "center", marginTop: 22 }}>
            🔒 Sealed on this device.
          </Text>
        </Animated.ScrollView>
      ) : (
        <Animated.ScrollView entering={FadeIn.duration(220)} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          <Timeline entries={all} onOpen={(id) => router.push(`/journal/${id}`)} />
          <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.faint, textAlign: "center", marginTop: 4 }}>
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
    if (mk !== prevMonth) {
      rows.push(<MonthLabel key={`m-${mk}-${i}`} label={d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()} first={rows.length === 0} />);
      prevMonth = mk;
    }
    rows.push(<SealedEntry key={e.id} e={e} onPress={() => onOpen(e.id)} />);
  });
  return <>{rows}</>;
}

function MonthLabel({ label, first }: { label: string; first: boolean }) {
  return <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 2, color: "#B9B29E", marginTop: first ? 2 : 18, marginBottom: 12 }}>{label}</Text>;
}

/* Empty Sealed — the one warm, playful moment (design 1b). A scrapbook wall
   of dotted paper, a taped note, and four coloured ways in. Once you write, it
   becomes the quiet timeline for good. */
function Empty({ onWrite }: { onWrite: (start?: string) => void }) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
      <Dots />
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 26, paddingBottom: 60 }}>
        {/* the taped note */}
        <View style={{ marginBottom: 34 }}>
          <View style={{ position: "absolute", left: 46, top: -12, width: 78, height: 24, backgroundColor: "#BFE0C8", opacity: 0.9, transform: [{ rotate: "-5deg" }], borderRadius: 1, zIndex: 2 }} />
          <View style={{ backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 26, paddingVertical: 30, transform: [{ rotate: "-1deg" }], shadowColor: "#2A2620", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }}>
            <Text style={{ fontFamily: F.sansExtra, fontSize: 29, lineHeight: 35, color: C.ink, textAlign: "center" }}>
              nothing here yet{"\n"}& that's fine
            </Text>
            <Text style={{ fontFamily: F.sans, fontSize: 14.5, lineHeight: 22, color: C.muted, textAlign: "center", marginTop: 14 }}>
              dump a thought, a blurry photo, a 3am voice note. no one sees it — not even the algorithm.
            </Text>
          </View>
          {/* NEW sticker */}
          <View style={{ position: "absolute", right: 10, bottom: -14, width: 46, height: 46, borderRadius: 23, backgroundColor: "#F5D33A", alignItems: "center", justifyContent: "center", transform: [{ rotate: "12deg" }] }}>
            <Text style={{ fontFamily: F.sansExtra, fontSize: 12, letterSpacing: 0.5, color: "#2A2620" }}>NEW</Text>
          </View>
        </View>

        {/* four coloured ways in */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
          <ActionBtn label="type it" glyph="↵" bg="#1C1A22" fg="#fff" onPress={() => onWrite()} />
          <ActionBtn label="snap it" glyph="▢" bg="#CFE0F0" fg="#294055" onPress={() => onWrite("photo")} />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <ActionBtn label="say it" glyph="●" bg="#F4CEDA" fg="#7A2E44" onPress={() => onWrite("voice")} />
          <ActionBtn label="film it" glyph="▶" bg="#F3DDC0" fg="#6B4A22" onPress={() => onWrite("video")} />
        </View>
      </View>
    </Animated.View>
  );
}

function ActionBtn({ label, glyph, bg, fg, onPress }: { label: string; glyph: string; bg: string; fg: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, height: 74, borderRadius: 18, backgroundColor: bg, paddingHorizontal: 18, paddingVertical: 14, justifyContent: "space-between", opacity: pressed ? 0.9 : 1 })}>
      <Text style={{ fontFamily: F.sansExtra, fontSize: 12, color: fg, alignSelf: "flex-end" }}>{glyph}</Text>
      <Text style={{ fontFamily: F.sansExtra, fontSize: 17, color: fg }}>{label}</Text>
    </Pressable>
  );
}

/* faint scrapbook dot grid */
function Dots() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id="dots" width={22} height={22} patternUnits="userSpaceOnUse">
          <Circle cx={2} cy={2} r={1.3} fill="#E2D9C3" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#dots)" />
    </Svg>
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
