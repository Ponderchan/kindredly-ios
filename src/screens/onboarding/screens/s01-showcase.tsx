import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Text, View, type LayoutChangeEvent } from "react-native";
import { Image } from "expo-image";
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";
import { Frost } from "../../../components/Frost";
import { StampSlot } from "../../../components/Stamp";
import { WrenBird } from "../../../components/WrenBird";
import { FACES } from "../../../data/aura-avatar-lib";
import { frostSpec } from "../../../lib/frost";
import { t, type Lang } from "../../../lib/i18n";
import { postmark } from "../../../lib/format";
import { strangerName } from "../../../lib/stranger-name";
import { letterFitSize, PFM } from "../../../theme/post";
import { useLetterFamily, useLetterFont } from "../../../lib/theme";
import { CARD_RADIUS } from "./s01-geometry";
import { FONT, OB } from "../parts/tokens";
import {
  AirmailPaper,
  DocketDate,
  Docket,
  MARK_STAMP_TILT,
  MarkStampArt,
  MarkStampPaper,
  NameMarks,
  SAMPLE_UID,
  SAMPLE_UID_YOU,
  docketMetrics,
  envelopeStampBox,
} from "./s06-envelope-front";
import { OB_MAX_FONT } from "../parts/tokens";

/* THE DOORSTEP'S LIVE CARD: three slides, each a real piece of the product
   playing a short loop (storyboard §2, the slides table).
   ────────────────────────────────────────────────────────────────────────
     1  a letter exactly as it lands on Today: the frosted window, "Sunday
        Kite ♀ ♊", the date, the stamp corner — where the launch's mark lands
        as the stamp — and a line that types itself in the letter's serif.
     2  the route chart: Wren flies out with an envelope along the dotted
        great circle, leaves it at the far stop and comes home with one; the
        chip pops as she lands.
     3  two frosted windows whose five-cell meters fill to 5 OF 5; a line
        strikes through "Sunday Kite", the frost wipes clear into two faces
        (the square turning round) and a signature draws in under each.

   THE CHIPS NEVER LIE (the owner's rule: numbers must be real). Slide 1's
   chip is the true fallback line ("no likes. no followers. just letters.") —
   the count RPC isn't in this round, so no number about the world is shown.
   Slides 2 and 3 only show events inside the sample. The sample stranger is
   lib/stranger-name's own name for a fixed uid (s06-envelope-front
   SAMPLE_UID), so a reader in Japanese sees the name a Japanese reader would
   really see; the letter line is ours, never anyone's real letter.

   ONLY THE SLIDE YOU SEE MOVES. A slide plays its loop while it is the
   active page and rests on its first frame otherwise; Reduce Motion rests
   every slide on its LAST frame (the stamp on, the line written, Wren home,
   the faces and signatures in), so the meaning survives without motion.

   The card face, its scroll view and the paging are here; the doorstep
   (S01Doorstep) owns the page, the auto-advance, the chip and the hand-off
   clock (`hc`) that slide 1's stamp corner follows on the first visit. */

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The landing timeline (ms) shared with the doorstep's hand-off (storyboard §4). */
export const LAND = { travelFrom: 120, windowFrom: 440, thunk: 560, typeFrom: 800, end: 1250 } as const;

const seg = (x: number, a: number, b: number) => {
  "worklet";
  return Math.min(1, Math.max(0, (x - a) / (b - a)));
};
const eo = (x: number) => {
  "worklet";
  return 1 - Math.pow(1 - x, 3);
};

/** The two sample faces of slide 3: the first of each pool (FACES is f, m interleaved). */
const FACE_THEM = FACES.find((f) => f.pool === "f") ?? FACES[0];
const FACE_YOU = FACES.find((f) => f.pool === "m") ?? FACES[1];

/** slide 1's docket scale (the Today card's header, a touch larger on the doorstep) */
export const SLIDE1_K = 1.25;
/** slide 1's letter line under the docket: two lines at 16/22, 10 under the row */
export const SLIDE1_BELOW = 44;
export const SLIDE1_GAP = 10;

