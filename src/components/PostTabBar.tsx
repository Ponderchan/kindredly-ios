import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { P, PF } from "../theme/post";
import { t } from "../lib/i18n";

/* THE TAB BAR — five plain windows (owner's sheet, 2026-09-16).
   ────────────────────────────────────────────────────────────────────────
   The ruled counter of postal glyphs and a mosaic was the system talking
   to itself; twenty readers could not say which was which. So this is the
   plain thing — a white bar with rounded shoulders, the icons everyone
   already knows (envelope, notebook, plane, two rings, a person), and the
   one action, Write, raised on a pen-blue square in the middle. No words
   under them — the owner's call — so the icons have to be the ordinary
   ones. Active is pen blue; the rest are quiet ink. */

const BAR = 58;
const ICON = 26;
const SW = 1.5;

/* the owner's sheet (四个 TAB 各自激活): four outline marks, each one a
   thing from the post — the house the letters come to, the sealed
   envelope, the letter changing hands, the writing itself — and the active
   one fills with the pen's wash. Labels under all four. */

/** TODAY — the house the letters come to, a little bird on the ridge */
export function Envelope({ color, active }: { color: string; active?: boolean }) {
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 11.5 L12 5.5 L20 11.5" />
      <Path d="M6 10.5 V20 H18 V10.5" fill={active ? WASH : "none"} />
      <Path d="M10 20 V15 H14 V20" fill={active ? "#FFFFFF" : "none"} />
      {/* the bird on the ridge */}
      <Path d="M12 5.5 c0-1.6 1-2.6 2.4-2.6 l1.6 0.9 -1.2 0.6 c-0.3 1-1.3 1.6-2.8 1.1z" fill={color} stroke="none" />
    </Svg>
  );
}

/** SEALED — the envelope with its wax seal */
function Sealed({ color, active }: { color: string; active?: boolean }) {
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={SW} strokeLinejoin="round">
      <Rect x={3} y={6} width={18} height={13} rx={2} fill={active ? WASH : "none"} />
      <Path d="M3.5 7.5 L12 13.5 L20.5 7.5" />
      <Circle cx={12} cy={13.2} r={2.7} fill={active ? "#F2887E" : "#FFFFFF"} />
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

/** KINDREDS — a letter changing hands: the tray, and the card lifting out of it */
export function Kindreds({ color, active }: { color: string; active?: boolean }) {
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 13 V19.5 H20 V13" fill={active ? WASH : "none"} />
      <Path d="M4 13 L7 8.5 H17 L20 13" />
      <Path d="M4 13 H8.5 L10 15.5 H14 L15.5 13 H20" />
      {/* the card, lifting */}
      <Path d="M9 8.5 V4.5 H15 V8.5" fill={active ? "#FFFFFF" : "none"} />
      <Path d="M11 6.5 h2" />
    </Svg>
  );
}

/** ME — the writing itself: a card with three lines of hand */
function Me({ color, active }: { color: string; active?: boolean }) {
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={4.5} width={16} height={15} rx={2} fill={active ? WASH : "none"} />
      <Path d="M7.5 9.5 c1.2-1 2.2-1 3.3 0 s2.1 1 3.3 0 s2.1-1 2.9 0" />
      <Path d="M7.5 12.5 c1.2-1 2.2-1 3.3 0 s2.1 1 3.3 0 s2.1-1 2.9 0" />
      <Path d="M7.5 15.5 c1.2-1 2.2-1 3.3 0 s2.1 1 3.3 0" />
    </Svg>
  );
}

const WASH = "#E4E1FA";

export function PostTabBar({ state, navigation, onPost, waiting = 0 }: any) {
  const insets = useSafeAreaInsets();
  const current: string = state.routes[state.index]?.name ?? "letters";

  const go = (name: string) => {
    const route = state.routes.find((r: any) => r.name === name);
    const focused = current === name;
    const event = navigation.emit({ type: "tabPress", target: route?.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(name);
  };

  const Window = ({ name, label, Icon, dot }: { name: string; label: string; Icon: (p: { color: string; active?: boolean }) => React.ReactNode; dot?: boolean }) => {
    const active = current === name;
    const color = active ? P.pen : "#4A4766";
    return (
      <Pressable onPress={() => go(name)} style={{ flex: 1, alignItems: "center", justifyContent: "center", height: BAR, gap: 3 }}>
        <View>
          <Icon color={color} active={active} />
          {/* one dot of pen ink — someone answered and it is your turn */}
          {dot && <View style={{ position: "absolute", top: -2, right: -5, width: 7, height: 7, borderRadius: 4, backgroundColor: P.pen, borderWidth: 1.5, borderColor: "#FFFFFF" }} />}
        </View>
        <Text style={{ fontFamily: PF.letter, fontWeight: active ? "600" : "400", fontSize: 10, color: active ? P.pen : "#4A4766" }}>{label}</Text>
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
        <Window name="letters" label={t("tab.today")} Icon={Envelope} />
        <Window name="journal" label={t("tab.sealed")} Icon={Sealed} />

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

        <Window name="kindreds" label={t("tab.kindreds")} Icon={Kindreds} dot={waiting > 0} />
        <Window name="me" label={t("tab.me")} Icon={Me} />
      </View>
    </View>
  );
}
