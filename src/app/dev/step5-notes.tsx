import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isKindredlyUIViewAvailable } from "../../../modules/kindredly-ui";
import { setDevThemeOverride, useDevThemeOverride, useTheme } from "../../lib/theme";
import { useLang } from "../../lib/i18n";
import { assetImageRef } from "../../lib/images";
import { THEME_KEYS, THEMES, type ThemeKey } from "../../theme/themes";
import { PFM } from "../../theme/post";
import { demoJournal } from "../../data/demo";
import { MOOD_IDS, type MoodId } from "../../data/moods";
import type { JournalEntry } from "../../lib/journal";
import { MoodTray } from "../../components/MoodTray";
import { useNotesModel, type NotesDemo } from "../../screens/notes/useNotesModel";
import { NotesNative } from "../../screens/notes/NotesNative";
import { NotesRN } from "../../screens/notes/NotesRN";
import type { EveningShow } from "../../screens/notes/notes-model";
import "../../data/strings-step5-notes";

/* dev only — THE NOTES TAB ON DEMO DATA (10a step 5, slice notes).
   kindredly:///dev/step5-notes

   The Notes screen as either renderer draws it, from data/demo's sample
   pages (no account; nothing is read from or written to the journal): a
   photo album (+7), a single photo, a photo with no words, voice notes with
   and without words, text pages short and long (Chinese included), legacy
   and missing moods, a page from last month — and two LOCAL films bundled
   for this page (assets/dev, made with AVAssetWriter: a landscape one and
   one stored landscape with a quarter-turn transform, as an iPhone records
   upright). Both films' frames are made by KImageStore from the file://
   copy expo-asset downloads, and the triangle in each must point UP: that
   checks the local poster path the spike couldn't (it only tried a remote
   mp4) and appliesPreferredTrackTransform. Built by the same model the tab
   runs on (screens/notes/useNotesModel over notes-model) and drawn by
   NotesNative (SwiftUI) or NotesRN.

   The panel at the bottom (HIDE for a clean screenshot; a dot brings it
   back):
   - THEME: the dev theme override (OFF = the normal theme), the whole app,
     never saved — every surface in all four themes;
   - SWIFT / RN: which renderer (SWIFT needs a dev client built with
     KNotesView, after pod install);
   - DATA: the demo pages · one page · empty (the empty state; with ON it
     shows the evening off row) · many (360 pages: the render window, the
     date chip, the calendar's paging back a year) · legacy (old mood ids,
     an unknown and a missing mood: the Calm colour without a name) · rules
     (the owner's card layouts, 2026-10-18: one page per rule card of his
     prototype's 1b — the three text sizes, one to nine pictures, words with
     pictures, a voice note with and without words — plus a short CJK line
     and a video, to compare side by side);
   - EVENING: none / the card / the off row (answers move between them);
   - ONCE: her first-visit line;
   - PICKER: the composer's new mood picker (four blocks, then the faces);
   - PUSH: what would leave the page really goes there (the sample pages
     open; the others show "not here any more"), instead of saying where.
     The check it is for: RN, open the calendar, page back a month, tap a
     day → the page opens → back → still the calendar, on that month (the
     fallback's calendar is a mode the model keeps across a blur). In SWIFT
     the overlay closes on the way out instead (a day tap scrolls there).
   The screen's own controls work: the view button, the calendar (paging,
   a day → the list goes there in Swift; the fallback opens the page), the
   voice notes on the one player (the sample voice is an https file), her
   line, the evening rows. What would leave the page says where it would
   go instead, unless PUSH is on. The panel's words are English: a dev page. */

type Data = "demo" | "rules" | "one" | "empty" | "many" | "legacy";
const DATA: { key: Data; label: string }[] = [
  { key: "demo", label: "DEMO" },
  { key: "rules", label: "RULES" },
  { key: "one", label: "ONE PAGE" },
  { key: "empty", label: "EMPTY" },
  { key: "many", label: "MANY" },
  { key: "legacy", label: "LEGACY" },
];
const EVENINGS: EveningShow[] = ["none", "ask", "on"];

/* the two films, bundled for this page only (a release build folds the
   requires away with __DEV__) */
const FILM_LANDSCAPE: number | null = __DEV__ ? require("../../../assets/dev/notes-film-landscape.mp4") : null;
const FILM_PORTRAIT: number | null = __DEV__ ? require("../../../assets/dev/notes-film-portrait.mp4") : null;

const H = 3600 * 1000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

