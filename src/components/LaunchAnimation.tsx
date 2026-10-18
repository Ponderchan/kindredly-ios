import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Application from "expo-application";
import Animated, { Easing, runOnJS, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { StatusBar } from "expo-status-bar";
import { PF } from "../theme/post";
import { t } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import type { ThemeTokens } from "../theme/themes";

/* THE LAUNCH — the egg hatches into the mark (owner, 2026-09-24: logo C,
   launch 2c, "按照你的最强能力").
   ────────────────────────────────────────────────────────────────────────
   The mark IS a hatched egg — two commas and the dot between them — so the
   launch is the one moment that explains it: a whole egg with a gold dot
   rocks twice, two cracks draw in where the mark's gaps will be, the two
   pieces fly off carrying their cracks, the broken ends swell into the two
   comma heads, and the dot settles from gold to ink. Then the wordmark.
   The bird is not in it any more; she hatches in onboarding, as yours.

   Three ways to play, because most cold starts are someone coming back:
     full   the hatch — first launch, and the first launch after an update
     short  the finished mark fades in and the app follows (≈0.5 s)
     still  Reduce Motion: the finished mark, no movement
   The piece rests, completely still, on the finished mark until the
   session is known, then fades — it never loops, since a mark that looks
   the same turned half round would read as a spinner. A tap skips once
   the heads have landed.

   What the design review changed from the sheet: no jitter on the dot (a
   trembling bird was already called a bug), two swings instead of three
   and smaller, the cracks draw in and leave with their pieces instead of
   blinking, the pops are staggered, and the heads grow out of the stroke
   ends rather than appearing from nothing.

   Everything moves on the UI thread (one clock, derived per layer), so a
   JS thread busy with the session and the first screen can't drop frames.
   Drawn on the native splash's colour (Post Blue #5B55FF since 2026-10-19,
   see below), so nothing flashes.
   (Pivots are given in points: React Native's transformOrigin string
   parser misreads a decimal percentage such as "79.6%".)

   THE SAME IN EVERY THEME (10a), as designed. The native splash can't
   follow the theme — its colour is baked into the binary, and the saved
   theme isn't read until JS runs — so the piece that continues it doesn't
   either: one fixed ground and fixed inks in every light theme. The first
   screen fades in over it in the theme's own colours.

   POST BLUE AND WHITE (the new onboarding's storyboard §3–§4, owner
   2026-10-18: "启动屏换图标蓝"). The ground was lavender (#ECECFE) with the
   mark in indigo, so every cold start zoomed a blue icon into a lavender
   splash — a seam. Now the ground is the icon's own blue, sampled from
   assets/icon.png (#5B55FF), and the mark, the word and the line under it
   are pure white (5.0:1; no faded white for small type on this blue): the
   dot still settles from gold to ink, and ink is white, so the last frame
   IS the app icon. The cracks are still cut in the ground's colour. The
   native splash (ios/…/SplashScreenBackground.colorset, the storyboard's
   named colour, Info.plist's RCTRootViewBackgroundColor and app.json) was
   changed by hand to match, in the same change. The status bar's text is
   light on it (StatusBar below).

   THE HAND-OFF TO THE NEW ONBOARDING. Its first screen mounts with this
   piece's last frame — the same pixels — and opens out of it: the mark
   comes down onto the first card and becomes its stamp. So the geometry is
   exported (launchGeometry: the mark's place and size, the word's and the
   line's tops, in window points), the finished mark is a component of its
   own (LaunchMarkArt), the whole last frame is one too (LaunchFrame, for
   any frame drawn before the next screen is ready), and the piece leaves a
   note as it hands over (takeLaunchHandoff: how it played, once, read by
   that screen). The old onboarding and Today simply fade in over it, as
   before.

   THE NIGHT SET (step 7.1; the owner's rule for the release: what is best for
   the user). On a dark phone the launch turns night, so a cold start at
   night doesn't light the room lavender: Midnight's ground, the mark in
   tk.ink — the pale lavender the dark app icon draws it in (15.4:1) — the
   word in ink and the line under it in sub (9.6:1); the gold dot stays gold
   and the cracks are still cut in the ground's colour. The splash's dark
   variant (expo-splash-screen "dark": Midnight's bg) goes into app.json in
   the binary that turns DARK_READY on and userInterfaceStyle "automatic" —
   one without the other is a lavender splash then night, or night then
   lavender, at every cold start on a dark phone (lib/theme's release note).
   Until then only the dev theme switch can play it (DARK_READY off keeps
   the theme light). Which set plays is decided once, at mount, by the
   theme the app starts on — before the saved pick is read, that is Match
   system (the default) and the phone's scheme, the rule the splash
   follows. A saved pick read a moment later doesn't change it, so the
   piece never switches grounds half-way; the first screen brings the
   theme. */

const GOLD = "#D8A63F";
/** The app icon's blue (assets/icon.png), the native splash's and the launch's ground by day. */
export const POST_BLUE = "#5B55FF";
type Inks = { bg: string; ink: string; word: string; mute: string; night: boolean };
/* by day: the fixed set, whatever the light theme — white on the icon's blue,
   so the last frame is the icon itself (the lavender set was
   { bg #ECECFE, ink #3A34D6, word #1E1B35, mute #55506E }) */
const DAY: Inks = { bg: POST_BLUE, ink: "#FFFFFF", word: "#FFFFFF", mute: "#FFFFFF", night: false };

/** The launch's colours for a theme: the fixed day set in every light
    theme, Midnight's own tokens in Midnight (drafted, awaiting the owner —
    above). The entry route's stack ground (app/_layout) reads its bg from
    here too, so the two can't part. */
export function launchInks(dark: boolean, tk: ThemeTokens): Inks {
  return dark ? { bg: tk.bg, ink: tk.ink, word: tk.ink, mute: tk.sub, night: true } : DAY;
}

/* the mark, on its own 1024 grid (logos/c-mark.svg) */
const ARC_L = "M394.6 767.2 C300 707 262 620 262 514 C262 360 346 244 451.5 209.5";
const ARC_R = "M629.4 237.5 C714 298 762 400 762 525 C762 660 680 760 572.5 791.7";
const FRAG_T = "M451.5 209.5 Q540 186 629.4 237.5";
const FRAG_B = "M572.5 791.7 Q480 815 394.6 767.2";
const CRACK_T = "M470 214 L500 250 L528 208 L560 246 L590 222";
const CRACK_B = "M552 790 L522 752 L494 796 L462 758 L430 778";
const CRACK_LEN = 200;
const STROKE = 84;
const HEAD = 96;
const CAP = STROKE / 2; // a head starts as the stroke's own round end

/* the full piece, in seconds */
const END = 2.0;
const SKIP_FROM = 1.35;
/* every other open plays the hatch's second half: from the moment the shell
   breaks (the pieces leave, the heads grow, the dot turns gold to ink, the
   word comes in) — about a second, so an ordinary open is alive, not a still
   fade (owner, 2026-09-26: "启动页那里没有动画效果") */
const SHORT_FROM = 0.98;
const SEEN_KEY = "kindredly_launch_seen";
export type LaunchMode = "full" | "short" | "still";
type Mode = LaunchMode;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const seg = (t: number, a: number, b: number) => {
  "worklet";
  return Math.min(1, Math.max(0, (t - a) / (b - a)));
};
const eo = (x: number) => {
  "worklet";
  return 1 - Math.pow(1 - x, 3);
};
/* a small overshoot, ~4% — enough to land, not enough to bounce */
const backOut = (x: number) => {
  "worklet";
  const c = 1;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};

let Haptics: typeof import("expo-haptics") | null = null;
try {
  Haptics = require("expo-haptics");
} catch {}
const crackTap = () => {
  try {
    void Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
};

/* the version AND the build: a new build of the same version is still an
   update (1.2.1 went out as builds 23, 24, 25 — keyed on "1.2.1" alone, a
   tester never saw the hatch again) */
const version = () => `${Constants.expoConfig?.version ?? "0"}+${Application.nativeBuildVersion ?? "0"}`;

export function LaunchAnimation({ ready, onDone, force }: { ready: boolean; onDone: () => void; force?: Mode }) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode | null>(force ?? null);
  // the ground the app starts on, kept for the whole piece (see above)
  const { dark, t: tk } = useTheme();
  const [inks] = useState(() => launchInks(dark, tk));

  /* first launch, or the first after an update, gets the hatch */
  useEffect(() => {
    if (force) return;
    if (reduce) {
      setMode("still");
      return;
    }
    let alive = true;
    AsyncStorage.getItem(SEEN_KEY)
      .then((v) => {
        if (!alive) return;
        const fresh = v !== version();
        setMode(fresh ? "full" : "short");
        if (fresh) void AsyncStorage.setItem(SEEN_KEY, version()).catch(() => {});
      })
      .catch(() => alive && setMode("short"));
    return () => {
      alive = false;
    };
  }, [force, reduce]);

  /* the piece mounts only once it knows how to play, so every animated
     style's first frame is the right one (a style first computed with no
     mode drew the wordmark at full opacity for a frame before the hatch).
     The status bar's text follows the piece's ground, not the theme's: both
     grounds are dark now (Post Blue by day, Midnight's at night), so it is
     light on both, whatever the saved pick turns out to be. The root sets no
     style (app/_layout leaves the bar to iOS), so this one holds while the
     piece is up */
  return (
    <>
      <StatusBar style="light" />
      {mode ? <Piece mode={mode} ready={ready} onDone={onDone} inks={inks} /> : <View style={{ flex: 1, backgroundColor: inks.bg }} />}
    </>
  );
}

function Piece({ mode, ready, onDone, inks }: { mode: Mode; ready: boolean; onDone: () => void; inks: Inks }) {
  const { bg: BG, ink: INK, word: WORD, mute: MUTE } = inks;
  const { width: sw, height: sh } = useWindowDimensions();
  const [canLeave, setCanLeave] = useState(false);
  const leaving = useRef(false);

  const time = useSharedValue(0); // the piece's clock, seconds
  const veil = useSharedValue(0); // short / still: the whole finished frame fades in

  const finished = useCallback(() => setCanLeave(true), []);
  useEffect(() => {
    if (mode === "full") {
      time.value = 0;
      time.value = withTiming(END, { duration: END * 1000, easing: Easing.linear }, (fin) => {
        if (fin) runOnJS(finished)();
      });
      const id = setTimeout(crackTap, 980);
      return () => clearTimeout(id);
    }
    if (mode === "short") {
      time.value = SHORT_FROM;
      time.value = withTiming(END, { duration: (END - SHORT_FROM) * 1000, easing: Easing.linear }, (fin) => {
        if (fin) runOnJS(finished)();
      });
      return;
    }
    time.value = END; // still: everything at rest, finished, faded in
    veil.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    const id = setTimeout(finished, 600);
    return () => clearTimeout(id);
  }, [mode, time, veil, finished]);

  /* leave once the piece has landed and the session is known. It doesn't
     fade itself out any more: it holds its last frame and the next screen
     fades in over it (app/index, the stack's "fade" on (tabs) and
     onboarding) — one dissolve from the mark to the letters, instead of a
     fade to empty lavender and a page sliding in from the right (owner,
     2026-09-24: "我要一种正常的打开方式"). */
  useEffect(() => {
    if (!canLeave || !ready || leaving.current) return;
    leaving.current = true;
    landed = { mode, at: Date.now() }; // the note the new onboarding's first screen reads (takeLaunchHandoff)
    onDone();
  }, [canLeave, ready, onDone, mode]);

  const skip = () => {
    if (mode === "full" && time.value >= SKIP_FROM) setCanLeave(true);
  };

  /* ── the layers, each derived from the one clock ── */
  const geo = launchGeometry(sw, sh);
  const MARK = geo.mark.size;
  const k = MARK / 1024;
  const markTop = geo.mark.y;

  const whole = useAnimatedStyle(() => {
    const tt = time.value;
    if (mode === "still") {
      return { opacity: veil.value, transform: [{ scale: 1 }, { rotate: "0deg" }] };
    }
    if (mode === "short") {
      // the cracked egg comes up out of the splash in a blink, then breaks
      const e = eo(seg(tt, SHORT_FROM, SHORT_FROM + 0.14));
      return { opacity: e, transform: [{ scale: 0.97 + 0.03 * e }, { rotate: "0deg" }] };
    }
    const e = eo(seg(tt, 0, 0.3));
    const u = seg(tt, 0.3, 0.95);
    // two swings on the egg's base, gathering and settling — no jitter
    const rock = tt > 0.3 && tt < 0.95 ? 6 * Math.sin(u * Math.PI * 4) * Math.sin(u * Math.PI) : 0;
    return { opacity: e, transform: [{ scale: 0.82 + 0.18 * e }, { rotate: `${rock}deg` }] };
  });
  const fragTop = useAnimatedStyle(() => {
    const f = eo(seg(time.value, 0.98, 1.4));
    return { opacity: 1 - f, transform: [{ translateX: 140 * k * f }, { translateY: -190 * k * f }, { rotate: `${40 * f}deg` }] };
  });
  const fragBot = useAnimatedStyle(() => {
    const f = eo(seg(time.value, 0.98, 1.4));
    return { opacity: 1 - f, transform: [{ translateX: -140 * k * f }, { translateY: 190 * k * f }, { rotate: `${40 * f}deg` }] };
  });
  const crack = useAnimatedProps(() => ({
    strokeDashoffset: CRACK_LEN * (1 - seg(time.value, 0.8, 0.98)),
    strokeOpacity: time.value >= 0.8 ? 1 : 0,
  }));
  const head = useAnimatedProps(() => ({ r: CAP + (HEAD - CAP) * backOut(seg(time.value, 1.0, 1.32)) }));
  const dotR = (tt: number) => {
    "worklet";
    return 44 * (1 + 0.1 * Math.sin(Math.PI * seg(tt, 0.3, 0.95)) + 0.18 * Math.sin(Math.PI * seg(tt, 1.22, 1.55)));
  };
  const dotGold = useAnimatedProps(() => ({ r: dotR(time.value), fillOpacity: 1 - seg(time.value, 1.3, 1.55) }));
  const dotInk = useAnimatedProps(() => ({ r: dotR(time.value), fillOpacity: seg(time.value, 1.3, 1.55) }));
  const word = useAnimatedStyle(() => {
    const w = mode !== "still" ? eo(seg(time.value, 1.35, 1.8)) : veil.value;
    return { opacity: w, transform: [{ translateY: 8 * (1 - w) }] };
  });
  const tag = useAnimatedStyle(() => {
    const g = mode !== "still" ? eo(seg(time.value, 1.5, 1.95)) : veil.value;
    return { opacity: g, transform: [{ translateY: 6 * (1 - g) }] };
  });

  const box = { position: "absolute" as const, left: 0, top: 0, width: MARK, height: MARK };
  return (
    /* the ground stays; only what is on it fades — fading the ground too
       passed through the white of the route underneath */
    <View style={{ flex: 1, backgroundColor: BG }}>
    <View style={{ flex: 1 }}>
      <Pressable onPress={skip} accessible accessibilityRole="image" accessibilityLabel="Kindredly" style={{ flex: 1 }}>
        <Animated.View style={[{ position: "absolute", left: (sw - MARK) / 2, top: markTop, width: MARK, height: MARK, transformOrigin: [MARK * 0.5, MARK * 0.796, 0] }, whole]}>
          {/* the two commas and the dot — what the egg becomes */}
          <Svg style={box} width={MARK} height={MARK} viewBox="0 0 1024 1024">
            <Path d={ARC_L} fill="none" stroke={INK} strokeWidth={STROKE} strokeLinecap="round" />
            <Path d={ARC_R} fill="none" stroke={INK} strokeWidth={STROKE} strokeLinecap="round" />
            <AnimatedCircle cx={394.6} cy={767.2} fill={INK} animatedProps={head} />
            <AnimatedCircle cx={629.4} cy={237.5} fill={INK} animatedProps={head} />
            <AnimatedCircle cx={512} cy={520} fill={GOLD} animatedProps={dotGold} />
            <AnimatedCircle cx={512} cy={520} fill={INK} animatedProps={dotInk} />
          </Svg>
          {/* the two pieces of shell that close it into an egg, each with its crack */}
          {mode !== "still" && (
            <>
              <Animated.View pointerEvents="none" style={[box, { transformOrigin: [MARK * 0.527, MARK * 0.205, 0] }, fragTop]}>
                <Svg width={MARK} height={MARK} viewBox="0 0 1024 1024">
                  <Path d={FRAG_T} fill="none" stroke={INK} strokeWidth={STROKE} strokeLinecap="round" />
                  <AnimatedPath d={CRACK_T} fill="none" stroke={BG} strokeWidth={36} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[CRACK_LEN, CRACK_LEN]} animatedProps={crack} />
                </Svg>
              </Animated.View>
              <Animated.View pointerEvents="none" style={[box, { transformOrigin: [MARK * 0.469, MARK * 0.781, 0] }, fragBot]}>
                <Svg width={MARK} height={MARK} viewBox="0 0 1024 1024">
                  <Path d={FRAG_B} fill="none" stroke={INK} strokeWidth={STROKE} strokeLinecap="round" />
                  <AnimatedPath d={CRACK_B} fill="none" stroke={BG} strokeWidth={36} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[CRACK_LEN, CRACK_LEN]} animatedProps={crack} />
                </Svg>
              </Animated.View>
            </>
          )}
        </Animated.View>

        {/* the wordmark, then the line under it — the app's nine languages. The wordmark is a
            logo, not a line of reading: it keeps its size at every text size (allowFontScaling
            off), so the line under it, placed a fixed 88pt below the mark, never runs into it,
            and the new onboarding's first screen (which draws the same word in a fixed box and
            glides it down) starts from exactly these pixels whatever the phone's text size */}
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, top: geo.wordTop, alignItems: "center" }, word]}>
          <Text allowFontScaling={false} style={WORD_TYPE(WORD)}>kindredly</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 24, right: 24, top: geo.tagTop, alignItems: "center" }, tag]}>
          <Text style={TAG_TYPE(MUTE)}>{t("launch.tag")}</Text>
          <Text style={SUB_TYPE(INK)}>{t("launch.sub")}</Text>
        </Animated.View>
      </Pressable>
    </View>
    </View>
  );
}

