import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  ZoomIn,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { Image } from "expo-image";
import { AvatarImage } from "../../../components/AvatarImage";
import { getFace } from "../../../data/aura-avatar-lib";
import { Frost } from "../../../components/Frost";
import { LineIcon, type LineIconName } from "../../../components/10a/LineIcon";
import { StampSlot } from "../../../components/Stamp";
import { frostSpec, type FrostSpec } from "../../../lib/frost";
import { postmark } from "../../../lib/format";
import { t } from "../../../lib/i18n";
import { strangerName } from "../../../lib/stranger-name";
import { zodiacKey } from "../../../lib/zodiac";
import { signOf } from "../flow";
import { Headline, ScreenFrame } from "../parts/frame";
import * as haptics from "../parts/haptics";
import { AcidKey } from "../parts/keys";
import { NEST_EGG } from "../parts/nest-egg";
import { EDGE, FONT, OB, SHADOW, TYPE } from "../parts/tokens";
import { useLetterFamily } from "../../../lib/theme";
import type { ObScreenProps } from "../types";
import { nestEggRect } from "./s01-geometry";
import { AIR_BAND, AirmailPaper, DocketDate, Docket, ENV_PAD_Y, docketMetrics } from "./s06-envelope-front";
import "../../../data/strings-identity";
import "../../../data/strings-onboarding2";
import { OB_MAX_FONT } from "../parts/tokens";

/* 6 · YOU, TO A STRANGER — your own envelope (storyboard §6 · 6, §7; owner
   2026-10-18 decisions 2 and 6: show the person their own courier name; no
   pen-name step).
   ────────────────────────────────────────────────────────────────────────
   A paper card that is exactly the Today card's header at 1.4× (the docket
   s06-envelope-front draws), ASSEMBLED FROM YOUR ANSWERS one beat at a time
   (about 1.2 s; a tap on the card finishes it):
     · your own frosted window (FROST v1 from your uid — the real thing
       strangers see) frosts in over the face you just picked;
     · your courier name in your language types itself in, label-maker
       style (lib/stranger-name strangerName(uid, lang): "Starlit Prism");
     · ♀ pops after it (she/he only), then your sign (from screen 3's date);
     · the date in mono, and a dashed stamp corner (filled on screen 8).
   Under it the footnote that keeps the name true across languages, the two
   switches — "♀ on my letters" (on by default for she/he, hidden for they
   or a skip) and "♊ on my letters" (the zodiac opt-out, on by default) —
   which show and hide the glyphs on the card as you flip them, and the
   REVEAL STRIP on a loop: AFTER FIVE LETTERS EACH, the frost wipes clear
   into your face and the square turns round; beside it an empty signature
   line with a small ✕ and a pen hovering over it — nothing is written,
   because your pen name is signed there later, at the first trade.

   NO SESSION YET (offline when 3 passed): the window waits blank and the
   name's place says "Your courier is thinking of a name…"; the flow keeps
   the key dim until the runner's session lands (props.uid), and then the
   card assembles.

   "LOOKS RIGHT": a gold ring of warmth opens behind the egg (its four pips
   are the runner's), the card turns over, and the letter's paper grows out
   of it until the sheet is the screen — screen 7's ground — and the run goes
   on. Reduce Motion: the card is assembled at once, the strip rests on its
   cleared frame, and the key goes straight on.

   Collects showMark / showSign only (props.set); the flow saves both as
   booleans, and never a mark for they. */

/* the Today header at 1.25× here, not the storyboard's 1.4×: at 1.4 a two-word courier name and its two
   glyphs don't fit beside the face and the stamp corner on a 402pt phone, and wrapping it (WhoName's rule)
   makes the card taller than this screen has room for above the key */
const K = 1.25;
/** the address line under the docket, in the letter's italic */
const TO_H = 22;
const TO_GAP = 8;

/** the assembly's beats (ms): the frost, then the name at NAME_CHAR a letter, then the marks, then the date */
const FROST_IN = 420;
const NAME_FROM = 360;
const NAME_CHAR = 42;

