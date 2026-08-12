import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { C, F, cardStyle, shadow } from "../theme/tokens";
import { WrenBird, type WrenAccessory, type WrenMood, type WrenSkin, type WrenStage } from "./WrenBird";
import { ACCESSORY_META, SKINS, skinUnlocked, stageInfo } from "../lib/wren-style";
import { useWrenSkinControl } from "../lib/wren-skin";
import type { GrowthStats } from "../data/growth";

/* Wren's home — the top of the Me tab. Your companion as she is right now:
   her growth stage, how far to the next one, and the wardrobe you dress her
   in. Cosmetic only; being heard is never gated. */

const LADDER: { stage: WrenStage; label: string }[] = [
  { stage: "egg", label: "Egg" },
  { stage: "hatch", label: "Hatchling" },
  { stage: "fledge", label: "Fledgling" },
  { stage: "wren", label: "Wren" },
];

function heroMood(stage: WrenStage): WrenMood {
  if (stage === "wren") return "happy";
  if (stage === "fledge") return "delight";
  return "content";
}

export function WrenHome({
  stats,
  accessory,
  premium,
  stageFloor = "egg",
  typeName,
  bornWith,
  onEquip,
  onLocked,
}: {
  stats: GrowthStats;
  accessory: WrenAccessory;
  premium: boolean;
  stageFloor?: WrenStage;
  typeName?: string; // born from your first line's fingerprint
  bornWith?: WrenAccessory; // her born-with trait — free for you
  onEquip: (a: WrenAccessory) => void;
  onLocked: () => void;
}) {
  const { skin, pick } = useWrenSkinControl();
  const info = stageInfo(stats, stageFloor);
  const activeIdx = LADDER.findIndex((l) => l.stage === info.stage);
  const [cur, tgt] = info.next?.progress ?? [0, 0];

  const tapSkin = (id: WrenSkin) => {
    if (skinUnlocked(id, stats, premium)) {
      pick(id);
      return;
    }
    const meta = SKINS.find((s) => s.id === id);
    if (meta?.lock === "plus") onLocked(); // → paywall
    else Alert.alert("Not yet", "The Plush look unlocks when you make your first kindred — five letters each with one person.");
  };
  const wearsHere = info.stage === "wren" || info.stage === "hatch";

  return (
    <View style={[cardStyle, { padding: 0, overflow: "hidden" }]}>
      {/* hero */}
      <View style={{ alignItems: "center", paddingTop: 22, paddingBottom: 18, backgroundColor: C.purpleLt }}>
        <WrenBird size={132} stage={info.stage} mood={heroMood(info.stage)} accessory={wearsHere ? accessory : "none"} />
        <Text style={{ fontFamily: F.serifSemi, fontSize: 21, color: C.ink, marginTop: 6 }}>
          Wren · <Text style={{ color: C.purple }}>{info.label}</Text>
        </Text>
        {typeName && (
          <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 1.6, color: C.purple, marginTop: 5 }}>
            BORN {typeName.toUpperCase()}
          </Text>
        )}
        <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: C.muted, marginTop: 5, textAlign: "center", maxWidth: 276, lineHeight: 20 }}>
          {info.blurb}
        </Text>
      </View>

      {/* growth ladder */}
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 16 }}>
        {LADDER.map((l, i) => {
          const active = i === activeIdx;
          const done = i < activeIdx;
          return (
            <View key={l.stage} style={{ alignItems: "center", flex: 1 }}>
              <View style={{ opacity: active ? 1 : done ? 0.85 : 0.32 }}>
                <WrenBird size={active ? 52 : 40} stage={l.stage} mood="content" />
              </View>
              <Text
                style={{
                  fontFamily: active ? F.sansBold : F.sans,
                  fontSize: 10,
                  color: active ? C.purple : C.faint,
                  marginTop: 3,
                }}
              >
                {l.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* next milestone */}
      {info.next ? (
        <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: C.line, overflow: "hidden" }}>
            <View style={{ width: `${tgt ? Math.round((cur / tgt) * 100) : 0}%`, height: 6, borderRadius: 3, backgroundColor: C.purple }} />
          </View>
          <Text style={{ fontFamily: F.sans, fontSize: 12, color: C.muted, textAlign: "center", marginTop: 8 }}>
            {info.next.milestone} → she becomes a <Text style={{ fontFamily: F.sansBold, color: C.ink }}>{info.next.label}</Text>
          </Text>
        </View>
      ) : (
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.muted, textAlign: "center", paddingTop: 12, paddingHorizontal: 18 }}>
          She's all grown. Now you just keep each other company.
        </Text>
      )}

      {/* looks — the three skins */}
      <View style={{ paddingTop: 18 }}>
        <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 1.3, color: C.faint, paddingHorizontal: 18, marginBottom: 10 }}>LOOKS</Text>
        <View style={{ flexDirection: "row", paddingHorizontal: 14, gap: 9 }}>
          {SKINS.map((sk) => {
            const on = skin === sk.id;
            const unlocked = skinUnlocked(sk.id, stats, premium);
            const badge = unlocked ? null : sk.lock === "plus" ? "👑 +" : "🔒 kindred";
            return (
              <Pressable
                key={sk.id}
                onPress={() => tapSkin(sk.id)}
                style={[
                  {
                    flex: 1,
                    alignItems: "center",
                    paddingTop: 8,
                    paddingBottom: 9,
                    borderRadius: 16,
                    backgroundColor: on ? C.purpleLt : C.card,
                    borderWidth: on ? 2 : 1,
                    borderColor: on ? C.purple : C.line,
                  },
                  on ? shadow.card : null,
                ]}
              >
                <View style={{ opacity: unlocked ? 1 : 0.5 }}>
                  <WrenBird size={52} mood="happy" skin={sk.id} />
                </View>
                <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, color: on ? C.purple : C.muted, marginTop: 2 }}>{sk.name}</Text>
                {badge && <Text style={{ fontFamily: F.sansBold, fontSize: 8.5, color: sk.lock === "plus" ? C.gold : C.faint, marginTop: 1 }}>{badge}</Text>}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* dress-up shelf */}
      <View style={{ paddingTop: 18, paddingBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, marginBottom: info.stage === "wren" ? 10 : 4 }}>
          <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 1.3, color: C.faint }}>DRESS WREN</Text>
          {!premium && <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, color: C.gold }}>👑 more with +</Text>}
        </View>
        {!wearsHere && (
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.faint, paddingHorizontal: 18, marginBottom: 10 }}>
            Pick her look now — she'll wear it once she's fully grown.
          </Text>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 9 }}>
          {ACCESSORY_META.map((a) => {
            const locked = !a.free && !premium && a.id !== bornWith; // her trait is hers
            const equipped = accessory === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => (locked ? onLocked() : onEquip(a.id))}
                style={[
                  {
                    width: 74,
                    alignItems: "center",
                    paddingVertical: 8,
                    borderRadius: 16,
                    backgroundColor: equipped ? C.purpleLt : C.card,
                    borderWidth: equipped ? 2 : 1,
                    borderColor: equipped ? C.purple : C.line,
                  },
                  equipped ? shadow.card : null,
                ]}
              >
                <View style={{ opacity: locked ? 0.42 : 1 }}>
                  <WrenBird size={50} mood="happy" accessory={a.id === "none" ? "none" : a.id} />
                </View>
                <Text style={{ fontFamily: F.sansBold, fontSize: 9.5, color: equipped ? C.purple : C.muted, marginTop: 2 }}>
                  {locked ? `🔒 ${a.label}` : a.id === bornWith ? `✦ ${a.label}` : a.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
