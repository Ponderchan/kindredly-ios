import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Line, Path, Rect } from "react-native-svg";
import { BigType, Finger, MiniScreen, Pop, Rise, useLoop, useOnce, useStep, type Reel } from "./kit";
import { Envelope, Kindreds, Me, Notes } from "../PostTabBar";
import { Seal } from "../Seal";
import { WrenBird } from "../WrenBird";
import { P, PF } from "../../theme/post";
import { t } from "../../lib/i18n";

/* THE SEALED JOURNAL, AS A REEL — the Notes tab is tapped and a page is
   written; the page folds and Wren's seal is pressed on it; it tries to
   rise to the cloud and can't, while the courier dozes beside it; it lies
   inside the phone, and only there; the title. Everything is drawn at the
   square's own size from the product's parts: the tab bar's real icons,
   the Seal, Wren herself. */

const RM = ReduceMotion.System;
const INK = "#5B5776"; // the tab bar's quiet ink (PostTabBar)
const FLAP = "#F6F5FC"; // the back of the page, a shade under white
const EASE_IO = Easing.inOut(Easing.cubic);
const EASE_OUT = Easing.out(Easing.cubic);
const EASE_BACK = Easing.out(Easing.back(1.3));
const LINES = [0.94, 0.78, 0.88, 0.52];

/* THE PAGE, ONE GEOMETRY FOR SCENES 1 AND 2 — so the fold starts from the
   very page that was just written. Everything is placed, not flowed: a
   title and four ruled lines, evenly spaced, two above the crease (at half
   the height) and two below it, none of them straddling it. Offsets are
   from the page's top inside its border. */
const pageOf = (s: number) => {
  const w = s * 0.76;
  const h = s * 0.52;
  const inset = s * 0.06;
  return {
    w,
    h,
    hh: h / 2,
    top: s * 0.15,
    inset,
    inner: w - 3 - inset * 2, // the borders are 1.5 a side
    titleTop: s * 0.045,
    titleSize: s * 0.07,
    titleLine: s * 0.085,
    rowTop: s * 0.16, // rows at .16 .225 | .29 .355 — the crease is at .26
    row: s * 0.065,
  };
};
const BAR_H = 0.018; // a written line's thickness, × s

const fill = { position: "absolute" as const, left: 0, top: 0, right: 0, bottom: 0 };
const label = (s: number) => ({ fontFamily: PF.monoSemi, fontSize: s * 0.042, letterSpacing: s * 0.004, color: P.ink, textAlign: "center" as const });
const paper = (s: number) => ({ backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "rgba(17,17,19,0.16)" as string, borderRadius: s * 0.03 });

/* a written line, already there, at `top` inside its half */
function Bar({ s, w, top, left }: { s: number; w: number; top: number; left: number }) {
  return <View style={{ position: "absolute", left, top, width: w, height: s * BAR_H, borderRadius: (s * BAR_H) / 2, backgroundColor: P.ink }} />;
}

/* the page's title, placed */
function PageTitle({ s }: { s: number }) {
  const g = pageOf(s);
  return (
    <Text numberOfLines={1} style={{ position: "absolute", left: g.inset, right: g.inset, top: g.titleTop, fontFamily: PF.letter, fontSize: g.titleSize, lineHeight: g.titleLine, fontWeight: "700", color: P.ink }}>
      {t("tab.notes")}
    </Text>
  );
}

/* ── 1. the Notes tab, tapped; a page opens and is written ── */
const TAP = 700;

function TypedLine({ p, i, w, s, row }: { p: SharedValue<number>; i: number; w: number; s: number; row: number }) {
  const st = useAnimatedStyle(() => ({ width: Math.min(1, Math.max(0, p.value - i)) * LINES[i] * w }));
  return <Animated.View style={[{ position: "absolute", left: 0, top: i * row, height: s * BAR_H, borderRadius: (s * BAR_H) / 2, backgroundColor: P.ink }, st]} />;
}

