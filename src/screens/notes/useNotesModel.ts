import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { getLang, t, useLang } from "../../lib/i18n";
import { fmt as fmtDuration, firstWeekday, localeTag, monthTitle, noteDay, time24, weekdayLetters } from "../../lib/format";
import { MOOD_GROUP_IDS, MOOD_GROUPS, moodLabel, type MoodGroup } from "../../data/moods";
import { demoJournal } from "../../data/demo";
import { DEMO_TEXT, storeMode } from "../../lib/dev-store";
import { hiddenDemoIds, loadJournal, onJournalChange, type JournalEntry } from "../../lib/journal";
import { onStorageUserChange } from "../../lib/scoped-store";
import { leaveMood, leaveSpark } from "../../lib/journal-handoff";
import { scoped } from "../../lib/scoped-store";
import { speakAs, useWrenName } from "../../lib/wren-name";
import { dismissWrenOnce, useWrenOnce } from "../../components/WrenSaysOnce";
import { useVoicePlayback, type VoicePlayback } from "../../lib/voice-playback";
import { useEveningAsk } from "./useEveningAsk";
import {
  buildMonth,
  buildNotes,
  clampMonth,
  dayKey,
  monthBounds,
  nextView,
  pagesThisMonth,
  parseStoredView,
  recentGroups,
  searchPages,
  stepMonth,
  ymOf,
  type EveningShow,
  type MonthVM,
  type NoteVM,
  type NotesFormat,
  type NotesView,
  type YearMonth,
} from "./notes-model";
import "../../data/strings-step5-notes";
import "../../data/strings-notes-empty";
import "../../data/strings-audit-notes"; // jt.search.*

/* THE NOTES TAB'S MODEL (10a step 5), shared by both renderers: the SwiftUI
   screen (NotesNative) and the React Native fallback (NotesRN) draw exactly
   what this hands them, so a remote flip changes the drawing, never the
   behaviour. It never writes the journal (lib/journal is untouched: the
   detail page, the composer and the roll do the writing).

   It holds:
   - the pages, read on every focus (loadJournal never throws: an
     unreadable journal shows as none and stays stored), plus in a dev build
     the sample pages (data/demo demoJournal) minus the ones torn out, and in
     store mode only the samples, their words in the language on screen;
     newest first, one per id, built into NoteVMs by notes-model with every
     label in the reader's language;
   - the view (card / grid / list), remembered per account on this phone
     (scoped kindredly_notes_view; the old "compact" is List), and
     `viewReady` once that read has landed, so the first view drawn is the
     remembered one and nothing crossfades on launch;
   - the calendar: open or not, the month on show (opens on this month,
     pages between the earliest month with a page and this one), its
     MonthVM, and the button's three squares. A blur leaves both as they were,
     so the fallback's calendar mode comes back from a pushed page (or
     another tab) on the month being browsed; the SwiftUI overlay closes
     itself on blur in NotesNative, since it never waits behind a page;
     "today" is re-read on every focus and when the app comes back, so the
     today ring and the future days never go stale past midnight;
   - her first-visit line: useWrenOnce("sealed") decided only once there are
     pages to show it over (an empty Notes keeps it for the next visit), her
     name swapped in (speakAs);
   - Notes E1 (2026-10-19): the empty page's question, the four mood lines and
     follow-ups, the draft card's time; a tap on the draft card hands the mood
     and its follow-up to the composer (journal-handoff leaveMood/leaveSpark)
     and opens it; and after the first page is saved over an empty Notes seen
     this session, her one-time line "first one down…" in the same slot
     (useWrenOnce("notesFirstBubble"): the flag of that name is spent the moment
     it shows, so it never comes back), the "sealed" line waiting for the next
     launch so two lines never follow each other;
   - the evening question (useEveningAsk, on real pages only);
   - the one voice player (useVoicePlayback): a finished note replays from
     the start, another note replaces it, it pauses when the tab loses
     focus, when the view changes and when the calendar opens (List and the
     calendar leave no play mark on screen to pause it with);
   - search (owner's audit, 2026-11-10): open or not and what was typed. While
     it is open with something typed, `notes` is the pages that match
     (notes-model searchPages: their words, or their mood's name) — the same
     NoteVMs, in the same order — and everything else (the empty state, the
     calendar, her lines, the lookups a tap makes) still reads every page.
     Opening it closes the calendar; closing it forgets the words; a journal
     that empties while it is open closes it. Only the SwiftUI header can
     open it (the React Native fallback has no search key), so for the
     fallback `notes` is always every page;
   - where every tap goes.
   The dev page (app/dev/step5-notes) passes `demo` instead: its own pages
   and evening state, nothing read or written, and every way out reported
   rather than taken. */

