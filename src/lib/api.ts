/* Thin clients for the Cloudflare Pages Functions that need the service role
   (entitlement + the free-tier daily cap). Both authenticate with the user's
   Supabase JWT as a Bearer token — the exact contract the web app uses.
   Plus one plain read: the day's letter count the compose page shows a free
   writer (lettersLeftToday). */

import { API_BASE, supabase } from "./supabase";
import { WRITE_MS, fetchWithin } from "./net";

async function bearer(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export interface Entitlement {
  premium: boolean;
  country?: string | null;
  plan?: string | null;
  status?: string | null;
  premium_until?: string | null;
  /** issued once, in the order they arrived — see entitlement.tsx */
  cofounder_no?: number | null;
  cancel_at_period_end?: boolean;
  next_amount?: number | null;
  next_currency?: string | null;
  next_charge_at?: string | null;
}

/** GET /api/entitlement — hydrate premium state on boot. Fails closed. */
export async function fetchEntitlement(): Promise<Entitlement | null> {
  const token = await bearer();
  if (!token) return null;
  try {
    /* the paywall reads this; an unbounded call meant a dead connection
       could leave First Class in limbo rather than simply unproven */
    const r = await fetchWithin(`${API_BASE}/api/entitlement`, {
      headers: { authorization: `Bearer ${token}` },
    }, WRITE_MS);
    if (!r.ok) return null;
    return (await r.json()) as Entitlement;
  } catch {
    return null;
  }
}

/* THE FREE POST: five open letters a day, mirrored from the server's
   FREE_PER_DAY and FREE_FIRST_DAY (web functions/api/bump-letters.js:17-18,
   both 5). The server is the authority — bumpLetters says no with a 429 —
   so this is only what the page shows and the fallback when a 429 carries
   no cap (compose used `bump.cap ?? 3`, two letters short). */
export const FREE_PER_DAY = 5;

/** Open letters sent today and how many are left, from the caller's own
    letters_daily row (RLS "read own daily count", web 0005_billing.sql).
    The day is UTC, as the server keys it (current_date on a UTC database;
    bump-letters.js reads toISOString().slice(0, 10)) — so it turns at
    midnight UTC, not at the desk's 08:00. No row is a day with nothing sent
    yet. null when it can't be read (no session, offline, an error): the
    page then shows no count rather than a guess. Replies are never counted
    (only bumpLetters increments it, before a new open letter). */
export async function lettersLeftToday(cap: number = FREE_PER_DAY): Promise<{ count: number; left: number } | null> {
  if (!supabase) return null;
  try {
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user?.id;
    if (!uid || s.session?.user?.is_anonymous) return null;
    const day = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.from("letters_daily").select("count").eq("user_id", uid).eq("day", day).maybeSingle();
    if (error) return null;
    const raw = (data as { count?: unknown } | null)?.count;
    const count = typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    return { count, left: Math.max(0, cap - count) };
  } catch {
    return null;
  }
}

export type BumpResult =
  | { ok: true; premium: boolean; count: number; cap?: number }
  | { ok: false; reason: "daily_cap"; cap?: number; used?: number }
  | { ok: false; reason: "error" | "unauthorized" };

/** POST /api/bump-letters — server-authoritative free cap. Call right before
   publishing a NEW open letter (not replies). 429 => daily_cap. */
export async function bumpLetters(): Promise<BumpResult> {
  const token = await bearer();
  if (!token) return { ok: false, reason: "unauthorized" };
  try {
    const r = await fetchWithin(`${API_BASE}/api/bump-letters`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: "{}",
    }, WRITE_MS);
    const j: any = await r.json().catch(() => ({}));
    if (r.status === 429) return { ok: false, reason: "daily_cap", cap: j.cap, used: j.used };
    if (r.status === 401) return { ok: false, reason: "unauthorized" };
    if (!r.ok) return { ok: false, reason: "error" };
    return { ok: true, premium: !!j.premium, count: j.count, cap: j.cap };
  } catch {
    return { ok: false, reason: "error" };
  }
}
