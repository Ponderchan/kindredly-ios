/* Supabase data layer — direct RLS reads/writes, ported from kindredly/app/db.js.
   Every call is fail-safe: no client / missing table / network error → null and
   the caller falls back. RN adaptation: the writer handle comes from the signed-in
   user's user_metadata (the web read it from a localStorage session mirror). */

import { supabase, supabaseReady } from "./supabase";

async function uid(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** current writer's pen name (handle) for thread name-reveal. */
async function currentHandle(): Promise<string> {
  if (!supabase) return "";
  try {
    const { data } = await supabase.auth.getUser();
    const m: any = data.user?.user_metadata || {};
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
    const { data } = await supabase.auth.getUser();
    const m: any = data.user?.user_metadata || {};
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
export async function publishLetter(
  stamp: string,
  body: string,
  lang: string,
): Promise<true | null> {
  if (!supabaseReady || !body) return null;
  const id = await uid();
  if (!id) return null;
  try {
    const { error } = await supabase!.from("letters").insert({
      author: id,
      stamp: stamp || "off-chest",
      body: String(body).slice(0, 2000),
      lang: lang || "en",
    });
    return error ? null : true;
  } catch {
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
  /* cosine closeness to the reader, attached client-side from the nightly
     `matches` cache — never a column on this row. Undefined means the matcher
     did not name this author, and the UI must then say nothing at all about
     closeness rather than imply distance it doesn't have. */
  close?: Close;
}
/** active pool rows excluding the viewer's own, newest first. Falls back to
   the pre-0007 column set if the media columns don't exist yet. */
export async function fetchPool(limit = 40): Promise<PoolLetter[] | null> {
  if (!supabaseReady) return null;
  const me = await uid();
  try {
    let { data, error } = await supabase!
      .from("letters")
      .select("id, author, stamp, body, lang, created_at, kind, media_path, duration_s")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      // migration 0007 not applied yet → retry without media columns
      const fallback = await supabase!
        .from("letters")
        .select("id, author, stamp, body, lang, created_at")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(limit);
      data = fallback.data as any;
      if (fallback.error || !data) return null;
    }
    if (!data) return null;
    return (data as PoolLetter[]).filter((r) => r.author !== me);
  } catch {
    return null;
  }
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
    if (upErr) return null;
    const { error } = await supabase!.from("letters").insert({
      author: id,
      stamp: stamp || "off-chest",
      body: (caption || "🎙 A voice letter").slice(0, 2000),
      lang: lang || "en",
      kind: "voice",
      media_path: path,
      duration_s: Math.round(durationS) || null,
    });
    return error ? null : true;
  } catch {
    return null;
  }
}

/* ── Threads + messages (real 1:1 conversations) ── */
export async function replyToLetter(
  letter: PoolLetter,
  body: string,
): Promise<string | null> {
  if (!supabaseReady || !letter || !letter.author) return null;
  const me = await uid();
  if (!me) return null;
  try {
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

    const row: Record<string, unknown> = {
      a: me,
      b: letter.author,
      stamp: letter.stamp || "off-chest",
      opening: letter.body || "",
      a_count: 1,
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
    if (error || !data) return null;
    await supabase!
      .from("messages")
      .insert({ thread_id: data.id, sender: me, body: String(body).slice(0, 2000) });
    return data.id as string;
  } catch {
    return null;
  }
}

export interface ThreadSummary {
  id: string;
  stamp: string;
  revealed: boolean;
  mine: number; // my message count on this thread
  theirs: number; // their count — what drives a face coming into view
  theirSigned?: boolean; // their name is enclosed, waiting on mine
  /** everything they have written to me — what lib/correspondent reads */
  theirTexts?: string[];
  otherName: string | null;
  otherFace?: string | null; // the face they chose to give at signing (library id)
  other: string; // correspondent's user id
  preview: string;
  lastSenderMe: boolean;
  lastAt: number;
  myReaction?: string | null; // my one-tap reaction on this thread
  theirReaction?: string | null; // theirs — how they caught your last letter
}
export async function fetchThreads(): Promise<ThreadSummary[] | null> {
  if (!supabaseReady) return null;
  const me = await uid();
  if (!me) return null;
  try {
    let { data, error } = await supabase!
      .from("threads")
      .select(
        "id,a,b,stamp,revealed,a_count,b_count,a_name,b_name,a_face,b_face,opening,last_sender,last_body,last_at",
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

    // one-tap reactions, both directions (null-safe until migration 0008 lands)
    const rx = new Map<string, { mine?: string; theirs?: string }>();
    try {
      const ids = data.map((r: any) => r.id);
      if (ids.length) {
        const { data: rows } = await supabase!
          .from("reactions")
          .select("thread_id,sender,emoji")
          .in("thread_id", ids);
        for (const row of rows || []) {
          const slot = rx.get(row.thread_id) || {};
          if (row.sender === me) slot.mine = row.emoji;
          else slot.theirs = row.emoji;
          rx.set(row.thread_id, slot);
        }
      }
    } catch {
      /* table not there yet — the app runs without reactions */
    }

    /* THEIR WRITING, for the read (lib/correspondent). One batched query for
       every thread at once, the same shape as the reactions fetch above —
       a slow-letter product tops out around ten letters per correspondence,
       so this is tens of rows, not thousands. Without it the list could only
       count letters, which is the thing the archaeology reframe exists to
       stop doing. */
    const theirs = new Map<string, string[]>();
    try {
      const ids = data.map((r: any) => r.id);
      if (ids.length) {
        const { data: msgs } = await supabase!
          .from("messages")
          .select("thread_id,sender,body")
          .in("thread_id", ids)
          .order("created_at");
        for (const m of msgs || []) {
          if (m.sender === me || !m.body) continue;
          const list = theirs.get(m.thread_id) || [];
          list.push(m.body);
          theirs.set(m.thread_id, list);
        }
      }
    } catch {
      /* the read degrades to counts — never blocks the list */
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
        // the opening was written by b; it is theirs unless I am b
        theirTexts: (iamA && r.opening ? [r.opening as string] : []).concat(theirs.get(r.id) || []),
        otherName: iamA ? r.b_name : r.a_name,
        otherFace: (iamA ? r.b_face : r.a_face) ?? null,
        other: iamA ? r.b : r.a,
        preview: r.last_body || r.opening || "",
        lastSenderMe: r.last_sender === me,
        lastAt: r.last_at ? Date.parse(r.last_at) : Date.now(),
        myReaction: rx.get(r.id)?.mine ?? null,
        theirReaction: rx.get(r.id)?.theirs ?? null,
      } as ThreadSummary;
    });
  } catch {
    return null;
  }
}

/** One-tap reaction on a thread — upsert (a new pick replaces the old). */
export async function setThreadReaction(threadId: string, emoji: string): Promise<true | null> {
  if (!supabaseReady) return null;
  const me = await uid();
  if (!me) return null;
  try {
    const { error } = await supabase!
      .from("reactions")
      .upsert({ thread_id: threadId, sender: me, emoji }, { onConflict: "thread_id,sender" });
    return error ? null : true;
  } catch {
    return null;
  }
}

/** Take a reaction back (tapping the same one again). */
export async function clearThreadReaction(threadId: string): Promise<true | null> {
  if (!supabaseReady) return null;
  const me = await uid();
  if (!me) return null;
  try {
    const { error } = await supabase!.from("reactions").delete().eq("thread_id", threadId).eq("sender", me);
    return error ? null : true;
  } catch {
    return null;
  }
}

export interface ThreadDetail {
  stamp: string;
  revealed: boolean;
  otherName: string | null;
  other: string; // correspondent user id
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
  messages: { body: string; mine: boolean; date: string }[];
}
export async function fetchThreadMessages(
  threadId: string,
): Promise<ThreadDetail | null> {
  if (!supabaseReady) return null;
  const me = await uid();
  if (!me) return null;
  try {
    let { data: t } = await supabase!
      .from("threads")
      .select("a,b,stamp,revealed,a_count,b_count,a_name,b_name,a_face,b_face,opening,opening_media,opening_duration_s,created_at")
      .eq("id", threadId)
      .maybeSingle();
    if (!t) {
      // pre-0007 fallback: media columns absent
      const retry = await supabase!
        .from("threads")
        .select("a,b,stamp,revealed,a_count,b_count,a_name,b_name,opening,created_at")
        .eq("id", threadId)
        .maybeSingle();
      t = retry.data as any;
    }
    const { data: msgs } = await supabase!
      .from("messages")
      .select("sender,body,created_at")
      .eq("thread_id", threadId)
      .order("created_at");
    if (!t) return null;
    const iamA = t.a === me;
    return {
      stamp: t.stamp,
      revealed: !!t.revealed,
      otherName: iamA ? t.b_name : t.a_name,
      otherFace: ((iamA ? (t as any).b_face : (t as any).a_face) as string | undefined) ?? null,
      other: iamA ? t.b : t.a,
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
        body: m.body,
        mine: m.sender === me,
        date: m.created_at,
      })),
    };
  } catch {
    return null;
  }
}

/* Send a message; bump counts. Names and reveal no longer move here —
   since 0010 a name is written only by the act of SIGNING (signThread),
   and revealed flips when the second signature lands. Auto-reveal at 5/5
   was a vending machine, and it force-unmasked people who wanted to stay
   pen pals forever. */
export async function sendThreadMessage(
  threadId: string,
  body: string,
): Promise<{ ok: true } | null> {
  if (!supabaseReady) return null;
  const me = await uid();
  if (!me) return null;
  try {
    const { data: t } = await supabase!
      .from("threads")
      .select("a,b,a_count,b_count")
      .eq("id", threadId)
      .maybeSingle();
    if (!t) return null;
    const iamA = t.a === me;
    const a_count = t.a_count + (iamA ? 1 : 0);
    const b_count = t.b_count + (iamA ? 0 : 1);
    await supabase!
      .from("messages")
      .insert({ thread_id: threadId, sender: me, body: String(body).slice(0, 2000) });
    const patch: Record<string, unknown> = {
      a_count,
      b_count,
      last_sender: me,
      last_body: body,
      last_at: new Date().toISOString(),
    };
    await supabase!.from("threads").update(patch).eq("id", threadId);
    return { ok: true };
  } catch {
    return null;
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
