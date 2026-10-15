import { useEffect, useState } from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useIsFocused } from "expo-router";
import type { Reel } from "./guide-reel/kit";

/* A REEL, PLAYING — the square every moving card in Wren's room is built
   on (a guide's, and since 1.2.3 a release's own "what's new"). Scenes play
   one after another with a thin bar per scene, like a story's; a tap starts
   it over; it only runs while the room is on screen. Lifted out of
   GuideCard unchanged so both cards play the same way. */
export function ReelSquare({ reel, label, max = 360 }: { reel: Reel; label: string; max?: number }) {
  const [w, setW] = useState(0);
  const [i, setI] = useState(0);
  const [run, setRun] = useState(0); // bumps to restart the reel from the top
  const focused = useIsFocused();
  const scene = reel.scenes[i % reel.scenes.length];
  useEffect(() => {
    if (!focused || !w) return;
    const id = setTimeout(() => setI((n) => (n + 1) % reel.scenes.length), scene.ms);
    return () => clearTimeout(id);
  }, [i, run, focused, w, scene.ms, reel.scenes.length]);
  const restart = () => {
    setI(0);
    setRun((r) => r + 1);
  };
  const s = Math.min(w, max);
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
      {s > 0 && (
        <Pressable onPress={restart} accessibilityRole="button" accessibilityLabel={label} style={{ width: s, height: s, backgroundColor: reel.bg, overflow: "hidden" }}>
          <Animated.View key={`${scene.key}-${run}-${i}`} entering={FadeIn.duration(260)} exiting={FadeOut.duration(200)} style={{ position: "absolute", left: 0, top: 0, width: s, height: s }}>
            {scene.render(s)}
          </Animated.View>
          <View pointerEvents="none" style={{ position: "absolute", left: 10, right: 10, top: 10, flexDirection: "row", gap: 4 }}>
            {reel.scenes.map((sc, n) => (
              <Seg key={`${sc.key}-${run}`} state={n < i ? "done" : n === i ? "now" : "todo"} ms={sc.ms} play={focused} />
            ))}
          </View>
        </Pressable>
      )}
    </View>
  );
}

function Seg({ state, ms, play }: { state: "done" | "now" | "todo"; ms: number; play: boolean }) {
  const v = useSharedValue(state === "done" ? 1 : 0);
  useEffect(() => {
    if (state === "now" && play) v.value = withTiming(1, { duration: ms, easing: Easing.linear });
    else v.value = state === "done" ? 1 : 0;
  }, [state, ms, play, v]);
  const fill = useAnimatedStyle(() => ({ width: `${v.value * 100}%` }));
  return (
    <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(17,17,19,0.14)", overflow: "hidden" }}>
      <Animated.View style={[{ height: 3, backgroundColor: "rgba(17,17,19,0.55)" }, fill]} />
    </View>
  );
}
