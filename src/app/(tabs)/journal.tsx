import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Circle, Defs, Path, Pattern, Rect } from "react-native-svg";
import { useFocusEffect, useRouter } from "expo-router";

import { P, PF, rule } from "../../theme/post";
import { WrenSaysOnce } from "../../components/WrenSaysOnce";
import { SealedEntry } from "../../components/SealedEntry";
import { SealedCalendar, dayKey } from "../../components/SealedCalendar";
import { loadJournal, type JournalEntry } from "../../lib/journal";
import { DEMO_JOURNAL } from "../../data/demo";
import { hiddenDemoIds } from "../../lib/journal";

/* Sealed — letters to yourself. Clean stacked cards (design 1a): mood shows as
   its face alone, no label; a line can drift out from the card. Top-right flips
   to a calendar where each day wears its mood face. */

type View2 = "line" | "calendar";

export default function JournalTab() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [hiddenDemo, setHiddenDemo] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View2>("line");

  const refresh = useCallback(() => {
    loadJournal().then((e) => {
      setEntries(e);
      setLoaded(true);
    });
    void hiddenDemoIds().then(setHiddenDemo);
  }, []);
  useFocusEffect(useCallback(() => refresh(), [refresh]));

  // newest first, across real + sample pages (dev preview)
  const all = useMemo(
    () =>
      (__DEV__ ? [...entries, ...DEMO_JOURNAL.filter((d) => !hiddenDemo.includes(d.id))] : [...entries]).sort(
        (a, b) => +new Date(b.date) - +new Date(a.date),
      ),
    [entries, hiddenDemo],
  );
  const empty = loaded && all.length === 0;

  const openDay = (key: string) => {
    const day = all.filter((e) => dayKey(e.date) === key);
    if (day.length === 1) router.push(`/journal/${day[0].id}`);
    else if (day.length > 1) router.push(`/journal/day/${key}`);
  };

  return (
    /* Same split as Today: the wash is the app, the white is what a person
       wrote. Here every page is yours rather than a stranger's, which is the
       only difference — so the entries become sheets and the chrome around
       them stays on the desk. */
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
      {/* header — the box's own plate, on the same rule Today uses */}
      <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 6, paddingBottom: 9, marginHorizontal: 16 }, rule]}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: P.ink }}>SEALED</Text>
        {empty ? (
          <Text style={{ fontFamily: PF.mono, fontSize: 12.5, letterSpacing: 1.2, color: P.ink60 }}>JUST YOU</Text>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 12.5, letterSpacing: 1.2, color: P.ink60 }}>
              {String(all.length).padStart(2, "0")}
            </Text>
            <Pressable onPress={() => setView(view === "line" ? "calendar" : "line")} hitSlop={10} style={{ width: 26, height: 26, alignItems: "center", justifyContent: "center" }}>
              {view === "line" ? <CalendarIcon /> : <ListIcon />}
            </Pressable>
          </View>
        )}
      </View>


      {empty ? (
        <Empty onWrite={(start) => router.push(start ? `/journal-entry?start=${start}` : "/journal-entry")} />
      ) : view === "calendar" ? (
        <Animated.ScrollView entering={FadeIn.duration(220)} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 0.8, color: P.ink40, paddingHorizontal: 22, marginBottom: 4, marginTop: 14 }}>
            MOMENTS YOU'VE CHOSEN TO KEEP
          </Text>
          <SealedCalendar entries={all} onPickDay={openDay} />
          <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.8, color: P.ink40, textAlign: "center", marginTop: 26 }}>
            SEALED ON THIS DEVICE
          </Text>
        </Animated.ScrollView>
      ) : (
        <Animated.ScrollView entering={FadeIn.duration(220)} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 0.8, color: P.ink40, marginBottom: 20 }}>
            MOMENTS YOU'VE CHOSEN TO KEEP
          </Text>
          <WrenSaysOnce id="sealed" line="These never leave your phone. I don't read them either — that's the whole point of the wax." />
          <Timeline entries={all} onOpen={(id) => router.push(`/journal/${id}`)} />
          <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.8, color: P.ink40, textAlign: "center", marginTop: 8 }}>
            SEALED ON THIS DEVICE
          </Text>
        </Animated.ScrollView>
      )}
    </SafeAreaView>
  );
}

function Timeline({ entries, onOpen }: { entries: JournalEntry[]; onOpen: (id: string) => void }) {
  const rows: React.ReactNode[] = [];
  let prevMonth: string | null = null;
  entries.forEach((e) => {
    const d = new Date(e.date);
    const mk = `${d.getFullYear()}-${d.getMonth()}`;
    // only mark a month when it changes — no redundant label at the very top
    if (prevMonth !== null && mk !== prevMonth) {
      rows.push(<MonthLabel key={`m-${mk}`} label={d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()} />);
    }
    prevMonth = mk;
    rows.push(<SealedEntry key={e.id} e={e} onPress={() => onOpen(e.id)} />);
  });
  return <>{rows}</>;
}

function MonthLabel({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 18 }}>
      <Text style={{ fontFamily: PF.monoMed, fontSize: 10.5, letterSpacing: 1.6, color: P.ink60 }}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: P.ink12 }} />
    </View>
  );
}

