import { memo, useEffect, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, Extrapolation, ReduceMotion, interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Circle, Ellipse, Line, Path } from "react-native-svg";
import { FACE_INK, Finger, Rise, useOnce, type Reel } from "./kit";
import { WrenBird } from "../WrenBird";
import { EnvelopeArt } from "../EnvelopeArt";
import { MosaicId } from "../MosaicId";
import { AvatarImage } from "../AvatarImage";
import { P, PF } from "../../theme/post";
import { t } from "../../lib/i18n";

/* HOW A KINDRED FORMS, AS A REEL (owner, 2026-10-11: "大的清楚的动态演示").
   Five scenes, all drawn at the square's own size from the product's parts:
     1. Wren brings a reply; it drops into a pen pal row — "No. 4481", a faint
        mosaic, the blue badge — and a finger opens it.
     2. Five letters each way: the two rows of five fill turn by turn, their
        face develops with every letter of THEIRS, and at five each the brass
        "swap names?" arrives.
     3. The orbit: each letter they send flies in to you (the ink square) and
        brings them one dashed ring closer, the face developing as it comes.
     4. The two names meet and cross; the mosaic turns over into a portrait,
        and the room opens — a note, a question, a song.
     5. The letters become a room (owner, 2026-10-11: "thread 变 chat"): the
        thread's long letter cards shrink into the room's bubbles — yours in
        pen blue on the right, theirs on grey — the header's mosaic turns into
        their face and name, and quicker lines follow. No typing dots: the
        room has none.
     6. The title, in big type.
   Easing curves are module constants on purpose: Easing.out(...) makes a new
   function on every call, and a hook that lists it in its deps would restart
   on every re-render — scenes 2 and 3 re-render as their counts tick. */

const RM = ReduceMotion.System;
const CLAMP = Extrapolation.CLAMP;
const E_OUT = Easing.out(Easing.cubic);
const E_INOUT = Easing.inOut(Easing.cubic);
const E_IN = Easing.in(Easing.quad);
const E_POP = Easing.out(Easing.back(2));

const SEED = "guide-stranger"; // the same stranger the old frames drew
const PORTRAIT = "f-02-tender-thinker"; // the face they turn out to have
const EACH = 5;
const developAt = (theirs: number) => 0.15 + 0.85 * (Math.min(theirs, EACH) / EACH);
const LINE = "rgba(17,17,19,0.14)";

/* a pen pal's face as the list draws it: their mosaic on a round disc (in
   the reel's fixed ink — the disc stays white in Midnight too; see kit) */
function PalFace({ d, develop, bg = "#FFFFFF" }: { d: number; develop: number; bg?: string }) {
  const cell = d * 0.086;
  return (
    <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <MosaicId seed={SEED} cell={cell} gap={cell * 0.27} develop={develop} color={FACE_INK} />
    </View>
  );
}

