import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState, Modal, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { WrenBird } from "./WrenBird";
import { NativeSurface } from "./NativeSurface";
import { GrowthMomentSwift } from "./GrowthMomentNative";
import { useAuth } from "../lib/auth";
import { checkGrowth } from "../lib/growth-moment";
import { GROWTH_BEATS, GROWTH_BURST, GROWTH_CURVES, GROWTH_SHAKE, GROWTH_SIZE, growthWords, type GrowthMoment as Moment } from "../lib/growth-moment-core";
import { noteDay } from "../lib/format";
import { t, useLang } from "../lib/i18n";
import { useLetterFamily, useTheme } from "../lib/theme";
import { PFM } from "../theme/post";
import "../data/strings-growth";

/* WREN GROWS UP: THE MOMENT (owner, 2026-10-26, option 1 of two: "全屏换羽"). The next time the tabs
   are open after she fledges or grows up — once per stage (lib/growth-moment) — the screen goes to
   the page's lavender; her old form shakes a little, a burst of feathers and sparks, and her new
   form pops in larger, with a tap of haptics; a stamp with the stage's name and the day lands under
   her; she says one line; one glad key closes it. About two seconds in all.

   Drawn over the tabs (a sibling of <Tabs>, as IdentityNote), in React Native so it reaches every
   binary by an update over the air. Her forms are WrenBird at the stage, wearing nothing, so the
   change reads. Reduce Motion: the new form, the stamp and the line simply fade in. VoiceOver hears
   her line when it shows. `preview` (dev only) plays a given moment without checking anything.

   SWIFT OR REACT NATIVE (2026-10-27; "growthmoment" in app_surfaces, off by default). When it
   shows is decided here either way. With the switch on and the binary carrying KGrowthMomentView,
   SwiftUI draws the scene (components/GrowthMomentNative: her two forms are snapshots of the real
   WrenBird, lib/bird-images); otherwise — the switch off, an older binary, a JS error on the Swift
   path, a crash there on the last two launches, or her pictures not ready in time — the React
   Native scene below, exactly as before. Both play lib/growth-moment-core's clock. */

let Haptics: typeof import("expo-haptics") | null = null;
try {
  Haptics = require("expo-haptics");
} catch {}

/** how often the check may run (it reads the counts): on mount, then on returning to the app */
const CHECK_EVERY_MS = 30_000;

export function GrowthMoment({ preview = null, onClose }: { preview?: Moment | null; onClose?: () => void }) {
  useLang();
  const { user } = useAuth();
  const [moment, setMoment] = useState<Moment | null>(preview);
  const lastCheck = useRef(0);

  const check = useCallback(() => {
    if (preview || !user) return;
    if (Date.now() - lastCheck.current < CHECK_EVERY_MS) return;
    lastCheck.current = Date.now();
    void checkGrowth(user.created_at).then((m) => {
      if (m) setMoment(m);
    });
  }, [preview, user]);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") check();
    });
    return () => sub.remove();
  }, [check]);

  useEffect(() => {
    if (preview) setMoment(preview);
  }, [preview]);

  if (!moment) return null;
  const close = () => {
    setMoment(null);
    onClose?.();
  };
  const rn = () => <Scene moment={moment} onClose={close} />;
  return (
    <Modal transparent animationType="none" visible onRequestClose={close} statusBarTranslucent>
      {/* keyed by the moment, so a different one always plays from its start */}
      <NativeSurface
        key={`${moment.from}-${moment.to}`}
        surface="growthmoment"
        view="KGrowthMomentView"
        mode="mount"
        native={() => <GrowthMomentSwift moment={moment} onClose={close} fallback={rn} />}
        fallback={rn}
        // nothing for the frame or two the phone's answers take: the ground fades in with the scene
        pending={() => null}
      />
    </Modal>
  );
}

