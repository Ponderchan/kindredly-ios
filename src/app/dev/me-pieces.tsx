import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Host } from "@expo/ui/swift-ui";
import { isKindredlyUIViewAvailable } from "../../../modules/kindredly-ui";
import { KAuraArtView, KCourierCardView } from "../../../modules/kindredly-ui/src/MePieces";
import { CourierCard } from "../../components/CourierCard";
import { AURA_ART_H, AURA_ART_HAS, AuraArtSlot, auraArtWidth } from "../../components/AuraCard";
import { auraArtPlan } from "../../components/aura-art-model";
import type { CourierState } from "../../components/courier-card-model";
import type { Fidelity } from "../../lib/aura-ladder";
import { useBirdImageRefs } from "../../lib/bird-images";
import { useAssetImageRefs } from "../../lib/images";
import { useLang } from "../../lib/i18n";
import { useLetterFont, useTheme } from "../../lib/theme";
import { PFM } from "../../theme/post";
import { auraArtData, auraPictureModule, courierCardData, courierModelOf } from "../../screens/me/me-pieces";
import type { MeCourier } from "../../screens/me/useMeModel";

/* dev only — THE TWO SWIFT PIECES OF ME, EACH BESIDE ITS REACT NATIVE ORIGINAL (2026-10-27).
   kindredly:///dev/me-pieces

   The courier's card ("couriercard") and the Aura card's picture ("auraart") are drawn inside
   the Swift Me tab and aura room only when their switches are on; this page shows every state
   of both renderers without the switch, one above the other (React Native, then Swift):
   - COURIER at the hour picked (7 morning, 12 day, 18 evening, 22 night): unsent, home,
     exploring, on a delivery, bringing something, her day off (the course), hungry and wilting.
     Her picture on the Swift card is her snapshot (bird-images card-*): it appears once
     BirdSnapshots has captured it, a moment after the page opens.
   - AURA ART in the current theme (try Midnight from ui-lab or Settings: the strokes go light
     and the pictures sit in 6): the four desks (lines, pencil, sketch, colour) and two of the
     fifty pictures (the quiet observer in colour, and its sketch).
   The Swift rows need a dev client built with KCourierCardView and KAuraArtView. */

const HOURS = [7, 12, 18, 22] as const;
const STATES: CourierState[] = ["unsent", "home", "exploring", "delivery", "bringing"];
type Case = { key: string; label: string; courier: MeCourier };

const ENTRY = { line: "Took your letter over the hills to someone new.", sub: "they'll have it by morning", at: Date.now() - 2 * 3600e3 };
const HUNGER = { tier: "wilting" as const, mood: "worry" as const, word: "STARVING", line: "nothing to carry for nine days.", sub: "one letter would do it", wilt: true };

const courierOf = (state: CourierState, o: Partial<MeCourier> = {}): MeCourier => ({
  wren: "Pip",
  where: { state, line: "", bubble: "" },
  threads: [],
  lastWrittenAt: null,
  hunger: null,
  seenToday: 0,
  stage: "wren",
  dayOff: false,
  best: 12,
  entry: ENTRY,
  ...o,
});

const CASES: Case[] = [
  ...STATES.map((s) => ({ key: s, label: s.toUpperCase(), courier: courierOf(s) })),
  { key: "dayoff", label: "DAY OFF", courier: courierOf("home", { dayOff: true }) },
  { key: "hungry", label: "HUNGRY · WILT", courier: courierOf("home", { hunger: HUNGER }) },
];

const ARTS: { key: string; label: string; art: { sceneId: string | null; fidelity: Fidelity } }[] = [
  { key: "lines", label: "DESK · LINES", art: { sceneId: null, fidelity: "lines" } },
  { key: "pencil", label: "DESK · PENCIL", art: { sceneId: null, fidelity: "pencil" } },
  { key: "sketch", label: "DESK · SKETCH", art: { sceneId: null, fidelity: "sketch" } },
  { key: "colour", label: "DESK · COLOUR", art: { sceneId: null, fidelity: "colour" } },
  { key: "scene", label: "PICTURE · QUIET OBSERVER", art: { sceneId: "quiet-observer", fidelity: "colour" } },
  { key: "sketchpic", label: "PICTURE · ITS SKETCH", art: { sceneId: "quiet-observer", fidelity: "sketch" } },
];

