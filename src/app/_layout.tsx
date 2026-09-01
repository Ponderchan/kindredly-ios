import { useEffect, useRef, useState } from "react";
import { LogBox, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../lib/auth";
import { refreshFingerprint } from "../lib/aura";
import { registerForReplies } from "../lib/notify";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { EntitlementProvider } from "../lib/entitlement";
import { WrenSkinProvider } from "../lib/wren-skin";
import { useAppFonts } from "../theme/fonts";
import { loadLang } from "../lib/i18n";
import "../data/strings"; // registers every surface's catalog

import { P } from "../theme/post";
import { SameShape } from "../components/SameShape";
import { fetchThreadMessages } from "../lib/db";

SplashScreen.preventAutoHideAsync();

/* THE VECTOR WAKES UP WITH THE APP. refreshFingerprint ran only after a
   send, so someone who wrote five letters last week and none since was
   matched all week on last week's vector — and any future change to the
   signature itself would never reach a reader who happened not to write.
   Once per cold start, when a session exists, off the critical path. */
/* A KNOCK THAT LANDS NOWHERE IS A WASTED ONE. Tapping the notification
   opens the correspondence it was about, not the app's front door — the
   whole point was to carry someone back to the letter. */
function KnockRouting() {
  const router = useRouter();
  useEffect(() => {
    /* AND IT HAS TO LAND IN THE RIGHT ROOM. Kindreds sends a named
       correspondence to /room (folds, songs, the shelf) and a stranger
       still coming into view to /chat — two deliberately different places.
       This pushed everyone to /chat, so a knock from someone whose name you
       already know opened the screen you had both outgrown. The outbox row
       carries only a thread id, so the split is resolved here, from the
       thread itself; if that read fails we still open something rather than
       nothing. */
    const open = async (res: Notifications.NotificationResponse) => {
      const id = (res.notification.request.content.data as { thread?: string } | undefined)?.thread;
      if (typeof id !== "string" || !id) return;
      let revealed = false;
      try {
        const d = await fetchThreadMessages(id);
        revealed = !!d?.revealed;
      } catch {
        /* fall through to /chat — the pre-reveal screen reads either way */
      }
      router.push(revealed ? `/room/${id}` : `/chat/${id}`);
    };
    Notifications.getLastNotificationResponseAsync().then((r) => r && void open(r));
    const sub = Notifications.addNotificationResponseReceivedListener((r) => void open(r));
    return () => sub.remove();
  }, [router]);
  return null;
}

function FingerprintOnLaunch() {
  const { user, isGuest } = useAuth();
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || !user || isGuest) return;
    ran.current = true;
    void refreshFingerprint();
    void registerForReplies();
  }, [user, isGuest]);
  return null;
}

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
            <FingerprintOnLaunch />
            <KnockRouting />
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

              {/* the launch, over everything, until it has lifted away */}
              {booting && <SameShape onDone={() => setBooting(false)} />}
            </View>
            </WrenSkinProvider>
          </EntitlementProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
