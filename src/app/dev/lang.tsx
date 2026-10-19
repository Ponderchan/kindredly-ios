import { useEffect } from "react";
import { Redirect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { LANGS, setLang, type Lang } from "../../lib/i18n";
import { setDevThemeOverride } from "../../lib/theme";
import { THEME_KEYS, type ThemeKey } from "../../theme/themes";

/* /dev/lang?l=de&theme=midnight&to=/(tabs)/me — dev only. Switches the
   language and/or forces a theme for this run, then goes to `to` (Today
   without one), to read a language's words or check a theme on the real
   screens. Nothing is saved and nothing reaches the server: the Settings
   picker persists the language and re-registers the push token in it, which
   a look at the copy shouldn't do to a real account; the theme goes through
   the dev theme switch (lib/theme setDevThemeOverride: memory only, over the
   reader's appearance), and theme=off lets go of it. */
export default function DevLang() {
  const { l, theme, to } = useLocalSearchParams<{ l?: string; theme?: string; to?: string }>();
  const router = useRouter();
  useEffect(() => {
    if (!__DEV__) return;
    if (l && LANGS.some((x) => x.id === l)) setLang(l as Lang, false);
    if (theme === "off") setDevThemeOverride(null);
    else if (theme && (THEME_KEYS as readonly string[]).includes(theme)) setDevThemeOverride(theme as ThemeKey);
    router.replace((to || "/(tabs)/letters") as Href);
  }, [l, theme, to, router]);
  if (!__DEV__) return <Redirect href="/" />;
  return null;
}
