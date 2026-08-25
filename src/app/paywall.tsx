import { speakAs, useWrenName } from "../lib/wren-name";
import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { P, PF, panel, solidBtn } from "../theme/post";
import { Seal } from "../components/Seal";
import { Wren } from "../components/Wren";
import { useEntitlement } from "../lib/entitlement";
import { IAP_READY, iapGetPackages, iapPurchase, iapRestore, type IapPackage } from "../lib/iap";

/* EVERY LINE HERE IS A GATE THAT EXISTS IN THE CODE. The list used to
   promise "Wren's Peek" (a function with zero callers, and the one read we
   deliberately refused to build because it points an LLM at a real
   person), "Your Aura Portrait" (free — the Me tab hands it to everyone),
   and a wax seal that nothing gates. Selling what isn't there is the
   fastest way to lose a reader on the day they pay you. */
const BENEFITS: [string, string][] = [
  ["Unlimited letters", "Write to as many strangers as you like — no daily cap."],
  ["Voice letters", "Some things only land in a voice. Record instead of writing, whenever you want."],
  ["An aura report, every month", "She wraps the month you wrote — your hours, your words, your read — in a letter just for you."],
  ["Her whole wardrobe", "The ink-and-post look, and every seasonal piece she's ever been given."],
];

// shown when RevenueCat isn't configured yet, so the screen is reviewable.
const PLACEHOLDERS: IapPackage[] = [
  { id: "annual", priceString: "$48 / year", title: "Annual", period: "annual", raw: null },
  { id: "monthly", priceString: "$6 / month", title: "Monthly", period: "monthly", raw: null },
];

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

  const subscribe = async () => {
    if (!chosen || busy) return;
    if (!IAP_READY || !chosen.raw) {
      Alert.alert(
        "Almost there",
        "First Class purchasing turns on once RevenueCat + the App Store subscription products are configured (see SETUP.md).",
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
      <View style={{ paddingHorizontal: 22, paddingTop: 6, flexDirection: "row", justifyContent: "flex-end" }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 8 }}>
          <Text style={{ fontSize: 22, color: P.ink60 }}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 26, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: "center", marginTop: 4 }}>
          <Seal size={82} />
          <Text style={{ fontFamily: PF.letter, fontSize: 30, color: P.ink, marginTop: 18 }}>First Class</Text>
          <Text style={{ fontFamily: PF.serifItalic, fontSize: 15, color: P.ink60, marginTop: 6 }}>For the kindred spirits.</Text>
          <Text style={{ fontFamily: PF.serifItalic, fontSize: 15, color: P.ink60, marginTop: 8, textAlign: "center", lineHeight: 23 }}>
            More letters, and a closer read from Wren.
          </Text>
        </View>

        <View style={{ marginTop: 28 }}>
          {BENEFITS.map(([title, sub]) => (
            <View key={title} style={{ flexDirection: "row", gap: 12, marginBottom: 18 }}>
              <View style={{ width: 26, alignItems: "center", paddingTop: 2 }}>
                <Wren size={20} mode="line" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: PF.monoMed, fontSize: 15, color: P.ink }}>{speakAs(title, wren)}</Text>
                <Text style={{ fontFamily: PF.mono, fontSize: 13, color: P.ink60, marginTop: 3, lineHeight: 19 }}>{speakAs(sub, wren)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* packages */}
        <View style={{ marginTop: 12, gap: 12 }}>
          {packages.map((p) => {
            const on = selected === p.id;
            const best = p.period === "annual";
            return (
              <Pressable
                key={p.id}
                onPress={() => setSelected(p.id)}
                style={[
                  panel,
                  {
                    padding: 18,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderWidth: 2,
                    borderColor: on ? P.pen : "transparent",
                  },
                ]}
              >
                <View>
                  <Text style={{ fontFamily: PF.monoMed, fontSize: 15, color: P.ink }}>
                    {p.title}
                    {best ? "  ·  best value" : ""}
                  </Text>
                  <Text style={{ fontFamily: PF.mono, fontSize: 13, color: P.ink60, marginTop: 3 }}>{p.priceString}</Text>
                </View>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderWidth: 2,
                    borderColor: on ? P.pen : P.ink12,
                    backgroundColor: on ? P.pen : "transparent",
                  }}
                />
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={subscribe} disabled={busy} style={[solidBtn, { paddingVertical: 18, width: "100%", marginTop: 22, opacity: busy ? 0.4 : 1 }]}>
          <Text style={{ color: "#fff", fontFamily: PF.monoSemi, fontSize: 14, letterSpacing: 1.4 }}>
            {busy ? "…" : "TRAVEL FIRST CLASS"}
          </Text>
        </Pressable>

        <Pressable onPress={restore} style={{ alignItems: "center", paddingVertical: 16 }}>
          <Text style={{ fontFamily: PF.monoMed, fontSize: 12.5, letterSpacing: 0.5, color: P.ink60 }}>Restore purchase</Text>
        </Pressable>

        <Text style={{ fontFamily: PF.mono, fontSize: 11, color: P.ink40, textAlign: "center", lineHeight: 17 }}>
          Auto-renews until cancelled. Manage or cancel anytime in your App Store settings.{" "}
          <Text onPress={() => Linking.openURL("https://kindredly.io/terms")} style={{ textDecorationLine: "underline" }}>
            Terms
          </Text>{" "}
          &{" "}
          <Text onPress={() => Linking.openURL("https://kindredly.io/privacy")} style={{ textDecorationLine: "underline" }}>
            Privacy
          </Text>
          .
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
