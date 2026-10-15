import { useWrenName } from "../../lib/wren-name";
import { useMediaUrl } from "../../lib/media";
import { GlyphInput } from "../../components/GlyphInput";
import { SignUpSheet, openSignUpSheet } from "../../components/SignUpSheet";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Dimensions, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, Keyframe, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Path, Rect } from "react-native-svg";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { wrenStageDirty } from "../../lib/wren-stage";
import { P, PF, rule } from "../../theme/post";
import { PUNCH, drop, outline } from "../../theme/punch";
import { TabHeader } from "../../components/TabHeader";
import { LinearGradient } from "expo-linear-gradient";
import { StampTile } from "../../components/StampTile";
import { LangPair } from "../../components/LangPair";
import { SignalChip } from "../../components/SignalChip";
import type { Signal } from "../../lib/today-signal";
import { MosaicId } from "../../components/MosaicId";
import { WrenBird } from "../../components/WrenBird";
import { AudioCard } from "../../components/AudioCard";
import { CloseOfDay } from "../../components/CloseOfDay";
import { onYou } from "../../lib/waiting";
import { readRoomSeen } from "../../lib/room-seen";
import { Toast, useSlow } from "../../components/ui";
import { DEMO_POOL, seedDemoThread } from "../../data/demo";
import { DEMO_TEXT, storeMode } from "../../lib/dev-store";
import { getStamp, sname } from "../../data/stamps";
import { ReportMenu } from "../../components/ReportMenu";
import { SendPlane } from "../../components/ChatField";
import { useTabBarSpace } from "../../components/NativeTabBar";
import { DeskStrip } from "../../components/WrenDesk";
import { postNo, postmark, sinceShort } from "../../lib/format";
import { fetchMatches, fetchPool, POOL_CACHE_KEY, replyToLetter, type PoolLetter, lastWriteFail, fetchThreads, markLetterRead } from "../../lib/db";
import { refreshFingerprint, signalFor } from "../../lib/aura";
import { noteWrote, replanLocal } from "../../lib/local-push";
import { bump, getCounters, repliedToday, seenToday } from "../../lib/usage-counters";
import { track } from "../../lib/track";
import { getLang, needsTranslating, sourceTag, t, useLang } from "../../lib/i18n";
import { screenNow, translate } from "../../lib/wren";
import { ARRIVAL_AT_KEY, ARRIVAL_FRESH, ARRIVAL_SENT, getFlags, setFlag, unsetFlag } from "../../lib/flags";
import { useAuth } from "../../lib/auth";
import { STARTER_STAMPS } from "../../data/stamps";
import { LETTER_MAX, REPLY_MIN, letterTier, weightedCount } from "../../lib/weighted-count";
import { fieldBox } from "../../lib/field";
import { SEND_BEAT_MS } from "../../lib/net";
import { LetterInFlight } from "../../components/LetterInFlight";
import { DAY_LETTERS, MAX_IN_FLIGHT, inFlight, rationPool, type FlightThread } from "../../lib/ration";
import { deskDay } from "../../lib/day";
import { startDayClosed } from "../../lib/activities";
import { LeaveSheet, openLeaveSheet } from "../../components/LeaveSheet";

/* Today — the post, as a stack of strangers you swipe through. Each letter fills
   the screen; if it moves you, write back and a thread opens (it moves to
   Kindreds). If it doesn't, swipe up to the next one — no guilt, no unread badge.
   Threads already going live in Kindreds now; Today is only what's fresh at your
   door. New users meet the post through a one-time ritual first (Wren's welcome),
   then land here forever. The lavender ground marks the strangers' space. */

const PAPER = "#FBF7EC";
const W = Dimensions.get("window").width;
const WINDOW_H = Dimensions.get("window").height;
const WINDOW_W = Dimensions.get("window").width;

/* a reload lands on a desk already in use: every letter the server still
   has stays where it is (one that's gone — its author deleted it, became a
   kindred, was blocked — leaves), and the day's new ones join at the end,
   up to the fifteen */
function keepDesk(cur: PoolLetter[], all: PoolLetter[], fresh: PoolLetter[]): PoolLetter[] {
  /* `all` is one page of the newest letters. When that page is full, a
     letter missing from it may simply have aged past it — on a busy day the
     desk used to lose letters mid-read for that. Only a short page (the
     server's whole pool) can say a letter is gone. */
  const alive = new Set(all.map((l) => l.id));
  const kept = all.length < POOL_PAGE ? cur.filter((l) => alive.has(l.id)) : cur;
  const seen = new Set(kept.map((l) => l.id));
  const add = fresh.filter((l) => !seen.has(l.id));
  return [...kept, ...add].slice(0, Math.max(kept.length, DAY_LETTERS));
}
const POOL_PAGE = 40;

/* THE DESK IS PUT AWAY AS IT WAS LEFT — the fifteen, in the matcher's
   order, with the day they belong to. Opening on the same day paints
   exactly that, and the network only adds to it; the old cache was the
   raw pool, so the first paint was a placeholder the first answer replaced
   and the matcher then re-sorted — the letter under the thumb swapped
   twice within two seconds of opening (owner, 2026-09-19). Onboarding
   still writes the raw list (no desk exists yet); that shape is read as a
   placeholder. */
type DeskCache = { day: string; desk: PoolLetter[] };
/* lib/local-push reads this key: the 8 o'clock knock is skipped only for a
   morning whose own desk is known to be empty, so a desk that fills or
   empties re-plans it — once per change, not on every put-away */
