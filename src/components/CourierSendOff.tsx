import { useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import Animated, {
  Easing,
  interpolate,
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
import { StampTile } from "./StampTile";
import { useWrenName } from "../lib/wren-name";
import { dShort } from "../lib/format";

/* THE TWO ENDINGS, AND WHY THEY ARE OPPOSITES.

   The Post is a machine and the letter is a person — so the send-off is the
   one moment you watch the machine touch what you wrote. A LETTER gets the
   counter ritual: the postmark STRIKES (the whole desk kicks, and so does the
   phone), the docket line types itself, and only then does the courier take
   it off the top of the screen. A SEALED PAGE is written to stay — so the
   reverse motion, in the reverse direction: the seal presses in, the desk
   opens a slot, and the page sinks DOWN into it; the rule closes over it and
   the bird keeps her back turned. Sent leaves by the top; kept goes into the
   desk. Anything that flew the journal away would break the one promise the
   sealed room is built on. */

/* the ka-chunk. expo-haptics may be missing from an older dev client — the
   strike still reads without it, so it degrades to silence, never a crash */
let Haptics: typeof import("expo-haptics") | null = null;
try {
  Haptics = require("expo-haptics");
} catch {}
function kaChunk(heavy: boolean) {
  try {
    void Haptics?.impactAsync(
      heavy ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    );
  } catch {}
}

const ENV_W = 150;
const ENV_H = 100;

/* the envelope on the counter — paper, flap, airmail edge, and the stamp the
   writer actually chose, waiting in the corner for the postmark to cancel it */
function Envelope({ stamp }: { stamp?: string }) {
  return (
    <View style={{ width: ENV_W, height: ENV_H }}>
      <Svg width={ENV_W} height={ENV_H} viewBox="0 0 150 100">
        <Rect x={1} y={1} width={148} height={98} fill={P.paper} stroke={P.ink} strokeWidth={1.4} />
        <Path d="M1 1 L75 54 L149 1" fill="none" stroke={P.ink} strokeWidth={1.4} />
        {Array.from({ length: 12 }).map((_, i) => (
          <Rect key={i} x={6 + i * 12} y={92} width={6} height={3.4} fill={i % 2 ? P.post : P.air} />
        ))}
      </Svg>
      {stamp && (
        <View style={{ position: "absolute", top: 8, right: 9 }}>
          <StampTile id={stamp} w={30} r={3} />
        </View>
      )}
    </View>
  );
}

/* the cancellation — P.post is this object's colour and no one else's */
function Postmark() {
  return (
    <View
      style={{
        width: 66,
        height: 66,
        borderRadius: 33,
        borderWidth: 2.5,
        borderColor: P.post,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ rotate: "-12deg" }],
      }}
    >
      <View style={{ position: "absolute", width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: P.post, borderStyle: "dashed", opacity: 0.7 }} />
      <Text style={{ fontFamily: PF.mono, fontSize: 7, letterSpacing: 0.5, color: P.post }}>KINDREDLY</Text>
      <Text style={{ fontFamily: PF.mono, fontSize: 7, color: P.post, marginTop: 1 }}>{dShort(new Date()).toUpperCase()}</Text>
    </View>
  );
}

