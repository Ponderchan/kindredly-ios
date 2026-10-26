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
import { WrenBird, type WrenStage } from "./WrenBird";
import { useAuth } from "../lib/auth";
import { checkGrowth } from "../lib/growth-moment";
import type { GrowthMoment as Moment } from "../lib/growth-moment-core";
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
   her line when it shows. `preview` (dev only) plays a given moment without checking anything. */

let Haptics: typeof import("expo-haptics") | null = null;
try {
  Haptics = require("expo-haptics");
} catch {}

const SIZE: Record<WrenStage, number> = { egg: 160, hatch: 160, fledge: 190, wren: 230 };
/** how often the check may run (it reads the counts): on mount, then on returning to the app */
const CHECK_EVERY_MS = 30_000;
const BURST = 14;

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
  return (
    <Modal transparent animationType="none" visible onRequestClose={close} statusBarTranslucent>
      <Scene moment={moment} onClose={close} />
    </Modal>
  );
}

function Scene({ moment, onClose }: { moment: Moment; onClose: () => void }) {
  const { t: tk } = useTheme();
  const wrenFace = useLetterFamily(true);
  const reduce = useReducedMotion();
  const line = t(moment.to === "wren" ? "grow.line.wren" : "grow.line.fledge");
  const stage = t(moment.to === "wren" ? "wren.name.grown" : "wren.name.fledge");
  const mark = `${stage} · ${noteDay(new Date())}`.toUpperCase();

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
    if (reduce) {
      ground.value = withTiming(1, { duration: 250 });
      oldOut.value = 1;
      pop.value = withTiming(1, { duration: 300 });
      stamp.value = withTiming(1, { duration: 300 });
      words.value = withTiming(1, { duration: 300 });
      return;
    }
    ground.value = withTiming(1, { duration: 300 });
    // the old form shakes, then gives way
    shake.value = withDelay(
      450,
      withSequence(...[-6, 6, -5, 5, -3, 0].map((x) => withTiming(x, { duration: 110, easing: Easing.linear }))),
    );
    oldOut.value = withDelay(1150, withTiming(1, { duration: 220 }));
    burst.value = withDelay(1150, withTiming(1, { duration: 900, easing: Easing.bezier(0.2, 0.8, 0.3, 1) }));
    pop.value = withDelay(1270, withTiming(1, { duration: 520, easing: Easing.bezier(0.3, 1.4, 0.5, 1) }));
    const tap = setTimeout(() => {
      try {
        void Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }, 1300);
    stamp.value = withDelay(1850, withTiming(1, { duration: 360, easing: Easing.bezier(0.5, 0, 0.6, 1.4) }));
    words.value = withDelay(2150, withTiming(1, { duration: 300 }));
    bob.value = withDelay(2500, withRepeat(withSequence(withTiming(-5, { duration: 1200 }), withTiming(0, { duration: 1200 })), -1));
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
        {!reduce && Array.from({ length: BURST }, (_, i) => <Bit key={i} i={i} burst={burst} />)}
        <Animated.View style={[{ position: "absolute", bottom: 0 }, oldStyle]}>
          <WrenBird size={SIZE[moment.from]} stage={moment.from} mood="content" accessory="none" />
        </Animated.View>
        <Animated.View style={[{ position: "absolute", bottom: 0 }, newStyle]}>
          <WrenBird size={SIZE[moment.to]} stage={moment.to} mood="delight" accessory="none" />
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
  const angle = (i / BURST) * Math.PI * 2;
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
