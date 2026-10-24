import { memo, useEffect, useMemo, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, Extrapolation, ReduceMotion, interpolate, interpolateColor, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Defs, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { Finger, Rise, useOnce, type Reel } from "./kit";
import { WrenBird } from "../WrenBird";
import { EnvelopeArt } from "../EnvelopeArt";
import { AvatarImage } from "../AvatarImage";
import { Frost } from "../Frost";
import { WhoGlyphs } from "../WhoName";
import { P, PFM } from "../../theme/post";
import { BRAND } from "../../theme/themes";
import { useLetterFamily } from "../../lib/theme";
import { getLang, t } from "../../lib/i18n";
import { dShort, localeTag } from "../../lib/format";
import { defaultName } from "../../lib/default-name";
import { frostSpec, type FrostSpec } from "../../lib/frost";
import { PEN_BASELINE, PEN_H, PEN_W, penDemo, penDrawPlan, penTypedUpright, penViewBox, type PenDrawStep, type PenSig } from "../../lib/pen-signature";
import { PICKS } from "../../data/sparkle-deck";
import "../../data/strings-identity2"; // id2.sheet.*, id2.door.waiting
import "../../data/strings-sparkle"; // sp.pick.*
import "../../data/strings-reel-kindreds"; // ga.rowan

/* HOW A KINDRED FORMS, AS A REEL (owner, 2026-10-11: "大的清楚的动态演示";
   redrawn for the 1.0.5 identity, owner 2026-10-25: the same big card, with
   only what had gone out of date replaced). Six scenes, all drawn at the
   square's own size from the product's parts:
     1. Wren brings a reply; it drops into a pen pal row — their frosted
        window, the courier name the reader's courier gives them ("Sunday
        Kite" in English: lib/default-name, in the reader's language), the
        ♀ mark and their star sign, the blue badge — and a finger opens it.
     2. Five letters each way: the two rows of five fill turn by turn under
        their window, which never develops (it stays frosted until names are
        traded), and at five each the sign door arrives: Send Them Your Name.
     3. Signing: the signing sheet rises; the pen name is typed into its
        field, then signed on the pad stroke by stroke over its own faint
        guide; a finger taps Sign and Send, the sheet goes, and what was
        signed waits sealed — YOU SIGNED · WAITING.
     4. Both open together: your sealed envelope, then theirs beside it, and
        both lift at once; each window wipes clear (a sheen sweeps it, the
        square goes round) onto the face its person sent, the courier names
        are struck through, the signatures draw in with the pen names under
        them — the ceremony's own beats (IntroductionRitual) — and
        KINDREDS · today slaps under the two of you.
     5. The letters become a room (owner, 2026-10-11: "thread 变 chat"): the
        thread's long letter cards shrink into the room's bubbles — yours in
        pen blue on the right, theirs on white — the header's window and
        courier name turn into their face and pen name, and a This or That
        card arrives: both picked blind, the answers open together, Same!
     6. The title, in big type.
   The hand on the pad is lib/pen-signature's made-up demo drawing (penDemo,
   the dev pages' own): a reel never shows anyone's real signature.
   Easing curves are module constants on purpose: Easing.out(...) makes a new
   function on every call, and a hook that lists it in its deps would restart
   on every re-render — scenes 2 and 3 re-render as their counts tick. */

const RM = ReduceMotion.System;
const CLAMP = Extrapolation.CLAMP;
const E_OUT = Easing.out(Easing.cubic);
const E_INOUT = Easing.inOut(Easing.cubic);
const E_IN = Easing.in(Easing.quad);
const E_POP = Easing.out(Easing.back(2));
const E_LIN = Easing.linear;

/* THE TWO OF THEM: fixed ids, so the same windows, names and hands every time.
   Their id was picked so that its English courier name is the identity plan's
   own example, "Sunday Kite"; each language's list gives it its own. Yours is
   "Rainy Lantern" in English: what strangers' couriers called you. */
const PAL = "guide-pal-5550";
const ME = "guide-you-12688";
const PAL_FACE = "f-02-tender-thinker"; // the library face they send
const MY_FACE = "m-16-pattern-finder"; // the one you send
// light windows: a reel is a light picture in every theme (kit)
const PAL_FROST = frostSpec(PAL)!;
const MY_FROST = frostSpec(ME)!;
const PAL_SIG = penDemo(PAL);
const MY_SIG = penDemo(ME);
const EACH = 5;
const LINE = "rgba(17,17,19,0.14)";
/* the light themes' 10a inks, fixed for the same reason: the outline (ln), the
   glyphs and the sheet's words (sub, mute), its wells (soft), the room's ind and lav */
const LN = "#1E1B35";
const SUB = "#55506E";
const MUTE = "#8A86A3";
const SOFT = "#F6F5F9";
const LAV = "#E4E2F4";
const IND = "#3A34D6";

const upper = (x: string) => x.toLocaleUpperCase(localeTag());
const sentence = (x: string) => {
  const low = x.toLocaleLowerCase(localeTag());
  return low.charAt(0).toLocaleUpperCase(localeTag()) + low.slice(1);
};
const palName = () => defaultName(PAL, getLang()) ?? "";
const myName = () => defaultName(ME, getLang()) ?? "";
const palPen = () => sentence(t("ga.mira"));
const myPen = () => sentence(t("ga.rowan"));

/* pop in with a stable curve (safe under a parent that re-renders) */
function Appear({ delay = 0, children }: { delay?: number; children: ReactNode }) {
  const v = useOnce(420, delay, E_POP);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, v.value * 1.4), transform: [{ scale: 0.5 + 0.5 * v.value }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

/* their courier name and, after it, the ♀ mark and their star sign: the
   glyphs in sub, never tinted (components/WhoName) */
function PalName({ size, max }: { size: number; max?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1, maxWidth: max }}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ flexShrink: 1, fontSize: size, fontWeight: "600", color: P.ink }}>
        {palName()}
      </Text>
      <WhoGlyphs mark="she" sign="gemini" size={size * 0.8} color={SUB} lead={size * 0.36} />
    </View>
  );
}

