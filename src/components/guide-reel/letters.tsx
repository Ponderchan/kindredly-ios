import { memo, useEffect, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, interpolateColor, useAnimatedStyle, useReducedMotion } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { BigType, FACE_INK, Finger, useLoop, useOnce, type Reel } from "./kit";
import { WrenBird } from "../WrenBird";
import { EnvelopeArt } from "../EnvelopeArt";
import { GUIDE_REEL_WIDTHS, Stamp, snapStampWidth } from "../Stamp";
import { MosaicId } from "../MosaicId";
import { Seal } from "../Seal";
import { Envelope, Kindreds, Me, Notes } from "../PostTabBar";
import { STARTER_STAMPS } from "../../data/stamps";
import { OPENING_MIN } from "../../lib/weighted-count";
import { stampHeight } from "../../lib/stamp-frame";
import { P, PF } from "../../theme/post";
import { t, useLang } from "../../lib/i18n";

/* HOW LETTERS TRAVEL — the reel (owner, 2026-10-11: "大的清楚的动态演示").
   Four moving pictures and a line of type, each built from the parts the
   app itself draws, at the size of the square:
     1 · the + opens its fan, "to a stranger" opens the page, one line is
         typed and the key turns blue, asking for a mood stamp
     2 · a stamp is picked from the tray and lands on the envelope, the
         seal presses on, LET IT TRAVEL — and the letter is gone
     3 · the courier carries it over three strangers' desks
     4 · your own desk: fifteen letters, read one by one, the counter's
         shutter comes down till morning
     5 · the title
   Every size is a fraction of `s` (u = s/100), so nothing is a small
   picture scaled up.

   THE EASINGS LIVE OUT HERE. Easing.out(...) builds a new function each
   call, and useOnce lists its easing in its effect's deps — an inline one
   would restart the animation on every re-render. The parts that tick
   (the count, the counter, her mood) are leaf components holding their
   own state, so the scene around them never re-renders mid-play.

   THE SCENES ARE MEMOISED. GuideCard calls `render(s)` on every one of its
   own renders (a focus change, a re-render of the transcript around it),
   and the kit's Finger and BigType still take the default easing — a
   re-render mid-play would push their delays back and a finger would land
   after its own press. memo keeps a scene still while `s` is the same;
   each scene asks useLang itself so a language switch still reaches it.

   REDUCE MOTION. The kit's timings finish at once (delays skipped) when the
   system asks for less motion, so every scene shows its last frame. The
   JS-side steps follow: the counts start at their end, the shutter cuts in
   on time rather than sliding, and the stamp scene keeps its stamped,
   sealed envelope instead of ending on an empty square. */

const E_OUT = Easing.out(Easing.cubic);
const E_IN = Easing.in(Easing.cubic);
const E_INOUT = Easing.inOut(Easing.cubic);
const E_QUAD = Easing.out(Easing.quad);
const E_BACK = Easing.out(Easing.back(1.7));
const E_LIN = Easing.linear;

const LINE_INK = "#1E1B35";
const TAB_INK = "#5B5776"; // the bar's resting icon colour

/** an integer that steps from `from` to `to`, one step every `everyMs`, the first after `delay` */
function useCount(from: number, to: number, everyMs: number, delay: number): number {
  const still = useReducedMotion();
  const [n, setN] = useState(still ? to : from);
  useEffect(() => {
    if (still || from === to) return;
    const dir = to > from ? 1 : -1;
    let cur = from;
    let id: ReturnType<typeof setTimeout>;
    const step = () => {
      cur += dir;
      setN(cur);
      if (cur !== to) id = setTimeout(step, everyMs);
    };
    id = setTimeout(step, delay);
    return () => clearTimeout(id);
  }, [from, to, everyMs, delay, still]);
  return n;
}

/** false, then true once `ms` have passed */
function useAfter(ms: number): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setOn(true), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return on;
}

/* ════════════════════════════════════════════════════════════════════════
   1 · OPEN — the + → the fan → "to a stranger" → the page, one line typed
   ════════════════════════════════════════════════════════════════════════ */

