import type { JournalEntry, JournalType } from "../../lib/journal";
import { MOOD_GROUPS, moodArtKey, moodGroup, resolveMood, type MoodGroup, type MoodId } from "../../data/moods";
import { hashStr } from "../../lib/mosaic";
import { weightedCount } from "../../lib/weighted-count";

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
     faces; a page that chose only a group is in that group; an unknown or
     missing mood is Calm), its icon's art key (moods moodArtKey: the face,
     or the group's own icon for a group alone and for no readable mood)
     and the mood's name (moods moodLabel: the face's own, or the group's
     for a group alone) — after the date in List ("OCT 14 · Sleepy"), never
     in Card ("OCT 14 · 21:37": the mood square says it, the owner's card
     layouts of 2026-10-18) or Grid ("OCT 14": owner question 9), always for
     VoiceOver, and never when no mood was ever stored;
   - its one line for List: the first line of its words, or what it holds
     ("Voice note · 0:35", "3 pictures", "a video");
   - its media: a photo page's pictures in the order they were taken (the
     first is always the big tile — owner, 2026-10-18; the cover the detail
     page's "make it the cover" picks stays the detail page's), the file of a
     video (a poster is made from it) or a voice page (played by the one
     player), each only on the page type that has it — on a voice or video
     page mediaUri is the recording, never a picture.

   THE CARD (the owner's Notes card layouts, 2026-10-18). Every card is the
   same paper and the same head row — the mood square, "OCT 16 · 08:12",
   and the kind's icon alone (the owner took the words off it: no "TEXT",
   "3 PHOTOS"; the icon says it) — and only the body changes with what the
   page holds, top to bottom: the words, then the voice bar, then the
   pictures. The words come in three sizes by length (textTier, counted the
   composer's way, CJK as two — the owner's "Chinese ÷ 2"): up to 40 a line
   at 24, 41–140 at 17, longer at 15 cut to six lines, all in the system
   face (serif is for someone else's letter; owner, 2026-10-18). A voice
   page's own words sit above its bar where the mock puts a transcript (the
   app has no transcription). The pictures never make a 3×3: one fills the
   width, two sit side by side, three are one big and two small, four a
   2×2, five or more one big and three small with the rest as +N on the last
   (photoTiles; photoMore). The voice bar draws NOTE_BARS bars from the
   page's seed (noteBar).

   THE CALENDAR. One month at a time (buildMonth), paged between the
   earliest month with a page — at most 120 months back, so a bogus old
   date can't make a decade of empty months — and this month; never into
   the future. A day shows the group of its newest page, and tapping it
   goes to that page (the day's first card in a newest-first list); the
   legend counts every page in its group, a group-only page included. The
   first weekday follows the language (format FIRST_WEEKDAY, owner
   question 11), and so do the weekday letters and the month's title.

   SEARCH (owner's audit, 2026-11-10: there was no way to find an old page).
   searchPages keeps the pages whose words hold what was typed, as a plain
   substring — no word-splitting, so Chinese, Japanese and Korean (which
   write no spaces) are found the same way as English — after both sides
   are folded (foldForSearch): lower case, Latin accents dropped ("cafe"
   finds "café"; the Japanese voiced marks and Korean syllables are left
   as written), full-width forms as their plain ones, any run of spaces or
   line breaks as one space. A page is also found by its mood's name in the
   reader's language — the face's ("Sleepy") and its group's ("Tired") —
   but only a mood the page really stored: a page with none is never found
   by "Calm", the colour it is merely drawn in. Nothing typed keeps every
   page. It never reorders: the hits are the same pages in the same order.

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

/** Where Dynamic Type's accessibility sizes begin, as React Native's fontScale reports them on iOS
    (xxxLarge is 1.353, the first accessibility size 1.786): the line SwiftUI's
    typeSize.isAccessibilitySize draws. Not 1.35, which would take xxxLarge in as well. */
export const AX_FONT_SCALE = 1.5;

/** The reader's text is at an accessibility size (fontScale from useWindowDimensions). */
export const isAxFontScale = (fontScale: number): boolean => fontScale >= AX_FONT_SCALE;

/** How many notes lie side by side: two in Grid, one in Card and List — and one in Grid too at
    accessibility text sizes, where two ~165pt cards can't hold their words (KNotesScreen.columns,
    the same rule in Swift). */
export function noteColumns(view: NotesView, fontScale: number): 1 | 2 {
  return view === "grid" && !isAxFontScale(fontScale) ? 2 : 1;
}

/** The list's rows, `columns` notes to a row, each row keyed by its first note (the key Swift's
    rows take too). */
export function noteRows<T extends { id: string }>(notes: readonly T[], columns: 1 | 2): { key: string; notes: T[] }[] {
  const out: { key: string; notes: T[] }[] = [];
  for (let i = 0; i < notes.length; i += columns) out.push({ key: notes[i].id, notes: notes.slice(i, i + columns) });
  return out;
}

/** A local-time YYYY-MM-DD key (the calendar's day). */
export function dayKey(d: string | number | Date): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

/** Everything the builders say, handed in by the caller (useNotesModel: i18n's t, lib/format's
    dates in the reader's locale, moods' moodLabel). */
export type NotesFormat = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** a stored mood's name in the reader's language: the face's, the group's for a group alone, ""
      for none or an unknown one (moods moodLabel) */
  moodLabel: (mood: string | null | undefined) => string;
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
  /** the stored mood, resolved (moods resolveMood): its face (a legacy id is its new face), its group
      id for a group alone, group-calm when no readable mood was stored */
  mood: MoodId;
  /** the icon's art key (moods moodArtKey): "mood-sleepy", "mood-group-low"; Swift draws it */
  icon: string;
  /** Card's head row: "OCT 14 · 21:37" (the mood square says the mood; its name is List's and
      VoiceOver's) */
  label: string;
  /** the words' size: none (no words), short (≤ 40, a line), mid (41–140), long (> 140, six lines) */
  textTier: TextTier;
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
  /** a photo page's cover, the detail page's choice; null on every other kind (the cards draw
      `photos`, first first) */
  photo: string | null;
  /** a photo page's pictures as the card shows them: the first four in the order taken (the first
      is the big tile); [] on every other kind */
  photos: string[];
  /** how many pictures the page holds */
  photoCount: number;
  /** the +N on the last tile: the pictures past the four shown (5 → +1, 9 → +5); 0 under five */
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
  /** VoiceOver: the long date, the time, the mood's name, what it is, the start of the words */
  a11y: string;
  dayKey: string;
  /** a dev sample page */
  sample: boolean;
};

/** The words' size on a card (see THE CARD). */
export type TextTier = "none" | "short" | "mid" | "long";

/** the most a page's words weigh and still read as one large line */
export const SHORT_MAX = 40;
/** the most they weigh and still show whole at 17 */
export const MID_MAX = 140;

/** A page's words' size, weighed the composer's way (weightedCount: CJK and emoji 2, a link 23). */
export function textTierOf(body: string | null | undefined): TextTier {
  const s = (body || "").trim();
  if (!s) return "none";
  const w = weightedCount(s);
  return w <= SHORT_MAX ? "short" : w <= MID_MAX ? "mid" : "long";
}

/** the pictures a card shows at most; the rest ride as +N on the last */
export const PHOTO_TILES = 4;

/** The card's picture block for n pictures, as both renderers lay it out (the owner's five
    tiers): 1 one tile 220 tall; 2 side by side 160; 3 a big tile over two rows on the left (2fr)
    and two small (1fr) 220; 4 a 2×2 220; 5+ the big tile over three rows and three small, 240,
    the last small one under +N. Grid (two to a row) scales every height by 0.6 and draws 5+ as the
    2×2 with +N on its last tile. null for no pictures. */
export function photoTiles(n: number, grid = false): { tier: 1 | 2 | 3 | 4 | 5; height: number } | null {
  if (n <= 0) return null;
  const tier = (n >= 5 ? (grid ? 4 : 5) : n) as 1 | 2 | 3 | 4 | 5;
  const base = tier === 2 ? 160 : tier === 5 ? 240 : 220;
  return { tier, height: grid ? Math.round(base * 0.6) : base };
}

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

/** A photo page's cover: the picture its coverIndex names (the detail page's "make it the cover"),
    or the first when the index is missing or out of range; null on every other kind. The same file
    lib/journal's loadJournal resolves into mediaUri. */
export function coverOf(e: JournalEntry): string | null {
  const photos = photosOf(e);
  return photos[e.coverIndex ?? 0] ?? photos[0] ?? null;
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
  const name = fmt.moodLabel(e.mood);
  const day = fmt.day(e.date);
  const time = fmt.time(e.date);
  const withName = (s: string) => (name ? `${s} · ${name}` : s);
  const photos = photosOf(e);
  const tier = textTierOf(e.body);
  const { line, words } = listLineOf(e, fmt);
  const dur = e.type === "voice" || e.type === "video" ? Math.max(0, e.dur || 0) : 0;
  const parts = [fmt.longDate(e.date), time, name, kindWords(e, fmt), a11yWords(e.body)].filter((p) => p.length > 0);
  return {
    id: e.id,
    kind: e.type,
    group: moodGroup(e.mood),
    mood: resolveMood(e.mood),
    icon: moodArtKey(e.mood),
    label: `${day} · ${time}`,
    textTier: tier,
    shortLabel: day,
    listLabel: withName(day),
    body: e.body || "",
    listLine: line,
    listLineIsWords: words,
    photo: coverOf(e),
    photos: photos.slice(0, PHOTO_TILES),
    photoCount: photos.length,
    photoMore: Math.max(0, photos.length - PHOTO_TILES),
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

/* ── search ────────────────────────────────────────────────────────────── */

/** Text as search compares it: lower case, Latin accents dropped (only the combining marks of
    U+0300–036F: the Japanese voiced marks stay, so か never finds が), compatibility forms folded
    (full-width ＡＢＣ as abc), runs of white space as one space, trimmed. */
export function foldForSearch(s: string | null | undefined): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The pages that hold `query`: in their words, or as the name of the mood they stored (the face's
    and its group's, in the reader's language). A plain folded substring; an empty query keeps every
    page (the same array). Order kept; never mutates. */
export function searchPages<T extends Pick<JournalEntry, "body" | "mood">>(entries: readonly T[], query: string, fmt: Pick<NotesFormat, "t" | "moodLabel">): readonly T[] {
  const q = foldForSearch(query);
  if (!q) return entries;
  return entries.filter((e) => {
    if (foldForSearch(e.body).includes(q)) return true;
    // the mood's name counts only for a mood the page stored (moodLabel is "" for none)
    const name = fmt.moodLabel(e.mood);
    if (!name) return false;
    return foldForSearch(name).includes(q) || foldForSearch(fmt.t(`mood.group.${moodGroup(e.mood)}`)).includes(q);
  });
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

/** how many bars a card's voice bar draws (the owner's 44) */
export const NOTE_BARS = 44;

/** The height (4…13) of bar `i` of a card's voice bar: waveHeight's numbers folded into the
    owner's 4–13 (KNoteCard.swift computes the same; the test pins a few). Seeded, not sampled: the
    app keeps no amplitudes for a recording. */
export function noteBar(seed: number, i: number): number {
  return 4 + ((waveHeight(seed, i) - 6) % 10);
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
  /** that page's mood, resolved (moods resolveMood: a face, or a group id for a group alone) — the
      fallback draws a face's art, or the group's tile */
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
  /** pages per group this month, in MOOD_GROUPS order (a group-only page in its group) */
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
        mood: resolveMood(hit.e.mood),
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

/** The calendar button's little squares: the group of each of this month's latest three days with
    pages (the day's newest page), oldest to newest; fewer leave the rest empty. Three in one row,
    as the owner's card layouts draw the key (2026-10-18): six in two rows spilled out of the
    drawing at 20pt. */
export const RECENT_SQUARES = 3;
export function recentGroups(entries: readonly JournalEntry[], now: Date, max = RECENT_SQUARES): MoodGroup[] {
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
 * 2. daily_line already on (an earlier yes, another phone) → the flag is spent and NOTHING shows
 *    (owner, 2026-11-10: "I tapped OK and it's still there": the off row used to stay at the top
 *    of Notes for as long as the line was on, because it was its only off switch). The row now
 *    shows once, in the visit where the reader said yes (useEveningAsk sets "on" itself and drops
 *    it when Notes loses focus), and the off switch is a row in Settings shown while the line is
 *    on (settings-model's "evening" row). `notifyOn` is no longer read here;
 * 3. no real page yet → nothing;
 * 4. answered before → nothing;
 * 5. the morning question is on → the flag is spent, nothing shows (a yes would quietly turn the
 *    morning question off);
 * 6. otherwise → the card asks.
 */
export function decideEvening(f: EveningFacts): EveningDecision {
  if (f.prefsUnreadable) return { show: "none", spendFlag: false };
  if (f.dailyLine) return { show: "none", spendFlag: true };
  if (f.pages < 1) return { show: "none", spendFlag: false };
  if (f.answered) return { show: "none", spendFlag: false };
  if (f.morningQuestion) return { show: "none", spendFlag: true };
  return { show: "ask", spendFlag: false };
}
