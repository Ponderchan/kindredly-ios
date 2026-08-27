import { useCallback, useRef } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path, Rect } from "react-native-svg";
import { P, PF } from "../theme/post";

/* THE COUNTER OPENS — the launch.
   ────────────────────────────────────────────────────────────────────────
   A splash screen is the one frame every reader sees, so it should be made
   of the product rather than placed on top of it. This one is: paper, two
   hairlines, mono caps, and a single postmark-red stroke. Nothing scales in,
   nothing glows, nothing bounces — the same grammar as every other surface.

   The object is a COUNTER SLOT. Two rules run out to make the gap, the
   wordmark is pushed up through it the way a card is handed across a
   counter, a cancelling stroke crosses the lower rule, and then the paper
   retracts along those two lines: the counter opening, with the room behind
   it. The app is already mounted underneath — this never blocks it.

   Once the wordmark has landed, the slot's lower edge grows the red-and-blue
   airmail striping — the one object theme/post lets both colours out for, and
   the plainest way to say "this is going somewhere" without a word. It is the
   last thing to leave the screen. A bare red rule was tried first and thrown
   out: `post` is the postmark's ink and that object's alone, so a red line on
   its own would have been a brand accent bar wearing the product's paint.

   It rhymes with the send-off without repeating it. CourierSendOff owns the
   postmark strike and the climb out the top; this owns the counter. And the
   courier stays out of it deliberately: a room opening is a more confident
   first frame than a mascot waving, and she has her own entrance later.

   Handoff: the native splash is the same paper with the same seeded hairline
   at the same place, so the moment JS takes over, nothing moves. */

const { width: W, height: H } = Dimensions.get("window");

const WORD = "KINDREDLY";
const SLOT_H = 46; // the gap between the two rules
const SEED = 44; // the hairline's width before it runs out — matches the native splash
/* dead centre, because that is where the native splash centres its image:
   the seeded slot below and the one in splash-counter.png are the same
   44 x 46 rectangle in the same place, so the handoff has nothing to move */
const CENTRE = H / 2;
const TOP_RULE = CENTRE - SLOT_H / 2;

/* The beats, in ms — the whole rhythm in one place, and deliberately short.
   A launch is a threshold, not a title sequence: nobody opens an app to
   watch it open. The four beats OVERLAP rather than queue — the airmail
   starts under the last letters, the counter starts opening under the last
   stripes — so the sequence still reads as four distinct events while
   costing about half of what running them end to end would. */
const RUN_OUT = { at: 0, ms: 200 };
const LETTER = { at: 130, step: 16, ms: 140 };
const AIRMAIL = { at: 320, ms: 170 };
const OPEN = { at: 500, ms: 240 }; // done at 740ms

