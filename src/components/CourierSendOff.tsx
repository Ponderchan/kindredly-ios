import { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { PF } from "../theme/post";
import { useP, useTheme } from "../lib/theme";
import { Seal } from "./Seal";
import { WrenBird } from "./WrenBird";
import { useWrenName } from "../lib/wren-name";
import { t, useLang } from "../lib/i18n";

/* THE PAGE THAT STAYS.

   A LETTER leaves by the sky — see LetterTravel, the page folds itself, the
   courier takes it and crosses the world. A SEALED PAGE is written to stay,
   so it gets the reverse motion in the reverse direction: the seal presses
   in, the desk opens a slot, and the page sinks DOWN into it; the rule
   closes over it and the bird keeps her back turned. Anything that flew the
   journal away would break the one promise the sealed room is built on.

   (The counter ritual that used to live here — postmark strike, docket,
   the climb out the top — was retired for the travel piece on 2026-09-19.) */

/* the ka-chunk. expo-haptics may be missing from an older dev client — the
   strike still reads without it, so it degrades to silence, never a crash */
let Haptics: typeof import("expo-haptics") | null = null;
try {
  Haptics = require("expo-haptics");
} catch {}
function kaChunk(heavy: boolean) {
  try {
    void Haptics?.impactAsync(
      heavy ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    );
  } catch {}
}

export function CourierSendOff({ onDone }: { keep?: boolean; onDone?: () => void }) {
  useLang(); // repaint when the reader changes language
  /* The desk and the page are drawn in the page's own inks, not as art:
     the desk below the slot is a mask that has to be the same ground as
     the screen it sits on, or it shows as a slab. The seal and the bird
     keep their own colours. */
  const P = useP();
  const tk = useTheme().t;
  const wren = useWrenName();
  const reduce = useReducedMotion();

  // the beats
  const shake = useSharedValue(0); // the desk kicks
  const press = useSharedValue(0); // the seal presses in
  const sink = useSharedValue(0); // the page goes into the desk
  const after = useSharedValue(0); // "Kept." fades up

  useEffect(() => {
    const finish = () => onDone?.();
    if (reduce) {
      // motion-sensitive: the finished tableau, held still
      press.value = 1;
      after.value = 1;
      const t = setTimeout(finish, 1500);
      return () => clearTimeout(t);
    }

    {
      // press → kick → the desk takes it → Kept.
      press.value = withDelay(
        350,
        withTiming(1, { duration: 200, easing: Easing.in(Easing.quad) }, (ok) => {
          if (!ok) return;
          runOnJS(kaChunk)(false);
          shake.value = withSequence(withTiming(2.5, { duration: 50 }), withTiming(0, { duration: 130 }));
        }),
      );
      sink.value = withDelay(
        1050,
        withSequence(
          withTiming(-8, { duration: 140, easing: Easing.out(Easing.quad) }),
          withTiming(270, { duration: 680, easing: Easing.in(Easing.cubic) }),
        ),
      );
      after.value = withDelay(1900, withTiming(1, { duration: 320 }));
      const t = setTimeout(finish, 3050);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  const deskStyle = useAnimatedStyle(() => ({ transform: [{ translateY: shake.value }] }));

  const pressStyle = useAnimatedStyle(() => ({
    opacity: press.value,
    transform: [{ scale: interpolate(press.value, [0, 1], [1.9, 1]) }],
  }));

  const sinkStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sink.value }] }));
  const afterStyle = useAnimatedStyle(() => ({ opacity: after.value }));

  return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 2, color: P.ink40, position: "absolute", top: "12%" }}>
          KINDREDLY
        </Text>

        <Animated.View style={[{ width: 280, height: 430 }, deskStyle]}>
          {/* the page, above the slot, about to be taken in */}
          <Animated.View style={[{ position: "absolute", top: 46, left: 140 - 59, zIndex: 2 }, sinkStyle]}>
            <View style={{ width: 118, height: 150, backgroundColor: P.paper, borderWidth: 1.4, borderColor: tk.ln }}>
              <View style={{ height: 1.5, backgroundColor: P.ink12, marginTop: 26, marginHorizontal: 13 }} />
              <View style={{ height: 1.5, backgroundColor: P.ink12, marginTop: 16, marginHorizontal: 13 }} />
              <View style={{ height: 1.5, backgroundColor: P.ink12, marginTop: 16, marginHorizontal: 13, marginRight: 36 }} />
            </View>
            <Animated.View style={[{ position: "absolute", top: 92, left: 59 - 26 }, pressStyle]}>
              <Seal size={52} />
            </Animated.View>
          </Animated.View>

          {/* the desk: everything below the slot swallows the page */}
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 130, backgroundColor: P.paper, zIndex: 3 }} />
          <View style={{ position: "absolute", left: 50, right: 50, bottom: 130, borderTopWidth: 1.5, borderTopColor: tk.ln, zIndex: 4 }} />
          <View style={{ position: "absolute", left: 44, bottom: 128, width: 5, height: 5, backgroundColor: tk.ln, zIndex: 4 }} />
          <View style={{ position: "absolute", right: 44, bottom: 128, width: 5, height: 5, backgroundColor: tk.ln, zIndex: 4 }} />

          {/* she keeps her back to it — this one is not hers to carry */}
          <Animated.View style={[{ position: "absolute", right: 16, bottom: 152, zIndex: 5, alignItems: "flex-end" }, afterStyle]}>
            <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 0.5, color: P.ink40, marginBottom: 6 }}>
              {t("so.notMine")}
            </Text>
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <WrenBird size={44} mood="content" />
            </View>
          </Animated.View>

          <Animated.View style={[{ position: "absolute", left: 0, right: 0, bottom: 36, alignItems: "center", zIndex: 5 }, afterStyle]}>
            <Text style={{ fontFamily: PF.letter, fontSize: 25, fontWeight: "600", color: P.ink }}>{t("so.kept")}</Text>
            <Text style={{ fontFamily: PF.mono, fontSize: 9.5, letterSpacing: 1.2, color: P.ink40, marginTop: 10, textAlign: "center" }}>
              {t("so.keptNote", { name: wren.toUpperCase() })}
            </Text>
          </Animated.View>
        </Animated.View>
      </View>
  );
}