/** Where slide 1's stamp corner is, inside the card's inner area (`w` × `h`, inside the ink edge). */
export function slide1StampBox(w: number, h: number) {
  return envelopeStampBox(w, h, SLIDE1_K, SLIDE1_BELOW, SLIDE1_GAP);
}

/* ── the card ── */

export function ShowcaseCard({
  w,
  h,
  page,
  scrollX,
  scrollRef,
  onSettle,
  onTouch,
  hc,
  firstFromLaunch,
  still,
  lang,
  now,
  onChipPop,
}: {
  /** the inner area, inside the card's ink edge */
  w: number;
  h: number;
  page: number;
  scrollX: SharedValue<number>;
  scrollRef: RefObject<Animated.ScrollView | null>;
  /** a swipe or an auto-advance came to rest on page i */
  onSettle: (i: number) => void;
  /** a finger touched the card: the auto-advance stops for good */
  onTouch: () => void;
  /** the doorstep's hand-off clock (ms): slide 1's stamp corner follows it on the first visit */
  hc: SharedValue<number>;
  /** the doorstep opened straight from the launch: the launch's mark is the one that lands */
  firstFromLaunch: boolean;
  still: boolean;
  lang: Lang;
  now: () => number;
  onChipPop: () => void;
}) {
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
    onBeginDrag: () => {
      runOnJS(onTouch)();
    },
    onMomentumEnd: (e) => {
      runOnJS(onSettle)(Math.round(e.contentOffset.x / w));
    },
  });
  const date = useMemo(() => postmark(now()), [now]);
  const them = useMemo(() => strangerName(SAMPLE_UID, { lang, unsigned: "" }), [lang]);
  const heads = [t("ob2.doorstep.s1.head"), t("ob2.doorstep.s2.head"), t("ob2.doorstep.s3.head")];

  return (
    <Animated.ScrollView
      ref={scrollRef}
      horizontal
      pagingEnabled
      bounces={false}
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      style={{ width: w, height: h }}
      onTouchStart={onTouch}
    >
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          accessible
          accessibilityRole="image"
          accessibilityLabel={t("ob2.doorstep.slideA11y", { head: heads[i], n: i + 1 })}
          style={{ width: w, height: h }}
        >
          {i === 0 && <SlideLetter w={w} h={h} active={page === 0} hc={hc} firstFromLaunch={firstFromLaunch} still={still} name={them} date={date} />}
          {i === 1 && <SlideRoute w={w} h={h} active={page === 1} still={still} them={them} onLand={onChipPop} />}
          {i === 2 && <SlideTrade w={w} h={h} active={page === 2} still={still} them={them} onTrade={onChipPop} />}
        </View>
      ))}
    </Animated.ScrollView>
  );
}

/* ── slide 1: the letter, the stamp, the line ── */

