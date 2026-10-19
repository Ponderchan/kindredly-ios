import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { PF } from "../theme/post";
import { THEMES } from "../theme/themes";
import { scrimColor, useP, useTheme } from "../lib/theme";
import { WrenBird } from "./WrenBird";
import { t, useLang } from "../lib/i18n";
import { localeTag } from "../lib/format";
import { useEntitlement } from "../lib/entitlement";
import { clearCofounderCache } from "../lib/cofounder-seats";
import { iapActiveTrial } from "../lib/iap";
import { useFares } from "../lib/fares";
import { trialFromIntro, type Trial } from "../screens/paywall/paywall-model";
import "../data/strings-a11y-today";

/* THE ONE MOMENT THE PRODUCT USED TO SAY NOTHING AT ALL.
 *
 * A purchase closed the paywall and returned you to whatever was behind it.
 * Apple's own receipt sheet had already appeared, so the last thing the
 * product itself said about the most important decision anyone makes here
 * was nothing — and Apple's sheet is a receipt, not a welcome.
 *
 * No confetti: this is a post office, and First Class is a postal class
 * before it is a subscription tier. So the thing that happens is the thing
 * that happens to a letter that has been upgraded — the airmail border, and
 * a FIRST CLASS mark struck across it in the postmark's own red. Same
 * gesture as CourierSendOff's strike, same ka-chunk, so the reader has met
 * it before. Wren wears the scarf she was promised in the fare list.
 */

