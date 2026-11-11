import { useMemo, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "expo-router";
import { useRev } from "../../../modules/kindredly-ui";
import { KPlanetPageView, type KPlanetScene, type KPlanetWords } from "../../../modules/kindredly-ui/src/PlanetPage";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import type { PlanetPageModel } from "./usePlanetPage";

/* THE PLANET PAGE IN SWIFTUI (docs/courier-planet.md): one Host holding KPlanetPageView, for
   app/planet (and the dev page). The reads and the words are usePlanetPage's / planet-model's;
   this file turns them into the Swift records. She is drawn by Swift from the family's data, so
   what goes over is how she looks — her colour, her stage, what she wears, the hatchling's own
   shape — never a picture. The status bar reads her sky: light text on the night, dark by day. */

function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

export function PlanetNative({ model }: { model: PlanetPageModel }) {
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const focused = useIsFocused();
  const { vm, palette, own, act } = model;

  const planet = useSameContent<KPlanetScene>(
    useMemo(() => {
      // the hatchling's proportions and her birthmark are hers at the hatch stage only (WrenBird)
      const hatch = vm.look.stage === "hatch";
      return {
        live: focused,
        palette,
        letters: vm.letters,
        state: vm.state,
        napping: vm.napping,
        look: { skin: vm.look.skin, stage: vm.look.stage, accessory: vm.look.dress, wilt: vm.look.wilt, form: hatch ? own.form : null, mark: hatch ? own.mark : null },
      };
    }, [vm, palette, own, focused]),
  );
  const words = useSameContent<KPlanetWords>({
    chip: vm.chip,
    hint: vm.hint,
    name: vm.name,
    time: vm.time,
    line: vm.line,
    aside: vm.aside,
    track: vm.track,
    myLetters: vm.myLetters,
    myLettersCount: vm.myLettersCount,
    back: vm.back,
    zoomIn: vm.zoomIn,
    zoomOut: vm.zoomOut,
    a11y: vm.a11y,
  });
  const figures = useSameContent(vm.figures);
  // the thread a slip's button opens stays in TS
  const slips = useSameContent(useMemo(() => vm.slips.map(({ thread: _thread, ...slip }) => slip), [vm.slips]));
  const emptyRows = useSameContent(vm.emptyRows);
  // the slip to open on, as it stands: the letters arrive after the page, and Swift follows this
  // until the reader picks a slip (then the choice is theirs)
  const open = vm.open;
  const rev = useRev(planet, words, figures, slips, emptyRows, open);

  return (
    <>
      {focused && <StatusBar style={model.night ? "light" : "dark"} />}
      <SurfaceHost>
        <KPlanetPageView
          theme={theme}
          letterFont={letterFont}
          insets={insets}
          rev={rev}
          planet={planet}
          words={words}
          figures={figures}
          slips={slips}
          emptyRows={emptyRows}
          open={open}
          onBack={act.back}
          onGo={act.go}
          onMyLetters={act.myLetters}
        />
      </SurfaceHost>
    </>
  );
}
