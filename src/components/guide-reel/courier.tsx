import { memo, useEffect, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Circle, G, Path, Polygon, Rect } from "react-native-svg";
import { BigType, Finger, useLoop, useOnce, type Reel } from "./kit";
import { CHICK_FILL, WrenBird, type WrenAccessory, type WrenSkin, type WrenStage } from "../WrenBird";
import { EGG_SHELLS, MARK_D, RIM, ShellGradient, type Shell } from "../EggShell";
import { getWrenEgg, useWrenName } from "../../lib/wren-name";
import { useWrenStage } from "../../lib/wren-stage";
import { t } from "../../lib/i18n";
import { P, PF, PFM } from "../../theme/post";
import { Y } from "../../theme/y2k";

/* THE COURIER'S REEL — five scenes, all of them her.
   1  the egg you picked knocks, cracks and opens; she rises out of the
      bottom shell and a finger pokes her (she answers with a heart, as
      the hatch does)
   2  her name, typed onto a tag hung from her — the name you gave her
   3  her coat goes Sky → Mist → Peach → Night, then a beanie pops on;
      the three First Class coats carry a small lock on their swatches
   4  the lock screen: her Live Activity rises in with your letter out,
      desks tick up, then a reply lands — she knocks, and she's back
   5  the guide's title, in big type, with her flying past
   Every size is a fraction of the square's side `s`. */

const RM = ReduceMotion.System;
/* easings made once: the kit's useOnce re-runs when its easing changes identity,
   and these scenes re-render as they step */
const OUT = Easing.out(Easing.cubic);
const BACK = Easing.out(Easing.back(1.5));
const POP = Easing.out(Easing.back(1.8));

/** how many of `marks` (ms after mount) have passed — for things that
    change in steps (a coat, a count) rather than glide */
function useBeats(marks: readonly number[]): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const ids = marks.map((m, i) => setTimeout(() => setN(i + 1), m));
    return () => ids.forEach(clearTimeout);
  }, [marks]);
  return n;
}

/* the kit's Pop, with its easing made once. The kit's Pop (and Finger) build
   a fresh easing every render, so their animation restarts whenever the
   scene around them re-renders: the hatch's heart, waiting 2.56 s, was
   pushed back by the face change at 2.52 s and landed after the scene had
   gone; the desk envelopes re-bounced at every new desk. */
