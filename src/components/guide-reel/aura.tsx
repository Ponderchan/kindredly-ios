import { useEffect, type ReactNode } from "react";
import { Image, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";
import { BigType, Finger, useLoop, useOnce, type Reel } from "./kit";
import { P, PF, PFM } from "../../theme/post";
import { t } from "../../lib/i18n";
import { useLetterFamily } from "../../lib/theme";
import { DIMENSION_INK, stickerLook, stickerName, titleName } from "../../lib/sticker-copy";
import { dimLabel } from "../../lib/aura-copy";
import type { DimKey } from "../../lib/hatch-engine";
import { AURA_SCENES, AURA_SKETCHES } from "../../data/aura-scenes";

/* THE WRITING AURA GUIDE, AS A REEL. Five scenes, each the aura's own parts
   at full size: a letter goes, and three things in it light up — a short
   line measured, a word that came back circled, the laugh marked — each
   with the sticker it would become; the nine dimensions filling a piece of
   evidence at a time and locking one after another (every bar fills all
   the way: nothing is scored); a name forming, the stickers slapped on and
   the title's own scene going from sketch to colour; the whole thing
   inside a phone that locks, ON THIS PHONE ONLY; the title. The ground is
   the aura room's own pale lavender. */

const RM = ReduceMotion.System;
const NAVY = "#1E1B35"; // the aura's ink (W14)
const BACK = Easing.out(Easing.back(1.7));
const SLAP = Easing.out(Easing.back(1.4));
const SHUT = Easing.out(Easing.back(2.2));
const SOFT = Easing.inOut(Easing.quad);
const OUT = Easing.out(Easing.cubic);

/* one name the engine can really give: short lines (quick) + opening on a
   scene (storyteller) — the two stickers below are the ones it rests on */
const SCENE_ID = "quick-storyteller";
const TITLE = { state: "formed" as const, noun: "storyteller", adjective: "quick", basis: [] };

/* ── small movers ── */
function RiseAt({ delay = 0, dy = 12, style, children }: { delay?: number; dy?: number; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const v = useOnce(460, delay, OUT);
  const st = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * dy }] }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

function PopIn({ delay, from = 0.3, style, children }: { delay: number; from?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const v = useOnce(420, delay, BACK);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, v.value * 2), transform: [{ scale: from + (1 - from) * v.value }] }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

/* a sticker landing hard: big, then down onto the card with a small bounce */
function Slap({ delay, style, children }: { delay: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const v = useOnce(360, delay, SLAP);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, v.value * 3), transform: [{ scale: 1.9 - 0.9 * v.value }] }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

/* a strip that uncovers what's in it, left to right — the pen moving */
function Reveal({ w, h, ms, delay, style, children }: { w: number; h: number; ms: number; delay: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const v = useOnce(ms, delay, SOFT);
  const st = useAnimatedStyle(() => ({ width: w * v.value }));
  return (
    <Animated.View style={[{ height: h, overflow: "hidden" }, style, st]}>
      <View style={{ width: w, height: h, flexDirection: "row" }}>{children}</View>
    </Animated.View>
  );
}

/* 0 → 1, over and over (a ring going out) */
function usePulse(ms: number, delay = 0) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withRepeat(withTiming(1, { duration: ms, easing: Easing.out(Easing.quad), reduceMotion: RM }), -1, false, undefined, RM));
  }, [v, ms, delay]);
  return v;
}

/* ── the sticker, drawn at the reel's size: its dimension's ink, the white
   cut edge, the tilt — the same look as the card's (sticker-copy) ── */
function Sticker({ id, i, s, k = 1, maxW }: { id: string; i: number; s: number; k?: number; maxW?: number }) {
  const look = stickerLook(id, i);
  const fs = s * 0.04 * k;
  const pill = look.radius === 999;
  return (
    <View
      style={{
        alignSelf: "flex-start",
        maxWidth: maxW,
        transform: [{ rotate: look.tilt }],
        backgroundColor: "#FFFFFF",
        padding: fs * 0.22,
        borderRadius: pill ? 999 : fs * 0.55,
        shadowColor: NAVY,
        shadowOpacity: 0.2,
        shadowRadius: fs * 0.4,
        shadowOffset: { width: 0, height: fs * 0.3 },
      }}
    >
      <View style={{ backgroundColor: look.bg, borderRadius: pill ? 999 : fs * 0.4, borderWidth: Math.max(1.5, fs * 0.12), borderColor: look.border, paddingHorizontal: fs * 0.8, paddingVertical: fs * 0.32 }}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: fs, color: look.fg }}>
          {stickerName(id)}
        </Text>
      </View>
    </View>
  );
}

