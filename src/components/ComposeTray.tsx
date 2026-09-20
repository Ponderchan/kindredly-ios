import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { t } from "../lib/i18n";
import { P, PF, channelInk } from "../theme/post";
import { STAMP_CATEGORIES, STAMPS, getStamp, sname, stampsByCat } from "../data/stamps";
import { StampTile } from "./StampTile";

/* THE TWO ROUND KEYS UNDER THE LETTER, AND WHAT THEY OPEN.
   ────────────────────────────────────────────────────────────────────────
   A messaging keyboard's shape (owner, 2026-09-20): a stamp key and a ⊕
   key where the ? and the microphone used to stand square. Each opens a
   tray where the keyboard was.

   The stamp tray: a tab row — stamps, a custom stamp, a stamp tool (the
   last two are doors not built yet, drawn faint and inert) — then the
   stamps this letter suggests, the ones used lately, and all thirty-six
   in their categories. The ⊕ tray: the question and the voice letter. */

export const TRAY_H = 296;

/* ── THE GLYPH FAMILY (design sheet 2026-09-20, set 1a "Perf Line") ──
   One perforated square is the mother shape; only what sits inside it
   changes. STAMP: a face — it is a MOOD stamp, and a moon would read as
   one particular stamp. CUSTOM: a photo with a pen-blue plus in the
   corner — your picture becomes a stamp. CAM: a lens in the square.
   PLUS turns 45° into × while its tray is open, so closing needs no
   second key. 1.6px strokes, short-dash perforation, nothing else. */
const Perf = ({ color }: { color: string }) => <Rect x={3.5} y={3.5} width={17} height={17} rx={1} stroke={color} strokeWidth={1.6} strokeDasharray="1.4 1.6" fill="none" />;

