import React from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  type StyleProp,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { C, F, cardStyle, navyBtn, radius } from "../theme/tokens";
import { t, useLang } from "../lib/i18n";
import { SLOW_MS } from "../lib/net";
import { useTheme } from "../lib/theme";
import { toastColors } from "./10a/kit";
import { Host } from "@expo/ui/swift-ui";
import { KToastView } from "../../modules/kindredly-ui";
import { NativeSurface, useSurfaceHost } from "./NativeSurface";

/* Small shared UI atoms ported from kindredly-v20.jsx (Dots/Skip/TopBar/Toast
   + the navy CTA + caps labels + cards). */

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        navyBtn,
        { paddingVertical: 18, width: "100%", opacity: off ? 0.28 : pressed ? 0.9 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={{ color: "#fff", fontFamily: F.sansExtra, fontSize: 14, letterSpacing: 1.8 }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  style,
  icon,
}: {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingVertical: 17,
          width: "100%",
          borderRadius: radius.pill,
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.line,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          opacity: pressed ? 0.9 : 1,
        },
        cardStyle,
        style,
      ]}
    >
      {icon}
      <Text style={{ color: C.ink, fontFamily: F.sansBold, fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}

export function Caps({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[{ fontSize: 10.5, letterSpacing: 1.8, color: C.label, fontFamily: F.sansBold }, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[cardStyle, style]}>{children}</View>;
}

export function Dots({ i, n, onPick }: { i: number; n: number; onPick?: (k: number) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>
      {Array.from({ length: n }).map((_, k) => (
        <Pressable key={k} onPress={onPick ? () => onPick(k) : undefined} hitSlop={8}>
          <View
            style={{
              width: k === i ? 20 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: k === i ? C.purple : C.line,
            }}
          />
        </Pressable>
      ))}
    </View>
  );
}

export function Skip({ onPress, top = 26 }: { onPress?: () => void; top?: number }) {
  useLang(); // repaint when the reader changes language
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={{ position: "absolute", top, right: 22, zIndex: 5, padding: 8 }}
    >
      <Text style={{ fontSize: 11, fontFamily: F.sansBold, letterSpacing: 1.4, color: C.faint }}>
        {t("ui.skip")}
      </Text>
    </Pressable>
  );
}

export function TopBar({ onBack, pct }: { onBack?: () => void; pct: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 22, paddingTop: 8 }}>
      <Pressable
        onPress={onBack}
        hitSlop={10}
        style={{ width: 34, height: 34, marginLeft: -8, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontSize: 26, color: C.ink, marginTop: -4 }}>‹</Text>
      </Pressable>
      <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: C.line, overflow: "hidden" }}>
        <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", backgroundColor: C.purple, borderRadius: 3 }} />
      </View>
      <View style={{ width: 26 }} />
    </View>
  );
}

export function ProgressBar({ pct, color = C.purple, track = C.lineSoft, height = 4 }: { pct: number; color?: string; track?: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: "hidden" }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

/* THE TOAST (10a: spec-today "Send overlays"). One short line that comes
   and goes on its own — "Reply sent.", the slow-network note — never a
   button. It wears the theme as every ink fill in 10a does: an ink pill
   with the page colour on it, system 600 13, corners 22, padding 12 18
   (on Midnight a light pill with dark type, which is right). The caller
   places it (`bottom`: above the write-back pill on Today, above the reply
   strip in a chat) and decides how long it stays; it takes no touch.
   VoiceOver hears the line once when it appears, so a confirmation isn't
   something only sighted readers get. */
export function Toast({ msg, bottom = 110, left = 16, right = 16 }: { msg: string; bottom?: number; left?: number; right?: number }) {
  /* SWIFT OR REACT NATIVE (2026-10-27): SwiftUI's KToastView when the
     "toast" switch is on and the binary has the view, else ToastRN below,
     exactly as before. Each showing decides once (NativeSurface in mount
     mode, mounted while the toast is up). Either way TS places it, times
     it and says it to VoiceOver; Swift only draws the pill. */
  return (
    <NativeSurface
      surface="toast"
      view="KToastView"
      mode="mount"
      native={() => <ToastSwift msg={msg} bottom={bottom} left={left} right={right} />}
      fallback={() => <ToastRN msg={msg} bottom={bottom} left={left} right={right} />}
      // a frame or two while the breadcrumb is written: nothing, as before it appears
      pending={() => null}
    />
  );
}

/* The Swift pill, in a Host as wide as the React Native toast's row and as
   tall as the pill; neither takes a touch. */
function ToastSwift({ msg, bottom, left, right }: { msg: string; bottom: number; left: number; right: number }) {
  const { t: tk, key: theme, dark } = useTheme();
  const host = useSurfaceHost();
  const c = toastColors(tk);
  React.useEffect(() => {
    if (msg) AccessibilityInfo.announceForAccessibility(msg);
  }, [msg]);
  return (
    <View style={{ position: "absolute", left, right, bottom }} pointerEvents="none">
      <Host matchContents={{ vertical: true }} ignoreSafeArea="all" colorScheme={dark ? "dark" : "light"} pointerEvents="none" style={{ alignSelf: "stretch" }} onLayoutContent={host?.onLayoutContent}>
        <KToastView theme={theme} message={msg} fill={c.fill} ink={c.text} />
      </Host>
    </View>
  );
}

/* the React Native toast, unchanged */
function ToastRN({ msg, bottom, left, right }: { msg: string; bottom: number; left: number; right: number }) {
  const { t: tk } = useTheme();
  const c = toastColors(tk);
  React.useEffect(() => {
    if (msg) AccessibilityInfo.announceForAccessibility(msg);
  }, [msg]);
  return (
    <View style={{ position: "absolute", left, right, bottom, alignItems: "center" }} pointerEvents="none">
      <View style={{ backgroundColor: c.fill, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 22 }}>
        <Text style={{ color: c.text, fontSize: 13, fontWeight: "600", textAlign: "center" }}>{msg}</Text>
      </View>
    </View>
  );
}

/* IS THIS SLOW, OR IS IT BROKEN? A spinner answers neither. On a weak
   connection every send in this app showed the same "···" whether it was
   about to land or about to time out, so the reader's only move was to
   wait and then wonder. This flips true once an action has been in flight
   longer than a send normally takes; the screens use it to say so out loud
   rather than to spin harder.

   10a: it holds no colour of its own — what it turns on does. Say it with
   the themed Toast above (t("net.slow")), or, in a chat, on the status
   line in the dock above the strip, where the keyboard can't cover it
   (spec-chat: the slow note moves into the dock). Both renderers use the
   same timer: a Swift screen gets the flag as a prop. */
export function useSlow(active: boolean, after: number = SLOW_MS): boolean {
  const [slow, setSlow] = React.useState(false);
  React.useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const id = setTimeout(() => setSlow(true), after);
    return () => clearTimeout(id);
  }, [active, after]);
  return slow;
}