let deskWasFull: boolean | null = null;
const putAway = (desk: PoolLetter[]) => {
  const full = desk.length > 0;
  const changed = full !== deskWasFull;
  deskWasFull = full;
  void AsyncStorage.setItem(POOL_CACHE_KEY, JSON.stringify({ day: deskDay(), desk } satisfies DeskCache))
    .then(() => (changed ? replanLocal({ force: true }) : undefined))
    .catch((e) => console.warn("[today] desk put-away:", e));
};
async function readDeskCache(): Promise<{ desk: PoolLetter[]; today: boolean } | null> {
  try {
    const raw = await AsyncStorage.getItem(POOL_CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as PoolLetter[] | DeskCache;
    if (Array.isArray(c)) return c.length ? { desk: rationPool(c), today: false } : null;
    if (!Array.isArray(c.desk) || !c.desk.length) return null;
    return { desk: c.desk, today: c.day === deskDay() };
  } catch {
    return null;
  }
}

export default function LettersTab() {
  useLang(); // repaint when the reader changes language
  const router = useRouter();
  const [flightsUp, setFlightsUp] = useState(0);
  const [waiting, setWaiting] = useState(0); // correspondences waiting on a reply from you — her slip counts them
  const [pool, setPool] = useState<PoolLetter[]>([]);
  /* LAST TIME'S LETTERS PAINT FIRST. A cold open used to show an empty desk
     until two queries came back; now yesterday's pool is on screen at once
     and the fresh one replaces it when it lands. Never used for the first-run
     ceremony (that waits for the real pool) — there is nothing cached yet. */
  const lastLoad = useRef(0);
  const [loaded, setLoaded] = useState(false);
  /* THE FIRST ARRIVAL. Onboarding ends with her first crossing; when Today
     opens after it she lands on the header rule with the three envelopes,
     and the first of them unfolds. The slot stays until the third is behind
     you or you answer one of them — a delivery is not a toast, so a tab
     switch does not end it — and it expires with the day she came back. */
  const [fresh, setFresh] = useState(false);
  const [sent, setSent] = useState(true); // did the opener leave, or stay on the phone
  useEffect(() => {
    Promise.all([getFlags(), AsyncStorage.getItem(ARRIVAL_AT_KEY)])
      .then(([f, at]) => {
        if (!f[ARRIVAL_FRESH]) return;
        const t0 = at ? Number(at) : 0;
        setSent(!!f[ARRIVAL_SENT]);
        if (t0 && Date.now() - t0 < ARRIVAL_TTL) setFresh(true);
        else void unsetFlag(ARRIVAL_FRESH); // the day she came back has passed
      })
      .catch(() => {});
  }, []);
  const freshRef = useRef(false);
  freshRef.current = fresh;
  const settle = useCallback(() => {
    if (!freshRef.current) return;
    setFresh(false);
    void unsetFlag(ARRIVAL_FRESH);
  }, []);

  /* THE POOL IS NOW ACTUALLY MATCHED. fetchMatches() has existed since the
     first backend migration and nothing in the app had ever called it, so
     "matched by how you write" — the product's central claim, printed on the
     welcome carousel — was not happening in anything a reader saw: the feed
     was newest-first with yourself filtered out.

     compute_matches caches only the k=3 closest writers, nightly, by cosine
     over the signature vectors. So most letters have no score and that is
     correct, not a gap: a letter floats to the top only when the matcher
     genuinely named its author, and the docket line stays silent about
     closeness for every other one. */
  /* ONE POOL, EVERY LANGUAGE — owner's call, and the right one. Sorting
     a reader's own language to the top was tried and pulled: four
     languages would have split an already thin pool into four thinner
     ones, and the product's claim is that a stranger anywhere might
     write like you, not a stranger who shares your keyboard. Translation
     already exists on every letter; what was missing was somebody saying
     so, which is now her job at both ends — see WrenSaysOnce on the
     composer and the line beside TRANSLATE. */
  /* THE DESK DOESN'T REARRANGE ITSELF UNDER YOU. A reload used to replace
     the pool outright and then re-sort it once the matcher answered — two
     shuffles a second apart, and the letter under the reader's thumb was
     swapped twice. Coming back to the tab read as the desk "flipping
     through a few letters" on its own (owner, 2026-09-19). The ration's
     own rule is the same fifteen all day, so a reload with letters already
     on the desk only ADDS at the end and attaches scores in place; the
     order is only rebuilt when there's nothing on the desk yet, or when the
     reader asks (pull / retry → reset). */
  const loadedRef = useRef(false);
  const load = useCallback(async (reset = false) => {
    /* the first answer after opening rebuilds the desk only when what's on
       it is a placeholder — another day's desk, or the raw pool; today's
       desk, put away last time, is already the real thing and is only added
       to. Matched writers belong at the top of a desk being built. */
    if (!loadedRef.current && !reset) {
      const c = await readDeskCache();
      if (c) {
        setPool((cur) => (cur.length ? cur : c.desk));
        if (c.today) loadedRef.current = true;
      }
    }
    const rebuild = reset || !loadedRef.current;
    /* THE LETTERS DON'T WAIT ON THE MATCHER. Awaiting both together meant the
       feed appeared only once the nightly-matches lookup also came back — a
       query that adds nothing to the first paint and, for most readers, comes
       back empty anyway. The pool paints as soon as it lands; the closeness
       scores fold in a moment later. */
    const [p, th] = await Promise.all([fetchPool(), fetchThreads()]);
    setFlightsUp(inFlight((th || []) as FlightThread[]));
    /* her slip counts what's on you by the Kindreds tab's rule (lib/waiting
       onYou): a kindred's letter you've read is not owed, and a correspondent
       whose account is gone owes nothing either way */
    setWaiting(onYou(th || [], await readRoomSeen()));
    const fresh = rationPool(p || []);
    // no answer (offline, signed out) leaves the desk as it is rather than clearing it
    setPool((cur) => (!p && cur.length ? cur : rebuild || !cur.length ? fresh : keepDesk(cur, p || [], fresh)));
    setLoaded(true);
    loadedRef.current = true;
    const m = await fetchMatches();
    if (!m?.closest?.length) {
      setPool((cur) => {
        putAway(cur);
        return cur;
      });
      return;
    }
    const score = new Map(m.closest.map((c) => [c.uid, c.score]));
    /* THE MATCHER CHOOSES PEOPLE NOW, NOT JUST THE ORDER. It used to run
       downstream of recency: fetchPool picked the newest forty, and the
       scores could only shuffle those forty. The writer closest to you,
       if their letter sat forty-first, was unreachable — the better the
       pool did, the less the matching mattered. So the scores come back
       WITH those writers' letters: one narrowed fetch, deduped into the
       pool. fetchPool's own filters (not-me, no known correspondents)
       already ran on this second pass too. */
    const theirs = (await fetchPool(40, m.closest.map((c) => c.uid))) || [];
    setPool((cur) => {
      const seen = new Set(cur.map((l) => l.id));
      const scored = [...cur, ...theirs.filter((l) => !seen.has(l.id))].map((l) => ({ ...l, close: l.author ? score.get(l.author) : undefined }));
      // a desk being built: matched first, then the server's newest-first. A desk in use: as it was, the matched newcomers at the end
      const next = rebuild || !seen.size ? rationPool(scored.sort((a, b) => (b.close ?? -1) - (a.close ?? -1))) : scored.slice(0, Math.max(cur.length, DAY_LETTERS));
      putAway(next);
      return next;
    });
  }, []);
  useFocusEffect(
    useCallback(() => {
      // every tab switch used to refetch the whole desk; a fresh pool is fresh for a minute
      if (Date.now() - lastLoad.current >= 45_000) {
        lastLoad.current = Date.now();
        void load();
      }
    }, [load]),
  );

  // a letter leaving the desk leaves the put-away desk too, or it would be back next open
  const take = (next: PoolLetter[]) => {
    putAway(next);
    return next;
  };

  const demo = __DEV__ && loaded && (pool.length === 0 || storeMode);
  const feed = demo ? (storeMode ? [{ ...DEMO_POOL[0], body: DEMO_TEXT[getLang()].letter, lang: getLang() }, ...DEMO_POOL.slice(1)] : DEMO_POOL) : pool;

  return (
    <Feed
      feed={feed}
      loaded={loaded}
      onReloaded={() => load(true)}
      flights={flightsUp}
      waiting={waiting}
      router={router}
      demo={demo}
      fresh={fresh}
      sent={sent}
      onSettled={settle}
      onAnswered={(id) => setPool((cur) => take(cur.filter((l) => l.id !== id)))}
      onBlockedAuthor={(a) => setPool((cur) => take(cur.filter((l) => l.author !== a)))}
    />
  );
}

/* ── the everyday swipe feed ── */
function Feed({
  feed,
  loaded,
  onReloaded,
  flights: flightsIn,
  waiting,
  router,
  demo,
  fresh,
  sent,
  onSettled,
  onAnswered,
  onBlockedAuthor,
}: {
  feed: PoolLetter[];
  /** her first crossing just landed — the arrival chrome shows once */
  fresh: boolean;
  sent: boolean;
  onSettled: () => void;
  loaded: boolean;
  onReloaded: () => void;
  /** correspondences waiting on a reply from you — her slip at the close of day */
  waiting: number;
  /** correspondences opened and not yet answered — the pouch, see lib/ration */
  flights: number;
  router: ReturnType<typeof useRouter>;
  demo: boolean;
  /** an answered letter leaves this reader's desk */
  onAnswered: (letterId: string) => void;
  /** every letter by this writer leaves the desk the moment you block them */
  onBlockedAuthor: (author: string) => void;
}) {
  const wren = useWrenName();
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const tabH = useTabBarSpace(); // the room whichever tab bar is drawn takes (NativeTabBar)
  /* "did I pull the blind today" — one flag per desk day. The day turns at
     eight, when she's back (lib/day); an app left open across eight sees the
     flag lift, the blind roll up and the desk rebuilt with the next fifteen,
     which is exactly what the countdown on the blind promised. */
  const [day, setDay] = useState(deskDay());
  useEffect(() => {
    const tick = setInterval(() => {
      const d = deskDay();
      if (d !== day) setDay(d);
    }, 30000);
    return () => clearInterval(tick);
  }, [day]);
  const firstDay = useRef(true);
  const reloadRef = useRef(onReloaded);
  reloadRef.current = onReloaded; // the parent hands a fresh closure each render; only the day may fire this
  useEffect(() => {
    if (firstDay.current) {
      firstDay.current = false;
      return;
    }
    reloadRef.current();
    setIdx(0);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [day]);
  const sealKey = `sealed:${day}`;
  const [sealed, setSealed] = useState(false);
  useEffect(() => {
    getFlags().then((f) => setSealed(!!f[sealKey]));
  }, [sealKey]);
  const seal = () => {
    setSealed(true);
    void setFlag(sealKey);
    void startDayClosed({ read: facts.read, waiting: facts.waiting }); // her, on the lock screen, till she's back
  };
  /* the cord is held: the pager must not scroll under the pull */
  const [held, setHeld] = useState(false);
  const [idx, setIdx] = useState(0);
  /* what her slip says — read off the phone's own counters when the day
     closes, never guessed. `read` is the desk itself while it's on screen;
     on a quiet day it's the counter, so a desk read and cleared still counts. */
  const [repliedN, setRepliedN] = useState(0);
  const [seenN, setSeenN] = useState(0);
  useEffect(() => {
    if (!sealed && !(loaded && idx >= feed.length)) return;
    getCounters().then((c) => {
      setRepliedN(repliedToday(c));
      setSeenN(seenToday(c));
    });
  }, [sealed, loaded, idx, feed.length]);
  const facts = { read: feed.length || seenN, replied: repliedN, waiting };
  const [vh, setVh] = useState(WINDOW_H - 250);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [toast, setToast] = useState(false);
  const [sending, setSending] = useState(false);
  const [extraFlights, setExtraFlights] = useState(0);
  const [flightSheet, setFlightSheet] = useState(false);
  // dev: /letters?full=1 pretends the pouch is full, to see the sheet without five real letters out
  const { full: forceFull } = useLocalSearchParams<{ full?: string }>();
  const flights = __DEV__ && forceFull === "1" ? MAX_IN_FLIGHT : flightsIn + extraFlights; // sends this session count immediately
  const slow = useSlow(sending);
  const [kbOpen, setKbOpen] = useState(false);
  /* REPLY ↓ WAS NEVER A BUTTON. It was a bare <Text> — no Pressable, no
     handler, nothing in this file ever called .focus() — so the one
     affordance pointing at the reply box did nothing at all, and the box
     itself is a thin strip near the fold that is easy to miss. The ref makes
     the affordance real. */
  const replyRef = useRef<TextInput>(null);
  const focusReply = () => replyRef.current?.focus();
  const { isGuest } = useAuth();
  const [needsAccount, setNeedsAccount] = useState(false);

  useEffect(() => {
    const s = Keyboard.addListener("keyboardWillShow", () => setKbOpen(true));
    const h = Keyboard.addListener("keyboardWillHide", () => setKbOpen(false));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  const quiet = loaded && feed.length === 0;
  const atEnd = idx >= feed.length;
  const current = feed[idx];
  /* counted, for the reader's own stickers: every letter the pager lands on,
     once, and each reply sent — the share behind Picky / Generous */
  const seenIds = useRef(new Set<string>());
  useEffect(() => {
    if (!current || current.id.startsWith("demo") || seenIds.current.has(current.id)) return;
    seenIds.current.add(current.id);
    void bump("seen");
  }, [current]);
  /* the writer's eye: a letter counts as read once it has been the page on
     the desk for two seconds — flicking past is not reading. One per reader,
     the database keeps that. */
  useEffect(() => {
    if (!current || current.id.startsWith("demo")) return;
    const id = current.id;
    const timer = setTimeout(() => markLetterRead(id), 2000);
    return () => clearTimeout(timer);
  }, [current]);

  const goto = (i: number) => {
    scrollRef.current?.scrollTo({ y: i * vh, animated: true });
    setIdx(i);
  };
  /* the page height moves — the arrival slot folds away, the keyboard rises —
     and a paged ScrollView keeps its OFFSET, not its page. Re-seat the page
     you are on whenever the height changes, so the pager never lands between
     two letters. */
  const idxRef = useRef(0);
  idxRef.current = idx;
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: idxRef.current * vh, animated: false });
  }, [vh]);
  /* the third envelope is behind you: the arrival is over, the desk is the desk */
  useEffect(() => {
    if (fresh && idx >= 3) onSettled();
  }, [fresh, idx, onSettled]);

  /* THE LETTER BEING ANSWERED IS PASSED IN, never read from the pager.
     It used to take `current` — feed[idx] — while the reader's draft was
     keyed on its OWN letter.id. Those agree only while the pager's index and
     the page you're looking at agree, and this pager demonstrably drifts. The
     failure isn't a no-op either: with a stale draft under the other key, a
     reply meant for one stranger would have been sent to a different one. */
  /* the letter a blocked send was aimed at, so signing in resumes THAT one */
  const pendingReply = useRef<PoolLetter | null>(null);

  const send = async (target?: PoolLetter) => {
    const to = target ?? current;
    if (!to || sending) return;
    /* THE WRITER DELETED THEIR ACCOUNT WHILE THIS WAS BEING WRITTEN. 0009
       keeps their letter but nulls the author, and the server's "start
       thread" policy requires b is not null — so replyToLetter bails and the
       reader got "Try again", advice that could never work no matter how
       many times it was taken. fetchPool no longer serves these, but the
       race is real: the account can die between the fetch and this tap. */
    if (!to.author) {
      Alert.alert(t("ld.gone.title"), t("ld.gone.body"));
      return;
    }
    const text = (drafts[to.id] || "").trim();
    const w = weightedCount(text);
    if (w < REPLY_MIN || w > LETTER_MAX) return;
    /* THE POUCH IS FULL. Three answers are out there waiting on their
       people; a fourth door doesn't open until one of them walks back
       through. Not a daily meter — an answer frees the slot, so the way
       to more correspondence is being worth answering. Demo letters are
       rehearsal and never count. */
    if ((__DEV__ && forceFull === "1") || (!demo && !to.author?.startsWith("demo-") && flights >= MAX_IN_FLIGHT)) {
      /* the product's own sheet, not the OS dialog — the pouch being full
         is a state of the post, and the post speaks in its own voice.
         Keyboard first: the sheet opened UNDER it and all anyone saw was
         a dimmed page (owner, build 18). */
      openLeaveSheet(() => setFlightSheet(true));
      return;
    }
    setSending(true);
    Keyboard.dismiss();
    /* A FLOOR, NOT A DELAY — and a low one. The send can finish in less
       time than it takes to draw the courier leaving; on the demo path it
       finishes in the same tick, so React batched the flag on and off and
       nothing was ever drawn. The write races the beat rather than waiting
       behind it, and the beat is kept short enough that it is never what
       the reader is waiting on. */
    const beat = new Promise<void>((r) => setTimeout(r, SEND_BEAT_MS));
    if (demo || to.author?.startsWith("demo-")) {
      seedDemoThread(to, text);
    } else {
      /* NO NETWORK LEFT IN FRONT OF THE SEND. The model gate lived here
         for exactly one day. It was inconsistent (the second letter to the
         same person, written in chat, has never been screened by anything),
         it bought no safety over Report and Block on a one-to-one reply,
         and it was the slowest thing in the product. The local check that
         was doing the real work is synchronous — see screenNow. The model
         still screens open letters in compose, where a stranger at large
         is the audience and a send-off animation covers the wait. */
      const gate = screenNow(text);
      if (!gate.ok) {
        setSending(false);
        Alert.alert(t("cp.gate.title", { wren }), t("cp.gate.body"));
        return; // the draft stays in the box
      }
      /* THIS RESULT USED TO BE THROWN AWAY. replyToLetter returns null for a
         reader with no session, and the screen cleared the box, popped the
         toast and moved to the next letter regardless — so a ghost watched
         their reply "send" and open a thread that never existed. Of every
         silent failure in the product this was the only one that actively
         lied about something the reader cares about. */
      const threadId = await replyToLetter(to, text);
      if (!threadId) {
        await beat;
        setSending(false);
        pendingReply.current = to;
        if (isGuest) openSignUpSheet(() => setNeedsAccount(true));
        else if (lastWriteFail() === "offline")
          Alert.alert(t("net.offline.title"), t("net.offline.body"));
        else Alert.alert(t("cp.fail.title"), t("ld.replyFail"));
        return; // the draft stays in the box
      }
      /* the moment a stranger's letter becomes a correspondence — the
         single most important conversion in the product */
      track("reply_sent", { weight: weightedCount(text) });
      void bump("replied");
      setExtraFlights((f) => f + 1);
      wrenStageDirty(); // a first reply is where she fledges
      onSettled(); // answering one of what she brought back ends the arrival
    }
    await beat;
    setSending(false);
    setDrafts((d) => ({ ...d, [to.id]: "" }));
    void refreshFingerprint(); // the reply is part of your voice now
    void noteWrote("letter");
    setToast(true);
    setTimeout(() => setToast(false), 2200);
    /* AND IT LEAVES THE POOL. This only scrolled, so the letter you had just
       answered stayed in the pager behind you and came back at the top of
       Today on every visit — offering "write back…" to someone you were
       already corresponding with. Dropping it locally makes the pager land
       on the next letter by itself; the server-side pool is shared and
       tracks no reads, so this is the reader's own desk being cleared. */
    onAnswered(to.id);
  };

  if (quiet) {
    // nothing waiting — you're already at the close of the day
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
        <View style={{ flex: 1, paddingBottom: tabH }}>
          <CloseOfDay
            sealed={sealed}
            facts={facts}
            onSeal={seal}
          />
        </View>
      </SafeAreaView>
    );
  }

  const replyW = current ? weightedCount(drafts[current.id] || "") : 0;
  const replyOk = replyW >= REPLY_MIN && replyW <= LETTER_MAX;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
      <Header count={feed.length} idx={Math.min(idx, feed.length - 1)} atEnd={loaded && atEnd} />
      <DeskStrip />
      <Arrival open={fresh} sent={sent} idx={idx} onGoto={goto} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1 }} onLayout={(e) => setVh(e.nativeEvent.layout.height)}>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            pagingEnabled
            scrollEnabled={!held}
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.y / vh))}
          >
            {feed.map((letter, i) => (
              <Animated.View key={letter.id + (fresh && i === 0 ? ":fresh" : "")} entering={fresh && i === 0 ? UNFOLD : undefined}>
              <LetterPage
                letter={letter}
                height={vh}
                first={i === 0 && idx === 0}
                onBlockedAuthor={onBlockedAuthor}
                onReply={focusReply}
                reply={{
                  value: drafts[letter.id] || "",
                  onChange: (t: string) => setDrafts((d) => ({ ...d, [letter.id]: t })),
                  // bound to THIS letter, not to whatever the pager thinks is current
                  onSend: () => send(letter),
                  canSend: (() => {
                    const w = weightedCount(drafts[letter.id] || "");
                    return w >= REPLY_MIN && w <= LETTER_MAX && !sending;
                  })(),
                  sending,
                  slow,
                }}
              />
              </Animated.View>
            ))}
            {/* swipe past the last letter and the post closes: you stamp the
                day shut. The screen behind switches to the same paper so the
                page and the ground meet without a seam.

                GATED ON `loaded`. While the pool is still in flight the feed
                is empty, so this was the only page in the pager — every cold
                open flashed THE POST IS CLOSED with a countdown before the
                letters arrived and shoved it away. Saying the day is over
                while we are still asking is the worst thing this screen can
                get wrong, and slice 142 made the flash longer by putting the
                matches query in the same await. */}
            {loaded && (
            <View style={{ height: vh, backgroundColor: P.penWash }}>
              <CloseOfDay
                sealed={sealed}
                facts={facts}
                onSeal={seal}
                onGrab={setHeld}
              />
            </View>
            )}
          </ScrollView>
        </View>

        {/* one shared reply bar, bound to the letter you're on. Always rendered
            at a constant height (even on the caught-up page) so the pager's page
            height never shifts under it. */}
        <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: kbOpen ? 10 : tabH + 6 }}>
          {!atEnd && current ? (
            /* THE REPLY IS NOT PAPER YET, and that is the point. Giving it
               its own sheet made a second letter on the desk and turned the
               screen into a form with an input stapled to it. On the bare wash
               with only its rule, it reads as a pen hovering — your words
               become a page when you send them, and that page lives in the
               thread that opens. */
            <Pressable onPress={focusReply} style={{ minHeight: 78 }} disabled={sending}>
              {/* THE WORDS ARE NOT YOURS TO EDIT ANY MORE. Leaving a live
                  text field on screen under a "···" button asked the reader
                  to believe two things at once — that the letter was gone,
                  and that they were still writing it. The composer gives way
                  to the mark instead, addressed to the person it is going to. */}
              {sending ? (
                <LetterInFlight to={current.author ? `NO.${postNo(current.author)}` : null} slow={slow} />
              ) : (
              /* the pen is a sticker too now (G1): outlined, hard-shadowed,
                 SEND a black pill — but still not paper; no second sheet */
              <View style={[{ flexDirection: "row", alignItems: "flex-end", gap: 12, paddingLeft: 14, paddingRight: 8, paddingVertical: 4 }, outline(16), drop(4)]}>
                <GlyphInput
                  ref={replyRef}
                  value={drafts[current.id] || ""}
                  onChangeText={(t) => setDrafts((d) => ({ ...d, [current.id]: t }))}
                  placeholder={t("ld.writeBackPh")}
                  placeholderTextColor={PUNCH.placeholder}
                  multiline
                  style={{ flex: 1, ...fieldBox(drafts[current.id] || "", 25, 104), paddingTop: 10, paddingBottom: 10, color: PUNCH.ink, fontFamily: PF.writing, fontSize: 16.5, lineHeight: 25 }}
                />
                {(drafts[current.id] || "").length > 0 ? (
                  <Pressable onPress={() => send(current)} disabled={!replyOk || sending} hitSlop={6} style={{ marginBottom: 6 }}>
                    {/* a full pouch dims the plane before the tap, not after */}
                    <SendPlane on={replyOk && !sending && ((demo && !forceFull) || flights < MAX_IN_FLIGHT)} ink={PUNCH.ink} />
                  </Pressable>
                ) : (
                  <View style={{ paddingHorizontal: 13, paddingVertical: 7, marginBottom: 8, borderRadius: 999, backgroundColor: "#E4E1F6" }}>
                    <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 0.9, color: PUNCH.placeholder }}>{t("ld.send")}</Text>
                  </View>
                )}
              </View>
              )}
              {!sending && (
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1, color: replyW > LETTER_MAX ? P.post : PUNCH.dim, marginTop: 10 }}>
                {replyW > LETTER_MAX
                  ? t("ui.overLimit", { n: String(replyW - LETTER_MAX) })
                  : flights >= MAX_IN_FLIGHT
                    ? t("ld.flightFull")
                    : replyOk
                      ? t("ld.threadOpensTwo")
                      : t("ld.replyThreadOpens")}
              </Text>
              )}
            </Pressable>
          ) : (
            <View style={{ minHeight: 78 }} />
          )}
        </View>
      </KeyboardAvoidingView>

      {toast && <Toast msg={t("ld.toast.thread")} bottom={150} />}
      <LeaveSheet
        open={flightSheet}
        title={t("ld.flightFull.title")}
        body={t("ld.flightFull.body")}
        actions={[{ label: t("ld.flightFull.ok"), kind: "primary", onPress: () => setFlightSheet(false) }]}
        /* "I'll wait." IS the way out of this one; the sheet's usual KEEP
           WRITING row underneath it would be the composer's copy answering
           a question this sheet never asks. And Today is a tab screen — the
           tab bar paints over the sheet, so the buttons are lifted clear
           of it rather than hiding behind it. */
        cancelLabel={null}
        bottomExtra={55}
        onCancel={() => setFlightSheet(false)}
      />
      {/* the send is taking longer than a send takes — say so rather than
          leaving "···" to mean both "landing" and "about to time out" */}

      <SignUpSheet
        open={needsAccount}
        reason={t("ld.signup.reason")}
        onClose={() => setNeedsAccount(false)}
        onSignedIn={() => {
          setNeedsAccount(false);
          // carry the letter that triggered the sheet: bare send() falls back
          // to `current`, and the pager may have drifted since — the exact
          // wrong-recipient hazard send(target) exists to close
          void send(pendingReply.current ?? undefined);
        }}
      />
    </SafeAreaView>
  );
}

