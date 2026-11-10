import { memo, useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import { View, useWindowDimensions } from "react-native";
import { KIsland, useKCommands, useRev, type KInsets, type KScreenHandle, type KThemeKey, type KWrenPictureData, type LetterFontKey } from "../../../modules/kindredly-ui";
import {
  KNoteComposeView,
  type KNoteComposeCommands,
  type KNoteComposeStrings,
  type KNoteMediaCard,
  type KNoteMood,
  type KNoteMoodGroup,
  type KNotePanel,
  type KNoteThumb,
} from "../../../modules/kindredly-ui/src/NoteCompose";
import { SurfaceHost } from "../../components/NativeSurface";
import { WrenBird } from "../../components/WrenBird";
import { Recorder } from "../../components/Recorder";
import { AudioCard } from "../../components/AudioCard";
import { VoiceBarDriver, VoiceTakeDriver, createVoiceSlot, useVoicePieces, type VoiceSlot } from "../../components/VoiceSlot";
import { FrameViewer, type SelfComposeState } from "../../components/SelfCompose";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { useBirdImageRefs } from "../../lib/bird-images";
import { useSwiftIsland } from "../../lib/swift-island";
import { localeTag } from "../../lib/format";
import { t, useLang } from "../../lib/i18n";
import { MOOD_GROUP_KEY, moodArtKey, moodGroup, moodLabel, moodName } from "../../data/moods";
import "../../data/strings-a11y-compose";
import "../../data/strings-step5-notes";
import "../../data/strings-note-compose";
import "../../data/strings-audit-notes";
import type { JournalEntry } from "../../lib/journal";
import { cardsOn, chosenFaceOf, openGroupFor, panelGroups, sealAction } from "./note-compose-model";
import { useNoteComposeState, type NoteComposeState } from "./useNoteComposeState";

/* THE NOTES COMPOSER IN SWIFTUI (1.0.7; owner 2026-10-26: the Note Composer Bar design). One Host
   for the page (SurfaceHost field: the keyboard's safe area kept so the bar rides the keyboard),
   holding KNoteComposeView and its two islands — Wren, and the Recorder while speaking. The frame
   viewer (a photo full screen: make it the cover, take it off) is React Native's own Modal, above
   the Host, as on the React Native page.

   This file only turns useNoteComposeState into the Swift view's props and commands:
   - the props are kept by content, so a keystroke (which re-renders this file through the route's
     `text`) re-sends nothing native unless the page's emptiness flips;
   - the words go to Swift only when the view attaches (the route's `text`: the demo seed, or
     everything TS still holds after a remount); never an echo of typing;
   - the page opens with the keyboard down (the design): no focus is sent;
   - the voice slot (components/VoiceSlot): with the "recorder" or "audiocard" switch on, the page
     draws the recording bar or the take's card itself, told by the `recorder` command
     (VoiceBarDriver and VoiceTakeDriver hold the recording and the player, beside the Host), and
     the island keeps only what is still React Native;
   - Wren herself in Swift (batch 3, "notewren", off by default): her content snapshot at 30
     (lib/bird-images note30) goes as the `wren` prop and Swift draws it, still, as the island
     drew her; the island stays, empty.

   EDITING A SEALED PAGE (owner's audit, 2026-11-10; `editing`, from the route's `edit`): the same
   view, told nothing new — the page's own date at the top and in the send-off where a new page
   says today's, "Save changes" on the key where a new page says "Seal it here", the plain
   placeholder instead of her question — so it works on every binary that has this composer. The
   words arrive as a new page's demo seed does (the route's `text`, sent when the view attaches);
   the mood, the pictures and the film are the state's (useNoteComposeState, editSeed). */

function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

const NO_MOOD: KNoteMood = { group: "", artKey: "", path: "", a11yLabel: "" };

export function NoteComposeNative({
  text,
  setText,
  onDone,
  onClose,
  onState,
  viewRef,
  editing,
}: {
  text: string;
  setText: (t: string) => void;
  /** after the seal moment: back to Notes */
  onDone: () => void;
  /** the ✕ (the route's leave guard asks first) */
  onClose: () => void;
  onState?: (s: SelfComposeState) => void;
  viewRef: RefObject<KScreenHandle | null>;
  /** the sealed page being changed; none: a new page */
  editing?: JournalEntry | null;
}) {
  useLang();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const { width } = useWindowDimensions();
  const state = useNoteComposeState({ text, setText, onState, viewRef, editing });

  // the words TS holds, for a view that (re)attaches
  const latest = useRef(text);
  latest.current = text;
  const commands = useKCommands<KNoteComposeCommands>(viewRef, {
    blurOnUnmount: true,
    onViewAttach: () => {
      commands.send("setText", { target: "body", value: latest.current });
      slot.resend();
    },
  });

  // the voice slot: which pieces Swift draws (once), and what they show
  const pieces = useVoicePieces();
  const slot = useMemo(() => createVoiceSlot(pieces, (cmd) => commands.send("recorder", cmd)), [pieces, commands]);
  const voice = state.att === "voice";
  const recUri = voice ? state.mediaUri : null;
  slot.take = !!recUri;

  // the page's actions, one object for its life (the surface is memoised on it)
  const live = useRef(state.act);
  live.current = state.act;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  /* SEALED: Swift plays the seal moment (KNoteSealMoment, ~2.2s) and says when it is over. Back to
     Notes once, on its word, or 4s after the seal if no word came (said, not silent). */
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const left = useRef(false);
  const leave = useCallback(() => {
    if (left.current) return;
    left.current = true;
    doneRef.current();
  }, []);
  useEffect(() => {
    if (!state.sealed) return;
    const id = setTimeout(() => {
      if (left.current) return;
      console.warn("[note-compose] the seal moment never said it was over; going back to Notes anyway");
      leave();
    }, 4000);
    return () => clearTimeout(id);
  }, [state.sealed, leave]);
  const act = useMemo(
    () => ({
      close: () => closeRef.current(),
      textChange: (s: string) => live.current.textChange(s),
      fieldFocus: (f: boolean) => live.current.fieldFocus(f),
      panel: (w: "plus" | "mood") => live.current.panel(w),
      pickGroup: (g: "calm" | "happy" | "tired" | "low") => live.current.pickGroup(g),
      pickFace: (id: string) => live.current.pickFace(id),
      card: (k: "photo" | "video" | "voice") => live.current.card(k),
      thumb: (i: number) => live.current.thumb(i),
      removeMedia: () => live.current.removeMedia(),
      seal: (s: string) => live.current.seal(s),
      wren: () => live.current.wren(),
      recorded: (uri: string, s: number) => live.current.recorded(uri, s),
      clearRecording: () => live.current.clearRecording(),
      sealEnd: () => leave(),
    }),
    [leave],
  );

  // the page's day: today on a new page, its own on a sealed one being changed
  const date = (editing ? new Date(editing.date) : new Date()).toLocaleString(localeTag(), { month: "short", day: "numeric" }).toLowerCase();
  const strings = useSameContent<KNoteComposeStrings>({
    date,
    justForMe: t("je.justForMe"),
    closeLabel: t("wren.trackClose"),
    editorLabel: t("nc.editor"),
    placeholder: state.editing || state.hasMedia || state.att === "voice" ? t("sc.ph") : state.spark,
    plusLabel: t("nc.plus"),
    moodEmptyLabel: t("sc.askMood"),
    sealLabel: state.editing ? t("nc.edit.save") : t("sc.seal"),
    sealingLabel: state.editing ? t("nc.edit.saving") : t("sc.sealing"),
    sealHint: t("nc.moodFirst"),
    // "KEPT · OCT 26": the send-off's own word, without its full stop, and the page's date
    keptLine: `${t("so.kept").replace(/[.。!！]+$/u, "")} · ${date}`.toLocaleUpperCase(localeTag()),
    keptSpoken: t("so.kept"),
    coverHint: t("sc.coverHint"),
    removeVideo: t("sc.a11y.removeVideo"),
  });

  const mood = useSameContent<KNoteMood>(
    state.mood ? { group: moodGroup(state.mood), artKey: moodArtKey(state.mood), path: "", a11yLabel: moodLabel(state.mood) } : NO_MOOD,
  );

  const lang = localeTag();
  const groups = useSameContent<KNoteMoodGroup[]>(
    panelGroups(
      (g) => t(MOOD_GROUP_KEY[g]),
      (id) => moodName(id),
      (s) => s.toLocaleUpperCase(lang),
    ),
  );
  const rev = useRev(groups);

  const on = cardsOn(state.att, state.hasMedia);
  const cards = useSameContent<KNoteMediaCard[]>([
    { kind: "photo", label: t("nc.photo"), enabled: on.photo, a11yValue: on.photo ? "" : t("nc.oneKind") },
    { kind: "video", label: t("nc.video"), enabled: on.video, a11yValue: on.video ? "" : t("nc.oneKind") },
    { kind: "voice", label: t("nc.audio"), enabled: on.voice, a11yValue: on.voice ? "" : t("nc.oneKind") },
  ]);

  const n = state.photos.length;
  const thumbs = useSameContent<KNoteThumb[]>(
    state.att === "photo"
      ? state.photos.map((p, i) => ({
          id: `${i}:${p.uri}`,
          kind: "photo" as const,
          image: { uri: p.uri, key: p.uri, kind: "image" as const },
          a11yLabel: t(i === 0 && n >= 2 ? "sc.a11y.photoCover" : "sc.a11y.photo", { i: i + 1, n }),
          a11yHint: t("sc.a11y.photoHint"),
        }))
      : state.att === "video" && state.mediaUri
        ? [{ id: `v:${state.mediaUri}`, kind: "video" as const, image: { uri: state.mediaUri, key: `poster:${state.mediaUri}`, kind: "videoPoster" as const }, a11yLabel: t("nc.video"), a11yHint: "" }]
        : [],
  );

  const seal = sealAction({ hasSomething: state.hasSomething, busy: state.busy, sealed: state.sealed, mood: state.mood });

  // Wren drawn by Swift ("notewren"): her content picture at 30, captured while the page is up
  const wrenSwift = useSwiftIsland("notewren", "KWrenPictureView", true);
  const wrenBird = useBirdImageRefs(wrenSwift ? ["note30"] : []).note30 ?? null;
  const wren = useSameContent<KWrenPictureData | null>(wrenSwift ? { image: wrenBird } : null);

  return (
    <View style={{ flex: 1 }}>
      <NoteSurface
        viewRef={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        wrenLine={state.wrenLine}
        mood={mood}
        panel={state.panel}
        groups={groups}
        openGroup={openGroupFor(state.mood)}
        chosenGroup={state.mood ? moodGroup(state.mood) : ""}
        chosenFace={chosenFaceOf(state.mood)}
        cards={cards}
        thumbs={thumbs}
        coverHint={state.att === "photo" && n >= 2}
        voice={voice}
        hasSomething={state.hasSomething}
        busy={state.busy}
        sealed={state.sealed}
        needsMood={seal === "askMood"}
        act={act}
        recUri={recUri}
        recDur={state.dur}
        islandWidth={Math.max(0, width - 44)}
        pieces={pieces}
        slot={slot}
        wren={wren}
      />
      {/* the recording and the take's player for the page's own Swift pieces (nothing drawn here) */}
      {voice && pieces.bar ? <VoiceBarDriver slot={slot} recUri={recUri} recDur={state.dur} onRecorded={act.recorded} onClear={act.clearRecording} /> : null}
      {voice && pieces.card && recUri ? <VoiceTakeDriver slot={slot} uri={recUri} durationS={state.dur} /> : null}
      <FrameViewer
        photos={state.photos}
        index={state.viewer}
        onClose={state.act.closeViewer}
        onCover={state.act.coverPhoto}
        onRemove={state.act.removePhoto}
      />
    </View>
  );
}

type Act = {
  close: () => void;
  textChange: (s: string) => void;
  fieldFocus: (f: boolean) => void;
  panel: (w: "plus" | "mood") => void;
  pickGroup: (g: "calm" | "happy" | "tired" | "low") => void;
  pickFace: (id: string) => void;
  card: (k: "photo" | "video" | "voice") => void;
  thumb: (i: number) => void;
  removeMedia: () => void;
  seal: (s: string) => void;
  wren: () => void;
  recorded: (uri: string, s: number) => void;
  clearRecording: () => void;
  sealEnd: () => void;
};

type SurfaceProps = {
  viewRef: (instance: KScreenHandle | null) => void;
  theme: KThemeKey;
  letterFont: LetterFontKey;
  insets: KInsets;
  rev: number;
  strings: KNoteComposeStrings;
  wrenLine: string;
  mood: KNoteMood;
  panel: KNotePanel;
  groups: KNoteMoodGroup[];
  openGroup: "calm" | "happy" | "tired" | "low";
  chosenGroup: "calm" | "happy" | "tired" | "low" | "";
  chosenFace: string;
  cards: KNoteMediaCard[];
  thumbs: KNoteThumb[];
  coverHint: boolean;
  voice: boolean;
  hasSomething: boolean;
  busy: boolean;
  sealed: boolean;
  needsMood: boolean;
  act: Act;
  recUri: string | null;
  recDur: number;
  islandWidth: number;
  /** which of the voice slot's pieces the page draws itself (fixed for the page) */
  pieces: { bar: boolean; card: boolean };
  slot: VoiceSlot;
  /** Wren drawn by Swift ("notewren"); null: the island */
  wren: KWrenPictureData | null;
};

/* The Host, the view and its islands, redrawn only when a prop changes (every prop is kept by
   content or is a primitive; act and the ref are made once). */
const NoteSurface = memo(function NoteSurface(p: SurfaceProps) {
  const { act } = p;
  return (
    <SurfaceHost field>
      <KNoteComposeView
        ref={p.viewRef}
        theme={p.theme}
        letterFont={p.letterFont}
        insets={p.insets}
        rev={p.rev}
        strings={p.strings}
        wrenLine={p.wrenLine}
        mood={p.mood}
        panel={p.panel}
        groups={p.groups}
        openGroup={p.openGroup}
        chosenGroup={p.chosenGroup}
        chosenFace={p.chosenFace}
        cards={p.cards}
        thumbs={p.thumbs}
        coverHint={p.coverHint}
        voice={p.voice}
        hasSomething={p.hasSomething}
        busy={p.busy}
        sealed={p.sealed}
        needsMood={p.needsMood}
        onClose={act.close}
        onTextChange={act.textChange}
        onFieldFocus={act.fieldFocus}
        onPanel={act.panel}
        onPickGroup={act.pickGroup}
        onPickFace={act.pickFace}
        onCard={act.card}
        onThumb={act.thumb}
        onRemoveMedia={act.removeMedia}
        onSeal={act.seal}
        onWren={act.wren}
        onSealEnd={act.sealEnd}
        onVoice={p.slot.action}
        wren={p.wren}
      >
        {/* every island on every render, in this order (Slot.tsx); Wren's is empty while Swift draws her */}
        <KIsland name="wren" style={{ width: 30, height: 30 }}>
          {p.wren ? null : <WrenIsland />}
        </KIsland>
        <KIsland name="recorder" interactive style={{ width: p.islandWidth }}>
          {p.voice ? <RecorderIsland recUri={p.recUri} recDur={p.recDur} act={act} pieces={p.pieces} /> : null}
        </KIsland>
      </KNoteComposeView>
    </SurfaceHost>
  );
});

/* Wren at 30, still and content, as the page has always set her (the reader's own bird: her skin,
   her accessory, her stage are WrenBird's). */
function WrenIsland() {
  return (
    <View style={{ width: 30, height: 30, alignItems: "center", justifyContent: "center" }}>
      <WrenBird size={30} mood="content" />
    </View>
  );
}

/* The Recorder (expo-audio, its permission and length alerts) and the take to listen back to.
   Whatever the page draws itself (pieces) is left out. */
function RecorderIsland({ recUri, recDur, act, pieces }: { recUri: string | null; recDur: number; act: Act; pieces: { bar: boolean; card: boolean } }) {
  return (
    <View style={{ gap: 10 }}>
      {pieces.bar ? null : <Recorder doneUri={recUri} doneDur={recDur} onDone={act.recorded} onClear={act.clearRecording} />}
      {recUri && !pieces.card ? <AudioCard url={recUri} durationS={recDur} compact /> : null}
    </View>
  );
}

export type { NoteComposeState };
