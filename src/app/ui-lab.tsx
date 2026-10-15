import { Redirect } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { InkCardHost, isKindredlyUIAvailable, type KThemeKey } from "../../modules/kindredly-ui";
import THEMES from "../theme/themes.json";
import { PF } from "../theme/post";

/* dev only — the 10a SwiftUI views (modules/kindredly-ui) as a native build draws them: one
   InkCard per theme, each on its own page colour, with a line of React Native text inside.
   kindredly:///ui-lab

   It checks the native side end to end: the module linked (pod install after the module was
   added), the view registered under its name, React Native content laid out inside SwiftUI and
   wrapping at the card's edge, and each theme's face, outline and hard shadow. A build without
   the module says so instead of drawing empty boxes. */
const KEYS = Object.keys(THEMES.themes) as KThemeKey[];

export default function UiLab() {
  if (!__DEV__) return <Redirect href="/" />;
  const native = isKindredlyUIAvailable();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEMES.themes.classic.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.3, color: THEMES.themes.classic.ind, margin: 16, marginBottom: 6 }}>UI LAB</Text>
        <Text style={{ fontSize: 16, lineHeight: 24, color: THEMES.themes.classic.ink, marginHorizontal: 16, marginBottom: 12 }}>
          {native ? "InkCard · one per theme" : "KindredlyUI is not in this build. Run pod install (or prebuild), then rebuild the dev client."}
        </Text>
        {native
          ? KEYS.map((key) => {
              const t = THEMES.themes[key];
              return (
                // the page in the theme's own bg; the 16 gutter and the room below leave the 6/6 shadow its space, as the mock does
                <View key={key} style={{ backgroundColor: t.bg, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 22 }}>
                  <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.4, color: t.mute, marginBottom: 8 }}>{t.name.toUpperCase()}</Text>
                  <InkCardHost theme={key}>
                    <Text style={{ fontSize: 17, lineHeight: 24, color: t.ink }}>
                      A line of React Native text inside a SwiftUI card, long enough to wrap at the card's edge.
                    </Text>
                  </InkCardHost>
                </View>
              );
            })
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}
