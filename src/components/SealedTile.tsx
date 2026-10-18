import { memo, useEffect, useState } from "react";
import { Image, Pressable, Text, View, useWindowDimensions, type AccessibilityActionEvent } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { PF } from "../theme/post";
import { BRAND } from "../theme/themes";
import { useTheme } from "../lib/theme";
import { fmt } from "../lib/format";
import { playbackPosition, playbackProgress, type VoicePlayback } from "../lib/voice-playback";
import { MoodChip, PlayMark, TypeIcon } from "../screens/notes/notes-glyphs";
import { NOTE_BARS, isAxFontScale, noteBar, photoTiles, type NoteVM, type NotesView } from "../screens/notes/notes-model";

/* ONE NOTE — the React Native twin of Swift's KNoteCard (10a step 5), for
   the Notes fallback. It draws a NoteVM (screens/notes/notes-model), so
   every word on it is the one the SwiftUI card shows.

   THE CARD (the owner's card layouts, 2026-10-18): one paper for every
   page — the theme's card face, a 1.5 outline in the soft line colour (not
   the ink: a diary has one weight and doesn't compete with the letter
   cards; List's rows wear it too), no shadow, corners 22 — and one head row: the mood square (36,
   the group's colour and its face), the date and time in mono 11
   ("OCT 16 · 08:12"), and the kind's icon alone in mute (the owner took
   the words "TEXT", "3 PHOTOS" off it on 2026-10-18). Then the body, always in this order: the words, the voice
   bar, the pictures (you read what you wrote before you see what you
   took). The words come in notes-model's three sizes (textTier): a short
   line at 24/1.3, 41–140 at 17/1.45,
   longer at 15/1.5 cut to six lines (the card opens the page for the rest).
   The pictures follow photoTiles: never a 3×3, at most four tiles, the
   first always the big one, the rest as +N on the last. The voice bar is
   48 tall on soft: the ink play disc, 44 bars (noteBar) that light as it
   plays, the length — the time left while it plays; tapping the bar plays
   in place, tapping anywhere else opens the page. Grid keeps the same
   order at Grid's sizes (chip 28, "OCT 14", words 15 in five lines, the
   pictures at 0.6 of the height, five and more as the 2×2). Pressed, it
   dips a point. VoiceOver hears one button with the whole label, and Play
   / Pause as actions on a voice note.

   LIST is one row: the colour, the label, the one line, the type icon.
   The label gives way before the words: it is capped (LIST_LABEL_MAX, by
   the text size) and shrinks to an ellipsis while the line keeps at least
   LIST_LINE_MIN, so a long mood name ("14 DE OUT. · De coração partido")
   on an iPhone SE still leaves some of the note's words. At accessibility
   text sizes the row stacks — the colour, the label and the icon above,
   the one line under them — as Swift's KNoteCard does.

   A video still plays muted in its own player here (the SwiftUI card shows
   a still frame instead): this is the fallback, and it keeps what the wall
   always did. */

/* the badges sit on the picture, in the same dark ink in every theme */
const ON_PICTURE = "rgba(30,27,53,0.72)";
const ON_PICTURE_SOFT = "rgba(30,27,53,0.55)";

/* List: the label's widest (at the default text size; it grows with the
   text) and the narrowest the one line may get — KNoteCard's numbers */
const LIST_LABEL_MAX = 150;
const LIST_LINE_MIN = 64;

type Props = {
  note: NoteVM;
  layout: NotesView;
  /** the screen's one player (useVoicePlayback state) */
  playback: VoicePlayback | null;
  onPress: (id: string) => void;
  onToggleVoice: (id: string) => void;
  playLabel: string;
  pauseLabel: string;
};

