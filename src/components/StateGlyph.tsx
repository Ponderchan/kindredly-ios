import Svg, { Rect } from "react-native-svg";

/* The states a correspondence can be in, drawn as the mosaic face it
   wears (the owner's round 3a, 2026-09-23): a kindred is the whole face,
   filled, in green; a stranger is the frame with two cells lit; in transit
   the frame is dotted and a third cell is on its way. Expired (2026-09-23)
   is a kindred gone quiet: the frame again, solid, with the eyes shut and
   the mouth a flat line, in the faded rose of the prototype's quiet rooms.
   One grid (24); the icon sheet draws at 1.8, a group's label at 2.2, as
   the prototype does. On a dark ground (a selected tab) `color` redraws it
   in one light ink, and `cut` is what the filled face's features are cut in. */
export type StateKind = "kindreds" | "strangers" | "inTransit" | "expired";
export const STATE_INK: Record<StateKind, string> = { kindreds: "#2E7D4F", strangers: "#3A34D6", inTransit: "#8A86A3", expired: "#A56A78" };

export function StateGlyph({ kind, size = 14, weight = 1.8, color, cut = "#FFFFFF" }: { kind: StateKind; size?: number; weight?: number; color?: string; cut?: string }) {
  const ink = color ?? STATE_INK[kind];
  if (kind === "kindreds") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x={3} y={3} width={18} height={18} rx={5} fill={ink} />
        <Rect x={7.5} y={8.5} width={2.6} height={2.6} fill={cut} />
        <Rect x={13.9} y={8.5} width={2.6} height={2.6} fill={cut} />
        <Rect x={8.5} y={14} width={7} height={2} fill={cut} />
      </Svg>
    );
  }
  if (kind === "strangers") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x={3} y={3} width={18} height={18} rx={5} fill="none" stroke={ink} strokeWidth={weight} />
        <Rect x={7.5} y={8.5} width={2.6} height={2.6} fill={ink} />
        <Rect x={13.9} y={13.4} width={2.6} height={2.6} fill={ink} />
      </Svg>
    );
  }
  if (kind === "expired") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x={3} y={3} width={18} height={18} rx={5} fill="none" stroke={ink} strokeWidth={weight} />
        <Rect x={7.2} y={9.3} width={3.2} height={1.3} rx={0.65} fill={ink} />
        <Rect x={13.6} y={9.3} width={3.2} height={1.3} rx={0.65} fill={ink} />
        <Rect x={9.8} y={14.6} width={4.4} height={1.3} rx={0.65} fill={ink} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={3} width={18} height={18} rx={5} fill="none" stroke={ink} strokeWidth={weight} strokeDasharray="3 3" strokeLinecap="round" />
      <Rect x={7.5} y={8.5} width={2.6} height={2.6} fill={ink} />
      <Rect x={13.9} y={8.5} width={2.6} height={2.6} fill={ink} />
      <Rect x={10.7} y={13.4} width={2.6} height={2.6} fill={ink} />
    </Svg>
  );
}
