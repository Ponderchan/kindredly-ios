import { Pressable, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { C, F } from "../theme/tokens";
import { fmt } from "../lib/format";

/* Audio playback row — play/pause + progress + duration. Shared by voice
   pool cards, the letter reader, thread openings, and journal voice cards. */

const BARS = [12, 18, 24, 16, 20, 26, 14, 22, 18, 24, 20, 14, 22, 16, 24, 18];

export function AudioCard({
  url,
  durationS,
  compact = false,
  tint = C.purple,
}: {
  url: string;
  durationS?: number | null;
  compact?: boolean;
  tint?: string;
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

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: compact ? 10 : 14,
        borderRadius: 14,
        backgroundColor: C.purpleLt,
      }}
    >
      <Pressable
        onPress={toggle}
        style={{
          width: compact ? 36 : 44,
          height: compact ? 36 : 44,
          borderRadius: 22,
          backgroundColor: tint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#fff", fontSize: compact ? 13 : 15, marginLeft: playing ? 0 : 2 }}>
          {playing ? "❚❚" : "▶"}
        </Text>
      </Pressable>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 2, height: 24 }}>
        {BARS.map((h, i) => {
          const lit = i / BARS.length <= pct;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: compact ? h * 0.75 : h,
                borderRadius: 2,
                backgroundColor: tint,
                opacity: lit ? 0.9 : 0.3,
              }}
            />
          );
        })}
      </View>
      <Text style={{ fontFamily: F.sansBold, fontSize: 12, color: tint }}>
        {playing || pos > 0 ? fmt(pos) : fmt(total)}
      </Text>
    </View>
  );
}
