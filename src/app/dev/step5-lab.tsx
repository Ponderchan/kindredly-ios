import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Redirect, router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import {
  KIsland,
  KLabView,
  isKindredlyUIViewAvailable,
  useKCommands,
  useRev,
  type KCommandSender,
  type KImageRefProps,
  type KLabCommands,
  type KLabFacts,
  type KLabMeasure,
  type KLabRow,
  type KLabStrings,
  type KMenuAction,
  type KScreenHandle,
  type KThemeKey,
} from "../../../modules/kindredly-ui";
import { SurfaceHost } from "../../components/NativeSurface";
import { LeaveSheet, openLeaveSheet } from "../../components/LeaveSheet";
import { ReplyStrip, type ReplyStripHandle } from "../../components/10a/ReplyStrip";
import { setDevThemeOverride, useDevThemeOverride, useTheme } from "../../lib/theme";
import { blurThen, dismissKeyboard } from "../../lib/keyboard";
import { useAssetImageRef } from "../../lib/images";
import { useBirdImageRef } from "../../lib/bird-images";
import { playbackCommandArgs, useVoicePlayback, type VoicePlayback } from "../../lib/voice-playback";
import { copyText } from "../../lib/clipboard";
import { demoMediaUrl } from "../../data/demo";
import { t as tr } from "../../lib/i18n";
import "../../data/strings-step5-platform"; // vo.play, vo.pause
import { PF } from "../../theme/post";
import THEMES from "../../theme/themes.json";

/* dev only — THE STEP-5 SPIKE LAB (foundation batch 0b). kindredly:///dev/step5-lab

   Before any step-5 screen is built on the SwiftUI kit, this page proves on a device what the
   sources only make plausible, and keeps a checklist to write the answers down. It opens on the
   CHECKLIST (React Native): every check with what to do and what counts as a pass, PASS / FAIL
   marks, the prop-cost numbers once BENCH has run, the React Native ReplyStrip checks, and COPY
   RESULTS for the PR description. OPEN THE LAB shows the lab itself:

   - a React Native header (as chat keeps one above its Host) with the controls as chips and a
     status line of what the Swift side reports (at the bottom or not, the top row once the
     scroll settles, the keyboard's inset, focus, the last pull, the last thing that happened);
   - under it ONE Host for the rest of the screen (SurfaceHost field: ignoreSafeArea
     "container", so the keyboard's safe area still applies), holding KLabView
     (modules/kindredly-ui Lab.tsx → ios/Portable/Kit/KLab.swift): 300 rows of different
     heights that open at the newest, a dock on the keyboard with the KField reply strip, row
     menus, four pictures, CloseOfDay's cord as a React Native island with a Reanimated loop and
     an RNGH pan inside the Swift ScrollView, the voice card on the one player, the 10a switch.

   Everything the controls do goes through the same paths the screens will use: useKCommands
   (setText, focus, blur, scrollTo, playback, composer, reset, and the lab's ping), blurThen /
   openLeaveSheet / dismissKeyboard (lib/keyboard), useVoicePlayback, useAssetImageRef,
   useBirdImageRef. The words are English, typed here, as ui-lab's are: a dev page.

   A binary built before KLabView existed says so instead of drawing (pod install, then rebuild
   the dev client). Results stay for the session (leaving the page keeps them) and go nowhere. */

/* ── the checklist (the same list is in the 0b report) ─────────────────── */

type Check = { id: string; title: string; try: string; pass: string };
type Section = { title: string; checks: Check[] };

