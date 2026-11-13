import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState, InteractionManager, LogBox, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaInsetsContext, SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../lib/auth";
import { prefetchAuraCard, refreshFingerprint } from "../lib/aura";
import { markWork, noteRoute, startStallProbe } from "../lib/stall-probe";
import { registerForReplies } from "../lib/notify";
import { ensurePushObject, lineKey, lineText, rememberMorningQuestion, replanLocal } from "../lib/local-push";
import { leaveSpark } from "../lib/journal-handoff";
import { BirdSnapshots } from "../components/BirdSnapshots";
import { launchInks } from "../components/LaunchAnimation";
import * as Notifications from "expo-notifications";
import { usePathname, useRouter } from "expo-router";
import { EntitlementProvider } from "../lib/entitlement";
import { WrenSkinProvider } from "../lib/wren-skin";
import { ThemeProvider, useP, useTheme } from "../lib/theme";
import { WrenStageProvider } from "../lib/wren-stage";
import { loadLang } from "../lib/i18n";
import { startSurfaces, useNativeSurface } from "../lib/surfaces";
import { isPronounId, readYourPronoun } from "../lib/pronouns";
import { setMoodPronoun } from "../data/moods";
import { useLang } from "../lib/i18n";
import { nativeSetTextScript } from "../../modules/kindredly-ui";
import "../data/strings"; // registers every surface's catalog

