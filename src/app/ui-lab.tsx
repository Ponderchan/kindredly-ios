import { useState } from "react";
import { Redirect } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Host } from "@expo/ui/swift-ui";
import { InkCardHost, KGalleryHost, KTabBar, isKindredlyUIAvailable, isKindredlyUIViewAvailable, type KThemeKey } from "../../modules/kindredly-ui";
import { setDevThemeOverride, useDevThemeOverride, useTheme } from "../lib/theme";
import { NATIVE_DEFAULTS, devSurfaceOverride, setDevSurfaceOverride, useNativeSurface } from "../lib/surfaces";
// as tr: this page's `t` is the theme's colours
import { t as tr } from "../lib/i18n";
import THEMES from "../theme/themes.json";
import { PF } from "../theme/post";

/* dev only — the 10a SwiftUI views (modules/kindredly-ui) as a native build draws them.
   kindredly:///ui-lab

   From the top:
   - THEME: the dev theme switch (lib/theme setDevThemeOverride). Classic / Midnight /
     Lavender / Paper force that theme on the WHOLE app, Midnight included while DARK_READY
     is off, so a screen that has moved onto useTheme() / useP() can be checked in each
     before release; Off goes back to the normal theme. Dev builds only, never saved. This
     page paints itself from the theme too, so it is the first thing that changes.
   - one InkCard per theme, each on its own page colour, with a line of React Native text
     inside: the module linked (pod install after the module was added), the view registered
     under its name, React Native content laid out inside SwiftUI and wrapping at the card's
     edge, and each theme's face, outline and hard shadow.
   - the gallery: every Portable piece (type, both InkCards, SoftGroup, Float, the buttons,
     the capsules, the Me chips) in the theme in effect, one Host for all of it.
   - the 10a tab bar (KTabBar, what components/NativeTabBar draws in the tabs), one per theme,
     each in a box of its theme's page: tap a tab and the lens slides and the icon pops, tap
     the + and the composer sheet rises over the dim inside the box. Kindreds carries a count
     of 3 (hidden while it is the tab selected). Nothing navigates from here; a card or the dim
     just closes the sheet. A build whose module predates the bar says so.

   A build without the module says so instead of drawing empty boxes. */
const KEYS = Object.keys(THEMES.themes) as KThemeKey[];

