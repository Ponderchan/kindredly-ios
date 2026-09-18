import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { P, PF } from "../theme/post";
import { W14 } from "../components/AuraCard";
import { t, useLang } from "../lib/i18n";
import { keepsake } from "../data/keepsakes";
import { loadShelf, unseen, type Minted } from "../lib/keepsakes";
import { useWrenName } from "../lib/wren-name";
import { dShort } from "../lib/format";

/* EVERYTHING SHE KEPT — the whole shelf, newest first, three to a row.
   The room shows the latest three; "All N →" lands here. */

export default function Keepsakes() {
  useLang();
  const router = useRouter();
  const wren = useWrenName();
  const [shelf, setShelf] = useState<Minted[] | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadShelf().then(async (s) => {
        if (!alive) return;
        setShelf(s);
        setFresh(await unseen(s));
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  // only what the catalog still knows how to draw
  const known = (shelf ?? []).filter((k) => keepsake(k.id));
  const rows: Minted[][] = [];
  for (let i = 0; i < known.length; i += 3) rows.push(known.slice(i, i + 3));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.penWash }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 4, height: 48 }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/courier"))} hitSlop={10} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 24, color: W14.ink }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Text style={{ fontFamily: PF.letter, fontWeight: "700", fontSize: 22, letterSpacing: -0.5, color: W14.ink }}>{t("ka.title")}</Text>
          {shelf && <Text style={{ fontFamily: PF.letter, fontSize: 15, color: "rgba(30,27,53,0.5)" }}>{known.length}</Text>}
        </View>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 6, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: PF.letter, fontSize: 13.5, lineHeight: 19, color: "rgba(30,27,53,0.65)", marginBottom: 14 }}>{t("ka.lede", { wren })}</Text>
        {shelf && shelf.length === 0 && <Text style={{ fontFamily: PF.letter, fontSize: 13.5, color: "rgba(30,27,53,0.55)", marginTop: 20 }}>{t("ka.none", { wren })}</Text>}
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
            {row.map((k) => {
              const def = keepsake(k.id);
              if (!def) return null;
              return (
                <Pressable key={k.id} onPress={() => router.push(`/keepsake/${k.id}`)} style={({ pressed }) => ({ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 8, alignItems: "center", opacity: pressed ? 0.7 : 1 })}>
                  <Image source={def.icon} style={{ width: 40, height: 40 }} resizeMode="contain" />
                  <Text numberOfLines={2} style={{ fontFamily: PF.letter, fontSize: 12, fontWeight: "600", color: P.ink, marginTop: 8, textAlign: "center" }}>{t(`ks.name.${def.id}`)}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: PF.mono, fontSize: 8, letterSpacing: 0.6, color: P.ink40, marginTop: 4 }}>{k.evidence || dShort(k.at).toUpperCase()}</Text>
                  {fresh.has(k.id) && <View style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: P.pen }} />}
                </Pressable>
              );
            })}
            {row.length < 3 && Array.from({ length: 3 - row.length }, (_, i) => <View key={`pad${i}`} style={{ flex: 1 }} />)}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
