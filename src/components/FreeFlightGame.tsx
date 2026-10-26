import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, Text, TextInput, View } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useFrameCallback, useSharedValue, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { PALETTE, type Daylight } from "./CourierCard";
import { WrenBird, type WrenAccessory, type WrenMood, type WrenStage } from "./WrenBird";
import { readBest, saveRun } from "../lib/free-flight";
import { replanLocal } from "../lib/local-push";
import { P, PF, PFM } from "../theme/post";
import { t } from "../lib/i18n";
import { StickerBox, objectDepth } from "./10a/StickerBox";

/* FREE FLIGHT — her day off, played right on her cover (owner, 2026-09-24:
   "信使除了早中晚夜送信这些行为外 还有自娱自乐模式 … 键盘打26个字母 躲避
   障碍 … 不能直接在这里玩么 … 不随着你设置好的系统天空走么").
   ────────────────────────────────────────────────────────────────────────
   Flappy-bird's shape with the app's own verb: every letter you type is a
   wingbeat. The letter she needs is on a tag in front of her; the right one
   lifts her, a wrong one does nothing (and the tag shakes), so she stays up
   only as long as your fingers find the keys in time. The sentence is a
   pangram — all 26 letters — and the next one follows when it's done.

   The sky is the one she's in: the hour on your phone, like everywhere else
   she flies. No levels to pick: one course that gets harder as you go —
   every five gates it runs faster, the gaps narrow and the beats come
   quicker — and a best to beat. Everything is proportional to the cover it
   is given. Physics and collisions run on the UI thread; typing only asks
   for a wingbeat, so the keyboard being up never costs a frame. */

/* four pangrams; she starts on the hour's */
const SENTENCES: Record<Daylight, string> = {
  morning: "the quick brown fox jumps over the lazy dog",
  day: "sphinx of black quartz judge my vow",
  evening: "how vexingly quick daft zebras jump",
  night: "the five boxing wizards jump quickly",
};
const ORDER: Daylight[] = ["morning", "day", "evening", "night"];

/* how hard, by gates passed. Gentle on purpose (owner, 2026-09-24: "好难 …
   完全反映不过来"): a beat a second to start — time to find the key — a
   step harder every five gates, the top reached at 40 */
const RAMP = 40;
const lvlOf = (g: number) => {
  "worklet";
  return Math.min(1, Math.floor(g / 5) / (RAMP / 5));
};
const speedOf = (l: number) => {
  "worklet";
  return 78 + 62 * l;
};
const gapOf = (l: number) => {
  "worklet";
  return 0.56 - 0.18 * l; // of the course's height
};
const spacingOf = (l: number) => {
  "worklet";
  return 280 - 60 * l;
};
/* pace scales gravity, and the wingbeat by its square root so a beat lifts
   her the same height: ~1 s between beats at first, ~0.65 s at the top */
const paceOf = (l: number) => {
  "worklet";
  return 0.26 + 0.36 * l;
};

/* tuned for a 420-pt course; scaled to the cover's */
const GRAV = 1350;
const FLAP = 340;
const MAXV = 640;
const BIRD = 46;
const R = 13; // a forgiving hit circle, inside her drawn body
const PIPE_W = 56;
const LIP = 14;
const GROUND = 26;
const BIRD_X = 0.28;

