import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  SlideInDown,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import { WrenBird, type WrenMood, type WrenPose } from "./WrenBird";
import { sheetCard, sheetKey, sheetKeyLabel } from "./sheet-chrome";
import { scrimColor, useP, useTheme } from "../lib/theme";
import { t, useLang } from "../lib/i18n";
import { openAppStore } from "../lib/update-prompt";
import { BRAND } from "../theme/themes";
import { PFM } from "../theme/post";
import "../data/strings-update-prompt";

/* THE UPDATE PROMPT: WREN BRINGS A PARCEL (OTA, 2026-10-25; owner's copy set A).
   ────────────────────────────────────────────────────────────────────────
   Two faces, both React Native so an over-the-air update reaches 1.2.4 and 1.2.5 as they are:

   UpdateSheet: the sheet the first time the prompt applies (screens/today/TodayUpdate decides
   when). It wears the app's iOS sheet face (components/sheet-chrome: the floating card, the
   system face, capsule keys) with a grabber, in a window-level Modal over the tab bar. Inside,
   the parcel scene: Wren flies in from the top right with the parcel hanging from her feet, lets
   it drop, and sits on it. Then, now and then, the parcel shakes and she looks at it, curious.
   Update: the bow flies off, the flaps pop, a few stars, she is delighted, and
   the App Store opens 0.8 s later (at once under Reduce Motion, where nothing flies, shakes or
   pops: she is simply sitting on the parcel). Later, the grabber pulled down, a tap on the dim
   or the VoiceOver escape put it away. Hard mode (update_force) has no Later and none of those
   ways out: it stays until the phone updates, and a moment after each Update the scene is set
   back, closed, with her on it, for whenever they come back from the App Store.

   UpdateBanner: the slim bar pinned under the status bar on Today after Later, until the phone
   updates. The parcel glyph, "a parcel's waiting for you", "Update ›"; one tap target.

   WREN is WrenBird without the outline (its default; never `outlined`), the grown bird of the
   official no-outline art: content, curious, delight, and the flying pose with no letter of her
   own (she carries the parcel instead). No blink: the art has no blinking face, and sleepy (the
   nearest) brings its z's with it.

   THE PARCEL is drawn here in the brand colours: the wax-gold box, the cream flaps, the post-red
   ribbon and bow, and the version stamp, a paper label in SF Mono caps (shown only once the App
   Store's version is known). It is cut into layers so each part can move: the body (front,
   inside, flaps, stamp) under Wren, the bow over her. Every layer is the same 120 × 100 box.

   Curves are module constants: a hook listing a fresh Easing in its deps would restart on every
   re-render. */

const E_OUT = Easing.out(Easing.cubic);
const E_IN = Easing.in(Easing.quad);
const E_INOUT = Easing.inOut(Easing.cubic);
const E_POP = Easing.out(Easing.back(1.8));
const LINEAR = Easing.linear;
const SPRING_BACK = { damping: 22, stiffness: 260 } as const;

/* ── the parcel ─────────────────────────────────────────────────────────── */

/** the parcel's box, in points and in its viewBox alike */
const PW = 120;
const PH = 100;
const BOX = BRAND.waxGold;
const LID = BRAND.creamBorder;
const INSIDE = BRAND.brassSeal;
const RIBBON = BRAND.postRed;
/* the stamp's paper and its edge (the letter's own paper edge, WrenBird LETTER_EDGE) */
const PAPER = "#FFFFFF";
const PAPER_EDGE = "#D8D2C2";