export const SealedTile = memo(function SealedTile({ note, layout, playback, onPress, onToggleVoice, playLabel, pauseLabel }: Props) {
  const { t: tk } = useTheme();
  const { fontScale } = useWindowDimensions();
  const list = layout === "list";
  const grid = layout === "grid";
  // List in one row, or stacked at accessibility text sizes
  const listRow = list && !isAxFontScale(fontScale);
  const listStacked = list && !listRow;
  const chip = list || grid ? { size: 28, radius: 9, face: 18 } : { size: 36, radius: 11, face: 22 };
  const label = list ? note.listLabel : grid ? note.shortLabel : note.label;
  const mine = playback && playback.key === note.id ? playback : null;
  const playing = !!mine?.playing;
  const voice = note.kind === "voice" && !!note.voice;

  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === "activate") onPress(note.id);
    else if (e.nativeEvent.actionName === "voice") onToggleVoice(note.id);
  };

  return (
    <Pressable
      onPress={() => onPress(note.id)}
      accessibilityRole="button"
      accessibilityLabel={note.a11y}
      accessibilityActions={voice && !list ? [{ name: "activate" }, { name: "voice", label: playing ? pauseLabel : playLabel }] : [{ name: "activate" }]}
      onAccessibilityAction={onAction}
      style={({ pressed }) => ({
        backgroundColor: tk.sf,
        borderWidth: 1.5,
        // one weight for the whole diary, List rows included (owner, 2026-10-18)
        borderColor: tk.line,
        borderRadius: list ? 16 : 22,
        flexDirection: listRow ? "row" : "column",
        alignItems: listRow ? "center" : "stretch",
        gap: listRow ? 12 : listStacked ? 8 : grid ? 10 : 12,
        paddingTop: list ? 10 : grid ? 12 : 14,
        paddingBottom: list ? 10 : grid ? 14 : 16,
        paddingLeft: list ? 10 : grid ? 12 : 16,
        paddingRight: list ? 14 : grid ? 12 : 16,
        transform: pressed ? [{ translateX: 1 }, { translateY: 1 }] : [],
        // in Grid a row is as tall as its taller note: both fill it
        flexGrow: grid ? 1 : 0,
      })}
    >
      {/* the head: the group's colour and face, the date, the type */}
      {/* in a List row it shrinks (the label to an ellipsis) before the words do */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 }}>
        <MoodChip group={note.group} icon={note.icon} size={chip.size} radius={chip.radius} face={chip.face} />
        <Text
          numberOfLines={1}
          style={
            list || grid
              ? { flexShrink: 1, maxWidth: listRow ? LIST_LABEL_MAX * fontScale : undefined, fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.32, color: tk.sub }
              : { flex: 1, fontFamily: PF.monoMed, fontSize: 11, letterSpacing: 1.1, color: tk.sub }
          }
        >
          {label}
        </Text>
        {grid && (
          <>
            <View style={{ flex: 1 }} />
            <TypeIcon kind={note.kind} color={tk.ind} />
          </>
        )}
        {/* the kind's icon alone, right-aligned (the owner took the words off it) */}
        {!list && !grid && <TypeIcon kind={note.kind} size={16} color={tk.mute} />}
      </View>

      {/* the body, top to bottom: the words, the voice bar, the pictures */}
      {list ? (
        <Text numberOfLines={1} style={listRow ? { flex: 1, minWidth: LIST_LINE_MIN, fontSize: 15, lineHeight: 22.5, color: tk.ink } : { fontSize: 15, lineHeight: 22.5, color: tk.ink }}>
          {note.listLine}
        </Text>
      ) : note.textTier !== "none" ? (
        <Words note={note} grid={grid} />
      ) : null}

      {!list && voice && <VoiceBar note={note} playback={mine} onToggle={() => onToggleVoice(note.id)} />}

      {!list && note.kind === "photo" && note.photos.length > 0 && <PhotoGrid note={note} grid={grid} />}
      {!list && note.kind === "video" && !!note.video && (
        <View style={{ height: grid ? 132 : 220, borderRadius: 14, overflow: "hidden", backgroundColor: tk.soft2 }}>
          <VideoTile uri={note.video} />
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: ON_PICTURE_SOFT, alignItems: "center", justifyContent: "center" }}>
              <PlayMark playing={false} size={14} color={BRAND.paperWhite} />
            </View>
          </View>
          {!!note.duration && <Badge text={note.duration} />}
        </View>
      )}

      {listRow && (
        <View style={{ flexShrink: 0 }}>
          <TypeIcon kind={note.kind} color={tk.ind} />
        </View>
      )}
    </Pressable>
  );
});

function Badge({ text }: { text: string }) {
  return (
    <View style={{ position: "absolute", right: 8, bottom: 8, backgroundColor: ON_PICTURE, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ fontFamily: PF.monoSemi, fontSize: 10, color: BRAND.paperWhite }}>{text}</Text>
    </View>
  );
}

/* a video in the fallback: muted, playing, looping — the first frames ARE
   the thumbnail, and a paused player showed a black box */
function VideoTile({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.loop = true;
    p.play();
  });
  return <VideoView player={player} style={{ width: "100%", height: "100%" }} contentFit="cover" nativeControls={false} pointerEvents="none" />;
}

/* The words in their size (notes-model textTier): a short line at 24/1.3,
   41–140 at 17/1.45, longer at 15/1.5 cut to six lines, all in the system
   face — serif is for someone else's letter (owner, 2026-10-18). Grid keeps
   its 15 in five. */
function Words({ note, grid }: { note: NoteVM; grid: boolean }) {
  const { t: tk } = useTheme();
  if (grid) return <Text numberOfLines={5} style={{ fontSize: 15, lineHeight: 22.5, color: tk.ink }}>{note.body.trim()}</Text>;
  const style =
    note.textTier === "short"
      ? { fontSize: 24, lineHeight: 31 }
      : note.textTier === "mid"
        ? { fontSize: 17, lineHeight: 24.5 }
        : { fontSize: 15, lineHeight: 22.5 };
  return (
    <Text numberOfLines={note.textTier === "long" ? 6 : undefined} style={{ ...style, color: tk.ink }}>
      {note.body.trim()}
    </Text>
  );
}

