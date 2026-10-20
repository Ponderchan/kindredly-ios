import { useCallback, useMemo, useRef, useState } from "react";
import { Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
/* the gesture library's scroll view: a drag that starts on her (the perch,
   components/CourierStage) blocks the page's scroll instead of racing it */
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useIsFocused, useLocalSearchParams, useRouter } from "expo-router";
import { useP } from "../lib/theme";
import { PALETTE, daylight, type Daylight } from "../components/CourierCard";
import { WrenHome } from "../components/WrenHome";
import { BackChevron } from "../components/10a/BackChevron";
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
import { useFares } from "../lib/fares";
import { trialLabel } from "../screens/paywall/paywall-model";
import { buildFirstClass4a } from "../screens/me/me-model";
import { meFormat } from "../screens/me/me-format";
import "../data/strings-me4a";

/* THE COURIER'S ROOM — her own page (owner's call, 2026-09-16).
   ────────────────────────────────────────────────────────────────────────
   It used to unfold inside the Me tab under her card, pushing the aura
   and the fare off the screen and hiding a whole room behind a chevron
   that looked like navigation. A chevron means a door, so it is one: the
   card on Me opens this page — her status, her journey, the keepsakes she
   brought home, and her wardrobe — and the tab stays what it is. */

/* the cover's height under the status-bar strip: WrenHome's COVER_H, which
   it doesn't export (the day-off course is taller, but the page is held at
   the top while it plays) */
const COVER_H = 300;

export default function CourierRoom() {
  useLang();
  /* the page under her cover follows the theme (the cover keeps the hour's
     sky, see WrenHome). Its ground stays the accent's palest wash — useP's
     penWash, not t.bg — because the keepsake cards and the two cells on it
     have no edge of their own, and in Classic t.bg is as white as they are. */
  const P = useP();
  const router = useRouter();
  const params = useLocalSearchParams<{ play?: string }>(); // ?play=1 — from her day off on Me
  const wren = useWrenName();
  const { user, profile } = useAuth();
  const { premium, cofounderNo } = useEntitlement();
  const insets = useSafeAreaInsets();
  /* the 4a First Class card at the foot of her page (FC2 §4.9), built as Me builds it
     (useMeModel): the trial only when the store offers one */
  const fares = useFares();
  const lang = useLang();
  const firstClass = useMemo(
    () => buildFirstClass4a({ premium, cofounderNo, wren, trial: trialLabel(fares.trial, t) }, meFormat()),
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [premium, cofounderNo, wren, fares.trial, lang],
  );
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

  const scrollRef = useRef<ScrollView>(null);
  /* her day off is played on the cover: while it is, the page holds still
     at the top (the keyboard is up) and the strip above wears the hour flown */
  const [playSky, setPlaySky] = useState<Daylight | null>(null);
  const onPlayChange = (d: Daylight | null) => {
    if (d && !playSky) scrollRef.current?.scrollTo({ y: 0, animated: true });
    setPlaySky(d);
  };
  const coverSky = PALETTE[playSky ?? daylight()];
  const equip = (a: WrenAccessory) => dress(a);

  /* THE STATUS BAR READS HER SKY (step 7.1). The cover runs under the bar
     with the hour's sky, not the theme's ground, so while it is there the
     bar says which: light text on the night sky (16.6:1), dark on the three
     day skies (13.2:1 or more) — in every theme. iOS 26 reads the ground and
     would pick the same, but iOS 18 follows the window, and that gave dark
     text on the night sky in the light themes and light text on the day sky
     in Midnight. Once the cover has scrolled out from under the bar (its
     bottom edge past the bar's text) the page names nothing, and the
     default takes the band and the page (app/_layout). Only while this page
     is focused: covered by a keepsake or the paywall's sheet, it would
     still be mounted, and its style would go on overriding what the bar
     reads there (the strip above the sheet names nothing; see
     app/paywall). The scroll is read every frame but the page re-renders
     only when the cover crosses the line. */
  const focused = useIsFocused();
  const [underSky, setUnderSky] = useState(true);
  const underSkyRef = useRef(true);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const under = e.nativeEvent.contentOffset.y < COVER_H + insets.top / 2;
    if (under === underSkyRef.current) return;
    underSkyRef.current = under;
    setUnderSky(under);
  };
  const barOnSky = (playSky ?? daylight()) === "night" ? "light" : "dark";

  return (
    <View style={{ flex: 1, backgroundColor: P.penWash }}>
      {focused && (underSky || !!playSky) && <StatusBar style={barOnSky} />}
      <ScrollView ref={scrollRef} scrollEnabled={!playSky} keyboardShouldPersistTaps={playSky ? "always" : "handled"} contentContainerStyle={{ paddingBottom: 0 }} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never" onScroll={onScroll} scrollEventThrottle={16}>
        {/* the cover runs under the status bar; the header sits on it */}
        <View style={{ height: insets.top, backgroundColor: coverSky.sky[0] }} />
        {/* the header rides on the cover and scrolls away with it */}
        {/* box-none: the header's empty stretch lets taps through to the cover
            below it (the game's × sits there) */}
        <View pointerEvents="box-none" style={{ height: 52, zIndex: 2, marginBottom: -52 }}>
          {/* the secondary title: system medium 17, centred (the string itself is still in capitals) */}
          <View pointerEvents="box-none" style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 56, height: 52, paddingBottom: 8 }}>
            <BackChevron onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me"))} color={coverSky.ink} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} accessibilityRole="header" style={{ fontSize: 17, fontWeight: "500", color: coverSky.ink, textAlign: "center" }}>{t("cr.title", { wren: wren.toUpperCase() })}</Text>
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
          firstClass={firstClass}
          scrollRef={scrollRef}
          onPlayChange={onPlayChange}
          autoPlay={params.play === "1"}
        />
      </ScrollView>
    </View>
  );
}