/* ── a hand's worth of writing: cursive humps, loops and tall loops on a
   baseline. No words — it stands for anyone's line in any language. ── */
const f1 = (n: number) => n.toFixed(1);
function scribble(w: number, h: number, seed: number): string {
  const base = h * 0.78;
  const xh = h * 0.34;
  const top = h * 0.1;
  const n = Math.max(1, Math.round(w / (h * 0.34)));
  const st = (w - 2) / n;
  let x = 1;
  let d = `M${f1(x)} ${f1(base)}`;
  for (let i = 0; i < n; i++) {
    const k = (seed * 7 + i * 5 + ((i * i) % 3)) % 5;
    const a = x;
    const b = x + st;
    if (k === 0) {
      // a tall loop (an l)
      d += ` C${f1(a + st * 0.85)} ${f1(base - xh * 0.7)} ${f1(a + st)} ${f1(top)} ${f1(a + st * 0.6)} ${f1(top)} C${f1(a + st * 0.2)} ${f1(top)} ${f1(a + st * 0.3)} ${f1(base)} ${f1(b)} ${f1(base)}`;
    } else if (k % 2 === 1) {
      // a hump (an n)
      d += ` C${f1(a + st * 0.12)} ${f1(base - xh * 1.3)} ${f1(b - st * 0.12)} ${f1(base - xh * 1.3)} ${f1(b)} ${f1(base)}`;
    } else {
      // a small loop (an e)
      d += ` C${f1(a + st * 0.9)} ${f1(base - xh * 0.5)} ${f1(a + st * 0.8)} ${f1(base - xh)} ${f1(a + st * 0.5)} ${f1(base - xh)} C${f1(a + st * 0.15)} ${f1(base - xh)} ${f1(a + st * 0.25)} ${f1(base)} ${f1(b)} ${f1(base)}`;
    }
    x = b;
  }
  return d;
}

function Scribble({ w, h, seed }: { w: number; h: number; seed: number }) {
  return (
    <Svg width={w} height={h}>
      <Path d={scribble(w, h, seed)} fill="none" stroke={NAVY} strokeWidth={Math.max(1.6, h * 0.075)} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* a marker stroke growing across, behind what it marks */
function Band({ delay, color, style }: { delay: number; color: string; style: StyleProp<ViewStyle> }) {
  const v = useOnce(300, delay, SOFT);
  const st = useAnimatedStyle(() => ({ width: `${v.value * 100}%` }));
  return <Animated.View style={[{ position: "absolute", left: 0, backgroundColor: color }, style, st]} />;
}

/* the compose screen's send key, ink, square — it gives under the finger */
function SendKey({ s, at }: { s: number; at: number }) {
  const press = useSharedValue(0);
  useEffect(() => {
    press.value = withDelay(at, withSequence(withTiming(1, { duration: 120, reduceMotion: RM }), withTiming(0, { duration: 320, reduceMotion: RM })));
  }, [press, at]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.04 * press.value }] }));
  const flash = useAnimatedStyle(() => ({ opacity: press.value }));
  return (
    <Animated.View style={[{ flex: 1, backgroundColor: P.ink, alignItems: "center", justifyContent: "center", overflow: "hidden", paddingHorizontal: s * 0.05 }, st]}>
      <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: P.pen }, flash]} />
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ ...PFM.monoSemi, fontSize: s * 0.045, letterSpacing: s * 0.005, color: "#FFFFFF" }}>
        {t("cp.travel")}
      </Text>
    </Animated.View>
  );
}

