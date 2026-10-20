import { useState } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { LaunchAnimation, POST_BLUE } from "../components/LaunchAnimation";
import { PFM } from "../theme/post";

/* dev only — the launch, replayed without restarting the app.
   kindredly:///launch-preview?mode=full|short|still[&hold=1]
   hold=1 starts HOLDING (the session "not known yet"), so the piece rests on
   its last frame — the frame the new onboarding's screen 1 continues. */
export default function LaunchPreview() {
  const router = useRouter();
  const { mode: m, hold } = useLocalSearchParams<{ mode?: string; hold?: string }>();
  const [mode, setMode] = useState<"full" | "short" | "still">(m === "short" || m === "still" ? m : "full");
  const [run, setRun] = useState(0);
  const [ready, setReady] = useState(hold !== "1");
  const [done, setDone] = useState(false);
  if (!__DEV__) return <Redirect href="/" />;
  const again = (next: typeof mode) => {
    setMode(next);
    setDone(false);
    setRun((n) => n + 1);
  };
  return (
    <View style={{ flex: 1, backgroundColor: POST_BLUE /* the splash's ground (was the lavender #ECECFE) */ }}>
      {!done && <LaunchAnimation key={`${mode}-${run}`} force={mode} ready={ready} onDone={() => setDone(true)} />}
      <View style={{ position: "absolute", left: 16, right: 16, bottom: 40, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(["full", "short", "still"] as const).map((x) => (
          <Pressable key={x} onPress={() => again(x)} style={{ backgroundColor: mode === x ? "#1E1B35" : "#FFFFFF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ ...PFM.monoSemi, fontSize: 10, color: mode === x ? "#FFFFFF" : "#1E1B35" }}>{x.toUpperCase()}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setReady((v) => !v)} style={{ backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ ...PFM.monoSemi, fontSize: 10, color: "#1E1B35" }}>{ready ? "READY" : "HOLDING"}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ ...PFM.monoSemi, fontSize: 10, color: "#1E1B35" }}>CLOSE</Text>
        </Pressable>
      </View>
    </View>
  );
}
