import { memo, useCallback, useMemo, useRef, useState } from "react";
import { Alert, View, useWindowDimensions } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { KIsland, isKindredlyUIViewAvailable, useKCommands, useRev, type KInsets, type KScreenHandle, type KThemeKey, type LetterFontKey } from "../../../modules/kindredly-ui";
import { nativeOn } from "../../lib/surfaces";
import { KNotePageView, type KNotePageCommands, type KNotePagePhoto, type KNotePageState, type KNotePageStrings } from "../../../modules/kindredly-ui/src/NotePages";
import type { KNoteFilmData } from "../../../modules/kindredly-ui/src/MediaPieces";
import type { KVoiceSlotAction } from "../../../modules/kindredly-ui/src/VoicePieces";
import type { KNotesGroup, KNotesKind } from "../../../modules/kindredly-ui/src/Notes";
import { SurfaceHost } from "../../components/NativeSurface";
import { AudioCard } from "../../components/AudioCard";
import { PhotoLightbox } from "../../components/PhotoLightbox";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { localeTag } from "../../lib/format";
import { t, useLang } from "../../lib/i18n";
import { moodArtKey, moodGroup, moodLabel } from "../../data/moods";
import { demoJournal } from "../../data/demo";
import { deleteEntry, hideDemoEntry, loadJournal, setCover, type JournalEntry } from "../../lib/journal";
import { moodColors } from "../notes/notes-glyphs";
import { journalImage } from "../notes/NotesNative";
import { DetailVideo } from "./DetailVideo";
import { NoteVoiceDriver, type NoteVoiceLink } from "./NoteVoiceDriver";
import { useSwiftIsland, type IslandRenderer } from "../../components/swift-island";
import { canEditPage, dateLine, pageView } from "./note-page-model";
import "../../data/strings-step5-notes";
import "../../data/strings-audit-notes"; // jd.edit
import "../../data/strings-step5-kitrn"; // a11y.back
import "../../data/strings-a11y-compose"; // sc.a11y.photo, sc.a11y.photoHint

/* ONE JOURNAL PAGE IN SWIFTUI (2026-10-27): one Host holding KNotePageView,
   behind the "noteentry" switch (app/journal/[id], NativeSurface in mount
   mode). The React Native page's reads and rules, as it has them:
   - the page read on every focus (a sample from data/demo, any one, store
     mode or not), and "This page isn't here any more." once the read has
     answered without it;
   - a hold makes a picture the cover (setCover; said if it fails), a tap
     opens it in the lightbox (React Native's PhotoLightbox, a Modal over
     the Host);
   - the ⋯: Let This Drift Out (to the letter desk with the words), Delete
     behind its confirmation — a sample is only hidden (hideDemoEntry), a
     real page torn out (deleteEntry; said if it fails) — then back;
   - the voice card (AudioCard, in the mood's ink) and the film (DetailVideo)
     stay React Native, as islands — unless their batch-3 switches say Swift
     draws them (2026-11-09, off by default; components/swift-island, the
     marker view KNoteFilmView for both): "notevoice" puts the page's own
     KAudioCardRow in the voice slot, its player kept here (NoteVoiceDriver,
     the `voice` command, onVoice back); "notefilm" hands the page the film's
     url (swiftFilm: KNoteFilm, DetailVideo's rules). While a piece's crash
     breadcrumb is on its way to the disk neither renderer draws it;
   - EDIT (owner's audit, 2026-11-10): the ⋯ gains Edit above Delete on a
     real page (note-page-model canEditPage; composerCanEdit below). It opens
     the composer filled with this page (/journal-entry?edit=<id>), and the
     read on focus above shows the saved page when the composer closes. A
     binary from before this has no Edit item (its Swift ignores canEdit and
     the label); nothing else changes for it. */

/** The composer that can change a sealed page is the SwiftUI one: its switch on ("journalentry",
    strikes and kill rows included) and its view in this binary. Asked when the page is drawn. */
export const composerCanEdit = (): boolean => nativeOn("journalentry") && isKindredlyUIViewAvailable("KNoteComposeView");

function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