export default function S06Envelope(props: ObScreenProps) {
  const { draft, uid } = props;
  // the envelope's handwriting (the address, the name still coming) is content: the letter font's italic
  const said = useLetterFamily(true);
  const { width: sw } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const m = docketMetrics(K);

  const name = useMemo(() => (uid ? strangerName(uid, { lang: props.lang, unsigned: "" }) : ""), [uid, props.lang]);
  const spec = useMemo(() => (uid ? frostSpec(uid) : null), [uid]);
  const sign = signOf(draft.dob);
  const markable = draft.pronoun === "she" || draft.pronoun === "he";
  const showMark = markable && (draft.showMark ?? true);
  const showSign = !!sign && (draft.showSign ?? true);
  const date = useMemo(() => postmark(props.now()), [props]);

  /* ── the assembly: one clock, from the moment there is a uid ── */
  const nameEnd = NAME_FROM + Math.max(1, name.length) * NAME_CHAR;
  const end = nameEnd + 560;
  const asm = useSharedValue(reduce ? 1e6 : 0);
  const [typed, setTyped] = useState(reduce ? 1e6 : 0);
  const [beat, setBeat] = useState(reduce ? 9 : 0); // 1 the mark, 2 the sign, 3 the date
  const started = useRef(false);
  useEffect(() => {
    if (!uid || started.current) return;
    started.current = true;
    if (reduce) return;
    asm.value = withTiming(end, { duration: end, easing: Easing.linear });
  }, [uid, reduce, asm, end]);
  useAnimatedReaction(
    () => Math.max(0, Math.floor((asm.value - NAME_FROM) / NAME_CHAR)),
    (n, was) => {
      if (n !== was) runOnJS(setTyped)(n);
    },
  );
  useAnimatedReaction(
    () => (asm.value >= nameEnd + 300 ? 3 : asm.value >= nameEnd + 160 ? 2 : asm.value >= nameEnd + 40 ? 1 : 0),
    (b, was) => {
      if (b !== was) runOnJS(setBeat)(b);
    },
    [nameEnd],
  );
  const finishNow = () => {
    if (!uid) return;
    cancelAnimation(asm);
    asm.value = 1e6;
  };
  const frostStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, asm.value / FROST_IN) }));
  const dateStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, (asm.value - nameEnd - 300) / 200)) }));

  /* ── "Looks right": the ring, the card turning over, the sheet becoming the screen ── */
  const card = useRef<View>(null);
  const [sheet, setSheet] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const out = useSharedValue(0);
  const leaving = useRef(false);
  const onLooksRight = () => {
    if (!props.canAdvance || leaving.current) return;
    leaving.current = true;
    finishNow();
    if (reduce) {
      props.advance();
      return;
    }
    haptics.pip();
    card.current?.measureInWindow((x, y, w, h) => {
      setSheet({ x, y, w, h });
      out.value = withTiming(1, { duration: 560, easing: Easing.linear }, (fin) => {
        if (fin) runOnJS(props.advance)();
      });
    });
  };
  const { height: sh } = useWindowDimensions();
  const nest = nestEggRect(sw, { top: insets.top, bottom: insets.bottom });
  const flipStyle = useAnimatedStyle(() => {
    const f = Math.min(1, out.value / 0.3);
    return { transform: [{ perspective: 900 }, { rotate: "-2deg" }, { rotateY: `${90 * f * f}deg` }] };
  });
  const ringStyle = useAnimatedStyle(() => {
    const r = Math.min(1, out.value / 0.3);
    return { opacity: r, transform: [{ scale: 0.7 + 0.3 * r }] };
  });
  const sheetStyle = useAnimatedStyle(() => {
    if (!sheet) return { opacity: 0 };
    const g = Math.max(0, Math.min(1, (out.value - 0.25) / 0.75));
    const e = g < 0.5 ? 4 * g * g * g : 1 - Math.pow(-2 * g + 2, 3) / 2;
    return {
      opacity: g > 0 ? 1 : 0,
      left: sheet.x * (1 - e),
      top: sheet.y * (1 - e),
      width: sheet.w + (sw - sheet.w) * e,
      height: sheet.h + (sh - sheet.h) * e,
      borderRadius: 20 * (1 - e),
    };
  });

  const nameNode = uid ? (
    <FittedName name={name} typed={typed} size={m.name}>
      {/* the glyphs' room is kept from the start, so the name is sized once and nothing moves when they pop in */}
      <View style={{ height: m.glyph, width: (showMark || showSign ? 6 * K : 0) + (showMark ? m.glyph : 0) + (showSign ? m.glyph : 0) + (showMark && showSign ? 4 * K : 0), flexDirection: "row", gap: 4 * K, paddingLeft: showMark || showSign ? 6 * K : 0 }}>
        {showMark && beat >= 1 && (
          <Animated.View entering={reduce ? undefined : ZoomIn.duration(260).easing(Easing.out(Easing.back(2.4)))}>
            <LineIcon name={draft.pronoun as "she" | "he"} size={m.glyph} stroke={2} color={OB.inkSoft} />
          </Animated.View>
        )}
        {showSign && beat >= 2 && (
          <Animated.View entering={reduce ? undefined : ZoomIn.duration(260).easing(Easing.out(Easing.back(2.4)))}>
            <LineIcon name={sign as LineIconName} size={m.glyph} stroke={2} color={OB.inkSoft} />
          </Animated.View>
        )}
      </View>
    </FittedName>
  ) : (
    <Text maxFontSizeMultiplier={OB_MAX_FONT} style={{ ...said, fontSize: 16, lineHeight: 21, color: OB.inkSoft }}>{t("ob2.envelope.thinking")}</Text>
  );

  const markLabel = draft.pronoun === "he" ? t("id.ob.mark.he") : t("id.ob.mark.she");

  return (
    <View style={{ flex: 1 }}>
      {/* the ring of warmth opening behind the egg as you go on (the runner draws the egg over it) */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: nest.x + NEST_EGG / 2 - NEST_EGG * 0.62, top: nest.y + NEST_EGG / 2 - NEST_EGG * 0.62, width: NEST_EGG * 1.24, height: NEST_EGG * 1.24, borderRadius: NEST_EGG, borderWidth: 3, borderColor: OB.gold }, ringStyle]} />

      <ScreenFrame ground="blue" back={props.back} nest primary={<AcidKey label={t("ob2.envelope.key")} disabled={!props.canAdvance} onPress={onLooksRight} />}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }} alwaysBounceVertical={false}>
          <Headline style={{ marginTop: 4 }}>
            <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
              {t("ob2.envelope.head")}
            </Text>
          </Headline>

          {/* your envelope */}
          <Pressable onPress={finishNow} accessible accessibilityRole="image" accessibilityLabel={uid ? t("id.preview.a11y", { who: [name, showMark ? t(`id.mark.${draft.pronoun}`) : null, showSign && sign ? t(zodiacKey(sign)) : null].filter(Boolean).join(", ") }) : t("ob2.envelope.thinking")}>
            <Animated.View ref={card} collapsable={false} style={[{ marginTop: 12, marginHorizontal: 4, marginRight: SHADOW + 4 }, flipStyle]}>
              <EnvelopeCard
                face={
                  <FaceSlot size={m.face} avatarId={draft.avatarId} spec={spec} frostStyle={frostStyle} waiting={!uid} />
                }
                name={nameNode}
                date={
                  <Animated.View style={dateStyle}>
                    <DocketDate text={date} k={K} />
                  </Animated.View>
                }
                stamp={
                  <Animated.View style={dateStyle}>
                    <StampSlot width={m.stampW} fill={OB.paper} stroke="#B3B0C9" />
                  </Animated.View>
                }
              />
            </Animated.View>
          </Pressable>

          <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.small, { color: OB.white, textAlign: "center", marginTop: 9, fontSize: 13, lineHeight: 17.5 }]}>{t("ob2.envelope.caption")}</Text>

          {/* the two switches */}
          {(markable || sign) && (
            <PaperCard top={10}>
              {markable && (
                <SwitchRow
                  glyph={draft.pronoun as "she" | "he"}
                  on={draft.showMark ?? true}
                  a11y={markLabel}
                  onToggle={() => props.set({ showMark: !(draft.showMark ?? true) })}
                />
              )}
              {markable && !!sign && <View style={{ height: 1.5, backgroundColor: "#ECEAF4", marginHorizontal: 14 }} />}
              {!!sign && (
                <SwitchRow
                  glyph={sign as LineIconName}
                  on={draft.showSign ?? true}
                  a11y={t("ob2.envelope.signA11y", { sign: t(zodiacKey(sign)) })}
                  onToggle={() => props.set({ showSign: !(draft.showSign ?? true) })}
                />
              )}
            </PaperCard>
          )}

          {/* the reveal strip */}
          <PaperCard top={10} padded>
            <RevealStrip avatarId={draft.avatarId} spec={spec} still={reduce} />
          </PaperCard>
        </ScrollView>
      </ScreenFrame>

      {/* the letter's paper, growing out of the card until it is the screen (7's ground) */}
      {sheet && <Animated.View pointerEvents="none" style={[{ position: "absolute", backgroundColor: OB.sheet }, sheetStyle]} />}
    </View>
  );
}

