import { useWrenName } from "../../lib/wren-name";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { P, PF, ruleSoft } from "../../theme/post";
import { MosaicId } from "../../components/MosaicId";
import { OrbitMap } from "../../components/OrbitMap";
import { PlushCelebration } from "../../components/PlushCelebration";
import { WrenBird } from "../../components/WrenBird";
import { fetchThreads, type ThreadSummary } from "../../lib/db";
import { reactionLabel } from "../../data/reactions";
import { DEMO_THREADS } from "../../data/demo";

/* Kindreds as an orbit (design K1f): you at the centre, correspondents circling
   in. COMING INTO VIEW: both the orbit radius and the mosaic's resolution are
   driven by the letters THEY send — one currency, two projections. You come to
   know someone by reading them, so it's their writing that draws them closer
   and their face that develops; at five each way Wren trades your names. The
   map up top is the whole sky at a glance; the list is where you act.

   Same surface as every other tab — white, with rules doing the separation. */

/* Nothing on this tab was written by a person — the orbit, the counts, the
   progress to a name are all the system reporting. So it is desk all the way
   down, with no sheet anywhere. */
const GROUND = P.penWash;
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
  const theirTurn = !t.lastSenderMe; // they wrote last → your move / a new letter

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ paddingBottom: 16, marginBottom: 16, opacity: pressed ? 0.5 : 1 }, ruleSoft]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {/* the face, as far as their letters have carried it */}
        <MosaicId
          seed={t.other}
          cell={4.4}
          gap={1.2}
          develop={t.revealed ? 1 : 0.15 + 0.85 * (Math.min(t.theirs, REVEAL) / REVEAL)}
        />
        {t.revealed && (
          <Text style={{ fontFamily: PF.letter, fontSize: 18, fontWeight: "600", color: P.ink }}>{t.otherName || "A kindred"}</Text>
        )}
        <View style={{ flex: 1 }} />
        {/* they caught your last letter with a reaction */}
        {t.theirReaction && (
          <View style={{ width: 28, height: 28, backgroundColor: P.penWash, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 14 }}>{t.theirReaction}</Text>
          </View>
        )}
        {theirTurn && (
          <View style={{ backgroundColor: P.pen, paddingHorizontal: 7, paddingVertical: 2.5 }}>
            <Text style={{ fontFamily: PF.monoMed, fontSize: 9, letterSpacing: 1, color: "#fff" }}>NEW</Text>
          </View>
        )}
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
          COMING INTO VIEW · {theirTurn ? "YOUR TURN" : "WAITING ON THEM"}
        </Text>
      )}
    </Pressable>
  );
}

function Empty({ onWrite }: { onWrite: () => void }) {
  const wren = useWrenName();
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
        EVERY LETTER THEY SEND PULLS THEM ONE RING CLOSER{"\n"}AT THE CENTRE, YOU TRADE NAMES
      </Text>
      <Pressable
        onPress={onWrite}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: P.pen, paddingVertical: 16, paddingHorizontal: 20, marginTop: 34, alignSelf: "stretch", opacity: pressed ? 0.85 : 1 })}
      >
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 13.5, color: "#fff", letterSpacing: 1 }}>PUT SOMEONE IN ORBIT</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 1, color: "rgba(255,255,255,0.72)" }}>{wren.toUpperCase()} PICKS</Text>
      </Pressable>
    </View>
  );
}
