import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { C, F, shadow } from "../theme/tokens";
import { TabIcon, type TabId } from "./TabIcon";
import { WrenBird } from "./WrenBird";

/* Bottom bar — four tabs around a center publish button. Writing is the
   app's one big action: tap the quill and choose who it's for — a stranger
   (a letter into the world) or yourself (a sealed page on this phone). */

const LEFT: TabId[] = ["letters", "journal"];
const RIGHT: TabId[] = ["kindreds", "me"];
const LABELS: Record<TabId, string> = { letters: "Today", journal: "Sealed", kindreds: "Kindreds", me: "Me" };

export function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [choosing, setChoosing] = useState(false);
  const current: string = state.routes[state.index]?.name ?? "letters";

  const go = (name: string) => {
    const route = state.routes.find((r: any) => r.name === name);
    const focused = current === name;
    const event = navigation.emit({ type: "tabPress", target: route?.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(name);
  };

  const Tab = ({ name }: { name: TabId }) => {
    const active = current === name;
    return (
      <Pressable onPress={() => go(name)} style={{ flex: 1, alignItems: "center", justifyContent: "center", height: 54, gap: 4 }}>
        <TabIcon id={name} active={active} />
        <Text style={{ fontFamily: F.sansMed, fontSize: 10.5, color: active ? C.purple : "#AEB4BF" }}>{LABELS[name]}</Text>
      </Pressable>
    );
  };

  const pick = (to: "/compose" | "/compose?to=self") => {
    setChoosing(false);
    router.push(to);
  };

  return (
    <>
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
          {LEFT.map((n) => (
            <Tab key={n} name={n} />
          ))}

          {/* publish — the one big action */}
          <View style={{ flex: 1, alignItems: "center" }}>
            <Pressable
              onPress={() => setChoosing(true)}
              style={[
                {
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  backgroundColor: C.purple,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: -26,
                  borderWidth: 4,
                  borderColor: C.cream,
                },
                shadow.card,
              ]}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path
                  d="M4 20 C6 14 14 5 19 4 C20 9 12 18 6 19 Z M4 20 L8.5 15.5"
                  stroke="#fff"
                  strokeWidth={1.9}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          </View>

          {RIGHT.map((n) => (
            <Tab key={n} name={n} />
          ))}
        </BlurView>
      </View>

      {/* who's it for? */}
      <Modal visible={choosing} transparent animationType="fade" onRequestClose={() => setChoosing(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(19,16,32,0.45)", justifyContent: "flex-end" }} onPress={() => setChoosing(false)}>
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: C.cream,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 22,
              paddingTop: 18,
              paddingBottom: Math.max(insets.bottom, 14) + 10,
            }}
          >
            <View style={{ alignItems: "center", marginBottom: 4 }}>
              <WrenBird size={54} mood="curious" />
              <Text style={{ fontFamily: F.serif, fontSize: 20, color: C.ink, marginTop: 4 }}>Write it down.</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.faint, marginTop: 3 }}>Who's this one for?</Text>
            </View>

            <Pressable
              onPress={() => pick("/compose")}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                backgroundColor: pressed ? C.purpleLt : C.card,
                borderRadius: 20,
                padding: 16,
                marginTop: 12,
                borderWidth: 1,
                borderColor: C.line,
              })}
            >
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.purpleLt, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 20 }}>✉️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.sansBold, fontSize: 15.5, color: C.ink }}>To a stranger</Text>
                <Text style={{ fontFamily: F.sans, fontSize: 12.5, color: C.muted, marginTop: 2 }}>
                  A letter into the world — Wren finds who it's for.
                </Text>
              </View>
              <Text style={{ fontSize: 18, color: C.faint }}>›</Text>
            </Pressable>

            <Pressable
              onPress={() => pick("/compose?to=self")}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                backgroundColor: pressed ? C.goldLt : C.card,
                borderRadius: 20,
                padding: 16,
                marginTop: 10,
                borderWidth: 1,
                borderColor: C.line,
              })}
            >
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.goldLt, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 18 }}>🔒</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.sansBold, fontSize: 15.5, color: C.ink }}>To yourself</Text>
                <Text style={{ fontFamily: F.sans, fontSize: 12.5, color: C.muted, marginTop: 2 }}>
                  A sealed page — it never leaves this phone.
                </Text>
              </View>
              <Text style={{ fontSize: 18, color: C.faint }}>›</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
