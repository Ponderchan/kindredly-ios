import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { GrowthMoment } from "../components/GrowthMoment";
import { useTheme } from "../lib/theme";

/* dev only — the growing-up moment (components/GrowthMoment) on demand, without growing her:
     kindredly:///growth-preview?to=fledge     hatchling → fledgling
     kindredly:///growth-preview?to=wren       fledgling → grown
   Nothing is read or stored. */
export default function GrowthPreview() {
  const { to } = useLocalSearchParams<{ to?: string }>();
  const router = useRouter();
  const { t: tk } = useTheme();
  if (!__DEV__) return <Redirect href="/" />;
  const moment = to === "wren" ? ({ from: "fledge", to: "wren" } as const) : ({ from: "hatch", to: "fledge" } as const);
  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <GrowthMoment preview={moment} onClose={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
    </View>
  );
}
