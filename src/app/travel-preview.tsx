import { useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { LetterTravel } from "../components/LetterTravel";
import { MONO, PFM } from "../theme/post";
import { useTheme } from "../lib/theme";

/* dev only — the send-off, without sending anything. kindredly:///travel-preview
   On the theme's page colour, as the compose page draws it (the room and the
   last frame follow the theme; the illustration keeps its own colours). */
export default function TravelPreview() {
  const router = useRouter();
  const { t: tk } = useTheme();
  const [run, setRun] = useState(0);
  const [ready, setReady] = useState(true);
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <LetterTravel key={run} ready={ready} onDone={() => setRun((n) => n + 1)} />
      <View style={{ position: "absolute", left: 16, bottom: 40, flexDirection: "row", gap: 10 }}>
        <Pressable onPress={() => setReady((v) => !v)} style={{ backgroundColor: tk.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ ...PFM.monoSemi, fontSize: MONO.label, color: tk.bg }}>{ready ? "READY" : "HOLDING"}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ backgroundColor: tk.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ ...PFM.monoSemi, fontSize: MONO.label, color: tk.bg }}>CLOSE</Text>
        </Pressable>
      </View>
    </View>
  );
}
