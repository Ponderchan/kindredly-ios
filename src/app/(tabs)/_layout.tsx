import { Tabs } from "expo-router";
import { TabBar } from "../../components/TabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "#FBF9F3" } }}
    >
      <Tabs.Screen name="letters" />
      <Tabs.Screen name="journal" />
      <Tabs.Screen name="kindreds" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
