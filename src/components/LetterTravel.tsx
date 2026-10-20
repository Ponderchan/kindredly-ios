import { useEffect, useRef, useState } from "react";
import { Animated, Text, View, useWindowDimensions } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { PF, PFM } from "../theme/post";
import { WrenBird } from "./WrenBird";
import { useWrenName } from "../lib/wren-name";
import { t, useLang } from "../lib/i18n";
import { useTheme } from "../lib/theme";

/* LET IT TRAVEL — the owner's Travel Animation sheet (2026-09-19), ported
   beat for beat.
   ────────────────────────────────────────────────────────────────────────
   Four scenes, 3.7 s: the written page FOLDS itself into an envelope and a
   coral wax seal drops on; the courier swoops in and PICKS it up; the
   camera pulls back from your desk until the whole daylit planet is in
   frame — your desk becoming the YOU pin (WORLD); and she arcs across the
   globe on a dotted great-circle route, other people's letters crossing
   beside her, toward the SOMEWHERE pin on the night side (CROSS).

   Daylight in the light themes: the point is that the letter crosses the
   world. In Midnight the sky is night (see the colours below), and the
   planet keeps its day side and its night side.

   Same construction as the launch piece: the sheet's numbers, driven by
   one clock; the bird is the product's own WrenBird laid over the SVG,
   the envelope in her beak drawn beneath her.

   She flies the whole way without waiting for the network. The clock used
   to rest just after the pickup until the send had gone through, and with
   the moderation call in front of the publish that was three seconds of
   her frozen in mid-air with the letter — the owner, 2026-09-20: 太恶心了.
   Now it rests on the arrival card ("Off to the other side"), a still
   picture that is meant to be looked at, and only the fade-out waits. A
   send that fails brings the desk back with her word on it. */

const W = 393;
const H = 852;
const CUES = { Fold: 0, Pickup: 0.9, World: 1.6, Cross: 2.5 };
const TOTAL = 3.7;
/** the arrival card, before the fade: the clock rests here until the send has landed */
const HOLD_AT = TOTAL - 0.18;

/* THE ILLUSTRATION KEEPS ITS OWN COLOURS IN EVERY THEME (10a): the paper,
   the envelope, the planet with its day and its night side — a picture of
   the letter leaving.
   THE GROUND IS THE PAGE'S (owner: every page follows the theme). The room
   the page folds up in, the last frame it fades to, and the view under it
   all paint the theme's page colour, so the piece opens on the page the
   writer just left and closes on the one the courier returns them to —
   Midnight no longer flashes a lavender room on the way in and out.
   THE SKY IS THE THEME'S DAY OR NIGHT (step 7.1; the owner's rule for the
   release: what is best for the user). The light themes keep the daylight
   sky as designed, its words in fixed dark inks. Midnight gets a night sky
   — the courier cover's night (CourierCard), deepening to C.night at the
   horizon, a few faint stars where the day has clouds — because the
   daylight one turned a dark screen into a full-screen flash of pale blue
   at every send, at the hour someone chose a dark theme for. Its words take
   the theme's ink and sub (12.6:1 and 7.6:1 at the least, where they sit),
   and the stars stay smaller and dimmer than the route's dots.
   The desk is the room's furniture, so it takes the room's: on the dark
   room the day desk's pale rule and legs glowed as three bars, so Midnight
   draws them in its line and soft2 (1.44:1 and 1.29:1 on its ground;
   Classic's day desk is 1.38:1 and 1.28:1), and the paper's shadow in black
   at .35 — navy at .1 was nothing on the night ground.
   The status bar needs nothing of its own here: the sky is light exactly
   when the theme is, so the bar's text the system picks for the room is
   right for the sky too, through every frame of the fade. */
const C = {
  page: "#ECEAFA", // the room before 10a; now only the fallback ground (see `ground`)
  ink: "#1E1B35",
  pen: "#5B55FF",
  sky: "#BFE0FF",
  skyHi: "#7AC7FF",
  sea: "#7AB8E8",
  seaD: "#5B99CF",
  land: "#6DAE78",
  landD: "#2E7D4F",
  ylw: "#FFE14D",
  cream: "#FFE7BE",
  coral: "#F2887E",
  rule: "#DDD9F0",
  legs: "#E4E1F6",
  night: "#2B2650",
  // Midnight's sky: the courier cover's night (CourierCard PALETTE.night), C.night between
  nightTop: "#1E1B35",
  nightLow: "#2E2A6B",
} as const;

