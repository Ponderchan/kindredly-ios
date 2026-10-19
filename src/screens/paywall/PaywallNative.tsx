import { useMemo, useRef } from "react";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KPaywallView } from "../../../modules/kindredly-ui/src/Paywall";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { useBirdImageRef } from "../../lib/bird-images";
import type { PaywallModel } from "./usePaywall";

/* THE FIRST CLASS PAGE IN SWIFTUI (Me 4a, Prompt 7): one Host, holding
   KPaywallView. This file only hands the model's view (paywall-model, via
   usePaywall) to Swift as records, each kept by content so an unrelated
   render re-sends nothing, with one rev over all of them. The hero's Wren
   is a snapshot of the reader's own courier, flying, in her look
   (useBirdImageRef fcHero).

   Swift keeps which fare is chosen and reports it (onSelect); a tap on the
   button hands the fare's id back (onBuy), and the purchase runs in
   usePaywall, the existing RevenueCat code. */

function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

export function PaywallNative({ model, sheet = true }: { model: PaywallModel; sheet?: boolean }) {
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const screen = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);
  const { view, act, busy } = model;

  // a page sheet starts below the status bar: Swift then sets the close row 12 down
  const insets = useMemo(() => ({ top: sheet ? 0 : screen.top, bottom: screen.bottom, tabBarRoom: 0 }), [sheet, screen.top, screen.bottom]);
  const bird = useBirdImageRef("fcHero");
  const strings = useSameContent(view.strings);
  const fares = useSameContent(view.fares);
  const benefits = useSameContent(view.benefits);
  const cofounder = useSameContent(view.cofounder);
  const member = useSameContent(view.member);
  const rev = useRev(strings, fares, benefits, cofounder, member, view.initialFare, bird, busy);

  return (
    <SurfaceHost>
      <KPaywallView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        bird={bird}
        fares={fares}
        initialFare={view.initialFare}
        benefits={benefits}
        cofounder={cofounder}
        member={member}
        busy={busy}
        onClose={act.close}
        onSelect={act.select}
        onBuy={act.buy}
        onRestore={act.restore}
        onTerms={act.terms}
        onPrivacy={act.privacy}
        onManage={act.manage}
      />
    </SurfaceHost>
  );
}