/* ── THE HAND-OFF (the new onboarding's screen 1 continues this frame) ── */

/** Where the finished frame's pieces sit, in window points (the piece fills the window, no safe area). */
export type LaunchGeometry = {
  /** the mark's box: left, top and side, the side min(38% of the width, 156) */
  mark: { x: number; y: number; size: number };
  /** the top of the "kindredly" wordmark's line box */
  wordTop: number;
  /** the top of the line under it (launch.tag, then launch.sub) */
  tagTop: number;
};

/** The finished frame's layout for a window: the mark centred 40% down, the word 30pt under it, the line 88pt under it. */
export function launchGeometry(sw: number, sh: number): LaunchGeometry {
  const size = Math.min(sw * 0.38, 156);
  const y = sh * 0.4 - size / 2;
  return { mark: { x: (sw - size) / 2, y, size }, wordTop: y + size + 30, tagTop: y + size + 88 };
}

/* the type of the word and the line, shared by the piece and the still frame */
const WORD_TYPE = (color: string) => ({ fontFamily: PF.letter, fontWeight: "800" as const, fontSize: 40, lineHeight: 46, letterSpacing: -1.4, color });
const TAG_TYPE = (color: string) => ({ fontFamily: PF.letterSerif, fontStyle: "italic" as const, fontSize: 18, lineHeight: 24, color, textAlign: "center" as const });
const SUB_TYPE = (color: string) => ({ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 2.6, color, marginTop: 10, textAlign: "center" as const });

