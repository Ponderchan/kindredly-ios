import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, InteractionManager, Linking } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { getLang, t, useLang } from "../../lib/i18n";
import { localeTag, noteDay } from "../../lib/format";
import { reportContent, sendThreadMessage, takeBack, TAKEN_BACK, theirLatest, uploadMoment, type MessageQuote, type ThreadDetail, type ThreadMessage } from "../../lib/db";
import { useThreadDetail, type ThreadDetailStatus } from "../../lib/thread-detail";
import { answerFold, answerPick, leaveFold, leavePick, type Fold } from "../../lib/folds";
import { translate } from "../../lib/wren";
import { copyText } from "../../lib/clipboard";
import { offerTranslate } from "../../lib/lang-guess";
import { fetchSongTitle, parseSongUrl } from "../../lib/song";
import { sharedSongs, songNotice, type SharedSong } from "../../lib/shared-songs";
import { markMomentUsed, momentUsedToday, shotToday } from "../../lib/daily-moment";
import { saveToLore } from "../../lib/lore";
import { markNoticeSeen, readNoticesSeen } from "../../lib/notice-seen";
import { useEntitlement } from "../../lib/entitlement";
import { closingSoon, daysLeft as daysLeftOf, isExpired, quietDays as quietDaysOf } from "../../lib/kindred-expiry";
import { markWork } from "../../lib/stall-probe";
import { DEMO_TEXT, storeMode } from "../../lib/dev-store";
import { refreshFingerprint } from "../../lib/aura";
import { noteWrote } from "../../lib/local-push";
import { readCorrespondent, type CorrespondentRead } from "../../lib/correspondent";
import { noticeThings, type Notice } from "../../lib/notice";
import { noticeAboutUs, type KindredNotice } from "../../lib/kindred-read";
import { MOOD_STAMPS, getStamp, sname } from "../../data/stamps";
import { stampsHeard } from "../../lib/stamp-suggest";
import { customStampNow } from "../../lib/custom-stamps";
import { useWrenName } from "../../lib/wren-name";
import { alertFail } from "../../lib/fail";
import { scoped as AsyncStorage } from "../../lib/scoped-store";
import { useSlow } from "../../components/ui";
import { sheetWords } from "../../components/sheet-chrome";
import type { LightboxPhoto } from "../../components/PhotoLightbox";
import type { TraceAction, TraceKind } from "../../components/LeaveATrace";
import type { KChatDeck, KChatDeckAction, KChatPart } from "../../../modules/kindredly-ui/src/Conversation";
import {
  IDEA_WALK_START,
  PICK_WAITING_CAP,
  WAVE_REST_MS,
  buildDeck,
  deckAnother,
  deckPick,
  deckShuffle,
  deckStart,
  isWave,
  lastWaveAt,
  msToNextSky,
  picksWaiting,
  skyOf,
  skyWord,
  usedPicks,
  waveLine,
  type DeckWalk,
  type Sky,
  ROOM_CEREMONY_DAYS,
  conversation,
  foldKey,
  halfKey,
  ideaNow,
  ideaOrder,
  ideaPassed,
  isBareSong,
  lastWordAt,
  messageKey,
  nextTakeBackClose,
  roadOf,
  roomComposer,
  roomFolds,
  roomStream,
  theirCategories,
  withIdea,
  type ComposerFacts,
  type IdeaWalk,
  type MenuCtx,
  type RoomMode,
  type StreamItem,
  type Translations,
} from "./build-items";
import "../../data/strings-step5-chat";
// sp.*: the openers deck, This or That, the sky wave (imported here, not in build-items, which
// plain node loads for its tests and which can't reach lib/i18n's React Native imports)
import "../../data/strings-sparkle";

/* THE ROOM, AS A MODEL (10a step 5).
   ────────────────────────────────────────────────────────────────────────
   Everything room/[id].tsx used to do except draw: the thread on screen
   (useThreadDetail — cache first, offline-safe, folds kept beside it, the
   room marked seen on every settled read), the composer's state and every
   send (plain lines optimistic with a client key that survives the echo,
   folds, songs, a bare song link, the day's moment), the long-press
   actions, translations, take back, keep, report, Wren's notice, closing
   soon and the expired door, the shelf, the lightbox and the first
   signer's ceremony, and the ideas the Kindreds bar's Sparkle offers
   (chat composers B: which sentence, in the room's order, where the reader
   is in it; the React Native room's bubble), and the openers deck the
   SwiftUI room's ✦ opens instead (Sparkle, 2026-10-21: a Wave card under
   the sky now, four This or That cards walked per room; sending either,
   picking theirs, Wave Back). Both renderers sit on it — the SwiftUI conversation
   (ConversationNative) and the React Native fallback (RoomRN) — and tell
   it how to reach their own field and list through a ChatUi.

   Also here, and used by useLettersModel: useTranslations, usePendingLines,
   useTakeBackClock, useCorrespondentRead, useCeremony. */

/** How a renderer lets the model reach its field and its list. Stable for the screen's life. */
export type ChatUi = {
  /** give a field the keyboard after delayMs */
  focus(target: "body" | "prompt", delayMs: number): void;
  /** the model changed a field's words (a clear after a send, a restore after a failure, a
      seeded prompt): Swift's uncontrolled field is told; a controlled field needs nothing */
  seedText(target: "body" | "prompt", value: string): void;
  /** go to the end after delayMs (an own send, a reply begun, a fold sent) */
  scrollToEnd(animated: boolean, delayMs: number): void;
  /** go to an item and light it (a tapped quote) */
  jumpTo(key: string): void;
  /** put the keyboard away, then run fn (before any Alert, picker, sheet or push) */
  thenModal(fn: () => void): void;
};

/* ── shared pieces (the room and the pen-pal chat) ─────────────────────── */

/** Translations shown under lines, cached per key so "Show original" only hides one. */
export function useTranslations(ui: ChatUi, wren: string) {
  const [trans, setTrans] = useState<Translations>({});
  const transRef = useRef(trans);
  transRef.current = trans;
  const translateLine = useCallback(
    async (key: string, body: string) => {
      if (transRef.current[key]?.text) {
        setTrans((s) => ({ ...s, [key]: { ...s[key], shown: true } }));
        return;
      }
      setTrans((s) => ({ ...s, [key]: { shown: false, busy: true } }));
      const out = await translate(body, getLang());
      setTrans((s) => ({ ...s, [key]: out ? { text: out, shown: true } : { shown: false } }));
      if (!out) ui.thenModal(() => Alert.alert(t("th.noTransTitle", { wren }), t("th.noTransBody")));
    },
    [ui, wren],
  );
  const hideTranslation = useCallback((key: string) => setTrans((s) => ({ ...s, [key]: { ...s[key], shown: false } })), []);
  return { trans, setTrans, translateLine, hideTranslation };
}

/* lines sent from here and not yet seen in the server's list */
let clientSeq = 0;

