import { useMemo, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { isKindredlyUIViewAvailable, useKCommands, type KScreenHandle } from "../../../modules/kindredly-ui";
import { KStampPressView, type KPressedPhoto, type KStampPressStrings } from "../../../modules/kindredly-ui/src/StampPress";
import { SurfaceHost } from "../../components/NativeSurface";
import { useLetterFont, useTheme } from "../../lib/theme";
import { useScreenInsets } from "../../lib/screen-insets";
import { t, useLang } from "../../lib/i18n";
import "../../data/strings-stamps2";

/* THE STAMP PRESS CAMERA (custom stamps, build agent A): one Host holding KStampPressView. Swift
   does the camera, the permission card, UPLOAD and its crop page, and the press; this file only
   hands it its words and passes the pressed photo on. The page is dark in every theme, so the
   status bar is light while it shows. */

export type { KPressedPhoto };

/** every word the camera shows, in the reader's language (strings-stamps2, cs2.cam.*) */
export function stampPressStrings(): KStampPressStrings {
  return {
    title: t("cs2.cam.title"),
    hint: t("cs2.cam.hint"),
    upload: t("cs2.cam.upload"),
    zoom: t("cs2.cam.zoom"),
    close: t("cs2.cam.a11yClose"),
    flashOn: t("cs2.cam.a11yFlashOn"),
    flashOff: t("cs2.cam.a11yFlashOff"),
    zoomA11y: t("cs2.cam.a11yZoom"),
    shutter: t("cs2.cam.a11yShutter"),
    viewfinder: t("cs2.cam.a11yView"),
    choosePhoto: t("cs2.cam.a11yUpload"),
    permission: t("cs2.cam.permBody"),
    allow: t("cs2.cam.permAllow"),
    openSettings: t("cs2.cam.permSettings"),
    instead: t("cs2.cam.permPhoto"),
    noCamera: t("cs2.cam.noCamera"),
    cropHint: t("cs2.cam.cropHint"),
    cropA11y: t("cs2.cam.a11yCrop"),
    useThis: t("cs2.cam.useThis"),
    back: t("cs2.cam.back"),
    failed: t("cs2.cam.failed"),
    pressed: t("cs2.cam.pressed"),
  };
}

export function StampPressNative({
  onClose,
  onPressed,
}: {
  onClose: () => void;
  onPressed: (photo: KPressedPhoto) => void;
}) {
  const lang = useLang();
  const { key: theme } = useTheme();
  const letterFont = useLetterFont();
  const screen = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  const commands = useKCommands(ref);
  const insets = useMemo(() => ({ top: screen.top, bottom: screen.bottom, tabBarRoom: 0 }), [screen.top, screen.bottom]);
  // the words follow the language (lang is the dependency on purpose)
  const strings = useMemo(() => stampPressStrings(), [lang]);

  return (
    <>
      <StatusBar style="light" />
      <SurfaceHost>
      <KStampPressView
        ref={commands.ref}
        theme={theme}
        letterFont={letterFont}
        insets={insets}
        rev={0}
        strings={strings}
        onClose={onClose}
        onPressed={onPressed}
        onError={(message) => console.warn("[stamp-press] the camera couldn't hand over the photo:", message)}
      />
      </SurfaceHost>
    </>
  );
}

/** Whether this binary can show the Stamp Press (a build from before it has no KStampPressView).
    Entry points (Me › Stamps' blank stamp, the compose tray's blank tile) hide when false. */
export function stampPressAvailable(): boolean {
  return isKindredlyUIViewAvailable("KStampPressView");
}
