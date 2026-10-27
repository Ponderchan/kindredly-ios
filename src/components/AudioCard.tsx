import { Pressable, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Host } from "@expo/ui/swift-ui";
import { KAudioCardView, type KAudioCardLook } from "../../modules/kindredly-ui";
import { PFM } from "../theme/post";
import { BRAND, MOOD10A } from "../theme/themes";
import { useTheme } from "../lib/theme";
import { t, useLang } from "../lib/i18n";
import { NativeSurface, useSurfaceHost, type SurfaceHostLink } from "./NativeSurface";
import { audioCardHeight, audioCardLook, type AudioCardLook as CardLook } from "./audio-card-model";
import "../data/strings-step5-platform"; // vo.play, vo.pause

/* Audio playback row — play/pause + progress + duration. Shared by voice
   pool cards, the letter reader, thread openings, and journal voice cards.

   `system` switches it into the postal system's language (Today only, while
   that direction is on trial): square corners, no tinted panel, ruled bars,
   mono numerals. The rounded lavender default stays for every other surface.

   The chrome is the theme's: the rounded panel is the accent's palest wash
   (lav2), the default tint is ind, and the play glyph on it is the page
   colour. A `tint` the caller passes is content (a journal page's mood
   colour) and is kept as given, with the white glyph it was drawn with.

   MIDNIGHT: A MOOD TINT SITS ON ITS OWN FILL (7.1). There lav2 is #242150:
   Tired, Low and Calm came out 1.9–3.0:1 on it, a dark slab inside the day
   page's pale mood frame. So on a dark theme a tint that is one of the 10a
   mood inks draws on that mood's fill (MOOD10A; or the caller's tintFill),
   a fixed light object like the mood tiles: the disc and the bars keep the
   ink as given (the gold stays Happy's ink, owner 2026-10-16), the lit bars
   at full strength, and the time takes the ink walked 35% toward the brand
   ink (moodTime), 4.7–8.4:1 on the four fills where the inks themselves
   are 2.7–6.2. Happy goes the other way: its gold was 4.5:1 on lav2 and is
   2.7:1 on its own fill, so on a fill the disc is ringed in the time ink
   (Happy's #825F2E 4.7:1, the others 6.2–8.4); its lit bars stay 2.7:1,
   and the time beside them carries where the voice is. The light themes
   keep the lav2 panel exactly as before.

   VoiceOver hears the button by name — "Play the voice letter" / "Pause"
   (vo.play / vo.pause; a journal page passes its own, jt.play / jt.pause) —
   with the time as its value, not the ▶ glyph.

   TWO WAYS TO PLAY (10a step 5). AudioCard plays its own url with its own
   expo-audio player, as it always has. AudioCardView draws the same row
   from a player someone else holds: a screen with several voice letters
   (Today's pages) keeps ONE player (lib/voice-playback) so a letter can't
   play on after a swipe, and hands each row its state.

   TWO WAYS TO DRAW IT (2026-10-27). Every colour, size, the time and each
   bar are audio-card-model's (audioCardLook, with the rules above). With
   the "audiocard" switch on (lib/surfaces) and the binary carrying
   KAudioCardView, AudioCardView draws them in SwiftUI, in a small Host of
   its own (NativeSurface: the crash breadcrumb, a JS error back to React
   Native); otherwise AudioCardViewRN, the row as always. The player stays
   in TS either way. Inside a Swift screen (an island) it is always React
   Native — a Host is never nested in a Host; the Swift composers draw the
   Swift card themselves (components/VoiceSlot). */

const MOODS = Object.values(MOOD10A);

export type AudioCardLook = {
  compact?: boolean;
  tint?: string;
  /** Midnight only: the ground under `tint` (default: the mood's own fill when the tint is a
      10a mood ink; "transparent" when the row already sits on that fill). The light themes
      keep the lav2 panel. */
  tintFill?: string;
  system?: boolean;
  /** VoiceOver name of the button while stopped (default vo.play) */
  playLabel?: string;
  /** VoiceOver name of the button while playing (default vo.pause) */
  pauseLabel?: string;
};
type ViewProps = AudioCardLook & {
  playing: boolean;
  /** seconds in */
  positionS: number;
  /** seconds in all (0 = not known yet) */
  durationS: number;
  onToggle: () => void;
};

