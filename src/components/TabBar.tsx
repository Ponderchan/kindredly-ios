import { Pressable, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, shadow } from "../theme/tokens";
import { TabIcon, type TabId } from "./TabIcon";

/* Custom blurred bottom bar with a raised center FAB. In the narrowed
   direction the [+] is a single act — write today's page — not a choice of
   whom to write to. A line you share out is picked afterwards, from what
   you wrote. */

export function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const current: string = state.routes[state.index]?.name ?? "letters";

  const go = (name: string) => {
    const route = state.routes.find((r: any) => r.name === name);
    const focused = current === name;
    const event = navigation.emit({ type: "tabPress", target: route?.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(name);
  };

  const LABELS: Record<TabId, string> = { letters: "今天", journal: "日记", kindreds: "朋友", me: "我" };

  const Tab = ({ name }: { name: TabId }) => {
    const active = current === name;
    return (
      <Pressable
        onPress={() => go(name)}
        style={{ flex: 1, alignItems: "center", justifyContent: "center", height: 54, gap: 4 }}
      >
        <TabIcon id={name} active={active} />
        <Text style={{ fontFamily: F.sansMed, fontSize: 10.5, color: active ? C.purple : "#AEB4BF" }}>
          {LABELS[name]}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
      <BlurView
        intensity={36}
        tint="light"
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          borderTopWidth: 0.5,
          borderTopColor: C.line,
          backgroundColor: "rgba(247,247,245,0.86)",
        }}
      >
        <Tab name="letters" />
        <Tab name="journal" />
        <View style={{ width: 64, alignItems: "center" }}>
          <Pressable
            onPress={() => router.push("/journal-entry")}
            style={[
              {
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: C.purple,
                alignItems: "center",
                justifyContent: "center",
                marginTop: -26,
              },
              shadow.glow,
            ]}
          >
            <Text style={{ color: "#fff", fontSize: 26, marginTop: -2, fontFamily: F.sans }}>✎</Text>
          </Pressable>
        </View>
        <Tab name="kindreds" />
        <Tab name="me" />
      </BlurView>
    </View>
  );
}
