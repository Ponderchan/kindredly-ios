import { speakAs, useWrenName } from "../lib/wren-name";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter, Redirect } from "expo-router";
import { t, useLang } from "../lib/i18n";
import { F, cardStyle } from "../theme/tokens";
import { useTheme } from "../lib/theme";
import { BackChevron } from "../components/10a/BackChevron";
import { WrenBird } from "../components/WrenBird";
import { analyzeVoice, cachedVoiceAI, gatherWriting, storeVoiceAI, type VoiceRead } from "../lib/voice";
import { reportGate, type ReportGate } from "../lib/report";
import { voiceRead as voiceAI } from "../lib/wren";
import { useAuth } from "../lib/auth";
import { useEntitlement } from "../lib/entitlement";
import { NativeSurface } from "../components/NativeSurface";
import { VoiceDetailNative } from "../screens/voice/VoiceDetailNative";

/* Your Voice, in detail — the nine signals Wren reads, each translated into
   plain warm language with an evidence strength. Never a grade; the page
   should feel like "this sounds like me", not "AI has analyzed me".

   The page is the theme's (10a), the old C palette read by role: cream is
   the page, cards are sf, ink is ink, muted lines are sub, the quiet
   caption at the foot is mute, hairlines are line. Wren's summary sits on
   the accent's palest wash (lav2) in ink with its byline mute; a signal's
   glyph is ind on a lav2 tile, the same pair as Settings' tiles, and its
   strength dots are ind on lav.

   The Voice report's door keeps its night in every theme: it is the cover
   of the night letter (report.tsx), which is dark on purpose, so it wears
   the letter's colours, not the page's. Its card keeps the soft shadow
   that every card here has, fixed in 10a. */

/* 2026-10-27: Your Voice is drawn in Swift (screens/voice/
   VoiceDetailNative, KVoiceDetailView), with the React Native page below
   as the remote switch's fallback ("voice" in app_surfaces, off until the
   simulator pass; NativeSurface in mount mode). Still a dev page: a
   release build goes home before either is drawn. */
export default function VoiceDetail() {
  const { t: tk } = useTheme(); // above the dev gate, so it runs every render
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <NativeSurface surface="voice" view="KVoiceDetailView" mode="mount" native={() => <VoiceDetailNative />} fallback={() => <VoiceDetailRN />} />
    </View>
  );
}

