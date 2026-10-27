import { useEffect, useMemo, useRef } from "react";
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KPhotoLightboxView } from "../../modules/kindredly-ui";
import { MediaImage } from "../lib/media";
import { t, useLang } from "../lib/i18n";
import { dismissKeyboard } from "../lib/keyboard";
import { localImageRef, useSignedImageRefs } from "../lib/images";
import { useTheme } from "../lib/theme";
import { SurfaceHost } from "./NativeSurface";
import { OverlaySurface, useOverlayRenderer } from "./OverlayNativeSurface";

/* A PHOTO, BIG (owner, 2026-10-10: a tiny moment in a kindred's room
   couldn't be tapped, let alone opened). Tap a photo — in a room, on Wren's
   desk, in a sealed page — and it opens alone on ink: pinch to look closer
   (iOS's own scroll-view zoom, no new library), tap anywhere or the × to put
   it back. A pinch is never a tap — two fingers anywhere in the gesture and
   it doesn't close — and once the photo is zoomed in, only the × closes it,
   so panning around a close-up can't throw it away. Takes a moments-bucket
   path (signed, lib/media) or a plain uri. The stage is near-black and the
   × white on its dark disc in every theme: a photo is looked at on dark,
   so none of this follows the page's colours.

   10a (step 5): opening puts the keyboard away, whoever holds it — a
   React Native field, or a SwiftUI one React Native's Keyboard.dismiss()
   can't reach (lib/keyboard) — so it never stays up over the photo. The
   screens already let go before they open it (blurThen); this is the
   backstop for any caller that doesn't.

   SWIFT (2026-10-27, the "lightbox" switch, off until its simulator pass):
   PhotoLightbox picks between this React Native lightbox (PhotoLightboxRN)
   and the same Modal with its inside drawn by SwiftUI (PhotoLightboxSwift:
   modules/kindredly-ui KPhotoLightboxView, ios/Portable/Chat/
   KPhotoLightbox.swift) — the same stage, the same ×, the same pinch, pan
   and tap rules. The keyboard and the signing of a moments path stay here;
   components/OverlayNativeSurface picks, and arms the crash breadcrumb at
   every opening. */

export type LightboxPhoto = { path?: string | null; uri?: string | null } | null;

type LightboxProps = { photo: LightboxPhoto; onClose: () => void };

/** A photo opened full screen: the SwiftUI lightbox where it can be, else React Native's. */
export function PhotoLightbox({ photo, onClose }: LightboxProps) {
  const { native, toRN } = useOverlayRenderer("lightbox", "KPhotoLightboxView", !!photo);
  return native ? <PhotoLightboxSwift photo={photo} onClose={onClose} onFallback={toRN} /> : <PhotoLightboxRN photo={photo} onClose={onClose} />;
}

/* the stage, near-black in every theme */
const STAGE = "rgba(10,10,12,0.96)";

/** The same Modal, its inside drawn by SwiftUI. */
function PhotoLightboxSwift({ photo, onClose, onFallback }: LightboxProps & { onFallback: () => void }) {
  useLang();
  const { key: theme } = useTheme();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (photo) dismissKeyboard();
  }, [photo]);
  // a moments path signed and keyed by its storage path (MediaImage signs the same bucket); a plain uri as it is
  const path = photo?.path ?? null;
  const signed = useSignedImageRefs("moments", [path]);
  const ref = path ? (signed[path] ?? null) : localImageRef(photo?.uri);
  const viewInsets = useMemo(() => ({ top: insets.top, bottom: insets.bottom, tabBarRoom: 0 }), [insets.top, insets.bottom]);
  return (
    <Modal visible={!!photo} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <OverlaySurface
        surface="lightbox"
        view="KPhotoLightboxView"
        onFallback={onFallback}
        pending={() => <View style={{ flex: 1, backgroundColor: STAGE }} />}
        native={() => (
          <SurfaceHost>
            <KPhotoLightboxView theme={theme} insets={viewInsets} photo={ref} closeLabel={t("wren.trackClose")} onClose={onClose} />
          </SurfaceHost>
        )}
      />
    </Modal>
  );
}

/** The React Native lightbox, unchanged. */
function PhotoLightboxRN({ photo, onClose }: LightboxProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pinched = useRef(false);
  const zoomed = useRef(false);
  useEffect(() => {
    pinched.current = false;
    zoomed.current = false;
    if (photo) dismissKeyboard();
  }, [photo]);
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
