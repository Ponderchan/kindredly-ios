import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { PF } from "../theme/post";
import { WrenBird } from "./WrenBird";

/* THE LAUNCH — the owner's composition (export 2/launch-animation-src),
   one continuous piece: a line of handwriting draws itself and gathers
   into a speckled egg; the egg rocks and cracks with warm light inside;
   the wren pops out, takes a sealed letter, and flies off; the wordmark
   lands. Authored at 540×960 over ten seconds as a loop; here it plays
   once, faster, on the same lavender the native splash shows, and holds
   on the wordmark until the session is known. A tap skips.

   Every value is a function of T, the authored second — the same numbers
   as the sheet, so the sheet stays the source of truth for the motion. */

const W = 540;
const H = 960;
/** authored seconds per real second — 10 s authored plays in ~4.5 s */
const SPEED = 2.2;

const C = {
  bg: "#ECECFE",
  ink: "#1E1B35",
  indigo: "#3A34D6",
  indigoD: "#2A2499",
  shellA: "#FBF9FF",
  shellB: "#E4E1F6",
  shellEdge: "#CFCBEE",
  warm: "#FFE7BE",
  amber: "#D8A63F",
  green: "#6DAE78",
  greenD: "#4F8C5C",
  cream: "#FFF3D6",
  coral: "#F2887E",
  mute: "#55506E",
};

/* the sheet's cues: each scene's authored start */
const CUES = { Ink: 0, Egg: 1.5, Crack: 3.2, Hatch: 4.5, Flight: 6.2, Mark: 7.7 };
const TOTAL = 10;
/** where the piece rests while the app is still waking — before the loop's wash */
const HOLD_AT = TOTAL - 0.75;
/** the wordmark and tagline are in by here — the earliest we leave */
const CAN_LEAVE = CUES.Mark + 2.1;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
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

/* ── the egg, drawn once, reused at every stage ── */
function Egg({ x, y, s, rot, crack, glow, open }: { x: number; y: number; s: number; rot: number; crack: number; glow: number; open: number }) {
  const lit = clamp(glow, 0, 1);
  return (
    <G transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <Ellipse cx={0} cy={104} rx={64 - lit * 6} ry={9} fill={C.ink} opacity={0.12 + lit * 0.05} />
      {lit > 0.01 && (
        <G opacity={lit}>
          <Circle cx={0} cy={8} r={150} fill="url(#kdGlow)" />
        </G>
      )}
      <G opacity={1 - open}>
        <Path d="M0 -104C46 -104 76 -46 76 4C76 60 42 100 0 100C-42 100 -76 60 -76 4C-76 -46 -46 -104 0 -104Z" fill="url(#kdShell)" stroke={C.shellEdge} strokeWidth={2.4} />
        <Circle cx={-30} cy={-44} r={4.6} fill={C.shellEdge} opacity={0.85} />
        <Circle cx={26} cy={-20} r={3.4} fill={C.shellEdge} opacity={0.7} />
        <Circle cx={-14} cy={30} r={3} fill={C.shellEdge} opacity={0.6} />
        <Circle cx={38} cy={44} r={4} fill={C.shellEdge} opacity={0.55} />
        <Circle cx={-44} cy={6} r={2.6} fill={C.shellEdge} opacity={0.5} />
        <G opacity={clamp(crack * 3, 0, 1)}>
          <Path d="M-58 -6 L-30 2 L-12 -18 L8 -4 L28 -26 L46 -12 L62 -22" fill="none" stroke={C.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[200]} strokeDashoffset={200 - crack * 200} />
          <Path d="M-12 -18 L-16 -52" fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" strokeDasharray={[40]} strokeDashoffset={40 - clamp(crack * 1.6 - 0.5, 0, 1) * 40} />
          <Path d="M28 -26 L34 -58" fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" strokeDasharray={[40]} strokeDashoffset={40 - clamp(crack * 1.6 - 0.7, 0, 1) * 40} />
        </G>
      </G>
      {open > 0.01 && (
        <G>
          <G transform={`translate(${-open * 40} ${open * 34}) rotate(${-open * 34})`} opacity={1 - open * 0.15}>
            <Path d="M-76 4C-76 -46 -46 -104 0 -104C20 -104 36 -92 50 -70L20 -60L-6 -22L-40 -14L-58 -6L-76 4Z" fill="url(#kdShell)" stroke={C.shellEdge} strokeWidth={2.4} />
          </G>
          <G transform={`translate(${open * 34} ${open * 44}) rotate(${open * 26})`}>
            <Path d="M-76 4C-76 34 -60 76 -22 94C20 112 76 72 76 4C76 -14 72 -34 64 -50L40 -24L8 -4L-24 -14L-58 -6Z" fill="url(#kdShellB)" stroke={C.shellEdge} strokeWidth={2.4} />
          </G>
        </G>
      )}
    </G>
  );
}