/* ── the envelope card: the airmail paper with the docket and the address line ── */

function EnvelopeCard({ face, name, date, stamp }: { face: React.ReactNode; name: React.ReactNode; date: React.ReactNode; stamp: React.ReactNode }) {
  const [w, setW] = useState(0);
  const said = useLetterFamily(true);
  const m = docketMetrics(K);
  const h = 2 * AIR_BAND + 2 * ENV_PAD_Y + m.rowH + TO_GAP + TO_H + 6;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: h }}>
      <View style={{ position: "absolute", left: SHADOW, top: SHADOW, right: -SHADOW, bottom: -SHADOW, borderRadius: 20, backgroundColor: OB.ink }} />
      <View style={{ flex: 1, borderRadius: 20, borderWidth: EDGE, borderColor: OB.ink, overflow: "hidden", backgroundColor: OB.paper }}>
        {w > 0 && (
          <AirmailPaper w={w - 2 * EDGE} h={h - 2 * EDGE} radius={17}>
            <Docket k={K} face={face} name={name} date={date} stamp={stamp} />
            <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={1} style={{ marginTop: TO_GAP, height: TO_H, ...said, fontSize: 16, color: OB.ink }}>
              {t("ob2.envelope.to")}
            </Text>
          </AirmailPaper>
        )}
      </View>
    </View>
  );
}

