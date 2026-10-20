import { Pressable, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { PFM } from "../theme/post";
import { BRAND, MOOD10A, type MoodKey } from "../theme/themes";
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
   play on after a swipe, and hands each row its state. */

const BARS = [12, 18, 24, 16, 20, 26, 14, 22, 18, 24, 20, 14, 22, 16, 24, 18];

/** the 10a mood fill whose ink is `ink`, or null for a tint that isn't a mood ink */
const moodFillOf = (ink: string): string | null => {
  const k = (Object.keys(MOOD10A) as MoodKey[]).find((m) => MOOD10A[m][1].toLowerCase() === ink.toLowerCase());
  return k ? MOOD10A[k][0] : null;
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
/** the time's ink on a mood fill: the mood ink walked 35% toward the brand ink (see above) */
function moodTime(hex: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const a = rgb(hex);
  const b = rgb(BRAND.inkOnBrand);
  return "#" + a.map((c, i) => Math.round(c * 0.65 + b[i] * 0.35).toString(16).padStart(2, "0")).join("").toUpperCase();
}

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

/** The row drawn from someone else's player: whether it plays, where it
    is, how long it runs, and what a press should do. */
export function AudioCardView({
  playing,
  positionS,
  durationS,
  onToggle,
  compact = false,
  tint,
  tintFill,
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
  const { t: tk, dark } = useTheme();
  const total = durationS || 0;
  const pos = positionS || 0;
  const pct = total > 0 ? Math.min(1, pos / total) : 0;

  const ink = system ? P.pen : tint ?? tk.ind;
  // white on a caller's mood colour, as drawn; the page colour on ind
  const glyph = !system && tint ? "#FFFFFF" : tk.bg;
  // Midnight: a mood tint's own fill under the row (see above); null keeps the lav2 panel
  const fill = dark && !system && tint ? (tintFill ?? moodFillOf(tint)) : null;
  const timeInk = system ? P.ink60 : fill ? moodTime(ink) : ink;
  const time = playing || pos > 0 ? fmt(pos) : fmt(total);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: system ? 0 : compact ? 10 : 14,
        borderRadius: system ? 0 : 14,
        backgroundColor: system ? "transparent" : (fill ?? tk.lav2),
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
          // Midnight on a mood fill: the edge Happy's gold lacks there (see above)
          ...(fill ? { borderWidth: 1.5, borderColor: timeInk } : null),
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
                opacity: system ? 1 : lit ? (fill ? 1 : 0.9) : 0.3,
              }}
            />
          );
        })}
      </View>
      <Text accessibilityElementsHidden style={{ ...(system ? PFM.mono : PFM.monoSemi), fontSize: 12, color: timeInk }}>
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