function Typing({ s, w, delay, ms }: { s: number; w: number; delay: number; ms: number }) {
  const n = LINES.length;
  const p = useStep(n, ms / n, delay);
  const blink = useLoop(320);
  const row = pageOf(s).row;
  const ch = s * 0.05;
  const caret = useAnimatedStyle(() => {
    const i = Math.min(n - 1, Math.floor(p.value));
    const f = p.value >= n ? 1 : p.value - i;
    const typing = p.value > 0 && p.value < n;
    return {
      opacity: typing ? 1 : blink.value > 0.5 ? 1 : 0,
      transform: [{ translateX: f * LINES[i] * w + s * 0.006 }, { translateY: i * row }],
    };
  });
  return (
    <View style={{ width: w, height: row * n }}>
      {LINES.map((_, i) => (
        <TypedLine key={i} p={p} i={i} w={w} s={s} row={row} />
      ))}
      <Animated.View style={[{ position: "absolute", left: 0, top: (s * BAR_H - ch) / 2, width: s * 0.008, height: ch, borderRadius: s * 0.004, backgroundColor: P.pen }, caret]} />
    </View>
  );
}

function TapNotes({ s }: { s: number }) {
  const barL = s * 0.07;
  const barW = s * 0.86;
  const barT = s * 0.76;
  const barH = s * 0.16;
  const slot = barW / 5;
  const icon = s * 0.1;
  const g = pageOf(s);
  // explicit easings: the kit's default is a new function each render, which
  // would restart these if the card re-renders mid-scene
  const on = useOnce(220, TAP + 60, EASE_OUT);
  const page = useOnce(480, TAP + 280, EASE_OUT);
  const was = useAnimatedStyle(() => ({ opacity: 1 - on.value }));
  const now = useAnimatedStyle(() => ({ opacity: on.value }));
  const bump = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.18 * Math.sin(on.value * Math.PI) }] }));
  const rise = useAnimatedStyle(() => ({ opacity: page.value, transform: [{ translateY: (1 - page.value) * s * 0.16 }] }));
  const abs = { position: "absolute" as const, left: 0, top: 0 };
  return (
    <View style={{ width: s, height: s }}>
      {/* the page that opens */}
      <Animated.View style={[{ position: "absolute", left: (s - g.w) / 2, top: g.top, width: g.w, height: g.h }, paper(s), rise]}>
        <PageTitle s={s} />
        <View style={{ position: "absolute", left: g.inset, top: g.rowTop }}>
          <Typing s={s} w={g.inner} delay={TAP + 700} ms={1700} />
        </View>
      </Animated.View>

      {/* the tab bar, its own four icons and the + */}
      <View style={{ position: "absolute", left: barL, top: barT, width: barW, height: barH, borderRadius: s * 0.04, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "rgba(17,17,19,0.12)", flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: slot, alignItems: "center" }}>
          <View style={{ width: icon, height: icon }}>
            <Animated.View style={[abs, now]}>
              <Envelope color={INK} size={icon} />
            </Animated.View>
            <Animated.View style={[abs, was]}>
              <Envelope color={P.pen} active size={icon} />
            </Animated.View>
          </View>
        </View>
        <View style={{ width: slot, alignItems: "center" }}>
          <Animated.View style={[{ width: icon, height: icon }, bump]}>
            <Animated.View style={[abs, was]}>
              <Notes color={INK} size={icon} />
            </Animated.View>
            <Animated.View style={[abs, now]}>
              <Notes color={P.pen} active size={icon} />
            </Animated.View>
          </Animated.View>
        </View>
        <View style={{ width: slot, alignItems: "center" }}>
          <View style={{ width: s * 0.115, height: s * 0.115, borderRadius: s * 0.0575, backgroundColor: P.pen, alignItems: "center", justifyContent: "center" }}>
            <Svg width={s * 0.055} height={s * 0.055} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.8} strokeLinecap="round">
              <Path d="M12 5v14M5 12h14" />
            </Svg>
          </View>
        </View>
        <View style={{ width: slot, alignItems: "center" }}>
          <Kindreds color={INK} size={icon} />
        </View>
        <View style={{ width: slot, alignItems: "center" }}>
          <Me color={INK} size={icon} />
        </View>
      </View>

      <Finger x={barL + slot * 1.5 + s * 0.01} y={barT + barH / 2 + s * 0.005} at={TAP} size={s * 0.15} />
    </View>
  );
}

