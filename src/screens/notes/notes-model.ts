import type { JournalEntry, JournalType } from "../../lib/journal";
import { MOOD_GROUPS, getMood, isNamedMood, moodGroup, type MoodGroup, type MoodId } from "../../data/moods";
import { hashStr } from "../../lib/mosaic";

/* THE NOTES TAB, AS DATA (10a step 5). Pure: no React, no React Native,
   no i18n — every word and date comes in through `fmt`, so
   `node src/screens/notes/notes-model.test.ts` locks the rules. Both
   renderers draw what these builders return: the SwiftUI screen
   (NotesNative → KNotesView) and the React Native fallback (NotesRN), so a
   remote flip between them never changes a label, a calendar cell or the
   evening question.

   THE PAGES. Newest first, one per id (old data can repeat an id, and a
   repeated id breaks a SwiftUI ForEach). Each page becomes a NoteVM with
   every word it shows already built:
   - its group's colour (lib moods: the four 10a groups over the thirty
     faces; an unknown or missing mood is Calm) and, after the date, the
     face's own name — in Card ("OCT 14 · 21:37 · Sleepy") and List
     ("OCT 14 · Sleepy"), not in Grid ("OCT 14": owner question 9), always
     for VoiceOver, and never when no mood was ever stored;
   - its one line for List: the first line of its words, or what it holds
     ("Voice note · 0:35", "3 pictures", "a video");
   - its media: the cover of a photo page (and +N for the rest), the file of
     a video (a poster is made from it) or a voice page (played by the one
     player), each only on the page type that has it — on a voice or video
     page mediaUri is the recording, never a picture.

   THE CALENDAR. One month at a time (buildMonth), paged between the
   earliest month with a page — at most 120 months back, so a bogus old
   date can't make a decade of empty months — and this month; never into
   the future. A day shows the group of its newest page, and tapping it
   goes to that page (the day's first card in a newest-first list). The
   first weekday follows the language (format FIRST_WEEKDAY, owner
   question 11), and so do the weekday letters and the month's title.

   THE EVENING QUESTION. decideEvening keeps the old card's exact order
   (EveningAsk.tsx before step 5), with the one owner-rule change the
   critic found: its off row must be reachable with no pages at all,
   because Settings has only two switches. */

export type NotesView = "card" | "grid" | "list";
export const NOTES_VIEWS: readonly NotesView[] = ["card", "grid", "list"];

/** The view button's tap: Card → Grid → List → Card. */
export const nextView = (v: NotesView): NotesView => NOTES_VIEWS[(NOTES_VIEWS.indexOf(v) + 1) % NOTES_VIEWS.length];

/** The stored view (scoped kindredly_notes_view) as a view: the old "compact" is List, "card" or
    nothing (or anything unknown) is Card. */
export function parseStoredView(raw: string | null | undefined): NotesView {
  if (raw === "grid") return "grid";
  if (raw === "list" || raw === "compact") return "list";
  return "card";
}

/** A local-time YYYY-MM-DD key (the calendar's day). */
export function dayKey(d: string | number | Date): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

/** Everything the builders say, handed in by the caller (useNotesModel: i18n's t, lib/format's
    dates in the reader's locale, moods' moodName). */
export type NotesFormat = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** a face's name in the reader's language (moods moodName) */
  moodName: (id: MoodId) => string;
  /** a day as a card label: "OCT 14", "14 OCT", "10月14日" (format noteDay) */
  day: (iso: string) => string;
  /** a clock time, 24h: "21:37" (format time24) */
  time: (iso: string) => string;
  /** a long date for VoiceOver: "Wednesday, October 14" (with the year when it isn't this year) */
  longDate: (iso: string) => string;
  /** seconds as m:ss (format fmt) */
  duration: (s: number) => string;
  /** a month's title in the locale's order, not upper-cased: "October 2026", "2026年10月" (format monthTitle) */
  monthTitle: (d: Date) => string;
  /** upper case in the reader's locale */
  upper: (s: string) => string;
};

