import { useCallback, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { useFocusEffect, useRouter } from "expo-router";
import { F } from "../theme/tokens";
import { AuraOrb } from "../components/VoiceCard";
import { WrenBird } from "../components/WrenBird";
import { DEMO_JOURNAL } from "../data/demo";
import { analyzeVoice, auraName, gatherWriting, type VoiceRead } from "../lib/voice";
import { journalHourBand } from "../lib/report";
import { fingerprint } from "../lib/signature";
import { getWrenType } from "../lib/wren-type";
import { useAuth } from "../lib/auth";

/* The aura, as a collectible — a 9:16 story card made to be screenshotted.
   Personal, mysterious, beautiful; no chrome inside the frame but a quiet ✕
   and two dim actions at the very bottom edge. */

const INK = "#12101F";

export default function AuraShareCard() {
  const router = useRouter();
  const { profile } = useAuth();
  const [read, setRead] = useState<VoiceRead | null>(null);
  const [units, setUnits] = useState<number[]>([]);
  const [name, setName] = useState("");

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        let texts = await gatherWriting((profile?.firstLine as string) || null);
        if (__DEV__ && texts.length === 0) texts = DEMO_JOURNAL.map((e) => e.body).filter((b) => b.trim().length >= 3);
        const [type, hour] = await Promise.all([getWrenType(), journalHourBand()]);
        if (!alive) return;
        const r = analyzeVoice(texts);
        setRead(r);
        setUnits(fingerprint(texts.join(" ")).units.slice(0, 24));
        setName(auraName(r, type?.name ?? null, hour));
      })();
      return () => {
        alive = false;
      };
    }, [profile?.firstLine]),
  );

  const done = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me"));
  const shareText = () =>
    read && Share.share({ message: `${name} — my writing aura, discovered with Wren on Kindredly. "${read.discovery.replace(/\n/g, " ")}"` });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: INK }}>
      <LinearGradient colors={[INK, "#221D40", INK]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
      {/* the night, softly starred */}
      <Svg pointerEvents="none" style={{ position: "absolute", top: 0, left: 0 }} width={402} height={874} viewBox="0 0 402 874">
        {[
          [42, 120, 1.6, 0.5], [340, 90, 1.2, 0.4], [300, 210, 1.8, 0.55], [70, 320, 1.2, 0.35],
          [360, 400, 1.4, 0.45], [30, 540, 1.5, 0.4], [330, 640, 1.2, 0.35], [90, 730, 1.6, 0.5], [250, 800, 1.2, 0.4],
        ].map(([x, y, r, o], i) => (
          <Circle key={i} cx={x} cy={y} r={r} fill="#8F87C9" opacity={o} />
        ))}
      </Svg>

      <Pressable onPress={done} hitSlop={10} style={{ position: "absolute", right: 14, top: 58, width: 36, height: 36, alignItems: "center", justifyContent: "center", zIndex: 5 }}>
        <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 16 }}>✕</Text>
      </Pressable>

      {read && (
        <Animated.View entering={FadeIn.duration(420)} style={{ flex: 1, alignItems: "center", justifyContent: "space-between", paddingTop: 26, paddingBottom: 10 }}>
          {/* the collectible frame */}
          <View style={{ flex: 1, alignSelf: "stretch", marginHorizontal: 26, borderRadius: 26, borderWidth: 1, borderColor: "rgba(240,185,90,0.35)", paddingVertical: 26, paddingHorizontal: 20, alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: F.sansExtra, fontSize: 10.5, letterSpacing: 3.2, color: "#B9B2FF" }}>MY WRITING AURA</Text>

            <View style={{ alignItems: "center" }}>
              <AuraOrb size={230} dark units={units} stars={3 + Math.min(read.pieces, 9)} />
              <Text style={{ fontFamily: F.serifSemi, fontSize: 29, color: "#fff", textAlign: "center", marginTop: 4 }}>{name}</Text>
            </View>

            <View style={{ alignItems: "center", gap: 9 }}>
              {read.traits.map((t) => (
                <View key={t.short} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 13 }}>{t.icon}</Text>
                  <Text style={{ fontFamily: F.sansBold, fontSize: 14.5, color: "#DDD9F2", letterSpacing: 0.3 }}>{t.short}</Text>
                </View>
              ))}
            </View>

            <Text style={{ fontFamily: F.serifItalic, fontSize: 16.5, lineHeight: 26, color: "#CFC9F2", textAlign: "center" }}>
              “{read.discovery}”
            </Text>

            <View style={{ alignItems: "center", gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <WrenBird size={20} mood="content" />
                <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: "#8F87C9" }}>Discovered with Wren</Text>
              </View>
              <Text style={{ fontFamily: F.sansExtra, fontSize: 10, letterSpacing: 3.5, color: "rgba(255,255,255,0.65)" }}>KINDREDLY</Text>
            </View>
          </View>

          {/* dim actions at the very edge — easy to crop out */}
          <View style={{ flexDirection: "row", gap: 26, paddingTop: 10 }}>
            <Pressable onPress={shareText} hitSlop={8}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}>Share</Text>
            </Pressable>
            <Text style={{ fontFamily: F.sans, fontSize: 12.5, color: "rgba(255,255,255,0.28)" }}>screenshot to keep</Text>
            <Pressable onPress={done} hitSlop={8}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}>Done</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
