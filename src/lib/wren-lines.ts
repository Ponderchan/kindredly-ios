import { DAILY_GROUPS, POOL_KEYS, type LocalPool } from "../data/local-push-copy";
import { MORNING_HOUR } from "./day";

/* HER LINES, PLANNED ON THE PHONE (push step two, iOS 1.2.3).
   ────────────────────────────────────────────────────────────────────────
   The pure half: which line goes on which day at what hour. No native
   module, no storage, no clock of its own — lib/local-push hands it the
   moment, the switches and what was written, and schedules what comes out.
   Kept pure so the decisions are tested (wren-lines.test.ts) rather than
   trusted.

   THE RULES (the owner's push plan, #g2 #g3 #rules):
   · Everything by the person's own clock, by the local calendar date —
     "today" turns at midnight (the plan's #g2: not deskDay's 8 a.m., not
     UTC). A page written at 1 a.m. quiets that same date's 21:00 line.
   · One reminder a day from the phone — the daily line, the Sunday
     look-back and the aura's settled line share a single slot. Priority:
     aura, then Sunday, then the daily line. A day the aura line used stays
     used after its noon has passed (auraDay), so a re-plan that afternoon
     does not hand the evening to the daily line as well.
   · Written today, she stays quiet. The daily line is skipped on a day with
     a Notes page OR a letter sent; the Sunday look-back only by a Notes page
     (a letter to a stranger is not a look-back).
   · One-shot triggers for the next fourteen days, never a repeating one —
     a repeating trigger cannot be skipped on the day you already wrote, and
     iOS runs no code at delivery time. Fourteen days without opening the
     app and the queue runs dry on purpose: she does not chase anyone.
   · Rotation: the daily line draws from a shuffled bag (no repeat until the
     bag is empty, never the same group two evenings running, never the same
     line twice in a row across a reshuffle); the morning question the same,
     without groups; the knock walks its five lines day by day; the Sunday
     look-back goes in order.
   · The morning knock goes out every morning it is on (owner, 2026-10-11):
     the desk refills at eight, so a desk seen empty last night says nothing
     about tomorrow's. Only a morning whose own desk the app KNOWS is empty
     skips it — never a morning it simply hasn't seen. Today the app can't
     know any morning ahead of its eight o'clock (it only sees a desk once
     it has been dealt), so emptyDesk never matches a planned morning and
     the knock goes out every day; the rule stays so a future source that
     does know (say, the server saying the pool is dry) has a place to go.
   · The morning question is an errand, not a reminder: it does not use the
     day's slot and is not silenced by writing. When the knock is on it is
     MERGED into it — one notification at eight, never two.
   · The daily line and the morning question are one OR the other (owner,
     2026-10-11): turning either on turns the other off, in the same write
     (withSwitch).
   · HER DAY OFF (owner, 2026-10-11): at most once a week, at noon — the
     start of her lunch break (lib/free-flight DAY_OFF_HOURS) — she asks for
     a race. Only on a day with no other reminder from the phone (it is the
     lowest claim on the day's one slot), never within seven days of a game
     of Free Flight or of the last one, and not on a day she would be
     working by lib/free-flight's isDayOff rules as far as the phone can see
     them (dayOffBlocked). Nor on a day the server may send her hunger
     (serverHungerDays): one reminder a day holds across both halves. With
     a best run of two gates or more the line carries it ({n}). */

export const EVENING_HOUR = 21;
export const AURA_HOUR = 12; // a daytime moment, the day after a late page at the latest
export const HORIZON_DAYS = 14;
export const AURA_LEAD_MS = 30 * 60 * 1000;
/** the start of her lunch break — the first of lib/free-flight's DAY_OFF_HOURS (not imported: this file stays pure) */
export const DAY_OFF_HOUR = 12;
/** at most one day-off race in this many days, and none this soon after a game */
export const DAY_OFF_GAP_DAYS = 7;
export { MORNING_HOUR };

/* ── the switches (the contract with the server half) ─────────────────── */

export type PushKey = "hungry" | "room_closing" | "first_read" | "daily_line" | "morning_question" | "week_in_words" | "aura_settled" | "day_off";
export type PushPrefs = Record<PushKey, boolean>;
export const PUSH_KEYS: PushKey[] = ["hungry", "room_closing", "first_read", "daily_line", "morning_question", "week_in_words", "aura_settled", "day_off"];
/** missing key = this. Everything about recording is off until the person turns it on (owner decision 4);
    her day off is a game, not recording, and is on until turned off (owner, 2026-10-11). */