export function CourierSendOff({
  keep = false,
  ready = true,
  title,
  note,
  stamp,
  no,
  onDone,
}: {
  keep?: boolean;
  /** the work behind the ritual is truly done — the courier won't take the
   *  letter until it is. Strike and docket play over the wait. */
  ready?: boolean;
  title?: string;
  note?: string;
  /** the stamp id the writer picked — it rides the envelope and gets cancelled */
  stamp?: string;
  /** the sender's post number — the counter logs who handed it in */
  no?: number;
  onDone?: () => void;
}) {
  const wren = useWrenName();
  const reduce = useReducedMotion();

  const docketFull = `${no ? `No. ${String(no).padStart(4, "0")} — ` : ""}ACCEPTED FOR CARRIAGE`;
  const [docket, setDocket] = useState("");

  // the beats
  const strike = useSharedValue(0); // postmark: falls in and hits
  const shake = useSharedValue(0); // the desk kicks
  const birdIn = useSharedValue(0); // the courier arrives
  const fly = useSharedValue(0); // the climb out the top
  const press = useSharedValue(0); // keep: the seal presses in
  const sink = useSharedValue(0); // keep: the page goes into the desk
  const after = useSharedValue(0); // keep: "Kept." fades up

  const mountAt = useRef(Date.now());

  useEffect(() => {
    const finish = () => onDone?.();
    if (reduce) {
      // motion-sensitive: the finished tableau, held still; the letter's
      // dismissal waits for ready in the effect below
      strike.value = 1;
      press.value = 1;
      after.value = 1;
      setDocket(docketFull);
      if (!keep) return;
      const t = setTimeout(finish, 1500);
      return () => clearTimeout(t);
    }

    let typer: ReturnType<typeof setInterval> | undefined;
    const startDocket = () => {
      let i = 0;
      typer = setInterval(() => {
        i += 1;
        setDocket(docketFull.slice(0, i));
        if (i >= docketFull.length && typer) clearInterval(typer);
      }, 26);
    };

    if (keep) {
      // press → kick → the desk takes it → Kept.
      press.value = withDelay(
        350,
        withTiming(1, { duration: 200, easing: Easing.in(Easing.quad) }, (ok) => {
          if (!ok) return;
          runOnJS(kaChunk)(false);
          shake.value = withSequence(withTiming(2.5, { duration: 50 }), withTiming(0, { duration: 130 }));
        }),
      );
      sink.value = withDelay(
        1050,
        withSequence(
          withTiming(-8, { duration: 140, easing: Easing.out(Easing.quad) }),
          withTiming(270, { duration: 680, easing: Easing.in(Easing.cubic) }),
        ),
      );
      after.value = withDelay(1900, withTiming(1, { duration: 320 }));
      const t = setTimeout(finish, 3050);
      return () => {
        clearTimeout(t);
        if (typer) clearInterval(typer);
      };
    }

    // the counter: strike → kick + docket. These play over whatever wait the
    // network imposes; the courier herself is gated on `ready` below.
    strike.value = withDelay(
      380,
      withTiming(1, { duration: 190, easing: Easing.in(Easing.quad) }, (ok) => {
        if (!ok) return;
        runOnJS(kaChunk)(true);
        runOnJS(startDocket)();
        shake.value = withSequence(withTiming(3, { duration: 55 }), withTiming(0, { duration: 140 }));
      }),
    );
    return () => {
      if (typer) clearInterval(typer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keep, reduce]);

  /* THE FLIGHT WAITS FOR THE TRUTH. She only takes the letter once it has
     actually gone through — never sooner than the ritual needs (1.9s from
     mount), never later than the work allows. */
  useEffect(() => {
    if (keep || !ready) return;
    const finish = () => onDone?.();
    if (reduce) {
      const t = setTimeout(finish, 900);
      return () => clearTimeout(t);
    }
    const wait = Math.max(0, 1900 - (Date.now() - mountAt.current));
    birdIn.value = withDelay(wait, withTiming(1, { duration: 340, easing: Easing.out(Easing.back(1.6)) }));
    fly.value = withDelay(
      wait + 500,
      withSequence(
        withTiming(-0.04, { duration: 160, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 1400, easing: Easing.in(Easing.cubic) }, (ok) => ok && runOnJS(finish)()),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, keep, reduce]);

  const deskStyle = useAnimatedStyle(() => ({ transform: [{ translateY: shake.value }] }));

  const strikeStyle = useAnimatedStyle(() => ({
    opacity: strike.value * 0.94,
    transform: [{ scale: interpolate(strike.value, [0, 1], [2.6, 1]) }],
  }));

  const flyerStyle = useAnimatedStyle(() => {
    const p = Math.max(0, fly.value);
    return {
      opacity: 1 - Math.max(0, (p - 0.72) / 0.28),
      transform: [
        { translateY: fly.value * (fly.value < 0 ? -300 : -560) },
        { translateX: p * 64 },
        { rotate: `${-p * 10}deg` },
        { scale: 1 - p * 0.1 },
      ],
    };
  });

  const birdStyle = useAnimatedStyle(() => ({
    opacity: birdIn.value,
    transform: [{ translateY: interpolate(birdIn.value, [0, 1], [-46, 0]) }],
  }));

  // the words arrive as she leaves
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.max(0, fly.value), [0.2, 0.55], [0, 1], "clamp"),
  }));

  const pressStyle = useAnimatedStyle(() => ({
    opacity: press.value,
    transform: [{ scale: interpolate(press.value, [0, 1], [1.9, 1]) }],
  }));

  const sinkStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sink.value }] }));
  const afterStyle = useAnimatedStyle(() => ({ opacity: after.value }));

  if (keep) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 2, color: P.ink40, position: "absolute", top: "12%" }}>
          KINDREDLY
        </Text>

        <Animated.View style={[{ width: 280, height: 430 }, deskStyle]}>
          {/* the page, above the slot, about to be taken in */}
          <Animated.View style={[{ position: "absolute", top: 46, left: 140 - 59, zIndex: 2 }, sinkStyle]}>
            <View style={{ width: 118, height: 150, backgroundColor: P.paper, borderWidth: 1.4, borderColor: P.ink }}>
              <View style={{ height: 1.5, backgroundColor: P.ink12, marginTop: 26, marginHorizontal: 13 }} />
              <View style={{ height: 1.5, backgroundColor: P.ink12, marginTop: 16, marginHorizontal: 13 }} />
              <View style={{ height: 1.5, backgroundColor: P.ink12, marginTop: 16, marginHorizontal: 13, marginRight: 36 }} />
            </View>
            <Animated.View style={[{ position: "absolute", top: 92, left: 59 - 26 }, pressStyle]}>
              <Seal size={52} />
            </Animated.View>
          </Animated.View>

          {/* the desk: everything below the slot swallows the page */}
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 130, backgroundColor: P.paper, zIndex: 3 }} />
          <View style={{ position: "absolute", left: 50, right: 50, bottom: 130, borderTopWidth: 1.5, borderTopColor: P.ink, zIndex: 4 }} />
          <View style={{ position: "absolute", left: 44, bottom: 128, width: 5, height: 5, backgroundColor: P.ink, zIndex: 4 }} />
          <View style={{ position: "absolute", right: 44, bottom: 128, width: 5, height: 5, backgroundColor: P.ink, zIndex: 4 }} />

          {/* she keeps her back to it — this one is not hers to carry */}
          <Animated.View style={[{ position: "absolute", right: 16, bottom: 152, zIndex: 5, alignItems: "flex-end" }, afterStyle]}>
            <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 0.5, color: P.ink40, marginBottom: 6 }}>
              not mine to carry
            </Text>
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <WrenBird size={44} mood="content" bare />
            </View>
          </Animated.View>

          <Animated.View style={[{ position: "absolute", left: 0, right: 0, bottom: 36, alignItems: "center", zIndex: 5 }, afterStyle]}>
            <Text style={{ fontFamily: PF.letter, fontSize: 25, fontWeight: "600", color: P.ink }}>Kept.</Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: P.ink40, marginTop: 10, textAlign: "center" }}>
              NO ONE READS THIS — NOT EVEN {wren.toUpperCase()}
            </Text>
          </Animated.View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 2, color: P.ink40, position: "absolute", top: "12%" }}>
        KINDREDLY
      </Text>

      <Animated.View style={[{ width: 280, height: 430, alignItems: "center" }, deskStyle]}>
        {/* the courier and the letter — one body once she has it */}
        <Animated.View style={[{ alignItems: "center", marginTop: 58 }, flyerStyle]}>
          <Animated.View style={birdStyle}>
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <WrenBird size={84} pose="fly" bare />
            </View>
          </Animated.View>
          <View style={{ marginTop: -10 }}>
            <Envelope stamp={stamp} />
            {/* the strike lands across the stamp's corner */}
            <Animated.View style={[{ position: "absolute", top: -14, right: -16 }, strikeStyle]}>
              <Postmark />
            </Animated.View>
          </View>
        </Animated.View>

        {/* the machine logs it, one character at a time */}
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 118, alignItems: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 10, letterSpacing: 1, color: P.ink60 }}>{docket}</Text>
        </View>

        <Animated.View style={[{ position: "absolute", left: 0, right: 0, bottom: 36, alignItems: "center" }, titleStyle]}>
          <Text style={{ fontFamily: PF.letter, fontSize: 25, fontWeight: "600", color: P.ink, textAlign: "center" }}>
            {title ?? `${wren} has it.`}
          </Text>
          <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: P.ink40, marginTop: 10, textAlign: "center" }}>
            {note ?? "THE FIRST TO ANSWER IS YOURS"}
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