/* ── a signature, drawn in stroke by stroke ────────────────────────────── */
/* penDrawPlan's steps on one clock: each stroke's dash runs out over its own
   share of `ms`, as the ceremony draws one. fit "box" keeps where on the line
   it was signed (the pad), "ink" crops to the drawing (the ceremony's slot).
   Under Reduce Motion the clock is simply done: the whole signature. */
const AnimatedPath = Animated.createAnimatedComponent(Path);

function DrawIn({ sig, w, h, fit, at, ms, pt }: { sig: PenSig; w: number; h: number; fit: "box" | "ink"; at: number; ms: number; pt: number }) {
  const plan = useMemo(() => penDrawPlan(sig, ms) ?? [], [sig, ms]);
  const vb = useMemo(() => (fit === "ink" ? penViewBox(sig, "ink", { aspect: w / h }) : penViewBox(sig, "box")), [sig, fit, w, h]);
  const end = plan.reduce((m, st) => Math.max(m, st.delay + st.duration), 1);
  const clock = useOnce(end, at, E_LIN);
  const sw = (pt * vb.w) / w;
  return (
    <Svg width={w} height={h} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}>
      {plan.map((st, i) => (
        <StrokeIn key={i} step={st} clock={clock} end={end} width={sw} />
      ))}
    </Svg>
  );
}

