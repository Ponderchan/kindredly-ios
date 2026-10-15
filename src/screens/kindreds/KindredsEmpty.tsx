import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MONO, PF } from "../../theme/post";
import { useTheme } from "../../lib/theme";
import { t, useLang } from "../../lib/i18n";
import { useWrenName } from "../../lib/wren-name";
import { TabHeader } from "../../components/TabHeader";
import { useTabBarSpace } from "../../components/NativeTabBar";
import { OrbitMap } from "../../components/OrbitMap";
import { WrenBird } from "../../components/WrenBird";
import { WrenDeskRow } from "../../components/WrenDesk";

/* NOBODY YET — the Kindreds tab before the first correspondence (and for a
   guest with no session). It stays React Native in 10a (spec-kindreds): no
   list, no scroll to win, and it holds the reader's own skinned Wren.

   The empty orbit with YOU at its centre and her at its edge, her desk as a
   card (she is there before anyone else is), the line, and one way in: PUT
   SOMEONE IN ORBIT. On the theme now: the page, the type and the CTA (ind
   with the page colour on it — white on Midnight's violet was 2.9:1); the
   title in the 10a style with no rule; mono only at 9/10/11, in IBM Plex
   Mono's Medium or SemiBold (10a has no Regular mono).

   It scrolls: the whole of it is ≈670pt at the default text size, so on an
   iPhone SE it ran over the title and on any phone the CTA could sit under
   the floating tab bar. Centred while it fits, and the CTA always scrolls
   clear of the bar (useTabBarSpace + 12). */
export function KindredsEmpty({ onWrite }: { onWrite: () => void }) {
  useLang(); // re-render when the reader changes language
  const { t: tk } = useTheme();
  const wren = useWrenName();
  const tabRoom = useTabBarSpace();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tk.bg }} edges={["top"]}>
      <TabHeader title={t("kindreds.title")} rightLabel={t("kindreds.none")} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: tabRoom + 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", paddingHorizontal: 16 }}>
          <View>
            <OrbitMap items={[]} empty />
            {/* Wren waits at the edge of the empty sky */}
            <View style={{ position: "absolute", right: 26, bottom: 28 }}>
              <WrenBird size={40} mood="curious" />
            </View>
          </View>
          {/* and her desk is here before anyone else is — under the sky, where the kindreds will go */}
          <View style={{ alignSelf: "stretch", marginTop: 4, marginBottom: 10 }}>
            <WrenDeskRow />
          </View>
          <Text style={{ fontSize: 26, fontWeight: "600", color: tk.ink, textAlign: "center", marginTop: 14, lineHeight: 33 }}>{t("kindreds.empty.title")}</Text>
          <Text style={{ fontSize: 15, lineHeight: 23, color: tk.sub, textAlign: "center", marginTop: 14, maxWidth: 300 }}>{t("kindreds.empty.body")}</Text>
          <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.label, letterSpacing: 0.6, color: tk.mute, textAlign: "center", marginTop: 14, maxWidth: 300, lineHeight: 17 }}>{t("kindreds.empty.rule")}</Text>
          <Pressable
            onPress={onWrite}
            accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, backgroundColor: tk.ind, paddingVertical: 16, paddingHorizontal: 20, marginTop: 34, alignSelf: "stretch", opacity: pressed ? 0.85 : 1 })}
          >
            <Text style={{ flexShrink: 1, fontFamily: PF.monoSemi, fontSize: MONO.title, color: tk.bg, letterSpacing: 1 }}>{t("kindreds.empty.cta")}</Text>
            <Text style={{ fontFamily: PF.monoMed, fontSize: MONO.label, letterSpacing: 1, color: tk.bg, opacity: 0.72 }}>{t("kindreds.empty.picks", { wren: wren.toUpperCase() })}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