export const PUSH_DEFAULTS: PushPrefs = {
  hungry: true,
  room_closing: true,
  first_read: true,
  daily_line: false,
  morning_question: false,
  week_in_words: false,
  aura_settled: false,
  day_off: true,
};
/** the ones the phone schedules itself — the rest are the server's (day_off is never sent by the server) */
export const LOCAL_KEYS: PushKey[] = ["daily_line", "morning_question", "week_in_words", "aura_settled", "day_off"];

/** one OR the other: turning one of these on turns its partner off (owner, 2026-10-11) */
export const EXCLUSIVE: Partial<Record<PushKey, PushKey>> = { daily_line: "morning_question", morning_question: "daily_line" };

/** a stored push object with one switch set — and, when it's turned on, its partner turned off in the same object */
export function withSwitch(push: Record<string, unknown>, key: PushKey, value: boolean): Record<string, unknown> {
  const next: Record<string, unknown> = { ...push, [key]: value };
  const partner = EXCLUSIVE[key];
  if (value && partner) next[partner] = false;
  return next;
}

/** switches to add to a stored object that doesn't set them — except one whose partner the object already has on */
export function addable(add: Record<string, boolean>, onto: Record<string, unknown>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(add)) {
    const partner = EXCLUSIVE[k as PushKey];
    if (v && partner && onto[partner] === true) continue; // the stored one stands
    out[k] = v;
  }
  return out;
}

/** user_metadata.push → every switch, defaults where a key is missing or not a boolean */
export function prefsFrom(raw: unknown): PushPrefs {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out = { ...PUSH_DEFAULTS };
  for (const k of PUSH_KEYS) if (typeof o[k] === "boolean") out[k] = o[k] as boolean;
  return out;
}

/* ── days ─────────────────────────────────────────────────────────────── */

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** the day of a moment: its local calendar date, turning at midnight */
export function dayOf(at: Date | number | string): string {
  return ymd(new Date(typeof at === "string" ? Date.parse(at) : typeof at === "number" ? at : at.getTime()));
}

const dayNumber = (key: string): number => {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 864e5);
};

/** the knock's line for a date: five lines, walked one a day, never the same two mornings running */
export const knockIndex = (key: string): number => ((dayNumber(key) % POOL_KEYS.morning_knock.length) + POOL_KEYS.morning_knock.length) % POOL_KEYS.morning_knock.length;

/** the first day whose AURA_HOUR is at least AURA_LEAD_MS away */
export function auraDayFor(now: Date): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), AURA_HOUR, 0, 0, 0);
  if (today.getTime() - now.getTime() >= AURA_LEAD_MS) return ymd(today);
  return ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, AURA_HOUR, 0, 0, 0));
}

/** has a pending aura line's moment already come (so it was delivered, or missed for good)? */
export function auraMomentPassed(pendingDay: string, now: Date): boolean {
  const [y, m, d] = pendingDay.split("-").map(Number);
  return new Date(y, m - 1, d, AURA_HOUR, 0, 0, 0).getTime() <= now.getTime();
}

/* ── state ────────────────────────────────────────────────────────────── */

export interface AuraPending {
  keys: string[]; // the lines that settled — never shown, only counted against "told"
  day: string; // calendar date of the AURA_HOUR it goes out at
}

export interface PlanState {
  v: 1;
  dailyBag: number[];
  dailyLast: number | null;
  mornBag: number[];
  mornLast: number | null;
  weekNext: number;
  /** a date keeps the line it was dealt, so re-planning on every launch doesn't reshuffle the bag */
  assigned: Record<string, { d?: number; m?: number; w?: number }>;
  /** aura lines already announced (or settled before this existed); null = never looked yet */
  auraTold: string[] | null;
  auraPending: AuraPending | null;
  /** the date whose one reminder the aura line took, kept after it went out */
  auraDay: string | null;
  /** the last day a Notes page / a letter was written (dayOf keys) */
  notesDay: string | null;
  letterDay: string | null;
  /** her day off: the next line of each pool (walked in order, so never the same twice running) */
  offNext: { invite: number; best: number };
  /** the day-off race the last plan scheduled — counted as sent once its noon has passed (settleDayOff) */
  offPending: { day: string; pool: "day_off_invite" | "day_off_best"; index: number } | null;
  /** the last day a day-off race went out: the next is at least DAY_OFF_GAP_DAYS later, and that day's slot stays used */
  offDay: string | null;
}