function SlideLetter({
  w,
  h,
  active,
  hc,
  firstFromLaunch,
  still,
  name,
  date,
}: {
  w: number;
  h: number;
  active: boolean;
  hc: SharedValue<number>;
  firstFromLaunch: boolean;
  still: boolean;
  name: string;
  date: string;
}) {
  // the letter typing itself is content: the letter font's italic, a size down in a roomy face (the box is two lines tall)
  const letterKey = useLetterFont();
  const said = useLetterFamily(true);
  const m = docketMetrics(SLIDE1_K);
  const line = t("ob2.doorstep.s1.letter");
  const spec = useMemo(() => frostSpec(SAMPLE_UID), []);
  /* the slide's own landing clock. On the first visit it MIRRORS the doorstep's hand-off clock, and
     the mark that arrives is the launch's own (drawn by the doorstep, in window points): the corner
     only shows the window and the mark from the thunk on. Every later visit replays a small landing
     of its own (the mark drops into the corner), so the slide is a loop like the others. */
  const land = useSharedValue(still || !firstFromLaunch ? LAND.end : 0);
  const mirror = useSharedValue(firstFromLaunch && !still ? 1 : 0);
  const travelling = useSharedValue(firstFromLaunch && !still ? 1 : 0);
  useAnimatedReaction(
    () => hc.value,
    (v) => {
      if (mirror.value === 1) land.value = v;
    },
  );

  const [typed, setTyped] = useState(still ? line.length : 0);
  const typer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTyping = () => {
    if (typer.current) clearInterval(typer.current);
    typer.current = null;
  };
  const startTyping = () => {
    stopTyping();
    setTyped(0);
    let n = 0;
    typer.current = setInterval(() => {
      n += 1;
      setTyped(n);
      if (n >= line.length) stopTyping();
    }, 34);
  };
  useEffect(() => stopTyping, []);
  useAnimatedReaction(
    () => land.value >= LAND.typeFrom,
    (on, was) => {
      if (on && !was && !still) runOnJS(startTyping)();
    },
    [still],
  );

  /* a later visit: the slide's own small landing, then the line again */
  const visits = useRef(0);
  useEffect(() => {
    if (still) return;
    if (!active) {
      return;
    }
    visits.current += 1;
    if (visits.current === 1 && firstFromLaunch) return; // the hand-off is playing it
    if (visits.current === 1) return; // opened at rest (back from 2, a dev jump): the stamp is on, the reaction types the line once
    mirror.value = 0;
    travelling.value = 0;
    stopTyping();
    setTyped(0);
    cancelAnimation(land);
    land.value = 0;
    land.value = withTiming(LAND.end, { duration: LAND.end, easing: Easing.linear });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, still]);

  const box = slide1StampBox(w, h);
  const slotStyle = useAnimatedStyle(() => ({ opacity: 1 - seg(land.value, LAND.thunk, LAND.thunk + 80) }));
  // the perforated paper snaps in round the window at the thunk
  const paperStyle = useAnimatedStyle(() => {
    const s = seg(land.value, LAND.thunk, LAND.thunk + 110);
    return { opacity: s, transform: [{ scale: 1.14 - 0.14 * eo(s) }] };
  });
  // the window and the mark: from the thunk when the launch's mark flew in; dropping in otherwise
  const artStyle = useAnimatedStyle(() => {
    if (travelling.value === 1) return { opacity: land.value >= LAND.thunk ? 1 : 0, transform: [{ scale: 1 }] };
    const s = seg(land.value, LAND.windowFrom - 140, LAND.thunk);
    return { opacity: s, transform: [{ scale: 1.7 - 0.7 * eo(s) }] };
  });
  // and then it settles at its small tilt
  const tiltStyle = useAnimatedStyle(() => {
    const s = seg(land.value, LAND.thunk, LAND.thunk + 170);
    const over = s < 1 ? Math.sin(s * Math.PI) * 0.8 : 0;
    return { transform: [{ rotate: `${MARK_STAMP_TILT * eo(s) + over}deg` }] };
  });

  const caret = useSharedValue(1);
  useEffect(() => {
    if (still) return;
    caret.value = withRepeat(withTiming(0, { duration: 520, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [still, caret]);
  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.value }));

  return (
    <AirmailPaper w={w} h={h} radius={CARD_RADIUS - 3}>
      <Docket
        k={SLIDE1_K}
        face={spec ? <Frost spec={spec} size={m.face} /> : null}
        name={<NameMarks name={name} mark="she" sign="gemini" size={m.name} numberOfLines={1} />}
        date={<DocketDate text={date} k={SLIDE1_K} />}
        stamp={
          <View style={{ width: box.w, height: box.h }}>
            <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, slotStyle]}>
              <StampSlot width={box.w} fill={OB.paper} stroke="#B3B0C9" />
            </Animated.View>
            <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: box.w, height: box.h }, tiltStyle]}>
              <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: box.w, height: box.h }, paperStyle]}>
                <MarkStampPaper width={box.w} />
              </Animated.View>
              <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: box.w, height: box.h }, artStyle]}>
                <MarkStampArt width={box.w} />
              </Animated.View>
            </Animated.View>
          </View>
        }
      />
      <View style={{ height: SLIDE1_BELOW, marginTop: SLIDE1_GAP, justifyContent: "flex-start" }}>
        <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={2} style={{ ...said, fontSize: letterFitSize(letterKey, 16.5), lineHeight: 22, color: OB.ink }}>
          {line.slice(0, typed)}
          {!still && (
            <Animated.Text maxFontSizeMultiplier={OB_MAX_FONT} style={[{ color: OB.blue, ...FONT.body }, caretStyle]}>{"|"}</Animated.Text>
          )}
        </Text>
      </View>
    </AirmailPaper>
  );
}

