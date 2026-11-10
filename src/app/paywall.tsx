import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { StatusBar } from "expo-status-bar";
import { useIsFocused, useLocalSearchParams, useRouter } from "expo-router";
import { PF, PFM } from "../theme/post";
import { THEMES } from "../theme/themes";
import { W14 } from "../components/AuraCard";
import { CofounderMark } from "../components/CofounderMark";
import { FirstClassReceipt } from "../components/FirstClassWelcome";
import { t, useLang } from "../lib/i18n";
import { useAuth } from "../lib/auth";
import { speakAs, useWrenName } from "../lib/wren-name";
import { useEntitlement } from "../lib/entitlement";
import { IAP_READY, iapGetPackages, iapPurchase, iapRestoreOutcome, type IapPackage } from "../lib/iap";
import { claimReceipt, receiptKey } from "../lib/fc-receipt";
import { clearCofounderCache } from "../lib/cofounder-seats";
import { openPrivacy, openTerms } from "../lib/legal";
import { track, type PaywallSource } from "../lib/track";
import { NativeSurface } from "../components/NativeSurface";
import { usePaywall } from "../screens/paywall/usePaywall";
import { PaywallNative } from "../screens/paywall/PaywallNative";
import { trialFromIntro, type ReceiptFacts } from "../screens/paywall/paywall-model";
import "../data/strings-fc2";
import "../data/strings-a11y-today";

/* FIRST CLASS — the boarding pass, with the fares on it (owner's sheet).
   ────────────────────────────────────────────────────────────────────────
   One page, one decision. The pass says who is travelling and what the
   fare opens; the stub under the perforation holds the fares themselves,
   so nobody is sent to a second screen to find out the price. Paid, the
   same pass reads MEMBERSHIP ACTIVE and the button manages the
   subscription through Apple.

   EVERY LINE IS A GATE THAT EXISTS IN THE CODE AND HAS A DOOR: rooms
   that never close, voice letters, the wardrobe (kindreds are free and
   unlimited). Nothing else is promised. */

/* THE SAME SHEET IN EVERY THEME (10a). The night page, the gold and the
   pale pass are First Class's own colours, the way the mock keeps the
   First Class card the same in every theme, so none of them follow the
   reader's theme. Moving them would break the sheet: on the theme's card
   face the pass would be #1A1830 in Midnight, all but the night page's own
   colour, and would vanish into it. The white type and the notches belong
   to the night page and the dark type to the pass, so they stay with them.

   The pass's indigo — the stripe, the glyphs, the chosen fare — is the day
   themes' indigo, fixed. In Classic that is where the old pen lands anyway
   (#3A3AF5 → #3A34D6); Midnight's own indigo is a pale violet made for a
   dark ground and would sit under 3:1 on the pass.

   Only the page behind the welcome follows the theme.

   THE STATUS BAR IS LIGHT ONLY ON THE FULL PAGE (step 7.1). In
   onboarding's fare step the pass is a full page, so the bar sits on the
   night page: light, 16.6:1. iOS 26 picks that by itself; iOS 18 follows
   the window, which is light in the light themes, and would give dark text
   there (app/_layout). It is mounted only while that screen is focused, as
   every page's own status bar is.

   The route is a page sheet, and its bar is not over the night page at all
   but over the strip above the sheet: the window's ground under the
   sheet's dim. lib/theme paints that ground on the theme's side — #ECECFE
   in the light themes, Midnight's #0F0E1C, which the dim shows as #08070F
   — so the default reads it right on both runtimes (iOS 18 by the window's
   light or dark, iOS 26 by the ground): dark text, 18:1 on #ECECFE; light
   text, 20:1 on #08070F. Light there would be 1.17:1 on the lavender, so
   the sheet names nothing, whether it shows the pass or the welcome, and
   neither do Terms and Privacy opened in Safari over it. Onboarding's
   welcome sits on the theme's page, so it names nothing either. */
const NIGHT = "#1E1B35";
const GOLD = "#D8A63F";
const GOLD_INK = "#8A6E20";
const PASS_IND = THEMES.classic.ind;
const COFOUNDERS_TOTAL = 100;   // "Founding 100 only, numbered" — the App Store product says the same, and so does the web

/* the fare ladder is a design decision, not a dashboard setting: annual is
   the anchor the others are read against, then monthly, then the seat */