let Haptics: typeof import("expo-haptics") | null = null;
try {
  Haptics = require("expo-haptics");
} catch {}
const kaChunk = () => {
  try {
    void Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {}
};

/* the red-and-blue chevrons down an airmail envelope's edge. Printed on
   the envelope, so they don't follow the theme: the postmark's red, and the
   day themes' indigo, which in Classic is where the old pen lands
   (#3A3AF5 → #3A34D6). Midnight's indigo is a pale violet made for its dark
   ground; on an envelope it would read as a different border. */
const AIRMAIL_IND = THEMES.classic.ind;

/* `clip` ends the strip at the ticket's edge. The strip is drawn w (360)
   wide, wider than the ticket on any phone under 416pt (the ticket is the
   width less the 28pt gutters), so unclipped it runs past the right edge
   onto the dim: about 23pt on a 393pt iPhone, 41pt on an SE. That happens in
   the light themes too, a defect older than 7.1 that is left alone there
   because the light themes must not change in this step (owner question).
   On Midnight the ticket has a frame, so it is clipped now. */
function AirmailEdge({ w, flip, clip }: { w: number; flip?: boolean; clip?: boolean }) {
  const P = useP();
  const bars = Math.ceil(w / 14) + 1;
  const strip = (
    <Svg width={w} height={9} style={flip ? { transform: [{ rotate: "180deg" }] } : undefined}>
      {Array.from({ length: bars }, (_, i) => (
        <Path
          key={i}
          d={`M${i * 14} 9 L${i * 14 + 7} 0 L${i * 14 + 12} 0 L${i * 14 + 5} 9 Z`}
          fill={i % 2 ? P.post : AIRMAIL_IND}
        />
      ))}
    </Svg>
  );
  return clip ? <View style={{ overflow: "hidden" }}>{strip}</View> : strip;
}

/* THE CARD'S FACTS (a11y pass, 2026-10-19). Both come from the receipts, never from the card:
   · LIFETIME: the buyer's own Cofounder number (useEntitlement().cofounderNo, my_cofounder_no()).
     Right after the purchase the server may not have heard from the store yet (the webhook), so
     while it is null the card asks again a few times; until it answers, no number is shown — never
     a made-up one.
   · A SUBSCRIPTION THAT BEGAN WITH A FREE TRIAL: one line with the trial's length (the bought
     product's own intro offer, as lib/fares has it from RevenueCat) and the day of the first charge
     (the trial's end on the App Store's receipt, lib/iap iapActiveTrial). Either unknown: no line. */
const COFOUNDER_RETRY_MS = [3_000, 8_000, 20_000];

function trialLine(trial: Trial, endsAt: string): string {
  const end = new Date(endsAt);
  const sameYear = end.getFullYear() === new Date().getFullYear();
  const date = end.toLocaleDateString(localeTag(), sameYear ? { month: "long", day: "numeric" } : { month: "long", day: "numeric", year: "numeric" });
  if (trial.unit === "day") return trial.n === 1 ? t("a11yt.fcw.trialDayOne", { date }) : t("a11yt.fcw.trialDays", { n: trial.n, date });
  return trial.n === 1 ? t("a11yt.fcw.trialMonthOne", { date }) : t("a11yt.fcw.trialMonths", { n: trial.n, date });
}

/** the bought subscription's free trial, as one line, or "" while (or if) it can't be said */
function useTrialLine(on: boolean): string {
  useLang();
  const fares = useFares();
  const [started, setStarted] = useState<{ productId: string; endsAt: string } | null>(null);
  useEffect(() => {
    if (!on) return;
    let alive = true;
    void iapActiveTrial().then((x) => alive && setStarted(x));
    return () => {
      alive = false;
    };
  }, [on]);
  if (!on || !started) return "";
  // the bought product's own intro offer (not the fare's eligibility-checked trial: once bought,
  // the store says this Apple ID may no longer take it)
  const fare = fares.fares.find((f) => (f.raw as { product?: { identifier?: string } } | null)?.product?.identifier === started.productId);
  const intro = (fare?.raw as { product?: { introPrice?: { price?: unknown; periodUnit?: unknown; periodNumberOfUnits?: unknown; cycles?: unknown } | null } } | null)?.product?.introPrice;
  const trial = intro
    ? trialFromIntro({ price: Number(intro.price), periodUnit: String(intro.periodUnit || ""), periodNumberOfUnits: Number(intro.periodNumberOfUnits) || 0, cycles: Number(intro.cycles) || 0 })
    : null;
  return trial ? trialLine(trial, started.endsAt) : "";
}

export function FirstClassWelcome({ lifetime, onDone }: { lifetime?: boolean; onDone: () => void }) {
  const P = useP();
  const { cofounderNo, refresh } = useEntitlement();
  const trial = useTrialLine(!lifetime);
  /* the number may land a few seconds after the purchase (see THE CARD'S FACTS) */
  const waitingForNo = !!lifetime && cofounderNo == null;
  useEffect(() => {
    if (!waitingForNo) return;
    const ids = COFOUNDER_RETRY_MS.map((ms) =>
      setTimeout(() => {
        clearCofounderCache();
        void refresh();
      }, ms),
    );
    return () => ids.forEach(clearTimeout);
  }, [waitingForNo, refresh]);
  const { t: T, dark } = useTheme();
  const card = useSharedValue(0);
  const mark = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      card.value = 1;
      mark.value = 1;
      return;
    }
    // the ticket lands
    card.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    // and the mark comes down on it, hard, once
    mark.value = withDelay(
      430,
      withSequence(
        withTiming(1, { duration: 190, easing: Easing.in(Easing.quad) }),
        withTiming(0.94, { duration: 90 }),
        withTiming(1, { duration: 70 }),
      ),
    );
    const id = setTimeout(kaChunk, 610); // on impact, not on mount
    return () => clearTimeout(id);
  }, [reduced, card, mark]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: card.value,
    transform: [{ translateY: (1 - card.value) * 26 }, { scale: 0.96 + card.value * 0.04 }],
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, mark.value * 2),
    transform: [{ scale: 2.2 - mark.value * 1.2 }, { rotate: `${-13 + (1 - mark.value) * 9}deg` }],
  }));

  /* the ticket is a card on the theme — its face is the card face (sf), so
     in Lavender it stays white over the lavender page — and its button is
     the solid ink one, labelled in the page colour. The dim behind it is a
     fixed scrim, like every overlay in 10a: dark over any ground.
     On Midnight the fixed scrim barely darkens the dark page, so it is black
     (lib/theme scrimColor), and the ticket takes a 1.5 ln frame: sf on the
     dimmed page is 1.2:1, and without one only the airmail strips showed,
     the sides melting into the page. The strips are clipped to it
     (AirmailEdge clip); the card itself doesn't clip, so the FIRST CLASS
     mark can still come down from outside it. */
  /* IT SCROLLS (a11y pass): at the larger text sizes the ticket is taller than the screen, and a
     centred card spilled START WRITING — the one way on — off the bottom. Centred while it fits. */
  return (
    <View accessibilityViewIsModal style={{ position: "absolute", inset: 0, backgroundColor: dark ? scrimColor(true, 0.55) : "rgba(17,17,19,0.55)" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingVertical: 24 }}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
      <Animated.View style={[{ width: "100%", maxWidth: 360, backgroundColor: P.sheet }, dark && { borderWidth: 1.5, borderColor: T.ln }, cardStyle]}>
        <AirmailEdge w={360} clip />

        <View style={{ paddingHorizontal: 26, paddingTop: 30, paddingBottom: 26, alignItems: "center" }}>
          <WrenBird size={92} mood="delight" accessory="scarf" stage="wren" />

          {/* the strike — absolutely placed so it lands ACROSS her, the way a
              postmark lands across whatever is already on the envelope */}
          <Animated.View style={[{ position: "absolute", top: 44, alignSelf: "center" }, markStyle]}>
            <View style={{ borderWidth: 2.5, borderColor: P.post, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: "transparent" }}>
              <Text maxFontSizeMultiplier={1.35} style={{ fontFamily: PF.monoSemi, fontSize: 15, letterSpacing: 2.5, color: P.post }}>
                {t("pw.welcome.mark")}
              </Text>
            </View>
          </Animated.View>

          <Text accessibilityRole="header" maxFontSizeMultiplier={1.6} style={{ fontFamily: PF.letter, fontSize: 25, lineHeight: 33, color: P.ink, textAlign: "center", marginTop: 26 }}>
            {t(lifetime ? "pw.welcome.lifeTitle" : "pw.welcome.title")}
          </Text>
          {/* the buyer's own number, once the server has it (see THE CARD'S FACTS) */}
          {lifetime && cofounderNo != null && (
            <Text maxFontSizeMultiplier={1.35} style={{ fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 2, color: P.ink, textAlign: "center", marginTop: 10 }}>
              {t("cf.no", { n: String(cofounderNo).padStart(3, "0") })}
            </Text>
          )}
          <Text maxFontSizeMultiplier={1.6} style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 23, color: P.ink60, textAlign: "center", marginTop: 12 }}>
            {t(lifetime ? "pw.welcome.lifeBody" : "pw.welcome.body")}
          </Text>
          {/* the trial's length and the first charge's day (see THE CARD'S FACTS) */}
          {!!trial && (
            <Text maxFontSizeMultiplier={1.6} style={{ fontFamily: PF.letter, fontSize: 13, lineHeight: 19, color: P.ink60, textAlign: "center", marginTop: 10 }}>
              {trial}
            </Text>
          )}

          <Pressable
            onPress={onDone}
            accessibilityRole="button"
            style={{ marginTop: 26, alignSelf: "stretch", backgroundColor: P.ink, paddingVertical: 15, alignItems: "center" }}
          >
            <Text maxFontSizeMultiplier={1.35} style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 2, color: T.bg }}>
              {t("pw.welcome.go")}
            </Text>
          </Pressable>
        </View>

        <AirmailEdge w={360} flip clip />
      </Animated.View>
      </ScrollView>
    </View>
  );
}