/* pop in with a stable curve (safe under a parent that re-renders) */
function Appear({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  const v = useOnce(420, delay, E_POP);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, v.value * 1.4), transform: [{ scale: 0.5 + 0.5 * v.value }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

/* ── 1 · a reply arrives ───────────────────────────────────────────────── */
const TAP = 2450;
function Reply({ s }: { s: number }) {
  const fly = useOnce(1000, 80, E_INOUT);
  const drop = useOnce(520, 1120, E_IN);
  const away = useOnce(900, 1120, E_IN);
  const press = useSharedValue(0);
  useEffect(() => {
    press.value = withDelay(TAP, withSequence(withTiming(1, { duration: 120, reduceMotion: RM }), withTiming(0, { duration: 280, reduceMotion: RM })));
  }, [press]);

  const b = s * 0.34; // her
  const ew = s * 0.22; // the reply she carries
  const eh = ew * 0.72;
  const birdTop = s * 0.11;
  const envTop = birdTop + b * 0.7;
  const row = { left: s * 0.06, top: s * 0.6, w: s * 0.88, h: s * 0.25 };
  const pad = s * 0.04;
  const disc = row.h * 0.66;
  const badge = s * 0.075;
  const discCx = row.left + pad + disc / 2;
  const rowCy = row.top + row.h / 2;
  const dropX = discCx - s / 2;
  const dropY = rowCy - (envTop + eh / 2);

  const bird = useAnimatedStyle(() => ({
    transform: [{ translateX: (fly.value - 1) * s * 0.85 + away.value * s * 0.9 }, { translateY: -Math.sin(fly.value * Math.PI) * s * 0.03 - away.value * s * 0.32 }],
  }));
  const env = useAnimatedStyle(() => ({
    opacity: 1 - interpolate(drop.value, [0.7, 1], [0, 1], CLAMP),
    transform: [
      { translateX: (fly.value - 1) * s * 0.85 + drop.value * dropX },
      { translateY: -Math.sin(fly.value * Math.PI) * s * 0.03 + drop.value * dropY },
      { scale: 1 - 0.6 * drop.value },
      { rotate: `${-8 * (1 - fly.value) + 10 * drop.value}deg` },
    ],
  }));
  const shade = useAnimatedStyle(() => ({ opacity: press.value * 0.07 }));

  return (
    <View style={{ width: s, height: s }}>
      {/* the pen pal row it lands in, as the Kindreds list draws one */}
      <View style={{ position: "absolute", left: row.left, top: row.top, width: row.w, height: row.h }}>
        <Rise delay={1150} dy={s * 0.05}>
          <View style={{ width: row.w, height: row.h, borderRadius: s * 0.045, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", paddingHorizontal: pad, gap: pad, overflow: "hidden" }}>
            <PalFace d={disc} develop={developAt(1)} bg="#F1F0F8" />
            <View style={{ flex: 1, minWidth: 0, gap: s * 0.022 }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontFamily: PF.monoSemi, fontSize: s * 0.04, letterSpacing: 0.4, color: P.ink }}>
                {t("ga.stranger")}
              </Text>
              {/* their first lines, wordless */}
              <View style={{ width: "92%", height: s * 0.02, borderRadius: s * 0.01, backgroundColor: "#E6E4F2" }} />
              <View style={{ width: "62%", height: s * 0.02, borderRadius: s * 0.01, backgroundColor: "#E6E4F2" }} />
            </View>
            {/* one letter owed: it's on you */}
            <Appear delay={1650}>
              <View style={{ width: badge, height: badge, borderRadius: badge / 2, backgroundColor: P.pen, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: s * 0.042, fontWeight: "700", color: "#FFFFFF" }}>1</Text>
              </View>
            </Appear>
            <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: P.ink }, shade]} />
          </View>
        </Rise>
      </View>

      <Animated.View style={[{ position: "absolute", left: s / 2 - ew / 2, top: envTop }, env]}>
        <EnvelopeArt w={ew} sealed />
      </Animated.View>
      <Animated.View style={[{ position: "absolute", left: s / 2 - b / 2, top: birdTop }, bird]}>
        <WrenBird size={b} pose="fly" mood="happy" letter={false} />
      </Animated.View>

      <Finger x={row.left + row.w * 0.56} y={rowCy + s * 0.01} at={TAP} size={s * 0.15} />
    </View>
  );
}

/* ── 2 · five letters each way ─────────────────────────────────────────── */
function Cell({ on, c, color }: { on: boolean; c: number; color: string }) {
  const v = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    v.value = withTiming(on ? 1 : 0, { duration: 320, easing: E_POP, reduceMotion: RM });
  }, [on, v]);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, v.value * 1.5), transform: [{ scale: 0.3 + 0.7 * v.value }] }));
  return (
    <View style={{ width: c, height: c, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: LINE }}>
      <Animated.View style={[{ position: "absolute", left: -1.5, top: -1.5, width: c, height: c, backgroundColor: color }, st]} />
    </View>
  );
}

