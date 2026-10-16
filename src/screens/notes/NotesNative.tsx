import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useNavigation } from "expo-router";
import { File, Paths } from "expo-file-system";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KNotesView, type KNotesCommands, type KNotesMonthRecord, type KNotesNote, type KNotesPalette, type KNotesStrings } from "../../../modules/kindredly-ui/src/Notes";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { useRenderWindow } from "../../lib/render-window";
import { useBirdImageRef } from "../../lib/bird-images";
import { playbackCommandArgs } from "../../lib/voice-playback";
import { localeTag } from "../../lib/format";
import { assetFileUri } from "../../lib/images";
import { hashStr } from "../../lib/mosaic";
import { P } from "../../theme/post";
import { EMPTY_STICKER, EMPTY_TAPE } from "./notes-glyphs";
import type { MonthVM, NoteVM } from "./notes-model";
import type { NotesModel } from "./useNotesModel";

/* THE NOTES TAB IN SWIFTUI (10a step 5): one Host for the whole screen
   (SurfaceHost: flex 1, every safe area ignored, light or dark from the
   theme, the crash breadcrumb's layout report), holding KNotesView. No
   Host per row, no RNHostView: the header, the notes, the date chip, the
   calendar, the empty state, Wren's line and the evening rows are all
   SwiftUI (modules/kindredly-ui KNotesScreen).

   This file only turns the model's view (useNotesModel, the same one the
   React Native fallback draws) into what the Swift view takes, and carries
   what isn't data:
   - THE WINDOW: the first 60 notes, 60 more each time Swift says the list
     nears the end (useRenderWindow, anchored at the newest), kept by
     content so a refocus that reads the same journal sends nothing;
   - pictures as { uri, key }: a journal file keyed by its file name (the
     app's container path changes across installs and updates; the file
     name doesn't), a dev sample by its URL; a video note's file goes as a
     "videoPoster" ref, so KImageStore makes its frame from the local file;
     her bird as her real snapshots ('content' at 22 and 26, 'mini' at 18);
   - BY COMMAND, never props (every prop change re-sends the whole map):
     the calendar's month, one record at a time, whenever it changes; the
     one player's transitions; scroll requests — a calendar day (the
     calendar closes, the window grows to hold the day's newest page, the
     list goes there) and the tab pressed again (to the top). A remounted
     view gets the month and the player's state again.
   Until the journal has been read and the remembered view is known, it
   draws the page colour only, so the first frame is the right view with
   the right notes (no flash of the empty state, no crossfade of views).

   THE CALENDAR closes when the tab loses focus (a push, another tab): the
   overlay never waits behind another page. That rule is this renderer's
   only — the model keeps the calendar across a blur, because the React
   Native fallback's calendar is a mode whose day tap pushes the page, and
   its reader comes back to the month they were browsing.

   DEV AND STORE MODE: the sample video (data/demo demo-j-video) is a remote
   https mp4, and KImageStore makes no frame from a remote file (spike I3),
   which would leave a blank block where the film is — in App Store
   screenshots too. In a dev build only, Swift gets a local copy instead:
   the clip downloaded once into the cache (useDevFilms), or, offline, the
   dev page's bundled landscape film. A release build never downloads it,
   and its journal videos are local files already. */

/** A journal picture as Swift loads it: a local file keyed by its name (stable across the
    container moves lib/journal re-resolves), anything else by its URL. */
export function journalImage(uri: string, kind?: "videoPoster"): { uri: string; key: string; kind?: "image" | "videoPoster" } {
  const local = uri.startsWith("file:") || uri.startsWith("/");
  const key = local ? `journal:${uri.split("/").pop() ?? uri}` : uri;
  return kind ? { uri, key, kind } : { uri, key };
}

/** A note record with its mood icon: the art key (moods moodArtKey: "mood-sleepy", or the group's own
    "mood-group-low" for a page that chose only a group) beside its group. KNotesNote gains the field
    with the Swift mood-art slice; until then Swift's record ignores it and draws the group face. */
export type KNotesNoteRecord = KNotesNote & { icon: string };

/** A NoteVM as Swift's KNoteCard takes it. `films` (dev only) maps a remote sample video to a local
    copy, so KImageStore can make its frame. */