/* THE ARRIVAL SLOT — the last frame of the crossing, continued.
   She lands on the header rule; the three envelopes she carried sit under
   her sentence and open one by one as you page (tap one to go to it). It
   folds away, height and all, when the third is behind you or you answer
   any of them, and Today re-seats the page under the fold. Not a counter:
   the desk never shows arithmetic, but three envelopes she physically
   brought back are an object, not a meter. */
const ARRIVAL_TTL = 20 * 60 * 60 * 1000;
const ARRIVAL_H = 120;
const LAND = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: -28 }] },
  72: { opacity: 1, transform: [{ translateY: 4 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }] },
}).duration(560).delay(80);

function Arrival({ open, sent, idx, onGoto }: { open: boolean; sent: boolean; idx: number; onGoto: (i: number) => void }) {
  const p = useSharedValue(open ? 1 : 0);
  const [gone, setGone] = useState(!open);
  useEffect(() => {
    if (open) {
      setGone(false);
      p.value = 1;
      return;
    }
    if (gone) return;
    p.value = withTiming(0, { duration: 380 }, (fin) => {
      if (fin) runOnJS(setGone)(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    maxHeight: p.value * ARRIVAL_H,
    transform: [{ scaleY: 0.35 + 0.65 * p.value }],
  }));
  if (gone) return null;
  return (
    <Animated.View style={[{ overflow: "hidden", paddingHorizontal: 22 }, style]}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingTop: 12, paddingBottom: 10 }}>
        <Animated.View entering={LAND} style={{ paddingTop: 2 }}>
          <WrenBird size={34} mood="content" />
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Animated.Text entering={FadeIn.duration(360).delay(320)} style={{ fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 13.5, lineHeight: 20, color: P.ink60 }}>
            {t(sent ? "ld.arrived" : "ld.arrivedKept")}
          </Animated.Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 9, marginTop: 9 }}>
            {[0, 1, 2].map((i) => (
              <Animated.View key={i} entering={FadeInDown.duration(320).delay(480 + i * 120)}>
                <Pressable onPress={() => onGoto(i)} hitSlop={8}>
                  <Env state={i < idx ? "opened" : i === idx ? "current" : "sealed"} />
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

/* the envelope from the route chart, at glyph size: sealed, open in your hand, or read */
function Env({ state }: { state: "sealed" | "current" | "opened" }) {
  const stroke = state === "sealed" ? P.ink : state === "current" ? P.pen : P.ink40;
  const up = state !== "sealed";
  return (
    <Svg width={30} height={28} viewBox="0 -9 30 28">
      {/* open: the flap folded back and the letter standing out of it — the
          sheet, not the raised flap alone, is what reads as "opened" (the flap
          alone reads as a roof) */}
      {up && <Path d="M3 1 L15 -6 L27 1 Z" fill={P.paper} stroke={stroke} strokeWidth={1.3} strokeLinejoin="round" />}
      {up && <Rect x={7.5} y={-5} width={15} height={8} fill={P.paper} stroke={stroke} strokeWidth={1.3} />}
      <Rect x={1} y={1} width={28} height={17} fill={P.paper} stroke={stroke} strokeWidth={1.3} />
      {!up && <Path d="M1 1 L15 11 L29 1" fill="none" stroke={stroke} strokeWidth={1.3} strokeLinejoin="round" />}
      <Rect x={22} y={4} width={4.5} height={4} fill={state === "opened" ? P.ink40 : P.pen} />
    </Svg>
  );
}

/* the first of what she brought back opens the way your letter folded, in reverse */
const UNFOLD = new Keyframe({
  0: { opacity: 0.5, transform: [{ scaleY: 0.55 }] },
  100: { opacity: 1, transform: [{ scaleY: 1 }] },
}).duration(520).delay(140);

function Header({ count, idx, atEnd, note }: { count: number; idx: number; atEnd?: boolean; note?: string }) {
  return (
    /* every tab's plate (components/TabHeader) — the 3px rule this page
       had to match its stickers is 1pt now, like every other tab's */
    <TabHeader
      title={t("ld.today")}
      ink={PUNCH.ink}
      right={
        /* the founding spec: "no counter". The 01/28 progress meter turned
           a desk of letters into a to-do list — the day states remain, the
           arithmetic is nobody's business. */
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1, color: PUNCH.dim }}>
          {note ?? (count === 0 ? t("ld.closed") : atEnd ? t("ld.allRead") : "")}
        </Text>
      }
    />
  );
}

/* THE UNFOLDED LETTER.
   ────────────────────────────────────────────────────────────────────────
   A Modal rather than a route, and that's the whole reason this works: the
   reader lives inside the page that opened it, so REPLY just dismisses and
   focuses the box that was already there — no route to push, no letter to
   re-fetch by id, no cold-start deep link into a letter that may have left
   the pool. Unfolding isn't a destination; it's a gesture on the page.

   It carries the docket so you never lose track of whose letter this is, and
   it scrolls the way any long document does — here there is no pager to
   argue with, so a swipe means one thing. */
function LetterReader({
  open,
  letter,
  shown,
  onClose,
  reply,
}: {
  open: boolean;
  letter: PoolLetter;
  shown: string;
  onClose: () => void;
  reply: ReplyBinding;
}) {
  const insets = useSafeAreaInsets();
  const st = getStamp(letter.stamp);
  const inputRef = useRef<TextInput>(null);
  const [writing, setWriting] = useState(false);
  if (!open) return null;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: P.penWash }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 }}>
          <Pressable onPress={onClose} hitSlop={12} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontFamily: PF.mono, fontSize: 15, color: P.ink }}>✕</Text>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.6, color: P.ink60 }}>{t("ld.foldBack")}</Text>
          </Pressable>
        </View>

        <ScrollView
          style={[{ flex: 1, marginHorizontal: 16 }, outline(20), drop(5)]}
          contentContainerStyle={{ paddingHorizontal: 17, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* the same docket the page carries, so the letter keeps its face */}
          <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 22 }}>
            <MosaicId seed={letter.author} />
            <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 0.7, color: PUNCH.ink, marginLeft: 12, marginTop: 3 }}>
              {postmark(letter.created_at)} ·{" "}
              {letter.author ? `NO.${postNo(letter.author)}` : t("ld.unsigned")}
            </Text>
            {st && (
              <View style={[outline(11, 2.2), drop(2.5), { width: 42, height: 42 }]}>
                <View style={{ flex: 1, borderRadius: 8, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                  <StampTile id={letter.stamp} w={38} r={0} />
                </View>
              </View>
            )}
          </View>

          <Text style={{ fontFamily: PF.letterSerif, fontSize: 19, lineHeight: 31, color: PUNCH.ink }}>{shown}</Text>

          <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 0.6, color: PUNCH.dim, marginTop: 26 }}>
            {t("ld.written")} {sinceShort(letter.created_at)}
          </Text>
        </ScrollView>

        {/* YOU ANSWER WITHOUT LEAVING THE LETTER. WRITE BACK used to dismiss
            the sheet and focus the box on the page underneath — which worked,
            and was still wrong: you had just read a long letter and were then
            put somewhere you couldn't see it, sometimes not even on the same
            page. The field opens here instead, with the letter still above
            it. The draft is the same one the page holds, so a reply started
            here and finished there is one reply. */}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: Math.max(insets.bottom, 12) + 12 }}>
            {reply.sending ? (
              <LetterInFlight to={letter.author ? `NO.${postNo(letter.author)}` : null} slow={reply.slow} />
            ) : writing ? (
              <View style={[{ flexDirection: "row", alignItems: "flex-end", gap: 12, paddingLeft: 14, paddingRight: 8, paddingVertical: 4 }, outline(16), drop(4)]}>
                <GlyphInput
                  ref={inputRef}
                  value={reply.value}
                  onChangeText={reply.onChange}
                  placeholder={t("ld.writeBackPh")}
                  placeholderTextColor={PUNCH.placeholder}
                  multiline
                  autoFocus
                  style={{ flex: 1, ...fieldBox(reply.value, 25, 104), paddingTop: 10, paddingBottom: 10, color: PUNCH.ink, fontFamily: PF.writing, fontSize: 16.5, lineHeight: 25 }}
                />
                {reply.value.length > 0 ? (
                  <Pressable onPress={reply.onSend} disabled={!reply.canSend} hitSlop={6} style={{ marginBottom: 6 }}>
                    <SendPlane on={reply.canSend} ink={PUNCH.ink} />
                  </Pressable>
                ) : (
                  <View style={{ paddingHorizontal: 13, paddingVertical: 7, marginBottom: 8, borderRadius: 999, backgroundColor: "#E4E1F6" }}>
                    <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 0.9, color: PUNCH.placeholder }}>{t("ld.send")}</Text>
                  </View>
                )}
              </View>
            ) : (
              <Pressable
                onPress={() => setWriting(true)}
                hitSlop={6}
                style={[{ backgroundColor: PUNCH.ink, paddingVertical: 16, alignItems: "center", borderRadius: 999 }]}
              >
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 2, color: "#fff" }}>{t("ld.writeBack")}</Text>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* One letter, and the paper IS the screen.

   Full bleed and white at the same time — those were never in conflict. The
   letter is not a card lying on the desk (that would demote it to a row in a
   feed, which is the opposite of what this tab is for); it's the sheet held up
   to your face. So the white runs edge to edge and the desk shows only as the
   strip above (the header) and below (where you write back).

   That keeps Today consistent with every other room — white is always where
   you read — without shrinking the one thing this screen exists to show. */
