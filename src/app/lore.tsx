import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { t, useLang } from "../lib/i18n";
import { MONO, PFM } from "../theme/post";
import { useLetterFamily, useTheme } from "../lib/theme";
import { dShort } from "../lib/format";
import { loadLore, removeLore, type LoreEntry } from "../lib/lore";
import { SecondaryHeader } from "../components/10a/SecondaryHeader";
import "../data/strings-step5-me";

/* LORE — the shelf of kept moments. Local, account-scoped, only yours.
   Each clipping is a line someone wrote you (or an opened fold), pinned by
   a long-press in their room. Long-press here takes it back down.
   A clipping sits on the theme's soft ground — the shade the page keeps
   for a block that is set a little apart from it.

   10a: the secondary page's header (no rule under it: the owner took the
   rules away), and each kept line is someone's letter being read, so it is
   set in the reader's Letter font (owner question 1's recommended answer:
   Keepsake and Lore quotes follow it). The small print is mono 9.
   Taking a line down is a VoiceOver action too (ml.rm.remove, with a hint),
   not only a long-press nobody using VoiceOver could find; the confirm asks
   "Take this line down?" and its button says Remove — it used to ask
   "Keep this?" over a bare ✕, which VoiceOver read as a multiplication sign. */
export default function Lore() {
  const { t: tk } = useTheme();
  useLang();
  const letterFace = useLetterFamily();
  // the question that was asked is Wren speaking: the letter font's italic
  const promptFace = useLetterFamily(true);
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
    Alert.alert(t("lore.unpin.title"), "", [
      { text: t("set.neverMind"), style: "cancel" },
      {
        text: t("ml.rm.remove"),
        style: "destructive",
        onPress: () =>
          removeLore(e.id)
            .then(loadLore)
            .then(setItems)
            .catch((err) => console.warn("[lore] the line wasn't taken down:", err)),
      },
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
          <Pressable
            key={e.id}
            onLongPress={() => unpin(e)}
            delayLongPress={400}
            accessibilityHint={t("lore.unpin.hint")}
            accessibilityActions={[{ name: "unpin", label: t("ml.rm.remove") }]}
            onAccessibilityAction={(ev) => {
              if (ev.nativeEvent.actionName === "unpin") unpin(e);
            }}
            style={{ borderRadius: 14, padding: 14, marginTop: 12, backgroundColor: tk.soft }}
          >
            {!!e.prompt && <Text style={[{ fontSize: 13.5, color: tk.sub, marginBottom: 6 }, promptFace]}>{e.prompt}</Text>}
            <Text style={[{ fontSize: 16, lineHeight: 24, color: tk.ink }, letterFace]}>{e.body}</Text>
            <Text style={{ ...PFM.monoMed, fontSize: MONO.small, letterSpacing: 1.1, color: tk.mute, marginTop: 9 }}>
              {t("lore.from", { name: e.who.toLocaleUpperCase() })}
              {e.said ? ` · ${dShort(e.said).toLocaleUpperCase()}` : ""}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