/* ── slide 2: the route chart ── */

type Pt = [number, number];
const cubic = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, u: number): Pt => {
  const v = 1 - u;
  return [
    v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
    v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1],
  ];
};

/** the route loop's clock, in seconds */
const R = { outFrom: 0.35, outTo: 1.55, backFrom: 1.9, backTo: 3.1, loop: 4.1 } as const;
const BIRD = 50;

function SlideRoute({ w, h, active, still, them, onLand }: { w: number; h: number; active: boolean; still: boolean; them: string; onLand: () => void }) {
  // the loop stays clear of the card's top edge: she flies with her body above the line
  const home: Pt = [w * 0.17, h * 0.72];
  const far: Pt = [w * 0.8, h * 0.4];
  const out: [Pt, Pt, Pt, Pt] = [home, [w * 0.1, h * 0.3], [w * 0.52, h * 0.16], far];
  const back: [Pt, Pt, Pt, Pt] = [far, [w * 0.98, h * 0.72], [w * 0.52, h * 1.0], home];
  const d = (c: [Pt, Pt, Pt, Pt]) => `M${c[0][0]} ${c[0][1]} C${c[1][0]} ${c[1][1]} ${c[2][0]} ${c[2][1]} ${c[3][0]} ${c[3][1]}`;
  const N = 12;
  const samples = useMemo(() => {
    const outPts = Array.from({ length: N + 1 }, (_, i) => cubic(out[0], out[1], out[2], out[3], i / N));
    const backPts = Array.from({ length: N + 1 }, (_, i) => cubic(back[0], back[1], back[2], back[3], i / N));
    const times = [0, ...outPts.map((_, i) => R.outFrom + (i / N) * (R.outTo - R.outFrom)), ...backPts.map((_, i) => R.backFrom + (i / N) * (R.backTo - R.backFrom)), R.loop];
    const xs = [home[0], ...outPts.map((p) => p[0]), ...backPts.map((p) => p[0]), home[0]];
    const ys = [home[1], ...outPts.map((p) => p[1]), ...backPts.map((p) => p[1]), home[1]];
    return { outPts, backPts, times, xs, ys };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h]);

  const clock = useSharedValue(still ? R.loop : 0);
  useEffect(() => {
    if (still) {
      clock.value = R.loop;
      return;
    }
    cancelAnimation(clock);
    clock.value = 0;
    if (!active) return;
    clock.value = withRepeat(withTiming(R.loop, { duration: R.loop * 1000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(clock);
  }, [active, still, clock]);
  useAnimatedReaction(
    () => clock.value >= R.backTo,
    (on, was) => {
      if (on && was === false && active && !still) runOnJS(onLand)();
    },
    [active, still],
  );

  const birdStyle = useAnimatedStyle(() => {
    const c = clock.value;
    const x = interpolate(c, samples.times, samples.xs, Extrapolation.CLAMP);
    const y = interpolate(c, samples.times, samples.ys, Extrapolation.CLAMP);
    const goingBack = c > (R.outTo + R.backFrom) / 2 && c < R.loop - 0.05;
    const lift = c > R.outFrom && c < R.backTo ? -4 : 0;
    return { transform: [{ translateX: x - BIRD / 2 }, { translateY: y - BIRD * 0.62 + lift }, { scaleX: goingBack ? -1 : 1 }] };
  });
  const dropStyle = useAnimatedStyle(() => {
    const s = seg(clock.value, R.outTo, R.outTo + 0.25);
    return { opacity: s, transform: [{ scale: 0.6 + 0.4 * eo(s) }] };
  });

  const grid = 18;
  return (
    <View style={{ width: w, height: h, backgroundColor: OB.paper }}>
      <Svg width={w} height={h} style={{ position: "absolute" }}>
        {Array.from({ length: Math.ceil(w / grid) + 1 }, (_, i) => (
          <Line key={"v" + i} x1={i * grid} y1={0} x2={i * grid} y2={h} stroke={OB.ink} strokeOpacity={0.07} />
        ))}
        {Array.from({ length: Math.ceil(h / grid) + 1 }, (_, i) => (
          <Line key={"h" + i} x1={0} y1={i * grid} x2={w} y2={i * grid} stroke={OB.ink} strokeOpacity={0.07} />
        ))}
        <Path d={d(out)} fill="none" stroke={OB.ink} strokeOpacity={0.22} strokeWidth={1.2} strokeDasharray="3 5" />
        <Path d={d(back)} fill="none" stroke={OB.ink} strokeOpacity={0.22} strokeWidth={1.2} strokeDasharray="3 5" />
        {[home, far].map(([x, y], i) => (
          <G key={i}>
            <Circle cx={x} cy={y} r={9} fill={OB.paper} stroke={OB.ink} strokeWidth={1.6} />
            <Rect x={x - 2.8} y={y - 2.8} width={5.6} height={5.6} fill={i === 0 ? OB.ink : OB.blue} />
          </G>
        ))}
      </Svg>
      {/* the trail she leaves, out and back */}
      {[...samples.outPts.map((p, i) => ({ p, at: R.outFrom + (i / N) * (R.outTo - R.outFrom) })), ...samples.backPts.map((p, i) => ({ p, at: R.backFrom + (i / N) * (R.backTo - R.backFrom) }))]
        .map(({ p, at }, i) => (
          <TrailDot key={i} clock={clock} at={at} x={p[0]} y={p[1]} still={still} />
        ))}
      <Text maxFontSizeMultiplier={OB_MAX_FONT} style={{ position: "absolute", left: home[0] - 50, width: 100, top: home[1] + 14, textAlign: "center", ...PFM.monoSemi, fontSize: 8.5, letterSpacing: 1.2, color: OB.ink }}>
        {t("ff.yourCity")}
      </Text>
      <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={1} style={{ position: "absolute", right: 8, width: w * 0.5, top: far[1] - 30, textAlign: "right", ...PFM.monoSemi, fontSize: 8.5, letterSpacing: 1.2, color: OB.ink }}>
        {them.toLocaleUpperCase()}
      </Text>
      {/* the letter she leaves at the far stop */}
      <Animated.View style={[{ position: "absolute", left: far[0] + 8, top: far[1] + 6 }, dropStyle]}>
        <MiniEnvelope />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0 }, birdStyle]}>
        <WrenBird size={BIRD} pose="fly" stage="wren" skin="sticker" accessory="none" />
      </Animated.View>
    </View>
  );
}

