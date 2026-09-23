import Svg, { Rect } from "react-native-svg";

/* The three states a correspondence can be in, drawn as the mosaic face it
   wears (the owner's round 3a, 2026-09-23): a kindred is the whole face,
   filled, in green; a stranger is the frame with two cells lit; in transit
   the frame is dotted and a third cell is on its way. One grid (24), one
   stroke (1.8), so they read as a family at 14pt. */
export type StateKind = "kindreds" | "strangers" | "inTransit";
export const STATE_INK: Record<StateKind, string> = { kindreds: "#2E7D4F", strangers: "#3A34D6", inTransit: "#8A86A3" };

export function StateGlyph({ kind, size = 14 }: { kind: StateKind; size?: number }) {
  const ink = STATE_INK[kind];
  if (kind === "kindreds") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x={3} y={3} width={18} height={18} rx={5} fill={ink} />
        <Rect x={7.5} y={8.5} width={2.6} height={2.6} fill="#FFFFFF" />
        <Rect x={13.9} y={8.5} width={2.6} height={2.6} fill="#FFFFFF" />
        <Rect x={8.5} y={14} width={7} height={2} fill="#FFFFFF" />
      </Svg>
    );
  }
  if (kind === "strangers") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x={3} y={3} width={18} height={18} rx={5} fill="none" stroke={ink} strokeWidth={1.8} />
        <Rect x={7.5} y={8.5} width={2.6} height={2.6} fill={ink} />
        <Rect x={13.9} y={13.4} width={2.6} height={2.6} fill={ink} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={3} width={18} height={18} rx={5} fill="none" stroke={ink} strokeWidth={1.8} strokeDasharray="3 3" strokeLinecap="round" />
      <Rect x={7.5} y={8.5} width={2.6} height={2.6} fill={ink} />
      <Rect x={13.9} y={8.5} width={2.6} height={2.6} fill={ink} />
      <Rect x={10.7} y={13.4} width={2.6} height={2.6} fill={ink} />
    </Svg>
  );
}
