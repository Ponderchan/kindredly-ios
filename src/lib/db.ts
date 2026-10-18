/* Supabase data layer — direct RLS reads/writes, ported from kindredly/app/db.js.
   Every call is fail-safe: no client / missing table / network error → null and
   the caller falls back. RN adaptation: the writer handle comes from the signed-in
   user's user_metadata (the web read it from a localStorage session mirror). */

import { supabase, supabaseReady } from "./supabase";
import { scoped } from "./scoped-store";
import { isOffline } from "./net";
import { t } from "./i18n";
import {
  TAKEN_BACK,
  buildThreadDetail,
  confirmMissing,
  decideThreadFetch,
  emptyReadFail,
  isNetworkish,
  isSchemaError,
  readReason,
  unconfirmedEmpty,
  writeFailOf,
  type MessageRow,
  type OfflineReason,
  type SessionCheck,
  type ThreadDetailResult,
  type ThreadRow,
  type WriteFail,
} from "./thread-detail-core";

/* what a line taken back reads as in the database (web 0031): the body, and the
   thread's list preview when it was the latest. Never anyone's writing.
   (Defined in thread-detail-core so node tests and demo fixtures share it.) */
export { TAKEN_BACK };
export type { OfflineReason, ThreadDetailResult, WriteFail };
/* WHY IT DIDN'T GO. Every write in here returns a bare null on failure, so
   the screens could only ever say "try again" — advice that is wrong when
   there is no network to try on, and wrong again when the row was refused
   for a reason no amount of retrying will change. Tracking the last failure
   costs one assignment and lets the interface tell the reader something
   true. It is deliberately not part of any return type: callers that don't
   care are unaffected.

   Step 5 (10a): the reply RPC's own refusals get their own names — gone,
   blocked, suspended, session (web 0020:105-125) — instead of 'server',
   which told a reader to "try again" at a letter that could never be
   answered. And every write clears the flag BEFORE its first early
   return (writer() below), so a refusal is never read off a stale
   failure from an earlier write. See WriteFail in thread-detail-core. */
let lastFailKind: WriteFail | null = null;
let lastFailAt = 0;
/* A REASON IS READ RIGHT AFTER ITS WRITE. Some alerts follow a failure
   that never passed through here (compose's daily-cap call goes to
   /api), and would otherwise read whatever a write minutes earlier said —
   "This one has closed" over a compose that merely timed out. A reason
   older than this is no longer the reason. Generous enough for a reload
   that hangs on its full deadline between the write and the alert. */
const FAIL_FRESH_MS = 60_000;
/** why the last write in this module (or folds.ts) failed, if that was in
    the last minute; null after a success, before any write, or when stale */
export const lastWriteFail = (): WriteFail | null => (lastFailKind && Date.now() - lastFailAt <= FAIL_FRESH_MS ? lastFailKind : null);
/** set the failure reason directly, for refusals decided on the phone (a ghost's letter, a closed room) */
export function setFail(kind: WriteFail): null {
  lastFailKind = kind;
  lastFailAt = Date.now();
  return null;
}
/** record why a write failed (see writeFailOf) and return null, for `return noteFail(e)` */
export function noteFail(e: unknown): null {
  return setFail(writeFailOf(e, isOffline(e)));
}
/** forget the last failure — every write calls this before anything else */
export const clearFail = () => {
  lastFailKind = null;
};


/* WHO AM I, WITHOUT ASKING THE SERVER. getUser() is a round trip to the
   auth server, and every query here called it first — so a cold open paid
   two extra network hops before the first letter could paint, and every
   tap that touched the database waited on one. The session is already on
   the device; its user id is the same id. */
let uidCache: string | null = null;
if (supabase) supabase.auth.onAuthStateChange((_e, s) => { uidCache = s?.user?.id ?? null; });

/**
 * Who is signed in, or why that can't be said. `network` covers a session
 * whose token expired while the phone is offline (auth's refresh failed
 * with a retryable fetch error) — that reader is not a guest, and must
 * never be shown a guest's empty screen. `no-session` is a real answer: a
 * guest, or a session that is really gone.
 */
export type WhoAmI = { id: string } | { reason: "not-ready" | "no-session" | "network" };
export async function whoAmI(): Promise<WhoAmI> {
  if (!supabase) return { reason: "not-ready" };
  if (uidCache) return { id: uidCache };
  try {
    const { data, error } = await supabase.auth.getSession();
    const id = data.session?.user?.id ?? null;
    if (id) {
      uidCache = id;
      return { id };
    }
    if (error && isNetworkish(error)) return { reason: "network" };
    const u = await supabase.auth.getUser();
    const uid2 = u.data.user?.id ?? null;
    if (uid2) {
      uidCache = uid2;
      return { id: uid2 };
    }
    return u.error && isNetworkish(u.error) ? { reason: "network" } : { reason: "no-session" };
  } catch (e) {
    return isNetworkish(e) ? { reason: "network" } : { reason: "no-session" };
  }
}
async function uid(): Promise<string | null> {
  const w = await whoAmI();
  return "id" in w ? w.id : null;
}

/* WHO A READ WAS ASKED AS. whoAmI() answers from uidCache, but every
   PostgREST request fetches its own token: once the access token has
   expired and auth's refresh fails, getSession() hands back no session
   and supabase-js sends the anon key instead (supabase-js fetchWithAuth).
   The threads policies are `to authenticated`, so that read answers 0 rows
   and no error — a deleted thread, to anyone who believes it. Called only
   after an empty answer (no cost on the common path); see
   unconfirmedEmpty / confirmMissing / emptyReadFail. */
async function sessionCheck(): Promise<SessionCheck> {
  try {
    const { data, error } = await supabase!.auth.getSession();
    return { uid: data.session?.user?.id ?? null, error };
  } catch (e) {
    return { uid: null, error: e };
  }
}

/* THE START OF EVERY WRITE: forget the last failure first (before any early
   return), then name why there is no writer if there isn't one — offline,
   or no session — so the screen's alert says something true. */
async function writer(): Promise<string | null> {
  clearFail();
  if (!supabaseReady) return null;
  const w = await whoAmI();
  if ("id" in w) return w.id;
  if (w.reason === "network") setFail("offline");
  else if (w.reason === "no-session") setFail("session");
  return null;
}

/** current writer's pen name (handle) for thread name-reveal. */
async function currentHandle(): Promise<string> {
  if (!supabase) return "";
  try {
    const { data } = await supabase.auth.getSession(); // the metadata is on the local session
    const m: any = data.session?.user?.user_metadata || {};
    return m.handle || m.full_name || m.name || "";
  } catch {
    return "";
  }
}

