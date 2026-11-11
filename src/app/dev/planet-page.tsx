import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isKindredlyUIViewAvailable } from "../../../modules/kindredly-ui";
import { PLANET_PAGE_VIEW } from "../../../modules/kindredly-ui/src/PlanetPage";
import { t, useLang } from "../../lib/i18n";
import { useTheme } from "../../lib/theme";
import { PFM } from "../../theme/post";
import { agoLabel } from "../../lib/flight-log";
import { WHEREABOUTS_META, type Whereabouts } from "../../lib/whereabouts";
import { getStamp, sname } from "../../data/stamps";
import { courierCardModel } from "../../components/courier-card-model";
import { meFormat } from "../../screens/me/me-format";
import { buildPlanetPage, planetLetters, type PageLetterSource, type PageTransit, type PlanetDress, type PlanetSkin } from "../../screens/me/planet-model";
import { PlanetNative } from "../../screens/planet/PlanetNative";
import type { PlanetPageModel } from "../../screens/planet/usePlanetPage";
import "../../data/strings-step5-me";
import "../../data/strings-step5-kitrn";
import "../../data/strings-planet";

/* dev only — THE PLANET PAGE ON DEMO DATA (docs/courier-planet.md).
   kindredly:///dev/planet-page

   The page as PlanetNative draws it, from fixtures (no network, no account), built by the same
   pure model the route runs on (screens/me/planet-model buildPlanetPage). Needs a dev client
   built with KPlanetPageView (after pod install); the "meplanet" switch is not asked here.

   The panel (HIDE for a clean screenshot; a dot brings it back):
   - WHERE: where she is (UNSENT, HOME, EXPLORING = on the way, DELIVERY = waiting at their
     door, BRINGING = back with a reply), DAY OFF her day off;
   - HOUR: the sky (morning, day, evening, night);
   - LETTERS: how many stamps (0, 3, 12, 40; their readers and answers are the fixtures');
   - RUN: which letter the run she is on answers — MINE (one of yours: its slip takes her page's
     rows, and the door when she is back), OTHER (someone else's letter: a slip of its own, first),
     NONE;
   - SKIN, LOOK: her colour and what she wears.
   Changing a chip rebuilds the page (it opens on the run's slip again). Every tap that would
   leave says where it would go. The panel's words are English: a dev page. */

const WHERES: readonly Whereabouts[] = ["exploring", "delivery", "bringing", "home", "unsent"];
const HOURS = { morning: 7, day: 13, evening: 18, night: 22 } as const;
type Hour = keyof typeof HOURS;
const HOUR_KEYS: readonly Hour[] = ["morning", "day", "evening", "night"];
const COUNTS = [12, 40, 3, 0] as const;
const RUNS = ["mine", "other", "none"] as const;
const SKINS: readonly PlanetSkin[] = ["sticker", "moss", "peach", "ink", "plush"];
const LOOKS: readonly PlanetDress[] = ["none", "beanie", "scarf", "phones", "flower", "party", "shades"];
/* her diary's own lines for each place (data/strings fl.*) */
const LINES: Record<Whereabouts, [string, string]> = {
  unsent: ["fl.unsent", "fl.unsent.sub"],
  exploring: ["fl.exploring.notime", "fl.exploring.sub"],
  delivery: ["fl.delivery.anon", "fl.delivery.first"],
  bringing: ["fl.back.anon", "fl.back.sub"],
  home: ["fl.home.none", "fl.home.sub"],
};
const BODIES = [
  "I keep a list of small things that went right today. It is longer than I expected.",
  "Does anyone else rehearse conversations in the shower and then never have them?",
  "The bus driver waved at me like we were old friends. Maybe we are.",
  "I moved cities in August and still take the long way home on purpose.",
  "Tell me one song you would keep if every other song disappeared.",
  "Some nights the quiet is loud. Tonight it is kind.",
];
const STAMPS = ["never-told", "almost-texted", "hot-take", "off-chest", "pretending", "crush", "cant-sleep", "tiny-win"];
const NOW = Date.now();
const DAY = 86_400_000;

function demoCards(n: number): PageLetterSource[] {
  return Array.from({ length: n }, (_, i) => {
    const answered = i % 3 !== 2;
    return {
      kind: "letter" as const,
      id: `demo-letter-${i}`,
      date: new Date(NOW - (i * 3 + 1) * DAY).toISOString(),
      stamp: STAMPS[i % STAMPS.length],
      body: BODIES[i % BODIES.length],
      reads: (i * 5 + 2) % 9,
      answers: answered ? [{}] : [],
      status: !answered ? { kind: "quiet" as const } : i % 3 === 0 ? { kind: "replied" as const, who: "Luna", more: i === 0 ? 1 : 0 } : { kind: "answered" as const, n: 2 },
    };
  });
}

export default function PlanetPageLab() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Lab />;
}

