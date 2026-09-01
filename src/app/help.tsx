import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { t, useLang } from "../lib/i18n";
import { P, PF, ruleSoft } from "../theme/post";
import { WrenBird } from "../components/WrenBird";
import { speakAs, useWrenName } from "../lib/wren-name";

/* HOW KINDREDLY WORKS — the answers, in the product's own voice.
   ────────────────────────────────────────────────────────────────────────
   Not a support portal: a page that says the true rules plainly, because
   almost every question a new reader has is a rule they haven't been told
   ("why can't I see who wrote this", "why is it so slow", "does anyone
   read my journal"). Written as answers, kept to what the code actually
   does — if a line here stops being true, the line is the bug. */

const QA = (wren: string): { q: string; a: string }[] =>
  [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ q: t(`hp.q${i}`), a: t(`hp.a${i}`, { wren }) }));

export default function Help() {
  useLang();
  const router = useRouter();
  const wren = useWrenName();
  const [open, setOpen] = useState<number | null>(0);
  const qa = QA(wren);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.paper }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/settings"))} hitSlop={10} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 22, color: P.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 12.5, letterSpacing: 1.6, color: P.ink }}>{t("hp.title")}</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 18 }}>
          <WrenBird size={26} mood="content" />
          <Text style={{ flex: 1, fontFamily: PF.serifItalic, fontSize: 13.5, lineHeight: 20, color: P.ink60 }}>
            {speakAs(t("hp.intro"), wren)}
          </Text>
        </View>

        {qa.map((row, i) => {
          const on = open === i;
          return (
            <Pressable key={row.q} onPress={() => setOpen(on ? null : i)} style={[{ paddingVertical: 15 }, ruleSoft]}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <Text style={{ flex: 1, fontFamily: PF.letter, fontSize: 16, fontWeight: "600", color: P.ink, lineHeight: 23 }}>
                  {row.q}
                </Text>
                <Text style={{ fontFamily: PF.mono, fontSize: 13, color: P.ink40, marginTop: 3 }}>{on ? "–" : "+"}</Text>
              </View>
              {on && (
                <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 23, color: P.ink60, marginTop: 9 }}>
                  {row.a}
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
