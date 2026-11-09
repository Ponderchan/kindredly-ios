import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MONO, PFM } from "../../theme/post";
import { useLetterFont, useTheme } from "../../lib/theme";
import { t, useLang } from "../../lib/i18n";
import { useWrenName } from "../../lib/wren-name";
import { useScreenInsets } from "../../lib/screen-insets";
import { useBirdImageRef } from "../../lib/bird-images";
import { sinceShort } from "../../lib/format";
import { OFFICIAL_NAME, WREN_ROOM } from "../../lib/wren-desk";
import { TabHeader } from "../../components/TabHeader";
import { useTabBarSpace } from "../../components/NativeTabBar";
import { OrbitMap } from "../../components/OrbitMap";
import { WrenBird } from "../../components/WrenBird";
import { WrenDeskRow, useWrenDesk } from "../../components/WrenDesk";
import { badgeCount } from "../../components/10a/kit";
import { NativeSurface, SurfaceHost } from "../../components/NativeSurface";
import { KKindredsEmptyView } from "../../../modules/kindredly-ui";

/* NOBODY YET — the Kindreds tab before the first correspondence (and for a
   guest with no session). It stays React Native in 10a (spec-kindreds): no
   list, no scroll to win, and it holds the reader's own skinned Wren.

   The empty orbit with YOU at its centre and her at its edge, her desk as a
   card (she is there before anyone else is), the line, and one way in: PUT
   SOMEONE IN ORBIT. On the theme now: the page, the type and the CTA (ind
   with the page colour on it — white on Midnight's violet was 2.9:1); the
   title in the 10a style with no rule; the CTA's words in system 600 (a
   button); mono only at 9/10/11, in SF Mono's Medium or SemiBold.

   It scrolls: the whole of it is ≈670pt at the default text size, so on an
   iPhone SE it ran over the title and on any phone the CTA could sit under
   the floating tab bar. Centred while it fits, and the CTA always scrolls
   clear of the bar (useTabBarSpace + 12).

   SWIFT OR REACT NATIVE (batch 3, 2026-11-09). With the "kindredsempty" switch on and
   KKindredsEmptyView in the binary, SwiftUI draws the whole page (KindredsEmptyNative below:
   modules/kindredly-ui Portable/Kindreds/KKindredsEmpty.swift, one Host for the screen), so with
   "kindreds" on too the tab is one Swift page whether anyone is in it or not. Otherwise the React
   Native page (KindredsEmptyRN), exactly as it was. NativeSurface in live mode, as the list: a
   flip reaches a running app, but only while the tab isn't on show. The same props, so the tab
   and the dev page don't move; the words, her desk (useWrenDesk) and where each tap goes stay
   here. */
export function KindredsEmpty({ onWrite }: { onWrite: () => void }) {
  return (
    <NativeSurface
      surface="kindredsempty"
      view="KKindredsEmptyView"
      mode="live"
      native={() => <KindredsEmptyNative onWrite={onWrite} />}
      fallback={() => <KindredsEmptyRN onWrite={onWrite} />}
    />
  );
}

/** The page in SwiftUI: every word, her desk and her two pictures (the official bird on the
    desk card; her own curious 40 at the edge of the sky). */
function KindredsEmptyNative({ onWrite }: { onWrite: () => void }) {
  useLang(); // re-render when the reader changes language
  const router = useRouter();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const wren = useWrenName();
  const { unread, lastLine, lastAt } = useWrenDesk();
  const official = useBirdImageRef("official");
  const curious = useBirdImageRef("curious40");
  // WrenDeskRow on its own: the time since her last post, the line, VoiceOver's label
  const ago = lastAt ? sinceShort(lastAt) : "";
  const line = lastLine ?? t("wo.row.sub");
  return (
    <SurfaceHost>
      <KKindredsEmptyView
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        strings={{
          title: t("kindreds.title"),
          status: t("kindreds.none"),
          you: t("ui.you"),
          heading: t("kindreds.empty.title"),
          body: t("kindreds.empty.body"),
          rule: t("kindreds.empty.rule"),
          cta: t("kindreds.empty.cta"),
          picks: t("kindreds.empty.picks", { wren: wren.toUpperCase() }),
        }}
        desk={{
          name: OFFICIAL_NAME,
          tag: t("wo.tag").toUpperCase(),
          newLabel: t("wo.new"),
          unread: unread > 0,
          badge: unread > 0 ? badgeCount(unread) : "",
          ago,
          line,
          a11y: [OFFICIAL_NAME, t("wo.tag"), unread ? t("wo.new") : null, ago, line].filter(Boolean).join(", "),
          bird: official,
        }}
        bird={curious}
        onWrite={onWrite}
        onDesk={() => router.push(`/room/${WREN_ROOM}`)}
      />
    </SurfaceHost>
  );
}

/** The React Native page (the "kindredsempty" switch's fallback), exactly as it was. */
function KindredsEmptyRN({ onWrite }: { onWrite: () => void }) {
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
          <Text style={{ ...PFM.monoMed, fontSize: MONO.label, letterSpacing: 0.6, color: tk.mute, textAlign: "center", marginTop: 14, maxWidth: 300, lineHeight: 17 }}>{t("kindreds.empty.rule")}</Text>
          <Pressable
            onPress={onWrite}
            accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, backgroundColor: tk.ind, paddingVertical: 16, paddingHorizontal: 20, marginTop: 34, alignSelf: "stretch", opacity: pressed ? 0.85 : 1 })}
          >
            <Text style={{ flexShrink: 1, fontSize: 15, fontWeight: "600", color: tk.bg }}>{t("kindreds.empty.cta")}</Text>
            <Text style={{ ...PFM.monoMed, fontSize: MONO.label, letterSpacing: 1, color: tk.bg, opacity: 0.72 }}>{t("kindreds.empty.picks", { wren: wren.toUpperCase() })}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
