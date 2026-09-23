import { useState } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { LaunchAnimation } from "../components/LaunchAnimation";
import { PF } from "../theme/post";

/* dev only — the launch, replayed without restarting the app.
   kindredly:///launch-preview?mode=full|short|still */
export default function LaunchPreview() {
  const router = useRouter();
  const { mode: m } = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<"full" | "short" | "still">(m === "short" || m === "still" ? m : "full");
  const [run, setRun] = useState(0);
  const [ready, setReady] = useState(true);
  const [done, setDone] = useState(false);
  if (!__DEV__) return <Redirect href="/" />;
  const again = (next: typeof mode) => {
    setMode(next);
    setDone(false);
    setRun((n) => n + 1);
  };
  return (
    <View style={{ flex: 1, backgroundColor: "#ECECFE" }}>
      {!done && <LaunchAnimation key={`${mode}-${run}`} force={mode} ready={ready} onDone={() => setDone(true)} />}
      <View style={{ position: "absolute", left: 16, right: 16, bottom: 40, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(["full", "short", "still"] as const).map((x) => (
          <Pressable key={x} onPress={() => again(x)} style={{ backgroundColor: mode === x ? "#1E1B35" : "#FFFFFF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, color: mode === x ? "#FFFFFF" : "#1E1B35" }}>{x.toUpperCase()}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setReady((v) => !v)} style={{ backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, color: "#1E1B35" }}>{ready ? "READY" : "HOLDING"}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, color: "#1E1B35" }}>CLOSE</Text>
        </Pressable>
      </View>
    </View>
  );
}
