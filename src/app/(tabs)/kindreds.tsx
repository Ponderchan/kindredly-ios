import { useWrenName } from "../../lib/wren-name";
import { t, useLang, getLang } from "../../lib/i18n";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { markRoomSeen, markRoomUnread, readRoomSeen, unreadOf } from "../../lib/room-seen";
import { Alert, Modal, Pressable, ScrollView, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { P, PF } from "../../theme/post";
import { AvatarImage } from "../../components/AvatarImage";
import { MosaicId } from "../../components/MosaicId";
import { listWhen as when, postNo } from "../../lib/format";
import { WrenSaysOnce } from "../../components/WrenSaysOnce";
import { OrbitMap } from "../../components/OrbitMap";
import { KindredsSky } from "../../components/KindredsSky";
import { StateGlyph } from "../../components/StateGlyph";
import { TabHeader } from "../../components/TabHeader";
import { PlushCelebration } from "../../components/PlushCelebration";
import { WrenBird } from "../../components/WrenBird";
import { WrenDeskRow } from "../../components/WrenDesk";
import { Button as SButton, Host, Image as SImage, Menu, Section, Toggle } from "@expo/ui/swift-ui";
import { blockUser, fetchThreadMessages, fetchThreads, forgetThread, readThreadDetailCache, readThreadsCache, reportContent, theirLatest, threadsAge, type ThreadSummary } from "../../lib/db";
import { MessageMenu, a11yActions, type MessageAction } from "../../components/MessageMenu";
import { LeaveSheet } from "../../components/LeaveSheet";
import { useMyThreadsLive } from "../../lib/live";
import { useAuth } from "../../lib/auth";
import { onYou, setWaiting } from "../../lib/waiting";
import { threadState } from "../../lib/thread-state";
import { DEMO_THREADS } from "../../data/demo";
import { DEMO_TEXT, storeMode } from "../../lib/dev-store";
import { useEntitlement } from "../../lib/entitlement";
import { closingSoon, daysLeft, isExpired, quietDays } from "../../lib/kindred-expiry";
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
  const { premium, settled } = useEntitlement();
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

  /* ── THE LIST (owner, 2026-10-10: "under the orbit and Wren it's a mess") ──
     One paper, one list. Three tabs — ALL, KINDREDS, PEN PALS — over it, a
     native menu to show only whose turn it is and to sort, and every row
     saying for itself whose turn it is. Wren is the first row of ALL, pinned
     under a full-strength rule. The order answers "who is waiting on me?":
     on you (pen pals whose turn is yours, kindreds with letters you haven't
     opened — exactly what the title counts) → kindreds you're caught up with
     → pen pals whose turn is theirs → rooms gone quiet → accounts closed.
     It replaces the groups of 2b/4c (09-23): four cards, four labels, a
     Write back button and a grid of faces for the ones in transit. */
  const live = useMemo(() => orbit.filter((t) => !t.gone), [orbit]);
  const closed = useMemo(() => orbit.filter((t) => t.gone), [orbit]);
  const unread = useCallback((th: ThreadSummary) => unreadOf(seenLedger, th.id, th.theirs), [seenLedger]);
  const onMe = useCallback((th: ThreadSummary) => (th.revealed ? unread(th) > 0 : !!threadState(th)?.needsYou), [unread]);
  const isQuiet = useCallback((th: ThreadSummary) => th.revealed && isExpired(th.lastAt, premium), [premium]);

  const [tab, setTabState] = useState<ListTab>(session.tab);
  const [show, setShowState] = useState<Show>(session.show);
  const [sort, setSortState] = useState<Sort>(session.sort);
  const setTab = (v: ListTab) => { session.tab = v; setTabState(v); };
  const setShow = (v: Show) => { session.show = v; setShowState(v); };
  const setSort = (v: Sort) => { session.sort = v; setSortState(v); };
  const [wrenNew, setWrenNew] = useState(0);

  const rank = (th: ThreadSummary) => (onMe(th) ? 0 : th.revealed ? 1 : 2);
  const order = (a: ThreadSummary, b: ThreadSummary) => (sort === "recent" ? 0 : rank(a) - rank(b)) || b.lastAt - a.lastAt;
  const inTab = (th: ThreadSummary) => (tab === "all" ? true : tab === "kindreds" ? th.revealed : !th.revealed);
  const passes = (th: ThreadSummary) => (show === "your" ? onMe(th) : show === "their" ? !onMe(th) && th.lastSenderMe : true);
  const main = useMemo(() => live.filter((th) => !isQuiet(th) && inTab(th) && passes(th)).sort(order), [live, tab, show, sort, seenLedger, premium]); // eslint-disable-line react-hooks/exhaustive-deps
  const quiet = useMemo(() => (show ? [] : live.filter((th) => isQuiet(th) && inTab(th)).sort((a, b) => b.lastAt - a.lastAt)), [live, tab, show, premium]); // eslint-disable-line react-hooks/exhaustive-deps
  const shut = useMemo(() => (show ? [] : closed.filter(inTab).sort((a, b) => b.lastAt - a.lastAt)), [closed, tab, show]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = { kindreds: live.filter((th) => th.revealed).length, penpals: live.filter((th) => !th.revealed).length };
  const dots = {
    all: wrenNew > 0 || live.some(onMe),
    kindreds: live.some((th) => th.revealed && onMe(th)),
    penpals: live.some((th) => !th.revealed && onMe(th)),
  };
  const filtered = !!show || sort !== "turn";
  const clearFilter = () => { setShow(null); setSort("turn"); };
  const openOnMe = () => {
    setTab("all");
    setShow("your");
    scrollRef.current?.scrollTo({ y: Math.max(0, listY.current - 12), animated: true });
  };
  const open = (th: ThreadSummary) => router.push(th.revealed ? `/room/${th.id}` : `/chat/${th.id}`);

  /* LONG-PRESS A ROW (owner, 2026-10-10): iOS's own context menu, the same
     one a line in a room has, so holding something means one thing across
     the app. No swipe — the list is a React Native scroll (its pull opens
     the sky) and a swipe here could only be an imitation; and what a swipe
     is for, sorting an inbox fast, is exactly what this list leaves out:
     no delete (it would take their half too), no hide or archive (a quiet
     way to ghost someone), no pin (Wren is the pin; the order answers who
     is waiting on you), no mute. What's left: read or unread on this phone,
     their page, rekindle for a quiet room, and report and block for anyone.
     A closed account and Wren have nothing to offer. Tapping still opens. */
  const wren = useWrenName();
  const { width: winW } = useWindowDimensions();
  const rowW = winW - 32 - 2; // the paper's margins and rules
  const [blocking, setBlocking] = useState<ThreadSummary | null>(null);
  const [blockBusy, setBlockBusy] = useState(false);
  const refreshSeen = () => readRoomSeen().then(setSeenLedger);
  const reportRow = async (th: ThreadSummary) => {
    /* their newest words: fetched now (the room's cache can be days behind
       the row's preview), then the cache, then the list's own copy */
    const d = (await fetchThreadMessages(th.id)) ?? (await readThreadDetailCache(th.id));
    const snapshot = theirLatest(d?.messages, d?.openingFromMe ? null : d?.opening) ?? th.theirTexts?.[th.theirTexts.length - 1];
    const ok = await reportContent({ targetUser: th.other, context: "thread", refId: th.id, reason: "other", snapshot });
    if (ok) Alert.alert(t("rp.reportedTitle"), t("rp.reportedBody", { wren }));
    else Alert.alert(t("rp.failed"), t("rp.failedBody"));
  };
  const doBlock = async () => {
    const th = blocking;
    if (!th || blockBusy) return;
    setBlockBusy(true);
    const ok = await blockUser(th.other);
    setBlockBusy(false);
    setBlocking(null);
    if (!ok) {
      Alert.alert(t("rp.blockFailed"), t("rp.failedBody"));
      return;
    }
    // gone from both lists at once (0024); the fetch confirms it
    setThreads((list) => list.filter((x) => x.id !== th.id));
    await forgetThread(th.id);
    reload();
  };
  const rowMenu = (th: ThreadSummary, quietRow: boolean): MessageAction[] => {
    if (th.gone || th.id.startsWith("demo-")) return [];
    const acts: MessageAction[] = [];
    if (th.revealed) {
      if (quietRow) acts.push({ key: "rekindle", label: t("kd.menu.rekindle"), icon: "flame", onPress: () => router.push("/paywall?src=rekindle") });
      // a quiet room's unread letters still count in the title, so they can be marked read too
      if (unread(th) > 0) acts.push({ key: "read", label: t("kd.menu.markRead"), icon: "envelope.open", onPress: () => void markRoomSeen(th.id, th.theirs).then(refreshSeen) });
      else if (!quietRow && th.theirs > 0) acts.push({ key: "unread", label: t("kd.menu.markUnread"), icon: "envelope.badge", onPress: () => void markRoomUnread(th.id, th.theirs).then(refreshSeen) });
      acts.push({ key: "page", label: t("kd.menu.theirPage"), icon: "person.crop.circle", onPress: () => router.push(`/kindred/${th.id}`) });
    }
    acts.push({ key: "report", label: t("rp.menu.report"), icon: "flag", destructive: true, onPress: () => void reportRow(th) });
    acts.push({ key: "block", label: t("rp.menu.block"), icon: "hand.raised", destructive: true, onPress: () => setBlocking(th) });
    return acts;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: GROUND }} edges={["top"]}>
      {empty ? (
        <>
          <TabHeader title={t("kindreds.title")} right={<Text style={{ fontFamily: PF.mono, fontSize: 12.5, letterSpacing: 1.2, color: P.ink60 }}>{t("kindreds.none")}</Text>} />
          <Empty onWrite={() => router.push("/compose")} />
        </>
      ) : (
        <ScrollView ref={scrollRef} onScrollBeginDrag={onDragStart} onScrollEndDrag={onDragEnd} onMomentumScrollEnd={onGlideEnd} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          {/* the title answers one question — is anything on me? — and when it
              is, tapping it shows exactly those (owner, 2026-09-20 / 10-10) */}
          <TabHeader
            title={t("kindreds.title")}
            right={
              <Pressable disabled={!waiting} onPress={openOnMe} hitSlop={8} style={{ flexShrink: 1 }}>
                <Text numberOfLines={2} style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.4, color: waiting ? P.pen : P.ink40, textAlign: "right" }}>
                  {waiting ? (waiting === 1 ? t("kindreds.toAnswerOne") : t("kindreds.toAnswer", { n: waiting })) : t("kindreds.allAnswered")}
                </Text>
              </Pressable>
            }
          />

          {/* the sky, folded onto that rule: a tick for every pen pal, blue for the ones on you */}
          <KindredsSky items={coming.filter((th) => !th.gone)} open={skyOpen} onToggle={() => setSkyOpen((o) => !o)} />

          <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
            <WrenSaysOnce id="kindreds" line={t("kindreds.said")} />
          </View>

          <View onLayout={(e) => (listY.current = e.nativeEvent.layout.y)}>
            {/* three tabs in one ruled bar, and the menu beside it at the same height */}
            <View style={{ flexDirection: "row", alignItems: "stretch", gap: 8, marginHorizontal: 16, marginTop: 14 }}>
              <View accessibilityRole="tablist" style={{ flex: 1, minWidth: 0, flexDirection: "row", borderWidth: 1, borderColor: P.ink12, backgroundColor: "#FFFFFF" }}>
                {LIST_TABS.map((k, i) => {
                  const sel = tab === k;
                  const n = k === "all" ? null : counts[k];
                  return (
                    <Pressable
                      key={k}
                      onPress={() => setTab(k)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: sel }}
                      style={{ flex: 1, minWidth: 0, height: 34, borderLeftWidth: i ? 1 : 0, borderLeftColor: P.ink12, backgroundColor: sel ? P.ink : "transparent", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 4 }}
                    >
                      {/* the groups' own marks: a kindred's face, a pen pal's square */}
                      {k !== "all" && <StateGlyph kind={k === "kindreds" ? "kindreds" : "strangers"} size={13} weight={2} color={sel ? "#FFFFFF" : undefined} cut={sel ? P.ink : undefined} />}
                      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ flexShrink: 1, fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 0.4, color: sel ? "#FFFFFF" : P.ink60 }}>
                        {t(TAB_LABEL[k])}
                      </Text>
                      {n != null && <Text style={{ fontFamily: PF.mono, fontSize: 10.5, color: sel ? "rgba(255,255,255,0.6)" : P.ink40 }}>{n}</Text>}
                      {/* a pen square: someone in this tab is waiting on you */}
                      {!sel && dots[k] && <View style={{ position: "absolute", top: 5, right: 5, width: 5, height: 5, backgroundColor: P.pen }} />}
                    </Pressable>
                  );
                })}
              </View>
              <ListMenu show={show} sort={sort} filtered={filtered} onShow={setShow} onSort={setSort} onClear={clearFilter} />
            </View>

            {!!show && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginHorizontal: 16, marginTop: 8 }}>
                <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1, color: P.ink60 }}>
                  {t("kd.showing", { what: show === "your" ? t("state.yourTurn") : t("state.waitingThem"), n: main.length })}
                </Text>
                <Pressable onPress={() => setShow(null)} hitSlop={10} accessibilityRole="button">
                  <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1, color: P.ink }}>{t("kd.clear")}</Text>
                </Pressable>
              </View>
            )}

            {/* one paper */}
            <View style={{ marginHorizontal: 16, marginTop: 10, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: P.ink12 }}>
              {tab === "all" && !show && <WrenDeskRow inList onUnread={setWrenNew} />}
              {main.map((th, i) => (
                <ListRow key={th.id} t={th} unread={unread(th)} closing={th.revealed && settled && closingSoon(th.lastAt, premium)} rule={i > 0} width={rowW} actions={rowMenu(th, false)} onOpen={() => open(th)} />
              ))}
              {/* the empty line only when the paper really is empty — not over
                  the rooms that went quiet or the accounts that closed */}
              {main.length === 0 && (show || tab === "penpals" || (quiet.length === 0 && shut.length === 0)) && (
                show ? (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 16 }}>
                    <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.2, color: P.ink40 }}>{show === "your" ? t("kindreds.allAnswered") : t("kd.nothingHere")}</Text>
                  </View>
                ) : tab === "kindreds" ? (
                  <Pressable onPress={() => router.push("/room/wren?guide=kindreds")} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, opacity: pressed ? 0.6 : 1 })}>
                    <View style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderStyle: "dashed", borderColor: P.ink12 }} />
                    <Text style={{ flex: 1, fontFamily: PF.letterSerif, fontSize: 13.5, lineHeight: 19, color: P.ink60 }}>{t("kd.noKindredsYet")}</Text>
                  </Pressable>
                ) : tab === "penpals" ? (
                  <Pressable onPress={() => router.push("/(tabs)/letters")} style={({ pressed }) => ({ paddingHorizontal: 14, paddingVertical: 14, opacity: pressed ? 0.6 : 1 })}>
                    <Text style={{ fontFamily: PF.letterSerif, fontStyle: "italic", fontSize: 14, lineHeight: 20, color: P.ink60 }}>{t("kd.penPalsEmpty")}</Text>
                    <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.2, color: P.pen, marginTop: 8 }}>{t("kd.toDesk")}</Text>
                  </Pressable>
                ) : null
              )}
              {/* the rooms that went quiet, then the correspondences whose other side is gone */}
              {quiet.length > 0 && (
                <>
                  <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1.2, color: P.ink40, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6, borderTopWidth: 1, borderTopColor: P.ink12 }}>
                    {t("kd.groupExpired", { n: quiet.length }).toUpperCase()}
                  </Text>
                  {quiet.map((th, i) => <ListRow key={th.id} t={th} unread={0} quiet rule={i > 0} width={rowW} actions={rowMenu(th, true)} onOpen={() => open(th)} />)}
                </>
              )}
              {shut.map((th, i) => <ListRow key={th.id} t={th} unread={0} rule={i > 0 || quiet.length > 0 || main.length > 0} width={rowW} actions={[]} onOpen={() => open(th)} />)}
            </View>

            {/* NO FOOTNOTE (owner, 2026-10-10: "always sitting there, it hurts
                the page"). Its two rules are said where they are true: five
                letters each way by the cells on every pen pal row and the
                band in their chat; thirty quiet days by a room inside its
                last week, on its row and in the room (lib/kindred-expiry). */}
          </View>
        </ScrollView>
      )}

      {/* block, asked once — the same sheet the ⋯ in a room raises */}
      <Modal visible={!!blocking} transparent animationType="none" onRequestClose={() => !blockBusy && setBlocking(null)}>
        <LeaveSheet
          open={!!blocking}
          title={t("rp.blockTitle")}
          body={t("rp.blockBody")}
          actions={[{ label: blockBusy ? "…" : t("rp.blockConfirm"), kind: "destructive", onPress: () => void doBlock() }]}
          cancelLabel={t("set.neverMind")}
          onCancel={() => !blockBusy && setBlocking(null)}
        />
      </Modal>

      <PlushCelebration kindreds={named} />
    </SafeAreaView>
  );
}