/* ── 2. the page folds in half and the seal is pressed on it ── */
function FoldSeal({ s }: { s: number }) {
  const g = pageOf(s);
  const { w, h, hh, inner, inset } = g;
  const seal = s * 0.19;
  const liftBy = s * 0.08;
  const r = s * 0.03;
  const edge = "rgba(17,17,19,0.16)";
  const f = useOnce(820, 250, EASE_IO);
  const lift = useOnce(420, 1000, EASE_OUT);
  const press = useOnce(340, 1380, EASE_OUT);
  const burst = useOnce(620, 1600, EASE_OUT);
  const group = useAnimatedStyle(() => ({ transform: [{ translateY: -liftBy * lift.value + s * 0.014 * Math.sin(press.value * Math.PI) }] }));
  // the top half squashes down onto the crease (its bottom edge stays put)…
  const front = useAnimatedStyle(() => {
    const k = Math.max(0.001, 1 - 2 * f.value);
    return { opacity: f.value < 0.5 ? 1 : 0, transform: [{ translateY: (hh / 2) * (1 - k) }, { scaleY: k }] };
  });
  const frontShade = useAnimatedStyle(() => ({ opacity: Math.min(1, f.value * 2) * 0.3 }));
  // …and its back comes down over the lower half (its top edge stays on the crease)
  const back = useAnimatedStyle(() => {
    const k = Math.max(0.001, (f.value - 0.5) * 2);
    return { opacity: f.value > 0.5 ? 1 : 0, transform: [{ translateY: -(hh / 2) * (1 - k) }, { scaleY: k }] };
  });
  const backShade = useAnimatedStyle(() => ({ opacity: (1 - Math.max(0, (f.value - 0.5) * 2)) * 0.3 }));
  const stamp = useAnimatedStyle(() => ({ opacity: Math.min(1, press.value * 2.5), transform: [{ scale: 1.7 - 0.7 * press.value }] }));
  const ring = useAnimatedStyle(() => ({ opacity: burst.value > 0 && burst.value < 1 ? (1 - burst.value) * 0.6 : 0, transform: [{ scale: 0.9 + 0.7 * burst.value }] }));
  return (
    <View style={{ width: s, height: s }}>
      <Animated.View style={[{ position: "absolute", left: (s - w) / 2, top: g.top, width: w, height: h }, group]}>
        {/* the lower half, written — its rows sit where scene 1 typed them */}
        <View style={{ position: "absolute", left: 0, top: hh, width: w, height: hh, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: edge, borderBottomLeftRadius: r, borderBottomRightRadius: r, overflow: "hidden" }}>
          <Bar s={s} left={inset} top={g.rowTop + g.row * 2 - hh} w={inner * LINES[2]} />
          <Bar s={s} left={inset} top={g.rowTop + g.row * 3 - hh} w={inner * LINES[3]} />
        </View>
        {/* the upper half, folding down */}
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: w, height: hh, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderBottomWidth: 0, borderColor: edge, borderTopLeftRadius: r, borderTopRightRadius: r, overflow: "hidden" }, front]}>
          <PageTitle s={s} />
          <Bar s={s} left={inset} top={g.rowTop} w={inner * LINES[0]} />
          <Bar s={s} left={inset} top={g.rowTop + g.row} w={inner * LINES[1]} />
          <Animated.View style={[fill, { backgroundColor: P.ink }, frontShade]} />
        </Animated.View>
        {/* the back of the page, now on top */}
        <Animated.View style={[{ position: "absolute", left: 0, top: hh, width: w, height: hh, backgroundColor: FLAP, borderWidth: 1.5, borderColor: edge, borderBottomLeftRadius: r, borderBottomRightRadius: r, overflow: "hidden" }, back]}>
          <Animated.View style={[fill, { backgroundColor: P.ink }, backShade]} />
        </Animated.View>
        {/* the seal, pressed */}
        <Animated.View style={[{ position: "absolute", left: (w - seal * 1.1) / 2, top: hh + (hh - seal * 1.1) / 2, width: seal * 1.1, height: seal * 1.1, borderRadius: seal * 0.55, borderWidth: s * 0.01, borderColor: P.pen }, ring]} />
        <Animated.View style={[{ position: "absolute", left: (w - seal) / 2, top: hh + (hh - seal - 3) / 2 }, stamp]}>
          <Seal size={seal} />
        </Animated.View>
      </Animated.View>
      <View style={{ position: "absolute", left: 0, right: 0, top: g.top + h - liftBy + s * 0.065 }}>
        <Rise delay={1900}>
          <Text numberOfLines={1} style={label(s)}>
            {t("ga.sealedToday")}
          </Text>
        </Rise>
      </View>
    </View>
  );
}

