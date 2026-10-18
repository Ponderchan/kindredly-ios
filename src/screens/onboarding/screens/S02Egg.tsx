import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, FadeInDown, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Ellipse } from "react-native-svg";
import { EGG_SHELLS } from "../../../components/EggShell";
import { t } from "../../../lib/i18n";
import { Headline, Line, ScreenFrame } from "../parts/frame";
import * as haptics from "../parts/haptics";
import { AcidKey } from "../parts/keys";
import { EggArt, WarmthGlow } from "../parts/nest-egg";
import { EDGE, OB, TYPE } from "../parts/tokens";
import type { ObScreenProps } from "../types";
import { heroRect, nestEggRect, takeDoorstepEgg } from "./s01-geometry";
import "../../../data/strings-onboarding2";
import { OB_MAX_FONT } from "../parts/tokens";

/* 2 · YOUR EGG (storyboard §6 · 2): "This one's yours."
   ────────────────────────────────────────────────────────────────────────
   The egg as the hero — white with its gold warmth glowing inside, a soft
   shadow on the ground under it, its voice line ("something's in here.")
   — and four shells under it as small eggs with their names in mono,
   MOONSTONE · SAGE · DUSK · CLAY. A tap on a shell, or a swipe across the
   egg, ROLLS the egg into the new shell: it comes in from the side of the
   shell you moved toward and turns as it travels (rotation = distance ÷
   radius, the old screen's roll made honest), and the birthmark leaf on its
   crown takes the new colour. What's inside isn't chosen here: the bird is
   written (screen 7), the shell only leaves a birthmark. `set({ shell })`.

   ONE EGG FROM 1 TO 3. The hero's place is s01-geometry heroRect, which the
   doorstep also computes, so the egg it rolls off its dot and grows lands
   exactly here (takeDoorstepEgg: then this screen doesn't animate the egg
   in again, only the words rise). Coming back from 3, the egg grows down out
   of the nest instead. "It's mine": the egg hops (the old screen's kick)
   and shrinks up into the nest the runner draws on 3 (nestEggRect: the same
   box), the rest falls away, and the run goes on. Reduce Motion: no roll,
   no hop, no flight; the egg simply changes shell, and the key goes on. */