/* the React Native page, unchanged */
function VoiceDetailRN() {
  const { t: tk } = useTheme(); // above the dev gate, so it runs every render
  if (!__DEV__) return <Redirect href="/" />;
  useLang();
  const router = useRouter();
  const wren = useWrenName();
  const { profile } = useAuth();
  const { premium } = useEntitlement();
  const [read, setRead] = useState<VoiceRead | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [gate, setGate] = useState<ReportGate | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const texts = await gatherWriting((profile?.firstLine as string) || null);
        if (!alive) return;
        setRead(analyzeVoice(texts));
        reportGate(texts.length, premium).then((g) => alive && setGate(g));
        // the deeper engine — cached first, then a quiet refresh attempt
        const cached = await cachedVoiceAI();
        if (alive && cached?.voice_summary) setSummary(cached.voice_summary);
        const ai = await voiceAI(texts);
        if (ai) {
          await storeVoiceAI(ai);
          if (alive && ai.voice_summary) setSummary(ai.voice_summary);
        }
      })();
      return () => {
        alive = false;
      };
    }, [profile?.firstLine, premium]),
  );

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me"));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tk.bg }}>
      {/* header */}
      <View style={{ minHeight: 52, paddingBottom: 8, flexDirection: "row", alignItems: "center", paddingLeft: 56, paddingRight: 12 }}>
        <BackChevron onPress={goBack} color={tk.ink} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.sansExtra, fontSize: 13, letterSpacing: 2.5, color: tk.ink }}>{t("vc.title")}</Text>
          <Text style={{ fontFamily: F.sans, fontSize: 11, color: tk.sub, marginTop: 2 }}>
            {read ? (read.pieces === 1 ? t("vc.basedOnOne", { n: read.pieces, line: speakAs(read.stage.line, wren).toLowerCase() }) : t("vc.basedOnMany", { n: read.pieces, line: speakAs(read.stage.line, wren).toLowerCase() })) : "…"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Wren's summary, when the deeper engine has spoken */}
        {summary && (
          <View style={[cardStyle, { padding: 16, marginBottom: 12, backgroundColor: tk.lav2 }]}>
            <Text style={{ fontFamily: F.serifItalic, fontStyle: "italic", fontSize: 14.5, lineHeight: 22, color: tk.ink }}>“{summary}”</Text>
            <Text style={{ fontFamily: F.sans, fontSize: 11, color: tk.mute, marginTop: 6 }}>— {wren}</Text>
          </View>
        )}

        <View style={[cardStyle, { backgroundColor: tk.sf, paddingVertical: 6, paddingHorizontal: 0 }]}>
          {(read?.rows ?? []).map((r, i) => (
            <View
              key={r.key}
              style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: tk.line, opacity: r.read ? 1 : 0.45 }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: tk.lav2, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: F.serifSemi, fontSize: 15, color: tk.ind }}>{r.glyph}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.sansBold, fontSize: 13.5, color: tk.ink }}>{r.title}</Text>
                {/* five of the nine need volume before they can say anything;
                    an unread row admits it rather than printing a reading it
                    hasn't earned */}
                <Text style={{ fontFamily: F.sans, fontSize: 12, lineHeight: 17, color: tk.sub, marginTop: 3 }}>
                  {r.read ? speakAs(r.line, wren) : t("vc.notEnough")}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 3.5 }}>
                {[1, 2, 3, 4, 5].map((d) => (
                  <View key={d} style={{ width: 5.5, height: 5.5, borderRadius: 3, backgroundColor: r.read && d <= r.strength ? tk.ind : tk.lav }} />
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* the Voice report — Wren's night letter. First one free; monthly with + */}
        {gate && (
          <Pressable
            onPress={() => {
              if (gate.state === "ready") router.push("/report");
              else if (gate.state === "locked") router.push("/paywall?src=report_lock");
            }}
            disabled={gate.state === "progress" || gate.state === "done"}
            style={({ pressed }) => [
              cardStyle,
              { marginTop: 14, padding: 18, backgroundColor: "#1E1B2E", opacity: pressed && (gate.state === "ready" || gate.state === "locked") ? 0.92 : 1 },
            ]}
          >
            <Text style={{ fontFamily: F.sansExtra, fontSize: 9.5, letterSpacing: 1.8, color: "#8C86E8" }}>
              {gate.state === "locked" ? "👑 FIRST CLASS" : "🌙 YOUR AURA · WRAPPED"}
            </Text>
            <Text style={{ fontFamily: F.serifSemi, fontSize: 17, color: "#fff", marginTop: 8 }}>
              {gate.state === "ready" && (gate.kind === "first" ? t("vc.gate.wrote", { wren }) : t("vc.gate.here"))}
              {gate.state === "progress" && `${wren} is saving up a letter about you.`}
              {gate.state === "locked" && t("vc.gate.locked")}
              {gate.state === "done" && t("vc.gate.read")}
            </Text>
            <Text style={{ fontFamily: F.sans, fontSize: 12.5, lineHeight: 19, color: "#B9B4D6", marginTop: 6 }}>
              {gate.state === "ready" && t("vc.gate.readySub")}
              {gate.state === "progress" && (gate.need - gate.have === 1 ? t("vc.gate.progressOne", { n: gate.need - gate.have }) : t("vc.gate.progressMany", { n: gate.need - gate.have }))}
              {gate.state === "locked" && `Your voice, your hours, your words — a wrapped read from ${wren} with First Class.`}
              {gate.state === "done" && t("vc.gate.doneSub")}
            </Text>
            {gate.state === "progress" && (
              <View style={{ height: 5, borderRadius: 3, backgroundColor: "#2A2450", overflow: "hidden", marginTop: 12 }}>
                <View style={{ width: `${Math.min(100, Math.round((gate.have / gate.need) * 100))}%`, height: 5, backgroundColor: "#6D6DF6" }} />
              </View>
            )}
          </Pressable>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 18 }}>
          <Text style={{ fontFamily: F.serifItalic, fontStyle: "italic", fontSize: 12.5, color: tk.mute }}>{t("vc.learning")}</Text>
          <WrenBird size={22} mood="content" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
