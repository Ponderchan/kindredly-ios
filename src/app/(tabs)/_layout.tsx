import { FaceReadyBanner } from "../../components/FaceReadyBanner";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostTabBar, tabBarHeight } from "../../components/PostTabBar";
import { NativeTabBar, TabBarSpace, nativeTabBarReady, nativeTabBarRoom, railTabBarRoom, tabRail } from "../../components/NativeTabBar";
import { swiftReadsFold, useFoldFrame } from "../../lib/fold";
import { refreshWaiting, useWaiting } from "../../lib/waiting";
import { useMyThreadsLive } from "../../lib/live";
import { useAuth } from "../../lib/auth";
import { useNativeSurface } from "../../lib/surfaces";
import { useTheme } from "../../lib/theme";
import { PlusSheetOpen, TabBarAway } from "../../lib/screen-insets";
import { PostFan } from "../../components/PostFan";
import { IdentityNote } from "../../screens/edit-profile/IdentityNote";
import { GrowthMoment } from "../../components/GrowthMoment";
import { primeRoll } from "../../screens/photo-roll/roll-prime";
import { PLUS_BIRD_POSES, warmBirdPoses } from "../../lib/bird-images";

/* The fan lives HERE rather than inside the tab bar, and as a plain
   overlay rather than a Modal. Both matter for the same reason: a composer
   pushed from a Modal makes the app flash back into view before the next
   screen arrives, so the move reads as two animations with a gap. Rendered as
   a sibling of <Tabs>, it sits above the pages and below nothing, and the
   composer slides in from the right on top of it — one continuous move
   forward. The + in the bar is the ×: the same press toggles it.

   TWO BARS (10a, 1.2.4). With the "tabbar" surface on (lib/surfaces) and a
   binary that has the Swift view, the bar is NativeTabBar: SwiftUI draws the
   bar and the sheet the + opens, in one Host, so there is no PostFan — the
   sheet is part of the bar. Otherwise PostTabBar and PostFan, unchanged. The
   switch is followed live, so a row in app_surfaces turning the surface off
   reaches a running app on its next ask; `choosing` is shared, so an open
   sheet becomes the open fan rather than vanishing. The two bars take
   different room, so the layout tells its screens which (TabBarSpace,
   read with useTabBarSpace).

   10a step 5: every tab sits on the theme's one ground (sceneStyle tk.bg,
   so a tab's first frame is never another colour), and the layout tells
   its screens whether the + sheet is open (PlusSheetOpen, read with
   usePlusSheetOpen from lib/screen-insets) so Today can step its write-back
   pill out of the sheet's way.

   And a screen can send the bar away (TabBarAway, asked with
   useTabBarAway from lib/screen-insets): Today does while the reader
   writes back to a letter (the chat composers' A1, owner 2026-10-18), so
   the keyboard and the reply bar have the foot of the screen; the bar
   slides down out of sight and comes back when the reply ends. Both bars
   honour it, the Swift one and PostTabBar, and both only while Today is
   the tab on screen.

   ON A FOLDING PHONE (iPhone Duo, 2026-11-12; lib/fold-frame). This layout is the whole window,
   so the bar can stand in the system's band at the right edge (NativeTabBar, THE RAIL); the
   tabs themselves keep out of that band, and on the inner screen sit as one column in the
   middle (sceneStyle's padding; the root stack leaves this screen unpadded for it). With the
   bar in the band a tab keeps only the home indicator clear at its foot (railTabBarRoom). The
   overlays below get the same column. On a phone that doesn't fold every number is 0 and the
   tree is what it was.

   Identity Phase 1: the one-time note for people who were here before the
   identity switch (IdentityNote: what strangers see now, with the ♀/♂ and
   star sign switches inside it) is mounted here once, over every tab; it
   draws nothing unless the table's switch is on and the account has never
   answered. */
/** how long after the tabs first stand her pictures for the + are taken (the launch has settled) */
const WARM_BIRDS_AFTER_MS = 2500;

