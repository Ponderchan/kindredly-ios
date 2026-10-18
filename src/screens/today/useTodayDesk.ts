import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { Alert } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KScreenHandle } from "../../../modules/kindredly-ui";
import type { KTodayCardAction } from "../../../modules/kindredly-ui/src/Today";
import { useTheme } from "../../lib/theme";
import { getLang, hasString, needsTranslating, sourceTag, t, useLang } from "../../lib/i18n";
import { guessLatin } from "../../lib/lang-guess";
import { clockTime, fmt as clock, penPalName, postNo, postmark } from "../../lib/format";
import { getStamp, sname } from "../../data/stamps";
import { stickerName } from "../../lib/sticker-copy";
import { POOL_CACHE_KEY, fetchMatches, fetchPool, fetchPoolPage, fetchThreads, lastWriteFail, markLetterRead, replyToLetter, type PoolLetter, type ThreadSummary } from "../../lib/db";
import type { WriteFail } from "../../lib/thread-detail-core";
import type { Signal } from "../../lib/today-signal";
import { refreshFingerprint, signalFor } from "../../lib/aura";
import { lastLetterDay, noteWrote, replanLocal } from "../../lib/local-push";
import { bump } from "../../lib/usage-counters";
import { track } from "../../lib/track";
import { screenNow, translate } from "../../lib/wren";
import { ARRIVAL_AT_KEY, ARRIVAL_FRESH, ARRIVAL_SENT, getFlags, isSealed, sealDay, unsealDay, unsetFlag } from "../../lib/flags";
import { useAuth } from "../../lib/auth";
import { SEND_BEAT_MS } from "../../lib/net";
import { DAY_LETTERS, MAX_IN_FLIGHT, inFlight, rationPool, type FlightThread } from "../../lib/ration";
import { deskDay, isNightHour } from "../../lib/day";
import { startDayClosed } from "../../lib/activities";
import { onYou } from "../../lib/waiting";
import { readRoomSeen } from "../../lib/room-seen";
import { useWrenStage, wrenStageDirty } from "../../lib/wren-stage";
import { useWrenName } from "../../lib/wren-name";
import { hungerRead, lastFedAt, onFed } from "../../lib/hunger";
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
import { PALETTE, daylight } from "../../components/CourierCard";
import type { WrenStage } from "../../components/WrenBird";
import "../../data/strings-step5-today";
import "../../data/strings-today3d";
import * as C from "./today-cards";

/* THE TODAY TAB'S MODEL (10a step 5; Today 3d × 25b, 2026-10-16):
   everything the tab knows and does, for whichever renderer draws it —
   TodayNative (SwiftUI, one Host) or TodayRN (the remote switch's React
   Native fallback). The rules live in today-cards (pure, node-tested); this
   file gathers the facts and does the side effects, in three parts:

   - useTodaySource(): the day on this phone. The saved day first (the desk
     dealt this morning, what was passed and answered, done), then the pool
     and the threads together, the matcher's second pass, the freeze once
     the day is dealt (owner question 1: nothing joins the desk until
     08:00; replies, blocks and withdrawn letters still leave it), the 45s
     focus throttle, the put-away record (and the 8 o'clock knock's
     replan), the first arrival's flags, her stage, her hunger (the threads
     with the last letter written on this phone: a letter feeds her at
     once) and whether she can play. A null answer (offline, signed out) keeps the desk AND the pouch
     and the waiting count; a first load that comes back with nothing says
     offline, never done.
   - useTodayCore(source, deps): the reader's day on that desk. Pass and
     bring back (one step), the seen counter (once a day per letter, kept
     in the record so a relaunch never counts twice) and the read receipt
     (2s on the card, or at once when REPLY opens), the day turning at
     eight, done (her counted letter, the DayClosed Live Activity started
     by itself when the last letter goes — owner question 2 — and never on
     a quiet day or a relaunch), the window to her game with its sky by the
     hour, per-letter drafts (the source of truth: every edit lands here, no
     debounce), translations and the one capsule, the signals, the one
     voice player (paused when the card changes and on a tab switch),
     send() with every outcome, the pouch, the guest sheet, report / block,
     the unfold reader, the toast, the + panel's stage, and Wren on the
     band (her resting face by the hour and her hunger, and the serial that
     sends her off with each reply). Its IO goes through
     `deps`, so the dev page runs the same code on fixtures with no network.
   - useTodayDesk(): the two together, as the route uses them.

   Every word a renderer shows is set here or in today-cards, with t().

   LEGACY: until integrate and rn-fallback rewire TodayNative / TodayRN /
   TodayOverlays, the view also carries what the step-5 scroll stack and
   the blind read (idx, atEnd, quiet, plateRight, deskStrip, facts, sealed,
   held, anchor, scroll, pillHidden, the arrival's envelopes) and the
   actions they call (settle, goto, toTop, seal, grab, openDeskStrip). They
   never pass a letter, so on them the desk behaves as it did. Marked
   "legacy" below; delete them with those renderers. */

/* ── the day on the phone ─────────────────────────────────────────────── */

/* THE DAY IS PUT AWAY AS IT IS — the desk in its dealt order with the
   letters passed and answered, under the same key and with the same `day`
   and `desk` fields as before (lib/local-push reads them). Opening on the
   same day paints exactly that; the network only prunes a frozen desk
   (owner, 2026-09-19: the letter under the thumb used to swap twice within
   two seconds of opening). Onboarding still writes the raw list; that shape
   is read as a placeholder. */
/* the 8 o'clock knock is skipped only for a morning whose own desk is known
   to be empty, so a desk that fills or empties re-plans it — once per
   change, not on every put-away */
