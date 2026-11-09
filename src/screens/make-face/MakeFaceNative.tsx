import { memo, useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { KIsland, useKCommands, useRev, type KInsets, type KScreenHandle, type KThemeKey, type KWrenPictureData, type LetterFontKey } from "../../../modules/kindredly-ui";
import {
  KMakeFaceView,
  makeFaceWrenSize,
  type KMakeFaceChipGroup,
  type KMakeFaceCommands,
  type KMakeFaceScreen,
  type KMakeFaceStrings,
} from "../../../modules/kindredly-ui/src/MakeFace";
import type { KImageRefProps } from "../../../modules/kindredly-ui/src/types";
import { SurfaceHost } from "../../components/NativeSurface";
import { WrenBird, type WrenMood } from "../../components/WrenBird";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { useBirdImageRefs } from "../../lib/bird-images";
import { FACE_WREN_POSES, faceWrenPose } from "../../lib/last-islands";
import { useSwiftIsland } from "../../lib/swift-island";
import type { MakeFaceActions, MakeFaceModel } from "./useMakeFaceModel";

/* MAKE YOUR OWN FACE IN SWIFTUI (owner, 2026-10-26). One Host for the whole flow (SurfaceHost
   field: the words screen's field keeps the keyboard's safe area, so the card rides it), holding
   KMakeFaceView and its one island, Wren — React Native's own WrenBird in the mood the screen
   asks for, at the size Swift lays her out (makeFaceWrenSize). The route is transparent: the dim
   and the floating card are Swift's, the screen below shows through.

   This file only turns useMakeFaceModel into the Swift view's props:
   - props kept by content, so a re-render that changes nothing sends nothing native;
   - the words live in the Swift field; the words screen asks for the keyboard once it shows;
   - Wren herself in Swift (batch 3, "facewren", off by default): her snapshot for the screen
     (lib/last-islands faceWrenPose: curious 72, content 64, delighted 56; all three captured while
     the page is up, so a new screen never waits) goes as the `wren` prop, and Swift draws it at
     the island's size and bobs it as it bobbed the island; the island stays, empty. */

function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

/** Wren's face on each screen (the design: curious asking, content painting, delight at the end). */
const WREN_MOOD: Partial<Record<KMakeFaceScreen, WrenMood>> = {
  intro: "curious",
  rejected: "curious",
  failed: "curious",
  generating: "content",
  signin: "content",
  done: "delight",
};

export function MakeFaceNative({ model }: { model: MakeFaceModel }) {
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands<KMakeFaceCommands>(ref, { blurOnUnmount: true });
  const screen = model.screen ?? "intro";

  // the words screen raises the keyboard (a focus asked before the field exists waits for it)
  useEffect(() => {
    if (screen === "words") commands.send("focus", { target: "words" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // the page's actions, one object for its life (the surface is memoised on it)
  const live = useRef(model.act);
  live.current = model.act;
  const act = useMemo<MakeFaceActions>(
    () => ({
      close: () => live.current.close(),
      start: () => live.current.start(),
      method: (k) => live.current.method(k),
      retake: () => live.current.retake(),
      usePhoto: () => live.current.usePhoto(),
      draw: (s) => live.current.draw(s),
      leave: () => live.current.leave(),
      accept: () => live.current.accept(),
      another: () => live.current.another(),
      pickInstead: () => live.current.pickInstead(),
      done: () => live.current.done(),
      retry: () => live.current.retry(),
      rejectPrimary: () => live.current.rejectPrimary(),
      rejectSecondary: () => live.current.rejectSecondary(),
      firstClass: () => live.current.firstClass(),
      notNow: () => live.current.notNow(),
      apple: () => live.current.apple(),
      google: () => live.current.google(),
      later: () => live.current.later(),
      choose: (i) => live.current.choose(i),
      knockAllow: () => live.current.knockAllow(),
      knockWatch: () => live.current.knockWatch(),
      knockAsk: () => live.current.knockAsk(),
    }),
    [],
  );

  const strings = useSameContent(model.strings);
  const chips = useSameContent(model.chips);
  const genLines = useSameContent(model.genLines);
  const photo = useSameContent(model.photo);
  const result = useSameContent(model.result);
  const quotaFace = useSameContent(model.quotaFace);
  const choices = useSameContent(model.choices);
  const rev = useRev(chips);

  // Wren drawn by Swift ("facewren"): the screen's picture
  const wrenSwift = useSwiftIsland("facewren", "KWrenPictureView", true);
  const wrenBirds = useBirdImageRefs(wrenSwift ? FACE_WREN_POSES : []);
  const wrenPose = faceWrenPose(screen);
  const wren = useSameContent<KWrenPictureData | null>(wrenSwift ? { image: (wrenPose && wrenBirds[wrenPose]) || null } : null);

  // nothing until the first screen is known: the route's own ground is clear, so the screen below shows
  if (!model.screen) return <View style={{ flex: 1 }} />;

  return (
    <FaceSurface
      viewRef={commands.ref}
      theme={theme}
      letterFont={letterFont}
      insets={insets}
      rev={rev}
      screen={screen}
      entry={model.from}
      strings={strings}
      chips={chips}
      genLines={genLines}
      minor={model.minor}
      firstClass={model.firstClass}
      appleAvailable={model.appleAvailable}
      busy={model.busy}
      photo={photo}
      result={result}
      quotaFace={quotaFace}
      choices={choices}
      choice={model.choice}
      knock={model.knock}
      act={act}
      wren={wren}
    />
  );
}

type SurfaceProps = {
  viewRef: (instance: KScreenHandle | null) => void;
  theme: KThemeKey;
  letterFont: LetterFontKey;
  insets: KInsets;
  rev: number;
  screen: KMakeFaceScreen;
  entry: "onboarding" | "me";
  strings: KMakeFaceStrings;
  chips: KMakeFaceChipGroup[];
  genLines: string[];
  minor: boolean;
  firstClass: boolean;
  appleAvailable: boolean;
  busy: boolean;
  photo: KImageRefProps | null;
  result: KImageRefProps | null;
  quotaFace: KImageRefProps | null;
  choices: KImageRefProps[];
  choice: number;
  knock: "ask" | "watch" | "on" | "off";
  act: MakeFaceActions;
  /** Wren drawn by Swift ("facewren"); null: the island */
  wren: KWrenPictureData | null;
};

/* The Host, the view and its island, redrawn only when a prop changes. */
const FaceSurface = memo(function FaceSurface(p: SurfaceProps) {
  const { act } = p;
  const size = makeFaceWrenSize(p.screen);
  const mood = WREN_MOOD[p.screen] ?? "content";
  return (
    <SurfaceHost field>
      <KMakeFaceView
        ref={p.viewRef}
        theme={p.theme}
        letterFont={p.letterFont}
        insets={p.insets}
        rev={p.rev}
        screen={p.screen}
        entry={p.entry}
        strings={p.strings}
        chips={p.chips}
        genLines={p.genLines}
        minor={p.minor}
        firstClass={p.firstClass}
        appleAvailable={p.appleAvailable}
        busy={p.busy}
        wordsMax={120}
        photo={p.photo}
        result={p.result}
        quotaFace={p.quotaFace}
        choices={p.choices}
        choice={p.choice}
        onChoose={act.choose}
        knock={p.knock}
        onKnockAllow={act.knockAllow}
        onKnockWatch={act.knockWatch}
        onKnockAsk={act.knockAsk}
        onClose={act.close}
        onStart={act.start}
        onMethod={act.method}
        onRetake={act.retake}
        onUsePhoto={act.usePhoto}
        onDraw={act.draw}
        onLeave={act.leave}
        onAccept={act.accept}
        onAnother={act.another}
        onPickInstead={act.pickInstead}
        onDone={act.done}
        onRetry={act.retry}
        onRejectPrimary={act.rejectPrimary}
        onRejectSecondary={act.rejectSecondary}
        onFirstClass={act.firstClass}
        onNotNow={act.notNow}
        onApple={act.apple}
        onGoogle={act.google}
        onLater={act.later}
        wren={p.wren}
      >
        {/* every island on every render (Slot.tsx); empty on the screens without her */}
        <KIsland name="wren" style={{ width: size, height: size }}>
          {size > 0 && !p.wren ? (
            <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
              <WrenBird size={size} mood={mood} />
            </View>
          ) : null}
        </KIsland>
      </KMakeFaceView>
    </SurfaceHost>
  );
});
