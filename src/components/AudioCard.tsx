import { Pressable, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { F } from "../theme/tokens";
import { PF } from "../theme/post";
import { useP, useTheme } from "../lib/theme";
import { fmt } from "../lib/format";
import { t, useLang } from "../lib/i18n";
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

   VoiceOver hears the button by name — "Play the voice letter" / "Pause"
   (vo.play / vo.pause; a journal page passes its own, jt.play / jt.pause) —
   with the time as its value, not the ▶ glyph.

   TWO WAYS TO PLAY (10a step 5). AudioCard plays its own url with its own
   expo-audio player, as it always has. AudioCardView draws the same row
   from a player someone else holds: a screen with several voice letters
   (Today's pages) keeps ONE player (lib/voice-playback) so a letter can't
   play on after a swipe, and hands each row its state. */

const BARS = [12, 18, 24, 16, 20, 26, 14, 22, 18, 24, 20, 14, 22, 16, 24, 18];

export type AudioCardLook = {
  compact?: boolean;
  tint?: string;
  system?: boolean;
  /** VoiceOver name of the button while stopped (default vo.play) */
  playLabel?: string;
  /** VoiceOver name of the button while playing (default vo.pause) */
  pauseLabel?: string;
};

/** The row drawn from someone else's player: whether it plays, where it
    is, how long it runs, and what a press should do. */
export function AudioCardView({
  playing,
  positionS,
  durationS,
  onToggle,
  compact = false,
  tint,
  system = false,
  playLabel,
  pauseLabel,
}: AudioCardLook & {
  playing: boolean;
  /** seconds in */
  positionS: number;
  /** seconds in all (0 = not known yet) */
  durationS: number;
  onToggle: () => void;
}) {
  useLang();
  const P = useP();
  const { t: tk } = useTheme();
  const total = durationS || 0;
  const pos = positionS || 0;
  const pct = total > 0 ? Math.min(1, pos / total) : 0;

  const ink = system ? P.pen : tint ?? tk.ind;
  // white on a caller's mood colour, as drawn; the page colour on ind
  const glyph = !system && tint ? "#FFFFFF" : tk.bg;
  const time = playing || pos > 0 ? fmt(pos) : fmt(total);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: system ? 0 : compact ? 10 : 14,
        borderRadius: system ? 0 : 14,
        backgroundColor: system ? "transparent" : tk.lav2,
      }}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={playing ? (pauseLabel ?? t("vo.pause")) : (playLabel ?? t("vo.play"))}
        accessibilityValue={{ text: time }}
        style={{
          width: compact ? 36 : 44,
          height: compact ? 36 : 44,
          borderRadius: system ? 0 : 22,
          backgroundColor: ink,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: glyph, fontSize: compact ? 13 : 15, marginLeft: playing ? 0 : 2 }}>
          {playing ? "❚❚" : "▶"}
        </Text>
      </Pressable>
      <View accessibilityElementsHidden style={{ flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 2, height: 26 }}>
        {BARS.map((h, i) => {
          const lit = i / BARS.length <= pct;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: compact ? h * 0.75 : h,
                borderRadius: system ? 0 : 2,
                backgroundColor: system ? (lit ? P.pen : P.ink12) : ink,
                opacity: system ? 1 : lit ? 0.9 : 0.3,
              }}
            />
          );
        })}
      </View>
      <Text accessibilityElementsHidden style={{ fontFamily: system ? PF.mono : F.sansBold, fontSize: 12, color: system ? P.ink60 : ink }}>
        {time}
      </Text>
    </View>
  );
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

  return <AudioCardView {...look} playing={playing} positionS={pos} durationS={total} onToggle={toggle} />;
}
