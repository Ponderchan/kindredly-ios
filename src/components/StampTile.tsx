import type { StyleProp, ViewStyle } from "react-native";
import { Stamp, snapStampWidth } from "./Stamp";

/* THE OLD NAME, KEPT (stamps v2, 2026-10-18; v3 since 2026-10-19). StampTile was the square
   v1 sticker — the dashed frame, the tinted paper and the motif on a 64
   grid, with a faint card shadow. Every stamp is now the one component,
   ./Stamp, drawn from lib/stamp-frame and data/stamp-art-v3; this stays
   so a screen that still says <StampTile id w /> keeps rendering while
   the call sites move onto <Stamp/> with a width from the ladder.

   A square `w` means a stamp `w` wide and 1.2 × `w` tall, snapped to the
   nearest ladder width (28 → 30, 34 → 30, 44 → 40; under 15 there is no
   stamp, only the 6pt dot), so an old size still lands on a size the
   spec allows. `r`, the old corner radius, is accepted and ignored: a
   stamp has no corners to round. No shadow (spec §2.3), and
   always flat: a delivered stamp is a <Stamp delivered letterId/>. */

export function StampTile({ id, w = 40, style }: { id?: string | null; w?: number; r?: number; style?: StyleProp<ViewStyle> }) {
  return <Stamp id={id} width={snapStampWidth(w)} style={style} />;
}
