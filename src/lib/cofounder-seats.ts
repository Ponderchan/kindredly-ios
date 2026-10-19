import { supabase, supabaseReady } from "./supabase";

/* THE HUNDRED — how many Cofounder seats are left, and your own number.
   ────────────────────────────────────────────────────────────────────────
   The paywall's Lifetime fare says "FOUNDING 100 ONLY · 53 LEFT" (Me 4a,
   the owner's O8): the count must be real, so it comes from the server's
   public.cofounder_seats_left() (web repo supabase/migrations/0036). Until
   the owner runs 0036 that function does not exist: the call errors, this
   returns null, and the paywall says only "FOUNDING 100 ONLY". Never a
   guessed number.

   my_cofounder_no() is the caller's own place in the hundred, for when
   /api/entitlement says the plan is lifetime but sends no number (today it
   never sends one). Null for anyone who isn't a cofounder.

   Both answers are cached for a short while (a paywall opened twice in a
   minute asks once); a failure is not cached, so the next open tries again,
   but it is only logged the first time — the warning would otherwise repeat
   on every paywall until 0036 runs. */

export const COFOUNDER_SEATS = 100;

const TTL_MS = 60_000;

type Cached = { value: number | null; at: number; uid?: string | null };
const cache: Record<string, Cached | undefined> = {};
const warned = new Set<string>();

function asCount(data: unknown): number | null {
  const n = typeof data === "number" ? data : typeof data === "string" ? Number(data) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

async function callInt(fn: "cofounder_seats_left" | "my_cofounder_no", uid: string | null): Promise<number | null> {
  if (!supabaseReady || !supabase) return null;
  const hit = cache[fn];
  if (hit && Date.now() - hit.at < TTL_MS && hit.uid === uid) return hit.value;
  try {
    const { data, error } = await supabase.rpc(fn);
    if (error) throw error;
    const value = asCount(data);
    cache[fn] = { value, at: Date.now(), uid };
    return value;
  } catch (e) {
    if (!warned.has(fn)) {
      warned.add(fn);
      console.warn(`[cofounder-seats] ${fn} unavailable (has 0036 run?)`, e);
    }
    return null;
  }
}

/** Seats left of the hundred (0..100), or null when the server can't say (offline, or 0036 not run yet). */
export async function fetchSeatsLeft(): Promise<number | null> {
  const n = await callInt("cofounder_seats_left", null);
  return n == null ? null : Math.min(COFOUNDER_SEATS, n);
}

/** The signed-in reader's own Cofounder number (1..), or null when they aren't one or the server can't say. */
export async function fetchMyCofounderNo(): Promise<number | null> {
  let uid: string | null = null;
  try {
    uid = (await supabase?.auth.getSession())?.data.session?.user.id ?? null;
  } catch (e) {
    console.warn("[cofounder-seats] no session", e);
  }
  if (!uid) return null; // anon may not call it, and has no number anyway
  const n = await callInt("my_cofounder_no", uid);
  return n != null && n >= 1 ? n : null;
}

/** Drop the cached answers (after a purchase, so the count and the number are read fresh). */
export function clearCofounderCache(): void {
  delete cache.cofounder_seats_left;
  delete cache.my_cofounder_no;
}
