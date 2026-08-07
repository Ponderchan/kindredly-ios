import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { C, F, cardStyle, navyBtn } from "../theme/tokens";
import { Seal } from "../components/Seal";
import { Wren } from "../components/Wren";
import { useEntitlement } from "../lib/entitlement";
import { IAP_READY, iapGetPackages, iapPurchase, iapRestore, type IapPackage } from "../lib/iap";

const BENEFITS: [string, string][] = [
  ["Unlimited letters", "Write to as many strangers as you like — no daily cap."],
  ["Wren's Peek", "A deeper read on a correspondent: how they write, and whether they're leaning closer."],
  ["Your Voice Portrait", "Wren's evolving, warm read of how you write — yours to keep."],
  ["The wax seal", "Your letters go out pressed with the Kindredly seal."],
];

// shown when RevenueCat isn't configured yet, so the screen is reviewable.
const PLACEHOLDERS: IapPackage[] = [
  { id: "annual", priceString: "$48 / year", title: "Annual", period: "annual", raw: null },
  { id: "monthly", priceString: "$6 / month", title: "Monthly", period: "monthly", raw: null },
];

export default function Paywall() {
  const router = useRouter();
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
        "Kindredly+ purchasing turns on once RevenueCat + the App Store subscription products are configured (see SETUP.md).",
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
    Alert.alert(ok ? "Restored" : "Nothing to restore", ok ? "Your Kindredly+ is active." : "No previous purchase was found.");
    if (ok) router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={{ paddingHorizontal: 22, paddingTop: 6, flexDirection: "row", justifyContent: "flex-end" }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 8 }}>
          <Text style={{ fontSize: 22, color: C.muted }}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 26, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: "center", marginTop: 4 }}>
          <Seal size={82} />
          <Text style={{ fontFamily: F.serif, fontSize: 30, color: C.ink, marginTop: 18 }}>Kindredly+</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.muted, marginTop: 8, textAlign: "center", lineHeight: 23 }}>
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
                <Text style={{ fontFamily: F.sansBold, fontSize: 15, color: C.ink }}>{title}</Text>
                <Text style={{ fontFamily: F.sans, fontSize: 13, color: C.muted, marginTop: 3, lineHeight: 19 }}>{sub}</Text>
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
                  cardStyle,
                  {
                    padding: 18,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderWidth: 2,
                    borderColor: on ? C.purple : "transparent",
                  },
                ]}
              >
                <View>
                  <Text style={{ fontFamily: F.sansBold, fontSize: 15, color: C.ink }}>
                    {p.title}
                    {best ? "  ·  best value" : ""}
                  </Text>
                  <Text style={{ fontFamily: F.sans, fontSize: 13, color: C.muted, marginTop: 3 }}>{p.priceString}</Text>
                </View>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: on ? C.purple : C.line,
                    backgroundColor: on ? C.purple : "transparent",
                  }}
                />
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={subscribe} disabled={busy} style={[navyBtn, { paddingVertical: 18, width: "100%", marginTop: 22, opacity: busy ? 0.4 : 1 }]}>
          <Text style={{ color: "#fff", fontFamily: F.sansExtra, fontSize: 14, letterSpacing: 1.4 }}>
            {busy ? "…" : "START KINDREDLY+"}
          </Text>
        </Pressable>

        <Pressable onPress={restore} style={{ alignItems: "center", paddingVertical: 16 }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, letterSpacing: 0.5, color: C.muted }}>Restore purchase</Text>
        </Pressable>

        <Text style={{ fontFamily: F.sans, fontSize: 11, color: C.faint, textAlign: "center", lineHeight: 17 }}>
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
