import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { P, PF } from "../theme/post";
import { W14 } from "../components/AuraCard";
import { WrenHome } from "../components/WrenHome";
import type { WrenAccessory, WrenStage } from "../components/WrenBird";
import { t, useLang } from "../lib/i18n";
import { useAuth } from "../lib/auth";
import { useEntitlement } from "../lib/entitlement";
import { useWrenName } from "../lib/wren-name";
import { bump } from "../lib/usage-counters";
import { EMPTY_STATS, collectGrowthStats } from "../lib/stats";
import type { GrowthStats } from "../data/growth";
import { fetchThreads, type ThreadSummary } from "../lib/db";
import { myAura, type Aura } from "../lib/aura";
import { getStageFloor, getWrenAccessory, setWrenAccessory, stageIndex, wrenStage } from "../lib/wren-style";

/* THE COURIER'S ROOM — her own page (owner's call, 2026-09-16).
   ────────────────────────────────────────────────────────────────────────
   It used to unfold inside the Me tab under her card, pushing the aura
   and the fare off the screen and hiding a whole room behind a chevron
   that looked like navigation. A chevron means a door, so it is one: the
   card on Me opens this page — her status, her journey, the keepsakes she
   brought home, and her wardrobe — and the tab stays what it is. */

export default function CourierRoom() {
  useLang();
  const router = useRouter();
  const wren = useWrenName();
  const { user, profile } = useAuth();
  const { premium, cofounderNo } = useEntitlement();
  const [stats, setStats] = useState<GrowthStats>(EMPTY_STATS);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [aura, setAura] = useState<Aura | null>(null);
  const [accessory, setAccessory] = useState<WrenAccessory>("none");
  const [stageFloor, setStageFloor] = useState<WrenStage>("egg");

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void bump("courierVisits"); // a visit to her room, for the Homebody sticker
      Promise.all([collectGrowthStats(user?.created_at), getStageFloor()]).then(([s, floor]) => {
        if (!alive) return;
        setStats(s);
        const live = wrenStage(s);
        setStageFloor(stageIndex(live) >= stageIndex(floor) ? live : floor);
      });
      fetchThreads().then((th) => alive && setThreads(th || []));
      getWrenAccessory().then((a) => alive && setAccessory(a));
      myAura((profile?.firstLine as string) || null).then((a) => alive && setAura(a));
      return () => {
        alive = false;
      };
    }, [user?.created_at, profile?.firstLine]),
  );

  const equip = (a: WrenAccessory) => {
    setAccessory(a);
    void setWrenAccessory(a);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 4 }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me"))} hitSlop={10} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 24, color: W14.ink }}>‹</Text>
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 2.6, color: W14.ink }}>{t("cr.title", { wren: wren.toUpperCase() })}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <WrenHome
          stats={stats}
          threads={threads}
          pieces={aura?.pieces ?? 0}
          accessory={accessory}
          premium={premium}
          stageFloor={stageFloor}
          joinedAt={user?.created_at ?? null}
          topWord={aura?.commonWords[0] ?? null}
          onEquip={equip}
          onLocked={() => router.push("/paywall?src=wardrobe_lock")}
          onOpenThread={(th) => router.push(th.revealed ? `/room/${th.id}` : `/chat/${th.id}`)}
          onOpenKeepsake={(id) => router.push(`/keepsake/${id}`)}
          cofounderNo={cofounderNo}
          onPlus={() => router.push("/paywall?src=journey_archive")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