/* the two skies, top to bottom (the gradient's stops at 0, .46 and 1) */
const SKY = {
  day: ["#E8F4FF", C.sky, C.skyHi],
  night: [C.nightTop, C.night, C.nightLow],
} as const;

/* Midnight's stars, in the sheet's coordinates: [x, y, r, opacity]. Smaller
   and dimmer than the route's dots (r 1.6–2.4 at .72), and kept clear of
   the words (y 60–195), of the status bar, and of the band the route and
   the crossing letters fly through (30pt or more outside the arc). */
const STARS: [number, number, number, number][] = [
  [28, 214, 1.1, 0.55],
  [74, 252, 0.9, 0.4],
  [122, 206, 1.3, 0.62],
  [168, 238, 0.8, 0.36],
  [232, 214, 1, 0.5],
  [284, 248, 1.2, 0.58],
  [338, 206, 0.9, 0.42],
  [368, 270, 1.1, 0.5],
  [18, 300, 0.8, 0.38],
  [376, 352, 0.9, 0.4],
  [14, 372, 1, 0.45],
  [44, 764, 1.1, 0.5],
  [118, 812, 0.8, 0.36],
  [318, 748, 1, 0.48],
  [366, 818, 1.2, 0.56],
];

/* the seal lands with a tap. expo-haptics may be missing from an older dev
   client — it degrades to silence, never a crash */
let Haptics: typeof import("expo-haptics") | null = null;
try {
  Haptics = require("expo-haptics");
} catch {}
const tap = () => {
  try {
    void Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (t: number, a: number, b: number) => a + (b - a) * t;
const ramp = (t: number, stops: number[], vals: number[]) => {
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i]) {
      const f = (t - stops[i - 1]) / (stops[i] - stops[i - 1] || 1);
      return lerp(clamp(f, 0, 1), vals[i - 1], vals[i]);
    }
  }
  return vals[vals.length - 1];
};
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
type Ease = (t: number) => number;
const animate = (from: number, to: number, start: number, end: number, ease: Ease) => (T: number) => from + (to - from) * ease(clamp((T - start) / (end - start), 0, 1));
const enter = (from: number, to: number, start: number, end: number) => animate(from, to, start, end, easeOutCubic);
const draw = (from: number, to: number, start: number, end: number) => animate(from, to, start, end, easeInOutQuad);
const pop = (from: number, to: number, start: number, end: number) => animate(from, to, start, end, easeOutBack);

