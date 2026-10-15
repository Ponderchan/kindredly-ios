import { View } from "react-native";
import { useTheme } from "../lib/theme";
import { COLS, ROWS, VEIL_MASK, maskHas, mosaicMask } from "../lib/mosaic";

/* A CORRESPONDENT'S FACE, drawn by React Native. FACE v1 — the hash, the
   density rule, the develop order — lives in lib/mosaic, which Swift's
   KMosaic reads too (the same 25-bit mask), so the two renderers can't
   drift into two faces for one person. This file only paints the mask.

   Re-exported for the ceremonies (TheirMark, IntroductionRitual) that take
   a face apart cell by cell. */
export { COLS, ROWS, inkedCells } from "../lib/mosaic";

/* THE VEIL · a null seed is not "anonymous", it is NO ONE — the author
   deleted their account (0009) and the letter stays, unsigned. Hashing
   a placeholder would dress every ghost in the same face and falsely
   bind their letters as one author's. Instead: the full grid in the
   theme's faint (line vanished on the soft2 trays), where every real face
   is ink — unmistakably not a person, identical for all ghosts BECAUSE it
   claims nothing. */

/**
 * A pen pal's 5×5 face.
 * @param seed  their user id; null or empty draws the veil (a deleted account)
 * @param cell  one square's side in points
 * @param gap   space between squares in points
 * @param develop how much of the face has arrived, 0..1 (lib/mosaic developFor)
 * @param color the ink, when it isn't the theme's (e.g. tk.ind for "your turn" on the orbit)
 */
export function MosaicId({
  seed,
  cell = 5,
  gap = 1.5,
  develop = 1,
  color,
}: {
  seed: string | null | undefined;
  cell?: number;
  gap?: number;
  develop?: number;
  color?: string;
}) {
  const { t: tk } = useTheme();
  const veil = !seed;
  const mask = veil ? VEIL_MASK : mosaicMask(seed, develop);
  const ink = veil ? tk.faint : color ?? tk.ink;

  return (
    <View style={{ gap }}>
      {Array.from({ length: ROWS }).map((_, r) => (
        <View key={r} style={{ flexDirection: "row", gap }}>
          {Array.from({ length: COLS }).map((_, c) => (
            <View key={c} style={{ width: cell, height: cell, backgroundColor: maskHas(mask, r, c) ? ink : "transparent" }} />
          ))}
        </View>
      ))}
    </View>
  );
}