type ListTab = "all" | "kindreds" | "penpals";
type Show = null | "your" | "their";
type Sort = "turn" | "recent";
const LIST_TABS: ListTab[] = ["all", "kindreds", "penpals"];
const TAB_LABEL: Record<ListTab, string> = { all: "kd.tab.all", kindreds: "kd.tab.kindreds", penpals: "kd.tab.penPals" };
/* the tab, the filter and the sort last while the app is open; a fresh
   launch starts at ALL, unfiltered, your turn first */
const session: { tab: ListTab; show: Show; sort: Sort } = { tab: "all", show: null, sort: "turn" };

/* the menu: iOS's own (SwiftUI Menu via @expo/ui), in a ruled square the
   height of the tabs; solid ink while anything isn't the default */
function ListMenu({ show, sort, filtered, onShow, onSort, onClear }: { show: Show; sort: Sort; filtered: boolean; onShow: (v: Show) => void; onSort: (v: Sort) => void; onClear: () => void }) {
  return (
    <View accessible accessibilityRole="button" accessibilityLabel={t("kd.filter.a11y")} style={{ width: 36, borderWidth: 1, borderColor: filtered ? P.ink : P.ink12, backgroundColor: filtered ? P.ink : "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
      <Host matchContents>
        <Menu label={<SImage systemName="line.3.horizontal.decrease" size={15} color={filtered ? "#FFFFFF" : P.ink} />}>
          <Section title={t("kd.filter.showOnly")}>
            <Toggle label={t("kd.filter.yourTurn")} isOn={show === "your"} onIsOnChange={(on) => onShow(on ? "your" : null)} />
            <Toggle label={t("kd.filter.theirTurn")} isOn={show === "their"} onIsOnChange={(on) => onShow(on ? "their" : null)} />
          </Section>
          <Section title={t("kd.filter.sort")}>
            <Toggle label={t("kd.filter.turnFirst")} isOn={sort === "turn"} onIsOnChange={() => onSort("turn")} />
            <Toggle label={t("kd.filter.recent")} isOn={sort === "recent"} onIsOnChange={() => onSort("recent")} />
          </Section>
          {filtered && <SButton label={t("kd.filter.clear")} role="destructive" onPress={onClear} />}
        </Menu>
      </Host>
    </View>
  );
}

const EACH_WAY = 5;
const NOOP = () => {};
const JUST_SENT = 24 * 3600 * 1000;

/* ONE ROW for everyone (owner, 2026-10-10). The face says who: a round face is
   a kindred (names traded), a square mosaic a pen pal (still a number). Line
   two is the state, in the one vocabulary (lib/thread-state), then their last
   line. The right column holds one thing: the five cells for a pen pal (one
   per letter each way, pen blue at five each), the unread count for a
   kindred, REKINDLE for a quiet room. A room inside its last week says how
   long it has left, ahead of the line (lib/kindred-expiry).

   Long-pressed, the row is lifted whole into iOS's menu, so it is hosted
   natively and sized by its own content: it gets the paper's width in
   points, and a white ground so the lifted copy isn't see-through. */
function ListRow({ t: th, unread, quiet = false, closing = false, rule, width, actions, onOpen }: { t: ThreadSummary; unread: number; quiet?: boolean; closing?: boolean; rule: boolean; width: number; actions: MessageAction[]; onOpen: () => void }) {
  const state = threadState(th);
  const kindred = th.revealed;
  const each = Math.min(th.mine, th.theirs, EACH_WAY);
  const theirTurn = !kindred && !!state && !state.needsYou;
  const fresh = !kindred && th.lastSenderMe && Date.now() - th.lastAt < JUST_SENT && !th.gone;
  const dim = quiet || th.gone;
  const preview = th.preview;
  const name = kindred ? th.otherName || t("kd.aKindred") : `NO. ${postNo(th.other)}`;
  const left = closing ? daysLeft(th.lastAt) : 0;
  const closes = closing ? (left <= 1 ? t("kd.closesDay") : t("kd.closesIn", { n: left })) : null;
  const a11y = [name, kindred ? closes : state?.label, kindred && unread ? String(unread) : null, when(th.lastAt)].filter(Boolean).join(", ");
  return (
    <Pressable
      onPress={onOpen}
      /* a long-press is the row's menu, so lifting the finger must not also open it */
      onLongPress={actions.length ? NOOP : undefined}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      {...a11yActions(actions)}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <MessageMenu actions={actions} radius={0}>
      <View style={{ width, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: fresh ? P.penWash : "#FFFFFF" }}>
      <View style={{ opacity: dim ? 0.45 : 1 }}>
        {kindred ? (
          <AvatarImage id={th.otherFace ?? null} seed={th.other} size={42} />
        ) : (
          <View style={{ width: 42, height: 42, borderWidth: 1, borderColor: P.ink12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <MosaicId seed={th.other} cell={5} gap={1} develop={0.15 + 0.85 * (Math.min(th.theirs, EACH_WAY) / EACH_WAY)} />
          </View>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {kindred ? (
          <Text numberOfLines={1} style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 15.5, color: dim ? P.ink60 : P.ink }}>{name}</Text>
        ) : (
          <Text numberOfLines={1} style={{ fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 0.8, color: theirTurn || dim ? P.ink60 : P.ink }}>{name}</Text>
        )}
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 3, minWidth: 0 }}>
          {quiet ? (
            <Text numberOfLines={1} style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 1.2, color: P.ink40 }}>{t("kd.expiredRow", { n: quietDays(th.lastAt) })}</Text>
          ) : th.gone ? (
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.2, color: P.ink40 }}>{t("kd.accountClosed")}</Text>
          ) : kindred ? (
            <>
              {!!closes && <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.2, color: P.post }}>{closes}</Text>}
              {th.lastSenderMe && <Text style={{ fontFamily: PF.monoMed, fontSize: 10, letterSpacing: 0.8, color: P.ink40 }}>{t("ui.you")} ·</Text>}
              {!!preview && <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: PF.letterSerif, fontSize: 14, color: unread ? P.ink : P.ink60 }}>{preview}</Text>}
            </>
          ) : (
            <>
              {!!state && <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.2, color: state.tone }}>{state.label.toUpperCase()}</Text>}
              {/* their turn says only that; the line is for a letter waiting on you */}
              {!theirTurn && !!preview && <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: PF.letterSerif, fontSize: 14, color: P.ink60 }}>{preview}</Text>}
            </>
          )}
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 7 }}>
        {quiet ? (
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.2, color: P.ink }}>{t("rm.rekindle")} ›</Text>
        ) : (
          <>
            <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 0.6, color: P.ink40 }}>{when(th.lastAt)}</Text>
            {!kindred && !th.gone ? (
              <View style={{ flexDirection: "row", gap: 2 }}>
                {Array.from({ length: EACH_WAY }, (_, i) => (
                  <View key={i} style={{ width: 6, height: 6, backgroundColor: each >= EACH_WAY ? P.pen : i < each ? P.ink : P.ink12 }} />
                ))}
              </View>
            ) : kindred && unread > 0 ? (
              <View style={{ minWidth: 20, height: 20, paddingHorizontal: 5, backgroundColor: P.ink, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, color: "#FFFFFF" }}>{unread > 9 ? "9+" : String(unread)}</Text>
              </View>
            ) : null}
          </>
        )}
      </View>
      </View>
      </MessageMenu>
      {rule && <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 68, right: 0, height: 1, backgroundColor: P.ink12 }} />}
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
