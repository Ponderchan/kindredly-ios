import { useCallback, useEffect, useSyncExternalStore } from "react";
import { supabase, supabaseReady } from "./supabase";
import { useAuth } from "./auth";
import { useEntitlement } from "./entitlement";
import { createMemberCache, denomOf, denomOfMark, devMemberFixture, type MemberAnswer, type MemberMark } from "./member-marks-core";

export type { MemberMark } from "./member-marks-core";
export { denomOf, pad3, stampSpoken } from "./member-marks-core";
import "../data/strings-fc2";

/* MEMBER MARKS, FOR THE SCREENS (C2 stamp avatar, 2026-10-19).
   ────────────────────────────────────────────────────────────────────────
   The React Native glue over lib/member-marks-core (pure, node-tested), the twin of lib/identity's
   marks section. Two questions, both answered from memory so no screen waits on them:

   1. MY OWN STAMP: useMyStamp() — "" until the entitlement has settled and says premium; then
      the Cofounder number ("007") or "1ST". Works before 0037 runs.
   2. EVERYONE ELSE'S: useMemberStamps(uids) → (uid) => "" | "1ST" | "007". Asked through web
      0037's member_marks_for (≤60 ids a call, cached for the session). Before the owner runs
      0037 every other uid reads "" (logged once with console.log, never thrown). A signed-out
      phone asks nothing. Blocking / unblocking forgets that person (lib/db → forgetMemberMark);
      a change of account forgets everyone (the answer depends on who asks: blocks).

   Unlike marks_for, this is asked with the identity switch OFF too: a stamp tells membership,
   never who someone is, so it shows on kindreds and pen pals alike (contract D-3).

   DEV: setDevMemberPreview(true) makes up stamps for everyone else (devMemberFixture) instead of
   asking; setDevMyStamp("1ST" | "007" | "") forces your own. Both ignored in release. */

let version = 0;
const listeners = new Set<() => void>();
const bump = () => {
  version++;
  listeners.forEach((f) => f());
};
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};
const versionNow = () => version;

let devPreview = false;
let devMine: string | null = null;

/** DEV ONLY: made-up stamps for everyone else (true), or ask the server again (false). */
export function setDevMemberPreview(on: boolean): void {
  if (!__DEV__) return;
  devPreview = on;
  bump();
}
/** DEV ONLY: force your own stamp ("" none, "1ST", "007"), or follow the entitlement again (null). */
export function setDevMyStamp(denom: string | null): void {
  if (!__DEV__) return;
  devMine = denom;
  bump();
}
/** DEV ONLY: what the dev page has set (always off / null in release). */
export function devMemberState(): { preview: boolean; mine: string | null } {
  return __DEV__ ? { preview: devPreview, mine: devMine } : { preview: false, mine: null };
}

/* ── who is asking ─────────────────────────────────────────────────────── */

let askerId: string | null | undefined = undefined;
let watching = false;
function watchAuth(): void {
  if (watching || !supabase) return;
  watching = true;
  supabase.auth.onAuthStateChange((_e, s) => {
    const id = s?.user?.id ?? null;
    if (askerId !== undefined && id !== askerId) cache.clear();
    askerId = id;
  });
}
async function asker(): Promise<string | null> {
  watchAuth();
  if (askerId !== undefined) return askerId;
  try {
    const { data } = await supabase!.auth.getSession();
    if (askerId === undefined) askerId = data.session?.user?.id ?? null;
  } catch (e) {
    console.log("[member-marks] the session couldn't be read; no stamps for others for now:", e);
    return null;
  }
  return askerId;
}

/* ── the cache ─────────────────────────────────────────────────────────── */

const cache = createMemberCache({
  async fetch(uids): Promise<MemberAnswer> {
    const { data, error, status } = await supabase!.rpc("member_marks_for", { p_users: uids });
    return error ? { error, status } : { rows: Array.isArray(data) ? data : [] };
  },
  // console.log, not warn: a dev build must not raise a toast every launch before 0037 runs
  log: (msg, e) => console.log(msg, e ?? ""),
});
cache.subscribe(bump);

async function ask(uids: readonly string[]): Promise<void> {
  if (__DEV__ && devPreview) return;
  if (!supabaseReady || !supabase) return;
  if (!(await asker())) return;
  await cache.get(uids);
}

function peekOther(uid: string): MemberMark | null {
  if (__DEV__ && devPreview) return devMemberFixture(uid);
  return cache.peek(uid) ?? null;
}

/* ── the hooks ─────────────────────────────────────────────────────────── */

/** Your own denomination from your entitlement: "" until settled & premium; "1ST"; or pad3(cofounderNo). */
export function useMyStamp(): string {
  const { settled, premium, cofounderNo } = useEntitlement();
  useSyncExternalStore(subscribe, versionNow); // the dev override
  if (__DEV__ && devMine !== null) return devMine;
  return settled && premium ? denomOf({ member: true, cofounderNo }) : "";
}

/**
 * A screen's stamps: asks member_marks_for for these uids (once per set, cached for the session)
 * and returns a lookup that re-renders as answers land. Your own uid answers from useMyStamp();
 * null / undefined / a non-uuid (Wren, demo rows) → "". Hand the lookup to the model builders.
 */
export function useMemberStamps(uids: readonly (string | null | undefined)[]): (uid: string | null | undefined) => string {
  const mine = useMyStamp();
  const me = useAuth().user?.id ?? null;
  const key = uids.filter((u): u is string => !!u && u !== me).join("\n");
  useEffect(() => {
    if (key) void ask(key.split("\n"));
  }, [key]);
  const v = useSyncExternalStore(subscribe, versionNow);
  // v: a fresh lookup each time an answer lands, so memoised children redraw
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((uid: string | null | undefined) => (!uid ? "" : uid === me ? mine : denomOfMark(peekOther(uid))), [mine, me, v]);
}

/** Forget one person's answer — after blocking or unblocking them (lib/db does this). */
export function forgetMemberMark(uid: string | null | undefined): void {
  if (uid) cache.forget(uid);
}

/** Forget every answer (the account changed; this file also does it itself on a session change). */
export function clearMemberMarks(): void {
  cache.clear();
}
