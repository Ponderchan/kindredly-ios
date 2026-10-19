import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, findNodeHandle, Pressable, ScrollView, Text, View, useWindowDimensions, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { PF } from "../theme/post";
import { scrimColor, useTheme } from "../lib/theme";
import { t, useLang } from "../lib/i18n";
import { localeTag } from "../lib/format";
import { useEntitlement } from "../lib/entitlement";
import { clearCofounderCache, COFOUNDER_SEATS } from "../lib/cofounder-seats";
import { iapActiveTrial } from "../lib/iap";
import { useFares } from "../lib/fares";
import { pad3, trialFromIntro, type Trial } from "../screens/paywall/paywall-model";
import "../data/strings-fc2";

/* THE RECEIPT — A3 "three stickers" (owner, 2026-10-19; FC2 §4; the prototype
   .claude/mock/fc-receipt, Prompt 1). It replaces the airmail welcome.
   ────────────────────────────────────────────────────────────────────────
   After a StoreKit purchase goes through (usePaywall.buy, once per
   transaction: lib/fc-receipt; never on a restore), one component for
   monthly, yearly and Lifetime. A card anchored to the bottom that grows
   upward: three thick stickers, the title, what was bought in plain words,
   and Start writing, always the last thing and always on screen (the words
   scroll above it at the largest text sizes). No ×: the scrim closes it too.

   NOTHING THE STORE OR THE SERVER HASN'T SAID (D-10):
   - the trial line (its length and the first charge's day) only when the
     App Store's receipt says this product is in a trial that will renew
     (lib/iap iapActiveTrial) and its intro offer gives the length;
   - "charged today" only when no trial is confirmed and the fare offered
     none; if one was offered but the store didn't confirm it, the neutral
     "Renews yearly at {price}";
   - the Cofounder number only once my_cofounder_no() has it (asked again
     3 / 8 / 20 s after the purchase); until then COFOUNDER and the pending
     sentence, updated live when it lands.
   The prices are the store's strings, never re-priced. Sticker words are
   always the fixed ink: the stickers are printed things, the same in every
   theme. In Midnight the scrim is black and the card takes a 1.5 ln frame. */

export type ReceiptPlan = "monthly" | "annual" | "lifetime";

type ReceiptDev = { trial?: { n: number; unit: "day" | "month"; endsAt: string } | null; cofounderNo?: number | null };