let deskWasFull: boolean | null = null;
function putAway(rec: C.DayRecord): void {
  const full = rec.desk.length > 0;
  const changed = full !== deskWasFull;
  deskWasFull = full;
  void AsyncStorage.setItem(POOL_CACHE_KEY, JSON.stringify(rec))
    .then(() => (changed ? replanLocal({ force: true }) : undefined))
    .catch((e) => console.warn("[today] desk put-away:", e));
}
async function readSaved(today: string): Promise<{ rec: C.DayRecord; placeholder: boolean } | null> {
  try {
    return C.readDayRecord(await AsyncStorage.getItem(POOL_CACHE_KEY), today);
  } catch (e) {
    console.warn("[today] desk read:", e);
    return null;
  }
}

/** A day record held in memory, changed through `update` synchronously (so a caller can read what it did). */
export function useMemoryDay(init: () => C.DayRecord, onChange?: (rec: C.DayRecord) => void): { rec: C.DayRecord; update: (fn: (rec: C.DayRecord) => C.DayRecord) => void; reset: (rec: C.DayRecord) => void; get: () => C.DayRecord } {
  const [rec, setRec] = useState(init);
  const ref = useRef(rec);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const update = useCallback((fn: (r: C.DayRecord) => C.DayRecord) => {
    const next = fn(ref.current);
    if (next === ref.current) return;
    ref.current = next;
    setRec(next);
    changeRef.current?.(next);
  }, []);
  const reset = useCallback((next: C.DayRecord) => {
    ref.current = next;
    setRec(next);
  }, []);
  const get = useCallback(() => ref.current, []);
  return { rec, update, reset, get };
}

/* dev only: the dev page's RESET REAL DAY. It clears the put-away record,
   the sealed flag and her Live Activity on this phone, but a mounted Today
   tab still holds the day it read in memory (and would put it away again
   on its next change), so it also asks every live source to start the day
   over, as the day turning does. Nothing in the product calls this. */
const restarts = new Set<() => void>();
export function restartRealDay(): void {
  if (!__DEV__) return;
  restarts.forEach((f) => f());
}

/** the first arrival lasts the day she came back */
const ARRIVAL_TTL = 20 * 60 * 60 * 1000;
/** a fresh pool is fresh for this long; a tab switch inside it doesn't refetch */
const REFOCUS_MS = 45_000;

/* ── the source: the day on this phone ─────────────────────────────────── */

export type TodaySource = {
  /** today's record: the desk (passed letters included), passed, answered, seen, undo, dealt, done */
  rec: C.DayRecord;
  /** a non-null pool answer came this session, or a known record of today was read */
  loaded: boolean;
  /** a load ended with no answer while nothing was loaded (an offline cold start with nothing kept) */
  offline: boolean;
  /** correspondences opened and not yet answered (the pouch, lib/ration) */
  flights: number;
  /** correspondences waiting on a reply from you (her letter) */
  waiting: number;
  /** her stage (useWrenStage), null until the first read lands */
  stage: WrenStage | null;
  /** she's starving (hungerRead on the threads the load already fetched, with the last letter written on this phone) */
  wilt: boolean;
  /** she can play her game: hatched and not wilted (the PLAY sticker's rule) */
  canPlay: boolean;
  /** her first crossing just landed: the arrival shows */
  fresh: boolean;
  /** did the opener leave, or stay on the phone (which line she says) */
  sent: boolean;
  settleArrival: () => void;
  /** read the desk again; `reset` starts the day over (the day turned) */
  reload: (reset?: boolean) => void;
  /** every change to the day goes through here (and is put away) */
  update: (fn: (rec: C.DayRecord) => C.DayRecord) => void;
  /** dev builds may show the demo desk when the real one has nothing dealt */
  demoAllowed: boolean;
  /** dev: the hour her face, her yawn and the window's sky read instead of the clock's (the dev page's NIGHT); never set in the app */
  hour?: number;
};

/** What the matcher answered: its writers' scores, and their letters (the narrowed second fetch). */
type Matched = { score: Map<string, number>; theirs: PoolLetter[] };

/** A real deal waits this long for the matcher (counted from the pool's answer) before it deals without it. */
const MATCH_WAIT_MS = 1500;
const TIMED_OUT = Symbol("timed out");

/** `p`'s answer, or TIMED_OUT once `ms` have passed without one. */
function within<T>(p: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  return new Promise((resolve) => {
    const id = setTimeout(() => resolve(TIMED_OUT), ms);
    void p.then((v) => {
      clearTimeout(id);
      resolve(v);
    });
  });
}

/** A day's deal from a pool and the matcher's answer: matched first, then the server's newest-first, rationed to the fifteen. */
function scoredDeal(base: readonly PoolLetter[], m: Matched): PoolLetter[] {
  const seen = new Set(base.map((l) => l.id));
  const scored = [...base, ...m.theirs.filter((l) => !seen.has(l.id))].map((l) => ({ ...l, close: l.author ? m.score.get(l.author) : undefined }));
  return rationPool([...scored].sort((a, b) => (b.close ?? -1) - (a.close ?? -1)));
}

/** A load's matcher pass on the desk it dealt (or filled, or froze). */
function withMatches(r: C.DayRecord, mode: C.LoadMode, theirs: PoolLetter[], score: Map<string, number>): PoolLetter[] {
  const cur = r.desk;
  const close = (l: PoolLetter) => (l.author ? score.get(l.author) : undefined);
  if (mode === "frozen") {
    // nothing joins; the scores are only attached in place
    let changed = false;
    const next = cur.map((l) => {
      const c = close(l);
      if (c === l.close) return l;
      changed = true;
      return { ...l, close: c };
    });
    return changed ? next : cur;
  }
  // a desk being dealt: matched first, then the server's newest-first, behind what the reader has already seen
  if (mode === "deal") return C.dealDesk(cur, r.passed, scoredDeal(cur, { score, theirs }));
  // a desk filling: as it was, the matched newcomers at the end
  const seen = new Set(cur.map((l) => l.id));
  const scored = [...cur, ...theirs.filter((l) => !seen.has(l.id))].map((l) => ({ ...l, close: close(l) }));
  return scored.slice(0, Math.max(cur.length, DAY_LETTERS));
}