const T_TAP = 560; // the + is pressed
const T_PICK = 1250; // "to a stranger" is pressed
const T_SHEET = 1400; // the page slides up
const T_TYPE = 1850; // the first character lands
const T_CHAR = 55; // one character every …
const T_READY = T_TYPE + (OPENING_MIN - 1) * T_CHAR + 70; // the key turns blue

type IconProps = { color: string; active?: boolean; size?: number };
const TABS: { x: number; Icon: (p: IconProps) => ReactNode; on?: boolean }[] = [
  { x: 11, Icon: Envelope, on: true },
  { x: 30, Icon: Notes },
  { x: 70, Icon: Kindreds },
  { x: 89, Icon: Me },
];

const Open = memo(function Open({ s }: { s: number }) {
  useLang();
  const u = s / 100;
  const BAR_TOP = 72 * u;
  const cy = 86 * u; // the bar's centre line
  const PLUS = 22 * u;
  const ICON = 9 * u;
  const FAN_Y = 44 * u;

  const turn = useOnce(220, T_TAP + 60, E_OUT);
  const dim = useOnce(220, T_TAP + 80, E_QUAD);
  const f1out = useOnce(160, T_TAP + 380, E_QUAD);
  const sheet = useOnce(420, T_SHEET, E_OUT);

  /* the + becomes an ×: an eighth of a turn, pen going to the postmark red — as the bar does it */
  const disc = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(turn.value, [0, 1], [P.pen, P.post]),
    transform: [{ rotate: `${turn.value * 45}deg` }],
  }));
  const dimSt = useAnimatedStyle(() => ({ opacity: dim.value }));
  const f1St = useAnimatedStyle(() => ({ opacity: 1 - f1out.value }));
  const sheetSt = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - sheet.value) * s }] }));

  return (
    <View style={{ width: s, height: s }}>
      {/* the tab bar, close up */}
      <View style={{ position: "absolute", left: 0, right: 0, top: BAR_TOP, height: s - BAR_TOP, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "rgba(30,27,53,0.08)" }} />
      {TABS.map(({ x, Icon, on }) => (
        <View key={x} style={{ position: "absolute", left: x * u - ICON / 2, top: cy - ICON / 2 }}>
          <Icon color={on ? P.pen : TAB_INK} active={on} size={ICON} />
        </View>
      ))}

      {/* the page dims above the bar; the bar stays live */}
      <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, height: BAR_TOP, backgroundColor: "rgba(30,27,53,0.58)" }, dimSt]} />

      <Animated.View style={[{ position: "absolute", left: 50 * u - PLUS / 2, top: cy - PLUS / 2, width: PLUS, height: PLUS, borderRadius: PLUS / 2, alignItems: "center", justifyContent: "center" }, disc]}>
        <Svg width={PLUS * 0.5} height={PLUS * 0.5} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round">
          <Path d="M12 5v14M5 12h14" />
        </Svg>
      </Animated.View>

      {/* the two choices rise out of the + */}
      <FanChoice u={u} cx={30 * u} cy={FAN_Y} fromX={20 * u} fromY={cy - FAN_Y} delay={T_TAP + 100} label={t("pc.stranger")}>
        <PlaneGlyph size={10 * u} />
      </FanChoice>
      <FanChoice u={u} cx={70 * u} cy={FAN_Y} fromX={-20 * u} fromY={cy - FAN_Y} delay={T_TAP + 170} label={t("pc.yourself")}>
        <BookGlyph size={10 * u} />
      </FanChoice>

      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: s, height: s }, f1St]}>
        <Finger x={50 * u} y={cy} at={T_TAP} size={17 * u} />
      </Animated.View>
      <Finger x={30 * u} y={FAN_Y} at={T_PICK} size={17 * u} />

      {/* the composer slides in over all of it */}
      <Animated.View style={[{ position: "absolute", left: 5 * u, top: 9 * u, width: 90 * u, height: 96 * u, backgroundColor: "#FFFFFF", borderRadius: 5 * u, borderWidth: 2, borderColor: LINE_INK, overflow: "hidden" }, sheetSt]}>
        <Text style={{ position: "absolute", left: 5 * u, top: 4 * u, fontFamily: PF.mono, fontSize: 5 * u, color: P.ink }}>✕</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ position: "absolute", left: 15 * u, right: 24 * u, top: 5.4 * u, textAlign: "center", fontFamily: PF.monoSemi, fontSize: 3.8 * u, letterSpacing: 0.3 * u, color: P.ink }}>
          {t("cp.header")}
        </Text>
        {/* the corner where the stamp goes, still empty */}
        <View style={{ position: "absolute", right: 5 * u, top: 3 * u, width: 13 * u, height: 13 * u, borderWidth: 1.5, borderStyle: "dashed", borderColor: P.pen, borderRadius: 1.4 * u, backgroundColor: P.penWash, transform: [{ rotate: "8deg" }] }} />
        <Writing u={u} />
      </Animated.View>
    </View>
  );
});