/* Empty Sealed — still design 1b's one warm, playful moment, and everything it
   said is still here word for word: the taped note, the NEW sticker, the four
   coloured ways in. Only the grammar changed to the postal system's — square
   corners, mono chrome, the four colours carried as washes instead of solid
   pills. The tape and the tilt stay: those are a hand, and a hand is allowed. */
function Empty({ onWrite }: { onWrite: (start?: string) => void }) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
      <Dots />
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 26, paddingBottom: 60 }}>
        {/* the taped note */}
        <View style={{ marginBottom: 34 }}>
          <View style={{ position: "absolute", left: 46, top: -11, width: 78, height: 22, backgroundColor: "#BFE0C8", opacity: 0.85, transform: [{ rotate: "-5deg" }], zIndex: 2 }} />
          <View style={{ backgroundColor: P.paper, borderWidth: 1, borderColor: P.ink, paddingHorizontal: 26, paddingVertical: 30, transform: [{ rotate: "-1deg" }] }}>
            <Text style={{ fontFamily: PF.serif, fontSize: 27, lineHeight: 34, color: P.ink, textAlign: "center" }}>
              nothing here yet{"\n"}& that's fine
            </Text>
            <Text style={{ fontFamily: PF.letter, fontSize: 14.5, lineHeight: 22, color: P.ink60, textAlign: "center", marginTop: 14 }}>
              dump a thought, a blurry photo, a 3am voice note. no one sees it — not even the algorithm.
            </Text>
          </View>
          {/* NEW sticker */}
          <View style={{ position: "absolute", right: 8, bottom: -14, backgroundColor: "#F5D33A", paddingHorizontal: 9, paddingVertical: 6, transform: [{ rotate: "6deg" }] }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1, color: "#2A2620" }}>NEW</Text>
          </View>
        </View>

        {/* four ways in */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
          <ActionBtn label="type it" glyph="↵" wash="#E4E2EA" fg={P.ink} onPress={() => onWrite()} />
          <ActionBtn label="snap it" glyph="▢" wash="#DFE9F3" fg="#294055" onPress={() => onWrite("photo")} />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <ActionBtn label="say it" glyph="●" wash="#F5E1E7" fg="#7A2E44" onPress={() => onWrite("voice")} />
          <ActionBtn label="film it" glyph="▶" wash="#F3E7D6" fg="#6B4A22" onPress={() => onWrite("video")} />
        </View>
      </View>
    </Animated.View>
  );
}

function ActionBtn({ label, glyph, wash, fg, onPress }: { label: string; glyph: string; wash: string; fg: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, height: 72, backgroundColor: wash, borderWidth: 1, borderColor: fg, paddingHorizontal: 15, paddingVertical: 12, justifyContent: "space-between", opacity: pressed ? 0.6 : 1 })}
    >
      <Text style={{ fontFamily: PF.mono, fontSize: 12, color: fg, alignSelf: "flex-end" }}>{glyph}</Text>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 15, color: fg }}>{label}</Text>
    </Pressable>
  );
}

/* faint scrapbook dot grid */
function Dots() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id="dots" width={22} height={22} patternUnits="userSpaceOnUse">
          <Circle cx={2} cy={2} r={1.2} fill="#DFDACB" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#dots)" />
    </Svg>
  );
}

/* two tiny icons drawn from Views (no emoji, renders identically everywhere) */
/* The owner's own calendar mark: a rounded frame with two binder tabs, a header
   rule, and a tick in the body. Drawn to the same 24×24 / 18×18 live-area grid
   the tab glyphs use, so it sits at the same optical size as everything else. */
function CalendarIcon() {
  const body = "#7C6CE8";
  const tick = "#4FC8C0";
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24">
      {/* binder tabs */}
      <Rect x={7.2} y={1.8} width={2.6} height={4.4} rx={1.3} fill={body} />
      <Rect x={14.2} y={1.8} width={2.6} height={4.4} rx={1.3} fill={body} />
      {/* frame */}
      <Rect x={3.2} y={4} width={17.6} height={17.4} rx={3.6} fill="none" stroke={body} strokeWidth={2.4} />
      {/* header rule */}
      <Path d="M4.4 10.2h15.2" stroke={body} strokeWidth={2.2} strokeLinecap="round" />
      {/* the tick */}
      <Path
        d="M8.7 15.6l2.6 2.6 4.4-4.9"
        fill="none"
        stroke={tick}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
/* The calendar's sibling — a toggle shows two states of one control, so the
   pair has to be drawn as one thing: same canvas, same weight, same palette.
   Timeline = stacked entries, each with its mood dot. */
function ListIcon() {
  const body = "#7C6CE8";
  const tick = "#4FC8C0";
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24">
      <Rect x={3.2} y={4} width={17.6} height={17.4} rx={3.6} fill="none" stroke={body} strokeWidth={2.4} />
      <Circle cx={8} cy={9.6} r={1.7} fill={tick} />
      <Path d="M12 9.6h5.2" stroke={body} strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx={8} cy={15.8} r={1.7} fill={tick} />
      <Path d="M12 15.8h5.2" stroke={body} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}