/**
 * The screen's optimistic lines. Each gets a client key that is its row's key for good: while it
 * is in flight, once the send returns its id, and after the server's echo replaces it (the id is
 * mapped to the client key), so the row never churns and a translation keyed on it survives.
 */
export function usePendingLines() {
  const [pending, setPending] = useState<ThreadMessage[]>([]);
  const keys = useRef(new WeakMap<ThreadMessage, string>());
  const byServerId = useRef(new Map<string, string>());
  const keyOf = useCallback((m: ThreadMessage): string => keys.current.get(m) ?? (m.id ? byServerId.current.get(m.id) : undefined) ?? messageKey(m), []);
  /** a new line; returns its client key */
  const add = useCallback((line: ThreadMessage): string => {
    const key = `c:${Date.now().toString(36)}:${++clientSeq}`;
    keys.current.set(line, key);
    setPending((p) => [...p, line]);
    return key;
  }, []);
  /** the send failed: the line goes */
  const drop = useCallback((line: ThreadMessage) => setPending((p) => p.filter((x) => x !== line)), []);
  /** the send returned its id and time; `echoed` = the server's list already shows it under its id */
  const settle = useCallback((line: ThreadMessage, id: string, createdAt: string | undefined, echoed: boolean) => {
    const key = keys.current.get(line);
    if (echoed) {
      // the echo won the race and is drawn under its own id: keep that, drop the ghost
      setPending((p) => p.filter((x) => x !== line));
      return;
    }
    const next: ThreadMessage = { ...line, id, date: createdAt || line.date };
    if (key) {
      keys.current.set(next, key);
      byServerId.current.set(id, key);
    }
    setPending((p) => p.map((x) => (x === line ? next : x)));
  }, []);
  /** forget lines the server's list now holds (mergePending already hides them) */
  const prune = useCallback((serverIds: ReadonlySet<string>) => {
    setPending((p) => {
      const left = p.filter((x) => !(x.id && serverIds.has(x.id)));
      return left.length === p.length ? p : left;
    });
  }, []);
  return { pending, keyOf, add, drop, settle, prune, keys };
}

/** Date.now(), redrawn when the next take-back window closes, so a menu never offers a take back
    the server would refuse. */
export function useTakeBackClock(messages: readonly ThreadMessage[] | undefined, skewMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const wait = nextTakeBackClose(messages ?? [], Date.now(), skewMs);
    if (wait === null) return;
    const id = setTimeout(() => setNow(Date.now()), wait);
    return () => clearTimeout(id);
  }, [messages, skewMs, now]);
  return now;
}

/** The read of their writing, after the transition has landed (stall probe, 2026-09-20). A line
    taken back is nobody's writing. */
export function useCorrespondentRead(detail: ThreadDetail | null): CorrespondentRead | null {
  const [read, setRead] = useState<CorrespondentRead | null>(null);
  useEffect(() => {
    if (!detail) return;
    const task = InteractionManager.runAfterInteractions(() => {
      markWork("read:correspondent");
      // a wave's line is the app's words, not theirs
      const theirs = detail.messages.filter((m) => !m.mine && !m.recalledAt && m.body !== TAKEN_BACK && m.kind !== "wave").map((m) => m.body);
      if (!detail.openingFromMe && detail.opening) theirs.unshift(detail.opening);
      setRead(readCorrespondent(theirs, detail.revealed));
    });
    return () => task.cancel();
  }, [detail]);
  return read;
}

/* one introduction per thread, ever — the ceremony is a moment, not a recurring screen */
const SEEN_KEY = "kindredly_introductions";
export async function introduceOnce(threadId: string, show: () => void): Promise<void> {
  try {
    const seen: string[] = JSON.parse((await AsyncStorage.getItem(SEEN_KEY)) || "[]");
    if (seen.includes(threadId)) return;
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...seen, threadId]));
  } catch {
    /* if the ledger is unreadable, showing twice beats never showing */
  }
  show();
}

/**
 * THE INTRODUCTION, held for whoever arrives after the second signature — including the one who
 * signed FIRST and finds out later (critic: every list sends a revealed thread to the room, so
 * the room runs it too, for a reveal this recent). The road (five letters each way) and what Wren
 * noticed come with it.
 */
export function useCeremony(id: string | undefined, detail: ThreadDetail | null, status: ThreadDetailStatus, opts: { recentOnly: boolean }) {
  const [ceremony, setCeremony] = useState(false);
  const revealed = !!detail?.revealed;
  const revealedAt = detail?.revealedAt ?? null;
  const settled = status === "ok";
  useEffect(() => {
    if (!id || !revealed || !settled) return;
    if (opts.recentOnly) {
      const at = revealedAt ? Date.parse(revealedAt) : NaN;
      if (!Number.isFinite(at) || Date.now() - at > ROOM_CEREMONY_DAYS * 86_400_000) return;
    }
    void introduceOnce(id, () => setCeremony(true));
  }, [id, revealed, revealedAt, settled, opts.recentOnly]);
  const road = useMemo(() => (detail ? roadOf(detail.messages) : []), [detail]);
  const [kindredNotice, setKindredNotice] = useState<KindredNotice | null>(null);
  useEffect(() => {
    if (!ceremony || !detail) return;
    let alive = true;
    noticeAboutUs(detail.messages.filter((m) => !m.mine), new Date().toISOString()).then((n) => alive && setKindredNotice(n));
    return () => {
      alive = false;
    };
  }, [ceremony, detail]);
  return { ceremony, setCeremony, road, kindredNotice };
}

/** The ids of the server's lines (not ours in flight), to prune the pending list. */
function serverIdsOf(detail: ThreadDetail | null, isPending: (m: ThreadMessage) => boolean): Set<string> {
  const ids = new Set<string>();
  for (const m of detail?.messages ?? []) if (m.id && !isPending(m)) ids.add(m.id);
  return ids;
}

/* ── the ideas (the Kindreds bar's Sparkle) ────────────────────────────── */

/* where the reader is in each room's ideas, for the app's life: leaving a
   room and coming back goes on from the next sentence, never from the first
   again (a fresh launch starts the room's order over). A walk keeps the
   sentences it moved past, not a position (build-items IdeaWalk), so their
   categories moving under it never brings one round early. */
const ideaWalks = new Map<string, IdeaWalk>();

/* the openers deck's This or That walk per room, for the app's life (leaving the room keeps
   the cards on the table); a language change starts it over in the new words */
const deckWalks = new Map<string, { lang: string; walk: DeckWalk }>();
/** how long the cap line stays on the composer's status line */
const CAP_NOTE_MS = 6000;

/** how many of their latest letters and lines are read for the categories they write in */
const IDEA_READ = 24;

/* ── demo rooms (dev) ──────────────────────────────────────────────────── */

