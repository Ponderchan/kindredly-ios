import { View } from "react-native";
import Svg from "react-native-svg";
import { ArtShapes } from "./ArtShapes";
import { STAMP_ART } from "../data/stamp-art";
import { getStamp } from "../data/stamps";
import { shadow } from "../theme/tokens";

/* A stamp tile — the designed postage sticker (dashed frame + tinted paper +
   themed motif), rendered from the design set (viewBox 64). Falls back to a
   plain colored tile if an id has no art yet. Square, self-framed. */

export function StampTile({ id, w = 40, r = 8 }: { id?: string; w?: number; r?: number }) {
  const art = id ? STAMP_ART[`stamp-${id}`] : null;
  if (art) {
    return (
      <View style={[{ width: w, height: w }, shadow.card]}>
        <Svg width={w} height={w} viewBox="0 0 64 64">
          <ArtShapes list={art} />
        </Svg>
      </View>
    );
  }
  // fallback for a stamp with no art (shouldn't happen for the 36 real ids)
  const s = getStamp(id);
  const col = s ? s.color : "#8B7FE8";
  return (
    <View style={[{ width: w, height: w, borderRadius: r, backgroundColor: `${col}22`, borderWidth: 1.5, borderColor: col }, shadow.card]} />
  );
}