const CHECKLIST: Section[] = [
  {
    title: "LIST",
    checks: [
      { id: "L1", title: "Opens at the newest row", try: "Open the lab.", pass: "Row #10299 (the newest) sits just above the dock at once: no visible scroll from the top, no jump." },
      { id: "L2", title: "300 rows scroll smoothly", try: "Fling to the top and back to the bottom twice.", pass: "No blank gaps that stay, no rows jumping as they come in from above, no hitch that repeats." },
      { id: "L3", title: "Prepend keeps the place", try: "Scroll to the middle and let it settle (note TOP in the status line), then tap PREPEND 80.", pass: "Nothing on screen moves and TOP still shows the same row. Scrolling to the top then shows the 80 new rows: the first prepend adds #9920–#9999 above #10000." },
      { id: "L4", title: "Follows new rows only at the bottom", try: "At the bottom tap +THEIRS. Then scroll up a screen and tap +THEIRS again.", pass: "At the bottom the new row appears and the list stays pinned to it. Scrolled up: nothing moves, BOTTOM says no." },
      { id: "L5", title: "Pull depth (Kindreds band)", try: "Tap TOP, then pull down past the top about a thumb's length and let go; then a small pull.", pass: "PULL shows the deepest point: 56 or more for the long pull, less for the small one." },
      { id: "L6", title: "scrollTo", try: "Tap TOP, then END.", pass: "Animated scroll to the header, then to the newest row." },
      { id: "L7", title: "Near the top", try: "Turn AUTO-PREPEND on and scroll up toward the top.", pass: "80 older rows arrive before you reach the header, and the scroll doesn't jump when they do." },
    ],
  },
  {
    title: "KEYBOARD AND FIELD",
    checks: [
      { id: "K1", title: "Dock rides the keyboard", try: "Tap the field.", pass: "The strip rises with the keyboard in one motion and sits about 8pt above it (no extra 34pt gap); KB shows a number above 0; the newest row stays visible above the dock." },
      { id: "K2", title: "Interactive dismissal", try: "Keyboard up, drag the list down slowly over the keyboard; let go half way once, all the way once.", pass: "The keyboard follows the finger and the dock follows the keyboard; it settles cleanly up or down; KB returns to 0 when down." },
      { id: "K3", title: "Return sends", try: "Type hello, press Return.", pass: "A row \"hello\" appears at the bottom on the right, the field is empty, no newline is left, the send key is disabled again." },
      { id: "K4", title: "Autocorrect + Return", try: "Type \"I saw teh\" (let the correction show) and press Return.", pass: "The row reads \"I saw the\", corrected, no newline." },
      { id: "K5", title: "Japanese composition", try: "Japanese Romaji keyboard: type konnichiha, press the confirm key once, then Return again.", pass: "The first press commits こんにちは and sends nothing; the second sends one row with the whole text." },
      { id: "K6", title: "Korean composition", try: "Korean keyboard: type 안녕하세요, press Return.", pass: "One row with all five syllables; no stray jamo left in the field; nothing sent mid-syllable." },
      { id: "K7", title: "Multi-line paste", try: "Copy two lines (e.g. from Notes) and paste them into the field. Then type a word and a space, and paste a single line that ends in a newline.", pass: "Both pastes stay in the field as pasted, newlines and all; nothing is sent." },
      { id: "K8", title: "Send key follows typing", try: "Type one letter, then delete it.", pass: "The plane key turns on with the letter and off when the field is empty, with no lag you can see." },
      { id: "K9", title: "SEED (setText)", try: "Type something, tap SEED; then tap SEED twice more.", pass: "The field shows \"A draft, restored.\" exactly once each time, the keyboard stays up if it was, the send key is on." },
      { id: "K10", title: "FOCUS / BLUR", try: "Keyboard down: tap FOCUS. Then tap BLUR.", pass: "FOCUS raises the keyboard in the Swift field (FOCUS yes); BLUR lowers it (FOCUS no)." },
      { id: "K11", title: "DISMISS (module dismissKeyboard)", try: "Focus the field, tap DISMISS.", pass: "The keyboard goes down. Note whether FOCUS turns no (if it stays yes, write it down)." },
      { id: "K12", title: "A refused send keeps the words", try: "Tap FAIL NEXT, type kept, press Return.", pass: "No row is added and \"kept\" stays in the field." },
      { id: "K13", title: "LeaveSheet over a focused field", try: "Focus the field, tap SHEET; then Keep writing.", pass: "The keyboard goes down first, then the sheet rises above everything; after it closes the keyboard does not come back by itself." },
      { id: "K14", title: "Alert over a focused field", try: "Focus the field, tap ALERT, then OK.", pass: "The keyboard is down before the alert shows; after OK it stays down." },
      { id: "K15", title: "Unmount the view while focused", try: "Focus the field (keyboard up), tap UNMOUNT VIEW. Then MOUNT VIEW.", pass: "No crash, the keyboard goes down, the Host is empty; the lab comes back at the newest row with the draft reseeded." },
      { id: "K16", title: "Same with the TS blur off", try: "Tap TS BLUR to turn it off, focus the field, UNMOUNT VIEW, MOUNT VIEW. Turn TS BLUR back on.", pass: "No crash: the Swift FocusableView guard alone was enough. (A crash here means both guards are needed: write it down.)" },
      { id: "K17", title: "Unmount the Host while focused", try: "Focus the field, tap UNMOUNT HOST, then MOUNT HOST.", pass: "No crash; the lab comes back." },
      { id: "K18", title: "Leave while focused", try: "Focus the field, tap CHECKLIST (the whole lab unmounts).", pass: "No crash; the keyboard is gone on the checklist." },
    ],
  },
  {
    title: "MENUS",
    checks: [
      { id: "M1", title: "Menu on a row", try: "Long-press a row on the left.", pass: "Reply, Copy and Report (red); the lifted copy is the bubble with its round corners, not a square or a see-through box." },
      { id: "M2", title: "Destructive item", try: "Long-press a row on the right, choose Take back.", pass: "The row now reads \"(taken back)\" and has no menu; the status line says takeBack." },
      { id: "M3", title: "No menu", try: "Long-press a row whose number is a multiple of 7 (e.g. #10297).", pass: "Nothing opens and nothing else happens." },
      { id: "M4", title: "Open through a live update", try: "Turn LIVE on, long-press a row and hold the menu open for 5 seconds.", pass: "The menu stays open while the list updates under it (the newest row's meta ticks, a row arrives every 4s)." },
      { id: "M5", title: "VoiceOver actions", try: "VoiceOver on: focus a left row, swipe up/down through its actions.", pass: "Reply, Copy, Report each listed once (not twice); a double tap on one fires it (status line)." },
      { id: "M6", title: "Tap is not a long press", try: "Tap a row once.", pass: "Nothing happens; only the long press opens the menu." },
      { id: "M7", title: "Menus in Midnight", try: "THEME to Midnight, long-press a row.", pass: "The menu is drawn dark." },
    ],
  },
  {
    title: "PICTURES AND VOICE",
    checks: [
      { id: "I1", title: "Bundled PNG (expo-asset file://)", try: "TOP: look at the first tile.", pass: "The portrait fills its tile." },
      { id: "I2", title: "https picture", try: "Second tile (needs network).", pass: "The picture fades in." },
      { id: "I3", title: "Video poster", try: "Third tile (remote mp4, needs network).", pass: "A still from the video appears." },
      { id: "I4", title: "Bird snapshot", try: "Fourth tile.", pass: "Wren appears with no box behind her (transparent)." },
      { id: "I5", title: "No flash on return", try: "Scroll the header off screen and back.", pass: "All four draw at once, no placeholder flash." },
      { id: "I6", title: "Voice card on the one player", try: "Tap play; pause half way; play to the end; play again.", pass: "Sound plays, bars and time move smoothly; pause holds the bars where they are; at the end it rests; the next play starts from 0:00." },
    ],
  },
  {
    title: "ISLAND AND GESTURES",
    checks: [
      { id: "S1", title: "Island inside the Swift scroll", try: "TOP: look at the cord.", pass: "The cord island is drawn inside the header and its ring swings smoothly (the Reanimated loop)." },
      { id: "S2", title: "RNGH pan inside a Swift ScrollView", try: "Drag the cord's knob down; let go half way; then pull it all the way.", pass: "The knob follows the finger and the list does NOT scroll while you drag it; half way it springs back; all the way shows LAST PULL 100%." },
      { id: "S3", title: "Scrolling from the island", try: "Start a vertical drag on the island's empty area (away from the knob).", pass: "Write down which wins: the list scrolling, or nothing (this decides whether Today's blind stays an island)." },
      { id: "S4", title: "Island after scrolling away", try: "Scroll the header off and back, then drag the cord again.", pass: "The ring still swings and the cord still works (the island survived re-layout)." },
    ],
  },
  {
    title: "THEMES",
    checks: [
      { id: "T1", title: "Four themes", try: "Tap THEME through Classic, Midnight, Lavender, Paper (OFF returns to normal).", pass: "The lab repaints each time; in Midnight the keyboard is dark too." },
      { id: "T2", title: "The switch for VoiceOver", try: "VoiceOver on: focus the switch in the header.", pass: "Read as a switch with its label and on/off; a double tap flips it (status line)." },
    ],
  },
  {
    title: "PROP COST",
    checks: [
      { id: "P1", title: "BENCH", try: "Tap BENCH and wait for done (about half a minute; don't touch the lab).", pass: "Numbers for 80, 240 and 500 rows appear on the checklist. Record them: they set the chat window. Nothing hangs." },
    ],
  },
  {
    title: "REACT NATIVE REPLY STRIP (below)",
    checks: [
      { id: "R1", title: "setText after typing", try: "Type in the strip below, tap SET DRAFT.", pass: "The strip shows \"draft\" and the send key is on." },
      { id: "R2", title: "setText of the same draft after editing", try: "SET DRAFT, edit the word, SET DRAFT again.", pass: "\"draft\" is shown again and the keyboard stays up." },
      { id: "R3", title: "Restore after a send", try: "Type, send with the key (the field clears), tap RESTORE.", pass: "The sent words come back and the send key is on." },
      { id: "R4", title: "setText empty", try: "Type, tap SET EMPTY.", pass: "The field is empty and the send key is off." },
    ],
  },
];

