import { useWrenName } from "../lib/wren-name";
import { useCallback, useMemo, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { PFM } from "../theme/post";
import { useLetterFamily } from "../lib/theme";
import { t, useLang } from "../lib/i18n";
import { Constellation } from "../components/VoiceCard";
import { WrenBird } from "../components/WrenBird";
import { DEMO_JOURNAL } from "../data/demo";
import { reportSampleNote, reportTexts } from "../lib/report-door";
import { cachedVoiceAI } from "../lib/voice";
import { REPORT_AT, buildReport, markReportRead, type ReportData } from "../lib/report";
import { getWrenType } from "../lib/wren-type";
import { useAuth } from "../lib/auth";
import "../data/strings-me4a"; // m4.rt.*, m4.pw.close
import { NativeSurface } from "../components/NativeSurface";
import { VoiceReportNative } from "../screens/report/VoiceReportNative";
import { WrappedReportNative } from "../screens/report/WrappedReportNative";
import { isKindredlyUIViewAvailable } from "../../modules/kindredly-ui";

/* The Voice report — Wren's night letter about how you write. One fact per
   screen, tap to move; the last card is yours to share. Deliberately dark:
   the app lives in daylight, this is what Wren wrote after reading you at
   night.

   THE SAME NIGHT IN EVERY THEME (10a). Every colour here belongs to the
   letter's night sky (the ground, the moon and stars, the starlight type,
   the white on it and the cards and buttons drawn on it), not to the
   reader's theme, so none of them follow it: it is a scene, like the
   courier's sky. It stays its own night in Midnight too, a shade lighter
   than Midnight's ground, which is fine, because it is a different place.
   The constellation (VoiceCard's Constellation) is part of the picture. */

const NIGHT = "#1E1B2E";
const NIGHT2 = "#2A2450";
const STARLIGHT = "#B9B2FF";
const DIM = "#B9B4D6";

type Screen = { key: string; render: () => React.ReactNode };

/* 2026-10-27: the night letter is drawn in Swift (screens/report/
   VoiceReportNative, KVoiceReportView), with the React Native page below
   as the remote switch's fallback ("report" in app_surfaces, off until
   the simulator pass; NativeSurface in mount mode). Both wait on the
   night's own ground. */
export default function VoiceReport() {
  const { sample, demo, wrapped } = useLocalSearchParams<{ sample?: string; demo?: string; wrapped?: string }>();
  /* 2026-10-31: the wrapped monthly report (screens/report/WrappedReportNative) stands in front,
     behind its own switch ("reportwrapped", off), with everything below as its fallback. A sample
     (before the first report is due) stays the Voice report's. A dev build opens it whatever the
     switch says with /report?demo=1 (the prototypes' October) or /report?wrapped=1 (your own
     month, which spends it), for the design pass. */
  if (__DEV__ && (demo === "1" || wrapped === "1") && isKindredlyUIViewAvailable("KWrappedReportView")) {
    return (
      <View style={{ flex: 1, backgroundColor: "#5B55FF" }}>
        <WrappedReportNative />
      </View>
    );
  }
  if (sample !== "1") {
    return (
      <View style={{ flex: 1, backgroundColor: "#5B55FF" }}>
        <NativeSurface
          surface="reportwrapped"
          view="KWrappedReportView"
          mode="mount"
          native={() => <WrappedReportNative />}
          fallback={() => <VoiceReportAny />}
          pending={() => <View style={{ flex: 1, backgroundColor: NIGHT }} />}
        />
      </View>
    );
  }
  return <VoiceReportAny />;
}

/* the Voice report: Swift behind "report", React Native as its fallback */
function VoiceReportAny() {
  return (
    <View style={{ flex: 1, backgroundColor: NIGHT }}>
      <NativeSurface
        surface="report"
        view="KVoiceReportView"
        mode="mount"
        native={() => <VoiceReportNative />}
        fallback={() => <VoiceReportRN />}
        pending={() => <View style={{ flex: 1, backgroundColor: NIGHT }} />}
      />
    </View>
  );
}

/* the React Native page, unchanged */
function VoiceReportRN() {
  useLang();
  const router = useRouter();
  const wren = useWrenName();
  // what Wren wrote, and your own words, are content: the letter font's italic (upright in Garamond / SF Mono)
  const said = useLetterFamily(true);
  const { profile } = useAuth();
  const [data, setData] = useState<ReportData | null>(null);
  // Me's row before the first report is due opens a sample: demo writing, blurred, how far to go
  const sample = useLocalSearchParams<{ sample?: string }>().sample === "1";
  const [have, setHave] = useState(0);
  const [idx, setIdx] = useState(0);

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
      })();
      return () => {
        alive = false;
      };
    }, [profile?.firstLine, sample]),
  );

  const done = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me"));

  const screens: Screen[] = useMemo(() => {
    if (!data) return [];
    const s: Screen[] = [];
    const K = (k: string) => `${k}`;

    s.push({
      key: K("cover"),
      render: () => (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 2.2, color: STARLIGHT }}>{t("m4.rt.eyebrow")}</Text>
          <Text style={{ fontWeight: "700", fontSize: 30, lineHeight: 40, color: "#fff", marginTop: 12 }}>{data.archetype}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 16 }}>
            {data.chips.map((c) => (
              <View key={c} style={{ borderWidth: 1, borderColor: "rgba(185,178,255,0.45)", borderRadius: 13, paddingHorizontal: 11, paddingVertical: 5 }}>
                <Text style={{ fontWeight: "600", fontSize: 11.5, color: "#CFC9F2" }}>{c}</Text>
              </View>
            ))}
          </View>
          <Text style={{ fontWeight: "400", fontSize: 13, color: DIM, marginTop: 16 }}>
            {data.pieces === 1 ? t("m4.rt.writtenOne") : t("m4.rt.written", { n: data.pieces })}
          </Text>
        </View>
      ),
    });

    s.push({
      key: K("stars"),
      render: () => (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 2.2, color: STARLIGHT, alignSelf: "flex-start" }}>{t("rt.sky")}</Text>
          <Constellation units={data.units} stars={3 + Math.min(data.pieces, 9)} />
          <Text style={{ fontWeight: "700", fontSize: 18, color: "#fff", textAlign: "center", marginTop: 6 }}>
            {t("m4.rt.brightest")}
          </Text>
          <Text style={{ fontWeight: "600", fontSize: 14, color: STARLIGHT, textAlign: "center", marginTop: 10, lineHeight: 24 }}>
            {data.brightest.join(" · ")}
          </Text>
        </View>
      ),
    });

    if (data.hourBand)
      s.push({
        key: K("hour"),
        render: () => (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 2.2, color: STARLIGHT }}>{t("rt.hour")}</Text>
            <Text style={{ fontWeight: "700", fontSize: 34, color: "#fff", marginTop: 14 }}>{data.hourBand}</Text>
            <Text style={{ ...said, fontSize: 15, color: DIM, marginTop: 12, lineHeight: 23 }}>
              {t("m4.rt.hourLine")}
            </Text>
          </View>
        ),
      });

    if (data.words.length >= 3)
      s.push({
        key: K("words"),
        render: () => (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 2.2, color: STARLIGHT, alignSelf: "flex-start" }}>{t("rt.words")}</Text>
            <Text style={{ fontWeight: "700", fontSize: 40, color: "#fff", marginTop: 22 }}>{data.words[0]}</Text>
            <Text style={{ ...said, fontSize: 16, color: STARLIGHT, marginTop: 14, textAlign: "center", lineHeight: 26 }}>
              {data.words.slice(1).join("   ·   ")}
            </Text>
            <Text style={{ fontWeight: "400", fontSize: 13, color: DIM, marginTop: 18, textAlign: "center" }}>
              {t("m4.rt.wordsLine")}
            </Text>
          </View>
        ),
      });

    if (data.punct.length)
      s.push({
        key: K("punct"),
        render: () => (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 2.2, color: STARLIGHT }}>{t("rt.marks")}</Text>
            <Text style={{ fontWeight: "700", fontSize: 56, color: "#fff", marginTop: 8 }}>{data.punct[0].mark}</Text>
            <View style={{ gap: 10, marginTop: 8 }}>
              {data.punct.map((p) => (
                <View key={p.mark} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ ...PFM.mono, fontSize: 15, color: DIM, width: 16 }}>{p.mark}</Text>
                  <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: NIGHT2, overflow: "hidden" }}>
                    <View style={{ width: `${Math.max(6, p.pct)}%`, height: 7, backgroundColor: "#6D6DF6" }} />
                  </View>
                  <Text style={{ ...PFM.monoSemi, fontSize: 12, color: DIM, width: 38, textAlign: "right" }}>{p.pct}%</Text>
                </View>
              ))}
            </View>
            <Text style={{ ...said, fontSize: 14.5, color: DIM, marginTop: 18 }}>{t("m4.rt.breathe")}</Text>
          </View>
        ),
      });

    s.push({
      key: K("quote"),
      render: () => (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 2.2, color: STARLIGHT }}>{t("rt.after")}</Text>
          <Text style={{ ...said, fontSize: 21, lineHeight: 33, color: "#fff", marginTop: 16 }}>“{data.quote}”</Text>
          <Text style={{ fontWeight: "400", fontSize: 12, color: STARLIGHT, marginTop: 14 }}>— {wren}</Text>
          <View style={{ marginTop: 26, alignSelf: "flex-start" }}>
            <WrenBird size={44} mood="content" />
          </View>
        </View>
      ),
    });

    s.push({
      key: K("end"),
      render: () => (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 2.2, color: STARLIGHT }}>{t("rt.keep")}</Text>
          <View style={{ backgroundColor: NIGHT2, borderRadius: 18, padding: 18, marginTop: 14 }}>
            <Text style={{ ...PFM.monoSemi, fontSize: 9, letterSpacing: 1.8, color: "#8C86E8" }}>{t("rt.brand")}</Text>
            <Text style={{ fontWeight: "700", fontSize: 20, color: "#fff", marginTop: 8 }}>{data.archetype}</Text>
            <Constellation units={data.units} stars={3 + Math.min(data.pieces, 9)} size={110} />
            <Text style={{ ...said, fontSize: 13.5, lineHeight: 20, color: DIM }}>“{data.quote}”</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Pressable
              onPress={() =>
                Share.share({ message: t("m4.rt.share", { wren, quote: data.quote, archetype: data.archetype }) })
              }
              style={{ flex: 1, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)", borderRadius: 16, paddingVertical: 13, alignItems: "center" }}
            >
              <Text style={{ fontWeight: "700", fontSize: 13.5, color: "#fff" }}>{t("rt.share")}</Text>
            </Pressable>
            <Pressable onPress={done} style={{ flex: 1, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 13, alignItems: "center" }}>
              <Text style={{ fontWeight: "700", fontSize: 13.5, color: NIGHT }}>{t("rt.done")}</Text>
            </Pressable>
          </View>
        </View>
      ),
    });

    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, said]);

  const advance = (dir: 1 | -1) => {
    const next = idx + dir;
    if (next < 0) return;
    if (next >= screens.length) return; // the end card holds its own exits
    setIdx(next);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: NIGHT }}>
      {/* a few fixed stars + the moon */}
      <Svg pointerEvents="none" style={{ position: "absolute", top: 0, left: 0 }} width={400} height={300} viewBox="0 0 400 300">
        <Circle cx={352} cy={64} r={13} fill="#F5D98F" opacity={0.85} />
        {[
          [40, 90, 1.6],
          [300, 40, 1.3],
          [240, 140, 1.8],
          [90, 210, 1.2],
          [340, 230, 1.5],
        ].map(([x, y, r], i) => (
          <Circle key={i} cx={x} cy={y} r={r} fill="#4A4478" />
        ))}
      </Svg>

      {/* progress */}
      <View style={{ flexDirection: "row", gap: 5, paddingHorizontal: 18, paddingTop: 8 }}>
        {screens.map((sc, i) => (
          <View key={sc.key} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= idx ? "#fff" : "rgba(255,255,255,0.22)" }} />
        ))}
      </View>
      <Pressable onPress={done} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("m4.pw.close")} style={{ position: "absolute", right: 12, top: 20, width: 38, height: 38, alignItems: "center", justifyContent: "center", zIndex: 5 }}>
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 17 }}>✕</Text>
      </Pressable>

      {/* the story — tap right to go on, left to go back */}
      {screens.length > 0 && (
        <Animated.View key={screens[idx].key} entering={FadeIn.duration(320)} style={{ flex: 1, paddingHorizontal: 30, paddingBottom: 28 }}>
          {screens[idx].render()}
        </Animated.View>
      )}
      {/* a sample: the report's shape, blurred, and how far the first real one is */}
      {sample && screens.length > 0 && (
        <BlurView intensity={28} tint="dark" style={{ position: "absolute", left: 0, right: 0, top: 70, bottom: 0, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }}>
          {(() => {
            const note = reportSampleNote(have, REPORT_AT, t, wren);
            return (
              <View accessible style={{ maxWidth: 300, backgroundColor: "#2A2450", borderRadius: 18, paddingHorizontal: 22, paddingVertical: 18, gap: 8, shadowColor: "#120F2A", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 }}>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", textAlign: "center" }}>{note.title}</Text>
                <Text style={{ color: "#B9B4D6", fontSize: 14, lineHeight: 19, textAlign: "center" }}>{note.line}</Text>
              </View>
            );
          })()}
        </BlurView>
      )}
      <Pressable onPress={() => advance(-1)} style={{ position: "absolute", left: 0, top: 90, bottom: 0, width: "30%" }} />
      <Pressable onPress={() => advance(1)} style={{ position: "absolute", right: 0, top: 90, bottom: 0, width: "55%" }} />
    </SafeAreaView>
  );
}