function EachWay({ s }: { s: number }) {
  // letters so far, turn by turn: yours went first, so one each is already in
  const [n, setN] = useState(2);
  useEffect(() => {
    const ids = Array.from({ length: 8 }, (_, i) => setTimeout(() => setN(3 + i), 420 + i * 250));
    return () => ids.forEach(clearTimeout);
  }, []);
  const mine = Math.ceil(n / 2);
  const theirs = Math.floor(n / 2);
  const done = mine >= EACH && theirs >= EACH;

  const d = s * 0.38;
  const c = s * 0.082;
  const g = s * 0.022;
  const lw = s * 0.16;
  const rowW = lw + s * 0.03 + 5 * c + 4 * g;
  const row = (label: ReactNode, count: number, color: string) => (
    <View style={{ width: rowW, flexDirection: "row", alignItems: "center", gap: s * 0.03 }}>
      <View style={{ width: lw, alignItems: "center" }}>{label}</View>
      <View style={{ flexDirection: "row", gap: g }}>
        {Array.from({ length: EACH }, (_, i) => (
          <Cell key={i} on={i < count} c={c} color={color} />
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ width: s, height: s, alignItems: "center" }}>
      <View style={{ marginTop: s * 0.09 }}>
        <PalFace d={d} develop={developAt(theirs)} />
      </View>
      <View style={{ marginTop: s * 0.07, gap: s * 0.03 }}>
        {row(<PalFace d={c} develop={developAt(theirs)} />, theirs, P.pen)}
        {row(
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontFamily: PF.monoSemi, fontSize: s * 0.042, letterSpacing: 1, color: P.ink }}>
            {t("ui.you")}
          </Text>,
          mine,
          P.ink,
        )}
      </View>
      <View style={{ marginTop: s * 0.05, height: s * 0.085, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: s * 0.03, paddingHorizontal: s * 0.06 }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: s * 0.04, letterSpacing: 1, color: P.ink60 }}>{t("mk.ofFive", { n: Math.min(mine, theirs) })}</Text>
        {done && (
          <Appear>
            <View style={{ borderWidth: 1.5, borderColor: P.brassSeal, borderRadius: 999, paddingHorizontal: s * 0.035, paddingVertical: s * 0.014, backgroundColor: "#FFFFFF", maxWidth: s * 0.6 }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontFamily: PF.monoSemi, fontSize: s * 0.04, letterSpacing: 0.8, color: P.brassSeal }}>
                {t("state.swapNames")}
              </Text>
            </View>
          </Appear>
        )}
      </View>
    </View>
  );
}

/* ── 3 · the orbit: every letter of theirs, one ring closer ────────────── */
const SQUASH = 0.78;
const A0 = -2.55; // where they start: up and to the left, out past every ring
const STEP_A = 0.3; // how far round they drift with each step in
function Pip({ x, y, cx, cy, w }: { x: number; y: number; cx: number; cy: number; w: number }) {
  const v = useOnce(380, 0, E_IN);
  const st = useAnimatedStyle(() => ({
    opacity: 1 - interpolate(v.value, [0.75, 1], [0, 1], CLAMP),
    transform: [{ translateX: (cx - x) * v.value }, { translateY: (cy - y) * v.value }, { scale: 1 - 0.45 * v.value }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: x - w / 2, top: y - (w * 0.72) / 2 }, st]}>
      <EnvelopeArt w={w} sealed />
    </Animated.View>
  );
}

