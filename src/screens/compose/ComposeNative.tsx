import { memo, useEffect, useMemo, useRef, useSyncExternalStore, type RefObject } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { KIsland, useKCommands, useRev, type KScreenHandle, type KInsets, type KThemeKey, type KWrenMoodsData, type LetterFontKey } from "../../../modules/kindredly-ui";
import {
  KComposeView,
  type KComposeCommands,
  type KComposeEnvelope,
  type KComposeLive,
  type KComposeMore,
  type KComposePaperHead,
  type KComposePaperItem,
  type KComposeSection,
  type KComposeCustomStamp,
  type KComposeStamp,
  type KComposeStrings,
} from "../../../modules/kindredly-ui/src/Compose";
import { SurfaceHost } from "../../components/NativeSurface";
import { WrenBird, type WrenMood } from "../../components/WrenBird";
import { useBreathe } from "../../components/anim";
import { Recorder } from "../../components/Recorder";
import { AudioCard } from "../../components/AudioCard";
import { VoiceBarDriver, VoiceTakeDriver, createVoiceSlot, useVoicePieces, type VoiceSlot } from "../../components/VoiceSlot";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { COMPOSE_WREN_MOODS, composeWrenPose, useBirdImageRefs } from "../../lib/bird-images";
import { useSwiftIsland } from "../../lib/swift-island";
import { getLang, t, useLang } from "../../lib/i18n";
import { useAuth } from "../../lib/auth";
import { swiftReadsFold, useFoldFrame } from "../../lib/fold";
import { frostSpec } from "../../lib/frost";
import { localeTag } from "../../lib/format";
import { strangerName } from "../../lib/stranger-name";
import { zodiacFromDob } from "../../lib/zodiac";
import { showsSign } from "../edit-profile/edit-profile-model";
import "../../data/strings-onboarding2";
import "../../data/strings-stamps2";
import type { ComposeActions, ComposeState } from "./useComposeState";

/* THE COMPOSE PAGE IN SWIFTUI (10a step 5): one Host for the whole page
   (SurfaceHost field: flex 1, the keyboard's safe area kept so the toolbar
   rides the keyboard, light or dark from the theme, the crash breadcrumb's
   layout report), holding KComposeView and its two islands — Wren, and the
   Recorder while speaking. No other Host, no RNHostView but the islands.

   This file only turns the shared state (useComposeState, the same one the
   React Native fallback draws) into the Swift view's props and commands:
   - the props are what changes rarely (the words of the page, the stamp,
     the mode, the tray and its sections, the cells, the quota, the cap
     panel), kept by content so a keystroke never re-sends them — the page
     itself is memoised, so typing re-renders this file and nothing native;
   - what changes as the letter is typed (Wren's line, the key, the count)
     goes as the `composer` command, sent when it changes and again whenever
     the view attaches (a fresh view knows nothing);
   - the words go to Swift only when they come from elsewhere: on attach
     (latest(): the page's first words, or everything TS still holds after a
     remount — a failed send never loses a word) and on a seed (a draft
     resumed); never an echo of typing, which would land on a composition;
   - focus: the editor on the first attach (the page opens straight to
     writing, after the slide-up has begun), the question when it is
     attached; blur comes from the shared state's sheets (blurThen with this
     view's ref) and from the page itself before a tray or the key;
   - Wren's mood reaches her island through a small store, so a mood change
     redraws the bird and nothing else;
   - the voice slot (components/VoiceSlot): with the "recorder" or
     "audiocard" switch on, the page draws the recording bar or the take's
     card itself, told by the `recorder` command (VoiceBarDriver and
     VoiceTakeDriver hold the recording and the player, beside the Host),
     and the island keeps only what is still React Native;
   - Wren herself in Swift (batch 3, "composewren", off by default): her snapshot in every mood
     goes as the `wren` prop (lib/bird-images compose-<mood>, 38, captured while the page is up),
     her mood as the `wrenMood` command (on change and on attach, like `composer`), and Swift
     breathes and zooms the picture (KBreathingWren); the island stays, empty. */

/** A value outside React's render, for an island that must update without its parents. */
function createValueStore<T>(initial: T) {
  let value = initial;
  const subs = new Set<() => void>();
  return {
    get: () => value,
    set: (next: T) => {
      if (Object.is(next, value)) return;
      value = next;
      subs.forEach((f) => f());
    },
    subscribe: (f: () => void) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
  };
}
type ValueStore<T> = ReturnType<typeof createValueStore<T>>;

/** The same value back while its content is the same (JSON), so a rebuilt but unchanged prop
    keeps its identity and isn't re-sent to Swift. */
function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

const NO_STAMP: KComposeStamp = { id: "", name: "", washHex: "", inkHex: "", lineHex: "", a11yLabel: "", hex: "" };