export function LetterTravel({
  ready,
  onDone,
  title,
  note,
  ground: groundProp,
}: {
  ready: boolean;
  onDone: () => void;
  title?: string;
  note?: string;
  /** the room's colour; the theme's page colour (tk.bg) by default */
  ground?: string;
}) {
  useLang();
  const { t: tk, dark } = useTheme();
  const ground = groundProp ?? tk.bg ?? C.page;
  /* Midnight's night (see C): the sky, the desk, the paper's shadow, the words */
  const sky = dark ? SKY.night : SKY.day;
  const deskTop = dark ? tk.line : C.rule;
  const deskLegs = dark ? tk.soft2 : C.legs;
  const wordInk = dark ? tk.ink : C.ink;
  const noteInk = dark ? tk.sub : "rgba(30,27,53,0.62)";
  const wren = useWrenName();
  const reduce = useReducedMotion();
  const { width: sw, height: sh } = useWindowDimensions();
  const [T, setT] = useState(0);
  const [beat, setBeat] = useState(0); // wall-clock, for the wings while the piece holds
  const fade = useRef(new Animated.Value(1)).current;
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const leaving = useRef(false);
  const tapped = useRef(false);
  /* onDone through a ref: the clock effect used to depend on it, and the
     caller passes a fresh function on every render — so the moment the
     send finished (`ready` flipped, the parent re-rendered) the clock was
     torn down and started again from the flat sheet. The owner's recording
     (2026-09-20): fold, pickup, hold… then paper again. */
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  /* the clock: authored seconds; it rests at HOLD_AT until `ready`, and the
     time spent resting is subtracted so the fade resumes without a jump */
  useEffect(() => {
    if (reduce) {
      setT(TOTAL - 0.3);
      return;
    }
    let raf = 0;
    const t0 = Date.now();
    let paused = 0; // seconds spent resting at the hold — the same unit as `wall`
    let pauseAt: number | null = null;
    const tick = () => {
      const now = Date.now();
      const wall = (now - t0) / 1000;
      setBeat(wall);
      let tt = wall - paused;
      if (tt >= HOLD_AT && !readyRef.current) {
        if (pauseAt === null) pauseAt = now;
        tt = HOLD_AT;
      } else if (pauseAt !== null) {
        /* in seconds. This was added in milliseconds against a clock in
           seconds, so the first frame after the hold landed thousands of
           seconds before the start — the flat sheet, and it stayed there.
           The old restart-on-send bug had hidden it: the clock was rebuilt
           from zero at that moment anyway, so the sum was never read. */
        paused += (now - pauseAt) / 1000;
        pauseAt = null;
        tt = wall - paused;
      }
      setT(tt);
      if (!tapped.current && tt >= CUES.Pickup - 0.12) {
        tapped.current = true;
        tap();
      }
      if (!leaving.current && tt >= TOTAL) {
        leaving.current = true;
        onDoneRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  /* motion-sensitive: the last tableau, held, then out once the letter has gone */
  useEffect(() => {
    if (!reduce || !ready) return;
    const id = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => onDoneRef.current());
    }, 900);
    return () => clearTimeout(id);
  }, [reduce, ready, fade]);

  /* ── the sheet's numbers ── */
  const fold = draw(0, 1, 0.24, CUES.Pickup - 0.1)(T);
  const seal = pop(0, 1, CUES.Pickup - 0.4, CUES.Pickup + 0.05)(T);
  const sealSquash = 1 - Math.max(0, Math.sin(clamp((T - (CUES.Pickup - 0.4)) / 0.45, 0, 1) * Math.PI)) * 0.16;

  const swoop = enter(0, 1, CUES.Pickup - 0.05, CUES.World - 0.08)(T);
  const lift = enter(0, 1, CUES.World - 0.24, CUES.World + 0.16)(T);
  const taken = clamp((lift - 0.15) / 0.85, 0, 1);

  const out = draw(0, 1, CUES.World - 0.05, CUES.Cross + 0.1)(T);
  const cross = draw(0, 1, CUES.Cross + 0.05, TOTAL - 0.5)(T);
  const markIn = enter(0, 1, TOTAL - 0.78, TOTAL - 0.3)(T);
  const outro = draw(0, 1, TOTAL - 0.16, TOTAL)(T);

  /* the globe grows in from below as we pull back */
  const gR = ramp(out, [0, 1], [86, 166]);
  const gCX = W / 2;
  const gCY = ramp(out, [0, 1], [H + 150, 530]);
  const gTop = gCY - gR;

  /* the route: a great-circle arc over the top of the globe */
  const A = -168;
  const B = -12;
  const onArc = (p: number): [number, number] => {
    const ang = (lerp(p, A, B) * Math.PI) / 180;
    const r = gR + 6 + Math.sin(p * Math.PI) * 62;
    return [gCX + Math.cos(ang) * r, gCY + Math.sin(ang) * r];
  };
  const home = onArc(0);
  const away = onArc(1);

  const deskX = W / 2;
  const deskY = 452;

  /* the bird: desk pickup → up → along the arc. As the world pulls into
     view the desk becomes a point on it — home — and she is carried there
     with it, so the arc starts under her. She used to be left above the
     desk and then drawn at home the frame the arc began: a 250pt jump,
     between the owner's 12th and 13th frames. */
  const [ax, ay] = onArc(cross);
  const flyUp = enter(0, 1, CUES.World - 0.2, CUES.Cross + 0.05)(T);
  const preX = lerp(swoop, -120, deskX - 78) + flyUp * 34;
  const preY = lerp(swoop, 700, deskY - 6) - lift * 44 - flyUp * 120;
  const birdX = cross > 0.001 ? ax : lerp(out, preX, home[0]);
  const birdY = cross > 0.001 ? ay : lerp(out, preY, home[1]);
  const birdS = (0.6 + swoop * 0.14) * (1 - out * 0.62);
  /* SHE LANDS, SHE DOESN'T SHAKE (the owner's recording, 2026-09-23).
     The wing rate used to rise with `cross` (2 → 7 a second) and was
     multiplied by the whole elapsed time, so as it rose the phase raced
     ahead — a dozen beats a second along the arc — and once she had
     arrived it sat at 7 a second for as long as the send took: the bird
     trembling on the far side of the world. Now the wings keep one steady
     beat, and over her last 0.4s of arc they ease into a slow breath.
     Her heading came from the point just ahead of her, and at the end of
     the arc there is none — atan2(0, 0) snapped her level in one frame;
     it is taken across her position now, and eases level as she lands. */
  const landing = enter(0, 1, TOTAL - 0.9, TOTAL - 0.5)(T);
  const behind = onArc(Math.max(cross - 0.02, 0));
  const ahead = onArc(Math.min(cross + 0.02, 1));
  const arcHeading = (Math.atan2(ahead[1] - behind[1], ahead[0] - behind[0]) * 180) / Math.PI;
  const heading = cross > 0.001 ? arcHeading * (1 - landing) : -8 + swoop * 6 - flyUp * 14;
  const since = beat - (CUES.Pickup - 0.05);
  const flap = Math.sin(since * 2.4 * Math.PI * 2) * 3;
  const breath = Math.sin(since * 0.8 * Math.PI * 2) * 1.2;
  const bob = swoop > 0.01 ? flap * (1 - landing) + breath * landing : 0;

  const envOnDesk = (1 - taken) * (1 - out);
  const foldW = ramp(fold, [0, 0.52, 1], [214, 210, 132]);
  const foldH = ramp(fold, [0, 0.52, 1], [268, 252, 86]);
  const sealed = fold > 0.62;

  /* other people's letters, crossing at the same time */
  const others: [number, number, number][] = [
    [-138, 0.3, 0.52],
    [-96, 0.6, 0.44],
    [-52, 0.5, 0.4],
    [152, 0.4, 0.46],
    [64, 0.3, 0.4],
  ];

  const land = (cx: number, cy: number, rx: number, ry: number, rot: number, op = 1, key: number) => (
    <Ellipse key={key} cx={gCX + cx * gR} cy={gCY + cy * gR} rx={rx * gR} ry={ry * gR} transform={`rotate(${rot} ${gCX + cx * gR} ${gCY + cy * gR})`} fill={C.land} opacity={op} />
  );

  /* the authored frame covers the screen (slice); the bird and the words
     overlay it in the same coordinates */
  const k = Math.max(sw / W, sh / H);
  const ox = (sw - W * k) / 2;
  const oy = (sh - H * k) / 2;
  const px = (x: number) => ox + x * k;
  const py = (y: number) => oy + y * k;
  const birdPx = 132 * Math.max(birdS, 0.001) * k;
  const birdOn = swoop > 0.01;

  return (
    <Animated.View style={{ flex: 1, backgroundColor: ground, opacity: fade }}>
      <Svg width={sw} height={sh} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="trvSky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sky[0]} />
            <Stop offset="0.46" stopColor={sky[1]} />
            <Stop offset="1" stopColor={sky[2]} />
          </LinearGradient>
          <LinearGradient id="trvSea" x1="0.1" y1="0" x2="0.9" y2="1">
            <Stop offset="0" stopColor={C.sea} />
            <Stop offset="1" stopColor={C.seaD} />
          </LinearGradient>
          {/* the terminator in user space: in bounding-box units the native
              side painted the whole rect at the last stop — a hard wall */}
          <LinearGradient id="trvTerm" gradientUnits="userSpaceOnUse" x1={gCX + gR * 0.34} y1={gCY} x2={gCX + gR * 1.02} y2={gCY}>
            <Stop offset="0%" stopColor={C.night} stopOpacity="0" />
            <Stop offset="100%" stopColor={C.night} stopOpacity="0.62" />
          </LinearGradient>
          <RadialGradient id="trvGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={C.ylw} stopOpacity="0.5" />
            <Stop offset="100%" stopColor={C.ylw} stopOpacity="0" />
          </RadialGradient>
          <ClipPath id="trvGlobe">
            <Circle cx={gCX} cy={gCY} r={gR} />
          </ClipPath>
        </Defs>

        {/* the room, then the sky: daylight, or Midnight's night */}
        <Rect x={0} y={0} width={W} height={H} fill={ground} />
        <Rect x={0} y={0} width={W} height={H} fill="url(#trvSky)" opacity={out} />

        {dark ? (
          /* the night's stars come in with the sky and stay — they are far
             away, so the pull-back doesn't move them — each breathing a
             little on the wall clock (still, for reduced motion) */
          <G opacity={out}>
            {STARS.map(([x, y, r, a], i) => (
              <Circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={a * (0.72 + 0.28 * Math.sin(beat * 1.6 + i * 1.7))} />
            ))}
          </G>
        ) : (
          /* a few clouds only while we are still near the ground */
          <G opacity={out * (1 - cross) * 0.8}>
            <Ellipse cx={74} cy={gTop - 96} rx={48} ry={14} fill="#fff" opacity={0.78} />
            <Ellipse cx={300} cy={gTop - 150} rx={40} ry={12} fill="#fff" opacity={0.62} />
          </G>
        )}

        {/* the desk, which sinks away as the camera pulls back */}
        <G opacity={1 - out}>
          <Rect x={0} y={588 + out * 110} width={W} height={4} rx={2} fill={deskTop} />
          <Rect x={46} y={592 + out * 110} width={10} height={150} fill={deskLegs} />
          <Rect x={337} y={592 + out * 110} width={10} height={150} fill={deskLegs} />
        </G>

        {/* ═══ the planet ═══ */}
        <G opacity={out}>
          <Circle cx={gCX} cy={gCY} r={gR + 12} fill={C.skyHi} opacity={0.3} />
          <Circle cx={gCX} cy={gCY} r={gR} fill="url(#trvSea)" />
          <G clipPath="url(#trvGlobe)">
            {land(-0.52, -0.42, 0.3, 0.17, -18, 1, 0)}
            {land(-0.2, -0.62, 0.2, 0.1, 12, 1, 1)}
            {land(0.12, -0.5, 0.26, 0.15, 8, 1, 2)}
            {land(0.56, -0.3, 0.22, 0.13, -14, 1, 3)}
            {land(-0.06, -0.18, 0.34, 0.12, 4, 0.9, 4)}
            {land(0.4, -0.66, 0.13, 0.07, 22, 1, 5)}
            {/* latitude hairlines — a globe, not a ball */}
            {[-0.62, -0.42, -0.22, -0.02].map((y, i) => (
              <Ellipse key={i} cx={gCX} cy={gCY + y * gR} rx={gR * Math.sqrt(Math.max(0.02, 1 - y * y))} ry={gR * 0.052} fill="none" stroke="#fff" strokeWidth={1} opacity={0.22} />
            ))}
            {/* the far side is in night — somewhere it is late */}
            <Rect x={gCX + gR * 0.34} y={gCY - gR} width={gR * 0.7} height={gR * 2} fill="url(#trvTerm)" />
            {[
              [0.52, -0.52],
              [0.66, -0.34],
              [0.58, -0.14],
            ].map(([x, y], i) => (
              <Circle key={i} cx={gCX + x * gR} cy={gCY + y * gR} r={2.2} fill={C.ylw} opacity={cross > 0.4 ? 0.9 : 0.5} />
            ))}
          </G>
          <Circle cx={gCX} cy={gCY} r={gR} fill="none" stroke="#fff" strokeWidth={1.6} opacity={0.5} />

          {/* the route, drawn as she flies it */}
          {Array.from({ length: 26 }, (_, i) => {
            const p = i / 25;
            if (p > cross + 0.001) return null;
            const [x, y] = onArc(p);
            return <Circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 2.4 : 1.6} fill="#fff" opacity={0.72} />;
          })}

          {/* departure pin (you) — the arrival pin comes in as she nears it */}
          <Circle cx={home[0]} cy={home[1]} r={9} fill="#fff" />
          <Circle cx={home[0]} cy={home[1]} r={4.4} fill={C.pen} />
          <G opacity={clamp((cross - 0.55) * 3, 0, 1)}>
            <Circle cx={away[0]} cy={away[1]} r={11} fill="none" stroke="#fff" strokeWidth={2.4} />
            <Circle cx={away[0]} cy={away[1]} r={4.4} fill={C.coral} />
          </G>

          {/* other people's letters crossing at the same time */}
          {others.map(([deg, at, sc], i) => {
            const a = clamp((cross - 0.1) * 2.4, 0, 1) * 0.72;
            if (a < 0.02) return null;
            const ang = (deg * Math.PI) / 180;
            const r = gR + 4 + Math.sin(at * Math.PI) * 34;
            return (
              <G key={i} opacity={a} transform={`translate(${gCX + Math.cos(ang) * r} ${gCY + Math.sin(ang) * r}) scale(${sc}) rotate(${deg + 90})`}>
                <Rect x={-11} y={-7.5} width={22} height={15} rx={1.6} fill={C.cream} stroke="#C9A93A" strokeWidth={1.4} />
                <Path d="M-11 -7.5 L0 1.5 L11 -7.5" fill="none" stroke="#C9A93A" strokeWidth={1.4} />
              </G>
            );
          })}
        </G>

        {/* the page folding into a sealed envelope, on your desk */}
        <G opacity={envOnDesk} transform={`translate(${deskX} ${deskY}) rotate(${lerp(fold, 0, -7)})`}>
          <Ellipse cx={0} cy={foldH / 2 + 16} rx={foldW / 2 - 8} ry={8} fill={dark ? "#000" : C.ink} opacity={(dark ? 0.35 : 0.1) * (1 - out)} />
          <Rect x={-foldW / 2} y={-foldH / 2} width={foldW} height={foldH} rx={3} fill={sealed ? C.ylw : "#fff"} stroke={sealed ? "#C9A93A" : C.rule} strokeWidth={2} />
          <G opacity={clamp(1 - fold * 1.15, 0, 1)}>
            {[150, 120, 164, 96, 140, 74].map((w, i) => (
              <Rect key={i} x={-foldW / 2 + 22} y={-foldH / 2 + 30 + i * 26} width={w} height={6} rx={3} fill="#B9B3E0" />
            ))}
          </G>
          <G opacity={clamp((fold - 0.3) * 2.6, 0, 1)}>
            <Path d={`M${-foldW / 2} ${-foldH / 2} L0 ${-foldH / 2 + foldH * 0.42} L${foldW / 2} ${-foldH / 2}`} fill="none" stroke={sealed ? "#C9A93A" : C.rule} strokeWidth={2.4} strokeLinejoin="round" />
          </G>
          <G transform={`translate(${foldW * 0.22} ${foldH * 0.16}) scale(${Math.max(seal * sealSquash, 0.001)})`}>
            <Circle cx={0} cy={0} r={14} fill={C.coral} />
            <Circle cx={0} cy={0} r={6.5} fill="none" stroke="#fff" strokeWidth={2} opacity={0.72} />
          </G>
        </G>
        <Circle cx={deskX + 47} cy={deskY + 14} r={Math.max(64 * seal * (1 - taken) * (1 - out), 0.001)} fill="url(#trvGlow)" opacity={(1 - taken) * (1 - out) * 0.8} />

        {/* the envelope in her beak — under the bird, in her coordinates */}
        {taken > 0.01 && (
          <G transform={`translate(${birdX} ${birdY + bob}) rotate(${heading}) scale(${Math.max(birdS, 0.001)})`}>
            <G transform={`translate(52 ${10 + taken * 8}) rotate(${-4 + taken * 10}) scale(${0.42 + taken * 0.5})`} opacity={taken}>
              <Rect x={-26} y={-17} width={52} height={34} rx={2} fill={C.ylw} />
              <Path d="M-26 -17 L0 3 L26 -17" fill="none" stroke="#C9A93A" strokeWidth={2.4} />
              <Circle cx={17} cy={10} r={6} fill={C.coral} />
            </G>
          </G>
        )}

        <Rect x={0} y={0} width={W} height={H} fill={ground} opacity={outro} />
      </Svg>

      {/* the courier: the product's own bird — her fly pose already faces right,
          the way she travels. Empty-handed: the pose ships with a letter under
          her feet, and the one she carries here is the envelope drawn at her
          beak — with both she was seen leaving with two (the owner's recording,
          2026-09-20). */}
      {birdOn && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: px(birdX) - birdPx / 2,
            top: py(birdY + bob) - birdPx / 2,
            width: birdPx,
            height: birdPx,
            opacity: 1 - outro,
            transform: [{ rotate: `${heading}deg` }],
          }}
        >
          <WrenBird size={birdPx} pose="fly" mood="delight" letter={false} />
        </View>
      )}

      {/* the words, in real type on the sheet's grid */}
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: py(84), alignItems: "center", opacity: markIn * (1 - outro), transform: [{ translateY: (1 - markIn) * 8 * k }] }}>
        <Text style={{ fontFamily: PF.letter, fontWeight: "800", fontSize: 30 * k, lineHeight: 36 * k, letterSpacing: -0.7 * k, color: wordInk, textAlign: "center", paddingHorizontal: 24 }}>{title ?? t("so.travel.title")}</Text>
        <Text style={{ ...PFM.monoSemi, fontSize: 11 * k, letterSpacing: 2.4 * k, color: noteInk, marginTop: 12 * k, textAlign: "center", paddingHorizontal: 24 }}>{(note ?? t("so.travel.sub", { name: wren })).toUpperCase()}</Text>
      </View>
    </Animated.View>
  );
}
