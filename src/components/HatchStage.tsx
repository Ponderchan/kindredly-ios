/* THE HATCH, AS ONE SCREEN (W39 · W38 Hatch Interactive).
   ────────────────────────────────────────────────────────────────────────
   There used to be an eleven-second reading page and then a dark card with
   the bird on it. Now the read and the birth are the same screen, at the
   same time: the "reading you" list ticks down at the top while the egg
   below knocks three times, cracks along a line, lights up from inside, and
   bursts — a flash, a ring, your own words thrown out of it, six shards on
   real gravity. The bottom three land and lie there as her nest; the top
   three fly and fade. She rises out of it. About four and a half seconds
   from arriving to born.

   THEN SHE ANSWERS A FINGER. Body: a different reaction each time (hop,
   chirp, happy, sleepy, wink). Head: a heart. The shells: she looks down at
   what she came out of. A newborn you cannot poke is a picture of a newborn.

   The physics is a plain JS clock — one rAF, mutable state in a ref, a
   re-render per frame — the same pattern as LetterTravel. Six shards,
   a handful of words and some dust is nothing; keeping it out of Reanimated
   keeps one file readable. Reduced motion lands straight on the born
   tableau.

   COLOUR. The type and chrome around the egg — the readout, your words once
   the dark lifts, her first word's bubble, the chirp's note — take the
   console skin in the theme's colours (lib/egg-os). The egg is art and keeps
   its own in every theme: the shell, its crack and shard outlines read the
   static Y as Y_ART, and the burst (the dark, the flash, the gold glow and
   dust, the words while they fly) is a picture of light, so its colours are
   fixed too. Only the shadow on the ground answers a dark theme
   (EggShell's eggShadow).

   THE NEW ONBOARDING'S HATCH (screen 9, storyboard 2026-10-18) asks a few
   things of the same stage, all optional, so every caller that passes none
   of them (the old run, the previews) gets exactly the stage above:
   · burst="flood": no dark and no cream flash at the burst — the screen
     floods with Shell from the crack instead, and that flood is the
     screen's (parts/flood), drawn under this stage so the shards fly over
     it. `onBurst` says where the crack is, in window points, the moment
     the shell goes (with Reduce Motion too: the born tableau still bursts).
     Your words fly in `chrome` ink, since cream words on Shell vanish.
   · chrome: the ink, accent, panel and line for what is drawn around the
     bird (the words, the first word's bubble, the chirp's mark), when the
     ground under the stage is not the console's.
   · footer: the copy under the stage, in place of the HATCHING… readout.
   · tapHelps: a tap on the whole egg brings the next knock closer ("three
     knocks, a tap helps"). */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, Polygon, RadialGradient, Rect, Stop, Defs } from "react-native-svg";
import { EGG_SHELLS, EggBody, ShellGradient, eggShadow } from "./EggShell";
import { type WrenMood, type WrenSkin } from "./WrenBird";
import { HatchlingRig, useChickIdle } from "./HatchlingRig";
import type { HatchlingForm } from "../lib/hatchling-form";
import type { DimScore } from "../lib/hatch-engine";
import { t } from "../lib/i18n";
import { firstWord } from "../lib/first-word";
import { Y as Y_ART } from "../theme/y2k";
import { useLetterFamily } from "../lib/theme";
import { useEggOS } from "../lib/egg-os";

/* The burst's cream flash on a dark theme: capped, since a full-screen near-white flash at
   night is harsh in a dark room (step 7.1, decided for the reader's comfort; still 5.9:1 at its
   peak over the console). The light themes flash at full strength, as designed. */
const FLASH_NIGHT = 0.6;