function StrokeIn({ step, clock, end, width }: { step: PenDrawStep; clock: SharedValue<number>; end: number; width: number }) {
  const dash = step.length + 2;
  const props = useAnimatedProps(() => {
    const now = clock.value * end;
    const raw = Math.min(1, Math.max(0, (now - step.delay) / step.duration));
    const p = raw * raw * (3 - 2 * raw);
    // hidden until its turn: a round cap at the dash's end would otherwise sit on its first point as a dot
    return { strokeDashoffset: dash * (1 - p), strokeOpacity: now > step.delay ? 1 : 0 };
  });
  return <AnimatedPath d={step.d} fill="none" stroke={P.ink} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[dash, dash]} animatedProps={props} />;
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
  const face = row.h * 0.62;
  const badge = s * 0.075;
  const faceCx = row.left + pad + face / 2;
  const rowCy = row.top + row.h / 2;
  const dropX = faceCx - s / 2;
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
      {/* the pen pal row it lands in, as the Kindreds list draws one: their window, never developing */}
      <View style={{ position: "absolute", left: row.left, top: row.top, width: row.w, height: row.h }}>
        <Rise delay={1150} dy={s * 0.05}>
          <View style={{ width: row.w, height: row.h, borderRadius: s * 0.045, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", paddingHorizontal: pad, gap: pad, overflow: "hidden" }}>
            <Frost spec={PAL_FROST} size={face} />
            <View style={{ flex: 1, minWidth: 0, gap: s * 0.022 }}>
              <PalName size={s * 0.047} />
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

/* the sign door as the pen-pal chat draws it at five each way (ChatDockRN
   SignDoor, "offer"): a sticker on the card's face with a 2pt outline */
function Door({ s }: { s: number }) {
  return (
    <View style={{ borderWidth: 2, borderColor: LN, borderRadius: s * 0.056, backgroundColor: "#FFFFFF", paddingHorizontal: s * 0.039, paddingVertical: s * 0.02, maxWidth: s * 0.62 }}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontSize: s * 0.036, fontWeight: "600", color: P.ink }}>
        {t("ch.sendYours")}
      </Text>
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

  const d = s * 0.3;
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
      {/* who they are to you for now: the window and the name your courier gave them */}
      <View style={{ marginTop: s * 0.08, alignItems: "center", gap: s * 0.025 }}>
        <Frost spec={PAL_FROST} size={d} />
        <PalName size={s * 0.05} max={s * 0.84} />
      </View>
      <View style={{ marginTop: s * 0.05, gap: s * 0.03 }}>
        {row(<Frost spec={PAL_FROST} size={c} />, theirs, P.pen)}
        {row(
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ ...PFM.monoSemi, fontSize: s * 0.042, letterSpacing: 1, color: P.ink }}>
            {t("ui.you")}
          </Text>,
          mine,
          P.ink,
        )}
      </View>
      <View style={{ marginTop: s * 0.04, height: s * 0.1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: s * 0.03, paddingHorizontal: s * 0.05 }}>
        <Text style={{ ...PFM.monoSemi, fontSize: s * 0.04, letterSpacing: 1, color: P.ink60 }}>{t("mk.ofFive", { n: Math.min(mine, theirs) })}</Text>
        {done && (
          <Appear>
            <Door s={s} />
          </Appear>
        )}
      </View>
    </View>
  );
}

/* ── 3 · signing, then the sealed wait ─────────────────────────────────── */
const SIGN_TYPE = 350; // the pen name starts going in
const SIGN_DRAW = 1150; // the pad, stroke by stroke
const SIGN_DRAW_MS = 1000;
const SIGN_TAP = 2400;
const SIGN_GO = 2600; // the sheet goes down
const SIGN_SEALED = 2800;

