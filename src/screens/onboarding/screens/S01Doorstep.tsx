import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionSheetIOS, Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line } from "react-native-svg";
import { LaunchFrame, LaunchMarkArt, POST_BLUE, launchGeometry } from "../../../components/LaunchAnimation";
import { LANGS, setLang, t } from "../../../lib/i18n";
import { strangerName } from "../../../lib/stranger-name";
import { PF } from "../../../theme/post";
import { KeyArea } from "../parts/frame";
import * as haptics from "../parts/haptics";
import { AcidKey } from "../parts/keys";
import { EggArt, WarmthGlow } from "../parts/nest-egg";
import { EDGE, FONT, GUTTER, OB, SHADOW, TYPE } from "../parts/tokens";
import type { ObScreenProps } from "../types";
import {
  CARD_RADIUS,
  CARD_TILT,
  HEADLINE_H,
  PAGER_EGG,
  PAGER_GAP,
  WORD_LINE,
  WORD_SCALE,
  cardToWindow,
  doorLayout,
  heroRect,
  leaveDoorstepEgg,
} from "./s01-geometry";
import { LAND, ShowcaseCard, slide1StampBox } from "./s01-showcase";
import { LinkedLine, SignInSheet } from "./s01-signin";
import { SAMPLE_UID } from "./s06-envelope-front";
import "../../../data/strings-onboarding2";
import { OB_MAX_FONT } from "../parts/tokens";

/* 1 · THE DOORSTEP — the owner's full-screen product showcase, which opens
   out of the launch's last frame (storyboard §2, §4; owner 2026-10-18).
   ────────────────────────────────────────────────────────────────────────
   Top to bottom: the live card (three slides; s01-showcase) with its chip
   on the top edge, the slide's headline (two lines always reserved), the
   pager — three dots on a thin white ground line, and YOUR EGG standing on
   the active one, rolling to the next dot with your thumb, 1:1 — then
   "kindredly" and the app line, the acid key "Hatch my courier" (into the
   run, no account) and "Been here before? Sign in" (1a, s01-signin). No
   guest key: "Hatch my courier" already is the door without an account.

   EVERYTHING IS PLACED FROM THE WINDOW (s01-geometry doorLayout), not by
   flexbox, because the first frame has to know where things will END: the
   launch's mark flies to slide 1's stamp corner, the wordmark glides to the
   app line, the egg rolls to dot 1.

   THE HAND-OFF (§4), on one clock `hc` in ms, so it runs on the UI thread
   and a tap can finish it at once:
       0        the launch's last frame, pixel for pixel: Post Blue, the white
                mark at launchGeometry().mark, "kindredly", the tag, the mono
                line (LaunchAnimation's own type, copied)
       0–160    the tag and the mono line fade and drop 6
      80–520    the card rises from below, tilted −2°, on the launch's 4%
                back-out
     120–560    THE MARK COMES DOWN ONTO THE CARD: launch size → stamp size on
                a slight arc to the stamp corner. It carries a Post Blue plate
                the shape of a stamp's window (invisible on the ground, a
                piece of sky over the white card), which grows the last bit
                in the final 120 ms, and lands exactly on the window of the
                stamp drawn in the corner
       560      THUNK: the card dips 3 and back in 120, the light haptic (the
                launch crack's), the perforated paper snaps in round the
                window and the stamp settles at its small tilt. No postmark.
     300–700    "kindredly" glides down and shrinks to the app line's place;
                the app line fades in under it
     600–1250   the egg rolls in from off-screen right to dot 1 — one turn,
                so it arrives upright — and stops with two rocks, 6° then 3°
     760–1000   the chip pops onto the card; the line types from 800
     900–1200   headline, key and sign-in link rise 8 and fade in, 40 apart
     from 600   a tap anywhere completes it.
   `short` (a cold start that isn't the first) plays the same hand-off.
   `still` (Reduce Motion): screen 1 at rest under the launch's still frame,
   which cross-fades away in 220. No hand-off (back from 2, a dev jump):
   screen 1 at rest.

   WAITING FOR THE ROUTE. The launch hands over with router.replace, and the
   onboarding route fades in over it for 450 ms (app/_layout). Two copies of
   one frame cross-fade invisibly, so the doorstep HOLDS its first frame until
   that fade is done (the launch's note says when it handed over) — starting
   at once would show the launch's mark standing still under a moving one.
   For the same reason the runner mounts this screen without its usual 220 ms
   fade-in when it is the launch's next frame (Onboarding2: a fade from
   nothing would dip the mark while the route is still fading in).

   After the hand-off the slides auto-advance every 4.5 s; a touch on the
   card stops that for good, and so do Reduce Motion and the sign-in sheet.
   "Hatch my courier": the card, headline and keys slide down and fade while
   the egg rolls to the centre and grows into screen 2's hero (one element;
   screen 2 is drawn from the same numbers), then the run goes on. */

