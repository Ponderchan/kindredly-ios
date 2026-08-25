import { speakAs, useWrenName } from "../lib/wren-name";
import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path, Rect } from "react-native-svg";
import { P, PF } from "../theme/post";
import { WrenBird } from "../components/WrenBird";
import { useEntitlement } from "../lib/entitlement";
import { IAP_READY, iapGetPackages, iapPurchase, iapRestore, type IapPackage } from "../lib/iap";

/* FIRST CLASS — a fare, not a feature list.
   ────────────────────────────────────────────────────────────────────────
   Every subscription screen in the world is a bulleted card with a green
   tick column. This product is a postal service, and the postal service
   already has a word for premium and an object for it: a ticket. So the
   page is one — airmail edges, a torn stub per fare, and a bird waiting
   with it. Nothing here is a "plan"; it is how you travel.

   THE THREE FARES. Monthly exists to make Annual look like what it is.
   The lifetime fare is not a discount, it is a ROLE: a numbered
   Cofounder, limited, with a permanent ring on her leg — the one thing
   that can't be bought later because the numbers run out.

   EVERY LINE IS A GATE THAT EXISTS IN THE CODE. The old list promised
   Wren's Peek (zero callers — and the LLM read of a real person we
   deliberately refused to build), an Aura Portrait (free), and a wax seal
   nothing gates. Selling what isn't there is the fastest way to lose a
   reader on the day they pay you. */

const GOLD = "#C9A227";
const NIGHT = "#221E3D";

const TRAVELS: [string, string][] = [
  ["Every kindred after the first", "The first person who trades names with you is free, always. The rest travel with you."],
  ["Voice letters", "Some things only land in a voice. Record one instead of writing it."],
  ["An aura report, every month", "She wraps the month you wrote — your hours, your words, your read — into a letter just for you."],
  ["Her whole wardrobe", "The ink-and-post look, and every seasonal piece she's ever been given."],
];

const NEVER: string[] = [
  "Being heard is never sold — writing, matching and replies stay free.",
  "Her speed is never sold. She leaves the second you press send.",
  "Your history is never sold. Keepsakes are earned, not bought.",
];

/* shown until RevenueCat + the App Store products exist, so the screen is
   reviewable and the fares can be judged before they can be bought */
const PLACEHOLDERS: IapPackage[] = [
  { id: "annual", priceString: "$39.99 / year", title: "Annual", period: "annual", raw: null },
  { id: "monthly", priceString: "$6.99 / month", title: "Monthly", period: "monthly", raw: null },
  { id: "lifetime", priceString: "$129 once", title: "Cofounder", period: "lifetime", raw: null },
];

const COFOUNDERS_TOTAL = 500;

export default function Paywall() {
  const router = useRouter();
  const wren = useWrenName();
  const { refresh } = useEntitlement();
  const [packages, setPackages] = useState<IapPackage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    iapGetPackages().then((pkgs) => {
      if (!alive) return;
      const list = pkgs.length ? pkgs : PLACEHOLDERS;
      setPackages(list);
      setSelected((list.find((p) => p.period === "annual") || list[0])?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  const chosen = packages.find((p) => p.id === selected);
  const lifetime = chosen?.period === "lifetime";

  const subscribe = async () => {
    if (!chosen || busy) return;
    if (!IAP_READY || !chosen.raw) {
      Alert.alert(
        "Almost there",
        "First Class turns on once RevenueCat and the App Store products are configured (see SETUP.md).",
      );
      return;
    }
    setBusy(true);
    const res = await iapPurchase(chosen);
    setBusy(false);
    if (res.ok) {
      await refresh();
      router.back();
    } else if (!res.cancelled) {
      Alert.alert("Purchase", "That didn't go through. Please try again.");
    }
  };

  const restore = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await iapRestore();
    setBusy(false);
    await refresh();
    Alert.alert(ok ? "Restored" : "Nothing to restore", ok ? "Your First Class is active." : "No previous purchase was found.");
    if (ok) router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 4, flexDirection: "row", justifyContent: "flex-end" }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 8 }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 18, color: P.ink40 }}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        {/* ── the ticket ── */}
        <View style={{ borderWidth: 1.5, borderColor: P.ink }}>
          <AirmailEdge />
          <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 2.4, color: P.ink40 }}>FARE</Text>
                <Text style={{ fontFamily: PF.monoSemi, fontSize: 27, letterSpacing: 1.4, color: P.ink, marginTop: 6 }}>
                  FIRST{"\n"}CLASS
                </Text>
                <Text style={{ fontFamily: PF.serifItalic, fontSize: 15, color: P.ink60, marginTop: 8 }}>
                  For the kindred spirits.
                </Text>
              </View>
              <View style={{ alignItems: "center", paddingTop: 6 }}>
                <WrenBird size={64} bare mood="delight" />
                <Text style={{ fontFamily: PF.mono, fontSize: 8, letterSpacing: 1.4, color: P.ink40, marginTop: 4 }}>
                  {wren.toUpperCase()} · CARRIER
                </Text>
              </View>
            </View>
          </View>
          <AirmailEdge />
        </View>

        {/* ── what travels with you ── */}
        <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 2, color: P.ink40, marginTop: 26, marginBottom: 4 }}>
          WHAT TRAVELS WITH YOU
        </Text>
        {TRAVELS.map(([title, sub]) => (
          <View key={title} style={{ flexDirection: "row", gap: 11, marginTop: 16 }}>
            <View style={{ width: 9, height: 9, backgroundColor: P.post, marginTop: 5 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: PF.monoMed, fontSize: 14.5, color: P.ink }}>{speakAs(title, wren)}</Text>
              <Text style={{ fontFamily: PF.letter, fontSize: 14, lineHeight: 21, color: P.ink60, marginTop: 3 }}>
                {speakAs(sub, wren)}
              </Text>
            </View>
          </View>
        ))}

        {/* ── the fares ── */}
        <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 2, color: P.ink40, marginTop: 30, marginBottom: 12 }}>
          CHOOSE YOUR FARE
        </Text>
        <View style={{ gap: 11 }}>
          {packages.map((p) => (
            <Stub
              key={p.id}
              pkg={p}
              on={selected === p.id}
              onPress={() => setSelected(p.id)}
              wren={wren}
            />
          ))}
        </View>

        <Pressable
          onPress={subscribe}
          disabled={busy}
          style={({ pressed }) => ({
            backgroundColor: lifetime ? NIGHT : P.pen,
            paddingVertical: 17,
            alignItems: "center",
            marginTop: 20,
            opacity: busy ? 0.4 : pressed ? 0.88 : 1,
          })}
        >
          <Text style={{ color: lifetime ? GOLD : "#fff", fontFamily: PF.monoSemi, fontSize: 13, letterSpacing: 2 }}>
            {busy ? "…" : lifetime ? "BECOME A COFOUNDER" : "TRAVEL FIRST CLASS"}
          </Text>
        </Pressable>

        {/* ── what is never for sale ── */}
        <View style={{ borderWidth: 1, borderColor: P.ink12, padding: 14, marginTop: 22 }}>
          <Text style={{ fontFamily: PF.monoMed, fontSize: 9, letterSpacing: 1.8, color: P.ink40, marginBottom: 9 }}>
            NEVER FOR SALE
          </Text>
          {NEVER.map((n) => (
            <Text key={n} style={{ fontFamily: PF.letter, fontSize: 13.5, lineHeight: 21, color: P.ink60, marginTop: 4 }}>
              {speakAs(n, wren)}
            </Text>
          ))}
        </View>

        <Pressable onPress={restore} style={{ alignItems: "center", paddingVertical: 16 }}>
          <Text style={{ fontFamily: PF.monoMed, fontSize: 12, letterSpacing: 0.5, color: P.ink60 }}>Restore purchase</Text>
        </Pressable>

        <Text style={{ fontFamily: PF.mono, fontSize: 10.5, color: P.ink40, textAlign: "center", lineHeight: 17 }}>
          Subscriptions auto-renew until cancelled; the Cofounder fare is paid once. Manage anytime in your App Store settings.{" "}
          <Text onPress={() => Linking.openURL("https://kindredly.io/terms")} style={{ textDecorationLine: "underline" }}>
            Terms
          </Text>{" "}
          &{" "}
          <Text onPress={() => Linking.openURL("https://kindredly.io/privacy")} style={{ textDecorationLine: "underline" }}>
            Privacy
          </Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* one fare, torn off along a perforation */
