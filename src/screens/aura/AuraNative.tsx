import { useCallback, useMemo, useRef, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { KIsland, useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KAuraRoomView, type KAuraLens, type KAuraRoomData } from "../../../modules/kindredly-ui/src/Aura";
import { SurfaceHost } from "../../components/NativeSurface";
import { AURA_ART_H, AuraArtSlot, auraArtWidth, auraCardFacts } from "../../components/AuraCard";
import { storeAura, storeMode } from "../../lib/dev-store";
import { getAuraScope, myAura, pauseCounts, setAuraScope, wordCounts, type Aura } from "../../lib/aura";
import { observeAuraLocks } from "../../lib/local-push";
import { useAuth } from "../../lib/auth";
import { useLang } from "../../lib/i18n";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { letterFitLines } from "../../theme/post";
import { buildAuraCard } from "../me/me-model";
import { meFormat } from "../me/me-format";
import { nativeAura } from "../me/MeNative";
import { auraRoomStrings, buildAuraRoom } from "./aura-model";
import { auraWords } from "./aura-words";

/* THE WRITING AURA ROOM IN SWIFTUI (owner decision 2026-10-26, 1.0.7): one Host (SurfaceHost:
   flex 1, every safe area ignored, light or dark from the theme, the crash breadcrumb's layout
   report) holding KAuraRoomView, with one React Native island inside — the Aura card's picture
   (AuraArtSlot: the title's scene, or the desk drawn at the rung's fidelity, which SwiftUI can't
   draw), as on Me.

   The reads are the React Native page's (app/aura.tsx AuraRN): the aura (the dev store's in a
   dev store build) and the scope, again each time the room comes into view; a line she said had
   settled is told, and one still waiting to go out withdrawn (observeAuraLocks). The card is Me's
   (buildAuraCard → nativeAura), so the card you tapped on Me is the card that heads the room;
   everything under the lenses is aura-model's buildAuraRoom. Swift owns the lens, the pager and
   the sheets, and reports: back, share (the card's or the bar's: /aura-card), write (the card's
   call to action on the first rungs: /compose) and the scope sheet's Done (saved, then the aura
   read again). */

export function AuraNative({ initialLens = "portrait" }: { initialLens?: KAuraLens }) {
  const lang = useLang();
  const router = useRouter();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const { width } = useWindowDimensions();
  const { profile } = useAuth();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);
  const [aura, setAura] = useState<Aura | null>(null);
  const [sealedOn, setSealedOn] = useState(false);
  const firstLine = (profile?.firstLine as string) || null;

  const load = useCallback(async () => {
    const dev = __DEV__ && storeMode;
    const [a, sc] = await Promise.all([dev ? Promise.resolve(storeAura()) : myAura(firstLine), getAuraScope()]);
    setAura(a);
    setSealedOn(sc.sealed);
    /* she said a line settled; you came to look — it's told, and a line still waiting to go out
       is withdrawn (lib/local-push) */
    if (!dev) void observeAuraLocks(a.locked.map((d) => d.key), true);
  }, [firstLine]);

  useFocusEffect(
    useCallback(() => {
      load().catch((e) => console.warn("[aura] reading the aura failed:", e));
    }, [load]),
  );

  const words = useMemo(() => (aura ? wordCounts(aura.texts) : []), [aura]);
  const pauses = useMemo(() => (aura ? pauseCounts(aura.texts) : []), [aura]);
  const quoteLines = letterFitLines(letterFont, 4);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const strings = useMemo(() => auraRoomStrings(auraWords().t, auraWords().usageGroupLabel), [lang]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const vm = useMemo(() => buildAuraCard(auraCardFacts(aura), meFormat()), [aura, lang]);
  const data = useMemo<KAuraRoomData>(() => {
    const card = nativeAura(vm);
    if (!aura) return { ready: false, card, ctaOpensRoom: false, dims: [], fromPieces: "", words: [], pauses: [], extras: [], groups: [], sealedOn };
    const body = buildAuraRoom(aura, auraWords(), { words, pauses }, quoteLines);
    return { ready: true, card, ctaOpensRoom: vm?.ctaTo !== "compose", ...body, sealedOn };
    // lang: the words are the reader's language's
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aura, vm, words, pauses, quoteLines, sealedOn, lang]);
  const rev = useRev(strings, data);

  const back = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me")), [router]);
  const share = useCallback(() => router.push("/aura-card"), [router]);
  const write = useCallback(() => router.push("/compose"), [router]);
  const scope = useCallback(
    async (sealed: boolean) => {
      setSealedOn(sealed);
      try {
        await setAuraScope({ sealed });
        await load();
      } catch (e) {
        console.warn("[aura] saving the scope failed:", e);
      }
    },
    [load],
  );

  // the lens the view opens on: read once (Swift owns it after)
  const lens = useRef(initialLens).current;
  const artW = auraArtWidth(width - 32);

  return (
    <SurfaceHost>
      <KAuraRoomView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        data={data}
        initialLens={lens}
        onBack={back}
        onShare={share}
        onWrite={write}
        onScope={(sealed) => void scope(sealed)}
      >
        <KIsland name="auraArt" style={{ width: artW, height: AURA_ART_H }}>
          {vm ? <AuraArtSlot art={vm.art} width={artW} /> : null}
        </KIsland>
      </KAuraRoomView>
    </SurfaceHost>
  );
}