/* a pen ring around a word, in the word-choice ink */
function Ring({ s, cx, cy, w, h, delay }: { s: number; cx: number; cy: number; w: number; h: number; delay: number }) {
  const sw = Math.max(2, s * 0.009);
  return (
    <PopIn delay={delay} from={0.5} style={{ position: "absolute", left: cx - w / 2, top: cy - h / 2, width: w, height: h }}>
      <View style={{ transform: [{ rotate: "-6deg" }] }}>
        <Svg width={w} height={h}>
          <Ellipse cx={w / 2} cy={h / 2} rx={w / 2 - sw} ry={h / 2 - sw} fill="none" stroke={DIMENSION_INK.vocabulary.bg} strokeWidth={sw} />
        </Svg>
      </View>
    </PopIn>
  );
}

/* ── 1 · a letter goes, and the aura reads it: the short line measured,
   the word that came back circled, the laugh marked — each with the
   sticker it would become ── */
const W_R1 = 260; // the three lines being written — once the letter has landed
const W_R2 = 500;
const W_R3 = 760;
const TAP = 1100; // the send key
const MEASURE = 1280;
const CHIP1 = 1420;
const RING_A = 1600;
const RING_B = 1700;
const CHIP2 = 1840;
const MARK = 2040;
const CHIP3 = 2180;

