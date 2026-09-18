import { useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { LetterTravel } from "../components/LetterTravel";
import { PF } from "../theme/post";

/* dev only — the send-off, without sending anything. kindredly:///travel-preview */
export default function TravelPreview() {
  const router = useRouter();
  const [run, setRun] = useState(0);
  const [ready, setReady] = useState(true);
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, backgroundColor: "#ECEAFA" }}>
      <LetterTravel key={run} ready={ready} onDone={() => setRun((n) => n + 1)} />
      <View style={{ position: "absolute", left: 16, bottom: 40, flexDirection: "row", gap: 10 }}>
        <Pressable onPress={() => setReady((v) => !v)} style={{ backgroundColor: "#1E1B35", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, color: "#fff" }}>{ready ? "READY" : "HOLDING"}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ backgroundColor: "#1E1B35", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, color: "#fff" }}>CLOSE</Text>
        </Pressable>
      </View>
    </View>
  );
}
