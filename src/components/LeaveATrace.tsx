import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { P, PF, rule } from "../theme/post";
import { t, useLang } from "../lib/i18n";

/* THE "+" IS NOT AN ATTACHMENT BUTTON.
   ────────────────────────────────────────────────────────────────────────
   In every chat app the plus opens a drawer of things to SEND — files,
   photos, stickers. Here it opens a list of things to LEAVE: every row
   adds something to the relationship rather than to the scroll. That is
   the whole difference between a messaging surface and a shared space,
   and it is why this sheet is titled by the act rather than by the
   contents.

   Rows that aren't built yet are shown LOCKED and dimmed rather than
   hidden or, worse, live-looking and dead. The settings panel taught that
   lesson: a row that looks like a feature and does nothing is worse than
   no row, but a row that plainly says "not yet" is an honest promise. */

export type TraceKind = "note" | "ask" | "moment" | "song" | "photo" | "bug" | "idea";

export interface TraceAction {
  id: TraceKind;
  title: string;
  sub: string;
  locked?: boolean;
}

/* line icons in the post's own hand — the sheet is a list of things to
   leave, so each row is drawn, not pasted in from the emoji keyboard */
export function TraceIcon({ kind, color }: { kind: TraceKind; color: string }) {
  const c = { stroke: color, strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  switch (kind) {
    case "note":
      return (
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Path d="M4 2.5h7l3 3v10H4z" {...c} />
          <Path d="M11 2.5v3h3" {...c} />
          <Line x1={6.5} y1={9} x2={11.5} y2={9} {...c} />
          <Line x1={6.5} y1={12} x2={10} y2={12} {...c} />
        </Svg>
      );
    case "ask":
      return (
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Path d="M3 3.5h12v8H8.5L5.5 14v-2.5H3z" {...c} />
          <Path d="M7.6 6.6a1.5 1.5 0 1 1 2.1 1.4c-.5.3-.7.6-.7 1.1" {...c} />
          <Circle cx={9} cy={10.6} r={0.5} fill={color} />
        </Svg>
      );
    case "moment":
      return (
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Rect x={2.5} y={5} width={13} height={9.5} {...c} />
          <Path d="M6.5 5l1-2h3l1 2" {...c} />
          <Circle cx={9} cy={9.7} r={2.4} {...c} />
        </Svg>
      );
    case "song":
      return (
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Path d="M7 13.5V4.5l7-1.5v9" {...c} />
          <Circle cx={5} cy={13.5} r={2} {...c} />
          <Circle cx={12} cy={12} r={2} {...c} />
        </Svg>
      );
    /* Wren's desk: what you hand the makers — a picture (a screenshot,
       usually), a bug, an idea */
    case "photo":
      return (
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Rect x={2.5} y={3} width={13} height={12} {...c} />
          <Path d="M2.5 12l3.5-3.5 3 3 2-2 4.5 4.5" {...c} />
          <Circle cx={11.5} cy={6.5} r={1.3} {...c} />
        </Svg>
      );
    case "bug":
      return (
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Path d="M6 8a3 3 0 0 1 6 0v3.5a3 3 0 0 1-6 0z" {...c} />
          <Path d="M7 5.5l-1.5-2M11 5.5l1.5-2" {...c} />
          <Line x1={9} y1={8} x2={9} y2={14.5} {...c} />
          <Path d="M6 9H3.5M12 9h2.5M6 12l-2 1.5M12 12l2 1.5" {...c} />
        </Svg>
      );
    case "idea":
      return (
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Path d="M5.5 7.5a3.5 3.5 0 1 1 5.6 2.8c-.6.5-.9 1-.9 1.7H7.8c0-.7-.3-1.2-.9-1.7A3.5 3.5 0 0 1 5.5 7.5z" {...c} />
          <Line x1={7.8} y1={14} x2={10.2} y2={14} {...c} />
          <Line x1={8.3} y1={15.5} x2={9.7} y2={15.5} {...c} />
        </Svg>
      );
  }
}

function LockIcon({ color }: { color: string }) {
  const c = { stroke: color, strokeWidth: 1.3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Rect x={2.5} y={6} width={9} height={6.5} {...c} />
      <Path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" {...c} />
    </Svg>
  );
}

export function LeaveATrace({
  open,
  actions,
  onPick,
  onClose,
}: {
  open: boolean;
  actions: TraceAction[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  useLang(); // repaint when the reader changes language
  const insets = useSafeAreaInsets();
  if (!open) return null;

  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end" }}>
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(17,17,19,0.32)" }} />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.duration(260)}
        style={{ backgroundColor: P.paper, borderTopWidth: 1, borderTopColor: P.ink, paddingBottom: Math.max(insets.bottom, 12) + 6 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingTop: 16, paddingBottom: 12, ...rule }}>
          <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 12, letterSpacing: 1.8, color: P.ink }}>{t("lat.title")}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={{ fontFamily: PF.mono, fontSize: 16, color: P.ink40 }}>✕</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 22, paddingTop: 4 }}>
          {actions.map((a, i) => (
            <Pressable
              key={a.id}
              disabled={a.locked}
              onPress={() => onPick(a.id)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                paddingVertical: 15,
                borderBottomWidth: i === actions.length - 1 ? 0 : 1,
                borderBottomColor: P.ink12,
                opacity: a.locked ? 0.38 : pressed ? 0.55 : 1,
              })}
            >
              <View style={{ width: 34, height: 34, borderWidth: 1, borderColor: P.ink12, alignItems: "center", justifyContent: "center" }}>
                <TraceIcon kind={a.id} color={P.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: PF.letter, fontSize: 16.5, color: P.ink }}>{a.title}</Text>
                <Text style={{ fontFamily: PF.serifItalic, fontStyle: "italic", fontSize: 12.5, color: P.ink40, marginTop: 1 }}>{a.sub}</Text>
              </View>
              {a.locked ? <LockIcon color={P.ink40} /> : <Text style={{ fontFamily: PF.mono, fontSize: 13, color: P.ink40 }}>›</Text>}
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

/* THE SAME FOUR, AS A TRAY (owner, 2026-09-20): under the bar where the
   keyboard was, round white cells with a word beneath — a chat app's
   drawer — instead of a sheet with a title. Locked rows are still shown,
   dimmed, with the lock. */
export function TraceTray({ actions, onPick }: { actions: TraceAction[]; onPick: (kind: TraceKind) => void }) {
  useLang();
  return (
    <View style={{ height: 296, backgroundColor: "#F3F2FA", borderTopWidth: 1, borderTopColor: P.ink12, flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10, paddingTop: 22 }}>
      {actions.map((a) => (
        <Pressable key={a.id} disabled={a.locked} onPress={() => onPick(a.id)} style={({ pressed }) => ({ width: "25%", alignItems: "center", marginBottom: 18, opacity: a.locked ? 0.4 : pressed ? 0.6 : 1 })}>
          <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: P.ink12, alignItems: "center", justifyContent: "center" }}>
            <View style={{ transform: [{ scale: 1.35 }] }}>
              <TraceIcon kind={a.id} color={P.ink} />
            </View>
            {a.locked && (
              <View style={{ position: "absolute", right: -3, bottom: -3, width: 18, height: 18, borderRadius: 9, backgroundColor: P.pen, alignItems: "center", justifyContent: "center" }}>
                <LockIcon color="#FFFFFF" />
              </View>
            )}
          </View>
          <Text numberOfLines={2} style={{ fontFamily: PF.monoSemi, fontSize: 9, letterSpacing: 0.8, color: P.ink60, marginTop: 8, textAlign: "center", paddingHorizontal: 4 }}>
            {a.title.toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