export default function S02Egg(props: ObScreenProps) {
  const { width: sw, height: sh } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const hero = useMemo(() => heroRect(sw, sh, { top: insets.top, bottom: insets.bottom }), [sw, sh, insets.top, insets.bottom]);
  const nest = nestEggRect(sw, { top: insets.top, bottom: insets.bottom });
  const H = hero.size;
  const shell = props.draft.shell;
  const [fromDoor] = useState(takeDoorstepEgg);

  /* the roll: an offset in points that eases back to 0; the egg turns by offset ÷ radius */
  const roll = useSharedValue(0);
  const radius = H * 0.33;
  const pick = (i: number) => {
    if (i === shell || i < 0 || i >= EGG_SHELLS.length) return;
    haptics.tick();
    if (!reduce) {
      roll.value = (i - shell) * 52;
      roll.value = withTiming(0, { duration: 650, easing: Easing.out(Easing.cubic) });
    }
    props.set({ shell: i });
  };
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const shellRef = useRef(shell);
  shellRef.current = shell;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderRelease: (_e, g) => {
          if (g.dx < -36) pickRef.current(shellRef.current + 1);
          else if (g.dx > 36) pickRef.current(shellRef.current - 1);
        },
      }),
    [],
  );

  /* arriving: from the doorstep the egg is already here; from 3 (or a jump) it grows down out of the nest */
  const come = useSharedValue(fromDoor || reduce ? 1 : 0);
  useEffect(() => {
    if (fromDoor || reduce) return;
    come.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.back(1.2)) });
  }, [fromDoor, reduce, come]);

  /* leaving: the hop, then up into the nest */
  const go = useSharedValue(0);
  const hop = useSharedValue(0);
  const leaving = useRef(false);
  const onMine = () => {
    if (leaving.current) return;
    leaving.current = true;
    if (reduce) {
      props.advance();
      return;
    }
    haptics.pip();
    hop.value = withSequence(withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 140, easing: Easing.in(Easing.quad) }));
    go.value = withTiming(1, { duration: 520, easing: Easing.inOut(Easing.cubic) }, (fin) => {
      if (fin) runOnJS(props.advance)();
    });
  };

  const dyNest = nest.y + nest.size / 2 - (hero.y + H / 2);
  const sNest = nest.size / H;
  const eggStyle = useAnimatedStyle(() => {
    const c = come.value;
    const g = Math.max(0, Math.min(1, (go.value - 0.15) / 0.85));
    const into = 1 - c + g; // 0 = the hero, 1 = the nest
    return {
      transform: [
        { translateX: roll.value },
        { translateY: dyNest * into - 14 * hop.value },
        { scale: 1 + (sNest - 1) * into },
        { scaleX: 1 + 0.06 * hop.value },
        { scaleY: 1 - 0.05 * hop.value },
        { rotate: `${(roll.value / radius) * (180 / Math.PI)}deg` },
      ],
    };
  });
  const glowStyle = useAnimatedStyle(() => ({ opacity: 1 - go.value }));
  const restStyle = useAnimatedStyle(() => ({ opacity: 1 - go.value, transform: [{ translateY: 14 * go.value }] }));

  return (
    <ScreenFrame ground="blue" back={props.back} primary={<AcidKey label={t("ob2.egg.key")} onPress={onMine} />}>
      <View style={{ marginTop: hero.offset, alignItems: "center" }}>
        {/* the hero: the warmth behind, the shadow under, the egg */}
        <View style={{ width: H, height: H }} {...pan.panHandlers}>
          <Animated.View pointerEvents="none" style={[{ position: "absolute", left: -H * 0.25, top: -H * 0.25 }, glowStyle]}>
            <WarmthGlow size={H * 1.5} heat={0} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0 }, glowStyle]}>
            <Svg width={H} height={H} viewBox="-110 -110 220 220">
              <Ellipse cx={0} cy={101} rx={58} ry={7} fill={OB.ink} opacity={0.22} />
            </Svg>
          </Animated.View>
          <Animated.View style={eggStyle} accessible accessibilityRole="image" accessibilityLabel={t("ob2.egg.shellA11y", { name: EGG_SHELLS[shell]?.name ?? "" })}>
            <EggArt shell={shell} size={H} gid="ob2-hero-egg" />
          </Animated.View>
        </View>

        <Animated.View style={[{ alignItems: "center", alignSelf: "stretch" }, restStyle]}>
          <Text maxFontSizeMultiplier={OB_MAX_FONT} style={[TYPE.voice, { color: OB.white, marginTop: 6, height: 22, textAlignVertical: "center" }]}>{t("ob2.voice.egg")}</Text>
          <Animated.View entering={fromDoor ? FadeInDown.delay(60).duration(360) : undefined} style={{ alignSelf: "stretch", marginTop: 8 }}>
            <Headline>{t("ob2.egg.head")}</Headline>
            <Line small>{t("ob2.egg.line")}</Line>
          </Animated.View>

          {/* the four shells */}
          <Animated.View entering={fromDoor ? FadeInDown.delay(140).duration(360) : undefined} style={{ flexDirection: "row", alignSelf: "stretch", gap: 10, marginTop: 20 }}>
            {EGG_SHELLS.map((s, i) => {
              const on = i === shell;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => pick(i)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={t("ob2.egg.shellA11y", { name: s.name })}
                  style={{ flex: 1, alignItems: "center" }}
                >
                  <View style={{ alignSelf: "stretch", height: 70 }}>
                    {on && <View style={{ position: "absolute", left: 3, top: 3, right: -3, bottom: -3, borderRadius: 16, backgroundColor: OB.ink }} />}
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 16,
                        borderWidth: on ? EDGE : 2,
                        borderColor: on ? OB.ink : OB.white,
                        backgroundColor: on ? OB.paper : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <EggArt shell={i} size={50} gid={`ob2-shell-${s.id}`} />
                    </View>
                  </View>
                  <Text maxFontSizeMultiplier={OB_MAX_FONT} numberOfLines={1} style={[TYPE.label, { color: OB.white, marginTop: 8, fontSize: 9.5, letterSpacing: 1.2 }]}>
                    {s.name.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </Animated.View>
        </Animated.View>
      </View>
    </ScreenFrame>
  );
}
