import { useWrenName } from "../../lib/wren-name";
import { t, useLang } from "../../lib/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { P, PF, ruleSoft } from "../../theme/post";
import { CorrespondentFace } from "../../components/CorrespondentFace";
import { WrenSaysOnce } from "../../components/WrenSaysOnce";
import { OrbitMap } from "../../components/OrbitMap";
import { PlushCelebration } from "../../components/PlushCelebration";
import { WrenBird } from "../../components/WrenBird";
import { fetchThreads, type ThreadSummary } from "../../lib/db";
import { useMyThreadsLive } from "../../lib/live";
import { useAuth } from "../../lib/auth";
import { setWaiting } from "../../lib/waiting";
import { threadState } from "../../lib/thread-state";
import { reactionLabel } from "../../data/reactions";
import { DEMO_THREADS } from "../../data/demo";

/* Kindreds as an orbit (design K1f): you at the centre, correspondents circling
   in. COMING INTO VIEW: both the orbit radius and the mosaic's resolution are
   driven by the letters THEY send — one currency, two projections. You come to
   know someone by reading them, so it's their writing that draws them closer
   and their face that develops. From five letters each way, either side may
   enclose their name; when both have, Wren trades them (0010). The
   map up top is the whole sky at a glance; the list is where you act.

   Same surface as every other tab — white, with rules doing the separation. */

/* Nothing on this tab was written by a person — the orbit, the counts, the
   progress to a name are all the system reporting. So it is desk all the way
   down, with no sheet anywhere. */
const GROUND = P.penWash;
const REVEAL = 5;

export default function KindredsTab() {
  const router = useRouter();
  useLang(); // repaint when the reader changes language
  const { user } = useAuth();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    fetchThreads().then((t) => {
      setThreads(t || []);
      setLoaded(true);
    });
  }, []);
  useFocusEffect(load);
  // the sky moves while you watch it — a reply lands on its ring live
  useMyThreadsLive(user?.id, load);

  const source = __DEV__ && loaded && threads.length === 0 ? DEMO_THREADS : threads;
  /* THE FILTER THAT HID HALF THE PRODUCT.
     This read `t.mine > 0` — my own letter count — so a thread where a
     stranger had answered YOUR pool letter and you had not yet written back
     was dropped on the floor. Since this tab and lib/stats are the only two
     callers of fetchThreads, that reply existed nowhere in the app: someone
     answered you and, from the inside, nothing happened. A first-timer could
     be shown "Nobody knows your name yet" over a live reply in the database.
     A thread belongs here the moment EITHER side has written. */
  const orbit = useMemo(() => source.filter((t) => t.mine > 0 || t.theirs > 0), [source]);

  /* THE LIST NOW SAYS WHAT THE MAP SAYS. The sky has always separated
     these two: strangers ride the rings, kindreds land at the centre. The
     list underneath mixed them, so a person you had traded names with sat
     between two anonymous mosaics looking like one more of them — and
     tapping her goes somewhere else entirely (a room, not a
     correspondence). Same people, two groups, in both places.

     Inside each group the old rule holds: whatever is on you first, then
     by recency. Sorting the WHOLE list that way would have buried a
     kindred under five strangers on a busy day, which gets the priority
     exactly backwards. */
  const bySort = (a: ThreadSummary, b: ThreadSummary) =>
    Number(!!threadState(b)?.needsYou) - Number(!!threadState(a)?.needsYou) || b.lastAt - a.lastAt;
  const kindreds = useMemo(() => orbit.filter((t) => t.revealed).sort(bySort), [orbit]);
  const coming = useMemo(() => orbit.filter((t) => !t.revealed).sort(bySort), [orbit]);
  const named = kindreds.length;
  // anything at all that is on you — one number, one sentence
  const waiting = orbit.filter((t) => threadState(t)?.needsYou).length;
  const empty = loaded && orbit.length === 0;

  // feed the tab-bar signal from the count this screen already computed
  useEffect(() => setWaiting(waiting), [waiting]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: GROUND }} edges={["top"]}>
      {/* the same plate Today and Sealed carry */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 6, paddingBottom: 9, marginHorizontal: 16, borderBottomWidth: 1, borderBottomColor: P.ink }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: P.ink }}>{t("kindreds.title")}</Text>
        {/* the plate answers one question — is anything on me? */}
        <Text style={{ fontFamily: PF.mono, fontSize: 12.5, letterSpacing: 1.2, color: P.ink60 }}>
          {empty ? (
            t("kindreds.none")
          ) : waiting ? (
            <Text style={{ color: P.pen }}>{t("kindreds.waitingOnYou", { n: waiting })}</Text>
          ) : (
            t("kindreds.allAnswered")
          )}
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
            <WrenSaysOnce id="kindreds" line={t("kindreds.said")} />
            {/* a room with someone you know, or a correspondence with a
                stranger — two different places, so two different groups */}
            {kindreds.length > 0 && coming.length > 0 && <GroupLabel>{t("kindreds.group.kindreds")}</GroupLabel>}
            {kindreds.map((th) => (
              <Card key={th.id} t={th} onPress={() => router.push(`/room/${th.id}`)} />
            ))}

            {kindreds.length > 0 && coming.length > 0 && <GroupLabel>{t("kindreds.group.coming")}</GroupLabel>}
            {coming.map((th) => (
              <Card key={th.id} t={th} onPress={() => router.push(`/chat/${th.id}`)} />
            ))}
          </View>
        </ScrollView>
      )}

      <PlushCelebration kindreds={named} />
    </SafeAreaView>
  );
}

