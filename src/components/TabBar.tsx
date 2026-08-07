import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, cardStyle, shadow } from "../theme/tokens";
import { TabIcon, type TabId } from "./TabIcon";
import { Wren } from "./Wren";

/* Custom blurred bottom bar with a raised center FAB — the v20 tab bar
   (letters / journal / [+] / kindreds / me). The FAB opens the on-brand
   "who do you write to?" choice sheet (v20), which routes to the composer. */

export function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const current: string = state.routes[state.index]?.name ?? "letters";
  const [choosing, setChoosing] = useState(false);

  const choose = (path: "/journal-entry" | "/compose") => {
    setChoosing(false);
    router.push(path);
  };

  const go = (name: string) => {
    const route = state.routes.find((r: any) => r.name === name);
    const focused = current === name;
    const event = navigation.emit({ type: "tabPress", target: route?.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(name);
  };

  const LABELS: Record<TabId, string> = { letters: "Letters", journal: "Journal", kindreds: "Kindreds", me: "Me" };

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

  const Option = ({
    icon,
    title,
    sub,
    onPress,
  }: {
    icon: React.ReactNode;
    title: string;
    sub: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        cardStyle,
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          padding: 18,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: pressed ? C.purple : C.line,
          opacity: pressed ? 0.95 : 1,
        },
      ]}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          backgroundColor: C.purpleLt,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.serifSemi, fontSize: 17, color: C.ink }}>{title}</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.muted, marginTop: 3 }}>{sub}</Text>
      </View>
      <Text style={{ fontSize: 18, color: C.faint }}>›</Text>
    </Pressable>
  );

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
            onPress={() => setChoosing(true)}
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
            <Text style={{ color: "#fff", fontSize: 30, marginTop: -3, fontFamily: F.sans }}>+</Text>
          </Pressable>
        </View>
        <Tab name="kindreds" />
        <Tab name="me" />
      </BlurView>

      {/* the choice sheet — v20's "Today, who do you write to?" */}
      <Modal visible={choosing} transparent animationType="slide" onRequestClose={() => setChoosing(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(20,20,26,0.35)", justifyContent: "flex-end" }}
          onPress={() => setChoosing(false)}
        >
          <Pressable
            style={{
              backgroundColor: C.cream,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 22,
              paddingTop: 14,
              paddingBottom: Math.max(insets.bottom, 16) + 10,
            }}
            onPress={() => {}}
          >
            <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 18 }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 4 }}>
              <Wren size={20} mode="line" />
              <Text style={{ fontFamily: F.serifSemi, fontSize: 21, color: C.ink }}>Today, who do you write to?</Text>
            </View>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.muted, marginBottom: 18 }}>
              Either way, it starts with one true line.
            </Text>

            <Option
              icon={<TabIcon id="journal" active />}
              title="Yourself"
              sub="A private journal page — sealed on this device"
              onPress={() => choose("/journal-entry")}
            />
            <Option
              icon={<TabIcon id="letters" active />}
              title="A stranger"
              sub="A letter down three streets — or your voice"
              onPress={() => choose("/compose")}
            />

            <Pressable onPress={() => setChoosing(false)} style={{ alignItems: "center", paddingVertical: 14 }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 12.5, letterSpacing: 1.2, color: C.faint }}>
                NOT TONIGHT
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
