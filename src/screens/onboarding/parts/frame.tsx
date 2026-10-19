import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { AccessibilityInfo, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View, findNodeHandle, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { t } from "../../../lib/i18n";
import type { Ground } from "../flow";
import { NEST_SLOT_H } from "./nest-egg";
import { GUTTER, KEY_H, OB_MAX_FONT, ON_GROUND, SHADOW, TYPE } from "./tokens";
import "../../../data/strings-onboarding2";
import "../../../data/strings-a11y-onboarding";

/* THE SCREEN FRAME (storyboard §2 "The keys never move", §6).
   ────────────────────────────────────────────────────────────────────────
   Every screen from 2 on has the same skeleton, top to bottom:
     · the safe area, then a 44pt TOP BAR with the back key (‹) at the left
       on the screens that have one (2–8);
     · on 3–6 and 8, the NEST SLOT (NEST_SLOT_H): empty here — the runner
       draws the one persistent NestEgg over it, at exactly this place
       (nestTop), so the egg never remounts between screens;
     · the BODY, the screen's own (headline, line, the thing it asks);
     · the KEY AREA, which ALWAYS reserves room for the primary key and one
       text key under it, whether or not the screen has them, above the home
       indicator. So the primary key sits at the same height on every screen
       and in every language, and a headline that wraps to two lines in
       German pushes nothing.
   `keyboard` puts the body and the keys in a KeyboardAvoidingView, so the key
   rides above the keyboard (7, 10, the email on 11). Screen 1 and the full-
   bleed scenes (9, 12, 13) may skip the frame and lay themselves out on the
   window (they still use KeyArea for their keys). */

/** The top bar's height under the safe area. */
export const TOPBAR_H = 44;
/** The text-key row the key area always reserves under the primary key. */
export const TEXT_KEY_ROW = 44;

/** Where the nest egg's slot starts, from the top of the window (the runner places the egg here). */
export const nestTop = (insetTop: number): number => insetTop + TOPBAR_H;

/** VoiceOver: the whole run is one route whose screens swap in place, so iOS never hears "the
    screen changed" and the cursor lands on the next screen's key (which never moves) without
    reading the new question. This puts the VoiceOver cursor on `ref` (a screen's headline) once
    the runner's 220ms fade-in is over, and again whenever `again` changes (9's headline after
    the hatch). A no-op with VoiceOver off. */
export function useFocusOnMount(ref: RefObject<unknown>, again?: unknown, delay = 260): void {
  useEffect(() => {
    const id = setTimeout(() => {
      const node = ref.current ? findNodeHandle(ref.current as Parameters<typeof findNodeHandle>[0]) : null;
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [again]);
}

/** ‹, in the ground's type colour, a 44pt target. */
export function BackKey({ onPress, on = "blue" }: { onPress: () => void; on?: Ground }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={t("ob2.back")} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="M15 4 L7 12 L15 20" stroke={ON_GROUND[on]} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

/** The keyboard is up (iOS: from the moment it starts rising, so the key moves with it). */
function useKeyboardUp(watch: boolean): boolean {
  const [up, setUp] = useState(false);
  useEffect(() => {
    if (!watch) return;
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setUp(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [watch]);
  return watch && up;
}

/** The key area: the primary key, then a 44pt row for a text key — both always reserved. A screen
    with a keyboard (10) keeps the key 8 above the keyboard while it is up, and on the home
    indicator's line like every other screen while it is down (it used to keep the 8 with the
    keyboard down too, 24pt lower than its neighbours). */
export function KeyArea({ primary, secondary, keyboard = false, style }: { primary?: ReactNode; secondary?: ReactNode; keyboard?: boolean; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  const kbUp = useKeyboardUp(keyboard);
  return (
    <View style={[{ paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: kbUp ? 8 : Math.max(insets.bottom, 16) }, style]}>
      <View style={{ height: KEY_H + SHADOW, justifyContent: "center" }}>{primary}</View>
      <View style={{ height: TEXT_KEY_ROW, marginTop: 4, alignItems: "center", justifyContent: "center" }}>{secondary}</View>
    </View>
  );
}

export function ScreenFrame({
  ground,
  back,
  nest = false,
  keyboard = false,
  primary,
  secondary,
  topRight,
  children,
  bodyStyle,
  scroll = false,
}: {
  /** the ground under it (the back key and type colours follow) */
  ground: Ground;
  /** the back key's action; null/undefined = no back key (the bar keeps its height) */
  back?: (() => void) | null;
  /** reserve the nest slot under the bar (3–6, 8) */
  nest?: boolean;
  /** ride above the keyboard (7, 10, 11's email) */
  keyboard?: boolean;
  /** the primary key (an AcidKey) */
  primary?: ReactNode;
  /** the text key under it (a TextKey) */
  secondary?: ReactNode;
  /** something small at the top right of the bar (1's language chip) */
  topRight?: ReactNode;
  children?: ReactNode;
  bodyStyle?: StyleProp<ViewStyle>;
  /** the body scrolls when it outgrows its room (an SE: the nest and the key area leave it ~339pt;
      4's third choice and 8's envelope ran under the keys). Where it fits it is exactly the plain
      body (flexGrow keeps a flex:1 child filling it, and it doesn't bounce). */
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const body = (
    <>
      {scroll ? (
        <ScrollView style={{ flex: 1 }} alwaysBounceVertical={false} showsVerticalScrollIndicator={false} contentContainerStyle={[{ flexGrow: 1, paddingHorizontal: GUTTER }, bodyStyle]}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, paddingHorizontal: GUTTER }, bodyStyle]}>{children}</View>
      )}
      <KeyArea primary={primary} secondary={secondary} keyboard={keyboard} />
    </>
  );
  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={{ height: TOPBAR_H, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 6 }}>
        {back ? <BackKey onPress={back} on={ground} /> : <View style={{ width: 44 }} />}
        {topRight ?? <View style={{ width: 44 }} />}
      </View>
      {nest && <View style={{ height: NEST_SLOT_H }} />}
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </View>
  );
}

/** A screen's headline: Inter 800, 28–30, −0.8, sentence case, in the ground's type colour.
    VoiceOver's cursor moves to it when it mounts (useFocusOnMount), so a new screen is read
    from its question. */
export function Headline({ children, on = "blue", align = "center", style }: { children: ReactNode; on?: Ground; align?: "center" | "left"; style?: StyleProp<TextStyle> }) {
  const ref = useRef<Text>(null);
  useFocusOnMount(ref);
  return (
    <Text ref={ref} maxFontSizeMultiplier={OB_MAX_FONT} accessibilityRole="header" style={[TYPE.headline, { color: ON_GROUND[on], textAlign: align }, style]}>
      {children}
    </Text>
  );
}

/** The line under a headline: Inter 15–16, in the ground's type colour (pure white on blue — never faded). */
export function Line({ children, on = "blue", align = "center", small = false, style }: { children: ReactNode; on?: Ground; align?: "center" | "left"; small?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[small ? TYPE.lineSmall : TYPE.line, { color: ON_GROUND[on], textAlign: align, marginTop: 10 }, style]}>{children}</Text>;
}
