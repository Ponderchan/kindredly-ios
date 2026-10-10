import { useWrenName } from "../../lib/wren-name";
import { t, useLang, getLang } from "../../lib/i18n";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readRoomSeen, unreadOf } from "../../lib/room-seen";
import { Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { P, PF } from "../../theme/post";
import { AvatarImage } from "../../components/AvatarImage";
import { MosaicId } from "../../components/MosaicId";
import { cardShadow } from "../../components/AuraCard";
import { postNo, sinceShort } from "../../lib/format";
import { WrenSaysOnce } from "../../components/WrenSaysOnce";
import { OrbitMap } from "../../components/OrbitMap";
import { KindredsSky } from "../../components/KindredsSky";
import { StateGlyph, STATE_INK, type StateKind } from "../../components/StateGlyph";
import { TabHeader } from "../../components/TabHeader";
import { PlushCelebration } from "../../components/PlushCelebration";
import { WrenBird } from "../../components/WrenBird";
import { WrenDeskRow } from "../../components/WrenDesk";
import { fetchThreads, readThreadsCache, threadsAge, type ThreadSummary } from "../../lib/db";
import { useMyThreadsLive } from "../../lib/live";
import { useAuth } from "../../lib/auth";
import { onYou, setWaiting } from "../../lib/waiting";
import { threadState } from "../../lib/thread-state";
import { DEMO_THREADS } from "../../data/demo";
import { DEMO_TEXT, storeMode } from "../../lib/dev-store";
import { useEntitlement } from "../../lib/entitlement";
import { isExpired, quietDays } from "../../lib/kindred-expiry";
import { markWork } from "../../lib/stall-probe";

/* Kindreds as an orbit (design K1f): you at the centre, correspondents circling
   in. COMING INTO VIEW: both the orbit radius and the mosaic's resolution are
   driven by the letters THEY send — one currency, two projections. You come to
   know someone by reading them, so it's their writing that draws them closer
   and their face that develops. From five letters each way, either side may
   enclose their name; when both have, Wren trades them (0010).

   THE LAYOUT (design 2b × 4c, owner 2026-09-23): the sky folds onto the
   rule under the title — a tick on it for every stranger, blue for the ones
   on you — and opens to the whole orbit on a tap or a pull. Under it the
   list is where you act, in the order the prototype set: Wren, your
   kindreds, the strangers whose turn it is yours, the ones in transit as a
   grid of faces, and the rooms that went quiet. The sky starts folded on
   every visit; the list comes first.

   THE TWO GROUPS OF STRANGERS (owner, 2026-09-23) are one question — whose
   letter is owed. A stranger who has written and is waiting on you sits in
   STRANGERS, newest first, with the door on the row; the moment you write
   back the row leaves and their face joins IN TRANSIT; when they answer,
   it comes back to the top of STRANGERS. Kindreds work like friends: a
   number for the letters of theirs you haven't opened, gone once you've
   read them, answered or not (lib/waiting onYou). */

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
  /* where STRANGERS sits in the scroll, for the title's tap: its offset
     inside the list plus the list's offset under the sky and the plate */
  const listY = useRef(0);
  const yourTurnY = useRef(0);
  /* the sky starts folded on every visit — the list is what you came for */
  const [skyOpen, setSkyOpen] = useState(false);
  useFocusEffect(useCallback(() => () => setSkyOpen(false), []));
  /* the list moves the sky: pulled down past its top, the sky opens, the
     way a pull reveals what sits above on iOS; pushed up from the top while
     the sky is open, it folds back to its line and the list settles under
     it. A push that starts further down is just scrolling. */
  const dragFrom = useRef(0);
  /* a push that folds the sky usually lets go with speed, and iOS carries
     that on after the finger lifts — past the scroll back to the top. So
     the list is sent to the top again once the glide ends, unless a new
     drag has begun by then. */
  const settleTop = useRef(false);
  const toTop = useCallback(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), []);
  const onDragStart = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    dragFrom.current = e.nativeEvent.contentOffset.y;
    settleTop.current = false;
  }, []);
  const onDragEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y < -56) setSkyOpen(true);
    else if (skyOpen && dragFrom.current < 40 && y - dragFrom.current > 24) {
      setSkyOpen(false);
      settleTop.current = true;
      toTop();
    }
  }, [skyOpen, toTop]);
  const onGlideEnd = useCallback(() => {
    if (!settleTop.current) return;
    settleTop.current = false;
    toTop();
  }, [toTop]);
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

  const source = __DEV__ && loaded && (threads.length === 0 || storeMode)
    ? (storeMode ? DEMO_THREADS.map((t) => ({ ...t, preview: t.preview ? DEMO_TEXT[getLang()].b1 : t.preview })) : DEMO_THREADS)
    : threads;
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
  const inTransit = useMemo(() => coming.filter((t) => !threadState(t)?.needsYou), [coming]);
  const named = kindreds.length;
  // anything at all that is on you — one number, one sentence, the tab's rule
  const waiting = useMemo(() => onYou(orbit, seenLedger), [orbit, seenLedger]);
  const empty = loaded && orbit.length === 0;

  // feed the tab-bar signal from the count this screen already computed
  useEffect(() => setWaiting(waiting), [waiting]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: GROUND }} edges={["top"]}>
      {empty ? (
        <>
          <TabHeader title={t("kindreds.title")} right={<Text style={{ fontFamily: PF.mono, fontSize: 12.5, letterSpacing: 1.2, color: P.ink60 }}>{t("kindreds.none")}</Text>} />
          <Empty onWrite={() => router.push("/compose")} />
        </>
      ) : (
        <ScrollView ref={scrollRef} onScrollBeginDrag={onDragStart} onScrollEndDrag={onDragEnd} onMomentumScrollEnd={onGlideEnd} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          {/* the title answers one question — is anything on me? — and
              when it is, tapping it goes there (owner, 2026-09-20). The
              plate itself is every tab's (components/TabHeader). */}
          <TabHeader
            title={t("kindreds.title")}
            right={
              <Pressable disabled={!waiting} onPress={() => scrollRef.current?.scrollTo({ y: Math.max(0, listY.current + yourTurnY.current - 12), animated: true })} hitSlop={8} style={{ flexShrink: 1 }}>
                <Text numberOfLines={2} style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.4, color: waiting ? P.pen : P.ink40, textAlign: "right" }}>
                  {waiting ? (waiting === 1 ? t("kindreds.toAnswerOne") : t("kindreds.toAnswer", { n: waiting })) : t("kindreds.allAnswered")}
                </Text>
              </Pressable>
            }
          />

          {/* the sky, folded onto that rule: a tick for every stranger, blue
              for the ones on you; open on its tag, a tap or a pull */}
          <KindredsSky items={coming} open={skyOpen} onToggle={() => setSkyOpen((o) => !o)} />

          <View onLayout={(e) => (listY.current = e.nativeEvent.layout.y)} style={{ paddingHorizontal: 16, paddingTop: 4 }}>

            <WrenSaysOnce id="kindreds" line={t("kindreds.said")} />

            {/* the courier's own desk, first — she is not on a ring (owner, 2026-09-20) */}
            <WrenDeskRow />

            {/* the ones you traded names with, by recency, whatever is on you first */}
            <GroupLabel kind="kindreds" text={t("kd.kindredsN", { n: kindreds.length })} />
            <View style={card}>
              {kindreds.map((th, i) => (
                <KindredRow key={th.id} t={th} first={i === 0} unread={unreadOf(seenLedger, th.id, th.theirs)} onOpen={() => router.push(`/room/${th.id}`)} />
              ))}
              {kindreds.length === 0 && (
                <Pressable onPress={() => router.push("/room/wren?guide=kindreds")} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, opacity: pressed ? 0.6 : 1 })}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderStyle: "dashed", borderColor: P.ink12, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ opacity: 0.35 }}><MosaicId seed="seat-0" cell={2.6} gap={0.8} develop={0.12} /></View>
                  </View>
                  <Text style={{ flex: 1, fontFamily: PF.letterSerif, fontSize: 13.5, lineHeight: 19, color: P.ink60 }}>{t("kd.noKindredsYet")}</Text>
                </Pressable>
              )}
            </View>

            {/* still strangers, and it is your turn — newest first */}
            {yourTurn.length > 0 && (
              <View onLayout={(e) => (yourTurnY.current = e.nativeEvent.layout.y)}>
                <GroupLabel kind="strangers" text={t("kd.strangersN", { n: yourTurn.length })} right={t("state.yourTurn")} rightInk={STATE_INK.strangers} />
                <View style={card}>
                  {yourTurn.map((th, i) => (
                    <StrangerRow key={th.id} t={th} first={i === 0} onOpen={() => router.push(`/chat/${th.id}`)} />
                  ))}
                </View>
              </View>
            )}

            {/* in transit: their faces, not a list — a list of people who owe
                you a letter is not something to read (owner, 2026-09-20).
                The one you just answered is washed in blue for a day. */}
            {inTransit.length > 0 && (
              <>
                <GroupLabel kind="inTransit" text={t("kd.inTransitN", { n: inTransit.length })} right={t("state.waitingThem")} />
                <View style={[card, { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 14 }]}>
                  {inTransit.map((th) => (
                    <TransitTile key={th.id} t={th} onOpen={() => router.push(`/chat/${th.id}`)} />
                  ))}
                </View>
              </>
            )}

            {/* the rooms that went quiet — read them any time; write, and they are back */}
            {expired.length > 0 && (
              <>
                <GroupLabel kind="expired" text={t("kd.groupExpired", { n: expired.length })} />
                {/* half-there paper: the room is still yours, just quiet */}
                <View style={quietCard}>
                  {expired.map((th, i) => (
                    <Pressable key={th.id} onPress={() => router.push(`/room/${th.id}`)} style={({ pressed }) => [rowBase, i > 0 && rowRule, { opacity: pressed ? 0.6 : 1 }]}>
                      <View style={{ opacity: 0.45 }}>
                        <AvatarImage id={th.otherFace ?? null} seed={th.other} size={42} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 15, color: P.ink60 }}>{th.otherName || t("kd.aKindred")}</Text>
                        <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1.2, color: P.ink40, marginTop: 3 }}>{t("kd.expiredRow", { n: quietDays(th.lastAt) })}</Text>
                      </View>
                      <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.3, color: P.ink }}>{t("rm.rekindle")} ›</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      )}

      <PlushCelebration kindreds={named} />
    </SafeAreaView>
  );
}

