import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Alert } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KScreenHandle } from "../../../modules/kindredly-ui";
import type { KTodayCardAction } from "../../../modules/kindredly-ui/src/Today";
import { useTheme } from "../../lib/theme";
import { getLang, needsTranslating, sourceTag, t, useLang } from "../../lib/i18n";
import { guessLatin } from "../../lib/lang-guess";
import { fmt as clock, postNo, postmark } from "../../lib/format";
import { getStamp, sname } from "../../data/stamps";
import { stickerName } from "../../lib/sticker-copy";
import { POOL_CACHE_KEY, fetchMatches, fetchPool, fetchThreads, lastWriteFail, markLetterRead, replyToLetter, type PoolLetter } from "../../lib/db";
import type { WriteFail } from "../../lib/thread-detail-core";
import type { Signal } from "../../lib/today-signal";
import { refreshFingerprint, signalFor } from "../../lib/aura";
import { noteWrote, replanLocal } from "../../lib/local-push";
import { bump, getCounters, repliedToday, seenToday } from "../../lib/usage-counters";
import { track } from "../../lib/track";
import { screenNow, translate } from "../../lib/wren";
import { ARRIVAL_AT_KEY, ARRIVAL_FRESH, ARRIVAL_SENT, getFlags, setFlag, unsetFlag } from "../../lib/flags";
import { useAuth } from "../../lib/auth";
import { SEND_BEAT_MS } from "../../lib/net";
import { DAY_LETTERS, MAX_IN_FLIGHT, inFlight, rationPool, type FlightThread } from "../../lib/ration";
import { deskDay } from "../../lib/day";
import { startDayClosed } from "../../lib/activities";
import { onYou } from "../../lib/waiting";
import { readRoomSeen } from "../../lib/room-seen";
import { wrenStageDirty } from "../../lib/wren-stage";
import { useWrenName } from "../../lib/wren-name";
import { WREN_ROOM } from "../../lib/wren-desk";
import { DEMO_POOL, demoMediaUrl, seedDemoThread } from "../../data/demo";
import { DEMO_TEXT, storeMode } from "../../lib/dev-store";
import { alertFail } from "../../lib/fail";
import { useReportFlow, type ReportFlow } from "../../lib/report-flow";
import { useSignedUrls } from "../../lib/images";
import { useVoicePlayback, type VoicePlaybackApi } from "../../lib/voice-playback";
import { LETTER_MAX, REPLY_MIN, weightedCount } from "../../lib/weighted-count";
import { blurThen } from "../../lib/keyboard";
import { usePlusSheetOpen } from "../../lib/screen-insets";
import { openLeaveSheet } from "../../components/LeaveSheet";
import { openSignUpSheet } from "../../components/SignUpSheet";
import { useSlow } from "../../components/ui";
import { useWrenDesk } from "../../components/WrenDesk";
import "../../data/strings-step5-today";
import * as C from "./today-cards";

/* THE TODAY TAB'S MODEL (10a step 5): everything the tab knows and does,
   for whichever renderer draws it — TodayNative (SwiftUI, one Host) or
   TodayRN (the remote switch's React Native fallback). The rules live in
   today-cards (pure, node-tested); this file gathers the facts and does the
   side effects, in three parts:

   - useTodaySource(): the desk itself. Last put-away desk first, then the
     pool and the threads together, the matcher's second pass, the 45s
     focus throttle, the put-away desk (and the 8 o'clock knock's replan),
     the first arrival's flags, her desk's unread count (useWrenDesk). A
     null answer (offline, signed out) keeps the desk AND the pouch and the
     waiting count (they used to drop to zero offline, so a send looked
     allowed and her slip said nobody was waiting).
   - useTodayCore(source, deps): the reader's day on that desk. The page
     (TS keeps it; a renderer reports where it settled), the seen counter
     and the 2s read receipt, the day turning at eight, the blind and her
     slip (W33 counts), per-letter drafts (the source of truth: every edit
     lands here, no debounce), translations and the one capsule, the
     signals, the one voice player (paused on a page change and a tab
     switch: a voice letter used to play on after a swipe), send() with
     every outcome, the pouch, the guest sheet, report / block, the unfold
     reader, the toast. Its IO goes through `deps`, so the dev page runs
     the same code on fixtures with no network.
   - useTodayDesk(): the two together, as the route uses them.

   Every word a renderer shows is set here or in today-cards, with t(). */

/* ── the desk on the phone ─────────────────────────────────────────────── */

/* THE DESK IS PUT AWAY AS IT WAS LEFT — the fifteen, in the matcher's
   order, with the day they belong to. Opening on the same day paints
   exactly that, and the network only adds to it (owner, 2026-09-19: the
   letter under the thumb used to swap twice within two seconds of opening).
   Onboarding still writes the raw list; that shape is read as a placeholder. */
type DeskCache = { day: string; desk: PoolLetter[] };
/* lib/local-push reads the key: the 8 o'clock knock is skipped only for a
   morning whose own desk is known to be empty, so a desk that fills or
   empties re-plans it — once per change, not on every put-away */
