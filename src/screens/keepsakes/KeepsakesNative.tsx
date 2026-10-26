import { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KKeepsakesView, type KKeepsakeTile } from "../../../modules/kindredly-ui/src/Keepsakes";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import { dShort } from "../../lib/format";
import { keepsake } from "../../data/keepsakes";
import { loadShelf, unseen, type Minted } from "../../lib/keepsakes";
import { useWrenName } from "../../lib/wren-name";
import { useAssetImageRefs } from "../../lib/images";
import { keepsakeA11y } from "../me/me-model";
import "../../data/strings-step5-me";
import "../../data/strings-step5-kitrn"; // a11y.back

/* THE SHELF IN SWIFTUI (owner, 2026-10-27: "make Me all Swift"): one Host
   holding KKeepsakesView, behind the "keepsakes" switch (app/keepsakes,
   NativeSurface in mount mode). The reads are the React Native page's
   (loadShelf and unseen on every focus); only what the catalog can still
   draw is shown, newest first, each with its art (a bundled PNG,
   useAssetImageRefs), its name, its proof and the new mark, which
   VoiceOver hears too (me-model keepsakeA11y). A tap opens the keepsake. */

function useSameContent<T>(value: T): T {
  const kept = useRef<{ json: string; value: T } | null>(null);
  const json = JSON.stringify(value);
  if (!kept.current || kept.current.json !== json) kept.current = { json, value };
  return kept.current.value;
}

export function KeepsakesNative() {
  const lang = useLang();
  const router = useRouter();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);
  const wren = useWrenName();
  const [shelf, setShelf] = useState<Minted[] | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadShelf()
        .then(async (s) => {
          if (!alive) return;
          setShelf(s);
          const f = await unseen(s);
          if (alive) setFresh(f);
        })
        .catch((e) => console.warn("[keepsakes] shelf:", e));
      return () => {
        alive = false;
      };
    }, []),
  );

  // only what the catalog still knows how to draw
  const known = useMemo(() => (shelf ?? []).filter((k) => keepsake(k.id)), [shelf]);
  const iconMods = useMemo(() => {
    const o: Record<string, number> = {};
    for (const k of known) {
      const def = keepsake(k.id);
      if (def) o[k.id] = def.icon;
    }
    return o;
  }, [known]);
  const icons = useAssetImageRefs(iconMods);

  const tiles = useSameContent<KKeepsakeTile[]>(
    useMemo(
      () =>
        known.map((k) => {
          const name = t(`ks.name.${k.id}`);
          const isNew = fresh.has(k.id);
          return {
            id: k.id,
            name,
            proof: k.evidence || dShort(k.at).toLocaleUpperCase(),
            icon: icons[k.id] ?? null,
            fresh: isNew,
            a11y: keepsakeA11y(name, isNew, { t }),
          };
        }),
      // lang: the names are t()'s
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [known, fresh, icons, lang],
    ),
  );
  const strings = useSameContent(
    useMemo(
      () => ({
        title: t("ka.title"),
        backLabel: t("a11y.back"),
        count: shelf ? String(known.length) : "",
        lede: t("ka.lede", { wren }),
        // the React Native page's rule: the line once the shelf has been read and is empty
        none: shelf && shelf.length === 0 ? t("ka.none", { wren }) : "",
      }),
      // lang: every word is t()'s
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [shelf, known.length, wren, lang],
    ),
  );
  const rev = useRev(strings, tiles);

  const back = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/courier" as Href)), [router]);
  const open = useCallback((id: string) => router.push(`/keepsake/${id}` as Href), [router]);

  return (
    <SurfaceHost>
      <KKeepsakesView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        tiles={tiles}
        onBack={back}
        onOpen={open}
      />
    </SurfaceHost>
  );
}