export function useTodaySource(): TodaySource {
  const { stage } = useWrenStage();
  const store = useMemoryDay(() => C.emptyDay(deskDay()), putAway);
  const placeholderRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);
  const [offline, setOffline] = useState(false);
  const [flights, setFlights] = useState(0);
  const [waiting, setWaiting] = useState(0);
  /* HER HUNGER: the threads the last load fetched (null until one answers)
     with the last letter written on this phone — this run's noteFed, or
     local-push's letterDay from before it — as the "last written" date, so
     an open letter feeds her too and a reply perks her up at once, not at
     the next load. Only starving (lib/hunger's wilt) shows on the band. */
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);
  const [letterDay, setLetterDay] = useState<string | null>(null);
  const fedAt = useSyncExternalStore(onFed, lastFedAt);
  const wilt = useMemo(() => {
    if (!threads) return false;
    const wrote = Math.max(fedAt, letterDay ? Date.parse(letterDay) || 0 : 0);
    return !!hungerRead({ threads, lastWrittenAt: wrote || null })?.wilt;
  }, [threads, fedAt, letterDay]);
  const lastLoad = useRef(0);
  const readOnce = useRef(false);
  /** a new day makes the answer of a load still in flight stale */
  const generation = useRef(0);
  const { update, reset, get } = store;

  /* THE FIRST ARRIVAL. Onboarding ends with her first crossing; when Today
     opens after it, her line is up over her head and the first card
     unfolds. It stays until three letters are passed or you answer one,
     and it expires with the day she came back. */
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

  /* A LOAD. The saved day paints first (once a session); then the pool and
     the threads together, the matcher asked at the same time. A null pool
     answer changes nothing (offline is said only while nothing is loaded).
     Otherwise the desk is dealt (a new day, or onboarding's placeholder),
     filled (dealt but not frozen yet: a legacy record) or, frozen, only
     pruned of withdrawn letters.

     A real deal (nothing on the desk yet) waits up to MATCH_WAIT_MS for the
     matcher, the loading card still up, and deals once, matched writers
     first: the first letter of the day is the best-matched one, and nothing
     swaps under the thumb. A matcher slower than that is not waited for: the
     desk deals without it, and its late pass fills in behind the letter on
     screen (dealDesk). Onboarding's placeholder is already showing letters,
     so it deals at once and the pass does the same. Otherwise the matcher's
     pass appends to a fill or only attaches its scores. A deal or a fill
     then freezes, whether or not the matcher answered. */
  const load = useCallback(
    async (restart = false) => {
      try {
        const today = deskDay();
        if (restart || get().day !== today) {
          // the day turned: yesterday's desk, passes, done and title lock all go
          generation.current++;
          placeholderRef.current = false;
          loadedRef.current = false;
          setLoaded(false);
          setOffline(false);
          reset(C.emptyDay(today));
        }
        const gen = generation.current;
        const stale = () => gen !== generation.current;
        if (!readOnce.current) {
          readOnce.current = true;
          const saved = await readSaved(today);
          if (stale()) return;
          const cur = get();
          // what was kept paints, unless this session's desk already moved
          if (saved && cur.desk.length === 0 && cur.passed.length === 0 && cur.answered.length === 0) {
            placeholderRef.current = saved.placeholder;
            reset(saved.rec);
            if (!saved.placeholder && C.recordKnown(saved.rec)) {
              loadedRef.current = true;
              setLoaded(true);
            }
          }
        }

        // asked beside the pool, so a deal rarely has to wait for it (its failure is no answer)
        const matchesP = fetchMatches().catch((e) => {
          console.warn("[today] matcher:", e);
          return null;
        });
        const [page, th, wroteOn] = await Promise.all([fetchPoolPage(), fetchThreads(), lastLetterDay()]);
        const p = page ? page.letters : null;
        if (stale()) return;
        setLetterDay(wroteOn);
        /* offline keeps what the pouch, her hunger and her letter last knew
           (critic): no threads is no answer, not "nobody" */
        if (th) {
          setFlights(inFlight(th as FlightThread[]));
          setThreads(th);
          const w = onYou(th, await readRoomSeen());
          if (stale()) return;
          setWaiting(w);
        }
        if (!p) {
          if (!loadedRef.current) setOffline(true);
          return;
        }
        const pool = p;
        // only the server's page as sent can say it is the whole pool (fetchPoolPage); unknown prunes nothing
        const whole = page?.whole ?? false;
        const mode = C.loadMode(get(), placeholderRef.current);
        // the matcher chooses people, not just the order: its writers' letters come back with the scores
        const matcher: Promise<Matched | null> = (async () => {
          const m = await matchesP;
          if (!m?.closest?.length) return null;
          const score = new Map(m.closest.map((c) => [c.uid, c.score]));
          const theirs = mode === "frozen" ? [] : (await fetchPool(C.POOL_PAGE, m.closest.map((c) => c.uid))) || [];
          return { score, theirs };
        })().catch((e) => {
          console.warn("[today] matcher pass:", e);
          return null;
        });
        // a real deal holds the loading card a moment for the matcher (see A LOAD)
        const early = mode === "deal" && !placeholderRef.current ? await within(matcher, MATCH_WAIT_MS) : TIMED_OUT;
        if (stale()) return;
        update((r) =>
          C.withDesk(
            r,
            mode === "deal"
              ? C.dealDesk(r.desk, r.passed, early !== TIMED_OUT && early ? scoredDeal(pool, early) : rationPool(pool))
              : C.keepDesk(r.desk, pool, whole, mode === "fill" ? rationPool(pool) : [], mode === "frozen"),
          ),
        );
        placeholderRef.current = false;
        loadedRef.current = true;
        setLoaded(true);
        setOffline(false);

        // the pass, unless the deal already had its answer (or its "no one")
        if (early === TIMED_OUT) {
          const late = await matcher;
          if (stale()) return;
          if (late) update((r) => C.withDesk(r, withMatches(r, mode, late.theirs, late.score)));
        }
        if (stale()) return;
        if (mode !== "frozen") update((r) => C.freeze(r, Date.now()));
      } catch (e) {
        console.warn("[today] load:", e);
      }
    },
    [get, reset, update],
  );

  useFocusEffect(
    useCallback(() => {
      if (Date.now() - lastLoad.current >= REFOCUS_MS) {
        lastLoad.current = Date.now();
        void load();
      }
    }, [load]),
  );

  const reload = useCallback(
    (restart = false) => {
      lastLoad.current = Date.now();
      void load(restart);
    },
    [load],
  );
  // dev: RESET REAL DAY on the dev page starts this desk over (restartRealDay above)
  useEffect(() => {
    if (!__DEV__) return;
    const f = () => reload(true);
    restarts.add(f);
    return () => {
      restarts.delete(f);
    };
  }, [reload]);

  return {
    rec: store.rec,
    loaded,
    offline,
    flights,
    waiting,
    stage,
    wilt,
    canPlay: stage !== "egg" && !wilt,
    fresh,
    sent,
    settleArrival,
    reload,
    update,
    demoAllowed: true,
  };
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
  /** after a reply went: the conversion event, her stage, the fingerprint, the evening ask */
  afterReply: (letter: PoolLetter, text: string, demo: boolean) => void;
  seedDemo: (letter: PoolLetter, text: string) => void;
  /** whether this desk day is already sealed (flag sealed:{day}) */
  sealed: (day: string) => Promise<boolean>;
  /** the desk is done: the flag, and her on the lock screen till she's back */
  seal: (day: string, facts: { read: number; waiting: number }) => void;
  /** the flag outlived its desk (the desk is reading again): lift it, so the day can close once more */
  unseal: (day: string) => void;
  /** the window: her game (Flappy Words) */
  openWindow: () => void;
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
      sealed: isSealed,
      seal: (day, facts) => {
        void sealDay(day);
        void startDayClosed(facts); // her, on the lock screen, till she's back
      },
      unseal: (day) => void unsealDay(day),
      openWindow: () => router.push("/courier?play=1"),
    }),
    [router],
  );
}