export function nativeNote(n: NoteVM, films?: Readonly<Record<string, string>>): KNotesNoteRecord {
  const video = n.video ? (films?.[n.video] ?? n.video) : null;
  return {
    id: n.id,
    kind: n.kind,
    group: n.group,
    icon: n.icon,
    label: n.label,
    shortLabel: n.shortLabel,
    listLabel: n.listLabel,
    body: n.body,
    listLine: n.listLine,
    photo: n.photo ? journalImage(n.photo) : null,
    photoMore: n.photoMore,
    video: video ? journalImage(video, "videoPoster") : null,
    duration: n.duration,
    playable: !!n.voice,
    waveSeed: n.waveSeed,
    a11y: n.a11y,
  };
}

/** The calendar's month as the 'month' command carries it. */
export function monthRecord(m: MonthVM): KNotesMonthRecord {
  return {
    key: m.key,
    title: m.title,
    lead: m.lead,
    days: m.days.map((d) => ({ n: d.n, label: String(d.n), group: d.group ?? "", targetId: d.targetId ?? "", future: d.future, today: d.today, a11y: d.a11y })),
    counts: m.counts.map(String),
    footer: m.footer,
    footerA11y: m.footerA11y,
    legendA11y: m.legendA11y,
    canPrev: m.canPrev,
    canNext: m.canNext,
  };
}

/** The same value back while its content is the same (JSON), so a rebuilt but unchanged array
    keeps its identity and isn't re-sent to Swift. Compared only when the value passed in is a new
    one (a render for a playback transition doesn't stringify the window again). */
function useSameContent<T>(value: T): T {
  const kept = useRef<{ src: T; json: string; value: T } | null>(null);
  const k = kept.current;
  if (k && k.src === value) return k.value;
  const json = JSON.stringify(value);
  kept.current = k && k.json === json ? { src: value, json, value: k.value } : { src: value, json, value };
  return kept.current.value;
}

/** the empty state's fixed colours: the note keys' own, the tape, the sticker */
const PALETTE: KNotesPalette = { keyText: P.keyText, keyVoice: P.keyVoice, tape: EMPTY_TAPE, sticker: EMPTY_STICKER };

/* ── dev and store mode: a local copy of a remote sample video ── */

/** the dev page's bundled film, standing in when the sample can't be downloaded (a release build
    folds the require away with __DEV__) */
const DEV_FILM: number | null = __DEV__ ? require("../../../assets/dev/notes-film-landscape.mp4") : null;
const devFilmCopies = new Map<string, Promise<string | null>>();

/** Dev only: a local file for a remote sample video — the clip downloaded once into the cache, or
    the bundled film when that fails (offline). Memoised per URL; null when neither is there. */
function devLocalFilm(url: string): Promise<string | null> {
  const hit = devFilmCopies.get(url);
  if (hit) return hit;
  const p = (async () => {
    try {
      const file = new File(Paths.cache, `notes-sample-${hashStr(url).toString(36)}.mp4`);
      if (file.exists && (file.size ?? 0) > 0) return file.uri;
      return (await File.downloadFileAsync(url, file, { idempotent: true })).uri;
    } catch (e) {
      console.warn("[notes] the sample video wasn't copied for its frame; the dev film stands in:", e);
      return DEV_FILM != null ? await assetFileUri(DEV_FILM).catch(() => null) : null;
    }
  })();
  devFilmCopies.set(url, p);
  return p;
}

/** Dev only: { remote sample video URL → local copy } for the samples among `notes`, filled in as the
    copies land. Empty in a release build. */
function useDevFilms(notes: readonly NoteVM[]): Readonly<Record<string, string>> {
  const wanted = useMemo(() => (__DEV__ ? [...new Set(notes.filter((n) => n.sample && n.video && /^https?:/i.test(n.video)).map((n) => n.video as string))].join("\n") : ""), [notes]);
  const [films, setFilms] = useState<Readonly<Record<string, string>>>({});
  useEffect(() => {
    if (!wanted) return;
    let alive = true;
    for (const url of wanted.split("\n")) {
      void devLocalFilm(url).then((uri) => {
        if (alive && uri) setFilms((m) => (m[url] === uri ? m : { ...m, [url]: uri }));
      });
    }
    return () => {
      alive = false;
    };
  }, [wanted]);
  return films;
}

