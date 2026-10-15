import { memo, useEffect, useState } from "react";
import { Image, Pressable, Text, View, type AccessibilityActionEvent } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { PF } from "../theme/post";
import { BRAND } from "../theme/themes";
import { useTheme } from "../lib/theme";
import { playbackProgress, type VoicePlayback } from "../lib/voice-playback";
import { MoodChip, PlayMark, TypeIcon } from "../screens/notes/notes-glyphs";
import { waveHeight, type NoteVM, type NotesView } from "../screens/notes/notes-model";

/* ONE NOTE — the React Native twin of Swift's KNoteCard (10a step 5), for
   the Notes fallback. It draws a NoteVM (screens/notes/notes-model), so
   every word on it is the one the SwiftUI card shows.

   The 10a card (H:55, H:344): the theme's card face, a 1.5 ln outline, no
   shadow, corners 22 (16 in List). Along the top, the group's colour with
   its line face (36 on a Card, 28 in Grid and List) and the date in mono —
   "OCT 14 · 21:37 · Sleepy" on a Card, "OCT 14" in Grid (owner question
   9), "OCT 14 · Sleepy" in List — and the type icon in ind. Then what it
   holds: the cover (160 tall, 96 in Grid, +N for the rest), a video's
   frame with its length, or a voice note's waveform with a small play
   mark of our own (owner question 10) on the screen's ONE player; then
   the words — whole on a Card, five lines in Grid, one line in List.
   Pressed, it dips a point. VoiceOver hears one button with the whole
   label, and Play / Pause as actions on a voice note.

   A video still plays muted in its own player here (the SwiftUI card shows
   a still frame instead): this is the fallback, and it keeps what the wall
   always did. */

/* the badges sit on the picture, in the same dark ink in every theme */
const ON_PICTURE = "rgba(30,27,53,0.72)";
const ON_PICTURE_SOFT = "rgba(30,27,53,0.55)";

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
  const list = layout === "list";
  const grid = layout === "grid";
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
        borderColor: tk.ln,
        borderRadius: list ? 16 : 22,
        flexDirection: list ? "row" : "column",
        alignItems: list ? "center" : "stretch",
        gap: list ? 12 : grid ? 10 : 12,
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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexShrink: list ? 0 : 1 }}>
        <MoodChip group={note.group} size={chip.size} radius={chip.radius} face={chip.face} />
        <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.32, color: tk.sub }}>
          {label}
        </Text>
        {!list && (
          <>
            <View style={{ flex: 1 }} />
            <TypeIcon kind={note.kind} color={tk.ind} />
          </>
        )}
      </View>

      {!list && note.kind === "photo" && !!note.photo && (
        <View style={{ height: grid ? 96 : 160, borderRadius: 12, overflow: "hidden", backgroundColor: tk.soft2 }}>
          <Image source={{ uri: note.photo }} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityIgnoresInvertColors />
          {note.photoMore > 0 && <Badge text={`+${note.photoMore}`} />}
        </View>
      )}
      {!list && note.kind === "video" && !!note.video && (
        <View style={{ height: grid ? 96 : 160, borderRadius: 12, overflow: "hidden", backgroundColor: tk.soft2 }}>
          <VideoTile uri={note.video} />
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: ON_PICTURE_SOFT, alignItems: "center", justifyContent: "center" }}>
              <PlayMark playing={false} size={14} color={BRAND.paperWhite} />
            </View>
          </View>
          {!!note.duration && <Badge text={note.duration} />}
        </View>
      )}
      {!list && voice && <VoiceRow note={note} playback={mine} onToggle={() => onToggleVoice(note.id)} />}

      {list ? (
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, lineHeight: 22.5, color: tk.ink }}>
          {note.listLine}
        </Text>
      ) : note.body ? (
        <Text numberOfLines={grid ? 5 : undefined} style={{ fontSize: grid ? 15 : 17, lineHeight: grid ? 22.5 : 25.5, color: tk.ink }}>
          {note.body}
        </Text>
      ) : null}

      {list && <TypeIcon kind={note.kind} color={tk.ind} />}
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

/* A voice note: our small play mark, the seeded bars (4 wide, 3 apart,
   6–34 tall in a 36 box, as many as fit), the length. At rest the bars are
   ind at .8; while it plays, the played part is ind and the rest .3. The
   bars move on locally from the player's last transition. */
function VoiceRow({ note, playback, onToggle }: { note: NoteVM; playback: VoicePlayback | null; onToggle: () => void }) {
  const { t: tk } = useTheme();
  const [w, setW] = useState(0);
  const playing = !!playback?.playing;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => tick((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [playing]);
  const progress = playback ? playbackProgress(playback) : 0;
  const count = w > 0 ? Math.max(1, Math.floor((w + 3) / 7)) : 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Pressable
        onPress={onToggle}
        hitSlop={9}
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={({ pressed }) => ({ width: 26, height: 26, borderRadius: 13, backgroundColor: tk.lav, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
      >
        <PlayMark playing={playing} size={12} color={tk.ind} />
      </Pressable>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flex: 1, height: 36, flexDirection: "row", alignItems: "center", gap: 3, overflow: "hidden" }}>
        {Array.from({ length: count }, (_, i) => {
          const lit = playback && (playing || playback.positionS > 0) ? i / count < progress : null;
          return <View key={i} style={{ width: 4, height: waveHeight(note.waveSeed, i), borderRadius: 2, backgroundColor: tk.ind, opacity: lit === null ? 0.8 : lit ? 1 : 0.3 }} />;
        })}
      </View>
      {!!note.duration && <Text style={{ fontFamily: PF.monoSemi, fontSize: 11, letterSpacing: 1.1, color: tk.sub }}>{note.duration}</Text>}
    </View>
  );
}