/* the prototype's measures (2b, owner 2026-09-23): 22pt corners, rows 16 × 13
   with a pale rule, faces at 42 */
const card = [{ backgroundColor: "#FFFFFF", borderRadius: 22, overflow: "hidden" as const }, cardShadow, { shadowOpacity: 0.05 }];
const quietCard = { backgroundColor: "rgba(255,255,255,0.55)", borderRadius: 22, overflow: "hidden" as const };
const rowBase = { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, paddingHorizontal: 16, paddingVertical: 13 };
const rowRule = { borderTopWidth: 1, borderTopColor: "#EFEEF6" };
/* a group's words are darker than its glyph where the glyph is pale */
const LABEL_INK: Record<StateKind, string> = { ...STATE_INK, inTransit: "#55506E" };

const EACH_WAY = 5;

/* a group's name, in its state's ink, with its glyph (round 3a) — at the
   prototype's size, a 20pt glyph (owner, 2026-09-23). The name is written
   Kindreds, not KINDREDS: the capitals belong to the tab's own title
   above it, so the page has one shout and the groups under it speak. */
function GroupLabel({ kind, text, right, rightInk = P.ink40 }: { kind: StateKind; text: string; right?: string; rightInk?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20, marginBottom: 10, marginHorizontal: 4 }}>
      <StateGlyph kind={kind} size={20} weight={2.2} />
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 13.5, letterSpacing: 0.4, color: LABEL_INK[kind] }}>{text}</Text>
      {!!right && <Text numberOfLines={1} style={{ fontFamily: PF.monoMed, fontSize: 10.5, letterSpacing: 1, color: rightInk }}>{right}</Text>}
    </View>
  );
}