function TrailDot({ clock, at, x, y, still }: { clock: SharedValue<number>; at: number; x: number; y: number; still: boolean }) {
  const style = useAnimatedStyle(() => ({
    opacity: still ? 0.55 : interpolate(clock.value, [at - 0.02, at, R.loop - 0.35, R.loop], [0, 0.7, 0.7, 0], Extrapolation.CLAMP),
  }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: x - 2.2, top: y - 2.2, width: 4.4, height: 4.4, borderRadius: 2.2, backgroundColor: OB.blue }, style]} />;
}

function MiniEnvelope() {
  return (
    <Svg width={22} height={15} viewBox="0 0 22 15">
      <Rect x={0.75} y={0.75} width={20.5} height={13.5} rx={1.5} fill={OB.paper} stroke={OB.ink} strokeWidth={1.4} />
      <Path d="M1 1.5 L11 8.5 L21 1.5" fill="none" stroke={OB.ink} strokeWidth={1.4} strokeLinejoin="round" />
    </Svg>
  );
}

/* ── slide 3: five letters each, then the names ── */

/** the trade's clock, in seconds */
const T = { fillFrom: 0.25, cell: 0.15, strike: 1.95, wipeFrom: 2.15, wipeTo: 2.55, signFrom: 2.55, signTo: 3.25, fadeFrom: 3.95, loop: 4.3 } as const;
const WIN = 56;
const SIG_LEN = 220;
/* two signatures, drawn by hand on a 90 × 24 box (no letters anyone could read: a pen name is the person's own) */
const SIGS = [
  "M3 17 C7 4 11 3 11 12 C11 18 14 18 17 11 C19 7 21 8 21 13 C21 17 24 17 27 12 C30 7 31 9 31 13 C32 18 36 16 39 10 C41 6 43 7 43 12 C43 16 47 16 51 9 M55 14 C60 11 66 10 74 12 C79 13 84 12 88 9",
  "M4 14 C8 6 14 4 13 11 C12 17 8 19 7 15 C6 11 14 9 20 12 C24 14 25 18 29 13 C33 8 34 6 36 12 C37 16 40 17 44 11 C47 7 50 8 50 13 C50 17 55 17 60 12 C64 9 70 9 78 11 C82 12 85 11 87 8",
];