/* ── the core: the reader's day on the desk ────────────────────────────── */

/** legacy: a scroll the step-5 renderers should do; its serial makes two asks two scrolls. */
export type TodayScroll = { serial: number; target: "top" | (string & {}); animated: boolean };

/** legacy: where the step-5 stack's page goes after the cards changed under it (the card now in its place, "" = the end page). */
export type TodayAnchor = { id: string; serial: number };

export type TodayStrings = {
  title: string;
  /** NEXT, under the glass disc */
  next: string;
  /** REPLY, under the ink disc */
  reply: string;
  replyA11y: string;
  unfold: string;
  unfoldA11y: string;
  voiceLetter: string;
  more: string;
  /** VoiceOver's "Next letter" (the card's action) */
  nextA11y: string;
  bringBack: string;
  play: string;
  pause: string;
  send: string;
  placeholder: string;
  offlineTitle: string;
  offlineBody: string;
  loadingA11y: string;
  /** legacy: ↑ PASS, on the step-5 card */
  pass: string;
  /** legacy: VoiceOver's "Previous letter" on the step-5 card */
  previous: string;
};

/** The + panel over the tab: closed, the first-week sheet, or the two round buttons. */
export type TodayPlus = "closed" | "sheet" | "pop";

export type TodayView = {
  phase: C.DeskPhase;
  loaded: boolean;
  /** the dev demo desk is showing */
  demo: boolean;
  /** today's desk, passed letters included (LetterReader finds its letter here) */
  feed: PoolLetter[];
  /** the letters not passed yet, the one on screen first (what both renderers draw) */
  cards: C.CardVM[];
  /** letters on today's desk not yet passed (NEXT's number) */
  left: number;
  leftA11y: string;
  /** the letter on screen */
  current: PoolLetter | null;
  /** the title has shrunk for the day: a letter was passed, or the desk is done */
  titleLocked: boolean;
  /** Bring back is offered (the card's ⋯ carries it; the RN ⋯ reads this) */
  canBringBack: boolean;
  /** her first arrival: her line over her head while the first three letters are up. legacy: states / labels / values are the step-5 envelopes */
  arrival: { open: boolean; line: string; states: C.EnvelopeState[]; labels: string[]; values: string[] };
  /** the first card unfolds as it arrives (the arrival is open) */
  freshUnfold: boolean;
  /** the reply, bound to the letter on screen */
  reply: { letterId: string; draft: string; preview: string; state: C.ReplyState };
  sending: boolean;
  /** the send has taken longer than a send takes (the reader's fly-by says "a headwind") */
  slow: boolean;
  /** "Reply sent." is up */
  toast: boolean;
  /** the control band steps aside: a send in flight, or the reader open (Wren only for the reader: a send is hers to carry) */
  hideBand: boolean;
  /** the + panel: on Today always the two round buttons while it is open */
  plus: TodayPlus;
  /** her letter when the desk is done */
  wrenLetter: C.WrenLetterVM;
  /** the window to her game */
  window: C.WindowVM;
  /** her yawn hours (21:00–07:59) */
  night: boolean;
  /**
   * her, for the pictures and the band: the reader's own courier (name, stage,
   * wilted), the face she rests in (C.wrenRest: sleepy in her night hours),
   * `carry`, which moves each time a reply leaves (she takes the letter and
   * flies off with it, then comes back to her spot), and what VoiceOver calls
   * her ("Your courier")
   */
  wren: { name: string; stage: WrenStage | null; wilt: boolean; rest: C.WrenRestFace; carry: number; a11y: string };
  /** bumped when the reader closes: the Swift field takes the draft again */
  draftEpoch: number;
  /** the last send press answered (Swift's dock waits for it) */
  answeredSerial: number;
  /** the letter in the unfolded reader, or null */
  readerId: string | null;
  /** the "to" of the reader's fly-by: the pen pal's number ("NO.7273") */
  flyTo: string | null;
  strings: TodayStrings;

  /* ── legacy (the step-5 scroll stack and the blind) ── */
  /** legacy: loaded with nothing on the desk */
  quiet: boolean;
  /** legacy: the step-5 stack's page, 0…cards.length (cards.length = the blind); always 0 for the new renderers */
  idx: number;
  /** legacy */
  atEnd: boolean;
  /** legacy: CLOSED / ALL READ / "" */
  plateRight: string;
  /** legacy: Wren's desk strip is dropped from Today (Kindreds carries it): always "" */
  deskStrip: string;
  /** legacy: the blind's slip */
  facts: { read: number; replied: number; waiting: number };
  /** the desk day is sealed (done, or the legacy blind pulled) */
  sealed: boolean;
  /** legacy: the blind's cord is held */
  held: boolean;
  /** legacy */
  anchor: TodayAnchor;
  /** legacy */
  scroll: TodayScroll;
  /** legacy: a send in flight, the reader open, or the + panel up */
  pillHidden: boolean;
};

