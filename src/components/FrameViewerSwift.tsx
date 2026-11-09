import { useMemo } from "react";
import { Modal, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KFrameViewerView, type KFrameViewerPhoto, type KFrameViewerStrings } from "../../modules/kindredly-ui";
import { t, useLang } from "../lib/i18n";
import { localImageRef } from "../lib/images";
import { useTheme } from "../lib/theme";
import { SurfaceHost } from "./NativeSurface";
import { OverlaySurface } from "./OverlayNativeSurface";
import "../data/strings-a11y-compose"; // sc.a11y.photo, sc.a11y.photoCover, sc.a11y.deletePhoto
import "../data/strings-onboarding2"; // ob2.back

/* ONE FRAME, FULL SCREEN, ITS INSIDE DRAWN BY SWIFTUI (batch 3, 2026-11-09; the "frameviewer"
   switch, off by default). SelfCompose's FrameViewer picks this or its React Native viewer
   (useOverlayRenderer), with the same props, so both composers that open it (the Swift Notes
   composer, NoteComposeNative, and the React Native one) keep calling FrameViewer as before.

   The Modal is the React Native one FrameViewer always had (opaque, a fade, the back gesture
   closing it); inside it, one Host holding KFrameViewerView (modules/kindredly-ui ios/Portable/
   Notes/KFrameViewer.swift): the same ‹, count, bin, pager and cover capsule, every word t()'s as
   React Native says them. The pictures are the composer's own files (localImageRef). The bin and
   the cover hand back the index on show; the caller does the rest, as before (useNoteComposeState
   coverPhoto / removePhoto set the next index, which the Swift pager follows). OverlaySurface arms
   the crash breadcrumb at every opening and sends the piece back to React Native for the session
   if the Swift path can't stand. */

type Photo = { uri: string };

export type FrameViewerProps = {
  photos: Photo[];
  index: number | null;
  onClose: () => void;
  onCover: (i: number) => void;
  onRemove: (i: number) => void;
};

/* the stage, near-black in every theme (React Native's #0A0A0C) */
const STAGE = "#0A0A0C";

export function FrameViewerSwift({ photos, index, onClose, onCover, onRemove, onFallback }: FrameViewerProps & { onFallback: () => void }) {
  const lang = useLang();
  const { key: theme } = useTheme();
  const insets = useSafeAreaInsets();
  const viewInsets = useMemo(() => ({ top: insets.top, bottom: insets.bottom, tabBarRoom: 0 }), [insets.top, insets.bottom]);
  const n = photos.length;
  const framePhotos = useMemo<KFrameViewerPhoto[]>(
    () => photos.map((p, i) => ({ image: localImageRef(p.uri), a11y: t(i === 0 && n >= 2 ? "sc.a11y.photoCover" : "sc.a11y.photo", { i: i + 1, n }) })),
    // lang: the words are t()'s
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [photos, n, lang],
  );
  const strings = useMemo<KFrameViewerStrings>(
    () => ({ backLabel: t("ob2.back"), removeLabel: t("sc.a11y.deletePhoto"), isCover: t("sc.isCover"), makeCover: t("sc.makeCover") }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );
  if (index === null) return null;
  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={onClose}>
      <OverlaySurface
        surface="frameviewer"
        view="KFrameViewerView"
        onFallback={onFallback}
        pending={() => <View style={{ flex: 1, backgroundColor: STAGE }} />}
        native={() => (
          <View style={{ flex: 1, backgroundColor: STAGE }}>
            <SurfaceHost>
              <KFrameViewerView
                theme={theme}
                insets={viewInsets}
                photos={framePhotos}
                index={Math.max(0, Math.min(index, n - 1))}
                strings={strings}
                onClose={onClose}
                onCover={onCover}
                onRemove={onRemove}
              />
            </SurfaceHost>
          </View>
        )}
      />
    </Modal>
  );
}
