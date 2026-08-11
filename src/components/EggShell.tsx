import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";

/* The egg you pick before you write — just the shell. What's inside is decided
   by what you write (the hatch reveals a Wren). A few shells so it's *yours*;
   the bird underneath is always Wren. */

export const EGG_SHELLS: { id: string; base: string; speck: string; name: string }[] = [
  { id: "cream", base: "#EDE7FB", speck: "#C7BEEA", name: "Moonstone" },
  { id: "blush", base: "#FBE4EC", speck: "#E7A9C0", name: "Blush" },
  { id: "mint", base: "#E1F1E9", speck: "#9FD0BB", name: "Sage" },
  { id: "sky", base: "#E3EDF9", speck: "#A6C4E6", name: "Robin" },
];

export function EggShell({ variant = 0, size = 120 }: { variant?: number; size?: number }) {
  const s = EGG_SHELLS[variant] ?? EGG_SHELLS[0];
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Ellipse cx={100} cy={186} rx={38} ry={7} fill="#5757EC" opacity={0.1} />
      <Path d="M62 118 Q62 54 100 54 Q138 54 138 118 Q138 174 100 174 Q62 174 62 118 Z" fill={s.base} />
      {/* speckles */}
      <G fill={s.speck} opacity={0.9}>
        <Circle cx={84} cy={92} r={4.5} />
        <Circle cx={118} cy={104} r={3.5} />
        <Circle cx={100} cy={132} r={5} />
        <Circle cx={78} cy={126} r={3} />
        <Circle cx={122} cy={140} r={3.2} />
        <Circle cx={106} cy={78} r={2.6} />
      </G>
      {/* soft highlight */}
      <Ellipse cx={84} cy={90} rx={14} ry={20} fill="#FFFFFF" opacity={0.28} />
    </Svg>
  );
}
