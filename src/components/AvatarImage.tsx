import { View } from "react-native";
import { Image } from "expo-image";
import { SvgXml } from "react-native-svg";
import { getAvatar } from "../data/avatar-lib";
import { getFace } from "../data/aura-avatar-lib";
import { StrangerAvatar } from "./StrangerAvatar";

/* Your face on Kindredly — a photo you chose, one of the fifty portraits,
   or (for accounts that chose one before 2026-09-16) one of the thirty
   hand-drawn faces, which stay renderable. Falls back to the glyph. */
export function AvatarImage({
  id,
  photoUri,
  seed,
  size = 48,
  round = true,
}: {
  id?: string | null;
  photoUri?: string | null;
  seed: string;
  size?: number;
  round?: boolean;
}) {
  const radius = round ? size / 2 : size * 0.3;
  if (photoUri) {
    return (
      <Image
        source={{ uri: photoUri }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: "#EDEDEA" }}
        contentFit="cover"
      />
    );
  }
  const face = getFace(id);
  if (face) {
    /* the 2026-10-15 portraits are full-bleed colour made for the circle;
       only a legacy one still carries its ink rim at the edge of the file
       (7 px of 512), which clipped to a circle reads as a black hairline —
       that one is drawn a touch larger than the clip so the rim falls outside */
    const over = face.legacy ? Math.ceil(size * 0.05) : 0;
    return (
      <View style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", backgroundColor: "#EFEDFA" }}>
        <Image source={face.src} style={{ width: size + over * 2, height: size + over * 2, marginLeft: -over, marginTop: -over }} contentFit="cover" />
      </View>
    );
  }
  const a = getAvatar(id);
  if (!a) return <StrangerAvatar seed={seed} size={size} round={round} />;
  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", backgroundColor: "#FFFFFF" }}>
      <SvgXml xml={a.xml} width={size} height={size} />
    </View>
  );
}
