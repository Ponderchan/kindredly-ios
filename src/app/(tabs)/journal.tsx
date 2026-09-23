import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import Svg, { Line, Path, Rect } from "react-native-svg";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { t, useLang } from "../../lib/i18n";
import { P, PF } from "../../theme/post";
import { TabHeader } from "../../components/TabHeader";
import { WrenSaysOnce } from "../../components/WrenSaysOnce";
import { SealedTile, KindMark, day } from "../../components/SealedTile";
import { MoodIcon } from "../../components/MoodIcon";
import { cardShadow } from "../../components/AuraCard";
import { getMood } from "../../data/moods";
import { scoped } from "../../lib/scoped-store";
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

/* Notes (once Sealed) — letters to yourself. Clean stacked cards (design 1a):
   mood shows as its face alone, no label; a line can drift out from the card.

   TWO WAYS TO LAY THE PAGES, AND THE MONTH (the web's, owner 2026-09-23):
   at the plate's right, a key that says how they lie — Card, the wall; or
   Compact, one line each — opening a small menu, and a key with this
   month's count that opens the calendar, where each day wears its mood
   face. Card is the default; the choice is remembered on this phone. */

type Mode = "card" | "compact";
const VIEW_KEY = "kindredly_notes_view";
const WIN_W = Dimensions.get("window").width;

export default function JournalTab() {
  useLang();
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [hiddenDemo, setHiddenDemo] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>("card");
  const [cal, setCal] = useState(false);
  /* the menu hangs under its key, wherever the key is on this screen */
  const [menu, setMenu] = useState<null | { x: number; y: number; w: number; h: number }>(null);
  const viewKey = useRef<View>(null);
  useEffect(() => {
    scoped.getItem(VIEW_KEY).then((v) => v === "compact" && setMode("compact")).catch(() => {});
  }, []);
  const pick = (m: Mode) => {
    setMode(m);
    setCal(false); // picking how the pages lie is asking to see them
    setMenu(null);
    void scoped.setItem(VIEW_KEY, m).catch(() => {});
  };
  const openMenu = () => viewKey.current?.measureInWindow((x, y, w, h) => setMenu({ x, y, w, h }));
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

  // the calendar key counts the month it opens
  const now = new Date();
  const thisMonth = all.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View ref={viewKey} collapsable={false}>
              <PlateKey on={!!menu} onPress={openMenu} label={`${t("jt.viewMenu")}: ${mode === "card" ? t("jt.viewCard") : t("jt.viewCompact")}`} expanded={!!menu}>
                <ViewGlyph mode={mode} color={menu ? "#FFFFFF" : P.ink} />
                <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 13, color: menu ? "#FFFFFF" : P.ink }}>{mode === "card" ? t("jt.viewCard") : t("jt.viewCompact")}</Text>
                <Caret open={!!menu} />
              </PlateKey>
            </View>
            <PlateKey on={cal} onPress={() => setCal((c) => !c)} label={String(thisMonth)} expanded={cal}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 0.8, color: cal ? "#FFFFFF" : P.ink }}>{String(thisMonth).padStart(2, "0")}</Text>
              {cal ? <ListIcon color="#FFFFFF" /> : <CalendarIcon color={P.ink} />}
              <Caret open={cal} />
            </PlateKey>
          </View>
        )}
      />

      {/* the view menu: VIEW, then the two ways, the one in use ticked */}
      <Modal transparent visible={!!menu} animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable style={{ flex: 1 }} onPress={() => setMenu(null)}>
          {menu && (
            <Pressable onPress={() => {}} style={{ position: "absolute", top: menu.y + menu.h + 6, right: WIN_W - (menu.x + menu.w), minWidth: 206, backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1.5, borderColor: P.ink, padding: 8, shadowColor: P.ink, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 1, shadowRadius: 0 }}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.6, color: P.ink40, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 6 }}>{t("jt.viewMenu")}</Text>
              {(["card", "compact"] as const).map((m) => (
                <Pressable key={m} onPress={() => pick(m)} accessibilityRole="menuitem" accessibilityState={{ selected: mode === m }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, height: 44, paddingHorizontal: 10, borderRadius: 12, backgroundColor: mode === m ? "#EEEDFA" : pressed ? "#F6F5FC" : "transparent" })}>
                  <ViewGlyph mode={m} color={P.ink} />
                  <Text style={{ flex: 1, fontFamily: PF.letter, fontWeight: "600", fontSize: 16, color: P.ink }}>{m === "card" ? t("jt.viewCard") : t("jt.viewCompact")}</Text>
                  {mode === m && <Text style={{ fontSize: 13, color: P.ink40 }}>✓</Text>}
                </Pressable>
              ))}
            </Pressable>
          )}
        </Pressable>
      </Modal>


      {empty ? (
        <Empty onWrite={(start) => router.push(start ? `/journal-entry?start=${start}` : "/journal-entry")} />
      ) : cal ? (
        <Animated.ScrollView entering={FadeIn.duration(220)} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 0.8, color: P.ink40, paddingHorizontal: 22, marginBottom: 4, marginTop: 14 }}>
            {t("jt.moments")}
          </Text>
          <SealedCalendar entries={all} onPickDay={openDay} />
        </Animated.ScrollView>
      ) : (
        <Animated.ScrollView entering={FadeIn.duration(220)} onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          {/* tucked under the plate — pull down past the top and it shows */}
          <Animated.Text style={[{ position: "absolute", top: -22, left: 20, fontFamily: PF.mono, fontSize: 11, letterSpacing: 0.8, color: P.ink40 }, pullNote]}>
            {t("jt.moments")}
          </Animated.Text>
          <WrenSaysOnce id="sealed" line={t("jt.said")} />
          {mode === "card" ? <Wall entries={all} onOpen={(id) => router.push(`/journal/${id}`)} /> : <Rows entries={all} onOpen={(id) => router.push(`/journal/${id}`)} />}
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

/* compact — one line a page, in one white card: the mood, the day, the
   first line (or what the page holds, when it has no words), the kind */
function Rows({ entries, onOpen }: { entries: JournalEntry[]; onOpen: (id: string) => void }) {
  return (
    <View style={[{ backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden" }, cardShadow, { shadowOpacity: 0.05 }]}>
      {entries.map((e, i) => (
        <Row key={e.id} e={e} first={i === 0} onPress={() => onOpen(e.id)} />
      ))}
    </View>
  );
}

function Row({ e, first, onPress }: { e: JournalEntry; first: boolean; onPress: () => void }) {
  const m = getMood(e.mood);
  const pics = e.type === "photo" ? (e.media?.length ? e.media.length : e.mediaUri ? 1 : 0) : 0;
  const mmss = (s = 0) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
  const words = (e.body || "").split("\n")[0].trim();
  const what = words || (e.type === "photo" ? (pics > 1 ? t("jt.pictures", { n: pics }) : t("jt.picture")) : e.type === "voice" ? `${t("jt.tape")} · ${mmss(e.dur)}` : e.type === "video" ? t("jt.aVideo") : "");
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, opacity: pressed ? 0.6 : 1 }, !first && { borderTopWidth: 1, borderTopColor: "#EFEEF6" }]}>
      <View style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: m.bg, alignItems: "center", justifyContent: "center" }}>
        <MoodIcon id={m.id} size={20} />
      </View>
      <Text numberOfLines={1} style={{ minWidth: 54, fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.4, color: P.ink40 }}>{day(e.date)}</Text>
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: PF.letter, fontSize: 15, color: words ? P.ink : P.ink60 }}>{what}</Text>
      <KindMark kind={e.type} />
    </Pressable>
  );
}

