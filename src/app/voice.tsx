import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { C, F, cardStyle } from "../theme/tokens";
import { WrenBird } from "../components/WrenBird";
import { analyzeVoice, cachedVoiceAI, gatherWriting, storeVoiceAI, type VoiceRead } from "../lib/voice";
import { voiceRead as voiceAI } from "../lib/wren";
import { useAuth } from "../lib/auth";

/* Your Voice, in detail — the nine signals Wren reads, each translated into
   plain warm language with an evidence strength. Never a grade; the page
   should feel like "this sounds like me", not "AI has analyzed me". */

export default function VoiceDetail() {
  const router = useRouter();
  const { profile } = useAuth();
  const [read, setRead] = useState<VoiceRead | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const texts = await gatherWriting((profile?.firstLine as string) || null);
        if (!alive) return;
        setRead(analyzeVoice(texts));
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
    }, [profile?.firstLine]),
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
          <Text style={{ fontFamily: F.sansExtra, fontSize: 13, letterSpacing: 2.5, color: C.ink }}>YOUR VOICE</Text>
          <Text style={{ fontFamily: F.sans, fontSize: 11, color: C.muted, marginTop: 2 }}>
            {read ? `Based on ${read.pieces} ${read.pieces === 1 ? "piece" : "pieces"} of your writing` : "…"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Wren's summary, when the deeper engine has spoken */}
        {summary && (
          <View style={[cardStyle, { padding: 16, marginBottom: 12, backgroundColor: C.purpleLt }]}>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 22, color: "#2E2A50" }}>“{summary}”</Text>
            <Text style={{ fontFamily: F.sans, fontSize: 11, color: "#8B84B8", marginTop: 6 }}>— Wren</Text>
          </View>
        )}

        <View style={[cardStyle, { paddingVertical: 6, paddingHorizontal: 0 }]}>
          {(read?.rows ?? []).map((r, i) => (
            <View
              key={r.key}
              style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.lineSoft }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: "#F1EFFA", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: F.serifSemi, fontSize: 15, color: C.purpleMid }}>{r.glyph}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.sansBold, fontSize: 13.5, color: C.ink }}>{r.title}</Text>
                <Text style={{ fontFamily: F.sans, fontSize: 12, lineHeight: 17, color: C.muted, marginTop: 3 }}>{r.line}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 3.5 }}>
                {[1, 2, 3, 4, 5].map((d) => (
                  <View key={d} style={{ width: 5.5, height: 5.5, borderRadius: 3, backgroundColor: d <= r.strength ? C.purpleMid : "#E3E1F2" }} />
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 18 }}>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.faint }}>Wren keeps learning as you write.</Text>
          <WrenBird size={22} mood="content" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