interface ReplyBinding {
  value: string;
  onChange: (t: string) => void;
  onSend: () => void;
  canSend: boolean;
  sending: boolean;
  slow: boolean;
}

function LetterPage({
  letter,
  height,
  first,
  onReply,
  reply,
  onBlockedAuthor,
}: {
  letter: PoolLetter;
  height: number;
  first: boolean;
  onReply: () => void;
  reply: ReplyBinding;
  onBlockedAuthor: (author: string) => void;
}) {
  const wren = useWrenName();
  const st = getStamp(letter.stamp);
  const isVoice = letter.kind === "voice" && !!letter.media_path;
  const audioUrl = useMediaUrl("voice-letters", isVoice ? letter.media_path : null);

  // Wren translating this letter. Kept per-letter — each page holds its own,
  // so translating one doesn't touch the others in the stack.
  const [frameH, setFrameH] = useState(0);
  const [textH, setTextH] = useState(0);
  const [open, setOpen] = useState(false);
  const [xl, setXl] = useState<string | null>(null);
  const [xlOn, setXlOn] = useState(false);
  const [xlBusy, setXlBusy] = useState(false);
  const shown = xlOn && xl ? xl : letter.body;
  /* what this letter and you have in common — read on the phone from your
     own sticker state and what the Me tab last left there. Re-read when the
     tab comes back into view: the first visit to Me is what writes the
     facts, and Today was already open before that. */
  const [signal, setSignal] = useState<Signal | null>(null);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      void signalFor(letter).then((sg) => live && setSignal(sg));
      return () => {
        live = false;
      };
    }, [letter.id]), // eslint-disable-line react-hooks/exhaustive-deps
  );
  const tier = letterTier(weightedCount(shown || ""));
  /* WHAT FITS IS A GEOMETRY QUESTION, so it's answered with geometry rather
     than a magic number. The frame reports its height, the tier fixes the
     line height, so the page holds `frameH / tier.line` lines; the tier's
     size also fixes roughly how many characters sit on one — and CJK packs
     about half as many per line as Latin at the same point size, which is the
     whole reason a fixed threshold failed here. The long Chinese letter in
     the pool weighs 325: nowhere near letterTier's >600 "long" tier, yet far
     past what one screen holds. A tuned constant would have been wrong for
     one script or the other.

     Measurement stays as the first signal — it's exact when the layout
     callback lands — and this estimate is the floor beneath it. */
  const weighted = weightedCount(shown || "");
  const cjkHeavy = ((shown || "").match(/[㐀-鿿]/g) || []).length > (shown || "").length * 0.3;
  const perLine = Math.max(8, Math.round((WINDOW_W - 52) / (tier.size * (cjkHeavy ? 1 : 0.52))));
  const linesThatFit = frameH > 0 ? Math.floor(frameH / tier.line) : 22;
  const measuredOverflow = frameH > 0 && textH > frameH + tier.line;
  const folded = !isVoice && (measuredOverflow || weighted > perLine * linesThatFit);


  const doTranslate = async () => {
    if (xl) {
      setXlOn((v) => !v);
      return;
    }
    if (xlBusy || !letter.body) return;
    setXlBusy(true);
    const out = await translate(letter.body, getLang());
    setXlBusy(false);
    if (out) {
      setXl(out);
      setXlOn(true);
      void bump("translated");
    } else Alert.alert(t("ld.xlFail.title", { wren }), t("ld.xlFail.body"));
  };

  return (
    /* EXPERIMENT: the console's wash as a desk, the letter as paper on it.
       Tinting the whole screen would only have made a pale-lavender app; the
       wash earns its keep by being what the sheet is LYING ON. */
    /* ONE SHEET, ONE DESK. The wash is the app; the white is what a person
       wrote. That is the same split the type already makes — mono for what the
       machine says, the letter face for what someone wrote — now said in
       surface as well, which is why it settles: the two rules agree.

       No border on the sheet. A hairline round it makes a CARD; its absence
       leaves paper, and the colour step does all the separating a page needs.
       The moment this screen had a framed letter, a framed reply, a framed tag
       and a framed stamp, it had stopped being one letter on a desk. */
    /* STICKER PUNCH (the owner's G1). The same sheet, now a sticker: a thick
       outline and a hard shadow instead of a colour step. The structure
       above did not move — docket, letter, tag, provenance, rule, moves —
       only the form each of them wears. */
    <View style={{ height, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 }}>
      <View style={[{ flex: 1, paddingHorizontal: 17, paddingTop: 16 }, outline(20), drop(5)]}>
      <Animated.View entering={FadeIn.duration(240)} style={{ flex: 1 }}>
        {/* The docket row reads like the face of an envelope: who and when
            filed on the left by the machine, the stamp pasted on the right by
            the person who sent it.

            The rule this settles: the system's CHROME is mono and black, but
            the designed artefacts — Wren, the 44 stamps, the mood faces — are
            CONTENT, and content keeps its own colour. Same licence the letter
            body gets. Stripping the stamps to fit the palette was the mistake;
            they're the reason the tab has a world at all. */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingTop: 4 }}>
            <MosaicId seed={letter.author} />
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 0.7, color: PUNCH.ink }}>
              {postmark(letter.created_at)} ·{" "}
              {letter.author ? `NO.${postNo(letter.author)}` : t("ld.unsigned")}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {st && (
              /* the stamp is a sticker on the sticker: outlined, hard-shadowed */
              <View style={[outline(11, 2.2), drop(2.5), { width: 42, height: 42 }]}>
                <View style={{ flex: 1, borderRadius: 8, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                  <StampTile id={letter.stamp} w={38} r={0} />
                </View>
              </View>
            )}
            {/* THE POOL IS WHERE REPORT MATTERS MOST — a total stranger's
                words, before any correspondence exists. Every other reading
                surface had the ⋯; the one place you meet people you never
                chose to hear from did not, so reporting required REPLYING
                to the very letter you objected to. */}
            <ReportMenu
              ring
              targetUser={letter.author ?? undefined}
              context="letter"
              refId={letter.id}
              snapshot={letter.body}
              onBlocked={() => letter.author && onBlockedAuthor(letter.author)}
            />
          </View>
        </View>

        {/* A PAGE IS ALWAYS ONE SCREEN. The previous attempt put a ScrollView
            inside the page so a long letter could scroll in place — which gave
            one gesture two meanings and left the reader unable to tell whether
            a swipe would scroll the text or turn the page.

            A long letter is FOLDED instead: the page shows what fits, and
            UNFOLD opens the whole thing in a reader. That keeps the pager's
            contract intact — one page, one screen, no exceptions — and it is
            the postal reading of the problem, which is usually the sign that
            it's the right one.

            Overflow is measured, not guessed from a character count — a count
            can't know how a given script wraps at a given size.

            THE TRAP, which cost three attempts: a Text laid out inside a frame
            of definite height is MEASURED AGAINST THAT HEIGHT, so onLayout
            reports the constrained value and can never exceed it — the visible
            copy simply cannot tell you it overflowed. (flexShrink: 0 doesn't
            help; RN flex items already default to it. onTextLayout doesn't
            either — it reports the lines actually laid out.)

            So the height is learned from an absolutely-positioned twin: out of
            the layout flow, it has no height constraint and reports the
            letter's true height. It's invisible and untouchable, and it exists
            only to answer one question. */}
        <View
          style={{ flex: 1, overflow: "hidden", justifyContent: "center" }}
          onLayout={(ev) => setFrameH(ev.nativeEvent.layout.height)}
        >
        {isVoice && audioUrl ? (
          <View>
            <Text style={{ fontFamily: PF.monoMed, fontSize: 11, letterSpacing: 1.4, color: P.pen, marginBottom: 14 }}>{t("ld.voiceLetter")}</Text>
            <AudioCard url={audioUrl} durationS={letter.duration_s ?? null} system />
            {!!letter.body && letter.body !== "🎙 A voice letter" && (
              <Text style={{ fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 15, lineHeight: 24, color: P.ink60, marginTop: 16 }}>{letter.body}</Text>
            )}
          </View>
        ) : (
          <Text
            style={{
              fontFamily: PF.letterSerif,
              fontSize: tier.size,
              lineHeight: tier.line,
              color: PUNCH.ink,
              textAlign: tier.center ? "center" : "auto",
            }}
          >
            {shown}
          </Text>
        )}

        {/* the twin — unconstrained, invisible, measured once per letter */}
        {!isVoice && (
          <Text
            pointerEvents="none"
            onLayout={(ev) => setTextH(ev.nativeEvent.layout.height)}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              opacity: 0,
              zIndex: -1,
              fontFamily: PF.letterSerif,
              fontSize: tier.size,
              lineHeight: tier.line,
              textAlign: tier.center ? "center" : "auto",
            }}
          >
            {shown}
          </Text>
        )}
        {/* A LONG LETTER FADES, IT ISN'T CUT. The page used to stop the
            text dead mid-sentence at a rule and then say, in caps, that
            there was more — a row of words for what the paper can show
            (owner, 2026-09-20). The last lines dissolve into the page, and
            one small word opens the reader. */}
        {folded && <LinearGradient pointerEvents="none" colors={["rgba(255,255,255,0)", "#FFFFFF"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 64 }} />}
        </View>

        {folded && (
          <Pressable onPress={() => setOpen(true)} hitSlop={10} style={({ pressed }) => ({ alignSelf: "center", paddingVertical: 6, paddingHorizontal: 12, marginTop: 2, marginBottom: 6, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 1, color: PUNCH.reply }}>{t("ld.unfold")}</Text>
          </Pressable>
        )}

        {/* The channel, in its stamp's own colour — the pasted tile and the
            readable word are the same thing said twice, so they can't be two
            different colours. Washed background so the hue is actually present
            on the page, true colour on the rule, word darkened to clear 4.5:1
            against its own wash.

            LOWERCASE, deliberately: the stamp is picked by the person writing,
            not assigned by the system, so it doesn't get the machine's
            all-caps voice. Everything the system itself says on this page is
            upper — this one thing isn't, because it isn't the system talking. */}
        {(st || signal) && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 11 }}>
            {st && (
              /* solid now — the stamp's own colour as a pill, outlined and
                 hard-shadowed like everything else on the sticker */
              <View
                style={[
                  {
                    backgroundColor: st.color,
                    borderWidth: 2.2,
                    borderColor: PUNCH.ink,
                    borderRadius: 999,
                    paddingHorizontal: 13,
                    paddingVertical: 6,
                  },
                  drop(2.5),
                ]}
              >
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 0.2, color: "#FFFFFF" }}>
                  #{sname(st.name).toLowerCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            {/* THE ACTUAL REASON (A5), or the rings (A4) when only the
                matcher has anything to say — never a sentence about a
                number */}
            {signal && <SignalChip signal={signal} />}
          </View>
        )}

        {/* The line this replaced — SENT DOWN THREE STREETS · YOU OPENED IT
            FIRST — was a hardcoded string on every letter for every reader,
            and both halves were invented: there is no geo data anywhere in
            the product, and the pool is shared with no read tracking, so
            "you opened it first" was unverifiable and usually false. Its job
            was right though — provenance, the thing that stops a letter
            reading as a feed post — so it now says only what is true: when
            it was written, and, when the matcher actually named this author,
            why it reached you. */}
        {/* WRITTEN 11 DAYS AGO used to sit here — the postmark in the
            header (9.SEPT · NO.4994) already says when; one row fewer on
            a page that had five rows of chrome under a folded letter. */}

        {/* THE TRANSLATE INVITATION — its own centered line, not a sentence
            crammed above the actions. It IS the button: one short phrase in
            the reader's language (Baca dalam bahasamu / Léela en el tuyo),
            so it stays elegant at any length and never collides. Only when
            the letter came in another language. */}
        {/* one rule above the whole action cluster — letter, then the moves */}
        <View style={{ height: 2.4, backgroundColor: PUNCH.ink, marginTop: 12 }} />

        {/* pass · [their language → yours] · reply — one row. The language
            pair (B1: the filled side is the one you are reading; a tap
            turns it round) used to have a row of its own above this one;
            between the two moves it costs the letter nothing, and a long
            letter gets the row back (owner, 2026-09-20). Only when the
            letter came in another language. */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 11, paddingBottom: 15 }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 0.7, color: PUNCH.dim }}>{t("ld.pass")}</Text>
          {!isVoice && !!letter.body && needsTranslating(letter.body, letter.lang) && (
            <LangPair from={sourceTag(letter.body, letter.lang)} to={getLang().toUpperCase()} on={xlOn} busy={xlBusy} onPress={doTranslate} />
          )}
          <Pressable onPress={onReply} hitSlop={14}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 0.7, color: PUNCH.reply }}>{t("ld.replyArrow")}</Text>
          </Pressable>
        </View>
      </Animated.View>

      <LetterReader
        open={open}
        letter={letter}
        shown={shown}
        onClose={() => setOpen(false)}
        reply={{
          ...reply,
          /* once it's gone the letter is answered, so the reader closes with
             it — otherwise you'd be left reading a letter whose thread has
             already opened, with a send key that can't fire again */
          onSend: () => {
            setOpen(false);
            reply.onSend();
          },
        }}
      />
      </View>
    </View>
  );
}