/* DEMO ROOMS DO NOT REACH THE DATABASE. The fixtures exist so every state
   can be seen on a simulator; every write from one lands in local state
   (pending lines, local folds, a local take-back), the only honest thing a
   fixture can do. demo-mira keeps the extras it always had (three songs and
   a moment), and in store mode its five lines in the current language. */
function demoView(id: string, d: ThreadDetail): ThreadDetail {
  if (id !== "demo-mira") return d;
  if (storeMode) {
    const s = DEMO_TEXT[getLang()];
    const h = 3600_000;
    const at = (ago: number) => new Date(Date.now() - ago * h).toISOString();
    return {
      ...d,
      opening: s.letter,
      messages: [
        { id: "store-1", body: s.b1, mine: false, date: at(80) },
        { id: "store-2", body: s.b2, mine: true, date: at(64) },
        { id: "store-3", body: s.b3, mine: false, date: at(40) },
        { id: "store-4", body: s.b4, mine: true, date: at(30) },
        { id: "store-5", body: s.b5, mine: false, date: at(2) },
      ],
    };
  }
  return {
    ...d,
    messages: [
      ...d.messages,
      { id: "demo-mira-x1", body: "Nightcall — https://open.spotify.com/track/demo1", mine: false, date: "2026-08-29T23:40:00Z", kind: "song", meta: { url: "https://open.spotify.com/track/demo1", title: "Nightcall" } },
      { id: "demo-mira-x2", body: "Motion Picture Soundtrack — https://youtu.be/demo2", mine: true, date: "2026-08-30T01:10:00Z", kind: "song", meta: { url: "https://youtu.be/demo2", title: "Motion Picture Soundtrack" } },
      { id: "demo-mira-x3", body: "Alaska — https://open.spotify.com/track/demo3", mine: false, date: "2026-08-31T02:05:00Z", kind: "song", meta: { url: "https://open.spotify.com/track/demo3", title: "Alaska" } },
      // a tiny moment, so the photo and its lightbox can be checked by eye
      { id: "demo-mira-x4", body: t("rm.moment.fallback"), mine: false, date: "2026-08-31T03:00:00Z", kind: "photo", meta: { url: Image.resolveAssetSource(require("../../../assets/icon.png")).uri } },
    ],
  };
}

/* ── the room ──────────────────────────────────────────────────────────── */

export type RoomModelOptions = {
  ui: ChatUi;
  /** dev: ?expired=1 / ?closing=1 on a demo room */
  expiredParam?: string;
  closingParam?: string;
};