export const emptyState = (): PlanState => ({
  v: 1,
  dailyBag: [],
  dailyLast: null,
  mornBag: [],
  mornLast: null,
  weekNext: 0,
  assigned: {},
  auraTold: null,
  auraPending: null,
  auraDay: null,
  notesDay: null,
  letterDay: null,
  offNext: { invite: 0, best: 0 },
  offPending: null,
  offDay: null,
});

/** a stored state, checked field by field — a damaged one costs only the rotation */
export function stateFrom(raw: unknown): PlanState {
  const s = emptyState();
  if (!raw || typeof raw !== "object") return s;
  const o = raw as Record<string, unknown>;
  const nums = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x)) : []);
  const num = (v: unknown) => (Number.isInteger(v) ? (v as number) : null);
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  s.dailyBag = nums(o.dailyBag).filter((i) => i >= 0 && i < POOL_KEYS.daily_prompt.length);
  s.dailyLast = num(o.dailyLast);
  s.mornBag = nums(o.mornBag).filter((i) => i >= 0 && i < POOL_KEYS.morning_question.length);
  s.mornLast = num(o.mornLast);
  s.weekNext = num(o.weekNext) ?? 0;
  /* a dealt line is kept only while it still exists — a shorter pool after a
     copy update would otherwise schedule a notification with no words */
  const inPool = (v: unknown, n: number) => Number.isInteger(v) && (v as number) >= 0 && (v as number) < n;
  if (o.assigned && typeof o.assigned === "object" && !Array.isArray(o.assigned)) {
    for (const [k, v] of Object.entries(o.assigned as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !v || typeof v !== "object") continue;
      const a = v as Record<string, unknown>;
      const slot: PlanState["assigned"][string] = {};
      if (inPool(a.d, POOL_KEYS.daily_prompt.length)) slot.d = a.d as number;
      if (inPool(a.m, POOL_KEYS.morning_question.length)) slot.m = a.m as number;
      if (inPool(a.w, POOL_KEYS.week_in_words.length)) slot.w = a.w as number;
      if (Object.keys(slot).length) s.assigned[k] = slot;
    }
  }
  s.auraTold = Array.isArray(o.auraTold) ? o.auraTold.filter((x): x is string => typeof x === "string") : null;
  const p = o.auraPending as Record<string, unknown> | null | undefined;
  s.auraPending = p && Array.isArray(p.keys) && typeof p.day === "string" ? { keys: p.keys.filter((x): x is string => typeof x === "string"), day: p.day } : null;
  s.auraDay = str(o.auraDay);
  s.notesDay = str(o.notesDay);
  s.letterDay = str(o.letterDay);
  const on = o.offNext as Record<string, unknown> | null | undefined;
  s.offNext = { invite: Math.max(0, num(on?.invite) ?? 0), best: Math.max(0, num(on?.best) ?? 0) };
  const op = o.offPending as Record<string, unknown> | null | undefined;
  s.offPending =
    op && typeof op.day === "string" && (op.pool === "day_off_invite" || op.pool === "day_off_best") && inPool(op.index, POOL_KEYS[op.pool].length)
      ? { day: op.day, pool: op.pool, index: op.index as number }
      : null;
  s.offDay = str(o.offDay);
  return s;
}

/* ── the bag ──────────────────────────────────────────────────────────── */

