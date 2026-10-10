import type { JournalEntry } from "./journal";
import type { ThreadSummary } from "./db";
import { STAMPS } from "../data/stamps";
import { getMood, type MoodTone } from "../data/moods";
import { detectThemes } from "./writing-engine/journal-sparks/detect-themes";
import { detectLanguage } from "./writing-engine/resolve-language";
import type { JournalTheme } from "./writing-engine/types";

/* USAGE STICKERS — what the product itself can count about you.
   ────────────────────────────────────────────────────────────────────────
   The writing stickers read HOW you write. These read WHEN you write, WHAT
   you write about, and what you do with the app: the hour on your letters,
   the stamps you pick, the threads you keep, the pages you seal, the bird
   you dress. Every one is a count over facts already on the phone — no
   model, no guess, no clock inside (`now` is passed in).

   `private` stickers never leave the phone: not on the share card, not on
   any surface a kindred can see. They are the ones a stranger could read
   unkindly (Ghost, Picky) and everything from the sealed room. */

export type UsageGroup = "time" | "habit" | "subject" | "sealed" | "courier";

export interface UsageSticker {
  id: string;
  group: UsageGroup;
  private: boolean;
  /** the counted fact behind it — pieces, days, threads, pages */
  n: number;
  /** the denominator when the fact is a share */
  of?: number;
}

export interface LocalCounters {
  /** letters shown on Today */
  seen: number;
  /** replies sent from Today */
  replied: number;
  /** translate taps */
  translated: number;
  /** the courier's room opened */
  courierVisits: number;
  /** letters shown today — the day key and the count, reset when the day turns */
  seenDay?: string;
  seenToday?: number;
  /** replies sent today — for her slip at the close of day */
  repliedDay?: string;
  repliedToday?: number;
}

export const EMPTY_COUNTERS: LocalCounters = { seen: 0, replied: 0, translated: 0, courierVisits: 0 };

export interface UsageFacts {
  now: string;
  /** my pool letters */
  letters: { at: string | null; text: string; stamp?: string | null }[];
  /** my thread messages */
  replies: { at: string | null; text: string }[];
  threads: ThreadSummary[];
  /** sealed pages — pass [] unless the reader has let the aura read them */
  journal: JournalEntry[];
  keptN: number;
  /** the bird wears something other than the default */
  dressed: boolean;
  /** the bird has a name of its own */
  named: boolean;
  counters: LocalCounters;
}

const DAY = 864e5;

/* one piece's subjects — the rule Today's chip and the counted layer share.
   One word is a mention, not a subject: a theme counts for a piece when the
   detector is sure of it or it shows up more than once in the piece. */
export const longEnough = (t: string): boolean => !!t && t.trim().split(/\s+/).length >= 12;
export function pieceThemes(text: string): JournalTheme[] {
  const out: JournalTheme[] = [];
  for (const r of detectThemes(text).themes) if ((r.confidence >= 0.8 || r.evidence.length >= 2) && !out.includes(r.theme)) out.push(r.theme);
  return out;
}
const STAMP_CAT = new Map(STAMPS.map((s) => [s.id, s.cat]));

/* stamp category → sticker */
const STAMP_STICKER: Record<string, string> = {
  confessions: "confessor",
  almosts: "almost_person",
  latenights: "three_am_type",
  small: "small_things_noticer",
  becoming: "grower",
  missing: "homesick_heart",
};

/* journal theme → sticker; the ones a stranger could read unkindly stay private */
export const THEME_STICKER: Record<JournalTheme, { id: string; private: boolean }> = {
  memory: { id: "memory_keeper", private: false },
  family: { id: "family_person", private: false },
  friendship: { id: "friend_first", private: false },
  missing_someone: { id: "misser", private: false },
  tired: { id: "tired_one", private: true },
  work: { id: "work_brain", private: false },
  sleep: { id: "sleep_chaser", private: false },
  loneliness: { id: "lone_wolf", private: true },
  small_win: { id: "small_win_counter", private: false },
  uncertainty: { id: "not_sure_person", private: false },
  future: { id: "future_planner", private: false },
  home: { id: "home_thinker", private: false },
  love: { id: "lover", private: false },
  something_unsaid: { id: "unsaid_holder", private: true },
};

