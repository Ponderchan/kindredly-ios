import { useRef } from "react";
import { ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PFM } from "../theme/post";
import { useTheme } from "../lib/theme";

/* A scroll-snap picker column.
   The type is mono because a date is something the machine reads back to you,
   not something you wrote — and the fade at the top and bottom is paper, not
   the old cream, so the column dissolves into the page it sits on rather than
   sitting in a tinted well of its own. The paper is the theme's card face
   (the birthday's panel is a card), and the fade runs to that same colour
   at no opacity, so a dark theme doesn't fade through grey.

   The selection band is deliberately NOT drawn here: the caller rules it once
   across all its columns, so a date reads as one field instead of three. */
export const WHEEL_ROW = 44;
const H = WHEEL_ROW;

export function Wheel({
  items,
  value,
  onChange,
  width,
}: {
  items: (string | number)[];
  value: number;
  onChange: (i: number) => void;
  width?: number;
}) {
  const { t: tk } = useTheme();
  const clear = `${tk.sf}00`; // the card face at no opacity (#RRGGBBAA)
  const ref = useRef<ScrollView>(null);
  const placed = useRef(false);

  /* Seat the column on its starting row from onContentSizeChange, not from a
     timeout. Columns of different lengths (12 months, 31 days, 80 years) finish
     laying out at different moments, and a scrollTo fired before the content
     exists is silently clamped — which left one column sitting half a row off
     its neighbours. */
  const seat = () => {
    if (placed.current) return;
    placed.current = true;
    ref.current?.scrollTo({ y: value * H, animated: false });
  };

  return (
    <View style={width == null ? { flex: 1, height: H * 5 } : { width, height: H * 5 }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={H}
        snapToAlignment="start"
        disableIntervalMomentum
        decelerationRate="fast"
        onContentSizeChange={seat}
        onLayout={seat}
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
                ...(i === value ? PFM.monoSemi : PFM.mono),
                fontSize: i === value ? 18 : 15,
                letterSpacing: i === value ? 0.6 : 0.4,
                color: i === value ? tk.ink : tk.mute,
              }}
            >
              {it}
            </Text>
          </View>
        ))}
      </ScrollView>
      {/* fade mask top/bottom — paper, so the column has no well of its own */}
      <LinearGradient
        colors={[tk.sf, clear]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: H * 1.6 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[clear, tk.sf]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: H * 1.6 }}
        pointerEvents="none"
      />
    </View>
  );
}