export default function TabsLayout() {
  const [choosing, setChoosing] = useState(false);
  // a screen sent the bar away (Today's reply); setBarAway is stable, so the context never churns
  const [barAway, setBarAway] = useState(false);
  const waiting = useWaiting();
  const { user } = useAuth();
  const { t: tk } = useTheme();
  const native = useNativeSurface("tabbar") && nativeTabBarReady();
  const insets = useSafeAreaInsets();
  const frame = useFoldFrame();
  const rail = native && tabRail(frame);
  const meNative = useNativeSurface("me");
  const todayNative = useNativeSurface("today");
  const notesNative = useNativeSurface("notes");
  const kindredsNative = useNativeSurface("kindreds");
  // a tab that is two pages on the inner screen: the window less the system's band, no column
  const spreadScene = { sceneStyle: { backgroundColor: tk.bg, paddingRight: frame.band } };

  /* the + open: the photo roll read ahead (screens/photo-roll/roll-prime), so Diary note rises with
     its pictures already in it — only where the phone has already allowed the library. The roll
     is as wide as a pushed page: the window less a folding phone's band and column */
  const rollWidth = frame.width - frame.left - frame.right;
  useEffect(() => {
    if (choosing) primeRoll(rollWidth);
  }, [choosing, rollWidth]);
  /* and her pictures on the pages the + opens taken ahead (lib/bird-images warmBirdPoses): a
     quiet moment after the tabs first stand, and again as the + opens (nothing, when they are
     already taken), so no capture runs while a composer slides up */
  useEffect(() => {
    const id = setTimeout(() => warmBirdPoses(PLUS_BIRD_POSES), WARM_BIRDS_AFTER_MS);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (choosing) warmBirdPoses(PLUS_BIRD_POSES);
  }, [choosing]);

  // prime the signal at launch — it has to be true before Kindreds is opened
  useEffect(() => {
    void refreshWaiting();
  }, []);
  // …and keep it true while the app is open: a stranger's reply lights the
  // square without anyone visiting the tab
  useMyThreadsLive(user?.id, refreshWaiting);

  return (
    <TabBarSpace.Provider value={rail ? railTabBarRoom(insets.bottom) : native ? nativeTabBarRoom(insets.bottom) : tabBarHeight(insets.bottom)}>
    <PlusSheetOpen.Provider value={choosing}>
    <TabBarAway.Provider value={setBarAway}>
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) =>
          native ? (
            <NativeTabBar {...props} open={choosing} away={barAway} onPost={() => setChoosing((c) => !c)} onClose={() => setChoosing(false)} waiting={waiting} />
          ) : (
            <PostTabBar {...props} onPost={() => setChoosing((c) => !c)} open={choosing} away={barAway} waiting={waiting} />
          )
        }
        screenOptions={{ headerShown: false, sceneStyle: frame.duo ? { backgroundColor: tk.bg, paddingLeft: frame.left, paddingRight: frame.right } : { backgroundColor: tk.bg } }}
      >
        {/* Today on the inner screen: the letter lies open across both pages (KTodayDesk, THE
            SPREAD), so its page is the window less the system's band, not a column */}
        <Tabs.Screen name="letters" options={frame.pages && todayNative && swiftReadsFold() ? spreadScene : undefined} />
        {/* Notes and Kindreds on the inner screen are two pages (the month | the notes; the orbit
            | the list): their Swift pages are the whole window and lay the two out themselves */}
        <Tabs.Screen name="journal" options={frame.pages && notesNative && swiftReadsFold() ? spreadScene : undefined} />
        <Tabs.Screen name="kindreds" options={frame.pages && kindredsNative && swiftReadsFold() ? spreadScene : undefined} />
        {/* Me's cover is a sky that runs edge to edge: on a folding phone its Swift page is the
            whole window and keeps its own content to the column (KMeScreen, KFold) */}
        <Tabs.Screen name="me" options={frame.duo && meNative && swiftReadsFold() ? (frame.pages ? spreadScene : { sceneStyle: { backgroundColor: tk.bg } }) : undefined} />
      </Tabs>

      {!native && choosing && <PostFan onClose={() => setChoosing(false)} />}
      {frame.duo ? (
        // the same three, over the tabs' column rather than the band and the air beside it
        <View pointerEvents="box-none" style={{ position: "absolute", top: 0, bottom: 0, left: frame.left, right: frame.right }}>
          <IdentityNote />
          <GrowthMoment />
          <FaceReadyBanner />
        </View>
      ) : (
        <>
          <IdentityNote />
          {/* Wren fledged or grew up since last time: the moment, once per stage */}
          <GrowthMoment />
          {/* a face Wren finished while the reader was elsewhere in the app (make-face) */}
          <FaceReadyBanner />
        </>
      )}
    </View>
    </TabBarAway.Provider>
    </PlusSheetOpen.Provider>
    </TabBarSpace.Provider>
  );
}