/* the folded, sealed page — as it lies afterwards */
function SealedNote({ s, w }: { s: number; w: number }) {
  const h = w * 0.36;
  const seal = h * 0.78;
  return (
    <View style={[{ width: w, height: h, alignItems: "center", justifyContent: "center" }, paper(s), { backgroundColor: FLAP, borderRadius: s * 0.025 }]}>
      <Seal size={seal} />
    </View>
  );
}

/* ── 3. it tries for the cloud and can't; the courier doesn't take it ── */
function Stays({ s }: { s: number }) {
  const cx = s * 0.4;
  const cloudW = s * 0.36;
  const cloudTop = s * 0.07;
  const noteW = s * 0.46;
  const noteTop = s * 0.6;
  const lift = useSharedValue(0);
  const shake = useSharedValue(0);
  useEffect(() => {
    lift.value = withDelay(
      450,
      withSequence(
        withTiming(1, { duration: 650, easing: Easing.out(Easing.quad), reduceMotion: RM }),
        withTiming(0, { duration: 850, easing: Easing.bounce, reduceMotion: RM }),
      ),
    );
    shake.value = withDelay(
      1100,
      withSequence(
        withTiming(1, { duration: 70, reduceMotion: RM }),
        withTiming(-1, { duration: 90, reduceMotion: RM }),
        withTiming(0.6, { duration: 80, reduceMotion: RM }),
        withTiming(0, { duration: 80, reduceMotion: RM }),
      ),
    );
  }, [lift, shake]);
  const slash = useOnce(280, 1020, EASE_OUT);
  const route = useOnce(400, 150, EASE_OUT);
  const sway = useLoop(1100);
  const note = useAnimatedStyle(() => ({ transform: [{ translateY: -lift.value * s * 0.17 }, { rotate: `${-5 * lift.value}deg` }] }));
  const cloud = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value * s * 0.02 }] }));
  const slashSt = useAnimatedStyle(() => ({ opacity: slash.value > 0 ? 1 : 0, transform: [{ rotate: "-32deg" }, { scaleX: Math.max(0.001, slash.value) }] }));
  const routeSt = useAnimatedStyle(() => ({ opacity: route.value * 0.5 }));
  // a nod that starts and rests upright, so with Reduce Motion (the loop
  // stops at 0) she sits straight rather than frozen mid-tilt
  const doze = useAnimatedStyle(() => ({ transform: [{ rotate: `${sway.value * 6}deg` }] }));
  const slashW = s * 0.44;
  const slashH = s * 0.024;
  const cloudMid = cloudTop + cloudW * 0.5;
  return (
    <View style={{ width: s, height: s }}>
      {/* the way up, dotted */}
      <Animated.View style={[{ position: "absolute", left: cx - 2, top: cloudTop + cloudW * 0.86 }, routeSt]}>
        <Svg width={4} height={noteTop - (cloudTop + cloudW * 0.86)}>
          <Line x1={2} y1={0} x2={2} y2={noteTop - (cloudTop + cloudW * 0.86)} stroke={P.ink} strokeWidth={2.4} strokeDasharray="4 6" strokeLinecap="round" />
        </Svg>
      </Animated.View>
      {/* the cloud, struck out */}
      <Animated.View style={[{ position: "absolute", left: cx - cloudW / 2, top: cloudTop, width: cloudW, height: cloudW }, cloud]}>
        <Svg width={cloudW} height={cloudW} viewBox="0 0 24 24">
          <Path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#FFFFFF" stroke={P.ink} strokeWidth={1.2} strokeLinejoin="round" />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: "absolute", left: cx - slashW / 2, top: cloudMid - slashH / 2, width: slashW, height: slashH, borderRadius: slashH / 2, backgroundColor: P.post, borderWidth: s * 0.007, borderColor: P.penWash }, slashSt]} />
      {/* the page — it rises, meets nothing to carry it, and falls back */}
      <Animated.View style={[{ position: "absolute", left: cx - noteW / 2, top: noteTop }, note]}>
        <SealedNote s={s} w={noteW} />
      </Animated.View>
      {/* the courier, dozing: she doesn't carry it and doesn't read it */}
      <Animated.View style={[{ position: "absolute", left: s * 0.68, top: s * 0.555 }, doze]}>
        <WrenBird size={s * 0.27} mood="sleepy" />
      </Animated.View>
      <View style={{ position: "absolute", left: 0, right: 0, top: s * 0.865 }}>
        <Rise delay={1900}>
          <Text numberOfLines={1} style={label(s)}>
            {t("ga.neverPosted")}
          </Text>
        </Rise>
      </View>
    </View>
  );
}

