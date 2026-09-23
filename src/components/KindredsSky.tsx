import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, Extrapolation, ReduceMotion, interpolate, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from "react-native-reanimated";
import { P, PF } from "../theme/post";
import { OrbitMap, ORBIT } from "./OrbitMap";
import type { ThreadSummary } from "../lib/db";
import { t, useLang } from "../lib/i18n";

/* THE SKY, FOLDED TO A HORIZON (design 2b × 4c, owner 2026-09-23).
   Folded, the orbit is one line across the top of the tab and every
   stranger a tick on it — blue for the ones waiting on you — so the list
   gets the screen and the sky still says who is out there, at a glance.
   Open, it is the whole orbit, with one sentence under it saying what it
   shows — the owner's caption from the prototype — and a handle at its
   foot, the way a shade pulled down from the top of iOS has one.

   It folds as one motion (0.45s): the rings flatten into the line and each
   stranger drops onto it from wherever their drift has carried them
   (OrbitMap `flat`). There is no count on it: "still strangers" was the
   same number the list already gives, split into STRANGERS and IN TRANSIT.
   Tap anywhere on it to open or fold; the list opens it with a pull and
   folds it with a push up (the tab owns those gestures). Reduce Motion
   skips the fold. */

const FOLDED_H = 44;           // a tap target, with the line through its middle
const LINE_Y = FOLDED_H / 2;

export function KindredsSky({ items, open, onToggle }: { items: ThreadSummary[]; open: boolean; onToggle: () => void }) {
  useLang();
  const p = useSharedValue(open ? 1 : 0); // 1 = open
  /* the caption runs two lines in English and three in some languages, so
     the foot is measured rather than guessed */
  const footH = useSharedValue(76);
  useEffect(() => {
    p.value = withTiming(open ? 1 : 0, { duration: 450, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.System });
  }, [open, p]);
  const flat = useDerivedValue(() => 1 - p.value);
  const box = useAnimatedStyle(() => ({ height: interpolate(p.value, [0, 1], [FOLDED_H, ORBIT.H + footH.value], Extrapolation.CLAMP) }));
  const map = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(p.value, [0, 1], [LINE_Y - ORBIT.CY, 0], Extrapolation.CLAMP) }] }));
  const chip = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 0.25], [1, 0], Extrapolation.CLAMP) }));
  const foot = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0.7, 1], [0, 1], Extrapolation.CLAMP) }));

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={open ? t("kd.skyFold") : t("kd.skyOpen")}
      accessibilityHint={open ? t("kd.skyCaption") : undefined}
    >
      <Animated.View style={[{ backgroundColor: "#FFFFFF", borderBottomLeftRadius: 22, borderBottomRightRadius: 22, overflow: "hidden", shadowColor: "#16143C", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, box]}>
        <Animated.View pointerEvents="none" style={[{ alignItems: "center" }, map]}>
          <OrbitMap items={items} flat={flat} />
        </Animated.View>

        {/* folded: the one word that says it opens */}
        <Animated.View pointerEvents="none" style={[{ position: "absolute", right: 12, top: LINE_Y - 11, height: 22, paddingHorizontal: 9, borderRadius: 11, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: P.ink12, justifyContent: "center" }, chip]}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1.2, color: P.pen }}>{t("kd.skyOpen")} ↓</Text>
        </Animated.View>

        {/* open: what the sky shows, in a sentence, and the handle to push it back up */}
        <Animated.View
          pointerEvents="none"
          onLayout={(e) => (footH.value = e.nativeEvent.layout.height)}
          style={[{ position: "absolute", left: 0, right: 0, top: ORBIT.H, alignItems: "center", paddingHorizontal: 28, paddingTop: 2, paddingBottom: 10 }, foot]}
        >
          <Text style={{ fontFamily: PF.letter, fontSize: 13, lineHeight: 19, color: P.ink60, textAlign: "center", maxWidth: 330 }}>{t("kd.skyCaption")}</Text>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: P.ink12, marginTop: 12 }} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