/**
 * The courier name on one line at the docket's size, or a little smaller for a long name in a long
 * language. The WHOLE name is laid out from the first frame and the label-maker typing only inks it
 * in, letter by letter (the rest is there, transparent): so the size is decided once, by the whole
 * name, and never changes half-way, and the glyphs after it already have their place.
 */
function FittedName({ name, typed, size, children }: { name: string; typed: number; size: number; children: React.ReactNode }) {
  const n = Math.min(typed, name.length);
  return (
    /* a row, not glyphs inside the text: the pop-ins animate, and an animated inline view inside a
       Text is laid out at the wrong place by Fabric */
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ flexShrink: 1, fontSize: size, fontWeight: "600", color: OB.ink, letterSpacing: -0.2 }}>
        {name.slice(0, n)}
        <Text maxFontSizeMultiplier={OB_MAX_FONT} style={{ color: "transparent" }}>{name.slice(n)}</Text>
      </Text>
      {children}
    </View>
  );
}

/** Your face as it frosts over (the face you picked on 5 underneath; a blank window while the session is on its way). */
function FaceSlot({ size, avatarId, spec, frostStyle, waiting }: { size: number; avatarId: string | null; spec: FrostSpec | null; frostStyle: ReturnType<typeof useAnimatedStyle>; waiting: boolean }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!waiting) return;
    pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(pulse);
  }, [waiting, pulse]);
  const waitStyle = useAnimatedStyle(() => ({ opacity: 0.45 + 0.4 * pulse.value }));
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.25, overflow: "hidden", backgroundColor: "#EFEDFA" }}>
      {!!avatarId && <FaceFill id={avatarId} size={size} />}
      {waiting ? (
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: size, height: size, backgroundColor: "#E4E2F0" }, waitStyle]} />
      ) : (
        spec && (
          <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, frostStyle]}>
            <Frost spec={spec} size={size} />
          </Animated.View>
        )
      )}
    </View>
  );
}

