import React from "react";
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { C, F, cardStyle, navyBtn, radius } from "../theme/tokens";

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
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={{ position: "absolute", top, right: 22, zIndex: 5, padding: 8 }}
    >
      <Text style={{ fontSize: 11, fontFamily: F.sansBold, letterSpacing: 1.4, color: C.faint }}>
        SKIP
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

export function Toast({ msg, bottom = 110 }: { msg: string; bottom?: number }) {
  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom, alignItems: "center" }} pointerEvents="none">
      <View style={{ backgroundColor: C.navy, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 22 }}>
        <Text style={{ color: "#fff", fontFamily: F.sansSemi, fontSize: 13 }}>{msg}</Text>
      </View>
    </View>
  );
}