function FanChoice({ u, cx, cy, fromX, fromY, delay, label, children }: { u: number; cx: number; cy: number; fromX: number; fromY: number; delay: number; label: string; children: ReactNode }) {
  const D = 22 * u;
  const v = useOnce(460, delay, E_BACK);
  const st = useAnimatedStyle(() => ({
    opacity: Math.min(1, v.value * 1.6),
    transform: [{ translateX: (1 - v.value) * fromX }, { translateY: (1 - v.value) * fromY }, { scale: 0.35 + 0.65 * v.value }],
  }));
  const word = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, (v.value - 0.7) / 0.3)) }));
  return (
    <Animated.View style={[{ position: "absolute", left: cx - 18 * u, top: cy - D / 2, width: 36 * u, alignItems: "center" }, st]}>
      <View style={{ width: D, height: D, borderRadius: D / 2, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: LINE_INK, shadowOpacity: 0.25, shadowRadius: 3 * u, shadowOffset: { width: 0, height: 2 * u } }}>{children}</View>
      <Animated.Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[{ width: 36 * u, marginTop: 2.2 * u, textAlign: "center", fontFamily: PF.letter, fontWeight: "600", fontSize: 4.4 * u, color: "#FFFFFF" }, word]}>
        {label}
      </Animated.Text>
    </Animated.View>
  );
}

/** to a stranger — the courier's paper plane (the fan's own glyph) */
function PlaneGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={P.pen} strokeWidth={1.9} strokeLinejoin="round" strokeLinecap="round">
      <Path d="M20.5 3.5L3.5 10.5l7.5 3 3 7.5 6.5-17.5z" />
      <Path d="M11 13.5l9.5-10" />
    </Svg>
  );
}

/** to yourself — the sealed book */
function BookGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth={1.9} strokeLinejoin="round" strokeLinecap="round">
      <Path d="M6.5 3.5h11a2 2 0 0 1 2 2v15h-13a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z" />
      <Path d="M8.5 3.5v17" />
      <Circle cx={14} cy={11} r={2.2} fill={P.brassSeal} stroke="none" />
    </Svg>
  );
}

/* ONE REAL LINE. The floor is OPENING_MIN characters (20), not twenty
   words — so the page gets one line of four words, each a bar that grows
   a character at a time, and the key under it fills as the count climbs.
   4 + 1 + 3 + 1 + 6 + 1 + 4 = 20, the wrap counting as the space. */
const CW = 4.4; // one character's width, in u
type Word = { x: number; line: number; len: number; first: number };
const WORDS: Word[] = (() => {
  const lens = [4, 3, 6, 4];
  const out: Word[] = [];
  let x = 6;
  let line = 0;
  let c = 1; // the 1-based index of the word's first character
  for (const len of lens) {
    if (x + len * CW > 84) {
      x = 6;
      line += 1;
    }
    out.push({ x, line, len, first: c });
    x += (len + 1) * CW;
    c += len + 1;
  }
  return out;
})();