export function NotesNative({ model }: { model: NotesModel }) {
  const { key: theme, t: tk } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const navigation = useNavigation();
  const { act } = model;

  /* ── by command: the month and the player, again on a new view ── */
  const month = useMemo(() => monthRecord(model.month), [model.month]);
  const latest = useRef({ month, playback: model.playback });
  latest.current = { month, playback: model.playback };
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands<KNotesCommands>(ref, {
    onViewAttach: () => {
      commands.send("month", latest.current.month);
      commands.send("playback", playbackCommandArgs(latest.current.playback));
    },
  });
  useEffect(() => {
    commands.send("month", month);
  }, [commands, month]);
  useEffect(() => {
    commands.send("playback", playbackCommandArgs(model.playback));
  }, [commands, model.playback]);

  /* ── the calendar closes on blur: the overlay never waits behind another tab or a pushed page ──
     (a ref, so a new `act` — the evening's answers re-create it — never runs the cleanup while on show) */
  const actRef = useRef(act);
  actRef.current = act;
  useFocusEffect(
    useCallback(
      () => () => {
        actRef.current.setCalendar(false);
      },
      [],
    ),
  );

  /* ── the window ── */
  const win = useRenderWindow(model.notes.length, { initial: 60, step: 60, anchor: "start" });
  const films = useDevFilms(model.notes);
  const notes = useSameContent(useMemo(() => model.notes.slice(win.start, win.end).map((n) => nativeNote(n, films)), [model.notes, win.start, win.end, films]));
  const rev = useRev(notes);

  /* ── a calendar day: close, make sure its page is sent, go there ── */
  const notesRef = useRef(model.notes);
  notesRef.current = model.notes;
  const pickDay = useCallback(
    (id: string) => {
      act.setCalendar(false);
      const i = notesRef.current.findIndex((n) => n.id === id);
      if (i >= 0) win.include(i);
      commands.send("scrollTo", { key: id, animated: true });
    },
    [act, win.include, commands],
  );

  /* ── pressing Notes again while on it goes to the top (NativeTabBar emits tabPress) ── */
  useEffect(() => {
    type Nav = { addListener?: (type: string, cb: () => void) => () => void; isFocused?: () => boolean };
    const nav = navigation as unknown as Nav;
    if (!nav.addListener) return;
    return nav.addListener("tabPress", () => {
      if (nav.isFocused?.()) commands.send("scrollTo", { key: "top", animated: true });
    });
  }, [navigation, commands]);

  /* ── her pictures ── */
  const bird = useBirdImageRef("content");
  const birdMini = useBirdImageRef("mini");

  /* ── the words, the keys' as drawn ── */
  const s = model.strings;
  const strings = useMemo<KNotesStrings>(() => {
    const upper = (x: string) => x.toLocaleUpperCase(localeTag());
    return {
      title: s.title,
      justYou: s.justYou,
      viewA11y: s.viewA11y,
      viewCard: s.viewCard,
      viewGrid: s.viewGrid,
      viewList: s.viewList,
      calendarA11y: s.calendarA11y,
      prevMonth: s.prevMonth,
      nextMonth: s.nextMonth,
      close: s.close,
      moments: s.moments,
      play: s.play,
      pause: s.pause,
      emptyTitle: s.emptyTitle,
      emptyBody: s.emptyBody,
      newLabel: s.newLabel,
      textKey: s.textKey,
      voiceKey: s.voiceKey,
      textKeyUpper: upper(s.textKey),
      voiceKeyUpper: upper(s.voiceKey),
      eveningAsk: s.eveningAsk,
      eveningYes: s.eveningYes,
      eveningNo: s.eveningNo,
      eveningFoot: s.eveningFoot,
      eveningOn: s.eveningOn,
      eveningOff: s.eveningOff,
      weekdays: s.weekdays,
    };
  }, [s]);

  const onEvening = useCallback(
    (answer: "yes" | "no" | "off") => {
      if (answer === "yes") act.eveningYes();
      else if (answer === "no") act.eveningNo();
      else act.eveningOff();
    },
    [act],
  );

  if (!model.loaded || !model.viewReady) return <View style={{ flex: 1, backgroundColor: tk.bg }} />;

  return (
    <SurfaceHost>
      <KNotesView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        notes={notes}
        hasMore={win.hasMore}
        empty={model.empty}
        view={model.view}
        calendarOpen={model.calendarOpen}
        recentGroups={model.recentGroups}
        wrenLine={model.wrenLine ?? ""}
        bird={bird}
        birdMini={birdMini}
        evening={model.evening.state}
        eveningBusy={model.evening.busy}
        palette={PALETTE}
        onOpen={act.open}
        onViewCycle={act.cycleView}
        onCalendarToggle={act.setCalendar}
        onCalendarMonth={act.calendarMonth}
        onDayPick={pickDay}
        onVoiceToggle={act.toggleVoice}
        onEveningAnswer={onEvening}
        onWrenLineDismiss={act.dismissWrenLine}
        onCompose={act.compose}
        onReachEnd={win.grow}
      />
    </SurfaceHost>
  );
}