export function CounterOpen({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const done = useRef(false);

  const runOut = useSharedValue(0);
  const airmail = useSharedValue(0);
  const open = useSharedValue(0);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);

  /* one pass, started on first render. Reduced motion still opens the
     counter — it just doesn't run the machine first. */
  const started = useRef(false);
  if (!started.current) {
    started.current = true;
    if (reduce) {
      runOut.value = 1;
      airmail.value = 1;
      open.value = withDelay(180, withTiming(1, { duration: 200 }, (ok) => ok && runOnJS(finish)()));
    } else {
      runOut.value = withDelay(RUN_OUT.at, withTiming(1, { duration: RUN_OUT.ms, easing: Easing.out(Easing.cubic) }));
      airmail.value = withDelay(AIRMAIL.at, withTiming(1, { duration: AIRMAIL.ms, easing: Easing.out(Easing.quad) }));
      open.value = withDelay(
        OPEN.at,
        withTiming(1, { duration: OPEN.ms, easing: Easing.inOut(Easing.cubic) }, (ok) => ok && runOnJS(finish)()),
      );
    }
  }

  /* a tap opens the counter now — nobody should have to watch this twice */
  const skip = () => {
    if (done.current || open.value > 0) return;
    open.value = withTiming(1, { duration: 170, easing: Easing.inOut(Easing.cubic) }, (ok) => ok && runOnJS(finish)());
  };

  // the rules run out from a seed the width of the native splash's mark
  const ruleStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: interpolate(runOut.value, [0, 1], [SEED / W, 1]) }] }));
  const lowerRuleStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(runOut.value, [0, 1], [SEED / W, 1]) }],
  }));

  const topPanel = useAnimatedStyle(() => ({ transform: [{ translateY: -open.value * TOP_RULE }] }));
  // the slot travels down with the lower paper, so the wordmark leaves the
  // way it arrived — back through the slot it was handed up from
  const bottomPanel = useAnimatedStyle(() => ({ transform: [{ translateY: open.value * (H - TOP_RULE) }] }));

  /* the airmail edge wipes in from the left. Width, not scaleX — scaling
     would shear the diagonals, and a squashed airmail bar is a wrong object */
  const airmailStyle = useAnimatedStyle(() => ({ width: airmail.value * W }));

  return (
    <Pressable onPress={skip} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      {/* the paper above the slot, and the upper rule on its edge */}
      <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, height: TOP_RULE, backgroundColor: P.paper }, topPanel]}>
        <Animated.View style={[{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1, backgroundColor: P.ink }, ruleStyle]} />
      </Animated.View>

      {/* the paper below, carrying the slot, the wordmark and the lower rule */}
      <Animated.View
        style={[{ position: "absolute", left: 0, right: 0, top: TOP_RULE, height: H - TOP_RULE, backgroundColor: P.paper }, bottomPanel]}
      >
        {/* the slot itself — the wordmark is clipped to it, so the letters
            only exist once they've been pushed up into the gap */}
        <View style={{ height: SLOT_H, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
          {/* caps leave the line box's descender space empty, so geometric
              centring reads high — this puts the impression on the slot's axis */}
          <View style={{ flexDirection: "row", marginTop: 2.5 }}>
            {WORD.split("").map((ch, i) => (
              <Strike key={i} ch={ch} i={i} reduce={reduce} />
            ))}
          </View>
        </View>

        {/* the lower rule, and the airmail edge that grows under it */}
        <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: SLOT_H, height: 1, backgroundColor: P.ink }, lowerRuleStyle]} />
        <Animated.View style={[{ position: "absolute", left: 0, top: SLOT_H + 1, height: 9, overflow: "hidden" }, airmailStyle]}>
          <AirmailEdge />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/* one letter, struck. They land in sequence rather than fading in together:
   a franking machine puts a wordmark down one hit at a time, and the product
   has always preferred a machine's voice to a brand's. */
function Strike({ ch, i, reduce }: { ch: string; i: number; reduce: boolean }) {
  const v = useSharedValue(reduce ? 1 : 0);
  const started = useRef(false);
  if (!started.current && !reduce) {
    started.current = true;
    v.value = withDelay(LETTER.at + i * LETTER.step, withTiming(1, { duration: LETTER.ms, easing: Easing.out(Easing.cubic) }));
  }
  const style = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: interpolate(v.value, [0, 1], [30, 0]) }],
  }));
  return (
    <Animated.View style={style}>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 15, letterSpacing: 6, color: P.ink }}>{ch}</Text>
    </Animated.View>
  );
}

/* the red-and-blue diagonal border every airmail envelope has worn since
   1920, at the width the slot needs. Same construction as the paywall's. */
function AirmailEdge() {
  const bars = Array.from({ length: Math.ceil(W / 9) + 2 }, (_, i) => i);
  return (
    <Svg width={W} height={9} viewBox={`0 0 ${W} 9`}>
      <Rect x={0} y={0} width={W} height={9} fill={P.paper} />
      {bars.map((i) => (
        <Path key={i} d={`M ${i * 9 - 4} 9 L ${i * 9 + 5} 0 L ${i * 9 + 9} 0 L ${i * 9} 9 Z`} fill={i % 2 === 0 ? P.post : P.air} />
      ))}
    </Svg>
  );
}
