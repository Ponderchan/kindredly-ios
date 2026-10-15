import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { fetchThreadDetail, forgetThread, readThreadDetailCache, type ThreadDetail, type ThreadMessage } from "./db";
import { fetchFoldsFresh, readFoldsCache, type Fold } from "./folds";
import { useThreadLive } from "./live";
import { markRoomSeen } from "./room-seen";
import {
  initialDetailState,
  mergePending,
  reduceDetail,
  seenCountAfter,
  type DetailEvent,
  type DetailState,
  type OfflineReason,
  type SeenRule,
  type ThreadDetailResult,
  type ThreadDetailStatus,
} from "./thread-detail-core";

/* ONE WAY TO HOLD A THREAD ON SCREEN (10a step 5).
   ────────────────────────────────────────────────────────────────────────
   The room, the pen-pal chat, the one-letter reader and the kindred page
   each loaded a thread their own way, and three of the four went blank
   offline (known bug 1): two painted the cache and then replaced it with
   null, two had no cache at all. They now share this hook, and both
   renderers (SwiftUI and the React Native fallback) sit on top of it.

   The rules live in thread-detail-core (node-tested); this file is only
   the wiring: the phone's copy first, the fetch, folds beside the detail,
   live pokes, focus reloads, and the seen ledger. It never navigates —
   'missing' is a state the screen shows in place, and a screen holding a
   draft must not leave on its own. */

export type { OfflineReason, SeenRule, ThreadDetailStatus };

export interface UseThreadDetailOptions {
  /** also read and keep the thread's folds (the room). Default true. */
  folds?: boolean;
  /** mark lib/room-seen after each settled read: `true` = detail.otherCount
      (the room), or your own count / null to skip (chat marks only once
      names are traded). Offline, the painted cached copy is what is marked.
      Default false. */
  markSeen?: SeenRule | false;
  /** the screen's optimistic lines (sends in flight or just confirmed),
      laid over the server's list until it holds them — see mergePending.
      Pass a memoised array. */
  pending?: readonly ThreadMessage[];
  /** reload on the thread's realtime pokes (useThreadLive). Default true. */
  live?: boolean;
  /** reload whenever the screen gains focus. Default true; when false the
      hook reads once per id. */
  reloadOnFocus?: boolean;
}

export interface ThreadDetailView {
  /** what to paint: the fresh read, or the kept copy, or the last good read
      (kept through offline and missing answers). null = nothing known yet. */
  detail: ThreadDetail | null;
  /** the folds, [] until known (or when `folds: false`) */
  folds: Fold[];
  /** folds have been read (from the phone or the network) at least once */
  foldsKnown: boolean;
  /** idle (no id) | loading (no answer yet) | ok | offline | missing.
      'missing' = the server says this reader has no such thread (deleted,
      or hidden by a block): show the closed state in place; leave only if
      no draft is open. 'offline' with detail null = show an offline line,
      not an empty room. */
  status: ThreadDetailStatus;
  /** why the last read couldn't answer (status 'offline'), else null */
  reason: OfflineReason | null;
  /** the painted detail is the phone's copy, not a read made this session */
  fromCache: boolean;
  /** read again now; resolves to the status this read produced (or the
      current one if a newer read already answered) */
  reload: () => Promise<ThreadDetailStatus>;
  /** edit the painted detail locally (a line taken back, a count bumped);
      the next 'ok' read replaces it. Not written to the kept copy. */
  mutate: (fn: (d: ThreadDetail) => ThreadDetail) => void;
  /** edit the painted folds locally (a demo fold, an optimistic answer) */
  mutateFolds: (fn: (f: Fold[]) => Fold[]) => void;
}

type HookEvent =
  | DetailEvent
  | { type: "mutate"; fn: (d: ThreadDetail) => ThreadDetail }
  | { type: "mutateFolds"; fn: (f: Fold[]) => Fold[] };

function hookReducer(s: DetailState, e: HookEvent): DetailState {
  if (e.type === "mutate") return s.detail ? { ...s, detail: e.fn(s.detail) } : s;
  if (e.type === "mutateFolds") return { ...s, folds: e.fn(s.folds ?? []) };
  return reduceDetail(s, e);
}

const isDemoId = (id: string): boolean => __DEV__ && id.startsWith("demo-");

