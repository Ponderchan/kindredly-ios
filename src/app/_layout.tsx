import { useEffect, useState } from "react";
import { LogBox, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../lib/auth";
import { EntitlementProvider } from "../lib/entitlement";
import { WrenSkinProvider } from "../lib/wren-skin";
import { useAppFonts } from "../theme/fonts";
import { loadLang } from "../lib/i18n";
import "../data/strings"; // registers every surface's catalog

import { P } from "../theme/post";
import { CounterOpen } from "../components/CounterOpen";

SplashScreen.preventAutoHideAsync();

// Simulator-only expo-notifications keychain noise. The toast it raises sits
// over the bottom controls and eats taps — silence it in dev.
LogBox.ignoreLogs(["Error reading persisted server registration info"]);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  /* the launch runs ONCE per cold start, over an app that is already
     mounting underneath it — it is a curtain, never a gate */
  const [booting, setBooting] = useState(true);
  // the reader's own language choice, restored before the first paint
  useEffect(() => {
    void loadLang();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: P.paper }}>
      <SafeAreaProvider>
        <AuthProvider>
          <EntitlementProvider>
            <WrenSkinProvider>
            <View style={{ flex: 1, backgroundColor: P.paper }}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: P.paper },
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="(tabs)" />
                {/* Writing is a PAGE, not a popup — and it arrives from the
                    RIGHT, continuing forward from wherever you chose it. Sliding
                    up from the bottom read as a second, separate event. */}
                <Stack.Screen name="compose" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="journal-entry" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
                {/* the reader fills the screen — the letter opens where you are,
                    it doesn't slide in from the side or pop up as a card */}
                <Stack.Screen name="thread/[id]" options={{ animation: "fade", animationDuration: 260 }} />
              </Stack>

              {/* the counter, over everything, until it has opened */}
              {booting && <CounterOpen onDone={() => setBooting(false)} />}
            </View>
            </WrenSkinProvider>
          </EntitlementProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