function Sign({ s }: { s: number }) {
  const letter = useLetterFamily();
  const slanted = useLetterFamily(true);
  const pen = myPen();
  const chars = useMemo(() => Array.from(pen), [pen]);
  const [k, setK] = useState(0); // letters typed so far
  useEffect(() => {
    const every = Math.min(110, 700 / Math.max(1, chars.length));
    const ids = chars.map((_, i) => setTimeout(() => setK(i + 1), SIGN_TYPE + i * every));
    return () => ids.forEach(clearTimeout);
  }, [chars]);
  const typed = chars.slice(0, k).join("");
  const go = useOnce(420, SIGN_GO, E_IN);
  const ink = useOnce(180, SIGN_DRAW, E_OUT);
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: go.value * s * 0.95 }] }));
  const caption = useAnimatedStyle(() => ({ opacity: 1 - ink.value }));
  const hand = useAnimatedStyle(() => ({ opacity: 1 - go.value }));

  /* the sheet as SignSheet draws it: its title, YOUR PEN NAME's well, YOUR
     SIGNATURE's pad and the main button in ind (the face row, the notes and
     the foot are left out at this size) */
  const sx = s * 0.06;
  const sw = s * 0.88;
  const inset = s * 0.05;
  const W = sw - inset * 2 - 2; // the pad, inside the sheet's 1pt edge, at the box's own aspect
  const H = W * (PEN_H / PEN_W);
  const baseY = H * PEN_BASELINE;
  const u = s / 360; // the pad's × and line, in the pad's points
  // the faint guide under the ink: what's typed so far, or "sign here" (upright for CJK, as the pad sets it)
  const guide = typed || t("id2.sheet.traceEmpty");
  const gs = H * 0.42;
  const label = (text: string) => (
    <Text numberOfLines={1} style={{ ...PFM.monoSemi, fontSize: s * 0.028, letterSpacing: s * 0.028 * 0.14, color: MUTE }}>
      {upper(text)}
    </Text>
  );

  return (
    <View style={{ width: s, height: s }}>
      {/* what's left once it has gone: the signature sealed, waiting for theirs */}
      <View style={{ position: "absolute", left: 0, top: s * 0.24, width: s, alignItems: "center" }}>
        <Appear delay={SIGN_SEALED}>
          <EnvelopeArt w={s * 0.38} sealed />
        </Appear>
      </View>
      <View style={{ position: "absolute", left: s * 0.08, right: s * 0.08, top: s * 0.6, alignItems: "center" }}>
        <Rise delay={SIGN_SEALED + 150} dy={s * 0.03}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ ...PFM.monoMed, fontSize: s * 0.036, letterSpacing: s * 0.036 * 0.12, color: MUTE }}>
            {t("id2.door.waiting")}
          </Text>
        </Rise>
      </View>

      <Animated.View style={[{ position: "absolute", left: sx, top: s * 0.1, width: sw, height: s * 0.95 }, sheet]}>
        <Rise dy={s * 0.12}>
          <View style={{ height: s * 0.95, backgroundColor: "#FFFFFF", borderTopLeftRadius: s * 0.056, borderTopRightRadius: s * 0.056, borderWidth: 1, borderColor: LN, borderBottomWidth: 0, paddingHorizontal: inset, paddingTop: s * 0.035 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontSize: s * 0.047, fontWeight: "500", textAlign: "center", color: P.ink }}>
              {t("id2.sheet.title")}
            </Text>

            {/* YOUR PEN NAME, typed */}
            <View style={{ marginTop: s * 0.035, gap: s * 0.018 }}>
              {label(t("id2.sheet.name"))}
              <View style={{ height: s * 0.105, borderRadius: s * 0.044, backgroundColor: SOFT, paddingHorizontal: s * 0.039, flexDirection: "row", alignItems: "center" }}>
                <Text numberOfLines={1} style={{ ...letter, fontSize: s * 0.047, color: P.ink }}>
                  {typed}
                </Text>
                {k < chars.length && <View style={{ width: 2, height: s * 0.055, marginLeft: 1, backgroundColor: IND }} />}
              </View>
            </View>

            {/* YOUR SIGNATURE: the pad, its line and ×, the guide, the ink */}
            <View style={{ marginTop: s * 0.03, gap: s * 0.018 }}>
              {label(t("id2.sheet.sign"))}
              <View style={{ width: W, height: H, borderRadius: s * 0.033, backgroundColor: SOFT, overflow: "hidden" }}>
                <View style={{ position: "absolute", left: W * 0.15, width: W * 0.7, top: baseY - gs * 1.02, alignItems: "center" }}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                    style={{ ...(penTypedUpright(guide) ? letter : slanted), fontSize: gs, lineHeight: gs * 1.25, color: P.ink, opacity: 0.1 }}
                  >
                    {guide}
                  </Text>
                </View>
                <Svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
                  <Line x1={W * 0.06} x2={W * 0.94} y1={baseY} y2={baseY} stroke={LN} strokeWidth={1} />
                  <Path d={`M${W * 0.06} ${baseY - 13 * u}l${7 * u} ${7 * u}M${W * 0.06 + 7 * u} ${baseY - 13 * u}l${-7 * u} ${7 * u}`} stroke={SUB} strokeWidth={1.4} strokeLinecap="round" fill="none" />
                </Svg>
                <View style={{ position: "absolute", left: 0, top: 0 }}>
                  <DrawIn sig={MY_SIG} w={W} h={H} fit="box" at={SIGN_DRAW} ms={SIGN_DRAW_MS} pt={2.4 * u} />
                </View>
                <Animated.Text numberOfLines={1} style={[{ position: "absolute", left: s * 0.033, top: s * 0.024, ...PFM.monoMed, fontSize: s * 0.028, letterSpacing: s * 0.028 * 0.06, color: SUB }, caption]}>
                  {t("id2.sheet.trace")}
                </Animated.Text>
              </View>
            </View>

            {/* SIGN AND SEND */}
            <View style={{ marginTop: s * 0.045, height: s * 0.115, borderRadius: s * 0.039, backgroundColor: IND, alignItems: "center", justifyContent: "center", paddingHorizontal: s * 0.04 }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontSize: s * 0.044, fontWeight: "600", letterSpacing: 0.4, color: "#FFFFFF" }}>
                {t("id2.sheet.send")}
              </Text>
            </View>
          </View>
        </Rise>
      </Animated.View>

      {/* the finger taps Sign and Send, then goes with the sheet */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: s, height: s }, hand]}>
        <Finger x={s * 0.5} y={s * 0.83} at={SIGN_TAP} size={s * 0.15} />
      </Animated.View>
    </View>
  );
}