let deskWasFull: boolean | null = null;
function putAway(desk: PoolLetter[]): void {
  const full = desk.length > 0;
  const changed = full !== deskWasFull;
  deskWasFull = full;
  void AsyncStorage.setItem(POOL_CACHE_KEY, JSON.stringify({ day: deskDay(), desk } satisfies DeskCache))
    .then(() => (changed ? replanLocal({ force: true }) : undefined))
    .catch((e) => console.warn("[today] desk put-away:", e));
}
async function readDeskCache(): Promise<{ desk: PoolLetter[]; today: boolean } | null> {
  try {
    const raw = await AsyncStorage.getItem(POOL_CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as PoolLetter[] | DeskCache;
    if (Array.isArray(c)) return c.length ? { desk: rationPool(c), today: false } : null;
    if (!Array.isArray(c.desk) || !c.desk.length) return null;
    return { desk: c.desk, today: c.day === deskDay() };
  } catch (e) {
    console.warn("[today] desk cache unreadable:", e);
    return null;
  }
}

/** the first arrival lasts the day she came back */
const ARRIVAL_TTL = 20 * 60 * 60 * 1000;
/** a fresh pool is fresh for this long; a tab switch inside it doesn't refetch */
const REFOCUS_MS = 45_000;

/* ── the source: what is on the desk ───────────────────────────────────── */

export type TodaySource = {
  /** the desk (the day's ration, in the order it was dealt) */
  pool: PoolLetter[];
  /** the network has answered at least once (or a kept desk is today's) */
  loaded: boolean;
  /** correspondences opened and not yet answered (the pouch, lib/ration) */
  flights: number;
  /** correspondences waiting on a reply from you (her slip) */
  waiting: number;
  /** her first crossing just landed: the arrival shows */
  fresh: boolean;
  /** did the opener leave, or stay on the phone (which line she says) */
  sent: boolean;
  settleArrival: () => void;
  /** her desk's unopened posts (the strip) */
  deskUnread: number;
  /** read the desk again; `reset` rebuilds it (the day turned) */
  reload: (reset?: boolean) => void;
  /** a letter leaves the desk (answered, or it can't be answered) */
  remove: (id: string) => void;
  /** every letter by this writer leaves (blocked) */
  removeAuthor: (author: string) => void;
  /** dev builds may show the demo desk when the real one is empty */
  demoAllowed: boolean;
};

export function useTodaySource(): TodaySource {
  const [flights, setFlights] = useState(0);
  const [waiting, setWaiting] = useState(0);
  const [pool, setPool] = useState<PoolLetter[]>([]);
  const [loaded, setLoaded] = useState(false);
  const lastLoad = useRef(0);
  const loadedRef = useRef(false);
  const desk = useWrenDesk();

  /* THE FIRST ARRIVAL. Onboarding ends with her first crossing; when Today
     opens after it she lands with the three envelopes, and the first of
     them unfolds. It stays until the third is behind you or you answer one
     of them, and it expires with the day she came back. */
  const [fresh, setFresh] = useState(false);
  const [sent, setSent] = useState(true);
  useEffect(() => {
    Promise.all([getFlags(), AsyncStorage.getItem(ARRIVAL_AT_KEY)])
      .then(([f, at]) => {
        if (!f[ARRIVAL_FRESH]) return;
        const t0 = at ? Number(at) : 0;
        setSent(!!f[ARRIVAL_SENT]);
        if (t0 && Date.now() - t0 < ARRIVAL_TTL) setFresh(true);
        else void unsetFlag(ARRIVAL_FRESH); // the day she came back has passed
      })
      .catch((e) => console.warn("[today] arrival flags:", e));
  }, []);
  const freshRef = useRef(false);
  freshRef.current = fresh;
  const settleArrival = useCallback(() => {
    if (!freshRef.current) return;
    setFresh(false);
    void unsetFlag(ARRIVAL_FRESH);
  }, []);

  /* THE DESK DOESN'T REARRANGE ITSELF UNDER YOU (owner, 2026-09-19). A
     reload with letters already on the desk only ADDS at the end and
     attaches the matcher's scores in place; the order is rebuilt only when
     there's nothing on the desk yet, when what's there is a placeholder, or
     when the day turns. The letters don't wait on the matcher, and the
     matcher chooses people, not just the order (its writers' letters come
     back with the scores, a narrowed second fetch). */
  const load = useCallback(async (reset = false) => {
    if (!loadedRef.current && !reset) {
      const c = await readDeskCache();
      if (c) {
        setPool((cur) => (cur.length ? cur : c.desk));
        if (c.today) loadedRef.current = true;
      }
    }
    const rebuild = reset || !loadedRef.current;
    const [p, th] = await Promise.all([fetchPool(), fetchThreads()]);
    /* offline keeps what the pouch and her slip last knew (critic): no
       threads is no answer, not "nobody" */
    if (th) {
      setFlights(inFlight(th as FlightThread[]));
      setWaiting(onYou(th, await readRoomSeen()));
    }
    const dealt = rationPool(p || []);
    // no answer (offline, signed out) leaves the desk as it is rather than clearing it
    setPool((cur) => (!p && cur.length ? cur : rebuild || !cur.length ? dealt : C.keepDesk(cur, p || [], dealt)));
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
      if (Date.now() - lastLoad.current >= REFOCUS_MS) {
        lastLoad.current = Date.now();
        void load();
      }
    }, [load]),
  );

  // a letter leaving the desk leaves the put-away desk too, or it would be back next open
  const remove = useCallback((id: string) => {
    setPool((cur) => {
      const next = cur.filter((l) => l.id !== id);
      if (next.length !== cur.length) putAway(next);
      return next;
    });
  }, []);
  const removeAuthor = useCallback((author: string) => {
    setPool((cur) => {
      const next = cur.filter((l) => l.author !== author);
      if (next.length !== cur.length) putAway(next);
      return next;
    });
  }, []);
  const reload = useCallback((reset = false) => void load(reset), [load]);

  return { pool, loaded, flights, waiting, fresh, sent, settleArrival, deskUnread: desk.unread, reload, remove, removeAuthor, demoAllowed: true };
}