/* ── SHE COMES BACK ──────────────────────────────────────────────────────
   The hatch ends with her flying off carrying your letter. Nothing used to
   close that loop: you landed on a one-time "A LETTER FROM WREN" that
   explained the rules — a manual wearing a letter's clothes, arriving in a
   product whose whole premise is that letters come from strangers. It also
   re-taught what onboarding had just spent nine screens teaching.

   So the landing is her RETURN, in three beats, and every one of them is
   something that actually just happened:

     1. THE RECEIPT — your letter really did leave. The docket is built the
        same way the world will see it (postNo/MosaicId off your own id, the
        stamp onboarding posted it with), so this is a counterfoil, not a
        graphic.
     2. THE HONEST WAIT — nobody has replied, and nobody will for hours. Say
        so. Never fake a reply to fill a gap.
     3. WHAT SHE FOUND — the first real letter from the pool, framed as
        something she brought back. That's the core loop demonstrated in
        twenty seconds, handed over at the moment the reader is most open —
        and the rules the old welcome listed are printed on the letter page
        itself (^ SWIPE TO PASS · REPLY ↓), so they teach themselves.

   If the pool is genuinely empty, beat 3 says that plainly rather than
   inventing something to hand over. */
/* airmail striped border */
function Airmail() {
  const bars = Array.from({ length: 60 });
  const col = (i: number) => (i % 4 === 0 ? "#E0483C" : i % 4 === 2 ? "#3A4F9E" : "transparent");
  return (
    <View style={{ height: 12, flexDirection: "row", overflow: "hidden", backgroundColor: "#FFFFFF" }}>
      {bars.map((_, i) => (
        <View key={i} style={{ width: 7, height: 30, marginTop: -8, backgroundColor: col(i), transform: [{ rotate: "30deg" }] }} />
      ))}
    </View>
  );
}

/* You've read everything that came, so the post closes for the night — and the
   screen goes with it. The lavender day drains into a night sky: stars come out
   in their own time, one drifts loose every so often, the moon hangs in the
   corner, Wren curls up asleep, and the countdown to the morning post glows like
   a lit window. It's the app saying goodnight, not an empty state.
   `compact` trims it to sit as the last page of the feed. */

