/* THE ♀/♂ MARK AND THE STAR SIGN, CLIENT SIDE — the pure half.
   ────────────────────────────────────────────────────────────────────────
   Identity plan §4 (the mark), the Addendum (the sign) and §10 (0034).
   lib/identity is the React Native glue (Supabase, the remote switch, the
   hooks); everything that decides anything lives here, pure, so plain node
   can lock it (src/lib/identity-core.test.ts). The web's
   app/engine/identity-core.js is a line-for-line port.

   WHAT A READER MAY LEARN ABOUT A STRANGER, and only through web migration
   0034's marks_for(uids): `mark` is "she" or "he" when that person chose to
   show it (user_metadata.showMark; they, unset and "keep it to myself" all
   come back null and can't be told apart), `sign` is their star sign's key
   when their birthday is known and they haven't turned it off
   (user_metadata.showSign). Never the birthday, the year or an age. Never
   for a pair where either has blocked the other (no row comes back). At
   most 60 ids per call, signed-in callers only. It is never a filter: no
   screen may sort, hide or choose anyone by it.

   THE SWITCH. All of this is behind the remote switch app_surfaces
   ('identity', '*', true) — the 0033 table the native screens already
   read. Off (no row, a false row, a phone that can't reach the table) means
   every surface exactly as before: the mosaic, the No., and no call to
   marks_for at all. identitySwitch() below is the rule; lib/identity feeds it
   the table's answer and the dev pages' preview override.

   THE CACHE (createMarksCache). Marks are asked for when a screen shows
   someone, and kept for the session: a list of fifty pen pals asks once,
   in batches of at most 60, and a second screen showing the same people
   asks nothing. An entry is fresh for 30 minutes; after that it is still
   shown, and asked again in the background the next time a screen wants
   it (someone who turns their mark off in Edit profile drops off within
   the half hour — "looked up when read", §4). Blocking or unblocking
   someone forgets their entry (forget), and a change of account forgets
   everything (clear), since what marks_for returns depends on who asks.

   NEVER A LOOP, NEVER A BREAK. Before the owner runs 0034 the function
   doesn't exist: PostgREST answers 404 / PGRST202. That is "no marks, no
   signs" for ten minutes — every id asked for is held as none, nothing is
   asked again until then, and it is logged once, not thrown. Any other
   failure (offline, a timeout, a 5xx) holds the ids as none (or keeps what
   was known) for a minute. So a screen that asks on every render costs one
   request per window, whatever the server is doing.

   Imports: the zodiac keys, the hash and lib/surfaces-resolve's surfaceOn
   (all pure). */

import { hashStr } from "./mosaic";
import { surfaceOn, type SurfaceMap } from "./surfaces-resolve";
import { ZODIAC, isZodiac, type Zodiac } from "./zodiac";

/** The app_surfaces key of the identity switch (row ('identity', '*', true) turns it on). */
export const IDENTITY_SURFACE = "identity";

export type Mark = "she" | "he";
/** What a reader may show beside a stranger's courier name. */
export type Marks = { mark: Mark | null; sign: Zodiac | null };
/** Nothing to show: the answer for they / unset / opted out / blocked / unknown / switch off. */
export const NO_MARKS: Marks = Object.freeze({ mark: null, sign: null });

/** marks_for takes at most this many ids per call (0034 refuses more). */
export const MARKS_BATCH = 60;

/** How long an answer is fresh; after that it is still shown and asked again in the background. */
export const MARKS_FRESH_MS = 30 * 60_000;
/** After a failure (offline, timeout, 5xx): ids held as none / as known for this long. */
export const MARKS_RETRY_MS = 60_000;
/** After "the function isn't there" (0034 not run yet): nothing is asked for this long. */
export const MARKS_ABSENT_MS = 10 * 60_000;

/* ── the switch ─────────────────────────────────────────────────────────── */

/**
 * Is the identity switch on? The dev preview override wins when set (dev
 * builds only; lib/identity never passes one in release), else the table's
 * answer (this binary's row beats '*', lib/surfaces-resolve), else OFF.
 * Only a real `true` counts.
 */
export function identitySwitch(remote: SurfaceMap | null, devForced: boolean | null = null): boolean {
  if (devForced !== null) return devForced;
  return surfaceOn(remote, {}, IDENTITY_SURFACE);
}

/* ── one row of marks_for ───────────────────────────────────────────────── */

/** One marks_for row → { uid, marks }, or null for a row that isn't the right shape. Unknown values read as none. */
export function marksOfRow(row: unknown): { uid: string; marks: Marks } | null {
  if (!row || typeof row !== "object") return null;
  const r = row as { uid?: unknown; mark?: unknown; sign?: unknown };
  if (typeof r.uid !== "string" || !r.uid) return null;
  const mark: Mark | null = r.mark === "she" || r.mark === "he" ? r.mark : null;
  const sign: Zodiac | null = isZodiac(r.sign) ? r.sign : null;
  return { uid: r.uid, marks: mark || sign ? { mark, sign } : NO_MARKS };
}