function Stub({ pkg, on, onPress, wren }: { pkg: IapPackage; on: boolean; onPress: () => void; wren: string }) {
  const life = pkg.period === "lifetime";
  const year = pkg.period === "annual";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        borderWidth: on ? 2 : 1,
        borderColor: on ? (life ? GOLD : P.pen) : P.ink12,
        backgroundColor: life ? (on ? "#FBF6E6" : P.paper) : P.paper,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {/* the perforation: a stub is torn from something */}
      <View style={{ width: 22, alignItems: "center", justifyContent: "center", borderRightWidth: 1, borderRightColor: P.ink12, borderStyle: "dashed" }}>
        <Text style={{ fontFamily: PF.mono, fontSize: 9, color: life ? GOLD : P.ink40, transform: [{ rotate: "-90deg" }], width: 60, textAlign: "center" }}>
          {life ? "No." : year ? "BEST" : "TRY"}
        </Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 14, letterSpacing: 1, color: life ? "#8A6E20" : P.ink }}>
            {life ? "COFOUNDER" : pkg.title.toUpperCase()}
          </Text>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 14, color: P.ink }}>{pkg.priceString}</Text>
        </View>

        <Text style={{ fontFamily: PF.letter, fontSize: 13.5, lineHeight: 20, color: P.ink60, marginTop: 5 }}>
          {life
            ? `Paid once, and it never ends. A number that is yours — one of ${COFOUNDERS_TOTAL} — a ring on ${wren}'s leg that nobody can buy later, and every new thing before anyone else.`
            : year
              ? "About three dollars a month. The way most people travel."
              : "Month to month. Leave whenever you like."}
        </Text>

        {life && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 9 }}>
            <View style={{ width: 7, height: 7, backgroundColor: GOLD }} />
            <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: "#8A6E20" }}>
              {COFOUNDERS_TOTAL} ONLY · NUMBERED IN ORDER
            </Text>
          </View>
        )}
        {year && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 9 }}>
            <View style={{ width: 7, height: 7, backgroundColor: P.post }} />
            <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: P.post }}>SAVES 52%</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

/* the red-and-blue diagonal border every airmail envelope has worn since
   1920 — the one place theme/post lets the airmail blue out */
function AirmailEdge() {
  const W = 400;
  const bars = Array.from({ length: 46 }, (_, i) => i);
  return (
    <Svg width="100%" height={9} viewBox={`0 0 ${W} 9`} preserveAspectRatio="none">
      <Rect x={0} y={0} width={W} height={9} fill={P.paper} />
      {bars.map((i) => (
        <Path
          key={i}
          d={`M ${i * 9 - 4} 9 L ${i * 9 + 5} 0 L ${i * 9 + 9} 0 L ${i * 9} 9 Z`}
          fill={i % 2 === 0 ? P.post : P.air}
        />
      ))}
    </Svg>
  );
}