const END = LAND.end;

/* the launch's type (LaunchAnimation WORD_TYPE / TAG_TYPE / SUB_TYPE), copied so frame 0 is its frame */
const WORD_TYPE = { fontFamily: PF.letter, fontWeight: "800" as const, fontSize: 40, lineHeight: 46, letterSpacing: -1.4, color: "#FFFFFF" };
const TAG_TYPE = { fontFamily: PF.letterSerif, fontStyle: "italic" as const, fontSize: 18, lineHeight: 24, color: "#FFFFFF", textAlign: "center" as const };
const SUB_TYPE = { fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 2.6, color: "#FFFFFF", marginTop: 10, textAlign: "center" as const };

const seg = (x: number, a: number, b: number) => {
  "worklet";
  return Math.min(1, Math.max(0, (x - a) / (b - a)));
};
const eo = (x: number) => {
  "worklet";
  return 1 - Math.pow(1 - x, 3);
};
const eio = (x: number) => {
  "worklet";
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
/* the launch's own back-out: ~4% over, enough to land, not enough to bounce */
const backOut = (x: number) => {
  "worklet";
  return 1 + 2 * Math.pow(x - 1, 3) + Math.pow(x - 1, 2);
};

/* 900–1200: the headline, the key and the link rise 8 and fade in, each over 200 (and leave with the exit) */
const riseIn = (h: number, e: number, from: number) => {
  "worklet";
  const g = eo(seg(h, from, from + 200));
  return { opacity: g * (1 - e), transform: [{ translateY: 8 * (1 - g) + 24 * e }] };
};

/** Does the phone speak one of the nine? Only when it doesn't is the "English ▾" chip shown (§6 · 1 "Language"). */
function phoneLangIsOneOfOurs(): boolean {
  try {
    const tag = (Intl.DateTimeFormat().resolvedOptions().locale || "en").toLowerCase();
    return /^(en|es|pt|id|in|fr|de|it|ja|ko)(\b|[-_])/.test(tag);
  } catch {
    return true;
  }
}

type Entry = "full" | "still" | "rest";

export default function S01Doorstep(props: ObScreenProps) {
  const { width: sw, height: sh } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const L = useMemo(() => doorLayout(sw, sh, { top: insets.top, bottom: insets.bottom }), [sw, sh, insets.top, insets.bottom]);
  const G = useMemo(() => launchGeometry(sw, sh), [sw, sh]);
  const hero = useMemo(() => heroRect(sw, sh, { top: insets.top, bottom: insets.bottom }), [sw, sh, insets.top, insets.bottom]);

  /* how this screen opened, decided once */
  const [entry] = useState<Entry>(() => (!props.handoff ? "rest" : props.handoff.mode === "still" || reduce ? "still" : "full"));
  const [handedAt] = useState(() => props.handoff?.at ?? 0);
  const still = reduce || entry === "still";

  const hc = useSharedValue(entry === "full" ? 0 : END);
  const veil = useSharedValue(entry === "still" ? 1 : 0);
  const ex = useSharedValue(0); // the exit to screen 2
  const chipPop = useSharedValue(0);
  const scrollX = useSharedValue(0);
  const [seqDone, setSeqDone] = useState(entry !== "full");
  const [veilUp, setVeilUp] = useState(entry === "still");
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  pageRef.current = page;
  const [stopped, setStopped] = useState(false);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const leaving = useRef(false);

  const inner = { w: L.card.w - 2 * EDGE, h: L.card.h - 2 * EDGE };
  const finish = useCallback(() => setSeqDone(true), []);

  /* ── the hand-off: hold the first frame until the route's and the runner's fades are done, then play ── */
  useEffect(() => {
    if (entry === "rest") return;
    const wait = Math.max(60, handedAt + 470 - Date.now());
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => {
        if (entry === "full") {
          hc.value = withTiming(END, { duration: END, easing: Easing.linear }, (fin) => {
            if (fin) runOnJS(finish)();
          });
          timers.push(setTimeout(haptics.thunk, LAND.thunk));
        } else {
          veil.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) }, (fin) => {
            if (fin) runOnJS(setVeilUp)(false);
          });
        }
      }, wait),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* from 600 a tap anywhere completes the sequence at once */
  const completeNow = () => {
    if (hc.value < 600) return;
    cancelAnimation(hc);
    hc.value = END;
    finish();
  };

  /* ── the auto-advance: every 4.5 s, until a touch, Reduce Motion, or the sheet ── */
  useEffect(() => {
    if (!seqDone || still || stopped || props.side) return;
    const id = setInterval(() => {
      const next = (pageRef.current + 1) % 3;
      scrollRef.current?.scrollTo({ x: next * inner.w, y: 0, animated: true });
      setPage(next);
    }, 4500);
    return () => clearInterval(id);
  }, [seqDone, still, stopped, props.side, inner.w]);

  const popChip = useCallback(() => {
    chipPop.value = withSequence(withTiming(1, { duration: 110 }), withSpring(0, { damping: 9, stiffness: 220 }));
  }, [chipPop]);

  /* ── "Hatch my courier": the egg rolls to the centre and grows into 2's hero ── */
  const goOn = useCallback(() => {
    leaveDoorstepEgg();
    props.advance();
  }, [props]);
  const onHatch = () => {
    if (leaving.current) return;
    leaving.current = true;
    setStopped(true);
    if (still) {
      props.advance();
      return;
    }
    ex.value = withTiming(1, { duration: 480, easing: Easing.inOut(Easing.cubic) }, (fin) => {
      if (fin) runOnJS(goOn)();
    });
  };

  /* ── the layers, all from hc (and ex on the way out) ── */
  const M = G.mark.size;
  const c0 = { x: G.mark.x + M / 2, y: G.mark.y + M / 2 };
  const sb = slide1StampBox(inner.w, inner.h);
  const c1 = cardToWindow(L, EDGE + sb.x + sb.w / 2, EDGE + sb.y + sb.h / 2);
  const ctrl = { x: (c0.x + c1.x) / 2 - 56, y: Math.min(c0.y, c1.y) - 6 };
  const s1 = sb.w / M;
  const riseFrom = sh - L.card.y + 40;

  const traveller = useAnimatedStyle(() => {
    const p = seg(hc.value, LAND.travelFrom, LAND.thunk);
    const u = eio(p);
    const v = 1 - u;
    const x = v * v * c0.x + 2 * v * u * ctrl.x + u * u * c1.x;
    const y = v * v * c0.y + 2 * v * u * ctrl.y + u * u * c1.y;
    // it shrinks early (ease-out) while it travels evenly, so the window it carries is small by the time it crosses the card
    const k = 1 - Math.pow(1 - p, 2.2);
    return {
      opacity: hc.value < LAND.thunk ? 1 : 0,
      transform: [{ translateX: x - M / 2 }, { translateY: y - M / 2 }, { scale: 1 + (s1 - 1) * k }, { rotate: `${CARD_TILT * u}deg` }],
    };
  });
  const plate = useAnimatedStyle(() => ({ transform: [{ scale: 0.9 + 0.1 * eo(seg(hc.value, LAND.windowFrom, LAND.thunk)) }] }));
  const card = useAnimatedStyle(() => {
    const r = seg(hc.value, 80, 520);
    const t = hc.value;
    const dip = t > LAND.thunk && t < LAND.thunk + 120 ? 3 * Math.sin((Math.PI * (t - LAND.thunk)) / 120) : 0;
    return {
      opacity: (t < 80 ? 0 : 1) * (1 - ex.value),
      transform: [{ translateY: (1 - backOut(r)) * riseFrom + dip + 24 * ex.value }, { rotate: `${CARD_TILT}deg` }],
    };
  });
  const tag = useAnimatedStyle(() => {
    const g = eo(seg(hc.value, 0, 160));
    return { opacity: 1 - g, transform: [{ translateY: 6 * g }] };
  });
  const wordStart = G.wordTop + WORD_LINE / 2;
  const wordRest = L.wordTop + (WORD_LINE * WORD_SCALE) / 2;
  const word = useAnimatedStyle(() => {
    const g = eo(seg(hc.value, 300, 700));
    return { opacity: 1 - ex.value, transform: [{ translateY: (wordRest - wordStart) * g + 24 * ex.value }, { scale: 1 + (WORD_SCALE - 1) * g }] };
  });
  const appLine = useAnimatedStyle(() => {
    const g = eo(seg(hc.value, 500, 760));
    return { opacity: g * (1 - ex.value), transform: [{ translateY: 6 * (1 - g) + 24 * ex.value }] };
  });
  const pager = useAnimatedStyle(() => ({ opacity: seg(hc.value, 520, 760) * (1 - ex.value) }));
  const chip = useAnimatedStyle(() => {
    const g = seg(hc.value, 760, 1000);
    return { opacity: g * (1 - ex.value), transform: [{ translateY: 24 * ex.value }, { scale: (0.9 + 0.1 * backOut(g)) * (1 + 0.08 * chipPop.value) }] };
  });
  const headStyle = useAnimatedStyle(() => riseIn(hc.value, ex.value, 900));
  const keyStyle = useAnimatedStyle(() => riseIn(hc.value, ex.value, 940));
  const linkStyle = useAnimatedStyle(() => riseIn(hc.value, ex.value, 980));

  /* the egg: drawn at the hero's size and scaled down, so growing into screen 2 stays sharp */
  const H = hero.size;
  const eggCx = L.dots[0];
  const eggCy = L.egg.y + PAGER_EGG / 2;
  const heroCy = hero.y + H / 2;
  const rollFrom = sw + PAGER_EGG - L.dots[0];
  const egg = useAnimatedStyle(() => {
    const k = seg(hc.value, 600, 1050);
    const travel = rollFrom * (1 - eo(k));
    const prog = Math.min(2, Math.max(0, scrollX.value / inner.w));
    const kk = seg(hc.value, 1050, END);
    const rock = kk <= 0 || kk >= 1 ? 0 : (kk < 0.5 ? -6 : -3) * Math.sin(2 * Math.PI * kk);
    const e1 = eo(seg(ex.value, 0, 0.5));
    const e2 = eo(seg(ex.value, 0.3, 1));
    const toCentre = sw / 2 - (eggCx + prog * PAGER_GAP);
    const dx = travel + prog * PAGER_GAP + toCentre * e1;
    const rot = (travel / rollFrom) * 360 + prog * 360 + (toCentre / PAGER_GAP) * 360 * e1 + rock;
    const small = PAGER_EGG / H;
    return {
      opacity: hc.value >= 600 ? 1 : 0,
      transform: [{ translateX: dx }, { translateY: (heroCy - eggCy) * e2 }, { scale: small + (1 - small) * e2 }, { rotate: `${rot}deg` }],
    };
  });
  const eggTo = useAnimatedStyle(() => ({ opacity: eo(seg(ex.value, 0.3, 1)) }));
  const eggFrom = useAnimatedStyle(() => ({ opacity: 1 - eo(seg(ex.value, 0.3, 1)) }));
  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));

  const heads = [t("ob2.doorstep.s1.head"), t("ob2.doorstep.s2.head"), t("ob2.doorstep.s3.head")];
  // slide 2's chip names the sample stranger in the reader's language
  const them = useMemo(() => strangerName(SAMPLE_UID, { lang: props.lang, unsigned: "" }), [props.lang]);
  const chips = [t("ob2.doorstep.s1.chip"), t("ob2.doorstep.s2.chip", { name: them }), t("ob2.doorstep.s3.chip")];
  const showLang = useMemo(phoneLangIsOneOfOurs, []) === false;

  const pickLang = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: [...LANGS.map((l) => l.label), t("ob2.doorstep.langCancel")], cancelButtonIndex: LANGS.length },
      (i) => {
        if (i >= 0 && i < LANGS.length) setLang(LANGS[i].id);
      },
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* the launch's tag and mono line (they only leave) */}
      {entry === "full" && (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 24, right: 24, top: G.tagTop, alignItems: "center" }, tag]}>
          <Text maxFontSizeMultiplier={OB_MAX_FONT} style={TAG_TYPE}>{t("launch.tag")}</Text>
          <Text maxFontSizeMultiplier={OB_MAX_FONT} style={SUB_TYPE}>{t("launch.sub")}</Text>
        </Animated.View>
      )}

      {/* the headline: two lines reserved, crossfading with the slide */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: GUTTER, right: GUTTER, top: L.headTop, height: HEADLINE_H, justifyContent: "center" }, headStyle]}>
        <Animated.Text maxFontSizeMultiplier={OB_MAX_FONT}
          key={page}
          entering={FadeIn.duration(260)}
          exiting={FadeOut.duration(160)}
          accessibilityRole="header"
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={[TYPE.headline, { color: OB.white, textAlign: "center", position: "absolute", left: 0, right: 0 }]}
        >
          {heads[page]}
        </Animated.Text>
      </Animated.View>

      {/* the pager: the ground line and three dots (the egg is drawn over them below) */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: L.ground.y - 6, width: sw, height: 12 }, pager]}>
        <Svg width={sw} height={12}>
          <Line x1={L.ground.x0} y1={6} x2={L.ground.x1} y2={6} stroke={OB.white} strokeWidth={2} strokeLinecap="round" />
          {L.dots.map((x, i) => (
            <Circle key={i} cx={x} cy={6} r={i === page ? 4.5 : 3.5} fill={OB.white} />
          ))}
        </Svg>
      </Animated.View>

      {/* "kindredly" — the launch's, gliding down to the app line. Never scaled by the phone's
          text size, like the launch's own (LaunchAnimation): it is the logo, its box is a fixed
          WORD_LINE tall, and at a large text size a scaled word was cut off at the descender */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, top: G.wordTop, height: WORD_LINE, alignItems: "center" }, word]}>
        <Text maxFontSizeMultiplier={OB_MAX_FONT} allowFontScaling={false} style={WORD_TYPE}>kindredly</Text>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: GUTTER, right: GUTTER, top: L.appTop }, appLine]}>
        <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.lineSmall, { color: OB.white, textAlign: "center" }]} numberOfLines={2}>
          {t("ob2.doorstep.app")}
        </Text>
      </Animated.View>

      {/* the card: the hard shadow, the ink edge, the three slides */}
      <Animated.View style={[{ position: "absolute", left: L.card.x, top: L.card.y, width: L.card.w, height: L.card.h }, card]}>
        <View style={{ position: "absolute", left: SHADOW, top: SHADOW, width: L.card.w, height: L.card.h, borderRadius: CARD_RADIUS, backgroundColor: OB.ink }} />
        <View style={{ width: L.card.w, height: L.card.h, borderRadius: CARD_RADIUS, borderWidth: EDGE, borderColor: OB.ink, backgroundColor: OB.paper, overflow: "hidden" }}>
          <ShowcaseCard
            w={inner.w}
            h={inner.h}
            page={page}
            scrollX={scrollX}
            scrollRef={scrollRef}
            onSettle={(i) => setPage(Math.max(0, Math.min(2, i)))}
            onTouch={() => setStopped(true)}
            hc={hc}
            firstFromLaunch={entry === "full"}
            still={still}
            lang={props.lang}
            now={props.now}
            onChipPop={popChip}
          />
        </View>
      </Animated.View>

      {/* the chip on the card's top edge */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: L.card.x, width: L.card.w, top: L.card.y - 14, height: 28, alignItems: "center" }, chip]}>
        <Animated.View key={page} entering={FadeIn.duration(220)} exiting={FadeOut.duration(140)} style={{ position: "absolute", flexDirection: "row", alignItems: "center", height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: OB.ink }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: OB.acid, marginRight: 7 }} />
          <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={1} style={{ fontFamily: FONT.semi, fontSize: 12.5, color: OB.white }}>
            {chips[page]}
          </Text>
        </Animated.View>
      </Animated.View>

      {/* your egg, on the active dot */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: eggCx - H / 2, top: eggCy - H / 2, width: H, height: H }, egg]}>
        <Animated.View style={[{ position: "absolute", left: -H * 0.25, top: -H * 0.25 }, eggTo]}>
          <WarmthGlow size={H * 1.5} heat={0} />
        </Animated.View>
        <Animated.View style={[{ position: "absolute" }, eggFrom]}>
          <EggArt shell={null} size={H} gid="ob2-door-egg" />
        </Animated.View>
        <Animated.View style={[{ position: "absolute" }, eggTo]}>
          <EggArt shell={props.draft.shell} size={H} gid="ob2-door-egg-shell" />
        </Animated.View>
      </Animated.View>

      {/* the keys: "Hatch my courier", "Been here before? Sign in" */}
      <KeyArea
        style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
        primary={
          <Animated.View style={keyStyle}>
            <AcidKey label={t("ob2.doorstep.key")} onPress={onHatch} />
          </Animated.View>
        }
        secondary={
          <Animated.View style={linkStyle}>
            <Pressable onPress={() => props.openSide("signin")} hitSlop={8} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12 }}>
              <LinkedLine text={t("ob2.doorstep.signin")} style={[TYPE.textKey, { color: OB.white, textAlign: "center" }]} linkStyle={{ fontFamily: FONT.bold }} onLink={() => props.openSide("signin")} />
            </Pressable>
          </Animated.View>
        }
      />

      {/* the language, only when the phone's isn't one of the nine */}
      {showLang && (
        <Pressable
          onPress={pickLang}
          accessibilityRole="button"
          accessibilityLabel={t("ob2.doorstep.lang")}
          style={{ position: "absolute", top: insets.top + 6, right: 16, height: 30, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1.5, borderColor: OB.white, justifyContent: "center" }}
        >
          <Text maxFontSizeMultiplier={OB_MAX_FONT} style={{ fontFamily: FONT.semi, fontSize: 13, color: OB.white }}>{(LANGS.find((l) => l.id === props.lang)?.label ?? "English") + " ▾"}</Text>
        </Pressable>
      )}

      {/* the launch's mark, flying to the stamp corner (frame 0: exactly where the launch left it) */}
      {entry === "full" && (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: M, height: M }, traveller]}>
          <Animated.View style={[{ position: "absolute", left: M * 0.1, top: 0, width: M * 0.8, height: M, backgroundColor: POST_BLUE }, plate]} />
          <LaunchMarkArt size={M} color="#FFFFFF" />
        </Animated.View>
      )}

      {/* Reduce Motion: the launch's still frame, cross-fading away in 220 */}
      {veilUp && (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }, veilStyle]}>
          <LaunchFrame />
        </Animated.View>
      )}

      {/* during the hand-off a tap completes it (from 600 ms) */}
      {!seqDone && <Pressable accessible={false} onPress={completeNow} style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }} />}

      {props.side === "signin" && <SignInSheet props={props} />}
    </View>
  );
}
