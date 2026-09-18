import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { P } from "../theme/post";

/* THE TAB BAR — five plain windows (owner's sheet, 2026-09-16).
   ────────────────────────────────────────────────────────────────────────
   The ruled counter of postal glyphs and a mosaic was the system talking
   to itself; twenty readers could not say which was which. So this is the
   plain thing — a white bar with rounded shoulders, the icons everyone
   already knows (envelope, notebook, plane, two rings, a person), and the
   one action, Write, raised on a pen-blue square in the middle. No words
   under them — the owner's call — so the icons have to be the ordinary
   ones. Active is pen blue; the rest are quiet ink. */

const BAR = 54;
const ICON = 24;

export function Envelope({ color }: { color: string }) {
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round">
      <Rect x={3} y={5.5} width={18} height={13} rx={2} />
      <Path d="M3.5 7l8.5 6 8.5-6" />
    </Svg>
  );
}
function Sealed({ color }: { color: string }) {
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round">
      <Rect x={5} y={3.5} width={14} height={17} rx={2} />
      <Path d="M9 3.5v17" />
      <Path d="M12.5 8h3.5M12.5 11.5h3.5" />
    </Svg>
  );
}
function Plane({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round">
      <Path d="M20.5 3.5L3.5 10.5l7.5 3 3 7.5 6.5-17.5z" />
      <Path d="M11 13.5l9.5-10" />
    </Svg>
  );
}
export function Kindreds({ color }: { color: string }) {
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6}>
      <Circle cx={9} cy={12} r={5.5} />
      <Circle cx={15} cy={12} r={5.5} />
    </Svg>
  );
}
function Me({ color }: { color: string }) {
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round">
      <Circle cx={12} cy={8.5} r={4} />
      <Path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6" />
    </Svg>
  );
}

export function PostTabBar({ state, navigation, onPost, waiting = 0 }: any) {
  const insets = useSafeAreaInsets();
  const current: string = state.routes[state.index]?.name ?? "letters";

  const go = (name: string) => {
    const route = state.routes.find((r: any) => r.name === name);
    const focused = current === name;
    const event = navigation.emit({ type: "tabPress", target: route?.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(name);
  };

  const Window = ({ name, Icon, dot }: { name: string; Icon: (p: { color: string }) => React.ReactNode; dot?: boolean }) => {
    const active = current === name;
    const color = active ? P.pen : "rgba(30,27,53,0.55)";
    return (
      <Pressable onPress={() => go(name)} style={{ flex: 1, alignItems: "center", justifyContent: "center", height: BAR }}>
        <View>
          <Icon color={color} />
          {/* one square of pen ink — someone answered and it is your turn */}
          {dot && <View style={{ position: "absolute", top: -3, right: -6, width: 7, height: 7, borderRadius: 4, backgroundColor: P.pen }} />}
        </View>
      </Pressable>
    );
  };

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "rgba(30,27,53,0.08)",
        paddingBottom: Math.max(insets.bottom, 8),
        shadowColor: "#1E1B35",
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: -3 },
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 6 }}>
        <Window name="letters" Icon={Envelope} />
        <Window name="journal" Icon={Sealed} />

        {/* WRITE — the one action, raised above the rest on its own square */}
        <Pressable onPress={onPost} style={{ flex: 1, alignItems: "center", justifyContent: "center", height: BAR }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: P.pen,
              alignItems: "center",
              justifyContent: "center",
              marginTop: -18,
              shadowColor: P.pen,
              shadowOpacity: 0.35,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
            <Plane color="#FFFFFF" />
          </View>
        </Pressable>

        <Window name="kindreds" Icon={Kindreds} dot={waiting > 0} />
        <Window name="me" Icon={Me} />
      </View>
    </View>
  );
}