export function StampGlyph({ size = 22, color = P.ink, face }: { size?: number; color?: string; face?: string }) {
  /* `face`: the face in its own colour while the tray is open — an
     emotional stamp lights up when asked (owner, 2026-09-20) */
  const f = face ?? color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Perf color={color} />
      <Circle cx={9.4} cy={10.4} r={1.1} fill={f} />
      <Circle cx={14.6} cy={10.4} r={1.1} fill={f} />
      <Path d="M8.9 14.1c1.1 1.6 5.1 1.6 6.2 0" stroke={f} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function PlusGlyph({ size = 22, color = P.ink, open = false }: { size?: number; color?: string; open?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 6v12M6 12h12" stroke={color} strokeWidth={1.8} strokeLinecap="round" transform={open ? "rotate(45 12 12)" : "rotate(0 12 12)"} /* always a value: an undefined prop leaves the last transform on the native view */ />
    </Svg>
  );
}

/* the two doors still to build (owner's picks from the sheet, 2026-09-20):
   CUSTOM is 2f — your photo mounted inside the perforated square, a stamp
   already; STAMP CAM is 2d — a viewfinder's four corners in the square and
   the red shutter dot, the one red in the row. Both keep the mother shape. */
function CustomGlyph({ size = 22, color = P.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Perf color={color} />
      <Rect x={6.5} y={6.5} width={11} height={11} stroke={color} strokeWidth={1.3} fill="none" />
      <Circle cx={10} cy={10} r={1.4} fill="#F2A33A" />
      <Path d="M6.5 17.5l3.4-3.8 2.2 2.2 1.8-1.8 3.6 3.4z" fill={color} />
    </Svg>
  );
}
function CamGlyph({ size = 22, color = P.ink, shutter = "#C8412E" }: { size?: number; color?: string; shutter?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Perf color={color} />
      <Path d="M7 9.5V7h2.5M14.5 7H17v2.5M17 14.5V17h-2.5M9.5 17H7v-2.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      <Circle cx={12} cy={12} r={2} fill={shutter} />
    </Svg>
  );
}

/* the ⊕ tray's two: a drawn question mark and a drawn microphone — same
   1.6px line as the family, round caps; the typed "?" and the 🎙 emoji sat
   in a row of line icons like two guests in the wrong clothes */
function QuestionGlyph({ size = 26, color = P.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8.6 9.2a3.4 3.4 0 1 1 5.2 2.9c-1.2.8-1.8 1.5-1.8 2.9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={18.6} r={1.25} fill={color} />
    </Svg>
  );
}
function MicGlyph({ size = 26, color = P.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={3.5} width={6} height={10.5} rx={3} stroke={color} strokeWidth={1.7} />
      <Path d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3M9 20.5h6" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

/** a round key in the bar */
export function RoundKey({ on, onPress, children, badge }: { on?: boolean; onPress: () => void; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 46,
        height: 46,
        borderRadius: 23,
        borderWidth: 1.5,
        borderColor: P.ink,
        backgroundColor: on ? P.ink : "transparent",
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {children}
      {badge}
    </Pressable>
  );
}

const COLS = 6;

export function StampTray({ selected, suggested, recent, onPick }: { selected: string | null; suggested: string[]; recent: string[]; onPick: (id: string) => void }) {
  const tile = (id: string) => {
    const on = selected === id;
    const st = getStamp(id);
    return (
      <Pressable key={id} onPress={() => onPick(id)} hitSlop={2} style={({ pressed }) => ({ width: `${100 / COLS}%`, alignItems: "center", paddingTop: 6, paddingBottom: 4, opacity: pressed ? 0.6 : 1 })}>
        <View style={{ padding: 2, borderWidth: 2, borderColor: on ? P.pen : "transparent", borderRadius: 7 }}>
          <StampTile id={id} w={40} r={5} />
        </View>
        {/* its name, in its own ink — a stamp is a word as much as a picture */}
        <Text numberOfLines={1} style={{ fontFamily: PF.mono, fontSize: 7.5, letterSpacing: 0.2, color: channelInk(st?.color), marginTop: 2, maxWidth: 58, textAlign: "center" }}>
          {sname(st?.name).toUpperCase()}
        </Text>
      </Pressable>
    );
  };
  const section = (label: string, ids: string[]) =>
    ids.length ? (
      <View key={label} style={{ marginBottom: 6 }}>
        <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, letterSpacing: 1.5, color: P.ink40, paddingHorizontal: 6, marginTop: 10, marginBottom: 4 }}>{label}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{ids.map(tile)}</View>
      </View>
    ) : null;
  const known = new Set(STAMPS.map((s) => s.id));
  return (
    <View style={{ height: TRAY_H, backgroundColor: "#F3F2FA", borderTopWidth: 1, borderTopColor: P.ink12 }}>
      {/* the tab row: stamps, then the two doors not built yet */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 }}>
        <View style={{ width: 44, height: 36, borderRadius: 9, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
          <StampGlyph size={22} />
        </View>
        <View style={{ width: 44, height: 36, alignItems: "center", justifyContent: "center", opacity: 0.3 }}>
          <CustomGlyph size={22} />
        </View>
        <View style={{ width: 44, height: 36, alignItems: "center", justifyContent: "center", opacity: 0.3 }}>
          <CamGlyph size={22} />
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 18 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {section(t("cp.forThisLetter"), suggested.filter((id) => known.has(id)))}
        {section(t("cp.recent"), recent.filter((id) => known.has(id)))}
        {STAMP_CATEGORIES.map((cat) =>
          section(
            sname(cat.name).toUpperCase(),
            stampsByCat(cat.id).map((s) => s.id),
          ),
        )}
      </ScrollView>
    </View>
  );
}

export function MoreTray({ askOn, voiceOn, premium, onAsk, onVoice }: { askOn: boolean; voiceOn: boolean; premium: boolean; onAsk: () => void; onVoice: () => void }) {
  const cell = (label: string, on: boolean, onPress: () => void, glyph: React.ReactNode, lock?: boolean) => (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: 82, alignItems: "center", opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 62, height: 62, borderRadius: 16, backgroundColor: on ? P.ink : "#FFFFFF", borderWidth: 1, borderColor: on ? P.ink : P.ink12, alignItems: "center", justifyContent: "center" }}>
        {glyph}
        {lock && (
          <View style={{ position: "absolute", right: -5, bottom: -5, width: 18, height: 18, borderRadius: 9, backgroundColor: P.pen, alignItems: "center", justifyContent: "center" }}>
            <Svg width={10} height={10} viewBox="0 0 12 12">
              <Path d="M3.7 5.6V4.1a2.3 2.3 0 0 1 4.6 0v1.5" fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
              <Rect x={2.5} y={5.6} width={7} height={5} fill="#fff" />
            </Svg>
          </View>
        )}
      </View>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 1, color: P.ink60, marginTop: 8, textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ height: TRAY_H, backgroundColor: "#F3F2FA", borderTopWidth: 1, borderTopColor: P.ink12, flexDirection: "row", gap: 10, paddingHorizontal: 18, paddingTop: 22 }}>
      {cell(t("cp.tray.ask"), askOn, onAsk, <QuestionGlyph color={askOn ? "#FFFFFF" : P.ink} />)}
      {cell(t("cp.tray.voice"), voiceOn, onVoice, <View style={{ opacity: premium ? 1 : 0.45 }}><MicGlyph color={voiceOn ? "#FFFFFF" : P.ink} /></View>, !premium)}
    </View>
  );
}

