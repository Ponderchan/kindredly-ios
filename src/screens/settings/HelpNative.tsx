import { useCallback, useMemo, useRef } from "react";
import { useRouter } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KHelpView, type KHelpItem } from "../../../modules/kindredly-ui/src/Help";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import { speakAs, useWrenName } from "../../lib/wren-name";
import { useBirdImageRef } from "../../lib/bird-images";
import "../../data/strings-me4a"; // m4.a11y.expanded / collapsed
import "../../data/strings-step5-kitrn"; // a11y.back

/* HOW KINDREDLY WORKS IN SWIFTUI (owner, 2026-10-27: "make Me all Swift"):
   one Host holding KHelpView, behind the "help" switch (app/(tabs)/me/help,
   NativeSurface in mount mode). The nine answers are the React Native
   page's (hp.q1–9, hp.a1–9, her name in them), her opener in her voice;
   Swift keeps which one is open. */

export function HelpNative() {
  const lang = useLang();
  const router = useRouter();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);
  const wren = useWrenName();
  const bird = useBirdImageRef("content");

  const items = useMemo<KHelpItem[]>(
    () => [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ({ q: t(`hp.q${i}`), a: t(`hp.a${i}`, { wren }) })),
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wren, lang],
  );
  const strings = useMemo(
    () => ({
      title: t("hp.title"),
      backLabel: t("a11y.back"),
      intro: speakAs(t("hp.intro"), wren),
      expanded: t("m4.a11y.expanded"),
      collapsed: t("m4.a11y.collapsed"),
    }),
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wren, lang],
  );
  const rev = useRev(strings, items, bird);

  const back = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me/settings")), [router]);

  return (
    <SurfaceHost>
      <KHelpView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        bird={bird}
        items={items}
        onBack={back}
      />
    </SurfaceHost>
  );
}
