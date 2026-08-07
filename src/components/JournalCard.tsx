import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { C, F, cardStyle } from "../theme/tokens";
import { MoodIcon } from "./MoodIcon";
import { AudioCard } from "./AudioCard";
import { getMood } from "../data/moods";
import { dLong, fmt } from "../lib/format";
import type { JournalEntry } from "../lib/journal";

/* One journal page — four layouts by entry type. Pure text pages soak in
   their mood colour; pages with media stay plain white and let the media
   carry the colour (the mood shows as a small chip instead). */

export function JournalCard({
  e,
  onToggleDrift,
  onPress,
}: {
  e: JournalEntry;
  onToggleDrift: () => void;
  onPress?: () => void;
}) {
  const m = getMood(e.mood);
  const drifted = !!e.driftedLine;
  const canDrift = e.body.trim().length >= 3; // only text lines can leave
  const pure = e.type === "text";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        cardStyle,
        { borderRadius: 18, padding: 20, marginBottom: 12, backgroundColor: pure ? m.bg : C.card, overflow: "hidden", opacity: pressed ? 0.96 : 1 },
      ]}
    >
      {pure && (
        <View style={{ position: "absolute", right: -14, bottom: -10 }}>
          <MoodIcon id={m.id} size={96} watermark />
        </View>
      )}

      {/* head — pure pages lead with the mood plate; media pages a quiet chip */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {pure ? (
          <MoodIcon id={m.id} size={26} />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: m.bg }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: m.col }} />
            <Text style={{ fontFamily: F.sansSemi, fontSize: 11, color: "#4A4A52" }}>{m.n}</Text>
          </View>
        )}
        <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.2, color: C.label }}>
          {dLong(e.date).toUpperCase()}
        </Text>
        {e.type !== "text" && (
          <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, color: C.muted, marginLeft: "auto" }}>
            {e.type === "photo" ? "🖼" : e.type === "voice" ? `🎙 ${fmt(e.dur || 0)}` : `🎬 ${fmt(e.dur || 0)}`}
          </Text>
        )}
      </View>

      {/* media */}
      {e.type === "photo" && e.mediaUri && (
        <View style={{ borderRadius: 14, overflow: "hidden", marginBottom: e.body ? 14 : 4, position: "relative" }}>
          <Image source={{ uri: e.mediaUri }} style={{ width: "100%", aspectRatio: 4 / 5 }} resizeMode="cover" />
          {(e.media?.length || 0) > 1 && (
            <View style={{ position: "absolute", right: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: "#fff", fontSize: 11, fontFamily: F.sansBold }}>▦ +{(e.media?.length || 1) - 1}</Text>
            </View>
          )}
        </View>
      )}
      {e.type === "voice" && e.mediaUri && (
        <View style={{ marginBottom: e.body ? 14 : 4 }}>
          <AudioCard url={e.mediaUri} durationS={e.dur} compact tint={m.col} />
        </View>
      )}
      {e.type === "video" && e.mediaUri && <VideoBlock uri={e.mediaUri} hasCaption={!!e.body} />}

      {/* text */}
      {!!e.body && (
        <Text style={{ fontFamily: F.letter, fontSize: pure ? 17 : 14.5, lineHeight: pure ? 27 : 23, color: pure ? "#2A2620" : "#3A3A42" }}>
          {e.body}
        </Text>
      )}

      {/* drift toggle — text lines only */}
      {canDrift && (
        <Pressable onPress={onToggleDrift} style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              borderWidth: 1.5,
              borderColor: drifted ? C.purple : C.faint,
              backgroundColor: drifted ? C.purple : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {drifted && <Text style={{ color: "#fff", fontSize: 9 }}>✓</Text>}
          </View>
          <Text style={{ fontFamily: F.sans, fontSize: 12, color: drifted ? C.purple : C.muted }}>
            {drifted ? "One line is out in the world" : "Let one line drift out"}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}

function VideoBlock({ uri, hasCaption }: { uri: string; hasCaption: boolean }) {
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  const toggle = () => {
    if (playing) player.pause();
    else player.play();
    setPlaying(!playing);
  };
  return (
    <Pressable onPress={toggle} style={{ borderRadius: 14, overflow: "hidden", marginBottom: hasCaption ? 14 : 4, maxHeight: 320 }}>
      <VideoView player={player} style={{ width: "100%", aspectRatio: 9 / 16, maxHeight: 320 }} contentFit="cover" nativeControls={false} />
      {!playing && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 20, marginLeft: 3 }}>▶</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}