/* mood tone → sticker, all sealed → all private */
const TONE_STICKER: Record<MoodTone, string> = {
  soft: "softie",
  up: "sunny_logger",
  spark: "sparkler",
  edge: "edge_walker",
  low: "low_tide_logger",
  flat: "neutral_logger",
};

export const USAGE_STICKER_IDS: string[] = [
  "night_writer", "early_bird", "weekender", "same_hour_person", "regular", "streaker", "marathoner", "comeback_kid",
  "keeper", "ghost", "name_trader", "slow_burn", "two_timer", "loyalist", "reactor", "picky", "generous", "translator", "bilingual",
  ...Object.values(STAMP_STICKER),
  ...Object.values(THEME_STICKER).map((x) => x.id),
  "sealer", "photo_journaler", "voice_journaler", "drifter", ...Object.values(TONE_STICKER),
  "dresser", "namer", "homebody",
];

const GROUP_OF: Record<string, UsageGroup> = {};
for (const id of ["night_writer", "early_bird", "weekender", "same_hour_person", "regular", "streaker", "marathoner", "comeback_kid"]) GROUP_OF[id] = "time";
for (const id of ["keeper", "ghost", "name_trader", "slow_burn", "two_timer", "loyalist", "reactor", "picky", "generous", "translator", "bilingual"]) GROUP_OF[id] = "habit";
for (const id of [...Object.values(STAMP_STICKER), ...Object.values(THEME_STICKER).map((x) => x.id)]) GROUP_OF[id] = "subject";
for (const id of ["sealer", "photo_journaler", "voice_journaler", "drifter", ...Object.values(TONE_STICKER)]) GROUP_OF[id] = "sealed";
for (const id of ["dresser", "namer", "homebody"]) GROUP_OF[id] = "courier";
export const usageGroupOf = (id: string): UsageGroup | null => GROUP_OF[id] ?? null;