/* The pictures (notes-model photoTiles): 1 a tile; 2 side by side; 3 a big
   tile left (2fr) and two small; 4 a 2×2; 5+ the big tile and three small,
   the last under +N. Tiles 4 apart, the block's corners 14. Grid draws them
   at 0.6 of the height, five and more as the 2×2. The first picture is
   always the big tile (owner, 2026-10-18). */
function PhotoGrid({ note, grid }: { note: NoteVM; grid: boolean }) {
  const { t: tk } = useTheme();
  const block = photoTiles(note.photoCount, grid);
  if (!block) return null;
  const p = note.photos;
  const tile = (i: number, more = 0) => (
    <View key={i} style={{ flex: 1, backgroundColor: tk.soft2, overflow: "hidden" }}>
      {!!p[i] && <Image source={{ uri: p[i] }} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityIgnoresInvertColors />}
      {more > 0 && (
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: ON_PICTURE_SOFT, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: PF.monoSemi, fontSize: 15, color: BRAND.paperWhite }}>+{more}</Text>
        </View>
      )}
    </View>
  );
  const col = (children: React.ReactNode, flex = 1) => <View style={{ flex, gap: 4 }}>{children}</View>;
  const row = (children: React.ReactNode, flex = 1) => <View style={{ flex, flexDirection: "row", gap: 4 }}>{children}</View>;
  const more = note.photoMore;
  let inner: React.ReactNode;
  switch (block.tier) {
    case 1:
      inner = tile(0);
      break;
    case 2:
      inner = row([tile(0), tile(1)]);
      break;
    case 3:
      inner = row([<View key="big" style={{ flex: 2 }}>{tile(0)}</View>, <View key="side" style={{ flex: 1, gap: 4 }}>{[tile(1), tile(2)]}</View>]);
      break;
    case 4:
      inner = col([<View key="r1" style={{ flex: 1, flexDirection: "row", gap: 4 }}>{[tile(0), tile(1)]}</View>, <View key="r2" style={{ flex: 1, flexDirection: "row", gap: 4 }}>{[tile(2), tile(3, more)]}</View>]);
      break;
    default:
      inner = row([<View key="big" style={{ flex: 2 }}>{tile(0)}</View>, <View key="side" style={{ flex: 1, gap: 4 }}>{[tile(1), tile(2), tile(3, more)]}</View>]);
  }
  return <View style={{ height: block.height, borderRadius: 14, overflow: "hidden" }}>{inner}</View>;
}

/* The voice bar: 48 tall on soft, corners 14. The ink play disc (32) with a
   white triangle, two bars while it plays; 44 bars 2.5 wide, 2 apart, 4–13
   tall from the page's seed (noteBar), ink at .55 and full ink where it has
   played; the length, or the time left while it plays. The whole bar plays
   in place (the card's other taps open the page). VoiceOver plays it with
   the card's action instead, so the bar itself is hidden from it. */
function VoiceBar({ note, playback, onToggle }: { note: NoteVM; playback: VoicePlayback | null; onToggle: () => void }) {
  const { t: tk } = useTheme();
  const playing = !!playback?.playing;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => tick((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [playing]);
  const started = !!playback && (playing || playback.positionS > 0);
  const progress = started ? playbackProgress(playback) : 0;
  const left = started && playback ? Math.max(0, Math.ceil(playback.durationS - playbackPosition(playback))) : 0;
  const time = started && playback && playback.durationS > 0 ? fmt(left) : note.duration;
  return (
    <Pressable
      onPress={onToggle}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={({ pressed }) => ({ height: 48, borderRadius: 14, backgroundColor: tk.soft, flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 8, paddingRight: 12, opacity: pressed ? 0.75 : 1 })}
    >
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: tk.ink, alignItems: "center", justifyContent: "center" }}>
        <PlayMark playing={playing} size={14} color={tk.bg} />
      </View>
      <View style={{ flex: 1, height: 22, flexDirection: "row", alignItems: "center", gap: 2, overflow: "hidden" }}>
        {Array.from({ length: NOTE_BARS }, (_, i) => (
          <View key={i} style={{ width: 2.5, height: noteBar(note.waveSeed, i), borderRadius: 2, backgroundColor: tk.ink, opacity: started && i / NOTE_BARS < progress ? 1 : 0.55 }} />
        ))}
      </View>
      {!!time && <Text style={{ fontFamily: PF.monoMed, fontSize: 11, letterSpacing: 0.9, color: tk.sub }}>{time}</Text>}
    </Pressable>
  );
}