/* ── results, kept for the session ─────────────────────────────────────── */

type Mark = "pass" | "fail";
type Stat = { median: number; p90: number; count: number };
type BenchRow = { n: number; sent: number; stamp: Stat; rows: Stat; command: Stat };
const saved: { marks: Record<string, Mark>; bench: BenchRow[] | null } = { marks: {}, bench: null };

/* ── the rows ──────────────────────────────────────────────────────────── */

const FIRST = 10000;
const TAKEN = "(taken back)";
const SENTENCES = [
  "The post came late again today.",
  "I keep a stack of your letters by the window and reread the second one when it rains.",
  "My sister says I write like I'm talking to a lighthouse.",
  "Nothing happened, which was lovely.",
  "We found a bakery that only opens on Thursdays and only sells one kind of bread.",
  "Do you ever start a sentence and forget which language you began it in?",
  "The cat learned to open the cupboard, so now the cupboard has a chair against it.",
  "I tried your trick of writing before breakfast and it worked for exactly two days.",
  "There was a storm last night and the whole street lost power for an hour.",
  "Tell me something small that made you laugh this week.",
  "My handwriting gets worse the happier I am.",
  "The train was empty except for a man reading a map of a different city.",
  "I'm learning to make dumplings and they all look like tiny hats.",
  "It's strange to miss a place you've only read about.",
  "Here the leaves have started turning and everyone pretends not to be cold yet.",
  "I wrote you three drafts of this and this one is the shortest.",
];
const SHORT = ["ok", "yes!", "ha", "Same.", "Thank you.", "Good night ✉️"];

/** a stable spread of numbers from a row's number */
function mix(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}

