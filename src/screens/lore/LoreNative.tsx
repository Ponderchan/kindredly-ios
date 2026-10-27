import { useCallback, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KLoreView } from "../../../modules/kindredly-ui/src/Lore";
import { SurfaceHost } from "../../components/NativeSurface";
import { sheetWords } from "../../components/sheet-chrome";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import { dShort } from "../../lib/format";
import { loadLore, removeLore, type LoreEntry } from "../../lib/lore";
import { loreCards } from "./lore-model";
import "../../data/strings-step5-me";
import "../../data/strings-step5-kitrn"; // a11y.back

/* LORE IN SWIFTUI (2026-10-27): one Host holding KLoreView, behind the
   "lore" switch (app/lore, NativeSurface in mount mode). The React Native
   page's reads and rules, unchanged: the shelf read on every focus; a
   hold, or VoiceOver's action, asks "Take this line down?" with the native
   sheet's Never mind and Remove, takes it down and reads the shelf again
   (a failure is logged and the line stays). Back goes back, or to Kindreds. */

export function LoreNative() {
  const lang = useLang();
  const router = useRouter();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);
  const [items, setItems] = useState<LoreEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadLore()
        .then((l) => {
          if (!alive) return;
          setItems(l);
          setLoaded(true);
        })
        .catch((e) => console.warn("[lore] the shelf:", e));
      return () => {
        alive = false;
      };
    }, []),
  );

  const cards = useMemo(
    () => loreCards(items, { t, day: (iso) => dShort(iso) }),
    // lang: t() and dShort read it fresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, lang],
  );
  const strings = useMemo(
    () => ({
      title: t("lore.title"),
      backLabel: t("a11y.back"),
      head: t("lore.head"),
      empty: t("lore.empty"),
      removeLabel: t("ml.rm.remove"),
      removeHint: t("lore.unpin.hint"),
    }),
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );
  const rev = useRev(strings, loaded, cards);

  const back = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/kindreds")), [router]);
  const unpin = useCallback((id: string) => {
    Alert.alert(t("lore.unpin.title"), "", [
      { text: sheetWords(t("set.neverMind")), style: "cancel" },
      {
        text: t("ml.rm.remove"),
        style: "destructive",
        onPress: () =>
          removeLore(id)
            .then(loadLore)
            .then(setItems)
            .catch((err) => console.warn("[lore] the line wasn't taken down:", err)),
      },
    ]);
  }, []);

  return (
    <SurfaceHost>
      <KLoreView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        loaded={loaded}
        cards={cards}
        onBack={back}
        onRemove={unpin}
      />
    </SurfaceHost>
  );
}
