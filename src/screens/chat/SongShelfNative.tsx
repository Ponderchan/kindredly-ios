import { useMemo } from "react";
import { Linking, Modal, View } from "react-native";
import { KSongShelfView } from "../../../modules/kindredly-ui";
import { SurfaceHost } from "../../components/NativeSurface";
import { OverlaySurface } from "../../components/OverlayNativeSurface";
import { getLang, t, useLang } from "../../lib/i18n";
import { scrimColor, useTheme } from "../../lib/theme";
import { useBirdImageRef } from "../../lib/bird-images";
import { dShort } from "../../lib/format";
import type { SharedSong } from "../../lib/shared-songs";
import { shelfRows, shelfSaysKey } from "./song-shelf";

/* THE SHELF IN SWIFTUI (2026-10-27, the "songshelf" switch, off until its simulator pass): the
   room's song shelf (ConversationNative's SongShelf) with the same Modal — transparent, sliding
   up — and its inside drawn by SwiftUI (modules/kindredly-ui KSongShelfView, ios/Portable/Chat/
   KSongShelf.swift): the same dim, title, ✕, Wren's line and songs. The words are song-shelf's
   (shared with the React Native shelf); a song pressed opens its link here, as React Native's
   does. Wren's mark is the mini snapshot (lib/bird-images): at 18 WrenBird draws the mini mark
   whatever the mood, so it is the same drawing. */

export type SongShelfProps = {
  open: boolean;
  onClose: () => void;
  songs: SharedSong[];
  songSays: { line: string; evidence: string } | null;
  name: string;
};

/** The shelf's Modal, its inside drawn by SwiftUI. */
export function SongShelfSwift({ open, onClose, songs, songSays, name, onFallback }: SongShelfProps & { onFallback: () => void }) {
  useLang();
  const lang = getLang();
  const { key: theme, letterFont, dark } = useTheme();
  const bird = useBirdImageRef("mini");
  const rows = useMemo(
    () => shelfRows(songs, { name, you: t("ui.you"), day: dShort }),
    // the words follow the language
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [songs, name, lang],
  );
  const onOpen = (key: string) => {
    const sg = songs.find((s) => s.url === key);
    if (sg) void Linking.openURL(sg.url);
  };
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <OverlaySurface
        surface="songshelf"
        view="KSongShelfView"
        onFallback={onFallback}
        pending={() => <View style={{ flex: 1, backgroundColor: scrimColor(dark, 0.3) }} />}
        native={() => (
          <SurfaceHost>
            <KSongShelfView
              theme={theme}
              letterFont={letterFont}
              title={t("rm.shelf.title", { name })}
              closeLabel={t("wren.trackClose")}
              says={songSays ? t(shelfSaysKey(songSays.line), { name }) : ""}
              evidence={songSays?.evidence ?? ""}
              bird={bird}
              rows={rows}
              onClose={onClose}
              onOpen={onOpen}
            />
          </SurfaceHost>
        )}
      />
    </Modal>
  );
}
