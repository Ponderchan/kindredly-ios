import { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KStampBookView } from "../../../modules/kindredly-ui/src/StampBook";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import { speakAs, useWrenName } from "../../lib/wren-name";
import { useAuth } from "../../lib/auth";
import { GROWTH_STAMPS, type GrowthStats } from "../../data/growth";
import { EMPTY_STATS, collectGrowthStats } from "../../lib/stats";
import { STAMPBOOK_WORDS, stampBookView } from "./stampbook-model";
import "../../data/strings-step5-kitrn"; // a11y.back

/* THE STAMP ALBUM IN SWIFTUI (2026-10-27): one Host holding KStampBookView,
   behind the "stampbook" switch (app/stamps, a dev page, NativeSurface in
   mount mode). The React Native page's reads, unchanged: the growth stats
   on every focus (lib/stats, from the account's first day); every stamp,
   colour and line is stampbook-model's. The card's key: an earned stamp
   goes to the letter desk, one still on its way just closes. */

export function StampBookNative() {
  const lang = useLang();
  const router = useRouter();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);
  const wren = useWrenName();
  const { user } = useAuth();
  const [stats, setStats] = useState<GrowthStats>(EMPTY_STATS);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      collectGrowthStats(user?.created_at)
        .then((s) => alive && setStats(s))
        .catch((e) => console.warn("[stamps] the growth stats:", e));
      return () => {
        alive = false;
      };
    }, [user?.created_at]),
  );

  const view = useMemo(() => stampBookView(GROWTH_STAMPS, stats, { speak: (s) => speakAs(s, wren) }), [stats, wren]);
  const strings = useMemo(
    () => ({ title: STAMPBOOK_WORDS.title, backLabel: t("a11y.back"), count: view.count, intro: STAMPBOOK_WORDS.intro }),
    // lang: the back key's name is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, lang],
  );
  const tiles = view.tiles;
  const rev = useRev(strings, tiles);

  const back = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me")), [router]);
  const act = useCallback(
    (id: string) => {
      if (view.tiles.find((s) => s.id === id)?.earned) router.push("/compose");
    },
    [view, router],
  );

  return (
    <SurfaceHost>
      <KStampBookView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        tiles={tiles}
        onBack={back}
        onAction={act}
      />
    </SurfaceHost>
  );
}
