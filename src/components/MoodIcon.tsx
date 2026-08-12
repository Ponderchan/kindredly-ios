import Svg, { G } from "react-native-svg";
import { ArtShapes } from "./ArtShapes";
import { MOOD_ART } from "../data/mood-art";
import { getMood, type MoodId } from "../data/moods";

/* Mood glyph — a colored shape-with-face from the design set (30 moods).
   The art is self-colored (viewBox 60); `plate` is a legacy no-op kept for
   call-site compatibility, `watermark` fades it for card backgrounds. */

export interface MoodIconProps {
  id?: MoodId | string;
  size?: number;
  plate?: boolean; // legacy — the shape is its own plate now
  watermark?: boolean;
}

export function MoodIcon({ id, size = 34, watermark = false }: MoodIconProps) {
  const m = getMood(id);
  const art = MOOD_ART[`mood-${m.id}`] || [];
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <G opacity={watermark ? 0.3 : 1}>
        <ArtShapes list={art} />
      </G>
    </Svg>
  );
}
