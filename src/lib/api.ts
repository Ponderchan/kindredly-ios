/* Thin clients for the Cloudflare Pages Functions that need the service role
   (entitlement + the free-tier daily cap). Both authenticate with the user's
   Supabase JWT as a Bearer token — the exact contract the web app uses. */

import { API_BASE, supabase } from "./supabase";

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
    const r = await fetch(`${API_BASE}/api/entitlement`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    return (await r.json()) as Entitlement;
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
    const r = await fetch(`${API_BASE}/api/bump-letters`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: "{}",
    });
    const j: any = await r.json().catch(() => ({}));
    if (r.status === 429) return { ok: false, reason: "daily_cap", cap: j.cap, used: j.used };
    if (r.status === 401) return { ok: false, reason: "unauthorized" };
    if (!r.ok) return { ok: false, reason: "error" };
    return { ok: true, premium: !!j.premium, count: j.count, cap: j.cap };
  } catch {
    return { ok: false, reason: "error" };
  }
}
