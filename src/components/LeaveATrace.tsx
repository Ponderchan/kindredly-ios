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

export type TraceKind = "note" | "ask" | "moment" | "song";

export interface TraceAction {
  id: TraceKind;
  title: string;
  sub: string;
  locked?: boolean;
}

/* line icons in the post's own hand — the sheet is a list of things to
   leave, so each row is drawn, not pasted in from the emoji keyboard */
function TraceIcon({ kind, color }: { kind: TraceKind; color: string }) {
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
                <Text style={{ fontFamily: PF.serifItalic, fontSize: 12.5, color: P.ink40, marginTop: 1 }}>{a.sub}</Text>
              </View>
              {a.locked ? <LockIcon color={P.ink40} /> : <Text style={{ fontFamily: PF.mono, fontSize: 13, color: P.ink40 }}>›</Text>}
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}
