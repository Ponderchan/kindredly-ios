import { Image, Pressable, Text, View } from "react-native";
import { C, F } from "../theme/tokens";
import { MoodIcon } from "./MoodIcon";
import { AudioCard } from "./AudioCard";
import { getMood } from "../data/moods";
import { fmt } from "../lib/format";
import type { JournalEntry } from "../lib/journal";

/* One scrap on the Sealed timeline (design 2a): a mood face sits on a quiet
   spine, the entry hangs to its right. Text lies bare on the paper; a drifted
   line is highlighted where it left. Media is taped/tinted, not filled. The
   whole row opens the full page. Shared by the tab and the day view. */

const SPINE = "#E4DBC7";
const TAPE = ["#CDBBEF", "#BFE0C8", "#F3C6D3", "#F5E3A8"]; // washi, app-adjacent

function meta(e: JournalEntry): string {
  const d = new Date(e.date);
  const wd = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const day = String(d.getDate()).padStart(2, "0");
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${wd} ${day} · ${time} · ${getMood(e.mood).n.toUpperCase()}`;
}

export function SealedEntry({
  e,
  onPress,
  first,
  last,
  tapeIndex = 0,
}: {
  e: JournalEntry;
  onPress: () => void;
  first?: boolean;
  last?: boolean;
  tapeIndex?: number;
}) {
  const m = getMood(e.mood);
  const tape = TAPE[tapeIndex % TAPE.length];

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", opacity: pressed ? 0.94 : 1 })}>
      {/* gutter — the spine + the mood-face node */}
      <View style={{ width: 40 }}>
        <View
          style={{
            position: "absolute",
            left: 18,
            width: 2,
            backgroundColor: SPINE,
            top: first ? 17 : 0,
            ...(last ? { height: 17 } : { bottom: 0 }),
          }}
        />
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: C.cream,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MoodIcon id={m.id} size={30} />
        </View>
      </View>

      {/* content */}
      <View style={{ flex: 1, paddingLeft: 4, paddingBottom: 26, paddingTop: 2 }}>
        <Text style={{ fontFamily: F.sansBold, fontSize: 10.5, letterSpacing: 1.1, color: C.label, marginBottom: 8 }}>{meta(e)}</Text>

        {/* photo — taped white card */}
        {e.type === "photo" && !!e.mediaUri && (
          <View style={{ marginBottom: e.body ? 12 : 0 }}>
            <View style={{ position: "absolute", left: -6, top: -7, width: 46, height: 18, backgroundColor: tape, opacity: 0.85, transform: [{ rotate: "-8deg" }], borderRadius: 2, zIndex: 2 }} />
            <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 7, shadowColor: "#2A2620", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}>
              <Image source={{ uri: e.mediaUri }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 8 }} resizeMode="cover" />
              {(e.media?.length || 0) > 1 && (
                <View style={{ position: "absolute", right: 14, bottom: 14, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                  <Text style={{ color: "#fff", fontSize: 10.5, fontFamily: F.sansBold }}>▦ {e.media?.length}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* voice — mood-tinted pill */}
        {e.type === "voice" && !!e.mediaUri && (
          <View style={{ backgroundColor: m.bg, borderRadius: 16, padding: 10, marginBottom: e.body ? 12 : 0 }}>
            <AudioCard url={e.mediaUri} durationS={e.dur} compact tint={m.col} />
          </View>
        )}

        {/* video — a quiet card, plays in the page */}
        {e.type === "video" && (
          <View style={{ backgroundColor: "#1C1A22", borderRadius: 14, height: 132, alignItems: "center", justifyContent: "center", marginBottom: e.body ? 12 : 0 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontSize: 17, marginLeft: 3 }}>▶</Text>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontFamily: F.sansBold, fontSize: 10, letterSpacing: 1, marginTop: 8 }}>VIDEO · {fmt(e.dur || 0)}</Text>
          </View>
        )}

        {/* text — bare on the paper; a drifted line stays highlighted */}
        {!!e.body && <Body e={e} pure={e.type === "text"} />}
      </View>
    </Pressable>
  );
}

function Body({ e, pure }: { e: JournalEntry; pure: boolean }) {
  const style = { fontFamily: F.letter, fontSize: pure ? 19 : 15, lineHeight: pure ? 29 : 24, color: pure ? "#2A2620" : "#4A463E" } as const;
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
