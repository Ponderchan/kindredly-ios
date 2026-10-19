import type { ThreadDetail, ThreadMessage, MessageQuote } from "./db";
import type { PenSig } from "./pen-signature";
import type { Fold } from "./folds";

/* THE ROOM'S DATA RULES, WITHOUT REACT OR THE NETWORK.
   ────────────────────────────────────────────────────────────────────────
   Known bug 1 (a room or a letter opened offline painted its cache, then
   went blank) had one root: every way a thread fetch could fail — no keys,
   no session yet, a dropped connection, a messages query that errored, a
   thread hidden by a block — came back as the same bare null, and every
   screen did setDetail(null). A failed messages query was worse: it fell
   through to an empty list, and that empty room overwrote the cache.

   Everything that decides what a reader sees lives here, as plain
   functions over plain values, so `node src/lib/thread-detail.test.ts`
   can hold it still and both renderers (SwiftUI and the React Native
   fallback) run the same rules:
   · what a fetch answer MEANS (ok / offline-and-why / missing),
   · how a row becomes a ThreadDetail (the opening's own date included),
   · what the screen state becomes after each answer (never blank a
     painted thread, never let the cache beat a fresher read),
   · which count marks the room seen, and
   · how optimistic lines ride on top of the server's list.

   Only `import type` above: this file must stay runnable by plain node
   (type stripping), so it imports nothing at runtime. */

/** What a line taken back reads as in the database (web 0031): the body,
    and the thread's list preview when it was the latest. Never anyone's
    writing. lib/db re-exports it, so existing imports keep working. */
export const TAKEN_BACK = "(taken back)";

/* ── why a read couldn't answer ─────────────────────────────────────── */

/**
 * Why a read could not give an answer.
 * - `not-ready`  — no Supabase keys in this build (dev without .env).
 * - `no-session` — nobody is signed in (a guest), or the session is gone.
 * - `network`    — the request never reached the server, or timed out.
 * - `error`      — the server answered with an error (schema, policy, 5xx).
 * None of these says anything about whether the thread exists.
 */
export type OfflineReason = "not-ready" | "no-session" | "network" | "error";

/**
 * The answer of `fetchThreadDetail(id)`:
 * - `ok`      — the full detail, freshly read (and now cached).
 * - `offline` — no answer; keep whatever is painted. `reason` says why.
 * - `missing` — the server answered, without error and to this reader's
 *               own session (confirmMissing), that there is no such
 *               thread for them: deleted, or hidden by a block (0024
 *               hides a blocked pair's thread both ways).
 */
export type ThreadDetailResult =
  | { status: "ok"; detail: ThreadDetail }
  | { status: "offline"; reason: OfflineReason }
  | { status: "missing" };

/**
 * The screen-level status `useThreadDetail` reports.
 * - `idle`    — no id.
 * - `loading` — nothing has answered yet (a cached copy may be painted).
 * - `ok` / `offline` / `missing` — the last answer, as in ThreadDetailResult.
 *   A later reload that is still in flight keeps the last answer's status.
 */
export type ThreadDetailStatus = "idle" | "loading" | "ok" | "offline" | "missing";

/** the shape of anything supabase-js hands back as an error */
interface ErrLike {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  status?: unknown;
}
const errText = (e: unknown): string => {
  if (e == null) return "";
  if (typeof e === "string") return e;
  const o = e as ErrLike;
  return `${typeof o.name === "string" ? o.name : ""}: ${typeof o.message === "string" ? o.message : String(e)}`;
};

/**
 * True when an error means the request never got a real answer: no
 * network, a timeout/abort, or auth's retryable fetch failure. postgrest-js
 * reports these as `{ message: "TypeError: Network request failed" }` with
 * response status 0; pass that status as `status` when you have it.
 */
export function isNetworkish(e: unknown, status?: number | null): boolean {
  if (status === 0) return true;
  if (e == null) return false;
  const o = e as ErrLike;
  if (o.name === "AuthRetryableFetchError") return true;
  if (o.status === 0) return true;
  return /network request failed|failed to fetch|fetch failed|network error|typeerror|abort|timeout|timed out/i.test(errText(e));
}

/** `network` or `error`, for a read that failed with `e` */
export const readReason = (e: unknown, status?: number | null): OfflineReason =>
  isNetworkish(e, status) ? "network" : "error";