let Haptics: typeof import("expo-haptics") | null = null;
try {
  Haptics = require("expo-haptics");
} catch {}
const thunk = () => {
  try {
    void Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {}
};

const INK = "#1E1B35";
const LIME = "#D8F04A";
const GOLD = "#D8A63F";
const LAV = "#E4E2F4";
const COFOUNDER_RETRY_MS = [3_000, 8_000, 20_000];
const TRIAL_RETRY_MS = 2_000;

/* ── the facts ────────────────────────────────────────────────────────── */

type TrialFacts = { trial: Trial; endsAt: string };
/** "wait" while the store hasn't answered; null when no trial is confirmed */
type TrialAnswer = TrialFacts | null | "wait";

/** the bought subscription's free trial as the App Store's receipt has it, with its length from
    the product's own intro offer (not the fare's eligibility-checked one: once bought, the store
    says this Apple ID may no longer take it) */
function useConfirmedTrial(on: boolean, productId: string | null, offeredTrial: boolean, dev: ReceiptDev | undefined): TrialAnswer {
  const fares = useFares();
  const devTrial = dev && "trial" in dev;
  const [started, setStarted] = useState<{ productId: string; endsAt: string } | null | "wait">(on && !devTrial ? "wait" : null);
  useEffect(() => {
    if (!on || devTrial) return;
    let alive = true;
    let retry: ReturnType<typeof setTimeout> | null = null;
    void iapActiveTrial().then((x) => {
      if (!alive) return;
      if (x || !offeredTrial) return setStarted(x);
      // the store may not have the trial on the receipt yet: once more, then say nothing about it
      retry = setTimeout(() => {
        void iapActiveTrial().then((y) => alive && setStarted(y));
      }, TRIAL_RETRY_MS);
    });
    return () => {
      alive = false;
      if (retry) clearTimeout(retry);
    };
  }, [on, devTrial, offeredTrial]);
  if (!on) return null;
  if (devTrial) {
    const d = dev!.trial;
    return d ? { trial: { n: d.n, unit: d.unit }, endsAt: d.endsAt } : null;
  }
  if (started === "wait") return "wait";
  if (!started || !productId || started.productId !== productId) return null;
  const fare = fares.fares.find((f) => (f.raw as { product?: { identifier?: string } } | null)?.product?.identifier === productId);
  const intro = (fare?.raw as { product?: { introPrice?: { price?: unknown; periodUnit?: unknown; periodNumberOfUnits?: unknown; cycles?: unknown } | null } } | null)?.product?.introPrice;
  const trial = intro
    ? trialFromIntro({ price: Number(intro.price), periodUnit: String(intro.periodUnit || ""), periodNumberOfUnits: Number(intro.periodNumberOfUnits) || 0, cycles: Number(intro.cycles) || 0 })
    : null;
  return trial ? { trial, endsAt: started.endsAt } : null;
}

/** the buyer's own Cofounder number, asked again while the server hasn't heard from the store */
function useCofounderNo(lifetime: boolean, dev: ReceiptDev | undefined): number | null {
  const { cofounderNo, refresh } = useEntitlement();
  const devNo = dev && "cofounderNo" in dev;
  const waiting = lifetime && !devNo && cofounderNo == null;
  useEffect(() => {
    if (!waiting) return;
    const ids = COFOUNDER_RETRY_MS.map((ms) =>
      setTimeout(() => {
        clearCofounderCache();
        void refresh();
      }, ms),
    );
    return () => ids.forEach(clearTimeout);
  }, [waiting, refresh]);
  return devNo ? (dev!.cofounderNo ?? null) : cofounderNo;
}

const trialLen = (tr: Trial) =>
  tr.unit === "day" ? (tr.n === 1 ? t("fc2.rc.lenDayOne") : t("fc2.rc.lenDays", { n: tr.n })) : tr.n === 1 ? t("fc2.rc.lenMonthOne") : t("fc2.rc.lenMonths", { n: tr.n });
const trialSticker = (tr: Trial) =>
  tr.unit === "day" ? (tr.n === 1 ? t("fc2.rc.stFreeDayOne") : t("fc2.rc.stFreeDays", { n: tr.n })) : tr.n === 1 ? t("fc2.rc.stFreeMonthOne") : t("fc2.rc.stFreeMonths", { n: tr.n });

/** the three stickers' words, the title and the body, from the facts (pure) */
function receiptWords(plan: ReceiptPlan, price: string, offeredTrial: boolean, trial: TrialAnswer, no: number | null) {
  if (plan === "lifetime") {
    return {
      gold: no != null ? t("fc2.rc.stCofounder", { n: pad3(no) }) : t("fc2.rc.stCofounderPending"),
      lav: t("fc2.rc.stOneOf", { n: COFOUNDER_SEATS }),
      title: t("fc2.rc.titleLife"),
      body: no != null ? t("fc2.rc.bodyLife", { n: pad3(no) }) : t("fc2.rc.bodyLifePending"),
    };
  }
  const year = plan === "annual";
  const plain = year ? t("fc2.rc.stYearly") : t("fc2.rc.stMonthly");
  let body: string;
  let lav = plain;
  if (trial && trial !== "wait") {
    const date = new Date(trial.endsAt).toLocaleDateString(localeTag(), { month: "short", day: "numeric", year: "numeric" });
    body = t(year ? "fc2.rc.bodyTrialYear" : "fc2.rc.bodyTrialMonth", { trial: trialLen(trial.trial), price, date });
    lav = trialSticker(trial.trial);
  } else if (trial === null && !offeredTrial) {
    body = t(year ? "fc2.rc.bodyPaidYear" : "fc2.rc.bodyPaidMonth", { price });
  } else {
    // still asking the store, or a trial was offered but not confirmed: never "charged today"
    body = t(year ? "fc2.rc.bodyRenewYear" : "fc2.rc.bodyRenewMonth", { price });
  }
  return { gold: t("fc2.rc.stClass"), lav, title: t("fc2.rc.titleSub"), body };
}

/* ── the sticker ──────────────────────────────────────────────────────── */

/** a thick sticker: 2.5 ink edge and a hard 3 3 0 ink shadow (an offset sibling: RN shadows
    aren't hard on iOS), turned, placed in the field */
function Sticker({ place, rotate, fill, radius, padV, padH, children }: { place: ViewStyle; rotate: number; fill: string; radius: number; padV: number; padH: number; children: React.ReactNode }) {
  return (
    <View style={[{ position: "absolute", transform: [{ rotate: `${rotate}deg` }] }, place]}>
      <View style={{ position: "absolute", left: 3, top: 3, right: -3, bottom: -3, borderRadius: radius, backgroundColor: INK }} />
      <View style={{ backgroundColor: fill, borderWidth: 2.5, borderColor: INK, borderRadius: radius, paddingVertical: padV, paddingHorizontal: padH }}>{children}</View>
    </View>
  );
}

/* ── the receipt ──────────────────────────────────────────────────────── */

export function FirstClassReceipt({
  plan,
  price,
  productId,
  offeredTrial,
  onDone,
  dev: devIn,
}: {
  plan: ReceiptPlan;
  /** the fare's priceString as the store gave it */
  price: string;
  /** the bought product id, to find its intro offer; null skips the trial line */
  productId: string | null;
  /** did the fare show a free trial when it was bought (paywall-model Fare.trial != null) */
  offeredTrial: boolean;
  /** Start writing and the scrim both call it */
  onDone: () => void;
  /** src/app/dev only (ignored in release): fixed facts instead of the store's and the server's */
  dev?: ReceiptDev;
}) {
  useLang();
  const dev = __DEV__ ? devIn : undefined;
  const { t: T, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  /* the overlay may sit in something shorter than the window (the wardrobe slip's sheet, a dev
     page with its panel): the card's cap follows the box it is drawn in, never the window alone */
  const [boxH, setBoxH] = useState<number | null>(null);
  const capH = Math.min(winH, boxH ?? winH) - 90 - insets.top;
  const lifetime = plan === "lifetime";
  const trial = useConfirmedTrial(!lifetime, productId, offeredTrial, dev);
  const no = useCofounderNo(lifetime, dev);
  const w = receiptWords(plan, price, offeredTrial, trial, no);

  /* popin: .45s cubic-bezier(.3,1.2,.4,1), translateY 30 + scale .96 → 0 / 1; instant under
     Reduce Motion. A medium haptic as it appears. */
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) p.value = withTiming(1, { duration: 450, easing: Easing.bezier(0.3, 1.2, 0.4, 1) });
    else p.value = 1;
    thunk();
  }, [reduced, p]);
  const cardStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 1.6),
    transform: [{ translateY: (1 - p.value) * 30 }, { scale: 0.96 + p.value * 0.04 }],
  }));

  // VoiceOver lands on the title first
  const titleRef = useRef<Text>(null);
  useEffect(() => {
    const id = setTimeout(() => {
      const node = titleRef.current ? findNodeHandle(titleRef.current) : null;
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 120);
    return () => clearTimeout(id);
  }, []);

  const router = useRouter();
  const startWriting = () => {
    onDone();
    // after the fare's sheet has gone, so the composer lands on top of the page underneath
    setTimeout(() => router.push("/compose"), 350);
  };

  const stickerText = { color: INK } as const;

  return (
    <View accessibilityViewIsModal onLayout={(e) => setBoxH(e.nativeEvent.layout.height)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
      <Pressable
        onPress={onDone}
        accessibilityRole="button"
        accessibilityLabel={t("fc2.rc.close")}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: dark ? scrimColor(true, 0.55) : "rgba(30,27,53,0.55)" }}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 20,
            right: 20,
            bottom: 36 + insets.bottom,
            maxHeight: capH,
            backgroundColor: T.sf,
            borderRadius: 28,
            paddingTop: 26,
            paddingHorizontal: 22,
            paddingBottom: 22,
            gap: 18,
          },
          dark && { borderWidth: 1.5, borderColor: T.ln },
          cardStyle,
        ]}
      >
        <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ gap: 18 }} bounces={false} showsVerticalScrollIndicator={false}>
          {/* ① the sticker field */}
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 150, position: "relative" }}>
            <Sticker place={{ left: 8, top: 14 }} rotate={-7} fill={LIME} radius={999} padV={12} padH={18}>
              <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={[stickerText, { fontSize: 18, fontWeight: "800", letterSpacing: -0.18 }]}>
                {t("fc2.rc.stFirst")}
              </Text>
            </Sticker>
            <Sticker place={{ right: 6, top: 62 }} rotate={5} fill={GOLD} radius={14} padV={10} padH={14}>
              <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={[stickerText, { fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 1.56 }]}>
                {w.gold}
              </Text>
            </Sticker>
            <Sticker place={{ left: 40, bottom: 0 }} rotate={-3} fill={LAV} radius={999} padV={8} padH={14}>
              <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={[stickerText, { fontSize: 13, fontWeight: "600" }]}>
                {w.lav}
              </Text>
            </Sticker>
          </View>

          {/* ② the title */}
          <Text ref={titleRef} accessibilityRole="header" style={{ fontSize: 22, fontWeight: "700", letterSpacing: -0.22, color: T.ink }}>
            {w.title}
          </Text>

          {/* ③ what was bought, in plain words */}
          <Text style={{ fontSize: 14, lineHeight: 21, color: T.sub }}>{w.body}</Text>
        </ScrollView>

        {/* ④ Start writing: always last, always on screen. It means what it says (owner,
            2026-10-19): the receipt and the fare close, then the composer opens. The scrim
            only closes. */}
        <View style={{ marginRight: 4, marginBottom: 4 }}>
          <View style={{ position: "absolute", left: 4, top: 4, right: -4, bottom: -4, borderRadius: 16, backgroundColor: LIME }} />
          <Pressable
            onPress={startWriting}
            accessibilityRole="button"
            style={({ pressed }) => ({ minHeight: 52, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, backgroundColor: T.ink, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.9 : 1 })}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: T.bg, textAlign: "center" }}>{t("fc2.rc.go")}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

/** the old name, kept so older imports still compile */
export { FirstClassReceipt as FirstClassWelcome };
