import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { C, F, cardStyle } from "../theme/tokens";
import { t, useLang } from "../lib/i18n";

/* Your writing fingerprint — a living instrument, not a bar chart. Bars rise
   in with a stagger like type being set; a soft indigo light sweeps across
   every few seconds, as if Wren is re-reading the line. */

export function Fingerprint({
  bars,
  hasText,
  read,
  desc,
}: {
  bars: number[];
  hasText: boolean;
  read: string; // "Quick pace · short sentences · few pauses"
  desc: string;
}) {
  useLang(); // repaint when the reader changes language
  const [width, setWidth] = useState(0);
  const sweep = useSharedValue(-120);

  useEffect(() => {
    if (!width) return;
    sweep.value = -120;
    sweep.value = withRepeat(
      withSequence(
        withDelay(1100, withTiming(width + 120, { duration: 2000, easing: Easing.inOut(Easing.ease) })),
        withTiming(-120, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [width, sweep]);

  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateX: sweep.value }] }));

  const chips = hasText ? read.split(" · ") : [read];

  return (
    <Animated.View entering={FadeInUp.duration(500)} style={[cardStyle, { borderRadius: 22, overflow: "hidden" }]}>
      <LinearGradient colors={["#FFFFFF", "#FAFAFF"]} style={{ padding: 20 }}>
        {/* kicker */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: hasText ? C.purple : C.faint }} />
          <Text style={{ fontSize: 10.5, letterSpacing: 1.6, color: C.label, fontFamily: F.sansBold }}>
            {t("fp.title")}
          </Text>
        </View>

        {/* the instrument */}
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{ height: 64, overflow: "hidden", justifyContent: "flex-end" }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 64 }}>
            {bars.map((u, i) => (
              <Animated.View
                key={i}
                entering={FadeInUp.delay(60 + i * 16).duration(340)}
                style={{
                  flex: 1,
                  height: Math.max(5, u * 62),
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                  backgroundColor: hasText ? C.purple : "#C9C9D4",
                  opacity: hasText ? 0.42 + u * 0.55 : 0.5,
                }}
              />
            ))}
          </View>
          {/* the light that reads across */}
          <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width: 110 }, sweepStyle]}>
            <LinearGradient
              colors={["rgba(58,58,245,0)", "rgba(58,58,245,0.16)", "rgba(255,255,255,0.25)", "rgba(58,58,245,0)"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </View>
        <View style={{ height: 1, backgroundColor: C.lineSoft, marginTop: 2 }} />

        {/* the reading, as chips */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 14 }}>
          {chips.map((c) => (
            <View
              key={c}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 14,
                backgroundColor: hasText ? C.purpleLt : C.lineSoft,
              }}
            >
              <Text style={{ fontFamily: F.sansSemi, fontSize: 12.5, color: hasText ? C.penInk : C.muted }}>{c}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 21, color: C.muted, marginTop: 10 }}>
          {desc}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}