import { P } from "../theme/post";
import { shareFoldFrame, swiftReadsFold, useFoldFrame } from "../lib/fold";
import { FoldCornerKey } from "../components/FoldCornerKey";
import { FOLD_TOP_AIR, isLaptop } from "../lib/fold-frame";
import { fetchThreadMessages, readThreadDetailCache } from "../lib/db";
import { prefetchWrenAvatar } from "../lib/wren-avatar";

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
      const data = res.notification.request.content.data as { thread?: string; wren?: number; line?: string; pool?: unknown; index?: unknown; face?: number; from?: string } | undefined;
      /* Make your own face: "wren finished your face" (screens/make-face, set when the app went
         away mid-drawing) opens the flow on the result */
      if (data?.face) {
        router.push(`/make-face?from=${data.from === "onboarding" ? "onboarding" : "me"}&resume=1` as never);
        return;
      }
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
      /* from Kindreds (owner, 2026-10-31): the correspondence opens over the Kindreds list, so
         Back lands among the chats; it used to open over whichever tab was last in front (often
         Me), which read as a letter page of Me's */
      router.navigate("/(tabs)/kindreds" as never);
      router.push(revealed ? `/room/${id}` : `/chat/${id}`);
    };
    /* the cold-start tap, once: cleared after it is read, so a React tree started again in the same
       process (the scene life cycle reconnects a discarded scene, plugins/with-scene-lifecycle.js)
       doesn't open the same letter a second time */
    Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        if (!r) return;
        Notifications.clearLastNotificationResponse();
        void open(r);
      })
      .catch((e) => console.log("[knock] the last tap couldn't be read:", e));
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
   is drawn on the splash's colour — not a theme surface — so the entry
   route keeps that colour under its first frame, and the splash never
   blinks to the theme's page on the way in. In every light theme it is the
   splash's ground. A night launch for Midnight is drafted but not
   decided (the owner's call; see LaunchAnimation); until it is, only the
   dev theme switch reaches it. (Since 2026-10-19 the splash and the launch
   are the app icon's Post Blue, #5B55FF, not lavender: the new
   onboarding's storyboard §3.) The piece and this ground take their colour
   from one place (launchInks, read in ThemedStack's launchGround), so the
   two can't part. Only this ground's first frame shows — the piece covers
   it after that — so it can follow the live theme while the piece keeps
   the one it started on. */

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
   aura-card keeps the fixed P.penWash in the light themes and takes tk.bg
   in Midnight (see app/aura-card.tsx). Neither belongs to a step-5 slice,
   so without these lines both would slide in on a white slab in Classic
   for good. A page a step-5 slice is still to retheme (aura, kindred/[id],
   my-letters, my-kindreds, keepsakes, drafts, blocked, settings) gets no
   line: it moves to tk.bg with its slice, and any that keeps another
   ground adds its own line here, the same way.

   THE STATUS BAR IS LEFT TO iOS (step 7.1). No style is pinned here: the
   plist's UIStatusBarStyleDefault picks the text. On iOS 18 the default
   follows the window's light or dark, which lib/theme holds on the theme's
   side in every case (Match system on: Midnight exactly when the phone is
   dark), so taking the pin away changes nothing there. On iOS 26 the
   default reads the ground under the bar — the Midnight sweep shows dark
   text on the courier's day sky and on the send's sky (courier-1, courier-2,
   travel-preview-2). A style pinned to the theme (it was here for a day,
   from 9fe54c2) overrode that, and was wrong on iOS 26 wherever the ground
   isn't the theme's: the courier's night sky, the paywall's night page in
   onboarding, the photo lightbox. The strip above a page sheet is the
   window's ground under the sheet's dim — #ECECFE in the light themes,
   Midnight's #0F0E1C, which shows as #08070F — always on the theme's side,
   so the default reads it right on both runtimes and no sheet names a
   style. Only a fixed ground that the window's light or dark would get
   wrong on iOS 18 names its own, and only while its screen is focused (the
   stack keeps covered screens mounted, and the last StatusBar mounted
   wins): the launch piece, the courier's cover (by its sky) and
   onboarding's fare page (light, on the night page). Once none is mounted,
   React Native hands the bar back to the default.
   Still open, for whoever owns components/PhotoLightbox: on iOS 18 in the
   light themes the window is light, so the default puts dark text on the
   lightbox's rgba(10,10,12,.96), as it did before 9fe54c2 and does in the
   shipping app; only iOS 26 reads it right. {!!photo && <StatusBar
   style="light" />} inside its Modal would fix it. */
function ThemedStack() {
  const { t: tk, dark } = useTheme();
  const pal = useP();
  /* ON A FOLDING PHONE (iPhone Duo, 2026-11-12; lib/fold-frame, step 1: "先不坏"). The system
     keeps a band down the right edge of both screens, and the inner screen is far wider than a
     page should be. So every page's content is padded: out of the band, and on the inner screen
     into one column no wider than 560 in the middle (`pad`); the page's ground still runs edge
     to edge under it, because the padding is inside the painted content. Three screens are the
     whole window instead and lay themselves out: the tabs (their bar stands in the band),
     onboarding (its ground changes from step to step) and make-face (it floats over the page
     under it). And the Duo's top safe inset is 0, its clock being in the band, so the insets
     every screen reads get a little air at the top and no sides (the padding is the sides).
     On a phone that doesn't fold `pad` is nothing and the insets are the system's own object. */
  const frame = useFoldFrame();
  const systemInsets = useSafeAreaInsets();
  const insets = useMemo(
    () => (frame.duo ? { top: Math.max(systemInsets.top, FOLD_TOP_AIR), bottom: systemInsets.bottom, left: 0, right: 0 } : systemInsets),
    [frame.duo, systemInsets],
  );
  const pad = useMemo(() => (frame.duo ? { paddingLeft: frame.left, paddingRight: frame.right } : null), [frame.duo, frame.left, frame.right]);
  const launchGround = useMemo(() => ({ contentStyle: { backgroundColor: launchInks(dark, tk).bg, ...pad } }), [dark, tk, pad]);
  const whole = useMemo(() => ({ backgroundColor: tk.bg }), [tk.bg]);
  /* TWO PAGES ON THE INNER SCREEN (step 2, "写字的地方"): a page whose Swift view lays the two
     pages out itself is the window less the system's band, not the column. Only where that
     Swift view is what draws (its switch on, in a binary that reads the fold); the React Native
     fallback keeps the column. */
  const spreadPage = useMemo(() => ({ contentStyle: { backgroundColor: tk.bg, paddingRight: frame.band } }), [tk.bg, frame.band]);
  const twoPages = !!frame.pages && swiftReadsFold();
  /* A SMALL LAPTOP (the inner screen upright and half-folded): the writing and reading pages keep
     to the upper half, so no line lies on the bend and the lower half is where the keyboard comes
     up (their Swift views measure the keyboard's overlap with themselves, which is then none).
     Today does its own (KTodayDesk's bend). The lower half is the page's ground. */
  const laptop = isLaptop(frame);
  const deckPage = useMemo(
    () => ({ contentStyle: { backgroundColor: tk.bg, ...pad, paddingBottom: Math.round(frame.height / 2) } }),
    [tk.bg, pad, frame.height],
  );
  const deck = laptop ? deckPage : null;
  const readerSpread = useNativeSurface("reader") && twoPages;
  const noteSpread = useNativeSurface("journalentry") && twoPages;
  const composeSpread = useNativeSurface("compose") && twoPages;
  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <SafeAreaInsetsContext.Provider value={insets}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tk.bg, ...pad },
        }}
      >
        <Stack.Screen name="index" options={launchGround} />
        {/* the two doors out of the launch fade in over its last frame; both are the whole
            window on a folding phone and pad themselves (see above) */}
        <Stack.Screen name="onboarding" options={{ animation: "fade", animationDuration: 450, contentStyle: whole }} />
        <Stack.Screen name="(tabs)" options={{ animation: "fade", animationDuration: 450, contentStyle: whole }} />
        {/* an unknown link (app/+not-found) is only passed through, so it doesn't slide in */}
        <Stack.Screen name="+not-found" options={{ animation: "none" }} />
        {/* WRITING TO A STRANGER rises from the bottom (10a), and the edge
            swipe can't take it away: the guarded ✕ is its one way out, so
            words are never lost to a stray swipe (owner). */}
        <Stack.Screen name="compose" options={{ animation: "slide_from_bottom", gestureEnabled: false, ...(composeSpread ? spreadPage : deck) }} />
        {/* a page to yourself rises the same way — except from the photo roll (?via=roll), which has
            already risen: there the page fades in over it where it stands, one sheet changing what
            it holds rather than a second one rising (owner, 2026-11-12: "重复跳了两次页面的感觉");
            the page puts its way out back to sliding down once it has arrived (journal-entry) */}
        <Stack.Screen
          name="journal-entry"
          options={({ route }) => ({
            ...((route.params as { via?: string } | undefined)?.via === "roll" ? { animation: "fade" as const, animationDuration: FROM_ROLL_MS } : { animation: "slide_from_bottom" as const }),
            ...(noteSpread ? spreadPage : deck),
          })}
        />
        <Stack.Screen name="journal-pick" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
        {/* STAMP PRESS: the camera and then the edit page cover everything, the tab bar too; the ×
            (and Retake) are the ways out, never a stray swipe mid-press */}
        <Stack.Screen name="stamp-press" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
        {/* THE ALBUM (custom stamps): a page pushed from Me › Stamps, on the page colour */}
        <Stack.Screen name="album" />
        {/* MAKE YOUR OWN FACE: transparent — the SwiftUI page draws its own dim and floating card
            over the screen it was opened from (Edit profile, onboarding's face grid) */}
        <Stack.Screen name="make-face" options={{ presentation: "transparentModal", animation: "fade", gestureEnabled: false, contentStyle: { backgroundColor: "transparent" } }} />
        {/* the reader fills the screen — the letter opens where you are,
            it doesn't slide in from the side or pop up as a card */}
        <Stack.Screen name="thread/[id]" options={{ animation: "fade", animationDuration: 260, ...(readerSpread ? spreadPage : deck) }} />
        {/* a conversation, and Wren's own room: the small laptop's upper half too (see `deck`) */}
        <Stack.Screen name="chat/[id]" options={deck ?? {}} />
        <Stack.Screen name="room/[id]" options={deck ?? {}} />
        <Stack.Screen name="room/wren" options={deck ?? {}} />
        {/* the two pages that still paint their own ground (see above) */}
        <Stack.Screen name="courier" options={{ contentStyle: { backgroundColor: pal.penWash, ...pad } }} />
        <Stack.Screen name="aura-card" options={{ contentStyle: { backgroundColor: dark ? tk.bg : P.penWash, ...pad } }} />
      </Stack>
      {/* a folding phone: a pushed page's way out, in the band's foot corner (lib/corner-key) */}
      <FoldCornerKey />
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

/* THE FOLD (iPhone Duo; lib/fold): asked for at launch and again whenever the window changes
   size, so every screen that reads useFold has the system's word. Draws nothing; on a phone that
   doesn't fold it asks once, hears "none" and never changes. */
function FoldWatch() {
  const frame = useFoldFrame();
  // the Swift views read the same frame (Portable KFold)
  useEffect(() => {
    shareFoldFrame(frame);
  }, [frame]);
  return null;
}

/** the diary page fading in over the photo roll (journal-entry ?via=roll) */
const FROM_ROLL_MS = 220;

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
    // Wren's avatar resolved once, so Kindreds and her room never start on her old bird
    prefetchWrenAvatar();
    // the last Aura card into memory (it waits for auth), so Me's tile opens with its picture
    prefetchAuraCard();
  }, []);

  // the fonts are embedded (theme/post), so nothing waits on them
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    /* the 10a theme (lib/theme): everything sits inside it — the root view
       too, so its ground can follow (RootGround) — and the stack paints the
       pages' ground (ThemedStack). It reads nothing from the providers
       below it. */
    <ThemeProvider>
      <RootGround>
        <SafeAreaProvider>
          <AuthProvider>
            <EntitlementProvider>
              <WrenSkinProvider>
              <WrenStageProvider>
              <FingerprintOnLaunch />
              <MoodPronoun />
              <TextScript />
              <LocalLinesOnLaunch />
              <StallProbe />
              <FoldWatch />
                <BirdSnapshots />
              <KnockRouting />
              <ThemedStack />
              </WrenStageProvider>
              </WrenSkinProvider>
            </EntitlementProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </RootGround>
    </ThemeProvider>
  );
}

/* THE ROOT VIEW'S GROUND. The stack covers it in normal use, so it shows
   only in edge frames (a remount, a transition that leaves a gap) — white
   in the light themes, as it always was; in Midnight a white frame would
   flash, so there it is the theme's ground. */
function RootGround({ children }: { children: ReactNode }) {
  const { t: tk, dark } = useTheme();
  return <GestureHandlerRootView style={{ flex: 1, backgroundColor: dark ? tk.bg : P.paper }}>{children}</GestureHandlerRootView>;
}
