import { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { P, PF } from "../theme/post";
import { WrenBird } from "./WrenBird";
import { t } from "../lib/i18n";

/* THE ONE MOMENT THE PRODUCT USED TO SAY NOTHING AT ALL.
 *
 * A purchase closed the paywall and returned you to whatever was behind it.
 * Apple's own receipt sheet had already appeared, so the last thing the
 * product itself said about the most important decision anyone makes here
 * was nothing — and Apple's sheet is a receipt, not a welcome.
 *
 * No confetti: this is a post office, and First Class is a postal class
 * before it is a subscription tier. So the thing that happens is the thing
 * that happens to a letter that has been upgraded — the airmail border, and
 * a FIRST CLASS mark struck across it in the postmark's own red. Same
 * gesture as CourierSendOff's strike, same ka-chunk, so the reader has met
 * it before. Wren wears the scarf she was promised in the fare list.
 */

let Haptics: typeof import("expo-haptics") | null = null;
try {
  Haptics = require("expo-haptics");
} catch {}
const kaChunk = () => {
  try {
    void Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {}
};

/* the red-and-blue chevrons down an airmail envelope's edge */
function AirmailEdge({ w, flip }: { w: number; flip?: boolean }) {
  const bars = Math.ceil(w / 14) + 1;
  return (
    <Svg width={w} height={9} style={flip ? { transform: [{ rotate: "180deg" }] } : undefined}>
      {Array.from({ length: bars }, (_, i) => (
        <Path
          key={i}
          d={`M${i * 14} 9 L${i * 14 + 7} 0 L${i * 14 + 12} 0 L${i * 14 + 5} 9 Z`}
          fill={i % 2 ? P.post : P.pen}
        />
      ))}
    </Svg>
  );
}

export function FirstClassWelcome({ lifetime, onDone }: { lifetime?: boolean; onDone: () => void }) {
  const card = useSharedValue(0);
  const mark = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      card.value = 1;
      mark.value = 1;
      return;
    }
    // the ticket lands
    card.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    // and the mark comes down on it, hard, once
    mark.value = withDelay(
      430,
      withSequence(
        withTiming(1, { duration: 190, easing: Easing.in(Easing.quad) }),
        withTiming(0.94, { duration: 90 }),
        withTiming(1, { duration: 70 }),
      ),
    );
    const id = setTimeout(kaChunk, 610); // on impact, not on mount
    return () => clearTimeout(id);
  }, [reduced, card, mark]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: card.value,
    transform: [{ translateY: (1 - card.value) * 26 }, { scale: 0.96 + card.value * 0.04 }],
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, mark.value * 2),
    transform: [{ scale: 2.2 - mark.value * 1.2 }, { rotate: `${-13 + (1 - mark.value) * 9}deg` }],
  }));

  return (
    <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(17,17,19,0.55)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }}>
      <Animated.View style={[{ width: "100%", maxWidth: 360, backgroundColor: P.paper }, cardStyle]}>
        <AirmailEdge w={360} />

        <View style={{ paddingHorizontal: 26, paddingTop: 30, paddingBottom: 26, alignItems: "center" }}>
          <WrenBird size={92} mood="delight" accessory="scarf" stage="wren" />

          {/* the strike — absolutely placed so it lands ACROSS her, the way a
              postmark lands across whatever is already on the envelope */}
          <Animated.View style={[{ position: "absolute", top: 44, alignSelf: "center" }, markStyle]}>
            <View style={{ borderWidth: 2.5, borderColor: P.post, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: "transparent" }}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 15, letterSpacing: 2.5, color: P.post }}>
                {t("pw.welcome.mark")}
              </Text>
            </View>
          </Animated.View>

          <Text style={{ fontFamily: PF.letter, fontSize: 25, lineHeight: 33, color: P.ink, textAlign: "center", marginTop: 26 }}>
            {t(lifetime ? "pw.welcome.lifeTitle" : "pw.welcome.title")}
          </Text>
          <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 23, color: P.ink60, textAlign: "center", marginTop: 12 }}>
            {t(lifetime ? "pw.welcome.lifeBody" : "pw.welcome.body")}
          </Text>

          <Pressable
            onPress={onDone}
            style={{ marginTop: 26, alignSelf: "stretch", backgroundColor: P.ink, paddingVertical: 15, alignItems: "center" }}
          >
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 2, color: "#fff" }}>
              {t("pw.welcome.go")}
            </Text>
          </Pressable>
        </View>

        <AirmailEdge w={360} flip />
      </Animated.View>
    </View>
  );
}
