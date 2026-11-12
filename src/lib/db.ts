/* Supabase data layer — direct RLS reads/writes, ported from kindredly/app/db.js.
   Every call is fail-safe: no client / missing table / network error → null and
   the caller falls back. RN adaptation: the writer handle comes from the signed-in
   user's user_metadata (the web read it from a localStorage session mirror). */

import { supabase, supabaseReady } from "./supabase";
import { forgetMarks } from "./identity";
import { forgetMemberMark } from "./member-marks";
import { isMissingRpc } from "./identity-core";
import { penFaceOrNull, penOrNull, simplifyPen, validatePen, type PenSig } from "./pen-signature";
import { scoped } from "./scoped-store";
import { isOffline } from "./net";
import { track } from "./track";
import { t } from "./i18n";
import { paperForDb } from "../data/papers";
import type { Sky } from "../data/sparkle-deck";
import {
  TAKEN_BACK,
  buildThreadDetail,
  confirmMissing,
  decideThreadFetch,
  emptyReadFail,
  isNetworkish,
  isSchemaError,
  readReason,
  signedOf,
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

/** current writer's pen name (handle) for thread name-reveal: the pen name alone, never the
    account's legal name (full_name / name, filled by Apple and Google); "" when there is none, and
    signThread then refuses rather than sending an empty name. */
async function currentHandle(): Promise<string> {
  if (!supabase) return "";
  try {
    const { data } = await supabase.auth.getSession(); // the metadata is on the local session
    const m: any = data.session?.user?.user_metadata || {};
    return typeof m.handle === "string" ? m.handle.trim() : "";
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
/* THE PAPER (letter papers, 2026-10-20; contract .claude/papers/CONTRACT.md §5.7): the id the
   writer picked in the compose screen, sent as letters.paper (null = plain, so a plain letter's
   insert is exactly what it always was). The server has the last word (web migration 0041 turns a
   paper the author may not use to null). Before 0041 the column doesn't exist: that insert is
   refused (42703 / PGRST204), logged, and sent once more without it — the letter goes, as plain. */
const missingColumn = (e: unknown): boolean => {
  const code = (e as { code?: unknown } | null)?.code;
  return code === "42703" || code === "PGRST204";
};

export async function publishLetter(
  stamp: string,
  body: string,
  lang: string,
  paper: string | null = null,
): Promise<string | null> {
  if (!body) {
    clearFail();
    return null;
  }
  const id = await writer();
  if (!id) return null;
  /* THE LETTER KNOWS ITS OWN ID BEFORE IT LEAVES (owner's phone, 2026-10-20: "Couldn't send"
     twice, and both letters were in the pool — 22:42:53 and 22:49:38). The insert reached the
     server and landed; its answer didn't make it back in time, so the phone called it a failure
     and the writer was asked to send it again (a second copy). The id is now made here, and a
     failed or timed-out insert asks once whether that id is in the pool before it says no. */
  const letterId = newLetterId();
  try {
    const row = {
      id: letterId,
      author: id,
      stamp: stamp || "off-chest",
      body: String(body).slice(0, 2000),
      lang: lang || "en",
    };
    const onPaper = paperForDb(paper);
    const insert = (r: Record<string, unknown>) => supabase!.from("letters").insert(r).select("id").single();
    let { data, error } = await insert(onPaper ? { ...row, paper: onPaper } : row);
    if (error && onPaper && missingColumn(error)) {
      console.warn("[db] letters.paper is missing (0041 not run): sending the letter as plain", error);
      ({ data, error } = await insert(row));
    }
    if (!error) return (data as { id: string } | null)?.id ?? letterId;
    if (await letterLanded(letterId)) {
      console.warn("[db] the letter's insert answered with an error, but the letter is in the pool:", error);
      return letterId;
    }
    return noteFail(error) as null;
  } catch (e) {
    if (await letterLanded(letterId)) {
      console.warn("[db] the letter's insert never answered, but the letter is in the pool:", e);
      return letterId;
    }
    return noteFail(e);
  }
}

/** a v4 uuid for a new letter (ids only need to be unique, not secret) */
function newLetterId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  const hex = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) s += "-";
    else if (i === 14) s += "4";
    else if (i === 19) s += hex[8 + Math.floor(Math.random() * 4)];
    else s += hex[Math.floor(Math.random() * 16)];
  }
  return s;
}

