import { useEffect, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, Extrapolation, ReduceMotion, interpolate, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Ellipse, Rect } from "react-native-svg";
import { P, PF } from "../theme/post";
import { OrbitMap, ORBIT } from "./OrbitMap";
import { MosaicId } from "./MosaicId";
import { postNo } from "../lib/format";
import type { ThreadSummary } from "../lib/db";
import { t, useLang } from "../lib/i18n";

/* THE SKY, FOLDED ONTO THE TITLE'S RULE (owner, 2026-09-23, second pass).
   The first fold kept its own white band across the top of the screen,
   under the clock, and it looked like a stray strip of paper. Now there is
   no band: the rule under KINDREDS — the same rule every tab's title sits
   on — is the horizon. Folded, every stranger is a tick on that line, blue
   for the ones waiting on you, you the square in the middle, and a small
   tag clipped to its right end says OPEN. Open, the orbit drops out of the
   line into a card of its own, with a two-line legend under it, and the tag
   says FOLD; pushed back up, it folds into the rule again.

   One motion (0.45s): the rings flatten and each stranger drops straight
   onto the line from wherever the drift has carried them (OrbitMap `flat`).
   The tag, a tap anywhere on the sky, a pull on the list and a push up all
   work it (the tab owns the gestures). Reduce Motion skips the fold.

   2026-10-11 (owner, design 2a): no OPEN/FOLD tag any more — the loudest
   thing in the header and the least used; the line itself is the button,
   and a pull on the list still opens it. Open, under the legend, the pen
   pals CLOSEST TO YOU: the three nearest to trading names (by the side
   that has written less, as the five-each rule counts), one tap from their
   letters. */

const LINE_Y = 11; // where the title's rule runs through this box
const GAP = 10; // from the rule to the card, open
const FOLDED_H = LINE_Y * 2; // the line, with room for the tag on it
const CLAMP = Extrapolation.CLAMP;