/* the bird is the product's own — WrenBird, always in Sky, the classic
   blue: the launch runs before anything about the reader has loaded, and a
   bird that might change colour mid-hatch is worse than one that is
   simply hers-to-be. Drawn as a view over the SVG so the family art
   renders as it does everywhere else; the sheet's position, scale and
   tilt still drive it. */

export function LaunchAnimation({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const { width: sw, height: sh } = useWindowDimensions();
  const [T, setT] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const skip = useRef(false);
  const leaving = useRef(false);
  const readyRef = useRef(ready);
  readyRef.current = ready;

  /* the clock: authored seconds, at SPEED; rests at HOLD_AT until the app is ready */
  useEffect(() => {
    let raf = 0;
    const t0 = Date.now();
    const tick = () => {
      const t = ((Date.now() - t0) / 1000) * SPEED;
      const held = readyRef.current ? t : Math.min(t, HOLD_AT);
      setT(held);
      if (!leaving.current && readyRef.current && (t >= CAN_LEAVE || (skip.current && t >= CUES.Hatch))) {
        leaving.current = true;
        Animated.timing(fade, { toValue: 0, duration: 360, useNativeDriver: true }).start(() => onDone());
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fade, onDone]);

  /* ── the sheet's numbers ── */
  const strokeLen = 520;
  const inkDraw = draw(0, 1, 0.25, CUES.Egg - 0.15)(T);
  const inkGather = draw(0, 1, CUES.Egg - 0.3, CUES.Egg + 0.55)(T);
  const inkFade = 1 - clamp(inkGather * 1.4, 0, 1);

  const eggRise = pop(0, 1, CUES.Egg + 0.1, CUES.Egg + 0.95)(T);
  const breathe = Math.sin((T - CUES.Egg) * 2.6) * (T > CUES.Egg ? 1 : 0);
  const wobble = draw(0, 1, CUES.Crack - 0.5, CUES.Crack + 0.5)(T);
  const crack = draw(0, 1, CUES.Crack + 0.08, CUES.Hatch - 0.1)(T);
  const glow = enter(0, 1, CUES.Crack + 0.2, CUES.Hatch + 0.3)(T) * (1 - clamp(draw(0, 1, CUES.Flight - 0.3, CUES.Flight + 0.5)(T), 0, 1));
  const open = enter(0, 1, CUES.Hatch, CUES.Hatch + 0.7)(T);
  const shellDrop = enter(0, 1, CUES.Flight + 0.1, CUES.Flight + 0.9)(T);

  const eggS = 1.24 * eggRise * (1 + breathe * 0.012 * (1 - open));
  const eggRot = Math.sin((T - CUES.Crack + 0.5) * 16) * 4 * wobble * (1 - open);
  const eggY = 486 + (1 - eggRise) * 60 + shellDrop * 180;

  const popV = pop(0, 1, CUES.Hatch + 0.12, CUES.Hatch + 0.85)(T);
  const grab = enter(0, 1, CUES.Hatch + 0.8, CUES.Flight - 0.05)(T);
  const fly = draw(0, 1, CUES.Flight, CUES.Mark + 0.35)(T);

  const birdX = 270 + fly * 210 + Math.sin(fly * Math.PI * 2) * 26;
  const birdY = 430 - popV * 52 - fly * 470;
  const birdS = 0.3 + popV * 0.62 - fly * 0.4;
  const birdRot = -6 - fly * 22 + Math.sin(fly * 9) * 4;
  const wing = (T - CUES.Hatch) * (1.4 + fly * 5.2);

  const markIn = enter(0, 1, CUES.Mark + 0.1, CUES.Mark + 0.95)(T);
  const lineIn = enter(0, 1, CUES.Mark + 0.45, CUES.Mark + 1.25)(T);
  const tagIn = enter(0, 1, CUES.Mark + 0.7, CUES.Mark + 1.5)(T);

  const dust: React.ReactNode[] = [];
  for (let i = 0; i < 9; i++) {
    const at = 0.06 + i * 0.09;
    const a = clamp((fly - at) * 4, 0, 1) * clamp(1 - (fly - at) * 1.7, 0, 1);
    if (a > 0.01) {
      dust.push(<Circle key={i} cx={270 + at * 210 + Math.sin(at * Math.PI * 2) * 26 + ((i % 3) - 1) * 16} cy={430 - 52 - at * 470 + (i % 2) * 14} r={2 + (i % 3)} fill={i % 3 === 0 ? C.amber : C.indigo} opacity={a * 0.55} />);
    }
  }

  /* the authored frame covers the screen (slice); the wordmark overlays
     use the same mapping so they sit where the sheet put them */
  const k = Math.max(sw / W, sh / H);
  const ox = (sw - W * k) / 2;
  const oy = (sh - H * k) / 2;
  const px = (x: number) => ox + x * k;
  const py = (y: number) => oy + y * k;
  // the sheet's bird spans ~170 authored units at full scale; the family art fills ~0.8 of its box
  const birdPx = Math.max(1, 210 * Math.max(birdS, 0.001) * k);

  return (
    <Animated.View style={{ flex: 1, backgroundColor: C.bg, opacity: fade }}>
      <Pressable onPress={() => (skip.current = true)} style={{ flex: 1 }}>
        <Svg width={sw} height={sh} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
          <Defs>
            <RadialGradient id="kdGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={C.warm} stopOpacity={0.95} />
              <Stop offset="55%" stopColor={C.warm} stopOpacity={0.28} />
              <Stop offset="100%" stopColor={C.warm} stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id="kdShell" x1="0" y1="0" x2="0.6" y2="1">
              <Stop offset="0%" stopColor={C.shellA} />
              <Stop offset="100%" stopColor={C.shellB} />
            </LinearGradient>
            <LinearGradient id="kdShellB" x1="0" y1="0" x2="0.4" y2="1">
              <Stop offset="0%" stopColor={C.shellB} />
              <Stop offset="100%" stopColor={C.shellA} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={W} height={H} fill={C.bg} />
          {/* the ground that lifts through the piece */}
          <Ellipse cx={W / 2} cy={880 + (1 - eggRise) * 40} rx={430} ry={190} fill="#E1DEF8" />
          <Ellipse cx={W / 2} cy={932} rx={520} ry={150} fill="#D9D5F4" />
          {/* the words you wrote */}
          <G opacity={inkFade}>
            <Path
              d="M118 396C150 352 176 420 208 386C240 352 250 430 286 396C322 362 336 424 372 392C400 366 416 398 432 384"
              fill="none"
              stroke={C.indigo}
              strokeWidth={5 - inkGather * 2}
              strokeLinecap="round"
              strokeDasharray={[strokeLen]}
              strokeDashoffset={strokeLen - inkDraw * strokeLen}
              transform={`translate(${inkGather * 46} ${inkGather * 52}) scale(${1 - inkGather * 0.32} ${1 - inkGather * 0.5})`}
            />
            <Circle cx={432 - inkGather * 150} cy={384 + inkGather * 70} r={5 + inkGather * 10} fill={C.indigo} opacity={clamp(inkDraw * 2 - 1, 0, 1) * (1 - inkGather * 0.4)} />
          </G>
          <Egg x={270} y={eggY} s={eggS * (1 - shellDrop * 0.12)} rot={eggRot + shellDrop * 6} crack={crack} glow={glow} open={open} />
          {dust}
          <Rect x={W / 2 - 92 * lineIn} y={466} width={Math.max(0.01, 184 * lineIn)} height={3} rx={2} fill={C.indigo} opacity={lineIn} />
        </Svg>

        {/* the bird: perched as she pops out, in flight once she has the letter
            (the family's fly pose carries it) — bobbing with the sheet's wing beat */}
        {T >= CUES.Hatch + 0.06 && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: px(birdX) - birdPx / 2,
              top: py(birdY) - birdPx / 2 + Math.sin(wing * Math.PI * 2) * 3 * k * fly,
              width: birdPx,
              height: birdPx,
              transform: [{ rotate: `${birdRot}deg` }],
            }}
          >
            <WrenBird size={birdPx} skin="sticker" stage="wren" mood={fly > 0 ? "delight" : "curious"} pose={grab > 0.5 ? "fly" : "perch"} />
          </View>
        )}

        {/* the mark — real type, placed on the sheet's grid */}
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: py(430) - 62 * k, alignItems: "center", opacity: markIn, transform: [{ scale: 0.86 + markIn * 0.14 }] }}>
          <Text style={{ fontFamily: PF.letter, fontWeight: "800", fontSize: 62 * k, lineHeight: 74 * k, letterSpacing: -2.2 * k, color: C.ink }}>Kindredly</Text>
        </View>
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: py(512) - 25 * k + (1 - tagIn) * 10 * k, alignItems: "center", opacity: tagIn }}>
          <Text style={{ fontFamily: PF.letterSerif, fontStyle: "italic", fontSize: 25 * k, lineHeight: 32 * k, color: C.mute }}>find your kindred spirits</Text>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 13 * k, letterSpacing: 3.6 * k, color: C.indigo, marginTop: 14 * k }}>SLOWLY, BY WRITING</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