/**
 * True when PostgREST refused a select because this server's schema lacks
 * something it names — an undefined column (42703), an unknown table
 * (42P01), an unknown/ambiguous relationship for an embed (PGRST200/201)
 * or an unknown column (PGRST204) — so an older column set is worth
 * trying. Anything else is not.
 *
 * NOT the schema cache being rebuilt: PGRST002 ("Could not query the
 * database for the schema cache. Retrying.", HTTP 503) passes on its own
 * after a DDL or a reload. Taking it for a missing column walked the read
 * down to an older column set and kept it there for the rest of the
 * launch, so every later room lost openingAt (and from set 2 on also
 * revealedAt, faces and the voice opening), and each thinner read was
 * kept over the good copy. So no bare "schema cache" match, and no 5xx
 * answer (pass the response status when you have it) is ever a schema
 * refusal: those are 400/404.
 */
export function isSchemaError(e: unknown, status?: number | null): boolean {
  if (e == null) return false;
  if (typeof status === "number" && status >= 500) return false;
  const o = e as ErrLike;
  const code = typeof o.code === "string" ? o.code : "";
  if (code === "PGRST002") return false;
  if (code === "42703" || code === "42P01" || code === "PGRST200" || code === "PGRST201" || code === "PGRST204") return true;
  const msg = typeof o.message === "string" ? o.message : "";
  return /column .* does not exist|could not find .* (column|relationship)|relationship between/i.test(msg);
}

/* ── what a thread fetch's two queries mean together ────────────────── */

/** what a thread fetch's queries say, before the detail is built */
export type FetchVerdict = { status: "ok" } | { status: "missing" } | { status: "offline"; reason: OfflineReason };

/**
 * Decide a thread fetch from its two queries. The thread row decides
 * existence; the messages decide whether the read is whole.
 * - thread query errored → offline (that is not "no thread");
 * - no error and no row → missing (lib/db then holds it to
 *   confirmMissing: an empty answer counts only if it was asked as you);
 * - row, but every messages query errored → offline: an empty list here
 *   would paint an empty room and overwrite the cache with it;
 * - otherwise ok.
 */
export function decideThreadFetch(input: {
  threadError: unknown | null;
  threadStatus?: number | null;
  hasRow: boolean;
  messagesError: unknown | null;
  messagesStatus?: number | null;
}): FetchVerdict {
  if (input.threadError) return { status: "offline", reason: readReason(input.threadError, input.threadStatus) };
  if (!input.hasRow) return { status: "missing" };
  if (input.messagesError) return { status: "offline", reason: readReason(input.messagesError, input.messagesStatus) };
  return { status: "ok" };
}

/* ── an empty answer counts only if it was asked as you ─────────────── */

/**
 * The session as auth reads it right after a read: whose it is (null when
 * there is none) and the error auth gave, if any. lib/db fills it from
 * supabase.auth.getSession().
 */
export interface SessionCheck {
  uid: string | null | undefined;
  error?: unknown;
}

/**
 * Why an empty answer (no error, no row) can't be trusted, or null when it
 * can. lib/db knows who you are from a cached id, but every PostgREST
 * request fetches its own token: when the access token has expired and
 * auth's refresh fails (a flaky network, an auth 5xx, a refresh token
 * rejected), auth hands back no session and supabase-js sends the anon key
 * as the bearer instead. The threads policies are `to authenticated`, so
 * that read answers 0 rows and no error — exactly what a deleted thread
 * looks like. An empty answer is believed only when a session for `me` is
 * there after it; otherwise it is `network` (auth's refresh could not
 * reach the server) or `no-session`.
 */
export function unconfirmedEmpty(session: SessionCheck, me: string): "network" | "no-session" | null {
  if (session.uid && session.uid === me) return null;
  return session.error != null && isNetworkish(session.error) ? "network" : "no-session";
}

/**
 * A thread fetch's verdict, with 'missing' held to unconfirmedEmpty: a
 * 'missing' read without a live session for `me` becomes offline (keep
 * what is painted, delete nothing). Any other verdict passes unchanged.
 */
export function confirmMissing(verdict: FetchVerdict, session: SessionCheck, me: string): FetchVerdict {
  if (verdict.status !== "missing") return verdict;
  const why = unconfirmedEmpty(session, me);
  return why ? { status: "offline", reason: why } : verdict;
}

/**
 * The refusal a write reports when its own read of the thread came back
 * empty: `gone` only when that read was asked with a live session for
 * `me`; otherwise `offline` (auth couldn't reach the server) or `session`
 * — never a false refusal that closes the composer on a live room.
 */
export function emptyReadFail(session: SessionCheck, me: string): "gone" | "offline" | "session" {
  const why = unconfirmedEmpty(session, me);
  return why === "network" ? "offline" : why === "no-session" ? "session" : "gone";
}

