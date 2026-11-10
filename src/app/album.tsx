import { useCallback, useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { isKindredlyUIViewAvailable, useKCommands, useRev, type KScreenHandle } from "../../modules/kindredly-ui";
import { StampAlbum } from "../../modules/kindredly-ui/src/Me";
import { SurfaceHost } from "../components/NativeSurface";
import { Toast } from "../components/ui";
import { useLetterFont, useTheme } from "../lib/theme";
import { useScreenInsets } from "../lib/screen-insets";
import { useStampCollection } from "../screens/me/useStampCollection";
import { useStampExport } from "../screens/me/useStampExport";
import type { KAlbumActionKey } from "../../modules/kindredly-ui/src/Me";

/* THE ALBUM (custom stamps, the owner's final Prompt 2; contract §4.4, §7 B3): every stamp you
   made, every stranger's stamp you kept, every official stamp you have used, on a ruled album
   leaf, with a sheet per stamp. Swift only (KStampAlbumView, ios/Portable/Me/KStampsCard.swift); a
   binary without it goes straight back (its doors, Me's "Open the album →", are Swift too).

     /album?focus=made|strangers|yours   (the section to open at; Me's See all → and a tapped stamp)

   The facts, words and taps are useStampCollection's, shared with Me › Stamps.

   EXPORTING (stamp export, 2026-11-10; First Class): useStampExport adds "Save as sticker" to
   the sheet of each of the reader's own approved stamps and "Print a sheet" to MADE BY YOU's
   head, on a binary that can export, and runs them (a member exports, anyone else meets the
   paywall). Nothing else about the album changes; a binary from before it is sent neither. */

const SECTIONS = new Set(["made", "strangers", "yours"]);

export default function Album() {
  const router = useRouter();
  const { key: theme, t: tk } = useTheme();
  const letterFont = useLetterFont();
  const insets = useScreenInsets();
  const ref = useRef<KScreenHandle>(null);
  useKCommands(ref);
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const available = isKindredlyUIViewAvailable("KStampAlbumView");
  const c = useStampCollection({ where: "album" });

  const back = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me")), [router]);

  useEffect(() => {
    if (available) return;
    console.log("[album] this binary has no KStampAlbumView; leaving");
    back();
  }, [available, back]);

  const x = useStampExport({ album: c.album, stamps: c.mine });
  const strings = x.strings;
  const sections = x.sections;
  const slots = c.album.yoursSlots;
  const at = typeof focus === "string" && SECTIONS.has(focus) ? focus : "";
  const rev = useRev(strings, sections, c.album.full, slots, at, x.busy);
  const sent = useMemo(() => ({ strings, sections, slots }), [strings, sections, slots]);

  const { onAlbum } = c;
  const { onSticker } = x;
  const onAction = useCallback((id: string, action: KAlbumActionKey) => (action === "sticker" ? onSticker(id) : onAlbum(id, action)), [onSticker, onAlbum]);
  // what is being made, else the collection's own line (deleted, removed…)
  const line = x.line || c.line;

  if (!available) return <View style={{ flex: 1, backgroundColor: tk.bg }} />;

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <SurfaceHost>
        <StampAlbum
          ref={ref}
          theme={theme}
          letterFont={letterFont}
          insets={insets}
          rev={rev}
          strings={sent.strings}
          sections={sent.sections}
          full={c.album.full}
          yoursSlots={sent.slots}
          focus={at}
          exportBusy={x.on ? x.busy : undefined}
          onBack={back}
          onMake={c.toPress}
          onFullCta={c.toPaywall}
          onWrite={c.write}
          onAction={onAction}
          onSheet={x.on ? x.onSheet : undefined}
        />
      </SurfaceHost>
      {line ? <Toast msg={line} bottom={insets.bottom + 32} /> : null}
    </View>
  );
}
