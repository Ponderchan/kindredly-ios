/* Supabase data layer — direct RLS reads/writes, ported from kindredly/app/db.js.
   Every call is fail-safe: no client / missing table / network error → null and
   the caller falls back. RN adaptation: the writer handle comes from the signed-in
   user's user_metadata (the web read it from a localStorage session mirror). */

import { supabase, supabaseReady } from "./supabase";
import { scoped } from "./scoped-store";
import { isOffline } from "./net";
import { t } from "./i18n";

/* what a line taken back reads as in the database (web 0031): the body, and the
   thread's list preview when it was the latest. Never anyone's writing. */
export const TAKEN_BACK = "(taken back)";
/* WHY IT DIDN'T GO. Every write in here returns a bare null on failure, so
   the screens could only ever say "try again" — advice that is wrong when
   there is no network to try on, and wrong again when the row was refused
   for a reason no amount of retrying will change. Tracking the last failure
   costs one assignment and lets the interface tell the reader something
   true. It is deliberately not part of any return type: callers that don't
   care are unaffected. */
export type WriteFail = "offline" | "timeout" | "denied" | "server";
let lastFail: WriteFail | null = null;
export const lastWriteFail = (): WriteFail | null => lastFail;
export function noteFail(e: unknown): null {
  const m = (e as { message?: string })?.message ?? String(e ?? "");
  lastFail = /abort|timeout/i.test(m)
    ? "timeout"
    : isOffline(e) || /network request failed|fetch failed/i.test(m)
      ? "offline"
      : /row-level security|violates|permission|policy/i.test(m)
        ? "denied"
        : "server";
  return null;
}
export const clearFail = () => {
  lastFail = null;
};


/* WHO AM I, WITHOUT ASKING THE SERVER. getUser() is a round trip to the
   auth server, and every query here called it first — so a cold open paid
   two extra network hops before the first letter could paint, and every
   tap that touched the database waited on one. The session is already on
   the device; its user id is the same id. */
