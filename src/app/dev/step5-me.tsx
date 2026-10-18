import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isKindredlyUIViewAvailable } from "../../../modules/kindredly-ui";
import { setDevThemeOverride, useDevThemeOverride, useTheme } from "../../lib/theme";
import { t, useLang } from "../../lib/i18n";
import { PF } from "../../theme/post";
import { THEME_KEYS, THEMES, type ThemeKey } from "../../theme/themes";
import { storeAura } from "../../lib/dev-store";
import { whereabouts } from "../../lib/whereabouts";
import { flightLog } from "../../lib/flight-log";
import { useWhoBook } from "../../lib/who";
import type { Aura } from "../../lib/aura";
import type { UsedStamp } from "../../lib/aura";
import type { Minted } from "../../lib/keepsakes";
import { DEMO_THREADS } from "../../data/demo";
import { daylight } from "../../components/CourierCard";
import { auraCardFacts } from "../../components/AuraCard";
import { buildMeView, segmentIndex, spokenAgo } from "../../screens/me/me-model";
import { meFormat } from "../../screens/me/me-format";
import { keepsakeFacts, stampFacts, type MeActions, type MeModel } from "../../screens/me/useMeModel";
import { MeNative } from "../../screens/me/MeNative";
import { MeRN } from "../../screens/me/MeRN";
import "../../data/strings-step5-me";

/* dev only — THE ME TAB ON DEMO DATA (10a step 5, slice me).
   kindredly:///dev/step5-me

   The Me screen as either renderer draws it, from fixtures (no network, no
   account): data/demo's threads for the courier and the kindreds figure,
   the store-mode aura (named) or a sketch / first-letters / no-read-yet
   aura, a handful of used stamps with dates, three keepsakes (one NEW) —
   built by the same pure model the tab runs on (screens/me/me-model) and
   drawn by MeNative (SwiftUI, with its three React Native islands) or MeRN.

   The panel at the bottom (HIDE for a clean screenshot; a dot brings it
   back):
   - THEME: the dev theme override (Classic / Midnight / Lavender / Paper,
     OFF = the normal theme), the whole app, never saved;
   - SWIFT / RN: which renderer (SWIFT needs a dev client built with the Me
     slice's KMeView, after pod install);
   - the segment it opens on (C A S F: the Swift view is rebuilt on it), and
     TOP (Me pressed again);
   - AURA: NAMED · SKETCH (the title's sketch) · DESK (the desk drawn as a
     sketch) · PENCIL · EARLY (the waiting lines) · NONE (the skeleton). Check
     DESK, PENCIL, EARLY and NONE in MIDNIGHT too: the rungs before colour
     are drawn in the theme's light strokes there (me-model
     auraSlotPalette), and must read on the dark slot;
   - (the Swift view's own chips: a switch never animates the card, only the
     chip's highlight moves, and with Reduce Motion not even that; try one
     while the chips are pinned over the short First Class card);
   - STAMPS, KEEPSAKES, FC (free / member / cofounder), DAY OFF, NO NAME
     (no pen name: "You"), HUNGRY.
   Everything that would leave the page says where it would go instead.
   The panel's words are English: a dev page. */

type AuraMode = "named" | "sketch" | "desk" | "pencil" | "early" | "none";
const AURA_MODES: readonly AuraMode[] = ["named", "sketch", "desk", "pencil", "early", "none"];
type FcMode = "free" | "member" | "cofounder";

const NOW = Date.now();
const H = 3600_000;
const DAY = 24 * H;
const iso = (ms: number) => new Date(ms).toISOString();

/* the aura fixtures: the named store aura, and the same reader on the way there */
function demoAura(mode: AuraMode): Aura | null {
  const named = storeAura();
  if (mode === "named") return named;
  if (mode === "none") return null;
  // early: two letters, the lines waiting to be written (AuraScene "lines")
  if (mode === "early") return { ...named, phase: "empty", stickers: null, sources: { letters: 2, sealed: 0, conversations: 0 } } as Aura;
  // pencil: four letters, nothing held yet — the desk in pencil (AuraScene "pencil")
  if (mode === "pencil") return { ...named, phase: "empty", stickers: null, sources: { letters: 4, sealed: 0, conversations: 0 } } as Aura;
  // sketch: the noun known, one label held, two trying on (the title's own sketch, a picture);
  // desk: the same with no noun yet, so the desk itself is drawn as a sketch (AuraScene "sketch")
  const home = (named.stickers?.home ?? []).map((s, i) => ({ ...s, state: i === 0 ? "established" : "emerging" }));
  return {
    ...named,
    phase: "shaping",
    sources: { letters: 8, sealed: 0, conversations: 0 },
    stickers: {
      ...named.stickers!,
      home,
      byDimension: { [home[0].dimension]: home[0] },
      title: mode === "desk" ? null : { state: "partial", noun: "observer", adjective: null, basis: [] },
    },
  } as unknown as Aura;
}