/* ── the switches ── */

/** A paper card on the blue: white, the ink edge, the hard shadow (its room kept on the right). */
function PaperCard({ children, top = 0, padded = false }: { children: React.ReactNode; top?: number; padded?: boolean }) {
  return (
    <View style={{ marginTop: top, marginRight: SHADOW }}>
      <View style={{ position: "absolute", left: SHADOW, top: SHADOW, right: -SHADOW, bottom: -SHADOW, borderRadius: 16, backgroundColor: OB.ink }} />
      <View style={[{ borderRadius: 16, borderWidth: EDGE, borderColor: OB.ink, backgroundColor: OB.paper }, padded && { paddingHorizontal: 14, paddingVertical: 10 }]}>{children}</View>
    </View>
  );
}

/** A face filling a square (the portrait's own picture, so a rounded clip has no corners of another colour). */
function FaceFill({ id, size }: { id: string; size: number }) {
  const f = getFace(id);
  if (f) return <Image source={f.src} style={{ width: size, height: size }} contentFit="cover" />;
  return <AvatarImage id={id} seed={id} size={size} round={false} />;
}

function SwitchRow({ glyph, on, a11y, onToggle }: { glyph: LineIconName; on: boolean; a11y: string; onToggle: () => void }) {
  const label = t("ob2.envelope.onLetters", { glyph: "\u0000" }).split("\u0000");
  return (
    <Pressable
      onPress={() => {
        haptics.tick();
        onToggle();
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={a11y}
      style={{ height: 41, flexDirection: "row", alignItems: "center", paddingHorizontal: 14 }}
    >
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
        {!!label[0] && <Text maxFontSizeMultiplier={OB_MAX_FONT} style={{ ...FONT.semi, fontSize: 15, color: OB.ink }}>{label[0]}</Text>}
        <View style={{ marginRight: 7, marginLeft: label[0] ? 4 : 0 }}>
          <LineIcon name={glyph} size={16} stroke={2} color={OB.ink} />
        </View>
        <Text maxFontSizeMultiplier={OB_MAX_FONT} style={{ flexShrink: 1, ...FONT.semi, fontSize: 15, color: OB.ink }}>{(label[1] ?? "").trim()}</Text>
      </View>
      <Toggle on={on} />
    </Pressable>
  );
}

/** The run's switch: an acid track with an ink edge and a white knob when on; quiet grey when off. */
function Toggle({ on }: { on: boolean }) {
  const x = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    x.value = withTiming(on ? 1 : 0, { duration: 160, easing: Easing.out(Easing.cubic) });
  }, [on, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: 2 + x.value * 20 }] }));
  return (
    <View style={{ width: 50, height: 30, borderRadius: 15, borderWidth: 2, borderColor: OB.ink, backgroundColor: on ? OB.acid : "#E6E4F0", justifyContent: "center" }}>
      <Animated.View style={[{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: OB.ink, backgroundColor: OB.paper }, knob]} />
    </View>
  );
}

/* ── the reveal strip: AFTER FIVE LETTERS EACH ── */

const RS = { wipeFrom: 0.9, wipeTo: 1.3, roundTo: 1.6, backFrom: 3.2, loop: 3.6 } as const;
const SQ = 40;

function RevealStrip({ avatarId, spec, still }: { avatarId: string | null; spec: FrostSpec | null; still: boolean }) {
  const clock = useSharedValue(still ? RS.roundTo : 0);
  useEffect(() => {
    if (still) return;
    clock.value = withRepeat(withTiming(RS.loop, { duration: RS.loop * 1000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(clock);
  }, [still, clock]);
  return (
    <View>
      <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.label, { color: OB.ink, fontSize: 9.5 }]}>{t("ob2.envelope.stripLabel")}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
        <ClearingWindow clock={clock} avatarId={avatarId} spec={spec} />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.label, { color: OB.inkSoft, fontSize: 9 }]}>{t("ob2.envelope.stripSign")}</Text>
          <SignatureLine clock={clock} still={still} />
        </View>
      </View>
      <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.small, { color: OB.inkSoft, marginTop: 8 }]}>{t("ob2.envelope.stripLine")}</Text>
    </View>
  );
}