function Read({ s }: { s: number }) {
  // the laugh is a line of a letter: the reader's Letter font
  const face = useLetterFamily();
  const rowH = s * 0.09;
  const x0 = s * 0.12;
  const gap = s * 0.026;
  const rows = [0.21, 0.37, 0.53].map((y) => s * y);
  const rowTop = (i: number) => rows[i] - rowH / 2;
  // line 1: a short sentence, two words and a full stop
  const r1a = s * 0.11;
  const r1b = s * 0.13;
  const dot = s * 0.016;
  const r1w = r1a + gap + r1b + s * 0.008 + dot;
  // line 2: a word, another, the first again
  const wa = s * 0.085;
  const wb = s * 0.12;
  const r2w = wa + gap + wb + gap + wa;
  // line 3: a word, then the laugh — in this language's own spelling,
  // taken from the laugh sticker's own line ("haha, lol: …")
  const w3 = s * 0.12;
  const laugh = t("st.laugh_tracker.line").split(/[,、:：]/)[0].trim();
  const r3w = s * 0.37; // stops short of the stickers' column (s * 0.5)
  const laughMax = r3w - w3 - gap - 2;
  const chipX = s * 0.5;
  const chipMax = s * 0.46;
  const chipTop = (i: number) => rows[i] - s * 0.052;
  const ringW = wa + s * 0.045;
  const ringH = rowH * 1.02;
  const measureH = s * 0.03;
  const msw = Math.max(1.5, s * 0.005);
  return (
    <View style={{ width: s, height: s }}>
      {/* the letter */}
      <RiseAt
        dy={s * 0.04}
        style={{
          position: "absolute",
          left: s * 0.06,
          top: s * 0.1,
          width: s * 0.88,
          height: s * 0.58,
          backgroundColor: "#FFFFFF",
          borderRadius: s * 0.035,
          shadowColor: NAVY,
          shadowOpacity: 0.08,
          shadowRadius: s * 0.04,
          shadowOffset: { width: 0, height: s * 0.015 },
        }}
      >
        {/* its rules ride in with it (the letter sits at s*0.06, s*0.1) */}
        {rows.map((y, i) => (
          <View key={i} style={{ position: "absolute", left: s * 0.04, width: s * 0.8, top: y + rowH * 0.3 - s * 0.1, height: 1, backgroundColor: "rgba(58,58,245,0.14)" }} />
        ))}
      </RiseAt>

      {/* line 1 */}
      <Reveal w={r1w + 2} h={rowH} ms={260} delay={W_R1} style={{ position: "absolute", left: x0, top: rowTop(0) }}>
        <Scribble w={r1a} h={rowH} seed={3} />
        <View style={{ width: gap }} />
        <Scribble w={r1b} h={rowH} seed={8} />
        <View style={{ width: dot, height: dot, marginLeft: s * 0.008, marginTop: rowH * 0.78 - dot * 0.6, borderRadius: dot / 2, backgroundColor: NAVY }} />
      </Reveal>
      {/* line 2 — the first word again at the end, the same shape */}
      <Reveal w={r2w + 2} h={rowH} ms={300} delay={W_R2} style={{ position: "absolute", left: x0, top: rowTop(1) }}>
        <Scribble w={wa} h={rowH} seed={5} />
        <View style={{ width: gap }} />
        <Scribble w={wb} h={rowH} seed={2} />
        <View style={{ width: gap }} />
        <Scribble w={wa} h={rowH} seed={5} />
      </Reveal>
      {/* line 3 — the laugh is the one thing that reads as letters */}
      <Reveal w={r3w} h={rowH} ms={300} delay={W_R3} style={{ position: "absolute", left: x0, top: rowTop(2) }}>
        <Scribble w={w3} h={rowH} seed={11} />
        <View style={{ marginLeft: gap, maxWidth: laughMax, paddingHorizontal: s * 0.012, height: rowH, justifyContent: "center" }}>
          <Band delay={MARK} color={DIMENSION_INK.quirks.bg} style={{ top: rowH * 0.14, height: rowH * 0.74, borderRadius: s * 0.012 }} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ ...face, fontSize: s * 0.07, lineHeight: rowH, color: NAVY }}>
            {laugh}
          </Text>
        </View>
      </Reveal>

      {/* what the aura picks out — how long the line is */}
      <Reveal w={r1w} h={measureH} ms={320} delay={MEASURE} style={{ position: "absolute", left: x0, top: rows[0] + rowH * 0.5 + s * 0.012 }}>
        <Svg width={r1w} height={measureH}>
          <Path d={`M${msw} ${msw} V${measureH - msw} M${msw} ${measureH / 2} H${r1w - msw} M${r1w - msw} ${msw} V${measureH - msw}`} stroke={NAVY} strokeWidth={msw * 2} strokeLinecap="round" fill="none" />
        </Svg>
      </Reveal>
      {/* … the word you reach for, twice */}
      <Ring s={s} cx={x0 + wa / 2} cy={rows[1]} w={ringW} h={ringH} delay={RING_A} />
      <Ring s={s} cx={x0 + wa + gap + wb + gap + wa / 2} cy={rows[1]} w={ringW} h={ringH} delay={RING_B} />

      {/* the stickers they would become */}
      <PopIn delay={CHIP1} style={{ position: "absolute", left: chipX, top: chipTop(0), maxWidth: chipMax }}>
        <Sticker id="straight_shooter" i={0} s={s} maxW={chipMax} />
      </PopIn>
      <PopIn delay={CHIP2} style={{ position: "absolute", left: chipX, top: chipTop(1), maxWidth: chipMax }}>
        <Sticker id="repeat_offender" i={1} s={s} maxW={chipMax} />
      </PopIn>
      <PopIn delay={CHIP3} style={{ position: "absolute", left: chipX, top: chipTop(2), maxWidth: chipMax }}>
        <Sticker id="laugh_tracker" i={2} s={s} maxW={chipMax} />
      </PopIn>

      <RiseAt delay={150} dy={s * 0.03} style={{ position: "absolute", left: s * 0.06, top: s * 0.73, width: s * 0.88, height: s * 0.12 }}>
        <SendKey s={s} at={TAP} />
      </RiseAt>
      <Finger x={s * 0.7} y={s * 0.79} at={TAP} size={s * 0.15} />
    </View>
  );
}

/* ── 2 · the nine, each filling a piece of evidence at a time and locking
   when it holds — one after another. Every bar goes all the way: a full
   bar means "settled", never "more" ── */
const ORDER: DimKey[] = ["sentence", "structure", "perspective", "rhythm", "function", "vocabulary", "punctuation", "emotion", "quirks"];
// where each bar pauses on its way to full (the evidence arriving)
const STEPS: [number, number, number][] = [
  [0.3, 0.5, 0.75],
  [0.2, 0.45, 0.8],
  [0.35, 0.6, 0.7],
  [0.25, 0.55, 0.85],
  [0.3, 0.4, 0.7],
  [0.15, 0.5, 0.75],
  [0.4, 0.65, 0.8],
  [0.2, 0.35, 0.7],
  [0.3, 0.6, 0.9],
];

