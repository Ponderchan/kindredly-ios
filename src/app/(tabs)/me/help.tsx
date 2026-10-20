import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t, useLang } from "../../../lib/i18n";
import { MONO, PFM } from "../../../theme/post";
import { useLetterFamily, useTheme } from "../../../lib/theme";
import { WrenBird } from "../../../components/WrenBird";
import { SecondaryHeader } from "../../../components/10a";
import { useTabBarSpace } from "../../../components/NativeTabBar";
import { speakAs, useWrenName } from "../../../lib/wren-name";

/* HOW KINDREDLY WORKS — the answers, in the product's own voice.
   ────────────────────────────────────────────────────────────────────────
   Not a support portal: a page that says the true rules plainly, because
   almost every question a new reader has is a rule they haven't been told
   ("why can't I see who wrote this", "why is it so slow", "does anyone
   read my journal"). Written as answers, kept to what the code actually
   does — if a line here stops being true, the line is the bug.

   10a (step 5): under Settings in the Me tab's own stack (/me/help, was
   /help), so the floating tab bar stays; on the theme, under the secondary
   header; back with nothing underneath goes to Settings. Wren's opener is
   content, in the reader's letter font. */

const QA = (wren: string): { q: string; a: string }[] =>
  [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ({ q: t(`hp.q${i}`), a: t(`hp.a${i}`, { wren }) }));

export default function Help() {
  useLang();
  const { t: tk } = useTheme();
  const safe = useSafeAreaInsets();
  const tabBar = useTabBarSpace();
  const wren = useWrenName();
  const wrenFace = useLetterFamily(true);
  const [open, setOpen] = useState<number | null>(0);
  const qa = QA(wren);

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg, paddingTop: safe.top }}>
      <SecondaryHeader title={t("hp.title")} fallbackHref="/(tabs)/me/settings" />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: tabBar + 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 18 }}>
          <WrenBird size={26} mood="content" />
          <Text style={{ flex: 1, ...wrenFace, fontSize: 13.5, lineHeight: 20, color: tk.sub }}>{speakAs(t("hp.intro"), wren)}</Text>
        </View>

        {qa.map((row, i) => {
          const on = open === i;
          return (
            <Pressable
              key={row.q}
              onPress={() => setOpen(on ? null : i)}
              accessibilityRole="button"
              accessibilityState={{ expanded: on }}
              style={{ paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: tk.line }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: tk.ink, lineHeight: 23 }}>{row.q}</Text>
                <Text accessible={false} style={{ ...PFM.mono, fontSize: MONO.title, color: tk.mute, marginTop: 3 }}>
                  {on ? "–" : "+"}
                </Text>
              </View>
              {on && <Text style={{ fontSize: 15, lineHeight: 23, color: tk.sub, marginTop: 9 }}>{row.a}</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
