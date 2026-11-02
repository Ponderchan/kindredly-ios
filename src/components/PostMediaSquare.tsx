import { useEffect } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useReducedMotion } from "react-native-reanimated";
import type { WrenPostMedia } from "../lib/wren-desk";

/* A WREN POST'S PICTURE OR FILM (0050; owner, 2026-11-02: the official desk posts with an
   animation, on the phone and the web alike). Drawn in the card's square, the way a release's
   reel is: an image fills it (an animated webp or gif plays — expo-image animates them), a film
   plays muted and loops like a gif, and holds on its first frame for someone who asked for less
   motion. The file is fetched straight from its https address; nothing is signed. */
export function PostMediaSquare({ media }: { media: WrenPostMedia }) {
  if (media.kind === "video") return <PostFilm url={media.url} />;
  return <Image source={{ uri: media.url }} style={{ flex: 1 }} contentFit="cover" transition={150} accessibilityIgnoresInvertColors />;
}

function PostFilm({ url }: { url: string }) {
  const still = useReducedMotion();
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
  });
  useEffect(() => {
    if (still) player.pause();
    else player.play();
  }, [player, still]);
  return (
    <View style={{ flex: 1 }}>
      <VideoView player={player} style={{ flex: 1 }} contentFit="cover" nativeControls={false} />
    </View>
  );
}
