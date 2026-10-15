import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { t, useLang } from "../lib/i18n";
import { MONO, PF } from "../theme/post";
import { useLetterFamily, useTheme } from "../lib/theme";
import { dShort } from "../lib/format";
import { loadLore, removeLore, type LoreEntry } from "../lib/lore";
import { SecondaryHeader } from "../components/10a/SecondaryHeader";

/* LORE — the shelf of kept moments. Local, account-scoped, only yours.
   Each clipping is a line someone wrote you (or an opened fold), pinned by
   a long-press in their room. Long-press here takes it back down.
   A clipping sits on the theme's soft ground — the shade the page keeps
   for a block that is set a little apart from it.

   10a: the secondary page's header (no rule under it: the owner took the
   rules away), and each kept line is someone's letter being read, so it is
   set in the reader's Letter font (owner question 1's recommended answer:
   Keepsake and Lore quotes follow it). The small print is mono 9. */
export default function Lore() {
  const { t: tk } = useTheme();
  useLang();
  const letterFace = useLetterFamily();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: tk.bg }} edges={["top"]}>
      <SecondaryHeader title={t("lore.title")} fallbackHref="/(tabs)/kindreds" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={{ fontSize: 21, fontWeight: "600", color: tk.ink, marginBottom: 4 }}>
          {t("lore.head")}
        </Text>
        {items.length === 0 && <Text style={{ fontSize: 14.5, lineHeight: 22, color: tk.sub, marginTop: 10 }}>{t("lore.empty")}</Text>}
        {items.map((e) => (
          <Pressable key={e.id} onLongPress={() => unpin(e)} delayLongPress={400} style={{ borderRadius: 14, padding: 14, marginTop: 12, backgroundColor: tk.soft }}>
            {!!e.prompt && <Text style={{ fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 13.5, color: tk.sub, marginBottom: 6 }}>{e.prompt}</Text>}
            <Text style={[{ fontSize: 16, lineHeight: 24, color: tk.ink }, letterFace]}>{e.body}</Text>
            <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.small, letterSpacing: 1.1, color: tk.mute, marginTop: 9 }}>
              {t("lore.from", { name: e.who.toLocaleUpperCase() })}
              {e.said ? ` · ${dShort(e.said).toLocaleUpperCase()}` : ""}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