let Haptics: typeof import("expo-haptics") | null = null;
try {
  Haptics = require("expo-haptics");
} catch {}
const buzz = (kind: "gate" | "crash" | "faster") => {
  try {
    if (!Haptics) return;
    if (kind === "gate") void Haptics.selectionAsync();
    else if (kind === "crash") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {}
};

type Phase = "ready" | "flying" | "over";

export function FreeFlight({
  width,
  height,
  top,
  sky,
  stage,
  accessory,
  onClose,
}: {
  width: number;
  height: number;
  /** the room's header rides on the cover — the sentence starts below it */
  top: number;
  sky: Daylight;
  stage: WrenStage;
  accessory: WrenAccessory;
  onClose: () => void;
}) {
  const pal = PALETTE[sky];
  const night = sky === "night";
  const onSkyInk = night ? "#FFFFFF" : P.ink;
  const course = height - GROUND;
  const s = course / 420;

  const [phase, setPhase] = useState<Phase>("ready");
  const [gates, setGates] = useState(0);
  const [typed, setTyped] = useState(0);
  const [misses, setMisses] = useState(0);
  const [sent, setSent] = useState(ORDER.indexOf(sky));
  const [pos, setPos] = useState(0);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [faster, setFaster] = useState(false);
  const [buf, setBuf] = useState("");
  const startedAt = useRef(0);
  const endedAt = useRef(0);
  const input = useRef<TextInput>(null);
  const phaseRef = useRef<Phase>("ready");
  phaseRef.current = phase;
  const typedRef = useRef(0);
  const missRef = useRef(0);
  const sentRef = useRef(ORDER.indexOf(sky));
  const posRef = useRef(0);
  const gatesRef = useRef(0);
  const fasterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void readBest().then((b) => setBest(b?.gates ?? 0));
    return () => {
      if (fasterTimer.current) clearTimeout(fasterTimer.current);
    };
  }, []);

  const H = useSharedValue(height);
  const W = useSharedValue(width);
  useEffect(() => {
    H.value = height;
    W.value = width;
  }, [height, width, H, W]);
  const y = useSharedValue(height * 0.5);
  const vy = useSharedValue(0);
  const run = useSharedValue(0); // 0 ready · 1 flying · 2 crashed (she drops to the ground) · 3 paused
  const bob = useSharedValue(0);
  const shake = useSharedValue(0);
  const passed = useSharedValue(0); // gates, for the ramp
  const airborne = useSharedValue(0); // seconds since take-off, for the warm-up
  const px0 = useSharedValue(-999), px1 = useSharedValue(-999), px2 = useSharedValue(-999), px3 = useSharedValue(-999);
  const gy0 = useSharedValue(0), gy1 = useSharedValue(0), gy2 = useSharedValue(0), gy3 = useSharedValue(0);
  const gp0 = useSharedValue(0), gp1 = useSharedValue(0), gp2 = useSharedValue(0), gp3 = useSharedValue(0);
  const pp0 = useSharedValue(0), pp1 = useSharedValue(0), pp2 = useSharedValue(0), pp3 = useSharedValue(0);
  const PX = [px0, px1, px2, px3];
  const GY = [gy0, gy1, gy2, gy3];
  const GP = [gp0, gp1, gp2, gp3];
  const PP = [pp0, pp1, pp2, pp3];

  /* where a gap may sit: clear of the header and the sentence, above the ground */
  const pickGap = (prev: number, r: number, gap: number) => {
    "worklet";
    const lo = top + 34 + gap / 2;
    const hi = Math.max(lo, H.value - GROUND - 14 - gap / 2);
    const want = lo + r * (hi - lo);
    return Math.max(lo, Math.min(hi, Math.max(prev - 130 * s, Math.min(prev + 130 * s, want))));
  };

  /* the end of a run: kept once, the best updated */
  const onCrash = useCallback(() => {
    if (phaseRef.current !== "flying") return;
    phaseRef.current = "over";
    endedAt.current = Date.now();
    setPhase("over");
    buzz("crash");
    const secs = Math.max(1, (endedAt.current - startedAt.current) / 1000);
    const pace = Math.round((typedRef.current / secs) * 60);
    void saveRun({ gates: gatesRef.current, pace }).then((isNew) => {
      setNewBest(isNew && gatesRef.current > 0);
      if (isNew) setBest(gatesRef.current);
      void replanLocal({ force: true }); // a game played: no day-off race for a week, and the next one carries the new best
    });
  }, []);
  const onGate = useCallback(() => {
    if (phaseRef.current !== "flying") return;
    gatesRef.current += 1;
    setGates(gatesRef.current);
    if (gatesRef.current % 5 === 0 && gatesRef.current <= RAMP) {
      buzz("faster");
      setFaster(true);
      if (fasterTimer.current) clearTimeout(fasterTimer.current);
      fasterTimer.current = setTimeout(() => setFaster(false), 1100);
    } else buzz("gate");
  }, []);

  /* the world, on the UI thread — memoised, so a render (every letter)
     doesn't re-register it */
  const world = useCallback((f: { timeSincePreviousFrame: number | null }) => {
    "worklet";
    const dt = Math.min(0.034, (f.timeSincePreviousFrame ?? 0) / 1000);
    const w = W.value;
    const h = H.value;
    if (h <= 0) return;
    bob.value += dt;
    const bx = w * BIRD_X;
    if (run.value === 0) {
      y.value = h * 0.5 + Math.sin(bob.value * 3) * 6;
      vy.value = 0;
      return;
    }
    if (run.value === 3) return; // paused: the app went to the background mid-flight
    const lvl = lvlOf(passed.value);
    /* a warm-up: half gravity at take-off, full after three seconds — the
       first letters are for finding the keys, not for surviving */
    if (run.value === 1) airborne.value += dt;
    const warm = 0.5 + 0.5 * Math.min(1, airborne.value / 3);
    const g = GRAV * s * paceOf(lvl) * warm;
    const maxv = MAXV * s;
    vy.value = Math.min(vy.value + g * dt, maxv);
    if (run.value === 2) {
      // she drops to the ground and stays there
      y.value = Math.min(y.value + vy.value * dt, h - GROUND - R);
      return;
    }
    y.value += vy.value * dt;
    if (y.value < R) {
      y.value = R;
      vy.value = 0;
    }
    const speed = speedOf(lvl);
    let far = -1e9;
    let farGy = h / 2;
    for (let i = 0; i < 4; i++) {
      PX[i].value -= speed * dt;
      if (PX[i].value > far) {
        far = PX[i].value;
        farGy = GY[i].value;
      }
    }
    let hit = y.value + R > h - GROUND;
    for (let i = 0; i < 4; i++) {
      if (PX[i].value < -PIPE_W - 12) {
        const gap = gapOf(lvl) * (h - GROUND);
        PX[i].value = far + spacingOf(lvl);
        GP[i].value = gap;
        GY[i].value = pickGap(farGy, Math.random(), gap);
        PP[i].value = 0;
        far = PX[i].value;
        farGy = GY[i].value;
      }
      const x = PX[i].value;
      // a gate counts once she is clear of the lip too, where the hit test ends
      if (PP[i].value === 0 && x + PIPE_W + 5 < bx - R) {
        PP[i].value = 1;
        passed.value += 1;
        runOnJS(onGate)();
      }
      if (bx + R > x - 5 && bx - R < x + PIPE_W + 5) {
        const gc = GY[i].value;
        const half = GP[i].value / 2;
        if (y.value - R < gc - half || y.value + R > gc + half) hit = true;
      }
    }
    if (hit) {
      run.value = 2;
      vy.value = Math.max(vy.value, 120 * s);
      runOnJS(onCrash)();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, top, onGate, onCrash]);
  useFrameCallback(world);

  /* leaving the app mid-flight pauses her; the next right letter resumes */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      if (st !== "active" && run.value === 1) run.value = 3;
    });
    return () => sub.remove();
  }, [run]);

  const beat = () => FLAP * s * Math.sqrt(paceOf(lvlOf(passed.value)));
  const start = () => {
    const gap = gapOf(0) * course;
    let prev = height * 0.5;
    for (let i = 0; i < 4; i++) {
      PX[i].value = width + 150 + i * spacingOf(0);
      GP[i].value = gap;
      prev = pickGap(prev, Math.random(), gap);
      GY[i].value = prev;
      PP[i].value = 0;
    }
    passed.value = 0;
    airborne.value = 0;
    gatesRef.current = 0;
    setGates(0);
    startedAt.current = Date.now();
    run.value = 1;
    vy.value = -FLAP * s * Math.sqrt(paceOf(0));
    setPhase("flying");
  };
  const reset = useCallback(() => {
    for (let i = 0; i < 4; i++) PX[i].value = -999;
    run.value = 0;
    passed.value = 0;
    gatesRef.current = 0;
    typedRef.current = 0;
    missRef.current = 0;
    posRef.current = 0;
    setGates(0);
    setTyped(0);
    setMisses(0);
    setPos(0);
    setNewBest(false);
    setFaster(false);
    phaseRef.current = "ready";
    setPhase("ready");
  }, [PX, run, passed]);

  /* the keyboard is the controller: the right letter is a wingbeat.
     Only what was ADDED since the last change counts — fast typing can
     deliver "t", "th", "the" before a reset lands, and reading the whole
     field each time counted the same letter again. */
  const lastText = useRef("");
  const onType = (txt: string) => {
    const prev = lastText.current;
    // what the keyboard just added: a backspace adds nothing, and a field that
    // no longer starts with what we last saw (a reset that raced a key) or a
    // sudden burst gives up only its last letter — never a replay
    let added = txt.startsWith(prev) ? txt.slice(prev.length) : txt.slice(-1);
    if (txt.length < prev.length && prev.startsWith(txt)) added = "";
    if (added.length > 3) added = added.slice(-1);
    if (txt.length > 40) {
      lastText.current = "";
      setBuf("");
    } else {
      lastText.current = txt;
      setBuf(txt);
    }
    for (const ch of added.toLowerCase()) {
      if (!/^[a-z]$/.test(ch)) continue;
      if (phaseRef.current === "over") {
        if (Date.now() - endedAt.current > 700) reset();
        return;
      }
      const letters = SENTENCES[ORDER[sentRef.current]].replace(/[^a-z]/g, "");
      if (ch === letters[posRef.current]) {
        if (phaseRef.current === "ready") {
          phaseRef.current = "flying";
          start();
        } else if (run.value === 1) vy.value = -beat();
        else if (run.value === 3) {
          run.value = 1; // back from the background: this letter is the first beat again
          vy.value = -beat();
        }
        typedRef.current += 1;
        setTyped(typedRef.current);
        posRef.current += 1;
        if (posRef.current >= letters.length) {
          // the sentence is done: on to the next pangram
          posRef.current = 0;
          sentRef.current = (sentRef.current + 1) % ORDER.length;
          setSent(sentRef.current);
        }
        setPos(posRef.current);
      } else {
        if (phaseRef.current === "flying") {
          missRef.current += 1;
          setMisses(missRef.current);
        }
        shake.value = withSequence(withTiming(1, { duration: 50 }), withTiming(-1, { duration: 70 }), withTiming(0.6, { duration: 60 }), withTiming(0, { duration: 60 }));
      }
    }
  };

  const birdStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value - BIRD / 2 }, { rotate: `${Math.max(-18, Math.min(38, vy.value * (0.055 / s)))}deg` }],
  }));
  const tagStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value - 16 }, { translateX: shake.value * 6 }],
  }));

  const text = SENTENCES[ORDER[sent]];
  const lettersNow = text.replace(/[^a-z]/g, "");
  const want = lettersNow[pos];
  const upcoming = (lettersNow + SENTENCES[ORDER[(sent + 1) % ORDER.length]].replace(/[^a-z]/g, "")).slice(pos + 1, pos + 3).toUpperCase();
  const mood: WrenMood = phase === "over" ? "worry" : phase === "flying" ? "happy" : "curious";
  const secs = Math.max(1, (endedAt.current - startedAt.current) / 1000);
  const pace = phase === "over" ? Math.round((typed / secs) * 60) : 0;
  const acc = typed + misses > 0 ? Math.round((typed / (typed + misses)) * 100) : 100;
  const pillarInk = night ? "#DAD6F2" : pal.chip;

  return (
    <Pressable onPress={() => input.current?.focus()} accessible={false} style={{ position: "absolute", left: 0, top: 0, width, height, overflow: "hidden" }}>
      {/* the hour's sky */}
      <Svg style={{ position: "absolute", left: 0, top: 0 }} width={width} height={height}>
        <Defs>
          <LinearGradient id="ffSky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={pal.sky[0]} />
            <Stop offset="1" stopColor={pal.sky[1]} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#ffSky)" />
        <Circle cx={width * 0.78} cy={height * 0.3} r={120} fill="#FFFFFF" opacity={night ? 0.06 : 0.24} />
        <Circle cx={width * 0.16} cy={height * 0.84} r={150} fill="#FFFFFF" opacity={night ? 0.05 : 0.2} />
        {pal.stars && [[0.12, 40], [0.3, 24], [0.47, 58], [0.62, 30], [0.86, 48], [0.93, 90]].map(([fx, fy], i) => <Circle key={i} cx={width * fx} cy={fy} r={i % 2 ? 1 : 1.6} fill="#FFFFFF" opacity={0.8} />)}
        {pal.sun && <Circle cx={width * 0.84} cy={top + 58} r={18} fill={pal.sun} opacity={0.9} />}
        {pal.moon && (
          <>
            <Circle cx={width * 0.84} cy={top + 58} r={14} fill="#FFF3D6" />
            <Circle cx={width * 0.84 + 6.5} cy={top + 52} r={12} fill={pal.sky[0]} />
          </>
        )}
      </Svg>

      {/* the pillars */}
      {PX.map((pxv, i) => (
        <Pillar key={i} x={pxv} gy={GY[i]} gap={GP[i]} H={H} fill={pal.scrim} ink={pillarInk} />
      ))}

      {/* the ground */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: GROUND, backgroundColor: pal.land, borderTopWidth: 2.4, borderTopColor: night ? "#DAD6F2" : pal.forest }} />

      {/* her, and the letter she needs, on a tag in front of her */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: width * BIRD_X - BIRD / 2, top: 0, width: BIRD, height: BIRD }, birdStyle]}>
        {/* her day off: nothing in her feet */}
        <WrenBird size={BIRD} stage={stage} mood={mood} accessory={accessory} pose={stage === "wren" ? "fly" : "perch"} letter={false} />
      </Animated.View>
      {phase !== "over" && !!want && (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: width * BIRD_X + BIRD / 2 + 8, top: 0, height: 32, minWidth: 32, paddingHorizontal: 10.4, borderRadius: 16, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }, tagStyle]}>
          <Text style={{ ...PFM.monoSemi, fontSize: 17, color: P.ink }}>
            {want.toUpperCase()}
            {/* the next two, fainter — read ahead, keep the rhythm */}
            <Text style={{ fontSize: 12, color: P.ink40 }}> {upcoming}</Text>
          </Text>
        </Animated.View>
      )}

      {/* the top right: the gates, and the way out — flat white on the sky,
          no ink edge (owner's rule B, 2026-10-26) */}
      <View style={{ position: "absolute", right: 12, top: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
        {phase !== "ready" && (
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 12, height: 30, justifyContent: "center" }}>
            <Text style={{ ...PFM.monoSemi, fontSize: 12.5, color: P.ink }}>{gates}</Text>
          </View>
        )}
        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("ff.done")} style={({ pressed }) => ({ width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
          <Text style={{ fontFamily: PF.letter, fontSize: 17, lineHeight: 19, color: P.ink }}>×</Text>
        </Pressable>
      </View>

      {/* the sentence she is flying on — done in ink, the next letter underlined */}
      {phase !== "over" && (
        <Text pointerEvents="none" style={{ position: "absolute", left: 14, right: 14, top: top + 6, ...PFM.monoSemi, fontSize: 12.5, lineHeight: 18 }}>
          {text.split("").map((c, i) => {
            const li = text.slice(0, i + 1).replace(/[^a-z]/g, "").length - 1;
            const isLetter = /[a-z]/.test(c);
            const done = isLetter && li < pos;
            const now = isLetter && li === pos;
            return (
              <Text key={i} style={{ color: now ? (night ? "#FFFFFF" : P.pen) : done ? onSkyInk : night ? "rgba(255,255,255,0.4)" : "rgba(30,27,53,0.35)", textDecorationLine: now ? "underline" : "none" }}>
                {c}
              </Text>
            );
          })}
        </Text>
      )}

      {/* every five gates: faster */}
      {faster && phase === "flying" && (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: height * 0.34, alignItems: "center" }}>
          <View style={{ backgroundColor: "#C3E84F", borderRadius: 8, paddingHorizontal: 14.4, paddingVertical: 6.4, transform: [{ rotate: "-4deg" }] }}>
            <Text style={{ ...PFM.monoSemi, fontSize: 14, letterSpacing: 2, color: P.ink }}>{t("ff.faster")}</Text>
          </View>
        </View>
      )}

      {phase === "ready" && (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: GROUND + 14, alignItems: "center" }}>
          <Text style={{ ...PFM.monoSemi, fontSize: 9.5, letterSpacing: 2, color: night ? "rgba(255,255,255,0.72)" : P.ink60, marginBottom: 6 }}>{t("ff.title").toUpperCase()}</Text>
          <Text style={{ fontFamily: PF.letter, fontWeight: "800", fontSize: 18, color: onSkyInk }}>{t("ff.takeoff", { letter: (want ?? "t").toUpperCase() })}</Text>
          <Text style={{ ...PFM.monoSemi, fontSize: 9.5, letterSpacing: 1.4, color: night ? "rgba(255,255,255,0.72)" : P.ink60, marginTop: 6, paddingHorizontal: 16, textAlign: "center" }}>
            {t("ff.hint")}
            {best > 0 ? ` · ${t("ff.best", { n: best })}` : ""}
          </Text>
        </View>
      )}

      {phase === "over" && (
        /* the result card is an object (owner's rule B, 2026-10-26): no ink edge, the object depth */
        <StickerBox fill="#FFFFFF" radius={18} {...objectDepth({ dark: night })} style={{ position: "absolute", left: 16, right: 16, top: top + 10 }} faceStyle={{ padding: 16.4 }}>
          {newBest && (
            <View style={{ position: "absolute", right: 12, top: -12, backgroundColor: "#C3E84F", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, transform: [{ rotate: "6deg" }] }}>
              <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1.4, color: P.ink }}>{t("ff.newBest")}</Text>
            </View>
          )}
          <Text style={{ fontFamily: PF.letter, fontWeight: "800", fontSize: 18, letterSpacing: -0.3, color: P.ink }}>{t("ff.crashTitle")}</Text>
          <View style={{ flexDirection: "row", marginTop: 10, gap: 6 }}>
            <Stat label={t("ff.statGates")} value={String(gates)} strong={newBest} />
            <Stat label={t("ff.statLetters")} value={String(typed)} />
            <Stat label={t("ff.statAccuracy")} value={`${acc}%`} />
            <Stat label={t("ff.statPace")} value={String(pace)} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
            <Pressable
              onPress={() => {
                reset();
                input.current?.focus();
              }}
              style={({ pressed }) => ({ flex: 1, height: 40, borderRadius: 20, backgroundColor: P.pen, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 })}
            >
              <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 14.5, color: "#FFFFFF" }}>{t("ff.again")}</Text>
            </Pressable>
            <Text numberOfLines={2} style={{ flex: 1, ...PFM.mono, fontSize: 10, letterSpacing: 0.6, color: P.ink40 }}>
              {best > 0 && !newBest ? `${t("ff.best", { n: best })} · ` : ""}
              {t("ff.anyKey")}
            </Text>
          </View>
        </StickerBox>
      )}

      {/* the keyboard's ear: off screen, always listening, never autocorrecting */}
      <TextInput
        ref={input}
        value={buf}
        onChangeText={onType}
        autoFocus
        autoCorrect={false}
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        keyboardType="ascii-capable"
        textContentType="none"
        returnKeyType="done"
        submitBehavior="submit"
        caretHidden
        contextMenuHidden
        style={{ position: "absolute", left: -100, top: 0, width: 10, height: 10, opacity: 0 }}
      />
    </Pressable>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#F3F2FB", borderRadius: 10, paddingVertical: 6, alignItems: "center" }}>
      <Text style={{ ...PFM.monoSemi, fontSize: 15, color: strong ? P.pen : P.ink }}>{value}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ ...PFM.monoSemi, fontSize: 8, letterSpacing: 0.8, color: P.ink40, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