/** The React Native scene, as it shipped. */
function Scene({ moment, onClose }: { moment: Moment; onClose: () => void }) {
  const { t: tk } = useTheme();
  const wrenFace = useLetterFamily(true);
  const reduce = useReducedMotion();
  const { line, mark } = growthWords(moment, t, noteDay(new Date()));

  const ground = useSharedValue(0);
  const shake = useSharedValue(0);
  const oldOut = useSharedValue(0);
  const pop = useSharedValue(0);
  const burst = useSharedValue(0);
  const stamp = useSharedValue(0);
  const words = useSharedValue(0);
  const bob = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(line);
    const B = GROWTH_BEATS;
    if (reduce) {
      ground.value = withTiming(1, { duration: B.groundStill });
      oldOut.value = 1;
      pop.value = withTiming(1, { duration: B.still });
      stamp.value = withTiming(1, { duration: B.still });
      words.value = withTiming(1, { duration: B.still });
      return;
    }
    ground.value = withTiming(1, { duration: B.ground });
    // the old form shakes, then gives way
    shake.value = withDelay(B.shakeAt, withSequence(...GROWTH_SHAKE.map((x) => withTiming(x, { duration: B.shakeStep, easing: Easing.linear }))));
    oldOut.value = withDelay(B.outAt, withTiming(1, { duration: B.outMs }));
    burst.value = withDelay(B.burstAt, withTiming(1, { duration: B.burstMs, easing: Easing.bezier(...GROWTH_CURVES.burst) }));
    pop.value = withDelay(B.popAt, withTiming(1, { duration: B.popMs, easing: Easing.bezier(...GROWTH_CURVES.pop) }));
    const tap = setTimeout(() => {
      try {
        void Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }, B.hapticAt);
    stamp.value = withDelay(B.stampAt, withTiming(1, { duration: B.stampMs, easing: Easing.bezier(...GROWTH_CURVES.stamp) }));
    words.value = withDelay(B.wordsAt, withTiming(1, { duration: B.wordsMs }));
    bob.value = withDelay(B.bobAt, withRepeat(withSequence(withTiming(-B.bobBy, { duration: B.bobMs }), withTiming(0, { duration: B.bobMs })), -1));
    return () => clearTimeout(tap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groundStyle = useAnimatedStyle(() => ({ opacity: ground.value }));
  const oldStyle = useAnimatedStyle(() => ({
    opacity: 1 - oldOut.value,
    transform: [{ translateX: shake.value }, { scale: 1 + oldOut.value * 0.25 }],
  }));
  const newStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.6),
    transform: [{ translateY: bob.value }, { scale: 0.6 + pop.value * 0.4 }],
  }));
  const stampStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, stamp.value * 2),
    transform: [{ rotate: "-6deg" }, { scale: 1.6 - stamp.value * 0.6 }],
  }));
  const wordsStyle = useAnimatedStyle(() => ({ opacity: words.value, transform: [{ translateY: (1 - words.value) * 6 }] }));

  return (
    <View accessibilityViewIsModal style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: tk.lav2 }, groundStyle]} />
      <View style={{ width: 280, height: 250, alignItems: "center", justifyContent: "flex-end" }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {!reduce && Array.from({ length: GROWTH_BURST }, (_, i) => <Bit key={i} i={i} burst={burst} />)}
        <Animated.View style={[{ position: "absolute", bottom: 0 }, oldStyle]}>
          <WrenBird size={GROWTH_SIZE[moment.from]} stage={moment.from} mood="content" accessory="none" />
        </Animated.View>
        <Animated.View style={[{ position: "absolute", bottom: 0 }, newStyle]}>
          <WrenBird size={GROWTH_SIZE[moment.to]} stage={moment.to} mood="delight" accessory="none" />
        </Animated.View>
      </View>
      <Animated.View style={[{ marginTop: 22, borderWidth: 2, borderColor: tk.ind, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }, stampStyle]}>
        <Text style={{ ...PFM.monoSemi, fontSize: 10, letterSpacing: 1.6, color: tk.ind }}>{mark}</Text>
      </Animated.View>
      <Animated.Text style={[{ ...wrenFace, fontSize: 19, lineHeight: 26, color: tk.sub, textAlign: "center", marginTop: 22, paddingHorizontal: 36 }, wordsStyle]}>
        {`“${line}”`}
      </Animated.Text>
      <Animated.View style={[{ position: "absolute", bottom: 56, left: 32, right: 32 }, wordsStyle]}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => ({ height: 52, borderRadius: 26, backgroundColor: tk.ind, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 })}
        >
          <Text style={{ fontSize: 17, fontWeight: "600", color: "#FFFFFF" }}>{t("grow.ok")}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/** One piece of the burst: a lilac feather or a gold spark, flying out from her middle. */
function Bit({ i, burst }: { i: number; burst: SharedValue<number> }) {
  const angle = (i / GROWTH_BURST) * Math.PI * 2;
  const reach = 90 + (i % 4) * 22;
  const spark = i % 3 === 0;
  const style = useAnimatedStyle(() => ({
    opacity: burst.value === 0 ? 0 : 1 - burst.value,
    transform: [
      { translateX: Math.cos(angle) * reach * burst.value },
      { translateY: Math.sin(angle) * reach * burst.value + 30 * burst.value },
      { rotate: `${i * 40 * burst.value}deg` },
      { scale: 0.4 + burst.value * 0.6 },
    ],
  }));
  return (
    <Animated.View
      style={[
        { position: "absolute", left: 140 - 5, top: 125, width: spark ? 9 : 10, height: spark ? 9 : 16, borderRadius: spark ? 2 : 6, backgroundColor: spark ? "#F2C14E" : "#B9A8FF" },
        style,
      ]}
    />
  );
}