const MENU_THEIRS: KMenuAction[] = [
  { key: "reply", title: "Reply", icon: "arrowshape.turn.up.left" },
  { key: "copy", title: "Copy", icon: "doc.on.doc" },
  { key: "report", title: "Report", icon: "flag", destructive: true },
];
const MENU_MINE: KMenuAction[] = [
  { key: "reply", title: "Reply", icon: "arrowshape.turn.up.left" },
  { key: "copy", title: "Copy", icon: "doc.on.doc" },
  { key: "takeBack", title: "Take back", icon: "arrow.uturn.backward", destructive: true },
];

/** Row #n: a chat line of one to six sentences (some one word, some two paragraphs), on a side
    chosen by its number; every 7th row has no menu. */
function makeRow(n: number, mine?: boolean, body?: string): KLabRow {
  const h = mix(n);
  const isMine = mine ?? h % 3 === 0;
  let text = body;
  if (text == null) {
    const kind = h % 10;
    if (kind === 0) text = SHORT[(h >>> 4) % SHORT.length];
    else {
      const count = 1 + ((h >>> 4) % 6);
      const parts: string[] = [];
      for (let i = 0; i < count; i++) parts.push(SENTENCES[(h >>> (i + 6)) % SENTENCES.length]);
      text = parts.join(" ");
      if (kind === 9) text += "\n\n" + SENTENCES[(h >>> 3) % SENTENCES.length];
    }
  }
  return { id: `r${n}`, body: text, mine: isMine, meta: `#${n}`, menu: n % 7 === 0 ? [] : isMine ? MENU_MINE : MENU_THEIRS };
}

const makeRows = (from: number, to: number): KLabRow[] => Array.from({ length: to - from }, (_, i) => makeRow(from + i));
const rowNumber = (row: KLabRow): number => Number(row.id.slice(1));

/* ── what the lab shows ────────────────────────────────────────────────── */

const PORTRAIT = require("../../../assets/aura-avatars/f-02-tender-thinker.png");
/* a fixed picture and a short sample video, for the https and poster tiles (dev only) */
const REMOTE_IMAGE: KImageRefProps = { uri: "https://picsum.photos/id/1025/600/600", key: "lab:remote:1025" };
const REMOTE_VIDEO: KImageRefProps = { uri: "https://download.samplelib.com/mp4/sample-5s.mp4", key: "lab:poster:sample-5s", kind: "videoPoster" };
const VOICE_KEY = "lab-voice";
const SEED_TEXT = "A draft, restored.";
const BENCH_WINDOWS = [80, 240, 500];
const BENCH_SAMPLES = 15;

const THEME_KEYS = Object.keys(THEMES.themes) as KThemeKey[];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const short = (s: string) => (s.length > 24 ? s.slice(0, 24) + "…" : s).replace(/\n/g, "⏎");

function stats(samples: (number | null)[]): Stat {
  const ok = samples.filter((v): v is number => v != null).sort((a, b) => a - b);
  if (!ok.length) return { median: NaN, p90: NaN, count: 0 };
  const at = (q: number) => ok[Math.min(ok.length - 1, Math.floor(q * (ok.length - 1) + 0.5))];
  return { median: Math.round(at(0.5) * 10) / 10, p90: Math.round(at(0.9) * 10) / 10, count: ok.length };
}

const fmtStat = (s: Stat) => (s.count ? `${s.median}/${s.p90}` : "—");

/* ── the page ──────────────────────────────────────────────────────────── */

export default function Step5Lab() {
  if (!__DEV__) return <Redirect href="/" />;
  return <LabRoot />;
}

function LabRoot() {
  const [mode, setMode] = useState<"checklist" | "lab">("checklist");
  const [marks, setMarks] = useState<Record<string, Mark>>(saved.marks);
  const [bench, setBench] = useState<BenchRow[] | null>(saved.bench);
  useEffect(() => {
    saved.marks = marks;
  }, [marks]);
  useEffect(() => {
    saved.bench = bench;
  }, [bench]);

  return mode === "lab" ? (
    <LabSurface onChecklist={() => setMode("checklist")} onBench={setBench} />
  ) : (
    <Checklist marks={marks} setMarks={setMarks} bench={bench} onOpen={() => setMode("lab")} />
  );
}