/* ── 4 · both open together ────────────────────────────────────────────── */
const OPEN_THEIRS = 450; // theirs is signed and sealed too
const OPEN_LIFT = 1050; // both envelopes lift, together
const OPEN_WIPE = 1200; // the frost goes (→ 1800): the sheen 0–1, the square round from 0.1, the face from 0.25
const WIPE_MS = 600;
const OPEN_STRIKE = 1850; // theirs, then yours 100 later
const OPEN_SIGN = 2000; // their signature, then yours
const OPEN_SIGN_THEIRS_MS = 650;
const OPEN_SIGN_MINE_MS = 400;
const OPEN_CHIP = 3150;

/* the frosted window each of them wore, wiped clear onto the face they sent
   (IntroductionRitual WipeWindow, on the reel's clock) */
function Wipe({ frost, face, seed, d }: { frost: FrostSpec; face: string; seed: string; d: number }) {
  const p = useOnce(WIPE_MS, OPEN_WIPE, E_LIN);
  const clip = useAnimatedStyle(() => {
    const r = interpolate(p.value, [0.1, 1], [0, 1], CLAMP);
    return { borderRadius: d * (0.25 + 0.25 * r * r * (3 - 2 * r)) };
  });
  const frostSide = useAnimatedStyle(() => ({ opacity: 1 - p.value * p.value * (3 - 2 * p.value) }));
  const sheen = useAnimatedStyle(() => {
    const e = p.value * p.value * (3 - 2 * p.value);
    const o = -d * 0.85 + d * 1.7 * e;
    return { opacity: p.value > 0 && p.value < 1 ? Math.sin(p.value * Math.PI) : 0, transform: [{ translateX: o }, { translateY: o }, { rotate: "45deg" }] };
  });
  const faceSide = useAnimatedStyle(() => {
    const f = interpolate(p.value, [0.25, 1], [0, 1], CLAMP);
    return { opacity: f, transform: [{ scale: 0.92 + 0.08 * f }] };
  });
  return (
    <View style={{ width: d, height: d }}>
      <Animated.View style={[{ width: d, height: d, overflow: "hidden" }, clip]}>
        <Animated.View style={[{ position: "absolute" }, faceSide]}>
          <AvatarImage id={face} seed={seed} size={d} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[{ position: "absolute" }, frostSide]}>
          <Frost spec={frost} size={d} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: d * 0.25, top: -d * 0.5, width: d * 0.5, height: d * 2 }, sheen]}>
          <Svg width={d * 0.5} height={d * 2}>
            <Defs>
              <LinearGradient id="wipe" x1="0" y1="0" x2="1" y2="0">
                <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0} />
                <Stop offset={0.5} stopColor="#FFFFFF" stopOpacity={0.85} />
                <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={d * 0.5} height={d * 2} fill="url(#wipe)" />
          </Svg>
        </Animated.View>
      </Animated.View>
      {/* the white ring a face wears as a sticker, once it's round */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: d, height: d, borderWidth: 3, borderColor: BRAND.paperWhite }, clip, faceSide]} />
    </View>
  );
}

