/* THE PHONE'S COPY OF THE PROFILE, AND WHAT IT MAY SAY OVER THE ACCOUNT'S (lib/auth's
   saveProfile; tested by profile-local-core.test.ts).

   Owner, 2026-10-21: "my face is gone after I switch accounts, or sign out and back in". The phone
   keeps a copy of the profile (kindredly_profile_local, per account) that is laid over
   user_metadata and pushed up whole on every save. An empty value in that copy (an onboarding that
   answered "Later", a guest's answers, an old copy from before the namespacing) used to hide the
   account's face and then, on the next save, write null over it on the server.

   So for the identity fields an empty value only counts when it was an explicit clear: a
   saveProfile call that named the field with nothing in it (Edit profile's photo clears the
   library face). Those are remembered in CLEARED; every other empty identity value is "no answer"
   — never shown over the account's value, never sent up. Pure: no storage, no React. */

/** the fields an empty local value must never wipe by accident */
export const IDENTITY_KEYS: readonly string[] = ["avatarId", "handle", "pronoun", "dob"];
/** the local copy's record of the identity fields the person cleared on purpose (never synced) */
export const CLEARED = "_cleared";

export type LocalProfile = Record<string, any>;

const isEmpty = (v: unknown): boolean => v === null || v === undefined || v === "";
const isIdentity = (k: string): boolean => IDENTITY_KEYS.includes(k);

function clearedOf(local: LocalProfile): string[] {
  const c = local[CLEARED];
  return Array.isArray(c) ? c.filter((k): k is string => typeof k === "string" && isIdentity(k)) : [];
}

/** A saveProfile patch merged into the local copy. An identity field named with an empty value is
    an explicit clear (stored as null and remembered); one with a value forgets any clear. Callers
    with nothing to say about a field (onboarding's "Later") leave it out — see withoutEmpty. */
export function applyPatch(local: LocalProfile, patch: LocalProfile): LocalProfile {
  const next: LocalProfile = { ...local };
  const cleared = new Set(clearedOf(local));
  for (const [k, v] of Object.entries(patch)) {
    if (k === CLEARED) continue;
    if (isIdentity(k)) {
      if (isEmpty(v)) {
        next[k] = null;
        cleared.add(k);
      } else {
        next[k] = v;
        cleared.delete(k);
      }
    } else {
      next[k] = v;
    }
  }
  if (cleared.size) next[CLEARED] = [...cleared];
  else delete next[CLEARED];
  return next;
}

/** The local copy without what must not be said over the account: the CLEARED record, and any
    empty identity field that wasn't cleared on purpose. */
function sayable(local: LocalProfile): LocalProfile {
  const cleared = new Set(clearedOf(local));
  const out: LocalProfile = {};
  for (const [k, v] of Object.entries(local)) {
    if (k === CLEARED) continue;
    if (isIdentity(k) && isEmpty(v) && !cleared.has(k)) continue;
    out[k] = v;
  }
  return out;
}

/** What the app shows: the account's metadata with the phone's copy over it. */
export function visibleProfile(meta: LocalProfile | null | undefined, local: LocalProfile): LocalProfile {
  return { ...(meta || {}), ...sayable(local) };
}

/** What goes up to user_metadata (Supabase merges top-level keys, so a field left out keeps the
    server's value). The pen name doubles as full_name, as it always has. */
export function syncPayload(local: LocalProfile): LocalProfile {
  const data: LocalProfile = { ...sayable(local), onboarded: true };
  if (data.handle) data.full_name = data.handle;
  return data;
}

/** A patch with its empty values left out: for callers whose empty means "no answer", not "clear it"
    (onboarding's finish, where a skipped face must not erase the face of an account switched to). */
export function withoutEmpty<T extends LocalProfile>(patch: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(patch)) if (!isEmpty(v)) (out as LocalProfile)[k] = v;
  return out;
}

/** Whether a stored local copy has anything worth adopting (a guest's answers moving to the account
    they sign in to): any non-empty value besides the CLEARED record. */
export function hasAnswers(local: LocalProfile | null | undefined): boolean {
  if (!local) return false;
  return Object.entries(local).some(([k, v]) => k !== CLEARED && !isEmpty(v));
}

/** A stored copy read back; anything unreadable is an empty copy. */
export function parseLocal(raw: string | null | undefined): LocalProfile {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/** The bucket a session's local state lives in: the account's id, or "anon" for a guest / nobody
    (lib/scoped-store's namespace). */
export function ownerOf(user: { id: string; is_anonymous?: boolean } | null | undefined): string {
  return user && !user.is_anonymous ? user.id : "anon";
}
