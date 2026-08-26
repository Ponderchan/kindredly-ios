import { Image, Pressable, Text, View, type ViewStyle } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { P, PF } from "../theme/post";
import { MoodIcon } from "./MoodIcon";
import { AudioCard } from "./AudioCard";
import { getMood } from "../data/moods";
import { fmt, localeTag } from "../lib/format";
import type { JournalEntry } from "../lib/journal";

/* One filed page in your box, closed by a rule in that day's mood colour — so
   scrolling the timeline is scrolling a record of how the days felt, and the
   30 designed mood colours do the work instead of decoration.

   One filed page in your box. Apple Journal's media handling is kept exactly —
   media fills the width, no "PHOTO / VIDEO" labels (the media says what it
   is), several photos become a mosaic, a video plays in place, the mood shows
   only as its face — but the container is now the postal system's: no floating
   white card with a shadow, just a ruled entry on the paper, the way a page is
   filed rather than posted.

   The mood faces, photos, video and the drift highlight are CONTENT and keep
   their own colour. Only the chrome around them is mono. */

function meta(e: JournalEntry): string {
  const d = new Date(e.date);
  const mon = d.toLocaleDateString(localeTag(), { month: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${mon} ${day} · ${time}`;
}

export function SealedEntry({ e, onPress }: { e: JournalEntry; onPress: () => void }) {
  const m = getMood(e.mood);
  const photos = e.type === "photo" ? (e.media?.length ? e.media : e.mediaUri ? [e.mediaUri] : []) : [];
  const hasMedia = e.type === "photo" ? photos.length > 0 : e.type === "voice" || e.type === "video";

  return (
    <Pressable
      onPress={onPress}
      /* A page on the desk, and nothing else. The mood rule that used to run
         along the bottom is gone: on one white surface it was the only thing
         separating one entry from the next, and the desk does that now. What
         it said is already said better at the top of the same sheet by a
         38pt drawn face — and a colour line along a page's bottom edge reads
         as a card underline, which is the exact reading the borders came off
         to avoid. Mood over time has its own place: the calendar view. */
      style={({ pressed }) => ({
        backgroundColor: P.sheet,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 14,
        opacity: pressed ? 0.55 : 1,
      })}
    >
      {/* head — a big mood face + the date filed in mono */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingBottom: hasMedia ? 12 : 8 }}>
        <MoodIcon id={m.id} size={38} />
        <Text style={{ fontFamily: PF.mono, fontSize: 11, letterSpacing: 0.8, color: P.ink60 }}>{meta(e)}</Text>
      </View>

      {/* photo — one fills, several become a mosaic (edge to edge) */}
      {e.type === "photo" && photos.length > 0 && <Mosaic photos={photos} />}

      {/* video — plays in place, just a duration in the corner */}
      {e.type === "video" && !!e.mediaUri && <VideoInline uri={e.mediaUri} dur={e.dur} />}

      {/* voice — still mood-tinted (the mood is content), square-cornered */}
      {e.type === "voice" && !!e.mediaUri && (
        <View style={{ backgroundColor: m.bg, padding: 10 }}>
          <AudioCard url={e.mediaUri} durationS={e.dur} compact tint={m.col} />
        </View>
      )}

      {/* text — clamped so the feed stays scannable; the page has it all.
          A bare text page gets room (9 lines); under media, a caption (3). */}
      {!!e.body && (
        <View style={{ paddingTop: hasMedia ? 12 : 0 }}>
          <Body e={e} pure={e.type === "text"} lines={hasMedia ? 3 : 9} />
        </View>
      )}
    </Pressable>
  );
}

function VideoInline({ uri, dur }: { uri: string; dur?: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play(); // Apple-style: it comes alive in the feed
  });
  return (
    <View style={{ position: "relative", backgroundColor: "#1C1A22" }}>
      <VideoView player={player} style={{ width: "100%", aspectRatio: 4 / 3 }} contentFit="cover" nativeControls={false} pointerEvents="none" />
      <View style={{ position: "absolute", right: 12, bottom: 12, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 }}>
        <Text style={{ color: "#fff", fontFamily: PF.mono, fontSize: 11, letterSpacing: 0.4 }}>{fmt(dur || 0)}</Text>
      </View>
    </View>
  );
}

/* Apple-style photo mosaic: 1 → full; 2 → split; 3 → big + two; 4 → quad;
   5+ → big + a 2×2, the last tile counting the rest. */
function Mosaic({ photos }: { photos: string[] }) {
  const G = 2;
  const H = 240;
  const n = photos.length;

  if (n === 1) return <Image source={{ uri: photos[0] }} style={{ width: "100%", aspectRatio: 4 / 3 }} resizeMode="cover" />;

  if (n === 2)
    return (
      <View style={{ flexDirection: "row", height: H, gap: G }}>
        <Tile uri={photos[0]} style={{ flex: 1 }} />
        <Tile uri={photos[1]} style={{ flex: 1 }} />
      </View>
    );

  if (n === 3)
    return (
      <View style={{ flexDirection: "row", height: H, gap: G }}>
        <Tile uri={photos[0]} style={{ flex: 1.3 }} />
        <View style={{ flex: 1, gap: G }}>
          <Tile uri={photos[1]} style={{ flex: 1 }} />
          <Tile uri={photos[2]} style={{ flex: 1 }} />
        </View>
      </View>
    );

  if (n === 4)
    return (
      <View style={{ flexDirection: "row", height: H, gap: G }}>
        <View style={{ flex: 1, gap: G }}>
          <Tile uri={photos[0]} style={{ flex: 1 }} />
          <Tile uri={photos[2]} style={{ flex: 1 }} />
        </View>
        <View style={{ flex: 1, gap: G }}>
          <Tile uri={photos[1]} style={{ flex: 1 }} />
          <Tile uri={photos[3]} style={{ flex: 1 }} />
        </View>
      </View>
    );

  /* 5+ photos: the reference (Apple Journal's card) splits half and half —
     one anchor photo, a 2x2 of the next four, +N on the last tile. The rule
     was already here; the anchor was just taking 56% instead of 50. */
  return (
    <View style={{ flexDirection: "row", height: H, gap: G }}>
      <Tile uri={photos[0]} style={{ flex: 1 }} />
      <View style={{ flex: 1, gap: G }}>
        <View style={{ flex: 1, flexDirection: "row", gap: G }}>
          <Tile uri={photos[1]} style={{ flex: 1 }} />
          <Tile uri={photos[2]} style={{ flex: 1 }} />
        </View>
        <View style={{ flex: 1, flexDirection: "row", gap: G }}>
          <Tile uri={photos[3]} style={{ flex: 1 }} />
          <Tile uri={photos[4]} style={{ flex: 1 }} plus={n - 5} />
        </View>
      </View>
    </View>
  );
}

function Tile({ uri, style, plus = 0 }: { uri: string; style: ViewStyle; plus?: number }) {
  return (
    <View style={[style, { overflow: "hidden" }]}>
      <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      {plus > 0 && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontFamily: PF.monoSemi, fontSize: 19 }}>+{plus}</Text>
        </View>
      )}
    </View>
  );
}

function Body({ e, pure, lines }: { e: JournalEntry; pure: boolean; lines: number }) {
  const style = { fontFamily: PF.letter, fontSize: pure ? 18 : 15, lineHeight: pure ? 28 : 24, color: pure ? P.ink : P.ink60 } as const;
  const line = e.driftedLine;
  if (line && e.body.includes(line)) {
    const i = e.body.indexOf(line);
    return (
      <Text style={style} numberOfLines={lines}>
        {e.body.slice(0, i)}
        <Text style={{ backgroundColor: "#F6E7A6" }}>{line}</Text>
        {e.body.slice(i + line.length)}
      </Text>
    );
  }
  return (
    <Text style={style} numberOfLines={lines}>
      {e.body}
    </Text>
  );
}