export default function UiLab() {
  const { key, t } = useTheme();
  const forced = useDevThemeOverride();
  if (!__DEV__) return <Redirect href="/" />;
  const native = isKindredlyUIAvailable();
  const choices: { label: string; value: KThemeKey | null }[] = [...KEYS.map((k) => ({ label: THEMES.themes[k].name, value: k })), { label: "Off", value: null }];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.3, color: t.ind, margin: 16, marginBottom: 6 }}>UI LAB</Text>

        {/* the dev theme switch */}
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.4, color: t.mute, marginHorizontal: 16, marginBottom: 8 }}>
          THEME · {forced ? "FORCED" : "NORMAL"} · {THEMES.themes[key].name.toUpperCase()}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginHorizontal: 16, marginBottom: 16 }}>
          {choices.map(({ label, value }) => {
            const on = forced === value;
            return (
              <Pressable
                key={label}
                onPress={() => setDevThemeOverride(value)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => ({
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: t.ln,
                  backgroundColor: on ? t.ink : t.sf,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: on ? t.sf : t.ink }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* the dev surface switch: try a Swift screen on real data before its key flips */}
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.4, color: t.mute, marginHorizontal: 16, marginBottom: 8 }}>
          SURFACES · TAP: DEFAULT → SWIFT → RN
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginHorizontal: 16, marginBottom: 16 }}>
          {Object.keys(NATIVE_DEFAULTS).map((key) => (
            <SurfaceChip key={key} surface={key} />
          ))}
        </View>

        <Text style={{ fontSize: 16, lineHeight: 24, color: t.ink, marginHorizontal: 16, marginBottom: 12 }}>
          {native ? "InkCard · one per theme" : "KindredlyUI is not in this build. Run pod install (or prebuild), then rebuild the dev client."}
        </Text>
        {native
          ? KEYS.map((k) => {
              const kt = THEMES.themes[k];
              return (
                // the page in the theme's own bg; the 16 gutter and the room below leave the 6/6 shadow its space, as the mock does
                <View key={k} style={{ backgroundColor: kt.bg, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 22 }}>
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.4, color: kt.mute, marginBottom: 8 }}>{kt.name.toUpperCase()}</Text>
                  <InkCardHost theme={k}>
                    <Text style={{ fontSize: 17, lineHeight: 24, color: kt.ink }}>
                      A line of React Native text inside a SwiftUI card, long enough to wrap at the card's edge.
                    </Text>
                  </InkCardHost>
                </View>
              );
            })
          : null}

        {native ? (
          <>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.4, color: t.mute, marginHorizontal: 16, marginTop: 20, marginBottom: 4 }}>
              GALLERY · {THEMES.themes[key].name.toUpperCase()}
            </Text>
            {/* the gallery paints its own page colour and gutter; it follows the theme in effect */}
            <KGalleryHost theme={key} />
          </>
        ) : null}

        {native ? (
          <>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.4, color: t.mute, marginHorizontal: 16, marginTop: 20, marginBottom: 4 }}>TAB BAR · ONE PER THEME</Text>
            {isKindredlyUIViewAvailable("KTabBarView") ? (
              KEYS.map((k) => <TabBarSample key={k} theme={k} />)
            ) : (
              <Text style={{ fontSize: 16, lineHeight: 24, color: t.ink, marginHorizontal: 16 }}>
                This build's KindredlyUI predates the tab bar (no KTabBarView). Run pod install, then rebuild the dev client.
              </Text>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/* one theme's tab bar, live but going nowhere: the same view the tabs use, in a box tall
   enough for the sheet (the sheet sits 12 above the bar, the bar 16 off the box's bottom with
   no safe area here). The words are the app's own, so a change of language shows here too. */
const SAMPLE_TABS = [
  { glyph: "today", label: "tab.today" },
  { glyph: "notes", label: "tab.notes" },
  { glyph: "kindreds", label: "tab.kindreds" },
  { glyph: "me", label: "tab.me" },
] as const;

function TabBarSample({ theme }: { theme: KThemeKey }) {
  const kt = THEMES.themes[theme];
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  return (
    <View style={{ backgroundColor: kt.bg, paddingTop: 12 }}>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.4, color: kt.mute, marginHorizontal: 16 }}>{kt.name.toUpperCase()}</Text>
      <Host style={{ height: 320 }} ignoreSafeArea="all" colorScheme={kt.dark ? "dark" : "light"}>
        <KTabBar
          theme={theme}
          tabs={SAMPLE_TABS.map((s) => ({ glyph: s.glyph, label: tr(s.label), badge: s.glyph === "kindreds" ? 3 : 0 }))}
          activeIndex={active}
          panelOpen={open}
          safeAreaBottom={0}
          plusLabel={tr("pc.post")}
          closeLabel={tr("wren.trackClose")}
          panelTitle={tr("pc.post")}
          panelCards={[
            { key: "stranger", title: tr("pc.stranger"), subtitle: tr("pc.strangerSaid"), glyph: "letter", tone: "lavender" },
            { key: "yourself", title: tr("pc.yourself"), subtitle: tr("pc.yourselfSaid"), glyph: "note", tone: "warm" },
          ]}
          onTabPress={(i) => {
            setOpen(false);
            setActive(i);
          }}
          onPlusPress={() => setOpen((o) => !o)}
          onPanelAction={() => setOpen(false)}
          onPanelDismiss={() => setOpen(false)}
        />
      </Host>
    </View>
  );
}

/* one surface: default (whatever the table and NATIVE_DEFAULTS say), forced
   Swift, forced React Native — dev only, for this run of the app */
function SurfaceChip({ surface }: { surface: string }) {
  const { t } = useTheme();
  const on = useNativeSurface(surface);
  const forced = devSurfaceOverride(surface);
  const next = forced === null ? true : forced ? false : null;
  const mode = forced === null ? "default" : forced ? "swift" : "rn";
  return (
    <Pressable
      onPress={() => setDevSurfaceOverride(surface, next)}
      accessibilityRole="button"
      style={({ pressed }) => ({
        paddingVertical: 7,
        paddingHorizontal: 11,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: t.ln,
        backgroundColor: forced === null ? t.sf : t.ink,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontSize: 12, fontWeight: "600", color: forced === null ? t.ink : t.sf }}>
        {surface} · {mode}{on ? " ✓" : ""}
      </Text>
    </Pressable>
  );
}