let Haptics: typeof import("expo-haptics") | null = null;
try {
  Haptics = require("expo-haptics");
} catch {}
const knock = (heavy = false) => {
  try {
    void Haptics?.impactAsync(heavy ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
  } catch {}
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/* the canvas: 320×300, drawn at 0.8 about (160,150); the egg sits at (160,130) */
const W = 320;
const H = 300;
const CX = 160;
const CY = 130;
const K = 0.8;
const sx = (x: number) => 160 + K * (x - 160);
const sy = (y: number) => 150 + K * (y - 130);

const CRACK = "M-74 6 L-52 -8 L-30 4 L-8 -12 L14 0 L36 -14 L56 -2 L74 6";
/* the shell, cut along CRACK into six. The top three fly and fade; the
   bottom three carry a landing spot (tx, ty, trot, tsc) — the nest. */
const SHARDS = [
  { p: "-74,6 -72,-20 -64,-50 -48,-76 -26,-92 -20,-40 -30,4 -52,-8", top: true, vx: -128, vy: -268, vr: -300 },
  { p: "-26,-92 0,-96 26,-92 30,-30 14,0 -8,-12 -30,4 -20,-40", top: true, vx: -14, vy: -330, vr: 150 },
  { p: "26,-92 48,-76 64,-50 72,-20 74,6 56,-2 36,-14 14,0 30,-30", top: true, vx: 136, vy: -262, vr: 320 },
  { p: "-74,6 -52,-8 -30,4 -26,40 -40,74 -52,68 -68,38", top: false, vx: -108, vy: -92, vr: -110, tx: -78, ty: 4, trot: -30, tsc: 0.46 },
  { p: "-30,4 -8,-12 14,0 20,44 12,92 0,96 -30,88 -40,74 -26,40", top: false, vx: 8, vy: -58, vr: 26, tx: -2, ty: 17, trot: 8, tsc: 0.44 },
  { p: "14,0 36,-14 56,-2 74,6 68,38 52,68 30,88 12,92 20,44", top: false, vx: 112, vy: -86, vr: 124, tx: 74, ty: 2, trot: 32, tsc: 0.46 },
];
const GRAVITY = 980;
const CRACK_AT = 0.7; // seconds of stillness before the first knock
const CRACK_FOR = 2.4; // knocks + crack, then the burst
const BORN_AT = 1.5; // seconds after the burst she counts as born
/** how long the read-out above the egg has, from arriving to the burst */
export const HATCH_READ_S = CRACK_AT + CRACK_FOR;

interface Shard {
  p: string;
  top: boolean;
  x: number;
  y: number;
  rot: number;
  sc: number;
  op: number;
  vx: number;
  vy: number;
  vr: number;
  life: number;
  landed: boolean;
  done: boolean;
  tx: number;
  ty: number;
  trot: number;
  tsc: number;
}
interface Word {
  w: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  life: number;
  sz: number;
}
interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  r: number;
}

/* what she does when poked, and the face WrenBird has for it */
export type Reaction = "hop" | "chirp" | "happy" | "sleepy" | "wink" | "curious" | "love";
const BODY: Reaction[] = ["hop", "chirp", "happy", "sleepy", "wink"];
const FACE: Record<Reaction, WrenMood> = { hop: "delight", chirp: "listen", happy: "happy", sleepy: "sleepy", wink: "wink", curious: "curious", love: "delight" };
const MARK: Record<Reaction, string> = { hop: "", chirp: "♪", happy: "✦", sleepy: "z", wink: "", curious: "", love: "♥" };
const TILT: Record<Reaction, number> = { hop: 0, chirp: 0, happy: 0, sleepy: 0, wink: 0, curious: 9, love: -6 };

/* the words she throws out: whatever was fed, in pieces that read as words.
   Space-separated scripts split on space; CJK runs are cut into threes. */
export function tokens(fed: string[]): string[] {
  const out: string[] = [];
  for (const raw of fed.join(" ").split(/\s+/)) {
    const w = raw.replace(/^[“"'(¿¡]+|[.,!?;:”"')…]+$/g, "");
    if (!w) continue;
    if (/[぀-ヿ㐀-鿿가-힯]/.test(w)) {
      const cs = Array.from(w);
      for (let i = 0; i < cs.length; i += 3) out.push(cs.slice(i, i + 3).join(""));
    } else if (w.length > 2) out.push(w);
  }
  return out.slice(0, 18);
}

export function HatchStage({
  shell,
  fed,
  mood,
  form,
  dims,
  skin = "sticker",
  header,
  onBorn,
  onWord,
  celebrate = 0,
  burst: burstMode = "dark",
  onBurst,
  chrome,
  footer,
  tapHelps = false,
}: {
  shell: number;
  fed: string[];
  mood: WrenMood; // her face at rest, read from the words (or picked)
  onWord?: (w: string | null) => void; // what she said first, once she's said it
  form?: HatchlingForm;
  dims?: DimScore[]; // the read — what she does on her own once she's out
  skin?: WrenSkin; // the default bird — she hatches in Sky whatever the app-wide pick
  header: ReactNode; // the copy above the egg — the parent owns the words
  onBorn: () => void;
  celebrate?: number; // bump it and she hops (the key was pressed)
  /** "dark" (the default): the dark and the flash at the burst; "flood": neither — the caller floods the screen from the crack */
  burst?: "dark" | "flood";
  /** the crack, in window points, the moment the shell goes */
  onBurst?: (at: { x: number; y: number }) => void;
  /** the colours drawn around the bird (words, bubble, mark) when the ground isn't the console's */
  chrome?: { ink: string; accent: string; panel: string; line: string };
  /** the copy under the stage, in place of the HATCHING… readout */
  footer?: ReactNode;
  /** a tap on the whole egg brings the next knock closer */
  tapHelps?: boolean;
}) {
  const { Y, mono, dark } = useEggOS();
  // your words thrown, and her first word, are content: the letter font's italic (upright in Garamond / SF Mono)
  const said = useLetterFamily(true);
  const flood = burstMode === "flood";
  const stageRef = useRef<View>(null);
  const onBurstRef = useRef(onBurst);
  onBurstRef.current = onBurst;
  const reduce = useReducedMotion();
  const sh = EGG_SHELLS[shell] ?? EGG_SHELLS[0];
  const [, bump] = useState(0);
  const [born, setBorn] = useState(false);
  /* once she's out and nobody's poking her, she does what the read says */
  const idle = useChickIdle(dims, born);
  const bornRef = useRef(onBorn);
  bornRef.current = onBorn;
  const bornDone = useRef(false);

  const a = useRef({
    t: 0,
    ct: 0,
    crack: 0,
    knock: 0,
    wob: 0,
    pop: 0,
    burst: -1, // -1 until the shell goes
    rise: 0,
    flash: 0,
    shake: 0,
    shards: [] as Shard[],
    words: [] as Word[],
    dust: [] as Dust[],
    quote: "",
    re: null as Reaction | null,
    reT: 0,
    reI: 0,
  }).current;

  /* the bird's own motion lives in Reanimated: breath, the hop, the tilt */
  const air = useSharedValue(0);
  const squish = useSharedValue(0);
  const tilt = useSharedValue(0);
  const spark = useSharedValue(0);
  useEffect(() => {
    air.value = withRepeat(
      withSequence(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1700, easing: Easing.inOut(Easing.quad) })),
      -1,
      true,
    );
  }, [air]);
  const birdStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -air.value * 2.5 - squish.value * 14 },
      { scaleX: 1 + squish.value * -0.12 + air.value * 0.01 },
      { scaleY: 1 + squish.value * 0.16 + air.value * 0.015 },
      { rotate: `${tilt.value}deg` },
    ],
  }));
  const sparkStyle = useAnimatedStyle(() => ({ opacity: spark.value, transform: [{ translateY: -spark.value * 18 }, { scale: 0.6 + spark.value * 0.5 }] }));

  const hop = () => {
    squish.value = withSequence(
      withTiming(-1, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 220, easing: Easing.out(Easing.back(2.6)) }),
      withSpring(0, { damping: 9, stiffness: 220 }),
    );
  };
  const react = (re: Reaction) => {
    a.re = re;
    a.reT = 0;
    a.pop = 1;
    knock();
    if (re === "hop" || re === "love" || re === "happy") hop();
    tilt.value = withSpring(TILT[re], { damping: 11, stiffness: 160 });
    if (MARK[re]) spark.value = withSequence(withTiming(1, { duration: 160 }), withDelay(re === "sleepy" ? 900 : 380, withTiming(0, { duration: 320 })));
  };
  const pokeBody = () => {
    a.reI = (a.reI + 1 + Math.floor(Math.random() * 2)) % BODY.length;
    react(BODY[a.reI]);
  };

  const burstNow = () => {
    a.burst = 0;
    a.wob = 1;
    a.flash = flood ? 0 : 1;
    a.shake = 1;
    knock(true);
    /* where the crack is, for a screen that floods from it: the egg's centre on the stage, in window points */
    if (onBurstRef.current) {
      const node = stageRef.current;
      if (node)
        node.measureInWindow((x, y) => onBurstRef.current?.({ x: x + sx(CX), y: y + sy(CY) }));
      else onBurstRef.current({ x: 0, y: 0 });
    }
    const ws = tokens(fed);
    a.words = ws.map((w, i) => {
      const an = -Math.PI * (0.15 + 0.7 * (i / Math.max(1, ws.length - 1))) + (Math.random() - 0.5) * 0.4;
      const sp = 170 + Math.random() * 170;
      return { w, x: 0, y: -10, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, rot: (Math.random() - 0.5) * 40, vr: (Math.random() - 0.5) * 120, life: 0, sz: 11 + Math.random() * 8 };
    });
    a.quote = firstWord(fed) ?? ""; // the word that's most you — or nothing, and she just chirps
    a.shards = SHARDS.map((s) => ({
      p: s.p,
      top: s.top,
      x: 0,
      y: 0,
      rot: 0,
      sc: 1,
      op: 1,
      life: 0,
      landed: false,
      done: false,
      vx: s.vx * (0.9 + Math.random() * 0.25),
      vy: s.vy * (0.9 + Math.random() * 0.2),
      vr: s.vr * (0.85 + Math.random() * 0.35),
      tx: s.tx ?? 0,
      ty: s.ty ?? 0,
      trot: s.trot ?? 0,
      tsc: s.tsc ?? 1,
    }));
    a.dust = [];
    for (let i = 0; i < 16; i++) {
      const an = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 190;
      a.dust.push({ x: 0, y: -6, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 80, life: 0, r: 1.4 + Math.random() * 2.4 });
    }
  };

  /* reduced motion: the born tableau, at once */
  const landAll = () => {
    burstNow();
    a.burst = BORN_AT + 1;
    a.rise = 1;
    a.flash = 0;
    a.shake = 0;
    a.words = [];
    a.dust = [];
    a.shards.forEach((s) => {
      if (s.top) s.done = true;
      else {
        s.landed = true;
        s.x = s.tx;
        s.y = s.ty;
        s.rot = s.trot;
        s.sc = s.tsc;
      }
    });
  };

  useEffect(() => {
    if (reduce && !bornDone.current) {
      landAll();
      bornDone.current = true;
      setBorn(true);
      onWord?.(a.quote || null);
      bornRef.current();
    }
    let raf = 0;
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      let dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      a.t += dt;
      a.wob *= Math.pow(0.0016, dt);
      a.pop *= Math.pow(0.0009, dt);
      if (a.burst < 0) {
        a.ct += dt;
        a.crack = clamp((a.ct - CRACK_AT) / CRACK_FOR, 0, 1);
        const kn = a.crack >= 1 ? 3 : Math.floor(a.crack * 3);
        if (kn > a.knock) {
          a.knock = kn;
          a.wob = 1;
          a.pop = 0.7;
          knock();
        }
        if (a.crack >= 1) burstNow();
      }
      // the first half-second after the burst runs slow, so the shards can be seen leaving
      const rdt = dt;
      if (a.burst >= 0 && a.burst < 0.55) dt *= 0.4;
      if (a.burst >= 0) a.burst += rdt;
      a.flash = Math.max(0, a.flash - dt * 2.6);
      a.shake = Math.max(0, a.shake - dt * 3.2);
      a.words.forEach((w) => {
        w.life += dt;
        w.x += w.vx * dt;
        w.y += w.vy * dt;
        w.vy += 260 * dt;
        w.vx *= 1 - 1.6 * dt;
        w.rot += w.vr * dt;
        w.vr *= 1 - 2 * dt;
      });
      if (a.burst > 0.34) a.rise = Math.min(1, a.rise + dt * 1.5);
      a.shards.forEach((s) => {
        if (s.landed) {
          const k = 1 - Math.pow(0.004, dt);
          s.x += (s.tx - s.x) * k;
          s.y += (s.ty - s.y) * k;
          s.rot += (s.trot - s.rot) * k;
          s.sc += (s.tsc - s.sc) * k;
          return;
        }
        if (s.done) return;
        s.vy += GRAVITY * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.rot += s.vr * dt;
        if (!s.top && s.y > s.ty) s.landed = true;
        if (s.top) {
          s.life += dt;
          if (s.life > 0.42) s.op = Math.max(0, s.op - dt * 1.7);
          if (s.op <= 0) s.done = true;
        }
      });
      a.dust.forEach((d) => {
        d.life += dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vy += 240 * dt;
      });
      a.dust = a.dust.filter((d) => d.life < 0.7);
      if (a.re) {
        a.reT += dt;
        if (a.reT > (a.re === "sleepy" ? 1.9 : 1.15)) {
          a.re = null;
          a.reT = 0;
          tilt.value = withSpring(0, { damping: 11, stiffness: 160 });
        }
      }
      if (a.burst > BORN_AT && !bornDone.current) {
        bornDone.current = true;
        setBorn(true);
        onWord?.(a.quote || null);
        bornRef.current();
      }
      bump((n) => n + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  /* the key was pressed: she hops as the screen goes */
  const firstCelebrate = useRef(celebrate);
  useEffect(() => {
    if (celebrate !== firstCelebrate.current) react("hop");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrate]);

  /* where the vignette centres: the stage's middle, in the container's space */
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [headH, setHeadH] = useState(0);
  const onBox = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  /* ── the frame ── */
  const phase: "crack" | "burst" | "born" = a.burst < 0 ? "crack" : born ? "born" : "burst";
  const wob = a.wob * Math.sin(a.t * 26) * 8;
  const lit = phase === "crack" ? a.crack : 1;
  const glowK = 0.5 + lit * 0.5;
  const glowOp = phase === "crack" ? 0.12 + lit * 0.48 : Math.max(0, 0.6 - a.burst * 0.5);
  const shakeX = Math.sin(a.t * 90) * a.shake * 4;
  const shakeY = Math.cos(a.t * 70) * a.shake * 3;
  const darkOp = !flood && a.burst >= 0 && a.burst < 1.6 ? clamp(a.burst / 0.2, 0, 1) : 0;
  const scale = 0.9 + a.rise * 0.28;
  const size = Math.round(148 * (scale / 1.18));
  const bx = sx(CX);
  const by = sy(CY + 40 - a.rise * 28); // her body's centre
  const face: WrenMood = a.re ? FACE[a.re] : mood;
  const qs = phase === "born" ? clamp((a.burst - 1.3) / 0.35, 0, 1) : 0;
  const qb = 1 + Math.sin(Math.PI * qs) * 0.12;
  const cxV = box.w / 2;
  const cyV = headH + (box.h - headH - 30) / 2;

  const shard = (s: Shard, i: number) => (
    <Polygon key={i} points={s.p} fill="url(#hshard)" stroke={Y_ART.ink} strokeWidth={2} strokeLinejoin="round" opacity={s.op} transform={`translate(${CX + s.x} ${CY + s.y}) rotate(${s.rot}) scale(${s.sc})`} />
  );
  const stageT = `translate(160 150) scale(${K}) translate(-160 -130)`;

  return (
    <View style={{ flex: 1 }} onLayout={onBox}>
      <View onLayout={(e) => setHeadH(e.nativeEvent.layout.height)}>{header}</View>

      {/* the dark: everything but the egg goes out while it bursts */}
      {darkOp > 0 && box.w > 0 && (
        <Svg pointerEvents="none" width={box.w} height={box.h} style={{ position: "absolute", left: 0, top: 0, opacity: darkOp }}>
          <Defs>
            <RadialGradient id="hdark" gradientUnits="userSpaceOnUse" cx={cxV} cy={cyV} r={200}>
              <Stop offset={0.42} stopColor="#1E1B35" stopOpacity={0} />
              <Stop offset={1} stopColor="#1E1B35" stopOpacity={0.96} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={box.w} height={box.h} fill="url(#hdark)" />
        </Svg>
      )}
      {a.flash > 0 && <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: "#FFF6E3", opacity: dark ? a.flash * FLASH_NIGHT : a.flash }} />}

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <View ref={stageRef} collapsable={false} style={{ width: W, height: H, transform: [{ translateX: shakeX }, { translateY: shakeY }] }}>
          {/* behind her: ground, glow, the egg while it's whole, the nest, dust */}
          <Svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
            <Defs>
              <RadialGradient id="hglow" gradientUnits="userSpaceOnUse" cx={0} cy={0} r={150}>
                <Stop offset={0} stopColor="#FFD98A" stopOpacity={0.95} />
                <Stop offset={1} stopColor="#FFD98A" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <ShellGradient shell={sh} gid="hshard" />
            <G transform={stageT}>
              <Ellipse cx={CX} cy={CY + 58} rx={66} ry={9} {...eggShadow(dark)} />
              <Circle cx={0} cy={0} r={150} fill="url(#hglow)" opacity={glowOp} transform={`translate(${CX} ${CY}) scale(${glowK})`} />
              {phase === "crack" && (
                <G transform={`translate(${CX} ${CY}) rotate(${wob}) scale(${(1 + Math.sin(a.t * 2.3) * 0.014) * (1 + a.pop * 0.04)} ${(1 + Math.sin(a.t * 2.3) * 0.014) * (1 - a.pop * 0.05)})`}>
                  <EggBody shell={sh} gid="hegg">
                    <Path d={CRACK} fill="none" stroke={Y_ART.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="200" strokeDashoffset={200 - a.crack * 200} opacity={0.85} />
                    {a.crack > 0.62 && <Path d="M-8 -12 L-12 -50 M36 -14 L42 -48" fill="none" stroke={Y_ART.ink} strokeWidth={2.4} strokeLinecap="round" opacity={(a.crack - 0.62) * 2.4} />}
                  </EggBody>
                </G>
              )}
              {a.shards.map((s, i) => (s.landed ? shard(s, i) : null))}
              {a.dust.map((d, i) => (
                <Circle key={`d${i}`} cx={CX + d.x} cy={CY + d.y} r={d.r} fill="#FFD98A" opacity={Math.max(0, 1 - d.life / 0.7)} />
              ))}
            </G>
          </Svg>

          {/* a tap helps it out (tapHelps): the next knock comes sooner, and the egg answers the finger */}
          {tapHelps && phase === "crack" && (
            <Pressable
              onPress={() => {
                a.ct += 0.45;
                a.pop = 0.6;
                knock();
              }}
              accessibilityRole="button"
              accessibilityLabel={t("ob2.hatch.tap")}
              style={{ position: "absolute", left: sx(CX - 80), top: sy(CY - 100), width: K * 160, height: K * 200 }}
            />
          )}

          {/* the nest answers a tap: she looks down at it */}
          <Pressable disabled={!born} onPress={() => react("curious")} style={{ position: "absolute", left: 30, width: 260, top: sy(CY - 20), height: K * 64 }} />

          {/* her — covered by the whole shell until it goes */}
          {a.burst >= 0 && (
            <Animated.View style={[birdStyle, { position: "absolute", left: bx - size / 2, top: by - size * 0.62, width: size, height: size }]}>
              <HatchlingRig size={size} mood={face} form={form} mark={sh.mark} skin={skin} idle={a.re ? undefined : idle} />
              <Animated.Text style={[sparkStyle, { position: "absolute", top: 2, left: "18%", fontSize: 19, color: a.re === "love" ? "#F2887E" : a.re === "chirp" ? chrome?.accent ?? Y.blue : chrome?.ink ?? Y.brass }]}>
                {a.re ? MARK[a.re] : ""}
              </Animated.Text>
              <Pressable disabled={!born} onPress={() => react("love")} style={{ position: "absolute", left: "14%", right: "14%", top: 0, height: "44%" }} />
              <Pressable disabled={!born} onPress={pokeBody} style={{ position: "absolute", left: 0, right: 0, top: "44%", bottom: 0 }} />
            </Animated.View>
          )}

          {/* in front of her: the ring, the flying shards, the words. The
              whole layer is deaf to touch — RN-SVG's root view would
              otherwise take every tap meant for her. */}
          <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: W, height: H }}>
          <Svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
            <ShellGradient shell={sh} gid="hshard" />
            <G transform={stageT}>
              {a.burst >= 0 && a.burst < 0.3 && <Circle cx={CX} cy={CY} r={60 + a.burst * 380} fill="none" stroke="#FFD98A" strokeWidth={12 * (1 - a.burst / 0.3)} opacity={1 - a.burst / 0.3} />}
              {a.shards.map((s, i) => (!s.landed && !s.done ? shard(s, i) : null))}
            </G>
          </Svg>

          {/* your words, thrown */}
          {a.words.map((w, i) => {
            const op = clamp(1 - (w.life - 1.4) / 0.8, 0, 1);
            if (op <= 0) return null;
            return (
              <View key={`w${i}`} pointerEvents="none" style={{ position: "absolute", left: sx(CX + w.x) - 70, top: sy(CY + w.y) - 10, width: 140, alignItems: "center", opacity: op, transform: [{ rotate: `${w.rot}deg` }] }}>
                <Text numberOfLines={1} style={{ ...said, fontSize: w.sz * K + 2, color: chrome && flood ? (i % 3 === 0 ? chrome.accent : chrome.ink) : a.burst < 1.6 ? (i % 3 === 0 ? "#FFD98A" : "#FFF6E3") : i % 3 === 0 ? chrome?.accent ?? Y.blue : chrome?.ink ?? Y.ink }}>
                  {w.w}
                </Text>
              </View>
            );
          })}
          </View>

          {/* the one word she says first */}
          {qs > 0 && !!a.quote && (
            <View pointerEvents="none" style={{ position: "absolute", left: sx(CX + 80) - 90, top: sy(CY - 92 - a.rise * 20) - 18, width: 180, alignItems: "center", opacity: qs, transform: [{ scale: qs * qb }] }}>
              <View style={{ backgroundColor: chrome?.panel ?? Y.panel, borderWidth: 2, borderColor: chrome?.line ?? Y.ln, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text numberOfLines={1} style={{ ...said, fontSize: 15, color: chrome?.ink ?? Y.ink }}>{`“${a.quote}…”`}</Text>
              </View>
              <View style={{ width: 10, height: 10, backgroundColor: chrome?.panel ?? Y.panel, borderRightWidth: 2, borderBottomWidth: 2, borderColor: chrome?.line ?? Y.ln, marginTop: -6, marginLeft: -76, transform: [{ rotate: "45deg" }] }} />
            </View>
          )}
        </View>
      </View>

      {/* the readout under the stage (or the caller's own copy there) */}
      {footer !== undefined ? footer : (
      <View style={{ height: 30, alignItems: "center", justifyContent: "center" }}>
        {phase !== "born" ? (
          <Text style={[mono(10.5, "b"), { color: Y.dim, letterSpacing: 1.4 }]}>
            {t("ob.hatching").replace(/…$/, "")}
            <Text style={{ opacity: a.t % 1 < 0.5 ? 1 : 0 }}>…</Text>
          </Text>
        ) : a.re ? (
          <Animated.Text key={a.re} entering={FadeIn.duration(160)} style={[mono(10.5, "b"), { color: Y.blue, letterSpacing: 1.4 }]}>
            {t(`ob.re.${a.re}`)}
          </Animated.Text>
        ) : (
          <Text style={[mono(10.5, "b"), { color: Y.dim, letterSpacing: 1.4 }]}>{t("ob.hatch.tap")}</Text>
        )}
      </View>
      )}
    </View>
  );
}