function Chip({ label, on = false, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  const { t: tk } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      hitSlop={4}
      style={({ pressed }) => ({
        paddingVertical: 7,
        paddingHorizontal: 10,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: tk.ln,
        backgroundColor: on ? tk.ink : tk.sf,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1, color: on ? tk.sf : tk.ink }}>{label}</Text>
    </Pressable>
  );
}

/* ── the checklist ─────────────────────────────────────────────────────── */

function Checklist({
  marks,
  setMarks,
  bench,
  onOpen,
}: {
  marks: Record<string, Mark>;
  setMarks: (f: (m: Record<string, Mark>) => Record<string, Mark>) => void;
  bench: BenchRow[] | null;
  onOpen: () => void;
}) {
  const { key, t: tk } = useTheme();
  const available = isKindredlyUIViewAvailable("KLabView");
  const [copied, setCopied] = useState(false);
  // a second tap on the same mark clears it
  const mark = (id: string, m: Mark) =>
    setMarks((all) => {
      const next = { ...all };
      if (next[id] === m) delete next[id];
      else next[id] = m;
      return next;
    });
  const done = Object.keys(marks).length;
  const total = CHECKLIST.reduce((n, s) => n + s.checks.length, 0);

  const copy = () => {
    const lines = [`Kindredly step-5 lab (0b), ${new Date().toISOString()}, theme ${THEMES.themes[key].name}`];
    for (const s of CHECKLIST) for (const c of s.checks) lines.push(`${c.id} ${marks[c.id]?.toUpperCase() ?? "-"}  ${c.title}`);
    if (bench) {
      lines.push("", "BENCH ms, median/p90 (JS Date.now() sent → Swift arrival)");
      for (const b of bench) lines.push(`${b.n} rows (sent ${b.sent}): props ${fmtStat(b.stamp)} · rows change ${fmtStat(b.rows)} · command ${fmtStat(b.command)}`);
    }
    void copyText(lines.join("\n")).then(() => setCopied(true));
  };

  const mono = { fontFamily: PF.monoSemi, letterSpacing: 1.2 } as const;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tk.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ ...mono, fontSize: 11, color: tk.ind }}>STEP 5 LAB · 0b SPIKE</Text>
          <Chip label="BACK" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
        </View>
        <Text style={{ fontSize: 15, lineHeight: 21, color: tk.ink }}>
          {available
            ? `Open the lab, try each check, mark it. ${done}/${total} marked. Copy the results into the PR.`
            : "This build has no KLabView. Run pod install (or prebuild without --clean), rebuild the dev client, and check the built .app."}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {available ? <Chip label="OPEN THE LAB" on onPress={onOpen} /> : null}
          <Chip label={copied ? "COPIED" : "COPY RESULTS"} onPress={copy} />
        </View>

        {bench ? (
          <View style={{ borderWidth: 1.5, borderColor: tk.ln, borderRadius: 14, padding: 12, gap: 4, backgroundColor: tk.sf }}>
            <Text style={{ ...mono, fontSize: 10, color: tk.mute }}>BENCH · MS MEDIAN/P90 · JS → SWIFT</Text>
            {bench.map((b) => (
              <Text key={b.n} style={{ fontFamily: PF.monoMed, fontSize: 11, color: tk.ink }}>
                {`${b.n} rows (sent ${b.sent})  props ${fmtStat(b.stamp)}  rows ${fmtStat(b.rows)}  cmd ${fmtStat(b.command)}`}
              </Text>
            ))}
          </View>
        ) : null}

        {CHECKLIST.map((s) => (
          <View key={s.title} style={{ gap: 8 }}>
            <Text style={{ ...mono, fontSize: 10, color: tk.mute, marginTop: 8 }}>{s.title}</Text>
            {s.checks.map((c) => (
              <View key={c.id} style={{ borderWidth: 1, borderColor: tk.line, borderRadius: 12, padding: 10, gap: 4, backgroundColor: tk.sf }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ ...mono, fontSize: 10, color: tk.ind }}>{c.id}</Text>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: tk.ink }}>{c.title}</Text>
                  <Chip label="PASS" on={marks[c.id] === "pass"} onPress={() => mark(c.id, "pass")} />
                  <Chip label="FAIL" on={marks[c.id] === "fail"} onPress={() => mark(c.id, "fail")} />
                </View>
                <Text style={{ fontSize: 13, lineHeight: 18, color: tk.sub }}>{`Try: ${c.try}`}</Text>
                <Text style={{ fontSize: 13, lineHeight: 18, color: tk.ink }}>{`Pass: ${c.pass}`}</Text>
              </View>
            ))}
          </View>
        ))}

        <StripChecks />
      </ScrollView>
    </SafeAreaView>
  );
}

/* The React Native ReplyStrip's setText cases (ts-kit-rn asked for these on a device). */
function StripChecks() {
  const { t: tk } = useTheme();
  const strip = useRef<ReplyStripHandle>(null);
  const [text, setText] = useState("");
  const [sent, setSent] = useState("");
  return (
    <View style={{ gap: 10, marginTop: 8 }}>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.2, color: tk.mute }}>REACT NATIVE REPLY STRIP · R1–R4</Text>
      <View style={{ paddingRight: 4 }}>
        <ReplyStrip
          ref={strip}
          placeholder="write back…"
          canSend={text.trim().length > 0}
          onChangeText={setText}
          onSend={(v) => {
            setSent(v);
          }}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Chip label="SET DRAFT" onPress={() => strip.current?.setText("draft")} />
        <Chip label="RESTORE" onPress={() => strip.current?.setText(sent)} />
        <Chip label="SET EMPTY" onPress={() => strip.current?.setText("")} />
      </View>
      <Text style={{ fontFamily: PF.monoMed, fontSize: 10, color: tk.sub }}>{`field "${short(text)}" · last sent "${short(sent)}"`}</Text>
    </View>
  );
}

/* ── the lab ───────────────────────────────────────────────────────────── */