/* a kindred: the face they gave you, the name, their last line, when — and
   the letters of theirs you haven't opened, as a number (owner, 2026-09-20) */
function KindredRow({ t: th, first, unread, onOpen }: { t: ThreadSummary; first: boolean; unread: number; onOpen: () => void }) {
  const ago = sinceShort(th.lastAt);
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [rowBase, !first && rowRule, { opacity: pressed ? 0.6 : 1 }]}>
      <AvatarImage id={th.otherFace ?? null} seed={th.other} size={42} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 15.5, color: P.ink }}>{th.otherName || t("kd.aKindred")}</Text>
        {!!th.preview && <Text numberOfLines={1} style={{ fontFamily: PF.letterSerif, fontSize: 14, color: unread ? P.ink : P.ink60, marginTop: 2 }}>{th.preview}</Text>}
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        {!!ago && <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 0.6, color: P.ink40 }}>{ago}</Text>}
        {unread > 0 && (
          <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: P.ink, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, color: "#FFFFFF" }}>{unread > 9 ? "9+" : String(unread)}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

/* a stranger whose turn is yours: number, how far along the road to names,
   their last line — and the door */
function StrangerRow({ t: th, first, onOpen }: { t: ThreadSummary; first: boolean; onOpen: () => void }) {
  const state = threadState(th);
  const each = Math.min(th.mine, th.theirs);
  const plainTurn = state?.label === t("state.yourTurn");
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [rowBase, !first && rowRule, { opacity: pressed ? 0.6 : 1 }]}>
      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: "#F3F2FB", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <MosaicId seed={th.other} cell={5} gap={1} develop={0.15 + 0.85 * (Math.min(th.theirs, EACH_WAY) / EACH_WAY)} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 0.8, color: P.ink }}>NO. {postNo(th.other)}</Text>
          <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 0.6, color: P.ink40 }}>· {each}/{EACH_WAY}</Text>
        </View>
        {/* past five each way the row has more to say than whose turn it is
            (they went first · swap names) — its own line, never cut short */}
        {state && !plainTurn && <Text numberOfLines={1} style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.2, color: state.tone, marginTop: 3 }}>{state.label.toUpperCase()}</Text>}
        {!!th.preview && <Text numberOfLines={1} style={{ fontFamily: PF.letterSerif, fontSize: 14, color: P.ink60, marginTop: 4 }}>{th.preview}</Text>}
      </View>
      {/* the door says what you'll do there (owner's "Your turn" is the
          group's right-hand word now, facing IN TRANSIT's "waiting on them") */}
      <View style={{ backgroundColor: P.pen, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 8 }}>
        <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 12.5, color: "#FFFFFF" }}>{t("kd.reply")}</Text>
      </View>
    </Pressable>
  );
}

/* one face in transit; the one you answered in the last day is washed blue */
const JUST_SENT = 24 * 3600 * 1000;
function TransitTile({ t: th, onOpen }: { t: ThreadSummary; onOpen: () => void }) {
  const fresh = th.lastSenderMe && Date.now() - th.lastAt < JUST_SENT;
  return (
    <Pressable onPress={onOpen} accessibilityLabel={`NO. ${postNo(th.other)} · ${t("state.waitingThem")}`} hitSlop={4} style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 8, backgroundColor: fresh ? "#E4E3FF" : "#F6F5FD", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>
      <MosaicId seed={th.other} cell={3} gap={0.8} develop={0.15 + 0.85 * (Math.min(th.theirs, EACH_WAY) / EACH_WAY)} />
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
      <View style={{ alignSelf: "stretch", marginTop: 4, marginBottom: 10 }}>
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
