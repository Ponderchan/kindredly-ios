import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import Svg, { Line, Path, Rect } from "react-native-svg";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { t, useLang } from "../../lib/i18n";
import { P, PF } from "../../theme/post";
import { TabHeader } from "../../components/TabHeader";
import { WrenSaysOnce } from "../../components/WrenSaysOnce";
import { SealedTile } from "../../components/SealedTile";
import { SealedCalendar, dayKey } from "../../components/SealedCalendar";
import { loadJournal, type JournalEntry } from "../../lib/journal";
import { DEMO_JOURNAL } from "../../data/demo";
import { DEMO_TEXT, storeMode } from "../../lib/dev-store";
import { getLang } from "../../lib/i18n";

/* store mode (dev): the demo pages speak the language on screen */
const STORE_BODY: Record<string, keyof (typeof DEMO_TEXT)["en"]> = { "demo-j-photo": "line", "demo-j-text1": "j2", "demo-j-voice": "j3", "demo-j-text2": "j4", "demo-j-long": "j5", "demo-j-video": "j6" };
const storeBody = (d: JournalEntry): JournalEntry => (__DEV__ && storeMode && STORE_BODY[d.id] ? { ...d, body: DEMO_TEXT[getLang()][STORE_BODY[d.id]] } : d);
import { hiddenDemoIds } from "../../lib/journal";
import { localeTag } from "../../lib/format";

/* Sealed — letters to yourself. Clean stacked cards (design 1a): mood shows as
   its face alone, no label; a line can drift out from the card. Top-right flips
   to a calendar where each day wears its mood face. */

type View2 = "line" | "calendar";

export default function JournalTab() {
  useLang();
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [hiddenDemo, setHiddenDemo] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View2>("line");
  /* the caption lives above the top edge; it is revealed by the overscroll
     and fades in as you pull */
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  const pullNote = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [-40, -8, 0], [1, 0, 0], "clamp") }));

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
      (__DEV__ ? [...(storeMode ? [] : entries), ...DEMO_JOURNAL.filter((d) => storeMode || !hiddenDemo.includes(d.id)).map(storeBody)] : [...entries]).sort(
        (a, b) => +new Date(b.date) - +new Date(a.date),
      ),
    [entries, hiddenDemo],
  );
  // dev: /journal?empty=1 shows the empty state over a full journal
  const { empty: forceEmpty } = useLocalSearchParams<{ empty?: string }>();
  const empty = (__DEV__ && forceEmpty === "1") || (loaded && all.length === 0);

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
      {/* header — every tab's plate (components/TabHeader) */}
      <TabHeader
        title={t("jt.notes")}
        right={empty ? (
          <Text style={{ fontFamily: PF.mono, fontSize: 12.5, letterSpacing: 1.2, color: P.ink60 }}>{t("jt.justYou")}</Text>
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
      />


      {empty ? (
        <Empty onWrite={(start) => router.push(start ? `/journal-entry?start=${start}` : "/journal-entry")} />
      ) : view === "calendar" ? (
        <Animated.ScrollView entering={FadeIn.duration(220)} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 0.8, color: P.ink40, paddingHorizontal: 22, marginBottom: 4, marginTop: 14 }}>
            {t("jt.moments")}
          </Text>
          <SealedCalendar entries={all} onPickDay={openDay} />
          <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.8, color: P.ink40, textAlign: "center", marginTop: 26 }}>
            {t("jt.onDevice")}
          </Text>
        </Animated.ScrollView>
      ) : (
        <Animated.ScrollView entering={FadeIn.duration(220)} onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          {/* tucked under the plate — pull down past the top and it shows */}
          <Animated.Text style={[{ position: "absolute", top: -22, left: 20, fontFamily: PF.mono, fontSize: 11, letterSpacing: 0.8, color: P.ink40 }, pullNote]}>
            {t("jt.moments")}
          </Animated.Text>
          <WrenSaysOnce id="sealed" line={t("jt.said")} />
          <Wall entries={all} onOpen={(id) => router.push(`/journal/${id}`)} />
          <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.8, color: P.ink40, textAlign: "center", marginTop: 8 }}>
            {t("jt.onDevice")}
          </Text>
        </Animated.ScrollView>
      )}
    </SafeAreaView>
  );
}

/* the wall — the owner's T7: two columns of pages, dealt in turn, each
   as tall as what is on it. Newest first, top left. The calendar keeps the
   months and the moods; the wall is for turning. */