const LAB_STRINGS = (): KLabStrings => ({
  placeholder: "write back…",
  sendLabel: tr("ld.send"),
  plusLabel: "More",
  hint: "RETURN SENDS · DRAG THE LIST DOWN TO DISMISS",
  trayText: "The + opens this: the dock grows while the keyboard is up, and should stay on it.",
  islandTitle: "ISLAND · CLOSEOFDAY'S CORD (REACT NATIVE)",
  mediaTitle: "PICTURES · KIMAGE",
  assetCaption: "BUNDLED PNG",
  remoteCaption: "HTTPS",
  posterCaption: "VIDEO POSTER",
  birdCaption: "BIRD SNAPSHOT",
  voiceTitle: "VOICE · ONE PLAYER, PLAYBACK COMMAND",
  voiceDuration: "0:06",
  playLabel: tr("vo.play"),
  pauseLabel: tr("vo.pause"),
  toggleLabel: "A 10a switch",
  listTitle: "300 ROWS · NEWEST AT THE BOTTOM",
});

function LabSurface({ onChecklist, onBench }: { onChecklist: () => void; onBench: (b: BenchRow[]) => void }) {
  const { key, t: tk } = useTheme();
  const forced = useDevThemeOverride();
  const safe = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [history, setHistory] = useState<KLabRow[]>(() => makeRows(FIRST, FIRST + 300));
  const [taken, setTaken] = useState<ReadonlySet<string>>(() => new Set());
  const [live, setLive] = useState(false);
  const [liveTick, setLiveTick] = useState(0);
  const [autoPrepend, setAutoPrepend] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const [viewOn, setViewOn] = useState(true);
  const [hostOn, setHostOn] = useState(true);
  const [tsBlur, setTsBlur] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [windowN, setWindowN] = useState<number | null>(null);
  const [stamp, setStamp] = useState(0);
  const [facts, setFacts] = useState<KLabFacts>({ atBottom: true, topRowId: "", keyboardInset: 0, focused: false });
  const [pull, setPull] = useState(0);
  const [last, setLast] = useState("opened");
  const [benching, setBenching] = useState("");

  const strings = useMemo(LAB_STRINGS, []);
  const insets = useMemo(() => ({ top: 0, bottom: safe.bottom, tabBarRoom: 0 }), [safe.bottom]);
  const asset = useAssetImageRef(PORTRAIT);
  const bird = useBirdImageRef("official");
  const voiceUrl = demoMediaUrl("demo/voice.m4a");

  /* what Swift holds in @State and a remounted view must be told again */
  const ref = useRef<KScreenHandle>(null);
  const draft = useRef("");
  const canSendSent = useRef(false);
  const voiceState = useRef<VoicePlayback | null>(null);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  const playbackArgs = (s: VoicePlayback | null) => ({ ...playbackCommandArgs(s), failed: voiceUrl ? (s?.failed ?? false) : true });

  const commands: KCommandSender<KLabCommands> = useKCommands<KLabCommands>(ref, {
    blurOnUnmount: tsBlur,
    onViewAttach: () => {
      commands.send("setText", { target: "reply", value: draft.current });
      commands.send("composer", { canSend: canSendSent.current });
      commands.send("playback", playbackArgs(voiceState.current));
    },
  });

  const voice = useVoicePlayback({
    onChange: (s) => {
      voiceState.current = s;
      commands.send("playback", playbackArgs(s));
    },
  });

  /* the rows: taken-back lines and the LIVE tick applied, then the bench window */
  const rowsAll = useMemo(() => {
    const lastIdx = history.length - 1;
    return history.map((r, i) => {
      let row = r;
      if (taken.has(r.id)) row = { ...row, body: TAKEN, menu: [] };
      if (live && liveTick > 0 && i === lastIdx) row = { ...row, meta: `${row.meta} · live ${liveTick}` };
      return row;
    });
  }, [history, taken, live, liveTick]);
  const rows = useMemo(() => (windowN ? rowsAll.slice(-windowN) : rowsAll), [rowsAll, windowN]);
  const rev = useRev(rows);

  const appendTheirs = () => setHistory((h) => [...h, makeRow(rowNumber(h[h.length - 1]) + 1, false)]);
  const lastPrepend = useRef(0);
  const prepend = (count = 80) => {
    lastPrepend.current = Date.now();
    setHistory((h) => {
      const first = rowNumber(h[0]);
      return [...makeRows(first - count, first), ...h];
    });
  };

  useEffect(() => {
    if (!live) return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setLiveTick(n);
      if (n % 4 === 0) appendTheirs();
    }, 1000);
    return () => clearInterval(id);
  }, [live]);

  const sendCanSend = (v: boolean) => {
    if (canSendSent.current === v) return;
    canSendSent.current = v;
    commands.send("composer", { canSend: v });
  };

  const onSend = (text: string) => {
    if (!text.trim()) return;
    if (failNext) {
      setFailNext(false);
      setLast(`send refused, kept "${short(text)}"`);
      return;
    }
    setHistory((h) => [...h, makeRow(rowNumber(h[h.length - 1]) + 1, true, text)]);
    draft.current = "";
    commands.send("setText", { target: "reply", value: "" });
    sendCanSend(false);
    commands.send("scrollTo", { key: "end", animated: true });
    setLast(`sent "${short(text)}"`);
  };

  /* BENCH: for 80, 240 and 500 rows, how long a props change takes to reach the Swift body (a
     stamp alone, then a stamp with one row appended) against a command through the bus. Each
     sample waits for the one before; a lost one times out after 3s. */
  const waiter = useRef<((m: KLabMeasure) => void) | null>(null);
  const sample = (kind: KLabMeasure["kind"], fire: () => void) =>
    new Promise<{ ms: number; n: number } | null>((resolve) => {
      const timer = setTimeout(() => {
        waiter.current = null;
        resolve(null);
      }, 3000);
      waiter.current = (m) => {
        if (m.kind !== kind) return;
        clearTimeout(timer);
        waiter.current = null;
        resolve({ ms: m.ms, n: m.n });
      };
      fire();
    });

  const runBench = async () => {
    if (benching) return;
    setLive(false);
    setBenching("starting");
    if (history.length < 500) prepend(500 - history.length + 10);
    await sleep(800);
    const out: BenchRow[] = [];
    for (const n of BENCH_WINDOWS) {
      if (!alive.current) return;
      setWindowN(n);
      await sleep(800);
      const stampMs: (number | null)[] = [];
      const rowsMs: (number | null)[] = [];
      const cmdMs: (number | null)[] = [];
      let sent = 0;
      for (let i = 0; i < BENCH_SAMPLES && alive.current; i++) {
        setBenching(`${n} rows · props ${i + 1}/${BENCH_SAMPLES}`);
        const r = await sample("stamp", () => setStamp(Date.now()));
        stampMs.push(r?.ms ?? null);
        if (r) sent = r.n;
        await sleep(50);
      }
      for (let i = 0; i < BENCH_SAMPLES && alive.current; i++) {
        setBenching(`${n} rows · rows change ${i + 1}/${BENCH_SAMPLES}`);
        const r = await sample("stamp", () => {
          appendTheirs();
          setStamp(Date.now());
        });
        rowsMs.push(r?.ms ?? null);
        await sleep(50);
      }
      for (let i = 0; i < BENCH_SAMPLES && alive.current; i++) {
        setBenching(`${n} rows · command ${i + 1}/${BENCH_SAMPLES}`);
        const r = await sample("command", () => commands.send("ping", { at: Date.now() }));
        cmdMs.push(r?.ms ?? null);
        await sleep(50);
      }
      out.push({ n, sent, stamp: stats(stampMs), rows: stats(rowsMs), command: stats(cmdMs) });
    }
    if (!alive.current) return;
    setWindowN(null);
    setBenching("");
    onBench(out);
    setLast(`bench done: ${out.map((b) => `${b.n}: ${fmtStat(b.stamp)}/${fmtStat(b.command)}`).join(" · ")}`);
  };

  const themeIndex = forced ? THEME_KEYS.indexOf(forced) : -1;
  const nextTheme = () => setDevThemeOverride(themeIndex + 1 < THEME_KEYS.length ? THEME_KEYS[themeIndex + 1] : null);

  const status =
    `BOTTOM ${facts.atBottom ? "yes" : "no"} · TOP ${facts.topRowId ? "#" + facts.topRowId.slice(1) : "—"} · KB ${Math.round(facts.keyboardInset)} · ` +
    `FOCUS ${facts.focused ? "yes" : "no"} · PULL ${pull} · ROWS ${rows.length}\n` +
    (benching ? `BENCH ${benching}` : last);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: tk.bg }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 6, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.2, color: tk.ind }}>STEP 5 LAB · 0b</Text>
          <Chip label="CHECKLIST" onPress={onChecklist} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ gap: 6 }}>
          <Chip label={`THEME ${forced ? THEMES.themes[key].name.toUpperCase() : "OFF"}`} onPress={nextTheme} />
          <Chip label="SEED" onPress={() => commands.send("setText", { target: "reply", value: SEED_TEXT })} />
          <Chip label="FOCUS" onPress={() => commands.send("focus", { target: "reply" })} />
          <Chip label="BLUR" onPress={() => commands.send("blur", {})} />
          <Chip label="DISMISS" onPress={() => dismissKeyboard()} />
          <Chip label="SHEET" onPress={() => openLeaveSheet(() => setSheet(true), ref)} />
          <Chip label="ALERT" onPress={() => blurThen(() => Alert.alert("Over the lab", "The keyboard should already be down.", [{ text: "OK" }]), ref)} />
          <Chip label="TOP" onPress={() => commands.send("scrollTo", { key: "top", animated: true })} />
          <Chip label="END" onPress={() => commands.send("scrollTo", { key: "end", animated: true })} />
          <Chip label="PREPEND 80" onPress={() => prepend(80)} />
          <Chip label="+THEIRS" onPress={appendTheirs} />
          <Chip label="LIVE" on={live} onPress={() => setLive((v) => !v)} />
          <Chip label="AUTO-PREPEND" on={autoPrepend} onPress={() => setAutoPrepend((v) => !v)} />
          <Chip label="FAIL NEXT" on={failNext} onPress={() => setFailNext((v) => !v)} />
          <Chip label={viewOn ? "UNMOUNT VIEW" : "MOUNT VIEW"} on={!viewOn} onPress={() => setViewOn((v) => !v)} />
          <Chip label={hostOn ? "UNMOUNT HOST" : "MOUNT HOST"} on={!hostOn} onPress={() => setHostOn((v) => !v)} />
          <Chip label="TS BLUR" on={tsBlur} onPress={() => setTsBlur((v) => !v)} />
          <Chip label={benching ? "BENCH…" : "BENCH"} on={!!benching} onPress={() => void runBench()} />
          <Chip
            label="RESET"
            onPress={() => {
              draft.current = "";
              canSendSent.current = false;
              commands.send("reset", {});
            }}
          />
        </ScrollView>
        <Text numberOfLines={2} style={{ fontFamily: PF.monoMed, fontSize: 10, lineHeight: 14, color: tk.sub }}>
          {status}
        </Text>
      </View>

      {hostOn ? (
        <SurfaceHost field>
          {viewOn ? (
            <KLabView
              ref={commands.ref}
              theme={key}
              insets={insets}
              rev={rev}
              rows={rows}
              strings={strings}
              assetImage={asset}
              remoteImage={REMOTE_IMAGE}
              posterImage={REMOTE_VIDEO}
              birdImage={bird}
              stamp={stamp}
              onLabSend={onSend}
              onLabDraft={(text) => {
                draft.current = text;
                sendCanSend(text.trim().length > 0);
              }}
              onLabRowAction={(id, action) => {
                if (action === "takeBack") setTaken((s) => new Set(s).add(id));
                setLast(`${action} on #${id.slice(1)}`);
              }}
              onLabVoiceToggle={() => voice.toggle(VOICE_KEY, voiceUrl, 6)}
              onLabFacts={setFacts}
              onLabPull={(d) => setPull(Math.round(d))}
              onLabNearTop={() => {
                if (autoPrepend && Date.now() - lastPrepend.current > 1000) {
                  prepend(80);
                  setLast("near the top: prepended 80");
                }
              }}
              onLabMeasure={(m) => waiter.current?.(m)}
              onLabToggle={(on) => setLast(`switch ${on ? "on" : "off"}`)}
            >
              <KIsland name="cord" interactive style={{ width: width - 32, height: CORD_HEIGHT }}>
                <Cord />
              </KIsland>
            </KLabView>
          ) : null}
        </SurfaceHost>
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.2, color: tk.mute }}>HOST UNMOUNTED</Text>
        </View>
      )}

      <LeaveSheet
        open={sheet}
        modal
        title="Leave this letter?"
        body="The lab's sheet: the keyboard should have gone down before this rose."
        actions={[{ label: "Leave", kind: "destructive", onPress: () => setSheet(false) }]}
        cancelLabel="Keep writing"
        onCancel={() => setSheet(false)}
      />
    </SafeAreaView>
  );
}

