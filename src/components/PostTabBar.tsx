import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { P, PF } from "../theme/post";
import type { ThemeTokens } from "../theme/themes";
import { useTheme } from "../lib/theme";
import { t, useLang } from "../lib/i18n";

/* THE TAB BAR — four plain windows and a plus (owner, 2026-09-19).
   ────────────────────────────────────────────────────────────────────────
   Readers called the last one complicated, and they were right: a house
   with a flag, an envelope with wax, two envelopes, a card with handwriting
   — three of the four were envelopes, and the write key was a raised
   square with a plane on it. Nobody could say which was which.

   So: the ordinary icons, one stroke weight, one family — an envelope for
   Today, a note card for Notes (the tab once called Sealed; the web's
   icon, owner 2026-09-23), two speech bubbles for Kindreds (two people
   read as Me twice), one person for Me — no words under them, and in the
   middle a plain round + in the app's one action colour. Pressing it doesn't leave the page: the + turns into
   an × and two choices rise out of it (PostFan). Active is pen blue with a
   wash behind the stroke; the rest are quiet ink. */

export const BAR = 54;
/* 30, not 27: the prototype's bar (owner, 2026-09-23) draws its glyphs about
   an eighth larger than ours were — an envelope 25pt across */
const ICON = 30;
export const PLUS = 52;
/** the bar's full height, safe area included — the fan sits on top of it */
export const tabBarHeight = (insetBottom: number) => BAR + Math.max(insetBottom, 8);

const INK = "#5B5776";
const PEN = P.pen;
const WASH = "rgba(58,58,245,0.12)";

/* THE BAR'S COLOURS, BY THEME. This is the fallback bar now — the SwiftUI
   one (NativeTabBar) is what readers see — and it comes back only when the
   kill switch or a crash breadcrumb turns that one off. In the light themes
   it keeps the colours it has always had (Classic's white in Lavender and
   Paper too). Midnight takes the tokens, or a dark page would get a white
   slab along its foot: the bar on sf over a line rule; resting icons in mute
   (5.3:1 on sf — the selected ind is 5.9:1, so the selected one still reads
   strongest, as in the light bar); the selected wash lav, the token for a
   selected fill; the + in bg on ind (white on #8E89FF is only 2.9:1, bg is
   6.5:1, and 4.7:1 on the postmark red it turns to); the count in bg on the
   resting ink (5.9:1), ringed in the bar's face as in the light bar. */
type BarColors = { bar: string; rule: string; ink: string; pen: string; wash: string; onFill: string };
const LIGHT_BAR: BarColors = { bar: "#FFFFFF", rule: "rgba(30,27,53,0.08)", ink: INK, pen: PEN, wash: WASH, onFill: "#FFFFFF" };
const barColors = (dark: boolean, tk: ThemeTokens): BarColors =>
  dark ? { bar: tk.sf, rule: tk.line, ink: tk.mute, pen: tk.ind, wash: tk.lav, onFill: tk.bg } : LIGHT_BAR;

/* `wash` is the selected icon's fill. Left out it is the light bar's, which
   is what the guide reels draw these icons with (a light picture in every
   theme); the bar passes its own. */
type IconProps = { color: string; active?: boolean; size?: number; wash?: string };
const strokeFor = (active?: boolean) => (active ? 2.2 : 1.8);

/** TODAY — an envelope */
export function Envelope({ color, active, size = ICON, wash = WASH }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeFor(active)} strokeLinejoin="round" strokeLinecap="round">
      <Path d="M3 7.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill={active ? wash : "none"} />
      <Path d="M3.5 8l8.5 5.5L20.5 8" />
    </Svg>
  );
}

/** NOTES — a note card with a turned corner and two ruled lines (the web's) */
export function Notes({ color, active, size = ICON, wash = WASH }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeFor(active)} strokeLinejoin="round" strokeLinecap="round">
      <Path d="M5.5 4.5h10L20 9v10.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5V6a1.5 1.5 0 0 1 1.5-1.5z" fill={active ? wash : "none"} />
      <Path d="M15.5 4.5V9H20" />
      <Path d="M8 12.5h8M8 16h5" />
    </Svg>
  );
}