function PopIn({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  const v = useOnce(420, delay, POP);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, v.value * 1.4), transform: [{ scale: 0.4 + 0.6 * v.value }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}
/* the finger takes only numbers, so memo keeps a scene's re-render from restarting its slide-in */
const StillFinger = memo(Finger);

/* she is drawn where she really is (WrenBird's own fallback), except that an
   egg wears nothing and has no face: a scene about her coat or her coming
   home draws an egg-stage courier hatched */
function useHatchedStage(): WrenStage | undefined {
  const { stage } = useWrenStage();
  return stage === "egg" ? "hatch" : undefined;
}

/* ── 1 · the hatch ─────────────────────────────────────────────────────── */

/* the egg's outline split along the hatch's own crack line (EggShell's RIM
   and HatchStage's CRACK), so the half that flies is the shell that was drawn */
const CRACK_PTS = "-74,6 -52,-8 -30,4 -8,-12 14,0 36,-14 56,-2 74,6";
const TOP_HALF = `${CRACK_PTS} 72,-20 64,-50 48,-76 26,-92 0,-96 -26,-92 -48,-76 -64,-50 -72,-20`;
const BOTTOM_HALF = `${CRACK_PTS} 68,38 52,68 30,88 0,96 -30,88 -52,68 -68,38`;
const CRACK_D = "M-74 6 L-52 -8 L-30 4 L-8 -12 L14 0 L36 -14 L56 -2 L74 6";

function EggPiece({ size, part, shell }: { size: number; part: "top" | "bottom" | "whole"; shell: Shell }) {
  const gid = `reel-egg-${part}`;
  const pts = part === "top" ? TOP_HALF : part === "bottom" ? BOTTOM_HALF : RIM;
  return (
    <Svg width={size} height={size} viewBox="-110 -110 220 220">
      <ShellGradient shell={shell} gid={gid} />
      <Polygon points={pts} fill={`url(#${gid})`} stroke={Y.ink} strokeWidth={2.6} strokeLinejoin="round" />
      <G opacity={0.55}>
        {part !== "bottom" && <Circle cx={-30} cy={-44} r={4.6} fill={shell.deep} />}
        {part !== "bottom" && <Circle cx={26} cy={-20} r={3.4} fill={shell.deep} />}
        {part !== "top" && <Circle cx={-14} cy={30} r={3} fill={shell.deep} />}
        {part !== "top" && <Circle cx={38} cy={44} r={4} fill={shell.deep} />}
      </G>
      {part !== "bottom" && <Path d={MARK_D} fill={shell.mark} opacity={0.7} />}
    </Svg>
  );
}

function Heart({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.2 4.3 2.4.7-1.2 2.1-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21Z" fill="#F2887E" stroke={Y.ink} strokeWidth={1.4} strokeLinejoin="round" />
    </Svg>
  );
}

const HATCH_BEATS = [2520] as const;

const Hatch = memo(function Hatch({ s }: { s: number }) {
  const [variant, setVariant] = useState(0);
  useEffect(() => {
    let alive = true;
    getWrenEgg().then(
      (v) => alive && setVariant(v),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, []);
  const shell = EGG_SHELLS[variant] ?? EGG_SHELLS[0];
  const loved = useBeats(HATCH_BEATS) >= 1;

  const E = s * 0.7; // the egg's box (viewBox 220 wide)
  const k = E / 220;
  const cy = s * 0.56;
  const B = s * 0.56; // her box
  const T = cy + 20 * k - 0.83 * B; // so her lower body sits in the bottom shell

  // three knocks, each harder, while the crack runs across; then it opens
  const wob = useSharedValue(0);
  const hop = useSharedValue(0);
  useEffect(() => {
    const knock = (deg: number) =>
      withSequence(
        withTiming(deg, { duration: 70, reduceMotion: RM }),
        withTiming(-deg * 0.7, { duration: 90, reduceMotion: RM }),
        withTiming(0, { duration: 100, reduceMotion: RM }),
      );
    wob.value = withSequence(withDelay(250, knock(5)), withDelay(140, knock(7)), withDelay(90, knock(9)));
    hop.value = withDelay(
      2500,
      withSequence(withTiming(1, { duration: 150, easing: Easing.out(Easing.quad), reduceMotion: RM }), withTiming(0, { duration: 280, easing: Easing.bounce, reduceMotion: RM })),
    );
  }, [wob, hop]);
  const crack = useOnce(1000, 250, Easing.linear);
  const burst = useOnce(650, 1350, OUT);
  const rise = useOnce(560, 1350, BACK);

  const eggSt = useAnimatedStyle(() => ({ transform: [{ rotate: `${wob.value}deg` }] }));
  const wholeSt = useAnimatedStyle(() => ({ opacity: burst.value > 0 ? 0 : 1 }));
  const crackSt = useAnimatedStyle(() => ({ width: (36 + 148 * crack.value) * k + 3, opacity: burst.value > 0 ? 0 : 1 }));
  const topSt = useAnimatedStyle(() => ({
    opacity: 1 - burst.value,
    transform: [{ translateX: s * 0.2 * burst.value }, { translateY: -s * 0.55 * burst.value }, { rotate: `${55 * burst.value}deg` }],
  }));
  const glowSt = useAnimatedStyle(() => ({
    opacity: burst.value > 0 ? 0.15 + 0.6 * (1 - burst.value) : 0.12 + 0.5 * crack.value,
    transform: [{ scale: 0.8 + 0.2 * crack.value + 0.45 * burst.value }],
  }));
  const flashSt = useAnimatedStyle(() => ({ opacity: burst.value > 0 ? 0.6 * (1 - burst.value) * (1 - burst.value) : 0 }));
  const chickSt = useAnimatedStyle(() => ({
    opacity: Math.min(1, rise.value * 3),
    transform: [{ translateY: (1 - rise.value) * s * 0.22 - hop.value * s * 0.06 }, { rotate: `${hop.value * -6}deg` }],
  }));

  const G0 = s * 0.78;
  return (
    <View style={{ width: s, height: s }}>
      {/* the light from inside */}
      <Animated.View style={[{ position: "absolute", left: (s - G0) / 2, top: cy - G0 / 2, width: G0, height: G0, borderRadius: G0 / 2, backgroundColor: "#FFD98A" }, glowSt]} />
      {/* the ground under the egg */}
      <View style={{ position: "absolute", left: s * 0.31, width: s * 0.38, top: cy + 94 * k, height: s * 0.035, borderRadius: s * 0.02, backgroundColor: Y.ink, opacity: 0.1 }} />
      {/* her, behind the bottom shell */}
      <Animated.View style={[{ position: "absolute", left: (s - B) / 2, top: T, width: B, height: B }, chickSt]}>
        <WrenBird size={B} stage="hatch" accessory="none" mood={loved ? "delight" : "content"} />
      </Animated.View>
      <Animated.View style={[{ position: "absolute", left: (s - E) / 2, top: cy - E / 2, width: E, height: E }, eggSt]}>
        <View style={{ position: "absolute", left: 0, top: 0 }}>
          <EggPiece size={E} part="bottom" shell={shell} />
        </View>
        <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, topSt]}>
          <EggPiece size={E} part="top" shell={shell} />
        </Animated.View>
        <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, wholeSt]}>
          <EggPiece size={E} part="whole" shell={shell} />
        </Animated.View>
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, height: E, overflow: "hidden" }, crackSt]}>
          <Svg width={E} height={E} viewBox="-110 -110 220 220">
            <Path d={CRACK_D} fill="none" stroke={Y.ink} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Animated.View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: s, height: s, backgroundColor: "#FFF6E3" }, flashSt]} />
      {/* poke her head: a heart, as the hatch answers */}
      <View style={{ position: "absolute", left: s / 2 - s * 0.25, top: T + B * 0.1 }}>
        <PopIn delay={2560}>
          <Heart size={s * 0.11} />
        </PopIn>
      </View>
      <StillFinger x={s / 2 + s * 0.08} y={T + B * 0.38} at={2500} size={s * 0.17} />
    </View>
  );
});

