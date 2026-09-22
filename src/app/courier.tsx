import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { P, PF } from "../theme/post";
import { PALETTE, daylight } from "../components/CourierCard";
import { WrenHome } from "../components/WrenHome";
import type { WrenAccessory, WrenStage } from "../components/WrenBird";
import { t, useLang } from "../lib/i18n";
import { useAuth } from "../lib/auth";
import { useEntitlement } from "../lib/entitlement";
import { useWrenName } from "../lib/wren-name";
import { bump } from "../lib/usage-counters";
import { EMPTY_STATS, collectGrowthStats } from "../lib/stats";
import type { GrowthStats } from "../data/growth";
import { fetchThreads, readThreadsCache, type ThreadSummary } from "../lib/db";
import { useWrenStage } from "../lib/wren-stage";
import { useWrenSkinControl } from "../lib/wren-skin";
import { myAura, type Aura } from "../lib/aura";
import { getStageFloor, stageIndex, wrenStage } from "../lib/wren-style";

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
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<GrowthStats>(EMPTY_STATS);
  const [statsReady, setStatsReady] = useState(false);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [aura, setAura] = useState<Aura | null>(null);
  const { accessory, dress } = useWrenSkinControl(); // app-wide: a piece put on here is on her everywhere
  /* HER STAGE IS ALREADY KNOWN. The app-wide stage context computed it at
     launch; starting from "egg" here painted "Still in the egg" over a
     grown bird for the second the stats took to arrive. Start from what
     the app knows, and never fall below it. */
  const known = useWrenStage().stage;
  const [stageFloor, setStageFloor] = useState<WrenStage>(known ?? "hatch");

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void bump("courierVisits"); // a visit to her room, for the Homebody sticker
      Promise.all([collectGrowthStats(user?.created_at), getStageFloor()]).then(([s, floor]) => {
        if (!alive) return;
        setStats(s);
        setStatsReady(true);
        const live = wrenStage(s);
        const st = stageIndex(live) >= stageIndex(floor) ? live : floor;
        setStageFloor((cur) => (stageIndex(st) >= stageIndex(cur) ? st : cur));
      });
      readThreadsCache().then((c) => alive && c && setThreads(c)); // the last list, at once
      fetchThreads().then((th) => alive && setThreads(th || []));
      myAura((profile?.firstLine as string) || null).then((a) => alive && setAura(a));
      return () => {
        alive = false;
      };
    }, [user?.created_at, profile?.firstLine]),
  );

  const equip = (a: WrenAccessory) => dress(a);

  return (
    <View style={{ flex: 1, backgroundColor: P.penWash }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 0 }} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never">
        {/* the cover runs under the status bar; the header sits on it */}
        <View style={{ height: insets.top, backgroundColor: PALETTE[daylight()].sky[0] }} />
        {/* the header rides on the cover and scrolls away with it */}
        <View style={{ height: 44, zIndex: 2, marginBottom: -44 }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 4, height: 44 }}>
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me"))} hitSlop={10} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: PF.letter, fontSize: 24, color: PALETTE[daylight()].ink }}>‹</Text>
            </Pressable>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 2.4, color: PALETTE[daylight()].ink }}>{t("cr.title", { wren: wren.toUpperCase() })}</Text>
          </View>
        </View>
        <WrenHome
          stats={stats}
          statsReady={statsReady}
          threads={threads}
          pieces={aura?.pieces ?? 0}
          lastWrittenAt={aura?.lastWrittenAt ?? null}
          accessory={accessory}
          premium={premium}
          stageFloor={stageFloor}
          joinedAt={user?.created_at ?? null}
          topWord={aura?.commonWords[0] ?? null}
          onEquip={equip}
          onLocked={() => router.push("/paywall?src=wardrobe_lock")}
          onOpenThread={(th) => router.push(th.revealed ? `/room/${th.id}` : `/chat/${th.id}`)}
          onOpenKeepsake={(id) => router.push(`/keepsake/${id}`)}
          onAllKeepsakes={() => router.push("/keepsakes")}
          cofounderNo={cofounderNo}
          onPlus={() => router.push("/paywall?src=journey_archive")}
        />
      </ScrollView>
    </View>
  );
}