/* ── 4. it lies inside the phone, and only there ── */
function Kept({ s }: { s: number }) {
  const pw = s * 0.44;
  const ph = s * 0.64;
  const noteW = s * 0.34;
  const halo = s * 0.36;
  const lockW = s * 0.1;
  const drop = useOnce(640, 250, EASE_BACK);
  const pulse = useLoop(1000, 700);
  const shackle = useOnce(180, 1250, EASE_OUT);
  const fall = useAnimatedStyle(() => ({ opacity: Math.min(1, drop.value * 3), transform: [{ translateY: (1 - drop.value) * -s * 0.42 }] }));
  const glow = useAnimatedStyle(() => ({ opacity: drop.value * (0.55 + 0.45 * pulse.value), transform: [{ scale: 0.9 + 0.14 * pulse.value }] }));
  const shut = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - shackle.value) * -lockW * 0.22 }] }));
  return (
    <View style={{ width: s, height: s }}>
      <View style={{ position: "absolute", left: (s - pw) / 2, top: s * 0.11 }}>
        <MiniScreen w={pw} h={ph}>
          <View style={{ position: "absolute", left: (pw - pw * 0.32) / 2, top: s * 0.025, width: pw * 0.32, height: s * 0.03, borderRadius: s * 0.015, backgroundColor: P.ink }} />
          <Animated.View style={[{ position: "absolute", left: (pw - halo) / 2 - 2, top: ph * 0.42 - halo / 2, width: halo, height: halo, borderRadius: halo / 2, backgroundColor: P.penWash }, glow]} />
          <Animated.View style={[{ position: "absolute", left: (pw - noteW) / 2 - 2, top: ph * 0.42 - (noteW * 0.36) / 2 }, fall]}>
            <SealedNote s={s} w={noteW} />
          </Animated.View>
          {/* a lock that clicks shut under it */}
          <View style={{ position: "absolute", left: (pw - lockW) / 2 - 2, top: ph * 0.68 }}>
            <Pop delay={1000}>
              <View style={{ width: lockW, height: lockW * 1.1 }}>
                <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, shut]}>
                  <Svg width={lockW} height={lockW * 0.6} viewBox="0 0 20 12" fill="none" stroke={P.ink} strokeWidth={1.8} strokeLinecap="round">
                    <Path d="M6 12V7a4 4 0 0 1 8 0v5" />
                  </Svg>
                </Animated.View>
                <Svg width={lockW} height={lockW * 0.6} viewBox="0 0 20 12" style={{ position: "absolute", left: 0, top: lockW * 0.5 }}>
                  <Rect x={2.5} y={1} width={15} height={10} rx={2} fill={P.ink} />
                </Svg>
              </View>
            </Pop>
          </View>
        </MiniScreen>
      </View>
      <View style={{ position: "absolute", left: 0, right: 0, top: s * 0.11 + ph + s * 0.06 }}>
        <Rise delay={1400}>
          <Text numberOfLines={1} style={label(s)}>
            {t("ga.phoneOnly")}
          </Text>
        </Rise>
      </View>
    </View>
  );
}

/* ── 5. the title ── */
function Title({ s }: { s: number }) {
  const title = t("gd.sealed.title");
  const words = title.includes(" ") ? title.split(" ") : [title];
  return (
    <View style={{ width: s, height: s }}>
      <BigType s={s} words={words} accent={words.length > 1 ? [words.length - 1] : []} />
      <View style={{ position: "absolute", left: s * 0.09, bottom: s * 0.08 }}>
        <Pop delay={120 + words.length * 170 + 220}>
          <Seal size={s * 0.14} />
        </Pop>
      </View>
    </View>
  );
}

export const reel: Reel = {
  bg: P.penWash,
  scenes: [
    { key: "tap-notes", ms: 3400, render: (s) => <TapNotes s={s} /> },
    { key: "fold-seal", ms: 3200, render: (s) => <FoldSeal s={s} /> },
    { key: "stays", ms: 3200, render: (s) => <Stays s={s} /> },
    { key: "kept", ms: 3000, render: (s) => <Kept s={s} /> },
    { key: "title", ms: 2800, render: (s) => <Title s={s} /> },
  ],
};
