import { FC_NONE } from "../../lib/fc-rollout";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isKindredlyUIViewAvailable } from "../../../modules/kindredly-ui";
import { setDevThemeOverride, useDevThemeOverride, useTheme } from "../../lib/theme";
import { t, useLang } from "../../lib/i18n";
import { PFM } from "../../theme/post";
import { THEME_KEYS, THEMES, type ThemeKey } from "../../theme/themes";
import { storeAura } from "../../lib/dev-store";
import { whereabouts, type Whereabouts } from "../../lib/whereabouts";
import { devSurfaceOverride, setDevSurfaceOverride, useNativeSurface } from "../../lib/surfaces";
import { planetLetters, shelfTap, shelfWeek, type PlanetLetterSource, type PlanetSkin, type ShelfFacts } from "../../screens/me/planet-model";
import { flightLog } from "../../lib/flight-log";
import { useWhoBook } from "../../lib/who";
import type { Aura } from "../../lib/aura";
import type { UsedStamp } from "../../lib/aura";
import type { Minted } from "../../lib/keepsakes";
import { DEMO_THREADS } from "../../data/demo";
import { daylight } from "../../components/CourierCard";
import { auraCardFacts } from "../../components/AuraCard";
import { NO_REPORT_ROW, buildMe4a, buildMeView, segmentIndex, spokenAgo, type PeekLetterSource } from "../../screens/me/me-model";
import { reportDoorVM, firstOfNextMonth, type ReportDoor } from "../../lib/report-door";
import { trialLabel } from "../../screens/paywall/paywall-model";
import { meFormat } from "../../screens/me/me-format";
import { keepsakeFacts, monthName, stampFacts, stampHex, type MeActions, type MeModel } from "../../screens/me/useMeModel";
import { MeNative } from "../../screens/me/MeNative";
import { MeRN } from "../../screens/me/MeRN";
import "../../data/strings-step5-me";
import "../../data/strings-me4a";
import "../../data/strings-planet";

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
     (no pen name: "You"), HUNGRY;
   - Me 4a (the Swift Me only): LETTERS (the peek: – not read yet, 0, 2,
     10), KIN (– / 0 / 3), LOOK (what she wears: none, beanie, scarf, or a
     First Class piece, headphones — try it with FC MEMBER), DOOR (the report
     door's four states, or none), TRIAL (a 7-day free trial on offer: "7
     DAYS FREE" on the First Class card). The looks here are the page's own
     state: a tile never dresses the real Wren (so the courier island keeps
     her real look).
   - THE COURIER'S PLANET (docs/courier-planet.md; the Swift Me only, a dev client built with
     KMePlanetView): PLANET turns the "meplanet" switch on for this session (lib/surfaces dev
     override; off again with a second tap). Then WHERE puts her somewhere (AUTO = what the demo
     threads say; UNSENT, HOME, EXPLORING = on the way, DELIVERY = waiting at their door,
     BRINGING = back with a reply; DAY OFF above is her day off), SKIN is the colour she wears,
     LOOK what she has on, WEEK steps the shelf's week (the four turn over), LETTERS how many
     stamps (their lamps and postmarks are the fixtures'), KIN whether Moss is hers, FC whether
     the paid looks are. A shelf look dresses the page's own Wren, never the real one.
   Everything that would leave the page says where it would go instead.
   The panel's words are English: a dev page. */

type AuraMode = "named" | "sketch" | "desk" | "pencil" | "early" | "none";
const AURA_MODES: readonly AuraMode[] = ["named", "sketch", "desk", "pencil", "early", "none"];
type FcMode = "free" | "member" | "cofounder";
type DoorMode = "none" | "progress" | "ready" | "locked" | "done";
const DOOR_MODES: readonly DoorMode[] = ["none", "progress", "ready", "locked", "done"];
const LETTER_COUNTS = [null, 0, 2, 10] as const;
const KIN_MODES = [null, 0, 3] as const;
const LOOKS = ["none", "beanie", "scarf", "phones", "flower", "party", "shades", "witch", "ghost"] as const;
const SKINS: readonly PlanetSkin[] = ["sticker", "moss", "peach", "ink", "plush"];
const WHERES = ["auto", "unsent", "home", "exploring", "delivery", "bringing"] as const;

/* the letters peek's fixtures: ten letters, newest first, quiet / answered / replied */
const LETTER_BODIES = [
  "I keep a list of small things that went right today. It is longer than I expected.",
  "Does anyone else rehearse conversations in the shower and then never have them?",
  "The bus driver waved at me like we were old friends. Maybe we are.",
  "I moved cities in August and still take the long way home on purpose.",
  "Tell me one song you would keep if every other song disappeared.",
  "Some nights the quiet is loud. Tonight it is kind.",
  "I learned to bake bread this year and it changed how I wait for things.",
  "What is a word in your language that you wish English had?",
  "My grandmother wrote letters every Sunday. I am trying to be her.",
  "I said yes to something that scares me. Write back if you have done that too.",
];
const LETTER_STAMPS = ["never-told", "almost-texted", "hot-take", "off-chest", "pretending"];
function demoLetters(n: number): PeekLetterSource[] {
  return LETTER_BODIES.slice(0, n).map((body, i) => ({
    kind: "letter" as const,
    id: `demo-letter-${i}`,
    date: iso(NOW - (i * 3 + 1) * DAY),
    stamp: LETTER_STAMPS[i % LETTER_STAMPS.length],
    body,
    status: i % 3 === 0 ? { kind: "replied" as const, who: "Luna", more: i === 0 ? 1 : 0, face: null } : i % 3 === 1 ? { kind: "answered" as const, n: 2 } : { kind: "quiet" as const },
  }));
}
/* the planet's letters: the same ten, with the strangers who read each (lamps) and who answered (postmarks) */
function demoPlanetLetters(n: number): PlanetLetterSource[] {
  return demoLetters(n).map((l, i) => ({ kind: "letter" as const, id: l.id, date: l.date, stamp: l.stamp, reads: (i * 5 + 2) % 9, answers: i % 3 === 2 ? [] : [{}] }));
}
const demoDoor = (m: DoorMode): ReportDoor | null =>
  m === "progress" ? { state: "progress", have: 4, need: 10 } : m === "ready" ? { state: "ready", kind: "first" } : m === "locked" ? { state: "locked" } : m === "done" ? { state: "done", nextMonth: firstOfNextMonth() } : null;

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
  const [lettersN, setLettersN] = useState<(typeof LETTER_COUNTS)[number]>(10);
  const [kinN, setKinN] = useState<(typeof KIN_MODES)[number]>(3);
  const [look, setLook] = useState<(typeof LOOKS)[number]>("none");
  const [door, setDoor] = useState<DoorMode>("ready");
  const [trial, setTrial] = useState(false);
  // the courier's planet: the switch (this session only), where she is, her colour, the shelf's week
  const planetOn = useNativeSurface("meplanet");
  const [whereMode, setWhereMode] = useState<(typeof WHERES)[number]>("auto");
  const [skin, setSkin] = useState<PlanetSkin>("sticker");
  const [week, setWeek] = useState(() => shelfWeek(NOW));

  const away = useCallback((where: string) => Alert.alert("Dev page", `In the app this opens ${where}.`), []);
  // the diary names a pen pal as the tab does (lib/who): the number, or the courier name with the switch on
  const book = useWhoBook({ threads: DEMO_THREADS });

  const model = useMemo<MeModel>(() => {
    const threads = DEMO_THREADS;
    const aura = demoAura(auraMode);
    const read = whereabouts(threads, 12);
    const where = whereMode === "auto" ? read : { ...read, state: whereMode as Whereabouts };
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
        profile: { handle: noName ? null : "maynaa", createdAt: "2026-07-27T09:00:00Z", cofounderNo, letters: lettersN ?? (aura ? aura.sources.letters : null), kindreds: kinN ?? null },
        aura: auraCardFacts(aura),
        stamps: stampFacts(stamps ? DEMO_STAMPS : []),
        keepsakes: keepsakeFacts(kept, new Set(kept.length ? [kept[0].id] : [])),
        firstClass: { premium, cofounderNo, wren },
        courier: { wren, dayOff, carrying: where.state === "delivery", best: 12, agoA11y: spokenAgo(entry.at, Date.now(), meFormat()), line: hunger ? hunger.line : entry.line, sub: (hunger ? hunger.sub : entry.sub) ?? "" },
      },
      meFormat(),
    );
    const fmt = meFormat();
    const shelfFacts: ShelfFacts = { skin, dress: look, premium, kindreds: kinN, hatchSkin: null, week };
    const planet = {
      letters: planetLetters(lettersN == null ? null : demoPlanetLetters(lettersN), null, { day: (d) => fmt.upper(fmt.dateShort(d)), hexOf: stampHex }),
      shelf: shelfFacts,
    };
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
      peek: () => {},
      peekLetter: () => away("/my-letters"),
      peekKindred: (id) => away(`/room/${id}`),
      seeAll: () => away("/my-letters"),
      openKindreds: () => away("/my-kindreds"),
      write: () => away("/compose"),
      look: (id) => (id === "fc" ? away("/courier (the wardrobe)") : setLook(id)),
      allLooks: () => away("/courier (the wardrobe)"),
      report: () => {
        const d = demoDoor(door);
        const href = d ? reportDoorVM(d, { t, monthName }, wren).href : null;
        if (href) away(href);
      },
      shelfLook: (id) => {
        const tap = shelfTap(id, shelfFacts);
        if (!tap) return;
        if (tap.do === "dress") setLook(tap.value);
        else if (tap.do === "skin") setSkin(tap.value);
        else away(tap.do === "firstClass" ? "/paywall?src=me_looks" : "/courier (the wardrobe)");
      },
      track: () => away("the planet page"),
    };
    const doorState = demoDoor(door);
    const kinThreads = kinN === 0 ? [] : threads;
    const me4a = buildMe4a(
      {
        profile: { handle: noName ? null : "maynaa", createdAt: "2026-07-27T09:00:00Z", cofounderNo, letters: lettersN, kindreds: kinN == null ? null : kinThreads.filter((th) => th.revealed && !th.gone).length },
        letters: lettersN == null ? null : demoLetters(lettersN),
        stampHex,
        threads: kinN == null ? null : kinThreads,
        nameOf: (th) => book.threadName(th as (typeof threads)[number]),
        looks: { accessory: look, premium, wren },
        firstClass: { premium, cofounderNo, wren, trial: trial ? trialLabel({ n: 7, unit: "day" }, t) : "" },
        report: doorState ? reportDoorVM(doorState, { t, monthName }, wren) : NO_REPORT_ROW,
      },
      meFormat(),
    );
    return {
      fc: FC_NONE,
      view,
      me4a,
      segment,
      courier: { wren, where, threads, lastWrittenAt, hunger, seenToday: 3, stage: "wren", dayOff, best: 12, entry },
      aura,
      avatar: { id: null, photo: null, seed: "dev-step5-me" },
      kindreds: 0,
      scroll: { serial },
      act,
      planet,
    };
    // lang: the words follow the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auraMode, stamps, keep, fc, dayOff, noName, hungry, segment, serial, away, lang, book, lettersN, kinN, look, door, trial, whereMode, skin, week]);

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
          <Row>
            <Chip label={`LETTERS ${lettersN ?? "–"}`} onPress={() => setLettersN((n) => LETTER_COUNTS[(LETTER_COUNTS.indexOf(n) + 1) % LETTER_COUNTS.length])} />
            <Chip label={`KIN ${kinN ?? "–"}`} onPress={() => setKinN((n) => KIN_MODES[(KIN_MODES.indexOf(n) + 1) % KIN_MODES.length])} />
            <Chip label={`LOOK ${look.toUpperCase()}`} onPress={() => setLook((l) => LOOKS[(LOOKS.indexOf(l) + 1) % LOOKS.length])} />
            <Chip label={`DOOR ${door.toUpperCase()}`} onPress={() => setDoor((d) => DOOR_MODES[(DOOR_MODES.indexOf(d) + 1) % DOOR_MODES.length])} />
            <Chip label="TRIAL" on={trial} onPress={() => setTrial((v) => !v)} />
          </Row>
          <Row>
            <Chip label="PLANET" on={planetOn} onPress={() => setDevSurfaceOverride("meplanet", devSurfaceOverride("meplanet") === true ? null : true)} />
            <Chip label={`WHERE ${whereMode.toUpperCase()}`} onPress={() => setWhereMode((w) => WHERES[(WHERES.indexOf(w) + 1) % WHERES.length])} />
            <Chip label={`SKIN ${skin.toUpperCase()}`} onPress={() => setSkin((k) => SKINS[(SKINS.indexOf(k) + 1) % SKINS.length])} />
            <Chip label={`WEEK +${week - shelfWeek(NOW)}`} onPress={() => setWeek((w) => (w - shelfWeek(NOW) + 1) % 12 + shelfWeek(NOW))} />
          </Row>
          <Text style={{ ...PFM.monoMed, fontSize: 10, color: tk.sub, paddingHorizontal: 12 }}>
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
      <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 0.8, color: on ? tk.bg : tk.ink }}>{label}</Text>
    </Pressable>
  );
}