function Orbit({ s }: { s: number }) {
  const cx = s / 2;
  const cy = s * 0.56;
  const RX_MAX = s * 0.43;
  const RX_MIN = s * 0.14;
  const ring = (p: number) => RX_MIN + (RX_MAX - RX_MIN) * ((EACH - p) / (EACH - 1)); // p 1 = outermost, 5 = innermost
  const RXS = [RX_MAX + s * 0.07, ring(1), ring(2), ring(3), ring(4), ring(5)]; // [0] = the void outside
  const at = (k: number) => ({ x: cx + RXS[k] * Math.cos(A0 + k * STEP_A), y: cy + RXS[k] * SQUASH * Math.sin(A0 + k * STEP_A) });

  const [k, setK] = useState(0); // letters they've sent
  useEffect(() => {
    const ids = Array.from({ length: EACH }, (_, i) => setTimeout(() => setK(i + 1), 380 + i * 430));
    return () => ids.forEach(clearTimeout);
  }, []);
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(160, withTiming(k, { duration: 380, easing: E_OUT, reduceMotion: RM }));
  }, [k, v]);

  const f = s * 0.12;
  const face = useAnimatedStyle(() => {
    const rx = interpolate(v.value, [0, 1, 2, 3, 4, 5], RXS, CLAMP);
    const a = A0 + v.value * STEP_A;
    return { transform: [{ translateX: cx + rx * Math.cos(a) - f / 2 }, { translateY: cy + rx * SQUASH * Math.sin(a) - f / 2 }] };
  });
  const from = k > 0 ? at(k - 1) : null;
  const you = s * 0.055;

  return (
    <View style={{ width: s, height: s }}>
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ position: "absolute", left: 0, top: 0 }}>
        {[1, 2, 3, 4, 5].map((p) => (
          <Ellipse key={p} cx={cx} cy={cy} rx={ring(p)} ry={ring(p) * SQUASH} stroke={P.ink} strokeOpacity={0.2 + (p - 1) * 0.07} strokeWidth={1.3} strokeDasharray={`${s * 0.012} ${s * 0.018}`} fill="none" />
        ))}
        {/* the ring they've just stepped onto */}
        {k > 0 && <Ellipse cx={cx} cy={cy} rx={ring(k)} ry={ring(k) * SQUASH} stroke={P.pen} strokeOpacity={0.6} strokeWidth={2} fill="none" />}
      </Svg>

      {/* you — the fixed point */}
      <View style={{ position: "absolute", left: cx - you / 2, top: cy - you / 2, width: you, height: you, backgroundColor: P.ink }} />
      <Text numberOfLines={1} style={{ position: "absolute", left: cx - s * 0.15, width: s * 0.3, top: cy + you * 0.75, textAlign: "center", fontFamily: PF.monoSemi, fontSize: s * 0.032, letterSpacing: 1, color: P.ink60 }}>
        {t("ui.you")}
      </Text>

      {/* each letter they send flies in to you… */}
      {from && <Pip key={k} x={from.x} y={from.y} cx={cx} cy={cy} w={s * 0.09} />}

      {/* …and brings them a ring closer, a little more of their face showing.
          On the orbit a pen pal is a square — the outlined square the
          Kindreds chips use as their mark; the round face comes with names */}
      <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, face]}>
        <View style={{ width: f, height: f, borderRadius: f * 0.22, borderWidth: 1.5, borderColor: P.pen, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
          <MosaicId seed={SEED} cell={f * 0.095} gap={f * 0.026} develop={developAt(k)} color={FACE_INK} />
        </View>
      </Animated.View>
    </View>
  );
}

/* ── 4 · names cross; the room opens ───────────────────────────────────── */
function RoomIcon({ kind, size, color }: { kind: "note" | "ask" | "song"; size: number; color: string }) {
  // LeaveATrace's own line icons, drawn at this size
  const c = { stroke: color, strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      {kind === "note" && (
        <>
          <Path d="M4 2.5h7l3 3v10H4z" {...c} />
          <Path d="M11 2.5v3h3" {...c} />
          <Line x1={6.5} y1={9} x2={11.5} y2={9} {...c} />
          <Line x1={6.5} y1={12} x2={10} y2={12} {...c} />
        </>
      )}
      {kind === "ask" && (
        <>
          <Path d="M3 3.5h12v8H8.5L5.5 14v-2.5H3z" {...c} />
          <Path d="M7.6 6.6a1.5 1.5 0 1 1 2.1 1.4c-.5.3-.7.6-.7 1.1" {...c} />
          <Circle cx={9} cy={10.6} r={0.5} fill={color} />
        </>
      )}
      {kind === "song" && (
        <>
          <Path d="M7 13.5V4.5l7-1.5v9" {...c} />
          <Circle cx={5} cy={13.5} r={2} {...c} />
          <Circle cx={12} cy={12} r={2} {...c} />
        </>
      )}
    </Svg>
  );
}

