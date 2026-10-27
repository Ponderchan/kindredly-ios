import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Text, View, useWindowDimensions } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { KLetterTravelView, isKindredlyUIViewAvailable } from "../../modules/kindredly-ui";
import { PF, PFM } from "../theme/post";
import { WrenBird } from "./WrenBird";
import { NativeSurface, SurfaceHost } from "./NativeSurface";
import { useWrenName } from "../lib/wren-name";
import { useBirdImageRef } from "../lib/bird-images";
import { useNativeSurface } from "../lib/surfaces";
import { t, useLang } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import {
  DONE_MS,
  STILL_HOLD_MS,
  STILL_T,
  TOTAL,
  TRAVEL_H as H,
  TRAVEL_W as W,
  clamp,
  lerp,
  newTravelClock,
  restartTravelClock,
  stepTravel,
  travelArc,
  travelCardLine,
  travelFrame,
  type TravelClock,
} from "./letter-travel-model";

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
   send that fails brings the desk back with her word on it.

   TWO WAYS TO DRAW IT (2026-10-27). The clock and the sheet's numbers are
   letter-travel-model's (stepTravel, travelFrame), which LetterTravelRN
   draws every frame from. With the "lettertravel" switch on (lib/surfaces)
   and the binary carrying KLetterTravelView, SwiftUI plays the piece
   instead (KLetterTravel: a line-for-line port of the same numbers, its
   own clock, the same beats, rest, tap and Reduce Motion), in one
   full-screen Host (NativeSurface: the crash breadcrumb, a JS error back
   to React Native), with her snapshot (bird-images travelFly) for Wren.
   TS keeps the send (`ready`), the words and onDone. */

/* the sheet (393 x 852), the cues (Fold 0, Pickup 0.9, World 1.6, Cross 2.5,
   3.7 in all), the rest on the arrival card (HOLD_AT, WAIT_MS, DONE_MS) and
   the easing all live in letter-travel-model, shared with the Swift piece */

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

type LetterTravelProps = {
  ready: boolean;
  onDone: () => void;
  title?: string;
  note?: string;
  /** the room's colour; the theme's page colour (tk.bg) by default */
  ground?: string;
};

/** The send-off: the SwiftUI piece where it can be, else React Native's (see the top). */
export function LetterTravel(props: LetterTravelProps) {
  const { t: tk } = useTheme();
  const ground = props.ground ?? tk.bg ?? C.page;
  return (
    <NativeSurface
      surface="lettertravel"
      view="KLetterTravelView"
      mode="mount"
      native={() => <LetterTravelSwift {...props} ground={ground} />}
      fallback={() => <LetterTravelRN {...props} />}
      // the page's colour for the moment the phone's answers take: the piece opens on it anyway
      pending={() => <View style={{ flex: 1, backgroundColor: ground }} />}
    />
  );
}

/** While the compose page is open with the switch on: keeps her flying snapshot captured, so
    she is there from the first frame of the first send. Renders nothing. */
export function LetterTravelWarm() {
  const on = useNativeSurface("lettertravel") && isKindredlyUIViewAvailable("KLetterTravelView");
  return on ? <WarmBird /> : null;
}
function WarmBird() {
  useBirdImageRef("travelFly");
  return null;
}

/* The SwiftUI piece. It runs its own clock and says once when it is over; if it never does once
   the send has landed (the longest it can take from there is the whole flight, the card's moment
   and a slow mount), the page is uncovered anyway, and said. */