function shuffled(n: number, rng: () => number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** one line out of a bag: refilled when empty, never the last one again, and (when groups are given) never the last one's group */
export function draw(bag: number[], size: number, last: number | null, rng: () => number, groups?: string[]): { pick: number; bag: number[] } {
  let b = bag.length ? bag.slice() : shuffled(size, rng);
  if (!bag.length && last != null && b.length > 1 && b[0] === last) [b[0], b[1]] = [b[1], b[0]];
  let at = 0;
  if (last != null) {
    const ok = (i: number) => i !== last && (!groups || groups[i] !== groups[last]);
    const found = b.findIndex(ok);
    if (found >= 0) at = found;
    else {
      const notSame = b.findIndex((i) => i !== last);
      at = notSame >= 0 ? notSame : 0;
    }
  }
  const pick = b[at];
  b = b.filter((_, i) => i !== at);
  return { pick, bag: b };
}

/* ── the plan ─────────────────────────────────────────────────────────── */

export type LineKind = "daily" | "week" | "aura" | "morning" | "knock" | "dayoff";

export interface Planned {
  id: string; // wl-YYYY-MM-DD-slot — deterministic, so a re-plan replaces rather than doubles
  kind: LineKind;
  pool: LocalPool;
  index: number;
  day: string;
  at: { year: number; month: number; day: number; hour: number; minute: number }; // month 1–12 (iOS DateComponents)
  /** filled into the line's {placeholders} when it is scheduled (fillLine) */
  vars?: Record<string, string | number>;
}

/** a line with its {placeholders} filled; a placeholder with no value is left as it is */
export const fillLine = (text: string, vars?: Record<string, string | number>): string =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;

/* ── her day off: what the phone knows of her work ────────────────────── */

/** what the Me tab last saw of her work (lib/free-flight noteWork) — the parts of isDayOff the phone can carry forward */
export interface WorkSeen {
  /** when it was seen (ms) */
  at: number;
  egg: boolean;
  /** her whereabouts then: bringing (a reply waiting on you) and unsent (no first letter yet) keep her at work */
  state: "home" | "delivery" | "bringing" | "exploring" | "unsent";
  /** the oldest letter waiting on your answer (ms) — two days after it, she is "owed" */
  waitingSince: number | null;
  /** the last time you wrote anything (ms) — fourteen days after it, she wilts */
  lastWrote: number | null;
}

export interface DayOffFacts {
  /** the best run on this phone, in gates (0 = none) */
  best: number;
  /** the day (dayOf) of the last finished run, if any */
  lastPlayed: string | null;
  /** null = the phone has never seen her work: no race, rather than a guess */
  work: WorkSeen | null;
}

const DAY_MS = 864e5;
/** a look at her work older than this is too old to promise a day off on */
export const WORK_STALE_MS = 14 * DAY_MS;

/** would she be at work at that day's noon, as far as the phone can tell? (lib/free-flight isDayOff, carried forward) */
export function dayOffBlocked(key: string, work: WorkSeen | null, now: Date): boolean {
  if (!work) return true;
  if (now.getTime() - work.at > WORK_STALE_MS) return true;
  if (work.egg) return true;
  if (work.state === "bringing" || work.state === "unsent") return true;
  const [y, m, d] = key.split("-").map(Number);
  const noon = new Date(y, m - 1, d, DAY_OFF_HOUR, 0, 0, 0).getTime();
  if (work.waitingSince != null && Math.floor((noon - work.waitingSince) / DAY_MS) >= 2) return true; // owed / owed-long
  if (work.lastWrote != null && Math.floor((noon - work.lastWrote) / DAY_MS) >= 14) return true; // wilting
  return false;
}

/* THE SERVER'S HUNGER PUSH, SEEN FROM THE PHONE (web repo, migration 0032
   push_reminders): with hungry on and the daily line off, it goes out at
   19:00–19:59 local on the first such hour after 3 days without writing
   (day3), and again after 7 (day7) — at most once per tier per silence.
   The phone can't see whether it already went, so both possible dates are
   kept free of a race. A moment inside the 19:00 hour could fall either
   side of the cron's run, so it keeps both that date and the next. */
export const SERVER_HUNGER_HOUR = 19;
export const SERVER_HUNGER_AFTER_DAYS = [3, 7];

/** the dates the server's hunger push may go out on, by the phone's last look at when you wrote */
export function serverHungerDays(lastWrote: number | null, prefs: Pick<PushPrefs, "hungry" | "daily_line">): Set<string> {
  const out = new Set<string>();
  if (!lastWrote || !prefs.hungry || prefs.daily_line) return out;
  for (const n of SERVER_HUNGER_AFTER_DAYS) {
    const t = new Date(lastWrote + n * DAY_MS);
    const next = ymd(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1));
    if (t.getHours() < SERVER_HUNGER_HOUR) out.add(ymd(t));
    else if (t.getHours() === SERVER_HUNGER_HOUR) out.add(ymd(t)).add(next);
    else out.add(next);
  }
  return out;
}

