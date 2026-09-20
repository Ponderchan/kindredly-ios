import { useWrenName } from "../../lib/wren-name";
import { t, useLang } from "../../lib/i18n";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readRoomSeen, unreadOf } from "../../lib/room-seen";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { P, PF } from "../../theme/post";
import { AvatarImage } from "../../components/AvatarImage";
import { MosaicId } from "../../components/MosaicId";
import { W14, cardShadow } from "../../components/AuraCard";
import Svg, { Path } from "react-native-svg";
import { postNo, sinceShort } from "../../lib/format";
import { WrenSaysOnce } from "../../components/WrenSaysOnce";
import { OrbitMap } from "../../components/OrbitMap";
import { PlushCelebration } from "../../components/PlushCelebration";
import { WrenBird } from "../../components/WrenBird";
import { WrenDeskRow } from "../../components/WrenDesk";
import { fetchThreads, readThreadsCache, threadsAge, type ThreadSummary } from "../../lib/db";
import { useMyThreadsLive } from "../../lib/live";
import { useAuth } from "../../lib/auth";
import { setWaiting } from "../../lib/waiting";
import { threadState } from "../../lib/thread-state";
import { DEMO_THREADS } from "../../data/demo";
import { useEntitlement } from "../../lib/entitlement";
import { SEATS } from "../../lib/kindred-gate";
import { isExpired, quietDays } from "../../lib/kindred-expiry";
import { markWork } from "../../lib/stall-probe";

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

  /* paint the last good list at once, then ask the network — and only ask
     if the list is more than a few seconds old, since the live channel
     below already moves a landing reply onto its ring */
  /* their letters you haven't opened, per kindred — the ledger is local
     (lib/room-seen) and refreshed with the list, since a room just left
     changes it */
  const [seenLedger, setSeenLedger] = useState<Record<string, number>>({});
  const scrollRef = useRef<ScrollView>(null);
  const yourTurnY = useRef(0);
  const load = useCallback(() => {
    let alive = true;
    readRoomSeen().then((l) => alive && setSeenLedger(l));
    readThreadsCache().then((c) => {
      if (alive && c && !loadedRef.current) {
        setThreads(c);
        setLoaded(true);
      }
    });
    if (threadsAge() > 15) {
      markWork("kindreds:fetch");
      fetchThreads().then((t) => {
        if (!alive) return;
        if (t) setThreads(t);
        setLoaded(true);
      });
    }
    return () => {
      alive = false;
    };
  }, []);
  const loadedRef = useRef(false);
  loadedRef.current = loaded;
  useFocusEffect(load);
  // the sky moves while you watch it — a reply lands on its ring live
  const reload = useCallback(() => {
    fetchThreads().then((t) => t && setThreads(t));
  }, []);
  useMyThreadsLive(user?.id, reload);

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
  /* EXPIRED ROOMS (owner, 2026-09-20; lib/kindred-expiry): thirty days
     without a word and a kindred leaves the seats for a group of their
     own at the foot — still there, still readable, one REKINDLE away.
     On First Class nothing expires. */
  const { premium } = useEntitlement();
  const kindreds = useMemo(() => orbit.filter((t) => t.revealed && !isExpired(t.lastAt, premium)).sort(bySort), [orbit, premium]);
  const expired = useMemo(() => orbit.filter((t) => t.revealed && isExpired(t.lastAt, premium)).sort((a, b) => b.lastAt - a.lastAt), [orbit, premium]);
  const coming = useMemo(() => orbit.filter((t) => !t.revealed).sort(bySort), [orbit]);
  const yourTurn = useMemo(() => coming.filter((t) => threadState(t)?.needsYou), [coming]);
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
        {/* the plate answers one question — is anything on me? — and when
            the answer is yes, tapping it goes there (owner, 2026-09-20) */}
        <Pressable disabled={!waiting} onPress={() => scrollRef.current?.scrollTo({ y: Math.max(0, yourTurnY.current - 12), animated: true })} hitSlop={8}>
          <Text style={{ fontFamily: PF.mono, fontSize: 12.5, letterSpacing: 1.2, color: P.ink60 }}>
            {empty ? (
              t("kindreds.none")
            ) : waiting ? (
              <Text style={{ color: P.pen }}>{waiting === 1 ? t("kindreds.toAnswerOne") : t("kindreds.toAnswer", { n: waiting })} ↓</Text>
            ) : (
              t("kindreds.allAnswered")
            )}
          </Text>
        </Pressable>
      </View>

      {empty ? (
        <Empty onWrite={() => router.push("/compose")} />
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          {/* the sky: only the ones still on their way, with what the marks mean in the footer */}
          <View style={[{ backgroundColor: "#FFFFFF", borderRadius: 18, overflow: "hidden" }, cardShadow, { shadowOpacity: 0.05 }]}>
            <View style={{ alignItems: "center", paddingTop: 6 }}>
              <OrbitMap items={coming} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: W14.hair }}>
              <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.4, color: P.ink60 }}>{t("kd.onRings", { n: coming.length })}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={{ width: 6, height: 6, backgroundColor: P.pen }} />
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.2, color: P.pen }}>{t("kd.yourTurn")}</Text>
              </View>
            </View>
          </View>

          <WrenSaysOnce id="kindreds" line={t("kindreds.said")} />

          {/* the courier's own desk sits with the kindreds, first among
              them, under the sky — she is not on a ring (owner, 2026-09-20) */}
          <View style={{ marginTop: 12 }}>
            <WrenDeskRow />
          </View>

          {/* THE SEATS (owner, 2026-09-20): the card is always here, three
              seats on the fare everyone has — the ones who landed, by name,
              and dotted seats for the ones still on their way. On First
              Class, one dotted seat after the last name. An empty seat
              opens the guide on how a kindred forms. */}
          {(
            <View style={[{ backgroundColor: "#FFFFFF", borderRadius: 18, paddingTop: 12, paddingBottom: 14 }, cardShadow, { shadowOpacity: 0.05 }]}>
              <View style={{ flexDirection: "row", alignItems: "baseline", paddingHorizontal: 16 }}>
                <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.4, color: kindreds.length ? "#2E7D4F" : P.ink60 }}>{t("kd.kindredsN", { n: kindreds.length })}</Text>
                {kindreds.length > SEATS && (
                  <Pressable onPress={() => router.push("/my-kindreds")} hitSlop={8}>
                    <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 12.5, color: P.pen }}>{t("kd.all")}</Text>
                  </Pressable>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, gap: 6 }}>
                {kindreds.slice(0, SEATS).map((th) => {
                  const unread = unreadOf(seenLedger, th.id, th.theirs);
                  return (
                    <Pressable key={th.id} onPress={() => router.push(`/room/${th.id}`)} style={({ pressed }) => ({ width: 78, alignItems: "center", opacity: pressed ? 0.6 : 1 })}>
                      <View style={{ width: 56, height: 56 }}>
                        <AvatarImage id={th.otherFace ?? null} seed={th.other} size={52} />
                        <View style={{ position: "absolute", right: -1, bottom: -1, width: 18, height: 18, borderRadius: 9, backgroundColor: "#2E7D4F", borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                          <Svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M5 12l5 5 9-10" />
                          </Svg>
                        </View>
                        {/* letters of theirs you haven't opened: a number, never
                            a dot (owner, 2026-09-20), in ink rather than pen */}
                        {unread > 0 && (
                          <View style={{ position: "absolute", top: -5, right: -7, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: P.ink, borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, color: "#FFFFFF" }}>{unread > 9 ? "9+" : String(unread)}</Text>
                          </View>
                        )}
                      </View>
                      <Text numberOfLines={1} style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 12.5, color: P.ink, marginTop: 7 }}>{th.otherName || t("kd.aKindred")}</Text>
                    </Pressable>
                  );
                })}
                {/* four seats in the row; the empty ones dotted. From the
                    fifth name on, the row stays four and All → lists them */}
                {Array.from({ length: Math.max(0, SEATS - kindreds.length) }, (_, i) => (
                  <Pressable key={`seat-${i}`} onPress={() => router.push("/room/wren?guide=kindreds")} style={({ pressed }) => ({ width: 78, alignItems: "center", opacity: pressed ? 0.6 : 1 })}>
                    <View style={{ width: 56, height: 56, alignItems: "center", justifyContent: "center" }}>
                      <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderStyle: "dashed", borderColor: P.ink12, alignItems: "center", justifyContent: "center" }}>
                        <View style={{ opacity: 0.35 }}>
                          <MosaicId seed={`seat-${kindreds.length + i}`} cell={3.2} gap={0.9} develop={0.12} />
                        </View>
                      </View>
                    </View>
                    <Text numberOfLines={1} style={{ fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.2, color: P.ink40, marginTop: 9 }}>{t("kd.seat")}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* the rooms that went quiet — read them any time; write, and
              they are back */}
          {expired.length > 0 && (
            <>
              <Text style={groupLabel}>{t("kd.groupExpired", { n: expired.length })}</Text>
              {expired.map((th) => (
                <Pressable key={th.id} onPress={() => router.push(`/room/${th.id}`)} style={({ pressed }) => [{ backgroundColor: "#FFFFFF", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, opacity: pressed ? 0.85 : 1 }, cardShadow, { shadowOpacity: 0.05 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ opacity: 0.45 }}>
                      <AvatarImage id={th.otherFace ?? null} seed={th.other} size={40} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 14, color: P.ink60 }}>{th.otherName || t("kd.aKindred")}</Text>
                      <Text style={{ fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.2, color: P.ink40, marginTop: 3 }}>{t("kd.expiredRow", { n: quietDays(th.lastAt) })}</Text>
                    </View>
                    <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.2, color: P.ink }}>{t("rm.rekindle")} ›</Text>
                  </View>
                </Pressable>
              ))}
            </>
          )}

          {/* still strangers: only the ones on you. The ones you are waiting
              on live on the rings above and nowhere else — a list of people
              who owe you a letter is not something to look at (owner,
              2026-09-20). */}
          {yourTurn.length > 0 && (
            <View onLayout={(e) => (yourTurnY.current = e.nativeEvent.layout.y)}>
              <Text style={groupLabel}>{t("kd.groupYourTurn", { n: yourTurn.length })}</Text>
              {yourTurn.map((th) => (
                <StrangerRow key={th.id} t={th} onOpen={() => router.push(`/chat/${th.id}`)} />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <PlushCelebration kindreds={named} />
    </SafeAreaView>
  );
}

const groupLabel = { fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.4, color: P.ink60, marginTop: 20, marginBottom: 8, marginLeft: 2 } as const;

const EACH_WAY = 5;

/* a stranger, one row: number, whose turn, their last line, how far along
   the road to five each way — and the door, a Reply button when it is you */
function StrangerRow({ t: th, onOpen }: { t: ThreadSummary; onOpen: () => void }) {
  const state = threadState(th);
  const each = Math.min(th.mine, th.theirs);
  const ago = sinceShort(th.lastAt);
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [{ backgroundColor: "#FFFFFF", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, opacity: pressed ? 0.85 : 1 }, cardShadow, { shadowOpacity: 0.05 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#F6F5FD", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <MosaicId seed={th.other} cell={3.2} gap={0.9} develop={0.15 + 0.85 * (Math.min(th.theirs, EACH_WAY) / EACH_WAY)} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 1, color: P.ink }}>NO. {postNo(th.other)}</Text>
            {state && <Text style={{ fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1.2, color: state.needsYou ? P.pen : P.ink40 }}>{state.label.toUpperCase()}</Text>}
            {th.theirReaction && <Text style={{ fontSize: 12 }}>{th.theirReaction}</Text>}
          </View>
          {!!th.preview && (
            <Text numberOfLines={1} style={{ fontFamily: PF.letterSerif, fontSize: 13.5, color: P.ink60, marginTop: 3 }}>{th.preview}</Text>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
            <View style={{ flexDirection: "row", gap: 3 }}>
              {Array.from({ length: EACH_WAY }, (_, i) => (
                <View key={i} style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: i < each ? P.pen : "#E4E1FA" }} />
              ))}
            </View>
            <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 0.6, color: P.ink40 }}>
              {each}/{EACH_WAY}
              {ago ? ` · ${ago}` : ""}
            </Text>
          </View>
        </View>
        {state?.needsYou && (
          <View style={{ backgroundColor: P.pen, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 12.5, color: "#FFFFFF" }}>{t("kd.reply")}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function Empty({ onWrite }: { onWrite: () => void }) {
  const wren = useWrenName();
  useLang(); // re-render when the reader changes language
  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingBottom: 50 }}>
      <View>
        <OrbitMap items={[]} empty />
        {/* Wren waits at the edge of the empty sky */}
        <View style={{ position: "absolute", right: 26, bottom: 28 }}>
          <WrenBird size={40} mood="curious" />
        </View>
      </View>
      {/* and her desk is here before anyone else is — under the sky, where
          the kindreds will go */}
      <View style={{ alignSelf: "stretch", marginTop: 4 }}>
        <WrenDeskRow />
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
    </View>
  );
}
