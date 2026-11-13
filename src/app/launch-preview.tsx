import { useEffect, useState } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { COBALT, LaunchAnimation, POST_BLUE, launchEnvelope } from "../components/LaunchAnimation";
import { setDevSurfaceOverride, useNativeSurface } from "../lib/surfaces";
import { PFM } from "../theme/post";

/* dev only — the launch, replayed without restarting the app.
   kindredly:///launch-preview?mode=full|short|still[&hold=1][&swift=1]
   hold=1 starts HOLDING (the session "not known yet"), so the piece rests on
   its last frame — the frame the new onboarding's screen 1 continues.
   swift=1 (or the SWIFT chip) turns the "launch" switch on for this run of
   the app (lib/surfaces' dev override, as ui-lab's chips do), so the replay
   plays the SwiftUI piece when the binary carries KLaunchView; RN turns it
   off. Each replay picks its renderer the way a cold start does. */
export default function LaunchPreview() {
  const router = useRouter();
  const { mode: m, hold, swift } = useLocalSearchParams<{ mode?: string; hold?: string; swift?: string }>();
  const [mode, setMode] = useState<"full" | "short" | "still">(m === "short" || m === "still" ? m : "full");
  const [run, setRun] = useState(0);
  const [ready, setReady] = useState(hold !== "1");
  const [done, setDone] = useState(false);
  // the piece remounts when the switch flips (its key), so it picks again
  useEffect(() => {
    if (swift === "1") setDevSurfaceOverride("launch", true);
  }, [swift]);
  const native = useNativeSurface("launch");
  if (!__DEV__) return <Redirect href="/" />;
  const again = (next: typeof mode) => {
    setMode(next);
    setDone(false);
    setRun((n) => n + 1);
  };
  const renderer = (on: boolean) => {
    setDevSurfaceOverride("launch", on);
    setDone(false);
    setRun((n) => n + 1);
  };
  return (
    <View style={{ flex: 1, backgroundColor: launchEnvelope() ? COBALT : POST_BLUE /* the splash's ground (was the lavender #ECECFE) */ }}>
      {!done && <LaunchAnimation key={`${mode}-${run}-${native ? "swift" : "rn"}`} force={mode} ready={ready} onDone={() => setDone(true)} />}
      <View style={{ position: "absolute", left: 16, right: 16, bottom: 40, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(["full", "short", "still"] as const).map((x) => (
          <Pressable key={x} onPress={() => again(x)} style={{ backgroundColor: mode === x ? "#1E1B35" : "#FFFFFF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ ...PFM.monoSemi, fontSize: 10, color: mode === x ? "#FFFFFF" : "#1E1B35" }}>{x.toUpperCase()}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setReady((v) => !v)} style={{ backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ ...PFM.monoSemi, fontSize: 10, color: "#1E1B35" }}>{ready ? "READY" : "HOLDING"}</Text>
        </Pressable>
        {(["rn", "swift"] as const).map((x) => (
          <Pressable key={x} onPress={() => renderer(x === "swift")} style={{ backgroundColor: native === (x === "swift") ? "#1E1B35" : "#FFFFFF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ ...PFM.monoSemi, fontSize: 10, color: native === (x === "swift") ? "#FFFFFF" : "#1E1B35" }}>{x.toUpperCase()}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => router.back()} style={{ backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ ...PFM.monoSemi, fontSize: 10, color: "#1E1B35" }}>CLOSE</Text>
        </Pressable>
      </View>
    </View>
  );
}
