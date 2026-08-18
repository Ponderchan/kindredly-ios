import { Pressable, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { C, F } from "../theme/tokens";
import { P, PF } from "../theme/post";
import { fmt } from "../lib/format";

/* Audio playback row — play/pause + progress + duration. Shared by voice
   pool cards, the letter reader, thread openings, and journal voice cards.

   `system` switches it into the postal system's language (Today only, while
   that direction is on trial): square corners, no tinted panel, ruled bars,
   mono numerals. The rounded lavender default stays for every other surface,
   which is still on the old palette. */

const BARS = [12, 18, 24, 16, 20, 26, 14, 22, 18, 24, 20, 14, 22, 16, 24, 18];

export function AudioCard({
  url,
  durationS,
  compact = false,
  tint = C.purple,
  system = false,
}: {
  url: string;
  durationS?: number | null;
  compact?: boolean;
  tint?: string;
  system?: boolean;
}) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  const playing = status.playing;
  const total = status.duration || durationS || 0;
  const pos = status.currentTime || 0;
  const pct = total > 0 ? Math.min(1, pos / total) : 0;

  const toggle = () => {
    if (playing) player.pause();
    else {
      if (total > 0 && pos >= total - 0.3) player.seekTo(0);
      player.play();
    }
  };

  const ink = system ? P.pen : tint;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: system ? 0 : compact ? 10 : 14,
        borderRadius: system ? 0 : 14,
        backgroundColor: system ? "transparent" : C.purpleLt,
      }}
    >
      <Pressable
        onPress={toggle}
        style={{
          width: compact ? 36 : 44,
          height: compact ? 36 : 44,
          borderRadius: system ? 0 : 22,
          backgroundColor: ink,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#fff", fontSize: compact ? 13 : 15, marginLeft: playing ? 0 : 2 }}>
          {playing ? "❚❚" : "▶"}
        </Text>
      </Pressable>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 2, height: 26 }}>
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
      <Text style={{ fontFamily: system ? PF.mono : F.sansBold, fontSize: 12, color: system ? P.ink60 : ink }}>
        {playing || pos > 0 ? fmt(pos) : fmt(total)}
      </Text>
    </View>
  );
}