function Writing({ u }: { u: number }) {
  const c = useCount(0, OPENING_MIN, T_CHAR, T_TYPE);
  const ready = useOnce(220, T_READY, E_OUT);
  const blink = useLoop(380);
  const readySt = useAnimatedStyle(() => ({ opacity: ready.value }));
  const caretSt = useAnimatedStyle(() => ({ opacity: 0.25 + 0.75 * blink.value }));
  const lineY = (l: number) => 24 * u + l * 10 * u;

  let caretX = 6;
  let caretLine = 0;
  for (const w of WORDS) {
    if (c >= w.first - 1) {
      caretX = w.x + Math.min(w.len, c - (w.first - 1)) * CW;
      caretLine = w.line;
    }
  }

  return (
    <>
      {WORDS.map((w, i) => {
        const typed = Math.max(0, Math.min(w.len, c - (w.first - 1)));
        return typed > 0 ? (
          <View key={i} style={{ position: "absolute", left: w.x * u, top: lineY(w.line), width: typed * CW * u - 0.6 * u, height: 3.8 * u, borderRadius: 1.9 * u, backgroundColor: P.ink, opacity: 0.82 }} />
        ) : null;
      })}
      <Animated.View style={[{ position: "absolute", left: caretX * u + 0.6 * u, top: lineY(caretLine) - 1.4 * u, width: 0.7 * u, height: 6.6 * u, borderRadius: 0.35 * u, backgroundColor: P.pen }, caretSt]} />

      {/* the key: filling as you write, the count beside the label; blue the moment the line is long enough */}
      <View style={{ position: "absolute", left: 5 * u, right: 5 * u, top: 66 * u, height: 14 * u, borderWidth: 1, borderColor: P.ink12, overflow: "hidden", justifyContent: "center" }}>
        <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.round((c / OPENING_MIN) * 100)}%`, backgroundColor: P.penWash }} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2 * u, paddingHorizontal: 3 * u }}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ flexShrink: 1, fontFamily: PF.monoSemi, fontSize: 4 * u, letterSpacing: 0.35 * u, color: P.ink40 }}>
            {t("cp.travel")}
          </Text>
          <Text style={{ fontFamily: PF.mono, fontSize: 3.4 * u, color: P.ink40 }}>
            {c}/{OPENING_MIN}
          </Text>
        </View>
        <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: P.pen, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 * u }, readySt]}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontFamily: PF.monoSemi, fontSize: 4 * u, letterSpacing: 0.35 * u, color: "#FFFFFF" }}>
            {t("cp.needStamp")}
          </Text>
        </Animated.View>
      </View>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   2 · STAMP — one picked from the tray lands on the envelope; the seal
   presses on; LET IT TRAVEL, and it's gone
   ════════════════════════════════════════════════════════════════════════ */

const PICKED = "made-my-day";
const TRAY = [STARTER_STAMPS[0], PICKED, STARTER_STAMPS[2], STARTER_STAMPS[4]];
const TRAY_X = [20, 40, 60, 80]; // stamp centres, in u
const TRAY_Y = 85;
/* a stamp's width as the scene asks for it, in u. The stamp drawn is the
   real 5:6 one (stamps v2) at the guide-reel width nearest to it — 30, 40
   or 60pt — never wider than 18u, so the tray's stamps 20u apart keep a
   gap; everything below is laid out by that real width and height, in pt */
const ST = 16;
const ST_MAX = 18;
const EX = 12; // the envelope's box, in u
const EY = 13;
const EW = 76;
const EH = EW * 0.72;
/* where things sit on EnvelopeArt (its viewBox is 212 × 152, scaled by width):
   the body's top-right corner is (200, 6), the seal's centre (102, 74); the
   stamp's corner is 2.5u in from the body's (its x needs the stamp's width) */
const STAMP_RIGHT = EW * (200 / 212) - 2.5;
const STAMP_TOP = EW * (6 / 212) + 2.5;
const SEAL_AT = { x: EW * (102 / 212), y: EW * (74 / 212) };
const SEAL = 21;

const T_PICK_STAMP = 650;
const T_FLY = 760;
const T_SEAL = 1450;
const T_KEY = 1760;
const T_SEND = 2350;
const T_GONE = 2520;

const StampScene = memo(function StampScene({ s }: { s: number }) {
  useLang();
  const still = useReducedMotion();
  const u = s / 100;
  const sw = snapStampWidth(ST * u, GUIDE_REEL_WIDTHS, ST_MAX * u); // pt
  const sh = stampHeight(sw);
  const stampAt = { x: STAMP_RIGHT * u - sw, y: STAMP_TOP * u }; // pt, on the envelope
  const enter = useOnce(320, 0, E_OUT);
  const trayIn = useOnce(340, 0, E_OUT);
  const f1out = useOnce(160, T_PICK_STAMP + 220, E_QUAD);
  const fly = useOnce(540, T_FLY, E_INOUT);
  const trayOut = useOnce(300, T_SEAL - 130, E_IN);
  const press = useOnce(280, T_SEAL, E_QUAD);
  const ring = useOnce(560, T_SEAL + 70, E_OUT);
  const keyIn = useOnce(380, T_KEY, E_OUT);
  const lift = useOnce(480, T_GONE, E_IN);
  const go = still ? 0 : 1; // with less motion the scene rests on the sealed envelope, not on an empty square

  const sx0 = TRAY_X[1] * u - sw / 2;
  const sy0 = TRAY_Y * u - sh / 2;
  const sx1 = EX * u + stampAt.x;
  const sy1 = EY * u + stampAt.y;

  const group = useAnimatedStyle(() => ({
    opacity: enter.value * (1 - go * lift.value),
    transform: [{ translateY: (1 - enter.value) * 3 * u - go * lift.value * 34 * u }, { scale: 1 - 0.4 * go * lift.value }],
  }));
  const flying = useAnimatedStyle(() => {
    const p = fly.value;
    const arc = Math.sin(Math.PI * p);
    return {
      opacity: p < 0.999 ? 1 : 0,
      transform: [
        { translateX: (sx1 - sx0) * p },
        { translateY: (sy1 - sy0) * p - 9 * u * arc + (1 - trayIn.value) * 28 * u * (1 - p) },
        { scale: 1 + 0.5 * arc },
        { rotate: `${8 * p}deg` },
      ],
    };
  });
  const landed = useAnimatedStyle(() => ({ opacity: fly.value >= 0.999 ? 1 : 0 }));
  const seal = useAnimatedStyle(() => ({ opacity: Math.min(1, press.value * 2), transform: [{ scale: 1.7 - 0.7 * press.value }] }));
  const ringSt = useAnimatedStyle(() => ({ opacity: ring.value > 0 ? (1 - ring.value) * 0.55 : 0, transform: [{ scale: 1 + 0.75 * ring.value }] }));
  const tray = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - trayIn.value) * 28 * u + trayOut.value * 30 * u }] }));
  const f1St = useAnimatedStyle(() => ({ opacity: 1 - f1out.value }));
  const key = useAnimatedStyle(() => ({ opacity: keyIn.value * (1 - go * lift.value), transform: [{ translateY: (1 - keyIn.value) * 6 * u }] }));
  const f2St = useAnimatedStyle(() => ({ opacity: 1 - go * lift.value }));

  return (
    <View style={{ width: s, height: s }}>
      {/* the envelope, its stamp once landed, the seal */}
      <Animated.View style={[{ position: "absolute", left: EX * u, top: EY * u, width: EW * u, height: EH * u }, group]}>
        <EnvelopeArt w={EW * u} sealed={false} />
        <Animated.View style={[{ position: "absolute", left: stampAt.x, top: stampAt.y, transform: [{ rotate: "8deg" }] }, landed]}>
          <Stamp id={PICKED} width={sw} dark={false} />
        </Animated.View>
        <Animated.View style={[{ position: "absolute", left: (SEAL_AT.x - SEAL / 2) * u, top: (SEAL_AT.y - SEAL / 2) * u, width: SEAL * u, height: SEAL * u, borderRadius: (SEAL / 2) * u, borderWidth: 2, borderColor: P.pen }, ringSt]} />
        <Animated.View style={[{ position: "absolute", left: (SEAL_AT.x - SEAL / 2) * u, top: (SEAL_AT.y - SEAL / 2) * u }, seal]}>
          <Seal size={SEAL * u} />
        </Animated.View>
      </Animated.View>

      {/* the stamp tray, where the keyboard was */}
      <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 72 * u, height: 30 * u, backgroundColor: "#F3F2FA", borderTopWidth: 1, borderTopColor: P.ink12 }, tray]}>
        {TRAY.map((id, i) =>
          i === 1 ? null : (
            <View key={id} style={{ position: "absolute", left: TRAY_X[i] * u - sw / 2, top: (TRAY_Y - 72) * u - sh / 2 }}>
              <Stamp id={id} width={sw} dark={false} />
            </View>
          ),
        )}
      </Animated.View>

      {/* the picked one, on its way from the tray to the corner */}
      <Animated.View style={[{ position: "absolute", left: sx0, top: sy0 }, flying]}>
        <Stamp id={PICKED} width={sw} dark={false} />
      </Animated.View>

      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: s, height: s }, f1St]}>
        <Finger x={TRAY_X[1] * u} y={TRAY_Y * u} at={T_PICK_STAMP} size={17 * u} />
      </Animated.View>

      {/* the key, solid ink now: both doors open */}
      <Animated.View style={[{ position: "absolute", left: 14 * u, right: 14 * u, top: 79 * u, height: 13 * u, backgroundColor: P.ink, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 * u }, key]}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontFamily: PF.monoSemi, fontSize: 4.2 * u, letterSpacing: 0.4 * u, color: "#FFFFFF" }}>
          {t("cp.travel")}
        </Text>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: s, height: s }, f2St]}>
        <Finger x={50 * u} y={85.5 * u} at={T_SEND} size={17 * u} />
      </Animated.View>
    </View>
  );
});

/* ════════════════════════════════════════════════════════════════════════
   3 · FLIGHT — she leaves at once, and the letter lands on strangers'
   desks, one hop each
   ════════════════════════════════════════════════════════════════════════ */

const HOP_T0 = 200;
const HOP_MS = 2250;
const DESK_X = [36, 60, 84]; // the strangers' desks, centres in u
const YOU_X = 12;
const DESK_Y = 78;
const DIP_Y = 56; // where her path comes down over a desk
const APEX = 26; // how high each hop climbs above the dip

const Flight = memo(function Flight({ s }: { s: number }) {
  useLang();
  const u = s / 100;
  const p = useOnce(HOP_MS, HOP_T0, E_LIN);
  const bird = useAnimatedStyle(() => {
    const k = 3 * Math.PI * p.value;
    const sn = Math.sin(k);
    const x = (YOU_X + (DESK_X[2] - YOU_X) * p.value) * u;
    const y = (DIP_Y - APEX * Math.abs(sn)) * u;
    // nose up out of each dip, level at the top, down into the next
    const tilt = -12 * Math.cos(k) * (sn >= 0 ? 1 : -1);
    return { transform: [{ translateX: x - 13 * u }, { translateY: y - 17 * u }, { rotate: `${tilt}deg` }] };
  });
  const c = DIP_Y - 2 * APEX; // a quadratic's control point for a hop of height APEX
  const path = `M${YOU_X} ${DIP_Y} Q${(YOU_X + DESK_X[0]) / 2} ${c} ${DESK_X[0]} ${DIP_Y} Q${(DESK_X[0] + DESK_X[1]) / 2} ${c} ${DESK_X[1]} ${DIP_Y} Q${(DESK_X[1] + DESK_X[2]) / 2} ${c} ${DESK_X[2]} ${DIP_Y}`;
  return (
    <View style={{ width: s, height: s }}>
      <Svg width={s} height={s} viewBox="0 0 100 100" style={{ position: "absolute", left: 0, top: 0 }}>
        <Path d={path} fill="none" stroke={P.pen} strokeOpacity={0.45} strokeWidth={0.9} strokeDasharray="0.1 2.6" strokeLinecap="round" />
      </Svg>
      <DeskTile u={u} cx={YOU_X} seed="guide-you" you />
      {DESK_X.map((x, i) => (
        <DeskTile key={x} u={u} cx={x} seed={`guide-desk-${i}`} dropAt={HOP_T0 + (HOP_MS * (i + 1)) / 3 - 60} tilt={[-6, 5, -3][i]} />
      ))}
      <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, bird]}>
        <WrenBird size={26 * u} pose="fly" mood="happy" />
      </Animated.View>
    </View>
  );
});

function DeskTile({ u, cx, seed, you = false, dropAt, tilt = 0 }: { u: number; cx: number; seed: string; you?: boolean; dropAt?: number; tilt?: number }) {
  const T = 17 * u;
  const has = dropAt != null;
  const drop = useOnce(320, dropAt ?? 0, E_BACK);
  const env = useAnimatedStyle(() => ({
    opacity: has ? Math.min(1, drop.value * 2) : 0,
    transform: [{ translateY: (1 - drop.value) * -8 * u }, { rotate: `${tilt}deg` }],
  }));
  const lit = useAnimatedStyle(() => ({ opacity: has ? Math.min(1, drop.value) : 0 }));
  const radius = 2.6 * u;
  return (
    <View style={{ position: "absolute", left: cx * u - T / 2, top: DESK_Y * u - T / 2, width: T, height: T }}>
      <View style={{ position: "absolute", left: 0, top: 0, width: T, height: T, borderRadius: radius, backgroundColor: "#FFFFFF", borderWidth: you ? 2 : 1.5, borderColor: you ? P.pen : P.ink12 }} />
      <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: T, height: T, borderRadius: radius, borderWidth: 2, borderColor: P.pen }, lit]} />
      <View style={{ position: "absolute", left: 0, top: 0, width: T, height: T, alignItems: "center", justifyContent: "center" }}>
        {/* the reel's fixed ink: the tile is white in every theme (kit) */}
        <MosaicId seed={seed} cell={2 * u} gap={0.55 * u} develop={you ? 1 : 0.3} color={FACE_INK} />
      </View>
      {has && (
        <Animated.View style={[{ position: "absolute", left: (T - 13 * u) / 2, top: -7.5 * u }, env]}>
          <EnvelopeArt w={13 * u} sealed />
        </Animated.View>
      )}
      {you && (
        <Text numberOfLines={1} style={{ position: "absolute", left: -T * 0.3, width: T * 1.6, top: T + 1.6 * u, textAlign: "center", fontFamily: PF.monoSemi, fontSize: 3.4 * u, letterSpacing: 0.3 * u, color: P.pen }}>
          {t("ui.you")}
        </Text>
      )}
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   4 · DESK — fifteen letters land; read, each goes quiet; the counter
   runs down and its shutter comes down till morning
   ════════════════════════════════════════════════════════════════════════ */

const DAY = 15;
const READ_T0 = 1000;
const READ_EVERY = 105;
const SHUT_T = READ_T0 + (DAY - 1) * READ_EVERY + 80;

const Desk = memo(function Desk({ s }: { s: number }) {
  useLang();
  const u = s / 100;
  const PW = 90 * u;
  const PH = 62 * u;
  const inner = PW - 4; // inside the 2pt rule
  const EWd = 14.4 * u;
  const EHd = EWd * 0.72;
  const GX = 2 * u;
  const GY = 3.5 * u;
  const left0 = (inner - (5 * EWd + 4 * GX)) / 2;
  return (
    <View style={{ width: s, height: s }}>
      <View style={{ position: "absolute", left: 5 * u, top: 15 * u, width: PW, height: PH, backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: P.ink, overflow: "hidden" }}>
        <LeftLabel u={u} />
        <View style={{ position: "absolute", left: 0, right: 0, top: 15 * u, height: 1, backgroundColor: P.ink12 }} />
        {Array.from({ length: DAY }, (_, i) => (
          <DeskEnv key={i} u={u} i={i} w={EWd} x={left0 + (i % 5) * (EWd + GX)} y={19 * u + Math.floor(i / 5) * (EHd + GY)} />
        ))}
        <Shutter u={u} w={inner} h={PH - 4} />
      </View>
      <DeskWren u={u} at={SHUT_T - 80} />
    </View>
  );
});

/** the counter's shutter — slides down once the last letter is read; with less motion it cuts in at that moment */
function Shutter({ u, w, h }: { u: number; w: number; h: number }) {
  const still = useReducedMotion();
  const due = useAfter(SHUT_T);
  const shut = useOnce(420, SHUT_T, E_OUT);
  const shutSt = useAnimatedStyle(() => ({ transform: [{ translateY: -(1 - shut.value) * h }] }));
  if (still && !due) return null;
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: w, height: h, backgroundColor: P.ink, alignItems: "center", justifyContent: "center" }, shutSt]}>
      {Array.from({ length: 10 }, (_, k) => (
        <View key={k} style={{ position: "absolute", left: 0, right: 0, top: (k + 1) * 6 * u, height: 1, backgroundColor: "rgba(255,255,255,0.10)" }} />
      ))}
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ paddingHorizontal: 5 * u, fontFamily: PF.monoSemi, fontSize: 5 * u, letterSpacing: 0.3 * u, color: "#FFFFFF" }}>
        {t("ga.closed")}
      </Text>
      <View style={{ position: "absolute", bottom: 2.5 * u, left: w / 2 - 7 * u, width: 14 * u, height: 1.4 * u, borderRadius: 0.7 * u, backgroundColor: "rgba(255,255,255,0.35)" }} />
    </Animated.View>
  );
}

/** "15 LEFT TODAY", counting down as they're read */
function LeftLabel({ u }: { u: number }) {
  const n = useCount(DAY, 0, READ_EVERY, READ_T0);
  return (
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ position: "absolute", left: 5 * u, right: 5 * u, top: 4.2 * u, fontFamily: PF.monoSemi, fontSize: 6 * u, letterSpacing: 0.25 * u, color: P.ink }}>
      {t("ga.left", { n })}
    </Text>
  );
}

function DeskEnv({ u, i, w, x, y }: { u: number; i: number; w: number; x: number; y: number }) {
  const come = useOnce(300, 80 + i * 40, E_BACK);
  const read = useOnce(200, READ_T0 + i * READ_EVERY, E_OUT);
  const st = useAnimatedStyle(() => ({
    opacity: Math.min(1, come.value * 1.5),
    transform: [{ translateY: (1 - come.value) * -5 * u }, { scale: 1 - 0.08 * read.value }],
  }));
  const sealedSt = useAnimatedStyle(() => ({ opacity: 1 - read.value }));
  const openSt = useAnimatedStyle(() => ({ opacity: 0.32 * read.value }));
  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y, width: w, height: w * 0.72 }, st]}>
      <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, openSt]}>
        <EnvelopeArt w={w} sealed={false} />
      </Animated.View>
      <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, sealedSt]}>
        <EnvelopeArt w={w} sealed />
      </Animated.View>
    </Animated.View>
  );
}

/** the courier by the counter — sleepy once it's shut */
function DeskWren({ u, at }: { u: number; at: number }) {
  const shut = useAfter(at);
  const come = useOnce(380, 250, E_BACK);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, come.value * 1.5), transform: [{ translateY: (1 - come.value) * 5 * u }] }));
  return (
    <Animated.View style={[{ position: "absolute", left: 70 * u, top: 72 * u }, st]}>
      <WrenBird size={24 * u} mood={shut ? "sleepy" : "content"} />
    </Animated.View>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   5 · THE TITLE
   ════════════════════════════════════════════════════════════════════════ */

const Title = memo(function Title({ s }: { s: number }) {
  useLang();
  const u = s / 100;
  const title = t("gd.letters.title").trim();
  const words = /\s/.test(title) ? title.split(/\s+/) : [title];
  const accent = words.length > 1 ? [words.length - 1] : [];
  const come = useOnce(520, 650, E_OUT);
  const bob = useLoop(900, 1200);
  const st = useAnimatedStyle(() => ({
    opacity: come.value,
    transform: [{ translateX: (1 - come.value) * -18 * u }, { translateY: (1 - come.value) * 6 * u - bob.value * 2 * u }],
  }));
  return (
    <View style={{ width: s, height: s }}>
      <BigType s={s} words={words} accent={accent} />
      <Animated.View style={[{ position: "absolute", left: 70 * u, top: 72 * u }, st]}>
        <WrenBird size={22 * u} pose="fly" mood="happy" />
      </Animated.View>
    </View>
  );
});

export const reel: Reel = {
  bg: P.penWash,
  scenes: [
    { key: "open", ms: 3900, render: (s) => <Open s={s} /> },
    { key: "stamp", ms: 3000, render: (s) => <StampScene s={s} /> },
    { key: "flight", ms: 3100, render: (s) => <Flight s={s} /> },
    { key: "desk", ms: 3800, render: (s) => <Desk s={s} /> },
    { key: "title", ms: 2600, render: (s) => <Title s={s} /> },
  ],
};
