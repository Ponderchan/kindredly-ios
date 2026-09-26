import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Application from "expo-application";
import Animated, { Easing, runOnJS, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { PF } from "../theme/post";
import { t } from "../lib/i18n";

/* THE LAUNCH — the egg hatches into the mark (owner, 2026-09-24: logo C,
   launch 2c, "按照你的最强能力").
   ────────────────────────────────────────────────────────────────────────
   The mark IS a hatched egg — two commas and the dot between them — so the
   launch is the one moment that explains it: a whole egg with a gold dot
   rocks twice, two cracks draw in where the mark's gaps will be, the two
   pieces fly off carrying their cracks, the broken ends swell into the two
   comma heads, and the dot settles from gold to ink. Then the wordmark.
   The bird is not in it any more; she hatches in onboarding, as yours.

   Three ways to play, because most cold starts are someone coming back:
     full   the hatch — first launch, and the first launch after an update
     short  the finished mark fades in and the app follows (≈0.5 s)
     still  Reduce Motion: the finished mark, no movement
   The piece rests, completely still, on the finished mark until the
   session is known, then fades — it never loops, since a mark that looks
   the same turned half round would read as a spinner. A tap skips once
   the heads have landed.

   What the design review changed from the sheet: no jitter on the dot (a
   trembling bird was already called a bug), two swings instead of three
   and smaller, the cracks draw in and leave with their pieces instead of
   blinking, the pops are staggered, and the heads grow out of the stroke
   ends rather than appearing from nothing.

   Everything moves on the UI thread (one clock, derived per layer), so a
   JS thread busy with the session and the first screen can't drop frames.
   Drawn on #ECECFE, the native splash's colour, so nothing flashes.
   (Pivots are given in points: React Native's transformOrigin string
   parser misreads a decimal percentage such as "79.6%".) */

const BG = "#ECECFE";
const INK = "#3A34D6";
const GOLD = "#D8A63F";
const WORD = "#1E1B35";
const MUTE = "#55506E";

/* the mark, on its own 1024 grid (logos/c-mark.svg) */
const ARC_L = "M394.6 767.2 C300 707 262 620 262 514 C262 360 346 244 451.5 209.5";
const ARC_R = "M629.4 237.5 C714 298 762 400 762 525 C762 660 680 760 572.5 791.7";
const FRAG_T = "M451.5 209.5 Q540 186 629.4 237.5";
const FRAG_B = "M572.5 791.7 Q480 815 394.6 767.2";
const CRACK_T = "M470 214 L500 250 L528 208 L560 246 L590 222";
const CRACK_B = "M552 790 L522 752 L494 796 L462 758 L430 778";
const CRACK_LEN = 200;
const STROKE = 84;
const HEAD = 96;
const CAP = STROKE / 2; // a head starts as the stroke's own round end

/* the full piece, in seconds */
const END = 2.0;
const SKIP_FROM = 1.35;
/* every other open plays the hatch's second half: from the moment the shell
   breaks (the pieces leave, the heads grow, the dot turns gold to ink, the
   word comes in) — about a second, so an ordinary open is alive, not a still
   fade (owner, 2026-09-26: "启动页那里没有动画效果") */
const SHORT_FROM = 0.98;
const SEEN_KEY = "kindredly_launch_seen";
type Mode = "full" | "short" | "still";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const seg = (t: number, a: number, b: number) => {
  "worklet";
  return Math.min(1, Math.max(0, (t - a) / (b - a)));
};
const eo = (x: number) => {
  "worklet";
  return 1 - Math.pow(1 - x, 3);
};
/* a small overshoot, ~4% — enough to land, not enough to bounce */
const backOut = (x: number) => {
  "worklet";
  const c = 1;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};

let Haptics: typeof import("expo-haptics") | null = null;
try {
  Haptics = require("expo-haptics");
} catch {}
const crackTap = () => {
  try {
    void Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
};

/* the version AND the build: a new build of the same version is still an
   update (1.2.1 went out as builds 23, 24, 25 — keyed on "1.2.1" alone, a
   tester never saw the hatch again) */
const version = () => `${Constants.expoConfig?.version ?? "0"}+${Application.nativeBuildVersion ?? "0"}`;

export function LaunchAnimation({ ready, onDone, force }: { ready: boolean; onDone: () => void; force?: Mode }) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode | null>(force ?? null);

  /* first launch, or the first after an update, gets the hatch */
  useEffect(() => {
    if (force) return;
    if (reduce) {
      setMode("still");
      return;
    }
    let alive = true;
    AsyncStorage.getItem(SEEN_KEY)
      .then((v) => {
        if (!alive) return;
        const fresh = v !== version();
        setMode(fresh ? "full" : "short");
        if (fresh) void AsyncStorage.setItem(SEEN_KEY, version()).catch(() => {});
      })
      .catch(() => alive && setMode("short"));
    return () => {
      alive = false;
    };
  }, [force, reduce]);

  /* the piece mounts only once it knows how to play, so every animated
     style's first frame is the right one (a style first computed with no
     mode drew the wordmark at full opacity for a frame before the hatch) */
  if (!mode) return <View style={{ flex: 1, backgroundColor: BG }} />;
  return <Piece mode={mode} ready={ready} onDone={onDone} />;
}

function Piece({ mode, ready, onDone }: { mode: Mode; ready: boolean; onDone: () => void }) {
  const { width: sw, height: sh } = useWindowDimensions();
  const [canLeave, setCanLeave] = useState(false);
  const leaving = useRef(false);

  const time = useSharedValue(0); // the piece's clock, seconds
  const veil = useSharedValue(0); // short / still: the whole finished frame fades in

  const finished = useCallback(() => setCanLeave(true), []);
  useEffect(() => {
    if (mode === "full") {
      time.value = 0;
      time.value = withTiming(END, { duration: END * 1000, easing: Easing.linear }, (fin) => {
        if (fin) runOnJS(finished)();
      });
      const id = setTimeout(crackTap, 980);
      return () => clearTimeout(id);
    }
    if (mode === "short") {
      time.value = SHORT_FROM;
      time.value = withTiming(END, { duration: (END - SHORT_FROM) * 1000, easing: Easing.linear }, (fin) => {
        if (fin) runOnJS(finished)();
      });
      return;
    }
    time.value = END; // still: everything at rest, finished, faded in
    veil.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    const id = setTimeout(finished, 600);
    return () => clearTimeout(id);
  }, [mode, time, veil, finished]);

  /* leave once the piece has landed and the session is known. It doesn't
     fade itself out any more: it holds its last frame and the next screen
     fades in over it (app/index, the stack's "fade" on (tabs) and
     onboarding) — one dissolve from the mark to the letters, instead of a
     fade to empty lavender and a page sliding in from the right (owner,
     2026-09-24: "我要一种正常的打开方式"). */
  useEffect(() => {
    if (!canLeave || !ready || leaving.current) return;
    leaving.current = true;
    onDone();
  }, [canLeave, ready, onDone]);

  const skip = () => {
    if (mode === "full" && time.value >= SKIP_FROM) setCanLeave(true);
  };

  /* ── the layers, each derived from the one clock ── */
  const MARK = Math.min(sw * 0.38, 156);
  const k = MARK / 1024;
  const markTop = sh * 0.4 - MARK / 2;

  const whole = useAnimatedStyle(() => {
    const tt = time.value;
    if (mode === "still") {
      return { opacity: veil.value, transform: [{ scale: 1 }, { rotate: "0deg" }] };
    }
    if (mode === "short") {
      // the cracked egg comes up out of the splash in a blink, then breaks
      const e = eo(seg(tt, SHORT_FROM, SHORT_FROM + 0.14));
      return { opacity: e, transform: [{ scale: 0.97 + 0.03 * e }, { rotate: "0deg" }] };
    }
    const e = eo(seg(tt, 0, 0.3));
    const u = seg(tt, 0.3, 0.95);
    // two swings on the egg's base, gathering and settling — no jitter
    const rock = tt > 0.3 && tt < 0.95 ? 6 * Math.sin(u * Math.PI * 4) * Math.sin(u * Math.PI) : 0;
    return { opacity: e, transform: [{ scale: 0.82 + 0.18 * e }, { rotate: `${rock}deg` }] };
  });
  const fragTop = useAnimatedStyle(() => {
    const f = eo(seg(time.value, 0.98, 1.4));
    return { opacity: 1 - f, transform: [{ translateX: 140 * k * f }, { translateY: -190 * k * f }, { rotate: `${40 * f}deg` }] };
  });
  const fragBot = useAnimatedStyle(() => {
    const f = eo(seg(time.value, 0.98, 1.4));
    return { opacity: 1 - f, transform: [{ translateX: -140 * k * f }, { translateY: 190 * k * f }, { rotate: `${40 * f}deg` }] };
  });
  const crack = useAnimatedProps(() => ({
    strokeDashoffset: CRACK_LEN * (1 - seg(time.value, 0.8, 0.98)),
    strokeOpacity: time.value >= 0.8 ? 1 : 0,
  }));
  const head = useAnimatedProps(() => ({ r: CAP + (HEAD - CAP) * backOut(seg(time.value, 1.0, 1.32)) }));
  const dotR = (tt: number) => {
    "worklet";
    return 44 * (1 + 0.1 * Math.sin(Math.PI * seg(tt, 0.3, 0.95)) + 0.18 * Math.sin(Math.PI * seg(tt, 1.22, 1.55)));
  };
  const dotGold = useAnimatedProps(() => ({ r: dotR(time.value), fillOpacity: 1 - seg(time.value, 1.3, 1.55) }));
  const dotInk = useAnimatedProps(() => ({ r: dotR(time.value), fillOpacity: seg(time.value, 1.3, 1.55) }));
  const word = useAnimatedStyle(() => {
    const w = mode !== "still" ? eo(seg(time.value, 1.35, 1.8)) : veil.value;
    return { opacity: w, transform: [{ translateY: 8 * (1 - w) }] };
  });
  const tag = useAnimatedStyle(() => {
    const g = mode !== "still" ? eo(seg(time.value, 1.5, 1.95)) : veil.value;
    return { opacity: g, transform: [{ translateY: 6 * (1 - g) }] };
  });

  const box = { position: "absolute" as const, left: 0, top: 0, width: MARK, height: MARK };
  return (
    /* the lavender stays; only what is on it fades — fading the ground too
       passed through the white of the route underneath */
    <View style={{ flex: 1, backgroundColor: BG }}>
    <View style={{ flex: 1 }}>
      <Pressable onPress={skip} accessible accessibilityRole="image" accessibilityLabel="Kindredly" style={{ flex: 1 }}>
        <Animated.View style={[{ position: "absolute", left: (sw - MARK) / 2, top: markTop, width: MARK, height: MARK, transformOrigin: [MARK * 0.5, MARK * 0.796, 0] }, whole]}>
          {/* the two commas and the dot — what the egg becomes */}
          <Svg style={box} width={MARK} height={MARK} viewBox="0 0 1024 1024">
            <Path d={ARC_L} fill="none" stroke={INK} strokeWidth={STROKE} strokeLinecap="round" />
            <Path d={ARC_R} fill="none" stroke={INK} strokeWidth={STROKE} strokeLinecap="round" />
            <AnimatedCircle cx={394.6} cy={767.2} fill={INK} animatedProps={head} />
            <AnimatedCircle cx={629.4} cy={237.5} fill={INK} animatedProps={head} />
            <AnimatedCircle cx={512} cy={520} fill={GOLD} animatedProps={dotGold} />
            <AnimatedCircle cx={512} cy={520} fill={INK} animatedProps={dotInk} />
          </Svg>
          {/* the two pieces of shell that close it into an egg, each with its crack */}
          {mode !== "still" && (
            <>
              <Animated.View pointerEvents="none" style={[box, { transformOrigin: [MARK * 0.527, MARK * 0.205, 0] }, fragTop]}>
                <Svg width={MARK} height={MARK} viewBox="0 0 1024 1024">
                  <Path d={FRAG_T} fill="none" stroke={INK} strokeWidth={STROKE} strokeLinecap="round" />
                  <AnimatedPath d={CRACK_T} fill="none" stroke={BG} strokeWidth={36} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[CRACK_LEN, CRACK_LEN]} animatedProps={crack} />
                </Svg>
              </Animated.View>
              <Animated.View pointerEvents="none" style={[box, { transformOrigin: [MARK * 0.469, MARK * 0.781, 0] }, fragBot]}>
                <Svg width={MARK} height={MARK} viewBox="0 0 1024 1024">
                  <Path d={FRAG_B} fill="none" stroke={INK} strokeWidth={STROKE} strokeLinecap="round" />
                  <AnimatedPath d={CRACK_B} fill="none" stroke={BG} strokeWidth={36} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[CRACK_LEN, CRACK_LEN]} animatedProps={crack} />
                </Svg>
              </Animated.View>
            </>
          )}
        </Animated.View>

        {/* the wordmark, then the line under it — the app's nine languages */}
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, top: markTop + MARK + 30, alignItems: "center" }, word]}>
          <Text style={{ fontFamily: PF.letter, fontWeight: "800", fontSize: 40, lineHeight: 46, letterSpacing: -1.4, color: WORD }}>kindredly</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 24, right: 24, top: markTop + MARK + 88, alignItems: "center" }, tag]}>
          <Text style={{ fontFamily: PF.letterSerif, fontStyle: "italic", fontSize: 18, lineHeight: 24, color: MUTE, textAlign: "center" }}>{t("launch.tag")}</Text>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 2.6, color: INK, marginTop: 10, textAlign: "center" }}>{t("launch.sub")}</Text>
        </Animated.View>
      </Pressable>
    </View>
    </View>
  );
}