function Lab() {
  const lang = useLang();
  const router = useRouter();
  const { t: tk } = useTheme();
  const safe = useSafeAreaInsets();
  const available = isKindredlyUIViewAvailable(PLANET_PAGE_VIEW);

  const [where, setWhere] = useState<Whereabouts>("exploring");
  const [dayOff, setDayOff] = useState(false);
  const [hour, setHour] = useState<Hour>("day");
  const [count, setCount] = useState<(typeof COUNTS)[number]>(12);
  const [run, setRun] = useState<(typeof RUNS)[number]>("mine");
  const [skin, setSkin] = useState<PlanetSkin>("sticker");
  const [look, setLook] = useState<PlanetDress>("none");
  const [panel, setPanel] = useState(true);

  const model = useMemo<PlanetPageModel>(() => {
    const fmt = meFormat();
    const day = (iso: string) => fmt.upper(fmt.dateShort(iso));
    const cards = demoCards(count);
    const letters = planetLetters(cards, null, { day, hexOf: (id) => getStamp(id)?.color ?? "" });
    const card = courierCardModel(
      { wren: "Pip", state: where, stage: "wren", stateMood: WHEREABOUTS_META[where].mood, entry: { line: t(LINES[where][0]), sub: t(LINES[where][1]), at: NOW - 2 * 3600_000 }, hunger: null, playing: dayOff, best: 12, hour: HOURS[hour] },
      { t, ago: agoLabel },
    );
    // the run she is on: only while she waits at a door or is back with a reply
    const onRun = where === "delivery" || where === "bringing";
    const back = where === "bringing";
    const transit: PageTransit | null =
      onRun && run !== "none"
        ? {
            rows: back ? [t("wren.slip.wrote", { who: "LUNA", day: "NOV 10" }), t("wren.slip.carried", { wren: "PIP" }), t("wren.slip.forYou")] : [t("wren.slip.left", { day: "NOV 9" }), t("wren.slip.door", { who: "LUNA" }), t("wren.slip.waiting")],
            thread: "demo-thread",
            // an older letter of yours, not the newest: the page opens on it
            letter: run === "mine" && cards.length > 2 ? cards[2].id : "",
            back,
          }
        : null;
    const vm = buildPlanetPage(
      { courier: card, where, dayOff, a11y: [card.name, card.line, card.aside].join(". "), cards, letters, total: null, transit, atDoors: where === "delivery" ? 1 : 0, look: { skin, dress: look, stage: "wren", wilt: false } },
      { t, upper: fmt.upper, wren: "Pip", day, stampName: (id) => { const def = getStamp(id); return def ? sname(def.name) : ""; } },
    );
    const away = (to: string) => Alert.alert("Dev page", `In the app this opens ${to}.`);
    return {
      vm,
      palette: card.palette,
      night: hour === "night",
      own: { form: null, mark: null },
      act: { back: () => router.back(), go: () => away("that correspondence"), myLetters: () => away("/my-letters") },
    };
    // lang: the words follow the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [where, dayOff, hour, count, run, skin, look, router, lang]);

  const next = <T,>(list: readonly T[], v: T): T => list[(list.indexOf(v) + 1) % list.length];

  return (
    <View style={{ flex: 1, backgroundColor: model.palette.scrim }}>
      <View style={{ flex: 1 }} key={`${where}:${dayOff}:${hour}:${count}:${run}`}>
        {available ? (
          <PlanetNative model={model} />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
            <Text style={{ ...PFM.monoMed, fontSize: 12, color: tk.ink, textAlign: "center" }}>This dev client was built before KPlanetPageView: pod install, then rebuild it.</Text>
          </View>
        )}
      </View>
      {panel ? (
        <View style={{ borderTopWidth: 1, borderTopColor: tk.line, backgroundColor: tk.sf, paddingTop: 8, paddingBottom: Math.max(safe.bottom, 8), gap: 6 }}>
          <Row>
            <Chip label="HIDE" onPress={() => setPanel(false)} />
            <Chip label={`WHERE ${where.toUpperCase()}`} onPress={() => setWhere((w) => next(WHERES, w))} />
            <Chip label="DAY OFF" on={dayOff} onPress={() => setDayOff((v) => !v)} />
            <Chip label={`HOUR ${hour.toUpperCase()}`} onPress={() => setHour((h) => next(HOUR_KEYS, h))} />
          </Row>
          <Row>
            <Chip label={`LETTERS ${count}`} onPress={() => setCount((n) => next(COUNTS, n))} />
            <Chip label={`RUN ${run.toUpperCase()}`} onPress={() => setRun((r) => next(RUNS, r))} />
            <Chip label={`SKIN ${skin.toUpperCase()}`} onPress={() => setSkin((k) => next(SKINS, k))} />
            <Chip label={`LOOK ${look.toUpperCase()}`} onPress={() => setLook((l) => next(LOOKS, l))} />
          </Row>
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
