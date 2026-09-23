import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useFrameCallback, useReducedMotion, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { t } from "../lib/i18n";
import type { WrenMood, WrenPose, WrenStage } from "./WrenBird";

/* THE PERCH — her cover as a small stage with depth, the web's CourierStage
   (owner, 2026-09-22: "a 3D-ish page you can drag up, down, left, right,
   with expressions and actions"), brought to the phone on 2026-09-24.

   The bird is flat art and her body never deforms (WrenBird's rule), so the
   depth is done the way a paper theatre does it: the sky is a far layer
   that drifts against her, a haze in the middle, a shadow on the boards
   that shrinks when she lifts, and she herself is a card turning in
   perspective — toward your finger, back with a lift, banked by her own
   speed. Every expression is one of her nine moods and two poses.

   The hand (a phone has no hover, so she watches the finger that holds her):
     drag    — picked up: wings out (the grown bird only), she follows with
               a spring lag, turns toward your finger and banks into the
               turn; the shadow falls away beneath her
     release — glides back to the perch with a bounce · delight; a fast
               fling and she loops once on the way down
     tap     — a hop and the next expression
     double  — a peck
     still   — 25 s without a hand and she dozes
   Reduced motion: no springs, no hop, no loop, no peck — only the faces.

   Same numbers as the web (stiffness, damping, clamps, the fling speed), so
   the two perches feel like one bird. The springs run on the UI thread and
   go to sleep once she is at rest, so a still perch costs nothing.

   Review fixes (2026-09-24): the single tap fires on its own and a double
   adds the peck (an exclusive pair cancelled nearly every tap while it
   waited for the double to fail); she turns toward the finger measured from
   the perch, not from inside her own moving frame; the hint and its
   placement live with the room (WrenHome). */

const clamp = (v: number, a: number, b: number) => {
  "worklet";
  return Math.max(a, Math.min(b, v));
};
const TAP_MOODS: WrenMood[] = ["happy", "wink", "delight", "think", "listen", "curious"];
const DOZE_MS = 25000;

