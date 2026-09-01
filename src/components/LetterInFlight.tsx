import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { P, PF } from "../theme/post";
import { WrenBird } from "./WrenBird";
import { t } from "../lib/i18n";
import { SEND_BEAT_MS } from "../lib/net";

/* THE CROSSING.
 *
 * A send used to be "···", then a postmark and the words ON ITS WAY — an
 * improvement that was still a label doing the work. But this product
 * already has someone whose entire job is this moment: Wren is the courier,
 * she has a flight pose that has never once been used to fly, and the thing
 * she is meant to be carrying is the letter you just wrote.
 *
 * So she carries it. The route ahead is drawn as the dashes on an airmail
 * envelope; the part she has already flown inks in solid behind her, which
 * is the one honest thing an indeterminate wait can show — not how much is
 * left, but how far she has come. She reaches the destination's postmark,
 * and if the letter still hasn't landed she sets off again.
 *
 * When the reader has asked the system for less motion, the animation is
 * the message, so the words come back instead of the flight.
 */
const BIRD = 34;
/* just inside the beat, so she is on the postmark — not still over the
   dashes — at the instant the row is taken away. Past the first crossing
   the repeat is the honest signal: more than one lap means the send is
   taking longer than a send takes, which is when the headwind line shows. */
const CYCLE = Math.max(380, SEND_BEAT_MS - 70);

export function LetterInFlight({ to, slow }: { to?: string | null; slow?: boolean }) {
  const [w, setW] = useState(0);
  const p = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    p.value = withRepeat(withTiming(1, { duration: CYCLE, easing: Easing.inOut(Easing.quad) }), -1, false);
  }, [reduced, p]);

  const span = Math.max(0, w - BIRD - 30);

  const birdStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: p.value * span },
      // she rides the air rather than sliding along a rail
      { translateY: -3.5 * Math.sin(p.value * Math.PI * 3) },
      // and tips into the climb
      { rotate: `${-2.5 * Math.cos(p.value * Math.PI * 3)}deg` },
    ],
    // she fades in off the left edge and out into the postmark
    opacity: p.value < 0.05 ? 0.35 + (p.value / 0.05) * 0.65 : p.value > 0.95 ? 0.35 + ((1 - p.value) / 0.05) * 0.65 : 1,
  }));

  // the road she has already flown
  const inkedStyle = useAnimatedStyle(() => ({ width: p.value * span + BIRD / 2 }));

  if (reduced) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: P.ink12, paddingVertical: 16 }}>
        <WrenBird size={26} pose="fly" mood="content" />
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 11.5, letterSpacing: 1.3, color: P.pen }}>
          {t("ld.onItsWay")}
          {to ? ` · ${to}` : ""}
        </Text>
      </View>
    );
  }

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ height: 62, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: P.ink12 }}
    >
      {/* the route: dashes ahead, ink behind */}
      <View style={{ position: "absolute", left: 0, right: 0, top: 40, height: 1, flexDirection: "row", alignItems: "center" }}>
        <Svg width="100%" height={1}>
          <Line x1={0} y1={0.5} x2="100%" y2={0.5} stroke={P.ink} strokeWidth={1} strokeDasharray="2 5" opacity={0.22} />
        </Svg>
      </View>
      <Animated.View style={[{ position: "absolute", left: 0, top: 40, height: 1, backgroundColor: P.pen }, inkedStyle]} />

      {/* where she is going */}
      <View style={{ position: "absolute", right: 0, top: 26, alignItems: "center", gap: 4 }}>
        <Svg width={16} height={16} viewBox="0 0 16 16">
          <Circle cx={8} cy={8} r={6.6} fill="none" stroke={P.ink} strokeWidth={1} opacity={0.3} />
          <Circle cx={8} cy={8} r={2.4} fill={P.ink} opacity={0.22} />
        </Svg>
      </View>
      {to ? (
        <Text
          style={{ position: "absolute", right: 0, top: 46, fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 0.6, color: P.ink40 }}
        >
          {to}
        </Text>
      ) : null}
      {/* A FLOATING PILL WAS THE WRONG PLACE TO SAY THIS. It had to be
          parked somewhere, and every somewhere was on top of either the
          courier or the letter being read. The row already reports the
          send; when the send is slow, the row says so. */}
      {slow ? (
        <Text
          style={{ position: "absolute", left: 0, top: 46, fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 0.6, color: P.ink40, textTransform: "uppercase" }}
        >
          {t("net.slow")}
        </Text>
      ) : null}

      {/* the courier, and what she is carrying */}
      <Animated.View style={[{ position: "absolute", left: 0, top: 6, width: BIRD, alignItems: "center" }, birdStyle]}>
        {/* NOT `bare`, and NOT flipped. The die-cut outline is the only
            thing keeping a lavender bird visible against a lavender desk —
            that outline is exactly what it is for. And the fly art already
            faces right, the way she is travelling; CourierSendOff flips it
            because she leaves by the top there, and copying that flip here
            had her going up her own route backwards. */}
        <WrenBird size={BIRD} pose="fly" mood="delight" />
        <Svg width={15} height={11} viewBox="0 0 15 11" style={{ marginTop: -6 }}>
          <Rect x={0.6} y={0.6} width={13.8} height={9.8} rx={1} fill={P.paper} stroke={P.ink} strokeWidth={1} />
          <Path d="M0.6 1.4 L7.5 6.4 L14.4 1.4" fill="none" stroke={P.ink} strokeWidth={1} />
        </Svg>
      </Animated.View>
    </View>
  );
}