/** before planning: a pending race whose noon has passed went out — its day is spent and its pool moves on */
export function settleDayOff(state: PlanState, now: Date): PlanState {
  const p = state.offPending;
  if (!p) return state;
  const [y, m, d] = p.day.split("-").map(Number);
  if (new Date(y, m - 1, d, DAY_OFF_HOUR, 0, 0, 0).getTime() > now.getTime()) return state;
  const which = p.pool === "day_off_best" ? "best" : "invite";
  return { ...state, offPending: null, offDay: p.day, offNext: { ...state.offNext, [which]: p.index + 1 } };
}

export interface PlanInput {
  now: Date;
  prefs: PushPrefs;
  /** the 8 o'clock knock — a device setting, not on the account */
  knockOn: boolean;
  /** the date (dayOf of its 8 o'clock) whose desk the app KNOWS is empty; null = not known for any morning */
  emptyDesk?: string | null;
  /** her day off; leave out and no race is planned */
  dayOff?: DayOffFacts;
  state: PlanState;
  rng?: () => number;
}

export const ID_PREFIX = "wl-";

export function plan({ now, prefs, knockOn, emptyDesk = null, dayOff, state, rng = Math.random }: PlanInput): { notes: Planned[]; state: PlanState } {
  const s: PlanState = { ...state, assigned: {} };
  const today = dayOf(now);
  // dates already behind the phone's day are forgotten; the rest keep their lines
  for (const [k, v] of Object.entries(state.assigned || {})) if (k >= today) s.assigned[k] = { ...v };

  const notes: Planned[] = [];
  const at = (d: Date, hour: number) => ({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour, minute: 0 });
  const future = (d: Date, hour: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, 0, 0, 0).getTime() > now.getTime();
  const slotOf = (key: string) => (s.assigned[key] ||= {});

  const aura = prefs.aura_settled && s.auraPending ? s.auraPending : null;
  /* the days whose one reminder is taken — her day off only goes on a day left free */
  const taken = new Set<string>();

  for (let i = 0; i < HORIZON_DAYS; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const key = ymd(date); // a slot's day is its calendar date, the same keys dayOf gives

    /* the morning: the question, or the knock unless this morning's desk is known to be empty */
    if (future(date, MORNING_HOUR)) {
      if (prefs.morning_question) {
        const slot = slotOf(key);
        if (slot.m == null) {
          const r = draw(s.mornBag, POOL_KEYS.morning_question.length, s.mornLast, rng);
          slot.m = r.pick;
          s.mornBag = r.bag;
          s.mornLast = r.pick;
        }
        notes.push({ id: `${ID_PREFIX}${key}-morn`, kind: "morning", pool: "morning_question", index: slot.m, day: key, at: at(date, MORNING_HOUR) });
      } else if (knockOn && emptyDesk !== key) {
        notes.push({ id: `${ID_PREFIX}${key}-morn`, kind: "knock", pool: "morning_knock", index: knockIndex(key), day: key, at: at(date, MORNING_HOUR) });
      }
    }

    /* the day's one reminder: aura, then Sunday, then the daily line */
    if (aura && aura.day === key) {
      taken.add(key);
      if (future(date, AURA_HOUR)) notes.push({ id: `${ID_PREFIX}${key}-aura`, kind: "aura", pool: "aura_settled", index: dayNumber(key) % POOL_KEYS.aura_settled.length, day: key, at: at(date, AURA_HOUR) });
      continue; // the aura took the day, whether or not its hour is still ahead
    }
    if (s.auraDay === key || s.offDay === key) {
      taken.add(key);
      continue; // …and keeps it after its noon has gone; so does a day-off race that went out
    }
    if (!future(date, EVENING_HOUR)) continue;
    if (date.getDay() === 0 && prefs.week_in_words) {
      if (s.notesDay === key) continue; // today's page is this week's page
      const slot = slotOf(key);
      if (slot.w == null) {
        slot.w = s.weekNext % POOL_KEYS.week_in_words.length;
        s.weekNext += 1;
      }
      notes.push({ id: `${ID_PREFIX}${key}-eve`, kind: "week", pool: "week_in_words", index: slot.w, day: key, at: at(date, EVENING_HOUR) });
      taken.add(key);
      continue;
    }
    if (prefs.daily_line) {
      if (s.notesDay === key || s.letterDay === key) continue; // written today: she stays quiet
      const slot = slotOf(key);
      if (slot.d == null) {
        const r = draw(s.dailyBag, POOL_KEYS.daily_prompt.length, s.dailyLast, rng, DAILY_GROUPS);
        slot.d = r.pick;
        s.dailyBag = r.bag;
        s.dailyLast = r.pick;
      }
      notes.push({ id: `${ID_PREFIX}${key}-eve`, kind: "daily", pool: "daily_prompt", index: slot.d, day: key, at: at(date, EVENING_HOUR) });
      taken.add(key);
    }
  }

  /* her day off: the first free day far enough from the last race and the last game, where she isn't working */
  s.offPending = null;
  if (prefs.day_off && dayOff) {
    const hungerDays = serverHungerDays(dayOff.work?.lastWrote ?? null, prefs);
    for (let i = 0; i < HORIZON_DAYS; i++) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const key = ymd(date);
      if (!future(date, DAY_OFF_HOUR) || taken.has(key)) continue;
      if (s.offDay && dayNumber(key) - dayNumber(s.offDay) < DAY_OFF_GAP_DAYS) continue;
      if (dayOff.lastPlayed && dayNumber(key) - dayNumber(dayOff.lastPlayed) < DAY_OFF_GAP_DAYS) continue;
      if (dayOffBlocked(key, dayOff.work, now)) continue;
      if (hungerDays.has(key)) continue; // the server may say she's hungry that evening: one reminder a day
      // with a best of 2 or more the line carries it — never "1 gates"
      const best = dayOff.best >= 2;
      const pool = best ? "day_off_best" : "day_off_invite";
      const index = (best ? s.offNext.best : s.offNext.invite) % POOL_KEYS[pool].length;
      notes.push({ id: `${ID_PREFIX}${key}-off`, kind: "dayoff", pool, index, day: key, at: at(date, DAY_OFF_HOUR), vars: best ? { n: dayOff.best } : undefined });
      s.offPending = { day: key, pool, index };
      break; // one at a time: the next is planned after this one has gone
    }
  }
  for (const k of Object.keys(s.assigned)) if (!Object.keys(s.assigned[k]).length) delete s.assigned[k];
  return { notes, state: s };
}

