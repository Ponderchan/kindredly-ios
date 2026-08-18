import { View } from "react-native";
import { WrenBird, type WrenMood } from "./WrenBird";
import { P } from "../theme/post";

/* Wren, mounted like a stamp.

   The first version of this drew her by hand from two overlapping circles and
   an arc — at 40pt that's mud, and it wasn't her. Her art is designed data
   (wren-family-data.ts), so the stamp doesn't redraw her: it FRAMES her.
   Perforation on the outside, the real bird inside.

   It also must NOT pass a skin. She is indigo by default (sticker); plush
   unlocks at your first kindred and ink is a Kindredly+ skin, so hard-coding
   one both changes who she is and shows a paid skin to someone who hasn't
   bought it. WrenBird resolves the owned skin itself — leave it alone.

   She stays the one living thing on a page of rules — she just stopped being
   a smudge. */

export function WrenStamp({
  size = 44,
  mood = "content",
  framed = true,
}: {
  size?: number;
  mood?: WrenMood;
  framed?: boolean;
}) {
  const bird = <WrenBird size={size * (framed ? 0.74 : 1)} mood={mood} />;
  if (!framed) return bird;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderWidth: 1,
        borderColor: P.ink,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: P.paper,
      }}
    >
      <Perf size={size} />
      {bird}
    </View>
  );
}

/* a stamp's perforated edge, as ticks along the frame */
function Perf({ size }: { size: number }) {
  const n = Math.max(3, Math.round(size / 11));
  const step = size / n;
  const ticks = Array.from({ length: n });
  return (
    <>
      {ticks.map((_, i) => (
        <View
          key={`t${i}`}
          style={{ position: "absolute", top: -1.5, left: i * step + step * 0.3, width: step * 0.46, height: 3.5, backgroundColor: P.paper }}
        />
      ))}
      {ticks.map((_, i) => (
        <View
          key={`b${i}`}
          style={{ position: "absolute", bottom: -1.5, left: i * step + step * 0.3, width: step * 0.46, height: 3.5, backgroundColor: P.paper }}
        />
      ))}
      {ticks.map((_, i) => (
        <View
          key={`l${i}`}
          style={{ position: "absolute", left: -1.5, top: i * step + step * 0.3, height: step * 0.46, width: 3.5, backgroundColor: P.paper }}
        />
      ))}
      {ticks.map((_, i) => (
        <View
          key={`r${i}`}
          style={{ position: "absolute", right: -1.5, top: i * step + step * 0.3, height: step * 0.46, width: 3.5, backgroundColor: P.paper }}
        />
      ))}
    </>
  );
}
