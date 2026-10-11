import { useEffect, useState } from "react";
import { Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useIsFocused, useRouter } from "expo-router";
import { GUIDE_HREF, reelOf } from "./guide-reel";
import { GUIDE_BY_ID, type GuideId } from "../data/guides";
import { P, PF } from "../theme/post";
import { t, useLang } from "../lib/i18n";
import { useWrenName } from "../lib/wren-name";

/* A GUIDE, IN THE TRANSCRIPT — a big card that plays itself (owner,
   2026-10-11, after WhatsApp's channel cards: "大的清楚的动态演示"). On top a
   square reel: a few scenes, each a moving picture built from the
   product's own parts at full size, with a thin bar per scene showing
   where it is; tap the square to start it over. Under it the guide's title,
   the three lines it used to page through read as one paragraph, and a
   button to the place it just explained. The reel only runs while the
   room is on screen. */
export function GuideCard({ guide, onNotIt }: { guide: GuideId; onNotIt?: () => void }) {
  useLang();
  const wren = useWrenName();
  const router = useRouter();
  const g = GUIDE_BY_ID[guide];
  const reel = reelOf(guide);
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
  const s = Math.min(w, 360);
  const body = g.frames.map((_, n) => t(`gd.${guide}.f${n + 1}`, { wren })).join(" ");
  return (
    <View style={{ marginTop: 6, marginBottom: 8 }}>
      <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ maxWidth: 360, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: P.ink12, overflow: "hidden" }}>
        {s > 0 && (
          <Pressable onPress={restart} accessibilityRole="button" accessibilityLabel={t(`gd.${guide}.title`)} style={{ width: s, height: s, backgroundColor: reel.bg, overflow: "hidden" }}>
            <Animated.View key={`${scene.key}-${run}-${i}`} entering={FadeIn.duration(260)} exiting={FadeOut.duration(200)} style={{ position: "absolute", left: 0, top: 0, width: s, height: s }}>
              {scene.render(s)}
            </Animated.View>
            {/* a bar per scene, like a story's — where the reel is */}
            <View pointerEvents="none" style={{ position: "absolute", left: 10, right: 10, top: 10, flexDirection: "row", gap: 4 }}>
              {reel.scenes.map((sc, n) => (
                <Seg key={`${sc.key}-${run}`} state={n < i ? "done" : n === i ? "now" : "todo"} ms={sc.ms} play={focused} />
              ))}
            </View>
          </Pressable>
        )}
        <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, gap: 6 }}>
          <Text style={{ fontFamily: PF.letter, fontSize: 17, fontWeight: "700", color: P.ink }}>{t(`gd.${guide}.title`)}</Text>
          <Text style={{ fontFamily: PF.letter, fontSize: 15, lineHeight: 21, color: P.ink60 }}>{body}</Text>
        </View>
        <Pressable
          onPress={() => router.push(GUIDE_HREF[guide] as never)}
          accessibilityRole="button"
          style={({ pressed }) => ({ borderTopWidth: 1, borderTopColor: P.ink12, paddingVertical: 12, alignItems: "center", backgroundColor: pressed ? "#F6F5FB" : "#FFFFFF" })}
        >
          <Text style={{ fontFamily: PF.letter, fontSize: 15, fontWeight: "600", color: P.pen }}>{t(`gd.${guide}.cta`)}</Text>
        </Pressable>
      </View>
      {onNotIt && (
        <Pressable onPress={onNotIt} hitSlop={6} style={{ marginTop: 8, alignSelf: "flex-start" }}>
          <Text style={{ fontFamily: PF.mono, fontSize: 10.5, letterSpacing: 0.6, color: P.ink40 }}>
            {t("gd.notIt")} <Text style={{ color: P.pen, fontFamily: PF.monoSemi }}>{t("gd.sendOn")} ›</Text>
          </Text>
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

/* the row of chips under the transcript — how the guides are found
   without typing */
export function GuideChips({ ids, onPick, more, onMore }: { ids: GuideId[]; onPick: (g: GuideId) => void; more?: boolean; onMore?: () => void }) {
  useLang();
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={{ fontFamily: PF.monoMed, fontSize: 9, letterSpacing: 1.3, color: P.ink40, marginBottom: 8 }}>{t("gd.chips.head")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {ids.map((id) => (
          <Pressable key={id} onPress={() => onPick(id)} style={({ pressed }) => ({ borderWidth: 1.5, borderColor: P.pen, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: P.penWash, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1, color: P.pen }}>{t(`gd.${id}.title`).toUpperCase()}</Text>
          </Pressable>
        ))}
        {more && onMore && (
          <Pressable onPress={onMore} style={({ pressed }) => ({ borderWidth: 1.5, borderColor: P.ink12, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, letterSpacing: 1, color: P.ink60 }}>{t("gd.chips.more")}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
