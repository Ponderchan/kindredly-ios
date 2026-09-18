import { Redirect } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuraCard } from "../components/AuraCard";
import { AuraScene } from "../components/AuraScene";
import type { Daylight } from "../components/CourierCard";
import type { Fidelity } from "../lib/aura-ladder";
import type { Aura } from "../lib/aura";
import type { ResolvedSticker } from "../lib/writing-engine/stickers";
import { P, PF } from "../theme/post";

/* dev only — the aura card at every rung, and the scene at every hour,
   so the ladder can be looked at without writing fourteen letters.
   kindredly:///aura-preview */
const sticker = (stickerId: string, dimension: string, state: ResolvedSticker["state"], supporting = 4, eligible = 5): ResolvedSticker =>
  ({ stickerId, traitId: "concrete_detail", dimension, state, supporting, eligible, evidence: [], since: "2026-09-10" }) as unknown as ResolvedSticker;

function fake(o: { phase: Aura["phase"]; letters: number; home?: ResolvedSticker[]; usage?: string[]; named?: boolean }): Aura {
  const home = o.home ?? [];
  const byDimension = Object.fromEntries(home.map((h) => [h.dimension, h]));
  return {
    phase: o.phase,
    pieces: o.letters + 1,
    sources: { letters: o.letters, sealed: 0, conversations: 0 },
    usage: (o.usage ?? []).map((id) => ({ id, group: "time", private: false, n: 3 })),
    stickers: { home, byDimension, board: home, title: o.named ? { state: "formed", noun: "observer", adjective: "quiet", basis: [] } : { state: "none", noun: null, adjective: null, basis: [] } },
  } as unknown as Aura;
}

const RUNGS: { label: string; aura: Aura }[] = [
  { label: "0 · hatched", aura: fake({ phase: "empty", letters: 0, usage: ["name_trader"] }) },
  { label: "1 · one letter", aura: fake({ phase: "forming", letters: 1, home: [sticker("straight_shooter", "sentence", "emerging")], usage: ["name_trader"] }) },
  { label: "2 · three letters", aura: fake({ phase: "forming", letters: 3, home: [sticker("detail_collector", "vocabulary", "emerging"), sticker("straight_shooter", "sentence", "emerging")], usage: ["marathoner"] }) },
  { label: "3 · first stuck", aura: fake({ phase: "shaping", letters: 5, home: [sticker("detail_collector", "vocabulary", "established"), sticker("straight_shooter", "sentence", "emerging")], usage: ["night_writer"] }) },
  { label: "4 · almost named", aura: fake({ phase: "clearing", letters: 7, home: [sticker("detail_collector", "vocabulary", "established"), sticker("straight_shooter", "sentence", "established"), sticker("quiet_type", "emotion", "established")] }) },
  { label: "5 · named", aura: fake({ phase: "formed", letters: 14, named: true, home: [sticker("detail_collector", "vocabulary", "established", 5, 5), sticker("straight_shooter", "sentence", "established"), sticker("quiet_type", "emotion", "established")] }) },
  { label: "6 · still you", aura: fake({ phase: "formed", letters: 20, named: true, home: [sticker("detail_collector", "vocabulary", "established", 5, 5), sticker("sentence_weaver", "sentence", "emerging"), sticker("quiet_type", "emotion", "established")] }) },
];

export default function AuraPreview() {
  if (!__DEV__) return <Redirect href="/" />;
  const noop = () => {};
  const days: Daylight[] = ["morning", "day", "evening", "night"];
  const fids: Fidelity[] = ["lines", "pencil", "sketch", "colour"];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.4, color: "#1E1B35" }}>THE SCENE · FOUR HOURS</Text>
        {days.map((d) => (
          <View key={d} style={{ borderRadius: 22, overflow: "hidden" }}>
            <AuraScene width={360} fidelity="colour" day={d} />
          </View>
        ))}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {fids.map((f) => (
            <View key={f} style={{ flex: 1, borderRadius: 10, overflow: "hidden" }}>
              <AuraScene width={84} fidelity={f} day="day" />
            </View>
          ))}
        </View>
        {RUNGS.map((r) => (
          <View key={r.label} style={{ gap: 6 }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.4, color: "#1E1B35" }}>{r.label.toUpperCase()}</Text>
            <AuraCard aura={r.aura} seed="preview" onOpen={noop} onShare={noop} onWrite={noop} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