/* ── 2 · her name ──────────────────────────────────────────────────────── */

/* a CJK, kana or hangul letter is about a full em wide; a Latin one about 0.62 */
function isWide(c: string): boolean {
  const p = c.codePointAt(0) ?? 0;
  return (p >= 0x1100 && p <= 0x11ff) || (p >= 0x2e80 && p <= 0x9fff) || (p >= 0xac00 && p <= 0xd7af) || (p >= 0xf900 && p <= 0xfaff) || (p >= 0xff00 && p <= 0xffef);
}

const NameTag = memo(function NameTag({ s }: { s: number }) {
  const name = useWrenName();
  const chars = Array.from(name);
  /* one letter every 110 ms after a 650 ms pause, and the clock stops the
     moment her name is whole (names are at most 16: done by ~2.4 s). With
     Reduce Motion on, the name is simply there. */
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  const done = reduce || tick >= chars.length;
  useEffect(() => {
    if (done) return;
    const id = setTimeout(() => setTick((n) => n + 1), tick === 0 ? 650 : 110);
    return () => clearTimeout(id);
  }, [tick, done]);
  const typed = done ? name : chars.slice(0, tick).join("");

  const come = useOnce(520, 60, BACK);
  const sway = useLoop(1300);
  const blink = useLoop(320);
  const hop = useSharedValue(0);
  useEffect(() => {
    if (!done) return;
    hop.value = withSequence(withTiming(1, { duration: 150, easing: Easing.out(Easing.quad), reduceMotion: RM }), withTiming(0, { duration: 300, easing: Easing.bounce, reduceMotion: RM }));
  }, [done, hop]);

  const groupSt = useAnimatedStyle(() => ({
    opacity: come.value,
    transform: [{ translateY: -(1 - come.value) * s * 0.08 }, { rotate: `${-2 + 4 * sway.value}deg` }, { scale: 1 + 0.04 * hop.value }],
  }));
  const birdSt = useAnimatedStyle(() => ({ transform: [{ translateY: -hop.value * s * 0.05 }] }));
  const caretSt = useAnimatedStyle(() => ({ opacity: blink.value > 0.5 ? 1 : 0.15 }));

  const B = s * 0.46;
  const GT = s * 0.36; // the group (strings + tag) hangs from here
  const TW = s * 0.78;
  const TH = s * 0.28;
  const tagTop = s * 0.14; // inside the group
  const holeY = tagTop + Math.max(2, s * 0.009) + s * 0.044;
  // sized from the whole name, so it doesn't change size as it's typed
  const units = chars.reduce((a, c) => a + (isWide(c) ? 1 : 0.62), 0);
  const fs = Math.min(s * 0.13, (s * 0.6) / Math.max(units, 1.8));
  const line = Math.max(2, s * 0.009);
  return (
    <View style={{ width: s, height: s }}>
      <Animated.View style={[{ position: "absolute", left: 0, top: GT, width: s, height: s * 0.5, transformOrigin: "50% 0%" }, groupSt]}>
        <Svg width={s} height={holeY + 2} style={{ position: "absolute", left: 0, top: 0 }}>
          <Path d={`M${s / 2 - s * 0.07} ${s * 0.02} L${s / 2} ${holeY} L${s / 2 + s * 0.07} ${s * 0.02}`} fill="none" stroke={P.ink} strokeWidth={line} strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
        <View style={{ position: "absolute", left: (s - TW) / 2, top: tagTop, width: TW, height: TH, borderRadius: s * 0.035, backgroundColor: "#FFFFFF", borderWidth: line, borderColor: P.ink, alignItems: "center", justifyContent: "center" }}>
          <View style={{ position: "absolute", top: s * 0.022, left: TW / 2 - s * 0.022 - line, width: s * 0.044, height: s * 0.044, borderRadius: s * 0.022, backgroundColor: P.penWash, borderWidth: line, borderColor: P.ink }} />
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: s * 0.04, maxWidth: TW - s * 0.08 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ flexShrink: 1, fontFamily: PF.letter, fontSize: fs, lineHeight: fs * 1.2, fontWeight: "700", color: P.ink, letterSpacing: -0.3 }}>
              {typed}
            </Text>
            {!done && <Animated.View style={[{ width: Math.max(2, s * 0.011), height: fs * 0.95, marginLeft: s * 0.008, backgroundColor: P.pen, borderRadius: 1 }, caretSt]} />}
          </View>
          <View style={{ position: "absolute", left: TW * 0.14, right: TW * 0.14, bottom: s * 0.05, height: Math.max(1.5, s * 0.006), backgroundColor: P.pen, opacity: 0.35 }} />
          {done && (
            <View style={{ position: "absolute", right: s * 0.03, top: s * 0.025 }}>
              <PopIn>
                <View style={{ width: s * 0.075, height: s * 0.075, borderRadius: s * 0.0375, backgroundColor: P.pen, alignItems: "center", justifyContent: "center" }}>
                  <Svg width={s * 0.045} height={s * 0.045} viewBox="0 0 24 24">
                    <Path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
              </PopIn>
            </View>
          )}
        </View>
      </Animated.View>
      {/* her, in front of the strings */}
      <Animated.View style={[{ position: "absolute", left: (s - B) / 2, top: s * 0.06, width: B, height: B }, birdSt]}>
        <WrenBird size={B} stage="hatch" accessory="none" mood={done ? "delight" : "curious"} />
      </Animated.View>
    </View>
  );
});