/** KINDREDS — two speech bubbles, one answering the other */
export function Kindreds({ color, active, size = ICON, wash = WASH }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeFor(active)} strokeLinejoin="round" strokeLinecap="round">
      <Path d="M3 6.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H8l-3.5 3v-3H5a2 2 0 0 1-2-2z" fill={active ? wash : "none"} />
      <Path d="M18.5 9.5h.5a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2h-.5v3l-3.4-3H12" />
    </Svg>
  );
}

/** ME — one person */
export function Me({ color, active, size = ICON, wash = WASH }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeFor(active)} strokeLinejoin="round" strokeLinecap="round">
      <Circle cx={12} cy={8.5} r={3.8} fill={active ? wash : "none"} />
      <Path d="M4.5 20.5c0-4.3 3.3-6.7 7.5-6.7s7.5 2.4 7.5 6.7" fill={active ? wash : "none"} />
    </Svg>
  );
}

export function PostTabBar({ state, navigation, onPost, open = false, waiting = 0 }: any) {
  useLang(); // the navigator renders this bar, not a screen — subscribe here or the labels go stale
  const insets = useSafeAreaInsets();
  const { t: tk, dark } = useTheme();
  const c = barColors(dark, tk);
  const pen = c.pen; // a string for the worklet below, so its inputs compare by value
  const current: string = state.routes[state.index]?.name ?? "letters";

  const go = (name: string) => {
    const route = state.routes.find((r: any) => r.name === name);
    const focused = current === name;
    const event = navigation.emit({ type: "tabPress", target: route?.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(name);
  };

  /* the + becomes an ×: an eighth of a turn and the action colour going to
     the postmark red, both on one value. A plain ease, no spring — a spring
     overshoots the 45° and the whole disc wobbles (owner, 2026-09-19). */
  const turn = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    turn.value = withTiming(open ? 1 : 0, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [open, turn]);
  const disc = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(turn.value, [0, 1], [pen, P.post]),
    transform: [{ rotate: `${turn.value * 45}deg` }],
  }));

  const Window = ({ name, label, Icon, count = 0 }: { name: string; label: string; Icon: (p: IconProps) => React.ReactNode; count?: number }) => {
    const active = current === name;
    const color = active ? c.pen : c.ink;
    return (
      <Pressable onPress={() => go(name)} accessibilityLabel={label} style={{ flex: 1, alignItems: "center", justifyContent: "center", height: BAR }}>
        <View>
          <Icon color={color} active={active} wash={c.wash} />
          {/* a number in ink — letters on you, and posts on Wren's desk —
              never a dot (owner, 2026-09-20) */}
          {count > 0 && !active && (
            <View style={{ position: "absolute", top: -7, right: -11, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: c.ink, borderWidth: 1.6, borderColor: c.bar, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, color: c.onFill }}>{count > 9 ? "9+" : String(count)}</Text>
            </View>
          )}
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
        backgroundColor: c.bar,
        borderTopWidth: 1,
        borderTopColor: c.rule,
        paddingBottom: Math.max(insets.bottom, 8),
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 6 }}>
        <Window name="letters" label={t("tab.today")} Icon={Envelope} />
        <Window name="journal" label={t("tab.notes")} Icon={Notes} />

        {/* the plus — the one action, in the one action colour */}
        <Pressable onPress={onPost} hitSlop={6} style={{ flex: 1, alignItems: "center", justifyContent: "center", height: BAR }}>
          <Animated.View style={[disc, { width: PLUS, height: PLUS, borderRadius: PLUS / 2, alignItems: "center", justifyContent: "center" }]}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={c.onFill} strokeWidth={2.6} strokeLinecap="round">
              <Path d="M12 5v14M5 12h14" />
            </Svg>
          </Animated.View>
        </Pressable>

        <Window name="kindreds" label={t("tab.kindreds")} Icon={Kindreds} count={waiting} />
        <Window name="me" label={t("tab.me")} Icon={Me} />
      </View>
    </View>
  );
}
