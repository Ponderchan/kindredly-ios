import AsyncStorage from "@react-native-async-storage/async-storage";
import { t, t as tr, getLang } from "./i18n";
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

export type Whereabouts = "home" | "delivery" | "bringing" | "exploring" | "unsent";

/* one registry for everything a status shows, wherever it shows — her
   room, the YOU|PIP switch, whatever comes next. The owner is planning
   more states; adding one means adding one entry here. `tone` is the
   colour any surface should dot itself with. */
export const WHEREABOUTS_META: Record<
  Whereabouts,
  { label: string; sub: string; mood: "content" | "curious" | "delight" | "listen"; tone: "pen" | "ink" | "faint" }
> = {
  home: { label: "At home", sub: "no letters out", mood: "content", tone: "faint" },
  delivery: { label: "On a delivery", sub: "at someone's door", mood: "curious", tone: "ink" },
  bringing: { label: "Bringing something", sub: "on the way back", mood: "delight", tone: "pen" },
  exploring: { label: "Exploring", sub: "looking for you", mood: "listen", tone: "faint" },
  unsent: { label: "Waiting", sub: "nothing to carry yet", mood: "curious", tone: "faint" },
};

export interface WhereaboutsRead {
  state: Whereabouts;
  /** her status line, present tense */
  line: string;
  /** what she'd yell over her shoulder */
  bubble: string;
}

