import { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { DEMO_TEXT, storeMode } from "../../lib/dev-store";
import { getLang, t, useLang } from "../../lib/i18n";
import { speakAs } from "../../lib/wren-name";
import { useWrenOnce } from "../../components/WrenSaysOnce";
import type { WrenMood } from "../../components/WrenBird";
import { openLeaveSheet } from "../../components/LeaveSheet";
import { openSignUpSheet } from "../../components/SignUpSheet";
import { STAMP_CATEGORIES, getStamp, sname, stampsByCat, type Stamp } from "../../data/stamps";
import { channelColors } from "../../theme/post";
import type { ThemeTokens } from "../../theme/themes";
import { blurTarget, blurThen, dismissKeyboard, type CommandTarget } from "../../lib/keyboard";
import { weightedCount } from "../../lib/weighted-count";
import { openingLadder, readMood, wrenLine as wrenMoodLine } from "../../lib/wren-read";
import { nextSpark } from "../../lib/sparks";
import { suggestStamps } from "../../lib/stamp-suggest";
import { noteStampUsed, readRecentStamps } from "../../lib/recent-stamps";
import { deleteDraft, getDraft, saveDraft, type Draft } from "../../lib/drafts";
import { FREE_PER_DAY, bumpLetters, lettersLeftToday, type BumpResult } from "../../lib/api";
import { publishLetter, publishVoiceLetter } from "../../lib/db";
import { screen } from "../../lib/wren";
import { refreshFingerprint } from "../../lib/aura";
import { noteWrote } from "../../lib/local-push";
import { track } from "../../lib/track";
import { startLetterOut } from "../../lib/activities";
import { setFlag } from "../../lib/flags";
import { wrenStageDirty } from "../../lib/wren-stage";
import { alertFail, type AlertFailOptions } from "../../lib/fail";
import {
  autosaveDraft,
  capVisible,
  countFor,
  isFreeWriter,
  keyFor,
  leaveGuard,
  leftFromCount,
  plusDot as plusDotFor,
  quotaFor,
  sendBody,
  stampSections as buildStampSections,
  wordsReadyFor,
  wrenLineFor,
  type ComposeMode,
  type ComposeTray,
  type CountVM,
  type KeyVM,
  type LeaveOutcome,
  type StampSectionVM,
} from "./compose-model";

/* THE COMPOSE PAGE'S STATE, FOR BOTH RENDERERS (10a step 5).
   ────────────────────────────────────────────────────────────────────────
   Everything the page knows and does lives here, once: the SwiftUI page
   (ComposeNative) and the React Native fallback (ComposeRN) draw what this
   returns and call its actions, so a remote flip between them changes
   nothing about the letter. The rules themselves are compose-model's (pure,
   node-tested); this holds the state, the storage and the network.

   THE WORDS LIVE HERE TOO. The Swift fields are uncontrolled and report
   every edit (act.textChange), so `text` and `ask` are always what is on
   screen; TS never writes them back while someone types. The page is told
   the words only when they come from elsewhere — a draft resumed, a seed
   from a journal page, the store-mode demo (seed, by serial) — and on any
   remount of the Swift view (ComposeNative reseeds from latest()). The
   courier's flight (LetterTravel) is an overlay above a page that stays
   mounted, so a failed send comes back to the words exactly as they were.

   THE FIXES THIS CARRIES (critic + spec, both renderers):
   - DISCARD no longer saves a draft (and throws away a resumed one), and
     SAVE AS DRAFT saves once: the unmount autosave reads how the page was
     left (compose-model autosaveDraft);
   - a recording with no caption asks before ✕ throws it away;
   - a voice letter is counted (letter_sent, kind voice) and starts the
     Live Activity when the publish hands back an id;
   - the cap's fallback is the server's five (FREE_PER_DAY), not three;
   - the count near the ceiling is localized;
   - a free writer sees "N LEFT TODAY" (lettersLeftToday, then each bump's
     own count), and at zero the cap panel at once — a send at zero asks the
     server's count again before the courier takes off, so a day that has
     turned (UTC) still lets the letter go;
   - a resumed draft with a question shows the question (it was attached,
     hidden, and still sent);
   - turning the question off takes it off the letter (it was hidden and
     still sent).

   KEYBOARD AND SHEETS. A sheet, an Alert or a push from the page lets go
   of the keyboard first, whoever drew the field (blurThen with the Swift
   view's ref as the target; React Native's own dismiss for the fallback). */

export type ComposeParams = { morning?: string; stamp?: string; draft?: string; seed?: string; demo?: string };

/** Who is writing: the caller reads these (useEntitlement, useAuth, useWrenName); the dev page
    sets them by hand. */
export type ComposeEnv = {
  premium: boolean;
  /** First Class has answered (before this, premium false means "not asked yet") */
  premiumSettled: boolean;
  isGuest: boolean;
  /** a session exists (a guest has one too) */
  signedIn: boolean;
  /** her name, for her lines */
  wren: string;
};

/** Everything the page does to the world, so the dev page can stand in for it (no network, no
    account, no storage). The app takes the defaults. */
export type ComposeIO = {
  screen: (body: string) => Promise<{ ok: boolean }>;
  bumpLetters: () => Promise<BumpResult>;
  lettersLeftToday: () => Promise<{ count: number; left: number } | null>;
  publishLetter: (stamp: string, body: string, lang: string) => Promise<string | null>;
  /** an id once lib/db hands one back (today: true), null on failure */
  publishVoiceLetter: (stamp: string, uri: string, durationS: number, caption: string, lang: string) => Promise<string | true | null>;
  saveDraft: (d: { id: string | null; stamp: string; body: string; ask: string }) => Promise<string>;
  getDraft: (id: string) => Promise<Draft | null>;
  deleteDraft: (id: string) => Promise<unknown>;
  readRecentStamps: () => Promise<string[]>;
  noteStampUsed: (id: string) => Promise<string[]>;
  nextSpark: () => Promise<string>;
  /** after a letter has gone: the counters, her stage, the Live Activity, the fingerprint */
  sent: (p: { mode: ComposeMode; body: string; stamp: string; id: string | null }) => void;
  goBack: () => void;
  push: (href: string) => void;
  alert: (title: string, body: string) => void;
  alertFail: (title: string, body: string, opts?: AlertFailOptions) => void;
};

/* A LETTER REMEMBERS ITS OWN LANGUAGE: the writer's interface language,
   the best available guess and the one they chose deliberately. */
const letterLang = () => getLang();

const DEFAULT_IO: Omit<ComposeIO, "goBack" | "push"> = {
  screen: (body) => screen(body),
  bumpLetters,
  lettersLeftToday: () => lettersLeftToday(FREE_PER_DAY),
  publishLetter,
  publishVoiceLetter,
  saveDraft,
  getDraft,
  deleteDraft,
  readRecentStamps,
  noteStampUsed,
  nextSpark,
  sent: ({ mode, body, stamp, id }) => {
    track("letter_sent", { kind: mode === "speak" ? "voice" : "text", weight: weightedCount(body) });
    // her, on the lock screen, out with this letter — fire-and-forget
    if (id) void startLetterOut(id, stamp);
    if (mode === "speak") void setFlag("voiceSent"); // growth stamp: Your Voice
    /* the vector that matching runs on moves with your writing — letters
       only, never the journal. A staler match is fine, a blocked send is not. */
    void refreshFingerprint();
    void noteWrote("letter"); // written today: her evening line stays quiet
    wrenStageDirty(); // her first letter is what hatches her
  },
  alert: (title, body) => Alert.alert(title, body),
  alertFail,
};

/** A stamp as the page shows it: its #name and its colours against the page and the tray. */
export type StampVM = {
  id: string;
  /** "#made my day" */
  tag: string;
  /** the plain name ("Made my day"), for VoiceOver */
  name: string;
  color: string;
  /** the pill on the page: channelColors against bg */
  wash: string;
  ink: string;
  line: string;
};

export function stampVM(st: Stamp | null, tk: ThemeTokens): StampVM | null {
  if (!st) return null;
  const c = channelColors(st.color, tk.bg);
  const name = sname(st.name);
  return { id: st.id, tag: `#${name.toLowerCase()}`, name, color: st.color, wash: c.wash, ink: c.ink, line: c.line };
}

/** The tray's sections for the stamps it shows now: names in the stamp's channel ink against
    the tray's soft (so they read in Midnight too), unknown ids dropped. */
export function traySections(p: { suggested: string[]; recent: string[]; tk: ThemeTokens }): StampSectionVM[] {
  return buildStampSections({
    suggested: { title: t("cp.forThisLetter"), ids: p.suggested },
    recent: { title: t("cp.recent"), ids: p.recent },
    categories: STAMP_CATEGORIES.map((cat) => ({ title: sname(cat.name).toUpperCase(), ids: stampsByCat(cat.id).map((s) => s.id) })),
    item: (id) => {
      const st = getStamp(id);
      if (!st) return null;
      const name = sname(st.name);
      return { id, name: name.toUpperCase(), inkHex: channelColors(st.color, p.tk.soft).ink, a11yLabel: name };
    },
  });
}

/** Words from elsewhere for the Swift page's fields, by serial; null leaves that field alone. */
export type ComposeSeed = { serial: number; text: string | null; ask: string | null };
export type ComposeFocus = { serial: number; target: "body" | "ask" };

export type ComposeState = {
  params: ComposeParams;
  isMorning: boolean;
  /** her name, for the words that carry it */
  wrenName: string;
  step: "write" | "sending";
  mode: ComposeMode;
  text: string;
  ask: string;
  /** the question field shows */
  askOpen: boolean;
  /** the chosen stamp id, or null */
  sel: string | null;
  chosen: Stamp | null;
  tray: ComposeTray;
  /** the stamp tray's sections ([] unless it is open) */
  sections: StampSectionVM[];
  spark: string;
  busy: boolean;
  /** the publish truly landed: the courier finishes */
  done: boolean;
  recUri: string | null;
  recDur: number;
  weight: number;
  wordsReady: boolean;
  canSend: boolean;
  wrenMood: WrenMood;
  /** Wren's line, in quotes */
  wrenLine: string;
  key: KeyVM;
  count: CountVM | null;
  /** "4 LEFT TODAY" or "" */
  quota: string;
  capPanel: boolean;
  capText: string;
  plusDot: boolean;
  more: { askOn: boolean; voiceOn: boolean; voiceLocked: boolean };
  /** words from elsewhere, for the Swift page (a draft resumed, a seed) */
  seed: ComposeSeed;
  /** a field to focus, for the Swift page (the question just attached) */
  focus: ComposeFocus;
  /** the leave sheet: open, and whether SAVE AS DRAFT is offered */
  leaving: boolean;
  leaveCanSave: boolean;
  needsAccount: boolean;
  /** what TS holds right now (read on a Swift remount) */
  latest: () => { text: string; ask: string };
  act: ComposeActions;
};

export type ComposeActions = {
  /** an edit in a field (the Swift page's onTextChange, the fallback's inputs) */
  textChange: (target: "body" | "ask", value: string) => void;
  /** a tray key: toggles it, after the keyboard */
  openTray: (which: "stamps" | "more") => void;
  closeTray: () => void;
  pickStamp: (id: string) => void;
  toggleAsk: () => void;
  toggleVoice: () => void;
  /** the main key: sends, or opens the stamps when the words are ready and none is chosen.
      The Swift page passes the words as typed. */
  keyPress: (text?: string, ask?: string) => void;
  send: () => void;
  /** the × (guarded) */
  close: () => void;
  saveAndLeave: () => void;
  discard: () => void;
  keepWriting: () => void;
  recorded: (uri: string, seconds: number) => void;
  clearRecording: () => void;
  capLink: () => void;
  /** a field gained (closes the tray) or lost the keyboard */
  fieldFocus: (target: "body" | "ask", focused: boolean) => void;
  signedIn: () => void;
  closeSignUp: () => void;
  /** the courier cleared the frame */
  travelDone: () => void;
};

export function useComposeState(opts: {
  params: ComposeParams;
  env: ComposeEnv;
  /** the Swift view's ref (blurred before a sheet, an Alert, a push); none for the fallback */
  target?: CommandTarget;
  tk: ThemeTokens;
  io?: Partial<ComposeIO>;
}): ComposeState {
  const { params, env, target, tk } = opts;
  const router = useRouter();
  useLang(); // the words follow the reader's language

  // back that survives cold deep-link starts (no history → land on Letters)
  const routerIO = useMemo<Pick<ComposeIO, "goBack" | "push">>(
    () => ({
      goBack: () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/letters")),
      push: (href) => router.push(href as never),
    }),
    [router],
  );
  const io: ComposeIO = { ...DEFAULT_IO, ...routerIO, ...opts.io };
  const ioRef = useRef(io);
  ioRef.current = io;
  const envRef = useRef(env);
  envRef.current = env;

  const demo = __DEV__ && storeMode && !!params.demo;
  const initialText = params.seed ?? (demo ? DEMO_TEXT[getLang()].compose : "");

  const [step, setStep] = useState<"write" | "sending">("write");
  const [draftId, setDraftId] = useState<string | null>(params.draft ?? null);
  const [mode, setMode] = useState<ComposeMode>("write");
  const [tray, setTray] = useState<ComposeTray>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [askOpen, setAskOpen] = useState(false);
  /* THE STAMP IS CHOSEN, NOT DEFAULTED: empty until you choose (or a deep
     link names one), and the letter cannot leave without one. */
  const [sel, setSel] = useState<string | null>(params.stamp ?? null);
  const [text, setTextState] = useState(initialText);
  const [ask, setAskState] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [capHit, setCapHit] = useState(false);
  const [capN, setCapN] = useState<number | null>(null);
  const [recUri, setRecUri] = useState<string | null>(null);
  const [recDur, setRecDur] = useState(0);
  const [spark, setSpark] = useState("");
  const [quotaLeft, setQuotaLeft] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [leaveCanSave, setLeaveCanSave] = useState(true);
  const [needsAccount, setNeedsAccount] = useState(false);
  // serial 0 is the page's first words, which the Swift page takes on attach (latest())
  const [seed, setSeed] = useState<ComposeSeed>({ serial: 0, text: null, ask: null });
  const [focus, setFocus] = useState<ComposeFocus>({ serial: 0, target: "body" });

  /* what the page holds right now, for the send and the leave that run
     between renders (the last keystroke's event lands just before the key's) */
  const textRef = useRef(initialText);
  const askRef = useRef("");
  const busyRef = useRef(false);
  const outcome = useRef<LeaveOutcome>({ kind: "open" });
  const snapRef = useRef({ sel, mode, draftId, recUri, recDur, quotaLeft });
  snapRef.current = { sel, mode, draftId, recUri, recDur, quotaLeft };

  const setText = (v: string) => {
    textRef.current = v;
    setTextState(v);
  };
  const setAsk = (v: string) => {
    askRef.current = v;
    setAskState(v);
  };
  /** words from elsewhere: into the state, and to the Swift page as a seed (null: untouched) */
  const seedWords = (body: string | null, question: string | null) => {
    if (body !== null) setText(body);
    if (question !== null) setAsk(question);
    setSeed((s) => ({ serial: s.serial + 1, text: body, ask: question }));
  };

  // the recent stamps, the spark, store mode's open tray
  useEffect(() => {
    let alive = true;
    void ioRef.current.readRecentStamps().then((r) => alive && setRecent(r));
    // the empty page hands you something to reach for, not "start typing"
    void ioRef.current.nextSpark().then((s) => alive && setSpark(s));
    const timer = demo ? setTimeout(() => setTray("stamps"), 400) : null;
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
    // once, on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // resume a draft: its stamp, its words, its question (shown, so it isn't sent unseen)
  useEffect(() => {
    if (!params.draft) return;
    let alive = true;
    void ioRef.current.getDraft(params.draft).then((d) => {
      if (!alive || !d) return;
      // a draft written by an older build may lack a field: read each as text
      const body = typeof d.body === "string" ? d.body : "";
      const question = typeof d.ask === "string" ? d.ask : "";
      setSel(d.stamp || null);
      setAskOpen(!!question.trim());
      seedWords(body, question);
      setStep("write");
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.draft]);

  // the free writer's count for today, once there is a real account
  const realAccount = env.signedIn && !env.isGuest;
  useEffect(() => {
    if (!realAccount) return;
    let alive = true;
    void ioRef.current.lettersLeftToday().then((r) => {
      if (alive && r) setQuotaLeft(r.left);
    });
    return () => {
      alive = false;
    };
  }, [realAccount]);

  // the silent autosave when the page goes — only a page left without deciding
  useEffect(
    () => () => {
      const s = snapRef.current;
      const d = autosaveDraft({ text: textRef.current, ask: askRef.current, sel: s.sel, mode: s.mode, draftId: s.draftId }, outcome.current);
      if (d) void ioRef.current.saveDraft(d).catch(() => {});
    },
    [],
  );

  // ── derived (compose-model) ──
  const fmt = { t };
  const ladder = openingLadder(weightedCount(text));
  const weight = mode === "speak" ? weightedCount(text.trim()) : weightedCount(text);
  const wordsReady = wordsReadyFor({ mode, weight, hasRecording: !!recUri });
  const canSend = wordsReady && !!sel;
  // Wren's face reads your feeling; her line reads how much you've given
  const wrenMood: WrenMood = mode === "speak" ? (recUri ? "happy" : "curious") : readMood(text, ladder.ready);
  /* Her language line — said only to writers whose interface isn't English,
     once PER LANGUAGE, on an empty written page. */
  const langHello = useWrenOnce(`lang-send:${getLang()}`) && getLang() !== "en" && mode === "write" && !text.trim();
  const wrenLine = wrenLineFor(
    {
      langHello,
      mode,
      hasRecording: !!recUri,
      weight,
      hello: speakAs(t("lang.send"), env.wren),
      voicePrompt: t("cp.voiceLine.prompt"),
      moodLine: wrenMoodLine(wrenMood),
      ladderLine: ladder.line,
    },
    fmt,
  );
  const key = keyFor({ mode, weight, wordsReady, hasStamp: !!sel, busy, tray }, fmt);
  const count = countFor({ mode, weight }, fmt);
  const free = isFreeWriter(env);
  const quota = quotaFor({ free, left: quotaLeft }, fmt);
  const capPanel = capVisible({ capHit, free, left: quotaLeft });
  const capText = t("cp.cap", { n: capN ?? FREE_PER_DAY });
  const chosen = getStamp(sel);

  // the stamp tray's sections, read off the letter as it stands when the tray opens
  const trayText = tray === "stamps" ? text : "";
  const sections = useMemo(
    () => (tray === "stamps" ? traySections({ suggested: suggestStamps(trayText), recent, tk }) : []),
    // the words follow the reader's language (getLang inside sname / t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tray, trayText, recent, tk, getLang()],
  );

  // ── actions ──
  const send = async () => {
    const s = snapRef.current;
    const words = textRef.current;
    const question = askRef.current;
    const w = s.mode === "speak" ? weightedCount(words.trim()) : weightedCount(words);
    if (!wordsReadyFor({ mode: s.mode, weight: w, hasRecording: !!s.recUri }) || !s.sel || busyRef.current) return;
    const stamp = s.sel;
    const e = envRef.current;
    const x = ioRef.current;
    busyRef.current = true;
    setBusy(true);
    setCapHit(false);
    setDone(false);
    // the keyboard goes before the courier comes
    blurTarget(target);
    dismissKeyboard();
    const finish = () => {
      busyRef.current = false;
      setBusy(false);
    };
    /* NONE LEFT: ask the server's count again before anything flies — a day
       that turned (UTC) since the page opened lets the letter go; otherwise
       the cap panel stays, and the courier never takes off to bounce back. */
    if (isFreeWriter(e) && s.quotaLeft === 0) {
      const fresh = await x.lettersLeftToday();
      if (!fresh || fresh.left <= 0) {
        finish();
        setCapHit(true);
        return;
      }
      setQuotaLeft(fresh.left);
    }
    /* THE COUNTER OPENS THE MOMENT YOU HAND IT OVER: the gate, the cap and
       the publish run under the courier's flight, and every failure steps
       back to the page — still mounted, words intact — and explains. */
    setStep("sending");
    const back = () => setStep("write");
    const body = sendBody(s.mode, words, question);

    // her gate reads the letter itself when written, and the line that travels with a recording
    const gate = await x.screen(body);
    if (!gate.ok) {
      finish();
      back();
      x.alert(t("cp.gate.title", { wren: e.wren }), t("cp.gate.body"));
      return;
    }

    const bump = await x.bumpLetters();
    if (!bump.ok) {
      finish();
      back();
      if (bump.reason === "daily_cap") {
        setCapN(bump.cap ?? FREE_PER_DAY);
        setQuotaLeft(0);
        setCapHit(true);
      } else if (bump.reason === "unauthorized") {
        /* THE FIRST WALL A GHOST ACTUALLY HITS: the daily-cap check runs
           before the publish, so a guest is stopped here — ask for the
           account, never "sign in AGAIN" to someone who never signed in */
        if (e.isGuest) openSignUpSheet(() => setNeedsAccount(true), target);
        else x.alert(t("cp.signin.title"), t("cp.signin.body"));
      } else {
        x.alertFail(t("cp.fail.title"), t("cp.fail.generic"));
      }
      return;
    }
    if (!bump.premium && typeof bump.count === "number") setQuotaLeft(leftFromCount(bump.count, bump.cap ?? FREE_PER_DAY));

    let ok: string | true | null;
    if (s.mode === "speak" && s.recUri) ok = await x.publishVoiceLetter(stamp, s.recUri, s.recDur, body, letterLang());
    else ok = await x.publishLetter(stamp, body, letterLang());
    finish();
    /* A guest's publish always returns null, and "Try again" would turn
       "you aren't signed in" into "the network broke": ask for the account. */
    if (!ok && e.isGuest) {
      back();
      openSignUpSheet(() => setNeedsAccount(true), target);
      return;
    }
    if (!ok) {
      back();
      x.alertFail(t("cp.fail.title"), s.mode === "speak" ? t("cp.fail.voice") : t("cp.fail.text"), { context: "write" });
      return;
    }
    x.sent({ mode: s.mode, body, stamp, id: typeof ok === "string" ? ok : null });
    if (s.draftId) {
      void x.deleteDraft(s.draftId);
      setDraftId(null);
    }
    outcome.current = { kind: "sent" };
    setDone(true);
  };

  const live = {
    textChange: (targetField: "body" | "ask", value: string) => (targetField === "ask" ? setAsk(value) : setText(value)),
    openTray: (which: "stamps" | "more") => {
      blurTarget(target);
      dismissKeyboard();
      setTray((cur) => (cur === which ? null : which));
    },
    closeTray: () => setTray(null),
    pickStamp: (id: string) => {
      setSel(id);
      setTray(null);
      void ioRef.current.noteStampUsed(id).then(setRecent);
    },
    toggleAsk: () => {
      setTray(null);
      if (askOpen) {
        // the question comes off the letter with its field (it used to stay, hidden, and go)
        setAskOpen(false);
        if (askRef.current) seedWords(null, "");
      } else {
        setAskOpen(true);
        setFocus((f) => ({ serial: f.serial + 1, target: "ask" }));
      }
    },
    toggleVoice: () => {
      setTray(null);
      if (envRef.current.premium) setMode((m) => (m === "speak" ? "write" : "speak"));
      else blurThen(() => ioRef.current.push("/paywall?src=voice_lock"), target);
    },
    keyPress: (typed?: string, typedAsk?: string) => {
      if (typeof typed === "string" && typed !== textRef.current) setText(typed);
      if (typeof typedAsk === "string" && typedAsk !== askRef.current) setAsk(typedAsk);
      const s = snapRef.current;
      const words = textRef.current;
      const w = s.mode === "speak" ? weightedCount(words.trim()) : weightedCount(words);
      const ready = wordsReadyFor({ mode: s.mode, weight: w, hasRecording: !!s.recUri });
      if (ready && !s.sel) {
        // PICK A MOOD STAMP opens the stamps (and never closes them, as a toggle would)
        blurTarget(target);
        dismissKeyboard();
        setTray("stamps");
      } else void send();
    },
    send: () => void send(),
    close: () => {
      const g = leaveGuard({ text: textRef.current, ask: askRef.current, hasRecording: !!snapRef.current.recUri });
      if (!g.guard) {
        ioRef.current.goBack();
        return;
      }
      setLeaveCanSave(g.canSaveDraft);
      openLeaveSheet(() => setLeaving(true), target);
    },
    saveAndLeave: async () => {
      setLeaving(false);
      const s = snapRef.current;
      try {
        /* the draft carries what the writer has — its question too, and
           never the placeholder (that once glued the app's own prompt to a
           letter a stranger then read as the writer's words) */
        const id = await ioRef.current.saveDraft({ id: s.draftId, stamp: s.sel || "", body: textRef.current.trim(), ask: askRef.current });
        // kept: the autosave when the page goes must not save it again, under a new id
        outcome.current = { kind: "saved", id };
      } catch {
        /* a draft is not worth blocking the exit; the autosave may still keep it */
      }
      ioRef.current.goBack();
    },
    discard: async () => {
      setLeaving(false);
      outcome.current = { kind: "discarded" };
      const id = snapRef.current.draftId;
      // a resumed draft thrown away is thrown away (it used to be saved again)
      if (id) await ioRef.current.deleteDraft(id).catch(() => {});
      ioRef.current.goBack();
    },
    keepWriting: () => setLeaving(false),
    recorded: (uri: string, seconds: number) => {
      setRecUri(uri);
      setRecDur(seconds);
    },
    clearRecording: () => {
      setRecUri(null);
      setRecDur(0);
    },
    capLink: () => blurThen(() => ioRef.current.push("/paywall?src=daily_cap"), target),
    fieldFocus: (_field: "body" | "ask", focused: boolean) => {
      if (focused) setTray(null);
    },
    signedIn: () => {
      setNeedsAccount(false);
      void send();
    },
    closeSignUp: () => setNeedsAccount(false),
    travelDone: () => ioRef.current.goBack(),
  };
  // one object for the life of the page, always calling this render's closures
  const liveRef = useRef(live);
  liveRef.current = live;
  const act = useMemo<ComposeActions>(
    () => ({
      textChange: (a, b) => liveRef.current.textChange(a, b),
      openTray: (w) => liveRef.current.openTray(w),
      closeTray: () => liveRef.current.closeTray(),
      pickStamp: (id) => liveRef.current.pickStamp(id),
      toggleAsk: () => liveRef.current.toggleAsk(),
      toggleVoice: () => liveRef.current.toggleVoice(),
      keyPress: (a, b) => liveRef.current.keyPress(a, b),
      send: () => liveRef.current.send(),
      close: () => liveRef.current.close(),
      saveAndLeave: () => void liveRef.current.saveAndLeave(),
      discard: () => void liveRef.current.discard(),
      keepWriting: () => liveRef.current.keepWriting(),
      recorded: (u, s) => liveRef.current.recorded(u, s),
      clearRecording: () => liveRef.current.clearRecording(),
      capLink: () => liveRef.current.capLink(),
      fieldFocus: (f, v) => liveRef.current.fieldFocus(f, v),
      signedIn: () => liveRef.current.signedIn(),
      closeSignUp: () => liveRef.current.closeSignUp(),
      travelDone: () => liveRef.current.travelDone(),
    }),
    [],
  );
  const latest = useMemo(() => () => ({ text: textRef.current, ask: askRef.current }), []);

  return {
    params,
    isMorning: params.morning === "1",
    wrenName: env.wren,
    step,
    mode,
    text,
    ask,
    askOpen,
    sel,
    chosen,
    tray,
    sections,
    spark,
    busy,
    done,
    recUri,
    recDur,
    weight,
    wordsReady,
    canSend,
    wrenMood,
    wrenLine,
    key,
    count,
    quota,
    capPanel,
    capText,
    plusDot: plusDotFor({ tray, askOn: askOpen, ask, mode }),
    more: { askOn: askOpen || !!ask.trim(), voiceOn: mode === "speak", voiceLocked: !env.premium },
    seed,
    focus,
    leaving,
    leaveCanSave,
    needsAccount,
    latest,
    act,
  };
}