const FARE_ORDER: IapPackage["period"][] = ["annual", "monthly", "lifetime"];
const fareRank = (p: IapPackage) => {
  const i = FARE_ORDER.indexOf(p.period);
  return i === -1 ? FARE_ORDER.length : i;
};
/* shown until RevenueCat + the App Store products exist, so the page is
   reviewable before the fares can be bought */
const PLACEHOLDERS: IapPackage[] = [
  { id: "annual", priceString: "$39.99 / year", title: "Annual", period: "annual", raw: null },
  { id: "monthly", priceString: "$6.99 / month", title: "Monthly", period: "monthly", raw: null },
  { id: "lifetime", priceString: "$129", title: "Lifetime", period: "lifetime", raw: null },
];

/* the store's own string, taken apart only far enough to show a per-month
   figure and a saving — never re-priced */
function money(priceString: string): { amount: number; symbol: string; short: string } | null {
  const m = priceString.match(/^\s*([^\d\s]*)\s*([\d.,]+)/);
  if (!m) return null;
  const amount = parseFloat(m[2].replace(",", "."));
  if (!Number.isFinite(amount)) return null;
  return { amount, symbol: m[1] || "", short: `${m[1] || ""}${m[2]}` };
}

/* the route: the pass as a modal sheet, closed with × */
export default function Paywall() {
  const router = useRouter();
  const { src } = useLocalSearchParams<{ src?: string }>();
  const source = (src || "unknown") as PaywallSource;
  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me"));
  /* sent here by an expired room: say so, or the fare page reads as a
     non sequitur to someone who only wanted to answer a friend */
  const lead = source === "rekindle" ? t("pw.road.rekindle") : undefined;
  /* Me 4a: the page is drawn in Swift (screens/paywall: PaywallNative over
     usePaywall), with this file's PaywallBody as the remote switch's
     fallback ("paywall" in app_surfaces, NativeSurface in mount mode). */
  return <FirstClassPaywall source={source} lead={lead} onClose={close} onDone={() => router.back()} sheet />;
}

/* EVERY WAY INTO FIRST CLASS REACHES THE SAME PAGE (FC2 §4.8, owner decision 4).
   The route, Today's wardrobe slip and legacy onboarding's fare step all show
   this: the Swift page (PaywallSwift) where the "paywall" surface is on, this
   file's PaywallBody as its fallback, the same switch the route always used.
   `head` is a title of the host's own for a non-member (the slip's "Keep this
   look"), `lead` the line under it. `sheet`: presented as a page sheet (the
   route, the slip), so the close row sits under the sheet's top; false for a
   full page in a flow (legacy onboarding). `courier` is the courier's name
   when it isn't saved yet (legacy onboarding; the Swift page reads the saved
   one from useWrenName). */
export function FirstClassPaywall({
  source,
  lead,
  head,
  courier,
  onClose,
  onDone,
  sheet = true,
}: {
  source: PaywallSource;
  lead?: string;
  head?: string;
  courier?: string;
  onClose: () => void;
  onDone: () => void;
  sheet?: boolean;
}) {
  return (
    <NativeSurface
      surface="paywall"
      view="KPaywallView"
      mode="mount"
      native={() => <PaywallSwift source={source} lead={lead} head={head} onClose={onClose} onDone={onDone} sheet={sheet} />}
      fallback={() => <PaywallBody source={source} lead={lead} head={head} courier={courier} onClose={onClose} onDone={onDone} sheet={sheet} />}
    />
  );
}

/* the Swift page; once a purchase goes through (and its transaction's receipt
   hasn't been shown on this phone), the A3 receipt over it (FC2 §4.2). The
   page stays mounted under the receipt; Start writing or the scrim → onDone. */
export function PaywallSwift({
  source,
  lead,
  head,
  onClose,
  onDone,
  dev,
  sheet = true,
}: {
  source: PaywallSource;
  lead?: string;
  head?: string;
  onClose: () => void;
  onDone: () => void;
  dev?: Parameters<typeof usePaywall>[0]["dev"];
  sheet?: boolean;
}) {
  const model = usePaywall({ source, lead, head, onClose, onDone, dev });
  const r = model.receipt;
  return (
    <View style={{ flex: 1 }}>
      <PaywallNative model={model} sheet={sheet} />
      {r && <FirstClassReceipt plan={r.plan} price={r.price} productId={r.productId} offeredTrial={r.offeredTrial} onDone={onDone} />}
    </View>
  );
}

