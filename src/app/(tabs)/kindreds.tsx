import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { P, PF, ruleSoft } from "../../theme/post";
import { OrbitMap } from "../../components/OrbitMap";
import { PlushCelebration } from "../../components/PlushCelebration";
import { WrenBird } from "../../components/WrenBird";
import { fetchThreads, type ThreadSummary } from "../../lib/db";
import { reactionLabel } from "../../data/reactions";
import { DEMO_THREADS } from "../../data/demo";

/* Kindreds as an orbit (design K1f): you at the centre, correspondents circling
   in. Each reply pulls a stranger one ring closer; at five each way Wren trades
   your names. The map up top is the whole sky at a glance; the list is where
   you act.

   Same surface as every other tab — white, with rules doing the separation. */

const GROUND = P.paper;
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
      {/* the same plate Today and Sealed carry */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 6, paddingBottom: 9, marginHorizontal: 16, borderBottomWidth: 1, borderBottomColor: P.ink }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: P.ink }}>KINDREDS</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 12.5, letterSpacing: 1.2, color: P.ink60 }}>
          {empty ? "NONE" : `${String(orbit.length).padStart(2, "0")} IN ORBIT${named ? ` · ${named} NAMED` : ""}`}
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
      style={({ pressed }) => [{ paddingBottom: 16, marginBottom: 16, opacity: pressed ? 0.5 : 1 }, ruleSoft]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 9, height: 9, backgroundColor: t.revealed ? P.pen : `rgba(58,58,245,${0.28 + 0.55 * (p / REVEAL)})` }} />
        {t.revealed ? (
          <Text style={{ fontFamily: PF.letter, fontSize: 18, fontWeight: "600", color: P.ink }}>{t.otherName || "A kindred"}</Text>
        ) : (
          <Dots p={p} />
        )}
        <View style={{ flex: 1 }} />
        {/* they caught your last letter with a reaction */}
        {t.theirReaction && (
          <View style={{ width: 28, height: 28, backgroundColor: P.penWash, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 14 }}>{t.theirReaction}</Text>
          </View>
        )}
        <View style={{ alignItems: "flex-end", gap: 5 }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.8, color: P.ink40 }}>{p}/5</Text>
          {theirTurn && (
            <View style={{ backgroundColor: P.pen, paddingHorizontal: 7, paddingVertical: 2.5 }}>
              <Text style={{ fontFamily: PF.monoMed, fontSize: 9, letterSpacing: 1, color: "#fff" }}>NEW</Text>
            </View>
          )}
        </View>
      </View>
      {t.theirReaction && (
        <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.5, color: P.pen, marginTop: 9 }}>
          {(reactionLabel(t.theirReaction) || "they reacted").toUpperCase()} — TO YOUR LAST LETTER
        </Text>
      )}

      {/* a revealed friend gets their last line; a stranger stays status-only */}
      {t.revealed ? (
        <Text numberOfLines={1} style={{ fontFamily: PF.letter, fontSize: 14.5, lineHeight: 21, color: P.ink60, marginTop: 10 }}>
          {t.preview}
        </Text>
      ) : (
        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.8, color: P.ink40, marginTop: 12 }}>
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
        <View key={i} style={{ width: 7, height: 7, backgroundColor: i < p ? P.pen : P.ink12 }} />
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
      <Text style={{ fontFamily: PF.letter, fontSize: 26, fontWeight: "600", color: P.ink, textAlign: "center", marginTop: 14, lineHeight: 33 }}>
        Nobody knows your{"\n"}name yet.
      </Text>
      <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 23, color: P.ink60, textAlign: "center", marginTop: 14, maxWidth: 300 }}>
        But someone out there might be looking for a voice like yours.
      </Text>
      <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.6, color: P.ink40, textAlign: "center", marginTop: 14, maxWidth: 300, lineHeight: 17 }}>
        EVERY REPLY PULLS A STRANGER ONE RING CLOSER{"\n"}AT THE CENTRE, YOU TRADE NAMES
      </Text>
      <Pressable
        onPress={onWrite}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: P.pen, paddingVertical: 16, paddingHorizontal: 20, marginTop: 34, alignSelf: "stretch", opacity: pressed ? 0.85 : 1 })}
      >
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 13.5, color: "#fff", letterSpacing: 1 }}>PUT SOMEONE IN ORBIT</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 1, color: "rgba(255,255,255,0.72)" }}>WREN PICKS</Text>
      </Pressable>
    </View>
  );
}