export default function MePiecesLab() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Lab />;
}

function Lab() {
  useLang();
  const { key: theme, t: tk, dark } = useTheme();
  const letterFont = useLetterFont();
  const safe = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [hour, setHour] = useState<(typeof HOURS)[number]>(12);
  const cardW = width - 32;
  const artW = auraArtWidth(width - 32);
  const swiftCard = isKindredlyUIViewAvailable("KCourierCardView");
  const swiftArt = isKindredlyUIViewAvailable("KAuraArtView");

  const models = useMemo(() => CASES.map((c) => ({ ...c, model: courierModelOf(c.courier, hour) })), [hour]);
  const birds = useBirdImageRefs(models.filter((m) => !m.model.wilt).map((m) => m.model.pose));
  const wilted = useBirdImageRefs(models.filter((m) => m.model.wilt).map((m) => m.model.pose), { wilt: true });

  const plans = useMemo(() => ARTS.map((a) => ({ ...a, plan: auraArtPlan(a.art, AURA_ART_HAS, dark) })), [dark]);
  const pictures = useAssetImageRefs(Object.fromEntries(plans.map((p) => [p.key, auraPictureModule(p.plan)])));

  const label = (s: string) => <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1.4, color: tk.sub, marginTop: 6 }}>{s}</Text>;
  const missing = (view: string) => <Text style={{ fontSize: 12, color: tk.sub }}>This dev client has no {view}: Swift row skipped.</Text>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tk.bg }} contentContainerStyle={{ paddingTop: safe.top + 12, paddingBottom: safe.bottom + 40, paddingHorizontal: 16, gap: 8 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", color: tk.ink }}>Me pieces · React Native, then Swift</Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
        {HOURS.map((h) => (
          <Pressable key={h} onPress={() => setHour(h)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: h === hour ? tk.ink : tk.soft2 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: h === hour ? tk.bg : tk.ink }}>{h}:00</Text>
          </Pressable>
        ))}
      </View>

      {models.map((c) => (
        <View key={c.key} style={{ gap: 6 }}>
          {label(`COURIER · ${c.label}`)}
          <View style={{ borderRadius: 24, overflow: "hidden" }}>
            <CourierCard
              framed
              width={cardW}
              hour={hour}
              wren={c.courier.wren}
              where={c.courier.where}
              threads={c.courier.threads}
              lastWrittenAt={c.courier.lastWrittenAt}
              hunger={c.courier.hunger}
              seenToday={c.courier.seenToday}
              stage={c.courier.stage}
              entry={c.courier.entry}
              dayOff={c.courier.dayOff}
              best={c.courier.best}
              onPlay={c.courier.dayOff ? () => {} : undefined}
            />
          </View>
          {swiftCard ? (
            <Host style={{ width: cardW, height: 236, borderRadius: 24, overflow: "hidden" }} colorScheme={dark ? "dark" : "light"}>
              <KCourierCardView theme={theme} letterFont={letterFont} card={courierCardData(c.model, (c.model.wilt ? wilted : birds)[c.model.pose] ?? null, true)} />
            </Host>
          ) : (
            missing("KCourierCardView")
          )}
        </View>
      ))}

      {plans.map((a) => (
        <View key={a.key} style={{ gap: 6 }}>
          {label(`AURA ART · ${a.label}`)}
          <View style={{ width: artW, height: AURA_ART_H, borderRadius: 14, overflow: "hidden", backgroundColor: tk.soft2 }}>
            <AuraArtSlot art={a.art} width={artW} />
          </View>
          {swiftArt ? (
            <Host style={{ width: artW, height: AURA_ART_H, borderRadius: 14, overflow: "hidden" }} colorScheme={dark ? "dark" : "light"}>
              <KAuraArtView theme={theme} art={auraArtData(a.art, a.plan, pictures[a.key as keyof typeof pictures] ?? null, tk, dark)} />
            </Host>
          ) : (
            missing("KAuraArtView")
          )}
        </View>
      ))}
    </ScrollView>
  );
}