/** The ids to ask for, de-duplicated (first seen first), empty ones dropped, in batches of at most `size`. */
export function marksBatches(uids: readonly (string | null | undefined)[], size = MARKS_BATCH): string[][] {
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const u of uids) {
    if (typeof u !== "string" || !u || seen.has(u)) continue;
    seen.add(u);
    if (!out.length || out[out.length - 1].length >= size) out.push([]);
    out[out.length - 1].push(u);
  }
  return out;
}

/* marks_for takes uuid[]: one id that isn't a uuid (a demo row's "step5-a1"
   reaching the real path) would fail the whole batch, so the glue sends only
   uuid-shaped ids and reads the rest as none */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** true for an id marks_for can take (uuid-shaped) */
export const isUuid = (u: unknown): u is string => typeof u === "string" && UUID.test(u);

type ErrLike = { code?: unknown; message?: unknown; status?: unknown };

/**
 * True when an RPC failed because the function isn't on this server — 0034
 * hasn't been run: PostgREST's PGRST202 ("Could not find the function … in
 * the schema cache", HTTP 404), or Postgres's 42883 (no such function).
 */
export function isMissingRpc(e: unknown, status?: number | null): boolean {
  if (status === 404) return true;
  if (!e || typeof e !== "object") return false;
  const o = e as ErrLike;
  if (o.code === "PGRST202" || o.code === "42883") return true;
  if (o.status === 404) return true;
  const msg = typeof o.message === "string" ? o.message : "";
  return /could not find the function|function .* does not exist/i.test(msg);
}

/* ── the dev pages' made-up marks ───────────────────────────────────────── */

/* The five Today demo writers (screens/today/today-demo), pinned so the
   Today dev page shows every case on its first five cards. */
const DEV_PINNED: Readonly<Record<string, Marks>> = {
  "step5-a1": { mark: "she", sign: "gemini" },
  "step5-a2": { mark: "he", sign: "libra" },
  "step5-a3": { mark: null, sign: "aquarius" },
  "step5-a4": { mark: "she", sign: null },
  "step5-a5": { mark: "he", sign: "scorpio" },
};

/**
 * DEV PAGES ONLY: a made-up mark and sign for any id (the demo rows'
 * "step5-a1", "demo-mira"…), so the dev pages show every case — she, he,
 * none; a sign or none — without a server. The Today demo's five writers
 * are pinned (DEV_PINNED); any other id is dealt from the hash (channel
 * "devmarks:", in mosaic.ts's registry): about two in five she, two in five
 * he, one in five none; one in seven without a sign. Never real data;
 * lib/identity only uses it in a dev build with the fixture turned on.
 */
export function devMarksFixture(uid: string | null | undefined): Marks {
  if (!uid) return NO_MARKS;
  const pinned = Object.prototype.hasOwnProperty.call(DEV_PINNED, uid) ? DEV_PINNED[uid] : null;
  if (pinned) return pinned;
  const h = hashStr("devmarks:" + uid);
  const m = h % 5;
  const s = (h >>> 8) % 14;
  return { mark: m < 2 ? "she" : m < 4 ? "he" : null, sign: s < 12 ? ZODIAC[s] : null };
}

/* ── the session cache ──────────────────────────────────────────────────── */

/** What one call to marks_for came back with: its rows, or its error (and HTTP status). */
export type MarksAnswer = { rows: readonly unknown[] } | { error: unknown; status?: number | null };
/** Ask the server for at most MARKS_BATCH ids. May throw; the cache treats a throw as a failure. */
export type MarksFetch = (uids: string[]) => Promise<MarksAnswer>;

export type MarksCacheOpts = {
  fetch: MarksFetch;
  /** the clock (tests pass their own) */
  now?: () => number;
  freshMs?: number;
  retryMs?: number;
  absentMs?: number;
  /** where failures are told (console.log in the app: a dev build must not toast before 0034 runs) */
  log?: (msg: string, e?: unknown) => void;
};

/** where the cache stands: answering, waiting out a failure, or holding off because 0034 isn't there */
export type MarksState = "ok" | "backoff" | "absent";

export type MarksCache = {
  /** the answer in memory for a uid, without asking (stale answers included); undefined = never asked */
  peek: (uid: string | null | undefined) => Marks | undefined;
  /** the answers for these ids, asking the server for any missing or stale ones (≤60 per call). Never rejects. */
  get: (uids: readonly (string | null | undefined)[]) => Promise<ReadonlyMap<string, Marks>>;
  /** forget one person's answer (after blocking or unblocking them) */
  forget: (uid: string) => void;
  /** forget everything (signed out, or another account signed in); answers in flight are dropped */
  clear: () => void;
  /** called whenever an answer lands or is forgotten; returns the unsubscribe */
  subscribe: (fn: () => void) => () => void;
  state: () => MarksState;
};