/* the front face, its foot rounded; the top seen a little from above, as two flaps meeting in the middle */
const FRONT = "M4 26 H116 V92 Q116 96 112 96 H8 Q4 96 4 92 Z";
const FRONT_SHADE = "M4 26 H116 V31 H4 Z";
const TOP = "M14 6 H106 L116 26 H4 Z";
const FLAP_L = "M14 6 H60 V26 H4 Z";
const FLAP_R = "M60 6 H106 L116 26 H60 Z";
const RIBBON_FRONT = "M54 26 H66 V96 H54 Z";
const RIBBON_L = "M55 6 H60 V26 H54 Z";
const RIBBON_R = "M60 6 H65 L66 26 H60 Z";
/* the bow, its knot on the front edge at (60, 26) */
const BOW_LOOPS = "M60 26 C50 10 34 11 37 21 C39 28 51 29 60 26 Z M60 26 C70 10 86 11 83 21 C81 28 69 29 60 26 Z";
const BOW_SHADE = "M60 26 C53 17 44 17 45 22 C46 26 53 27 60 26 Z M60 26 C67 17 76 17 75 22 C74 26 67 27 60 26 Z";
const BOW_TAILS = "M57 29 L49 43 L54 41.5 L57 45 L60 30 Z M63 29 L71 43 L66 41.5 L63 45 L60 30 Z";
/* where the stamp sits on the front */
const STAMP = { x: 18, y: 52, w: 84, h: 24 };

const BOX_VIEW = `0 0 ${PW} ${PH}`;
const FILL = { position: "absolute" as const, left: 0, top: 0, width: PW, height: PH };
/* the box's foot, middle: what it shakes about (transformOrigin in points; RN's string form takes whole numbers only) */
const PARCEL_FOOT = [PW / 2, 96, 0];

function Bow() {
  return (
    <>
      <Path d={BOW_TAILS} fill={RIBBON} />
      <Path d={BOW_LOOPS} fill={RIBBON} />
      <Path d={BOW_SHADE} fill="#000" opacity={0.14} />
      <Rect x={55.5} y={21.5} width={9} height={9} rx={3} fill={RIBBON} />
    </>
  );
}

/** The closed parcel as one small picture (the banner's glyph). */
function ParcelGlyph({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={(size * PH) / PW} viewBox={BOX_VIEW}>
      <Path d={FRONT} fill={BOX} />
      <Path d={FRONT_SHADE} fill="#000" opacity={0.08} />
      <Path d={FLAP_L} fill={LID} />
      <Path d={FLAP_R} fill={LID} />
      <Path d={RIBBON_FRONT} fill={RIBBON} />
      <Path d={RIBBON_L} fill={RIBBON} />
      <Path d={RIBBON_R} fill={RIBBON} />
      <Bow />
    </Svg>
  );
}

/* the stamp on the front: "VERSION 1.0.6" on a scrap of paper with a dashed post-red border */
function VersionStamp({ version }: { version: string }) {
  const label = t("upd.version", { version });
  return (
    <View accessible accessibilityLabel={label} style={{ position: "absolute", left: STAMP.x, top: STAMP.y, width: STAMP.w, height: STAMP.h, alignItems: "center", justifyContent: "center" }}>
      <Svg width={STAMP.w} height={STAMP.h} style={{ position: "absolute" }}>
        <Rect x={0.5} y={0.5} width={STAMP.w - 1} height={STAMP.h - 1} rx={2} fill={PAPER} stroke={PAPER_EDGE} strokeWidth={1} />
        <Rect x={3} y={3} width={STAMP.w - 6} height={STAMP.h - 6} rx={1} fill="none" stroke={RIBBON} strokeWidth={0.8} strokeDasharray="2.5 2" />
      </Svg>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        maxFontSizeMultiplier={1}
        style={{ ...PFM.monoSemi, fontSize: 9.5, letterSpacing: 0.4, color: BRAND.inkOnBrand, paddingHorizontal: 4 }}
      >
        {label}
      </Text>
    </View>
  );
}

/* ── the scene ─────────────────────────────────────────────────────────── */

const SCENE_H = 214;
/** Wren's size, perched or flying */
const S = 96;
/* her feet in her own box (WrenBird's 200 viewBox at S): perched, between the two feet; flying,
   where the letter would hang (the official fly art) */
const PERCH_FEET = { x: 47, y: 83 };
const FLY_FEET = { x: 51, y: 79 };
/* flying, the parcel hangs from her feet by the bow's loops (their top is at y 12 in the box) */
const CARRY = { dx: FLY_FEET.x - PW / 2, dy: FLY_FEET.y - 12 + 2 };

