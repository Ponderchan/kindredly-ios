import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { t } from "../../lib/i18n";

/* A JOURNAL PAGE'S FILM, shared by both renderers of the page (app/journal/[id]: the React
   Native page draws it in place, the Swift page as an island). Moved here as it was.

   A tap plays or pauses. The ▶ follows the player itself, not the last tap:
   it used to stay hidden once the film had played to its end (nothing set it
   back), and the next tap paused a film that had already stopped, so a
   replay took two taps. Now the end puts ▶ back, and a tap there starts the
   film again from the beginning. */
export function DetailVideo({ uri }: { uri: string }) {
  const [playing, setPlaying] = useState(false);
  const ended = useRef(false);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  useEffect(() => {
    const a = player.addListener("playingChange", (e) => setPlaying(e.isPlaying));
    const b = player.addListener("playToEnd", () => {
      ended.current = true;
      setPlaying(false);
    });
    return () => {
      a.remove();
      b.remove();
    };
  }, [player]);
  const toggle = () => {
    if (playing) {
      player.pause();
      return;
    }
    if (ended.current) {
      ended.current = false;
      player.replay();
      return;
    }
    player.play();
  };
  return (
    <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={playing ? t("jt.pause") : t("jt.play")} style={{ overflow: "hidden", marginBottom: 18 }}>
      <VideoView player={player} style={{ width: "100%", aspectRatio: 9 / 16, maxHeight: 420 }} contentFit="cover" nativeControls={false} />
      {!playing && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 56, height: 56, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 22, marginLeft: 3 }}>▶</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}
