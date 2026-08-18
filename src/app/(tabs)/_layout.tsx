import { Tabs } from "expo-router";
import { PostTabBar } from "../../components/PostTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <PostTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "#FAF8F3" } }}
    >
      <Tabs.Screen name="letters" />
      <Tabs.Screen name="journal" />
      <Tabs.Screen name="kindreds" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