/* store mode (dev): the sample pages speak the language on screen */
const STORE_BODY: Record<string, keyof (typeof DEMO_TEXT)["en"]> = { "demo-j-photo": "line", "demo-j-text1": "j2", "demo-j-voice": "j3", "demo-j-text2": "j4", "demo-j-long": "j5", "demo-j-video": "j6" };
const storeBody = (d: JournalEntry): JournalEntry => (STORE_BODY[d.id] ? { ...d, body: DEMO_TEXT[getLang()][STORE_BODY[d.id]] } : d);

const VIEW_KEY = "kindredly_notes_view";
/** Notes E1: her one-time line after the first page (lib/flags, spent by useWrenOnce) */
export const NOTES_FIRST_BUBBLE = "notesFirstBubble";

/** The words Notes shows, everywhere at once (Swift takes them as one record). */
export type NotesStrings = {
  title: string;
  justYou: string;
  /** VoiceOver's name for the view button */
  viewA11y: string;
  /** the fallback's menu title: VIEW */
  viewMenu: string;
  viewCard: string;
  viewGrid: string;
  viewList: string;
  calendarA11y: string;
  prevMonth: string;
  nextMonth: string;
  close: string;
  /** the pull caption: MOMENTS YOU'VE CHOSEN TO KEEP */
  moments: string;
  play: string;
  pause: string;
  emptyTitle: string;
  emptyBody: string;
  newLabel: string;
  textKey: string;
  voiceKey: string;
  eveningAsk: string;
  eveningYes: string;
  eveningNo: string;
  eveningFoot: string;
  eveningOn: string;
  eveningOff: string;
  /** the calendar's seven weekday letters, from the language's first weekday */
  weekdays: string[];
  /** the four groups' names, in MOOD_GROUPS order */
  groupNames: string[];
  /** the old calendar key's count, for the fallback */
  monthCount: string;
  /** Notes E1: the empty page's question */
  neTitle: string;
  /** Notes E1: the title once a mood is tapped, in MOOD_GROUPS order */
  neLines: string[];
  /** Notes E1: the draft card's grey follow-up, in MOOD_GROUPS order */
  neAsks: string[];
  /** Notes E1: the draft card's time, as a Card's head row says it ("OCT 19 · 21:37") */
  neTime: string;
  /** Notes E1: VoiceOver on the draft card */
  neA11yCard: string;
  /** search: VoiceOver's name for the magnifier key */
  searchA11y: string;
  /** search: the field's placeholder */
  searchPlaceholder: string;
  /** search: Cancel, beside the field */
  searchCancel: string;
  /** search: VoiceOver's name for the field's ⊗ */
  searchClear: string;
  /** search: the one line when nothing matches */
  searchNone: string;
};

/** The dev page's stand-ins: its own pages and evening state, nothing read or written. */
export type NotesDemo = {
  entries: readonly JournalEntry[];
  evening: EveningShow;
  setEvening: (s: EveningShow) => void;
  wrenLine: boolean;
  setWrenLine: (on: boolean) => void;
  /** a tap that would leave the page (open a note, the composer, the day page) */
  away: (where: string) => void;
};

export type NotesActions = {
  open: (id: string) => void;
  /** the SwiftUI view button: Card → Grid → List */
  cycleView: () => void;
  /** the fallback's VIEW menu: one view (closes the calendar mode) */
  setView: (v: NotesView) => void;
  setCalendar: (open: boolean) => void;
  /** page the calendar by ±1 month (kept in bounds) */
  calendarMonth: (delta: number) => void;
  /** the fallback's calendar: one page that day opens it, several open the day page */
  openDay: (key: string) => void;
  toggleVoice: (id: string) => void;
  eveningYes: () => void;
  eveningNo: () => void;
  eveningOff: () => void;
  dismissWrenLine: () => void;
  compose: (kind: "text" | "voice") => void;
  /** Notes E1: the draft card under a chosen mood: the composer, that mood chosen, its follow-up
      as the empty page's placeholder */
  writeEmpty: (group: MoodGroup) => void;
  /** the magnifier key (true: the search row, the calendar closed) or Cancel (false: the words forgotten) */
  setSearch: (open: boolean) => void;
  /** what the reader typed in the search field */
  searchQuery: (query: string) => void;
};