/**
 * A thread on screen, offline-safe. Cache first (detail and folds), then a
 * fresh read on mount and on every focus, and again on each realtime poke
 * (messages INSERT/UPDATE, folds INSERT, threads UPDATE). An 'ok' read
 * replaces what is painted; 'offline' keeps it; 'missing' keeps it, reports
 * the state, and forgets the thread's kept copies and its list row (so it
 * can't repaint). Dev 'demo-*' ids read the fixtures in data/demo (an id
 * with no fixture reads as missing).
 *
 *   const { detail, folds, status, reload, mutate } =
 *     useThreadDetail(id, { markSeen: true, pending });
 */
export function useThreadDetail(id: string | undefined, opts: UseThreadDetailOptions = {}): ThreadDetailView {
  const { folds: withFolds = true, live = true, reloadOnFocus = true, markSeen = false, pending } = opts;
  const [state, dispatch] = useReducer(hookReducer, !!id, initialDetailState);

  const idRef = useRef(id);
  idRef.current = id;
  const foldsRef = useRef(withFolds);
  foldsRef.current = withFolds;
  const stateRef = useRef(state);
  stateRef.current = state;
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /* reads are numbered; an answer applies only if no newer one has
     (a slow focus read can't undo a live poke's fresher answer) */
  const started = useRef(0);
  const applied = useRef(0);

  const reload = useCallback(async (): Promise<ThreadDetailStatus> => {
    const tid = idRef.current;
    if (!tid) return "idle";
    const n = ++started.current;
    let result: ThreadDetailResult;
    let folds: Fold[] | null = null;
    if (isDemoId(tid)) {
      const { demoDetail, demoFolds } = await import("../data/demo");
      const d = demoDetail(tid);
      result = d ? { status: "ok", detail: d } : { status: "missing" };
      folds = foldsRef.current ? demoFolds(tid) : null;
    } else {
      const [r, f] = await Promise.all([fetchThreadDetail(tid), foldsRef.current ? fetchFoldsFresh(tid) : Promise.resolve(null)]);
      result = r;
      folds = f;
      if (r.status === "missing") void forgetThread(tid);
    }
    if (!alive.current || idRef.current !== tid || n <= applied.current) return stateRef.current.status;
    applied.current = n;
    dispatch({ type: "result", result, folds });
    return result.status;
  }, []);

  // a new id: start over, paint the phone's copies, and read once if focus won't
  const focusRef = useRef(reloadOnFocus);
  focusRef.current = reloadOnFocus;
  useEffect(() => {
    applied.current = ++started.current;
    dispatch({ type: "reset", hasId: !!id });
    if (!id) return;
    let current = true;
    if (!isDemoId(id)) {
      void Promise.all([readThreadDetailCache(id), foldsRef.current ? readFoldsCache(id) : Promise.resolve(null)]).then(([d, f]) => {
        if (current && alive.current) dispatch({ type: "cache", detail: d, folds: f });
      });
    }
    if (!focusRef.current) void reload();
    return () => {
      current = false;
    };
  }, [id, reload]);

  useFocusEffect(
    useCallback(() => {
      if (reloadOnFocus && id) void reload();
    }, [reloadOnFocus, id, reload]),
  );

  useThreadLive(live ? id : undefined, reload);

  // what is on screen now is read — the fresh read, or offline the cached copy
  const markRef = useRef(markSeen);
  markRef.current = markSeen;
  useEffect(() => {
    if (!id) return;
    const n = seenCountAfter(state, markRef.current);
    if (n !== null) void markRoomSeen(id, n);
    // the rule is read from a ref; a change of rule alone doesn't re-mark
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, state.detail, state.status]);

  const mutate = useCallback((fn: (d: ThreadDetail) => ThreadDetail) => dispatch({ type: "mutate", fn }), []);
  const mutateFolds = useCallback((fn: (f: Fold[]) => Fold[]) => dispatch({ type: "mutateFolds", fn }), []);
  const detail = useMemo(() => mergePending(state.detail, pending), [state.detail, pending]);

  return {
    detail,
    folds: state.folds ?? NO_FOLDS,
    foldsKnown: state.folds !== null,
    status: state.status,
    reason: state.reason,
    fromCache: state.fromCache,
    reload,
    mutate,
    mutateFolds,
  };
}

const NO_FOLDS: Fold[] = [];
