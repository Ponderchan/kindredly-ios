import { useWrenName } from "../lib/wren-name";
import { archName } from "../lib/aura-copy";
import { useCallback, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useFocusEffect, useRouter } from "expo-router";
import { PF } from "../theme/post";
import { AuraTicket, dear } from "../components/AuraCard";
import { WrenBird } from "../components/WrenBird";
import { myAura, type Aura } from "../lib/aura";
import { useAuth } from "../lib/auth";

/* The share card is the page PULLED FROM THE MACHINE — the same typed
   sheet the Me tab shows mid-type, free of the housing, travelling the
   night like everything else this bird carries. One artifact, one
   engine, one name.

   Chrome stays at the very edges (✕ / Share / screenshot to keep / Done)
   so a screenshot crops clean. The wordmark rides UNDER the page — if
   it's cropped away, the page still reads — YOUR AURA — in its own type. */

const INK = "#12101F";

export default function AuraShareCard() {
  const router = useRouter();
  const wren = useWrenName();
  const { user, profile } = useAuth();
  const [aura, setAura] = useState<Aura | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      myAura((profile?.firstLine as string) || null).then((a) => alive && setAura(a));
      return () => {
        alive = false;
      };
    }, [profile?.firstLine]),
  );

  const done = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me"));
  const pct = aura ? Math.round(aura.formed * 100) : 0;
  const shareText = () =>
    aura &&
    Share.share({
      message:
        aura.phase === "formed"
          ? `THE ${dear(archName(aura.archetype?.id)).toUpperCase()} — my writing aura, typed by ${wren} on Kindredly.`
          : `${pct}% typed — ${wren} is still typing my aura, on Kindredly.`,
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: INK }}>
      {/* the night, softly starred — the sky every page crosses */}
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

      {aura && (
        <Animated.View entering={FadeIn.duration(420)} style={{ flex: 1, justifyContent: "space-between", paddingTop: 64, paddingBottom: 10 }}>
          <View style={{ flex: 1, justifyContent: "center" }}>
            {/* the specimen ticket — the page's evidence, torn off to travel */}
            <View style={{ marginHorizontal: 30 }}>
              <AuraTicket aura={aura} wren={wren} />
            </View>

            {/* under the page, in the night — crops away clean */}
            <View style={{ alignItems: "center", gap: 7, marginTop: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <WrenBird size={20} bare mood="content" />
                <Text style={{ fontFamily: PF.serifItalic, fontSize: 12.5, color: "#8F87C9" }}>Typed by {wren}</Text>
              </View>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 3.5, color: "rgba(255,255,255,0.65)" }}>KINDREDLY</Text>
            </View>
          </View>

          {/* dim actions at the very edge — easy to crop out */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 26, paddingTop: 10 }}>
            <Pressable onPress={shareText} hitSlop={8}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Share</Text>
            </Pressable>
            <Text style={{ fontFamily: PF.mono, fontSize: 12, color: "rgba(255,255,255,0.28)" }}>screenshot to keep</Text>
            <Pressable onPress={done} hitSlop={8}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Done</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