type Entry = { marks: Marks; until: number };

/** A session cache over marks_for: batches of ≤60, de-duplicated in flight, fresh for 30 minutes, no retry loop. */
export function createMarksCache(opts: MarksCacheOpts): MarksCache {
  const now = opts.now ?? Date.now;
  const freshMs = opts.freshMs ?? MARKS_FRESH_MS;
  const retryMs = opts.retryMs ?? MARKS_RETRY_MS;
  const absentMs = opts.absentMs ?? MARKS_ABSENT_MS;
  const log = opts.log ?? (() => {});

  const entries = new Map<string, Entry>();
  const pending = new Map<string, Promise<void>>();
  /* forgotten while their answer was in flight: that answer is dropped */
  const dropped = new Set<string>();
  const listeners = new Set<() => void>();
  let epoch = 0; // bumped by clear(): answers asked for before it are dropped
  let backoffUntil = 0;
  let absentUntil = 0;
  let toldAbsent = false; // "0034 isn't there" is logged once per account, not every ten minutes

  const changed = () => listeners.forEach((f) => f());
  /* hold an id at `marks` until `until`, unless something fresher is known */
  const hold = (uid: string, marks: Marks, until: number) => {
    const e = entries.get(uid);
    entries.set(uid, { marks: e && marks === NO_MARKS ? e.marks : marks, until });
  };

  async function ask(batch: string[], at: number): Promise<void> {
    let answer: MarksAnswer;
    try {
      answer = await opts.fetch(batch);
    } catch (e) {
      answer = { error: e };
    }
    if (at !== epoch) return; // another account by now
    const t = now();
    const live = batch.filter((u) => !dropped.delete(u));
    if ("rows" in answer) {
      const got = new Map<string, Marks>();
      for (const row of answer.rows) {
        const r = marksOfRow(row);
        if (r) got.set(r.uid, r.marks);
      }
      // an id with no row is someone with nothing to show, a blocked pair, or no such account
      for (const u of live) entries.set(u, { marks: got.get(u) ?? NO_MARKS, until: t + freshMs });
    } else if (isMissingRpc(answer.error, answer.status)) {
      absentUntil = t + absentMs;
      if (!toldAbsent) log("[identity] marks_for isn't on this server yet (0034 not run): no marks or signs for now", answer.error);
      toldAbsent = true;
      for (const u of live) entries.set(u, { marks: NO_MARKS, until: absentUntil });
    } else {
      backoffUntil = t + retryMs;
      log("[identity] marks_for failed, showing none (or what was known) for a minute:", (answer.error as { message?: unknown })?.message ?? answer.error);
      for (const u of live) hold(u, NO_MARKS, backoffUntil);
    }
    changed();
  }

  const answerFor = (ids: readonly string[]): Map<string, Marks> => new Map(ids.map((u) => [u, entries.get(u)?.marks ?? NO_MARKS]));

  return {
    peek: (uid) => (uid ? entries.get(uid)?.marks : undefined),

    async get(uids) {
      const ids = marksBatches(uids, Number.MAX_SAFE_INTEGER)[0] ?? [];
      if (!ids.length) return new Map();
      const t = now();
      const wait: Promise<void>[] = [];
      const need: string[] = [];
      for (const u of ids) {
        const inflight = pending.get(u);
        if (inflight) wait.push(inflight);
        else if (!entries.has(u) || (entries.get(u) as Entry).until <= t) need.push(u);
      }
      if (need.length) {
        if (t < absentUntil || t < backoffUntil) {
          // holding off: nothing is asked; ids never seen read as none until the window ends
          const until = Math.max(absentUntil, backoffUntil);
          for (const u of need) if (!entries.has(u)) entries.set(u, { marks: NO_MARKS, until });
        } else {
          const at = epoch;
          for (const batch of marksBatches(need)) {
            const p = ask(batch, at).finally(() => {
              for (const u of batch) if (pending.get(u) === p) pending.delete(u);
            });
            for (const u of batch) pending.set(u, p);
            wait.push(p);
          }
        }
      }
      if (wait.length) await Promise.all(wait);
      return answerFor(ids);
    },

    forget(uid) {
      const had = entries.delete(uid);
      if (pending.has(uid)) dropped.add(uid);
      if (had) changed();
    },

    clear() {
      epoch++;
      entries.clear();
      pending.clear();
      dropped.clear();
      backoffUntil = 0;
      absentUntil = 0;
      toldAbsent = false;
      changed();
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },

    state: () => {
      const t = now();
      return t < absentUntil ? "absent" : t < backoffUntil ? "backoff" : "ok";
    },
  };
}
