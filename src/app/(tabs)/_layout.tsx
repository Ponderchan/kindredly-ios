import { useState } from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { PostTabBar } from "../../components/PostTabBar";
import { PostChooser } from "../../components/PostChooser";

/* The chooser lives HERE rather than inside the tab bar, and as a plain
   overlay rather than a Modal. Both matter for the same reason: a composer
   pushed from a Modal makes the app flash back into view before the next
   screen arrives, so the move reads as two animations with a gap. Rendered as
   a sibling of <Tabs>, it just sits there and the composer slides in from the
   right on top of it — one continuous move forward. */
export default function TabsLayout() {
  const [choosing, setChoosing] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <PostTabBar {...props} onPost={() => setChoosing(true)} />}
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