export type TodayActions = {
  /** a card passed (the swipe up, NEXT, VoiceOver's "Next letter"); an id not on the desk is ignored */
  pass: (letterId: string) => void;
  /** the ⋯'s Bring back: the last pass, one step */
  bringBack: () => void;
  /** REPLY opened the field for the letter on screen: that is reading it (the read receipt goes now) */
  replyOpen: (letterId: string) => void;
  /** the window: her game, when she can play */
  window: () => void;
  changeDraft: (letterId: string, text: string) => void;
  /** send the reply to `letterId`; `text` from the field (else the draft); `serial` the press's, echoed when answered */
  send: (letterId: string, text?: string, serial?: number) => void;
  cardAction: (letterId: string, action: KTodayCardAction) => void;
  /** the React Native ⋯: the report flow's menu about this letter */
  openMenu: (letterId: string) => void;
  closeReader: () => void;
  closeFlightSheet: () => void;
  closeSignUp: () => void;
  /** the guest sheet signed the reader in: the letter it was raised for goes now */
  signedIn: () => void;
  /** a block held: every letter by that writer leaves the desk (the report flow calls it; so does the dev page) */
  blocked: (author: string) => void;

  /* ── legacy (the step-5 scroll stack and the blind) ── */
  /** legacy: the stack settled on a page (cards.length = the blind) */
  settle: (index: number) => void;
  /** legacy: an envelope of the arrival: go to that letter */
  goto: (index: number) => void;
  /** legacy: re-pressing the tab: to the first letter */
  toTop: () => void;
  /** legacy: the strip is gone; does nothing */
  openDeskStrip: () => void;
  /** legacy: the blind's cord pulled */
  seal: () => void;
  /** legacy: the cord held / let go */
  grab: (held: boolean) => void;
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

/** the same minute keeps the same Date, so a tick inside it doesn't re-render the tab */
const sameMinute = (a: Date, b: Date) => Math.floor(a.getTime() / 60000) === Math.floor(b.getTime() / 60000);

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

  /* ── the clock: the day turning at eight, the countdown, the sky ── */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = setInterval(() => {
      const d = new Date();
      setNow((cur) => (sameMinute(cur, d) ? cur : d));
    }, 30000);
    return () => clearInterval(tick);
  }, []);
  useFocusEffect(
    useCallback(() => {
      const d = new Date();
      setNow((cur) => (sameMinute(cur, d) ? cur : d));
    }, []),
  );
  const day = deskDay(now);
  // the dev page's NIGHT stands in for the clock's hour (her face, her yawn, the window's sky); the day still turns by the clock
  const hour = source.hour ?? now.getHours();
  const dayRef = useRef(day);
  dayRef.current = day;

  /* ── the record: the real day, or the dev demo desk (in memory, never put away) ── */
  const realRec = source.rec;
  const nothingDealt = realRec.desk.length === 0 && realRec.passed.length === 0 && realRec.answered.length === 0;
  const demo = source.demoAllowed && __DEV__ && source.loaded && (nothingDealt || storeMode);
  const demoStore = useMemoryDay(() => ({ ...C.emptyDay(day), desk: DEMO_POOL }));
  const rec = demo ? demoStore.rec : realRec;
  const recRef = useRef(rec);
  recRef.current = rec;
  const updateRef = useRef(source.update);
  updateRef.current = demo ? demoStore.update : source.update;
  const update = useCallback((fn: (r: C.DayRecord) => C.DayRecord) => updateRef.current(fn), []);

  const feed = useMemo<PoolLetter[]>(() => {
    if (!demo) return rec.desk;
    // store mode's first letter is in the reader's language
    const base = storeMode ? [{ ...DEMO_POOL[0], body: DEMO_TEXT[getLang()].letter, lang: getLang() }, ...DEMO_POOL.slice(1)] : DEMO_POOL;
    return rec.desk.map((l) => base.find((b) => b.id === l.id) ?? l);
    // lang: store mode's first letter follows the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, rec.desk, lang]);
  const feedRef = useRef(feed);
  feedRef.current = feed;
  const demoRef = useRef(demo);
  demoRef.current = demo;

  const phase = C.deskPhase({ loaded: source.loaded, offline: source.offline, desk: rec.desk, passed: rec.passed });
  const unpassed = useMemo(() => C.unpassed(feed, rec.passed), [feed, rec.passed]);
  const unpassedRef = useRef(unpassed);
  unpassedRef.current = unpassed;

  /* legacy: the step-5 stack's page. The new renderers never move it (it
     stays 0), so the letter on screen is the first not passed. */
  const [rawIdx, setIdx] = useState(0);
  const idx = Math.min(rawIdx, unpassed.length);
  const idxRef = useRef(idx);
  idxRef.current = idx;
  const current = unpassed[idx] ?? null;
  const currentRef = useRef(current);
  currentRef.current = current;
  const atEnd = idx >= unpassed.length;
  const [scroll, setScroll] = useState<TodayScroll>({ serial: 0, target: "top", animated: false });
  const [anchor, setAnchor] = useState<TodayAnchor>({ id: "", serial: 0 });
  const requestScroll = useCallback((target: TodayScroll["target"], animated: boolean) => setScroll((s) => ({ serial: s.serial + 1, target, animated })), []);
  const [held, setHeld] = useState(false);

  /* "IS THIS DESK DAY SEALED" — one flag per desk day (lib/flags), so the
     Live Activity goes up once: a relaunch into a finished desk reads it
     and never seals again. The flag is held against the desk once the day
     is loaded, and the desk wins (C.sealVerdict): the phase comes from the
     record, never from the flag, and a desk that is reading cannot be a
     sealed day — done is the only sealer and it is final for the day — so
     a flag over it outlived its desk (the old blind's pull over a legacy
     record that filled again, a day started over) and is lifted, which
     gives the day back its right to close. The same reading check lets go
     of the one-shot ref, so a day dealt again on the same date (the dev
     page's fixtures, RESET REAL DAY) can seal again. Before the load
     nothing is decided: a placeholder desk is reading too, but it isn't
     the day yet. The day turns at eight, when she's back (lib/day); an app
     left open across eight starts the day over: the record, the passed
     list, done and the title lock all reset, within 30 s. */
  const [sealed, setSealed] = useState(false);
  const sealedRef = useRef(false);
  const loaded = source.loaded;
  useEffect(() => {
    if (!loaded) return; // "wait"
    let live = true;
    void depsRef.current
      .sealed(day)
      .then((flagged) => {
        if (!live) return;
        const verdict = C.sealVerdict({ loaded, phase, flagged });
        if (verdict === "stale") depsRef.current.unseal(day);
        if (verdict === "stale" || verdict === "open") {
          sealedRef.current = false;
          setSealed(false);
        } else if (verdict === "sealed") {
          sealedRef.current = true;
          setSealed(true);
        }
        // "keep": done without the flag — the done effect may be sealing this moment; its ref stands
      })
      .catch((e) => console.warn("[today] sealed flag:", e));
    return () => {
      live = false;
    };
  }, [day, loaded, phase]);
  const shownDay = useRef(day);
  useEffect(() => {
    if (shownDay.current === day) return;
    shownDay.current = day;
    sealedRef.current = false;
    setSealed(false);
    sourceRef.current.reload(true);
    if (demoRef.current) demoStore.reset({ ...C.emptyDay(day), desk: DEMO_POOL });
    setIdx(0);
    requestScroll("top", false);
    // demoStore.reset is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, requestScroll]);

  /* counted for the reader's own stickers: every letter that comes on
     screen, once a day (Picky / Generous). The record keeps the ids, so a
     relaunch doesn't count them again — dev letters never count */
  const currentId = current?.id ?? null;
  useEffect(() => {
    if (!currentId) return;
    let counted = false;
    update((r) => {
      const m = C.markSeen(r, currentId);
      counted = m.counted;
      return m.rec;
    });
    if (counted && !demoRef.current && !currentId.startsWith("demo")) depsRef.current.bump("seen");
  }, [currentId, update]);
  /* the writer's eye: read once it has been on screen for two seconds
     (flicking past is not reading), or at once when REPLY opens (replying
     is reading). One per reader; the database keeps that. */
  const readNow = useRef<string | null>(null);
  const markReadNow = useCallback((id: string) => {
    if (demoRef.current || id.startsWith("demo") || readNow.current === id) return;
    readNow.current = id;
    depsRef.current.markRead(id);
  }, []);
  useEffect(() => {
    if (!currentId || currentId.startsWith("demo")) return;
    readNow.current = null;
    const timer = setTimeout(() => markReadNow(currentId), 2000);
    return () => clearTimeout(timer);
  }, [currentId, markReadNow]);
  /* three letters passed: the arrival is over, the desk is the desk (legacy: three pages paged) */
  useEffect(() => {
    if (source.fresh && (C.arrivalSettled(rec.passed.length) || C.arrivalSettled(idx))) sourceRef.current.settleArrival();
  }, [source.fresh, rec.passed.length, idx]);

  /* DONE. Reading → done (the last letter passed, answered, blocked or
     withdrawn): the moment is kept (her letter's postmark), and if anything
     went past the desk today the day is sealed and she goes up on the lock
     screen (owner question 2). The count is what went past the desk —
     passed + answered, as on her letter (C.wrenLetterFacts) — never the
     desk's size. Reaching done any other way — a quiet day, a relaunch
     into a finished desk, the first load — only keeps the moment: no Live
     Activity. The one-shot ref is let go of by the sealed effect above
     when the desk is reading again (a stale flag is lifted with it). */
  const waitingRef = useRef(source.waiting);
  waitingRef.current = source.waiting;
  const prevPhase = useRef<C.DeskPhase | null>(null);
  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = phase;
    if (phase !== "done" || prev === "done") return;
    update((r) => C.markDone(r, Date.now()));
    if (prev !== "reading") return;
    const r = recRef.current;
    const count = r.passed.length + r.answered.length;
    if (count === 0 || sealedRef.current) return;
    sealedRef.current = true;
    setSealed(true);
    // the dev demo desk doesn't put her on the lock screen
    if (!demoRef.current) depsRef.current.seal(dayRef.current, { read: count, waiting: waitingRef.current });
  }, [phase, update]);

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
  // paused when the letter on screen changes and when the tab loses focus (lib/voice-playback)
  const voice = useVoicePlayback({ pauseOn: currentId ?? "" });
  // read at the moment of a tap, so the actions object keeps its identity across renders
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const voiceUrlRef = useRef(voiceUrl);
  voiceUrlRef.current = voiceUrl;

  /* ── the cards ── */
  const fmt = useMemo<C.TodayFormat>(
    () => ({
      t,
      has: hasString,
      postmark: (iso) => postmark(iso),
      postNo: (uid) => postNo(uid),
      penPal: (uid, o) => penPalName(uid, { upper: o.upper, compact: o.compact }),
      clock: (s) => clock(s),
      clockHour: (h) => {
        const d = new Date();
        d.setHours(h, 0, 0, 0);
        return clockTime(d);
      },
      stampTime: (ms) => `${postmark(ms)} · ${clockTime(ms)}`,
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
  const bringBackNow = C.canBringBack(rec) && phase === "reading";
  const cards = useMemo(
    () =>
      C.buildCards(
        unpassed.map((letter) => ({ letter, offer: translateOffer(letter), xl: xl[letter.id] ?? null, signal: signals[letter.id] ?? null, voiceReady: !!voiceUrl(letter) })),
        tk.sf,
        fmt,
        { bringBackOnFirst: bringBackNow },
      ),
    // lang: the translate offer reads the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unpassed, xl, signals, voiceUrl, tk.sf, fmt, lang, bringBackNow],
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
  /* the letter the courier is carrying (the fly-by's "to"), whichever card is showing */
  const [sendingTo, setSendingTo] = useState<PoolLetter | null>(null);
  /* she takes the letter: one more each time a reply leaves the phone (past
     the local screen), so the renderers fly Wren off the band with it */
  const [carry, setCarry] = useState(0);
  const draft = current ? drafts[current.id] ?? "" : "";
  /** the send key and the hint for any letter's draft (the one on screen, or the reader's) */
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
  /* THE READER FOLDS BACK, whoever closes it: its ✕, a swipe down, a send
     (LetterReader), or its letter leaving the desk under it. The desk's
     field takes the draft again (the epoch), and a pouch sheet raised
     inside the reader goes with it (it is drawn there, LetterReader). */
  const closeReader = useCallback(() => {
    setReaderId(null);
    setFlightFull(false);
    setDraftEpoch((e) => e + 1);
  }, []);
  /* its letter left while it was open (the day turning at eight, a block, a
     reload): the reader is closed in the same render it stops drawing
     (LetterReader draws only a letter on the desk), so the band never stays
     hidden behind a reader nobody can see, and the draft epoch still moves */
  const readerGone = readerId != null && !feed.some((l) => l.id === readerId);
  const openReaderId = readerGone ? null : readerId;
  useEffect(() => {
    if (readerGone) closeReader();
  }, [readerGone, closeReader]);
  /* the letter a blocked send was aimed at, so signing in resumes THAT one */
  const pendingReply = useRef<PoolLetter | null>(null);

  const isGuest = () => depsRef.current.guest?.() ?? sessionGuest;

  /* letters leave the desk (answered, refused, blocked): the record says
     so; legacy, the step-5 stack's page stays where it is (the next letter
     slides into it) and is told where that is */
  const legacyFollow = useCallback((gone: ReadonlySet<string>) => {
    const list = unpassedRef.current;
    const i = idxRef.current;
    if (!list.some((l) => gone.has(l.id))) return;
    const next = list.filter((l) => !gone.has(l.id));
    const before = list.slice(0, Math.min(i, list.length)).filter((l) => gone.has(l.id)).length;
    const at = Math.max(0, Math.min(i - before, next.length));
    setIdx(at);
    setAnchor((a) => ({ id: next[at]?.id ?? "", serial: a.serial + 1 }));
  }, []);
  const answered = useCallback(
    (id: string) => {
      legacyFollow(new Set([id]));
      update((r) => C.answerLetter(r, id));
    },
    [legacyFollow, update],
  );
  const dropped = useCallback(
    (id: string) => {
      legacyFollow(new Set([id]));
      update((r) => C.dropLetters(r, [id]));
    },
    [legacyFollow, update],
  );
  const removeAuthor = useCallback(
    (author: string) => {
      legacyFollow(new Set(feedRef.current.filter((l) => l.author === author).map((l) => l.id)));
      update((r) => C.dropAuthor(r, author));
    },
    [legacyFollow, update],
  );

  /* THE LETTER BEING ANSWERED IS PASSED IN, never read from the screen: a
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
        setCarry((n) => n + 1); // the letter goes: she takes it
      } else {
        /* the synchronous local screen (contact details); the model gate lives in compose */
        if (!d.screen(text).ok) {
          sendingRef.current = false;
          setSending(false);
          answer(serial);
          blurThen(() => Alert.alert(t("cp.gate.title", { wren }), t("cp.gate.body")), viewRef);
          return; // the draft stays in the box
        }
        setCarry((n) => n + 1); // past the screen the letter goes: she takes it
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
          if (action === "remove") dropped(to.id);
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
      /* AND IT LEAVES THE DESK: that is the design's auto-next (the next
         letter comes on screen), and done when it was the last one */
      answered(to.id);
    },
    // forceFull, wren and the guest rule are read at the moment; the rest are refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [forceFull, wren, sessionGuest, answer, changeDraft, answered, dropped],
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

  /* ── her letter, the window ── */
  const canPlay = source.canPlay;
  const canPlayRef = useRef(canPlay);
  canPlayRef.current = canPlay;
  const factsCount = rec.passed.length + rec.answered.length;
  const repliedCount = rec.answered.length;
  const wrenLetter = useMemo(
    () => C.buildWrenLetter({ facts: { count: factsCount, replied: repliedCount, waiting: source.waiting, canPlay }, name: wren, doneAt: rec.doneAt, now }, fmt),
    [factsCount, repliedCount, source.waiting, canPlay, wren, rec.doneAt, now, fmt],
  );
  const light = daylight(hour);
  const flightWindow = useMemo(() => C.buildWindow({ canPlay, name: wren, countdown: wrenLetter.countdown, sky: C.windowSky(PALETTE[light], light === "night") }, t), [canPlay, wren, wrenLetter.countdown, light, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  /* legacy: the blind's slip — the letters landed on today (kept in the record), what was answered, who's waiting */
  const facts = useMemo(() => ({ read: Math.max(rec.seen.length, factsCount), replied: repliedCount, waiting: source.waiting }), [rec.seen.length, factsCount, repliedCount, source.waiting]);
  const factsRef = useRef(facts);
  factsRef.current = facts;

  const act = useMemo<TodayActions>(
    () => ({
      pass: (id) => update((r) => C.passLetter(r, id)),
      bringBack: () => update(C.bringBack),
      replyOpen: (id) => {
        if (id === currentRef.current?.id) markReadNow(id);
      },
      window: () => {
        if (canPlayRef.current) blurThen(() => depsRef.current.openWindow(), viewRef);
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
      closeReader,
      closeFlightSheet: () => setFlightFull(false),
      closeSignUp: () => setNeedsAccount(false),
      signedIn: () => {
        setNeedsAccount(false);
        // the letter that raised the sheet, never whatever is on screen now
        const to = pendingReply.current;
        if (to) void send(to.id);
      },
      blocked: removeAuthor,

      // legacy
      settle: (i) => setIdx(Math.max(0, Math.min(i, unpassedRef.current.length))),
      goto: (i) => {
        const l = unpassedRef.current[i];
        if (!l) return;
        setIdx(i);
        requestScroll(l.id, true);
      },
      toTop: () => {
        setIdx(0);
        requestScroll("top", true);
      },
      openDeskStrip: () => {},
      seal: () => {
        if (sealedRef.current) return;
        sealedRef.current = true;
        setSealed(true);
        depsRef.current.seal(dayRef.current, { read: factsRef.current.read, waiting: factsRef.current.waiting });
      },
      grab: setHeld,
    }),
    [update, markReadNow, changeDraft, send, cardAction, closeReader, removeAuthor, requestScroll],
  );

  /* ── the words ── */
  const strings = useMemo<TodayStrings>(
    () => ({
      title: t("ld.today"),
      next: t("ld.next"),
      reply: t("ld.replyBtn"),
      replyA11y: t("ld.reply.a11y"),
      unfold: t("ld.unfold"),
      unfoldA11y: t("ld.unfold.a11y"),
      voiceLetter: t("ld.voiceLetter"),
      more: t("rp.menu.a11y"),
      nextA11y: t("ld.next.a11y"),
      bringBack: t("ld.bringBack"),
      play: t("vo.play"),
      pause: t("vo.pause"),
      send: t("ld.send"),
      placeholder: t("ld.writeBackPh"),
      offlineTitle: t("net.offline.title"),
      offlineBody: t("ld.offlineDesk"),
      loadingA11y: t("ld.loading.a11y"),
      pass: t("ld.pass"),
      previous: t("ld.prev.a11y"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );

  /* Wren at rest on the band: sleepy in her night hours, wilted while starving (today-cards wrenRest) */
  const rest = C.wrenRest({ hour, wilt: source.wilt });

  const left = unpassed.length;
  // only over letters she brought back, and only while the first three are up: a quiet day draws no arrival, in either renderer
  const arrivalOpen = C.arrivalShows({ fresh: source.fresh, onDesk: left }) && phase === "reading" && rec.passed.length < C.ARRIVAL_LETTERS;
  const states = C.envelopeStates(idx + rec.passed.length);
  const stateWord = { opened: t("ld.env.read"), current: t("ld.env.open"), sealed: t("ld.env.sealed") };
  const arrival = {
    open: arrivalOpen,
    line: t(source.sent ? "ld.arrived" : "ld.arrivedKept"),
    states,
    labels: states.map((_, i) => t("ld.env.a11y", { n: i + 1, total: states.length })),
    values: states.map((s) => stateWord[s]),
  };

  const view: TodayView = {
    phase,
    loaded: source.loaded,
    demo,
    feed,
    cards,
    left,
    leftA11y: left === 1 ? t("ld.left.a11y.1") : t("ld.left.a11y", { n: left }),
    current,
    titleLocked: rec.passed.length > 0 || phase === "done",
    canBringBack: bringBackNow,
    arrival,
    freshUnfold: arrivalOpen,
    reply: { letterId: current?.id ?? "", draft, preview: C.draftPreview(draft), state: replyNow },
    sending,
    slow,
    toast,
    hideBand: sending || openReaderId != null,
    // on Today the + always opens the two round buttons (owner, 2026-10-18: the sheet is for the other tabs)
    plus: plusOpen ? "pop" : "closed",
    wrenLetter,
    window: flightWindow,
    night: isNightHour(hour),
    wren: { name: wren, stage: source.stage, wilt: rest.wilt, rest: rest.face, carry, a11y: t("me.sec.courier") },
    draftEpoch,
    answeredSerial,
    readerId: openReaderId,
    flyTo: sendingTo?.author ? penPalName(sendingTo.author, { upper: true, compact: true }) : null,
    strings,

    // legacy
    quiet: source.loaded && feed.length === 0,
    idx,
    atEnd,
    plateRight: !source.loaded ? "" : feed.length === 0 ? t("ld.closed") : atEnd ? t("ld.allRead") : "",
    deskStrip: "",
    facts,
    sealed,
    held,
    anchor,
    scroll,
    pillHidden: sending || openReaderId != null || plusOpen,
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