function LetterTravelSwift({ ready, onDone, title, note, ground }: LetterTravelProps & { ground: string }) {
  useLang();
  const { key: theme } = useTheme();
  const wren = useWrenName();
  const bird = useBirdImageRef("travelFly");
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const told = useRef(false);
  const finish = useCallback(() => {
    if (told.current) return;
    told.current = true;
    onDoneRef.current();
  }, []);
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => {
      if (told.current) return;
      console.warn("[letter-travel] the Swift send-off never said it was over; uncovering the page anyway");
      finish();
    }, TOTAL * 1000 + DONE_MS + 3000);
    return () => clearTimeout(id);
  }, [ready, finish]);
  return (
    <SurfaceHost style={{ backgroundColor: ground }}>
      <KLetterTravelView
        theme={theme}
        ground={ground}
        ready={ready}
        title={title ?? t("so.travel.title")}
        sub={(note ?? t("so.travel.sub", { name: wren })).toUpperCase()}
        wait={t("so.travel.wait").toUpperCase()}
        done={t("so.travel.done").toUpperCase()}
        bird={bird}
        onDone={finish}
      />
    </SurfaceHost>
  );
}

/** The React Native piece (the "lettertravel" switch's fallback). */
export function LetterTravelRN({ ready, onDone, title, note, ground: groundProp }: LetterTravelProps) {
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
  /* SAY WHAT IS HAPPENING (owner's phone, 2026-10-20: the arrival card stood still for 40 s on a
     slow network and then simply went away — "没有反馈 我也不知道"). Past a short rest the card's
     line says she is still flying; when the send lands it says so for a moment before the fade,
     so the piece never leaves without telling the writer the letter went.
     The clock's memory (letter-travel-model TravelClock): when the send landed, when the card
     began to rest, and the tap and the end, each once. It outlives a restart of the clock. */
  const clock = useRef<TravelClock | null>(null);
  if (clock.current === null) clock.current = newTravelClock(Date.now());
  if (ready && clock.current.readyAt === null) clock.current.readyAt = Date.now();
  /* onDone through a ref: the clock effect used to depend on it, and the
     caller passes a fresh function on every render — so the moment the
     send finished (`ready` flipped, the parent re-rendered) the clock was
     torn down and started again from the flat sheet. The owner's recording
     (2026-09-20): fold, pickup, hold… then paper again. */
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  /* the clock: authored seconds; it rests at HOLD_AT until `ready`, and the
     time spent resting is subtracted so the fade resumes without a jump
     (stepTravel, which keeps the notes on the bugs this once had) */
  useEffect(() => {
    if (reduce) {
      setT(STILL_T);
      return;
    }
    let raf = 0;
    const c = clock.current as TravelClock;
    restartTravelClock(c, Date.now());
    const tick = () => {
      const s = stepTravel(c, Date.now(), readyRef.current);
      setBeat(s.beat);
      setT(s.T);
      if (s.tap) tap();
      if (s.done) {
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
    }, STILL_HOLD_MS);
    return () => clearTimeout(id);
  }, [reduce, ready, fade]);

  /* the card's second line: the usual one, "still flying…" once the rest runs long, "sent" once it lands */
  const holdAt = clock.current.holdAt;
  const line = travelCardLine({ reduce: !!reduce, T, ready, heldForMs: holdAt !== null ? Date.now() - holdAt : 0, beat });
  const cardLine = line === "done" ? t("so.travel.done") : line === "wait" ? t("so.travel.wait") : null;

  /* ── the sheet's numbers (letter-travel-model travelFrame: the globe growing in from below as
     we pull back; the bird carried with the desk to home, so the arc starts under her — she used
     to jump 250pt there; one steady wing beat easing into a slow breath and level as she lands —
     she used to tremble on the far side of the world) ── */
  const f = travelFrame(T, beat);
  const { fold, seal, sealSquash, swoop, taken, out, cross, markIn, outro, gR, gCX, gCY, gTop, home, away, deskX, deskY, birdX, birdY, birdS, heading, bob, envOnDesk, foldW, foldH, sealed } = f;
  /* the route: a great-circle arc over the top of the globe */
  const onArc = (p: number) => travelArc(f, p);

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
        <Text style={{ ...PFM.monoSemi, fontSize: 11 * k, letterSpacing: 2.4 * k, color: noteInk, marginTop: 12 * k, textAlign: "center", paddingHorizontal: 24 }}>{(cardLine ?? note ?? t("so.travel.sub", { name: wren })).toUpperCase()}</Text>
      </View>
    </Animated.View>
  );
}
