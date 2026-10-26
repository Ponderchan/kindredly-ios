import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Share } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as MediaLibrary from "expo-media-library/legacy";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KAuraShareView, type KAuraTicket } from "../../../modules/kindredly-ui/src/Aura";
import { SurfaceHost } from "../../components/NativeSurface";
import { AURA_SCENES, AURA_SKETCHES } from "../../data/aura-scenes";
import { myAura, type Aura } from "../../lib/aura";
import { useAuth } from "../../lib/auth";
import { useBirdImageRef } from "../../lib/bird-images";
import { useAssetImageRef } from "../../lib/images";
import { t, useLang } from "../../lib/i18n";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { useWrenName } from "../../lib/wren-name";
import { auraShareStrings, buildTicket, shareMessage } from "./aura-model";
import { ticketWords } from "./aura-words";
import "../../data/strings-a11y-sheets";

/* YOUR WRITING AURA, THE SHARE CARD, IN SWIFTUI (owner decision 2026-10-26, 1.0.7): one Host
   holding KAuraShareView. The card is drawn in Swift from aura-model's buildTicket (the same rules
   as the React Native AuraTicket: never a quote, never a piece id) and Swift makes its picture;
   this file shares or saves that picture with the React Native page's own words and alerts
   (app/aura-card.tsx): the text riding along is the card's own (shareMessage), saving asks for
   photo access first, and a picture that couldn't be made shares the words alone / says the save
   failed. The scene reaches Swift as a bundled PNG's file (useAssetImageRef), Wren as the content
   snapshot (useBirdImageRef). */

const NO_TICKET: KAuraTicket = {
  ready: false,
  brand: "",
  label: "",
  meInWords: "",
  artKind: "lines",
  artImage: null,
  artMask: 0,
  name: "",
  stickers: [],
  desc: "",
  formedFrom: "",
  faceMask: 0,
  a11y: "",
};

export function AuraShareNative() {
  const lang = useLang();
  const router = useRouter();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const wren = useWrenName();
  const { user, profile, handle } = useAuth();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);
  const [aura, setAura] = useState<Aura | null>(null);
  const [busy, setBusy] = useState<"" | "share" | "save">("");
  const firstLine = (profile?.firstLine as string) || null;

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      myAura(firstLine)
        .then((a) => alive && setAura(a))
        .catch((e) => console.warn("[aura-card] reading the aura failed:", e));
      return () => {
        alive = false;
      };
    }, [firstLine]),
  );

  const seed = user?.id || "you";
  const who = handle || "me";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const vm = useMemo(() => (aura ? buildTicket(aura, ticketWords(), who, seed) : null), [aura, who, seed, lang]);
  const sceneMod = vm?.scene.id ? (vm.scene.set === "scenes" ? AURA_SCENES[vm.scene.id] : AURA_SKETCHES[vm.scene.id]) : null;
  const sceneRef = useAssetImageRef(sceneMod ?? null);
  const bird = useBirdImageRef("content");

  const ticket = useMemo<KAuraTicket>(
    () =>
      vm
        ? {
            ready: true,
            brand: vm.brand,
            label: vm.label,
            meInWords: vm.meInWords,
            artKind: vm.scene.kind,
            artImage: sceneMod ? sceneRef : null,
            artMask: vm.artMask,
            name: vm.name,
            stickers: vm.stickers,
            desc: vm.desc,
            formedFrom: vm.formedFrom,
            faceMask: vm.faceMask,
            a11y: vm.a11y,
          }
        : NO_TICKET,
    [vm, sceneMod, sceneRef],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const strings = useMemo(() => auraShareStrings(t, wren), [wren, lang]);
  const rev = useRev(ticket);

  const done = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me")), [router]);
  const words = () => (aura ? shareMessage(aura, ticketWords(), wren) : "");

  // the share sheet is the system's: nothing to wait on here, so the key never says "Working…"
  const share = (uri: string) => {
    if (!aura || busy) return;
    if (!uri) console.warn("[aura-card] the card's picture couldn't be made; sharing its words alone");
    void Share.share(uri ? { url: uri, message: words() } : { message: words() });
  };

  const save = async (uri: string) => {
    if (!aura || busy) return;
    setBusy("save");
    try {
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) {
        Alert.alert(t("ac.saveDenied"), t("ac.saveDeniedBody"));
        return;
      }
      if (!uri) throw new Error("the card's picture couldn't be made");
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert(t("ac.saved"), t("ac.savedBody"));
    } catch (e) {
      console.warn("[aura-card] saving the card failed:", e);
      Alert.alert(t("ac.saveFailed"), t("ac.saveFailedBody"));
    } finally {
      setBusy("");
    }
  };

  return (
    <SurfaceHost>
      <KAuraShareView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        ticket={ticket}
        busy={busy}
        bird={bird}
        onBack={done}
        onShare={share}
        onSave={(uri) => void save(uri)}
      />
    </SurfaceHost>
  );
}