/* one pair of pillars: the column above the gap and the one below, each
   with a lip at the gap's edge */
function Pillar({ x, gy, gap, H, fill, ink }: { x: SharedValue<number>; gy: SharedValue<number>; gap: SharedValue<number>; H: SharedValue<number>; fill: string; ink: string }) {
  const wrap = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const topCol = useAnimatedStyle(() => ({ height: Math.max(0, gy.value - gap.value / 2 + 4) }));
  const botCol = useAnimatedStyle(() => ({ top: gy.value + gap.value / 2, height: Math.max(0, H.value - GROUND - (gy.value + gap.value / 2)) }));
  const col = { position: "absolute" as const, left: 0, width: PIPE_W, backgroundColor: fill, borderWidth: 2.4, borderColor: ink };
  // children sit inside the 2.4 border, so the lip starts 5 + 2.4 to the left to overhang both sides evenly
  const lip = { position: "absolute" as const, left: -7.4, width: PIPE_W + 10, height: LIP, backgroundColor: fill, borderWidth: 2.4, borderColor: ink, borderRadius: 5 };
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: PIPE_W, bottom: 0 }, wrap]}>
      <Animated.View style={[col, { top: -4, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }, topCol]}>
        <View style={[lip, { bottom: -2 }]} />
      </Animated.View>
      <Animated.View style={[col, { borderTopLeftRadius: 4, borderTopRightRadius: 4 }, botCol]}>
        <View style={[lip, { top: -2 }]} />
      </Animated.View>
    </Animated.View>
  );
}