function Names({ s }: { s: number }) {
  const come = useOnce(700, 150, E_OUT);
  const cross = useOnce(700, 1000, E_INOUT);
  const flip = useOnce(520, 1750, E_INOUT);

  const d = s * 0.34;
  const tw = s * 0.3;
  const th = s * 0.085;
  const tagTop = s * 0.475;
  const meetA = s / 2 - tw - s * 0.015;
  const meetB = s / 2 + s * 0.015;
  const arc = s * 0.075;

  const tagA = useAnimatedStyle(() => ({
    transform: [{ translateX: -tw - s * 0.05 + (meetA + tw + s * 0.05) * come.value + (meetB - meetA) * cross.value }, { translateY: -Math.sin(cross.value * Math.PI) * arc }],
  }));
  const tagB = useAnimatedStyle(() => ({
    transform: [{ translateX: s + s * 0.05 + (meetB - s - s * 0.05) * come.value + (meetA - meetB) * cross.value }, { translateY: Math.sin(cross.value * Math.PI) * arc }],
  }));
  const mosaicSide = useAnimatedStyle(() => ({ opacity: flip.value < 0.5 ? 1 : 0, transform: [{ scaleX: interpolate(flip.value, [0, 0.5], [1, 0], CLAMP) }] }));
  const portraitSide = useAnimatedStyle(() => ({ opacity: flip.value >= 0.5 ? 1 : 0, transform: [{ scaleX: interpolate(flip.value, [0.5, 1], [0, 1], CLAMP) }] }));

  const tag = (label: string, solid: boolean) => (
    <View style={{ width: tw, height: th, borderRadius: th / 2, borderWidth: 2, borderColor: P.pen, backgroundColor: solid ? P.pen : "#FFFFFF", alignItems: "center", justifyContent: "center", paddingHorizontal: s * 0.03 }}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontFamily: PF.monoSemi, fontSize: s * 0.045, letterSpacing: 1, color: solid ? "#FFFFFF" : P.pen }}>
        {label}
      </Text>
    </View>
  );
  const rows: { kind: "note" | "ask" | "song"; key: string }[] = [
    { kind: "note", key: "rm.note.t" },
    { kind: "ask", key: "rm.ask.t" },
    { kind: "song", key: "rm.song.t" },
  ];
  const rh = s * 0.088;

  return (
    <View style={{ width: s, height: s }}>
      {/* the face: their mosaic, then — names crossed — who they are */}
      <View style={{ position: "absolute", left: s / 2 - d / 2, top: s * 0.085, width: d, height: d }}>
        <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, mosaicSide]}>
          <PalFace d={d} develop={1} />
        </Animated.View>
        <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, portraitSide]}>
          <AvatarImage id={PORTRAIT} seed={SEED} size={d} />
        </Animated.View>
      </View>

      {/* the room that is now theirs and yours */}
      <View style={{ position: "absolute", left: s * 0.1, top: s * 0.615, width: s * 0.8 }}>
        <Rise delay={2150} dy={s * 0.03}>
          <View style={{ borderRadius: s * 0.04, backgroundColor: "#FFFFFF", overflow: "hidden" }}>
            {rows.map((r, i) => (
              <Rise key={r.kind} delay={2250 + i * 150} dy={s * 0.04}>
                <View style={{ height: rh, flexDirection: "row", alignItems: "center", gap: s * 0.035, paddingHorizontal: s * 0.045, borderTopWidth: i ? 1 : 0, borderTopColor: "#EEEDF5" }}>
                  <RoomIcon kind={r.kind} size={s * 0.062} color={P.pen} />
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ flex: 1, fontFamily: PF.letter, fontSize: s * 0.046, fontWeight: "600", color: P.ink }}>
                    {t(r.key)}
                  </Text>
                </View>
              </Rise>
            ))}
          </View>
        </Rise>
      </View>

      {/* the two names meet, and cross */}
      <Animated.View style={[{ position: "absolute", left: 0, top: tagTop }, tagA]}>{tag(t("ui.you"), true)}</Animated.View>
      <Animated.View style={[{ position: "absolute", left: 0, top: tagTop }, tagB]}>{tag(t("ga.mira"), false)}</Animated.View>
    </View>
  );
}

/* ── 5 · the letters become a room ─────────────────────────────────────── */
const MORPH_AT = 1250;
const ROOM_GREY = "#FFFFFF"; // theirs: the room draws grey on white; on the reel's wash, white reads
const ROOM_SIDES = [false, true, false, true, true, false]; // mine?
const ROOM_W = [0.46, 0.38, 0.5, 0.3, 0.42, 0.36];