/* ── the aura's settled lines ─────────────────────────────────────────── */

/** fold the lines settled right now into the state. `viewing` = the person is on the aura page:
    everything is told and the pending line is withdrawn. The first look ever only takes a baseline —
    lines that settled before this existed are not news. */
export function observeLocks(state: PlanState, locked: string[], { viewing, on, now }: { viewing: boolean; on: boolean; now: Date }): PlanState {
  const s: PlanState = { ...state };
  if (s.auraTold === null) {
    s.auraTold = [...new Set(locked)];
    return s;
  }
  const told = new Set(s.auraTold);
  const pending = new Set(s.auraPending?.keys ?? []);
  const fresh = locked.filter((k) => !told.has(k) && !pending.has(k));
  if (viewing) {
    for (const k of [...locked, ...pending]) told.add(k);
    s.auraTold = [...told];
    // opened after its noon (often from the notification itself): it went out, the day stays used
    if (s.auraPending && auraMomentPassed(s.auraPending.day, now)) s.auraDay = s.auraPending.day;
    s.auraPending = null;
    return s;
  }
  if (!fresh.length) return s;
  if (!on) {
    for (const k of fresh) told.add(k);
    s.auraTold = [...told];
    return s;
  }
  s.auraPending = { keys: [...pending, ...fresh], day: s.auraPending?.day ?? auraDayFor(now) };
  return s;
}

/** before planning: a pending line whose moment has passed is told; a pending line with the switch off is dropped as told */
export function settleAura(state: PlanState, { on, now }: { on: boolean; now: Date }): PlanState {
  const p = state.auraPending;
  if (!p) return state;
  const passed = auraMomentPassed(p.day, now);
  if (on && !passed) return state;
  // its moment came: it was delivered, and that day's one reminder is spent
  return { ...state, auraTold: [...new Set([...(state.auraTold ?? []), ...p.keys])], auraPending: null, auraDay: passed ? p.day : state.auraDay };
}
