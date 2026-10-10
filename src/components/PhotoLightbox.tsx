import { useEffect, useRef } from "react";
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MediaImage } from "../lib/media";
import { t } from "../lib/i18n";

/* A PHOTO, BIG (owner, 2026-10-10: a tiny moment in a kindred's room
   couldn't be tapped, let alone opened). Tap a photo — in a room, on Wren's
   desk, in a sealed page — and it opens alone on ink: pinch to look closer
   (iOS's own scroll-view zoom, no new library), tap anywhere or the × to put
   it back. A pinch is never a tap — two fingers anywhere in the gesture and
   it doesn't close — and once the photo is zoomed in, only the × closes it,
   so panning around a close-up can't throw it away. Takes a moments-bucket
   path (signed, lib/media) or a plain uri. */

export type LightboxPhoto = { path?: string | null; uri?: string | null } | null;

export function PhotoLightbox({ photo, onClose }: { photo: LightboxPhoto; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pinched = useRef(false);
  const zoomed = useRef(false);
  useEffect(() => { pinched.current = false; zoomed.current = false; }, [photo]);
  const tap = () => {
    if (pinched.current || zoomed.current) return;
    onClose();
  };
  return (
    <Modal visible={!!photo} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View
        style={{ flex: 1, backgroundColor: "rgba(10,10,12,0.96)" }}
        onTouchStart={(e) => { if (e.nativeEvent.touches.length > 1) pinched.current = true; }}
        onTouchMove={(e) => { if (e.nativeEvent.touches.length > 1) pinched.current = true; }}
        // the gesture is over once the last finger lifts: the next tap is a tap again
        onTouchEnd={(e) => { if (e.nativeEvent.touches.length === 0) setTimeout(() => { pinched.current = false; }, 0); }}
      >
        <ScrollView
          onScroll={(e) => { zoomed.current = (e.nativeEvent.zoomScale ?? 1) > 1.01; }}
          scrollEventThrottle={16}
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
          bouncesZoom
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ width, height }}
        >
          <Pressable onPress={tap} accessibilityRole="button" accessibilityLabel={t("wren.trackClose")} style={{ width, height, justifyContent: "center" }}>
            {photo && <MediaImage path={photo.path} uri={photo.uri} style={{ width, height: height * 0.8 }} resizeMode="contain" />}
          </Pressable>
        </ScrollView>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("wren.trackClose")}
          // on its own dark disc: a zoomed-in photo can put white right behind it
          style={{ position: "absolute", top: insets.top + 6, right: 14, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(10,10,12,0.55)", alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 26, lineHeight: 28 }}>×</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
