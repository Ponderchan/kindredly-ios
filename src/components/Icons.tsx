import Svg, { Path, Rect } from "react-native-svg";

/* two small marks the aura room needed drawn rather than typed: the share
   arrow (the system's own shape — a tray with an arrow leaving it) and the
   grid of nine. Stroke icons on the app's 24-grid, tinted by the caller. */

export function ShareIcon({ size = 22, color = "#1E1B35" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 15V4" />
      <Path d="M8 8l4-4 4 4" />
      <Path d="M5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7" />
    </Svg>
  );
}

export function GridIcon({ size = 18, color = "#1E1B35" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinejoin="round">
      {[3, 10, 17].flatMap((y) => [3, 10, 17].map((x) => <Rect key={`${x}-${y}`} x={x} y={y} width={4} height={4} rx={1} />))}
    </Svg>
  );
}