/** The row's look in this theme, for one moment of playback (audio-card-model). */
export function useAudioCardLook(p: Omit<ViewProps, "onToggle" | "playLabel" | "pauseLabel">): CardLook {
  const { t: tk, dark } = useTheme();
  return audioCardLook({
    theme: tk,
    dark,
    moods: MOODS,
    inkOnBrand: BRAND.inkOnBrand,
    compact: p.compact,
    tint: p.tint,
    tintFill: p.tintFill,
    system: p.system,
    playing: p.playing,
    positionS: p.positionS,
    durationS: p.durationS,
  });
}

/** The look as the Swift row takes it: every field but how far through (the bars say it). */
export function swiftAudioLook(look: CardLook): KAudioCardLook {
  const { pct: _pct, ...rest } = look;
  return rest;
}

/** The row drawn from someone else's player: whether it plays, where it
    is, how long it runs, and what a press should do. */
export function AudioCardView(props: ViewProps) {
  const inSwift = useSurfaceHost() !== null;
  const rn = () => <AudioCardViewRN {...props} />;
  if (inSwift) return rn();
  return (
    <NativeSurface
      surface="audiocard"
      view="KAudioCardView"
      mode="mount"
      native={(host) => <AudioCardViewSwift {...props} host={host} />}
      fallback={rn}
      // the same row, drawn by React Native for the moment the phone's answers take
      pending={rn}
    />
  );
}

/* The Swift row: its width from React Native, its height from SwiftUI. The row's own height
   holds the room while the Host lays out, so nothing under it moves. */
function AudioCardViewSwift({ host, onToggle, playLabel, pauseLabel, ...p }: ViewProps & { host: SurfaceHostLink }) {
  useLang();
  const { key: theme, dark } = useTheme();
  const look = useAudioCardLook(p);
  return (
    <View style={{ minHeight: audioCardHeight(!!p.compact, !!p.system) }}>
      <Host matchContents={{ vertical: true }} colorScheme={dark ? "dark" : "light"} ignoreSafeArea="all" onLayoutContent={host.onLayoutContent}>
        <KAudioCardView
          theme={theme}
          look={swiftAudioLook(look)}
          playing={p.playing}
          label={p.playing ? (pauseLabel ?? t("vo.pause")) : (playLabel ?? t("vo.play"))}
          onToggle={onToggle}
        />
      </Host>
    </View>
  );
}

/** The React Native row (the "audiocard" switch's fallback). */
export function AudioCardViewRN({ onToggle, playLabel, pauseLabel, ...p }: ViewProps) {
  useLang();
  const look = useAudioCardLook(p);
  const playing = p.playing;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: look.padding,
        borderRadius: look.radius,
        backgroundColor: look.panel,
      }}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={playing ? (pauseLabel ?? t("vo.pause")) : (playLabel ?? t("vo.play"))}
        accessibilityValue={{ text: look.time }}
        style={{
          width: look.disc,
          height: look.disc,
          borderRadius: look.discRadius,
          backgroundColor: look.ink,
          // Midnight on a mood fill: the edge Happy's gold lacks there (see above)
          ...(look.edge ? { borderWidth: 1.5, borderColor: look.edge } : null),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: look.glyph, fontSize: look.glyphSize, marginLeft: look.glyphNudge }}>
          {playing ? "❚❚" : "▶"}
        </Text>
      </Pressable>
      <View accessibilityElementsHidden style={{ flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 2, height: 26 }}>
        {look.bars.map((b, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: b.h,
              borderRadius: look.barRadius,
              backgroundColor: b.color,
              opacity: b.alpha,
            }}
          />
        ))}
      </View>
      <Text accessibilityElementsHidden style={{ ...(look.mono === "regular" ? PFM.mono : PFM.monoSemi), fontSize: 12, color: look.timeInk }}>
        {look.time}
      </Text>
    </View>
  );
}

/** A voice file's own player: plays `url`, restarting from the top when pressed at the end. */
export function useOwnPlayer(url: string, durationS?: number | null) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  const playing = status.playing;
  const total = status.duration || durationS || 0;
  const pos = status.currentTime || 0;

  const toggle = () => {
    if (playing) player.pause();
    else {
      if (total > 0 && pos >= total - 0.3) player.seekTo(0);
      player.play();
    }
  };

  return { playing, positionS: pos, durationS: total, toggle };
}

/** The row with its own player: plays `url`, restarting from the top when
    pressed at the end. */
export function AudioCard({
  url,
  durationS,
  ...look
}: AudioCardLook & {
  url: string;
  durationS?: number | null;
}) {
  const own = useOwnPlayer(url, durationS);
  return <AudioCardView {...look} playing={own.playing} positionS={own.positionS} durationS={own.durationS} onToggle={own.toggle} />;
}
