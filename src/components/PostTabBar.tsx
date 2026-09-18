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
const ICON = 28;

/* the owner's Nav D2 sheet, path for path (viewBox 28). Four marks from
   the post — the house the letters come to, the sealed envelope, two
   envelopes changing hands, the writing itself — drawn 1.8 at rest and
   2.2 when chosen, with the chosen one filled white and given its one
   colour: the flag on the roof, the red wax, the green dot, the blue hand. */
const INK = "#55506E";
const PEN = "#3A34D6";

/** TODAY — the house; a flag goes up on the roof when it is the page */
export function Envelope({ color, active }: { color: string; active?: boolean }) {
  const sw = active ? 2.2 : 1.8;
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round">
      <Path d="M4 12h20v11H4z" fill={active ? "#FFFFFF" : "none"} />
      <Path d="M4 12l10-7 10 7" />
      {active ? (
        <>
          <Path d="M14 5V0" />
          <Path d="M11 2.4l3-2.4 3 2.4" />
        </>
      ) : (
        <Path d="M9 17h10" strokeWidth={1.6} />
      )}
    </Svg>
  );
}

/** SEALED — the envelope; the wax turns red when it is the page */
function Sealed({ color, active }: { color: string; active?: boolean }) {
  const sw = active ? 2.2 : 1.8;
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round">
      <Path d="M4 8h20v15H4z" fill={active ? "#FFFFFF" : "none"} />
      <Path d="M4 8l10 7 10-7" />
      {active ? (
        <>
          <Circle cx={14} cy={15} r={4.4} fill="#C8412E" stroke="none" />
          <Circle cx={14} cy={15} r={2} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={1.4} />
        </>
      ) : (
        <Circle cx={14} cy={15} r={3.4} />
      )}
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

/** KINDREDS — two envelopes, one behind the other; a green dot when it is the page */
export function Kindreds({ color, active }: { color: string; active?: boolean }) {
  const sw = active ? 2.2 : 1.8;
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round">
      <Path d="M3 13h14v10H3z" fill={active ? "#EAE8FC" : "none"} />
      <Path d="M3 13l7 5 7-5" />
      <Path d="M11 5h14v10H11z" fill={active ? "#FFFFFF" : "#FBFAFE"} />
      <Path d="M11 15l7-5 7 5" />
      {active && <Circle cx={18} cy={10} r={2.6} fill="#6DAE78" stroke="none" />}
    </Svg>
  );
}

/** ME — the writing itself: a card with two lines of hand */
function Me({ color, active }: { color: string; active?: boolean }) {
  const sw = active ? 2.2 : 1.8;
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round">
      <Path d="M5 6h18v17H5z" fill={active ? "#FFFFFF" : "none"} />
      <Path d="M9 12q3-3 5 0t5 0" strokeWidth={active ? 2.4 : 1.6} />
      <Path d="M9 17q3-3 5 0t5 0" strokeWidth={active ? 2.4 : 1.6} />
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

  const Window = ({ name, label, Icon, dot }: { name: string; label: string; Icon: (p: { color: string; active?: boolean }) => React.ReactNode; dot?: boolean }) => {
    const active = current === name;
    const color = active ? PEN : INK;
    return (
      <Pressable onPress={() => go(name)} style={{ flex: 1, alignItems: "center", justifyContent: "center", height: BAR, gap: 4 }}>
        <View>
          <Icon color={color} active={active} />
          {/* one dot of pen ink — someone answered and it is your turn */}
          {dot && !active && <View style={{ position: "absolute", top: -2, right: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: PEN, borderWidth: 1.6, borderColor: "#FFFFFF" }} />}
        </View>
        <Text style={{ fontFamily: PF.letter, fontWeight: active ? "700" : "500", fontSize: 9.5, color }}>{label}</Text>
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
