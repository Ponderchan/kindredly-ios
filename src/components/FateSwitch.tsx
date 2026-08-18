import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { P, PF } from "../theme/post";

/* The fate switch.

   One small physical control instead of a label plus two buttons. A thought is
   headed somewhere, and the knob shows where — you flip it, you don't pick from
   a list. Seal on the left, drift on the right.

   The right half stays shut until Wren has noticed something (the 40-character
   floor). Not to punish anyone — a thought that's three words long genuinely
   hasn't got anywhere to go yet, and showing the option greyed is more honest
   than showing it live and refusing. */

const W = 76;
const H = 34;
const KNOB = 27;

export function FateSwitch({
  fate,
  canDrift,
  onChange,
}: {
  fate: "seal" | "drift";
  canDrift: boolean;
  onChange: (f: "seal" | "drift") => void;
}) {
  const x = useSharedValue(fate === "drift" ? 1 : 0);
  useEffect(() => {
    x.value = withSpring(fate === "drift" ? 1 : 0, { damping: 15, stiffness: 180 });
  }, [fate, x]);

  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * (W - KNOB - 6) }],
  }));
  const track = useAnimatedStyle(() => ({
    backgroundColor: x.value > 0.5 ? P.penWash : "transparent",
    borderColor: x.value > 0.5 ? P.pen : P.ink,
  }));

  return (
    <Pressable
      onPress={() => onChange(fate === "drift" ? "seal" : "drift")}
      disabled={fate === "seal" && !canDrift}
      hitSlop={10}
      style={{ alignItems: "center", gap: 5 }}
    >
      <Animated.View
        style={[
          { width: W, height: H, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 3 },
          track,
        ]}
      >
        {/* the two ends, always visible so the switch reads as a direction */}
        <View style={{ position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "space-around", alignItems: "center" }}>
          <SealGlyph color={fate === "seal" ? "transparent" : P.ink40} />
          <DriftGlyph color={fate === "drift" ? "transparent" : canDrift ? P.ink40 : P.ink12} />
        </View>

        <Animated.View
          style={[
            {
              width: KNOB,
              height: KNOB - 1,
              backgroundColor: fate === "drift" ? P.pen : P.ink,
              alignItems: "center",
              justifyContent: "center",
            },
            knob,
          ]}
        >
          {fate === "drift" ? <DriftGlyph color="#fff" /> : <SealGlyph color={P.paper} />}
        </Animated.View>
      </Animated.View>

      <Text style={{ fontFamily: PF.mono, fontSize: 9, letterSpacing: 1.2, color: fate === "drift" ? P.pen : P.ink40 }}>
        {fate === "drift" ? "DRIFTING" : "WITH ME"}
      </Text>
    </Pressable>
  );
}

/* closed — a sealed disc */
function SealGlyph({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={7.5} fill="none" stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={12} r={2.4} fill={color} />
    </Svg>
  );
}

/* open — a wing leaving */
function DriftGlyph({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24">
      <Path d="M3 15c5 1 9-1 11-5" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M14 10l4-3-1 5 4-1" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
