import { useEffect, useState } from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { PostTabBar } from "../../components/PostTabBar";
import { refreshWaiting, useWaiting } from "../../lib/waiting";
import { useMyThreadsLive } from "../../lib/live";
import { useAuth } from "../../lib/auth";
import { PostChooser } from "../../components/PostChooser";

/* The chooser lives HERE rather than inside the tab bar, and as a plain
   overlay rather than a Modal. Both matter for the same reason: a composer
   pushed from a Modal makes the app flash back into view before the next
   screen arrives, so the move reads as two animations with a gap. Rendered as
   a sibling of <Tabs>, it just sits there and the composer slides in from the
   right on top of it — one continuous move forward. */
export default function TabsLayout() {
  const [choosing, setChoosing] = useState(false);
  const waiting = useWaiting();
  const { user } = useAuth();

  // prime the signal at launch — it has to be true before Kindreds is opened
  useEffect(() => {
    void refreshWaiting();
  }, []);
  // …and keep it true while the app is open: a stranger's reply lights the
  // square without anyone visiting the tab
  useMyThreadsLive(user?.id, refreshWaiting);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <PostTabBar {...props} onPost={() => setChoosing(true)} waiting={waiting} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "#FFFFFF" } }}
      >
        <Tabs.Screen name="letters" />
        <Tabs.Screen name="journal" />
        <Tabs.Screen name="kindreds" />
        <Tabs.Screen name="me" />
      </Tabs>

      {choosing && <PostChooser onClose={() => setChoosing(false)} />}
    </View>
  );
}