export function usageStickers(f: UsageFacts): UsageSticker[] {
  const out: UsageSticker[] = [];
  const add = (id: string, group: UsageGroup, n: number, opts?: { of?: number; private?: boolean }) =>
    out.push({ id, group, n, of: opts?.of, private: !!opts?.private });
  const now = Date.parse(f.now);

  /* ── time: the hour and the day on everything you sent ── */
  const dated = [...f.letters, ...f.replies].map((p) => (p.at ? Date.parse(p.at) : NaN)).filter((t) => !Number.isNaN(t)).sort((a, b) => a - b);
  if (dated.length >= 5) {
    const hours = dated.map((t) => new Date(t).getHours());
    const share = (ok: (h: number) => boolean) => hours.filter(ok).length / hours.length;
    const night = share((h) => h >= 22 || h < 5);
    const early = share((h) => h >= 5 && h < 9);
    if (night >= 0.5) add("night_writer", "time", Math.round(night * hours.length), { of: hours.length });
    else if (early >= 0.5) add("early_bird", "time", Math.round(early * hours.length), { of: hours.length });
    const weekend = dated.filter((t) => [0, 6].includes(new Date(t).getDay())).length;
    if (weekend / dated.length >= 0.6) add("weekender", "time", weekend, { of: dated.length });
    // a favourite two-hour band, when neither night nor morning already says it
    if (dated.length >= 6 && night < 0.5 && early < 0.5) {
      const bands = new Array(12).fill(0);
      for (const h of hours) bands[Math.floor(h / 2)]++;
      const top = Math.max(...bands);
      if (top / hours.length >= 0.6) add("same_hour_person", "time", top, { of: hours.length });
    }
  }
  const days = [...new Set(dated.map((t) => Math.floor(t / DAY)))].sort((a, b) => a - b);
  const recentDays = days.filter((d) => now - d * DAY <= 14 * DAY).length;
  if (recentDays >= 5) add("regular", "time", recentDays, { of: 14 });
  let run = 1;
  let best = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] - days[i - 1] === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  if (best >= 3) add("streaker", "time", best);
  const perDay = new Map<number, number>();
  for (const t of dated) perDay.set(Math.floor(t / DAY), (perDay.get(Math.floor(t / DAY)) ?? 0) + 1);
  const most = Math.max(0, ...perDay.values());
  if (most >= 3) add("marathoner", "time", most);
  let gap = 0;
  for (let i = 1; i < days.length; i++) gap = Math.max(gap, days[i] - days[i - 1]);
  if (gap >= 14) add("comeback_kid", "time", gap);

  /* ── habit: threads, keeping, the Today counters ── */
  const th = f.threads;
  if (f.keptN >= 5) add("keeper", "habit", f.keptN);
  const ghosted = th.filter((t) => t.theirs > 0 && !t.lastSenderMe && !t.gone && now - t.lastAt >= 7 * DAY).length;
  if (ghosted >= 2) add("ghost", "habit", ghosted, { private: true });
  const named = th.filter((t) => t.revealed).length;
  if (named >= 1) add("name_trader", "habit", named);
  const deep = th.filter((t) => t.mine >= 5 && t.theirs >= 5).length;
  if (deep >= 1) add("slow_burn", "habit", deep);
  const live = th.filter((t) => t.mine > 0 && t.theirs > 0 && !t.gone).length;
  if (live >= 2) add("two_timer", "habit", live);
  if (th.length === 1 && th[0].mine >= 5) add("loyalist", "habit", th[0].mine);
  // "reactor" (three "a reply is on its way" promises) is no longer earned: the promise went 2026-10-10
  const c = f.counters;
  if (c.seen >= 20 && c.replied / c.seen <= 0.1) add("picky", "habit", c.replied, { of: c.seen, private: true });
  if (c.replied >= 5 && c.seen >= 10 && c.replied / c.seen >= 0.3) add("generous", "habit", c.replied, { of: c.seen });
  if (c.translated >= 5) add("translator", "habit", c.translated);
  const langs = new Map<string, number>();
  for (const l of f.letters) {
    if (l.text.split(/\s+/).length < 20) continue;
    const lang = detectLanguage(l.text);
    if (lang) langs.set(lang, (langs.get(lang) ?? 0) + 1);
  }
  const spoken = [...langs.values()].filter((n) => n >= 2).length;
  if (spoken >= 2) add("bilingual", "habit", spoken);

  /* ── subject: the stamps you reach for, the themes that keep coming back ── */
  const cats = new Map<string, number>();
  for (const l of f.letters) {
    const cat = l.stamp ? STAMP_CAT.get(l.stamp) : null;
    if (cat) cats.set(cat, (cats.get(cat) ?? 0) + 1);
  }
  for (const [cat, n] of cats) if (n >= 3 && STAMP_STICKER[cat]) add(STAMP_STICKER[cat], "subject", n, { of: f.letters.length });
  const themed = new Map<JournalTheme, number>();
  const texts = [...f.letters.map((l) => l.text), ...f.replies.map((r) => r.text), ...f.journal.map((e) => e.body)].filter(longEnough);
  for (const t of texts) for (const theme of pieceThemes(t)) themed.set(theme, (themed.get(theme) ?? 0) + 1);
  for (const [theme, n] of themed) {
    if (n >= 3 && n / texts.length >= 0.2) add(THEME_STICKER[theme].id, "subject", n, { of: texts.length, private: THEME_STICKER[theme].private });
  }

  /* ── sealed: the pages — every one of these stays on the phone ── */
  const j = f.journal;
  if (j.length >= 7) add("sealer", "sealed", j.length, { private: true });
  const photos = j.filter((e) => e.type === "photo").length;
  if (photos >= 3) add("photo_journaler", "sealed", photos, { private: true });
  const voiced = j.filter((e) => e.type === "voice" || e.type === "video").length;
  if (voiced >= 3) add("voice_journaler", "sealed", voiced, { private: true });
  const drifted = j.filter((e) => !!e.driftedLine).length;
  if (drifted >= 3) add("drifter", "sealed", drifted, { private: true });
  if (j.length >= 5) {
    const tones = new Map<MoodTone, number>();
    for (const e of j) {
      const tone = getMood(e.mood).tone;
      tones.set(tone, (tones.get(tone) ?? 0) + 1);
    }
    const [tone, n] = [...tones.entries()].sort((a, b) => b[1] - a[1])[0];
    if (n / j.length >= 0.5) add(TONE_STICKER[tone], "sealed", n, { of: j.length, private: true });
  }

  /* ── courier: the bird ── */
  if (f.dressed) add("dresser", "courier", 1);
  if (f.named) add("namer", "courier", 1);
  if (c.courierVisits >= 10) add("homebody", "courier", c.courierVisits);

  return out;
}

/** the ones that may leave the phone */
export const publicUsage = (list: UsageSticker[]): UsageSticker[] => list.filter((s) => !s.private);
