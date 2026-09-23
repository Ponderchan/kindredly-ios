import { Image, Pressable, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import Svg, { Path, Rect } from "react-native-svg";
import { P, PF } from "../theme/post";
import { W14, cardShadow } from "./AuraCard";
import { MoodIcon } from "./MoodIcon";
import { getMood } from "../data/moods";
import { fmt, hashStr, localeTag } from "../lib/format";
import type { JournalEntry } from "../lib/journal";

/* ONE PAGE ON THE WALL — the owner's T7 (Sealed Eight Sets).
   ────────────────────────────────────────────────────────────────────────
   A white card whose height is its content's: six lines of serif for a
   text page; a photo edge to edge with +N; a voice page is its waveform
   with the play button on the bar and, when there are words, one line
   of them beneath; a video is its first frame with a play mark and the
   length. Along the top of every card: the mood's own face, the day, and
   the kind — the top since 2026-09-23, as on the web's card and the way a
   letter wears its postmark: a page is found by its day, and in two
   columns of uneven cards the tops are the one line the eye comes back
   to. One picture, with +N for the rest. Two columns of these, dealt in
   turn, is the wall. */

/* each kind's own colour — the sheet's four: text indigo, photo green,
   voice amber, video coral. The voice bar wears it too, not the mood. */
const KIND_INK: Record<JournalEntry["type"], string> = { text: "#3A34D6", photo: "#2E7D4F", voice: "#C98A1B", video: "#E5484D" };

export const day = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString(localeTag(), { month: "short" }).toUpperCase()} ${d.getDate()}`;
};

export function SealedTile({ e, onPress }: { e: JournalEntry; onPress: () => void }) {
  const m = getMood(e.mood);
  const photos = e.type === "photo" ? (e.media?.length ? e.media : e.mediaUri ? [e.mediaUri] : []) : [];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ backgroundColor: W14.card, borderRadius: 14, overflow: "hidden", opacity: pressed ? 0.85 : 1 }, cardShadow, { shadowOpacity: 0.05 }]}>
      {/* the head: the mood's face on a tile of its own colour, the day in
          solid ink, the kind in its type colour */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 8 }}>
        <View style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: m.bg, alignItems: "center", justifyContent: "center" }}>
          <MoodIcon id={m.id} size={20} />
        </View>
        <Text style={{ flex: 1, fontFamily: PF.monoSemi, fontSize: 10.5, letterSpacing: 1.4, color: P.ink }} numberOfLines={1}>{day(e.date)}</Text>
        <KindMark kind={e.type} />
      </View>

      {e.type === "photo" && photos.length > 0 && (
        <View style={{ marginHorizontal: 8, borderRadius: 10, overflow: "hidden" }}>
          <Image source={{ uri: photos[0] }} style={{ width: "100%", aspectRatio: 1 }} resizeMode="cover" />
          {photos.length > 1 && (
            <View style={{ position: "absolute", right: 8, bottom: 8, backgroundColor: "rgba(30,27,53,0.72)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, color: "#FFFFFF" }}>+{photos.length - 1}</Text>
            </View>
          )}
        </View>
      )}
      {e.type === "video" && !!e.mediaUri && (
        <View style={{ marginHorizontal: 8, borderRadius: 10, overflow: "hidden" }}>
          <VideoTile uri={e.mediaUri} dur={e.dur} />
        </View>
      )}
      {e.type === "voice" && !!e.mediaUri && <VoiceTile uri={e.mediaUri} dur={e.dur} tint={KIND_INK.voice} seed={e.id} />}

      {/* the words: a text page gets six lines; a caption under media gets two */}
      {!!e.body ? (
        <View style={{ paddingHorizontal: 12, paddingTop: e.type === "text" ? 2 : 8, paddingBottom: 12 }}>
          {/* a page, not a letter: the system face (SF / PingFang), as the
              rest of the sealed room has always been — the serif is for
              letters between people. 15.5 / 25 for a page, 13 / 20 for a
              caption; clamped by LINES, so a cut never lands inside a glyph */}
          <Text style={{ fontFamily: PF.letter, fontSize: e.type === "text" ? 15.5 : 13, lineHeight: e.type === "text" ? 25 : 20, color: e.type === "text" ? P.ink : P.ink60 }} numberOfLines={e.type === "text" ? 6 : 2}>
            {e.body}
          </Text>
        </View>
      ) : (
        <View style={{ height: 10 }} />
      )}
    </Pressable>
  );
}

export function KindMark({ kind }: { kind: JournalEntry["type"] }) {
  const c = KIND_INK[kind];
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      {kind === "text" && <Path d="M4 7h16M4 12h16M4 17h10" />}
      {kind === "photo" && (
        <>
          <Rect x={3} y={4} width={18} height={16} rx={2} />
          <Path d="M3 16l5-5 4 4 3-3 6 6" />
        </>
      )}
      {kind === "voice" && <Path d="M5 10v4M9 7v10M13 4v16M17 8v8M21 11v2" />}
      {kind === "video" && (
        <>
          <Rect x={3} y={5} width={18} height={14} rx={2} />
          <Path d="M10 9l5 3-5 3z" fill={c} />
        </>
      )}
    </Svg>
  );
}

/* a video: its first frame, still, a play mark and the length */
function VideoTile({ uri, dur }: { uri: string; dur?: number }) {
  // muted, playing, looping — the first frames ARE the thumbnail, and a
  // paused player showed a black box in the wall
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.loop = true;
    p.play();
  });
  return (
    <View style={{ backgroundColor: "#1C1A22", aspectRatio: 4 / 3 }}>
      <VideoView player={player} style={{ width: "100%", height: "100%" }} contentFit="cover" nativeControls={false} pointerEvents="none" />
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(30,27,53,0.55)", alignItems: "center", justifyContent: "center" }}>
          <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path d="M8 5l12 7-12 7z" fill="#FFFFFF" />
          </Svg>
        </View>
      </View>
      <View style={{ position: "absolute", right: 8, bottom: 8, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
        <Text style={{ color: "#fff", fontFamily: PF.monoSemi, fontSize: 10 }}>{fmt(dur || 0)}</Text>
      </View>
    </View>
  );
}

/* a voice page: the play button on the bar, bars as long as the recording
   (one per two seconds, capped), the length at the end. The bar heights are
   fixed per page so the card never dances. */
function VoiceTile({ uri, dur, tint, seed }: { uri: string; dur?: number; tint: string; seed: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const total = status.duration || dur || 0;
  const pct = total > 0 ? Math.min(1, (status.currentTime || 0) / total) : 0;
  const n = Math.max(9, Math.min(22, Math.round((dur || 0) / 2) + 6));
  const bars = Array.from({ length: n }, (_, i) => 5 + (hashStr(`${seed}:${i}`) % 13));
  const toggle = () => {
    if (status.playing) player.pause();
    else {
      if (total > 0 && pct >= 0.99) player.seekTo(0);
      player.play();
    }
  };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingTop: 2 }}>
      <Pressable onPress={toggle} hitSlop={8} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
        <Svg width={12} height={12} viewBox="0 0 24 24">
          {status.playing ? <Path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="#FFFFFF" /> : <Path d="M8 5l12 7-12 7z" fill="#FFFFFF" />}
        </Svg>
      </Pressable>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 2, height: 22 }}>
        {bars.map((h, i) => (
          <View key={i} style={{ width: 3, height: h, borderRadius: 1.5, backgroundColor: i / n < pct ? tint : "#DCD9F0" }} />
        ))}
      </View>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 9.5, color: P.ink60 }}>{fmt(dur || 0)}</Text>
    </View>
  );
}