/* THE GAME'S MARK — what every door to it wears: two pillars and her,
   flying the gap. The shape everyone already reads as "a game like that". */
export function PillarsGlyph({ size = 22, ink = P.ink }: { size?: number; ink?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={14.5} y={-1} width={6} height={8.5} rx={1} fill="#9CD48C" stroke={ink} strokeWidth={1.6} />
      <Rect x={13.5} y={6} width={8} height={2.6} rx={0.8} fill="#9CD48C" stroke={ink} strokeWidth={1.4} />
      <Rect x={14.5} y={16.5} width={6} height={8.5} rx={1} fill="#9CD48C" stroke={ink} strokeWidth={1.6} />
      <Rect x={13.5} y={15.4} width={8} height={2.6} rx={0.8} fill="#9CD48C" stroke={ink} strokeWidth={1.4} />
      <Path d="M2 15 Q5 9 9 11" fill="none" stroke={ink} strokeWidth={1.3} strokeDasharray="1.6 1.8" strokeLinecap="round" />
      <Circle cx={10} cy={11.6} r={3.4} fill="#5B55FF" stroke={ink} strokeWidth={1.3} />
      <Path d="M13.2 11.4 l2.2 0.6 -2.2 0.8z" fill="#F2A33A" />
      <Circle cx={11.2} cy={10.8} r={0.8} fill="#FFFFFF" />
    </Svg>
  );
}