/* CloseOfDay's cord, as an island: the same plain Pan (no offsets, as CloseOfDay has it) on a
   knob that pulls down over 72pt and springs back, and a Reanimated loop swinging the ring. The
   island is 170 tall: 12 padding, the ring and cord's 40, the 72 pull and the 32 knob. */
const CORD_RANGE = 72;
const CORD_HEIGHT = 170;

function Cord() {
  const { t: tk } = useTheme();
  const y = useSharedValue(0);
  const from = useSharedValue(0);
  const swing = useSharedValue(0);
  const [lastPull, setLastPull] = useState<number | null>(null);

  useEffect(() => {
    swing.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [swing]);

  const pan = Gesture.Pan()
    .onStart(() => {
      from.value = y.value;
    })
    .onUpdate((e) => {
      y.value = Math.min(1, Math.max(0, from.value + e.translationY / CORD_RANGE));
    })
    .onEnd(() => {
      runOnJS(setLastPull)(Math.round(y.value * 100));
      y.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.back(1.4)) });
    });

  const ring = useAnimatedStyle(() => ({ transform: [{ rotate: `${(swing.value - 0.5) * 30}deg` }] }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * CORD_RANGE }] }));
  const cord = useAnimatedStyle(() => ({ height: 14 + y.value * CORD_RANGE }));

  return (
    <View style={{ flex: 1, flexDirection: "row", gap: 16, padding: 12, borderRadius: 16, borderWidth: 1.5, borderColor: tk.ln, backgroundColor: tk.sf }}>
      <View style={{ width: 44, alignItems: "center" }}>
        <Animated.View style={[{ width: 26, height: 26, borderRadius: 13, borderWidth: 3, borderColor: tk.ind }, ring]} />
        <Animated.View style={[{ width: 2, backgroundColor: tk.ink }, cord]} />
        <GestureDetector gesture={pan}>
          <Animated.View hitSlop={12} style={[{ position: "absolute", top: 40, width: 32, height: 32, borderRadius: 16, backgroundColor: tk.ink }, knob]} />
        </GestureDetector>
      </View>
      <View style={{ flex: 1, justifyContent: "center", gap: 6 }}>
        <Text style={{ fontSize: 14, lineHeight: 19, color: tk.ink }}>Drag the knob down. The list must not scroll while you hold it.</Text>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.2, color: tk.mute }}>{lastPull == null ? "LAST PULL —" : `LAST PULL ${lastPull}%`}</Text>
      </View>
    </View>
  );
}