const DEMO_STAMPS: UsedStamp[] = [
  { id: "never-told", at: iso(NOW - 2 * H) },
  { id: "almost-texted", at: iso(NOW - 3 * DAY) },
  { id: "hot-take", at: iso(NOW - 9 * DAY) },
  { id: "off-chest", at: iso(NOW - 20 * DAY) },
  { id: "pretending", at: null },
];

const shelf = (n: number): Minted[] =>
  (
    [
      { id: "first-reply", at: NOW - 2 * DAY, evidence: "", minted: NOW - DAY },
      { id: "first-flight", at: NOW - 6 * DAY, evidence: "", minted: NOW - 5 * DAY },
      { id: "night-flight", at: NOW - 8 * DAY, evidence: "", minted: NOW - 7 * DAY },
    ] as Minted[]
  ).slice(0, n);

export default function Step5Me() {
  if (!__DEV__) return <Redirect href="/" />;
  return <MeLab />;
}

function MeLab() {
  const lang = useLang();
  const { key, t: tk } = useTheme();
  const forced = useDevThemeOverride();
  const safe = useSafeAreaInsets();
  const swiftAvailable = isKindredlyUIViewAvailable("KMeView");

  const [swift, setSwift] = useState(swiftAvailable);
  const [segment, setSegment] = useState(0);
  const [build, setBuild] = useState(0); // rebuilds the renderer, so it opens on `segment`
  const [auraMode, setAuraMode] = useState<AuraMode>("named");
  const [stamps, setStamps] = useState(true);
  const [keep, setKeep] = useState(3);
  const [fc, setFc] = useState<FcMode>("free");
  const [dayOff, setDayOff] = useState(false);
  const [noName, setNoName] = useState(false);
  const [hungry, setHungry] = useState(false);
  const [serial, setSerial] = useState(0);
  const [panel, setPanel] = useState(true);

  const away = useCallback((where: string) => Alert.alert("Dev page", `In the app this opens ${where}.`), []);
  // the diary names a pen pal as the tab does (lib/who): the number, or the courier name with the switch on
  const book = useWhoBook({ threads: DEMO_THREADS });

  const model = useMemo<MeModel>(() => {
    const threads = DEMO_THREADS;
    const aura = demoAura(auraMode);
    const where = whereabouts(threads, 12);
    const lastWrittenAt = aura?.lastWrittenAt ?? null;
    const entry = flightLog({ where, threads, lastWrittenAt, seenToday: 3, daylight: daylight(), book });
    const hunger = hungry
      ? { tier: "hungry" as const, mood: "sleepy" as const, word: "HUNGRY", line: "nothing to carry for four days. i'm getting light.", sub: "one letter would do it", wilt: false }
      : null;
    const premium = fc !== "free";
    const cofounderNo = fc === "cofounder" ? 7 : null;
    const wren = "Pip";
    const kept = shelf(keep);
    const view = buildMeView(
      {
        profile: { handle: noName ? null : "maynaa", createdAt: "2026-07-27T09:00:00Z", cofounderNo, letters: aura ? aura.sources.letters : null, kindreds: threads.filter((th) => th.revealed).length },
        aura: auraCardFacts(aura),
        stamps: stampFacts(stamps ? DEMO_STAMPS : []),
        keepsakes: keepsakeFacts(kept, new Set(kept.length ? [kept[0].id] : [])),
        firstClass: { premium, cofounderNo, wren },
        courier: { wren, dayOff, carrying: where.state === "delivery", best: 12, agoA11y: spokenAgo(entry.at, Date.now(), meFormat()), line: hunger ? hunger.line : entry.line, sub: (hunger ? hunger.sub : entry.sub) ?? "" },
      },
      meFormat(),
    );
    const act: MeActions = {
      settings: () => away("/me/settings"),
      edit: () => away("/me/edit-profile"),
      stat: (k) => away(k === "letters" ? "/my-letters" : "/my-kindreds"),
      segment: (i) => setSegment(segmentIndex(i)),
      courier: () => away(dayOff ? "/courier?play=1" : "/courier"),
      keepsakes: () => away("/keepsakes"),
      keepsake: (id) => away(`/keepsake/${id}`),
      auraOpen: () => away("/aura"),
      auraCta: () => away(view.aura?.ctaTo === "compose" ? "/compose" : "/aura"),
      auraShare: () => away("/aura-card"),
      stampsEmpty: () => away("/compose"),
      firstClass: () => away("/paywall?src=me_row"),
    };
    return {
      view,
      segment,
      courier: { wren, where, threads, lastWrittenAt, hunger, seenToday: 3, stage: "wren", dayOff, best: 12, entry },
      aura,
      avatar: { id: null, photo: null, seed: "dev-step5-me" },
      kindreds: 0,
      scroll: { serial },
      act,
    };
    // lang: the words follow the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auraMode, stamps, keep, fc, dayOff, noName, hungry, segment, serial, away, lang, book]);

  const themeLabel = forced ? THEMES[forced].name.toUpperCase() : "OFF";
  const useSwift = swift && swiftAvailable;

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <View style={{ flex: 1 }} key={`${useSwift ? "swift" : "rn"}:${build}`}>
        {useSwift ? <MeNative model={model} /> : <MeRN model={model} />}
      </View>

      {panel ? (
        <View style={{ borderTopWidth: 1, borderTopColor: tk.line, backgroundColor: tk.sf, paddingTop: 8, paddingBottom: Math.max(safe.bottom, 8), gap: 6 }}>
          <Row>
            <Chip label="HIDE" onPress={() => setPanel(false)} />
            {(["off", ...THEME_KEYS] as const).map((k) => (
              <Chip key={k} label={k === "off" ? "OFF" : THEMES[k as ThemeKey].name.toUpperCase()} on={k === "off" ? !forced : forced === k} onPress={() => setDevThemeOverride(k === "off" ? null : (k as ThemeKey))} />
            ))}
          </Row>
          <Row>
            <Chip label="SWIFT" on={useSwift} onPress={() => (swiftAvailable ? setSwift(true) : Alert.alert("Dev page", "This dev client was built before KMeView: pod install, then rebuild it."))} />
            <Chip label="RN" on={!useSwift} onPress={() => setSwift(false)} />
            {(["C", "A", "S", "F"] as const).map((l, i) => (
              <Chip
                key={l}
                label={l}
                on={segment === i}
                onPress={() => {
                  setSegment(i);
                  setBuild((b) => b + 1);
                }}
              />
            ))}
            <Chip label="TOP" onPress={() => setSerial((s) => s + 1)} />
          </Row>
          <Row>
            {AURA_MODES.map((m) => (
              <Chip key={m} label={`AURA ${m.toUpperCase()}`} on={auraMode === m} onPress={() => setAuraMode(m)} />
            ))}
          </Row>
          <Row>
            <Chip label="STAMPS" on={stamps} onPress={() => setStamps((v) => !v)} />
            <Chip label={`KEEPSAKES ${keep}`} onPress={() => setKeep((n) => (n + 3) % 4)} />
            {(["free", "member", "cofounder"] as const).map((m) => (
              <Chip key={m} label={`FC ${m.toUpperCase()}`} on={fc === m} onPress={() => setFc(m)} />
            ))}
            <Chip label="DAY OFF" on={dayOff} onPress={() => setDayOff((v) => !v)} />
            <Chip label="HUNGRY" on={hungry} onPress={() => setHungry((v) => !v)} />
            <Chip label="NO NAME" on={noName} onPress={() => setNoName((v) => !v)} />
          </Row>
          <Text style={{ fontFamily: PF.monoMed, fontSize: 10, color: tk.sub, paddingHorizontal: 12 }}>
            {`THEME ${themeLabel} (${key}) · ${useSwift ? "SWIFTUI" : "REACT NATIVE"}${swiftAvailable ? "" : " (no KMeView in this build)"} · ${t("me.header")} · SEGMENT ${segment}`}
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
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 0.8, color: on ? tk.bg : tk.ink }}>{label}</Text>
    </Pressable>
  );
}
