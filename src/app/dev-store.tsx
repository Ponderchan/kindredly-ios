import { useEffect } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import * as MediaLibrary from "expo-media-library/legacy";
import { setLang, type Lang } from "../lib/i18n";
import { setStoreMode, setStorePhotos } from "../lib/dev-store";
import { scoped } from "../lib/scoped-store";

/* /dev-store?l=de — dev only. Switches the language, turns store mode on,
   forgets the local ledgers that would hide a notice or a NEW mark, and
   picks two pictures off the roll for the journal shot. Then Today. */
const LANGS: Lang[] = ["en", "es", "pt", "id", "fr", "de", "it", "ja", "ko"];

export default function DevStore() {
  const { l } = useLocalSearchParams<{ l?: string }>();
  const router = useRouter();
  useEffect(() => {
    if (!__DEV__) return;
    (async () => {
      setStoreMode(true);
      if (l && (LANGS as string[]).includes(l)) setLang(l as Lang, true);
      for (const k of ["kindredly_wren_local", "kindredly_notice_seen", "kindredly_room_seen"]) await scoped.removeItem(k).catch(() => {});
      try {
        const r = await MediaLibrary.getAssetsAsync({ first: 4, mediaType: MediaLibrary.MediaType.photo, sortBy: [[MediaLibrary.SortBy.creationTime, false]] });
        const out: { uri: string; ratio: number }[] = [];
        for (const a of r.assets.slice(0, 2)) {
          const info = await MediaLibrary.getAssetInfoAsync(a.id);
          out.push({ uri: info.localUri || a.uri, ratio: a.width && a.height ? a.width / a.height : 0.8 });
        }
        setStorePhotos(out);
      } catch {
        /* no roll, no pictures — the journal shot is text then */
      }
      router.replace("/(tabs)/letters");
    })();
  }, [l, router]);
  if (!__DEV__) return <Redirect href="/" />;
  return null;
}