export function ComposeNative({ state, viewRef }: { state: ComposeState; viewRef: RefObject<KScreenHandle | null> }) {
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const { width } = useWindowDimensions();

  /* THE ENVELOPE, FOR THE LEFT PAGE (iPhone Duo's inner screen; KComposePage, THE SPREAD). You,
     as a stranger will see you on this letter: the courier name, the frosted window, the star
     sign when you show it, today's date and the line onboarding's envelope is addressed with.
     Never ♀ / ♂ (a stranger never sees one). null everywhere else: nothing is built or sent. */
  const lang = useLang();
  const frame = useFoldFrame();
  const spread = !!frame.pages && swiftReadsFold();
  const { user, profile } = useAuth();
  const uid = user?.id ?? null;
  const dob = typeof profile?.dob === "string" ? (profile.dob as string) : null;
  const signShown = showsSign(profile?.showSign);
  const envelope = useMemo<KComposeEnvelope | null>(() => {
    if (!spread) return null;
    const name = uid ? strangerName(uid, { lang: getLang(), unsigned: "" }) : "";
    let date = "";
    try {
      date = new Intl.DateTimeFormat(localeTag(), { month: "short", day: "numeric" }).format(new Date()).toLocaleUpperCase(localeTag());
    } catch (e) {
      console.warn("[compose] the envelope's date couldn't be formatted:", e);
      const d = new Date();
      date = `${d.getMonth() + 1}/${d.getDate()}`;
    }
    return {
      name,
      frost: uid ? frostSpec(uid) : null,
      sign: (signShown ? zodiacFromDob(dob) : null) ?? "",
      date,
      to: t("ob2.stamp.to"),
      a11y: t("ob2.stamp.envA11y", { name }),
    };
    // lang: the name, the date and the two lines follow the language on screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread, uid, dob, signShown, lang]);

  // the live state, sent when it changes (and on attach)
  const live: KComposeLive = {
    wrenLine: state.wrenLine,
    key: state.key,
    count: state.count ?? { text: "", tone: "mute" },
  };
  const liveJson = JSON.stringify(live);
  const sentLive = useRef<{ json: string; live: KComposeLive } | null>(null);
  const firstAttach = useRef(true);

  const commands = useKCommands<KComposeCommands>(viewRef, {
    blurOnUnmount: true,
    onViewAttach: () => {
      // a fresh view starts empty: what TS holds, then the live state
      const words = state.latest();
      commands.send("setText", { target: "body", value: words.text });
      commands.send("setText", { target: "ask", value: words.ask });
      if (sentLive.current) commands.send("composer", sentLive.current.live);
      // her face, for the Swift-drawn Wren (an older binary ignores the command)
      commands.send("wrenMood", { mood: moodStore.get() });
      slot.resend();
      // (owner, 2026-10-20) the page opens with the keyboard down: the page, Wren and the paper are
      // seen first, and a tap on the placeholder brings the keyboard up
      if (firstAttach.current) firstAttach.current = false;
    },
  });

  useEffect(() => {
    if (sentLive.current?.json === liveJson) return;
    const next = JSON.parse(liveJson) as KComposeLive;
    sentLive.current = { json: liveJson, live: next };
    commands.send("composer", next);
  }, [liveJson, commands]);

  // words from elsewhere (a draft resumed)
  const seenSeed = useRef(state.seed.serial);
  useEffect(() => {
    if (state.seed.serial === seenSeed.current) return;
    seenSeed.current = state.seed.serial;
    if (state.seed.text !== null) commands.send("setText", { target: "body", value: state.seed.text });
    if (state.seed.ask !== null) commands.send("setText", { target: "ask", value: state.seed.ask });
  }, [state.seed, commands]);

  // a field to focus (the question, just attached)
  const seenFocus = useRef(state.focus.serial);
  useEffect(() => {
    if (state.focus.serial === seenFocus.current) return;
    seenFocus.current = state.focus.serial;
    commands.send("focus", { target: state.focus.target });
  }, [state.focus, commands]);

  // the voice slot: which pieces Swift draws (once), and what they show
  const pieces = useVoicePieces();
  const slot = useMemo(() => createVoiceSlot(pieces, (cmd) => commands.send("recorder", cmd)), [pieces, commands]);
  slot.take = !!state.recUri;
  const speaking = state.mode === "speak";

  // Wren's mood, to her island alone (the store is made once; the effect keeps it current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const moodStore = useMemo(() => createValueStore<WrenMood>(state.wrenMood), []);
  useEffect(() => moodStore.set(state.wrenMood), [state.wrenMood, moodStore]);

  // Wren drawn by Swift ("composewren"): every mood's picture, and the mood as a command
  const wrenSwift = useSwiftIsland("composewren", "KWrenPictureView", true);
  const wrenBirds = useBirdImageRefs(wrenSwift ? COMPOSE_WREN_MOODS.map(composeWrenPose) : []);
  const wren = useSameContent<KWrenMoodsData | null>(
    wrenSwift ? { moods: COMPOSE_WREN_MOODS.map((mood) => ({ mood, image: wrenBirds[composeWrenPose(mood)] ?? null })) } : null,
  );
  useEffect(() => {
    if (wrenSwift) commands.send("wrenMood", { mood: state.wrenMood });
  }, [wrenSwift, state.wrenMood, commands]);

  const strings = useSameContent<KComposeStrings>({
    title: t("cp.header"),
    closeLabel: t("wren.trackClose"),
    stampLabel: t("cp.stamp.a11y"),
    plusLabel: t("cp.plus.a11y"),
    editorLabel: t("cp.editor.a11y"),
    placeholder: state.spark,
    captionPlaceholder: t("cp.voiceLine.ph"),
    voiceNote: t("cp.voiceNote", { wren: state.wrenName }),
    askLabel: t("cp.askLabel"),
    askPlaceholder: t("cp.askPh"),
    moreAsk: t("cp.tray.ask"),
    moreVoice: t("cp.tray.voice"),
    voiceLocked: t("cp.voiceLocked.a11y"),
    askDisabled: t("cp.askVoice.a11y"),
    capText: state.capText,
    capSub: t("cp.repliesFree"),
    capLink: t("cp.discover"),
    trayTabOfficial: t("cs2.tray.tabOfficial"),
    trayTabCustom: t("cs2.tray.tabCustom"),
    trayCustomHead: t("cs2.tray.custom"),
    trayCustomEmpty: t("cs2.tray.empty"),
    trayMake: t("cs2.use.a11yMake"),
    trayFullTitle: state.customFullTitle,
    trayFullCta: t("cs2.me.fullCta"),
    trayNotNow: t("cs2.me.notNow"),
    paperKey: t("pp.a11y.key"),
    paperDone: t("pp.strip.done"),
    badgeFirst: t("pp.badge.fc"),
    // the stamp strip (Let it travel L6): PICK A STAMP, and the paper strip's DONE
    stampStripHead: state.stripHead,
    stampStripDone: t("pp.strip.done"),
  });

  const vm = state.chosenVM;
  const stamp = useSameContent<KComposeStamp>(
    vm ? { id: vm.id, name: vm.tag, washHex: vm.wash, inkHex: vm.ink, lineHex: vm.line, a11yLabel: t("cp.stampChosen.a11y", { name: vm.name }), hex: vm.color } : NO_STAMP,
  );
  const customStamps = useSameContent<KComposeCustomStamp[]>(state.custom.items);
  const sections = useSameContent<KComposeSection[]>(state.sections);
  const rev = useRev(sections);
  const more = useSameContent<KComposeMore>(state.more);
  const papers = useSameContent<KComposePaperItem[]>(state.papers);
  const paperHead = useSameContent<KComposePaperHead>(state.paperHead);

  return (
    <>
      <ComposeSurface
        viewRef={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        stamp={stamp}
        mode={state.mode}
        tray={state.tray ?? "none"}
        sections={sections}
        askOn={state.askOpen}
        more={more}
        plusDot={state.plusDot}
        quota={state.quota}
        envelope={envelope}
        capPanel={state.capPanel}
        busy={state.busy}
        trayTab={state.trayTab}
        customState={state.custom.state}
        customStamps={customStamps}
        customFull={state.custom.full}
        paper={state.paper}
        papers={papers}
        paperHead={paperHead}
        act={state.act}
        moodStore={moodStore}
        recUri={state.recUri}
        recDur={state.recDur}
        islandWidth={Math.max(0, width - 44)}
        pieces={pieces}
        slot={slot}
        wren={wren}
      />
      {/* the recording and the take's player for the page's own Swift pieces (nothing drawn here) */}
      {speaking && pieces.bar ? (
        <VoiceBarDriver slot={slot} recUri={state.recUri} recDur={state.recDur} onRecorded={state.act.recorded} onClear={state.act.clearRecording} />
      ) : null}
      {speaking && pieces.card && state.recUri ? <VoiceTakeDriver slot={slot} uri={state.recUri} durationS={state.recDur} /> : null}
    </>
  );
}

type SurfaceProps = {
  viewRef: (instance: KScreenHandle | null) => void;
  theme: KThemeKey;
  letterFont: LetterFontKey;
  insets: KInsets;
  rev: number;
  strings: KComposeStrings;
  stamp: KComposeStamp;
  mode: "write" | "speak";
  tray: "none" | "stamps" | "more" | "paper";
  sections: KComposeSection[];
  askOn: boolean;
  more: KComposeMore;
  plusDot: boolean;
  quota: string;
  envelope: KComposeEnvelope | null;
  capPanel: boolean;
  busy: boolean;
  trayTab: "official" | "custom";
  customState: "hidden" | "empty" | "list";
  customStamps: KComposeCustomStamp[];
  customFull: boolean;
  paper: string;
  papers: KComposePaperItem[];
  paperHead: KComposePaperHead;
  act: ComposeActions;
  moodStore: ValueStore<WrenMood>;
  recUri: string | null;
  recDur: number;
  islandWidth: number;
  /** which of the voice slot's pieces the page draws itself (fixed for the page) */
  pieces: { bar: boolean; card: boolean };
  slot: VoiceSlot;
  /** Wren drawn by Swift ("composewren"); null: the island */
  wren: KWrenMoodsData | null;
};

/* The Host, the view and its islands, redrawn only when a slow prop changes
   (every prop here is kept by content or is a primitive; act, the store and
   the ref are the page's own, made once). */
const ComposeSurface = memo(function ComposeSurface(p: SurfaceProps) {
  const { act } = p;
  return (
    <SurfaceHost field>
      <KComposeView
        ref={p.viewRef}
        theme={p.theme}
        letterFont={p.letterFont}
        insets={p.insets}
        rev={p.rev}
        strings={p.strings}
        stamp={p.stamp}
        mode={p.mode}
        tray={p.tray}
        sections={p.sections}
        askOn={p.askOn}
        more={p.more}
        plusDot={p.plusDot}
        quota={p.quota}
        envelope={p.envelope}
        capPanel={p.capPanel}
        busy={p.busy}
        trayTab={p.trayTab}
        customState={p.customState}
        customStamps={p.customStamps}
        customFull={p.customFull}
        paper={p.paper}
        papers={p.papers}
        paperHead={p.paperHead}
        onClose={act.close}
        onTextChange={act.textChange}
        onTray={act.openTray}
        onPickStamp={act.pickStamp}
        onAskToggle={act.toggleAsk}
        onVoiceToggle={act.toggleVoice}
        onKeyPress={act.keyPress}
        onCapLink={act.capLink}
        onFieldFocus={act.fieldFocus}
        onTrayTab={act.pickTrayTab}
        onMakeStamp={act.makeStamp}
        onFullCta={act.fullCta}
        onPickPaper={act.pickPaper}
        onPaperUpgrade={act.paperUpgrade}
        onVoice={p.slot.action}
        wren={p.wren}
      >
        {/* every island on every render, in this order (Slot.tsx); Wren's is empty while Swift draws her */}
        <KIsland name="wren" style={{ width: 46, height: 46 }}>
          {p.wren ? null : <WrenIsland store={p.moodStore} />}
        </KIsland>
        <KIsland name="recorder" interactive style={{ width: p.islandWidth }}>
          {p.mode === "speak" ? <RecorderIsland recUri={p.recUri} recDur={p.recDur} act={act} pieces={p.pieces} /> : null}
        </KIsland>
      </KComposeView>
    </SurfaceHost>
  );
});

/* Wren bare, as the App Store page set her (owner, 2026-10-18): the
   reader's own bird (skin, accessory, stage) at 38 in a 46 frame, no circle
   behind her, her mood read off the letter as it is typed — a small zoom
   when it changes — and her breathing, 6 up and back over 2.6s, as
   ComposeRN's. */
function WrenIsland({ store }: { store: ValueStore<WrenMood> }) {
  const mood = useSyncExternalStore(store.subscribe, store.get);
  const breathe = useBreathe(6, 2600);
  return (
    <Animated.View key={mood} entering={ZoomIn.duration(340)} style={[breathe, { width: 46, height: 46, alignItems: "center", justifyContent: "center" }]}>
      <WrenBird size={38} mood={mood} />
    </Animated.View>
  );
}

/* The Recorder (expo-audio, its permission and length alerts) and the take
   to listen back to. It sizes itself; the island's width is the page's.
   Whatever the page draws itself (pieces) is left out. */
function RecorderIsland({ recUri, recDur, act, pieces }: { recUri: string | null; recDur: number; act: ComposeActions; pieces: { bar: boolean; card: boolean } }) {
  return (
    <View style={{ gap: 12 }}>
      {pieces.bar ? null : <Recorder doneUri={recUri} doneDur={recDur} onDone={act.recorded} onClear={act.clearRecording} />}
      {recUri && !pieces.card ? <AudioCard url={recUri} durationS={recDur} compact /> : null}
    </View>
  );
}