function DimRow({ k, i, s, h }: { k: DimKey; i: number; s: number; h: number }) {
  const start = 120 + i * 80;
  const end = 950 + i * 190; // the locks land one by one, 190ms apart
  const fill = useSharedValue(0);
  const lock = useSharedValue(0);
  useEffect(() => {
    const d = end - start;
    const m = d * 0.17;
    const p = (d - 4 * m) / 3;
    const [a, b, c] = STEPS[i];
    const step = (to: number) => withTiming(to, { duration: m, easing: OUT, reduceMotion: RM });
    fill.value = withDelay(start, withSequence(step(a), withDelay(p, step(b)), withDelay(p, step(c)), withDelay(p, step(1))));
    lock.value = withDelay(end, withTiming(1, { duration: 380, easing: BACK, reduceMotion: RM }));
  }, [fill, lock, start, end, i]);
  const ink = DIMENSION_INK[k].bg;
  const bar = useAnimatedStyle(() => ({ width: `${fill.value * 100}%`, opacity: 0.5 + 0.5 * Math.min(1, lock.value) }));
  const label = useAnimatedStyle(() => ({ opacity: 0.45 + 0.55 * Math.min(1, lock.value) }));
  const pad = useAnimatedStyle(() => ({
    opacity: Math.min(1, lock.value * 2),
    transform: [{ scale: 0.2 + 0.8 * lock.value }, { rotate: `${(1 - lock.value) * -25}deg` }],
  }));
  const L = s * 0.046;
  const barH = s * 0.032;
  return (
    <View style={{ height: h, flexDirection: "row", alignItems: "center" }}>
      <Animated.View style={[{ width: s * 0.34, marginRight: s * 0.03 }, label]}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: s * 0.04, color: NAVY }}>
          {dimLabel(k)}
        </Text>
      </Animated.View>
      <View style={{ flex: 1, height: barH, borderRadius: barH / 2, backgroundColor: P.penWash, overflow: "hidden" }}>
        <Animated.View style={[{ height: barH, borderRadius: barH / 2, backgroundColor: ink }, bar]} />
      </View>
      <View style={{ width: s * 0.065, alignItems: "flex-end" }}>
        <Animated.View style={pad}>
          <Svg width={L} height={L * 1.1} viewBox="0 0 20 22">
            <Path d="M6 10V6.5a4 4 0 0 1 8 0V10" fill="none" stroke={NAVY} strokeWidth={2.4} strokeLinecap="round" />
            <Rect x={3} y={9.5} width={14} height={11} rx={2.2} fill={NAVY} />
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

function Nine({ s }: { s: number }) {
  const rowH = s * 0.087;
  return (
    <View style={{ width: s, height: s }}>
      <RiseAt
        dy={s * 0.03}
        style={{
          position: "absolute",
          left: s * 0.05,
          top: s * 0.085,
          width: s * 0.9,
          height: s * 0.875,
          backgroundColor: "#FFFFFF",
          borderRadius: s * 0.045,
          paddingHorizontal: s * 0.045,
          paddingVertical: s * 0.03,
          justifyContent: "space-between",
        }}
      >
        {ORDER.map((k, i) => (
          <DimRow key={k} k={k} i={i} s={s} h={rowH} />
        ))}
      </RiseAt>
    </View>
  );
}

/* ── 3 · a name forms: the two stickers it rests on slap onto the card,
   the title's own scene goes from sketch to colour, the name arrives ── */