/* a mono line's width in ems: 0.6 a character, 1.0 a wide one, plus the tracking */
const WIDE = /[ᄀ-ᇿ⺀-꓏가-힯豈-﫿＀-｠]/;
const monoEms = (text: string) => Array.from(text).reduce((n, ch) => n + (WIDE.test(ch) ? 1 : 0.6) + 0.05, 0);

/* the courier name, struck through left to right in ink and dimmed: a name
   you were given gives way to one you chose. The line is the name's own
   width, measured (no numberOfLines: a one-line Text takes the whole column) */
function Struck({ s, text, at, max }: { s: number; text: string; at: number; max: number }) {
  const v = useOnce(240, at, E_INOUT);
  const w = useSharedValue(0);
  const name = useAnimatedStyle(() => ({ opacity: 1 - 0.55 * v.value }));
  const line = useAnimatedStyle(() => ({ width: w.value * v.value }));
  const fs = Math.min(s * 0.034, max / Math.max(1, monoEms(text)));
  return (
    <View onLayout={(e) => (w.value = e.nativeEvent.layout.width)} style={{ alignSelf: "center", maxWidth: max, justifyContent: "center" }}>
      <Animated.Text style={[{ ...PFM.monoMed, fontSize: fs, letterSpacing: fs * 0.05, color: SUB }, name]}>{text}</Animated.Text>
      <Animated.View style={[{ position: "absolute", left: 0, top: "50%", height: 1.5, marginTop: -0.5, backgroundColor: P.ink }, line]} />
    </View>
  );
}

function Fade({ at, children }: { at: number; children: ReactNode }) {
  const v = useOnce(220, at, E_OUT);
  const st = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

/* one side of it: the window and the sealed envelope over it, the struck
   courier name, the signature and the pen name under it */
function Side({
  s,
  frost,
  face,
  seed,
  courier,
  pen,
  sig,
  sealedAt,
  strikeAt,
  signAt,
  signMs,
}: {
  s: number;
  frost: FrostSpec;
  face: string;
  seed: string;
  courier: string;
  pen: string;
  sig: PenSig;
  /** when their envelope drops in; null: sealed from the start (yours) */
  sealedAt: number | null;
  strikeAt: number;
  signAt: number;
  signMs: number;
}) {
  const colW = s * 0.42;
  const d = s * 0.27;
  const ew = s * 0.2;
  const slotW = s * 0.38;
  const slotH = s * 0.12;
  const drop = useOnce(420, sealedAt ?? 0, E_OUT);
  const lift = useOnce(380, OPEN_LIFT, E_IN);
  const env = useAnimatedStyle(() => {
    const inn = sealedAt == null ? 1 : drop.value;
    return { opacity: inn * (1 - lift.value), transform: [{ translateY: (1 - inn) * -s * 0.3 - lift.value * s * 0.08 }, { scale: 1 + 0.15 * lift.value }] };
  });
  return (
    <View style={{ width: colW, alignItems: "center" }}>
      <Wipe frost={frost} face={face} seed={seed} d={d} />
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: (colW - ew) / 2, top: d * 0.52 }, env]}>
        <EnvelopeArt w={ew} sealed />
      </Animated.View>
      <View style={{ marginTop: s * 0.035, height: s * 0.045, justifyContent: "center" }}>
        <Struck s={s} text={upper(courier)} at={strikeAt} max={colW} />
      </View>
      <View style={{ marginTop: s * 0.015, width: slotW, height: slotH }}>
        <DrawIn sig={sig} w={slotW} h={slotH} fit="ink" at={signAt} ms={signMs} pt={s * 0.0056} />
      </View>
      <View style={{ marginTop: s * 0.008, height: s * 0.06, justifyContent: "center" }}>
        <Fade at={signAt + signMs}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ maxWidth: colW, fontSize: s * 0.046, fontWeight: "600", color: P.ink }}>
            {pen}
          </Text>
        </Fade>
      </View>
    </View>
  );
}

