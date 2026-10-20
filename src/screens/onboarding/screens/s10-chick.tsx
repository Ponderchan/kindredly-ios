import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { EGG_SHELLS } from "../../../components/EggShell";
import { WrenBird, type WrenMood } from "../../../components/WrenBird";
import type { HatchlingForm } from "../../../lib/hatchling-form";
import { EDGE, FONT, OB } from "../parts/tokens";
import { OB_MAX_FONT } from "../parts/tokens";
import { t } from "../../../lib/i18n";
import "../../../data/strings-a11y-onboarding";

/* THE CHICK AFTER THE HATCH (screens 10, 11 and 13; the Today slip).
   ────────────────────────────────────────────────────────────────────────
   Out of its shell and standing on Shell: the hatchling as the hatch
   engine read it from your letter (its form, its face at rest, the
   birthmark of the shell you picked on 2), in the default Sky and bare —
   the run never borrows the look the phone's account happens to have on.
   It breathes, and it ANSWERS: a letter typed into its name makes it chirp
   (a squish and a ♪), a pronoun picked makes it tilt its head, the dice
   or a chip makes it happy (a hop), the key going makes it hop, and a
   finger on it gets a little reaction of its own — the old run's
   Hatchling, re-inked for the new ground. On 10 its name fills in on a tag
   as you type (acid, ink edge, mono); on 11 it holds your envelope; on 13
   it stands over the letters it brought back. Reduce Motion: no breath, no
   hop; the faces still change. */

export type Nudge = { n: number; re: "chirp" | "tilt" | "happy" };
const POKES: WrenMood[] = ["delight", "curious", "wink", "happy"];

export function Chick({
  shell,
  form,
  mood,
  size = 112,
  nudge,
  tag,
  name,
  holding,
}: {
  shell: number;
  form?: HatchlingForm;
  mood: WrenMood;
  size?: number;
  /** bump n to make it react from outside (typing, a pronoun, the dice, the key) */
  nudge?: Nudge;
  /** the name tag round its neck (10), as typed */
  tag?: string | null;
  /** VoiceOver: its name as typed (the tag is in capitals), said after "Your courier" */
  name?: string | null;
  /** something at its side: your envelope (11) */
  holding?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const [said, setSaid] = useState<Nudge["re"] | null>(null);
  const [pokes, setPokes] = useState(0);
  const air = useSharedValue(0);
  const squish = useSharedValue(0);
  const tilt = useSharedValue(0);
  const spark = useSharedValue(0);
  const swing = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    air.value = withRepeat(withSequence(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1700, easing: Easing.inOut(Easing.quad) })), -1, false);
  }, [reduce, air]);

  const hop = () => {
    if (reduce) return;
    squish.value = withSequence(withTiming(-1, { duration: 90, easing: Easing.out(Easing.quad) }), withTiming(1, { duration: 220, easing: Easing.out(Easing.back(2.6)) }), withSpring(0, { damping: 9, stiffness: 220 }));
  };

  const first = useRef(nudge?.n ?? 0);
  useEffect(() => {
    if (!nudge || nudge.n === first.current) return;
    setSaid(nudge.re);
    if (!reduce) swing.value = withSequence(withTiming(-7, { duration: 90 }), withSpring(0, { damping: 6, stiffness: 200 }));
    if (nudge.re === "chirp") {
      if (!reduce) squish.value = withSequence(withTiming(0.5, { duration: 80 }), withSpring(0, { damping: 9, stiffness: 240 }));
      spark.value = withSequence(withTiming(1, { duration: 120 }), withDelay(200, withTiming(0, { duration: 280 })));
    } else if (nudge.re === "tilt") {
      if (!reduce) tilt.value = withSequence(withSpring(-12, { damping: 10, stiffness: 180 }), withDelay(700, withSpring(0, { damping: 10, stiffness: 180 })));
    } else hop();
    const id = setTimeout(() => setSaid(null), nudge.re === "tilt" ? 1000 : 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nudge?.n]);

  const body = useAnimatedStyle(() => ({
    transform: [
      { translateY: -air.value * 2.5 - squish.value * 14 },
      { scaleX: 1 - squish.value * 0.12 + air.value * 0.01 },
      { scaleY: 1 + squish.value * 0.16 + air.value * 0.015 },
      { rotate: `${tilt.value}deg` },
    ],
  }));
  const sparkStyle = useAnimatedStyle(() => ({ opacity: spark.value, transform: [{ translateY: -spark.value * 16 }, { scale: 0.6 + spark.value * 0.5 }] }));
  const tagStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-6 + swing.value}deg` }] }));

  const face: WrenMood = said === "chirp" ? "listen" : said === "tilt" ? "curious" : said === "happy" ? "happy" : pokes > 0 ? POKES[(pokes - 1) % POKES.length] : mood;
  const mark = (EGG_SHELLS[shell] ?? EGG_SHELLS[0]).mark;

  return (
    <Pressable
      onPress={() => {
        setPokes((n) => n + 1);
        hop();
        spark.value = withSequence(withTiming(1, { duration: 160 }), withDelay(280, withTiming(0, { duration: 320 })));
      }}
      hitSlop={10}
      accessibilityRole="image"
      accessibilityLabel={name ? t("a11yob.chickNamed", { name }) : t("a11yob.chick")}
      style={{ width: size * 1.6, height: size * 1.12, alignItems: "center", justifyContent: "flex-end" }}
    >
      <Animated.Text maxFontSizeMultiplier={OB_MAX_FONT} style={[sparkStyle, { position: "absolute", top: 0, left: size * 0.32, fontSize: 18, color: OB.blue }]}>♪</Animated.Text>
      <Animated.View style={body}>
        <WrenBird size={size} mood={face} stage="hatch" form={form} mark={mark} skin="sticker" accessory="none" outlined />
      </Animated.View>
      {!!holding && <View pointerEvents="none" style={{ position: "absolute", right: 0, bottom: size * 0.08 }}>{holding}</View>}
      {!!tag && (
        <Animated.View entering={ZoomIn.duration(220)} pointerEvents="none" style={[tagStyle, { position: "absolute", right: size * 0.1, bottom: size * 0.06 }]}>
          <View style={{ backgroundColor: OB.acid, borderWidth: EDGE - 0.5, borderColor: OB.ink, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={1} style={{ ...FONT.monoSemi, fontSize: 11, letterSpacing: 1.2, color: OB.ink }}>
              {tag}
            </Text>
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}