export function NotePageNative({ id }: { id: string }) {
  const lang = useLang();
  const router = useRouter();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const { width } = useWindowDimensions();
  const ref = useRef<KScreenHandle>(null);
  /* the voice card the page draws itself (notevoice): what NoteVoiceDriver last said goes again
     when the view re-attaches */
  const voiceLink = useRef<NoteVoiceLink>({ send: () => {}, toggle: null, resend: null }).current;
  const commands = useKCommands<KNotePageCommands>(ref, { onViewAttach: () => voiceLink.resend?.() });
  voiceLink.send = (cmd) => commands.send("voice", cmd);
  const [e, setE] = useState<JournalEntry | null>(null);
  // the first read has answered: a page still loading and a page that isn't there look different
  const [read, setRead] = useState(false);
  const [full, setFull] = useState<string | null>(null);
  const isDemo = id.startsWith("demo-");

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (isDemo) {
        // every sample opens, store mode or not (data/demo demoJournal)
        setE(demoJournal({ store: false }).find((x) => x.id === id) || null);
        setRead(true);
      } else {
        loadJournal().then((all) => {
          if (!alive) return;
          setE(all.find((x) => x.id === id) || null);
          setRead(true);
        });
      }
      return () => {
        alive = false;
      };
    }, [id, isDemo]),
  );

  const goBack = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/journal")), [router]);

  /* the live page for the taps (one set of actions for the view's life) */
  const live = useRef(e);
  live.current = e;

  const makeCover = useCallback(
    async (i: number) => {
      const cur = live.current;
      if (!cur || isDemo) return;
      try {
        await setCover(cur.id, i);
      } catch (err) {
        console.warn("[journal] the cover didn't change:", err);
        Alert.alert(t("sc.journalTitle"), t("cp.fail.generic"));
        return;
      }
      setE({ ...cur, coverIndex: i, mediaUri: cur.media?.[i] || cur.mediaUri });
    },
    [isDemo],
  );

  const confirmDelete = useCallback(() => {
    const cur = live.current;
    if (!cur) return;
    if (isDemo) {
      // a sample tears out locally and never comes back
      Alert.alert(t("jd.tearSample.title"), t("jd.tearSample.body"), [
        { text: t("jd.keep"), style: "cancel" },
        {
          text: t("jd.tear"),
          style: "destructive",
          onPress: async () => {
            await hideDemoEntry(cur.id);
            goBack();
          },
        },
      ]);
      return;
    }
    Alert.alert(t("jd.tearPage.title"), t("jd.tearPage.body"), [
      { text: t("jd.keep"), style: "cancel" },
      {
        text: t("jd.tear"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEntry(cur.id);
          } catch (err) {
            console.warn("[journal] the page wasn't torn out:", err);
            Alert.alert(t("sc.journalTitle"), t("cp.fail.generic"));
            return;
          }
          goBack();
        },
      },
    ]);
  }, [isDemo, goBack]);

  const act = useMemo(
    () => ({
      back: goBack,
      // the whole page goes to the letter desk, where it gets a stamp and is sent by hand
      drift: () => {
        const cur = live.current;
        if (cur) router.push({ pathname: "/compose", params: { seed: cur.body } });
      },
      // the composer, holding this page; its save replaces it (read again here on focus)
      edit: () => {
        const cur = live.current;
        if (cur && !isDemo) router.push({ pathname: "/journal-entry", params: { edit: cur.id } });
      },
      // after the menu has closed, as on the React Native page
      remove: () => setTimeout(confirmDelete, 0),
      photo: (i: number) => {
        const cur = live.current;
        const all = cur ? (cur.media?.length ? cur.media : cur.mediaUri ? [cur.mediaUri] : []) : [];
        if (all[i]) setFull(all[i]);
      },
      cover: (i: number) => void makeCover(i),
      voice: (a: KVoiceSlotAction) => {
        if (a === "toggle") voiceLink.toggle?.();
      },
    }),
    [goBack, router, confirmDelete, makeCover, voiceLink, isDemo],
  );

  const view = useMemo(() => (e ? pageView(e, isDemo) : null), [e, isDemo]);
  const state: KNotePageState = e ? "ready" : read ? "missing" : "loading";

  const strings = useSameContent<KNotePageStrings>(
    useMemo(() => {
      const date = e ? new Date(e.date).toLocaleDateString(localeTag(), { weekday: "short", month: "short", day: "numeric" }).toLocaleUpperCase(localeTag()) : "";
      return {
        backLabel: t("a11y.back"),
        moreLabel: t("jd.more"),
        driftLabel: t("jd.driftThis"),
        editLabel: t("jd.edit"),
        deleteLabel: t("jd.delete"),
        dateLine: e ? dateLine(date, moodLabel(e.mood), isDemo) : "",
        notFound: t("jd.notFound"),
        oneLineOut: t("jd.oneLineOut"),
        tomorrowStranger: t("jd.tomorrowStranger"),
        coverHint: t("jd.coverHint"),
        photoHint: t("sc.a11y.photoHint"),
        makeCover: t("sc.makeCover"),
      };
      // lang: every word is t()'s, the day the locale's
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [e, isDemo, lang]),
  );

  const n = view?.photos.length ?? 0;
  const photos = useSameContent<KNotePagePhoto[]>(
    (view?.photos ?? []).map((p, k) => ({
      id: `${p.index}:${p.uri}`,
      index: p.index,
      image: journalImage(p.uri),
      a11y: t(k === 0 && n >= 2 ? "sc.a11y.photoCover" : "sc.a11y.photo", { i: k + 1, n }),
    })),
  );
  const rev = useRev(photos);

  const group = moodGroup(e?.mood);
  const tint = moodColors(group).ink;

  const voiceUri = view?.voice && e?.mediaUri ? e.mediaUri : null;
  const filmUri = view?.film && e?.mediaUri ? e.mediaUri : null;
  const voiceIn = useSwiftIsland("notevoice", "KNoteFilmView", !!voiceUri);
  const filmIn = useSwiftIsland("notefilm", "KNoteFilmView", !!filmUri);
  const swiftFilm = useSameContent<KNoteFilmData | null>(
    filmIn === "swift" && filmUri ? { url: filmUri, playLabel: t("jt.play"), pauseLabel: t("jt.pause") } : null,
  );

  return (
    <View style={{ flex: 1 }}>
      <PageSurface
        viewRef={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        state={state}
        kind={(view?.kind ?? "text") as KNotesKind}
        group={group as KNotesGroup}
        icon={e ? moodArtKey(e.mood) : ""}
        body={view?.body ?? ""}
        pure={view?.pure ?? false}
        drifted={view?.drifted ?? ""}
        canDrift={view?.canDrift ?? false}
        canEdit={!!e && canEditPage(isDemo, composerCanEdit())}
        photos={photos}
        canSetCover={view?.canSetCover ?? false}
        coverHint={view?.coverHint ?? false}
        voiceUri={voiceUri}
        voiceIn={voiceIn}
        voiceDur={e?.dur}
        tint={tint}
        filmUri={filmUri}
        filmIn={filmIn}
        swiftFilm={swiftFilm}
        islandWidth={Math.max(0, width - 44)}
        act={act}
      />
      {/* the voice card's player, for the card the page draws itself (nothing drawn here) */}
      {voiceIn === "swift" && voiceUri ? <NoteVoiceDriver link={voiceLink} url={voiceUri} durationS={e?.dur} tint={tint} /> : null}
      {/* the lightbox: the photo alone on ink, pinch to look closer, tap to put it back */}
      <PhotoLightbox photo={full ? { uri: full } : null} onClose={() => setFull(null)} />
    </View>
  );
}

type Act = {
  back: () => void;
  drift: () => void;
  edit: () => void;
  remove: () => void;
  photo: (i: number) => void;
  cover: (i: number) => void;
  voice: (a: KVoiceSlotAction) => void;
};

type SurfaceProps = {
  viewRef: (instance: KScreenHandle | null) => void;
  theme: KThemeKey;
  letterFont: LetterFontKey;
  insets: KInsets;
  rev: number;
  strings: KNotePageStrings;
  state: KNotePageState;
  kind: KNotesKind;
  group: KNotesGroup;
  icon: string;
  body: string;
  pure: boolean;
  drifted: string;
  canDrift: boolean;
  /** the ⋯ offers Edit */
  canEdit: boolean;
  photos: KNotePagePhoto[];
  canSetCover: boolean;
  coverHint: boolean;
  voiceUri: string | null;
  /** who draws the voice card (notevoice) */
  voiceIn: IslandRenderer;
  voiceDur: number | undefined;
  tint: string;
  filmUri: string | null;
  /** who draws the film (notefilm) */
  filmIn: IslandRenderer;
  swiftFilm: KNoteFilmData | null;
  islandWidth: number;
  act: Act;
};

/* The Host, the view and its two islands, redrawn only when a prop changes (every prop is kept by
   content or is a primitive; act and the ref are made once). */
const PageSurface = memo(function PageSurface(p: SurfaceProps) {
  const { act } = p;
  return (
    <SurfaceHost>
      <KNotePageView
        ref={p.viewRef}
        theme={p.theme}
        letterFont={p.letterFont}
        insets={p.insets}
        rev={p.rev}
        strings={p.strings}
        state={p.state}
        kind={p.kind}
        group={p.group}
        icon={p.icon}
        body={p.body}
        pure={p.pure}
        drifted={p.drifted}
        canDrift={p.canDrift}
        canEdit={p.canEdit}
        photos={p.photos}
        canSetCover={p.canSetCover}
        coverHint={p.coverHint}
        voice={!!p.voiceUri && p.voiceIn !== "pending"}
        film={!!p.filmUri && p.filmIn !== "pending"}
        swiftFilm={p.swiftFilm}
        onVoice={act.voice}
        onBack={act.back}
        onDrift={act.drift}
        onEdit={act.edit}
        onDelete={act.remove}
        onPhoto={act.photo}
        onCover={act.cover}
      >
        {/* every island on every render, in this order (Slot.tsx) */}
        <KIsland name="voice" interactive style={{ width: p.islandWidth }}>
          {p.voiceUri && p.voiceIn === "rn" ? <AudioCard url={p.voiceUri} durationS={p.voiceDur} tint={p.tint} /> : null}
        </KIsland>
        <KIsland name="film" interactive style={{ width: p.islandWidth }}>
          {p.filmUri && p.filmIn === "rn" ? <DetailVideo uri={p.filmUri} /> : null}
        </KIsland>
      </KNotePageView>
    </SurfaceHost>
  );
});
