import { Pressable, Text, View } from "react-native";
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

export interface TraceAction {
  id: string;
  title: string;
  sub: string;
  glyph: string;
  locked?: boolean;
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
                <Text style={{ fontSize: 15 }}>{a.glyph}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: PF.letter, fontSize: 16.5, color: P.ink }}>{a.title}</Text>
                <Text style={{ fontFamily: PF.serifItalic, fontSize: 12.5, color: P.ink40, marginTop: 1 }}>{a.sub}</Text>
              </View>
              <Text style={{ fontFamily: PF.mono, fontSize: 13, color: P.ink40 }}>{a.locked ? "🔒" : "›"}</Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}
