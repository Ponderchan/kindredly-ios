import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Keyboard, KeyboardAvoidingView, PixelRatio, Platform, Pressable, Text, TextInput, View, useWindowDimensions } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useDerivedValue, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { localeTag } from "../../../lib/format";
import { getLang, t } from "../../../lib/i18n";
import { screenNow } from "../../../lib/wren";
import { OPENING_MIN, weightedCount } from "../../../lib/weighted-count";
import { lettersLeft } from "../flow";
import { BackKey, nestTop, useFocusOnMount } from "../parts/frame";
import { NEST_EGG } from "../parts/nest-egg";
import { AcidKey } from "../parts/keys";
import { FONT, GUTTER, OB, TYPE } from "../parts/tokens";
import type { ObScreenProps } from "../types";
import { FlapEgg } from "./s07-flap";
import "../../../data/strings-onboarding2";
import { OB_MAX_FONT } from "../parts/tokens";

/* SCREEN 7 · THE FIRST LETTER — the sheet is the screen (storyboard §6 · 7).
   ────────────────────────────────────────────────────────────────────────
   You are inside your envelope: the ground is the letter's paper (the
   runner's "paper" ground), with a slim strip of Post Blue and the open
   flap at the very top, and the egg sitting on the flap's point,
   listening (s07-flap). Top to bottom on the paper:
     · the egg's voice ("reading over your shoulder.");
     · THE CLOCK LINE, from the phone: "11:40 pm, Saturday. Someone out
       there is up too." at night (21:00–05:00), "2:15 pm, Tuesday.
       Somewhere a stranger is checking the post." by day — B's montage
       idea kept as one true line;
     · the headline and its line, left-aligned like a page;
     · the CUE CHIP ("STUCK?" and one of the existing 18 cues, ob.cue.*):
       a tap deals another, for anyone who opens the page and finds
       nothing to say;
     · the ruled page itself (Newsreader italic), autofocused, so the
       keyboard rises with the screen;
     · above the keyboard, the thin ink METER to the 20-character mark
       ("{n} more to travel" → "that'll travel ✓"), the HOUSE RULE, and
       "Stamp it", dim until the letter travels.

   ONE LETTER, AND IT MUST TRAVEL. The letter you write here is the letter
   that flies on 12 and the hatch engine's whole sample on 9, so it has to
   reach OPENING_MIN (20 weighted characters, lib/weighted-count — the same
   floor as every opening letter): the flow keeps the key dim below it
   (flow.canAdvance), and the meter says how far there is to go.

   THE HOUSE RULE IS TRUE. "No links, emails or phone numbers. Those don't
   get carried." is exactly what lib/wren screenNow blocks; the first post
   doesn't go through that screen on its own, so this screen holds the key
   dim while screenNow finds one, and the rule turns into the reason
   ("There's a link, an email or a number in it…"). Nothing typed is ever
   thrown away: the draft keeps every keystroke (‹ keeps it too).

   THE EGG IS THE NEST EGG. On the way in (from 6, or back from 8) it comes
   down out of the nest slot onto the flap's point as the page rises a
   little under the flap; on the way out it goes back up into the slot, to
   exactly where the runner's nest egg sits on 8, so it never jumps.

   OUT (→ 8): "Stamp it" drops the keyboard, the page folds up into itself
   and the blue flap closes down over it — so the screen is all Post Blue
   when 8 fades in on its blue. Reduce Motion: no fold, no rise, no
   travel; straight on. A short room with the keyboard up (COMPACT: an SE, a
   13 mini, or any phone at a large text size) loses the egg's voice, the
   line under the headline and the STUCK? chip, the meter shares the key's
   row, and the house rule only shows when it bites (a full-width line above
   that row), so three ruled lines stay above the bar. */

/** the egg on the flap (it is the nest egg, smaller) */
const FLAP_EGG = 46;
/** the ruled page's line pitch (the letter's line height) */
const PITCH = 28;
/** how far the flap's point comes down below the strip */
const POINT = 18;
const CUE_COUNT = 18;
/** the meter's track (to the 20-character mark) */
const METER_W = 132;
/** "that'll travel ✓" — a deep green that reads on the sheet (5.4:1 on #FFFDF8) */
const GO = "#2E7D46";
/** the house rule when it bites (6.3:1 on the sheet) */
const STOP = "#B3261E";