function SlideTrade({ w, h, active, still, them, onTrade }: { w: number; h: number; active: boolean; still: boolean; them: string; onTrade: () => void }) {
  const clock = useSharedValue(still ? T.signTo : 0);
  useEffect(() => {
    if (still) {
      clock.value = T.signTo;
      return;
    }
    cancelAnimation(clock);
    clock.value = 0;
    if (!active) return;
    clock.value = withRepeat(withTiming(T.loop, { duration: T.loop * 1000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(clock);
  }, [active, still, clock]);
  useAnimatedReaction(
    () => clock.value >= T.wipeTo,
    (on, was) => {
      if (on && was === false && active && !still) runOnJS(onTrade)();
    },
    [active, still],
  );

  const [count, setCount] = useState(still ? 5 : 0);
  // both sides' cell i are in once the second of the pair is: fillFrom + (2i + 1)·cell
  useAnimatedReaction(
    () => (clock.value >= T.loop - 0.02 ? 0 : Math.max(0, Math.min(5, Math.floor(((clock.value - T.fillFrom) / T.cell - 1) / 2) + 1))),
    (n, was) => {
      if (n !== was) runOnJS(setCount)(n);
    },
  );

  const top = Math.max(14, (h - (WIN + 8 + 9 + 10 + 16 + 4 + 24)) / 2);
  const cx = [w * 0.3, w * 0.7];
  const faces = [FACE_THEM, FACE_YOU];
  const specs = useMemo(() => [frostSpec(SAMPLE_UID), frostSpec(SAMPLE_UID_YOU)], []);
  const names = [them, t("ob2.doorstep.s3.you")];

  return (
    <View style={{ width: w, height: h, backgroundColor: OB.paper }}>
      <Text maxFontSizeMultiplier={OB_MAX_FONT} style={{ position: "absolute", left: 0, right: 0, top: top + WIN / 2 - 7, textAlign: "center", ...PFM.monoSemi, fontSize: 9.5, letterSpacing: 1.4, color: OB.ink }}>
        {t("ob2.doorstep.s3.count", { n: count })}
      </Text>
      {[0, 1].map((side) => (
        <View key={side} style={{ position: "absolute", left: cx[side] - 60, width: 120, top, alignItems: "center" }}>
          <TradeWindow clock={clock} spec={specs[side]} faceSrc={faces[side].src} />
          <Meter clock={clock} side={side} />
          <StruckName clock={clock} name={names[side]} strike={side === 0} />
          <Signature clock={clock} d={SIGS[side]} />
        </View>
      ))}
    </View>
  );
}

function TradeWindow({ clock, spec, faceSrc }: { clock: SharedValue<number>; spec: ReturnType<typeof frostSpec>; faceSrc: number }) {
  const round = useAnimatedStyle(() => {
    const s = seg(clock.value, T.wipeTo - 0.1, T.wipeTo + 0.2) * (1 - seg(clock.value, T.fadeFrom, T.loop));
    return { borderRadius: WIN * 0.25 + (WIN * 0.25) * eo(s) };
  });
  const frostClip = useAnimatedStyle(() => {
    const open = seg(clock.value, T.wipeFrom, T.wipeTo);
    const back = seg(clock.value, T.fadeFrom, T.loop);
    return { width: WIN * (1 - eo(open)) + WIN * back * (open >= 1 ? 1 : 0) };
  });
  return (
    <Animated.View style={[{ width: WIN, height: WIN, overflow: "hidden", backgroundColor: "#EFEDFA" }, round]}>
      <Image source={faceSrc} style={{ width: WIN, height: WIN }} contentFit="cover" />
      <Animated.View style={[{ position: "absolute", right: 0, top: 0, height: WIN, overflow: "hidden" }, frostClip]}>
        <View style={{ position: "absolute", right: 0, top: 0 }}>{spec && <Frost spec={spec} size={WIN} />}</View>
      </Animated.View>
    </Animated.View>
  );
}

/** five cells; the two sides fill in turn (a letter each way), so both reach 5 together */
function Meter({ clock, side }: { clock: SharedValue<number>; side: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 3, marginTop: 8 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Cell key={i} clock={clock} at={T.fillFrom + (i * 2 + side) * T.cell} />
      ))}
    </View>
  );
}
function Cell({ clock, at }: { clock: SharedValue<number>; at: number }) {
  const style = useAnimatedStyle(() => {
    const on = clock.value >= at && clock.value < T.loop - 0.02 ? 1 : 0;
    const s = seg(clock.value, at, at + 0.12);
    return { backgroundColor: on ? OB.blue : "transparent", transform: [{ scale: on ? 0.8 + 0.2 * eo(s) : 1 }] };
  });
  return <Animated.View style={[{ width: 9, height: 9, borderRadius: 2, borderWidth: 1.4, borderColor: OB.ink }, style]} />;
}