/* the beats, in ms */
const START_MS = 280; // the sheet rises first
const FLY_MS = 950;
const HOVER_MS = 220;
const DROP_MS = 300;
const LAND_MS = 640; // from the drop to her feet on the lid
const SETTLE_MS = 160;
const FIRST_SHAKE_MS = 1400;
const SHAKE_EVERY: [number, number] = [3400, 5200];
const CURIOUS_MS = 1300;
const BOW_MS = 520;
const FLAP_DELAY = 90;
const FLAP_MS = 320;
const STARS_DELAY = 140;
const STARS_MS = 760;
/** from Update to the App Store */
const OPEN_MS = 820;
/* hard mode: from the App Store opening to the closed parcel again */
const RESET_MS = 1200;
/* the dev preview's ?play=1: Update presses itself this long after the sheet opens (she has landed and the parcel has shaken once) */
const AUTO_PLAY_MS = 4600;

const between = ([a, b]: [number, number]) => a + Math.random() * (b - a);

/* where everything stands in a scene `width` wide */
function sceneGeometry(width: number) {
  const cx = width / 2;
  const ground = SCENE_H - 14;
  const restX = cx - PW / 2;
  const restY = ground - 96; // the box's foot is at y 96
  const footY = restY + 9; // her feet on the back of the lid, just behind the bow
  const perchX = cx - PERCH_FEET.x;
  const perchY = footY - PERCH_FEET.y;
  // the parcel hovers 26 over the ground before she lets go
  const hoverX = restX - CARRY.dx;
  const hoverY = restY - 26 - CARRY.dy;
  return {
    cx,
    ground,
    restX,
    restY,
    perchX,
    perchY,
    hoverX,
    hoverY,
    // flying down to the lid, her feet where they'll stand
    landX: cx - FLY_FEET.x,
    landY: footY - FLY_FEET.y,
    // she comes in from beyond the top right corner
    startX: width + 20,
    startY: -120,
    // she rides the parcel's shake: the same turn about the parcel's foot, from her own box
    perchOrigin: [restX + PW / 2 - perchX, ground - perchY, 0],
  };
}

/* a few stars out of the open box: where each ends up (from the opening), how big, which colour, how late */
const STARS = [
  { dx: -58, dy: -64, size: 14, color: BRAND.waxGold, delay: 0 },
  { dx: 52, dy: -80, size: 18, color: BRAND.waxGold, delay: 40 },
  { dx: -20, dy: -98, size: 12, color: BRAND.lime, delay: 90 },
  { dx: 80, dy: -34, size: 12, color: BRAND.postRed, delay: 60 },
  { dx: -84, dy: -24, size: 10, color: BRAND.waxGold, delay: 120 },
] as const;
const STAR = "M10 0 L12.6 7.4 L20 10 L12.6 12.6 L10 20 L7.4 12.6 L0 10 L7.4 7.4 Z";
const STAR_RUN = 560; // each star's own flight, inside STARS_MS

function Star({ burst, x, y, dx, dy, size, color, delay }: { burst: SharedValue<number>; x: number; y: number } & (typeof STARS)[number]) {
  const st = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, (burst.value * STARS_MS - delay) / STAR_RUN));
    const e = 1 - (1 - p) * (1 - p) * (1 - p);
    return {
      opacity: p <= 0 ? 0 : p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45,
      transform: [{ translateX: dx * e }, { translateY: dy * e }, { scale: 0.3 + 0.7 * Math.min(1, p * 2.4) }, { rotate: `${90 * p}deg` }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size }, st]}>
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Path d={STAR} fill={color} />
      </Svg>
    </Animated.View>
  );
}

/**
 * The parcel scene, `width` wide and SCENE_H tall. `enter`: she flies in with it (otherwise she
 * is already sitting on it); `opening`: Update was pressed; `still`: Reduce Motion.
 */