function Morph({ s, i, m }: { s: number; i: number; m: SharedValue<number> }) {
  const mine = ROOM_SIDES[i];
  const pad = s * 0.07;
  const cardW = s * 0.62, cardH = s * 0.15, cardGap = s * 0.025;
  const bw = s * ROOM_W[i], bh = s * 0.082, bGap = s * 0.02;
  const top0 = s * 0.2;
  const barH = s * 0.018;
  const box = useAnimatedStyle(() => {
    const w = cardW + (bw - cardW) * m.value;
    return {
      width: w,
      height: cardH + (bh - cardH) * m.value,
      top: top0 + i * (cardH + cardGap + (bh + bGap - cardH - cardGap) * m.value),
      left: mine ? s - pad - w : pad,
      borderRadius: s * (0.02 + 0.021 * m.value),
      borderWidth: 1.5 * (1 - m.value),
      backgroundColor: interpolateColor(m.value, [0, 1], ["#FFFFFF", mine ? P.pen : ROOM_GREY]),
    };
  });
  const bar = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(m.value, [0, 1], ["rgba(17,17,19,0.12)", mine ? "rgba(255,255,255,0.6)" : "rgba(17,17,19,0.2)"]) }));
  const more = useAnimatedStyle(() => ({ height: barH * (1 - m.value), marginTop: barH * 0.8 * (1 - m.value), opacity: 1 - Math.min(1, m.value * 2) }));
  const stamp = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, m.value * 2.5) }));
  return (
    <Animated.View style={[{ position: "absolute", borderColor: LINE, justifyContent: "center", paddingHorizontal: s * 0.04 }, box]}>
      <Animated.View style={[{ height: barH, width: "70%", borderRadius: barH / 2 }, bar]} />
      <Animated.View style={[{ width: "86%", borderRadius: barH / 2 }, bar, more]} />
      <Animated.View style={[{ width: "52%", borderRadius: barH / 2 }, bar, more]} />
      <Animated.View style={[{ position: "absolute", right: s * 0.025, top: s * 0.022, width: s * 0.045, height: s * 0.055, borderRadius: 2, backgroundColor: i === 1 ? P.pen : P.brassSeal }, stamp]} />
    </Animated.View>
  );
}

function ThreadToRoom({ s }: { s: number }) {
  const m = useOnce(800, MORPH_AT, E_INOUT);
  const face = s * 0.11;
  const before = useAnimatedStyle(() => ({ opacity: 1 - m.value }));
  const after = useAnimatedStyle(() => ({ opacity: m.value }));
  const bh = s * 0.082, bGap = s * 0.02, top0 = s * 0.2, pad = s * 0.07;
  const label = (text: string, letter: boolean) => (
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={letter ? { fontFamily: PF.monoSemi, fontSize: s * 0.042, letterSpacing: 1, color: P.ink } : { fontSize: s * 0.052, fontWeight: "600", color: P.ink }}>
      {text}
    </Text>
  );
  return (
    <View style={{ width: s, height: s }}>
      {/* who: a number and a mosaic in the thread, a name and a face in the room */}
      <View style={{ position: "absolute", left: pad, top: s * 0.05, width: s - pad * 2, height: face }}>
        <Animated.View style={[{ position: "absolute", inset: 0, flexDirection: "row", alignItems: "center", gap: s * 0.03 }, before]}>
          <PalFace d={face} develop={1} />
          {label(t("ga.stranger"), true)}
        </Animated.View>
        <Animated.View style={[{ position: "absolute", inset: 0, flexDirection: "row", alignItems: "center", gap: s * 0.03 }, after]}>
          <AvatarImage id={PORTRAIT} seed={SEED} size={face} />
          {label(t("ga.mira"), false)}
        </Animated.View>
      </View>
      {/* the thread's three letters, turning into the room's first three lines */}
      {[0, 1, 2].map((i) => (
        <Morph key={i} s={s} i={i} m={m} />
      ))}
      {/* then the room's pace: lines, not letters */}
      {[3, 4, 5].map((i, k) => {
        const mine = ROOM_SIDES[i];
        const w = s * ROOM_W[i];
        return (
          <View key={i} style={{ position: "absolute", top: top0 + i * (bh + bGap), left: mine ? s - pad - w : pad }}>
            <Appear delay={MORPH_AT + 1000 + k * 380}>
              <View style={{ width: w, height: bh, borderRadius: s * 0.041, borderBottomRightRadius: mine ? s * 0.012 : s * 0.041, borderBottomLeftRadius: mine ? s * 0.041 : s * 0.012, backgroundColor: mine ? P.pen : ROOM_GREY, justifyContent: "center", paddingHorizontal: s * 0.04 }}>
                <View style={{ height: s * 0.018, width: "70%", borderRadius: s * 0.009, backgroundColor: mine ? "rgba(255,255,255,0.6)" : "rgba(17,17,19,0.2)" }} />
              </View>
            </Appear>
          </View>
        );
      })}
    </View>
  );
}