/* ── the core's IO ─────────────────────────────────────────────────────── */

/** What the core does to the world. REAL_DEPS in the app; the dev page passes fixtures (no network). */
export type TodayDeps = {
  /** answer a pool letter: the thread's id, or null (then lastFail says why) */
  reply: (letter: PoolLetter, text: string) => Promise<string | null>;
  lastFail: () => WriteFail | null;
  /** the synchronous contact-details screen (lib/wren screenNow) */
  screen: (text: string) => { ok: boolean };
  translate: (text: string, lang: string) => Promise<string | null>;
  signal: (letter: PoolLetter) => Promise<Signal | null>;
  markRead: (id: string) => void;
  bump: (key: "seen" | "replied" | "translated") => void;
  /** today's counters, for her slip */
  counters: () => Promise<{ seen: number; replied: number }>;
  /** after a reply went: the conversion event, her stage, the fingerprint, the evening ask */
  afterReply: (letter: PoolLetter, text: string, demo: boolean) => void;
  seedDemo: (letter: PoolLetter, text: string) => void;
  /** whether this desk day's blind is already down */
  sealed: (day: string) => Promise<boolean>;
  /** the blind came down: the flag and her on the lock screen */
  seal: (day: string, facts: C.DayFacts) => void;
  /** to her desk (the strip) */
  openDesk: () => void;
  /** dev: a report or block that shouldn't reach the server; return true when handled */
  intercept?: (action: "report" | "block", letter: PoolLetter) => boolean;
  /** dev: pretend to be a guest (null: ask the session) */
  guest?: () => boolean | null;
};

/** The app's IO for the core. */
export function useRealTodayDeps(): TodayDeps {
  const router = useRouter();
  return useMemo<TodayDeps>(
    () => ({
      reply: replyToLetter,
      lastFail: lastWriteFail,
      screen: screenNow,
      translate,
      signal: signalFor,
      markRead: markLetterRead,
      bump: (key) => void bump(key),
      counters: async () => {
        const c = await getCounters();
        return { seen: seenToday(c), replied: repliedToday(c) };
      },
      afterReply: (_letter, text, demo) => {
        if (!demo) {
          // the moment a stranger's letter becomes a correspondence — the product's most important conversion
          track("reply_sent", { weight: weightedCount(text) });
          wrenStageDirty(); // a first reply is where she fledges
        }
        void refreshFingerprint(); // the reply is part of your voice now
        void noteWrote("letter");
      },
      seedDemo: (letter, text) => void seedDemoThread(letter, text),
      sealed: async (day) => !!(await getFlags())[`sealed:${day}`],
      seal: (day, facts) => {
        void setFlag(`sealed:${day}`);
        void startDayClosed({ read: facts.read, waiting: facts.waiting }); // her, on the lock screen, till she's back
      },
      openDesk: () => router.push(`/room/${WREN_ROOM}`),
    }),
    [router],
  );
}

/* ── the core: the reader's day on the desk ────────────────────────────── */

/** A scroll the renderer should do; its serial makes two asks two scrolls. */
export type TodayScroll = { serial: number; target: "top" | (string & {}); animated: boolean };

/** Where the page goes after the cards changed under it (the card now in its place, "" = the end page). */
export type TodayAnchor = { id: string; serial: number };

export type TodayStrings = {
  title: string;
  pass: string;
  reply: string;
  replyA11y: string;
  unfold: string;
  unfoldA11y: string;
  voiceLetter: string;
  more: string;
  next: string;
  previous: string;
  play: string;
  pause: string;
  placeholder: string;
  send: string;
};

