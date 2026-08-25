import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ThreadSummary } from "./db";
import { threadState } from "./thread-state";
import { supabase, supabaseReady } from "./supabase";
import { STAGE_ORDER } from "./wren-style";
import type { WrenStage } from "../components/WrenBird";

/* WHERE SHE IS, AND WHAT SHE BROUGHT BACK.
   ────────────────────────────────────────────────────────────────────────
   The owner's mockup for the Me·bird page: her room answers "what
   happened while I was gone", not "what are my numbers". Two engines:

   · WHEREABOUTS — one of four places she can be, derived live from the
     threads that already exist. Never invented: "on a delivery" IS a
     letter of yours the other side hasn't answered; "bringing something
     back" IS a reply sitting unanswered on your side.

   · SOUVENIRS — small dated things she kept from real journeys. Counted,
     never generated (notice.ts's law): every souvenir names the query
     that would verify it. */

export type Whereabouts = "home" | "delivery" | "bringing" | "exploring";

export interface WhereaboutsRead {
  state: Whereabouts;
  /** her status line, present tense */
  line: string;
  /** what she'd yell over her shoulder */
  bubble: string;
}

export function whereabouts(threads: ThreadSummary[]): WhereaboutsRead {
  if (!threads.length)
    return { state: "exploring", line: "Out looking for you", bubble: "someone's out there…" };
  if (threads.some((t) => threadState(t)?.needsYou))
    return { state: "bringing", line: "Back — something for you", bubble: "look what I found!" };
  if (threads.some((t) => t.lastSenderMe && t.theirs >= 0 && !threadState(t)?.needsYou && t.mine > 0))
    return { state: "delivery", line: "On a delivery", bubble: "be right back!" };
  return { state: "home", line: "At home, with you", bubble: "hi." };
}

/* ── souvenirs ── */

export interface Souvenir {
  id: string;
  glyph: string;
  title: string;
  /** mono footer — a date or a count, always checkable */
  detail: string;
  at?: number; // for ordering, newest first where dated
}

/* one light query of her own history — the letters and messages she has
   actually carried, with when they left */
export async function fetchCarried(): Promise<{ at: string }[]> {
  if (!supabaseReady) return [];
  try {
    const { data: u } = await supabase!.auth.getUser();
    const me = u.user?.id;
    if (!me) return [];
    const [l, m] = await Promise.all([
      supabase!.from("letters").select("created_at").eq("author", me).order("created_at").limit(100),
      supabase!.from("messages").select("created_at").eq("sender", me).order("created_at").limit(200),
    ]);
    return [...(l.data || []), ...(m.data || [])]
      .filter((r: any) => r.created_at)
      .map((r: any) => ({ at: r.created_at }))
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  } catch {
    return [];
  }
}

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

export function buildSouvenirs(
  carried: { at: string }[],
  threads: ThreadSummary[],
  topWord?: string | null,
): Souvenir[] {
  const out: Souvenir[] = [];

  const first = carried[0];
  if (first)
    out.push({ id: "first-flight", glyph: "✈️", title: "First flight", detail: day(first.at), at: Date.parse(first.at) });

  // a letter that left between midnight and five — she flew it in the dark
  const night = carried.find((c) => {
    const h = new Date(c.at).getHours();
    return h >= 0 && h < 5;
  });
  if (night)
    out.push({ id: "night-run", glyph: "🌙", title: "Late night run", detail: `${day(night.at)} · ${clock(night.at)}`, at: Date.parse(night.at) });

  const answered = threads.find((t) => t.theirs > 0);
  if (answered)
    out.push({ id: "first-reply", glyph: "📨", title: "Someone wrote back", detail: `NO. ${String(threads.filter((t) => t.theirs > 0).length).padStart(2, "0")} CARRIED`, at: answered.lastAt });

  const kindred = threads.find((t) => t.revealed);
  if (kindred)
    out.push({ id: "first-kindred", glyph: "🤝", title: "Names traded", detail: kindred.otherName ? kindred.otherName.toUpperCase() : "A KINDRED", at: kindred.lastAt });

  if (topWord) out.push({ id: "kept-word", glyph: "💬", title: "A word you keep", detail: `"${topWord}"` });

  return out.slice(0, 8);
}

/* ── stage dates: the journey strip wants WHEN, not just whether ── */

const DATES_KEY = "kindredly_wren_stage_dates";

export async function recordStageDate(stage: WrenStage): Promise<void> {
  try {
    const raw = (await AsyncStorage.getItem(DATES_KEY)) || "{}";
    const map = JSON.parse(raw) as Record<string, string>;
    if (!map[stage]) {
      map[stage] = new Date().toISOString().slice(0, 10);
      await AsyncStorage.setItem(DATES_KEY, JSON.stringify(map));
    }
  } catch {
    /* the strip just shows fewer dates */
  }
}

export async function getStageDates(): Promise<Partial<Record<WrenStage, string>>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(DATES_KEY)) || "{}");
  } catch {
    return {};
  }
}

export { STAGE_ORDER };