function ParcelScene({ width, version, enter, opening, still }: { width: number; version: string | null; enter: boolean; opening: boolean; still: boolean }) {
  const [g] = useState(() => sceneGeometry(width)); // fixed for the sheet's life
  const flying = enter && !still;
  const wx = useSharedValue(flying ? g.startX : g.perchX);
  const wy = useSharedValue(flying ? g.startY : g.perchY);
  const px = useSharedValue(flying ? g.startX + CARRY.dx : g.restX);
  const py = useSharedValue(flying ? g.startY + CARRY.dy : g.restY);
  const shake = useSharedValue(0); // the parcel's jiggle, which she rides
  const wobble = useSharedValue(0); // the parcel's own landing, which she doesn't
  const bow = useSharedValue(0);
  const flaps = useSharedValue(0);
  const burst = useSharedValue(0);
  const [pose, setPose] = useState<WrenPose>(flying ? "fly" : "perch");
  const [mood, setMood] = useState<WrenMood>("content");
  const [idle, setIdle] = useState(!flying);

  // the arrival: flown in together (the same curves keep the parcel on her feet), dropped, landed on
  const arrival = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    if (!flying) return;
    const ids = arrival.current;
    const fly = (to: number, easing: typeof E_OUT) => withDelay(START_MS, withTiming(to, { duration: FLY_MS, easing }));
    wx.value = fly(g.hoverX, E_OUT);
    px.value = fly(g.hoverX + CARRY.dx, E_OUT);
    wy.value = fly(g.hoverY, E_INOUT);
    py.value = fly(g.hoverY + CARRY.dy, E_INOUT);
    ids.push(
      setTimeout(() => {
        py.value = withSequence(
          withTiming(g.restY, { duration: DROP_MS, easing: E_IN }),
          withTiming(g.restY - 7, { duration: 110, easing: E_OUT }),
          withTiming(g.restY, { duration: 120, easing: E_IN }),
        );
        wobble.value = withDelay(DROP_MS, withSequence(withTiming(-3, { duration: 80 }), withTiming(2, { duration: 90 }), withTiming(0, { duration: 80 })));
        // a little lift as the weight goes, then down onto the lid
        wy.value = withSequence(withTiming(g.hoverY - 8, { duration: 200, easing: E_OUT }), withTiming(g.landY, { duration: LAND_MS - 200, easing: E_INOUT }));
        wx.value = withTiming(g.landX, { duration: LAND_MS, easing: E_INOUT });
      }, START_MS + FLY_MS + HOVER_MS),
      setTimeout(() => {
        setPose("perch");
        wx.value = g.perchX;
        wy.value = withSequence(withTiming(g.perchY + 3, { duration: 0 }), withTiming(g.perchY, { duration: SETTLE_MS, easing: E_OUT }));
        setIdle(true);
      }, START_MS + FLY_MS + HOVER_MS + LAND_MS),
    );
    return () => ids.forEach(clearTimeout);
    // once, as the scene mounts: the geometry and the shared values are fixed for its life
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // waiting: now and then the parcel shakes and she looks at it (none of it under Reduce Motion)
  useEffect(() => {
    if (!idle || opening || still) return;
    const ids: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, f: () => void) => ids.push(setTimeout(f, ms));
    const jiggle = () => {
      shake.value = withSequence(
        withTiming(-5, { duration: 70 }),
        withTiming(5, { duration: 90 }),
        withTiming(-4, { duration: 90 }),
        withTiming(3, { duration: 80 }),
        withTiming(0, { duration: 70 }),
      );
      setMood("curious");
      at(CURIOUS_MS, () => setMood((m) => (m === "curious" ? "content" : m)));
      at(between(SHAKE_EVERY), jiggle);
    };
    at(FIRST_SHAKE_MS, jiggle);
    return () => ids.forEach(clearTimeout);
  }, [idle, opening, still, shake]);

  // Update: everything to its place first (it may come mid-flight), then the bow, the flaps, the stars and her hop
  useEffect(() => {
    if (!opening) return;
    arrival.current.forEach(clearTimeout);
    for (const v of [wx, wy, px, py, shake, wobble]) cancelAnimation(v);
    wx.value = g.perchX;
    wy.value = g.perchY;
    px.value = g.restX;
    py.value = g.restY;
    shake.value = 0;
    wobble.value = 0;
    setPose("perch");
    setMood("delight");
    if (still) return;
    bow.value = withTiming(1, { duration: BOW_MS, easing: E_OUT });
    flaps.value = withDelay(FLAP_DELAY, withTiming(1, { duration: FLAP_MS, easing: E_POP }));
    burst.value = withDelay(STARS_DELAY, withTiming(1, { duration: STARS_MS, easing: LINEAR }));
    wy.value = withSequence(withTiming(g.perchY - 22, { duration: 200, easing: E_OUT }), withTiming(g.perchY - 4, { duration: 260, easing: E_IN }));
  }, [opening, still, g, wx, wy, px, py, shake, wobble, bow, flaps, burst]);

  const parcelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: px.value }, { translateY: py.value }, { rotate: `${shake.value + wobble.value}deg` }],
  }));
  const wrenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: wx.value }, { translateY: wy.value }, { rotate: `${shake.value}deg` }],
  }));
  // the parcel's shadow on the ground, smaller and fainter the higher it is
  const shadowStyle = useAnimatedStyle(() => {
    const h = Math.min(1, Math.max(0, (g.restY - py.value) / 160));
    return { opacity: 1 - 0.85 * h, transform: [{ translateX: px.value }, { scaleX: 1 - 0.55 * h }] };
  });
  const bowStyle = useAnimatedStyle(() => {
    const p = bow.value;
    return { opacity: 1 - p * p, transform: [{ translateX: 50 * p }, { translateY: -90 * p }, { rotate: `${240 * p}deg` }, { scale: 1 - 0.3 * p }] };
  });
  const flapL = useAnimatedStyle(() => ({ transform: [{ rotate: `${-120 * flaps.value}deg` }] }));
  const flapR = useAnimatedStyle(() => ({ transform: [{ rotate: `${120 * flaps.value}deg` }] }));

  const { dark } = useTheme();
  return (
    /* clipped, its top corners rounded inside the card's (34 at 18 under the card's top) */
    <View style={{ width, height: SCENE_H, overflow: "hidden", borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
      {/* the shadow */}
      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", left: 4, top: g.ground - 5, width: PW - 8, height: 10, borderRadius: 5, backgroundColor: dark ? "rgba(0,0,0,0.45)" : "rgba(30,27,53,0.12)" }, shadowStyle]}
      />

      {/* the body: front, inside, flaps and the stamp (the stamp is the one thing VoiceOver reads here) */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: PW, height: PH, transformOrigin: PARCEL_FOOT }, parcelStyle]}>
        <Svg {...FILL} viewBox={BOX_VIEW}>
          <Path d={TOP} fill={INSIDE} />
          <Path d={FRONT} fill={BOX} />
          <Path d={FRONT_SHADE} fill="#000" opacity={0.08} />
          <Path d={RIBBON_FRONT} fill={RIBBON} />
        </Svg>
        <Animated.View style={[FILL, { transformOrigin: [4, 26, 0] }, flapL]}>
          <Svg {...FILL} viewBox={BOX_VIEW}>
            <Path d={FLAP_L} fill={LID} />
            <Path d={RIBBON_L} fill={RIBBON} />
          </Svg>
        </Animated.View>
        <Animated.View style={[FILL, { transformOrigin: [116, 26, 0] }, flapR]}>
          <Svg {...FILL} viewBox={BOX_VIEW}>
            <Path d={FLAP_R} fill={LID} />
            <Path d={RIBBON_R} fill={RIBBON} />
          </Svg>
        </Animated.View>
        {version ? <VersionStamp version={version} /> : null}
      </Animated.View>

      {/* Wren */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: S, height: S, transformOrigin: g.perchOrigin }, wrenStyle]}>
        <WrenBird size={S} stage="wren" pose={pose} mood={pose === "fly" ? "content" : mood} letter={false} />
      </Animated.View>

      {/* the bow, over her feet: the same box as the body, moving with it */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: PW, height: PH, transformOrigin: PARCEL_FOOT }, parcelStyle]}>
        <Animated.View style={[FILL, { transformOrigin: [60, 26, 0] }, bowStyle]}>
          <Svg {...FILL} viewBox={BOX_VIEW}>
            <Bow />
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* the stars, out of the opening */}
      {STARS.map((s, i) => (
        <Star key={i} burst={burst} x={g.cx} y={g.restY + 14} {...s} />
      ))}
    </View>
  );
}

