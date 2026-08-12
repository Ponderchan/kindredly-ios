import { useEffect } from "react";
import { LogBox, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../lib/auth";
import { EntitlementProvider } from "../lib/entitlement";
import { WrenSkinProvider } from "../lib/wren-skin";
import { useAppFonts } from "../theme/fonts";
import { C } from "../theme/tokens";

SplashScreen.preventAutoHideAsync();

// Simulator-only expo-notifications keychain noise. The toast it raises sits
// over the bottom controls and eats taps — silence it in dev.
LogBox.ignoreLogs(["Error reading persisted server registration info"]);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.cream }}>
      <SafeAreaProvider>
        <AuthProvider>
          <EntitlementProvider>
            <WrenSkinProvider>
            <View style={{ flex: 1, backgroundColor: C.cream }}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: C.cream },
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="compose" options={{ presentation: "modal" }} />
                <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
                <Stack.Screen name="thread/[id]" />
              </Stack>
            </View>
            </WrenSkinProvider>
          </EntitlementProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
