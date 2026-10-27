import { useCallback, useMemo, useRef, useState } from "react";
import { Share } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useKCommands, useRev, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KVoiceReportView, type KVoiceReportSky } from "../../../modules/kindredly-ui/src/VoiceReport";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import { useWrenName } from "../../lib/wren-name";
import { useBirdImageRef } from "../../lib/bird-images";
import { useAuth } from "../../lib/auth";
import { DEMO_JOURNAL } from "../../data/demo";
import { reportSampleNote, reportTexts } from "../../lib/report-door";
import { cachedVoiceAI } from "../../lib/voice";
import { REPORT_AT, buildReport, markReportRead, type ReportData } from "../../lib/report";
import { getWrenType } from "../../lib/wren-type";
import { constellationShape } from "../../lib/constellation";
import { reportView } from "./report-model";
import "../../data/strings-me4a"; // m4.rt.*, m4.pw.close

/* THE VOICE REPORT IN SWIFTUI (2026-10-27): one Host holding
   KVoiceReportView, behind the "report" switch (app/report, NativeSurface
   in mount mode). The React Native page's reads, unchanged: on every focus
   the writing is gathered (the demo journal in a dev build with none), the
   born type and the cached deeper read are added, the report is built, and
   only then is it marked read (opened = read; the month is spent). Every
   card's words are report-model's, the sky is lib/constellation's at the
   page's two sizes, Wren is her content snapshot. Share hands the share
   sheet the page's own line; Done and the close key go back (or to Me). */

const NO_SKY: KVoiceReportSky = { size: 150, stars: [], links: [] };

/** The sky at `size`, as Swift takes it: its stars in points and its links flattened in pairs. */
function sky(size: number, d: ReportData, stars: number): KVoiceReportSky {
  const shape = constellationShape(size, d.units, stars);
  return { size, stars: shape.pts.map((p) => ({ x: p.x, y: p.y, big: p.big, w: p.w })), links: shape.links.flatMap(([a, b]) => [a, b]) };
}

export function VoiceReportNative() {
  const lang = useLang();
  const router = useRouter();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);
  const wren = useWrenName();
  const bird = useBirdImageRef("content");
  const { profile } = useAuth();
  const [data, setData] = useState<ReportData | null>(null);
  // Me's row before the first report is due opens a sample: demo writing, blurred, how far to go
  const sample = useLocalSearchParams<{ sample?: string }>().sample === "1";
  const [have, setHave] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const { texts, have } = await reportTexts((profile?.firstLine as string) || null, sample, DEMO_JOURNAL.map((e) => e.body).filter((b) => b.trim().length >= 3));
        const [type, ai] = await Promise.all([getWrenType(), cachedVoiceAI()]);
        const d = await buildReport(texts, type?.id ?? null, ai?.voice_summary ?? null);
        if (!alive) return;
        setData(d);
        setHave(have);
        if (!sample) void markReportRead(); // opened = read; the month is spent (a sample spends nothing)
      })().catch((e) => console.warn("[report] the report wasn't built:", e));
      return () => {
        alive = false;
      };
    }, [profile?.firstLine, sample]),
  );

  const view = useMemo(
    () => (data ? reportView(data, { t, wren }) : null),
    // lang: every word is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, wren, lang],
  );
  const strings = useMemo(
    () => ({
      eyebrowCover: view?.eyebrows.cover ?? "",
      eyebrowStars: view?.eyebrows.stars ?? "",
      eyebrowHour: view?.eyebrows.hour ?? "",
      eyebrowWords: view?.eyebrows.words ?? "",
      eyebrowPunct: view?.eyebrows.punct ?? "",
      eyebrowQuote: view?.eyebrows.quote ?? "",
      eyebrowEnd: view?.eyebrows.end ?? "",
      archetype: view?.archetype ?? "",
      written: view?.written ?? "",
      brightestTitle: view?.brightestTitle ?? "",
      brightest: view?.brightest ?? "",
      hourBand: view?.hourBand ?? "",
      hourLine: view?.hourLine ?? "",
      firstWord: view?.firstWord ?? "",
      otherWords: view?.otherWords ?? "",
      wordsLine: view?.wordsLine ?? "",
      topMark: view?.topMark ?? "",
      breathe: view?.breathe ?? "",
      quote: view?.quote ?? "",
      signature: view?.signature ?? "",
      brand: view?.brand ?? "",
      share: view?.share ?? "",
      done: view?.done ?? "",
      // the close key is there before the report is
      close: view?.close ?? t("m4.pw.close"),
      ...(sample ? (({ title, line }) => ({ sampleTitle: title, sampleLine: line }))(reportSampleNote(have, REPORT_AT, t, wren)) : {}),
    }),
    // lang: the close key's name is t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, lang, sample, have, wren],
  );
  const cards = useMemo(() => view?.cards ?? [], [view]);
  const chips = useMemo(() => view?.chips ?? [], [view]);
  const marks = useMemo(() => view?.marks ?? [], [view]);
  const skies = useMemo(() => (data && view ? { sky: sky(150, data, view.stars), keep: sky(110, data, view.stars) } : { sky: NO_SKY, keep: { ...NO_SKY, size: 110 } }), [data, view]);
  const loaded = !!view;
  const rev = useRev(strings, loaded, cards, chips, marks, skies, bird);

  const done = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me")), [router]);
  const share = useCallback(() => {
    if (!view) return;
    Share.share({ message: view.shareMessage }).catch((e) => console.warn("[report] share:", e));
  }, [view]);

  return (
    <SurfaceHost>
      <KVoiceReportView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={rev}
        strings={strings}
        loaded={loaded}
        cards={cards}
        chips={chips}
        marks={marks}
        sky={skies.sky}
        keepSky={skies.keep}
        bird={bird}
        onShare={share}
        onDone={done}
      />
    </SurfaceHost>
  );
}
