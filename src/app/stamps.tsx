import { speakAs, useWrenName } from "../lib/wren-name";
import { useCallback, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter, Redirect } from "expo-router";
import { C, F, cardStyle, navyBtn } from "../theme/tokens";
import { GrowthStampTile } from "../components/GrowthStamp";
import { GROWTH_STAMPS, type GrowthStamp, type GrowthStats } from "../data/growth";
import { EMPTY_STATS, collectGrowthStats } from "../lib/stats";
import { useAuth } from "../lib/auth";

/* The stamp album — Kindredly's growth stamps. Earned in colour, the rest
   waiting in grey. Tap one for its story. */
export default function StampsScreen() {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me"))} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 26, color: C.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: F.serif, fontSize: 19, color: C.ink }}>Your stamps</Text>
        <Text style={{ width: 42, fontFamily: F.sansBold, fontSize: 12, color: C.faint, textAlign: "center" }}>
          {earnedCount}/{GROWTH_STAMPS.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 21, color: C.muted, marginBottom: 20 }}>
          Earned by the quiet things — writing, answering, keeping, staying. Wren presses one for each.
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {GROWTH_STAMPS.map((s) => {
            const done = s.earned(stats);
            return (
              <Pressable key={s.id} onPress={() => setOpen(s)} style={{ width: "31%", alignItems: "center", marginBottom: 22 }}>
                <GrowthStampTile stamp={s} earned={done} size={92} />
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: done ? F.sansSemi : F.sans, fontSize: 11.5, color: done ? C.ink : C.faint, marginTop: 8, textAlign: "center" }}
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
            <Pressable style={[cardStyle, { width: "100%", borderRadius: 22, padding: 26, alignItems: "center" }]} onPress={() => {}}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 10, letterSpacing: 1.6, color: C.faint, marginBottom: 18 }}>
                STAMP NO. {String(openIndex).padStart(2, "0")} · {open.zh}
              </Text>
              <GrowthStampTile stamp={open} earned={openEarned} size={140} />
              <Text style={{ fontFamily: F.serifSemi, fontSize: 24, color: C.ink, marginTop: 18 }}>{open.name}</Text>

              {openProgress && !openEarned && (
                <View style={{ width: "70%", marginTop: 14 }}>
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: C.lineSoft, overflow: "hidden" }}>
                    <View style={{ width: `${(openProgress[0] / openProgress[1]) * 100}%`, height: "100%", backgroundColor: C.purple }} />
                  </View>
                  <Text style={{ fontFamily: F.sansBold, fontSize: 11, color: C.faint, textAlign: "center", marginTop: 6 }}>
                    {openProgress[0]} / {openProgress[1]}
                  </Text>
                </View>
              )}

              <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 23, color: C.muted, textAlign: "center", marginTop: 14 }}>
                {speakAs(open.desc, wren)}
              </Text>

              <Pressable
                onPress={() => {
                  setOpen(null);
                  if (openEarned) router.push("/compose");
                }}
                style={[navyBtn, { paddingVertical: 15, width: "100%", marginTop: 22, backgroundColor: openEarned ? C.purple : C.navy }]}
              >
                <Text style={{ color: "#fff", fontFamily: F.sansBold, fontSize: 14.5 }}>
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