let uidCache: string | null = null;
if (supabase) supabase.auth.onAuthStateChange((_e, s) => { uidCache = s?.user?.id ?? null; });
async function uid(): Promise<string | null> {
  if (!supabase) return null;
  if (uidCache) return uidCache;
  try {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user?.id ?? null;
    if (id) { uidCache = id; return id; }
    const u = await supabase.auth.getUser();
    uidCache = u.data.user?.id ?? null;
    return uidCache;
  } catch {
    return null;
  }
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
  if (!supabaseReady || !body) return null;
  const id = await uid();
  if (!id) return null;
  clearFail();
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
  if (!supabaseReady) return null;
  if (authors && !authors.length) return [];
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
    return (data as PoolLetter[]).filter(
      (r) => r.author && r.author !== me && !known.has(r.author),
    );
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
  if (!supabaseReady || !fileUri) return null;
  const id = await uid();
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
  if (!supabaseReady || !fileUri) return null;
  const id = await uid();
  if (!id) return null;
  clearFail();
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
  if (!supabaseReady) return false;
  const me = await uid();
  if (!me) return false;
  const { error } = await supabase!.from("letters").update({ active: false }).eq("id", id).eq("author", me);
  return !error;
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
  if (!supabaseReady || !letter || !letter.author) return null;
  const me = await uid();
  if (!me) return null;
  clearFail();
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

export async function fetchThreads(): Promise<ThreadSummary[] | null> {
  const list = await fetchThreadsUncached();
  if (list) {
    threadsMem = list;
    threadsFetchedAt = Date.now();
    void scoped.setItem(THREADS_CACHE_KEY, JSON.stringify(list)).catch(() => {});
  }
  return list;
}

async function fetchThreadsUncached(): Promise<ThreadSummary[] | null> {
  if (!supabaseReady) return null;
  const me = await uid();
  if (!me) return null;
  try {
    let { data, error } = await supabase!
      .from("threads")
      .select(
        "id,a,b,stamp,revealed,revealed_at,letter,a_count,b_count,a_name,b_name,a_face,b_face,opening,last_sender,last_body,last_at",
      )
      .or(`a.eq.${me},b.eq.${me}`)
      .order("last_at", { ascending: false });
    if (error) {
      // pre-0011 fallback: face columns absent
      const retry = await supabase!
        .from("threads")
        .select(
          "id,a,b,stamp,revealed,a_count,b_count,a_name,b_name,opening,last_sender,last_body,last_at",
        )
        .or(`a.eq.${me},b.eq.${me}`)
        .order("last_at", { ascending: false });
      data = retry.data as any;
      error = retry.error;
    }
    if (error || !data) return null;

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

    return data.map((r: any) => {
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
  } catch {
    return null;
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
  since?: string | null; // when the first reply opened this thread
  opening: string;
  openingFromMe: boolean;
  openingMedia?: string | null; // voice-letter opening (storage path)
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
/* THE LAST READ OF A ROOM, ON THE PHONE (owner, build 18: "a room takes
   three seconds to open"). The room paints this at once and the fetch
   replaces it; a room opened once never opens blank again. */
const DETAIL_CACHE = "kindredly_thread_detail";
export async function readThreadDetailCache(threadId: string): Promise<ThreadDetail | null> {
  try {
    const raw = await scoped.getItem(`${DETAIL_CACHE}:${threadId}`);
    return raw ? (JSON.parse(raw) as ThreadDetail) : null;
  } catch {
    return null;
  }
}

export async function fetchThreadMessages(
  threadId: string,
): Promise<ThreadDetail | null> {
  if (!supabaseReady) return null;
  const me = await uid();
  if (!me) return null;
  try {
    /* the row and the messages in ONE round trip, not one after the other
       — the serial pair was the whole of the wait on a slow link */
    const [tRes, mRes] = await Promise.all([
      supabase!
        .from("threads")
        .select("a,b,stamp,revealed,a_count,b_count,a_name,b_name,a_face,b_face,opening,opening_media,opening_duration_s,created_at")
        .eq("id", threadId)
        .maybeSingle(),
      supabase!
        .from("messages")
        .select("id,sender,body,created_at,kind,media_path,meta,recalled_at")
        .eq("thread_id", threadId)
        .order("created_at"),
    ]);
    let t = tRes.data;
    if (!t) {
      // pre-0007 fallback: media columns absent
      const retry = await supabase!
        .from("threads")
        .select("a,b,stamp,revealed,a_count,b_count,a_name,b_name,opening,created_at")
        .eq("id", threadId)
        .maybeSingle();
      t = retry.data as any;
    }
    let { data: msgs, error: msgErr } = mRes;
    if (msgErr) {
      // pre-0031: no recalled_at yet
      const retry = await supabase!
        .from("messages")
        .select("id,sender,body,created_at,kind,media_path,meta")
        .eq("thread_id", threadId)
        .order("created_at");
      if (!retry.error) { msgs = retry.data as any; msgErr = null; }
    }
    if (msgErr) {
      // pre-0015 fallback: kind/media columns absent
      const retry = await supabase!
        .from("messages")
        .select("sender,body,created_at")
        .eq("thread_id", threadId)
        .order("created_at");
      msgs = retry.data as any;
    }
    if (!t) return null;
    const iamA = t.a === me;
    const detail: ThreadDetail = {
      stamp: t.stamp,
      revealed: !!t.revealed,
      otherName: iamA ? t.b_name : t.a_name,
      otherFace: ((iamA ? (t as any).b_face : (t as any).a_face) as string | undefined) ?? null,
      other: iamA ? t.b : t.a,
      gone: !(iamA ? t.b : t.a),
      myCount: iamA ? t.a_count : t.b_count,
      otherCount: iamA ? t.b_count : t.a_count,
      iSigned: !!(iamA ? t.a_name : t.b_name),
      theirSigned: !!(iamA ? t.b_name : t.a_name),
      since: (t as any).created_at ?? null,
      opening: t.opening || "",
      openingFromMe: t.b === me,
      openingMedia: (t as any).opening_media ?? null,
      openingDurationS: (t as any).opening_duration_s ?? null,
      messages: (msgs || []).map((m: any) => ({
        id: m.id,
        body: m.body,
        mine: m.sender === me,
        date: m.created_at,
        kind: m.kind ?? "text",
        mediaPath: m.media_path ?? null,
        meta: m.meta ?? null,
        recalledAt: m.recalled_at ?? null,
        replyMine: m.meta?.reply ? m.meta.reply.sender === me : undefined,
      })),
    };
    void scoped.setItem(`${DETAIL_CACHE}:${threadId}`, JSON.stringify(detail)).catch(() => {});
    return detail;
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
  if (!supabaseReady) return null;
  const me = await uid();
  if (!me) return null;
  clearFail();
  try {
    /* NOBODY HOME. Four surfaces write through here — chat, the room's three
       traces, and thread — so this is the one place the check cannot be
       forgotten. RLS lets a participant insert into a thread whose other
       side 0009 has set to null, which meant letters to a deleted
       correspondent were accepted and stored and never read. The composer is
       closed upstream; this is the lock behind it. */
    const { data: sides } = await supabase!
      .from("threads")
      .select("a,b")
      .eq("id", threadId)
      .maybeSingle();
    if (sides && !(sides.a === me ? sides.b : sides.a)) return null;

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
       to IN TRANSIT by the time you're back (owner, 2026-09-23) */
    threadsFetchedAt = 0;
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
  if (!supabaseReady) return null;
  const me = await uid();
  if (!me) return null;
  /* chat/[id] reports this failure through alertFail, which reads the module
     flag — without clearing it first, a failed signature inherits whatever
     the last write said and can announce a lost connection over a live one. */
  clearFail();
  try {
    const { data: t } = await supabase!
      .from("threads")
      .select("a,b,a_name,b_name,revealed")
      .eq("id", threadId)
      .maybeSingle();
    if (!t) return null;
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
    if (error) return null;
    return { revealed: !!theirs || !!t.revealed };
  } catch {
    return null;
  }
}

/* ── Trust & Safety ── */
/* TAKE IT BACK (web 0031): your own line, within two minutes of sending it.
   The server is the clock — this only asks. "too_late" when the two minutes
   are up; null when it couldn't ask (offline, or before 0031 ran). */
export async function takeBack(messageId: string): Promise<"ok" | "too_late" | null> {
  if (!supabaseReady) return null;
  clearFail();
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
  if (!supabaseReady) return null;
  const me = await uid();
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
    return error ? null : true;
  } catch {
    return null;
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
  if (!supabaseReady || !targetUser) return null;
  const me = await uid();
  if (!me) return null;
  try {
    const { error } = await supabase!.from("blocks").delete().eq("blocker", me).eq("blocked", targetUser);
    return error ? null : true;
  } catch {
    return null;
  }
}

export async function blockUser(targetUser: string): Promise<true | null> {
  if (!supabaseReady || !targetUser) return null;
  const me = await uid();
  if (!me) return null;
  try {
    const { error } = await supabase!
      .from("blocks")
      .upsert({ blocker: me, blocked: targetUser }, { onConflict: "blocker,blocked" });
    return error ? null : true;
  } catch {
    return null;
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
  if (!supabaseReady) return null;
  const me = await uid();
  if (!me) return null;
  try {
    const { error } = await supabase!.from("support_letters").insert({
      author: me,
      body: String(body).slice(0, 4000),
      reply_to: replyTo?.trim() || null,
      app_version: appVersion,
    });
    return error ? null : true;
  } catch {
    return null;
  }
}
