import { useCallback, useEffect, useSyncExternalStore } from "react";
import { supabase, supabaseReady } from "./supabase";
import { readSurfaces, remoteSurfaces, subscribeSurfaces, surfacesReady } from "./surfaces";
import { NO_MARKS, createMarksCache, devMarksFixture, identitySwitch, isUuid, type Marks, type MarksAnswer } from "./identity-core";

export type { Mark, Marks } from "./identity-core";
export { NO_MARKS } from "./identity-core";

/* THE IDENTITY SWITCH AND THE MARKS, FOR THE SCREENS (identity Phase 1).
   ────────────────────────────────────────────────────────────────────────
   The React Native glue over lib/identity-core (which decides everything
   and is node-tested). Two questions, both answered from memory so no
   screen ever waits on them:

   1. IS THE SWITCH ON? identityOn() / useIdentityOn(). The row
      app_surfaces ('identity', '*', true) — the 0033 table, read by
      lib/surfaces with the same request, throttle and phone cache as the
      native screens (remoteSurfaces) — else OFF. Off means every surface
      exactly as today: the mosaic, the No., and marksFor() never calls the
      server. On means courier names (lib/stranger-name), frosted windows
      (lib/frost), and the ♀/♂ mark and star sign below. A switch reaches a
      phone when lib/surfaces next asks (launch, back to the front, at most
      every ten minutes).

   2. WHAT MAY THIS READER SHOW BESIDE A STRANGER? marksFor(uids) /
      useMarks(uids) / peekMarks(uid): { mark: "she" | "he" | null, sign }.
      Asked through web 0034's marks_for (≤60 ids a call, batched, cached
      for the session; lib/identity-core createMarksCache). Before the
      owner runs 0034 the function isn't there, and that reads as "no
      marks, no signs" for ten minutes at a time — logged once, never a
      throw, never a retry loop. No session (a phone that never signed in)
      asks nothing: marks_for is for signed-in callers (guests' anonymous
      sessions included). Blocking or unblocking someone forgets their
      entry (lib/db calls forgetMarks); a change of account forgets them all.

   NEVER A FILTER, NEVER ON THE LOCK SCREEN. Nothing may sort, hide or pick
   anyone by these answers, and push, the Live Activity and share cards
   never carry the courier name, the mark or the sign.

   DEV ONLY: setDevIdentityPreview(true) turns the switch on for this run
   of the app (never saved, ignored in release), so the dev pages
   (kindredly:///dev/step5-today …) can show the new identity before the
   row exists. With it (by default) comes the fixture: marks and signs are
   made up per id (identity-core devMarksFixture) instead of asked for, so
   demo rows show every case. Pass { fixture: false } to preview the switch
   against the real marks_for instead. */

/* ── the switch ─────────────────────────────────────────────────────────── */

let devForced: boolean | null = null;
let devFixture = false;
/* a number that moves whenever an answer lands, is forgotten, or the fixture
   is turned on or off — what useMarks re-renders on */
let marksVersion = 0;
const ownListeners = new Set<() => void>();
const ownChanged = () => ownListeners.forEach((f) => f());

/**
 * DEV ONLY: preview the identity switch on (true) or off (false) for this
 * run of the app, or follow the table again (null). Never saved; does
 * nothing in a release build. While previewing on, marks come from the
 * dev fixture unless `fixture: false`.
 */
export function setDevIdentityPreview(on: boolean | null, opts: { fixture?: boolean } = {}): void {
  if (!__DEV__) return;
  devForced = on;
  devFixture = on === true && opts.fixture !== false;
  marksVersion++;
  ownChanged();
}
/** DEV ONLY: the preview override in force (null = following the table). Always null in release. */
export function devIdentityPreview(): boolean | null {
  return __DEV__ ? devForced : null;
}

/** The identity switch right now, without waiting: the table's answer (or the dev preview), else off. */
export function identityOn(): boolean {
  return identitySwitch(remoteSurfaces(), __DEV__ ? devForced : null);
}

const subscribeIdentity = (f: () => void) => {
  const off = subscribeSurfaces(f);
  ownListeners.add(f);
  return () => {
    off();
    ownListeners.delete(f);
  };
};

