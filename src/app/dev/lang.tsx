import { useEffect } from "react";
import { Redirect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { LANGS, setLang, type Lang } from "../../lib/i18n";

/* /dev/lang?l=de&to=/(tabs)/me — dev only. Switches the language for this
   run and goes to `to` (Today without one), to read a language's words on
   the real screens. Nothing is saved and nothing reaches the server: the
   Settings picker persists the choice and re-registers the push token in the
   new language, which a look at the copy shouldn't do to a real account. */
export default function DevLang() {
  const { l, to } = useLocalSearchParams<{ l?: string; to?: string }>();
  const router = useRouter();
  useEffect(() => {
    if (!__DEV__) return;
    if (l && LANGS.some((x) => x.id === l)) setLang(l as Lang, false);
    router.replace((to || "/(tabs)/letters") as Href);
  }, [l, to, router]);
  if (!__DEV__) return <Redirect href="/" />;
  return null;
}