function Wall({ entries, onOpen }: { entries: JournalEntry[]; onOpen: (id: string) => void }) {
  const cols: JournalEntry[][] = [[], []];
  entries.forEach((e, i) => cols[i % 2].push(e));
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      {cols.map((col, ci) => (
        <View key={ci} style={{ flex: 1, gap: 10 }}>
          {col.map((e) => (
            <SealedTile key={e.id} e={e} onPress={() => onOpen(e.id)} />
          ))}
        </View>
      ))}
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
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 26, paddingBottom: 60 }}>
        {/* the taped note */}
        <View style={{ marginBottom: 34 }}>
          <View style={{ position: "absolute", left: 46, top: -11, width: 78, height: 22, backgroundColor: "#BFE0C8", opacity: 0.85, transform: [{ rotate: "-5deg" }], zIndex: 2 }} />
          <View style={{ backgroundColor: P.paper, borderWidth: 1, borderColor: P.ink, paddingHorizontal: 26, paddingVertical: 30, transform: [{ rotate: "-1deg" }] }}>
            <Text style={{ fontFamily: PF.serif, fontSize: 27, lineHeight: 34, color: P.ink, textAlign: "center" }}>
              {t("jt.emptyTitle")}
            </Text>
            <Text style={{ fontFamily: PF.letter, fontSize: 14.5, lineHeight: 22, color: P.ink60, textAlign: "center", marginTop: 14 }}>
              {t("jt.emptyBody")}
            </Text>
          </View>
          {/* NEW sticker */}
          <View style={{ position: "absolute", right: 8, bottom: -14, backgroundColor: "#F5D33A", paddingHorizontal: 9, paddingVertical: 6, transform: [{ rotate: "6deg" }] }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1, color: "#2A2620" }}>{t("jt.new")}</Text>
          </View>
        </View>

        {/* the same two keys the roll offers above the pictures (owner,
            2026-09-20): words, or a voice. Pictures are the roll itself —
            the tab's + and "to yourself" both open on it. */}
        <View style={{ flexDirection: "row", gap: 2 }}>
          <Key label={t("jp.write")} tint={P.keyText} onPress={() => onWrite()}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M4 20l4-1 11-11-3-3L5 16z" />
              <Line x1={13} y1={8} x2={16} y2={11} />
            </Svg>
          </Key>
          <Key label={t("jp.say")} tint={P.keyVoice} onPress={() => onWrite("voice")}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <Rect x={9} y={3} width={6} height={11} rx={3} />
              <Path d="M6 11a6 6 0 0 0 12 0M12 17v4" />
            </Svg>
          </Key>
        </View>
      </View>
    </Animated.View>
  );
}

function Key({ label, tint, onPress, children }: { label: string; tint: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, height: 120, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: tint, opacity: pressed ? 0.6 : 1 })}>
      {children}
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.2, color: P.ink }}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

/* two tiny icons drawn from Views (no emoji, renders identically everywhere) */
/* The month, in the system's own hand: a square frame, rules doing the
   division, and one day holding a drop of ink — exactly what the calendar
   behind this control is (mood faces in ruled cells). The old mark was a
   binder-tab rounded rectangle with a checkmark, in two colours from a
   palette this app no longer owns — a habit tracker's glyph. Sealed is not a
   habit; a day is never "done". */
function CalendarIcon() {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24">
      <Rect x={3} y={4} width={18} height={17} fill="none" stroke={P.ink60} strokeWidth={1.7} />
      <Path d="M3 9.2h18" stroke={P.ink60} strokeWidth={1.7} />
      <Path d="M9 9.2v11.8 M15 9.2v11.8 M3 15.1h18" stroke={P.ink60} strokeWidth={1.1} />
      <Rect x={10.7} y={10.9} width={2.7} height={2.7} fill={P.ink60} />
    </Svg>
  );
}
/* Its sibling, drawn as the timeline it toggles to: entry rows on rules,
   each led by the same square of ink the rest of the app uses as a marker. */
function ListIcon() {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24">
      <Rect x={3} y={4.6} width={3} height={3} fill={P.ink60} />
      <Path d="M9 6.1h12" stroke={P.ink60} strokeWidth={1.7} />
      <Rect x={3} y={10.5} width={3} height={3} fill={P.ink60} />
      <Path d="M9 12h12" stroke={P.ink60} strokeWidth={1.7} />
      <Rect x={3} y={16.4} width={3} height={3} fill={P.ink60} />
      <Path d="M9 17.9h12" stroke={P.ink60} strokeWidth={1.7} />
    </Svg>
  );
}
