import { useEffect, useRef, useState } from "react";
import { AppState, InteractionManager, LogBox, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../lib/auth";
import { refreshFingerprint } from "../lib/aura";
import { markWork, noteRoute, startStallProbe } from "../lib/stall-probe";
import { registerForReplies } from "../lib/notify";
import { ensurePushObject, lineKey, lineText, rememberMorningQuestion, replanLocal } from "../lib/local-push";
import { leaveSpark } from "../lib/journal-handoff";
import { syncActivities } from "../lib/activities";
import { BirdSnapshots } from "../components/BirdSnapshots";
import * as Notifications from "expo-notifications";
import { usePathname, useRouter } from "expo-router";
import { EntitlementProvider } from "../lib/entitlement";
import { WrenSkinProvider } from "../lib/wren-skin";
import { ThemeProvider, useP, useTheme } from "../lib/theme";
import { WrenStageProvider } from "../lib/wren-stage";
import { loadLang } from "../lib/i18n";
import { startSurfaces } from "../lib/surfaces";
import { isPronounId, readYourPronoun } from "../lib/pronouns";
import { setMoodPronoun } from "../data/moods";
import { useLang } from "../lib/i18n";
import { nativeSetTextScript } from "../../modules/kindredly-ui";
import "../data/strings"; // registers every surface's catalog

import { P } from "../theme/post";
import { fetchThreadMessages, readThreadDetailCache } from "../lib/db";

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
       nothing.

       THE PHONE'S OWN COPY FIRST (10a step 5). A named kindred is named for
       good, so a cached detail that says so settles it with no network at
       all — a knock opened offline, or on a slow link, still lands in the
       room instead of the stranger's screen. Only a copy that says "not yet"
       (they may have traded names since) or no copy at all asks the server,
       and if the server can't answer, the copy's answer stands. */
    const open = async (res: Notifications.NotificationResponse) => {
      const data = res.notification.request.content.data as { thread?: string; wren?: number; line?: string; pool?: unknown; index?: unknown } | undefined;
      /* her own lines, scheduled on the phone (lib/local-push): a question
         opens a fresh Notes page with that question as its placeholder (the
         voice line opens the page recording, the photo line the roll), the
         morning opens the desk and keeps her question for tonight's page,
         the aura opens the aura, her day off opens Free Flight on her
         cover. Nothing of the journal rode in the notification — only
         which approved line it was. */
      if (data?.line) {
        if (data.line === "daily" || data.line === "week") {
          const text = lineText(data.pool, data.index);
          if (text) leaveSpark(text);
          const key = lineKey(data.pool, data.index);
          if (key === "daily_prompt.21") router.push("/journal-entry?start=voice");
          else if (key === "daily_prompt.6") router.push("/journal-pick");
          else router.push("/journal-entry");
        } else if (data.line === "aura") router.push("/aura");
        else if (data.line === "dayoff") router.push("/courier?play=1");
        else {
          if (data.line === "morning") void rememberMorningQuestion(data.index);
          router.push("/(tabs)/letters");
        }
        return;
      }
      // a post from Wren's desk (0023) opens her room, not a thread
      if (data?.wren) {
        router.push("/room/wren");
        return;
      }
      const id = data?.thread;
      if (typeof id !== "string" || !id) return;
      const cached = await readThreadDetailCache(id);
      let revealed = !!cached?.revealed;
      if (!revealed) {
        try {
          const d = await fetchThreadMessages(id);
          if (d) revealed = !!d.revealed;
        } catch (e) {
          /* fall through to the copy's answer (or /chat) — the pre-reveal
             screen reads either way */
          console.log("[knock] couldn't read the thread, using the phone's copy:", e);
        }
      }
      router.push(revealed ? `/room/${id}` : `/chat/${id}`);
    };
    Notifications.getLastNotificationResponseAsync().then((r) => r && void open(r));
    const sub = Notifications.addNotificationResponseReceivedListener((r) => void open(r));
    return () => sub.remove();
  }, [router]);
  return null;
}

/* the probe learns the route from the router, nothing else */
function StallProbe() {
  const path = usePathname();
  useEffect(() => {
    startStallProbe();
  }, []);
  useEffect(() => {
    noteRoute(path);
  }, [path]);
  return null;
}

function FingerprintOnLaunch() {
  const { user, isGuest } = useAuth();
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || !user || isGuest) return;
    ran.current = true;
    /* not during launch: the first taps used to compete with a hatch over
       every letter. After the transitions, and a few seconds later. */
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        markWork("fingerprint");
        void refreshFingerprint();
      }, 4000);
    });
    void registerForReplies();
  }, [user, isGuest]);
  /* her lock-screen activities are reconciled on every foreground: the
     closed window ends once its hour has passed, a letter out gets the
     numbers the database has (lib/activities) */
  useEffect(() => {
    if (!user) return;
    void syncActivities();
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") void syncActivities();
    });
    return () => sub.remove();
  }, [user]);
  return null;
}

/* HER LINES ARE RE-PLANNED ON EVERY LAUNCH AND RETURN (lib/local-push):
   the next fourteen days are one-shot, so the queue only stays full for
   someone who keeps coming back — and a day that has turned, a desk that
   filled, a switch flipped on the web all land here. Guests too: the
   lines are the phone's own. */
function LocalLinesOnLaunch() {
  const { user } = useAuth();
  useEffect(() => {
    void ensurePushObject(); // an account without user_metadata.push gets push: {} (server contract, 2026-10-11)
    void replanLocal({ force: true });
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") void replanLocal();
    });
    return () => sub.remove();
  }, [user?.id]);
  return null;
}

