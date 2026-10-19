/* MEMBER MARKS — WHO IS FIRST CLASS (C2, 2026-10-19). Pure; lib/member-marks is the RN glue.
   ────────────────────────────────────────────────────────────────────────
   A member's avatar is drawn as a gold perforated stamp with a denomination: "1ST" for any
   First Class plan, or the Cofounder's three-digit number ("007"). Your own comes from your
   entitlement; everyone else's from web 0037's member_marks_for(uuid[]), which returns one row
   per asked id that is a member right now — (uid, member, cofounder_no) — and nothing for a
   non-member, a blocked pair or an unknown id (all three look the same).

   THE CACHE (createMemberCache) follows identity-core's createMarksCache: asked when a screen
   shows someone, kept for the session, batches of at most 60, de-duplicated in flight, fresh for
   10 minutes (after that still shown, asked again in the background). Before the owner runs 0037
   the function isn't there (PGRST202 / 404 / 42883): every id reads "not a member" for ten
   minutes, logged once, never thrown, never looped. Any other failure holds what was known (or
   none) for a minute. Ids that aren't uuids are never sent (they read as none).

   The denomination is a printed mark (a postage value), never translated (contract D-4). */

import { MARKS_BATCH, isMissingRpc, isUuid, marksBatches } from "./identity-core";
import { hashStr } from "./mosaic";

/** A row from member_marks_for = a member. cofounderNo is the stored Cofounder number, else null. */
export type MemberMark = { cofounderNo: number | null };

export const MEMBER_FRESH_MS = 10 * 60_000;
export const MEMBER_RETRY_MS = 60_000;
export const MEMBER_ABSENT_MS = 10 * 60_000;

/** pad a Cofounder number to the printed three digits: 7 → "007" */
export const pad3 = (n: number): string => String(n).padStart(3, "0");

const validNo = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n > 0;

/** The printed denomination: "" (not a member, or unknown), "1ST", or the Cofounder number ("007"). */
export function denomOf(m: { member: boolean; cofounderNo: number | null } | null | undefined): string {
  if (!m || !m.member) return "";
  return validNo(m.cofounderNo) ? pad3(m.cofounderNo) : "1ST";
}

/** The denomination of a cached mark (null / undefined = not a member or not asked → ""). */
export const denomOfMark = (m: MemberMark | null | undefined): string => (m ? denomOf({ member: true, cofounderNo: m.cofounderNo }) : "");

/** One member_marks_for row → { uid, mark }, or null for a row that isn't a member or isn't the right shape. */
export function memberRowOf(row: unknown): { uid: string; mark: MemberMark } | null {
  if (!row || typeof row !== "object") return null;
  const r = row as { uid?: unknown; member?: unknown; cofounder_no?: unknown };
  if (typeof r.uid !== "string" || !r.uid) return null;
  if (r.member === false) return null; // 0037 never sends this, but a false is never a member
  const no = typeof r.cofounder_no === "string" && /^\d+$/.test(r.cofounder_no) ? Number(r.cofounder_no) : r.cofounder_no;
  return { uid: r.uid, mark: { cofounderNo: validNo(no) ? no : null } };
}

/**
 * DEV PAGES ONLY: a made-up membership for any id, deterministic by hash — a third none, a
 * third "1ST", a third a Cofounder number 1–100. Never real data.
 */
export function devMemberFixture(uid: string | null | undefined): MemberMark | null {
  if (!uid) return null;
  const h = hashStr("devmember:" + uid);
  const k = h % 3;
  if (k === 0) return null;
  if (k === 1) return { cofounderNo: null };
  return { cofounderNo: ((h >>> 4) % 100) + 1 };
}

/* ── the session cache ──────────────────────────────────────────────────── */

export type MemberAnswer = { rows: readonly unknown[] } | { error: unknown; status?: number | null };

export type MemberCacheOpts = {
  /** ask the server for at most 60 ids (uuid-shaped only). May throw: read as a failure. */
  fetch(uids: string[]): Promise<MemberAnswer>;
  /** where failures are told (console.log in the app: a dev build must not toast before 0037 runs) */
  log(msg: string, e?: unknown): void;
  now?: () => number;
  freshMs?: number;
  retryMs?: number;
  absentMs?: number;
};

