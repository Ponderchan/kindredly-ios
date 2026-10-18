import { useEffect, useState } from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostTabBar, tabBarHeight } from "../../components/PostTabBar";
import { NativeTabBar, TabBarSpace, nativeTabBarReady, nativeTabBarRoom } from "../../components/NativeTabBar";
import { refreshWaiting, useWaiting } from "../../lib/waiting";
import { useMyThreadsLive } from "../../lib/live";
import { useAuth } from "../../lib/auth";
import { useNativeSurface } from "../../lib/surfaces";
import { useTheme } from "../../lib/theme";
import { PlusSheetOpen, TabBarAway } from "../../lib/screen-insets";
import { PostFan } from "../../components/PostFan";

/* The fan lives HERE rather than inside the tab bar, and as a plain
   overlay rather than a Modal. Both matter for the same reason: a composer
   pushed from a Modal makes the app flash back into view before the next
   screen arrives, so the move reads as two animations with a gap. Rendered as
   a sibling of <Tabs>, it sits above the pages and below nothing, and the
   composer slides in from the right on top of it — one continuous move
   forward. The + in the bar is the ×: the same press toggles it.

   TWO BARS (10a, 1.3.0). With the "tabbar" surface on (lib/surfaces) and a
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
   the tab on screen. */
export default function TabsLayout() {
  const [choosing, setChoosing] = useState(false);
  // a screen sent the bar away (Today's reply); setBarAway is stable, so the context never churns
  const [barAway, setBarAway] = useState(false);
  const waiting = useWaiting();
  const { user } = useAuth();
  const { t: tk } = useTheme();
  const native = useNativeSurface("tabbar") && nativeTabBarReady();
  const insets = useSafeAreaInsets();

  // prime the signal at launch — it has to be true before Kindreds is opened
  useEffect(() => {
    void refreshWaiting();
  }, []);
  // …and keep it true while the app is open: a stranger's reply lights the
  // square without anyone visiting the tab
  useMyThreadsLive(user?.id, refreshWaiting);

  return (
    <TabBarSpace.Provider value={native ? nativeTabBarRoom(insets.bottom) : tabBarHeight(insets.bottom)}>
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
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: tk.bg } }}
      >
        <Tabs.Screen name="letters" />
        <Tabs.Screen name="journal" />
        <Tabs.Screen name="kindreds" />
        <Tabs.Screen name="me" />
      </Tabs>

      {!native && choosing && <PostFan onClose={() => setChoosing(false)} />}
    </View>
    </TabBarAway.Provider>
    </PlusSheetOpen.Provider>
    </TabBarSpace.Provider>
  );
}
