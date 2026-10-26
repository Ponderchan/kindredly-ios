import { useCallback, useMemo, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KCourierView, type KCourierFace, type KCourierFirstClass, type KCourierKeepsake, type KCourierTile } from "../../../modules/kindredly-ui/src/Courier";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { heroPose, rackAccessoryPose, rackSkinPose, useBirdImageRef, useBirdImageRefs } from "../../lib/bird-images";
import { imageRecord, useAssetImageRefs } from "../../lib/images";
import type { WrenMood } from "../../components/WrenBird";
import { DOZE_MOOD, DROP_MOOD, HELD_MOOD, TAP_MOODS } from "./courier-model";
import { useCourierModel } from "./useCourierModel";

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

   Play is the React Native game: `onPlay` hands the page to the React Native
   one, which opens Free Flight on its cover (app/courier). */

function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

export function CourierNative({ onPlay }: { onPlay: () => void }) {
  const { key: theme } = useTheme();
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
  const [rack, setRack] = useState<"looks" | "dress" | "">("");
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
  const journey = useSameContent(view.journey);
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
  const rev = useRev(strings, cover, hero, band, slip, log, facts, journey, keepsakes, cells, looks, dress, firstClass);

  /* the status bar on her sky, while the cover is under it and this page is in front */
  const focused = useIsFocused();
  const [underSky, setUnderSky] = useState(true);
  const onUnderSky = useCallback((under: boolean) => setUnderSky(under), []);
  const onRack = useCallback((open: "looks" | "dress" | "") => setRack(open), []);

  return (
    <>
      {focused && underSky && <StatusBar style={m.night ? "light" : "dark"} />}
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
        />
      </SurfaceHost>
    </>
  );
}
