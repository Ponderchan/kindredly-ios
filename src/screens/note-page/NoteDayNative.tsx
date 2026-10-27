import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KNoteDayView, type KNoteDayCommands, type KNoteDayStrings } from "../../../modules/kindredly-ui/src/NotePages";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { localeTag } from "../../lib/format";
import { t, useLang } from "../../lib/i18n";
import { demoJournal } from "../../data/demo";
import { loadJournal, type JournalEntry } from "../../lib/journal";
import { playbackCommandArgs, useVoicePlayback } from "../../lib/voice-playback";
import { buildNote, dayKey } from "../notes/notes-model";
import { notesFormat } from "../notes/useNotesModel";
import { nativeNote, useDevFilms } from "../notes/NotesNative";
import { dayPages } from "./note-page-model";
import "../../data/strings-step5-notes"; // jt.play, jt.pause
import "../../data/strings-step5-kitrn"; // a11y.back

/* ONE DAY OF THE JOURNAL IN SWIFTUI (2026-10-27): one Host holding
   KNoteDayView, behind the "noteday" switch (app/journal/day/[date],
   NativeSurface in mount mode). The React Native page's reads, as it has
   them: every page of that local day (the calendar's dayKey), oldest
   first, read on every focus, with the sample pages in a dev build; the
   title the reader's own date; a tap opens the page. The cards are the
   Notes tab's own (notes-model buildNote → KNoteCard, Card layout), so a
   voice page plays in place through this page's one player
   (useVoicePlayback, its transitions by the 'playback' command, again on a
   new view) — the React Native page's SealedEntry gave each voice card a
   player of its own. A dev sample film gets a local copy for its frame, as
   on the tab (useDevFilms). */

function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

export function NoteDayNative({ date }: { date: string }) {
  const lang = useLang();
  const router = useRouter();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const [day, setDay] = useState<JournalEntry[]>([]);
  const [read, setRead] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadJournal().then((real) => {
        if (!alive) return;
        const all = __DEV__ ? [...real, ...demoJournal({ store: false })] : real;
        // oldest → newest within the day reads like a diary
        setDay(dayPages(all, date, dayKey));
        setRead(true);
      });
      return () => {
        alive = false;
      };
    }, [date]),
  );

  /* ── the cards, the tab's own ── */
  // lang and the date: every label is in the reader's language and locale
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fmt = useMemo(() => notesFormat(), [lang]);
  const vms = useMemo(() => day.map((e) => buildNote(e, fmt)), [day, fmt]);
  const films = useDevFilms(vms);
  const notes = useSameContent(useMemo(() => vms.map((n) => nativeNote(n, films)), [vms, films]));
  const rev = useRev(notes);

  /* ── the one player ── */
  const voice = useVoicePlayback();
  const latest = useRef(voice.state);
  latest.current = voice.state;
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands<KNoteDayCommands>(ref, {
    onViewAttach: () => {
      commands.send("playback", playbackCommandArgs(latest.current));
    },
  });
  useEffect(() => {
    commands.send("playback", playbackCommandArgs(voice.state));
  }, [commands, voice.state]);

  const vmsRef = useRef(vms);
  vmsRef.current = vms;
  const toggle = voice.toggle;
  const onVoiceToggle = useCallback(
    (id: string) => {
      const n = vmsRef.current.find((x) => x.id === id);
      if (n?.voice) toggle(id, n.voice, n.durationS);
    },
    [toggle],
  );
  const onOpen = useCallback((id: string) => router.push(`/journal/${id}`), [router]);
  const onBack = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/journal")), [router]);

  const strings = useSameContent<KNoteDayStrings>({
    title: date ? new Date(`${date}T12:00:00`).toLocaleDateString(localeTag(), { weekday: "long", month: "long", day: "numeric" }) : "",
    backLabel: t("a11y.back"),
    footer: read ? t("jd.onThisDay", { n: String(day.length) }) : "",
    play: t("jt.play"),
    pause: t("jt.pause"),
  });

  return (
    <SurfaceHost>
      <KNoteDayView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        notes={notes}
        onBack={onBack}
        onOpen={onOpen}
        onVoiceToggle={onVoiceToggle}
      />
    </SurfaceHost>
  );
}