function ClearingWindow({ clock, avatarId, spec }: { clock: SharedValue<number>; avatarId: string | null; spec: FrostSpec | null }) {
  const round = useAnimatedStyle(() => {
    const s = Math.min(1, Math.max(0, (clock.value - RS.wipeTo) / (RS.roundTo - RS.wipeTo)));
    const back = Math.min(1, Math.max(0, (clock.value - RS.backFrom) / (RS.loop - RS.backFrom)));
    return { borderRadius: SQ * 0.25 + SQ * 0.25 * s * (1 - back) };
  });
  const clip = useAnimatedStyle(() => {
    const open = Math.min(1, Math.max(0, (clock.value - RS.wipeFrom) / (RS.wipeTo - RS.wipeFrom)));
    const back = Math.min(1, Math.max(0, (clock.value - RS.backFrom) / (RS.loop - RS.backFrom)));
    return { width: SQ * (1 - open) + SQ * back * (open >= 1 ? 1 : 0) };
  });
  return (
    <Animated.View style={[{ width: SQ, height: SQ, overflow: "hidden", backgroundColor: "#EFEDFA", alignItems: "center", justifyContent: "center" }, round]}>
      {avatarId ? <FaceFill id={avatarId} size={SQ} /> : <PersonGlyph size={SQ * 0.62} />}
      <Animated.View style={[{ position: "absolute", right: 0, top: 0, height: SQ, overflow: "hidden" }, clip]}>
        <View style={{ position: "absolute", right: 0, top: 0 }}>{spec ? <Frost spec={spec} size={SQ} /> : <View style={{ width: SQ, height: SQ, backgroundColor: "#E4E2F0" }} />}</View>
      </Animated.View>
    </Animated.View>
  );
}

/** "Later" on 5: a plain head and shoulders until the signing sheet asks again. */
function PersonGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={8.5} r={4} fill="none" stroke={OB.ink} strokeWidth={1.8} />
      <Path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6" fill="none" stroke={OB.ink} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/** The empty signature line: a small ✕, the line, and a pen hovering over it — nothing is written. */
function SignatureLine({ clock, still }: { clock: SharedValue<number>; still: boolean }) {
  const [lineW, setLineW] = useState(0);
  const pen = useAnimatedStyle(() => {
    if (still) return { transform: [{ translateY: 0 }, { rotate: "0deg" }] };
    const k = (clock.value / RS.loop) * Math.PI * 2;
    return { transform: [{ translateY: -3 + 3 * Math.sin(k * 2) }, { translateX: 6 * Math.sin(k) }, { rotate: `${4 * Math.sin(k * 2)}deg` }] };
  });
  return (
    <View style={{ height: 30, marginTop: 4, flexDirection: "row", alignItems: "flex-end" }}>
      <Text maxFontSizeMultiplier={OB_MAX_FONT} style={{ ...FONT.mono, fontSize: 13, color: OB.ink, marginRight: 6, marginBottom: 1 }}>×</Text>
      <View style={{ flex: 1, height: 2, marginBottom: 4 }} onLayout={(e) => setLineW(e.nativeEvent.layout.width)}>
        <Svg width={lineW} height={2}>
          <Line x1={0} y1={1} x2={lineW} y2={1} stroke={OB.ink} strokeWidth={1.5} strokeDasharray="4 3" />
        </Svg>
      </View>
      <Animated.View style={[{ position: "absolute", right: 6, bottom: 6 }, pen]}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path d="M4 20l1.2-4.4L15.6 5.2a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.4 18.8z M14 6.8l3.2 3.2" fill="none" stroke={OB.ink} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}