let Haptics: typeof import("expo-haptics") | null = null;
try {
  Haptics = require("expo-haptics");
} catch {}
const lift = () => {
  try {
    void Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
};

export function CourierStage({
  width,
  height,
  size,
  bottom,
  stage,
  mood: baseMood,
  label,
  far,
  blocks,
  bird,
}: {
  width: number;
  height: number;
  size: number;
  /** where her feet stand, from the stage's bottom edge */
  bottom: number;
  stage: WrenStage;
  mood: WrenMood;
  /** her name, for VoiceOver */
  label: string;
  /** the far layer — the sky's discs, stars, sun or moon — drawn at the stage's size */
  far?: ReactNode;
  /** the scroll view the stage sits in: a drag that starts on her is hers, not the page's */
  blocks?: RefObject<any>;
  bird: (mood: WrenMood, pose: WrenPose, held: boolean) => ReactNode;
}) {
  const reduce = useReducedMotion();
  const [mood, setMood] = useState<WrenMood | null>(null); // null → whatever her whereabouts say
  const [pose, setPose] = useState<WrenPose>("perch");
  const [dozing, setDozing] = useState(false);
  const [held, setHeld] = useState(false);
  const tapN = useRef(0);
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleAt = useRef(Date.now());
  const gx = useSharedValue(0); // the finger, relative to the perch, at touch-down
  const gy = useSharedValue(0);

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const vx = useSharedValue(0);
  const vy = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const rz = useSharedValue(0);
  const trx = useSharedValue(0);
  const tryy = useSharedValue(0);
  const spin = useSharedValue(0);
  const spinT = useSharedValue(0);
  const x0 = useSharedValue(0);
  const y0 = useSharedValue(0);
  const dragging = useSharedValue(0);
  const flying = useSharedValue(0);
  const peck = useSharedValue(0);

  const say = useCallback((m: WrenMood, ms = 1100) => {
    setMood(m);
    if (moodTimer.current) clearTimeout(moodTimer.current);
    if (ms) moodTimer.current = setTimeout(() => setMood(null), ms);
  }, []);
  useEffect(() => () => {
    if (moodTimer.current) clearTimeout(moodTimer.current);
  }, []);

  /* left alone for 25 s, she dozes; any touch wakes her — and the springs */
  const loop = useRef<{ setActive: (on: boolean) => void } | null>(null);
  const wake = useCallback(() => {
    idleAt.current = Date.now();
    setDozing(false);
    loop.current?.setActive(true);
  }, []);
  const rest = useCallback(() => loop.current?.setActive(false), []);
  useEffect(() => {
    const id = setInterval(() => {
      if (dragging.value === 0 && Date.now() - idleAt.current > DOZE_MS) setDozing(true);
    }, 2000);
    return () => clearInterval(id);
  }, [dragging]);

  const onPick = useCallback(() => {
    setHeld(true);
    if (!reduce && stage === "wren") {
      // only the grown bird has wings to open
      flying.value = 1;
      setPose("fly");
    }
    say("happy", 0);
    lift();
  }, [reduce, stage, say, flying]);
  const onDrop = useCallback(() => {
    setHeld(false);
    say("delight", 1300);
    wake(); // the 25 s start again at release, not at the touch that picked her up
  }, [say, wake]);
  const onTap = useCallback(() => {
    wake();
    tapN.current = (tapN.current + 1) % TAP_MOODS.length;
    say(TAP_MOODS[tapN.current], 1400);
  }, [say, wake]);
  const onPeck = useCallback(() => {
    wake();
    if (reduce) {
      say("happy", 1100);
      return;
    }
    peck.value = withSequence(withTiming(1, { duration: 300 }), withTiming(0, { duration: 300 }), withTiming(1, { duration: 300 }), withTiming(0, { duration: 300 }));
  }, [reduce, say, wake, peck]);
  const landed = useCallback(() => setPose("perch"), []);

  /* the loop: two springs and a clock, on the UI thread; asleep at rest */
  loop.current = useFrameCallback((f) => {
    const dt = Math.min(0.05, (f.timeSincePreviousFrame ?? 16) / 1000);
    if (reduce) {
      x.value = tx.value;
      y.value = ty.value;
      rx.value = 0;
      ry.value = 0;
      rz.value = 0;
      spin.value = spinT.value;
      if (dragging.value === 0) runOnJS(rest)();
      return;
    }
    const hold = dragging.value === 1;
    const k = hold ? 160 : 90;
    const c = hold ? 22 : 11; // stiffness · damping
    vx.value += (-(x.value - tx.value) * k - vx.value * c) * dt;
    vy.value += (-(y.value - ty.value) * k - vy.value * c) * dt;
    x.value += vx.value * dt;
    y.value += vy.value * dt;
    const a = Math.min(1, dt * 9);
    rx.value += (trx.value + clamp(vy.value * 0.02, -10, 10) - rx.value) * a;
    ry.value += (tryy.value - ry.value) * a;
    rz.value += (clamp(vx.value * 0.03, -18, 18) - rz.value) * a;
    spin.value += (spinT.value - spin.value) * Math.min(1, dt * 5);
    /* she lands once she is still and low */
    if (!hold && flying.value === 1 && Math.abs(y.value) < 6 && Math.abs(vy.value) < 40 && Math.abs(x.value) < 6 && Math.abs(spinT.value - spin.value) < 8) {
      flying.value = 0;
      runOnJS(landed)();
    }
    /* at rest: snap the last sub-pixel and stop asking for frames */
    if (!hold && flying.value === 0 && Math.abs(x.value) < 0.05 && Math.abs(y.value) < 0.05 && Math.abs(vx.value) < 0.5 && Math.abs(vy.value) < 0.5 && Math.abs(rx.value) < 0.01 && Math.abs(ry.value) < 0.01 && Math.abs(rz.value) < 0.01 && Math.abs(spinT.value - spin.value) < 0.05) {
      x.value = 0;
      y.value = 0;
      vx.value = 0;
      vy.value = 0;
      rx.value = 0;
      ry.value = 0;
      rz.value = 0;
      spin.value = spinT.value;
      runOnJS(rest)();
    }
  }, false);

  const pan = Gesture.Pan()
    .minDistance(6)
    .onBegin((e) => {
      // where the finger is, measured from the perch (she may still be moving)
      gx.value = x.value + e.x - size / 2;
      gy.value = y.value + e.y - size / 2;
      runOnJS(wake)();
    })
    .onStart(() => {
      dragging.value = 1;
      x0.value = x.value;
      y0.value = y.value;
      runOnJS(onPick)();
    })
    .onUpdate((e) => {
      tx.value = clamp(x0.value + e.translationX, -width * 0.42, width * 0.42);
      ty.value = clamp(y0.value + e.translationY, -height * 0.62, height * 0.18);
      // she turns toward the finger that holds her, as seen from the perch
      const fx = gx.value + e.translationX;
      const fy = gy.value + e.translationY;
      tryy.value = clamp((fx / width) * 52, -26, 26);
      trx.value = clamp((-fy / height) * 30, -14, 14);
    })
    .onEnd((e) => {
      if (!reduce) {
        vx.value = e.velocityX * 0.35;
        vy.value = e.velocityY * 0.35;
        // a fast fling and she loops once on the way down
        if (Math.hypot(e.velocityX, e.velocityY) > 900) spinT.value += e.velocityX >= 0 ? 360 : -360;
      }
      runOnJS(onDrop)();
    })
    .onFinalize(() => {
      dragging.value = 0;
      tx.value = 0;
      ty.value = 0;
      trx.value = 0;
      tryy.value = 0;
    });
  if (blocks) pan.blocksExternalGesture(blocks);

  const single = Gesture.Tap()
    .onEnd((_e, ok) => {
      if (!ok) return;
      if (!reduce) vy.value -= 520; // a hop
      runOnJS(onTap)();
    });
  const double = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(300)
    .onEnd((_e, ok) => {
      if (ok) runOnJS(onPeck)();
    });
  /* a tap answers at once; a second quick tap adds the peck — the web's
     pointerup and dblclick, both */
  const gesture = Gesture.Race(pan, Gesture.Simultaneous(single, double));

  /* the layers: the sky drifts against her, the haze a little more, her
     shadow follows her along the boards and fades as she lifts */
  const farStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -x.value * 0.12 - ry.value * 0.5 }, { translateY: -y.value * 0.08 }],
  }));
  const midStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -x.value * 0.28 - ry.value * 1.1 }, { translateY: -y.value * 0.16 }],
  }));
  const shadowStyle = useAnimatedStyle(() => {
    const up = clamp(-y.value / 150, 0, 1);
    return { opacity: 0.9 - up * 0.6, transform: [{ translateX: x.value * 0.9 }, { scale: 1 - up * 0.45 }] };
  });
  const birdStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 720 },
      { translateX: x.value },
      { translateY: y.value },
      { rotateX: `${rx.value}deg` },
      { rotateY: `${ry.value}deg` },
      { rotate: `${rz.value + spin.value}deg` },
    ],
  }));
  const peckStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-10 * peck.value}deg` }, { translateY: 2 * peck.value }],
  }));

  const shown: WrenMood = mood ?? (dozing ? "sleepy" : baseMood);
  const tapHint = t("cr.stageHint").split(" · ").slice(-1)[0];
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, top: 0, width, height, overflow: "hidden" }}>
      {!!far && (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: -width * 0.08, top: -height * 0.08, width: width * 1.16, height: height * 1.16 }, farStyle]}>
          {far}
        </Animated.View>
      )}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: width * 0.08, right: width * 0.08, bottom: -70, height: 180 }, midStyle]}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="stageHaze" cx="50%" cy="50%" r="50%">
              {/* flat through most of it with a soft rim — the web's blurred ellipse */}
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.16} />
              <Stop offset="0.8" stopColor="#FFFFFF" stopOpacity={0.16} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="url(#stageHaze)" />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: width / 2 - 75, bottom: bottom + 6, width: 150, height: 22 }, shadowStyle]}>
        <Svg width={150} height={22}>
          <Defs>
            <RadialGradient id="stageShadow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#1E1B35" stopOpacity={0.3} />
              <Stop offset="1" stopColor="#1E1B35" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={75} cy={11} rx={75} ry={11} fill="url(#stageShadow)" />
        </Svg>
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={tapHint}
          onAccessibilityTap={onTap}
          style={[{ position: "absolute", left: (width - size) / 2, bottom, width: size, height: size }, birdStyle]}
        >
          <Animated.View style={[{ flex: 1, transformOrigin: "50% 80%" }, peckStyle]}>{bird(shown, pose, held)}</Animated.View>
        </Animated.View>
      </GestureDetector>

    </View>
  );
}