/* THE PASS ITSELF, wherever it's shown. The route above presents it as a
   sheet; onboarding shows it as a page in the flow, with its own opening
   line and its own name for the courier (she isn't saved yet there). */
export function PaywallBody({
  source,
  onClose,
  onDone,
  head,
  lead,
  courier,
  sheet,
}: {
  source: PaywallSource;
  onClose: () => void; // × — dismissed without buying
  onDone: () => void; // after the receipt, bought
  head?: string; // the headline, when the page has a reason of its own
  lead?: string; // the line under it
  courier?: string; // her name, when it isn't saved yet
  sheet?: boolean; // presented as the route's page sheet: the bar is over the window's ground, not the night page
}) {
  useLang();
  const savedName = useWrenName();
  const wren = courier || savedName;
  const { handle } = useAuth();
  const { premium, refresh } = useEntitlement();
  const focused = useIsFocused(); // the full page's status bar (see above)
  /* THE FARES STACK (a11y pass): three side by side are 63–75pt each on an SE, so from the larger
     text sizes the terms ("cancel anytime") were cut and the period broke mid-word. From XXXL, or
     a narrow phone past the default sizes, each fare is a full-width row instead. */
  const { width: winW, fontScale } = useWindowDimensions();
  const stacked = fontScale >= 1.35 || (winW < 380 && fontScale > 1.1);

  const [packages, setPackages] = useState<IapPackage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptFacts | null>(null);

  useEffect(() => {
    track("paywall_shown", { source });
  }, [source]);
  useEffect(() => {
    let alive = true;
    iapGetPackages().then((pkgs) => {
      if (!alive) return;
      const list = [...(pkgs.length ? pkgs : PLACEHOLDERS)].sort((a, b) => fareRank(a) - fareRank(b));
      setPackages(list);
      setSelected((list.find((p) => p.period === "annual") || list[0])?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  const chosen = packages.find((p) => p.id === selected);
  const annual = packages.find((p) => p.period === "annual");
  const monthly = packages.find((p) => p.period === "monthly");
  const aM = annual ? money(annual.priceString) : null;
  const mM = monthly ? money(monthly.priceString) : null;
  const saving = aM && mM && mM.amount > 0 ? Math.round((1 - aM.amount / (mM.amount * 12)) * 100) : null;

  const back = () => {
    track("paywall_dismissed", { source, fare: chosen?.period ?? "none" });
    onClose();
  };
  const subscribe = async () => {
    if (!chosen || busy) return;
    if (!IAP_READY || !chosen.raw) {
      Alert.alert(t("pw.almost.title"), t("pw.almost.body"));
      return;
    }
    setBusy(true);
    track("purchase_started", { source, fare: chosen.period, price: chosen.priceString });
    const res = await iapPurchase(chosen);
    setBusy(false);
    if (res.ok) {
      track("purchase_done", { source, fare: chosen.period, price: chosen.priceString });
      clearCofounderCache();
      await refresh();
      // the receipt, once per transaction (FC2 §4.2, the same rule as usePaywall)
      if (await claimReceipt(receiptKey(res, chosen.id))) {
        const period = chosen.period === "lifetime" || chosen.period === "monthly" ? chosen.period : "annual";
        // this page doesn't check trial eligibility: a free intro offer counts as offered, which only
        // ever picks the neutral renewal line over "charged today" (D-10)
        setReceipt({ plan: period, price: chosen.priceString, productId: res.productId ?? chosen.productId ?? null, offeredTrial: period !== "lifetime" && trialFromIntro(chosen.introPrice ?? null) != null });
      } else {
        onDone();
      }
    } else if (!res.cancelled) {
      track("purchase_failed", { source, fare: chosen.period });
      Alert.alert(t("pw.purchase.title"), t("pw.purchase.fail"));
    }
  };
  const restore = async () => {
    if (busy) return;
    setBusy(true);
    const outcome = await iapRestoreOutcome();
    const ok = outcome === "restored";
    setBusy(false);
    await refresh();
    // only the journal book came back (bought once, 2026-11-10; as usePaywall's restore says it)
    if (outcome === "book") Alert.alert(t("pw.restored"), t("bkb.restored"));
    else Alert.alert(ok ? t("pw.restored") : t("pw.nothingRestore"), ok ? t("pw.restoredBody") : t("pw.nothingRestoreBody"));
  };

  // the pass stays under the receipt (FC2 §4.2)
  const receiptView = receipt ? (
    <FirstClassReceipt plan={receipt.plan} price={receipt.price} productId={receipt.productId} offeredTrial={receipt.offeredTrial} onDone={onDone} />
  ) : null;

  const lifetime = !premium && chosen?.period === "lifetime";
  /* the pass lists what the chosen fare opens. First Class: the four gates
     that exist in code. The Lifetime seat: the cofounder's marks — and all
     of First Class underneath, said once. */
  const benefits: [string, string][] = lifetime
    ? [
        [t("pw.cf.number"), t("pw.cf.numberSub", { n: COFOUNDERS_TOTAL })],
        // FC2 (owner decision 2): the stamp avatar replaces "a gold ring on Wren"
        [t("fc2.cf.stamp"), t("fc2.cf.stampSub")],
        [t("pw.cf.first"), t("pw.cf.firstSub")],
        [t("pw.cf.letter"), speakAs(t("pw.cf.letterSub"), wren)],
      ]
    : [
        /* the monthly writing report (fc.b3) is gated in lib/report but its
           page has no way in yet (app/voice → app/report are dev-only until
           they ship); a fare must not list what can't be reached. Put the
           line back the day the report has a door. */
        [t("fc.b1"), t("fc.b1s")],
        [t("fc.b2"), t("fc.b2s")],
        [t("fc.b4", { wren }), t("fc.b4s")],
      ];
  const glyphs = lifetime ? ["■", "■", "■", "■"] : ["◎", "✉", "✦"];
  const price = chosen ? (money(chosen.priceString)?.short ?? chosen.priceString) : "";
  const ctaLabel = premium
    ? t("fc.manage")
    : !chosen
      ? t("fc.board")
      : lifetime
        ? `${t("pw.cta.cofounder")} · ${price}`
        : `${t("fc.board")} · ${price} ${chosen.period === "annual" ? t("fc.perYr") : t("fc.perMo")}`;

  return (
    <View style={{ flex: 1 }}>
    <SafeAreaView style={{ flex: 1, backgroundColor: NIGHT }} edges={["top", "bottom"]}>
      {/* light on the night page; a sheet leaves the bar to iOS (see above) */}
      {focused && !sheet && <StatusBar style="light" />}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 4 }}>
        {/* a modal closes; it doesn't go back. An × on the sheet, not a ‹ */}
        <Pressable onPress={back} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("nb.close")} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M5 5 L19 19 M19 5 L5 19" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" />
          </Svg>
        </Pressable>
        <Text maxFontSizeMultiplier={1.6} numberOfLines={1} style={{ flex: 1, textAlign: "center", ...PFM.monoSemi, fontSize: 12, letterSpacing: 2.6, color: GOLD }}>{t("me.firstClass")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 24, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.6} style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 34, lineHeight: 38, color: "#FFFFFF" }}>{premium ? t("fc.paidHead") : head || t("fc.introHead")}</Text>
        <Text style={{ fontFamily: PF.letter, fontSize: 14.5, lineHeight: 21, color: "rgba(255,255,255,0.62)", marginTop: 10 }}>
          {premium ? t("fc.paidIntroSub", { wren }) : lead || t("fc.introSub")}
        </Text>

        {/* ── the boarding pass ── */}
        <View style={{ marginTop: 20, backgroundColor: "#F9F8FF", borderRadius: 18, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", height: 6 }}>
            {Array.from({ length: 40 }, (_, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: i % 4 === 0 ? PASS_IND : i % 4 === 2 ? GOLD : "#F9F8FF" }} />
            ))}
          </View>
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <Text maxFontSizeMultiplier={1.35} numberOfLines={1} style={{ flexShrink: 1, ...PFM.mono, fontSize: 10.5, letterSpacing: 2.2, color: "rgba(30,27,53,0.5)" }}>{t("fc.passenger")}</Text>
              <Text maxFontSizeMultiplier={1.35} numberOfLines={1} style={{ flexShrink: 1, ...PFM.mono, fontSize: 10.5, letterSpacing: 2.2, color: "rgba(30,27,53,0.5)" }}>{t("fc.messenger")}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 4 }}>
              <Text maxFontSizeMultiplier={1.6} numberOfLines={1} style={{ flexShrink: 1, fontFamily: PF.letter, fontWeight: "700", fontSize: 22, letterSpacing: -0.4, color: W14.ink }}>{handle || t("a11yt.fc.you")}</Text>
              <Text maxFontSizeMultiplier={1.6} numberOfLines={1} style={{ flexShrink: 1, fontFamily: PF.letter, fontWeight: "700", fontSize: 22, letterSpacing: -0.4, color: W14.ink }}>{wren}</Text>
            </View>
            {lifetime && (
              /* the mark itself, as it will sit on their own desk — the thing
                 being sold is visible before it is bought */
              <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#EAE6F5" }}>
                <Text style={{ ...PFM.monoMed, fontSize: 9, letterSpacing: 1.8, color: GOLD_INK }}>{t("pw.cf.title")}</Text>
                <View style={{ alignItems: "flex-start", marginTop: 10 }}>
                  <CofounderMark no={47} size="lg" />
                </View>
                <Text style={{ fontFamily: PF.letter, fontSize: 11.5, color: "rgba(30,27,53,0.5)", marginTop: 7 }}>{t("pw.nameEverywhere")}</Text>
              </View>
            )}
            <View style={{ marginTop: 16, gap: 11 }}>
              {benefits.map(([title, sub], i) => (
                <View key={title} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  {lifetime ? (
                    <View style={{ width: 26, alignItems: "center" }}>
                      <View style={{ width: 9, height: 9, backgroundColor: GOLD }} />
                    </View>
                  ) : (
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#E4E1FA", alignItems: "center", justifyContent: "center" }}>
                      <Text maxFontSizeMultiplier={1} accessibilityElementsHidden importantForAccessibility="no" style={{ ...PFM.mono, fontSize: 11.5, color: PASS_IND }}>{glyphs[i]}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: PF.letter, fontWeight: "600", fontSize: 14.5, color: W14.ink }}>{title}</Text>
                    <Text style={{ fontFamily: PF.letter, fontSize: 12, color: "rgba(30,27,53,0.55)", marginTop: 1 }}>{sub}</Text>
                  </View>
                </View>
              ))}
            </View>
            {lifetime && (
              <Text style={{ fontFamily: PF.letter, fontSize: 13.5, lineHeight: 20, color: GOLD_INK, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#EAE6F5" }}>{t("pw.cf.foot")}</Text>
            )}
          </View>

          {/* ── the stub: the fares, or the active membership ── */}
          <View style={{ position: "relative", borderTopWidth: 2, borderStyle: "dashed", borderColor: "#C9C5E6", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
            <View style={{ position: "absolute", left: -10, top: -11, width: 20, height: 20, borderRadius: 10, backgroundColor: NIGHT }} />
            <View style={{ position: "absolute", right: -10, top: -11, width: 20, height: 20, borderRadius: 10, backgroundColor: NIGHT }} />
            {premium ? (
              <View style={{ alignItems: "center", gap: 4, paddingVertical: 4 }}>
                <Text style={{ ...PFM.mono, fontSize: 12, letterSpacing: 1.6, color: "rgba(30,27,53,0.55)" }}>{t("fc.active")}</Text>
                <Text style={{ fontFamily: PF.letter, fontSize: 14, color: "rgba(30,27,53,0.65)", textAlign: "center" }}>{t("fc.paidSub")}</Text>
              </View>
            ) : (
              <View accessibilityRole="radiogroup" style={{ flexDirection: stacked ? "column" : "row", gap: stacked ? 10 : 8 }}>
                {packages.map((p) => {
                  const on = p.id === selected;
                  const m = money(p.priceString);
                  const perMonth = p.period === "annual" && m ? `${m.symbol}${(m.amount / 12).toFixed(2)}` : null;
                  const periodLabel = p.period === "annual" ? t("fc.yearly") : p.period === "monthly" ? t("fc.monthly") : t("fc.lifetimeLabel");
                  const priceShown = m?.short ?? p.priceString;
                  const sub = p.period === "annual" ? (perMonth ? t("fc.perMonth", { p: perMonth }) : t("fc.perYr")) : p.period === "monthly" ? t("fc.cancelAnytime") : t("fc.foundingOnly", { n: COFOUNDERS_TOTAL });
                  const badge = p.period === "annual" && saving != null && saving > 0 ? t("fc.save", { n: saving }) : null;
                  const badgeView = badge ? (
                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: GOLD, alignSelf: "flex-start" }}>
                      <Text maxFontSizeMultiplier={1.35} style={{ ...PFM.monoSemi, fontSize: 9, letterSpacing: 0.8, color: W14.ink }}>{badge}</Text>
                    </View>
                  ) : null;
                  const periodText = (
                    <Text maxFontSizeMultiplier={1.6} style={{ ...PFM.monoSemi, fontSize: 9.5, letterSpacing: 1.4, color: on ? PASS_IND : "rgba(30,27,53,0.5)" }}>{periodLabel}</Text>
                  );
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => {
                        setSelected(p.id);
                        track("fare_selected", { source, fare: p.period });
                      }}
                      // one radio per fare: VoiceOver says which is chosen, and the whole fare in one breath
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={[periodLabel, priceShown, sub, badge].filter(Boolean).join(", ")}
                      style={[
                        { paddingHorizontal: 11, paddingVertical: 12, borderRadius: 12, borderWidth: on ? 2 : 1.5, borderColor: on ? PASS_IND : "#DCD9F0", backgroundColor: "#FFFFFF", position: "relative" },
                        stacked ? { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14 } : { flex: p.period === "lifetime" ? 0.9 : 1 },
                      ]}
                    >
                      {stacked ? (
                        <>
                          <View style={{ flex: 1, gap: 4 }}>
                            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                              {periodText}
                              {badgeView}
                            </View>
                            <Text style={{ fontFamily: PF.letter, fontSize: 10.5, lineHeight: 13, color: "rgba(30,27,53,0.5)" }}>{sub}</Text>
                          </View>
                          <Text maxFontSizeMultiplier={1.6} numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 0, maxWidth: "50%", textAlign: "right", fontFamily: PF.letter, fontWeight: "700", fontSize: 20, letterSpacing: -0.4, color: W14.ink }}>{priceShown}</Text>
                        </>
                      ) : (
                        <>
                          {badgeView && <View style={{ position: "absolute", right: 8, top: -9 }}>{badgeView}</View>}
                          {periodText}
                          <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 20, letterSpacing: -0.4, color: W14.ink, marginTop: 5 }} numberOfLines={1} adjustsFontSizeToFit>
                            {priceShown}
                          </Text>
                          <Text style={{ fontFamily: PF.letter, fontSize: 10.5, lineHeight: 13, color: "rgba(30,27,53,0.5)", marginTop: 3 }} numberOfLines={2}>
                            {sub}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        <View style={{ marginTop: "auto", paddingTop: 20, gap: 10 }}>
          <Pressable
            onPress={() => (premium ? Linking.openURL("https://apps.apple.com/account/subscriptions") : subscribe())}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
            accessibilityState={{ busy, disabled: busy }}
            style={({ pressed }) => ({ backgroundColor: lifetime ? "#FFFFFF" : GOLD, borderRadius: 999, paddingVertical: 18, paddingHorizontal: 16, alignItems: "center", opacity: busy ? 0.5 : pressed ? 0.88 : 1 })}
          >
            <Text maxFontSizeMultiplier={1.6} style={{ textAlign: "center", fontFamily: PF.letter, fontWeight: "700", fontSize: 15, color: lifetime ? GOLD_INK : W14.ink }}>{busy ? "…" : `${ctaLabel} →`}</Text>
          </Pressable>
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Pressable onPress={restore} hitSlop={6} accessibilityRole="button"><Text maxFontSizeMultiplier={1.6} style={{ fontFamily: PF.letter, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{t("pw.restore")}</Text></Pressable>
            <Text maxFontSizeMultiplier={1.6} importantForAccessibility="no" accessibilityElementsHidden style={{ color: "rgba(255,255,255,0.3)" }}>·</Text>
            <Pressable onPress={openTerms} hitSlop={6} accessibilityRole="link"><Text maxFontSizeMultiplier={1.6} style={{ fontFamily: PF.letter, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{t("pw.terms")}</Text></Pressable>
            <Text maxFontSizeMultiplier={1.6} importantForAccessibility="no" accessibilityElementsHidden style={{ color: "rgba(255,255,255,0.3)" }}>·</Text>
            <Pressable onPress={openPrivacy} hitSlop={6} accessibilityRole="link"><Text maxFontSizeMultiplier={1.6} style={{ fontFamily: PF.letter, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{t("pw.privacy")}</Text></Pressable>
          </View>
          <Text maxFontSizeMultiplier={1.6} style={{ fontFamily: PF.letter, fontSize: 11.5, lineHeight: 16, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>{premium ? t("fc.manageNote") : lifetime ? t("pw.foot") : t("fc.managedByApple")}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
    {receiptView}
    </View>
  );
}