/** the stamp a tray pick refers to — for the envelope corner */
export const stampOf = (id: string | null) => (id ? getStamp(id) : null);

/* THE NUDGE. When the key reads PICK A MOOD STAMP, the stamp key is the
   one just to its left — and a small chevron at the key's left edge
   leans toward it, again and again, until a stamp is on the envelope
   (owner, 2026-09-20). Native-driven, not an interaction. */
export function Nudge({ color = P.pen }: { color?: string }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const sine = Easing.inOut(Easing.sin);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: -4, duration: 520, easing: sine, useNativeDriver: true, isInteraction: false }),
        Animated.timing(x, { toValue: 0, duration: 520, easing: sine, useNativeDriver: true, isInteraction: false }),
        Animated.delay(260),
      ]),
      { resetBeforeIteration: false },
    );
    loop.start();
    return () => loop.stop();
  }, [x]);
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: 10, top: 0, bottom: 0, justifyContent: "center", transform: [{ translateX: x }] }}>
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Path d="M15 5 L8 12 L15 19" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

/* THE FACE COMES APART, AND A PENCIL ARRIVES (owner, 2026-09-20).
   ────────────────────────────────────────────────────────────────────────
   Closed, the stamp key is the face in the perforated square. Tapped, the
   face breaks — the two eyes fly up and out, the smile drops — and in
   their place a short amber pencil lies across the square's corner, the
   sheet's "Pencil Across": a stamp being made, not a picture of one. The
   ring stays a ring; the fill never goes black. Closing runs it backwards
   and the face reassembles. Every piece is native-driven and none is an
   "interaction". */
export function StampKeyGlyph({ open, size = 23, color = P.ink }: { open: boolean; size?: number; color?: string }) {
  const v = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: open ? 1 : 0, duration: 360, easing: open ? Easing.out(Easing.cubic) : Easing.inOut(Easing.quad), useNativeDriver: true, isInteraction: false }).start();
  }, [open, v]);
  const u = size / 24; // one viewBox unit in points
  const gone = v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0, 0] });
  const here = v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });
  const eyeL = { opacity: gone, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, -5 * u] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -6 * u] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) }] };
  const eyeR = { opacity: gone, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 5 * u] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -6 * u] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) }] };
  const smile = { opacity: gone, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, 6 * u] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) }] };
  const pencil = { opacity: here, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [6 * u, 0] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [6 * u, 0] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["20deg", "0deg"] }) }] };
  const dot = { opacity: here, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] };
  const abs = { position: "absolute" as const, left: 0, top: 0, width: size, height: size };
  return (
    <View style={{ width: size, height: size }}>
      {/* the square, always */}
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Perf color={color} />
      </Svg>
      {/* the face, in three pieces */}
      <Animated.View pointerEvents="none" style={[abs, eyeL]}>
        <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={9.4} cy={10.4} r={1.1} fill={color} /></Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[abs, eyeR]}>
        <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={14.6} cy={10.4} r={1.1} fill={color} /></Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[abs, smile]}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M8.9 14.1c1.1 1.6 5.1 1.6 6.2 0" stroke={color} strokeWidth={1.6} strokeLinecap="round" /></Svg>
      </Animated.View>
      {/* what takes its place: the ink dot of a stamp being drawn, and the pencil */}
      <Animated.View pointerEvents="none" style={[abs, dot]}>
        <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={10.5} cy={10.5} r={2.4} fill={color} /></Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[abs, pencil]}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <G transform="rotate(45 16.5 16.5)">
            <Rect x={14.6} y={9} width={3.8} height={11} rx={0.6} fill="#F2A33A" stroke={color} strokeWidth={1.3} />
            <Path d="M14.6 20l1.9 3 1.9-3z" fill={color} />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}
