import { useRef } from "react";
import { useRev } from "../../../modules/kindredly-ui";
import { KAfterFifteenView } from "../../../modules/kindredly-ui/src/AfterFifteen";
import type { KWrenLookData } from "../../../modules/kindredly-ui/src/Planet";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import type { AfterVM } from "./after-view";
import type { AfterFifteenActions } from "./useAfterFifteen";

/* TODAY, AFTER FIFTEEN IN SWIFTUI (docs/today-after-fifteen.md): one Host holding
   KAfterFifteenView, in the Today tab's place once the day's last letter has gone past (and on
   the dev page). The facts, the words and what the taps do are useAfterFifteen's / after-view's;
   this file only hands them to Swift. She is drawn there from the family's data, so what goes
   over is how she looks (her colour, her stage, what she wears, the hatchling's own shape),
   never a picture. No islands, no field, no commands. */

function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

export function AfterFifteenNative({ vm, look, act }: { vm: AfterVM; look: KWrenLookData; act: AfterFifteenActions }) {
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();

  const thing = useSameContent(vm.thing);
  const strip = useSameContent(vm.strip);
  const sky = useSameContent(vm.sky);
  const box = useSameContent(vm.box);
  const receipt = useSameContent(vm.receipt);
  const bed = useSameContent(vm.bed);
  const sentLook = useSameContent(look);
  const rev = useRev(vm.page, vm.title, thing, strip, sky, box, receipt, bed, sentLook, vm.undo, vm.undoHint);

  return (
    <SurfaceHost>
      <KAfterFifteenView
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        page={vm.page}
        title={vm.title}
        look={sentLook}
        thing={thing}
        strip={strip}
        sky={sky}
        box={box}
        receipt={receipt}
        bed={bed}
        undo={vm.undo}
        undoHint={vm.undoHint}
        onSlot={act.slot}
        onShut={act.shut}
        onKeep={act.keep}
        onReceipt={act.receipt}
        onShare={act.share}
        onStep={act.step}
        onPlay={act.play}
        onUndo={act.undo}
      />
    </SurfaceHost>
  );
}