/** true = the new identity (courier names, frosted windows, mark and sign). Follows the table as it changes. */
export function useIdentityOn(): boolean {
  /* a screen can mount before the root layout has started lib/surfaces;
     the first to ask makes sure the phone's copy is read and a fresh one asked for */
  useEffect(() => {
    void surfacesReady();
    void readSurfaces();
  }, []);
  return useSyncExternalStore(subscribeIdentity, identityOn);
}

/* ── who is asking ─────────────────────────────────────────────────────── */

/* The session's user id, followed from the device (no round trip). undefined
   = not read yet. A different id (another account, or signed out) forgets
   every answer: what marks_for returns depends on who asks (blocks). */
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
    console.log("[identity] the session couldn't be read; no marks for now:", e);
    return null;
  }
  return askerId;
}

/* ── the marks ─────────────────────────────────────────────────────────── */

const cache = createMarksCache({
  async fetch(uids): Promise<MarksAnswer> {
    const ids = uids.filter(isUuid); // the rest (never a real account) read as none
    if (!ids.length) return { rows: [] };
    const { data, error, status } = await supabase!.rpc("marks_for", { p_users: ids });
    return error ? { error, status } : { rows: Array.isArray(data) ? data : [] };
  },
  // console.log, not warn: a dev build must not raise a toast every launch before 0034 runs
  log: (msg, e) => console.log(msg, e ?? ""),
});

cache.subscribe(() => {
  marksVersion++;
  ownChanged();
});
const subscribeMarks = (f: () => void) => {
  ownListeners.add(f);
  const off = subscribeSurfaces(f);
  return () => {
    ownListeners.delete(f);
    off();
  };
};
const versionNow = () => marksVersion;

const allNone = (uids: readonly (string | null | undefined)[]) => new Map(uids.filter((u): u is string => !!u).map((u) => [u, NO_MARKS]));

/**
 * What to show beside these strangers: { mark, sign } per uid. Answers
 * from the session cache and asks marks_for for the rest (≤60 per call).
 * Never rejects: switch off, no session, no 0034 or no network all read as
 * NO_MARKS.
 */
export async function marksFor(uids: readonly (string | null | undefined)[]): Promise<ReadonlyMap<string, Marks>> {
  if (!identityOn()) return allNone(uids);
  if (__DEV__ && devFixture) return new Map(uids.filter((u): u is string => !!u).map((u) => [u, devMarksFixture(u)]));
  if (!supabaseReady) return allNone(uids);
  if (!(await asker())) return allNone(uids);
  return cache.get(uids);
}

/** The answer in memory for one stranger, without asking (NO_MARKS when off, unknown or nothing to show). */
export function peekMarks(uid: string | null | undefined): Marks {
  if (!uid || !identityOn()) return NO_MARKS;
  if (__DEV__ && devFixture) return devMarksFixture(uid);
  return cache.peek(uid) ?? NO_MARKS;
}

/**
 * A screen's marks: asks for these uids when the switch is on (once per
 * set, cached for the session) and returns a lookup that re-renders the
 * screen as answers land. Off → every uid reads NO_MARKS and nothing is
 * asked. Hand the lookup to the pure model builders.
 */
export function useMarks(uids: readonly (string | null | undefined)[]): (uid: string | null | undefined) => Marks {
  const on = useIdentityOn();
  const key = on ? uids.filter((u): u is string => !!u).join("\n") : "";
  useEffect(() => {
    if (key) void marksFor(key.split("\n"));
  }, [key]);
  const version = useSyncExternalStore(subscribeMarks, versionNow);
  // version: a fresh lookup each time an answer lands, so memoised children redraw
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((uid: string | null | undefined) => (on ? peekMarks(uid) : NO_MARKS), [on, version]);
}

/** Forget one person's answer — after blocking or unblocking them (lib/db does this). */
export function forgetMarks(uid: string | null | undefined): void {
  if (uid) cache.forget(uid);
}

/** Forget every answer (the account changed; lib/identity also does this itself on a session change). */
export function clearMarks(): void {
  cache.clear();
}
