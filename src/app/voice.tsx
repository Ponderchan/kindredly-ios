import { speakAs, useWrenName } from "../lib/wren-name";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { C, F, cardStyle } from "../theme/tokens";
import { WrenBird } from "../components/WrenBird";
import { analyzeVoice, cachedVoiceAI, gatherWriting, storeVoiceAI, type VoiceRead } from "../lib/voice";
import { reportGate, type ReportGate } from "../lib/report";
import { voiceRead as voiceAI } from "../lib/wren";
import { useAuth } from "../lib/auth";
import { useEntitlement } from "../lib/entitlement";

/* Your Voice, in detail — the nine signals Wren reads, each translated into
   plain warm language with an evidence strength. Never a grade; the page
   should feel like "this sounds like me", not "AI has analyzed me". */

export default function VoiceDetail() {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      {/* header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 2 }}>
        <Pressable onPress={goBack} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 24, color: C.ink }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.sansExtra, fontSize: 13, letterSpacing: 2.5, color: C.ink }}>YOUR WRITING AURA</Text>
          <Text style={{ fontFamily: F.sans, fontSize: 11, color: C.muted, marginTop: 2 }}>
            {read ? `Based on ${read.pieces} ${read.pieces === 1 ? "piece" : "pieces"} · ${speakAs(read.stage.line, wren).toLowerCase()}` : "…"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Wren's summary, when the deeper engine has spoken */}
        {summary && (
          <View style={[cardStyle, { padding: 16, marginBottom: 12, backgroundColor: C.purpleLt }]}>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 22, color: "#2E2A50" }}>“{summary}”</Text>
            <Text style={{ fontFamily: F.sans, fontSize: 11, color: "#8B84B8", marginTop: 6 }}>— {wren}</Text>
          </View>
        )}

        <View style={[cardStyle, { paddingVertical: 6, paddingHorizontal: 0 }]}>
          {(read?.rows ?? []).map((r, i) => (
            <View
              key={r.key}
              style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.lineSoft, opacity: r.read ? 1 : 0.45 }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: "#F1EFFA", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: F.serifSemi, fontSize: 15, color: C.purpleMid }}>{r.glyph}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.sansBold, fontSize: 13.5, color: C.ink }}>{r.title}</Text>
                {/* five of the nine need volume before they can say anything;
                    an unread row admits it rather than printing a reading it
                    hasn't earned */}
                <Text style={{ fontFamily: F.sans, fontSize: 12, lineHeight: 17, color: C.muted, marginTop: 3 }}>
                  {r.read ? speakAs(r.line, wren) : "Not enough writing yet."}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 3.5 }}>
                {[1, 2, 3, 4, 5].map((d) => (
                  <View key={d} style={{ width: 5.5, height: 5.5, borderRadius: 3, backgroundColor: r.read && d <= r.strength ? C.purpleMid : "#E3E1F2" }} />
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
              {gate.state === "ready" && (gate.kind === "first" ? `${wren} wrote you a letter.` : "This month's letter is here.")}
              {gate.state === "progress" && `${wren} is saving up a letter about you.`}
              {gate.state === "locked" && "A letter about you, every month."}
              {gate.state === "done" && "This month's letter is read."}
            </Text>
            <Text style={{ fontFamily: F.sans, fontSize: 12.5, lineHeight: 19, color: "#B9B4D6", marginTop: 6 }}>
              {gate.state === "ready" && "How you write, wrapped in a night sky. Tap to open."}
              {gate.state === "progress" && `Write ${gate.need - gate.have} more ${gate.need - gate.have === 1 ? "piece" : "pieces"} and she'll seal the first one — free.`}
              {gate.state === "locked" && `Your voice, your hours, your words — a wrapped read from ${wren} with First Class.`}
              {gate.state === "done" && "The next one arrives with the new month."}
            </Text>
            {gate.state === "progress" && (
              <View style={{ height: 5, borderRadius: 3, backgroundColor: "#2A2450", overflow: "hidden", marginTop: 12 }}>
                <View style={{ width: `${Math.min(100, Math.round((gate.have / gate.need) * 100))}%`, height: 5, backgroundColor: "#6D6DF6" }} />
              </View>
            )}
          </Pressable>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 18 }}>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.faint }}>Wren keeps learning as you write.</Text>
          <WrenBird size={22} mood="content" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