export function useRoomModel(id: string | undefined, { ui, expiredParam, closingParam }: RoomModelOptions) {
  useLang(); // repaint on language change
  const router = useRouter();
  const wren = useWrenName();
  const isDemo = !!id?.startsWith("demo-");

  const lines = usePendingLines();
  const { detail: raw, folds: loadedFolds, status, reload, mutateFolds } = useThreadDetail(id, { markSeen: true, pending: lines.pending });
  /* the store screenshots' room is its five lines in the reader's language, no English folds
     between them (room/[id].tsx returned before loading folds in store mode) */
  const folds = roomFolds(loadedFolds, { id, storeMode: __DEV__ && storeMode });

  /* a line taken back shows its note at once, before the reload confirms it */
  const [takenLocal, setTakenLocal] = useState<ReadonlySet<string>>(() => new Set());
  const detail = useMemo(() => {
    if (!raw) return raw;
    let d = __DEV__ && id ? demoView(id, raw) : raw;
    if (takenLocal.size) {
      d = { ...d, messages: d.messages.map((m) => (m.id && takenLocal.has(m.id) && !m.recalledAt ? { ...m, body: TAKEN_BACK, recalledAt: new Date().toISOString() } : m)) };
    }
    return d;
  }, [raw, takenLocal, id]);
  const detailRef = useRef(detail);
  detailRef.current = detail;

  // forget lines the server now holds
  useEffect(() => {
    if (status === "ok") lines.prune(serverIdsOf(raw, (m) => lines.keys.current.has(m)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, status]);

  const [momentSpent, setMomentSpent] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      markWork("room:load");
      let alive = true;
      momentUsedToday(id).then((spent) => alive && setMomentSpent(spent));
      return () => {
        alive = false;
      };
    }, [id]),
  );

  const [text, setTextState] = useState("");
  const textRef = useRef("");
  /** the reader's edits (RN onChangeText, Swift onChatText) */
  const setText = useCallback((v: string) => {
    textRef.current = v;
    setTextState(v);
  }, []);
  /** the model's own change to the words: Swift's uncontrolled field is told too */
  const putText = useCallback(
    (v: string) => {
      textRef.current = v;
      setTextState(v);
      ui.seedText("body", v);
    },
    [ui],
  );
  const [sending, setSendingState] = useState(false);
  const sendingRef = useRef(false);
  const setSending = (v: boolean) => {
    sendingRef.current = v;
    setSendingState(v);
  };
  const slow = useSlow(sending);
  const [mode, setModeState] = useState<RoomMode | null>(null);
  const modeRef = useRef<RoomMode | null>(null);
  const setMode = useCallback((m: RoomMode | null | ((cur: RoomMode | null) => RoomMode | null)) => {
    const next = typeof m === "function" ? m(modeRef.current) : m;
    modeRef.current = next;
    setModeState(next);
  }, []);
  const [replyTo, setReplyTo] = useState<{ quote: MessageQuote; mine: boolean } | null>(null);
  const replyRef = useRef(replyTo);
  replyRef.current = replyTo;
  const [tracing, setTracing] = useState(false);
  const [shelf, setShelf] = useState(false);
  const [photoFull, setPhotoFull] = useState<LightboxPhoto>(null);
  const skew = useRef(0); // server clock minus this phone's, learnt from the last send
  const { trans, translateLine, hideTranslation } = useTranslations(ui, wren);

  const name = detail?.otherName || t("cm.kindred");
  const read = useCorrespondentRead(detail);
  const ceremony = useCeremony(id, detail, status, { recentOnly: true });

  /* WREN'S NOTICES. Counted, never guessed — over the whole thread, never the render window. One
     at a time, and marked seen when you leave the room (or at the ×). */
  const notices = useMemo(() => {
    if (!detail) return [];
    const said = detail.messages.filter((m) => !m.recalledAt && m.body !== TAKEN_BACK && m.kind !== "wave");
    return noticeThings(
      said.filter((m) => m.mine),
      said.filter((m) => !m.mine),
    );
  }, [detail]);
  const [seenNotices, setSeenNotices] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;
    if (id) readNoticesSeen(id).then((l) => alive && setSeenNotices(l));
    return () => {
      alive = false;
    };
  }, [id]);
  const notice: Notice | null = seenNotices ? notices.find((n) => !seenNotices.includes(n.id)) ?? null : null;
  const noticeRef = useRef<string | null>(null);
  noticeRef.current = notice?.id ?? null;
  useEffect(
    () => () => {
      if (id && noticeRef.current) void markNoticeSeen(id, noticeRef.current);
    },
    [id],
  );
  const dismissNotice = useCallback(() => {
    if (!id || !noticeRef.current) return;
    const nid = noticeRef.current;
    void markNoticeSeen(id, nid);
    setSeenNotices((s) => [...(s || []), nid]);
  }, [id]);

  const conv = useMemo(() => conversation(detail), [detail]);
  const stream = useMemo<StreamItem[]>(() => roomStream(conv, folds), [conv, folds]);
  const songs: SharedSong[] = useMemo(() => sharedSongs(detail?.messages ?? []), [detail]);
  const songSays = useMemo(() => songNotice(songs), [songs]);

  /* EXPIRED and CLOSING SOON (owner, 2026-09-20 / 2026-10-10; lib/kindred-expiry). Both wait for
     the entitlement to settle, so a First Class reader never sees REKINDLE flash (spec bug 7). */
  const { premium, settled } = useEntitlement();
  const lastAt = useMemo(() => lastWordAt(detail, Date.now()), [detail]);
  const expired = !!detail && !detail.gone && ((!isDemo && settled && isExpired(lastAt, premium)) || (__DEV__ && expiredParam === "1"));
  const closing = !!detail && !detail.gone && !expired && ((!isDemo && settled && closingSoon(lastAt, premium)) || (__DEV__ && closingParam === "1"));
  const daysLeft = daysLeftOf(lastAt);
  const quietDays = quietDaysOf(lastAt);

  // offline with nothing kept: say so on the status line rather than show an empty room
  const composerFacts: ComposerFacts = roomComposer({ t, text, prompt: mode?.kind === "question" ? mode.prompt : "", mode, sending, slow, offline: status === "offline" && !detail });
  /* three This or That of mine already wait in this room (0044's cap): said on the status line
     for a moment, never as an alert */
  const [capNote, setCapNote] = useState("");
  useEffect(() => {
    if (!capNote) return;
    const tm = setTimeout(() => setCapNote(""), CAP_NOTE_MS);
    return () => clearTimeout(tm);
  }, [capNote]);
  const composer: ComposerFacts = capNote && !composerFacts.status ? { ...composerFacts, status: capNote, statusAlarm: true } : composerFacts;

  /* readable, not actionable (owner): a gone kindred, a thread the server calls missing, an expired
     room — no reply, no ANSWER TO OPEN, no reply quote over the gone line or the expired card */
  const canWrite = !detail?.gone && status !== "missing" && !expired;
  const canWriteRef = useRef(canWrite);
  canWriteRef.current = canWrite;

  /* THE IDEAS (chat composers B, owner's lead 2026-10-18). No server pool: the 36 stamps'
     prompts in the reader's language, those from the categories THEY write in first (their
     opening letter's stamp, and what their latest letters and lines call up, read after the
     transition like useCorrespondentRead), shuffled by the room's id (build-items ideaOrder).
     ↻ ANOTHER moves on; USE IT puts the sentence in the field as plain words (after any the
     reader typed) and gives it the keyboard, and moves on too, so a sentence comes round again
     only once the whole order has been offered, even when their categories move the order
     under the walk (build-items ideaNow / ideaPassed). Only the reader sees any of it. */
  const [theirCats, setTheirCats] = useState<string[]>([]);
  useEffect(() => {
    if (!detail) return;
    const task = InteractionManager.runAfterInteractions(() => {
      const theirs = detail.messages
        .filter((m) => !m.mine && !m.recalledAt && m.body !== TAKEN_BACK && (!m.kind || m.kind === "text"))
        .slice(-IDEA_READ)
        .map((m) => m.body);
      if (!detail.openingFromMe && detail.opening) theirs.unshift(detail.opening);
      const cats = theirCategories({
        openingStamp: detail.openingFromMe ? null : detail.stamp || null,
        heard: theirs.map(stampsHeard),
        // a photo stamp's category is its own (custom stamps: known once resolved)
        catOf: (stampId) => getStamp(stampId)?.cat ?? customStampNow(stampId)?.category,
      });
      setTheirCats((cur) => (cur.join() === cats.join() ? cur : cats));
    });
    return () => task.cancel();
  }, [detail]);
  const ideas = useMemo(
    // the 36 mood stamps' prompts (a seasonal stamp's line would outlive its season here)
    () => ideaOrder(MOOD_STAMPS.map((st) => ({ cat: st.cat, text: sname(st.prompt) })), theirCats, id ?? ""),
    // the prompts are read in the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theirCats, id, getLang()],
  );
  // the walk lives in ideaWalks (it outlives the screen); this only redraws when it moves
  const [, setIdeaMoves] = useState(0);
  const walkKey = id ?? "";
  const idea = ideaNow(ideas, ideaWalks.get(walkKey) ?? IDEA_WALK_START);
  const ideaRef = useRef(idea);
  ideaRef.current = idea;
  const ideasRef = useRef(ideas);
  ideasRef.current = ideas;
  /** ↻ ANOTHER: the next sentence in the room's order not offered yet. Read from the map each time,
      so two quick taps move two sentences on, never the same one twice */
  const nextIdea = useCallback(() => {
    ideaWalks.set(walkKey, ideaPassed(ideasRef.current, ideaWalks.get(walkKey) ?? IDEA_WALK_START));
    setIdeaMoves((n) => n + 1);
  }, [walkKey]);
  /** USE IT: the sentence into the field (a song's link it can't be, so song mode lets go), the
      keyboard to the field, and the next sentence ready */
  const takeIdea = useCallback(() => {
    const sentence = ideaRef.current;
    if (!sentence || !canWriteRef.current) return;
    if (modeRef.current?.kind === "song") setMode(null);
    putText(withIdea(textRef.current, sentence));
    nextIdea();
    ui.focus("body", 60);
  }, [putText, nextIdea, setMode, ui]);

  /* THE OPENERS DECK (Sparkle, 2026-10-21). The Wave card sends the sky now (the phone's local
     hour only, build-items skyOf) with a line for it; it rests for an hour after a wave of mine
     (a courtesy, not a rule of the server's). The This or That cards walk the room's own order
     of the language's PICKS, skipping questions already asked here; ↻ Shuffle deals a new order,
     a card's Another the next one, and a card sent moves on. */
  const lang = getLang();
  const deckKey = id ?? "";
  const used = useMemo(() => usedPicks(folds), [folds]);
  const usedRef = useRef(used);
  usedRef.current = used;
  const [deckMoves, setDeckMoves] = useState(0);
  /** the room's walk now (a fresh one when there is none, or the language changed) */
  const walkNow = useCallback((): DeckWalk => {
    const cur = deckWalks.get(deckKey);
    if (cur && cur.lang === getLang()) return cur.walk;
    const walk = deckStart(getLang(), deckKey, usedRef.current);
    deckWalks.set(deckKey, { lang: getLang(), walk });
    return walk;
  }, [deckKey]);
  const moveWalk = useCallback(
    (fn: (w: DeckWalk) => DeckWalk) => {
      deckWalks.set(deckKey, { lang: getLang(), walk: fn(walkNow()) });
      setDeckMoves((n) => n + 1);
    },
    [deckKey, walkNow],
  );
  const [sky, setSky] = useState<Sky>(() => skyOf(new Date().getHours()));
  // the sky turns while the room is open: the Wave card follows it
  useEffect(() => {
    const tm = setTimeout(() => setSky(skyOf(new Date().getHours())), msToNextSky(new Date()) + 500);
    return () => clearTimeout(tm);
  }, [sky]);
  const myWaves = useMemo(() => (detail?.messages ?? []).filter((m) => m.mine && m.kind === "wave"), [detail]);
  const lastWave = useMemo(() => lastWaveAt(myWaves), [myWaves]);
  const [waveTick, setWaveTick] = useState(0);
  const waved = lastWave !== null && Date.now() - lastWave < WAVE_REST_MS;
  // the Wave card wakes when the hour is up
  useEffect(() => {
    if (lastWave === null) return;
    const left = lastWave + WAVE_REST_MS - Date.now();
    if (left <= 0) return;
    const tm = setTimeout(() => setWaveTick((n) => n + 1), left + 500);
    return () => clearTimeout(tm);
  }, [lastWave]);
  const waiting = useMemo(() => picksWaiting(folds), [folds]);
  const deck: KChatDeck = useMemo(
    () =>
      buildDeck({
        t,
        locale: localeTag(),
        lang,
        walk: walkNow(),
        sky,
        line: waveLine(lang, sky, myWaves.filter((m) => skyWord(m.meta?.sky) === sky).length),
        waved,
        waiting,
        status: capNote,
        canWrite: canWrite && !!id,
      }),
    // deckMoves and waveTick are the walk's and the hour's redraws
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, walkNow, sky, myWaves, waved, waiting, capNote, canWrite, id, deckMoves, waveTick, used],
  );

  /* This or That picks of mine on their way (the row shows "Sending your pick…") */
  const [pickSending, setPickSending] = useState<ReadonlyMap<string, 0 | 1>>(() => new Map());
  const pickSendingRef = useRef(pickSending);
  pickSendingRef.current = pickSending;
  const foldsRef = useRef(folds);
  foldsRef.current = folds;
  const nameRef = useRef(name);
  nameRef.current = name;

  const nowMs = useTakeBackClock(detail?.messages, skew.current);
  const menuCtx: MenuCtx = useMemo(
    () => ({ t, isDemo, otherExists: !!detail?.other, nowMs, skewMs: skew.current, trans, canTranslate: offerTranslate, canWrite }),
    // t is read fresh on a language change (useLang re-renders), so lang is in the deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDemo, detail?.other, nowMs, trans, canWrite, getLang()],
  );
  // a room that closed (gone, missing, expired) while a reply or a mode was open lets go of both
  useEffect(() => {
    if (canWrite) return;
    setReplyTo(null);
    setMode(null);
  }, [canWrite, setMode]);

  /* ── sends ── */

  const failAlert = () => ui.thenModal(() => alertFail(t("rm.fail.title"), t("rm.fail.body"), { context: "thread" }));

  /** A wave: the sky now and its line; `back` = their wave this one answers (Wave Back). Goes at
      once, optimistically, like a plain line; a demo room keeps it on the phone. */
  const sendWave = useCallback(
    async (back: ThreadMessage | null) => {
      if (!id || !canWriteRef.current) return;
      const skyNow = skyOf(new Date().getHours());
      const mine = (detailRef.current?.messages ?? []).filter((m) => m.mine && m.kind === "wave" && skyWord(m.meta?.sky) === skyNow).length;
      const line = waveLine(getLang(), skyNow, mine);
      if (!line) return;
      const meta = back?.id ? { sky: skyNow, back: back.id } : { sky: skyNow };
      const sentAt = new Date().toISOString();
      const msg: ThreadMessage = { id: isDemo ? `demo-c${Date.now()}` : undefined, body: line, mine: true, date: sentAt, kind: "wave", meta };
      lines.add(msg);
      setSky(skyNow);
      ui.scrollToEnd(true, 60);
      if (isDemo) return;
      const res = await sendThreadMessage(id, line, { kind: "wave", meta });
      if (!res) {
        lines.drop(msg);
        void reload();
        return failAlert();
      }
      if (res.id) {
        if (res.createdAt) skew.current = Date.parse(res.createdAt) - Date.parse(sentAt);
        const echoed = !!detailRef.current?.messages.some((m) => m.id === res.id && !lines.keys.current.has(m));
        lines.settle(msg, res.id, res.createdAt, echoed);
      } else {
        // a wave back that had already gone (one per wave): the server's is the one
        lines.drop(msg);
        void reload();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, isDemo, ui, reload, lines.add, lines.drop, lines.settle],
  );

  /** A This or That from the deck: its question, its two choices and my side (0/1), sealed until
      they pick. The card moves on once it went. */
  const sendPick = useCallback(
    async (key: string, choice: 0 | 1) => {
      const hit = deckPick(getLang(), key);
      if (!id || !hit || !canWriteRef.current) return;
      const { index, pair } = hit;
      const moveOn = () => {
        const slot = walkNow().slots.indexOf(index);
        if (slot >= 0) moveWalk((w) => deckAnother(w, slot, getLang(), usedRef.current, deckKey));
      };
      const capLine = () => t("sp.deck.capStatus", { name: nameRef.current });
      if (picksWaiting(foldsRef.current) >= PICK_WAITING_CAP) {
        setCapNote(capLine());
        return;
      }
      const choices: [string, string] = [pair.a, pair.b];
      const opener: Fold = { id: `p-${Date.now()}`, mine: true, kind: "pick", prompt: pair.q, choices, parentId: null, body: choices[choice], date: new Date().toISOString() };
      mutateFolds((f) => [...f, opener]);
      ui.scrollToEnd(true, 120);
      if (isDemo) {
        moveOn();
        return;
      }
      const res = await leavePick(id, pair.q, choices, choice);
      if (res !== true) {
        mutateFolds((f) => f.filter((x) => x !== opener));
        if (res === "cap") {
          setCapNote(capLine());
          void reload();
          return;
        }
        void reload();
        return failAlert();
      }
      moveOn();
      void reload();
      ui.scrollToEnd(true, 120);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, isDemo, ui, reload, mutateFolds, walkNow, moveWalk, deckKey],
  );

  /** My pick on their This or That: the act that opens both. */
  const pickTheirs = useCallback(
    async (f: Fold, choice: 0 | 1) => {
      if (!id || f.mine || f.kind !== "pick" || !canWriteRef.current) return;
      if (pickSendingRef.current.has(f.id) || foldsRef.current.some((x) => x.parentId === f.id)) return;
      const choices = f.choices;
      if (!choices) return;
      if (isDemo) {
        mutateFolds((all) => [...all, { id: `d-${Date.now()}`, mine: true, kind: "pick", prompt: null, choices: null, parentId: f.id, body: choices[choice], date: new Date().toISOString() }]);
        return;
      }
      setPickSending((cur) => new Map(cur).set(f.id, choice));
      const res = await answerPick(id, f, choice);
      if (res) await reload();
      setPickSending((cur) => {
        const next = new Map(cur);
        next.delete(f.id);
        return next;
      });
      if (!res) failAlert();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, isDemo, reload, mutateFolds],
  );

  /** The openers deck: open (the sky read again), close, ↻ shuffle, a card's Another, a card sent
      (Swift has already closed the deck). */
  const onDeck = useCallback(
    (action: KChatDeckAction, key: string, choice: number) => {
      if (action === "open") {
        setSky(skyOf(new Date().getHours()));
        return;
      }
      if (action === "shuffle") {
        moveWalk((w) => deckShuffle(w, getLang(), deckKey, usedRef.current));
        return;
      }
      if (action === "another") {
        const hit = deckPick(getLang(), key);
        const slot = hit ? walkNow().slots.indexOf(hit.index) : -1;
        if (slot >= 0) moveWalk((w) => deckAnother(w, slot, getLang(), usedRef.current, deckKey));
        return;
      }
      if (action === "send") {
        if (key === "wave") void sendWave(null);
        else if (choice === 0 || choice === 1) void sendPick(key, choice);
      }
    },
    [moveWalk, walkNow, deckKey, sendWave, sendPick],
  );

  /**
   * Send what is in the composer. Swift hands over the exact words and prompt it held, and whether
   * its field already emptied itself (composer clearOnSend); the React Native field calls it bare
   * and the model's own state is the words. Folds, songs and a bare song link clear only after
   * they went (room/[id].tsx:305-351); a plain line goes at once, optimistically.
   */
  const onSend = useCallback(
    async (typed?: string, typedPrompt?: string, cleared = false) => {
      const rawText = typed ?? textRef.current;
      const body = rawText.trim();
      const curMode = modeRef.current;
      // a refused send that had already emptied Swift's field gets its words back
      const refuse = () => {
        if (cleared) putText(rawText);
      };
      if (!id || sendingRef.current) return refuse();

      if (curMode && curMode.kind !== "song") {
        const prompt = curMode.kind === "question" ? (typedPrompt ?? curMode.prompt).trim() : "";
        if (!roomComposer({ t, text: rawText, prompt, mode: curMode, sending: false, slow: false }).canSend) return refuse();
        if (isDemo) {
          const now = new Date().toISOString();
          mutateFolds((f) => [
            ...f,
            curMode.kind === "answer"
              ? { id: `d-${Date.now()}`, mine: true, kind: curMode.fold.kind, prompt: null, parentId: curMode.fold.id, body, date: now }
              : { id: `d-${Date.now()}`, mine: true, kind: curMode.kind, prompt: curMode.kind === "question" ? prompt : null, parentId: null, body, date: now },
          ]);
          putText("");
          setMode(null);
          ui.scrollToEnd(true, 120);
          return;
        }
        setSending(true);
        const ok = curMode.kind === "answer" ? await answerFold(id, curMode.fold, body) : await leaveFold(id, curMode.kind, body, curMode.kind === "question" ? prompt : undefined);
        setSending(false);
        if (!ok) return failAlert();
        putText("");
        setMode(null);
        void reload();
        ui.scrollToEnd(true, 120);
        return;
      }

      if (curMode?.kind === "song") {
        const card = parseSongUrl(body);
        if (!card) {
          ui.thenModal(() => Alert.alert(t("rm.song.badTitle"), t("rm.song.badBody")));
          return refuse();
        }
        setSending(true);
        const title = await fetchSongTitle(card);
        const fallback = `${title ? title + " — " : ""}${card.url}`;
        if (isDemo) {
          lines.add({ id: `demo-c${Date.now()}`, body: fallback, mine: true, date: new Date().toISOString(), kind: "song", meta: { url: card.url, title: title ?? undefined } });
          setSending(false);
          putText("");
          setMode(null);
          ui.scrollToEnd(true, 60);
          return;
        }
        const res = await sendThreadMessage(id, fallback, { kind: "song", meta: { url: card.url, title: title ?? undefined } });
        setSending(false);
        if (!res) return failAlert();
        putText("");
        setMode(null);
        void reload();
        ui.scrollToEnd(true, 120);
        return;
      }

      /* A LINK PASTED WITHOUT THE MENU IS STILL A SONG. Nobody opens a drawer first — they paste. */
      if (isBareSong(body)) {
        const bare = parseSongUrl(body)!;
        setSending(true);
        const title = await fetchSongTitle(bare);
        const songBody = `${title ? title + " — " : ""}${bare.url}`;
        if (isDemo) {
          lines.add({ id: `demo-c${Date.now()}`, body: songBody, mine: true, date: new Date().toISOString(), kind: "song", meta: { url: bare.url, title: title ?? undefined } });
          setSending(false);
          putText("");
          ui.scrollToEnd(true, 60);
          return;
        }
        const res = await sendThreadMessage(id, songBody, { kind: "song", meta: { url: bare.url, title: title ?? undefined } });
        setSending(false);
        if (!res) {
          refuse();
          return failAlert();
        }
        putText("");
        void reload();
        ui.scrollToEnd(true, 120);
        return;
      }

      /* OPTIMISTIC for plain lines: the line appears as you release it; a failure drops the ghost
         and hands your words (and the line you were replying to) back. */
      if (!roomComposer({ t, text: rawText, prompt: "", mode: null, sending: false, slow: false }).canSend) return refuse();
      setSending(true);
      if (cleared) {
        textRef.current = "";
        setTextState("");
      } else putText("");
      const reply = replyRef.current;
      setReplyTo(null);
      const sentAt = new Date().toISOString();
      const line: ThreadMessage = {
        id: isDemo ? `demo-c${Date.now()}` : undefined,
        body,
        mine: true,
        date: sentAt,
        meta: reply ? { reply: reply.quote } : null,
        replyMine: reply?.mine,
      };
      lines.add(line);
      ui.scrollToEnd(true, 40);
      if (isDemo) {
        setSending(false);
        return;
      }
      const res = await sendThreadMessage(id, body, reply ? { kind: "text", meta: { reply: reply.quote } } : undefined);
      setSending(false);
      if (!res) {
        lines.drop(line);
        putText(rawText);
        setReplyTo(reply);
        void reload();
        return failAlert();
      }
      if (res.id) {
        if (res.createdAt) skew.current = Date.parse(res.createdAt) - Date.parse(sentAt);
        const echoed = !!detailRef.current?.messages.some((m) => m.id === res.id && !lines.keys.current.has(m));
        lines.settle(line, res.id, res.createdAt, echoed);
      }
      void refreshFingerprint();
      void noteWrote("letter");
      // the realtime echo of our own INSERT reloads and reconciles
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, isDemo, ui, putText, reload, mutateFolds, lines.add, lines.drop, lines.settle],
  );

  /* A TINY MOMENT IS RATIONED LIKE FILM: one frame a day, and the shutter has to have been pressed
     today. Absent EXIF is trusted. The field lets go before the picker opens. */
  const sendMoment = useCallback(async () => {
    if (!id || sendingRef.current) return;
    if (momentSpent && !isDemo) {
      ui.thenModal(() => Alert.alert(t("rm.moment.spentTitle"), t("rm.moment.spentBody")));
      return;
    }
    const pick = async () => {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, exif: true });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      if (!shotToday(res.assets[0].exif)) {
        Alert.alert(t("rm.moment.oldTitle"), t("rm.moment.oldBody"));
        return;
      }
      if (isDemo) {
        lines.add({ id: `demo-c${Date.now()}`, body: t("rm.moment.fallback"), mine: true, date: new Date().toISOString(), kind: "photo", meta: { url: res.assets[0].uri } });
        ui.scrollToEnd(true, 60);
        return;
      }
      setSending(true);
      const path = await uploadMoment(res.assets[0].uri);
      const ok = path ? await sendThreadMessage(id, t("rm.moment.fallback"), { kind: "photo", mediaPath: path }) : null;
      setSending(false);
      if (!ok) {
        alertFail(t("rm.fail.title"), t("rm.fail.body"), { context: "thread" });
        return;
      }
      await markMomentUsed(id);
      setMomentSpent(true);
      void reload();
      ui.scrollToEnd(true, 120);
    };
    ui.thenModal(() => void pick());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isDemo, momentSpent, ui, reload, lines.add]);

  const TRACES: TraceAction[] = [
    { id: "note", title: t("rm.note.t"), sub: t("rm.note.s") },
    { id: "ask", title: t("rm.ask.t"), sub: t("rm.ask.s") },
    { id: "moment", title: t("rm.moment.t"), sub: t("rm.moment.s") },
    { id: "song", title: t("rm.song.t"), sub: t("rm.song.s") },
  ];

  /** A trace chosen from the tray: a mode (the field then takes the keyboard) or the moment. A
      mode clears a reply chip, so it can't come back after the fold goes (critic). */
  const onTrace = useCallback(
    (kind: TraceKind | string) => {
      setTracing(false);
      if (kind === "moment") {
        void sendMoment();
        return;
      }
      setReplyTo(null);
      if (kind === "note") setMode({ kind: "note" });
      else if (kind === "ask") {
        setMode({ kind: "question", prompt: "" });
        ui.seedText("prompt", "");
      } else if (kind === "song") setMode({ kind: "song" });
      else return;
      ui.focus("body", 160);
    },
    [sendMoment, setMode, ui],
  );

  /** Wren hands you a question: a random stamp's prompt, question mode, the field. */
  const seedQuestion = useCallback(() => {
    const seed = MOOD_STAMPS[Math.floor(Math.random() * MOOD_STAMPS.length)];
    const prompt = sname(seed.prompt);
    setReplyTo(null);
    setMode({ kind: "question", prompt });
    ui.seedText("prompt", prompt);
    ui.focus("body", 60);
  }, [setMode, ui]);

  /** The question's prompt as the reader edits it (Swift's prompt field; RN's TextInput). */
  const onPromptText = useCallback((v: string) => setMode((m) => (m?.kind === "question" ? { kind: "question", prompt: v } : m)), [setMode]);

  const startReply = useCallback(
    (m: ThreadMessage) => {
      if (!m.id || !canWriteRef.current) return;
      setMode(null);
      setReplyTo({ quote: { id: m.id, excerpt: Array.from(m.body).slice(0, 140).join(""), sender: m.mine ? "me" : (detailRef.current?.other ?? undefined) }, mine: m.mine });
      ui.focus("body", 120);
      ui.scrollToEnd(true, 260);
    },
    [setMode, ui],
  );

  const reportThing = useCallback(
    async (r: { context: string; refId: string | null; snapshot: string }) => {
      const ok = await reportContent({ targetUser: detailRef.current?.other ?? null, context: r.context, refId: r.refId, reason: "other", snapshot: r.snapshot });
      ui.thenModal(() => {
        if (ok) Alert.alert(t("rp.reportedTitle"), t("rp.reportedBody", { wren }));
        else Alert.alert(t("rp.failed"), t("rp.failedBody")); // a report's own failure, never a stale "offline" from another write
      });
    },
    [ui, wren],
  );
  // a photo is reported by its path, the way theirLatest carries one
  const reportLine = useCallback((m: ThreadMessage) => reportThing({ context: "message", refId: m.id ?? null, snapshot: theirLatest([m]) ?? m.body }), [reportThing]);

  const markTaken = useCallback((msgId: string) => {
    setTakenLocal((s) => new Set(s).add(msgId));
    setReplyTo((r) => (r && r.quote.id === msgId ? null : r)); // nothing left to quote
  }, []);
  const takeBackLine = useCallback(
    async (m: ThreadMessage) => {
      if (!m.id) return;
      if (isDemo) {
        markTaken(m.id);
        return;
      }
      const res = await takeBack(m.id);
      if (res === "ok") {
        markTaken(m.id);
        void reload();
      } else if (res === "too_late") ui.thenModal(() => Alert.alert(t("mm.tooLate.title"), t("mm.tooLate.body")));
      else ui.thenModal(() => alertFail(t("ml.rm.failTitle"), t("ml.rm.failBody"), { context: "thread" }));
    },
    [isDemo, markTaken, reload, ui],
  );
  // a reply chip quoting a line that was taken back (by either side) goes
  useEffect(() => {
    if (replyTo && detail?.messages.find((x) => x.id === replyTo.quote.id)?.recalledAt) setReplyTo(null);
  }, [detail, replyTo]);

  /* long-press keeps a moment — theirs or an opened fold — in your lore */
  const keep = useCallback(
    (body: string, prompt: string | null, said: string) => {
      ui.thenModal(() =>
        Alert.alert(t("rm.keep.title"), t("rm.keep.body"), [
          { text: sheetWords(t("set.neverMind")), style: "cancel" },
          {
            text: t("rm.keep.do"),
            onPress: () => {
              if (id) void saveToLore({ threadId: id, who: detailRef.current?.otherName || t("cm.kindred"), body, prompt, said });
            },
          },
        ]),
      );
    },
    [id, ui],
  );

  /* ── what a key means ── */

  type Target = { kind: "msg"; msg: ThreadMessage } | { kind: "fold"; fold: Fold } | { kind: "half"; half: Fold; prompt: string | null };
  const targets = useMemo(() => {
    const map = new Map<string, Target>();
    for (const it of stream) {
      if (it.type === "msg") map.set(lines.keyOf(it.msg), { kind: "msg", msg: it.msg });
      // each postcard is its message (a pair's item key is its wave back's)
      else if (it.type === "wave") for (const w of [it.wave, it.back]) w && map.set(lines.keyOf(w), { kind: "msg", msg: w });
      else {
        map.set(foldKey(it.fold), { kind: "fold", fold: it.fold });
        if (it.answer) for (const half of [it.fold, it.answer]) map.set(halfKey(half), { kind: "half", half, prompt: it.fold.prompt });
      }
    }
    return map;
  }, [stream, lines.keyOf]);
  const targetsRef = useRef(targets);
  targetsRef.current = targets;

  /** A menu item (or its VoiceOver action) on a row: the item's key and the action's key. */
  const onItemAction = useCallback(
    (key: string, action: string) => {
      const target = targetsRef.current.get(key);
      if (!target) return;
      if (target.kind === "msg") {
        const m = target.msg;
        if (action === "reply") startReply(m);
        else if (action === "copy") void copyText(m.body);
        else if (action === "translate") void translateLine(key, m.body);
        else if (action === "original") hideTranslation(key);
        else if (action === "keep") keep(m.body, null, m.date);
        else if (action === "report") void reportLine(m);
        else if (action === "takeBack") void takeBackLine(m);
        else if (action === "copyLink" && m.meta?.url) void copyText(m.meta.url);
        else if (action === "shelf") ui.thenModal(() => setShelf(true));
        return;
      }
      if (target.kind === "fold") {
        const f = target.fold;
        if (action === "report" && !f.mine) {
          const choices = f.choices ? ` (${f.choices.join(" / ")})` : "";
          void reportThing({ context: "fold", refId: f.id, snapshot: `${f.prompt ?? ""}${choices}` });
        }
        return;
      }
      if (target.kind === "half") {
        const { half, prompt } = target;
        const body = half.body ?? "";
        if (action === "copy") void copyText(body);
        else if (action === "translate") void translateLine(key, body);
        else if (action === "original") hideTranslation(key);
        else if (action === "keep") keep(body, prompt, half.date);
        else if (action === "report") void reportThing({ context: "fold", refId: half.id, snapshot: prompt ? `${prompt} — ${body}` : body });
      }
    },
    [startReply, translateLine, hideTranslation, keep, reportLine, takeBackLine, reportThing, ui],
  );

  /** A tap on a row's part. */
  const onItemPress = useCallback(
    (key: string, part: KChatPart) => {
      const target = targetsRef.current.get(key);
      if ((part === "pickA" || part === "pickB") && target?.kind === "fold") {
        void pickTheirs(target.fold, part === "pickA" ? 0 : 1);
        return;
      }
      if (part === "waveBack" && target?.kind === "msg") {
        if (isWave(target.msg) && !target.msg.mine) void sendWave(target.msg);
        return;
      }
      if (part === "fold" && target?.kind === "fold") {
        // a sealed fold opens only by answering it, and only where something can be left; a
        // This or That opens only by picking
        if (!canWriteRef.current || target.fold.mine || target.fold.kind === "pick") return;
        setReplyTo(null);
        setMode({ kind: "answer", fold: target.fold });
        ui.focus("body", 120);
        return;
      }
      if (target?.kind !== "msg") return;
      const m = target.msg;
      if (part === "photo") {
        const path = m.kind === "photo" ? m.mediaPath ?? null : null;
        const uri = m.kind === "photo" && !m.mediaPath ? m.meta?.url ?? null : null;
        ui.thenModal(() => setPhotoFull({ path, uri }));
      } else if (part === "song" && m.meta?.url) {
        const url = m.meta.url;
        ui.thenModal(() => void Linking.openURL(url));
      } else if (part === "shelf") ui.thenModal(() => setShelf(true));
      else if (part === "quote" && m.meta?.reply) {
        const original = detailRef.current?.messages.find((x) => x.id === m.meta?.reply?.id);
        ui.jumpTo(original ? lines.keyOf(original) : m.meta.reply.id);
      }
    },
    [setMode, ui, lines.keyOf, pickTheirs, sendWave],
  );

  /** Something in the dock. */
  const onDock = useCallback(
    (action: string) => {
      if (action === "replyClose") setReplyTo(null);
      else if (action === "modeClose") setMode(null);
      else if (action === "noticeClose") dismissNotice();
      else if (action === "closingLink") ui.thenModal(() => router.push("/paywall?src=closing"));
      else if (action === "rekindle") ui.thenModal(() => router.push("/paywall?src=rekindle"));
      else if (action === "ideaNext") nextIdea();
      else if (action === "ideaUse") takeIdea();
    },
    [setMode, dismissNotice, ui, router, nextIdea, takeIdea],
  );

  const goBack = useCallback(() => ui.thenModal(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/kindreds"))), [ui, router]);
  const openPage = useCallback(() => ui.thenModal(() => router.push(`/kindred/${id}`)), [ui, router, id]);
  const openLore = useCallback(() => ui.thenModal(() => router.push("/lore")), [ui, router]);
  const onBlocked = useCallback(() => router.replace("/(tabs)/kindreds"), [router]);

  return {
    id,
    isDemo,
    detail,
    folds,
    status,
    reload,
    name,
    wren,
    read,
    conv,
    stream,
    songs,
    songSays,
    notice,
    dismissNotice,
    text,
    setText,
    putText,
    mode,
    setMode,
    replyTo,
    setReplyTo,
    trans,
    translateLine,
    hideTranslation,
    sending,
    slow,
    tracing,
    setTracing,
    shelf,
    setShelf,
    photoFull,
    setPhotoFull,
    momentSpent,
    composer,
    premium,
    settled,
    lastAt,
    expired,
    canWrite,
    closing,
    daysLeft,
    quietDays,
    TRACES,
    keyOf: lines.keyOf,
    menuCtx,
    nowMs,
    locale: localeTag(),
    dayLabel: noteDayLabel,
    onSend,
    sendMoment,
    onTrace,
    seedQuestion,
    idea,
    nextIdea,
    takeIdea,
    deck,
    onDeck,
    pickSending,
    onPromptText,
    startReply,
    reportLine,
    reportThing,
    takeBackLine,
    keep,
    onItemAction,
    onItemPress,
    onDock,
    goBack,
    openPage,
    openLore,
    onBlocked,
    theirLatest: theirLatest(detail?.messages, detail?.openingFromMe ? null : detail?.opening),
    ...ceremony,
  };
}

/** A day rule's label: the locale's short date in capitals ("OCT 14"; ja/ko as they write it). */
export const noteDayLabel = (iso: string): string => noteDay(iso);

export type RoomModel = ReturnType<typeof useRoomModel>;