/** One page as either renderer draws it. */
export type NoteVM = {
  id: string;
  kind: JournalType;
  /** the 10a colour */
  group: MoodGroup;
  /** the stored face (resolved: a legacy id is its new face), for the art face on the fallback and the detail page */
  mood: MoodId;
  /** Card: "OCT 14 · 21:37 · Sleepy" (no name when no mood was ever stored) */
  label: string;
  /** Grid and the floating date chip: "OCT 14" */
  shortLabel: string;
  /** List: "OCT 14 · Sleepy" */
  listLabel: string;
  body: string;
  /** List's one line: the first line of the words, or what the page holds */
  listLine: string;
  /** listLine is the page's own words, not a summary of its media (both renderers draw either in
      ink, as the mock does; kept so a caller can tell them apart) */
  listLineIsWords: boolean;
  /** a photo page's cover; null on every other kind */
  photo: string | null;
  /** how many more photos than the cover (+N) */
  photoMore: number;
  /** a video page's file (Swift makes the poster from it) */
  video: string | null;
  /** a voice page's file (the one player plays it) */
  voice: string | null;
  durationS: number;
  /** "0:35" ("" when there is no length) */
  duration: string;
  /** seeds the waveform's bar heights (waveHeight) */
  waveSeed: number;
  /** VoiceOver: the long date, the time, the face's name, what it is, the start of the words */
  a11y: string;
  dayKey: string;
  /** a dev sample page */
  sample: boolean;
};

/** How many characters of the words VoiceOver reads on a card before the page is opened. */
export const A11Y_WORDS = 120;

/** Newest first, one page per id (the first one met wins: the newest copy, since the stored
    journal is newest first and a re-seal replaces its page in place). Never mutates. */
