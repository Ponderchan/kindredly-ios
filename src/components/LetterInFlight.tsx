import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { MONO, PFM } from "../theme/post";
import { useP } from "../lib/theme";
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
 * left, but how far she has come.
 *
 * SHE CROSSES ONCE. The first cut looped her, so on any send slower than
 * the beat she snapped back to the left edge and set off again — a delivery
 * that un-delivers itself, twitching. One crossing is the whole gesture:
 * she leaves, she arrives, she stays on the mark. If the letter is still in
 * the air after that, the headwind line says so in words, which is what
 * words are for.
 *
 * When the reader has asked the system for less motion, the animation is
 * the message, so the words come back instead of the flight.
 *
 * 10a (step 5): it wears the theme (useP: the route in ink at a fifth, the
 * flown part in ind, the envelope on the card face), so Midnight shows a
 * pale route on the dark page instead of a black one; its small mono is 10
 * and 11. On Today's SwiftUI desk it sits over the Host where the pill was
 * (bottom = the tab bar's room + 6), the pill having stepped aside.
 */
const BIRD = 34;
/* just inside the beat, so she is on the postmark — not still over the
   dashes — at the instant the row is taken away. */
const CYCLE = Math.max(380, SEND_BEAT_MS - 70);

export function LetterInFlight({ to, slow }: { to?: string | null; slow?: boolean }) {
  const P = useP();
  const [w, setW] = useState(0);
  const p = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    /* SINE, NOT QUAD. inOut(quad) peaks at twice the average speed halfway
       across, so however long the crossing is she still whips through the
       middle of it — which is the part that read as hurried. inOut(sin) is
       the gentlest ease that still starts and stops at rest: it peaks at
       1.57x, so most of the flight happens near one steady speed. */
    p.value = withTiming(1, { duration: CYCLE, easing: Easing.inOut(Easing.sin) });
  }, [reduced, p]);

  const span = Math.max(0, w - BIRD - 30);

  const birdStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: p.value * span },
      /* ONE arc, not three. Three half-sine bobs inside a 600ms crossing
         read as panic — a bird fighting the air. A single rise and settle
         is a glide: up out of the composer, down onto the mark. The pitch
         follows the same story, nose lifting into the climb and dipping
         for the landing, instead of wobbling. */
      { translateY: -5 * Math.sin(p.value * Math.PI) },
      { rotate: `${-3 + p.value * 6}deg` },
    ],
    /* she fades in off the left edge, and does NOT fade out again — she is
       landing, not disappearing. */
    opacity: p.value < 0.05 ? 0.35 + (p.value / 0.05) * 0.65 : 1,
  }));

  // the road she has already flown
  const inkedStyle = useAnimatedStyle(() => ({ width: p.value * span + BIRD / 2 }));

  if (reduced) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: P.ink12, paddingVertical: 16 }}>
        <WrenBird size={26} pose="fly" mood="content" />
        <Text style={{ ...PFM.monoSemi, fontSize: MONO.title, letterSpacing: 1.3, color: P.pen }}>
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
          style={{ position: "absolute", right: 0, top: 46, ...PFM.monoMed, fontSize: MONO.label, letterSpacing: 0.6, color: P.ink40 }}
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
          style={{ position: "absolute", left: 0, top: 46, ...PFM.monoMed, fontSize: MONO.label, letterSpacing: 0.6, color: P.ink40, textTransform: "uppercase" }}
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
          <Rect x={0.6} y={0.6} width={13.8} height={9.8} rx={1} fill={P.sheet} stroke={P.ink} strokeWidth={1} />
          <Path d="M0.6 1.4 L7.5 6.4 L14.4 1.4" fill="none" stroke={P.ink} strokeWidth={1} />
        </Svg>
      </Animated.View>
    </View>
  );
}