export type MemberCache = {
  /** in memory, without asking: undefined = never asked; null = asked, not a member */
  peek(uid: string | null | undefined): MemberMark | null | undefined;
  /** the answers for these ids, asking for any missing or stale ones (≤60 per call). Never rejects. */
  get(uids: readonly (string | null | undefined)[]): Promise<ReadonlyMap<string, MemberMark | null>>;
  forget(uid: string): void;
  clear(): void;
  subscribe(f: () => void): () => void;
  state(): "ok" | "backoff" | "absent";
};

type Entry = { mark: MemberMark | null; until: number };

export function createMemberCache(opts: MemberCacheOpts): MemberCache {
  const now = opts.now ?? Date.now;
  const freshMs = opts.freshMs ?? MEMBER_FRESH_MS;
  const retryMs = opts.retryMs ?? MEMBER_RETRY_MS;
  const absentMs = opts.absentMs ?? MEMBER_ABSENT_MS;
  const log = opts.log;

  const entries = new Map<string, Entry>();
  const pending = new Map<string, Promise<void>>();
  const dropped = new Set<string>();
  const listeners = new Set<() => void>();
  let epoch = 0;
  let backoffUntil = 0;
  let absentUntil = 0;
  let toldAbsent = false;

  const changed = () => listeners.forEach((f) => f());

  async function ask(batch: string[], at: number): Promise<void> {
    let answer: MemberAnswer;
    const send = batch.filter(isUuid);
    try {
      answer = send.length ? await opts.fetch(send) : { rows: [] };
    } catch (e) {
      answer = { error: e };
    }
    if (at !== epoch) return; // another account by now
    const t = now();
    const live = batch.filter((u) => !dropped.delete(u));
    if ("rows" in answer) {
      const got = new Map<string, MemberMark>();
      for (const row of answer.rows) {
        const r = memberRowOf(row);
        if (r) got.set(r.uid, r.mark);
      }
      // no row: not a member, a blocked pair, or no such account
      for (const u of live) entries.set(u, { mark: got.get(u) ?? null, until: t + freshMs });
    } else if (isMissingRpc(answer.error, answer.status)) {
      absentUntil = t + absentMs;
      if (!toldAbsent) log("[member-marks] member_marks_for isn't on this server yet (0037 not run): only your own stamp for now", answer.error);
      toldAbsent = true;
      for (const u of live) entries.set(u, { mark: null, until: absentUntil });
    } else {
      backoffUntil = t + retryMs;
      log("[member-marks] member_marks_for failed, showing what was known for a minute:", (answer.error as { message?: unknown })?.message ?? answer.error);
      for (const u of live) {
        const e = entries.get(u);
        entries.set(u, { mark: e ? e.mark : null, until: backoffUntil });
      }
    }
    changed();
  }

  const answerFor = (ids: readonly string[]) => new Map(ids.map((u) => [u, entries.get(u)?.mark ?? null] as const));

  return {
    peek: (uid) => (uid ? entries.get(uid)?.mark : undefined),

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
          const until = Math.max(absentUntil, backoffUntil);
          for (const u of need) if (!entries.has(u)) entries.set(u, { mark: null, until });
        } else {
          const at = epoch;
          for (const batch of marksBatches(need, MARKS_BATCH)) {
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

    subscribe(f) {
      listeners.add(f);
      return () => {
        listeners.delete(f);
      };
    },

    state() {
      const t = now();
      return t < absentUntil ? "absent" : t < backoffUntil ? "backoff" : "ok";
    },
  };
}

/**
 * What VoiceOver hears for a stamp, to append to the label of whatever holds the face:
 * "" (not a member), t("fc2.av.member"), or t("fc2.av.cofounder", { n }) with the plain number.
 * The stamp itself is hidden from VoiceOver. `t` is lib/i18n's (strings-fc2 must be imported).
 */
export function stampSpoken(denom: string | null | undefined, t: (k: string, v?: Record<string, string | number>) => string): string {
  if (!denom) return "";
  const n = /^\d+$/.test(denom) ? Number(denom) : null;
  return n != null && n > 0 ? t("fc2.av.cofounder", { n }) : t("fc2.av.member");
}