export type TodayView = {
  loaded: boolean;
  /** loaded with nothing on the desk: the plate says CLOSED, the strip and the blind stay */
  quiet: boolean;
  /** the dev demo desk is showing */
  demo: boolean;
  feed: PoolLetter[];
  cards: C.CardVM[];
  /** the reader's page: 0…feed.length (feed.length = the blind) */
  idx: number;
  atEnd: boolean;
  current: PoolLetter | null;
  /** CLOSED / ALL READ / "" */
  plateRight: string;
  /** the desk strip's line; "" for none */
  deskStrip: string;
  arrival: { open: boolean; line: string; states: C.EnvelopeState[]; labels: string[]; values: string[] };
  /** the first card unfolds as it arrives (the arrival is open) */
  freshUnfold: boolean;
  /** the reply, bound to the reader's page */
  reply: { letterId: string; draft: string; preview: string; state: C.ReplyState };
  sending: boolean;
  /** the send has taken longer than a send takes (the fly-by says "a headwind") */
  slow: boolean;
  /** "Reply sent." is up */
  toast: boolean;
  /** a send in flight, the reader open, or the + sheet up */
  pillHidden: boolean;
  facts: C.DayFacts;
  sealed: boolean;
  /** the blind's cord is held: the stack doesn't scroll */
  held: boolean;
  anchor: TodayAnchor;
  scroll: TodayScroll;
  /** bumped when the reader closes: the Swift field takes the draft again */
  draftEpoch: number;
  /** the last send press answered (Swift's dock waits for it) */
  answeredSerial: number;
  /** the letter in the unfolded reader, or null */
  readerId: string | null;
  /** the "to" of the fly-by: NO.xxxx */
  flyTo: string | null;
  strings: TodayStrings;
};

export type TodayActions = {
  /** the stack settled on a page (feed.length = the blind) */
  settle: (index: number) => void;
  /** an envelope of the arrival: go to that letter */
  goto: (index: number) => void;
  /** re-pressing the tab: to the first letter */
  toTop: () => void;
  changeDraft: (letterId: string, text: string) => void;
  /** send the reply to `letterId`; `text` from the field (else the draft); `serial` the press's, echoed when answered */
  send: (letterId: string, text?: string, serial?: number) => void;
  cardAction: (letterId: string, action: KTodayCardAction) => void;
  /** the React Native ⋯: the report flow's menu about this letter */
  openMenu: (letterId: string) => void;
  openDeskStrip: () => void;
  seal: () => void;
  grab: (held: boolean) => void;
  closeReader: () => void;
  closeFlightSheet: () => void;
  closeSignUp: () => void;
  /** the guest sheet signed the reader in: the letter it was raised for goes now */
  signedIn: () => void;
  /** a block held: every letter by that writer leaves the desk (the report flow calls it; so does the dev page) */
  blocked: (author: string) => void;
};

export type TodayModel = {
  view: TodayView;
  act: TodayActions;
  /** the Swift view's ref (TodayNative fills it): the field lets go before any sheet or alert */
  viewRef: RefObject<KScreenHandle | null>;
  /** the draft for a letter, read at the moment (for a seed) */
  draftFor: (letterId: string) => string;
  /** the send key and the hint for a letter's draft (the reader's letter may not be the page's) */
  replyFor: (letterId: string) => C.ReplyState;
  voice: VoicePlaybackApi;
  /** a voice letter's playable link, or null while it isn't signed */
  voiceUrl: (letter: PoolLetter) => string | null;
  report: ReportFlow;
  sheets: { flightFull: boolean; needsAccount: boolean };
};