export function whereabouts(threads: ThreadSummary[], sent: number | null = null): WhereaboutsRead {
  /* SHE CANNOT BE OUT LOOKING WITH AN EMPTY BAG. This read threads alone, so
     it said "Out looking for you" to a reader whose letter had never gone
     out — and that reader exists: hatching asks for one thought of any
     length, while the pool asks for forty characters, and when the two
     disagree the opening letter is dropped in silence. Nobody can answer a
     letter that was never sent, so they wait forever and are never told why.
     `sent` is null while the count is still loading; only a KNOWN zero
     changes what she says, or she'd claim an empty bag on every cold start. */
  if (!threads.length && sent === 0)
    return { state: "unsent", line: t("wren.where.unsent"), bubble: t("wren.bubble.unsent") };
  if (!threads.length)
    return { state: "exploring", line: t("wren.where.exploring"), bubble: t("wren.bubble.exploring") };
  if (threads.some((t) => threadState(t)?.needsYou))
    return { state: "bringing", line: t("wren.where.bringing"), bubble: t("wren.bubble.bringing") };
  if (threads.some((t) => t.lastSenderMe && t.theirs >= 0 && !threadState(t)?.needsYou && t.mine > 0))
    return { state: "delivery", line: t("wren.where.delivery"), bubble: t("wren.bubble.delivery") };
  return { state: "home", line: t("wren.where.home"), bubble: t("wren.bubble.home") };
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
  new Date(iso).toLocaleDateString(({ en: "en-US", es: "es-ES", pt: "pt-BR", id: "id-ID" }[getLang()] || "en-US"), { month: "short", day: "numeric" }).toUpperCase();
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
    out.push({ id: "first-flight", glyph: "✈️", title: tr("sv.firstFlight"), detail: day(first.at), at: Date.parse(first.at) });

  // a letter that left between midnight and five — she flew it in the dark
  const night = carried.find((c) => {
    const h = new Date(c.at).getHours();
    return h >= 0 && h < 5;
  });
  if (night)
    out.push({ id: "night-run", glyph: "🌙", title: tr("sv.lateNight"), detail: `${day(night.at)} · ${clock(night.at)}`, at: Date.parse(night.at) });

  const answered = threads.find((t) => t.theirs > 0);
  if (answered)
    out.push({ id: "first-reply", glyph: "📨", title: tr("sv.someoneBack"), detail: tr("sv.carriedDetail", { n: String(threads.filter((t) => t.theirs > 0).length).padStart(2, "0") }), at: answered.lastAt });

  if (topWord) out.push({ id: "kept-word", glyph: "💬", title: tr("sv.wordKeep"), detail: `"${topWord}"` });

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

/* ── the shelf is a LEDGER now — she keeps what she earns, forever ──────
   The derived list above only knew firsts, so after week one the room
   went still. Minting fixes that: recurring milestones (the 10th letter,
   the 25th, each new kindred) become souvenirs the moment they happen,
   dated by the actual event, and persist locally so the shelf only ever
   grows. Derivation stays the source of truth for WHAT exists; the
   ledger remembers WHEN it was first seen. */

const SHELF_KEY = "kindredly_wren_souvenirs";
const CARRY_MARKS = [10, 25, 50, 100, 250];

export async function mintSouvenirs(
  carried: { at: string }[],
  threads: ThreadSummary[],
  topWord?: string | null,
): Promise<Souvenir[]> {
  const fresh = buildSouvenirs(carried, threads, topWord);

  // recurring: the Nth letter she carried, dated by that very letter
  for (const n of CARRY_MARKS) {
    const nth = carried[n - 1];
    if (nth)
      fresh.push({ id: `carried-${n}`, glyph: "📮", title: tr("sv.lettersCarried", { n }), detail: day(nth.at), at: Date.parse(nth.at) });
  }
  // each kindred is her own souvenir — she introduced you
  for (const t of threads.filter((x) => x.revealed))
    fresh.push({ id: `kindred-${t.id}`, glyph: "🤝", title: tr("sv.namesTraded"), detail: (t.otherName ? t.otherName.toUpperCase() : tr("ev.aKindred")), at: t.lastAt });

  try {
    const raw = (await AsyncStorage.getItem(SHELF_KEY)) || "[]";
    // ledger repair: the generic first-kindred card predates per-kindred
    // minting and duplicated it on every shelf that had one
    const shelf: Souvenir[] = (JSON.parse(raw) as Souvenir[]).filter((x) => x.id !== "first-kindred");
    const have = new Set(shelf.map((s) => s.id));
    let grew = false;
    for (const s of fresh)
      if (!have.has(s.id)) {
        shelf.push(s);
        have.add(s.id);
        grew = true;
      }
    if (grew) await AsyncStorage.setItem(SHELF_KEY, JSON.stringify(shelf.slice(-60)));
    return shelf.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  } catch {
    return fresh.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  }
}

/* ── while you were away: the diff that makes change FELT ───────────────
   Every visit stores {carried, repliesIn}; the next visit reports the
   difference in her voice. This is the owner's actual ask — you write,
   you come back, and something in her room has moved because of it. */

const VISIT_KEY = "kindredly_wren_lastvisit";

export interface AwayReport {
  carriedOut: number; // letters/messages of yours she took since last visit
  broughtBack: number; // replies that arrived since last visit
}

export async function sinceLastVisit(
  carried: { at: string }[],
  threads: ThreadSummary[],
): Promise<AwayReport | null> {
  const now = { carried: carried.length, replies: threads.reduce((n, t) => n + t.theirs, 0) };
  try {
    const raw = await AsyncStorage.getItem(VISIT_KEY);
    await AsyncStorage.setItem(VISIT_KEY, JSON.stringify(now));
    if (!raw) return null;
    const prev = JSON.parse(raw) as { carried: number; replies: number };
    const carriedOut = Math.max(0, now.carried - (prev.carried ?? 0));
    const broughtBack = Math.max(0, now.replies - (prev.replies ?? 0));
    return carriedOut || broughtBack ? { carriedOut, broughtBack } : null;
  } catch {
    return null;
  }
}

/** she dozes when nothing has left the house in five days */
export function isDozing(carried: { at: string }[]): boolean {
  const last = carried[carried.length - 1];
  return !last || Date.now() - Date.parse(last.at) > 5 * 24 * 3600 * 1000;
}

/* ── HER FLIGHT LOG — what you get for tapping her ──────────────────────
   Every row is counted from real rows (letters you sent, replies that
   came back, the hour of the last flight). Nothing is estimated and
   nothing is promised.

   The closing line exists to answer a question this product must never
   answer with a price: how fast is she? She is instant — she leaves the
   moment you press send. What takes days is the person at the other end,
   and no subscription can or should shorten that. */

const H = 3600e3;
/** a bare span — "6H". The row decides whether that means AGO or FOR. */
function span(iso: string | number): string {
  const ms = Date.now() - (typeof iso === "number" ? iso : Date.parse(iso));
  if (ms < H) return `${Math.max(1, Math.round(ms / 60e3))}M`;
  if (ms < 24 * H) return `${Math.round(ms / H)}H`;
  return `${Math.round(ms / (24 * H))}D`;
}

export function flightLog(
  state: Whereabouts | "dozing",
  carried: { at: string }[],
  threads: ThreadSummary[],
  driving: ThreadSummary | null,
): { rows: string[]; line: string } {
  const total = carried.length;
  const back = threads.reduce((n, t) => n + t.theirs, 0);
  const last = carried[carried.length - 1];
  const week = carried.filter((c) => Date.now() - Date.parse(c.at) < 7 * 24 * H).length;

  const rows =
    state === "delivery" && driving
      ? [tr("fl.outFor", { span: span(driving.lastAt) }), tr("fl.carriedAll", { n: total }), tr("fl.thisWeek", { n: week })]
      : state === "bringing" && driving
        ? [tr("fl.landed", { span: span(driving.lastAt) }), tr("fl.broughtAll", { n: back }), tr("fl.carriedOut", { n: total })]
        : state === "dozing"
          ? [
              last ? tr("fl.lastFlight", { span: span(last.at) }) : tr("fl.neverFlown"),
              tr("fl.carriedBrought", { c: total, b: back }),
              tr("fl.wakes"),
            ]
          : [
              last ? tr("fl.lastFlight", { span: span(last.at) }) : tr("fl.neverFlown"),
              tr("fl.carriedBrought", { c: total, b: back }),
              (week === 1 ? tr("fl.flightsWeekOne", { n: week }) : tr("fl.flightsWeekMany", { n: week })),
            ];

  return { rows, line: t("wren.log.line") };
}
