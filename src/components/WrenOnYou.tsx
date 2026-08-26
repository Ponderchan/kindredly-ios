import { useWrenName } from "../lib/wren-name";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { t, useLang } from "../lib/i18n";
import { C, F, shadow } from "../theme/tokens";
import { Wren } from "./Wren";
import { useBreathe, usePulse } from "./anim";

/* ✦ Wren on you — the night card, alive: a breathing Wren perched in the
   corner, slow-pulsing aurora glows, faint stars, and her read of your hand
   set like a pull-quote. */

const LIGHT = "#9B9BF9";

export function WrenOnYou({
  line,
  hasText,
  onReadAgain,
}: {
  line: string | null;
  hasText: boolean;
  onReadAgain: () => Promise<void> | void;
}) {
  useLang();
  const wren = useWrenName();
  const breathe = useBreathe(4, 3600);
  const glowPulse = usePulse(0.14, 0.26, 5200);
  const [reading, setReading] = useState(false);
  const readingPulse = usePulse(0.4, 1, 1100);

  const readAgain = async () => {
    if (reading) return;
    setReading(true);
    try {
      await onReadAgain();
    } finally {
      setReading(false);
    }
  };

  const text =
    line ||
    (hasText
      ? t("wy.reading")
      : t("wy.start"));

  return (
    <Animated.View
      entering={FadeInDown.duration(500)}
      style={[{ borderRadius: 22, overflow: "hidden", backgroundColor: C.night }, shadow.lift]}
    >
      {/* aurora glows */}
      <Animated.View
        style={[
          { position: "absolute", bottom: -80, right: -50, width: 230, height: 230, borderRadius: 115, backgroundColor: C.purple },
          glowPulse,
        ]}
      />
      <View style={{ position: "absolute", top: -70, left: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: "#6D6DF6", opacity: 0.08 }} />
      {/* faint stars */}
      {[
        { top: 18, left: "58%" as const, s: 2.5, o: 0.5 },
        { top: 44, left: "82%" as const, s: 1.8, o: 0.35 },
        { top: 84, left: "68%" as const, s: 2, o: 0.25 },
        { top: 30, left: "38%" as const, s: 1.6, o: 0.3 },
      ].map((st, i) => (
        <View
          key={i}
          style={{ position: "absolute", top: st.top, left: st.left, width: st.s * 2, height: st.s * 2, borderRadius: st.s, backgroundColor: "#CFCFFC", opacity: st.o }}
        />
      ))}

      {/* wren perched in the corner, breathing */}
      <Animated.View style={[{ position: "absolute", top: 16, right: 18 }, breathe]}>
        <Wren size={30} mode="line" color={LIGHT} />
      </Animated.View>

      <View style={{ padding: 22, paddingTop: 20 }}>
        <Text style={{ fontFamily: F.sansBold, fontSize: 10, letterSpacing: 2, color: LIGHT }}>✦ WREN ON YOU</Text>

        {/* pull-quote */}
        <View style={{ marginTop: 14, paddingRight: 34 }}>
          <Text style={{ position: "absolute", top: -14, left: -6, fontFamily: F.serif, fontSize: 56, color: LIGHT, opacity: 0.18 }}>
            “
          </Text>
          <Text style={{ fontFamily: F.serif, fontSize: 17.5, lineHeight: 28, color: "#F3F2F8" }}>{text}</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: "rgba(243,242,248,0.45)" }}>
            — {wren}, who reads the post
          </Text>
          {hasText && (
            <Pressable
              onPress={readAgain}
              hitSlop={6}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 13,
                paddingVertical: 8,
                borderRadius: 16,
                backgroundColor: "rgba(155,155,249,0.14)",
                borderWidth: 1,
                borderColor: "rgba(155,155,249,0.25)",
              }}
            >
              {reading ? (
                <Animated.Text style={[{ fontFamily: F.sansMed, fontSize: 12.5, color: LIGHT }, readingPulse]}>
                  reading…
                </Animated.Text>
              ) : (
                <Text style={{ fontFamily: F.sansMed, fontSize: 12.5, color: LIGHT }}>↻ read again</Text>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </Animated.View>
  );
}