/** the chosen LIBRARY face for signing (0011). Library ids only — a photo
    avatar stays on its owner's device and is never snapshotted. */
async function currentFace(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession(); // the metadata is on the local session
    const m: any = data.session?.user?.user_metadata || {};
    return typeof m.avatarId === "string" && m.avatarId ? m.avatarId : null;
  } catch {
    return null;
  }
}

const REVEAL_AT = 5;

/* ── Voice Match ── */
export async function upsertFingerprint(
  sig: number[],
  nWords: number,
): Promise<true | null> {
  if (!supabaseReady || !Array.isArray(sig)) return null;
  const id = await uid();
  if (!id) return null;
  try {
    const { error } = await supabase!.from("fingerprints").upsert(
      { user_id: id, sig, n_words: nWords | 0, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    return error ? null : true;
  } catch {
    return null;
  }
}

/* Attached client-side in the Letters tab from the nightly `matches` cache —
   never from the server row itself, and only present when the matcher really
   named this author. Undefined means "we don't know", and the UI must say
   nothing about closeness rather than guess. */
export type Close = number | undefined;

export interface MatchInfo {
  closest: { uid: string; score: number }[];
  count: number;
}
export async function fetchMatches(): Promise<MatchInfo | null> {
  if (!supabaseReady) return null;
  const id = await uid();
  if (!id) return null;
  try {
    const { data, error } = await supabase!
      .from("matches")
      .select("closest, computed_at")
      .eq("user_id", id)
      .maybeSingle();
    if (error || !data) return null;
    const closest = Array.isArray(data.closest) ? data.closest : [];
    return { closest, count: closest.length };
  } catch {
    return null;
  }
}

/* ── Morning Page ── */
export async function insertMorningFragment(
  fragment: string,
  mood: string | null,
  lang: string,
): Promise<true | null> {
  if (!supabaseReady || !fragment) return null;
  const id = await uid();
  if (!id) return null;
  try {
    const { error } = await supabase!.from("morning_pages").insert({
      author: id,
      fragment: String(fragment).slice(0, 400),
      mood: mood || null,
      lang: lang || "en",
    });
    return error ? null : true;
  } catch {
    return null;
  }
}

export interface MorningCandidate {
  id: string;
  fragment: string;
  mood: string | null;
  lang: string | null;
}
export async function fetchMorningCandidates(
  limit = 8,
  lang?: string,
): Promise<MorningCandidate[] | null> {
  if (!supabaseReady) return null;
  try {
    const { data, error } = await supabase!
      .from("morning_feed")
      .select("id, fragment, mood, lang")
      .order("created_at", { ascending: false })
      .limit(limit * 3);
    if (error || !data || !data.length) return null;
    const pool = lang ? data.filter((r: any) => !r.lang || r.lang === lang) : data;
    return (pool.length ? pool : data).slice(0, limit) as MorningCandidate[];
  } catch {
    return null;
  }
}

/* ── Letters (shared discovery pool) ── */
/** the new letter's id, or null. (It used to answer `true`; the lock-screen
    activity that follows the letter needs to know which one it is.) */
export async function publishLetter(
  stamp: string,
  body: string,
  lang: string,
): Promise<string | null> {
  if (!body) {
    clearFail();
    return null;
  }
  const id = await writer();
  if (!id) return null;
  try {
    const { data, error } = await supabase!
      .from("letters")
      .insert({
        author: id,
        stamp: stamp || "off-chest",
        body: String(body).slice(0, 2000),
        lang: lang || "en",
      })
      .select("id")
      .single();
    return error ? (noteFail(error) as null) : ((data as { id: string } | null)?.id ?? null);
  } catch (e) {
    return noteFail(e);
  }
}

export interface PoolLetter {
  id: string;
  author: string | null; // null since 0009: the author deleted their account; the letter stays, unsigned
  stamp: string;
  body: string;
  lang: string;
  created_at: string;
  kind?: "text" | "voice"; // absent pre-0007 migration
  media_path?: string | null;
  duration_s?: number | null;
  /* cosine closeness to the reader, attached client-side from the nightly
     `matches` cache — never a column on this row. Undefined means the matcher
     did not name this author, and the UI must then say nothing at all about
     closeness rather than imply distance it doesn't have. */
  close?: Close;
}
/** active pool rows excluding the viewer's own, newest first. Falls back to
   the pre-0007 column set if the media columns don't exist yet. */
/** `authors` narrows the pool to those writers — the matcher's second pass
 *  uses it to REACH people recency already scrolled past (see letters.tsx). */
/* last time's pool, so a cold open paints before the network answers (Today
   reads it; onboarding primes it) */
export const POOL_CACHE_KEY = "kindredly_pool_cache";
export async function fetchPool(limit = 40, authors?: string[]): Promise<PoolLetter[] | null> {
  const page = await fetchPoolPage(limit, authors);
  return page ? page.letters : null;
}

/** fetchPool, and whether that page is the server's whole pool: fewer rows came back than were
    asked for. Read from the rows the server sent, BEFORE the viewer's own, their kindreds' and
    blocked writers' letters are taken out below — the filtered list is nearly always shorter than
    a page, and Today read that as "the whole pool" and dropped every desk letter that had only
    aged past the newest page (2026-10-18: the count fell with nothing passed). */
export async function fetchPoolPage(limit = 40, authors?: string[]): Promise<{ letters: PoolLetter[]; whole: boolean } | null> {
  if (!supabaseReady) return null;
  if (authors && !authors.length) return { letters: [], whole: true };
  const me = await uid();
  try {
    let q = supabase!
      .from("letters")
      .select("id, author, stamp, body, lang, created_at, kind, media_path, duration_s")
      .eq("active", true)
      .not("author", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (authors) q = q.in("author", authors);
    let { data, error } = await q;
    if (error) {
      // migration 0007 not applied yet → retry without media columns
      let fq = supabase!
        .from("letters")
        .select("id, author, stamp, body, lang, created_at")
        .eq("active", true)
        .not("author", "is", null)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (authors) fq = fq.in("author", authors);
      const fallback = await fq;
      data = fallback.data as any;
      if (fallback.error || !data) return null;
    }
    if (!data) return null;

    /* WHOEVER IS ALREADY IN KINDREDS IS NOT A STRANGER.
       Today is where you meet people you don't know; the moment a
       correspondence exists, that person lives in Kindreds instead. The
       app used to enforce this and the rule was lost in a refactor — so a
       kindred you had traded names with could reappear in Today as an
       anonymous mosaic, and answering "their letter" would silently drop
       your reply into the correspondence you already had, under a letter
       it wasn't written about. Both sides of the reveal are covered: a
       named kindred and a stranger you're mid-letters with are equally
       not-strangers. */
    const known = new Set<string>();
    if (me) {
      const [{ data: mine }, { data: blocks }] = await Promise.all([
        supabase!.from("threads").select("a,b").or(`a.eq.${me},b.eq.${me}`),
        /* blocking someone must empty the desk of them too — the blocks table
           only ever gated threads, so a blocked writer's pool letters kept
           arriving as if nothing had been said */
        supabase!.from("blocks").select("blocked").eq("blocker", me),
      ]);
      // a ghost's side is null since 0009 — nobody to keep out of the pool
      for (const t of mine || []) {
        const other = t.a === me ? t.b : t.a;
        if (other) known.add(other);
      }
      for (const b of blocks || []) if (b.blocked) known.add(b.blocked as string);
    }
    /* A GHOST'S LETTER IS NOT AN INVITATION. 0009 keeps letters alive when
       their author deletes their account — the reader's side of a finished
       correspondence should not be vaporized. But `author` goes null with
       the account, and 0009's own "start thread" policy requires `b is not
       null`: the server has bolted this door. Showing the letter anyway put
       a normal-looking card in Today whose SEND lit up and whose every reply
       came back "Couldn't send. Try again." — advice that could never work.
       Filtered in the query as well, so ghosts don't eat the page budget. */
    const rows = data as PoolLetter[];
    return {
      letters: rows.filter((r) => r.author && r.author !== me && !known.has(r.author)),
      whole: rows.length < limit,
    };
  } catch {
    return null;
  }
}

/* SIGNED, NOT PUBLIC (security review, 2026-10-09). Uploaded photos and
   voice letters are read through a link that lasts an hour, so the buckets
   can turn private (web supabase/migrations/0028) without this build going
   blank; on a public bucket a signed link works too. Each path's link is
   reused for fifty minutes. If signing fails the public address is the
   fallback — which stops working once the bucket is private. */
const SIGNED = new Map<string, { url: string; until: number }>();
export function cachedSignedUrl(bucket: "moments" | "voice-letters", path?: string | null): string | null {
  if (!path) return null;
  const c = SIGNED.get(bucket + ":" + path);
  return c && c.until > Date.now() ? c.url : null;
}
export async function signedMediaUrl(bucket: "moments" | "voice-letters", path?: string | null): Promise<string | null> {
  if (!supabase || !path) return null;
  const hit = cachedSignedUrl(bucket, path);
  if (hit) return hit;
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    if (!error && data?.signedUrl) {
      SIGNED.set(bucket + ":" + path, { url: data.signedUrl, until: Date.now() + 50 * 60e3 });
      return data.signedUrl;
    }
  } catch {}
  return bucket === "moments" ? momentUrl(path) : voiceLetterUrl(path);
}

/** public playback URL for a voice letter's media_path (public bucket). */
export function voiceLetterUrl(mediaPath?: string | null): string | null {
  if (!supabase || !mediaPath) return null;
  try {
    const { data } = supabase.storage.from("voice-letters").getPublicUrl(mediaPath);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}

/** Upload the recording, then insert a kind='voice' letter. `body` carries the
   caption (web renders it as a text card — graceful degradation). */
export async function publishVoiceLetter(
  stamp: string,
  fileUri: string,
  durationS: number,
  caption: string,
  lang: string,
): Promise<true | null> {
  if (!fileUri) {
    clearFail();
    return null;
  }
  const id = await writer();
  if (!id) return null;
  try {
    const path = `${id}/${Date.now()}.m4a`;
    const res = await fetch(fileUri);
    const blob = await res.arrayBuffer();
    const { error: upErr } = await supabase!.storage
      .from("voice-letters")
      .upload(path, blob, { contentType: "audio/m4a" });
    if (upErr) return noteFail(upErr);
    const { error } = await supabase!.from("letters").insert({
      author: id,
      stamp: stamp || "off-chest",
      body: (caption || "🎙 A voice letter").slice(0, 2000),
      lang: lang || "en",
      kind: "voice",
      media_path: path,
      duration_s: Math.round(durationS) || null,
    });
    return error ? (noteFail(error) as null) : true;
  } catch (e) {
    return noteFail(e);
  }
}

/** upload a tiny-moment photo into the 'moments' bucket; returns its path. */
export async function uploadMoment(fileUri: string): Promise<string | null> {
  if (!fileUri) {
    clearFail();
    return null;
  }
  const id = await writer();
  if (!id) return null;
  try {
    const path = `${id}/${Date.now()}.jpg`;
    const res = await fetch(fileUri);
    const blob = await res.arrayBuffer();
    const { error } = await supabase!.storage.from("moments").upload(path, blob, { contentType: "image/jpeg" });
    return error ? (noteFail(error) as null) : path;
  } catch (e) {
    return noteFail(e);
  }
}

export function momentUrl(mediaPath?: string | null): string | null {
  if (!supabase || !mediaPath) return null;
  try {
    const { data } = supabase.storage.from("moments").getPublicUrl(mediaPath);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}

/* ── Your own letters: taking one back, and who has read it ── */

/** withdraw a pool letter — it stops being offered; correspondences it
    already opened are untouched (they are the other person's too) */
export async function withdrawLetter(id: string): Promise<boolean> {
  const me = await writer();
  if (!me) return false;
  try {
    const { error } = await supabase!.from("letters").update({ active: false }).eq("id", id).eq("author", me);
    if (error) noteFail(error);
    return !error;
  } catch (e) {
    noteFail(e);
    return false;
  }
}

/** one reader, once — the eye on My letters. Fire-and-forget; before 0020
    lands the function does not exist and the call is simply dropped. */
export function markLetterRead(id: string): void {
  if (!supabaseReady || !id || id.startsWith("demo")) return;
  void supabase!.rpc("mark_letter_read", { p_letter: id }).then(() => {}, () => {});
}

/* ── Threads + messages (real 1:1 conversations) ── */
export async function replyToLetter(
  letter: PoolLetter,
  body: string,
): Promise<string | null> {
  /* the flag is cleared before ANY early return (critic, 10a step 5): the
     uid check used to return first, so an expired session read whatever
     the previous write had said */
  clearFail();
  if (!letter) return null;
  // a ghost's letter (0009: author nulled with the account) can't be answered
  if (!letter.author) return setFail("gone");
  const me = await writer();
  if (!me) return null;
  try {
    /* ONE ROUND TRIP, WHEN THE SERVER HAS 0017. The three statements below
       are the same three this function used to run from the phone, one at a
       time, with the reader watching a button between each. Doing them in
       the database makes the reply atomic — and closes the window where two
       fast taps forked a stranger into two correspondences. The fallback is
       not dead weight: the RPC is absent until the migration is run by hand,
       and PostgREST answers a missing function with PGRST202. */
    const rpc = await supabase!.rpc("reply_to_letter", { p_letter: letter.id, p_body: body });
    if (!rpc.error && rpc.data) return rpc.data as string;
    if (rpc.error && !/PGRST202|function .* does not exist|schema cache/i.test(rpc.error.message || "")) {
      return noteFail(rpc.error);
    }

    /* ONE CORRESPONDENCE PER STRANGER. `threads` has no unique constraint on
       (a, b) and this function never looked, so answering the same person
       twice — trivial, since an answered letter stayed in the pool — forked
       them into two parallel correspondences, each with its own counts and
       its own road to a name. If one already exists, this is just the next
       letter in it. */
    const { data: open } = await supabase!
      .from("threads")
      .select("id")
      .or(`and(a.eq.${me},b.eq.${letter.author}),and(a.eq.${letter.author},b.eq.${me})`)
      .limit(1)
      .maybeSingle();
    if (open?.id) {
      const sent = await sendThreadMessage(open.id as string, body);
      return sent ? (open.id as string) : null;
    }

    /* counts start at ZERO — the first message's insert bumps a_count to 1
       via 0012's trigger. Seeding 1 here would double-count it. last_* are
       a harmless preview for the instant before that insert lands. */
    const row: Record<string, unknown> = {
      a: me,
      b: letter.author,
      stamp: letter.stamp || "off-chest",
      opening: letter.body || "",
      a_count: 0,
      last_sender: me,
      last_body: body,
      last_at: new Date().toISOString(),
    };
    // snapshot a voice opening (columns exist once 0007 is applied)
    if (letter.kind === "voice" && letter.media_path) {
      row.opening_media = letter.media_path;
      row.opening_duration_s = letter.duration_s ?? null;
    }
    let { data, error } = await supabase!.from("threads").insert(row).select("id").single();
    if (error && row.opening_media) {
      // pre-0007 fallback: retry without the media columns
      delete row.opening_media;
      delete row.opening_duration_s;
      const retry = await supabase!.from("threads").insert(row).select("id").single();
      data = retry.data;
      error = retry.error;
    }
    if (error || !data) return noteFail(error);
    await supabase!
      .from("messages")
      .insert({ thread_id: data.id, sender: me, body: String(body).slice(0, 2000) });
    return data.id as string;
  } catch (e) {
    return noteFail(e);
  }
}

export interface ThreadSummary {
  id: string;
  stamp: string;
  revealed: boolean;
  mine: number; // my message count on this thread
  theirs: number; // their count — what drives a face coming into view
  theirSigned?: boolean; // their name is enclosed, waiting on mine
  iSigned?: boolean; // mine is enclosed, waiting on theirs
  /** everything they have written to me — what lib/correspondent reads */
  theirTexts?: string[];
  otherName: string | null;
  otherFace?: string | null; // the face they chose to give at signing (library id)
  other: string; // correspondent's user id
  /* THE CORRESPONDENT DELETED THEIR ACCOUNT. 0009 sets threads.a/b to null
     rather than cascading, so the survivor keeps their half of the letters
     — that is the point. But `other` then reads null while every screen
     went on treating the correspondence as live: the composer stayed open,
     and `messages` insert still passes RLS (the policy asks only that you
     are a participant, and you still are). So letters kept sending, kept
     succeeding, and went nowhere. It stays readable; it stops being a
     place you can write to. */
  gone?: boolean; // they closed their account — read it, don't write to it
  preview: string;
  lastSenderMe: boolean;
  lastAt: number;
  /** the pool letter this correspondence grew from — its id once 0020 has
      stamped it, its text always — and whether it was mine (I am `b`:
      someone answered my letter). My letters counts answers by it. */
  letterId?: string | null;
  opening?: string;
  fromMyLetter?: boolean;
  /** when both names were sealed (0020) — the date on a Kindred's card */
  revealedAt?: number | null;
}
/* THE LAST GOOD LIST, KEPT. Kindreds is a tab; it should open like one.
   Every fetch writes its result here (memory + the account's own storage),
   and `readThreadsCache` hands it back before the network is asked, so the
   sky is already there when the tab lands and only the changes move. */
const THREADS_CACHE_KEY = "kindredly_threads_cache";
let threadsMem: ThreadSummary[] | null = null;
let threadsFetchedAt = 0;
export async function readThreadsCache(): Promise<ThreadSummary[] | null> {
  if (threadsMem) return threadsMem;
  try {
    const raw = await scoped.getItem(THREADS_CACHE_KEY);
    if (raw) threadsMem = JSON.parse(raw) as ThreadSummary[];
  } catch {
    /* no cache is just a cold start */
  }
  return threadsMem;
}
/** seconds since the list was last fetched for real — Infinity if never */
export const threadsAge = (): number => (threadsFetchedAt ? (Date.now() - threadsFetchedAt) / 1000 : Infinity);

/** your correspondences, newest first — or null when they couldn't be read
    (offline, no session, no keys). Writes the kept copy on success. For
    "a guest" versus "couldn't reach" use fetchThreadsResult. */
export async function fetchThreads(): Promise<ThreadSummary[] | null> {
  const r = await fetchThreadsResult();
  return r.status === "ok" ? r.threads : null;
}

/**
 * The list with its reason when there is none (10a step 5). A guest and a
 * dropped connection both used to read as null, so a screen had to choose
 * between leaving guests on a blank list forever and telling a reader with
 * correspondences that nobody knows their name.
 * - `ok`: the list (also written to the kept copy, see readThreadsCache);
 * - `offline` + reason `no-session`: a real answer — nobody is signed in,
 *   so there is nothing to list; show the empty/guest state;
 * - `offline` + `network` / `error` / `not-ready`: no answer; keep the kept
 *   copy, and with none show an offline line (auth.err.offline), never the
 *   empty state.
 */
export type ThreadsResult = { status: "ok"; threads: ThreadSummary[] } | { status: "offline"; reason: OfflineReason };
/* one realtime burst pokes the tabs layout and the Kindreds tab at the same
   debounce (critic: two full list fetches per poke); a call made while a
   read is in flight shares that read */
let threadsInFlight: Promise<ThreadsResult> | null = null;
/* bumped when a thread is forgotten or a letter leaves: a read that began
   before can't write the forgotten row (or the pre-send list) back into
   the kept list, nor mark it fresh */
let threadsGen = 0;
export function fetchThreadsResult(): Promise<ThreadsResult> {
  if (threadsInFlight) return threadsInFlight;
  const gen = threadsGen;
  const run = (async (): Promise<ThreadsResult> => {
    const r = await fetchThreadsUncached();
    if (r.status === "ok" && gen === threadsGen) {
      threadsMem = r.threads;
      threadsFetchedAt = Date.now();
      void scoped.setItem(THREADS_CACHE_KEY, JSON.stringify(r.threads)).catch(() => {});
    }
    return r;
  })();
  threadsInFlight = run;
  void run.finally(() => {
    if (threadsInFlight === run) threadsInFlight = null;
  });
  return run;
}

/** a correspondence that has just left the list (you blocked them, or the
    server says it is gone): out of the kept list, and its kept room and
    folds deleted too, so nothing can paint it again (once bug 1 kept caches
    offline, a blocked thread could otherwise repaint from its own cache) */
export async function forgetThread(threadId: string): Promise<void> {
  await Promise.all([
    scoped.removeItem(detailCacheKey(threadId)).catch(() => {}),
    scoped.removeItem(foldsCacheKey(threadId)).catch(() => {}),
  ]);
  threadsInFlight = null; // a read begun before this still holds the thread
  threadsGen++;
  const list = (await readThreadsCache())?.filter((x) => x.id !== threadId);
  if (!list) return;
  threadsMem = list;
  threadsFetchedAt = 0;
  await scoped.setItem(THREADS_CACHE_KEY, JSON.stringify(list)).catch(() => {});
}

async function fetchThreadsUncached(): Promise<ThreadsResult> {
  if (!supabaseReady) return { status: "offline", reason: "not-ready" };
  const who = await whoAmI();
  if (!("id" in who)) return { status: "offline", reason: who.reason };
  const me = who.id;
  try {
    let { data, error, status } = await supabase!
      .from("threads")
      .select(
        "id,a,b,stamp,revealed,revealed_at,letter,a_count,b_count,a_name,b_name,a_face,b_face,opening,last_sender,last_body,last_at",
      )
      .or(`a.eq.${me},b.eq.${me}`)
      .order("last_at", { ascending: false });
    if (error && !isNetworkish(error, status)) {
      // pre-0011 fallback: face columns absent (no point retrying a dropped connection)
      const retry = await supabase!
        .from("threads")
        .select(
          "id,a,b,stamp,revealed,a_count,b_count,a_name,b_name,opening,last_sender,last_body,last_at",
        )
        .or(`a.eq.${me},b.eq.${me}`)
        .order("last_at", { ascending: false });
      data = retry.data as any;
      error = retry.error;
      status = retry.status;
    }
    if (error) return { status: "offline", reason: readReason(error, status) };
    if (!data) return { status: "offline", reason: "error" };
    /* an empty list asked with the anon key (expired token, refresh failed)
       must not overwrite the kept list with nothing — see sessionCheck */
    if (!data.length) {
      const why = unconfirmedEmpty(await sessionCheck(), me);
      if (why) return { status: "offline", reason: why };
    }

    /* their letters, beside the rows (the one-tap "a reply is on its way" and
       its side table went 2026-10-10: one person had ever used it) */
    const ids = data.map((r: any) => r.id);
    const msgRes = ids.length
      ? await supabase!.from("messages").select("thread_id,sender,body").in("thread_id", ids).order("created_at").then((r) => r, () => ({ data: null }))
      : { data: null };
    /* THEIR WRITING, for the read (lib/correspondent) — tens of rows, not
       thousands; without it the list could only count letters */
    const theirs = new Map<string, string[]>();
    for (const m of (msgRes.data as any[] | null) || []) {
      if (m.sender === me || !m.body || m.body === TAKEN_BACK) continue;
      const list = theirs.get(m.thread_id) || [];
      list.push(m.body);
      theirs.set(m.thread_id, list);
    }

    const threads = data.map((r: any) => {
      const iamA = r.a === me;
      return {
        id: r.id,
        stamp: r.stamp,
        revealed: !!r.revealed,
        mine: iamA ? r.a_count : r.b_count,
        theirs: iamA ? r.b_count : r.a_count,
        theirSigned: !!(iamA ? r.b_name : r.a_name),
        iSigned: !!(iamA ? r.a_name : r.b_name),
        // the opening was written by b; it is theirs unless I am b
        theirTexts: (iamA && r.opening ? [r.opening as string] : []).concat(theirs.get(r.id) || []),
        otherName: iamA ? r.b_name : r.a_name,
        otherFace: (iamA ? r.b_face : r.a_face) ?? null,
        other: iamA ? r.b : r.a,
        gone: !(iamA ? r.b : r.a),
        preview:
          r.last_body === TAKEN_BACK
            ? r.last_sender === me ? t("rm.recall.mine") : t("rm.recall.theirs", { name: (iamA ? r.b_name : r.a_name) || t("cm.kindred") })
            : r.last_body || r.opening || "",
        opening: r.opening || "",
        letterId: r.letter ?? null,
        fromMyLetter: !iamA,
        revealedAt: r.revealed_at ? Date.parse(r.revealed_at) : null,
        lastSenderMe: r.last_sender === me,
        lastAt: r.last_at ? Date.parse(r.last_at) : Date.now(),
      } as ThreadSummary;
    });
    return { status: "ok", threads };
  } catch (e) {
    return { status: "offline", reason: readReason(e) };
  }
}

export interface ThreadDetail {
  stamp: string;
  revealed: boolean;
  otherName: string | null;
  other: string; // correspondent user id
  gone?: boolean; // they closed their account — see ThreadSummary.gone
  myCount: number;
  otherCount: number;
  iSigned?: boolean; // my pen name is enclosed with this correspondence
  theirSigned?: boolean; // theirs is — one signature from a reveal
  otherFace?: string | null; // the face they chose to give at signing (library id)
  /** when the thread row was created — the FIRST REPLY's date. Never the
      opening letter's date (openingAt) nor the names date (revealedAt):
      known bug 3 stamped this on the stranger's letter. */
  since?: string | null;
  /** when both names were sealed (0020 threads.revealed_at), ISO — "KINDRED SINCE" */
  revealedAt?: string | null;
  /** the opening letter's own created_at, read through threads.letter (0020);
      null when unreadable (withdrawn, blocked, or older than 0020) — then show no date */
  openingAt?: string | null;
  /** the pool letter this correspondence grew from (0020 threads.letter) */
  letterId?: string | null;
  opening: string;
  openingFromMe: boolean;
  /** a voice opening (storage path in 'voice-letters'): the reply RPC copies
      letters.media_path into threads.opening_media (0020:136-142). When set,
      the opening is a voice letter wherever it is shown — not only while it
      is the room's only item (known bug 2). `opening` is then its caption. */
  openingMedia?: string | null;
  openingDurationS?: number | null;
  messages: ThreadMessage[];
}
export interface ThreadMessage {
  id?: string;
  body: string;
  mine: boolean;
  date: string;
  /** 'text' | 'photo' (a tiny moment) | 'song' — absent pre-0015 */
  kind?: string;
  mediaPath?: string | null;
  meta?: { url?: string; title?: string; reply?: MessageQuote } | null;
  /** taken back by its writer (web 0031): the words are gone, a note stays */
  recalledAt?: string | null;
  /** the quoted line is the reader's own */
  replyMine?: boolean;
}
/** a line quoted by a reply: which message, a few words of it, whose it was */
export interface MessageQuote {
  id: string;
  excerpt: string;
  sender?: string;
}
/* WHAT A REPORT CARRIES (2026-10-10, iOS safety gap 4): their newest words
   in the correspondence, the way the web's report does — not the opening
   letter, which is usually the one thing in it that was fine. A photo goes
   by its path, a line taken back is skipped (its words are kept server-side
   for reports already). */
export function theirLatest(messages: ThreadMessage[] | undefined | null, fallback?: string | null): string | undefined {
  const m = [...(messages ?? [])].reverse().find((x) => !x.mine && !x.recalledAt && (x.body || x.mediaPath));
  if (!m) return fallback ?? undefined;
  return m.kind === "photo" ? `[photo] ${m.mediaPath ?? m.meta?.url ?? ""}`.trim() : m.body;
}

/* THE LAST READ OF A ROOM, ON THE PHONE (owner, build 18: "a room takes
   three seconds to open"). The room paints this at once and the fetch
   replaces it; a room opened once never opens blank again. Written only
   after a WHOLE read (both queries answered) — never after a partial one. */
const DETAIL_CACHE = "kindredly_thread_detail";
const FOLDS_CACHE = "kindredly_thread_folds";
/** storage key (account-scoped) of a thread's kept detail */
export const detailCacheKey = (threadId: string): string => `${DETAIL_CACHE}:${threadId}`;
/** storage key (account-scoped) of a thread's kept folds — folds.ts reads and writes it */
export const foldsCacheKey = (threadId: string): string => `${FOLDS_CACHE}:${threadId}`;

/** the kept detail of a thread (the last whole read), or null */
export async function readThreadDetailCache(threadId: string): Promise<ThreadDetail | null> {
  try {
    const raw = await scoped.getItem(detailCacheKey(threadId));
    return raw ? (JSON.parse(raw) as ThreadDetail) : null;
  } catch {
    return null;
  }
}

/* the thread row's column sets, newest server first. The first embeds the
   opening letter through threads.letter (0020) for its created_at; RLS on
   letters hides a withdrawn or blocked letter, and the embed is then null. */
const THREAD_COLS = {
  sets: [
    "a,b,stamp,revealed,revealed_at,letter,a_count,b_count,a_name,b_name,a_face,b_face,opening,opening_media,opening_duration_s,created_at,opening_letter:letters!letter(created_at)",
    // the embed refused (schema cache): the 0020 columns without the letter's date
    "a,b,stamp,revealed,revealed_at,letter,a_count,b_count,a_name,b_name,a_face,b_face,opening,opening_media,opening_duration_s,created_at",
    // pre-0020: no revealed_at / letter
    "a,b,stamp,revealed,a_count,b_count,a_name,b_name,a_face,b_face,opening,opening_media,opening_duration_s,created_at",
    // pre-0007 / pre-0011: no media or face columns
    "a,b,stamp,revealed,a_count,b_count,a_name,b_name,opening,created_at",
  ],
  from: 0, // the first set this server accepted — later reads start there
};
const MESSAGE_COLS = {
  sets: [
    "id,sender,body,created_at,kind,media_path,meta,recalled_at",
    // pre-0031: no recalled_at
    "id,sender,body,created_at,kind,media_path,meta",
    // pre-0015: no kind / media columns
    "sender,body,created_at",
  ],
  from: 0,
};
type Answer<T> = { data: T | null; error: unknown | null; status: number };
/* run the column sets in order until one answers. Only a schema refusal
   (a column or relationship this server doesn't have) moves on to the
   older set; a dropped connection or any other error ends the chain at
   once — retrying older schemas offline only adds waits, and a passing
   5xx must not demote the read for the rest of the launch. The set that
   answered is remembered, so an older server pays the failed tries once
   per launch, not on every read. */
async function firstAnswer<T>(run: (cols: string) => PromiseLike<Answer<T>>, cols: { sets: string[]; from: number }): Promise<Answer<T>> {
  let last: Answer<T> = { data: null, error: null, status: 0 };
  for (let i = cols.from; i < cols.sets.length; i++) {
    last = await run(cols.sets[i]);
    if (!last.error) {
      cols.from = i;
      return last;
    }
    if (!isSchemaError(last.error, last.status)) return last;
  }
  return last;
}

/**
 * One thread, with its reason when there is none (10a step 5; the root of
 * known bug 1). Never throws.
 * - `{status:'ok', detail}` — the row and every message were read; the
 *   detail is also written to the kept copy (readThreadDetailCache).
 * - `{status:'offline', reason}` — no keys (not-ready), nobody signed in or
 *   the session not restored (no-session), a dropped connection (network),
 *   or a query error (error) — INCLUDING a failed messages query after the
 *   row was read. Keep what is painted; the cache is not touched.
 * - `{status:'missing'}` — the server answered without error that this
 *   reader has no such thread (deleted, or hidden by a block), and a
 *   session for this reader is there after it (an empty answer asked with
 *   the anon key is offline instead — confirmMissing). The kept detail and
 *   folds are deleted; the screen shows a closed state in place.
 * The detail carries revealedAt, openingAt (the opening letter's own date)
 * and openingMedia (a voice opening). Demo ids are not handled here — see
 * useThreadDetail.
 */
export async function fetchThreadDetail(threadId: string): Promise<ThreadDetailResult> {
  if (!supabaseReady) return { status: "offline", reason: "not-ready" };
  if (!threadId) return { status: "missing" };
  const who = await whoAmI();
  if (!("id" in who)) return { status: "offline", reason: who.reason };
  const me = who.id;
  try {
    /* the row and the messages in ONE round trip, not one after the other
       — the serial pair was the whole of the wait on a slow link */
    const [tRes, mRes] = await Promise.all([
      firstAnswer<ThreadRow>(
        (cols) => supabase!.from("threads").select(cols).eq("id", threadId).maybeSingle() as unknown as PromiseLike<Answer<ThreadRow>>,
        THREAD_COLS,
      ),
      firstAnswer<MessageRow[]>(
        (cols) => supabase!.from("messages").select(cols).eq("thread_id", threadId).order("created_at") as unknown as PromiseLike<Answer<MessageRow[]>>,
        MESSAGE_COLS,
      ),
    ]);
    let verdict = decideThreadFetch({
      threadError: tRes.error,
      threadStatus: tRes.status,
      hasRow: !!tRes.data,
      messagesError: mRes.error,
      messagesStatus: mRes.status,
    });
    /* an empty answer asked with the anon key (an expired token whose
       refresh failed) is not a deleted thread: nothing is removed, and
       the screen keeps what it painted */
    if (verdict.status === "missing") verdict = confirmMissing(verdict, await sessionCheck(), me);
    if (verdict.status === "missing") {
      void scoped.removeItem(detailCacheKey(threadId)).catch(() => {});
      void scoped.removeItem(foldsCacheKey(threadId)).catch(() => {});
      return verdict;
    }
    if (verdict.status === "offline") return verdict;
    const detail = buildThreadDetail(tRes.data!, mRes.data ?? [], me);
    void scoped.setItem(detailCacheKey(threadId), JSON.stringify(detail)).catch(() => {});
    return { status: "ok", detail };
  } catch (e) {
    return { status: "offline", reason: readReason(e) };
  }
}

/**
 * The old shape, kept for callers not yet on fetchThreadDetail /
 * useThreadDetail: the fresh detail; when the network can't answer, the
 * kept copy (so a screen that does setDetail(await fetchThreadMessages(id))
 * no longer goes blank offline); null when the thread is missing, or
 * offline with nothing kept.
 */
export async function fetchThreadMessages(threadId: string): Promise<ThreadDetail | null> {
  const r = await fetchThreadDetail(threadId);
  if (r.status === "ok") return r.detail;
  if (r.status === "offline") return readThreadDetailCache(threadId);
  return null;
}

/**
 * Is this thread revealed (names traded)? For push routing (room vs chat):
 * the kept detail first, then the kept list, then a one-column read — so an
 * offline cold start from a notification still opens a kindred in the room.
 * null when nothing can say (offline with no copy, or missing).
 */
export async function fetchThreadRevealed(threadId: string): Promise<boolean | null> {
  const kept = await readThreadDetailCache(threadId);
  if (kept) return !!kept.revealed;
  const row = (await readThreadsCache())?.find((x) => x.id === threadId);
  if (row) return !!row.revealed;
  if (!supabaseReady) return null;
  try {
    const { data, error } = await supabase!.from("threads").select("revealed").eq("id", threadId).maybeSingle();
    return error || !data ? null : !!(data as { revealed?: boolean }).revealed;
  } catch {
    return null;
  }
}

/* Send a message — ONE insert. Counts and last_* move in the database
   (0012's trigger), atomically: the old read-modify-write here lost
   updates the moment realtime made simultaneous sending an everyday
   event, and a lost count silently costs the 5/5 signing gate and the
   face's develop. Names and reveal don't move here either — since 0010
   a name is written only by the act of SIGNING (signThread). */
export async function sendThreadMessage(
  threadId: string,
  body: string,
  extra?: { kind: "photo" | "song" | "text"; mediaPath?: string; meta?: { url?: string; title?: string; reply?: MessageQuote } },
): Promise<{ ok: true; id?: string; createdAt?: string } | null> {
  const me = await writer();
  if (!me) return null;
  try {
    /* NOBODY HOME. Four surfaces write through here — chat, the room's three
       traces, and thread — so this is the one place the check cannot be
       forgotten. RLS lets a participant insert into a thread whose other
       side 0009 has set to null, which meant letters to a deleted
       correspondent were accepted and stored and never read. The composer is
       closed upstream; this is the lock behind it. A thread the server no
       longer shows this reader (0024 hides a blocked pair's both ways) is
       just as closed — both say 'gone', so the alert stops advising a retry.
       An empty answer is 'gone' only when it was asked with this reader's
       session (emptyReadFail): an expired token whose refresh failed sends
       the anon key, which also reads no row. */
    const { data: sides, error: sidesErr } = await supabase!
      .from("threads")
      .select("a,b")
      .eq("id", threadId)
      .maybeSingle();
    if (!sidesErr && !sides) return setFail(emptyReadFail(await sessionCheck(), me));
    if (sides && !(sides.a === me ? sides.b : sides.a)) return setFail("gone");

    /* body always carries a readable fallback, so the web app and any
       pre-0015 reader degrade to plain text instead of an empty bubble */
    const row: Record<string, unknown> = { thread_id: threadId, sender: me, body: String(body).slice(0, 2000) };
    if (extra) {
      row.kind = extra.kind;
      if (extra.mediaPath) row.media_path = extra.mediaPath;
      if (extra.meta) {
        // a quote of your own line names you by id, so the other phone can tell whose it was
        const reply = extra.meta.reply;
        row.meta = reply && reply.sender === "me" ? { ...extra.meta, reply: { ...reply, sender: me } } : extra.meta;
      }
    }
    /* the row comes back with its id and the server's time, so the line just
       sent can be replied to or taken back at once — not only after the
       realtime echo reloads the room */
    let saved: { id?: string; created_at?: string } | null = null;
    let { data: ins, error } = await supabase!.from("messages").insert(row).select("id,created_at").maybeSingle();
    if (!error) saved = (ins as any) ?? null;
    if (error && extra) {
      // pre-0015 columns — the moment/song still arrives as its text fallback
      const retry = await supabase!
        .from("messages")
        .insert({ thread_id: threadId, sender: me, body: String(body).slice(0, 2000) });
      error = retry.error;
    }
    if (error) return noteFail(error) as null;
    /* the list is out of date the moment a letter leaves: the next visit
       to Kindreds asks again, so the stranger you just answered has moved
       to IN TRANSIT by the time you're back (owner, 2026-09-23) — and a
       read already in flight began before it, so nobody joins that one,
       and its answer (bumped generation) can't write the pre-send list
       back as fresh */
    threadsFetchedAt = 0;
    threadsInFlight = null;
    threadsGen++;
    return { ok: true, id: saved?.id, createdAt: saved?.created_at };
  } catch (e) {
    return noteFail(e);
  }
}

/* Enclose my pen name with this correspondence. From the fifth letter on
   (client-gated in the UI), either side may sign; whoever signs second
   completes the reveal. Returns { revealed } — true when the second
   signature just landed (mine), so the caller can hold the ceremony. */
export async function signThread(threadId: string): Promise<{ revealed: boolean } | null> {
  /* chat/[id] reports this failure through alertFail, which reads the module
     flag — without clearing it first, a failed signature inherits whatever
     the last write said and can announce a lost connection over a live one. */
  const me = await writer();
  if (!me) return null;
  try {
    const { data: t, error: tErr } = await supabase!
      .from("threads")
      .select("a,b,a_name,b_name,revealed")
      .eq("id", threadId)
      .maybeSingle();
    if (tErr) return noteFail(tErr);
    // no row: 'gone' only if asked as this reader (see sendThreadMessage)
    if (!t) return setFail(emptyReadFail(await sessionCheck(), me));
    if (!(t.a === me ? t.b : t.a)) return setFail("gone");
    const iamA = t.a === me;
    const theirs = iamA ? t.b_name : t.a_name;
    const patch: Record<string, unknown> = { [iamA ? "a_name" : "b_name"]: await currentHandle() };
    const face = await currentFace();
    if (face) patch[iamA ? "a_face" : "b_face"] = face;
    if (theirs) patch.revealed = true;
    let { error } = await supabase!.from("threads").update(patch).eq("id", threadId);
    if (error && face) {
      // pre-0011 backend: the face columns don't exist yet — sign with the name alone
      delete patch[iamA ? "a_face" : "b_face"];
      const retry = await supabase!.from("threads").update(patch).eq("id", threadId);
      error = retry.error;
    }
    if (error) return noteFail(error);
    return { revealed: !!theirs || !!t.revealed };
  } catch (e) {
    return noteFail(e);
  }
}

/* ── Trust & Safety ── */
/* TAKE IT BACK (web 0031): your own line, within two minutes of sending it.
   The server is the clock — this only asks. "too_late" when the two minutes
   are up; null when it couldn't ask (offline, or before 0031 ran). */
export async function takeBack(messageId: string): Promise<"ok" | "too_late" | null> {
  clearFail();
  if (!supabaseReady) return null;
  try {
    const { error } = await supabase!.rpc("take_back", { p_id: messageId });
    if (!error) return "ok";
    if (error.hint === "too_late" || /too late/i.test(error.message || "")) return "too_late";
    return noteFail(error) as null;
  } catch (e) {
    return noteFail(e) as null;
  }
}

export async function reportContent(input: {
  targetUser?: string | null;
  context?: string | null;
  refId?: string | null;
  reason?: string;
  snapshot?: string | null;
}): Promise<true | null> {
  const me = await writer();
  if (!me) return null;
  try {
    const { error } = await supabase!.from("reports").insert({
      reporter: me,
      target_user: input.targetUser || null,
      context: input.context || null,
      ref_id: input.refId ? String(input.refId) : null,
      reason: input.reason || "other",
      snapshot: input.snapshot ? String(input.snapshot).slice(0, 1000) : null,
    });
    return error ? noteFail(error) : true;
  } catch (e) {
    return noteFail(e);
  }
}

/* ── Window (a post your kindreds can see) ──
   Requires the `windows` table + RLS (see supabase/migrations/0006_windows.sql
   in the web repo). Until that migration is applied these fail-safe to null. */
export interface WindowPost {
  type: string; // 'line' (MVP) | 'photo' | 'sound'
  body: string;
  mood: string | null;
}
export async function fetchMyWindow(): Promise<WindowPost | null> {
  if (!supabaseReady) return null;
  const id = await uid();
  if (!id) return null;
  try {
    const { data, error } = await supabase!
      .from("windows")
      .select("type,body,mood")
      .eq("user_id", id)
      .maybeSingle();
    if (error || !data) return null;
    return data as WindowPost;
  } catch {
    return null;
  }
}
export async function fetchWindow(userId: string): Promise<WindowPost | null> {
  if (!supabaseReady || !userId) return null;
  try {
    const { data, error } = await supabase!
      .from("windows")
      .select("type,body,mood")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return data as WindowPost;
  } catch {
    return null;
  }
}
export async function upsertWindow(
  type: string,
  body: string,
  mood: string,
): Promise<true | null> {
  if (!supabaseReady || !body) return null;
  const id = await uid();
  if (!id) return null;
  try {
    const { error } = await supabase!.from("windows").upsert(
      { user_id: id, type: type || "line", body: String(body).slice(0, 400), mood, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    return error ? null : true;
  } catch {
    return null;
  }
}

/* The block list — the two policies 0004 already granted (read own,
   remove own) finally get a screen. The only identity we ever had for a
   blocked writer is their uuid, which is also the only identity the reader
   ever saw — the MosaicId on their letters is derived from it, so the list
   can show exactly the face you blocked and nothing more. */
export interface BlockRow {
  blocked: string;
  created_at: string;
}

export async function fetchBlocks(): Promise<BlockRow[] | null> {
  if (!supabaseReady) return null;
  const me = await uid();
  if (!me) return null;
  try {
    const { data, error } = await supabase!
      .from("blocks")
      .select("blocked, created_at")
      .eq("blocker", me)
      .order("created_at", { ascending: false });
    if (error || !data) return null;
    return data as BlockRow[];
  } catch {
    return null;
  }
}

export async function unblockUser(targetUser: string): Promise<true | null> {
  if (!targetUser) {
    clearFail();
    return null;
  }
  const me = await writer();
  if (!me) return null;
  try {
    const { error } = await supabase!.from("blocks").delete().eq("blocker", me).eq("blocked", targetUser);
    return error ? noteFail(error) : true;
  } catch (e) {
    return noteFail(e);
  }
}

export async function blockUser(targetUser: string): Promise<true | null> {
  if (!targetUser) {
    clearFail();
    return null;
  }
  const me = await writer();
  if (!me) return null;
  try {
    const { error } = await supabase!
      .from("blocks")
      .upsert({ blocker: me, blocked: targetUser }, { onConflict: "blocker,blocked" });
    return error ? noteFail(error) : true;
  } catch (e) {
    return noteFail(e);
  }
}

/* ── a letter to us ─────────────────────────────────────────────────────
   Not a thread: support is not a correspondence, and giving the company a
   row in Kindreds would dress it as a kindred and feed it into counts a
   real relationship has to earn. It lands in its own table (0013), where
   only the service role can read it. */
export async function sendSupportLetter(
  body: string,
  replyTo: string | null,
  appVersion: string,
): Promise<true | null> {
  const me = await writer();
  if (!me) return null;
  try {
    const { error } = await supabase!.from("support_letters").insert({
      author: me,
      body: String(body).slice(0, 4000),
      reply_to: replyTo?.trim() || null,
      app_version: appVersion,
    });
    return error ? noteFail(error) : true;
  } catch (e) {
    return noteFail(e);
  }
}