/* ── the sheet ─────────────────────────────────────────────────────────── */

/**
 * The update sheet. `force`: hard mode (no Later, no way to put it away). `demo`: the dev preview,
 * where Update plays everything but never opens the App Store; with `autoPlay` it also presses
 * Update by itself once she has settled, for a hands-free screen recording. `onLater`: put away
 * (soft mode only). `onUpdated`: the App Store was opened (or, in a demo, would have been).
 * `onShown`: the sheet is really on screen (the Modal's onShow; UIKit refuses a second Modal).
 */
export function UpdateSheet({
  open,
  version,
  force,
  demo = false,
  autoPlay = false,
  onShown,
  onLater,
  onUpdated,
}: {
  open: boolean;
  version: string | null;
  force: boolean;
  demo?: boolean;
  autoPlay?: boolean;
  onShown?: () => void;
  onLater: () => void;
  onUpdated: () => void;
}) {
  if (!open) return null;
  return <SheetBody version={version} force={force} demo={demo} autoPlay={demo && autoPlay} onShown={onShown} onLater={onLater} onUpdated={onUpdated} />;
}

function SheetBody({ version, force, demo, autoPlay, onShown, onLater, onUpdated }: { version: string | null; force: boolean; demo: boolean; autoPlay: boolean; onShown?: () => void; onLater: () => void; onUpdated: () => void }) {
  useLang(); // repaint when the reader changes language
  const P = useP();
  const { t: tk, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  const still = useReducedMotion();
  const width = win.width - 16; // sheetCard floats 8 in from each edge
  const [opening, setOpening] = useState(false);
  // hard mode sets the scene back on its parcel after each Update (a fresh scene, no fly-in)
  const [round, setRound] = useState(0);
  const busy = useRef(false);

  // the latest callbacks, for the timers and the gesture
  const cb = useRef({ onLater, onUpdated });
  cb.current = { onLater, onUpdated };
  const later = useCallback(() => cb.current.onLater(), []);

  const reset = useCallback(() => {
    busy.current = false;
    setOpening(false);
    setRound((r) => r + 1);
  }, []);

  // the sheet can go (the switch turned off) while the parcel is opening: nothing fires after it
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const update = () => {
    if (busy.current) return;
    busy.current = true;
    const go = () => {
      if (!demo) openAppStore();
      cb.current.onUpdated();
      // hard mode stays: by the time they are back from the App Store (or at once, if it never opened) she is on her parcel again
      if (force) timers.current.push(setTimeout(reset, RESET_MS));
    };
    if (still) return go();
    setOpening(true);
    timers.current.push(setTimeout(go, OPEN_MS));
  };

  // the dev preview's hands-free run: Update presses itself (demo only, so the App Store never opens)
  const autoUpdate = useRef(update);
  autoUpdate.current = update;
  useEffect(() => {
    if (!autoPlay) return;
    const id = setTimeout(() => autoUpdate.current(), AUTO_PLAY_MS);
    return () => clearTimeout(id);
  }, [autoPlay, round]);

  // pulled down by the grabber (soft mode): far or fast enough and it goes, else it springs back
  const drag = useSharedValue(0);
  const away = win.height;
  const dismiss = useCallback(() => {
    if (force || busy.current) return; // once Update is pressed the parcel is on its way
    if (still) return later();
    drag.value = withTiming(away, { duration: 220, easing: E_IN }, (done) => {
      if (done) runOnJS(later)();
    });
  }, [force, still, later, drag, away]);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!force && !opening)
        .activeOffsetY(8)
        .onUpdate((e) => {
          drag.value = Math.max(0, e.translationY);
        })
        .onEnd((e) => {
          if (e.translationY > 90 || e.velocityY > 900) {
            drag.value = withTiming(away, { duration: 200, easing: E_IN }, (done) => {
              if (done) runOnJS(later)();
            });
          } else drag.value = withSpring(0, SPRING_BACK);
        }),
    [force, opening, drag, away, later],
  );
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drag.value }] }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, drag.value / 400) }));

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onShow={onShown} onRequestClose={dismiss}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View accessibilityViewIsModal onAccessibilityEscape={force ? undefined : dismiss} style={{ flex: 1, justifyContent: "flex-end" }}>
          <Animated.View entering={FadeIn.duration(160)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
            <Animated.View style={[{ flex: 1 }, dimStyle]}>
              <Pressable onPress={dismiss} disabled={force} accessible={false} style={{ flex: 1, backgroundColor: scrimColor(dark, 0.3) }} />
            </Animated.View>
          </Animated.View>

          <Animated.View entering={still ? FadeIn.duration(200) : SlideInDown.duration(300)}>
            <GestureDetector gesture={pan}>
              <Animated.View style={[sheetCard(tk, 0), { paddingTop: 0, marginBottom: Math.max(insets.bottom - 26, 8) }, dragStyle]}>
                {/* the grabber says it can be pulled down; hard mode can't be, so it has none */}
                <View style={{ height: 18, alignItems: "center", justifyContent: "center" }}>
                  {force ? null : <View style={{ width: 36, height: 5, borderRadius: 2.5, backgroundColor: tk.line }} />}
                </View>

                <ParcelScene key={round} width={width} version={version} enter={round === 0} opening={opening} still={still} />

                <View style={{ paddingHorizontal: 24, paddingTop: 2 }}>
                  <Text accessibilityRole="header" maxFontSizeMultiplier={1.6} style={{ fontSize: 20, lineHeight: 25, fontWeight: "600", color: P.ink, textAlign: "center" }}>
                    {t("upd.title")}
                  </Text>
                  <Text maxFontSizeMultiplier={1.6} style={{ fontSize: 15, lineHeight: 21, color: P.ink60, textAlign: "center", paddingTop: 8 }}>
                    {t("upd.line")}
                  </Text>
                </View>

                <View style={{ paddingHorizontal: 16, paddingTop: 22, gap: 10 }}>
                  <Pressable onPress={update} accessibilityRole="button" accessibilityState={{ busy: opening }} style={({ pressed }) => sheetKey("primary", tk, P, dark, pressed)}>
                    <Text maxFontSizeMultiplier={1.4} style={sheetKeyLabel("primary", tk, P, dark)}>
                      {t("upd.update")}
                    </Text>
                  </Pressable>
                  {force ? null : (
                    <Pressable onPress={dismiss} disabled={opening} accessibilityRole="button" style={({ pressed }) => sheetKey("quiet", tk, P, dark, pressed)}>
                      <Text maxFontSizeMultiplier={1.4} style={sheetKeyLabel("quiet", tk, P, dark)}>
                        {t("upd.later")}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </Animated.View>
            </GestureDetector>
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

/* ── the banner ────────────────────────────────────────────────────────── */

/** The room the banner takes under the status bar: its 42 and the air above and below it. */
export const UPDATE_BANNER_ROOM = 52;

/** The slim bar on Today after Later: pinned `top` from the screen's top (the status bar's inset). */
export function UpdateBanner({ top, onPress }: { top: number; onPress: () => void }) {
  useLang();
  const { t: tk, dark } = useTheme();
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top, height: UPDATE_BANNER_ROOM, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6 }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${t("upd.banner")}, ${t("upd.update")}`}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingLeft: 12,
          paddingRight: 14,
          borderRadius: 14,
          borderCurve: "continuous",
          backgroundColor: tk.lav,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <ParcelGlyph size={26} />
        {/* the line gives way to the key: it shrinks before it would be cut ("Aktualisieren ›", "Atualizar ›"),
            and the bar's text grows with Dynamic Type only so far (1.15) that every language still fits at 375 */}
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} maxFontSizeMultiplier={1.15} style={{ flex: 1, fontSize: 15, color: tk.ink }}>
          {t("upd.banner")}
        </Text>
        {/* Midnight's ind on lav is 4.38:1, under AA for 15 pt: the key is ink there */}
        <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={{ flexShrink: 0, fontSize: 15, fontWeight: "600", color: dark ? tk.ink : tk.ind }}>
          {t("upd.banner.cta")}
        </Text>
      </Pressable>
    </View>
  );
}
