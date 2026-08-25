import { speakAs, useWrenName } from "../lib/wren-name";
import { useEffect, useRef, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Animated, Easing, Image } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { P, PF } from "../theme/post";
import { WrenBird } from "../components/WrenBird";
import { keepsake } from "../data/keepsakes";
import { loadShelf, type Minted } from "../lib/keepsakes";
import { fetchThreads, type ThreadSummary } from "../lib/db";
import { CofounderMark } from "../components/CofounderMark";
import { track, type PaywallSource } from "../lib/track";
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

/* THE ROAD PAST THE GATE. Face-down until you peel one — the offer is
   discovered, not recited. Each wears a keepsake's art, so the stamps on
   this page speak the same language as the shelf in her room. */
const BEYOND: { id: string; title: string; sub: string; icon: string }[] = [
  { id: "kindreds", title: "More kindreds", sub: "the first stays free", icon: "three-kindreds" },
  { id: "voice", title: "Voice letters", sub: "say it out loud", icon: "first-voice-letter" },
  { id: "report", title: "A monthly report", sub: "the month you wrote", icon: "first-anniversary" },
  { id: "wardrobe", title: "Her wardrobe", sub: "every look she owns", icon: "otis-changed" },
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
  { id: "lifetime", priceString: "$129", title: "Lifetime", period: "lifetime", raw: null },
];

const COFOUNDERS_TOTAL = 500;

export default function Paywall() {
  const router = useRouter();
  /* WHICH DOOR THEY CAME THROUGH. Eight surfaces open this screen and
     they are not the same offer — someone stopped at the kindred gate is
     mid-relationship, someone tapping a hat is browsing. Without the
     source every number here averages those two into nonsense. */
  const { src } = useLocalSearchParams<{ src?: string }>();
  const source = (src || "unknown") as PaywallSource;
  const wren = useWrenName();
  const { refresh } = useEntitlement();
  const [packages, setPackages] = useState<IapPackage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shelf, setShelf] = useState<Minted[]>([]);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);

  useEffect(() => {
    track("paywall_shown", { source });
  }, [source]);

  useEffect(() => {
    let alive = true;
    loadShelf().then((k) => alive && setShelf(k));
    fetchThreads().then((t) => alive && setThreads(t || []));
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
    track("purchase_started", { source, fare: chosen.period, price: chosen.priceString });
    const res = await iapPurchase(chosen);
    setBusy(false);
    if (res.ok) {
      track("purchase_done", { source, fare: chosen.period, price: chosen.priceString });
      await refresh();
      router.back();
    } else if (!res.cancelled) {
      track("purchase_failed", { source, fare: chosen.period });
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
        <Pressable
          onPress={() => {
            track("paywall_dismissed", { source, fare: chosen?.period ?? "none" });
            router.back();
          }}
          hitSlop={10}
          style={{ padding: 8 }}
        >
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

        {/* ── YOUR ROUTE: what she has already carried you through, and the
            exact place it stops. The offer is your own history with a gate
            drawn across it, not a list of features you have to imagine. ── */}
        <Route shelf={shelf} threads={threads} wren={wren} />

        {/* ── the fares ── */}
        <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 2, color: P.ink40, marginTop: 30, marginBottom: 12 }}>
          CHOOSE YOUR FARE
        </Text>
        <View style={{ gap: 11 }}>
          {packages.map((p) => (
            <View key={p.id}>
              <Stub
                pkg={p}
                on={selected === p.id}
                onPress={() => {
                  setSelected(p.id);
                  track("fare_selected", { source, fare: p.period });
                }}
                wren={wren}
              />
              {/* the founder's own marks — shown only when the fare is
                  chosen, so picking it is itself a small reveal */}
              {p.period === "lifetime" && selected === p.id && <CofounderMarks wren={wren} />}
            </View>
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
            {life ? "LIFETIME" : pkg.title.toUpperCase()}
          </Text>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 14, color: P.ink }}>{pkg.priceString}</Text>
        </View>

        <Text style={{ fontFamily: PF.letter, fontSize: 13.5, lineHeight: 20, color: P.ink60, marginTop: 5 }}>
          {life
            ? "Paid once. You become a Kindredly Cofounder."
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

/* ── the route: your own stops, then the gate, then the sealed ones ───── */

function Route({ shelf, threads, wren }: { shelf: Minted[]; threads: ThreadSummary[]; wren: string }) {
  const kindreds = threads.filter((t) => t.revealed).length;
  /* the stops she has actually flown you through — real keepsakes, oldest
     first, so the road reads forward */
  const flown = [...shelf].sort((a, b) => a.at - b.at).slice(0, 4);

  return (
    <View style={{ marginTop: 26 }}>
      <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 2, color: P.ink40 }}>
        YOUR ROUTE SO FAR
      </Text>

      {flown.length === 0 ? (
        <Text style={{ fontFamily: PF.letter, fontSize: 14.5, lineHeight: 22, color: P.ink60, marginTop: 12 }}>
          {speakAs("You haven't sent me anywhere yet. Write one letter and the road starts.", wren)}
        </Text>
      ) : (
        <View style={{ marginTop: 14 }}>
          {flown.map((k, i) => {
            const def = keepsake(k.id);
            return (
              <View key={k.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 34, alignItems: "center" }}>
                  {def ? <Image source={def.icon} style={{ width: 30, height: 30 }} resizeMode="contain" /> : null}
                  {i < flown.length - 1 && <View style={{ width: 1, height: 16, backgroundColor: P.ink12 }} />}
                </View>
                <View style={{ flex: 1, paddingBottom: i < flown.length - 1 ? 16 : 0 }}>
                  <Text style={{ fontFamily: PF.monoMed, fontSize: 13, color: P.ink }}>{def?.name ?? k.id}</Text>
                  <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 0.8, color: P.ink40, marginTop: 2 }}>
                    {k.evidence}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* THE GATE — drawn across the road, at the exact place it closes */}
      <View style={{ marginTop: 18, borderWidth: 1.5, borderColor: P.post, paddingHorizontal: 14, paddingVertical: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
          <View style={{ width: 9, height: 9, backgroundColor: P.post }} />
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.6, color: P.post }}>
            THE ROAD CLOSES HERE
          </Text>
        </View>
        <Text style={{ fontFamily: PF.letter, fontSize: 14.5, lineHeight: 22, color: P.ink, marginTop: 8 }}>
          {kindreds >= 1
            ? speakAs(`You have ${kindreds === 1 ? "one kindred" : `${kindreds} kindreds`}. I can carry you to one more — but not past it, not on this fare.`, wren)
            : speakAs("Your first kindred is free, and always will be. It's the second one I can't reach on this fare.", wren)}
        </Text>
      </View>

      {/* what waits past it — sealed, and you peel them yourself */}
      <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 2, color: P.ink40, marginTop: 24, marginBottom: 10 }}>
        PAST THE GATE · PEEL TO SEE
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {BEYOND.map((b) => (
          <PeelStamp key={b.id} item={b} wren={wren} />
        ))}
      </View>
    </View>
  );
}

/* a stamp face-down on its gum, until you turn it over */
function PeelStamp({ item, wren }: { item: { id: string; title: string; sub: string; icon: string }; wren: string }) {
  const [open, setOpen] = useState(false);
  const t = useRef(new Animated.Value(0)).current;
  const def = keepsake(item.icon);

  const flip = () => {
    Animated.timing(t, {
      toValue: open ? 0 : 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    setOpen((v) => !v);
  };

  return (
    <Pressable onPress={flip} style={{ width: "47.5%" }}>
      <Animated.View
        style={{
          borderWidth: 1,
          borderColor: open ? P.ink : P.ink12,
          borderStyle: open ? "solid" : "dashed",
          backgroundColor: open ? P.paper : "#F3F1E8",
          minHeight: 132,
          padding: 12,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) }],
        }}
      >
        {open ? (
          <>
            {def ? <Image source={def.icon} style={{ width: 74, height: 74 }} resizeMode="contain" /> : null}
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 0.4, color: P.ink, textAlign: "center", marginTop: 10 }}>
              {speakAs(item.title, wren)}
            </Text>
            <Text style={{ fontFamily: PF.serifItalic, fontSize: 11.5, color: P.ink40, textAlign: "center", marginTop: 3 }}>
              {speakAs(item.sub, wren)}
            </Text>
          </>
        ) : (
          <>
            <Text style={{ fontFamily: PF.mono, fontSize: 21, color: P.ink40 }}>▧</Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 8.5, letterSpacing: 1.4, color: P.ink40, marginTop: 9 }}>
              SEALED
            </Text>
            <Text style={{ fontFamily: PF.serifItalic, fontSize: 11, color: P.ink40, marginTop: 4 }}>peel</Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