export function KindredsSky({ items, open, onToggle, onOpenThread }: { items: ThreadSummary[]; open: boolean; onToggle: () => void; onOpenThread?: (th: ThreadSummary) => void }) {
  useLang();
  const closest = items
    .filter((th) => !th.revealed && !th.gone && Math.min(th.mine, th.theirs) >= 1)
    .sort((a, b) => Math.min(b.mine, b.theirs) - Math.min(a.mine, a.theirs) || b.lastAt - a.lastAt)
    .slice(0, 3);
  const p = useSharedValue(open ? 1 : 0); // 1 = open
  // the legend wraps differently by language, so it is measured
  const footH = useSharedValue(78);
  useEffect(() => {
    p.value = withTiming(open ? 1 : 0, { duration: 450, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.System });
  }, [open, p]);
  const flat = useDerivedValue(() => 1 - p.value);
  // open, it also keeps the list's usual 12pt from the next card
  const box = useAnimatedStyle(() => ({ height: interpolate(p.value, [0, 1], [FOLDED_H, LINE_Y + GAP + ORBIT.H + footH.value + 8], CLAMP) }));
  const card = useAnimatedStyle(() => ({
    height: interpolate(p.value, [0, 1], [0, ORBIT.H + footH.value], CLAMP),
    opacity: interpolate(p.value, [0, 0.35], [0, 1], CLAMP),
  }));
  const map = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(p.value, [0, 1], [LINE_Y - ORBIT.CY, LINE_Y + GAP], CLAMP) }] }));
  const openTag = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 0.3], [1, 0], CLAMP) }));
  const foldTag = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0.7, 1], [0, 1], CLAMP) }));
  const foot = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0.7, 1], [0, 1], CLAMP) }));

  return (
    <Pressable
      onPress={onToggle}
      hitSlop={{ bottom: 10 }}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={open ? t("kd.skyFold") : t("kd.skyOpen")}
      accessibilityHint={open ? `${t("kd.legendCloser")}. ${t("kd.legendTurn")}.` : undefined}
      style={{ marginHorizontal: 16, marginTop: -(LINE_Y + 0.5) }}
    >
      {/* the card the orbit opens into — outside the clip, so its shadow shows */}
      {/* no card round it any more (2026-10-11, the prototype's white page): the rings sit on the page itself */}
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, top: LINE_Y + GAP, backgroundColor: "#FFFFFF" }, card]} />

      <Animated.View style={[{ overflow: "hidden" }, box]}>
        <Animated.View pointerEvents="none" style={[{ alignItems: "center" }, map]}>
          <OrbitMap items={items} flat={flat} line={false} />
        </Animated.View>

        {/* open: what the marks mean, as a legend, and the handle to push it back */}
        <Animated.View
          pointerEvents={open ? "box-none" : "none"}
          onLayout={(e) => (footH.value = e.nativeEvent.layout.height)}
          style={[{ position: "absolute", left: 0, right: 0, top: LINE_Y + GAP + ORBIT.H, paddingHorizontal: 22, paddingBottom: 12, gap: 7 }, foot]}
        >
          <Legend mark={<RingsMark />} text={t("kd.legendCloser")} />
          <Legend mark={<View style={{ width: 7, height: 7, backgroundColor: P.pen }} />} text={t("kd.legendTurn")} />
          {closest.length > 0 && (
            <View style={{ marginTop: 8, gap: 6 }}>
              <Text style={{ fontFamily: PF.monoMed, fontSize: 9.5, letterSpacing: 1.2, color: P.ink40 }}>{t("kd.closest")}</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {closest.map((th) => {
                  const each = Math.min(th.mine, th.theirs, 5);
                  return (
                    <Pressable
                      key={th.id}
                      onPress={() => onOpenThread?.(th)}
                      accessibilityRole="button"
                      accessibilityLabel={`NO. ${postNo(th.other)}, ${each}/5`}
                      style={({ pressed }) => ({ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderColor: P.ink12, paddingHorizontal: 7, paddingVertical: 6, opacity: pressed ? 0.6 : 1 })}
                    >
                      <View style={{ width: 22, height: 22, borderWidth: 1, borderColor: P.ink12, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        <MosaicId seed={th.other} cell={2.6} gap={0.6} develop={0.15 + 0.85 * (Math.min(th.theirs, 5) / 5)} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 0.4, color: P.ink }}>{postNo(th.other)}</Text>
                        <Text style={{ fontFamily: PF.mono, fontSize: 9.5, color: each >= 5 ? P.brassSeal : P.ink40 }}>{each}/5</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
          <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: P.ink12, marginTop: 7 }} />
        </Animated.View>

        {/* a small chevron at the rule's right end says the line opens */}
        <View pointerEvents="none" style={{ position: "absolute", right: -2, top: LINE_Y - 10 }}>
          <Animated.View style={openTag}>
            <Text style={chev}>⌄</Text>
          </Animated.View>
          <Animated.View style={[{ position: "absolute", right: 0, top: 0 }, foldTag]}>
            <Text style={chev}>⌃</Text>
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const chev = { fontSize: 15, lineHeight: 18, color: P.ink60, backgroundColor: "#FFFFFF", paddingLeft: 4, paddingRight: 2 };

function Legend({ mark, text }: { mark: ReactNode; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 18, alignItems: "center" }}>{mark}</View>
      <Text style={{ flex: 1, fontFamily: PF.monoMed, fontSize: 11, letterSpacing: 0.2, color: P.ink60 }}>{text}</Text>
    </View>
  );
}

/* the rings, small: two dashed orbits round the square that is you */
function RingsMark() {
  return (
    <Svg width={18} height={14} viewBox="0 0 18 14">
      <Ellipse cx={9} cy={7} rx={8} ry={6} stroke={P.ink} strokeOpacity={0.45} strokeWidth={1} strokeDasharray="2 2" fill="none" />
      <Ellipse cx={9} cy={7} rx={4.5} ry={3.4} stroke={P.ink} strokeOpacity={0.6} strokeWidth={1} strokeDasharray="2 1.6" fill="none" />
      <Rect x={7.6} y={5.6} width={2.8} height={2.8} fill={P.ink} />
    </Svg>
  );
}