/* THE MOOD NAMES AGREE WITH THEIR WRITER (data/moods setMoodPronoun): in
   Spanish, Portuguese, French and Italian a face's name takes the reader's
   gender ("Enamorada"), and they / unset gets the neutral wording. The
   pronoun is the account's (user_metadata.pronoun) before this phone's copy,
   as Edit profile reads it; a change there lands here through the profile. */
function MoodPronoun() {
  const { profile } = useAuth();
  const account = profile.pronoun;
  useEffect(() => {
    let alive = true;
    if (isPronounId(account)) {
      setMoodPronoun(account);
      return;
    }
    void readYourPronoun().then((device) => {
      if (alive) setMoodPronoun(device ?? "they");
    });
    return () => {
      alive = false;
    };
  }, [account]);
  return null;
}

/* THE SWIFT TYPE KNOWS THE READER'S SCRIPT (modules/kindredly-ui textScript): Japanese and
   Korean set the letter serifs with CJK leading, since iOS draws those glyphs from its own
   taller faces. Told at launch and on every language change. */
function TextScript() {
  const lang = useLang();
  useEffect(() => {
    nativeSetTextScript(lang);
  }, [lang]);
  return null;
}

// Simulator-only expo-notifications keychain noise. The toast it raises sits
// over the bottom controls and eats taps — silence it in dev.
LogBox.ignoreLogs(["Error reading persisted server registration info"]);

/* THE LAUNCH'S OWN GROUND. The launch piece (app/index → LaunchAnimation)
   is drawn on the splash's lavender, an object with its own colour like
   the postmark — not a theme surface — so the entry route keeps it under
   its first frame, and the splash never blinks to the theme's page on the
   way in. */
const LAUNCH_GROUND = { contentStyle: { backgroundColor: P.penWash } };

/* A SCREEN ARRIVES ON ITS OWN COLOUR. The stack paints every incoming page
   on its contentStyle until the page's first render — so a lavender page
   pushed from a lavender tab used to slide in as a white slab for as long
   as its first frame took (owner, 2026-09-19), which is why some routes
   once named the old wash here. With 10a every page sits on the theme's
   one ground (tk.bg: white in Classic, lavender in Lavender, cream in
   Paper, night in Midnight), so the stack paints that, for every route,
   and follows the theme as it changes.

   EXCEPT a page that still paints a ground of its own: it names that
   ground here, from the same source the page reads, until it moves to
   tk.bg (then its line goes). courier keeps the accent's palest wash on
   purpose (useP().penWash, the theme's lav2; see app/courier.tsx), and
   aura-card is not themed yet (the fixed P.penWash). Neither belongs to a
   step-5 slice, so without these lines both would slide in on a white
   slab in Classic for good. A page a step-5 slice is still to retheme
   (aura, kindred/[id], my-letters, my-kindreds, keepsakes, drafts,
   blocked, settings) gets no line: it moves to tk.bg with its slice, and
   any that keeps another ground adds its own line here, the same way. */
function ThemedStack() {
  const { t: tk } = useTheme();
  const pal = useP();
  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tk.bg },
        }}
      >
        <Stack.Screen name="index" options={LAUNCH_GROUND} />
        {/* the two doors out of the launch fade in over its last frame */}
        <Stack.Screen name="onboarding" options={{ animation: "fade", animationDuration: 450 }} />
        <Stack.Screen name="(tabs)" options={{ animation: "fade", animationDuration: 450 }} />
        {/* WRITING TO A STRANGER rises from the bottom (10a), and the edge
            swipe can't take it away: the guarded ✕ is its one way out, so
            words are never lost to a stray swipe (owner). */}
        <Stack.Screen name="compose" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
        {/* a page to yourself rises the same way */}
        <Stack.Screen name="journal-entry" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="journal-pick" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
        {/* the reader fills the screen — the letter opens where you are,
            it doesn't slide in from the side or pop up as a card */}
        <Stack.Screen name="thread/[id]" options={{ animation: "fade", animationDuration: 260 }} />
        {/* the two pages that still paint their own ground (see above) */}
        <Stack.Screen name="courier" options={{ contentStyle: { backgroundColor: pal.penWash } }} />
        <Stack.Screen name="aura-card" options={{ contentStyle: { backgroundColor: P.penWash } }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  /* the launch piece lives on the entry route (app/index.tsx): the egg,
     the hatch, the flight, the mark — it covers the session check and
     leaves once the mark has landed */
  // the reader's own language choice, restored before the first paint
  useEffect(() => {
    void loadLang();
    // which screens draw in SwiftUI (lib/surfaces): the cache now, the table
    // when it answers, again on every return to the front
    startSurfaces();
  }, []);

  // the fonts are embedded (theme/post), so nothing waits on them
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: P.paper }}>
      <SafeAreaProvider>
        <AuthProvider>
          <EntitlementProvider>
            {/* the 10a theme (lib/theme): every screen sits inside it, and
                the stack paints its ground (ThemedStack) */}
            <ThemeProvider>
            <WrenSkinProvider>
            <WrenStageProvider>
            <FingerprintOnLaunch />
            <MoodPronoun />
            <TextScript />
            <LocalLinesOnLaunch />
            <StallProbe />
              <BirdSnapshots />
            <KnockRouting />
            <ThemedStack />
            </WrenStageProvider>
            </WrenSkinProvider>
            </ThemeProvider>
          </EntitlementProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