/* what only a Cofounder gets — four marks, gold, and one line saying the
   rest is simply everything else, forever */
function CofounderMarks({ wren }: { wren: string }) {
  const MARKS: [string, string][] = [
    ["Your own number", `one of ${COFOUNDERS_TOTAL}`],
    [`A gold ring on ${wren}`, "she wears it always"],
    ["Everything first", "before anyone else"],
    ["A letter at one year", "she brings it herself"],
  ];
  return (
    <View style={{ borderLeftWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, borderColor: GOLD, backgroundColor: "#FBF6E6", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 }}>
      <Text style={{ fontFamily: PF.monoMed, fontSize: 9, letterSpacing: 1.8, color: "#8A6E20" }}>
        KINDREDLY COFOUNDER
      </Text>
      {/* the mark itself, exactly as it will sit on their own desk — the
          thing being sold is visible before it is bought */}
      <View style={{ alignItems: "center", paddingVertical: 14 }}>
        <CofounderMark no={47} size="lg" />
        <Text style={{ fontFamily: PF.serifItalic, fontSize: 11.5, color: P.ink40, marginTop: 7 }}>
          yours, everywhere the app says who you are
        </Text>
      </View>
      {MARKS.map(([title, sub]) => (
        <View key={title} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 12 }}>
          <View style={{ width: 8, height: 8, backgroundColor: GOLD, marginTop: 5 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, color: P.ink }}>{speakAs(title, wren)}</Text>
            <Text style={{ fontFamily: PF.serifItalic, fontSize: 12, color: P.ink60, marginTop: 2 }}>{speakAs(sub, wren)}</Text>
          </View>
        </View>
      ))}
      <View style={{ height: 1, backgroundColor: GOLD, opacity: 0.4, marginTop: 15 }} />
      <Text style={{ fontFamily: PF.letter, fontSize: 13.5, lineHeight: 20, color: "#8A6E20", marginTop: 11 }}>
        {speakAs("And all of First Class, for as long as there is a Kindredly.", wren)}
      </Text>
    </View>
  );
}
