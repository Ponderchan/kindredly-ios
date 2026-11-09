import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Host } from "@expo/ui/swift-ui";
import { KFACE_READY_OUT_MS, KFaceReadyView } from "../../modules/kindredly-ui";
import { t } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import { madeFaceRefNow } from "../lib/made-faces";
import { makeFaceHref } from "../lib/make-face";
import { useBirdImageRef } from "../lib/bird-images";
import { subscribeFaceReady, type FaceReady } from "../screens/make-face/useMakeFaceModel";
import { NativeSurface, type SurfaceHostLink } from "./NativeSurface";
import { WrenBird } from "./WrenBird";
import "../data/strings-make-face";

/* WREN KNOCKS INSIDE THE APP (owner's design, 2026-10-31, board 3). The reader left the page
   while Wren painted and is still in the app when the drawing lands: a banner drops from the top
   with the new face, "knock knock. your face is done." and See it, which opens the page on the
   result (the three to choose from). It goes by itself after eight seconds; a tap anywhere on it
   opens. With Reduce Motion it fades instead of dropping. Mounted once, in the tabs layout.

   SWIFT OR REACT NATIVE (batch 3, slice 4, 2026-11-09). The card is drawn by SwiftUI with the
   "faceready" switch on and KFaceReadyView in the binary (FaceReadySwift: modules/kindredly-ui
   Portable/MakeFace/KFaceReadyBanner.swift, in a Host of its own as wide and as tall as the card),
   else by React Native (FaceReadyRN, exactly as it was). Each banner decides once (NativeSurface
   in mount mode, keyed by the banner, so a second face that lands while one shows drops in
   afresh, as before). Either way this decides everything: when it shows, the eight seconds, the
   tap's route and VoiceOver's announcement; each renderer drops it in and takes it back up its own
   way, and this takes it away once it has gone (OUT_MS). Her picture in Swift is her snapshot
   (lib/bird-images faceReady30: 30, delighted), captured while the banner is up. */

const SHOW_MS = 8000;
/** how long either renderer takes to go (Animated.timing 220; KFaceReadyBanner .22 s), and a frame */
const OUT_MS = KFACE_READY_OUT_MS;

export function FaceReadyBanner() {
  const router = useRouter();
  // the banner showing, numbered so a new face drops in afresh; `leaving` once its time is up
  const [ready, setReady] = useState<(FaceReady & { n: number }) | null>(null);
  const [leaving, setLeaving] = useState(false);
  const count = useRef(0);

  useEffect(
    () =>
      subscribeFaceReady((r) => {
        count.current += 1;
        setReady({ ...r, n: count.current });
        setLeaving(false);
        AccessibilityInfo.announceForAccessibility(t("mf.banner.title"));
      }),
    [],
  );

  // eight seconds, then it goes up and away
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => setLeaving(true), SHOW_MS);
    return () => clearTimeout(id);
  }, [ready]);
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => setReady(null), OUT_MS);
    return () => clearTimeout(id);
  }, [leaving]);

  if (!ready) return null;
  const open = () => {
    setReady(null);
    setLeaving(false);
    router.push(makeFaceHref(ready.from) as never);
  };

  return (
    <NativeSurface
      key={ready.n}
      surface="faceready"
      view="KFaceReadyView"
      mode="mount"
      native={(host) => <FaceReadySwift avatarId={ready.avatarId} shown={!leaving} onOpen={open} host={host} />}
      fallback={() => <FaceReadyRN avatarId={ready.avatarId} leaving={leaving} onOpen={open} />}
      // a frame or two while the breadcrumb is written: nothing, as before it drops in
      pending={() => null}
    />
  );
}

/** The card in SwiftUI, in a Host 12 from the sides and 6 under the status bar, as tall as the card. */
function FaceReadySwift({ avatarId, shown, onOpen, host }: { avatarId: string; shown: boolean; onOpen: () => void; host: SurfaceHostLink }) {
  const insets = useSafeAreaInsets();
  const { key: theme, dark } = useTheme();
  const bird = useBirdImageRef("faceReady30");
  const face = madeFaceRefNow(avatarId);
  return (
    <Host
      matchContents={{ vertical: true }}
      ignoreSafeArea="all"
      colorScheme={dark ? "dark" : "light"}
      onLayoutContent={host.onLayoutContent}
      style={{ position: "absolute", left: 12, right: 12, top: insets.top + 6 }}
    >
      <KFaceReadyView
        theme={theme}
        title={t("mf.banner.title")}
        // React Native's small line, as it is drawn there
        name="Wren"
        see={t("mf.banner.see")}
        a11y={`${t("mf.banner.title")} ${t("mf.banner.see")}`}
        face={face}
        bird={bird}
        shown={shown}
        onOpen={onOpen}
      />
    </Host>
  );
}

/** The React Native banner (the "faceready" switch's fallback), as it was. */
function FaceReadyRN({ avatarId, leaving, onOpen }: { avatarId: string; leaving: boolean; onOpen: () => void }) {
  const insets = useSafeAreaInsets();
  const { t: tk } = useTheme();
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((calm) => {
      y.setValue(0);
      (calm ? Animated.timing(y, { toValue: 1, duration: 200, useNativeDriver: true }) : Animated.spring(y, { toValue: 1, useNativeDriver: true, friction: 7, tension: 70 })).start();
    });
  }, [y]);
  useEffect(() => {
    if (leaving) Animated.timing(y, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  }, [leaving, y]);

  const face = madeFaceRefNow(avatarId);
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
        onPress={onOpen}
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