/* a key on the plate — outlined, filled while what it opens is open. Both
   keys open something, so both end in the same caret (owner, 2026-09-23),
   and both sit a size below the plate's 18pt name: 28 high, 13pt words */
function PlateKey({ on, onPress, label, expanded, children }: { on: boolean; onPress: () => void; label: string; expanded?: boolean; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={expanded === undefined ? { selected: on } : { expanded }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 5, height: 28, paddingHorizontal: 9, borderRadius: 9, borderWidth: 1.3, borderColor: P.ink, backgroundColor: on ? P.ink : "transparent", opacity: pressed ? 0.75 : 1 })}
    >
      {children}
    </Pressable>
  );
}

/* what a key opens hangs below it: a caret down, turned up while open */
function Caret({ open }: { open: boolean }) {
  return (
    <Svg width={9} height={9} viewBox="0 0 10 10" style={{ marginLeft: 1, transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
      <Path d="M2 3.5l3 3 3-3" fill="none" stroke={open ? "#FFFFFF" : P.ink60} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* the two ways, drawn: Card is two stacked sheets, Compact three lines */
function ViewGlyph({ mode, color }: { mode: Mode; color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {mode === "card" ? (
        <>
          <Rect x={4} y={4} width={16} height={7} rx={2.5} />
          <Rect x={4} y={13} width={16} height={7} rx={2.5} />
        </>
      ) : (
        <Path d="M5 7h14M5 12h14M5 17h14" />
      )}
    </Svg>
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
function CalendarIcon({ color = P.ink60 }: { color?: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24">
      <Rect x={3} y={4} width={18} height={17} fill="none" stroke={color} strokeWidth={1.7} />
      <Path d="M3 9.2h18" stroke={color} strokeWidth={1.7} />
      <Path d="M9 9.2v11.8 M15 9.2v11.8 M3 15.1h18" stroke={color} strokeWidth={1.1} />
      <Rect x={10.7} y={10.9} width={2.7} height={2.7} fill={color} />
    </Svg>
  );
}
/* Its sibling, drawn as the timeline it toggles to: entry rows on rules,
   each led by the same square of ink the rest of the app uses as a marker. */
function ListIcon({ color = P.ink60 }: { color?: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24">
      <Rect x={3} y={4.6} width={3} height={3} fill={color} />
      <Path d="M9 6.1h12" stroke={color} strokeWidth={1.7} />
      <Rect x={3} y={10.5} width={3} height={3} fill={color} />
      <Path d="M9 12h12" stroke={color} strokeWidth={1.7} />
      <Rect x={3} y={16.4} width={3} height={3} fill={color} />
      <Path d="M9 17.9h12" stroke={color} strokeWidth={1.7} />
    </Svg>
  );
}
