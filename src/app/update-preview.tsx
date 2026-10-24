import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UPDATE_BANNER_ROOM, UpdateBanner, UpdateSheet } from "../components/UpdatePrompt";
import { setDevUpdatePreview } from "../lib/update-prompt";
import { useTheme } from "../lib/theme";
import { PFM } from "../theme/post";

/* dev only — the update prompt without the server switch, to be screen-recorded: the banner at
   the top and the sheet over it, Update playing everything but never opening the App Store.
   kindredly:///update-preview — add ?v=1.0.7 for another version on the stamp (v=none: unknown,
   no stamp), &force=1 for hard mode, and &play=1 to have Update press itself and the sheet come
   back, over and over (soft mode: a hands-free loop to record). "On Today" turns the prompt on for this run of the app
   (lib/update-prompt setDevUpdatePreview) and goes to the real Today, sheet first. */
export default function UpdatePreview() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Preview />;
}

function Preview() {
  const { v, force, play } = useLocalSearchParams<{ v?: string; force?: string; play?: string }>();
  const loop = play === "1";
  const version = v === "none" ? null : v || "1.0.6";
  const [sheet, setSheet] = useState(true);
  const [hard, setHard] = useState(force === "1");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t: tk } = useTheme();

  const onToday = (mode: "soft" | "force") => {
    setDevUpdatePreview(mode);
    router.replace("/(tabs)/letters"); // gone, with its own sheet, rather than left under Today
  };

  const key = (label: string, onPress: () => void) => (
    <Pressable key={label} onPress={onPress} style={({ pressed }) => ({ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: tk.soft2, opacity: pressed ? 0.6 : 1 })}>
      <Text style={{ fontSize: 15, color: tk.ink }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + UPDATE_BANNER_ROOM + 12, paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}>
        <Text style={{ ...PFM.monoSemi, fontSize: 10.5, letterSpacing: 1.3, color: tk.mute }}>WREN</Text>
        <Text style={{ fontSize: 16, color: tk.ink, marginBottom: 6 }}>
          update-preview · {version ?? "no version"} · {hard ? "hard" : "soft"}
        </Text>
        {key("Show the sheet", () => setSheet(true))}
        {key(hard ? "Switch to soft mode" : "Switch to hard mode", () => setHard((h) => !h))}
        {key("On Today, soft", () => onToday("soft"))}
        {key("On Today, hard", () => onToday("force"))}
        {key("Stop the Today preview", () => setDevUpdatePreview(null))}
      </ScrollView>
      <UpdateBanner top={insets.top} onPress={() => setSheet(true)} />
      <UpdateSheet
        open={sheet}
        demo
        autoPlay={loop}
        version={version}
        force={hard}
        onLater={() => setSheet(false)}
        onUpdated={() => {
          if (hard) return;
          setSheet(false);
          if (loop) setTimeout(() => setSheet(true), 1500); // and again, for the recording
        }}
      />
    </View>
  );
}