/** 360 pages over the last year: every kind, every group, some days with several pages. */
function manyPages(films: { landscape: string | null }): JournalEntry[] {
  const out: JournalEntry[] = [];
  const kinds: JournalEntry["type"][] = ["text", "text", "photo", "voice", "text", "video"];
  for (let i = 0; i < 360; i++) {
    const kind = kinds[i % kinds.length];
    const mood = MOOD_IDS[(i * 7) % MOOD_IDS.length] as MoodId;
    const date = ago(i * 23 * H + (i % 5) * H);
    const base = { id: `demo-many-${i}`, date, mood, body: i % 4 === 0 ? "" : `Page ${i + 1}. ${"A little more of the day. ".repeat(1 + (i % 6))}` };
    if (kind === "photo") out.push({ ...base, type: "photo", media: [`https://picsum.photos/seed/kn-${i}/900/700`, `https://picsum.photos/seed/kn-${i}b/700/900`].slice(0, 1 + (i % 2)), mediaUri: `https://picsum.photos/seed/kn-${i}/900/700` });
    else if (kind === "voice") out.push({ ...base, type: "voice", mediaUri: "https://download.samplelib.com/mp3/sample-6s.mp3", dur: 6 + (i % 50) });
    else if (kind === "video" && films.landscape) out.push({ ...base, type: "video", mediaUri: films.landscape, dur: 2 });
    else out.push({ ...base, type: "text", body: base.body || "ok." });
  }
  return out;
}

/** The owner's 1b rule cards as pages (his prototype's words), newest first, plus a short CJK line and a video. */
function rulePages(films: { landscape: string | null }): JournalEntry[] {
  const pics = (n: number, seed: string) => Array.from({ length: n }, (_, i) => `https://picsum.photos/seed/kn-${seed}-${i}/${i % 2 ? "700/900" : "900/700"}`);
  const photo = (id: string, h: number, n: number, mood: MoodId, body = ""): JournalEntry => ({ id: `demo-rule-${id}`, date: ago(h * H), type: "photo", body, mood, media: pics(n, id), mediaUri: pics(n, id)[0] });
  const text = (id: string, h: number, mood: MoodId, body: string): JournalEntry => ({ id: `demo-rule-${id}`, date: ago(h * H), type: "text", body, mood });
  const out: JournalEntry[] = [
    text("short", 1, "content", "Found a four-leaf clover. Left it."),
    text("mid", 2, "sleepy", "Three cups of coffee and still nothing on the page. Closed the laptop, listened to the neighbour practice scales. Tomorrow."),
    text("long", 3, "content", "Grandma’s letters are all folded twice. I started doing it too without deciding to. Some habits you don’t choose, they just move in. I wonder which of mine someone will catch themselves doing in forty years, and whether they’ll know where it came from."),
    photo("p1", 4, 1, "cheerful"),
    photo("p2", 5, 2, "cheerful"),
    photo("p3", 6, 3, "cheerful"),
    photo("p4", 7, 4, "cheerful"),
    photo("p9", 8, 9, "cheerful"),
    photo("t1", 9, 1, "cheerful", "Walked the long way home on purpose. The whole block smells like bread."),
    photo("t3", 10, 3, "content", "Sunday, finally."),
    photo("t7", 11, 7, "sleepy", "Moved the last boxes today. The flat echoes in a way I didn’t expect and the light comes in from the wrong side now."),
    { id: "demo-rule-v1", date: ago(12 * H), type: "voice", body: "Didn’t feel like typing. Just wanted to say it out loud once.", mood: "nervous", mediaUri: "https://download.samplelib.com/mp3/sample-6s.mp3", dur: 31 },
    { id: "demo-rule-v0", date: ago(13 * H), type: "voice", body: "", mood: "nervous", mediaUri: "https://download.samplelib.com/mp3/sample-6s.mp3", dur: 134 },
    text("zh", 14, "content", "今天终于晴了。"),
  ];
  if (films.landscape) out.push({ id: "demo-rule-video", date: ago(15 * H), type: "video", body: "The sea, for nine seconds.", mood: "cheerful", mediaUri: films.landscape, dur: 9 });
  return out;
}

export default function Step5Notes() {
  if (!__DEV__) return <Redirect href="/" />;
  return <NotesLab />;
}

