import { useWrenName } from "../lib/wren-name";
import { useCallback, useMemo, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useFocusEffect, useRouter } from "expo-router";
import { F } from "../theme/tokens";
import { Constellation } from "../components/VoiceCard";
import { WrenBird } from "../components/WrenBird";
import { DEMO_JOURNAL } from "../data/demo";
import { cachedVoiceAI, gatherWriting } from "../lib/voice";
import { buildReport, markReportRead, type ReportData } from "../lib/report";
import { getWrenType } from "../lib/wren-type";
import { useAuth } from "../lib/auth";

/* The Voice report — Wren's night letter about how you write. One fact per
   screen, tap to move; the last card is yours to share. Deliberately dark:
   the app lives in daylight, this is what Wren wrote after reading you at
   night. */

const NIGHT = "#1E1B2E";
const NIGHT2 = "#2A2450";
const STARLIGHT = "#B9B2FF";
const DIM = "#B9B4D6";

type Screen = { key: string; render: () => React.ReactNode };

export default function VoiceReport() {
  const router = useRouter();
  const wren = useWrenName();
  const { profile } = useAuth();
  const [data, setData] = useState<ReportData | null>(null);
  const [idx, setIdx] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        let texts = await gatherWriting((profile?.firstLine as string) || null);
        if (__DEV__ && texts.length === 0) texts = DEMO_JOURNAL.map((e) => e.body).filter((b) => b.trim().length >= 3);
        const [type, ai] = await Promise.all([getWrenType(), cachedVoiceAI()]);
        const d = await buildReport(texts, type?.name ?? null, ai?.voice_summary ?? null);
        if (!alive) return;
        setData(d);
        void markReportRead(); // opened = read; the month is spent
      })();
      return () => {
        alive = false;
      };
    }, [profile?.firstLine]),
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
          <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 2.2, color: STARLIGHT }}>YOUR AURA · WRAPPED</Text>
          <Text style={{ fontFamily: F.serifSemi, fontSize: 30, lineHeight: 40, color: "#fff", marginTop: 12 }}>{data.archetype}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 16 }}>
            {data.read.chips.map((c) => (
              <View key={c} style={{ borderWidth: 1, borderColor: "rgba(185,178,255,0.45)", borderRadius: 13, paddingHorizontal: 11, paddingVertical: 5 }}>
                <Text style={{ fontFamily: F.sansBold, fontSize: 11.5, color: "#CFC9F2" }}>{c}</Text>
              </View>
            ))}
          </View>
          <Text style={{ fontFamily: F.sans, fontSize: 13, color: DIM, marginTop: 16 }}>
            Written from {data.pieces} {data.pieces === 1 ? "piece" : "pieces"} of you.
          </Text>
        </View>
      ),
    });

    s.push({
      key: K("stars"),
      render: () => (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 2.2, color: STARLIGHT, alignSelf: "flex-start" }}>YOUR SKY</Text>
          <Constellation units={data.units} stars={3 + Math.min(data.pieces, 9)} />
          <Text style={{ fontFamily: F.serifSemi, fontSize: 18, color: "#fff", textAlign: "center", marginTop: 6 }}>
            The brightest of your nine:
          </Text>
          <Text style={{ fontFamily: F.sansBold, fontSize: 14, color: STARLIGHT, textAlign: "center", marginTop: 10, lineHeight: 24 }}>
            {data.read.rows
              .slice()
              .sort((a, b) => b.strength - a.strength)
              .slice(0, 3)
              .map((r) => r.title)
              .join(" · ")}
          </Text>
        </View>
      ),
    });

    if (data.hourBand)
      s.push({
        key: K("hour"),
        render: () => (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 2.2, color: STARLIGHT }}>YOUR HOUR</Text>
            <Text style={{ fontFamily: F.serifSemi, fontSize: 34, color: "#fff", marginTop: 14 }}>{data.hourBand}</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: DIM, marginTop: 12, lineHeight: 23 }}>
              That's when the true lines come out of you.
            </Text>
          </View>
        ),
      });

    if (data.words.length >= 3)
      s.push({
        key: K("words"),
        render: () => (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 2.2, color: STARLIGHT, alignSelf: "flex-start" }}>WORDS YOU KEEP</Text>
            <Text style={{ fontFamily: F.serifSemi, fontSize: 40, color: "#fff", marginTop: 22 }}>{data.words[0]}</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 16, color: STARLIGHT, marginTop: 14, textAlign: "center", lineHeight: 26 }}>
              {data.words.slice(1).join("   ·   ")}
            </Text>
            <Text style={{ fontFamily: F.sans, fontSize: 13, color: DIM, marginTop: 18, textAlign: "center" }}>
              The words your voice keeps coming back to.
            </Text>
          </View>
        ),
      });

    if (data.punct.length)
      s.push({
        key: K("punct"),
        render: () => (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 2.2, color: STARLIGHT }}>THE MARKS YOU MAKE</Text>
            <Text style={{ fontFamily: F.serifSemi, fontSize: 56, color: "#fff", marginTop: 8 }}>{data.punct[0].mark}</Text>
            <View style={{ gap: 10, marginTop: 8 }}>
              {data.punct.map((p) => (
                <View key={p.mark} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontFamily: F.serif, fontSize: 15, color: DIM, width: 16 }}>{p.mark}</Text>
                  <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: NIGHT2, overflow: "hidden" }}>
                    <View style={{ width: `${Math.max(6, p.pct)}%`, height: 7, backgroundColor: "#6D6DF6" }} />
                  </View>
                  <Text style={{ fontFamily: F.sansBold, fontSize: 12, color: DIM, width: 38, textAlign: "right" }}>{p.pct}%</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, color: DIM, marginTop: 18 }}>You let your sentences breathe.</Text>
          </View>
        ),
      });

    s.push({
      key: K("quote"),
      render: () => (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 2.2, color: STARLIGHT }}>AFTER READING YOU</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 21, lineHeight: 33, color: "#fff", marginTop: 16 }}>“{data.quote}”</Text>
          <Text style={{ fontFamily: F.sans, fontSize: 12, color: STARLIGHT, marginTop: 14 }}>— {wren}</Text>
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
          <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 2.2, color: STARLIGHT }}>KEEP THIS ONE</Text>
          <View style={{ backgroundColor: NIGHT2, borderRadius: 18, padding: 18, marginTop: 14 }}>
            <Text style={{ fontFamily: F.sansExtra, fontSize: 9, letterSpacing: 1.8, color: "#8C86E8" }}>KINDREDLY · YOUR AURA</Text>
            <Text style={{ fontFamily: F.serifSemi, fontSize: 20, color: "#fff", marginTop: 8 }}>{data.archetype}</Text>
            <Constellation units={data.units} stars={3 + Math.min(data.pieces, 9)} size={110} />
            <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 20, color: DIM }}>“{data.quote}”</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Pressable
              onPress={() =>
                Share.share({ message: `${wren} read my letters on Kindredly — "${data.quote}" · ${data.archetype}` })
              }
              style={{ flex: 1, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)", borderRadius: 16, paddingVertical: 13, alignItems: "center" }}
            >
              <Text style={{ fontFamily: F.sansBold, fontSize: 13.5, color: "#fff" }}>Share</Text>
            </Pressable>
            <Pressable onPress={done} style={{ flex: 1, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 13, alignItems: "center" }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 13.5, color: NIGHT }}>Done</Text>
            </Pressable>
          </View>
        </View>
      ),
    });

    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

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
      <Pressable onPress={done} hitSlop={10} style={{ position: "absolute", right: 12, top: 20, width: 38, height: 38, alignItems: "center", justifyContent: "center", zIndex: 5 }}>
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 17 }}>✕</Text>
      </Pressable>

      {/* the story — tap right to go on, left to go back */}
      {screens.length > 0 && (
        <Animated.View key={screens[idx].key} entering={FadeIn.duration(320)} style={{ flex: 1, paddingHorizontal: 30, paddingBottom: 28 }}>
          {screens[idx].render()}
        </Animated.View>
      )}
      <Pressable onPress={() => advance(-1)} style={{ position: "absolute", left: 0, top: 90, bottom: 0, width: "30%" }} />
      <Pressable onPress={() => advance(1)} style={{ position: "absolute", right: 0, top: 90, bottom: 0, width: "55%" }} />
    </SafeAreaView>
  );
}
