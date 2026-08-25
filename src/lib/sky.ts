import type { ThreadSummary } from "./db";
import { supabase, supabaseReady } from "./supabase";

/* THE SKY — a map whose coordinates are TIME, not place.
   ────────────────────────────────────────────────────────────────────────
   Every pen-pal map ever built puts people on the Earth: flags, cities,
   kilometres. That map turns strangers into a directory — you meet the
   country before the person — and in an anonymous product it is also a
   deanonymiser, because country + writing hour + style is a name.

   So ours drops the Earth and keeps the thing that actually explains a
   slow correspondence: WHEN someone writes. The horizontal axis is one
   day. A correspondent stands at the hour they habitually write; the
   terminator sweeps; your own house sits at your hour. The first glance
   answers the question this product's users actually ask —

     "why hasn't she written back?"  →  because it is 4am where she keeps
     her hours, and she has not woken up yet.

   Vertical is closeness: the more they have written to you, the lower and
   nearer their window sits. Nothing here is location data. It is derived
   from timestamps we already own, on rows the reader is already allowed
   to read. */

const TAU = Math.PI * 2;

/** circular mean of hours — 23:00 and 01:00 average to midnight, not noon */
export function meanHour(times: (string | number)[]): number | null {
  if (!times.length) return null;
  let x = 0;
  let y = 0;
  for (const t of times) {
    const h = new Date(t).getHours() + new Date(t).getMinutes() / 60;
    const a = (h / 24) * TAU;
    x += Math.cos(a);
    y += Math.sin(a);
  }
  if (!x && !y) return null;
  const a = Math.atan2(y / times.length, x / times.length);
  return (((a / TAU) * 24) + 24) % 24;
}

/** the hour each correspondent keeps, from the letters they sent YOU */
export async function fetchTheirHours(threads: ThreadSummary[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (!supabaseReady || !threads.length) return out;
  try {
    const { data: u } = await supabase!.auth.getUser();
    const me = u.user?.id;
    if (!me) return out;
    const { data } = await supabase!
      .from("messages")
      .select("thread_id,sender,created_at")
      .in("thread_id", threads.map((t) => t.id))
      .neq("sender", me)
      .limit(500);
    const byOther: Record<string, string[]> = {};
    const owner: Record<string, string> = {};
    for (const t of threads) owner[t.id] = t.other;
    for (const r of data || []) {
      const other = owner[(r as any).thread_id];
      if (!other) continue;
      (byOther[other] ||= []).push((r as any).created_at);
    }
    for (const [other, times] of Object.entries(byOther)) {
      const h = meanHour(times);
      if (h != null) out[other] = h;
    }
    /* a thread whose last word was theirs still tells us one hour, even
       before we have a spread — better a real single sighting than a
       guess at the middle of the day */
    for (const t of threads)
      if (out[t.other] == null && !t.lastSenderMe) out[t.other] = new Date(t.lastAt).getHours();
  } catch {
    /* the sky just places fewer windows */
  }
  return out;
}
