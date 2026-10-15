import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { t, useLang } from "../lib/i18n";
import { PF } from "../theme/post";
import { useP, useTheme } from "../lib/theme";
import { dShort } from "../lib/format";
import { loadLore, removeLore, type LoreEntry } from "../lib/lore";

/* LORE — the shelf of kept moments. Local, account-scoped, only yours.
   Each clipping is a line someone wrote you (or an opened fold), pinned by
   a long-press in their room. Long-press here takes it back down.
   A clipping sits on the theme's soft ground — the shade the page keeps
   for a block that is set a little apart from it. */
export default function Lore() {
  const P = useP();
  const { t: tk } = useTheme();
  useLang();
  const router = useRouter();
  const [items, setItems] = useState<LoreEntry[]>([]);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadLore().then((l) => alive && setItems(l));
      return () => {
        alive = false;
      };
    }, []),
  );

  const unpin = (e: LoreEntry) =>
    Alert.alert(t("rm.keep.title"), "", [
      { text: t("set.neverMind"), style: "cancel" },
      { text: "✕", style: "destructive", onPress: () => removeLore(e.id).then(loadLore).then(setItems) },
    ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 4, paddingBottom: 10 }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/kindreds"))} hitSlop={10} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.8, color: P.ink }}>{t("lore.title")}</Text>
      </View>
      <View style={{ height: 1, backgroundColor: P.ink12, marginHorizontal: 16 }} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: PF.letter, fontSize: 21, fontWeight: "600", color: P.ink, marginBottom: 4 }}>{t("lore.head")}</Text>
        {items.length === 0 && (
          <Text style={{ fontFamily: PF.letter, fontSize: 14.5, lineHeight: 22, color: P.ink60, marginTop: 10 }}>{t("lore.empty")}</Text>
        )}
        {items.map((e) => (
          <Pressable key={e.id} onLongPress={() => unpin(e)} delayLongPress={400} style={{ borderWidth: 1, borderColor: P.ink12, padding: 14, marginTop: 14, backgroundColor: tk.soft }}>
            {!!e.prompt && (
              <Text style={{ fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 13.5, color: P.ink60, marginBottom: 6 }}>{e.prompt}</Text>
            )}
            <Text style={{ fontFamily: PF.letter, fontSize: 16, lineHeight: 24, color: P.ink }}>{e.body}</Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 8.5, letterSpacing: 1.1, color: P.ink40, marginTop: 9 }}>
              {t("lore.from", { name: e.who.toUpperCase() })}{e.said ? ` · ${dShort(e.said).toUpperCase()}` : ""}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
