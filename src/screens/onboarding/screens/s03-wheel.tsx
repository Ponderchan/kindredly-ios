import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as haptics from "../parts/haptics";
import { FONT, OB } from "../parts/tokens";
import { OB_MAX_FONT } from "../parts/tokens";

/* THE BIRTHDAY WHEEL'S COLUMNS, ON THE RUN'S PAPER (storyboard §6 · 3).
   ────────────────────────────────────────────────────────────────────────
   components/Wheel, the old onboarding's scroll-snap column, re-inked for
   the new run: it took the theme's card face and mute (a Peach or Midnight
   theme would have tinted the birthday card), and here the card is the
   run's own white paper with ink type, like every paper object on the blue.
   The selected row is Inter Bold in ink and the rest Inter Medium in a quiet
   ink; the fades at the top and bottom are the paper itself, so a column
   has no well of its own. The selection band is ruled once across the three
   columns by the caller, so a date reads as one field.

   What it adds to the old column: the row under the band is highlighted
   WHILE it spins (not only once it stops), each row passing the band is a
   selection tick (parts/haptics tick), a drag that stops without momentum
   still reports, and a value changed from outside (the day clamped from 31
   to 30 when the month turns to April) moves the column to it. VoiceOver
   gets each column as one adjustable element (swipe up / down). */

export const ROW = 44;

export function PaperWheel({
  items,
  value,
  onChange,
  rows = 5,
  label,
}: {
  items: (string | number)[];
  value: number;
  onChange: (i: number) => void;
  /** visible rows (odd): 5, or 3 on a short phone */
  rows?: number;
  /** VoiceOver: what the column is ("Month") */
  label: string;
}) {
  const ref = useRef<ScrollView>(null);
  const placed = useRef(false);
  const [live, setLive] = useState(value);
  const liveRef = useRef(value);
  const pad = ((rows - 1) / 2) * ROW;

  const seat = () => {
    if (placed.current) return;
    placed.current = true;
    ref.current?.scrollTo({ y: value * ROW, animated: false });
  };
  /* moved from outside (a clamp, a reset): follow it */
  useEffect(() => {
    if (!placed.current || value === liveRef.current) return;
    liveRef.current = value;
    setLive(value);
    ref.current?.scrollTo({ y: value * ROW, animated: true });
  }, [value]);

  const at = (e: NativeSyntheticEvent<NativeScrollEvent>) => Math.max(0, Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.y / ROW)));
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = at(e);
    if (i !== liveRef.current) {
      liveRef.current = i;
      setLive(i);
      haptics.tick();
    }
  };
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = at(e);
    if (i !== value) onChange(i);
  };

  return (
    <View
      style={{ flex: 1, height: ROW * rows }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: String(items[value] ?? "") }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => {
        const next = e.nativeEvent.actionName === "increment" ? value + 1 : value - 1;
        if (next >= 0 && next < items.length) onChange(next);
      }}
    >
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW}
        snapToAlignment="start"
        disableIntervalMomentum
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onContentSizeChange={seat}
        onLayout={seat}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={(e) => {
          // a drag released with no fling may not produce momentum events: report it too
          if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) settle(e);
        }}
        contentContainerStyle={{ paddingVertical: pad }}
      >
        {items.map((it, i) => (
          <View key={i} style={{ height: ROW, alignItems: "center", justifyContent: "center" }}>
            <Text maxFontSizeMultiplier={OB_MAX_FONT} style={{ fontFamily: i === live ? FONT.bold : FONT.medium, fontSize: i === live ? 19 : 16, color: i === live ? OB.ink : "#A9A6BF", letterSpacing: -0.2 }}>{it}</Text>
          </View>
        ))}
      </ScrollView>
      <LinearGradient pointerEvents="none" colors={[OB.paper, "#FFFFFF00"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: ROW * (rows > 3 ? 1.6 : 0.8) }} />
      <LinearGradient pointerEvents="none" colors={["#FFFFFF00", OB.paper]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: ROW * (rows > 3 ? 1.6 : 0.8) }} />
    </View>
  );
}