export function orderPages(entries: readonly JournalEntry[]): JournalEntry[] {
  const seen = new Set<string>();
  const out: JournalEntry[] = [];
  for (const e of entries) {
    if (!e || typeof e.id !== "string" || seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
  }
  const at = (e: JournalEntry) => {
    const n = Date.parse(e.date);
    return Number.isNaN(n) ? 0 : n;
  };
  return out.sort((a, b) => at(b) - at(a));
}

/** a photo page's pictures: its album, or the single cover of a page saved before albums */
export function photosOf(e: JournalEntry): string[] {
  if (e.type !== "photo") return [];
  if (e.media?.length) return e.media;
  return e.mediaUri ? [e.mediaUri] : [];
}

/** The first line of a page's words, trimmed. */
export const firstLine = (body: string | null | undefined): string => (body || "").split("\n")[0].trim();

/** One page's words for List, and whether they are words or a summary of its media. */
export function listLineOf(e: JournalEntry, fmt: NotesFormat): { line: string; words: boolean } {
  const words = firstLine(e.body);
  if (words) return { line: words, words: true };
  if (e.type === "photo") {
    const n = photosOf(e).length;
    return { line: n > 1 ? fmt.t("jt.pictures", { n }) : fmt.t("jt.picture"), words: false };
  }
  if (e.type === "voice") return { line: `${fmt.t("jp.say")} · ${fmt.duration(e.dur || 0)}`, words: false };
  if (e.type === "video") return { line: fmt.t("jt.aVideo"), words: false };
  return { line: "", words: false };
}

/** What a page is, in words, for VoiceOver. */
function kindWords(e: JournalEntry, fmt: NotesFormat): string {
  switch (e.type) {
    case "photo": {
      const n = photosOf(e).length;
      return n > 1 ? fmt.t("jt.pictures", { n }) : fmt.t("jt.picture");
    }
    case "voice":
      return e.dur ? `${fmt.t("jp.say")}, ${fmt.duration(e.dur)}` : fmt.t("jp.say");
    case "video":
      return fmt.t("jt.aVideo");
    default:
      return fmt.t("jp.write");
  }
}

/** The start of a page's words for VoiceOver: at most A11Y_WORDS characters, cut at a space when one
    is near, with an ellipsis when cut. */
export function a11yWords(body: string | null | undefined): string {
  const s = (body || "").replace(/\s+/g, " ").trim();
  if (s.length <= A11Y_WORDS) return s;
  const cut = s.slice(0, A11Y_WORDS);
  const space = cut.lastIndexOf(" ");
  return (space > A11Y_WORDS * 0.6 ? cut.slice(0, space) : cut) + "…";
}

/** One page as a NoteVM. */
export function buildNote(e: JournalEntry, fmt: NotesFormat): NoteVM {
  const face = getMood(e.mood);
  const named = isNamedMood(e.mood);
  const name = named ? fmt.moodName(face.id) : "";
  const day = fmt.day(e.date);
  const time = fmt.time(e.date);
  const withName = (s: string) => (name ? `${s} · ${name}` : s);
  const photos = photosOf(e);
  const { line, words } = listLineOf(e, fmt);
  const dur = e.type === "voice" || e.type === "video" ? Math.max(0, e.dur || 0) : 0;
  const parts = [fmt.longDate(e.date), time, name, kindWords(e, fmt), a11yWords(e.body)].filter((p) => p.length > 0);
  return {
    id: e.id,
    kind: e.type,
    group: moodGroup(e.mood),
    mood: face.id,
    label: withName(`${day} · ${time}`),
    shortLabel: day,
    listLabel: withName(day),
    body: e.body || "",
    listLine: line,
    listLineIsWords: words,
    photo: photos[0] ?? null,
    photoMore: Math.max(0, photos.length - 1),
    video: e.type === "video" && e.mediaUri ? e.mediaUri : null,
    voice: e.type === "voice" && e.mediaUri ? e.mediaUri : null,
    durationS: dur,
    duration: dur > 0 ? fmt.duration(dur) : "",
    waveSeed: hashStr("wave:" + e.id),
    a11y: parts.join(", "),
    dayKey: dayKey(e.date),
    sample: e.id.startsWith("demo-"),
  };
}

/** Every page, newest first and one per id, as NoteVMs. */
export function buildNotes(entries: readonly JournalEntry[], fmt: NotesFormat): NoteVM[] {
  return orderPages(entries).map((e) => buildNote(e, fmt));
}

/* ── the waveform ──────────────────────────────────────────────────────── */

/** The height (6…34) of bar `i` of a voice note's waveform, from its seed. Swift's KVoiceWave
    computes the same numbers (KNoteCard.swift, waveHeight), so the two renderers draw the same
    bars; the test pins a few. */
export function waveHeight(seed: number, i: number): number {
  let x = (seed + Math.imul(i + 1, 0x9e3779b1)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return 6 + (x % 29);
}

/* ── the calendar ──────────────────────────────────────────────────────── */

export type YearMonth = { y: number; m: number };

/** the furthest back the calendar goes from this month, whatever an old date says */
export const MAX_MONTHS_BACK = 119;

const monthIndex = (ym: YearMonth) => ym.y * 12 + ym.m;
const fromIndex = (i: number): YearMonth => ({ y: Math.floor(i / 12), m: ((i % 12) + 12) % 12 });
export const ymOf = (d: Date): YearMonth => ({ y: d.getFullYear(), m: d.getMonth() });
export const ymKey = (ym: YearMonth): string => `${ym.y}-${String(ym.m + 1).padStart(2, "0")}`;

/** The months the calendar pages between: from the earliest month with a page (no further back
    than MAX_MONTHS_BACK) to this month. A journal with no pages, or only future-dated ones, has
    only this month. */
export function monthBounds(entries: readonly JournalEntry[], now: Date): { min: YearMonth; max: YearMonth } {
  const max = ymOf(now);
  const floor = monthIndex(max) - MAX_MONTHS_BACK;
  let earliest = monthIndex(max);
  for (const e of entries) {
    const t = Date.parse(e.date);
    if (Number.isNaN(t)) continue;
    const i = monthIndex(ymOf(new Date(t)));
    if (i < earliest) earliest = i;
  }
  return { min: fromIndex(Math.max(floor, earliest)), max };
}

/** `ym` moved by `delta` months, kept inside the bounds. */
export function stepMonth(ym: YearMonth, delta: number, bounds: { min: YearMonth; max: YearMonth }): YearMonth {
  const i = Math.min(monthIndex(bounds.max), Math.max(monthIndex(bounds.min), monthIndex(ym) + Math.trunc(delta)));
  return fromIndex(i);
}

/** `ym` kept inside the bounds (a journal that lost its old pages). */
export const clampMonth = (ym: YearMonth, bounds: { min: YearMonth; max: YearMonth }): YearMonth => stepMonth(ym, 0, bounds);

export type DayVM = {
  /** the day of the month */
  n: number;
  key: string;
  /** the group of the day's newest page; null for a day with none */
  group: MoodGroup | null;
  /** that page's face (the fallback draws its art) */
  mood: MoodId | null;
  /** how many pages that day */
  count: number;
  /** the day's newest page: where a tap goes (Swift scrolls to it) */
  targetId: string | null;
  future: boolean;
  today: boolean;
  /** "Wednesday, October 14, 2 notes"; the date alone for a day with none */
  a11y: string;
};

export type MonthVM = {
  key: string;
  y: number;
  m: number;
  /** "OCTOBER 2026", "2026年10月" */
  title: string;
  /** blank cells before the 1st, from the language's first weekday */
  lead: number;
  days: DayVM[];
  /** pages per group this month, in MOOD_GROUPS order */
  counts: number[];
  total: number;
  /** "9 NOTES" (drawn), "9 notes" (read) */
  footer: string;
  footerA11y: string;
  /** VoiceOver's legend, in MOOD_GROUPS order: "Calm, 3 notes" */
  legendA11y: string[];
  canPrev: boolean;
  canNext: boolean;
};

/** "3 notes", "1 note", "No notes" (sentence case; upper-cased for display) */
export function notesCount(n: number, fmt: NotesFormat): string {
  if (n <= 0) return fmt.t("jt.notesNone");
  if (n === 1) return fmt.t("jt.notes1");
  return fmt.t("jt.notesN", { n });
}

/** One month of the calendar. `entries` in any order; `firstDay` 0 = Sunday, 1 = Monday. */
export function buildMonth(entries: readonly JournalEntry[], ym: YearMonth, now: Date, firstDay: number, fmt: NotesFormat): MonthVM {
  const bounds = monthBounds(entries, now);
  const at = clampMonth(ym, bounds);
  const first = new Date(at.y, at.m, 1, 12);
  const count = new Date(at.y, at.m + 1, 0).getDate();
  const prefix = ymKey(at) + "-";
  const todayKey = dayKey(now);

  // per day: its newest page and how many
  const byDay = new Map<string, { e: JournalEntry; n: number }>();
  for (const e of orderPages(entries)) {
    const k = dayKey(e.date);
    if (!k.startsWith(prefix)) continue;
    const cur = byDay.get(k);
    if (cur) cur.n += 1;
    else byDay.set(k, { e, n: 1 });
  }

  const counts = MOOD_GROUPS.map(() => 0);
  let total = 0;
  const days: DayVM[] = [];
  for (let d = 1; d <= count; d++) {
    const key = prefix + String(d).padStart(2, "0");
    const hit = byDay.get(key);
    const date = new Date(at.y, at.m, d, 12);
    const longDate = fmt.longDate(date.toISOString());
    if (hit) {
      // every page of the day counts toward its own group in the legend
      total += hit.n;
      const future = key > todayKey;
      days.push({
        n: d,
        key,
        group: moodGroup(hit.e.mood),
        mood: getMood(hit.e.mood).id,
        count: hit.n,
        // a future day does nothing, even holding a page dated ahead (a clock that was wrong):
        // it keeps its colour, and the page is in the list
        targetId: future ? null : hit.e.id,
        future,
        today: key === todayKey,
        a11y: fmt.t("jt.dayA11y", { date: longDate, count: notesCount(hit.n, fmt) }),
      });
    } else {
      days.push({ n: d, key, group: null, mood: null, count: 0, targetId: null, future: key > todayKey, today: key === todayKey, a11y: longDate });
    }
  }
  for (const e of orderPages(entries)) {
    if (!dayKey(e.date).startsWith(prefix)) continue;
    counts[MOOD_GROUPS.indexOf(moodGroup(e.mood))] += 1;
  }

  const lead = (((first.getDay() - Math.trunc(firstDay)) % 7) + 7) % 7;
  const read = notesCount(total, fmt);
  return {
    key: ymKey(at),
    y: at.y,
    m: at.m,
    title: fmt.upper(fmt.monthTitle(first)),
    lead,
    days,
    counts,
    total,
    footer: fmt.upper(read),
    footerA11y: read,
    legendA11y: MOOD_GROUPS.map((g, i) => fmt.t("jt.legendA11y", { group: fmt.t(`mood.group.${g}`), count: notesCount(counts[i], fmt) })),
    canPrev: monthIndex(at) > monthIndex(bounds.min),
    canNext: monthIndex(at) < monthIndex(bounds.max),
  };
}

/** The calendar button's six little squares: the group of each of this month's latest six days
    with pages (the day's newest page), oldest to newest. Fewer than six leaves the rest empty. */
export function recentGroups(entries: readonly JournalEntry[], now: Date, max = 6): MoodGroup[] {
  const prefix = ymKey(ymOf(now)) + "-";
  const todayKey = dayKey(now);
  const days: { key: string; group: MoodGroup }[] = [];
  const seen = new Set<string>();
  for (const e of orderPages(entries)) {
    const k = dayKey(e.date);
    if (!k.startsWith(prefix) || k > todayKey || seen.has(k)) continue;
    seen.add(k);
    days.push({ key: k, group: moodGroup(e.mood) });
    if (days.length === max) break;
  }
  return days.reverse().map((d) => d.group);
}

/** How many of this month's pages there are (the fallback's calendar key). */
export function pagesThisMonth(entries: readonly JournalEntry[], now: Date): number {
  const prefix = ymKey(ymOf(now)) + "-";
  return orderPages(entries).filter((e) => dayKey(e.date).startsWith(prefix)).length;
}

/* ── the evening question ──────────────────────────────────────────────── */

export type EveningFacts = {
  /** readPushPrefs answered with only its defaults and an error: whether it is on can't be told */
  prefsUnreadable: boolean;
  /** the evening line (daily_line) is on for this account */
  dailyLine: boolean;
  /** the morning question is on (the evening line and the morning question are one or the other) */
  morningQuestion: boolean;
  /** this phone's master Notifications switch (getNotifyOn) */
  notifyOn: boolean;
  /** the card was answered before (flag ev_ask_answered) */
  answered: boolean;
  /** real pages (dev samples don't count) */
  pages: number;
};

export type EveningShow = "none" | "ask" | "on";
export type EveningDecision = { show: EveningShow; spendFlag: boolean };

/**
 * What the evening card shows, in the old card's exact order:
 * 1. prefs unreadable → nothing, and nothing spent (ask another day);
 * 2. daily_line already on (an earlier yes, another phone) → the flag is spent, and the off row
 *    shows only while this phone's Notifications switch is on. This runs whatever the page count:
 *    the row is its only off switch, and a phone with no pages (a fresh install, every page torn
 *    out, a journal handed to the guest bucket) still gets the evening line;
 * 3. no real page yet → nothing;
 * 4. answered before → nothing (checked after 2, so an earlier yes still shows its row);
 * 5. the morning question is on → the flag is spent, nothing shows (a yes would quietly turn the
 *    morning question off);
 * 6. otherwise → the card asks.
 */
export function decideEvening(f: EveningFacts): EveningDecision {
  if (f.prefsUnreadable) return { show: "none", spendFlag: false };
  if (f.dailyLine) return { show: f.notifyOn ? "on" : "none", spendFlag: true };
  if (f.pages < 1) return { show: "none", spendFlag: false };
  if (f.answered) return { show: "none", spendFlag: false };
  if (f.morningQuestion) return { show: "none", spendFlag: true };
  return { show: "ask", spendFlag: false };
}