function Open({ s }: { s: number }) {
  const slap = useOnce(420, OPEN_CHIP, E_POP);
  const chip = useAnimatedStyle(() => ({
    opacity: Math.min(1, slap.value * 2),
    transform: [{ scale: 1.6 - 0.6 * slap.value }, { rotate: `${2 + 6 * (1 - slap.value)}deg` }],
  }));
  const fs = s * 0.032;
  return (
    <View style={{ width: s, height: s }}>
      {/* yours on the left, as the ceremony has it */}
      <View style={{ position: "absolute", left: s * 0.06, top: s * 0.1, width: s * 0.88, flexDirection: "row", justifyContent: "space-between" }}>
        <Side s={s} frost={MY_FROST} face={MY_FACE} seed={ME} courier={myName()} pen={myPen()} sig={MY_SIG} sealedAt={null} strikeAt={OPEN_STRIKE + 100} signAt={OPEN_SIGN + OPEN_SIGN_THEIRS_MS} signMs={OPEN_SIGN_MINE_MS} />
        <Side s={s} frost={PAL_FROST} face={PAL_FACE} seed={PAL} courier={palName()} pen={palPen()} sig={PAL_SIG} sealedAt={OPEN_THEIRS} strikeAt={OPEN_STRIKE} signAt={OPEN_SIGN} signMs={OPEN_SIGN_THEIRS_MS} />
      </View>
      {/* since when — under the two of you, the ceremony's chip */}
      <View style={{ position: "absolute", left: 0, right: 0, top: s * 0.76, alignItems: "center" }}>
        <Animated.View style={chip}>
          <View style={{ backgroundColor: BRAND.paperWhite, borderRadius: 999, borderWidth: 1.5, borderColor: BRAND.greenText, paddingHorizontal: s * 0.028, paddingVertical: s * 0.01 }}>
            <Text numberOfLines={1} style={{ ...PFM.monoSemi, fontSize: fs, letterSpacing: fs * 0.15, color: BRAND.greenText }}>
              {t("in.sinceChip", { date: upper(dShort(new Date())) })}
            </Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

/* ── 5 · the letters become a room ─────────────────────────────────────── */
const MORPH_AT = 1250;
const PICK_AT = MORPH_AT + 950; // a This or That card comes in…
const PICK_OPEN = PICK_AT + 750; // …and both answers open at once
const ROOM_GREY = "#FFFFFF"; // theirs: the room draws grey on white; on the reel's wash, white reads
const ROOM_SIDES = [false, true, false]; // mine?
const ROOM_W = [0.46, 0.38, 0.5];

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

/* a This or That card as the room draws it (KPickCard): ⇆ THIS OR THAT and who
   asked, the question in the Letter font, two choices — both picked blind,
   opened at once: the one you both chose lit in lav with its tag, the other
   at .6, the verdict in ind. The pair is the deck's own, in the reader's
   language (data/sparkle-deck) */
function Pick({ s }: { s: number }) {
  const letter = useLetterFamily();
  const pair = (PICKS[getLang()] ?? PICKS.en)[2];
  const open = useOnce(350, PICK_OPEN, E_OUT);
  const lit = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(open.value, [0, 1], [SOFT, LAV]) }));
  const other = useAnimatedStyle(() => ({ opacity: 1 - 0.4 * open.value }));
  const tag = useAnimatedStyle(() => ({ opacity: open.value }));
  const verdict = useAnimatedStyle(() => ({ opacity: open.value, transform: [{ translateY: (1 - open.value) * s * 0.017 }] }));
  const mono = { ...PFM.monoMed, fontSize: s * 0.026, letterSpacing: s * 0.026 * 0.14, color: MUTE };
  const tile = s * 0.06;
  const choice = (text: string, chosen: boolean) => (
    <Animated.View style={[{ flex: 1, height: s * 0.11, borderRadius: s * 0.033, alignItems: "center", justifyContent: "center", gap: s * 0.008, paddingHorizontal: s * 0.02 }, chosen ? lit : [{ backgroundColor: SOFT }, other]]}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ ...letter, fontSize: s * 0.042, color: P.ink }}>
        {text}
      </Text>
      {chosen && (
        <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: s * 0.01 }, tag]}>
          <Svg width={s * 0.032} height={s * 0.032} viewBox="0 0 24 24">
            <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={IND} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
          <Text numberOfLines={1} style={{ fontSize: s * 0.032, fontWeight: "600", color: IND }}>
            {t("sp.pick.both")}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
  return (
    <View style={{ borderRadius: s * 0.05, backgroundColor: "#FFFFFF", padding: s * 0.035 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: s * 0.025 }}>
        <View style={{ width: tile, height: tile, borderRadius: s * 0.02, backgroundColor: LAV, alignItems: "center", justifyContent: "center" }}>
          <Svg width={tile * 0.6} height={tile * 0.6} viewBox="0 0 24 24">
            <Path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4" stroke={IND} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </View>
        <Text numberOfLines={1} style={[mono, { flexShrink: 1 }]}>
          {upper(t("sp.pick.label"))}
        </Text>
        <View style={{ flex: 1 }} />
        <Text numberOfLines={1} style={[mono, { flexShrink: 1 }]}>
          {upper(t("sp.pick.theyAsked", { name: palPen() }))}
        </Text>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ ...letter, marginTop: s * 0.02, fontSize: s * 0.048, color: P.ink }}>
        {pair.q}
      </Text>
      <View style={{ marginTop: s * 0.022, flexDirection: "row", gap: s * 0.025 }}>
        {choice(pair.a, true)}
        {choice(pair.b, false)}
      </View>
      <Animated.Text numberOfLines={1} style={[{ marginTop: s * 0.02, fontSize: s * 0.04, fontWeight: "600", color: IND }, verdict]}>
        {t("sp.pick.same.1")}
      </Animated.Text>
    </View>
  );
}