export function useTodayCore(source: TodaySource, deps: TodayDeps): TodayModel {
  const lang = useLang(); // every word follows the reader's language
  const { t: tk } = useTheme();
  const wren = useWrenName();
  const wrenRef = useRef(wren);
  wrenRef.current = wren;
  const { isGuest: sessionGuest } = useAuth();
  const plusOpen = usePlusSheetOpen();
  const { full } = useLocalSearchParams<{ full?: string }>();
  // dev: /letters?full=1 pretends the pouch is full, to see the sheet without five real letters out
  const forceFull = __DEV__ && full === "1";
  const viewRef = useRef<KScreenHandle | null>(null);
  const depsRef = useRef(deps);
  depsRef.current = deps;
  const sourceRef = useRef(source);
  sourceRef.current = source;

  /* ── the feed ── */
  const [demoGone, setDemoGone] = useState<ReadonlySet<string>>(() => new Set());
  const demo = source.demoAllowed && __DEV__ && source.loaded && (source.pool.length === 0 || storeMode);
  const feed = useMemo<PoolLetter[]>(() => {
    if (!demo) return source.pool;
    const base = storeMode ? [{ ...DEMO_POOL[0], body: DEMO_TEXT[getLang()].letter, lang: getLang() }, ...DEMO_POOL.slice(1)] : DEMO_POOL;
    return base.filter((l) => !demoGone.has(l.id));
    // lang: store mode's first letter is in the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, source.pool, demoGone, lang]);
  const feedRef = useRef(feed);
  feedRef.current = feed;
  const demoRef = useRef(demo);
  demoRef.current = demo;

  /* ── the page ── */
  const [rawIdx, setRawIdx] = useState(0);
  const idx = Math.min(rawIdx, feed.length);
  const idxRef = useRef(idx);
  idxRef.current = idx;
  const current = feed[idx] ?? null;
  const atEnd = idx >= feed.length;
  const [scroll, setScroll] = useState<TodayScroll>({ serial: 0, target: "top", animated: false });
  const [anchor, setAnchor] = useState<TodayAnchor>({ id: "", serial: 0 });
  const requestScroll = useCallback((target: TodayScroll["target"], animated: boolean) => setScroll((s) => ({ serial: s.serial + 1, target, animated })), []);

  /* "did I pull the blind today" — one flag per desk day. The day turns at
     eight, when she's back (lib/day); an app left open across eight sees the
     flag lift, the blind roll up and the desk rebuilt with the next fifteen. */
  const [day, setDay] = useState(deskDay());
  useEffect(() => {
    const tick = setInterval(() => {
      const d = deskDay();
      setDay((cur) => (cur === d ? cur : d));
    }, 30000);
    return () => clearInterval(tick);
  }, []);
  const firstDay = useRef(true);
  useEffect(() => {
    if (firstDay.current) {
      firstDay.current = false;
      return;
    }
    sourceRef.current.reload(true);
    setRawIdx(0);
    requestScroll("top", false);
  }, [day, requestScroll]);

  const [sealed, setSealed] = useState(false);
  useEffect(() => {
    let live = true;
    void depsRef.current.sealed(day).then((s) => live && setSealed(s));
    return () => {
      live = false;
    };
  }, [day]);
  const [held, setHeld] = useState(false);

  /* what her slip says — read off the phone's own counters when the day
     closes, never guessed (W33: every number is a count) */
  const [counts, setCounts] = useState({ seen: 0, replied: 0 });
  useEffect(() => {
    if (!sealed && !(source.loaded && atEnd)) return;
    let live = true;
    void depsRef.current.counters().then((c) => live && setCounts(c));
    return () => {
      live = false;
    };
  }, [sealed, source.loaded, atEnd, feed.length]);
  const facts = useMemo(() => C.dayFacts({ onDesk: feed.length, seen: counts.seen, replied: counts.replied, waiting: source.waiting }), [feed.length, counts, source.waiting]);
  const factsRef = useRef(facts);
  factsRef.current = facts;

  /* counted for the reader's own stickers: every letter the page lands on,
     once (Picky / Generous) — dev letters never */
  const seenIds = useRef(new Set<string>());
  const currentId = current?.id ?? null;
  useEffect(() => {
    if (!currentId || currentId.startsWith("demo") || seenIds.current.has(currentId)) return;
    seenIds.current.add(currentId);
    depsRef.current.bump("seen");
  }, [currentId]);
  /* the writer's eye: read once it has been the page for two seconds —
     flicking past is not reading (one per reader; the database keeps that) */
  useEffect(() => {
    if (!currentId || currentId.startsWith("demo")) return;
    const timer = setTimeout(() => depsRef.current.markRead(currentId), 2000);
    return () => clearTimeout(timer);
  }, [currentId]);
  /* the third envelope is behind you: the arrival is over, the desk is the desk */
  useEffect(() => {
    if (source.fresh && C.arrivalSettled(idx)) sourceRef.current.settleArrival();
  }, [source.fresh, idx]);

  /* ── drafts: always the letter's own, never the page's ── */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draftsRef = useRef(drafts);
  const changeDraft = useCallback((letterId: string, text: string) => {
    if ((draftsRef.current[letterId] ?? "") === text) return;
    draftsRef.current = { ...draftsRef.current, [letterId]: text };
    setDrafts(draftsRef.current);
  }, []);
  const draftFor = useCallback((letterId: string) => draftsRef.current[letterId] ?? "", []);
  const [draftEpoch, setDraftEpoch] = useState(0);

  /* ── translations and the signals ── */
  const [xl, setXl] = useState<Record<string, C.Translation>>({});
  const xlRef = useRef(xl);
  xlRef.current = xl;
  const [signals, setSignals] = useState<Record<string, Signal | null>>({});
  /* what each letter and you have in common — read on the phone from your
     own sticker state, re-read when the tab comes back (the first visit to
     Me is what writes the facts). All at once, one update. */
  const feedKey = feed.map((l) => l.id).join("|");
  useFocusEffect(
    useCallback(() => {
      let live = true;
      const letters = feedRef.current;
      void Promise.all(letters.map((l) => depsRef.current.signal(l).catch(() => null))).then((all) => {
        if (!live) return;
        setSignals((cur) => {
          let same = Object.keys(cur).length === letters.length;
          const next: Record<string, Signal | null> = {};
          letters.forEach((l, i) => {
            next[l.id] = all[i];
            if (JSON.stringify(cur[l.id] ?? null) !== JSON.stringify(all[i])) same = false;
          });
          return same ? cur : next;
        });
      });
      return () => {
        live = false;
      };
      // feedKey stands for the letters on the desk
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [feedKey]),
  );

  /* ── voice: one player for the desk ── */
  const voicePaths = useMemo(() => feed.filter((l) => l.kind === "voice" && l.media_path && !l.media_path.startsWith("demo/")).map((l) => l.media_path as string), [feed]);
  const signed = useSignedUrls("voice-letters", voicePaths);
  const voiceUrl = useCallback(
    (l: PoolLetter): string | null => {
      if (l.kind !== "voice" || !l.media_path) return null;
      return l.media_path.startsWith("demo/") ? demoMediaUrl(l.media_path) : signed[l.media_path] ?? null;
    },
    [signed],
  );
  // paused when the page changes and when the tab loses focus (lib/voice-playback)
  const voice = useVoicePlayback({ pauseOn: idx });
  // read at the moment of a tap, so the actions object keeps its identity across renders
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const voiceUrlRef = useRef(voiceUrl);
  voiceUrlRef.current = voiceUrl;

  /* ── the cards ── */
  const fmt = useMemo<C.TodayFormat>(
    () => ({
      t,
      postmark: (iso) => postmark(iso),
      postNo: (uid) => postNo(uid),
      clock: (s) => clock(s),
      stamp: (id) => {
        const st = getStamp(id);
        return st ? { color: st.color, name: sname(st.name) } : null;
      },
      stickerName,
    }),
    // lang: the words and the dates follow the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );
  const cards = useMemo(
    () =>
      C.buildCards(
        feed.map((letter) => ({ letter, offer: translateOffer(letter), xl: xl[letter.id] ?? null, signal: signals[letter.id] ?? null, voiceReady: !!voiceUrl(letter) })),
        tk.sf,
        fmt,
      ),
    // lang: the translate offer reads the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feed, xl, signals, voiceUrl, tk.sf, fmt, lang],
  );

  /* ── the reply ── */
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const slow = useSlow(sending);
  const [toast, setToast] = useState(false);
  const [extraFlights, setExtraFlights] = useState(0);
  const flights = forceFull ? MAX_IN_FLIGHT : source.flights + extraFlights; // sends this session count at once
  const flightsRef = useRef(flights);
  flightsRef.current = flights;
  const [answeredSerial, setAnsweredSerial] = useState(0);
  const answer = useCallback((serial: number) => setAnsweredSerial((s) => Math.max(s, serial)), []);
  /* the letter the courier is carrying (the fly-by's "to"), whichever page is showing */
  const [sendingTo, setSendingTo] = useState<PoolLetter | null>(null);
  const draft = current ? drafts[current.id] ?? "" : "";
  /** the send key and the hint for any letter's draft (the page's, or the reader's) */
  const replyFor = useCallback(
    (letterId: string): C.ReplyState => {
      const l = feedRef.current.find((x) => x.id === letterId);
      const isDemo = demoRef.current || !!l?.author?.startsWith("demo-");
      return C.replyState({ text: draftsRef.current[letterId] ?? "", flights: flightsRef.current, demo: isDemo, forceFull, sending: sendingRef.current }, t);
    },
    // drafts, flights and sending are read at the moment; the renderers call it while they render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [forceFull, lang, drafts, flights, sending],
  );
  const replyNow = useMemo(() => (current ? replyFor(current.id) : C.replyState({ text: "", flights, demo, forceFull }, t)), [current, replyFor, flights, demo, forceFull]); // eslint-disable-line react-hooks/exhaustive-deps

  const [flightFull, setFlightFull] = useState(false);
  const [needsAccount, setNeedsAccount] = useState(false);
  const [readerId, setReaderId] = useState<string | null>(null);
  /* the letter a blocked send was aimed at, so signing in resumes THAT one */
  const pendingReply = useRef<PoolLetter | null>(null);

  const isGuest = () => depsRef.current.guest?.() ?? sessionGuest;

  /* a letter leaves the desk: the page stays where it is (the next letter
     slides into it) and the renderer is told where that is, in the same
     update as the cards */
  const removeLetter = useCallback((id: string) => {
    const f = feedRef.current;
    const i = f.findIndex((l) => l.id === id);
    if (i < 0) return;
    const next = f.filter((l) => l.id !== id);
    const at = Math.min(idxRef.current - (i < idxRef.current ? 1 : 0), next.length);
    setRawIdx(at);
    setAnchor((a) => ({ id: next[at]?.id ?? "", serial: a.serial + 1 }));
    if (demoRef.current) setDemoGone((g) => new Set(g).add(id));
    else sourceRef.current.remove(id);
  }, []);
  const removeAuthor = useCallback((author: string) => {
    const r = C.withoutAuthor(feedRef.current, author, idxRef.current);
    setRawIdx(r.idx);
    setAnchor((a) => ({ id: r.feed[r.idx]?.id ?? "", serial: a.serial + 1 }));
    if (demoRef.current) setDemoGone((g) => new Set([...g, ...feedRef.current.filter((l) => l.author === author).map((l) => l.id)]));
    else sourceRef.current.removeAuthor(author);
  }, []);

  /* THE LETTER BEING ANSWERED IS PASSED IN, never read from the page: a
     reply is always bound to its own letter, so it can never go to the
     wrong stranger. */
  const send = useCallback(
    async (letterId: string, typed?: string, serial = 0) => {
      const to = feedRef.current.find((l) => l.id === letterId);
      if (!to || sendingRef.current) {
        answer(serial);
        return;
      }
      if (typed != null) changeDraft(to.id, typed);
      const d = depsRef.current;
      /* the writer deleted their account while this was being written */
      if (!to.author) {
        answer(serial);
        blurThen(() => Alert.alert(t("ld.gone.title"), t("ld.gone.body")), viewRef);
        return;
      }
      const text = (typed ?? draftsRef.current[to.id] ?? "").trim();
      const w = weightedCount(text);
      if (w < REPLY_MIN || w > LETTER_MAX) {
        answer(serial);
        return;
      }
      const isDemo = demoRef.current || to.author.startsWith("demo-");
      /* THE POUCH IS FULL: the product's own sheet, keyboard first (owner, build 18) */
      if (forceFull || (!isDemo && flightsRef.current >= MAX_IN_FLIGHT)) {
        answer(serial);
        openLeaveSheet(() => setFlightFull(true), viewRef);
        return;
      }
      sendingRef.current = true;
      setSending(true);
      setSendingTo(to);
      blurThen(() => {}, viewRef, { delayMs: 0 });
      /* a floor, not a delay: the courier is always seen leaving */
      const beat = new Promise<void>((r) => setTimeout(r, SEND_BEAT_MS));
      if (isDemo) {
        d.seedDemo(to, text);
      } else {
        /* the synchronous local screen (contact details); the model gate lives in compose */
        if (!d.screen(text).ok) {
          sendingRef.current = false;
          setSending(false);
          answer(serial);
          blurThen(() => Alert.alert(t("cp.gate.title", { wren }), t("cp.gate.body")), viewRef);
          return; // the draft stays in the box
        }
        const threadId = await d.reply(to, text);
        if (!threadId) {
          await beat;
          sendingRef.current = false;
          setSending(false);
          answer(serial);
          pendingReply.current = to;
          const kind = d.lastFail();
          const action = C.replyFailAction(kind, isGuest());
          if (action === "signup") {
            openSignUpSheet(() => setNeedsAccount(true), viewRef);
            return;
          }
          /* gone, blocked, suspended, an expired session and offline each say
             what is true; anything else keeps "try again" */
          blurThen(() => alertFail(t("cp.fail.title"), t("ld.replyFail"), { context: "reply", onSignIn: () => openSignUpSheet(() => setNeedsAccount(true), viewRef) }), viewRef);
          if (action === "remove") removeLetter(to.id);
          return; // the draft stays in the box (or left with its letter)
        }
        d.bump("replied");
        setExtraFlights((f) => f + 1);
        sourceRef.current.settleArrival(); // answering one of what she brought back ends the arrival
      }
      d.afterReply(to, text, isDemo);
      await beat;
      sendingRef.current = false;
      setSending(false);
      answer(serial);
      changeDraft(to.id, "");
      setToast(true);
      setTimeout(() => setToast(false), 2200);
      /* AND IT LEAVES THE DESK: the next letter slides up into the page */
      removeLetter(to.id);
    },
    // forceFull, wren and the guest rule are read at the moment; the rest are refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [forceFull, wren, sessionGuest, answer, changeDraft, removeLetter],
  );

  /* ── report / block: always reachable ── */
  const [menuLetter, setMenuLetter] = useState<PoolLetter | null>(null);
  const report = useReportFlow({
    context: "letter",
    targetUser: menuLetter?.author ?? null,
    refId: menuLetter?.id ?? null,
    snapshot: menuLetter?.body ?? null,
    onBlocked: (target) => {
      if (target.targetUser) removeAuthor(target.targetUser);
    },
  });
  const reportRef = useRef(report);
  reportRef.current = report;

  const cardAction = useCallback(
    (letterId: string, action: KTodayCardAction) => {
      const letter = feedRef.current.find((l) => l.id === letterId);
      if (!letter) return;
      const d = depsRef.current;
      const target = { targetUser: letter.author, refId: letter.id, snapshot: letter.body };
      switch (action) {
        case "unfold":
          blurThen(() => setReaderId(letter.id), viewRef);
          return;
        case "translate":
          void translateLetter(letter);
          return;
        case "voice":
          voiceRef.current.toggle(letter.id, voiceUrlRef.current(letter), letter.duration_s ?? null);
          return;
        case "report":
          if (!letter.author || d.intercept?.("report", letter)) return;
          blurThen(() => void reportRef.current.report(target), viewRef);
          return;
        case "block":
          if (!letter.author || d.intercept?.("block", letter)) return;
          blurThen(() => reportRef.current.askBlock(target), viewRef);
          return;
      }
    },
    // everything it reads is a ref (translateLetter too), so the actions keep their identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /** the translate capsule: the first tap asks Wren, later taps turn it round */
  async function translateLetter(letter: PoolLetter) {
    const cur = xlRef.current[letter.id];
    if (cur?.text) {
      setXl((m) => ({ ...m, [letter.id]: { ...cur, on: !cur.on } }));
      return;
    }
    if (cur?.busy || !letter.body) return;
    setXl((m) => ({ ...m, [letter.id]: { text: null, on: false, busy: true } }));
    const out = await depsRef.current.translate(letter.body, getLang());
    if (out) {
      setXl((m) => ({ ...m, [letter.id]: { text: out, on: true, busy: false } }));
      depsRef.current.bump("translated");
    } else {
      setXl((m) => ({ ...m, [letter.id]: { text: null, on: false, busy: false } }));
      blurThen(() => Alert.alert(t("ld.xlFail.title", { wren: wrenRef.current }), t("ld.xlFail.body")), viewRef);
    }
  }

  const dayRef = useRef(day);
  dayRef.current = day;
  const act = useMemo<TodayActions>(
    () => ({
      settle: (i) => setRawIdx(Math.max(0, Math.min(i, feedRef.current.length))),
      goto: (i) => {
        const l = feedRef.current[i];
        if (!l) return;
        setRawIdx(i);
        requestScroll(l.id, true);
      },
      toTop: () => {
        setRawIdx(0);
        requestScroll("top", true);
      },
      changeDraft,
      send: (id, text, serial) => void send(id, text, serial),
      cardAction,
      openMenu: (id) => {
        const letter = feedRef.current.find((l) => l.id === id);
        if (!letter?.author) return;
        if (depsRef.current.intercept?.("report", letter)) return;
        setMenuLetter(letter);
        blurThen(() => reportRef.current.openMenu(), viewRef);
      },
      openDeskStrip: () => blurThen(() => depsRef.current.openDesk(), viewRef, { delayMs: 0 }),
      seal: () => {
        setSealed(true);
        depsRef.current.seal(dayRef.current, factsRef.current);
      },
      grab: setHeld,
      closeReader: () => {
        setReaderId(null);
        setDraftEpoch((e) => e + 1);
      },
      closeFlightSheet: () => setFlightFull(false),
      closeSignUp: () => setNeedsAccount(false),
      signedIn: () => {
        setNeedsAccount(false);
        // the letter that raised the sheet, never whatever the page shows now
        const to = pendingReply.current;
        if (to) void send(to.id);
      },
      blocked: removeAuthor,
    }),
    [changeDraft, send, cardAction, requestScroll, removeAuthor],
  );

  /* ── the words ── */
  const strings = useMemo<TodayStrings>(
    () => ({
      title: t("ld.today"),
      pass: t("ld.pass"),
      reply: t("ld.replyArrow"),
      replyA11y: t("ld.reply.a11y"),
      unfold: t("ld.unfold"),
      unfoldA11y: t("ld.unfold.a11y"),
      voiceLetter: t("ld.voiceLetter"),
      more: t("rp.menu.a11y"),
      next: t("ld.next.a11y"),
      previous: t("ld.prev.a11y"),
      play: t("vo.play"),
      pause: t("vo.pause"),
      placeholder: t("ld.writeBackPh"),
      send: t("ld.send"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );
  const states = C.envelopeStates(idx);
  const stateWord = { opened: t("ld.env.read"), current: t("ld.env.open"), sealed: t("ld.env.sealed") };
  const arrival = {
    open: source.fresh,
    line: t(source.sent ? "ld.arrived" : "ld.arrivedKept"),
    states,
    labels: states.map((_, i) => t("ld.env.a11y", { n: i + 1, total: states.length })),
    values: states.map((s) => stateWord[s]),
  };
  const unread = source.deskUnread;
  const deskStrip = unread > 0 ? (unread === 1 ? t("wo.strip.one") : t("wo.strip.many", { n: unread })) : "";

  const view: TodayView = {
    loaded: source.loaded,
    quiet: source.loaded && feed.length === 0,
    demo,
    feed,
    cards,
    idx,
    atEnd,
    current,
    plateRight: C.plateLabel({ loaded: source.loaded, count: feed.length, atEnd }, t),
    deskStrip,
    arrival,
    freshUnfold: source.fresh,
    reply: { letterId: current?.id ?? "", draft, preview: C.draftPreview(draft), state: replyNow },
    sending,
    slow,
    toast,
    pillHidden: sending || readerId != null || plusOpen,
    facts,
    sealed,
    held,
    anchor,
    scroll,
    draftEpoch,
    answeredSerial,
    readerId,
    flyTo: sendingTo?.author ? `NO.${postNo(sendingTo.author)}` : null,
    strings,
  };

  return { view, act, viewRef, draftFor, replyFor, voice, voiceUrl, report, sheets: { flightFull, needsAccount } };
}

/** The translate offer for a letter: its language isn't the reader's — by
    the script, the writer's tag, and the words themselves (an English
    letter from a Spanish-speaking writer is not offered ES→EN to an English
    reader). */
function translateOffer(l: PoolLetter): { code: string } | null {
  if (l.kind === "voice" || !l.body || !needsTranslating(l.body, l.lang)) return null;
  const me = getLang();
  const guess = guessLatin(l.body);
  if (guess && guess === me) return null;
  const from = guess ? guess.toUpperCase() : sourceTag(l.body, l.lang);
  return { code: `${from}→${me.toUpperCase()}` };
}

/** The Today tab's model, as the route uses it: the real desk and the real world. */
export function useTodayDesk(): TodayModel {
  const source = useTodaySource();
  const deps = useRealTodayDeps();
  return useTodayCore(source, deps);
}