/* ── a row, made into a detail ──────────────────────────────────────── */

/**
 * Has this side of the thread signed? Web 0035's a_signed / b_signed when
 * the server has them (a boolean, never null there); before 0035 a name on
 * the row is the signature (0010). The thread list (lib/db) and the detail
 * read it the same way.
 */
export function signedOf(
  row: { a_name?: string | null; b_name?: string | null; a_signed?: boolean | null; b_signed?: boolean | null },
  side: "a" | "b",
): boolean {
  const flag = side === "a" ? row.a_signed : row.b_signed;
  if (typeof flag === "boolean") return flag;
  return !!(side === "a" ? row.a_name : row.b_name);
}

/** the columns fetchThreadDetail reads from `threads` (older servers lack the optional ones) */
export interface ThreadRow {
  a: string | null;
  b: string | null;
  stamp: string;
  revealed: boolean | null;
  a_count: number | null;
  b_count: number | null;
  a_name: string | null;
  b_name: string | null;
  a_face?: string | null;
  b_face?: string | null;
  opening: string | null;
  opening_media?: string | null;
  opening_duration_s?: number | null;
  created_at?: string | null;
  revealed_at?: string | null;
  letter?: string | null;
  /** web 0035: each side has signed (sealed, or names traded) — absent on an older server */
  a_signed?: boolean | null;
  b_signed?: boolean | null;
  /** web 0035: each side's drawn signature (PEN v1), published at the reveal; null when typed */
  a_sig?: PenSig | null;
  b_sig?: PenSig | null;
  /** the pool letter, embedded through threads.letter — null when RLS hides it
      (withdrawn, or blocked) or the thread predates 0020 */
  opening_letter?: { created_at?: string | null } | { created_at?: string | null }[] | null;
}

/** the columns fetchThreadDetail reads from `messages` */
export interface MessageRow {
  id?: string;
  sender: string | null;
  body: string;
  created_at: string;
  kind?: string | null;
  media_path?: string | null;
  meta?: { url?: string; title?: string; reply?: MessageQuote } | null;
  recalled_at?: string | null;
}

const openingLetterAt = (v: ThreadRow["opening_letter"]): string | null => {
  const one = Array.isArray(v) ? v[0] : v;
  return (one && typeof one.created_at === "string" && one.created_at) || null;
};

/**
 * A `threads` row plus its `messages`, seen by `me`, as the detail every
 * screen reads. `since` stays the thread row's creation (the first
 * reply's date); `openingAt` is the opening letter's own date, read
 * through threads.letter, null when it can't be read; `revealedAt` is
 * when both names were sealed (0020). For a correspondent who closed
 * their account (0009 nulls their side), `other` is null at runtime and
 * `gone` is true.
 *
 * SIGNED, FROM WEB 0035 ON (identity Phase 2): a side's enclosed name sits
 * in a seal nobody can read until both have signed, so the row's a_name
 * stays null until the reveal and `signed` reads a_signed / b_signed
 * instead (signedOf). On an older server, where a name on the row IS the
 * signature (0010), the name decides as before. The names, faces and the
 * drawings (a_sig / b_sig, published at the reveal) are each side's own
 * snapshot: `mySignedName` / `mySignedFace` / `mySig` are what THEY were
 * given, which the ceremony shows instead of the reader's current profile.
 * The drawings pass through as stored: lib/db checks them (penOrNull)
 * before they are kept, and every renderer checks again (penDrawPlan).
 */
