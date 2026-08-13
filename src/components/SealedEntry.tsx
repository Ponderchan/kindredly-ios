import { Image, Pressable, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { C, F } from "../theme/tokens";
import { MoodIcon } from "./MoodIcon";
import { AudioCard } from "./AudioCard";
import { getMood } from "../data/moods";
import { fmt } from "../lib/format";
import type { JournalEntry } from "../lib/journal";

/* One scrap on the Sealed feed — a clean self-contained card (design 1a). The
   mood shows only as its face; no "CALM" label repeats it. Voice plays as a
   waveform, video shows its own frame under a play button. Drift lives on the
   page, not here — the whole card opens it. */

const TAPE = ["#CDBBEF", "#BFE0C8", "#F3C6D3", "#F5E3A8"]; // washi, app-adjacent

function meta(e: JournalEntry): string {
  const d = new Date(e.date);
  const mon = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${mon} ${day} · ${time}`;
}

function typeTag(e: JournalEntry): string | null {
  if (e.type === "photo") return (e.media?.length || 1) > 1 ? `PHOTO · ${e.media?.length}` : "PHOTO";
  if (e.type === "voice") return `VOICE ${fmt(e.dur || 0)}`;
  if (e.type === "video") return `VIDEO ${fmt(e.dur || 0)}`;
  return null;
}

export function SealedEntry({ e, onPress, tapeIndex = 0 }: { e: JournalEntry; onPress: () => void; tapeIndex?: number }) {
  const m = getMood(e.mood);
  const tape = TAPE[tapeIndex % TAPE.length];
  const tag = typeTag(e);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { backgroundColor: "#fff", borderRadius: 18, padding: 16, marginBottom: 14, opacity: pressed ? 0.96 : 1, shadowColor: "#2A2620", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      ]}
    >
      {/* head — mood face + date, no mood-name label */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <MoodIcon id={m.id} size={24} />
        <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.1, color: C.label }}>{meta(e)}</Text>
        {tag && <Text style={{ fontFamily: F.sansBold, fontSize: 9.5, letterSpacing: 0.8, color: C.faint, marginLeft: "auto" }}>{tag}</Text>}
      </View>

      {/* photo — taped corner, a scrapbook nod */}
      {e.type === "photo" && !!e.mediaUri && (
        <View style={{ marginBottom: e.body ? 14 : 0 }}>
          <View style={{ position: "absolute", left: -4, top: -8, width: 44, height: 17, backgroundColor: tape, opacity: 0.85, transform: [{ rotate: "-8deg" }], borderRadius: 2, zIndex: 2 }} />
          <Image source={{ uri: e.mediaUri }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 12 }} resizeMode="cover" />
        </View>
      )}

      {/* voice — a mood-tinted waveform player */}
      {e.type === "voice" && !!e.mediaUri && (
        <View style={{ backgroundColor: m.bg, borderRadius: 16, padding: 10, marginBottom: e.body ? 14 : 0 }}>
          <AudioCard url={e.mediaUri} durationS={e.dur} compact tint={m.col} />
        </View>
      )}

      {/* video — its own frame under a play button */}
      {e.type === "video" && !!e.mediaUri && (
        <View style={{ marginBottom: e.body ? 14 : 0 }}>
          <VideoThumb uri={e.mediaUri} dur={e.dur} />
        </View>
      )}

      {/* text */}
      {!!e.body && <Body e={e} pure={e.type === "text"} />}
    </Pressable>
  );
}

function VideoThumb({ uri, dur }: { uri: string; dur?: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true; // a still poster, not autoplay; it plays on the page
  });
  return (
    <View style={{ borderRadius: 12, overflow: "hidden", position: "relative", backgroundColor: "#1C1A22" }}>
      <VideoView player={player} style={{ width: "100%", aspectRatio: 4 / 3 }} contentFit="cover" nativeControls={false} pointerEvents="none" />
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(0,0,0,0.42)", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontSize: 20, marginLeft: 3 }}>▶</Text>
        </View>
      </View>
      <View style={{ position: "absolute", right: 10, bottom: 10, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 }}>
        <Text style={{ color: "#fff", fontFamily: F.sansBold, fontSize: 10, letterSpacing: 0.5 }}>VIDEO · {fmt(dur || 0)}</Text>
      </View>
    </View>
  );
}

function Body({ e, pure }: { e: JournalEntry; pure: boolean }) {
  const style = { fontFamily: F.letter, fontSize: pure ? 18 : 15, lineHeight: pure ? 28 : 24, color: pure ? "#2A2620" : "#4A463E" } as const;
  const line = e.driftedLine;
  if (line && e.body.includes(line)) {
    const i = e.body.indexOf(line);
    return (
      <Text style={style}>
        {e.body.slice(0, i)}
        <Text style={{ backgroundColor: "#F6E7A6" }}>{line}</Text>
        {e.body.slice(i + line.length)}
      </Text>
    );
  }
  return <Text style={style}>{e.body}</Text>;
}
