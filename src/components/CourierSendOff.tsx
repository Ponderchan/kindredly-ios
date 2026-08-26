import { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path, Rect } from "react-native-svg";
import { P, PF } from "../theme/post";
import { Seal } from "./Seal";
import { WrenBird } from "./WrenBird";
import { useWrenName } from "../lib/wren-name";

/* THE TWO ENDINGS, AND WHY THEY ARE OPPOSITES.

   The app has two composers that finish in two contradictory promises. A
   LETTER is written to leave — so its ending is departure: the named courier
   takes it in her beak and flies off the top of the screen, and the paper goes
   with her. A SEALED PAGE is written to stay — "no one sees this, not even me"
   — so its ending must be the reverse motion: the page presses shut and is
   kept, and the bird deliberately looks away. Same bird, same paper, opposite
   verbs. Anything that flew the journal away would break the one promise the
   sealed room is built on.

   `keep=false` → the letter flies. `keep=true` → the page is kept. */

const ENV_W = 128;

/* the sealed envelope the courier carries — a paper rectangle, the airmail
   edge, and Wren's blind emboss pressed into it */
function Envelope() {
  return (
    <View style={{ width: ENV_W, height: ENV_W * 0.66, alignItems: "center", justifyContent: "center" }}>
      <Svg width={ENV_W} height={ENV_W * 0.66} viewBox="0 0 128 84">
        <Rect x={1} y={1} width={126} height={82} fill={P.paper} stroke={P.ink} strokeWidth={1.4} />
        <Path d="M1 1 L64 46 L127 1" fill="none" stroke={P.ink} strokeWidth={1.4} />
        {/* airmail dashes along the foot */}
        {Array.from({ length: 12 }).map((_, i) => (
          <Rect key={i} x={5 + i * 10} y={78} width={5} height={3} fill={i % 2 ? P.post : P.air} />
        ))}
      </Svg>
      <View style={{ position: "absolute" }}>
        <Seal size={40} />
      </View>
    </View>
  );
}

export function CourierSendOff({
  keep = false,
  title,
  note,
  onDone,
}: {
  keep?: boolean;
  title?: string;
  note?: string;
  onDone?: () => void;
}) {
  const wren = useWrenName();
  const reduce = useReducedMotion();

  // one clock, 0 → 1, drives the whole beat
  const t = useSharedValue(0);
  // the kept page's press-and-settle
  const press = useSharedValue(0);

  useEffect(() => {
    const finish = () => onDone?.();
    if (reduce) {
      // motion-sensitive: hold the tableau still, then leave
      press.value = 1;
      t.value = withDelay(1100, withTiming(1, { duration: 1 }, (ok) => ok && runOnJS(finish)()));
      return;
    }
    if (keep) {
      // press the seal down, let it settle, hold — then dismiss
      press.value = withSequence(
        withTiming(1, { duration: 260, easing: Easing.in(Easing.quad) }),
        withTiming(0.94, { duration: 420, easing: Easing.out(Easing.back(1.4)) }),
      );
      t.value = withDelay(1650, withTiming(1, { duration: 1 }, (ok) => ok && runOnJS(finish)()));
    } else {
      // a beat to lift off, then the long climb out the top
      t.value = withSequence(
        withDelay(360, withTiming(0.18, { duration: 220, easing: Easing.out(Easing.quad) })),
        withTiming(1, { duration: 1500, easing: Easing.in(Easing.cubic) }, (ok) => ok && runOnJS(finish)()),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keep, reduce]);

  /* THE FLIGHT — the courier and the letter as one body. Rises off the bottom,
     drifts a little to the right as real flight does, tilts into the climb, and
     fades as it clears the frame. */
  const flyer = useAnimatedStyle(() => {
    const p = t.value;
    return {
      opacity: keep ? 1 : 1 - Math.max(0, (p - 0.75) / 0.25),
      transform: keep
        ? [{ translateY: 0 }]
        : [
            { translateY: -p * 520 },
            { translateX: p * 78 },
            { rotate: `${-6 - p * 10}deg` },
            { scale: 1 - p * 0.12 },
          ],
    };
  });

  /* THE KEPT PAGE — the seal pressing in, then easing back a hair, and staying */
  const kept = useAnimatedStyle(() => ({
    transform: [{ scale: 0.9 + press.value * 0.16 }],
  }));

  if (keep) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }}>
        <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 2, color: P.ink40, position: "absolute", top: "16%" }}>
          KINDREDLY
        </Text>

        <View style={{ alignItems: "center" }}>
          <Animated.View style={kept}>
            <Envelope />
          </Animated.View>
          {/* she keeps her back to it — she can't read this one either */}
          <View style={{ marginTop: 18, transform: [{ scaleX: -1 }] }}>
            <WrenBird size={72} mood="sleepy" pose="perch" bare />
          </View>
        </View>

        <Text style={{ fontFamily: PF.letter, fontSize: 25, fontWeight: "600", color: P.ink, textAlign: "center", marginTop: 26, lineHeight: 34 }}>
          Kept.
        </Text>
        <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 1.2, color: P.ink40, marginTop: 14, textAlign: "center" }}>
          NO ONE READS THIS — NOT EVEN {wren.toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }}>
      <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 2, color: P.ink40, position: "absolute", top: "16%" }}>
        KINDREDLY
      </Text>

      {/* the courier carrying the letter — bird above, envelope tucked beneath
          the beak, moving as one */}
      <Animated.View style={[{ alignItems: "center" }, flyer]}>
        <View style={{ transform: [{ scaleX: -1 }] }}>
          <WrenBird size={96} pose="fly" bare />
        </View>
        <View style={{ marginTop: -14, transform: [{ rotate: "4deg" }] }}>
          <Envelope />
        </View>
      </Animated.View>

      <Text style={{ fontFamily: PF.letter, fontSize: 25, fontWeight: "600", color: P.ink, textAlign: "center", marginTop: 30, lineHeight: 34 }}>
        {title ?? `${wren} has it.`}
      </Text>
      <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 1.2, color: P.ink40, marginTop: 14, textAlign: "center" }}>
        {note ?? "THE FIRST TO ANSWER IS YOURS"}
      </Text>
    </View>
  );
}