function Named({ s }: { s: number }) {
  const cw = s * 0.8;
  const ih = (cw * 9) / 16;
  const r = s * 0.05;
  const colour = useOnce(650, 1350, SOFT);
  const colourSt = useAnimatedStyle(() => ({ opacity: colour.value }));
  const gone = useOnce(260, 1600, SOFT);
  const placeholder = useAnimatedStyle(() => ({ opacity: 1 - gone.value }));
  const cardTop = s * 0.1;
  return (
    <View style={{ width: s, height: s }}>
      <RiseAt
        dy={s * 0.04}
        style={{
          position: "absolute",
          left: (s - cw) / 2,
          top: cardTop,
          width: cw,
          backgroundColor: "#FFFFFF",
          borderRadius: r,
          shadowColor: NAVY,
          shadowOpacity: 0.12,
          shadowRadius: s * 0.05,
          shadowOffset: { width: 0, height: s * 0.02 },
        }}
      >
        <View style={{ width: cw, height: ih, borderTopLeftRadius: r, borderTopRightRadius: r, overflow: "hidden" }}>
          <Image source={AURA_SKETCHES[SCENE_ID]} style={{ position: "absolute", width: cw, height: ih }} resizeMode="cover" />
          <Animated.View style={[{ position: "absolute", width: cw, height: ih }, colourSt]}>
            <Image source={AURA_SCENES[SCENE_ID]} style={{ width: cw, height: ih }} resizeMode="cover" />
          </Animated.View>
        </View>
        <View style={{ paddingHorizontal: s * 0.05, paddingVertical: s * 0.045, minHeight: s * 0.21, justifyContent: "center" }}>
          {/* while it forms: two grey lines where the name will be */}
          <Animated.View style={[{ position: "absolute", left: s * 0.05, top: s * 0.06, gap: s * 0.025 }, placeholder]}>
            <View style={{ width: cw * 0.62, height: s * 0.035, borderRadius: s * 0.01, backgroundColor: P.ink12 }} />
            <View style={{ width: cw * 0.38, height: s * 0.035, borderRadius: s * 0.01, backgroundColor: P.ink12 }} />
          </Animated.View>
          <PopIn delay={1700} from={0.6} style={{ alignSelf: "flex-start" }}>
            <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontFamily: PF.letter, fontWeight: "800", fontSize: s * 0.068, lineHeight: s * 0.078, letterSpacing: -0.6, color: NAVY }}>
              {titleName(TITLE)}
            </Text>
          </PopIn>
        </View>
      </RiseAt>
      <Slap delay={450} style={{ position: "absolute", left: s * 0.05, top: cardTop + ih - s * 0.06, maxWidth: s * 0.55 }}>
        <Sticker id="straight_shooter" i={0} s={s} k={1.1} maxW={s * 0.55} />
      </Slap>
      <Slap delay={900} style={{ position: "absolute", right: s * 0.05, top: cardTop + s * 0.035, maxWidth: s * 0.55 }}>
        <Sticker id="scene_setter" i={1} s={s} k={1.1} maxW={s * 0.55} />
      </Slap>
    </View>
  );
}

/* ── 4 · it stays on the phone: the aura inside a phone, the phone's edge
   glowing, a lock that shuts, ON THIS PHONE ONLY ── */
function Bob({ s, delay, children }: { s: number; delay: number; children: ReactNode }) {
  const v = useLoop(1100, delay);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: -s * 0.012 * v.value }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

function LockBadge({ s, cx, cy }: { s: number; cx: number; cy: number }) {
  const d = s * 0.19;
  const pop = useOnce(420, 300, BACK);
  const shut = useOnce(320, 900, SHUT);
  const ring = usePulse(1300, 1150);
  const badge = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.value * 2), transform: [{ scale: 0.3 + 0.7 * pop.value }] }));
  const shackle = useAnimatedStyle(() => ({ transform: [{ translateY: -d * 0.12 * (1 - shut.value) }] }));
  const ringSt = useAnimatedStyle(() => ({ opacity: Math.min(1, shut.value) * 0.6 * (1 - ring.value), transform: [{ scale: 1 + 0.7 * ring.value }] }));
  const L = d * 0.48;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: cx - d / 2, top: cy - d / 2, width: d, height: d }}>
      <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: d, height: d, borderRadius: d / 2, borderWidth: Math.max(2, s * 0.008), borderColor: P.pen }, ringSt]} />
      <Animated.View style={[{ width: d, height: d, borderRadius: d / 2, backgroundColor: P.pen, borderWidth: Math.max(2, s * 0.012), borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }, badge]}>
        <View style={{ width: L, height: L * 1.1 }}>
          <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, shackle]}>
            <Svg width={L} height={L * 1.1} viewBox="0 0 20 22">
              <Path d="M6 10V6.5a4 4 0 0 1 8 0V10" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" />
            </Svg>
          </Animated.View>
          <Svg width={L} height={L * 1.1} viewBox="0 0 20 22" style={{ position: "absolute", left: 0, top: 0 }}>
            <Rect x={3} y={9.5} width={14} height={11} rx={2.2} fill="#FFFFFF" />
            <Circle cx={10} cy={15} r={1.6} fill={P.pen} />
          </Svg>
        </View>
      </Animated.View>
    </View>
  );
}

