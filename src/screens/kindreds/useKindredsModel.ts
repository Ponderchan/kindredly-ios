import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import { getLang, t, useLang } from "../../lib/i18n";
import { listWhen, localeTag, penPalName } from "../../lib/format";
import { markRoomSeen, markRoomUnread, readRoomSeen } from "../../lib/room-seen";
import {
  blockUser,
  fetchThreadMessages,
  fetchThreadsResult,
  forgetThread,
  readThreadDetailCache,
  readThreadsCache,
  reportContent,
  theirLatest,
  threadsAge,
  type ThreadSummary,
  type ThreadsResult,
} from "../../lib/db";
import { useMyThreadsLive } from "../../lib/live";
import { useAuth } from "../../lib/auth";
import { useEntitlement } from "../../lib/entitlement";
import { setWaiting } from "../../lib/waiting";
import { markWork } from "../../lib/stall-probe";
import { speakAs, useWrenName } from "../../lib/wren-name";
import { OFFICIAL_NAME, WREN_ROOM } from "../../lib/wren-desk";
import { DEMO_TEXT, storeMode } from "../../lib/dev-store";
import { demoListMode, demoThreads, withDemoRoomSeen } from "../../data/demo";
import { useWrenDesk } from "../../components/WrenDesk";
import { useNotifyBanner } from "../../components/NotifyBanner";
import { dismissWrenOnce, useWrenOnce } from "../../components/WrenSaysOnce";
import "../../data/strings-step5-kindreds";
import {
  buildKindredsView,
  listed,
  threadById,
  type KindredsFormat,
  type KindredsView,
  type ListTab,
  type LoadState,
  type MenuKey,
  type Show,
} from "./kindreds-model";

/* THE KINDREDS TAB'S MODEL HOOK (10a step 5): everything the tab knows
   and does, for whichever renderer draws it — KindredsNative (SwiftUI) or
   KindredsRN (the remote switch's React Native fallback). The rules live
   in kindreds-model (pure, node-tested); this hook only gathers the facts
   and does the side effects:

   - the list: the kept copy at once (only until a real answer), then the
     network when the list is more than 15s old, then live pokes (one
     realtime burst shares the tabs layout's read: fetchThreadsResult
     de-duplicates a read already in flight). A guest without a session is
     a real answer ("none": the empty state); a failed read keeps what it
     had, and with nothing kept says so ("failed": an offline line, never
     "Nobody knows your name yet");
   - the room-seen ledger (on focus, and after mark read / unread);
   - the entitlement (premium, settled), her desk (useWrenDesk, which also
     feeds the tab's number), the notifications bar (useNotifyBanner), her
     once-line (useWrenOnce);
   - the tab (ALL / KINDREDS / PEN PALS) and the your-turn filter, kept for
     the session;
   - the tab bar's waiting count (setWaiting) from the same number the
     title shows;
   - every tap: rows to their room or chat, the menus (rekindle, mark read
     or unread on this phone, their page, report, block), the band's
     report, the hints, the notice;
   - report (their freshest words as the snapshot, then an Alert) and block
     (the shared sheet, asked once; the row goes at once, then the list is
     read again).

   Dev builds (never a release): an empty account, or store mode, shows the
   demo rows (data/demo demoThreads, with the seeded ledger so kindreds
   have numbers); data/demo's dev switch can ask for the empty or offline
   state instead. Demo rows have no menu. */

/** A scroll the renderer should do (the title's tap): its serial makes two taps two scrolls. */
export type KindredsScroll = { serial: number; target: "top" | "list" };

/** Every tap the tab answers, the same object for the life of the screen. */
export type KindredsActions = {
  openRow: (id: string) => void;
  rowAction: (id: string, key: string) => void;
  openWren: () => void;
  openFold: () => void;
  openFoldFace: (id: string) => void;
  chip: (key: string) => void;
  title: () => void;
  clear: () => void;
  hint: (kind: "kindreds" | "penpals") => void;
  notice: (action: "turnOn" | "close") => void;
  wrenLine: () => void;
  band: (open: boolean, via: string) => void;
  confirmBlock: () => void;
  cancelBlock: () => void;
};

export type KindredsModel = {
  view: KindredsView;
  loadState: LoadState;
  /** draw the React Native empty state instead of either list */
  empty: boolean;
  /** named kindreds that haven't expired (the Plush moment) */
  named: number;
  scroll: KindredsScroll;
  /** the block question is up, about this row */
  blocking: string | null;
  blockBusy: boolean;
  act: KindredsActions;
};

/* the tab and the filter last while the app is open; a fresh launch starts
   at ALL, unfiltered */
const session: { tab: ListTab; show: Show } = { tab: "all", show: null };

