import { useCallback, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KDraftsView } from "../../../modules/kindredly-ui/src/Drafts";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import { dLong } from "../../lib/format";
import { getStamp } from "../../data/stamps";
import { isCustomStampId, useCustomStamps } from "../../lib/custom-stamps";
import { deleteDraft, loadDrafts, type Draft } from "../../lib/drafts";
import { draftCards, draftsCount } from "./drafts-model";
import "../../data/strings-step5-kitrn"; // a11y.back

/* UNSENT IN SWIFTUI (2026-10-27): one Host holding KDraftsView, behind the
   "drafts" switch (app/drafts, NativeSurface in mount mode). The React
   Native page's reads and rules, unchanged: the drafts read on every
   focus; a tap hands one back to the letter desk (compose with its id: the
   stamp and the spark come with it, and the draft is only deleted once
   that letter goes); a hold, or VoiceOver's action, asks the same Alert
   before it is thrown away. Photo stamps are resolved here
   (useCustomStamps), so Swift's KStamp has their pictures. */

export function DraftsNative() {
  const lang = useLang();
  const router = useRouter();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void loadDrafts().then((d) => {
        if (!alive) return;
        setDrafts(d);
        setLoaded(true);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  // a photo stamp's picture, signed and pushed to Swift's registry
  useCustomStamps(useMemo(() => drafts.map((d) => d.stamp).filter(isCustomStampId), [drafts]));

  const cards = useMemo(
    () => draftCards(drafts, { day: (iso) => dLong(iso), stampHex: (id) => getStamp(id)?.color ?? null, isPhotoStamp: isCustomStampId }),
    // lang: dLong reads it fresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drafts, lang],
  );
  const strings = useMemo(
    () => ({
      title: t("dr.title"),
      backLabel: t("a11y.back"),
      count: draftsCount(loaded, drafts.length),
      emptyTitle: t("dr.emptyTitle"),
      emptyBody: t("dr.emptyBody"),
      hint: t("dr.hint"),
      throwLabel: t("dr.throw"),
    }),
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loaded, drafts.length, lang],
  );
  const rev = useRev(strings, loaded, cards);

  const back = useCallback(() => router.back(), [router]);
  const open = useCallback((id: string) => router.push({ pathname: "/compose", params: { draft: id } }), [router]);
  const throwAway = useCallback((id: string) => {
    Alert.alert(t("dr.throwTitle"), t("dr.throwBody"), [
      { text: t("dr.keep"), style: "cancel" },
      {
        text: t("dr.throw"),
        style: "destructive",
        onPress: async () => setDrafts(await deleteDraft(id)),
      },
    ]);
  }, []);

  return (
    <SurfaceHost>
      <KDraftsView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        loaded={loaded}
        cards={cards}
        onBack={back}
        onOpen={open}
        onThrow={throwAway}
      />
    </SurfaceHost>
  );
}
