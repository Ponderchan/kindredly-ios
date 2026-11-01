import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RatingAskSheet } from "../components/RatingAsk";
import { useTheme } from "../lib/theme";
import type { RatingVariant } from "../lib/rating-ask-core";

/* The rating ask without its moment, for a look at either sheet (TestFlight too, owner
   2026-11-01): kindredly:///rating-preview?v=letter (or v=review). Nothing is recorded and no
   event is sent; the key still opens the App Store's review page. &ratings=3 puts a count in
   the review's last row (none: the row stays hidden, as when Apple's count is unknown). */
export default function RatingPreview() {
  const { v, ratings } = useLocalSearchParams<{ v?: string; ratings?: string }>();
  const [variant, setVariant] = useState<RatingVariant>(v === "review" ? "review" : "letter");
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t: tk } = useTheme();
  const count = ratings != null && /^\d+$/.test(ratings) ? Number(ratings) : null;
  const key = (label: string, onPress: () => void) => (
    <Pressable key={label} onPress={onPress} style={({ pressed }) => ({ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: tk.soft2, opacity: pressed ? 0.6 : 1 })}>
      <Text style={{ fontSize: 15, color: tk.ink }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flex: 1, backgroundColor: tk.bg, paddingTop: insets.top + 16, paddingHorizontal: 16, gap: 10 }}>
      {key("A · founder letter", () => {
        setVariant("letter");
        setOpen(true);
      })}
      {key("B · Wren's review", () => {
        setVariant("review");
        setOpen(true);
      })}
      {key("Close", () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/letters")))}
      <RatingAskSheet open={open} variant={variant} ratings={count} onTap={() => setOpen(false)} onLater={() => setOpen(false)} />
    </View>
  );
}