/** The model's words: i18n's t and the reader's locale. */
export function kindredsFormat(): KindredsFormat {
  const tag = localeTag();
  return {
    t,
    when: (at) => listWhen(at),
    penPal: (other) => penPalName(other),
    // a group name as a sentence says it ("Pen pals", "Seelenverwandte")
    sentence: (s) => {
      const low = s.toLocaleLowerCase(tag);
      return low.charAt(0).toLocaleUpperCase(tag) + low.slice(1);
    },
    upper: (s) => s.toLocaleUpperCase(tag),
  };
}

export function useKindredsModel(): KindredsModel {
  const router = useRouter();
  const lang = useLang(); // the words follow the reader's language
  const { user } = useAuth();
  const { premium, settled } = useEntitlement();
  const { nb } = useGlobalSearchParams<{ nb?: string }>();
  const desk = useWrenDesk();
  const notify = useNotifyBanner({ preview: nb === "1" });
  const courier = useWrenName(); // the reader's own Wren, for her line and the report answer

  /* ── the list ── */
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [ledger, setLedger] = useState<Record<string, number>>({});
  const answered = useRef(false); // the network has answered (ok or no session)
  const kept = useRef(false); // a list is showing (kept or fresh)

  const apply = useCallback((r: ThreadsResult) => {
    if (r.status === "ok") {
      answered.current = true;
      kept.current = true;
      setThreads(r.threads);
      setLoadState("ready");
    } else if (r.reason === "no-session") {
      // a real answer: nobody is signed in, so there is nothing to list
      answered.current = true;
      kept.current = false;
      setThreads([]);
      setLoadState("none");
    } else {
      console.log(`[kindreds] the list couldn't be read (${r.reason}); ${kept.current ? "keeping what's showing" : "nothing kept"}`);
      if (!kept.current) setLoadState("failed");
    }
  }, []);

  const refreshSeen = useCallback(() => readRoomSeen().then(setLedger), []);

  const load = useCallback(() => {
    let alive = true;
    void readRoomSeen().then((l) => alive && setLedger(l));
    void readThreadsCache().then((c) => {
      if (alive && c && !answered.current) {
        kept.current = true;
        setThreads(c);
        setLoadState("ready");
      }
    });
    if (threadsAge() > 15) {
      markWork("kindreds:fetch");
      void fetchThreadsResult().then((r) => alive && apply(r));
    }
    return () => {
      alive = false;
    };
  }, [apply]);
  useFocusEffect(load);
  // a reply lands on its ring live
  const reload = useCallback(() => {
    void fetchThreadsResult().then(apply);
  }, [apply]);
  useMyThreadsLive(user?.id, reload);

  /* ── dev: the demo rows in place of an empty account ── */
  const answeredState = loadState !== "loading";
  const mode = __DEV__ ? demoListMode() : "demo";
  const useDemo = __DEV__ && answeredState && (storeMode || (threads.length === 0 && mode === "demo"));
  const source = useMemo<ThreadSummary[]>(() => {
    if (!useDemo) return threads;
    const rows = demoThreads({ store: storeMode });
    if (!storeMode || getLang() === "en") return rows;
    // English keeps each row's own line; other languages rotate their five
    const d = DEMO_TEXT[getLang()];
    const lines = [d.b1, d.b2, d.b3, d.b4, d.b5];
    return rows.map((r, i) => ({ ...r, preview: r.preview ? lines[i % 5] : r.preview }));
    // lang: the store rows' lines are in the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDemo, threads, lang]);
  const effLedger = useMemo(() => (useDemo ? withDemoRoomSeen(ledger) : ledger), [useDemo, ledger]);
  // the demo rows stand in for an answer; the dev switch's empty / offline for an empty account
  const effState: LoadState = !__DEV__ || !answeredState
    ? loadState
    : useDemo
      ? "ready"
      : threads.length === 0 && !storeMode && mode !== "demo"
        ? mode === "empty" ? "none" : "failed"
        : loadState;

  /* ── the tab, the filter ── */
  const [tab, setTabState] = useState<ListTab>(session.tab);
  const [show, setShowState] = useState<Show>(session.show);
  const setTab = useCallback((v: ListTab) => {
    session.tab = v;
    setTabState(v);
  }, []);
  const setShow = useCallback((v: Show) => {
    session.show = v;
    setShowState(v);
  }, []);
  const [scroll, setScroll] = useState<KindredsScroll>({ serial: 0, target: "top" });

  /* her once-line, only while the list (not the empty state) can be seen */
  const listVisible = effState !== "loading" && !(listed(source).length === 0 && (effState === "ready" || effState === "none"));
  const onceShowing = useWrenOnce("kindreds", listVisible);

  const view = useMemo(
    () =>
      buildKindredsView(
        {
          threads: source,
          ledger: effLedger,
          premium,
          settled,
          tab,
          show,
          loadState: effState,
          desk: { unread: desk.unread, lastLine: desk.lastLine, lastAt: desk.lastAt },
          wrenName: OFFICIAL_NAME,
          notice: notify.show,
          wrenLine: onceShowing ? speakAs(t("kindreds.said"), courier) : null,
        },
        kindredsFormat(),
      ),
    // lang: every word is the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source, effLedger, premium, settled, tab, show, effState, desk.unread, desk.lastLine, desk.lastAt, notify.show, onceShowing, courier, lang],
  );

  // the tab bar's number, from the count the title shows
  useEffect(() => setWaiting(view.waiting), [view.waiting]);

  /* ── report and block ── */
  const [blocking, setBlocking] = useState<string | null>(null);
  const [blockBusy, setBlockBusy] = useState(false);

  // the latest of everything a tap reads, so `act` stays one object
  const live = useRef({ source, effLedger, blocking, blockBusy, courier, notify });
  live.current = { source, effLedger, blocking, blockBusy, courier, notify };

  const act = useMemo<KindredsActions>(() => {
    const find = (id: string) => threadById(live.current.source, id);
    const open = (th: ThreadSummary) => router.push(th.revealed ? `/room/${th.id}` : `/chat/${th.id}`);

    const reportRow = async (th: ThreadSummary) => {
      /* their newest words: fetched now (the room's cache can be days behind
         the row's preview), then the cache, then the list's own copy */
      const d = (await fetchThreadMessages(th.id)) ?? (await readThreadDetailCache(th.id));
      const snapshot = theirLatest(d?.messages, d?.openingFromMe ? null : d?.opening) ?? th.theirTexts?.[th.theirTexts.length - 1];
      const ok = await reportContent({ targetUser: th.other, context: "thread", refId: th.id, reason: "other", snapshot });
      if (ok) Alert.alert(t("rp.reportedTitle"), t("rp.reportedBody", { wren: live.current.courier }));
      else Alert.alert(t("rp.failed"), t("rp.failedBody"));
    };

    const doBlock = async () => {
      const id = live.current.blocking;
      const th = id ? find(id) : undefined;
      if (!th || live.current.blockBusy) return;
      setBlockBusy(true);
      const ok = await blockUser(th.other);
      setBlockBusy(false);
      setBlocking(null);
      if (!ok) {
        Alert.alert(t("rp.blockFailed"), t("rp.failedBody"));
        return;
      }
      // gone from both lists at once (0024); the read confirms it
      setThreads((list) => list.filter((x) => x.id !== th.id));
      await forgetThread(th.id);
      void fetchThreadsResult().then(apply);
    };

    const menu: Record<MenuKey, (th: ThreadSummary) => void> = {
      rekindle: () => router.push("/paywall?src=rekindle"),
      read: (th) => void markRoomSeen(th.id, th.theirs).then(refreshSeen),
      unread: (th) => void markRoomUnread(th.id, th.theirs).then(refreshSeen),
      page: (th) => router.push(`/kindred/${th.id}`),
      report: (th) => void reportRow(th),
      block: (th) => setBlocking(th.id),
    };

    return {
      openRow: (id) => {
        const th = find(id);
        if (th) open(th);
      },
      rowAction: (id, key) => {
        const th = find(id);
        const run = menu[key as MenuKey];
        if (th && run) run(th);
      },
      openWren: () => router.push(`/room/${WREN_ROOM}`),
      openFold: () => setTab("penpals"),
      openFoldFace: (id) => {
        const th = find(id);
        if (th) open(th);
      },
      chip: (key) => {
        if (key === "all" || key === "kindreds" || key === "penpals") setTab(key);
      },
      // the title answers "is anything on me?"; tapped, it shows exactly those
      title: () => {
        setTab("all");
        setShow("your");
        setScroll((s) => ({ serial: s.serial + 1, target: "list" }));
      },
      clear: () => setShow(null),
      hint: (kind) => router.push(kind === "kindreds" ? "/room/wren?guide=kindreds" : "/(tabs)/letters"),
      notice: (action) => {
        if (action === "close") live.current.notify.close();
        else void live.current.notify.turnOn();
      },
      wrenLine: () => dismissWrenOnce("kindreds"),
      band: () => {},
      confirmBlock: () => void doBlock(),
      cancelBlock: () => {
        if (!live.current.blockBusy) setBlocking(null);
      },
    };
  }, [router, apply, refreshSeen, setTab, setShow]);

  return {
    view,
    loadState: effState,
    empty: view.empty,
    // demo kindreds never spend the one-time Plush moment
    named: useDemo ? 0 : view.named,
    scroll,
    blocking,
    blockBusy,
    act,
  };
}
