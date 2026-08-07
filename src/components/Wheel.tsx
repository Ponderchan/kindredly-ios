import { useEffect, useRef } from "react";
import { ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { C, F } from "../theme/tokens";

/* iOS-style scroll-snap picker column (v20 Wheel, 497-519). */
const H = 44;

export function Wheel({
  items,
  value,
  onChange,
  width,
}: {
  items: (string | number)[];
  value: number;
  onChange: (i: number) => void;
  width: number;
}) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollTo({ y: value * H, animated: false }), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ width, height: H * 5 }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: H * 2 }}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.y / H);
          if (i !== value && i >= 0 && i < items.length) onChange(i);
        }}
      >
        {items.map((it, i) => (
          <View key={i} style={{ height: H, alignItems: "center", justifyContent: "center" }}>
            <Text
              style={{
                fontFamily: F.serif,
                fontSize: i === value ? 24 : 19,
                color: i === value ? C.ink : C.faint,
                opacity: i === value ? 1 : 0.55,
              }}
            >
              {it}
            </Text>
          </View>
        ))}
      </ScrollView>
      {/* fade mask top/bottom */}
      <LinearGradient
        colors={[C.cream, "rgba(251,249,243,0)"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: H * 1.6 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["rgba(251,249,243,0)", C.cream]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: H * 1.6 }}
        pointerEvents="none"
      />
    </View>
  );
}
