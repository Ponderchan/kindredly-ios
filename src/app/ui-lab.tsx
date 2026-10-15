import { Redirect } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { InkCardHost, KGalleryHost, isKindredlyUIAvailable, type KThemeKey } from "../../modules/kindredly-ui";
import { setDevThemeOverride, useDevThemeOverride, useTheme } from "../lib/theme";
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
      </ScrollView>
    </SafeAreaView>
  );
}