function Private({ s }: { s: number }) {
  const pw = s * 0.46;
  const ph = s * 0.64;
  const px = (s - pw) / 2;
  const py = s * 0.1; // the glow's edge (py - halo) stays clear of the progress bars
  const bw = Math.max(2, s * 0.008);
  const inner = pw - 2 * bw - s * 0.05;
  const halo = s * 0.022;
  const glow = useLoop(900, 600);
  const glowSt = useAnimatedStyle(() => ({ opacity: 0.2 + 0.65 * glow.value }));
  return (
    <View style={{ width: s, height: s }}>
      {/* the edge it stays inside */}
      <Animated.View
        style={[
          { position: "absolute", left: px - halo, top: py - halo, width: pw + halo * 2, height: ph + halo * 2, borderRadius: s * 0.09, borderWidth: Math.max(2, s * 0.008), borderColor: P.pen },
          glowSt,
        ]}
      />
      <RiseAt
        dy={s * 0.03}
        style={{ position: "absolute", left: px, top: py, width: pw, height: ph, borderRadius: s * 0.07, borderWidth: bw, borderColor: NAVY, backgroundColor: "#FFFFFF", overflow: "hidden", alignItems: "center", paddingTop: s * 0.065 }}
      >
        <View style={{ position: "absolute", top: s * 0.022, width: s * 0.11, height: s * 0.022, borderRadius: 999, backgroundColor: NAVY }} />
        <View style={{ width: inner, height: (inner * 9) / 16, borderRadius: s * 0.02, overflow: "hidden" }}>
          <Image source={AURA_SCENES[SCENE_ID]} style={{ width: inner, height: (inner * 9) / 16 }} resizeMode="cover" />
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ width: inner, marginTop: s * 0.022, fontFamily: PF.letter, fontWeight: "800", fontSize: s * 0.036, color: NAVY }}>
          {titleName(TITLE)}
        </Text>
        <View style={{ width: inner, marginTop: s * 0.022, gap: s * 0.02, alignItems: "flex-start" }}>
          <Bob s={s} delay={0}>
            <Sticker id="straight_shooter" i={0} s={s} k={0.7} maxW={inner} />
          </Bob>
          <Bob s={s} delay={350}>
            <Sticker id="laugh_tracker" i={1} s={s} k={0.7} maxW={inner} />
          </Bob>
        </View>
      </RiseAt>
      {/* the lock sits on the phone's bottom edge, below the stickers */}
      <LockBadge s={s} cx={s / 2} cy={py + ph} />
      <RiseAt delay={1150} dy={s * 0.02} style={{ position: "absolute", left: s * 0.06, right: s * 0.06, top: s * 0.865, alignItems: "center" }}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ ...PFM.monoSemi, fontSize: s * 0.04, letterSpacing: s * 0.004, color: NAVY }}>
          {t("ga.phoneOnly")}
        </Text>
      </RiseAt>
    </View>
  );
}

/* ── 5 · the title, big ── */
function Title({ s }: { s: number }) {
  const title = t("gd.aura.title");
  const words = title.includes(" ") ? title.split(" ") : [title];
  const hit = words.findIndex((w) => /aura/i.test(w));
  return <BigType s={s} words={words} accent={[hit >= 0 ? hit : 0]} />;
}

export const reel: Reel = {
  bg: P.penWash,
  scenes: [
    { key: "aura-read", ms: 3400, render: (s) => <Read s={s} /> },
    { key: "aura-nine", ms: 3400, render: (s) => <Nine s={s} /> },
    { key: "aura-named", ms: 3200, render: (s) => <Named s={s} /> },
    { key: "aura-private", ms: 3200, render: (s) => <Private s={s} /> },
    { key: "aura-title", ms: 2800, render: (s) => <Title s={s} /> },
  ],
};
