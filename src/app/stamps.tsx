import { speakAs, useWrenName } from "../lib/wren-name";
import { useCallback, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter, Redirect } from "expo-router";
import { cardStyle, navyBtn } from "../theme/tokens";
import { PFM } from "../theme/post";
import { useTheme } from "../lib/theme";
import { GrowthStampTile } from "../components/GrowthStamp";
import { BackChevron } from "../components/10a/BackChevron";
import { GROWTH_STAMPS, type GrowthStamp, type GrowthStats } from "../data/growth";
import { EMPTY_STATS, collectGrowthStats } from "../lib/stats";
import { useAuth } from "../lib/auth";

/* The stamp album — Kindredly's growth stamps. Earned in colour, the rest
   waiting in grey. Tap one for its story. The stamps keep their own
   colours; the page around them is the theme's, the old C palette read by
   role: cream is the page, the card is sf, muted lines are sub, the small
   counts and labels are mute, a stamp not yet earned is named in faint,
   and the buttons are ind and ink with their label in the page colour. The
   dim behind the card stays a fixed shade. */
export default function StampsScreen() {
  const { t: tk } = useTheme(); // above the dev gate, so it runs every render
  if (!__DEV__) return <Redirect href="/" />;
  const router = useRouter();
  const wren = useWrenName();
  const { user } = useAuth();
  const [stats, setStats] = useState<GrowthStats>(EMPTY_STATS);
  const [open, setOpen] = useState<GrowthStamp | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      collectGrowthStats(user?.created_at).then((s) => alive && setStats(s));
      return () => {
        alive = false;
      };
    }, [user?.created_at]),
  );

  const earnedCount = GROWTH_STAMPS.filter((s) => s.earned(stats)).length;
  const openEarned = open ? open.earned(stats) : false;
  const openProgress = open?.progress ? open.progress(stats) : null;
  const openIndex = open ? GROWTH_STAMPS.indexOf(open) + 1 : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tk.bg }}>
      {/* a 52 bar under the safe area: the one BackChevron, the title centred, the count 12 from the right */}
      <View style={{ height: 52, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
        <BackChevron onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me"))} color={tk.ink} />
        <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "500", color: tk.ink }}>Your stamps</Text>
        <Text style={{ position: "absolute", right: 12, minWidth: 36, ...PFM.monoSemi, fontSize: 12, color: tk.mute, textAlign: "center" }}>
          {earnedCount}/{GROWTH_STAMPS.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 13.5, lineHeight: 21, color: tk.sub, marginBottom: 20 }}>
          Earned by the quiet things — writing, answering, keeping, staying. Wren presses one for each.
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {GROWTH_STAMPS.map((s) => {
            const done = s.earned(stats);
            return (
              <Pressable key={s.id} onPress={() => setOpen(s)} style={{ width: "31%", alignItems: "center", marginBottom: 22 }}>
                <GrowthStampTile stamp={s} earned={done} size={92} ground={tk.bg} />
                <Text
                  numberOfLines={1}
                  style={{ fontWeight: done ? "600" : "400", fontSize: 11.5, color: done ? tk.ink : tk.faint, marginTop: 8, textAlign: "center" }}
                >
                  {s.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* stamp detail */}
      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(20,20,26,0.5)", alignItems: "center", justifyContent: "center", padding: 28 }} onPress={() => setOpen(null)}>
          {open && (
            <Pressable style={[cardStyle, { backgroundColor: tk.sf, width: "100%", borderRadius: 22, padding: 26, alignItems: "center" }]} onPress={() => {}}>
              <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1.6, color: tk.mute, marginBottom: 18 }}>
                STAMP NO. {String(openIndex).padStart(2, "0")} · {open.zh}
              </Text>
              <GrowthStampTile stamp={open} earned={openEarned} size={140} ground={tk.sf} />
              <Text style={{ fontSize: 24, fontWeight: "700", color: tk.ink, marginTop: 18 }}>{open.name}</Text>

              {openProgress && !openEarned && (
                <View style={{ width: "70%", marginTop: 14 }}>
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: tk.soft2, overflow: "hidden" }}>
                    <View style={{ width: `${(openProgress[0] / openProgress[1]) * 100}%`, height: "100%", backgroundColor: tk.ind }} />
                  </View>
                  <Text style={{ ...PFM.monoSemi, fontSize: 11, color: tk.mute, textAlign: "center", marginTop: 6 }}>
                    {openProgress[0]} / {openProgress[1]}
                  </Text>
                </View>
              )}

              <Text style={{ fontSize: 14.5, lineHeight: 23, color: tk.sub, textAlign: "center", marginTop: 14 }}>
                {speakAs(open.desc, wren)}
              </Text>

              <Pressable
                onPress={() => {
                  setOpen(null);
                  if (openEarned) router.push("/compose");
                }}
                style={[navyBtn, { paddingVertical: 15, width: "100%", marginTop: 22, backgroundColor: openEarned ? tk.ind : tk.ink }]}
              >
                <Text style={{ color: tk.bg, fontWeight: "700", fontSize: 14.5 }}>
                  {openEarned ? "Write a letter" : "Keep going"}
                </Text>
              </Pressable>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