function StruckName({ clock, name, strike }: { clock: SharedValue<number>; name: string; strike: boolean }) {
  const [tw, setTw] = useState(0);
  const lineStyle = useAnimatedStyle(() => {
    const s = seg(clock.value, T.strike, T.strike + 0.2) * (1 - seg(clock.value, T.fadeFrom, T.loop));
    return { width: tw * eo(s) };
  });
  return (
    <View style={{ marginTop: 9, height: 18, alignItems: "center", justifyContent: "center" }}>
      <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={1} onLayout={(e: LayoutChangeEvent) => setTw(e.nativeEvent.layout.width)} style={{ fontSize: 13, fontWeight: "600", color: OB.ink, maxWidth: 118 }}>
        {name}
      </Text>
      {strike && <Animated.View style={[{ position: "absolute", left: 0, height: 1.6, backgroundColor: OB.ink, top: 9 }, lineStyle]} />}
    </View>
  );
}

function Signature({ clock, d }: { clock: SharedValue<number>; d: string }) {
  const props = useAnimatedProps(() => {
    const s = seg(clock.value, T.signFrom, T.signTo);
    const gone = seg(clock.value, T.fadeFrom, T.loop);
    return { strokeDashoffset: SIG_LEN * (1 - s), strokeOpacity: 1 - gone };
  });
  return (
    <Svg width={90} height={24} viewBox="0 0 90 24" style={{ marginTop: 4 }}>
      <AnimatedPath d={d} fill="none" stroke={OB.ink} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[SIG_LEN, SIG_LEN]} animatedProps={props} />
    </Svg>
  );
}
