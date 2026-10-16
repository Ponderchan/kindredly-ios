import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { MONO, PF } from "../theme/post";
import { useTheme } from "../lib/theme";
import { t, useLang } from "../lib/i18n";
import { keepsake } from "../data/keepsakes";
import { loadShelf, unseen, type Minted } from "../lib/keepsakes";
import { useWrenName } from "../lib/wren-name";
import { dShort } from "../lib/format";
import { SecondaryHeader } from "../components/10a/SecondaryHeader";
import { keepsakeA11y } from "../screens/me/me-model";
import "../data/strings-step5-me";

/* EVERYTHING SHE KEPT — the whole shelf, newest first, three to a row.
   The room shows the latest three and Me the latest two; "All N →" and Me's
   KEEPSAKES land here.

   10a: on the theme (no fixed white tiles on a lavender wash), under the
   secondary page's header (KEEPSAKES, the count on the right); each tile
   the theme's soft block with the icon, its name and its proof in mono 9,
   and the ind dot on one not opened yet — which VoiceOver hears too
   ("{name}, new", the words Me's tiles use: me-model keepsakeA11y).

   On Midnight soft is sf, 1.1:1 on bg, so the tiles wear the 1pt mute
   outline the same tiles wear on the courier page (WrenHome: 5.9:1 on bg;
   faint is the disabled colour), and the two pages agree. */

export default function Keepsakes() {
  useLang();
  const router = useRouter();
  const { t: tk, dark } = useTheme();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: tk.bg }} edges={["top"]}>
      <SecondaryHeader
        title={t("ka.title").toLocaleUpperCase()}
        fallbackHref="/courier"
        right={shelf ? <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.title, letterSpacing: 1.1, color: tk.mute, paddingHorizontal: 4 }}>{known.length}</Text> : undefined}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: PF.letterSerif, fontSize: 14, lineHeight: 20, color: tk.sub, marginBottom: 14 }}>{t("ka.lede", { wren })}</Text>
        {shelf && shelf.length === 0 && <Text style={{ fontFamily: "Newsreader-Italic", fontStyle: "italic", fontSize: 14, color: tk.mute, marginTop: 20 }}>{t("ka.none", { wren })}</Text>}
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
            {row.map((k) => {
              const def = keepsake(k.id);
              if (!def) return null;
              const name = t(`ks.name.${def.id}`);
              const isNew = fresh.has(k.id);
              return (
                <Pressable
                  key={k.id}
                  onPress={() => router.push(`/keepsake/${k.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={keepsakeA11y(name, isNew, { t })}
                  style={({ pressed }) => ({ flex: 1, backgroundColor: tk.soft, borderRadius: 14, borderWidth: dark ? 1 : 0, borderColor: tk.mute, paddingVertical: 14, paddingHorizontal: 8, alignItems: "center", opacity: pressed ? 0.7 : 1 })}
                >
                  <Image source={def.icon} style={{ width: 40, height: 40 }} resizeMode="contain" />
                  <Text numberOfLines={2} style={{ fontSize: 12, fontWeight: "600", color: tk.ink, marginTop: 8, textAlign: "center" }}>
                    {name}
                  </Text>
                  <Text numberOfLines={1} style={{ fontFamily: PF.monoMed, fontSize: MONO.small, letterSpacing: 0.6, color: tk.mute, marginTop: 4 }}>
                    {k.evidence || dShort(k.at).toLocaleUpperCase()}
                  </Text>
                  {isNew && <View style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: tk.ind }} />}
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
