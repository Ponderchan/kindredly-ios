import { useEffect } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { setDevHinge } from "../../lib/fold";
import { useTheme } from "../../lib/theme";

/* DEV: the hinge as this link says, over what a folding phone's system reports (lib/fold
   setDevHinge), then on to `to` (default: back where it came from).
     kindredly:///dev/fold?hinge=partly&to=compose   half-folded, then the letter composer
     kindredly:///dev/fold?hinge=off                  the system's own reading again
   With the window turned upright, partly is the small laptop's posture. Nothing in a release. */
export default function DevFold() {
  const { hinge, to } = useLocalSearchParams<{ hinge?: string; to?: string }>();
  const router = useRouter();
  const { t: tk } = useTheme();
  useEffect(() => {
    if (!__DEV__) {
      router.back();
      return;
    }
    const h = hinge === "partly" || hinge === "open" || hinge === "closed" ? hinge : null;
    setDevHinge(h);
    if (to) router.replace(`/${to.replace(/^\/+/, "")}` as never);
    else if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/letters");
  }, [hinge, to, router]);
  return <View style={{ flex: 1, backgroundColor: tk.bg }} />;
}