function ThreadToRoom({ s }: { s: number }) {
  const m = useOnce(800, MORPH_AT, E_INOUT);
  const face = s * 0.11;
  const before = useAnimatedStyle(() => ({ opacity: 1 - m.value }));
  const after = useAnimatedStyle(() => ({ opacity: m.value }));
  const bh = s * 0.082, bGap = s * 0.02, top0 = s * 0.2, pad = s * 0.07;
  return (
    <View style={{ width: s, height: s }}>
      {/* who: a window and a courier name in the thread, a face and a pen name in the room */}
      <View style={{ position: "absolute", left: pad, top: s * 0.05, width: s - pad * 2, height: face }}>
        <Animated.View style={[{ position: "absolute", inset: 0, flexDirection: "row", alignItems: "center", gap: s * 0.03 }, before]}>
          <Frost spec={PAL_FROST} size={face} />
          <PalName size={s * 0.052} />
        </Animated.View>
        <Animated.View style={[{ position: "absolute", inset: 0, flexDirection: "row", alignItems: "center", gap: s * 0.03 }, after]}>
          <AvatarImage id={PAL_FACE} seed={PAL} size={face} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ flexShrink: 1, fontSize: s * 0.052, fontWeight: "600", color: P.ink }}>
            {palPen()}
          </Text>
        </Animated.View>
      </View>
      {/* the thread's three letters, turning into the room's first three lines */}
      {[0, 1, 2].map((i) => (
        <Morph key={i} s={s} i={i} m={m} />
      ))}
      {/* then what a room has that a thread doesn't: a This or That, opened together */}
      <View style={{ position: "absolute", left: pad, right: pad, top: top0 + 3 * (bh + bGap) + s * 0.015 }}>
        <Rise delay={PICK_AT} dy={s * 0.04}>
          <Pick s={s} />
        </Rise>
      </View>
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
const SignScene = memo(Sign);
const OpenScene = memo(Open);
const RoomScene = memo(ThreadToRoom);
const TitleScene = memo(Title);

export const reel: Reel = {
  bg: P.penWash,
  scenes: [
    { key: "reply", ms: 3400, render: (s) => <ReplyScene s={s} /> },
    { key: "each-way", ms: 3200, render: (s) => <EachWayScene s={s} /> },
    { key: "sign", ms: 3900, render: (s) => <SignScene s={s} /> },
    { key: "open", ms: 4100, render: (s) => <OpenScene s={s} /> },
    { key: "room", ms: 3900, render: (s) => <RoomScene s={s} /> },
    { key: "title", ms: 2600, render: (s) => <TitleScene s={s} /> },
  ],
};