/* ── 6 · the title ─────────────────────────────────────────────────────── */
/* The kit's BigType look — words arriving one by one, the kindred in the
   pen — with the size fitted to the longest word. BigType sets 0.11·s, and
   at that size German's twenty letters of "Seelenverwandtschaft" are wider
   than the line and break mid-word. A word is reckoned at 0.6 em a letter
   (bold Latin runs ~0.5), a CJK / kana / hangul character at a full em. */
const ems = (w: string) => Array.from(w).reduce((a, ch) => a + ((ch.codePointAt(0) ?? 0) >= 0x2e80 ? 1 : 0.6), 0);
const fold = (w: string) => w.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase();

function TitleWord({ text, delay, color }: { text: string; delay: number; color: string }) {
  const v = useOnce(380, delay, E_OUT);
  const st = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.Text style={[{ color }, st]}>{text}</Animated.Text>;
}

function Title({ s }: { s: number }) {
  const title = t("gd.kindreds.title");
  const kin = t("tab.kindreds"); // only to find the word that names them; never shown
  let parts: { text: string; accent: boolean }[];
  if (title.includes(" ")) {
    const words = title.split(" ").filter(Boolean);
    const n = words.length;
    // the pen goes on the word sharing its stem with the Kindreds tab (kindred, afín, Seelenverwandtschaft, 인연이)…
    const k = fold(kin);
    const stem = (w: string) => {
      const a = fold(w);
      let i = 0;
      while (i < a.length && i < k.length && a[i] === k[i]) i++;
      return i;
    };
    let best = -1;
    let most = 1;
    words.forEach((w, i) => {
      const m = stem(w);
      if (m > most) {
        best = i;
        most = m;
      }
    });
    // …or, failing that, on the longer of the last two
    if (best < 0 && n > 1) best = words[n - 2].length > words[n - 1].length ? n - 2 : n - 1;
    parts = words.map((w, i) => ({ text: w + (i < n - 1 ? " " : ""), accent: i === best }));
  } else {
    // a line without spaces (Japanese): the kindred is a run inside it
    const at = kin ? title.indexOf(kin) : -1;
    parts = at < 0 ? [{ text: title, accent: false }] : [{ text: title.slice(0, at), accent: false }, { text: kin, accent: true }, { text: title.slice(at + kin.length), accent: false }].filter((p) => p.text);
  }
  const fs = Math.min(s * 0.11, (s * 0.82) / Math.max(1, ...title.split(/\s+/).map(ems)));
  return (
    <View style={{ width: s, height: s, justifyContent: "center", paddingHorizontal: s * 0.09 }}>
      <Text style={{ fontSize: fs, lineHeight: fs * 1.18, fontWeight: "700", letterSpacing: -0.5 }}>
        {parts.map((p, i) => (
          <TitleWord key={i} text={p.text} delay={120 + i * 170} color={p.accent ? P.pen : P.ink} />
        ))}
      </Text>
    </View>
  );
}

/* Each scene is memoised on s. The card re-renders its scene whenever the
   Wren room does — every keystroke in its composer — and the kit's Rise and
   Finger restart (delay and all) when re-rendered, since useOnce's default
   curve is a new function each call. Memoised, a scene re-renders only when
   its own count ticks, and everything under a ticking scene keeps its curve
   in a module constant. */
const ReplyScene = memo(Reply);
const EachWayScene = memo(EachWay);
const OrbitScene = memo(Orbit);
const NamesScene = memo(Names);
const RoomScene = memo(ThreadToRoom);
const TitleScene = memo(Title);

export const reel: Reel = {
  bg: P.penWash,
  scenes: [
    { key: "reply", ms: 3400, render: (s) => <ReplyScene s={s} /> },
    { key: "each-way", ms: 3200, render: (s) => <EachWayScene s={s} /> },
    { key: "orbit", ms: 3200, render: (s) => <OrbitScene s={s} /> },
    { key: "names", ms: 3400, render: (s) => <NamesScene s={s} /> },
    { key: "room", ms: 3900, render: (s) => <RoomScene s={s} /> },
    { key: "title", ms: 2600, render: (s) => <TitleScene s={s} /> },
  ],
};
