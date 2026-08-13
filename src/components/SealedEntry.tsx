import { Image, Pressable, Text, View } from "react-native";
import { C, F } from "../theme/tokens";
import { MoodIcon } from "./MoodIcon";
import { AudioCard } from "./AudioCard";
import { getMood } from "../data/moods";
import { fmt } from "../lib/format";
import type { JournalEntry } from "../lib/journal";

/* One scrap on the Sealed feed — a clean self-contained card (design 1a). The
   mood shows only as its face; no "CALM" label repeats it. White card, media
   inline, text in serif, a drifted line highlighted where it left. A text page
   can let one line drift from here; the whole card opens the full page. */

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

export function SealedEntry({
  e,
  onPress,
  onDrift,
  tapeIndex = 0,
}: {
  e: JournalEntry;
  onPress: () => void;
  onDrift?: () => void;
  tapeIndex?: number;
}) {
  const m = getMood(e.mood);
  const tape = TAPE[tapeIndex % TAPE.length];
  const tag = typeTag(e);
  const drifted = !!e.driftedLine;
  const canDrift = !!onDrift && e.type === "text" && e.body.trim().length >= 3;

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

      {/* voice — mood-tinted pill */}
      {e.type === "voice" && !!e.mediaUri && (
        <View style={{ backgroundColor: m.bg, borderRadius: 16, padding: 10, marginBottom: e.body ? 14 : 0 }}>
          <AudioCard url={e.mediaUri} durationS={e.dur} compact tint={m.col} />
        </View>
      )}

      {/* video — plays in the page */}
      {e.type === "video" && (
        <View style={{ backgroundColor: "#1C1A22", borderRadius: 12, height: 150, alignItems: "center", justifyContent: "center", marginBottom: e.body ? 14 : 0 }}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 18, marginLeft: 3 }}>▶</Text>
          </View>
        </View>
      )}

      {/* text */}
      {!!e.body && <Body e={e} pure={e.type === "text"} />}

      {/* drift — text pages only, from here like the reference */}
      {canDrift && (
        <>
          <View style={{ height: 1, backgroundColor: C.line, marginTop: 14, marginBottom: 12 }} />
          <Pressable onPress={onDrift} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: drifted ? C.purple : C.faint, backgroundColor: drifted ? C.purple : "transparent", alignItems: "center", justifyContent: "center" }}>
              {drifted && <Text style={{ color: "#fff", fontSize: 10 }}>✓</Text>}
            </View>
            <Text style={{ fontFamily: F.sans, fontSize: 12.5, color: drifted ? C.purple : C.muted }}>
              {drifted ? "One line is out in the world" : "Let one line drift out"}
            </Text>
            <Text style={{ fontFamily: F.sansBold, fontSize: 9.5, letterSpacing: 1.2, color: C.faint, marginLeft: "auto" }}>SEALED</Text>
          </Pressable>
        </>
      )}
    </Pressable>
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