/** The finished mark — two commas and the dot — at `size`, in one colour (white on Post Blue: the icon). */
export function LaunchMarkArt({ size, color = "#FFFFFF", dot }: { size: number; color?: string; dot?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Path d={ARC_L} fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
      <Path d={ARC_R} fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
      <Circle cx={394.6} cy={767.2} r={HEAD} fill={color} />
      <Circle cx={629.4} cy={237.5} r={HEAD} fill={color} />
      <Circle cx={512} cy={520} r={44} fill={dot ?? color} />
    </Svg>
  );
}

/**
 * The piece's last frame, still: the ground, the mark, the word and the line,
 * pixel for pixel where the piece leaves them (day inks; Midnight's on a dark
 * start, as the piece decides). For a route that must show something before
 * its own first frame is ready, so the hand-off never blinks.
 */
export function LaunchFrame({ word = true, tag = true }: { word?: boolean; tag?: boolean }) {
  const { width: sw, height: sh } = useWindowDimensions();
  const { dark, t: tk } = useTheme();
  const [inks] = useState(() => launchInks(dark, tk));
  const g = launchGeometry(sw, sh);
  return (
    <View style={{ flex: 1, backgroundColor: inks.bg }}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={{ position: "absolute", left: g.mark.x, top: g.mark.y }}>
        <LaunchMarkArt size={g.mark.size} color={inks.ink} />
      </View>
      {word && (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: g.wordTop, alignItems: "center" }}>
          <Text allowFontScaling={false} style={WORD_TYPE(inks.word)}>kindredly</Text>
        </View>
      )}
      {tag && (
        <View pointerEvents="none" style={{ position: "absolute", left: 24, right: 24, top: g.tagTop, alignItems: "center" }}>
          <Text style={TAG_TYPE(inks.mute)}>{t("launch.tag")}</Text>
          <Text style={SUB_TYPE(inks.ink)}>{t("launch.sub")}</Text>
        </View>
      )}
    </View>
  );
}

/** How the launch played as it handed over, for the screen that continues it. */
export type LaunchHandoff = { mode: LaunchMode; at: number };
let landed: LaunchHandoff | null = null;

/**
 * The note the launch left as it handed over (how it played, and when), ONCE:
 * the first caller gets it and it is gone, so a later visit to the same screen
 * (back from 2, a dev jump) opens at rest instead of replaying the landing.
 * Older than five seconds counts as none (the route took too long to be the
 * next frame). DEV: `devLaunchHandoff` puts one back, to replay the landing.
 */
export function takeLaunchHandoff(now = Date.now()): LaunchHandoff | null {
  const h = landed;
  landed = null;
  return h && now - h.at < 5000 ? h : null;
}
/** DEV ONLY: leave a hand-off note as if the launch had just played in `mode` (the dev entry's "from launch" chip). */
export function devLaunchHandoff(mode: LaunchMode = "full"): void {
  if (__DEV__) landed = { mode, at: Date.now() };
}
