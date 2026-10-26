import { useCallback, useMemo, useRef, useState } from "react";
import { Share } from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KKeepsakeView, type KKeepsakeStrings } from "../../../modules/kindredly-ui/src/Keepsakes";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import { localeTag } from "../../lib/format";
import { keepsake } from "../../data/keepsakes";
import { loadShelf, markSeen, type Minted } from "../../lib/keepsakes";
import { readThreadsCache } from "../../lib/db";
import { speakAs, useWrenName } from "../../lib/wren-name";
import { useAssetImageRef } from "../../lib/images";
import { useBirdImageRef } from "../../lib/bird-images";
import { HAS_WHY } from "./keepsake-why";
import "../../data/strings-step5-kitrn"; // a11y.back

/* ONE KEEPSAKE IN SWIFTUI (owner, 2026-10-27: "make Me all Swift"): one
   Host holding KKeepsakeView, behind the "keepsake" switch
   (app/keepsake/[id], NativeSurface in mount mode). The React Native
   page's reads and rules: the shelf on every focus, the keepsake marked
   seen; the day in the reader's own language; her sentence (her own for
   the keepsakes that have one, "This happened" otherwise) with her name in
   it; the evidence; the line she carried; the way to the correspondence
   it came from (a room once names were traded, the chat before); the
   share sheet. Not on the shelf: her "Not yet." line. An id the catalog
   doesn't know: the bar alone. */

function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

export function KeepsakeNative({ id }: { id: string }) {
  const lang = useLang();
  const router = useRouter();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);
  const wren = useWrenName();
  const [mine, setMine] = useState<Minted | null>(null);
  const def = keepsake(id);
  const icon = useAssetImageRef(def?.icon ?? null);
  const bird = useBirdImageRef("content");

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadShelf()
        .then((shelf) => {
          if (!alive) return;
          setMine(shelf.find((k) => k.id === id) ?? null);
          void markSeen([id]);
        })
        .catch((e) => console.warn("[keepsake] shelf:", e));
      return () => {
        alive = false;
      };
    }, [id]),
  );

  const strings = useSameContent<KKeepsakeStrings>(
    useMemo(() => {
      const name = def ? t(`ks.name.${def.id}`) : "";
      return {
        title: def ? t(`ks.cat.${def.cat}`) : "",
        backLabel: t("a11y.back"),
        name,
        when: mine ? new Date(mine.at).toLocaleDateString(localeTag(), { month: "short", day: "numeric", year: "numeric" }).toLocaleUpperCase() : "",
        wrenLine: def ? speakAs(HAS_WHY.has(def.id) ? t(`ks.why.${def.id}`) : t("ks.happened"), wren) : "",
        evidenceLabel: t("ks.evidence"),
        evidence: mine?.evidence ?? "",
        lineLabel: t("ks.lineCarried"),
        line: mine?.line ? `“${mine.line}”` : "",
        go: mine?.threadId ? t("ks.goCorrespondence") : "",
        share: t("ks.share"),
        notYet: speakAs(t("ks.notYet"), wren),
      };
      // lang: every word is t()'s, the day the locale's
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [def, mine, wren, lang]),
  );
  const rev = useRev(strings, icon, bird, !!def, !!mine);

  const back = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me")), [router]);
  /* a correspondence that has traded names lives in a room now */
  const go = useCallback(async () => {
    if (!mine?.threadId) return;
    try {
      const th = (await readThreadsCache())?.find((x) => x.id === mine.threadId);
      router.push((th?.revealed ? `/room/${mine.threadId}` : `/chat/${mine.threadId}`) as Href);
    } catch (e) {
      console.warn("[keepsake] the correspondence:", e);
      router.push(`/chat/${mine.threadId}` as Href);
    }
  }, [mine, router]);
  const share = useCallback(() => {
    if (!def || !mine) return;
    Share.share({ message: t("ks.shareTail", { name: t(`ks.name.${def.id}`), evidence: mine.evidence }) }).catch((e) => console.warn("[keepsake] share:", e));
  }, [def, mine]);

  return (
    <SurfaceHost>
      <KKeepsakeView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        known={!!def}
        kept={!!mine}
        icon={icon}
        bird={bird}
        onBack={back}
        onGo={go}
        onShare={share}
      />
    </SurfaceHost>
  );
}