export function buildThreadDetail(row: ThreadRow, msgs: readonly MessageRow[], me: string): ThreadDetail {
  const iamA = row.a === me;
  const other = iamA ? row.b : row.a;
  return {
    stamp: row.stamp,
    revealed: !!row.revealed,
    otherName: (iamA ? row.b_name : row.a_name) ?? null,
    otherFace: (iamA ? row.b_face : row.a_face) ?? null,
    other: other as string, // null at runtime when gone — see ThreadSummary.gone
    gone: !other,
    myCount: (iamA ? row.a_count : row.b_count) ?? 0,
    otherCount: (iamA ? row.b_count : row.a_count) ?? 0,
    iSigned: signedOf(row, iamA ? "a" : "b"),
    theirSigned: signedOf(row, iamA ? "b" : "a"),
    mySignedName: (iamA ? row.a_name : row.b_name) ?? null,
    mySignedFace: (iamA ? row.a_face : row.b_face) ?? null,
    mySig: (iamA ? row.a_sig : row.b_sig) ?? null,
    otherSig: (iamA ? row.b_sig : row.a_sig) ?? null,
    since: row.created_at ?? null,
    revealedAt: row.revealed_at ?? null,
    openingAt: openingLetterAt(row.opening_letter),
    letterId: row.letter ?? null,
    opening: row.opening || "",
    openingFromMe: row.b === me,
    openingMedia: row.opening_media ?? null,
    openingDurationS: row.opening_duration_s ?? null,
    messages: msgs.map((m) => ({
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
}

/* ── the screen's state, answer by answer ───────────────────────────── */

/** what useThreadDetail holds between renders */
export interface DetailState {
  detail: ThreadDetail | null;
  /** null until known (from the cache or a fetch) */
  folds: Fold[] | null;
  status: ThreadDetailStatus;
  reason: OfflineReason | null;
  /** the painted detail is the phone's copy, not a read made this session */
  fromCache: boolean;
}

export type DetailEvent =
  /** the id changed (or the hook mounted): start over */
  | { type: "reset"; hasId: boolean }
  /** the phone's copies were read */
  | { type: "cache"; detail: ThreadDetail | null; folds: Fold[] | null }
  /** a fetch answered; `folds` is the fresh folds, or null when they weren't read or failed */
  | { type: "result"; result: ThreadDetailResult; folds: Fold[] | null };

export const initialDetailState = (hasId: boolean): DetailState => ({
  detail: null,
  folds: null,
  status: hasId ? "loading" : "idle",
  reason: null,
  fromCache: false,
});

/**
 * One step of the screen state. The rules:
 * - the cache only fills what is empty — it never replaces a painted
 *   thread or a fresher read (a slow storage read can land after the fetch);
 * - `ok` replaces the detail; fresh folds replace the folds, failed folds keep theirs;
 * - `offline` keeps everything painted and only reports why;
 * - `missing` keeps everything painted too — the screen shows the closed
 *   state in place and decides itself whether to leave (never while a
 *   draft is open). Nothing here navigates.
 */
export function reduceDetail(s: DetailState, e: DetailEvent): DetailState {
  switch (e.type) {
    case "reset":
      return initialDetailState(e.hasId);
    case "cache": {
      const useDetail = !s.detail && !!e.detail;
      const useFolds = !s.folds && !!e.folds;
      if (!useDetail && !useFolds) return s;
      return {
        ...s,
        detail: useDetail ? e.detail : s.detail,
        folds: useFolds ? e.folds : s.folds,
        fromCache: useDetail ? true : s.fromCache,
      };
    }
    case "result": {
      const r = e.result;
      if (r.status === "ok") {
        return { detail: r.detail, folds: e.folds ?? s.folds, status: "ok", reason: null, fromCache: false };
      }
      if (r.status === "offline") return { ...s, folds: e.folds ?? s.folds, status: "offline", reason: r.reason };
      return { ...s, status: "missing", reason: null };
    }
  }
}

/* ── which count marks the room seen ────────────────────────────────── */

/**
 * How a screen counts "seen" for lib/room-seen: `true` uses
 * detail.otherCount (the room); a function decides when to mark, or null
 * to skip (chat marks only once names are traded — chatSeenRule).
 *
 * THE NUMBER IS ALWAYS otherCount. The Kindreds badge compares the ledger
 * with the list's `theirs` — threads' counter column (0012), the same
 * number as detail.otherCount — never with the length of the message list
 * (critic-chat: three screens marked three different numbers). A rule
 * chooses whether to mark, not what to count.
 */
export type SeenRule = true | ((d: ThreadDetail) => number | null);

/** the pen-pal chat's rule: mark only once names are traded, with otherCount */
export const chatSeenRule = (d: ThreadDetail): number | null => (d.revealed ? d.otherCount : null);

/**
 * The count to mark seen after `state` settled, or null to leave the
 * ledger alone. What is on screen is what was read: a fresh read, and —
 * offline — the cached copy that is painted (critic: the Kindreds badge
 * must agree with the room opened from cache). A missing thread marks nothing.
 */
export function seenCountAfter(state: DetailState, rule: SeenRule | false | undefined): number | null {
  if (!rule || !state.detail) return null;
  if (state.status !== "ok" && state.status !== "offline") return null;
  const n = rule === true ? state.detail.otherCount : rule(state.detail);
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
}

/* ── optimistic lines on top of the server's list ───────────────────── */

const PENDING_ECHO_MS = 2 * 60_000;

/**
 * Lay the screen's not-yet-confirmed lines (optimistic sends) over the
 * server's list, so a reload that lands mid-send can't make a line vanish.
 * A pending line is dropped once the server list holds it: by id when the
 * send has returned one, otherwise by its echo (a line of mine, same kind
 * and body, dated no earlier than two minutes before the pending line,
 * each server line claimed once). Kept lines go at the end, in order, and
 * bump myCount (0012 counts every message). Returns the same object when
 * nothing is pending.
 */
export function mergePending(detail: ThreadDetail | null, pending: readonly ThreadMessage[] | null | undefined): ThreadDetail | null {
  if (!detail || !pending || !pending.length) return detail;
  const ids = new Set(detail.messages.map((m) => m.id).filter((x): x is string => !!x));
  const claimed = new Set<number>();
  const kept: ThreadMessage[] = [];
  for (const p of pending) {
    if (p.id && ids.has(p.id)) continue;
    if (!p.id) {
      const since = Date.parse(p.date) - PENDING_ECHO_MS;
      const echo = detail.messages.findIndex(
        (m, i) =>
          !claimed.has(i) &&
          m.mine &&
          m.body === p.body &&
          (m.kind ?? "text") === (p.kind ?? "text") &&
          !(Number.isFinite(since) && Date.parse(m.date) < since),
      );
      if (echo >= 0) {
        claimed.add(echo);
        continue;
      }
    }
    kept.push(p);
  }
  if (!kept.length) return detail;
  return {
    ...detail,
    myCount: detail.myCount + kept.filter((m) => m.mine).length,
    messages: [...detail.messages, ...kept],
  };
}

/* ── why a write didn't go ──────────────────────────────────────────── */

/**
 * Why the last write failed (lib/db lastWriteFail):
 * - `offline`   — the request never left the phone;
 * - `timeout`   — it left and the deadline (lib/net) fired;
 * - `denied`    — row-level security refused it;
 * - `server`    — anything else the server said;
 * - `gone`      — the letter or correspondence can't be reached any more:
 *                 taken back, its writer closed their account, or the
 *                 thread is hidden (0020 'unreachable letter', 22023);
 * - `blocked`   — a block stands between the two (0020 'blocked', 42501);
 * - `suspended` — this account may not send (0020 'suspended', 42501);
 * - `session`   — no session, or it expired (0020 'no session', 28000).
 * gone / blocked / suspended are refusals: retrying can't help.
 */
export type WriteFail = "offline" | "timeout" | "denied" | "server" | "gone" | "blocked" | "suspended" | "session";

/**
 * Map a write's error to a WriteFail. 42501 carries both 'blocked' and
 * 'suspended', so the server's own message decides, never the code alone.
 * `offline` is lib/net's isOffline(e), computed by the caller.
 */
export function writeFailOf(e: unknown, offline: boolean): WriteFail {
  const o = (e ?? {}) as ErrLike;
  const msg = typeof o.message === "string" ? o.message : typeof e === "string" ? e : String(e ?? "");
  const code = typeof o.code === "string" ? o.code : "";
  const bare = msg.trim().toLowerCase();
  if (code === "28000" || bare === "no session" || /jwt expired|auth session missing|invalid jwt/i.test(msg)) return "session";
  if (bare === "unreachable letter" || (code === "22023" && /unreachable/i.test(msg))) return "gone";
  if (bare === "suspended" || (code === "42501" && /\bsuspended\b/i.test(msg))) return "suspended";
  if (bare === "blocked" || (code === "42501" && /\bblocked\b/i.test(msg))) return "blocked";
  if (/abort|timeout/i.test(msg)) return "timeout";
  if (offline || /network request failed|fetch failed/i.test(msg)) return "offline";
  if (/row-level security|violates|permission|policy/i.test(msg)) return "denied";
  return "server";
}

/** a refusal no retry can change — the letter or the room should leave the screen */
export const isRefusal = (k: WriteFail | null | undefined): boolean => k === "gone" || k === "blocked" || k === "suspended";

/* ── folds ──────────────────────────────────────────────────────────── */

/** the longest fold body, in UTF-16 code units of the TRIMMED text — the
    same measure folds.ts cuts at, not the weighted letter count */
export const FOLD_MAX = 600;

/** how far a fold body runs past FOLD_MAX (0 when it fits), in code points as Postgres's
    char_length counts them (an emoji is one, not the two UTF-16 units .length sees) */
export const foldOver = (body: string): number => Math.max(0, Array.from(body.trim()).length - FOLD_MAX);