export type NotesModel = {
  /** the journal has been read once */
  loaded: boolean;
  /** loaded, and no page to show (or the dev ?empty=1) */
  empty: boolean;
  /** the pages on show: every page, or (search open, something typed) the ones that match */
  notes: NoteVM[];
  /** the search row: open or not, and what was typed */
  search: { open: boolean; query: string };
  view: NotesView;
  /** the remembered view has been read: draw from now on, animate changes from now on */
  viewReady: boolean;
  calendarOpen: boolean;
  month: MonthVM;
  recentGroups: MoodGroup[];
  strings: NotesStrings;
  /** her first-visit line, her name in it; null when it doesn't show */
  wrenLine: string | null;
  /** the line showing is Notes E1's one-time "first one down…" (drawn in the system font) */
  wrenFirst: boolean;
  evening: { state: EveningShow; busy: boolean };
  playback: VoicePlayback | null;
  act: NotesActions;
};

/** Today's NotesFormat: i18n's words and the reader's locale. */
export function notesFormat(): NotesFormat {
  const locale = localeTag();
  const thisYear = new Date().getFullYear();
  return {
    t,
    moodLabel,
    day: (iso) => noteDay(iso, { locale }),
    time: (iso) => time24(iso, { locale }),
    longDate: (iso) => {
      const d = new Date(iso);
      return d.toLocaleDateString(locale, d.getFullYear() === thisYear ? { weekday: "long", month: "long", day: "numeric" } : { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    },
    duration: fmtDuration,
    monthTitle: (d) => monthTitle(d, { locale, upper: false }),
    upper: (s) => s.toLocaleUpperCase(locale),
  };
}

/** Same content (by JSON) keeps the same array, so a refocus that reads the same journal doesn't
    rebuild every card (or re-send them to Swift). */
function sameJson(a: readonly unknown[], b: readonly unknown[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function useNotesModel(opts: { demo?: NotesDemo; forceEmpty?: boolean } = {}): NotesModel {
  const lang = useLang();
  const router = useRouter();
  const wren = useWrenName();
  const demo = opts.demo;
  const demoRef = useRef(demo);
  demoRef.current = demo;

  /* ── the pages ── */
  const [stored, setStored] = useState<JournalEntry[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(!!demo);
  const refresh = useCallback(() => {
    if (demoRef.current) return;
    let alive = true;
    void loadJournal().then((e) => {
      if (!alive) return;
      setStored((prev) => (sameJson(prev, e) ? prev : e));
      setLoaded(true);
    });
    if (__DEV__) {
      void hiddenDemoIds().then((ids) => {
        if (alive) setHidden((prev) => (sameJson(prev, ids) ? prev : ids));
      });
    }
    return () => {
      alive = false;
    };
  }, []);

  /* a sign-in or sign-out while Notes is up (or mounted in the same moment) re-reads the pages
     from the account they now belong to (2026-11-09: the guest's empty journal stayed on screen) */
  useEffect(() => onStorageUserChange(() => void refresh()), [refresh]);
  // the guest's pages arriving in the account (lib/journal takeGuestJournal) show without a revisit
  useEffect(() => onJournalChange(() => void refresh()), [refresh]);

  /* ── today, re-read on focus and when the app comes back ── */
  const [now, setNow] = useState(() => Date.now());
  const today = dayKey(now);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") setNow(Date.now());
    });
    return () => sub.remove();
  }, []);

  /* ── the calendar ── */
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [ym, setYm] = useState<YearMonth>(() => ymOf(new Date()));

  /* the calendar stays as it was across a blur: the fallback's calendar is a
     mode whose day tap pushes the page, and the reader comes back to the
     month they were browsing. The SwiftUI overlay closes itself on blur
     (NotesNative), where a day tap scrolls instead. */
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      const stop = refresh();
      return () => {
        stop?.();
      };
    }, [refresh]),
  );

  const all = useMemo<JournalEntry[]>(() => {
    if (demo) return [...demo.entries];
    if (!__DEV__) return stored;
    const samples = demoJournal({ store: storeMode });
    return storeMode ? samples.map(storeBody) : [...stored, ...samples.filter((d) => !hidden.includes(d.id))];
    // lang: store mode's sample words follow the language on screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo?.entries, stored, hidden, lang]);
  const realPages = useMemo(() => all.filter((e) => !e.id.startsWith("demo-")).length, [all]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fmt = useMemo(() => notesFormat(), [lang, today]);
  // every page; `notes` below is what is on show (these, or the ones a search finds)
  const allNotes = useMemo(() => buildNotes(all, fmt), [all, fmt]);
  const empty = (__DEV__ && !!opts.forceEmpty) || (loaded && allNotes.length === 0);

  /* ── search: the same NoteVMs, only the ones whose page matches ── */
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const notes = useMemo(() => {
    if (!searchOpen || !query.trim()) return allNotes;
    const hits = new Set(searchPages(all, query, fmt).map((e) => e.id));
    return allNotes.filter((n) => hits.has(n.id));
  }, [allNotes, all, fmt, searchOpen, query]);
  // nothing left to search (the last page torn out from a result): the row goes
  useEffect(() => {
    if (empty && searchOpen) {
      setSearchOpen(false);
      setQuery("");
    }
  }, [empty, searchOpen]);

  const nowDate = useMemo(() => new Date(now), [now]);
  const bounds = useMemo(() => monthBounds(all, nowDate), [all, nowDate]);
  const month = useMemo(() => buildMonth(all, clampMonth(ym, bounds), nowDate, firstWeekday(lang), fmt), [all, ym, bounds, nowDate, lang, fmt]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recent = useMemo(() => recentGroups(all, nowDate), [all, today]);

  /* ── the view ── */
  const [view, setView] = useState<NotesView>("card");
  const [viewReady, setViewReady] = useState(!!demo);
  useEffect(() => {
    if (demoRef.current) return;
    let alive = true;
    scoped
      .getItem(VIEW_KEY)
      .then((v) => {
        if (alive) setView(parseStoredView(v));
      })
      .catch((e) => console.warn("[notes] the remembered view wasn't read; Card:", e))
      .finally(() => {
        if (alive) setViewReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  /* ── her line ──
     Notes E1: an empty Notes seen this session, then a page: her one-time "first one down…" takes
     the slot (useWrenOnce spends the flag notesFirstBubble when it shows, so never again), and the
     "sealed" first-visit line waits for the next launch rather than following it. */
  const [sawEmpty, setSawEmpty] = useState(false);
  useEffect(() => {
    if (!demo && empty) setSawEmpty(true);
  }, [demo, empty]);
  const showsFirst = useWrenOnce(NOTES_FIRST_BUBBLE, !demo && sawEmpty && loaded && !empty && realPages > 0);
  const showsLine = useWrenOnce("sealed", !demo && !sawEmpty && loaded && !empty && allNotes.length > 0);
  const wrenFirst = !demo && showsFirst;
  const wrenLine = demo ? (demo.wrenLine ? speakAs(t("jt.said"), wren) : null) : showsFirst ? t("ne.wren") : showsLine ? speakAs(t("jt.said"), wren) : null;

  /* ── the evening question ── */
  const evening = useEveningAsk(realPages, { enabled: !demo && loaded, wren });

  /* ── the one voice player ──
     paused on every view change: List draws no play mark in either renderer,
     so a note playing on into List would have nothing on screen to stop it
     (the calendar pauses it too, below) */
  const voice = useVoicePlayback({ pauseOn: view });
  const toggle = voice.toggle; // stable: the api object itself is new every render
  const pauseVoice = voice.pause; // stable too

  /* ── the words ── */
  const strings = useMemo<NotesStrings>(
    () => ({
      title: t("jt.notes"),
      justYou: "", // owner, 2026-10-23: the empty page's "JUST YOU" said nothing the question doesn't
      viewA11y: t("jt.viewA11y"),
      viewMenu: t("jt.viewMenu"),
      viewCard: t("jt.viewCard"),
      viewGrid: t("jt.viewGrid"),
      viewList: t("jt.viewList"),
      calendarA11y: t("jt.calendar"),
      prevMonth: t("jt.prevMonth"),
      nextMonth: t("jt.nextMonth"),
      close: t("wren.trackClose"),
      moments: t("jt.moments"),
      play: t("jt.play"),
      pause: t("jt.pause"),
      emptyTitle: t("jt.emptyTitle"),
      emptyBody: t("jt.emptyBody"),
      newLabel: t("jt.new"),
      textKey: t("jp.write"),
      voiceKey: t("jp.say"),
      eveningAsk: t("ev.ask", { wren }),
      eveningYes: t("ev.yes"),
      eveningNo: t("ev.no"),
      eveningFoot: t("ev.foot"),
      eveningOn: t("ev.onLine", { wren }),
      eveningOff: t("ev.turnOff"),
      weekdays: weekdayLetters(firstWeekday(lang), { locale: localeTag() }),
      groupNames: [t("mood.group.calm"), t("mood.group.happy"), t("mood.group.tired"), t("mood.group.low")],
      monthCount: String(pagesThisMonth(all, nowDate)).padStart(2, "0"),
      neTitle: t("ne.title"),
      neLines: MOOD_GROUPS.map((g) => t(`ne.line.${g}`)),
      neAsks: MOOD_GROUPS.map((g) => t(`ne.ask.${g}`)),
      // re-read on focus and when the app comes back (now)
      neTime: `${fmt.day(nowDate.toISOString())} · ${fmt.time(nowDate.toISOString())}`,
      neA11yCard: t("ne.a11yCard"),
      searchA11y: t("jt.search.a11y"),
      searchPlaceholder: t("jt.search.ph"),
      searchCancel: t("ml.cancel"),
      searchClear: t("jt.search.clear"),
      searchNone: t("jt.search.none"),
    }),
    // lang: every word follows the reader's language
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, wren, all, today, nowDate, fmt],
  );

  /* ── the taps ── */
  const wrenFirstRef = useRef(wrenFirst);
  wrenFirstRef.current = wrenFirst;
  // every page, whatever a search is showing: a tap looks its note up here
  const notesRef = useRef(allNotes);
  notesRef.current = allNotes;
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;
  const go = useCallback(
    (href: string) => {
      const d = demoRef.current;
      if (d) d.away(href);
      else router.push(href as never);
    },
    [router],
  );

  const act = useMemo<NotesActions>(
    () => ({
      open: (id) => go(`/journal/${id}`),
      cycleView: () =>
        setView((v) => {
          const next = nextView(v);
          if (!demoRef.current) void scoped.setItem(VIEW_KEY, next).catch((e) => console.warn("[notes] the view wasn't remembered:", e));
          return next;
        }),
      setView: (next) => {
        setView(next);
        // choosing how the pages lie is asking to see them (the fallback's calendar mode)
        setCalendarOpen(false);
        if (!demoRef.current) void scoped.setItem(VIEW_KEY, next).catch((e) => console.warn("[notes] the view wasn't remembered:", e));
      },
      setCalendar: (open) => {
        if (open) {
          // it opens on this month (and stays on the month being browsed while it is open)
          setYm(ymOf(new Date()));
          // the fallback's calendar takes the list's place, and Swift's dims it: no play mark is left to pause it with
          pauseVoice();
        }
        setCalendarOpen(open);
      },
      calendarMonth: (delta) => setYm((cur) => stepMonth(clampMonth(cur, boundsRef.current), delta, boundsRef.current)),
      openDay: (key) => {
        const day = notesRef.current.filter((n) => n.dayKey === key);
        if (day.length === 1) go(`/journal/${day[0].id}`);
        else if (day.length > 1) go(`/journal/day/${key}`);
      },
      toggleVoice: (id) => {
        const n = notesRef.current.find((x) => x.id === id);
        if (n?.voice) toggle(id, n.voice, n.durationS);
      },
      eveningYes: () => {
        const d = demoRef.current;
        if (d) d.setEvening("on");
        else evening.yes();
      },
      eveningNo: () => {
        const d = demoRef.current;
        if (d) d.setEvening("none");
        else evening.no();
      },
      eveningOff: () => {
        const d = demoRef.current;
        if (d) d.setEvening("none");
        else evening.turnOff();
      },
      dismissWrenLine: () => {
        const d = demoRef.current;
        if (d) d.setWrenLine(false);
        else if (wrenFirstRef.current) dismissWrenOnce(NOTES_FIRST_BUBBLE);
        else dismissWrenOnce("sealed");
      },
      compose: (kind) => go(kind === "voice" ? "/journal-entry?start=voice" : "/journal-entry"),
      writeEmpty: (group) => {
        // the question is the empty page's placeholder only (takeSpark), never its words
        if (!demoRef.current) {
          leaveSpark(t(`ne.ask.${group}`));
          leaveMood(MOOD_GROUP_IDS[group]);
        }
        go("/journal-entry");
      },
      setSearch: (open) => {
        // the search row takes the header: the calendar's key is away, so the calendar is too
        if (open) setCalendarOpen(false);
        else setQuery("");
        setSearchOpen(open);
      },
      searchQuery: (q) => setQuery(q),
    }),
    [go, toggle, pauseVoice, evening.yes, evening.no, evening.turnOff],
  );

  return {
    loaded,
    empty,
    notes,
    search: { open: searchOpen, query },
    view,
    viewReady,
    calendarOpen,
    month,
    recentGroups: recent,
    strings,
    wrenLine,
    wrenFirst,
    evening: demo ? { state: demo.evening, busy: false } : { state: evening.state, busy: evening.busy },
    playback: voice.state,
    act,
  };
}