/** whether a letter with this id is in the pool (after an insert whose answer was lost); false when that can't be told */
async function letterLanded(letterId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase!.from("letters").select("id").eq("id", letterId).maybeSingle();
    if (error) {
      console.warn("[db] couldn't check whether the letter landed:", error);
      return false;
    }
    return !!data;
  } catch (e) {
    console.warn("[db] couldn't check whether the letter landed:", e);
    return false;
  }
}

/** Whether I have a first kindred (a thread of mine where names were traded: threads.revealed),
    which opens the Airmail paper; null when it couldn't be read (logged). */
export async function fetchHasKindred(): Promise<boolean | null> {
  if (!supabaseReady) return null;
  const me = await uid();
  if (!me) return null;
  try {
    const { data, error } = await supabase!
      .from("threads")
      .select("id")
      .or(`a.eq.${me},b.eq.${me}`)
      .eq("revealed", true)
      .limit(1);
    if (error) {
      console.warn("[db] couldn't read whether I have a kindred", error);
      return null;
    }
    return (data?.length ?? 0) > 0;
  } catch (e) {
    console.warn("[db] couldn't read whether I have a kindred", e);
    return null;
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
  /** the letter's paper id (src/data/papers.ts; null / unknown = plain) */
  paper?: string | null; // absent before 0041
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
export async function fetchPool(limit = 40, authors?: string[], skip?: ReadonlySet<string>): Promise<PoolLetter[] | null> {
  const page = await fetchPoolPage(limit, authors, skip);
  return page ? page.letters : null;
}

/* A LETTER COMES ONCE (owner, 2026-11-12: "好多信重复被推荐"). The desk used to forget at
   every turn of the day and dealt from the newest forty, about three days of letters, so a
   letter passed yesterday came back today and tomorrow. Now what this reader has read stays
   off their desk: the server's own list (0054 my_read_letters: letter_reads, their rows
   only, iPhone and web alike) plus the phone's (lib/seen-letters: everything put on screen,
   even flicked past). With `skip`, the pool reads further back, page by page, until it has
   POOL_WANT letters this reader hasn't seen, or POOL_REACH_DAYS, or POOL_MAX_PAGES. The
   first page is the newest `limit` as it always was (no age limit), and only a short FIRST
   page says the pool is whole: a page cut short by the age limit has not seen everything,
   and keepDesk would drop a desk letter that was simply older than it. */
const POOL_MAX_PAGES = 5;
const POOL_REACH_DAYS = 60;
const POOL_WANT = 20; // twice a desk: room for the day's shuffle and the one-per-writer rule

/** the letters this reader has read (0054). null = no answer (offline, or 0054 not run yet):
    the phone's own list still holds, and nothing is kept out on a guess */
export async function fetchMyReads(days = POOL_REACH_DAYS): Promise<Set<string> | null> {
  if (!supabaseReady) return null;
  try {
    const { data, error } = await supabase!.rpc("my_read_letters", { p_days: days });
    if (error || !Array.isArray(data)) {
      if (error) console.warn("[db] my_read_letters (has 0054 run?)", error);
      return null;
    }
    const out = new Set<string>();
    for (const r of data as unknown[]) {
      const id = typeof r === "string" ? r : r && typeof r === "object" ? (r as Record<string, unknown>).my_read_letters : null;
      if (typeof id === "string") out.add(id);
    }
    return out;
  } catch (e) {
    console.warn("[db] my_read_letters", e);
    return null;
  }
}

/** fetchPool, and whether that page is the server's whole pool: fewer rows came back than were
    asked for. Read from the rows the server sent, BEFORE the viewer's own, their kindreds' and
    blocked writers' letters are taken out below — the filtered list is nearly always shorter than
    a page, and Today read that as "the whole pool" and dropped every desk letter that had only
    aged past the newest page (2026-10-18: the count fell with nothing passed). */
const POOL_MEDIA_COLUMNS = "id, author, stamp, body, lang, created_at, kind, media_path, duration_s";
/** letters.paper was refused once this run (0041 not run): the pool stops asking for it */
let poolWithoutPaper = false;

export async function fetchPoolPage(limit = 40, authors?: string[], skip?: ReadonlySet<string>): Promise<{ letters: PoolLetter[]; whole: boolean } | null> {
  if (!supabaseReady) return null;
  if (authors && !authors.length) return { letters: [], whole: true };
  const me = await uid();
  const since = skip ? new Date(Date.now() - POOL_REACH_DAYS * 86400000).toISOString() : null;
  // page 0 is the newest `limit`; each further page reaches back past what this reader has seen
  const fetchRows = async (from: number) => {
    const page = (columns: string) => {
      let q = supabase!
        .from("letters")
        .select(columns)
        .eq("active", true)
        .not("author", "is", null)
        .order("created_at", { ascending: false })
        .range(from, from + limit - 1);
      if (authors) q = q.in("author", authors);
      if (since && from > 0) q = q.gte("created_at", since);
      return q;
    };
    // the paper (0041), then the media columns without it (0007), then the oldest list
    let { data, error } = poolWithoutPaper
      ? await page(POOL_MEDIA_COLUMNS)
      : await page(POOL_MEDIA_COLUMNS + ", paper");
    if (error && !poolWithoutPaper) {
      // 0041 not run yet: the letters come without their paper (plain), for the rest of this run
      // when the column is missing
      console.warn("[db] the pool without letters.paper (has 0041 run?)", error);
      if (missingColumn(error)) poolWithoutPaper = true;
      ({ data, error } = await page(POOL_MEDIA_COLUMNS));
    }
    if (error) {
      // migration 0007 not applied yet → retry without media columns
      const fallback = await page("id, author, stamp, body, lang, created_at");
      data = fallback.data as any;
      if (fallback.error || !data) return null;
    }
    return data ? (data as unknown as PoolLetter[]) : null; // the column list is built at run time (page above), so its rows are untyped
  };
  try {
    const first = await fetchRows(0);
    if (!first) return null;
    let rows = first;
    const whole = first.length < limit;
    // reach back while too few of them are new to this reader (only with `skip`)
    for (let n = 1, last = first; skip && last.length === limit && n < POOL_MAX_PAGES && rows.filter((r) => !skip.has(r.id)).length < POOL_WANT; n++) {
      const more = await fetchRows(n * limit);
      if (!more) break; // what came back already is still a pool
      const have = new Set(rows.map((r) => r.id)); // a letter written between pages shifts the next page by one
      rows = rows.concat(more.filter((r) => !have.has(r.id)));
      last = more;
    }

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
    return {
      letters: rows.filter((r) => r.author && r.author !== me && !known.has(r.author) && !skip?.has(r.id)),
      whole,
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
  theirSigned?: boolean; // their name is enclosed, waiting on mine (web 0035 b_signed/a_signed; before it, a name on the row)
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
  /** when the thread was opened (threads.created_at, epoch ms): the reader's list
      is ordered by it, oldest first, to give each stranger a courier name that
      never repeats within the list (lib/stranger-name). Missing in a list kept
      from before it was fetched: sorts as the oldest, then by id. */
  createdAt?: number | null;
}
/* THE LAST GOOD LIST, KEPT. Kindreds is a tab; it should open like one.
   Every fetch writes its result here (memory + the account's own storage),
   and `readThreadsCache` hands it back before the network is asked, so the
   sky is already there when the tab lands and only the changes move. */
const THREADS_CACHE_KEY = "kindredly_threads_cache";
let threadsMem: ThreadSummary[] | null = null;
let threadsFetchedAt = 0;
/* WHO ELSE FOLLOWS THE KEPT LIST. The courier names (lib/who) are worked
   out from the reader's whole list, oldest thread first, so a screen that
   holds no list of its own (a chat, the reader, the blocked list) follows
   this one: told whenever the kept copy changes (read from storage, a
   fresh fetch, a thread forgotten). */
const threadsListeners = new Set<() => void>();
function setThreadsMem(list: ThreadSummary[] | null): void {
  threadsMem = list;
  threadsListeners.forEach((f) => f());
}
/** The kept list as it stands in memory, without waiting (null = not read yet this run). */
export const keptThreads = (): ThreadSummary[] | null => threadsMem;
/** Told whenever the kept list changes; returns the unsubscribe (for useSyncExternalStore). */
export function subscribeKeptThreads(f: () => void): () => void {
  threadsListeners.add(f);
  return () => {
    threadsListeners.delete(f);
  };
}
export async function readThreadsCache(): Promise<ThreadSummary[] | null> {
  if (threadsMem) return threadsMem;
  try {
    const raw = await scoped.getItem(THREADS_CACHE_KEY);
    if (raw && !threadsMem) setThreadsMem(JSON.parse(raw) as ThreadSummary[]);
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
      setThreadsMem(r.threads);
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
  setThreadsMem(list);
  threadsFetchedAt = 0;
  await scoped.setItem(THREADS_CACHE_KEY, JSON.stringify(list)).catch(() => {});
}

/* the list's columns (0020 on); web 0035's a_signed / b_signed are asked beside them while this
   server is known to have them — the first refusal turns that off for the rest of the launch */
const LIST_COLS = "id,a,b,stamp,revealed,revealed_at,letter,a_count,b_count,a_name,b_name,a_face,b_face,opening,last_sender,last_body,last_at,created_at";
let listSigned = true;

async function fetchThreadsUncached(): Promise<ThreadsResult> {
  if (!supabaseReady) return { status: "offline", reason: "not-ready" };
  const who = await whoAmI();
  if (!("id" in who)) return { status: "offline", reason: who.reason };
  const me = who.id;
  try {
    const listOf = (cols: string) => supabase!.from("threads").select(cols).or(`a.eq.${me},b.eq.${me}`).order("last_at", { ascending: false });
    /* web 0035's signed flags first (a sealed name no longer sits on the row, so the flags are what
       says "they went first"); a server without them refuses the column (a schema error), and the
       read goes on as before — and stays there for the rest of the launch */
    let { data, error, status } = (await listOf(listSigned ? `${LIST_COLS},a_signed,b_signed` : LIST_COLS)) as { data: any[] | null; error: any; status: number };
    if (error && listSigned && isSchemaError(error, status)) {
      listSigned = false;
      ({ data, error, status } = (await listOf(LIST_COLS)) as { data: any[] | null; error: any; status: number });
    }
    if (error && !isNetworkish(error, status)) {
      // pre-0011 fallback: face columns absent (no point retrying a dropped connection)
      const retry = await supabase!
        .from("threads")
        .select(
          "id,a,b,stamp,revealed,a_count,b_count,a_name,b_name,opening,last_sender,last_body,last_at,created_at",
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
        theirSigned: signedOf(r, iamA ? "b" : "a"),
        iSigned: signedOf(r, iamA ? "a" : "b"),
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
        createdAt: r.created_at ? Date.parse(r.created_at) : null,
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
  /* WHAT EACH SIDE WAS GIVEN AT THE REVEAL (web 0035 publishes both seals together). Before
     names, and on a thread revealed before 0035, the drawings are null: show the typed name.
     The drawings are PEN v1 (lib/pen-signature), checked here before they are kept. */
  /** their drawn pen name; null = typed (or not revealed yet) */
  otherSig?: PenSig | null;
  /** my drawn pen name as they received it; null = typed */
  mySig?: PenSig | null;
  /** my pen name as they received it (my a_name / b_name): the ceremony shows this, not today's profile */
  mySignedName?: string | null;
  /** the face I gave them (library id), as they received it; null = the glyph */
  mySignedFace?: string | null;
  /** when the thread row was created — the FIRST REPLY's date. Never the
      opening letter's date (openingAt) nor the names date (revealedAt):
      known bug 3 stamped this on the stranger's letter. */
  since?: string | null;
  /** when both names were sealed (0020 threads.revealed_at), ISO — "KINDRED SINCE" */
  revealedAt?: string | null;
  /** the opening letter's own created_at, read through threads.letter (0020);
      null when unreadable (withdrawn, blocked, or older than 0020) — then show no date */
  openingAt?: string | null;
  /** the paper the opening letter was written on (web 0041 letters.paper, read through
      threads.letter): null for plain, unreadable, or a server before 0041 (src/data/papers
      paperOf). Replies have no paper. */
  openingPaper?: string | null;
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
  /** 'text' | 'photo' (a tiny moment) | 'song' | 'wave' (the sky wave, web 0044) — absent pre-0015 */
  kind?: string;
  mediaPath?: string | null;
  /** a wave (web 0044) carries only `sky` and, for a wave back, `back` (the wave it answers) */
  meta?: { url?: string; title?: string; reply?: MessageQuote; sky?: Sky; back?: string } | null;
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
   opening letter through threads.letter (0020) for its created_at and, from
   web 0041, its paper (a server without letters.paper refuses that set as a
   schema error and the next one answers); RLS on letters hides a withdrawn
   or blocked letter, and the embed is then null. */
const THREAD_COLS = {
  sets: [
    // web 0041: the opening letter's paper with its date (letter papers)
    "a,b,stamp,revealed,revealed_at,letter,a_count,b_count,a_name,b_name,a_face,b_face,a_signed,b_signed,a_sig,b_sig,opening,opening_media,opening_duration_s,created_at,opening_letter:letters!letter(created_at,paper)",
    // web 0035: the signed flags and the drawn signatures
    "a,b,stamp,revealed,revealed_at,letter,a_count,b_count,a_name,b_name,a_face,b_face,a_signed,b_signed,a_sig,b_sig,opening,opening_media,opening_duration_s,created_at,opening_letter:letters!letter(created_at)",
    "a,b,stamp,revealed,revealed_at,letter,a_count,b_count,a_name,b_name,a_face,b_face,a_signed,b_signed,a_sig,b_sig,opening,opening_media,opening_duration_s,created_at",
    // pre-0035: no signed flags or drawings (a name on the row is the signature)
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
    const built = buildThreadDetail(tRes.data!, mRes.data ?? [], me);
    // a stored drawing is drawn only when it is PEN v1; anything else is the typed name
    const detail: ThreadDetail = { ...built, otherSig: penOrNull(built.otherSig), mySig: penOrNull(built.mySig) };
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
/* A SEND NEVER HANGS (owner, 2026-10-31: readers wrote that in a kindred room the key "just greys
   out and stops responding" for a week). Whatever the cause, twenty seconds without an answer is a
   failed send: the composer gets its words back and says so, instead of waiting forever; and the
   moment is recorded (events: send_failed) so the cause can be found. */
export const SEND_TIMEOUT_MS = 20_000;

export async function sendThreadMessage(
  threadId: string,
  body: string,
  extra?: Parameters<typeof sendThreadMessageNow>[2],
): Promise<{ ok: true; id?: string; createdAt?: string } | null> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((done) => {
    timer = setTimeout(() => done("timeout"), SEND_TIMEOUT_MS);
  });
  try {
    const r = await Promise.race([sendThreadMessageNow(threadId, body, extra), timeout]);
    if (r === "timeout") {
      setFail("offline");
      track("send_failed", { why: "timeout", kind: extra?.kind ?? "text" });
      return null;
    }
    if (!r) track("send_failed", { why: lastFailKind ?? "unknown", kind: extra?.kind ?? "text", ms: Date.now() - started });
    return r;
  } catch (e) {
    track("send_failed", { why: "threw", msg: String((e as Error)?.message ?? e).slice(0, 120), kind: extra?.kind ?? "text" });
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function sendThreadMessageNow(
  threadId: string,
  body: string,
  extra?: {
    kind: "photo" | "song" | "text" | "wave";
    mediaPath?: string;
    meta?: { url?: string; title?: string; reply?: MessageQuote; sky?: Sky; back?: string };
  },
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
      if (extra.kind === "wave") {
        /* a wave's meta is the sky word and, for a wave back, the id it answers —
           nothing else, ever (web 0044 checks it): never the time, the place */
        const sky = extra.meta?.sky ?? "day";
        row.meta = extra.meta?.back ? { sky, back: extra.meta.back } : { sky };
      } else if (extra.meta) {
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
    // one wave back per wave (0044's unique index): a second one means it already went
    if (error && extra?.kind === "wave" && (error as any).code === "23505") return { ok: true };
    if (error && extra && extra.kind !== "wave") {
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
   signature just landed (mine), so the caller can hold the ceremony.
   THE IDENTITY SWITCH OFF (today's door): the pen name from the profile and
   the profile's library face, written straight onto the row. Before web
   0035 that write IS the signature; from 0035 on the server's adapter
   moves it into a seal (and opens both when theirs is in), so this keeps
   working unchanged. The switch on signs through signThreadV2. */
export async function signThread(threadId: string): Promise<{ revealed: boolean } | null> {
  /* chat/[id] reports this failure through alertFail, which reads the module
     flag — without clearing it first, a failed signature inherits whatever
     the last write said and can announce a lost connection over a live one. */
  const me = await writer();
  if (!me) return null;
  // never an empty name: the screens ask for a pen name before they sign (useLettersModel)
  const name = await currentHandle();
  if (!name) return null;
  return signDirect(threadId, me, name, await currentFace());
}

/* the direct write both doors fall back to: my name (and face) onto my side of the row. The
   answer reads `revealed` back from the row as the server left it (0034's and 0035's guards
   decide it, whatever this sends), and guesses only when the row can't be read back. */
async function signDirect(threadId: string, me: string, name: string, face: string | null): Promise<{ revealed: boolean } | null> {
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
    const patch: Record<string, unknown> = { [iamA ? "a_name" : "b_name"]: name };
    if (face) patch[iamA ? "a_face" : "b_face"] = face;
    // before 0034 the client flips it; from 0034 on the server decides and this is ignored
    if (theirs) patch.revealed = true;
    let { data: back, error } = await supabase!.from("threads").update(patch).eq("id", threadId).select("revealed").maybeSingle();
    if (error && face) {
      // pre-0011 backend: the face columns don't exist yet — sign with the name alone
      delete patch[iamA ? "a_face" : "b_face"];
      const retry = await supabase!.from("threads").update(patch).eq("id", threadId).select("revealed").maybeSingle();
      back = retry.data;
      error = retry.error;
    }
    if (error) return noteFail(error);
    const after = (back as { revealed?: boolean | null } | null)?.revealed;
    return { revealed: typeof after === "boolean" ? after : !!theirs || !!t.revealed };
  } catch (e) {
    return noteFail(e);
  }
}

/** What the signing sheet sends (identity Phase 2): the pen name as typed on the sheet (never the
    account's legal name), the library face chosen there (null = none, the glyph; a photo never
    travels), and the drawing (PEN v1 from lib/pen-signature penFromPad; null = "type it instead"). */
export type PenSignature = { name: string; face: string | null; sig: PenSig | null };
/** How a signature went: `revealed` when it was the second (hold the ceremony now); `via` "seal"
    through web 0035's sign_thread, "direct" through the old write on a server without it (the
    drawing was dropped there: typed name and face only). */
export type SignResult = { revealed: boolean; via: "seal" | "direct" };

/** the longest pen name sign_thread takes (the sheet's field stops at 20, Edit profile's PEN_NAME_MAX) */
export const SIGN_NAME_MAX = 24;
/* sign_thread missing on this server (0035 not run yet): the old write for ten minutes, then ask
   again — the owner may run it while the app is open */
let signRpcAbsentUntil = 0;
const SIGN_RPC_ABSENT_MS = 10 * 60_000;

/**
 * Sign a correspondence from the signing sheet (identity Phase 2). The
 * name is trimmed (1–24, the server's rule; the sheet has checked it with
 * checkField and the safety screen already), the face kept only when it is
 * a library id, the drawing brought within PEN v1's caps (simplifyPen) and
 * dropped to typed if it still isn't valid. Then web 0035's sign_thread:
 * it seals all three and, when theirs is already sealed, opens both onto
 * the thread in the same statement.
 *
 * Before 0035 is run the function isn't there (PGRST202 / 404): the old
 * direct write instead, with this name and face (the drawing can't travel
 * there), remembered for ten minutes so a second signature doesn't ask
 * twice. Never throws. null on failure, with the reason in lastWriteFail()
 * (the server's refusals map: "unreachable thread" → gone, blocked,
 * suspended, no session → session; alertFail(…, { context: "thread" })
 * words them). Does NOT touch the profile: the sheet saves the pen name
 * (auth.saveProfile) before it calls this.
 */
export async function signThreadV2(threadId: string, s: PenSignature): Promise<SignResult | null> {
  const me = await writer();
  if (!me) return null;
  const name = (s.name || "").trim();
  if (!name || name.length > SIGN_NAME_MAX) {
    console.log("[sign] refused on the phone: the pen name must be 1–24 characters");
    return setFail("server");
  }
  const face = penFaceOrNull(s.face);
  let sig: PenSig | null = null;
  if (s.sig) {
    const fit = validatePen(s.sig).ok ? s.sig : simplifyPen(s.sig);
    sig = fit && validatePen(fit).ok ? fit : null;
    if (!sig) console.log("[sign] the drawing couldn't be made PEN v1; signing typed");
  }
  if (Date.now() >= signRpcAbsentUntil) {
    try {
      const { data, error, status } = await supabase!.rpc("sign_thread", { p_thread: threadId, p_name: name, p_face: face, p_sig: sig });
      if (!error) return { revealed: !!(data as { revealed?: boolean } | null)?.revealed, via: "seal" };
      if (!isMissingRpc(error, status)) return noteFail(error);
      signRpcAbsentUntil = Date.now() + SIGN_RPC_ABSENT_MS;
      console.log("[sign] sign_thread isn't on this server yet (web 0035); signing with the old write, typed");
    } catch (e) {
      return noteFail(e);
    }
  }
  const direct = await signDirect(threadId, me, name, face);
  return direct ? { revealed: direct.revealed, via: "direct" } : null;
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

/** Report a kindred's drawn signature (long-press on it in the ceremony's end state or on their
    page). Web 0035 fills the report on the server: the target is the other side of THAT thread and
    the snapshot their stored strokes, whatever is sent from here. Before 0035 it is an ordinary
    report about the thread. */
export function reportSignature(threadId: string, targetUser: string | null | undefined): Promise<true | null> {
  return reportContent({ targetUser: targetUser ?? null, context: "signature", refId: threadId, reason: "other", snapshot: null });
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
  if (!me) {
    console.warn("[blocks] no signed-in account to read blocks for");
    return null;
  }
  try {
    const { data, error } = await supabase!
      .from("blocks")
      .select("blocked, created_at")
      .eq("blocker", me)
      .order("created_at", { ascending: false });
    if (error || !data) {
      console.warn("[blocks] the list wasn't read:", error?.message ?? "no data");
      return null;
    }
    return data as BlockRow[];
  } catch (e) {
    console.warn("[blocks] the list wasn't read:", e);
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
    if (error) return noteFail(error);
    forgetMarks(targetUser); // their ♀/♂ and sign are asked again, now that marks_for may answer (lib/identity)
    forgetMemberMark(targetUser); // their stamp is asked again (lib/member-marks)
    return true;
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
    if (error) return noteFail(error);
    forgetMarks(targetUser); // marks_for stops answering for a blocked pair; drop what this session kept (lib/identity)
    forgetMemberMark(targetUser); // member_marks_for stops answering for a blocked pair (lib/member-marks)
    return true;
  } catch (e) {
    return noteFail(e);
  }
}

/* ── Mute a correspondence (owner's audit, 2026-11-10; the "threadmute" switch, off) ──
   The ⋯ of a conversation offered only Report and Block: for a friend whose
   pushes are simply too many tonight, that is all hammer. A muted
   correspondence sends THIS reader no push notifications; nothing else
   changes, and the other person is never told.

   Pushes are sent by the server, so the mute is a row the server reads:
     public.thread_mutes (user_id uuid default auth.uid(), thread_id uuid,
       created_at timestamptz default now(), primary key (user_id, thread_id))
   with RLS letting a user read, insert and delete only their own rows (the
   migration is in the web repo; the push sender skips a recipient who has a
   row for the thread the push is about). Until that table exists the switch
   stays off and nothing here is called (lib/thread-mute).

   NOTHING IS SWALLOWED (a catch that returned null has cost whole days
   here): a read that fails throws, saying why, and a write that fails logs
   why, records the reason for alertFail (noteFail) and answers false. */

/** Every thread this reader has muted. Throws when it can't be read (no client, no account, the
    table missing, the network): the caller keeps what it knew and logs the reason. */
export async function loadMutedThreads(): Promise<Set<string>> {
  if (!supabaseReady) throw new Error("[mutes] not read: no Supabase client in this build");
  const me = await uid();
  if (!me) throw new Error("[mutes] not read: no signed-in account to read mutes for");
  const { data, error } = await supabase!.from("thread_mutes").select("thread_id").eq("user_id", me);
  if (error) throw new Error(`[mutes] not read: ${error.message || error.code || "the server refused"}`);
  /* "none" asked with the anon key (an expired token whose refresh failed) is not "none muted":
     the policies are `to authenticated`, so that read answers no rows and no error (sessionCheck) */
  if (!data?.length) {
    const why = unconfirmedEmpty(await sessionCheck(), me);
    if (why) throw new Error(`[mutes] not read: an empty answer without a live session (${why})`);
  }
  const out = new Set<string>();
  for (const row of data ?? []) {
    const id = (row as { thread_id?: unknown }).thread_id;
    if (typeof id === "string" && id) out.add(id);
  }
  return out;
}

/** Mute (a row) or unmute (no row) one thread for this reader. True when the server took it;
    false when it didn't, with the reason logged and kept for alertFail (lastWriteFail). Muting
    twice is not an error (the row is simply there). */
export async function setThreadMuted(threadId: string, muted: boolean): Promise<boolean> {
  const what = muted ? "mute" : "unmute";
  if (!threadId) {
    clearFail();
    console.warn(`[mutes] ${what} not saved: no thread`);
    return false;
  }
  const me = await writer();
  if (!me) {
    console.warn(`[mutes] ${what} not saved: ${lastWriteFail() ?? "no client or no signed-in account"}`);
    return false;
  }
  try {
    const { error } = muted
      ? // on conflict do nothing: an insert policy is all it needs (no update policy on this table)
        await supabase!.from("thread_mutes").upsert({ user_id: me, thread_id: threadId }, { onConflict: "user_id,thread_id", ignoreDuplicates: true })
      : await supabase!.from("thread_mutes").delete().eq("user_id", me).eq("thread_id", threadId);
    if (error) {
      console.warn(`[mutes] ${what} not saved:`, error.message || error.code || error);
      noteFail(error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`[mutes] ${what} not saved:`, e);
    noteFail(e);
    return false;
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