/** "11:40 pm, Saturday. Someone out there is up too." — the phone's own time, in the reader's language. */
export function clockLine(now: number): string {
  const d = new Date(now);
  const h = d.getHours();
  const night = h >= 21 || h < 5;
  let time = "";
  let day = "";
  try {
    const loc = localeTag();
    time = new Intl.DateTimeFormat(loc, { hour: "numeric", minute: "2-digit" }).format(d);
    // English says "11:40 pm" in a line of prose (Intl writes "PM", often after a narrow no-break space)
    if (getLang() === "en") time = time.replace(/\s?([AP]M)$/i, (_m, p: string) => ` ${p.toLowerCase()}`);
    day = new Intl.DateTimeFormat(loc, { weekday: "long" }).format(d);
  } catch (e) {
    console.warn("[onboarding] the clock line couldn't be formatted:", e);
    time = `${h}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return t(night ? "ob2.letter.clockNight" : "ob2.letter.clockDay", { time, day });
}

export default function S07Letter(props: ObScreenProps) {
  const { draft } = props;
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const reduce = useReducedMotion();
  const text = draft.letter;
  const count = weightedCount(text.trim());
  const left = lettersLeft(text);
  const clean = screenNow(text).ok;
  const ready = props.canAdvance && clean;
  const [kb, setKb] = useState(false);
  const [kbH, setKbH] = useState(0);
  /* COMPACT is judged on the room the keyboard leaves, not the window: an SE (667 less a 260
     keyboard, less the status bar) and a 13 mini (812 less ~335, less 50) both have about 400pt,
     and the bar under the page grows with the text size, so the threshold grows with it too
     (capped where this screen's type stops growing). The page needs its three lines. */
  const room = H - kbH - insets.top;
  const compact = kb && room < 440 * Math.min(PixelRatio.getFontScale(), OB_MAX_FONT);
  /* the bar's words stop growing early in compact, so the bar can't climb over the page */
  const barFont = compact ? 1.15 : OB_MAX_FONT;
  const headRef = useRef<Text>(null);
  useFocusOnMount(headRef);
  const [pageH, setPageH] = useState(0);
  const leaving = useRef(false);

  /* a fresh page deals a random cue (the draft starts on 0); a resumed one keeps its own */
  useEffect(() => {
    if (draft.cue === 0 && !draft.letter) props.set({ cue: 1 + Math.floor(Math.random() * (CUE_COUNT - 1)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (e) => {
      setKbH(e.endCoordinates.height);
      setKb(true);
    });
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKb(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  /* the flap: a blue panel whose bottom edge is the flap's V. At rest the V sits just under
     the status bar; "Stamp it" brings it down over the whole page (the envelope closing). */
  const flapH = insets.top + 58; // where the strip's straight edges end
  const panelH = H + POINT + 60; // tall enough that, closed, it covers the window to its very top
  const edge = panelH - POINT - 20; // the strip's edge, in the panel's own coordinates
  const close = useSharedValue(0);
  const fold = useSharedValue(0);
  const rise = useSharedValue(reduce ? 0 : 1);
  useEffect(() => {
    if (!reduce) rise.value = withTiming(0, { duration: 360, easing: Easing.out(Easing.cubic) });
  }, [reduce, rise]);
  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: flapH - edge + close.value * (H + POINT + 12 - flapH) }] }));
  /* the egg between the flap's point and the nest (parts/frame nestTop, parts/nest-egg NEST_EGG): 0 = on the flap, 1 = in the nest */
  const toNest = nestTop(insets.top) + NEST_EGG / 2 - (flapH + POINT - FLAP_EGG / 2 - 2);
  const egg = useAnimatedStyle(() => {
    const k = Math.max(close.value, rise.value);
    return { transform: [{ translateY: k * toNest }, { scale: 1 + k * (NEST_EGG / FLAP_EGG - 1) }] };
  });
  const ring = useDerivedValue(() => 1 - Math.max(close.value, rise.value));
  const page = useAnimatedStyle(() => ({
    opacity: 1 - fold.value * 0.9,
    transform: [{ translateY: rise.value * 22 - fold.value * 60 }, { scaleY: 1 - fold.value * 0.66 }],
  }));

  const [leavingNow, setLeavingNow] = useState(false);
  const stampIt = () => {
    if (!ready || leaving.current) return;
    leaving.current = true;
    setLeavingNow(true);
    Keyboard.dismiss();
    if (reduce) {
      props.advance();
      return;
    }
    const go = () => props.advance();
    fold.value = withTiming(1, { duration: 300, easing: Easing.in(Easing.quad) });
    close.value = withDelay(120, withTiming(1, { duration: 300, easing: Easing.inOut(Easing.cubic) }, (fin) => {
      if (fin) runOnJS(go)();
    }));
  };

  /* VoiceOver hears the turns (accessibilityLiveRegion is Android's only): the meter reaching the
     mark, and the house rule biting or letting go */
  const was = useRef({ left, clean });
  useEffect(() => {
    const p = was.current;
    was.current = { left, clean };
    if (p.clean && !clean) AccessibilityInfo.announceForAccessibility(t("ob2.letter.ruleHit"));
    else if (clean && left === 0 && (p.left > 0 || !p.clean)) AccessibilityInfo.announceForAccessibility(t("ob2.letter.ready"));
  }, [left, clean]);

  const dealCue = () => props.set({ cue: draft.cue + 1 });
  const cueKey = `ob.cue.${(draft.cue % CUE_COUNT) + 1}`;
  const rules = Math.max(3, Math.floor((pageH - 4) / PITCH));
  const fill = Math.min(1, count / OPENING_MIN);

  return (
    <View style={{ flex: 1 }}>
      {/* the status bar stands on the blue strip, not on the paper the runner's ground names (a later mount wins) */}
      <StatusBar style="light" animated />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View style={[{ flex: 1, paddingTop: flapH + POINT + 6, paddingHorizontal: GUTTER }, page]}>
          {!compact && (
            <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={1} style={[TYPE.voice, { color: OB.inkSoft, textAlign: "center", marginBottom: 12 }]}>
              {t("ob2.voice.letter")}
            </Text>
          )}
          <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: FONT.semi, fontSize: 13.5, color: OB.inkSoft }}>
            {clockLine(props.now())}
          </Text>
          <Text ref={headRef} maxFontSizeMultiplier={OB_MAX_FONT} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[TYPE.headline, { color: OB.ink, marginTop: 4 }]}>
            {t("ob2.letter.head")}
          </Text>
          {!compact && (
            <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={2} style={[TYPE.lineSmall, { color: OB.inkSoft, marginTop: 4 }]}>
              {t("ob2.letter.line")}
            </Text>
          )}

          {/* the cue chip: STUCK? and one of the eighteen cues; a tap deals another (not in compact:
              the page needs the room more, and the chip is back as soon as the keyboard goes) */}
          {!compact && (
          <Pressable
            onPress={dealCue}
            accessibilityRole="button"
            accessibilityLabel={`${t("ob2.letter.stuck")} ${t(cueKey)}`}
            accessibilityHint={t("ob2.letter.stuckA11y")}
            style={({ pressed }) => ({
              marginTop: 14,
              height: 40,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: OB.ink,
              backgroundColor: "#FFF3D6",
              flexDirection: "row",
              alignItems: "center",
              paddingLeft: 14,
              paddingRight: 5,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.label, { color: "#7A5A12", letterSpacing: 1.4 }]}>{t("ob2.letter.stuck")}</Text>
            <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={1} style={{ flex: 1, marginLeft: 9, marginRight: 6, fontFamily: FONT.letterItalic, fontSize: 14.5, color: OB.ink }}>
              {t(cueKey)}
            </Text>
            <Deal turn={draft.cue} />
          </Pressable>
          )}

          {/* the page: ruled, like the paper it is */}
          <View style={{ flex: 1, marginTop: 12, minHeight: PITCH * 3 }} onLayout={(e) => setPageH(e.nativeEvent.layout.height)}>
            {Array.from({ length: rules }, (_, i) => (
              <View key={i} pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: PITCH - 1 + i * PITCH, height: 1, backgroundColor: "rgba(30,27,53,0.12)" }} />
            ))}
            <TextInput maxFontSizeMultiplier={OB_MAX_FONT}
              value={text}
              onChangeText={(v) => props.set({ letter: v })}
              multiline
              autoFocus
              maxLength={2000}
              placeholder={t("ob.write.ph")}
              placeholderTextColor="rgba(74,70,100,0.6)"
              selectionColor={OB.blue}
              keyboardAppearance="light"
              accessibilityLabel={t("ob2.letter.head")}
              // fontStyle too: a TextInput given the italic face alone typed upright while its
              // placeholder leaned (the same trap the compose page's Fraunces-Italic fell into)
              style={{ flex: 1, fontFamily: FONT.letterItalic, fontStyle: "italic", fontSize: 19.5, lineHeight: PITCH, color: OB.ink, paddingTop: 2, paddingBottom: 4, paddingHorizontal: 0, textAlignVertical: "top" }}
            />
          </View>
        </Animated.View>

        {/* above the keyboard: the meter, the house rule, the key. Compact: the rule only when it
            bites, full width above one row of meter + key */}
        <View style={{ paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: kb ? 10 : Math.max(insets.bottom, 14), backgroundColor: OB.sheet }}>
          {compact ? (
            <>
              {!clean && (
                <Text maxFontSizeMultiplier={barFont} style={[TYPE.small, { color: STOP, fontFamily: FONT.semi, marginBottom: 8 }]}>
                  {t("ob2.letter.ruleHit")}
                </Text>
              )}
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Meter left={left} fill={fill} font={barFont} width={Math.min(METER_W, W - 2 * GUTTER - 156 - 12)} />
                </View>
                <AcidKey label={t("ob2.letter.key")} disabled={!ready} onPress={stampIt} style={{ width: 156 }} />
              </View>
            </>
          ) : (
            <>
              <Meter left={left} fill={fill} font={barFont} width={METER_W} />
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                <Text maxFontSizeMultiplier={barFont} style={[TYPE.small, { flex: 1, marginRight: 14, color: clean ? OB.inkSoft : STOP, fontFamily: clean ? FONT.body : FONT.semi }]}>
                  {clean ? t("ob2.letter.rule") : t("ob2.letter.ruleHit")}
                </Text>
                <AcidKey label={t("ob2.letter.key")} disabled={!ready} onPress={stampIt} style={{ width: 156 }} />
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* the strip of blue and the open flap, the egg on its point, ‹ in the strip */}
      <Animated.View pointerEvents="box-none" style={[{ position: "absolute", left: 0, top: 0, width: W, height: panelH }, panel]}>
        <Svg width={W} height={panelH} style={{ position: "absolute", left: 0, top: 0 }} pointerEvents="none">
          <Path d={`M0 0 H${W} V${edge} L${W / 2} ${edge + POINT} L0 ${edge} Z`} fill={OB.blue} />
          <Path d={`M-2 ${edge} L${W / 2} ${edge + POINT} L${W + 2} ${edge}`} fill="none" stroke={OB.ink} strokeWidth={2} strokeLinejoin="round" />
        </Svg>
      </Animated.View>

      {/* the egg on the flap's point; it comes down from the nest as the page opens, and goes back
          up to it as the flap closes — to exactly where 8's nest egg sits, so the egg never jumps */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: W / 2 - FLAP_EGG / 2, top: flapH + POINT - FLAP_EGG - 2 }, egg]}>
        <FlapEgg shell={draft.shell} len={text.length} size={FLAP_EGG} ringOpacity={ring} />
      </Animated.View>
      {props.back && !leavingNow && (
        <View style={{ position: "absolute", left: 6, top: insets.top }}>
          <BackKey onPress={props.back} on="blue" />
        </View>
      )}
    </View>
  );
}

/** The thin ink meter to the 20-character mark and its words ("{n} more to travel" → "that'll
    travel ✓"); one VoiceOver element. In compact the words wrap under the track if they must. */
function Meter({ left, fill, font, width }: { left: number; fill: number; font: number; width: number }) {
  const words = left > 0 ? t("ob2.letter.left", { n: left }) : t("ob2.letter.ready");
  return (
    <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", rowGap: 4 }} accessible accessibilityLabel={words}>
      <View style={{ width, height: 4, borderRadius: 2, backgroundColor: "rgba(30,27,53,0.14)", overflow: "hidden", marginRight: 10 }}>
        <View style={{ width: width * fill, height: 4, borderRadius: 2, backgroundColor: left > 0 ? OB.ink : GO }} />
      </View>
      <Text maxFontSizeMultiplier={font} style={{ fontFamily: FONT.monoSemi, fontSize: 11.5, letterSpacing: 0.4, color: left > 0 ? OB.inkSoft : GO }}>
        {words}
      </Text>
    </View>
  );
}

/** ↻ in a white disc, turning half a turn each time a cue is dealt (still under Reduce Motion). */
function Deal({ turn }: { turn: number }) {
  const reduce = useReducedMotion();
  const spin = useSharedValue(turn * 180);
  useEffect(() => {
    spin.value = reduce ? turn * 180 : withTiming(turn * 180, { duration: 380, easing: Easing.out(Easing.cubic) });
  }, [turn, reduce, spin]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  return (
    <Animated.View style={[st, { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: OB.ink, backgroundColor: OB.paper, alignItems: "center", justifyContent: "center" }]}>
      <Svg width={14} height={14} viewBox="0 0 24 24">
        <Path d="M20 12a8 8 0 1 1-2.6-5.9 M20 4v5h-5" fill="none" stroke={OB.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}
