import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWindowDimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KCourierView, type KCourierFace, type KCourierFirstClass, type KCourierKeepsake, type KCourierTile } from "../../../modules/kindredly-ui/src/Courier";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { flightPose, heroPose, rackAccessoryPose, rackSkinPose, stagePose, useBirdImageRef, useBirdImageRefs } from "../../lib/bird-images";
import "../../data/strings-journey"; // wren.journey.yours
import { imageRecord, useAssetImageRefs } from "../../lib/images";
import type { WrenMood } from "../../components/WrenBird";
import { DOZE_MOOD, DROP_MOOD, HELD_MOOD, TAP_MOODS } from "./courier-model";
import { useCourierModel } from "./useCourierModel";
import { PALETTE, daylight } from "../../components/courier-card-model";
import { saveRun, useFlightBest } from "../../lib/free-flight";
import { replanLocal } from "../../lib/local-push";
import { t } from "../../lib/i18n";
import { FLIGHT_MOODS, flightStage, flightStrings, freeFlightData } from "./free-flight-model";

/* WREN'S JOURNEY IN SWIFTUI (owner, 2026-10-26; ships in binary 1.2.6,
   App Store 1.0.7): one Host holding KCourierView, behind the "courier"
   switch (app/courier, NativeSurface in mount mode). The reads and the
   words are useCourierModel's / courier-model's; this file turns them into
   the Swift records and hands her over as pictures:
     · the perch: her own WrenBird at 186 in every face the perch can show
       (her whereabouts' face, the tap faces, the pick-up, the drop and the
       doze), greyed when she's starving, bare when React Native draws her
       bare (lib/bird-images heroPose);
     · the rack: only the row that is open (onRack), each coat wearing her
       piece, each piece on her coat, at the rack's 46;
     · the First Class stamp (fcFree / fcMember, as Me's);
     · the keepsakes' own icons (bundled PNGs, useAssetImageRefs).
   The status bar reads her sky while the cover is under it (light text on
   the night sky, dark on the day skies), as the React Native page's does;
   Swift says when the cover leaves (onUnderSky).

   Play: with `swiftGame` (batch 3, the "freeflight" switch and a binary with
   KFreeFlightView) the game is Swift's, played on this page's cover while
   `play` (Portable/Courier/KFreeFlight.swift; the records in
   free-flight-model): her three faces at 46 are captured while she can play,
   a finished run is saved here (lib/free-flight saveRun, then her day-off
   push re-planned, as the React Native game does) and the × says `onPlayEnd`.
   Without it Play is the React Native game: `onPlay` hands the page to the
   React Native one, which opens Free Flight on its cover (app/courier). */

function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