/* Only shown when both groups exist — a lone header over the only group
   there is would be labelling the obvious. */
function GroupLabel({ children }: { children: string }) {
  return (
    <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1.6, color: P.ink40, marginTop: 6, marginBottom: 14 }}>
      {children}
    </Text>
  );
}

function Card({ t: th, onPress }: { t: ThreadSummary; onPress: () => void }) {
  /* ONE LINE, AND IT ANSWERS "WHAT DO I DO NOW?". The row used to carry a
     chip AND a caption AND a moment count, in six combinations — three
     answers to a question nobody asked while scanning a list. How well you
     know someone lives on their page, where it is the subject. */
  const state = threadState(th);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ paddingBottom: 16, marginBottom: 16, opacity: pressed ? 0.5 : 1 }, ruleSoft]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <CorrespondentFace
          seed={th.other}
          theirs={th.theirs}
          revealed={th.revealed}
          otherFace={th.otherFace}
          theirSigned={th.theirSigned}
          iSigned={th.iSigned}
        />
        {th.revealed && (
          <Text style={{ fontFamily: PF.letter, fontSize: 18, fontWeight: "600", color: P.ink }}>{th.otherName || "A kindred"}</Text>
        )}
        <View style={{ flex: 1 }} />
        {/* they caught your last letter with a reaction */}
        {th.theirReaction && (
          <View style={{ width: 28, height: 28, backgroundColor: P.penWash, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 14 }}>{th.theirReaction}</Text>
          </View>
        )}
        {/* one square of ink, the same mark the tab bar carries */}
        {state?.needsYou && <View style={{ width: 7, height: 7, backgroundColor: state.tone }} />}
      </View>
      {th.theirReaction && (
        <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.5, color: P.pen, marginTop: 9 }}>
          {(reactionLabel(th.theirReaction) || t("kd.reactedAny")).toUpperCase()} {t("kd.toLastLetter")}
        </Text>
      )}

      {/* Every row carries the last line written, revealed or not. It used to
          be withheld from strangers, so a brand-new thread was a near-blank
          square and five words of mono — you couldn't even see what you had
          just written, let alone what they said. The line IS the
          relationship; the status underneath is only its weather. */}
      {!!th.preview && (
        <Text numberOfLines={th.revealed ? 1 : 2} style={{ fontFamily: PF.letter, fontSize: 14.5, lineHeight: 21, color: P.ink60, marginTop: 10 }}>
          {th.preview}
        </Text>
      )}
      {state && (
        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 0.8, color: state.tone, marginTop: 9 }}>
          {state.label}
        </Text>
      )}
    </Pressable>
  );
}

function Empty({ onWrite }: { onWrite: () => void }) {
  const wren = useWrenName();
  useLang(); // re-render when the reader changes language
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
        {t("kindreds.empty.title")}
      </Text>
      <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 23, color: P.ink60, textAlign: "center", marginTop: 14, maxWidth: 300 }}>
        {t("kindreds.empty.body")}
      </Text>
      <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.6, color: P.ink40, textAlign: "center", marginTop: 14, maxWidth: 300, lineHeight: 17 }}>
        {t("kindreds.empty.rule")}
      </Text>
      <Pressable
        onPress={onWrite}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: P.pen, paddingVertical: 16, paddingHorizontal: 20, marginTop: 34, alignSelf: "stretch", opacity: pressed ? 0.85 : 1 })}
      >
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 13.5, color: "#fff", letterSpacing: 1 }}>{t("kindreds.empty.cta")}</Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 1, color: "rgba(255,255,255,0.72)" }}>{t("kindreds.empty.picks", { wren: wren.toUpperCase() })}</Text>
      </Pressable>
    </View>
  );
}
