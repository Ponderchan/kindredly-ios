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
import { PostFan } from "../../components/PostFan";
import { P } from "../../theme/post";

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
   read with useTabBarSpace). */
export default function TabsLayout() {
  const [choosing, setChoosing] = useState(false);
  const waiting = useWaiting();
  const { user } = useAuth();
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
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) =>
          native ? (
            <NativeTabBar {...props} open={choosing} onPost={() => setChoosing((c) => !c)} onClose={() => setChoosing(false)} waiting={waiting} />
          ) : (
            <PostTabBar {...props} onPost={() => setChoosing((c) => !c)} open={choosing} waiting={waiting} />
          )
        }
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: P.penWash } }}
      >
        <Tabs.Screen name="letters" />
        <Tabs.Screen name="journal" />
        <Tabs.Screen name="kindreds" />
        <Tabs.Screen name="me" />
      </Tabs>

      {!native && choosing && <PostFan onClose={() => setChoosing(false)} />}
    </View>
    </TabBarSpace.Provider>
  );
}