export function CourierNative({
  onPlay,
  swiftGame = false,
  play = false,
  onPlayEnd,
}: {
  onPlay: () => void;
  /** Free Flight is Swift's (the "freeflight" switch, the binary has it) */
  swiftGame?: boolean;
  /** Swift's game is open */
  play?: boolean;
  /** Swift's game was closed (its ×) */
  onPlayEnd?: () => void;
}) {
  const { key: theme, dark } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);
  const m = useCourierModel();
  const { view } = m;

  /* her faces on the perch: the base one first (captured first), then the rest */
  const faceMoods = useMemo<WrenMood[]>(() => Array.from(new Set([view.hero.mood, ...TAP_MOODS, HELD_MOOD, DROP_MOOD, DOZE_MOOD])), [view.hero.mood]);
  const heroPoses = useMemo(() => faceMoods.map((mood) => heroPose(mood, view.hero.bare)), [faceMoods, view.hero.bare]);
  const heroBirds = useBirdImageRefs(heroPoses, { wilt: view.hero.wilt });

  /* the rack's open row only */
  /* starts on LOOKS, as the Swift page does (owner on TestFlight 1.2.8, 2026-11-10: the rack is open when the page opens) */
  const [rack, setRack] = useState<"looks" | "dress" | "">("looks");
  const rackPoses = useMemo(() => (rack === "looks" ? m.skins.map(rackSkinPose) : rack === "dress" ? m.pieces.map(rackAccessoryPose) : []), [rack, m.skins, m.pieces]);
  const rackBirds = useBirdImageRefs(rackPoses);
  const fcBird = useBirdImageRef(view.firstClass.pose);
  const icons = useAssetImageRefs(m.shelfIcons);

  const strings = useSameContent(view.strings);
  const cover = useSameContent(view.cover);
  const hero = useSameContent(
    useMemo(
      () => ({
        mood: view.hero.mood,
        faces: faceMoods.map<KCourierFace>((mood, i) => ({ mood, bird: imageRecord(heroBirds[heroPoses[i]]) })),
        state: view.hero.state,
        stage: view.hero.stage,
        wilt: view.hero.wilt,
        label: view.name,
      }),
      [view.hero, view.name, faceMoods, heroPoses, heroBirds],
    ),
  );
  const band = useSameContent(view.band);
  const slip = useSameContent(view.slip);
  const log = useSameContent(view.log);
  const facts = useSameContent(view.facts);
  /* the journey's three forms (owner, 2026-10-26: "she grows"), in her coat */
  const stagePoses = useMemo(() => view.journey.map((s) => stagePose(s.id)), [view.journey]);
  const stageBirds = useBirdImageRefs(stagePoses);
  const journey = useSameContent(view.journey.map((s, i) => ({ ...s, bird: imageRecord(stageBirds[stagePoses[i]]) })));
  const keepsakes = useSameContent(
    useMemo(() => view.keepsakes.map<KCourierKeepsake>((k) => ({ ...k, icon: imageRecord(icons[k.id]) })), [view.keepsakes, icons]),
  );
  const cells = useSameContent(view.cells);
  // the tiles come in the rack's own order (m.skins, m.pieces), so the open row's poses line up
  const looks = useSameContent(
    useMemo(
      () => view.rack.looks.map<KCourierTile>((tile, i) => ({ ...tile, bird: imageRecord(rack === "looks" ? rackBirds[rackPoses[i]] : null) })),
      [rack, view.rack.looks, rackBirds, rackPoses],
    ),
  );
  const dress = useSameContent(
    useMemo(
      () => view.rack.dress.map<KCourierTile>((tile, i) => ({ ...tile, bird: imageRecord(rack === "dress" ? rackBirds[rackPoses[i]] : null) })),
      [rack, view.rack.dress, rackBirds, rackPoses],
    ),
  );
  const firstClass = useSameContent<KCourierFirstClass>(
    useMemo(
      () => ({
        eyebrow: view.firstClass.eyebrow,
        headline: view.firstClass.headline,
        rows: view.firstClass.rows,
        cta: view.firstClass.cta,
        trial: view.firstClass.trial,
        stampLabel: view.firstClass.stampLabel,
        bird: imageRecord(fcBird),
        member: view.firstClass.member,
      }),
      [view.firstClass, fcBird],
    ),
  );
  /* FREE FLIGHT IN SWIFT: the hour's course, her three faces (only while she can play) and the best */
  const { height: winH } = useWindowDimensions();
  const best = useFlightBest()?.gates ?? 0;
  const fStage = flightStage(view.hero.stage);
  const canFly = swiftGame && view.cover.canPlay && fStage != null;
  const flightPoses = useMemo(() => (canFly && fStage ? FLIGHT_MOODS.map((mood) => flightPose(fStage, mood)) : []), [canFly, fStage]);
  const flightBirds = useBirdImageRefs(flightPoses);
  const hour = daylight();
  const flight = useSameContent(
    useMemo(
      () =>
        swiftGame && fStage
          ? freeFlightData({
              hour,
              palette: PALETTE[hour],
              winH,
              best,
              birds: Object.fromEntries(FLIGHT_MOODS.map((mood) => [mood, flightBirds[flightPose(fStage, mood)] ?? null])),
              strings: flightStrings(t),
            })
          : null,
      // view.strings: the words follow the language as the page's do
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [swiftGame, fStage, hour, winH, best, flightBirds, view.strings],
    ),
  );
  /* the game opens once her three faces are in (or after 1.5 s at most): opened straight from
     Today's day's end or the day-off push, the pictures are captured as the page mounts, and the
     first second of the cover had no bird in the sky (simulator pass, 2026-11-09) */
  const birdsIn = !!fStage && FLIGHT_MOODS.every((mood) => !!flightBirds[flightPose(fStage, mood)]);
  const [waitedOut, setWaitedOut] = useState(false);
  useEffect(() => {
    if (!play || birdsIn) return;
    const id = setTimeout(() => setWaitedOut(true), 1500);
    return () => clearTimeout(id);
  }, [play, birdsIn]);
  const flightOpen = play && (birdsIn || waitedOut);
  const onFlightRun = useCallback((gates: number, pace: number) => {
    // kept once, the best updated; a game played: no day-off race for a week, and the next one carries the new best
    void saveRun({ gates, pace })
      .then(() => replanLocal({ force: true }))
      .catch((e) => console.warn("[free-flight] saving a Swift run:", e));
  }, []);
  const rev = useRev(strings, cover, hero, band, slip, log, facts, journey, keepsakes, cells, looks, dress, firstClass, flight, flightOpen);

  /* the status bar on her sky, while the cover is under it and this page is in front */
  const focused = useIsFocused();
  const [underSky, setUnderSky] = useState(true);
  const onUnderSky = useCallback((under: boolean) => setUnderSky(under), []);
  const onRack = useCallback((open: "looks" | "dress" | "") => setRack(open), []);

  return (
    <>
      {/* over the sky: the sky's own bar (light at night); past it, the page's (Swift paints the strip
          lav2 there, 2026-10-26: the clock stayed white on it) */}
      {focused && <StatusBar style={underSky ? (m.night ? "light" : "dark") : dark ? "light" : "dark"} />}
      <SurfaceHost>
        <KCourierView
          ref={commands.ref}
          theme={theme}
          letterFont={letterFont}
          insets={insets}
          rev={rev}
          strings={strings}
          cover={cover}
          hero={hero}
          band={band}
          slip={slip}
          log={log}
          name={view.name}
          kindLine={view.kindLine}
          facts={facts}
          journey={journey}
          keepsakes={keepsakes}
          cells={cells}
          looks={looks}
          dress={dress}
          firstClass={firstClass}
          onBack={m.actions.back}
          onPlay={onPlay}
          onSlipGo={m.actions.slipGo}
          onKeepsake={m.actions.keepsake}
          onAllKeepsakes={m.actions.allKeepsakes}
          onLook={m.actions.look}
          onDress={m.actions.dress}
          onFirstClass={m.actions.firstClass}
          onRack={onRack}
          onUnderSky={onUnderSky}
          flight={flight}
          flightOpen={flightOpen}
          onPlayEnd={onPlayEnd}
          onFlightRun={onFlightRun}
        />
      </SurfaceHost>
    </>
  );
}