/* ── 3 · what she wears ────────────────────────────────────────────────── */

const COATS: WrenSkin[] = ["sticker", "plush", "peach", "ink"]; // Sky, Mist, Peach, Night
const DRESS_BEATS = [650, 1250, 1850, 2450] as const; // three coat changes, then the beanie

function Sparkle({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 1.5 L14 10 L22.5 12 L14 14 L12 22.5 L10 14 L1.5 12 L10 10 Z" fill={P.pen} />
    </Svg>
  );
}

function Lock({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 22" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={9} width={14} height={11} rx={2} />
      <Path d="M6.5 9V6a3.5 3.5 0 0 1 7 0v3" />
    </Svg>
  );
}

const Dress = memo(function Dress({ s }: { s: number }) {
  const stage = useHatchedStage();
  const n = useBeats(DRESS_BEATS);
  const at = Math.min(n, COATS.length - 1);
  const coat = COATS[at];
  const acc: WrenAccessory = n >= DRESS_BEATS.length ? "beanie" : "none";
  const bump = useSharedValue(0);
  useEffect(() => {
    if (n === 0) return;
    bump.value = withSequence(withTiming(1, { duration: 90, reduceMotion: RM }), withTiming(0, { duration: 300, easing: Easing.out(Easing.back(2.4)), reduceMotion: RM }));
  }, [n, bump]);
  const birdSt = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.1 * bump.value }, { translateY: bump.value * s * 0.02 }] }));

  const D = s * 0.56;
  const B = s * 0.52;
  const discTop = s * 0.1;
  const W = s * 0.085; // a swatch
  const ring = W + s * 0.034;
  const line = Math.max(2, s * 0.008);
  return (
    <View style={{ width: s, height: s }}>
      <View style={{ position: "absolute", left: (s - D) / 2, top: discTop, width: D, height: D, borderRadius: D / 2, backgroundColor: "#FFFFFF" }} />
      <Animated.View style={[{ position: "absolute", left: (s - B) / 2 + s * 0.015, top: discTop + (D - B) / 2 + s * 0.01, width: B, height: B }, birdSt]}>
        <PopIn delay={60}>
          <WrenBird size={B} stage={stage} skin={coat} accessory={acc} mood={acc === "none" ? "content" : "delight"} />
        </PopIn>
      </Animated.View>
      {acc !== "none" && (
        <>
          <View style={{ position: "absolute", left: s / 2 - s * 0.24, top: s * 0.17 }}>
            <PopIn>
              <Sparkle size={s * 0.06} />
            </PopIn>
          </View>
          <View style={{ position: "absolute", left: s / 2 + s * 0.18, top: s * 0.13 }}>
            <PopIn delay={70}>
              <Sparkle size={s * 0.075} />
            </PopIn>
          </View>
          <View style={{ position: "absolute", left: s / 2 + s * 0.22, top: s * 0.3 }}>
            <PopIn delay={140}>
              <Sparkle size={s * 0.045} />
            </PopIn>
          </View>
        </>
      )}
      <Text style={{ position: "absolute", left: 0, right: 0, top: s * 0.69, textAlign: "center", ...PFM.monoSemi, fontSize: s * 0.052, letterSpacing: s * 0.006, color: P.ink }}>
        {t(`skin.${coat}.name`).toUpperCase()}
      </Text>
      <View style={{ position: "absolute", left: 0, right: 0, top: s * 0.79, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: s * 0.035 }}>
        {COATS.map((c, i) => (
          <View key={c} style={{ width: ring, height: ring, borderRadius: ring / 2, borderWidth: line, borderColor: i === at ? P.ink : "transparent", alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: W, height: W, borderRadius: W / 2, backgroundColor: CHICK_FILL[c] }} />
            {i > 0 && (
              <View style={{ position: "absolute", right: -s * 0.012, bottom: -s * 0.012, width: s * 0.042, height: s * 0.042, borderRadius: s * 0.021, backgroundColor: "#FFFFFF", borderWidth: Math.max(1, s * 0.004), borderColor: P.ink, alignItems: "center", justifyContent: "center" }}>
                <Lock size={s * 0.024} color={P.ink} />
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
});

/* ── 4 · on the lock screen ────────────────────────────────────────────── */

const LOCK_BEATS = [950, 1350, 1750, 2250] as const; // three desks, then the reply
const BRASS = "#E8A63C"; // the Live Activity's own brass (activities/LetterOut)
const BRASS_INK = "#9A7433";

function Envelope({ w, color, open }: { w: number; color: string; open?: boolean }) {
  return (
    <Svg width={w} height={w * 0.78} viewBox="0 0 24 18.7">
      <Rect x={1} y={1} width={22} height={16.7} rx={2.2} fill={color} />
      <Path d={open ? "M1.5 2.2 L12 10.4 L22.5 2.2" : "M1.5 2 L12 10 L22.5 2"} fill="none" stroke="#FFFFFF" strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

const LockScreen = memo(function LockScreen({ s }: { s: number }) {
  const stage = useHatchedStage();
  const name = useWrenName().toUpperCase();
  const n = useBeats(LOCK_BEATS);
  const reads = Math.min(n, 3);
  const replied = n >= LOCK_BEATS.length;

  const come = useOnce(560, 250, BACK);
  const shake = useSharedValue(0);
  const ring = useSharedValue(0);
  useEffect(() => {
    const step = (v: number) => withTiming(v, { duration: 55, reduceMotion: RM });
    shake.value = withDelay(2250, withSequence(step(1), step(-1), step(1), step(-1), step(0)));
    ring.value = withDelay(
      2250,
      withSequence(withTiming(1, { duration: 450, easing: Easing.out(Easing.quad), reduceMotion: RM }), withTiming(0, { duration: 0, reduceMotion: RM }), withTiming(1, { duration: 450, easing: Easing.out(Easing.quad), reduceMotion: RM })),
    );
  }, [shake, ring]);
  const bannerSt = useAnimatedStyle(() => ({
    opacity: Math.min(1, come.value * 1.5),
    transform: [{ translateY: (1 - come.value) * s * 0.16 }, { translateX: shake.value * s * 0.014 }],
  }));
  const ringSt = useAnimatedStyle(() => ({ opacity: ring.value > 0 ? 0.9 * (1 - ring.value) : 0, transform: [{ scale: 0.8 + 0.8 * ring.value }] }));

  const eyebrow = replied ? t("la.out.back", { name }) : t("la.out.eyebrow", { name });
  const head = replied ? t("la.out.repliedHead") : reads === 0 ? t("la.out.reads0") : reads === 1 ? t("la.out.reads1") : t("la.out.readsN", { n: reads });
  const said = replied ? t("la.out.repliedLine") : t("la.out.looking");

  const PW = s * 0.9; // the phone
  const PL = (s - PW) / 2;
  const PT = s * 0.085;
  const edge = Math.max(2, s * 0.012);
  const BW = s * 0.16; // her, in the banner
  return (
    <View style={{ width: s, height: s }}>
      <View style={{ position: "absolute", left: PL, top: PT, width: PW, height: s * 1.02, borderRadius: s * 0.12, borderWidth: edge, borderColor: "#1E1B35", backgroundColor: "#1B1A33", overflow: "hidden" }}>
        <View style={{ alignItems: "center", marginTop: s * 0.055 }}>
          <Lock size={s * 0.045} color="#FFFFFF" />
          <Text style={{ fontSize: s * 0.17, lineHeight: s * 0.2, fontWeight: "700", color: "#FFFFFF", letterSpacing: -1, marginTop: s * 0.01 }}>9:41</Text>
        </View>
        {/* her Live Activity, as LetterOut draws it */}
        <Animated.View style={[{ position: "absolute", left: s * 0.025, right: s * 0.025, top: s * 0.36, borderRadius: s * 0.06, backgroundColor: P.penWash, padding: s * 0.032, flexDirection: "row", alignItems: "center" }, bannerSt]}>
          <View style={{ width: BW, height: BW, alignItems: "center", justifyContent: "center" }}>
            <Animated.View style={[{ position: "absolute", width: BW, height: BW, borderRadius: BW / 2, borderWidth: Math.max(2, s * 0.008), borderColor: P.pen }, ringSt]} />
            {replied ? <WrenBird size={BW} stage={stage} mood="delight" /> : <WrenBird size={BW} pose="fly" />}
          </View>
          <View style={{ flex: 1, marginLeft: s * 0.028 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ ...PFM.monoSemi, fontSize: s * 0.032, letterSpacing: 0.4, color: replied ? BRASS_INK : P.ink60 }}>
              {eyebrow}
            </Text>
            <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: s * 0.052, lineHeight: s * 0.064, fontWeight: "600", color: P.ink, marginTop: s * 0.012 }}>
              {head}
            </Text>
            {!replied && reads > 0 && (
              <View style={{ flexDirection: "row", gap: s * 0.01, marginTop: s * 0.014 }}>
                {Array.from({ length: reads }, (_, i) => (
                  <PopIn key={i}>
                    <Envelope w={s * 0.04} color={P.pen} open />
                  </PopIn>
                ))}
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: s * 0.014 }}>
              {replied && (
                <View style={{ marginRight: s * 0.012 }}>
                  <PopIn>
                    <Envelope w={s * 0.045} color={BRASS} />
                  </PopIn>
                </View>
              )}
              <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={{ flex: 1, ...PFM.mono, fontSize: s * 0.033, lineHeight: s * 0.043, color: replied ? BRASS_INK : P.ink60 }}>
                {said}
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
});

/* ── 5 · the title ─────────────────────────────────────────────────────── */

/* memo'd like the rest: BigType's words fade in on the kit's per-render
   easing, so a re-render from the card around it would restart them */
const Title = memo(function Title({ s }: { s: number }) {
  const title = t("gd.courier.title");
  const words = title.includes(" ") ? title.split(" ") : [title];
  const come = useOnce(800, 450, OUT);
  const bob = useLoop(700);
  const st = useAnimatedStyle(() => ({
    opacity: come.value,
    transform: [{ translateX: (1 - come.value) * s * 0.35 }, { translateY: (1 - come.value) * s * 0.12 - bob.value * s * 0.025 }],
  }));
  return (
    <View style={{ width: s, height: s }}>
      <BigType s={s} words={words} accent={[words.length - 1]} />
      <Animated.View style={[{ position: "absolute", right: s * 0.07, top: s * 0.7 }, st]}>
        <WrenBird size={s * 0.24} pose="fly" />
      </Animated.View>
    </View>
  );
});

export const reel: Reel = {
  bg: P.penWash,
  scenes: [
    { key: "hatch", ms: 3400, render: (s) => <Hatch s={s} /> },
    { key: "name", ms: 3000, render: (s) => <NameTag s={s} /> },
    { key: "dress", ms: 3200, render: (s) => <Dress s={s} /> },
    { key: "lock", ms: 3400, render: (s) => <LockScreen s={s} /> },
    { key: "title", ms: 2600, render: (s) => <Title s={s} /> },
  ],
};
