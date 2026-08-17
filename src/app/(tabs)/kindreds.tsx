import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { C, F } from "../../theme/tokens";
import { OrbitMap } from "../../components/OrbitMap";
import { PlushCelebration } from "../../components/PlushCelebration";
import { WrenBird } from "../../components/WrenBird";
import { fetchThreads, type ThreadSummary } from "../../lib/db";
import { DEMO_THREADS } from "../../data/demo";

/* Kindreds as an orbit (design K1f): you at the centre, correspondents circling
   in. Each reply pulls a stranger one ring closer; at five each way Wren trades
   your names. The map up top is the whole sky at a glance; the list is where
   you act. */

const GROUND = "#ECEBF4"; // a pale lavender — the space where strangers orbit
const REVEAL = 5;

export default function KindredsTab() {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchThreads().then((t) => {
        setThreads(t || []);
        setLoaded(true);
      });
    }, []),
  );

  const source = __DEV__ && loaded && threads.length === 0 ? DEMO_THREADS : threads;
  const orbit = useMemo(() => source.filter((t) => t.mine > 0).sort((a, b) => b.lastAt - a.lastAt), [source]);
  const named = orbit.filter((t) => t.revealed).length;
  const empty = loaded && orbit.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: GROUND }} edges={["top"]}>
      {/* header */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 8 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 34, color: C.ink, letterSpacing: -0.5 }}>Kindreds</Text>
        <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 1.6, color: "#8B84B8", marginTop: 14 }}>
          {empty ? "NOTHING IN ORBIT" : `${orbit.length} IN ORBIT${named ? ` · ${named} NAMED` : ""}`}
        </Text>
      </View>

      {empty ? (
        <Empty onWrite={() => router.push("/compose")} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: "center", paddingTop: 6, paddingBottom: 10 }}>
            <OrbitMap items={orbit} />
          </View>
          <View style={{ paddingHorizontal: 20 }}>
            {orbit.map((t) => (
              <Card key={t.id} t={t} onPress={() => router.push(`/chat/${t.id}`)} />
            ))}
          </View>
        </ScrollView>
      )}

      <PlushCelebration kindreds={named} />
    </SafeAreaView>
  );
}

function Card({ t, onPress }: { t: ThreadSummary; onPress: () => void }) {
  const p = Math.min(t.mine, REVEAL);
  const theirTurn = !t.lastSenderMe; // they wrote last → your move / a new letter
  const status = theirTurn ? `${Math.max(0, REVEAL - t.mine)} MORE TO A NAME` : "WAITING ON THEM";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: "#fff", borderRadius: 18, padding: 16, marginBottom: 12, opacity: pressed ? 0.96 : 1, shadowColor: "#2A2153", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: t.revealed ? C.purpleMid : `rgba(109,109,246,${0.3 + 0.5 * (p / REVEAL)})` }} />
        {t.revealed ? (
          <Text style={{ fontFamily: F.serif, fontSize: 18, color: C.ink }}>{t.otherName || "A kindred"}</Text>
        ) : (
          <Dots p={p} />
        )}
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={{ fontFamily: F.sansExtra, fontSize: 9.5, letterSpacing: 1.2, color: "#8B84B8" }}>{p}/5 LETTERS</Text>
          {theirTurn && (
            <View style={{ backgroundColor: C.purpleLt, borderRadius: 11, paddingHorizontal: 9, paddingVertical: 3 }}>
              <Text style={{ fontFamily: F.sansExtra, fontSize: 9, letterSpacing: 1, color: C.purple }}>NEW</Text>
            </View>
          )}
        </View>
      </View>

      {/* a revealed friend gets their last line; a stranger stays status-only */}
      {t.revealed ? (
        <Text numberOfLines={1} style={{ fontFamily: F.letter, fontSize: 14.5, lineHeight: 21, color: "#3A3630", marginTop: 10 }}>
          “{t.preview}”
        </Text>
      ) : (
        <Text style={{ fontFamily: F.sansExtra, fontSize: 9.5, letterSpacing: 1.2, color: C.faint, marginTop: 12 }}>
          RING {t.mine} · {status}
        </Text>
      )}
    </Pressable>
  );
}

function Dots({ p }: { p: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 5 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: i < p ? C.purpleMid : "#D2CCF0" }} />
      ))}
    </View>
  );
}

function Empty({ onWrite }: { onWrite: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: 50 }}>
      <View>
        <OrbitMap items={[]} empty />
        {/* Wren waits at the edge of the empty sky */}
        <View style={{ position: "absolute", right: 26, bottom: 28 }}>
          <WrenBird size={40} mood="curious" />
        </View>
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 27, color: C.ink, textAlign: "center", marginTop: 14, lineHeight: 34 }}>
        Nobody knows your{"\n"}name yet.
      </Text>
      <Text style={{ fontFamily: F.letter, fontSize: 15, lineHeight: 23, color: "#55506E", textAlign: "center", marginTop: 14, maxWidth: 300 }}>
        But someone out there might be looking for a voice like yours.
      </Text>
      <Text style={{ fontFamily: F.letter, fontSize: 14, lineHeight: 22, color: C.muted, textAlign: "center", marginTop: 10, maxWidth: 300 }}>
        Every reply pulls a stranger one ring closer. At the centre, you trade names.
      </Text>
      <Pressable
        onPress={onWrite}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.purple, borderRadius: 26, paddingVertical: 17, paddingHorizontal: 24, marginTop: 34, alignSelf: "stretch", opacity: pressed ? 0.92 : 1 })}
      >
        <Text style={{ fontFamily: F.sansExtra, fontSize: 15, color: "#fff", letterSpacing: 0.2 }}>Put someone in orbit</Text>
        <Text style={{ fontFamily: F.sansExtra, fontSize: 9.5, letterSpacing: 1.2, color: "rgba(255,255,255,0.7)" }}>WREN PICKS</Text>
      </Pressable>
    </View>
  );
}
