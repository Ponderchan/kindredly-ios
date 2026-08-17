import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { C, F, cardStyle, shadow } from "../theme/tokens";
import { WrenBird, type WrenAccessory, type WrenMood, type WrenSkin, type WrenStage } from "./WrenBird";
import { ACCESSORY_META, SKINS, skinUnlocked, stageIndex, stageInfo } from "../lib/wren-style";
import { useWrenSkinControl } from "../lib/wren-skin";
import type { GrowthStats } from "../data/growth";

/* Wren's home — a compact companion card for the Me tab. She's the hero (in
   her current look), with her growth progress; LOOKS and DRESS collapse into
   two tappable rows that expand in place. Cosmetic only; being heard is
   never gated. */

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
  typeName?: string;
  bornWith?: WrenAccessory;
  onEquip: (a: WrenAccessory) => void;
  onLocked: () => void;
}) {
  const { skin, pick } = useWrenSkinControl();
  const info = stageInfo(stats, stageFloor);
  const [cur, tgt] = info.next?.progress ?? [1, 1];
  const [open, setOpen] = useState<null | "looks" | "dress">(null);
  const wearsHere = info.stage === "wren" || info.stage === "hatch";

  const tapSkin = (id: WrenSkin) => {
    if (skinUnlocked(id, stats, premium)) {
      pick(id);
      return;
    }
    const meta = SKINS.find((s) => s.id === id);
    if (meta?.lock === "plus") onLocked();
    else Alert.alert("Not yet", "The Plush look unlocks when you make your first kindred — five letters each with one person.");
  };

  const looksOwned = SKINS.filter((s) => skinUnlocked(s.id, stats, premium)).length;
  const items = ACCESSORY_META.filter((a) => a.id !== "none");
  const itemsOwned = items.filter((a) => a.free || premium || a.id === bornWith).length;
  const skinName = SKINS.find((s) => s.id === skin)?.name ?? "Sticker";

  return (
    <View style={[cardStyle, { padding: 0, overflow: "hidden" }]}>
      {/* hero — she's the centre of her room, wearing her current look */}
      <View style={{ alignItems: "center", padding: 22, paddingBottom: 20, backgroundColor: C.purpleLt }}>
        <View style={[{ width: 104, height: 104, borderRadius: 52, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }, shadow.card]}>
          <WrenBird size={72} stage={info.stage} mood={heroMood(info.stage)} accessory={wearsHere ? accessory : "none"} />
        </View>
        <Text style={{ fontFamily: F.serifSemi, fontSize: 23, color: C.ink, marginTop: 12 }}>
          Wren · <Text style={{ color: C.purple }}>{info.label}</Text>
        </Text>
        <Text style={{ fontFamily: F.sans, fontSize: 13, color: C.muted, marginTop: 4 }}>{info.blurb}</Text>
        {typeName && (
          <Text style={{ fontFamily: F.sansExtra, fontSize: 9.5, letterSpacing: 1.5, color: C.purple, marginTop: 6 }}>BORN {typeName.toUpperCase()}</Text>
        )}
        <View style={{ alignSelf: "stretch", height: 6, borderRadius: 3, backgroundColor: "#FFFFFF", overflow: "hidden", marginTop: 12 }}>
          <View style={{ width: `${tgt ? Math.round((cur / tgt) * 100) : 100}%`, height: 6, borderRadius: 3, backgroundColor: C.purple }} />
        </View>
        <Text style={{ fontFamily: F.sans, fontSize: 12, color: C.muted, marginTop: 8 }}>
          {info.next ? (
            <>
              {info.next.milestone} → <Text style={{ fontFamily: F.sansBold, color: C.ink }}>{info.next.label}</Text>
            </>
          ) : (
            "Fully grown, and unmistakably yours."
          )}
        </Text>
      </View>

      {/* the road — plain circles, the current one big and solid */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 }}>
        {(
          [
            ["egg", "EGG"],
            ["hatch", "HATCH"],
            ["fledge", "FLEDGE"],
            ["wren", "WREN"],
          ] as [WrenStage, string][]
        ).map(([st, label], i, arr) => {
          const cur = stageIndex(info.stage);
          const idx = stageIndex(st);
          const state = idx < cur ? "done" : idx === cur ? "now" : "later";
          return (
            <View key={st} style={{ flexDirection: "row", flex: i < arr.length - 1 ? 1 : 0, alignItems: "center" }}>
              <View style={{ alignItems: "center", width: 54 }}>
                <View
                  style={{
                    width: state === "now" ? 34 : 24,
                    height: state === "now" ? 34 : 24,
                    borderRadius: 17,
                    marginTop: state === "now" ? 0 : 5,
                    backgroundColor: state === "now" ? C.purple : state === "done" ? C.purpleMid : C.purpleLt,
                    opacity: state === "later" ? 0.55 : 1,
                    borderWidth: state === "now" ? 3 : 0,
                    borderColor: "#E3E1F8",
                  }}
                />
                <Text style={{ fontFamily: F.sansBold, fontSize: 8.5, letterSpacing: 0.6, color: state === "now" ? C.purple : C.faint, marginTop: 5 }}>
                  {label}
                  {state === "done" ? " ✓" : ""}
                </Text>
              </View>
              {i < arr.length - 1 && (
                <View style={{ flex: 1, height: 1.5, borderRadius: 1, backgroundColor: idx < cur ? C.purpleMid : C.line, marginHorizontal: 2, marginBottom: 14 }} />
              )}
            </View>
          );
        })}
      </View>

      {/* LOOKS row */}
      <Row
        label="LOOKS"
        sub={skinName}
        count={`${looksOwned}/3`}
        openState={open === "looks"}
        onPress={() => setOpen(open === "looks" ? null : "looks")}
        preview={SKINS.map((sk) => (
          <View key={sk.id} style={{ opacity: skinUnlocked(sk.id, stats, premium) ? 1 : 0.4 }}>
            <WrenBird size={26} mood="happy" skin={sk.id} />
          </View>
        ))}
      />
      {open === "looks" && (
        <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingBottom: 16, gap: 9 }}>
          {SKINS.map((sk) => {
            const on = skin === sk.id;
            const unlocked = skinUnlocked(sk.id, stats, premium);
            const badge = unlocked ? null : sk.lock === "plus" ? "👑 +" : "🔒 kindred";
            return (
              <Pressable
                key={sk.id}
                onPress={() => tapSkin(sk.id)}
                style={[
                  { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 16, backgroundColor: on ? C.purpleLt : C.card, borderWidth: on ? 2 : 1, borderColor: on ? C.purple : C.line },
                  on ? shadow.card : null,
                ]}
              >
                <View style={{ opacity: unlocked ? 1 : 0.5 }}>
                  <WrenBird size={50} mood="happy" skin={sk.id} />
                </View>
                <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, color: on ? C.purple : C.muted, marginTop: 2 }}>{sk.name}</Text>
                {badge && <Text style={{ fontFamily: F.sansBold, fontSize: 8.5, color: sk.lock === "plus" ? C.gold : C.faint, marginTop: 1 }}>{badge}</Text>}
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={{ height: 1, backgroundColor: C.lineSoft, marginHorizontal: 18 }} />

      {/* DRESS row */}
      <Row
        label="DRESS"
        sub={accessory === "none" ? "Bare" : ACCESSORY_META.find((a) => a.id === accessory)?.label ?? ""}
        count={`${itemsOwned}/${items.length}`}
        openState={open === "dress"}
        onPress={() => setOpen(open === "dress" ? null : "dress")}
        preview={[<WrenBird key="cur" size={26} mood="happy" accessory={accessory === "none" ? "none" : accessory} />]}
      />
      {open === "dress" && (
        <>
          {!wearsHere && (
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.faint, paddingHorizontal: 18, marginBottom: 8 }}>
              Pick her look now — she'll wear it once she's fully grown.
            </Text>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 16, gap: 9 }}>
            {ACCESSORY_META.map((a) => {
              const locked = !a.free && !premium && a.id !== bornWith;
              const equipped = accessory === a.id;
              return (
                <Pressable
                  key={a.id}
                  onPress={() => (locked ? onLocked() : onEquip(a.id))}
                  style={[
                    { width: 74, alignItems: "center", paddingVertical: 8, borderRadius: 16, backgroundColor: equipped ? C.purpleLt : C.card, borderWidth: equipped ? 2 : 1, borderColor: equipped ? C.purple : C.line },
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
        </>
      )}
    </View>
  );
}

/* one collapsible row: LABEL · sub … [previews] count [chevron] */
function Row({
  label,
  sub,
  count,
  preview,
  openState,
  onPress,
}: {
  label: string;
  sub: string;
  count: string;
  preview: React.ReactNode[];
  openState: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14, gap: 10 }}>
      <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 1.3, color: C.faint }}>{label}</Text>
      {!!sub && <Text style={{ fontFamily: F.sansBold, fontSize: 12, color: C.ink }}>{sub}</Text>}
      <View style={{ flex: 1 }} />
      {!openState && <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>{preview}</View>}
      <Text style={{ fontFamily: F.sansBold, fontSize: 11, color: C.faint }}>{count}</Text>
      <Text style={{ fontSize: 15, color: C.faint, transform: [{ rotate: openState ? "90deg" : "0deg" }] }}>›</Text>
    </Pressable>
  );
}
