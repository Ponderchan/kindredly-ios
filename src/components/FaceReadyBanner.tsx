import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { t } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import { madeFaceRefNow } from "../lib/made-faces";
import { makeFaceHref } from "../lib/make-face";
import { subscribeFaceReady, type FaceReady } from "../screens/make-face/useMakeFaceModel";
import { WrenBird } from "./WrenBird";
import "../data/strings-make-face";

/* WREN KNOCKS INSIDE THE APP (owner's design, 2026-10-31, board 3). The reader left the page
   while Wren painted and is still in the app when the drawing lands: a banner drops from the top
   with the new face, "knock knock. your face is done." and See it, which opens the page on the
   result (the three to choose from). It goes by itself after eight seconds; a tap anywhere on it
   opens. With Reduce Motion it fades instead of dropping. Mounted once, in the tabs layout. */

const SHOW_MS = 8000;

export function FaceReadyBanner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t: tk } = useTheme();
  const [ready, setReady] = useState<FaceReady | null>(null);
  const y = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () =>
      subscribeFaceReady((r) => {
        setReady(r);
        AccessibilityInfo.announceForAccessibility(t("mf.banner.title"));
      }),
    [],
  );

  useEffect(() => {
    if (!ready) return;
    let calm = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      calm = v;
      y.setValue(0);
      (calm ? Animated.timing(y, { toValue: 1, duration: 200, useNativeDriver: true }) : Animated.spring(y, { toValue: 1, useNativeDriver: true, friction: 7, tension: 70 })).start();
    });
    timer.current = setTimeout(() => {
      Animated.timing(y, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setReady(null));
    }, SHOW_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [ready, y]);

  if (!ready) return null;
  const face = madeFaceRefNow(ready.avatarId);
  const open = () => {
    if (timer.current) clearTimeout(timer.current);
    setReady(null);
    router.push(makeFaceHref(ready.from) as never);
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        top: insets.top + 6,
        opacity: y,
        transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }) }],
      }}
    >
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${t("mf.banner.title")} ${t("mf.banner.see")}`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 10,
          paddingLeft: 10,
          paddingRight: 12,
          borderRadius: 24,
          backgroundColor: tk.sf,
          borderWidth: 1,
          borderColor: tk.line,
          shadowColor: "#1E1B35",
          shadowOpacity: 0.28,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
        }}
      >
        <View style={{ width: 52, height: 52 }}>
          {face ? (
            <Image source={{ uri: face.uri, cacheKey: face.key }} style={{ width: 52, height: 52, borderRadius: 26 }} contentFit="cover" />
          ) : (
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: tk.lav }} />
          )}
          <View style={{ position: "absolute", right: -12, bottom: -8 }} pointerEvents="none">
            <WrenBird size={30} mood="delight" letter={false} />
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: tk.ink }} numberOfLines={2}>
            {t("mf.banner.title")}
          </Text>
          <Text style={{ fontSize: 13, color: tk.mute }} numberOfLines={1}>
            Wren
          </Text>
        </View>
        <View style={{ minHeight: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: tk.ind, justifyContent: "center" }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: tk.bg }}>{t("mf.banner.see")}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
