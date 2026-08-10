import { Pressable, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "../theme/tokens";
import { TabIcon, type TabId } from "./TabIcon";

/* Bottom bar — three even tabs, nothing floating. Writing is not a tab and
   not a button here: it's the single state-driven action at the bottom of
   the letter you're reading (回 ta / 写给一个陌生人). Sealed letters live in Me. */

const SHOWN: TabId[] = ["letters", "kindreds", "me"];
const LABELS: Record<TabId, string> = { letters: "信", journal: "日记", kindreds: "知己", me: "我" };

export function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const current: string = state.routes[state.index]?.name ?? "letters";

  const go = (name: string) => {
    const route = state.routes.find((r: any) => r.name === name);
    const focused = current === name;
    const event = navigation.emit({ type: "tabPress", target: route?.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(name);
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
        {SHOWN.map((name) => {
          const active = current === name;
          return (
            <Pressable
              key={name}
              onPress={() => go(name)}
              style={{ flex: 1, alignItems: "center", justifyContent: "center", height: 54, gap: 4 }}
            >
              <TabIcon id={name} active={active} />
              <Text style={{ fontFamily: F.sansMed, fontSize: 10.5, color: active ? C.purple : "#AEB4BF" }}>
                {LABELS[name]}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}
