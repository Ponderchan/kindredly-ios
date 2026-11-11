import { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { isKindredlyUIViewAvailable } from "../../modules/kindredly-ui/src/available";
import { PLANET_PAGE_VIEW } from "../../modules/kindredly-ui/src/PlanetPage";
import { useNativeSurface } from "../lib/surfaces";
import { useSwiftPiece } from "../screens/me/me-pieces";
import { PlanetNative } from "../screens/planet/PlanetNative";
import { usePlanetPage } from "../screens/planet/usePlanetPage";
import { PALETTE, daylight } from "../components/courier-card-model";

/* THE PLANET PAGE (docs/courier-planet.md, owner sign-off 2026-11-11): about your letters — the
   planet your courier lives on, a stamp for every letter she has carried, a lamp for every
   stranger who has had one on their desk, three figures, and one slip at a time.

     /planet     from the round button on her card (Me) and from Track on her page (/courier)

   Her page (/courier, Open) stays about her; the two are kept apart (owner).

   Swift only (KPlanetPageView), behind the same switch as her card on Me ("meplanet", off by
   default) with the same care (screens/me/me-pieces useSwiftPiece: the mark is written before
   Swift first draws it, so a crash in its first seconds counts against the switch). With the
   switch off, or on a binary without the page, this route hands over to her page, where Track
   still opens her tracking slip — its only doors are Swift's and are not shown then, so this is
   for a stale link. While the mark lands (milliseconds, once a process) the page is her sky's
   deep tone, the colour it is about to be. */

export default function Planet() {
  const router = useRouter();
  const can = useNativeSurface("meplanet") && isKindredlyUIViewAvailable(PLANET_PAGE_VIEW);
  const armed = useSwiftPiece("meplanet", can);

  useEffect(() => {
    if (can) return;
    console.log("[planet] the planet page is off or not in this binary; opening her page");
    router.replace("/courier");
  }, [can, router]);

  if (!can || !armed) return <View style={{ flex: 1, backgroundColor: PALETTE[daylight()].scrim }} />;
  return <PlanetPage />;
}

function PlanetPage() {
  const model = usePlanetPage();
  return (
    <View style={{ flex: 1, backgroundColor: model.palette.scrim }}>
      <PlanetNative model={model} />
    </View>
  );
}