function NotesLab() {
  useLang();
  const { key, t: tk } = useTheme();
  const forced = useDevThemeOverride();
  const safe = useSafeAreaInsets();
  const swiftAvailable = isKindredlyUIViewAvailable("KNotesView");

  const [swift, setSwift] = useState(swiftAvailable);
  const [data, setData] = useState<Data>("demo");
  const [evening, setEvening] = useState<EveningShow>("ask");
  const [once, setOnce] = useState(true);
  const [panel, setPanel] = useState(true);
  const [picker, setPicker] = useState(false);
  const [mood, setMood] = useState<MoodId | null>(null);
  const [push, setPush] = useState(false);
  const router = useRouter();

  /* the films as local files (expo-asset downloads them from the dev server into the cache) */
  const [films, setFilms] = useState<{ landscape: string | null; portrait: string | null }>({ landscape: null, portrait: null });
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [l, p] = await Promise.all([FILM_LANDSCAPE != null ? assetImageRef(FILM_LANDSCAPE) : null, FILM_PORTRAIT != null ? assetImageRef(FILM_PORTRAIT) : null]);
        if (alive) setFilms({ landscape: l?.uri ?? null, portrait: p?.uri ?? null });
      } catch (e) {
        console.warn("[step5-notes] the films didn't resolve:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const entries = useMemo<JournalEntry[]>(() => {
    const demo = demoJournal({ store: false }).map((e) => (e.id === "demo-j-video" && films.landscape ? { ...e, mediaUri: films.landscape, dur: 2 } : e));
    const portrait: JournalEntry[] = films.portrait ? [{ id: "demo-j-video-portrait", date: ago(30 * H), type: "video", body: "held upright: the triangle points up", mood: "nervous", mediaUri: films.portrait, dur: 2 }] : [];
    switch (data) {
      case "rules":
        return rulePages(films);
      case "one":
        return [{ id: "demo-j-one", date: ago(2 * H), type: "text", body: "The first page. Short, and enough.", mood: "content" }];
      case "empty":
        return [];
      case "many":
        return manyPages(films);
      case "legacy":
        return [
          { id: "demo-legacy-1", date: ago(3 * H), type: "text", body: "Saved with an old mood id (tender → in love).", mood: "tender" as MoodId },
          { id: "demo-legacy-2", date: ago(27 * H), type: "text", body: "Saved with an old mood id (heavy → drained).", mood: "heavy" as MoodId },
          { id: "demo-legacy-3", date: ago(51 * H), type: "text", body: "An unknown mood: the Calm colour, and no name after the date.", mood: "zzz" as MoodId },
          { id: "demo-legacy-4", date: ago(75 * H), type: "text", body: "No mood at all: the same.", mood: undefined as unknown as MoodId },
        ];
      default:
        return [...demo, ...portrait];
    }
  }, [data, films]);

  const away = useCallback((where: string) => (push ? router.push(where as never) : Alert.alert("Dev page", `In the app this opens ${where}.`)), [push, router]);
  const demo = useMemo<NotesDemo>(
    () => ({ entries, evening, setEvening, wrenLine: once, setWrenLine: setOnce, away }),
    [entries, evening, once, away],
  );
  const model = useNotesModel({ demo });

  const themeLabel = forced ? THEMES[forced].name.toUpperCase() : "OFF";
  const native = swift && swiftAvailable;

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <View style={{ flex: 1 }}>{native ? <NotesNative model={model} /> : <NotesRN model={model} />}</View>

      {picker && (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: panel ? 132 + Math.max(safe.bottom, 8) : 0 }}>
          <MoodTray selected={mood} onPick={(m, close) => { setMood(m); if (close) setPicker(false); }} onClose={() => setPicker(false)} />
        </View>
      )}

      {panel ? (
        <View style={{ borderTopWidth: 1, borderTopColor: tk.line, backgroundColor: tk.sf, paddingTop: 8, paddingBottom: Math.max(safe.bottom, 8), gap: 6 }}>
          <Row>
            <Chip label="HIDE" onPress={() => setPanel(false)} />
            {(["off", ...THEME_KEYS] as const).map((k) => (
              <Chip key={k} label={k === "off" ? "OFF" : THEMES[k as ThemeKey].name.toUpperCase()} on={k === "off" ? !forced : forced === k} onPress={() => setDevThemeOverride(k === "off" ? null : (k as ThemeKey))} />
            ))}
          </Row>
          <Row>
            <Chip label="SWIFT" on={native} onPress={() => (swiftAvailable ? setSwift(true) : Alert.alert("Dev page", "This dev client was built before KNotesView: pod install, then rebuild it."))} />
            <Chip label="RN" on={!native} onPress={() => setSwift(false)} />
            {DATA.map((d) => (
              <Chip key={d.key} label={d.label} on={data === d.key} onPress={() => setData(d.key)} />
            ))}
          </Row>
          <Row>
            {EVENINGS.map((e) => (
              <Chip key={e} label={`EVENING ${e.toUpperCase()}`} on={evening === e} onPress={() => setEvening(e)} />
            ))}
            <Chip label="ONCE" on={once} onPress={() => setOnce((v) => !v)} />
            <Chip label="PICKER" on={picker} onPress={() => setPicker((v) => !v)} />
            <Chip label="PUSH" on={push} onPress={() => setPush((v) => !v)} />
          </Row>
          <Text style={{ ...PFM.monoMed, fontSize: 10, color: tk.sub, paddingHorizontal: 12 }}>
            {`THEME ${themeLabel} (${key}) · ${native ? "SWIFTUI" : "REACT NATIVE"}${swiftAvailable ? "" : " (no KNotesView in this build)"} · ${model.notes.length} PAGES · ${model.view.toUpperCase()}${model.calendarOpen ? ` · CALENDAR ${model.month.key}` : ""}${films.landscape ? "" : " · FILMS LOADING"}${mood ? ` · MOOD ${mood}` : ""}`}
          </Text>
        </View>
      ) : (
        <Pressable onPress={() => setPanel(true)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Show the dev panel" style={{ position: "absolute", left: 10, bottom: Math.max(safe.bottom, 10), width: 14, height: 14, borderRadius: 7, backgroundColor: tk.ind, opacity: 0.5 }} />
      )}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 12 }}>
      {children}
    </ScrollView>
  );
}

function Chip({ label, on = false, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  const { t: tk } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1.5, borderColor: on ? tk.ink : tk.line, backgroundColor: on ? tk.ink : tk.sf, opacity: pressed ? 0.7 : 1 })}
    >
      <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 0.8, color: on ? tk.bg : tk.ink }}>{label}</Text>
    </Pressable>
  );
}
