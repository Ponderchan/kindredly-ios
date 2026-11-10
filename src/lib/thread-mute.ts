import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useAuth } from "./auth";
import { loadMutedThreads, setThreadMuted } from "./db";
import { alertFail } from "./fail";
import { getLang, t, useLang } from "./i18n";
import { onStorageUserChange } from "./scoped-store";
import { useNativeSurface } from "./surfaces";
import { MUTE_SURFACE, createMuteBook, muteOffered, muteRow, type MuteRow } from "./thread-mute-model";
import "../data/strings-audit-chat"; // tm.mute, tm.unmute, tm.muted
import "../data/strings-step5-notes"; // jd.more (VoiceOver's name for a ⋯ that offers more)

/* MUTE A CORRESPONDENCE — THE GLUE (owner's audit, 2026-11-10; the "threadmute" switch, OFF).
   ────────────────────────────────────────────────────────────────────────
   The rules are lib/thread-mute-model (who is offered it, the item's words, the optimistic
   book); the two calls are lib/db (loadMutedThreads, setThreadMuted, against public.thread_mutes).
   This file is what a screen uses:

     const mute = useThreadMute(id, { demo: m.isDemo, someone: !report.nobody });
     …  header: mute.muted → the bell.slash beside the name, mute.spoken in its VoiceOver label
        moreLabel: mute.moreLabel ?? the usual "Report or block"
     <ReportSheet flow={report} mute={mute.item} />

   With the switch off (the default), for a guest, on a demo thread, or with nobody on the other
   side, `item` is null and `muted` false: the menu and the header are exactly as they were, and
   nothing is read from the server.

   ONE BOOK PER ACCOUNT, shared by every screen (the conversation and the kindred's page show the
   same answer): read when a screen that offers Mute opens, at most once a minute, and dropped
   when the account changes. A tap shows at once; its write goes behind it, one at a time. When a
   write doesn't hold, the screen goes back to what the server last said and the reader is told
   with a native alert (set.cantSave / set.push.saveFail, or the offline words: lib/fail). A read
   that fails is logged and what this phone knew is kept. Nothing is swallowed. */

const FRESH_MS = 60_000;
/* the ⋯ card is a Modal that fades out as the row is tapped; an alert raised while it is still
   going would go with it, so a failure is said no sooner than this after the tap */
const CARD_GONE_MS = 450;

const listeners = new Set<() => void>();
const book = createMuteBook(() => listeners.forEach((f) => f()));
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};

/* whose mutes the book holds, and when they were last read */
let owner: string | null = null;
let readAt = 0;
let reading: Promise<void> | null = null;
/* writes go one after another, so two taps on one thread reach the server in the order tapped */
let writes: Promise<void> = Promise.resolve();

function forget(): void {
  owner = null;
  readAt = 0;
  reading = null;
  book.reset();
}
onStorageUserChange(forget);

/** Read this account's mutes, unless they were read in the last minute. Never rejects. */
function refresh(uid: string): void {
  if (owner !== uid) {
    forget();
    owner = uid;
  }
  if (reading || Date.now() - readAt < FRESH_MS) return;
  const run: Promise<void> = loadMutedThreads()
    .then((set) => {
      if (owner !== uid || reading !== run) return; // another account signed in meanwhile
      readAt = Date.now();
      book.load(set);
    })
    .catch((e) => console.warn("[mutes] the muted list wasn't read; keeping what this phone knew:", e))
    .finally(() => {
      if (reading === run) reading = null;
    });
  reading = run;
}

/** Flip one thread, optimistically (see the comment above). */
function toggle(threadId: string): void {
  const muted = !book.shown().has(threadId);
  const ticket = book.want(threadId, muted);
  const uid = owner;
  const tappedAt = Date.now();
  writes = writes
    .then(async () => {
      const ok = await setThreadMuted(threadId, muted);
      if (owner !== uid) return; // the account changed while it was on its way: its book is gone
      book.settle(threadId, ticket, muted, ok);
      if (ok) return;
      /* why it failed was logged by lib/db; the reader is told once the card has gone (alertFail
         puts the offline words in front of ours when that is why) */
      const wait = Math.max(0, CARD_GONE_MS - (Date.now() - tappedAt));
      if (wait) await new Promise((r) => setTimeout(r, wait));
      alertFail(t("set.cantSave"), t("set.push.saveFail"));
    })
    // nothing above should throw; if it does, say so and keep the queue alive for the next tap
    .catch((e) => console.warn("[mutes] a mute write's follow-up failed:", e));
}

export type ThreadMute = {
  /** the ⋯ menu's row (ReportSheet `mute`); null = no Mute item at all */
  item: (MuteRow & { onPress: () => void }) | null;
  /** this correspondence is muted (and the feature is on): the header's bell.slash */
  muted: boolean;
  /** VoiceOver: "Muted", to add to the header's label while muted; "" otherwise */
  spoken: string;
  /** VoiceOver's name for the ⋯ once it offers more than report and block; null = the usual one */
  moreLabel: string | null;
};

const NO_MUTE: ThreadMute = { item: null, muted: false, spoken: "", moreLabel: null };

/** Mute for one correspondence. `demo`: a dev / store demo thread. `someone`: there is someone on
    the other side (the ⋯ is drawn: useReportFlow's !nobody). */
export function useThreadMute(threadId: string | null | undefined, o: { demo: boolean; someone: boolean }): ThreadMute {
  useLang();
  const lang = getLang();
  const { isGuest, user } = useAuth();
  const on = useNativeSurface(MUTE_SURFACE);
  const uid = user?.id ?? null;
  const offered = !!uid && muteOffered({ on, guest: isGuest, demo: o.demo, threadId, someone: o.someone });
  const shown = useSyncExternalStore(subscribe, book.shown, book.shown);
  useEffect(() => {
    if (offered && uid) refresh(uid);
  }, [offered, uid]);
  // the book in memory is this account's (a screen can render before the effect above has run)
  const muted = offered && owner === uid && !!threadId && shown.has(threadId);
  const onPress = useCallback(() => {
    if (threadId) toggle(threadId);
  }, [threadId]);
  return useMemo<ThreadMute>(
    () => (offered ? { item: { ...muteRow(muted, t), onPress }, muted, spoken: muted ? t("tm.muted") : "", moreLabel: t("jd.more") } : NO_MUTE),
    // the words are the reader's language's
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [offered, muted, onPress, lang],
  );
}
