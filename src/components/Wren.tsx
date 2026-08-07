import Svg, { Circle, G, Path } from "react-native-svg";
import { C } from "../theme/tokens";

/* Wren — the mark. A small brown bird with its tail cocked up. Solid for wax
   seals, line for UI marks. Ported verbatim from kindredly-v20.jsx (1168-1196).
   The three seal paths (tail/body/beak) are reused by Seal + EnvelopeArt. */

export const WREN_PATHS = {
  body:
    "M30 14C27.2 10.2 21.4 9.3 17 12C12.4 14.8 9.5 19 9.8 23.5C10.1 27.8 14 30.8 18.5 30.8C23.5 30.8 28 27.5 30 23C31 20.5 31 16.2 30 14Z",
  tail: "M12.5 28L6.5 15.5L11 13.8L16 25Z",
  beak: "M29.6 14.4L36.6 16.8L29.8 18.6Z",
  wing: "M14.2 22.6C17.2 25.6 20.6 26.1 23.6 24.6",
  foot: "M17 30.6L16.4 34M21.6 30.4L22.2 34",
} as const;

export interface WrenProps {
  size?: number;
  color?: string;
  mode?: "solid" | "line";
  eye?: string;
}

export function Wren({ size = 28, color = C.purple, mode = "solid", eye }: WrenProps) {
  const eyeCol = eye || (mode === "solid" ? "rgba(255,255,255,0.9)" : color);

  if (mode === "line") {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <G
          fill="none"
          stroke={color}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d={WREN_PATHS.body} />
          <Path d={WREN_PATHS.tail} />
          <Path d={WREN_PATHS.beak} />
          <Path d={WREN_PATHS.wing} />
          <Path d={WREN_PATHS.foot} />
        </G>
        <Circle cx={25.6} cy={14.9} r={1.15} fill={color} />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <G fill={color}>
        <Path d={WREN_PATHS.tail} />
        <Path d={WREN_PATHS.body} />
        <Path d={WREN_PATHS.beak} />
      </G>
      <Path
        d={WREN_PATHS.wing}
        fill="none"
        stroke={eyeCol}
        strokeWidth={1.3}
        strokeLinecap="round"
        opacity={0.55}
      />
      <Circle cx={25.6} cy={14.9} r={1.35} fill={eyeCol} />
      <Path d={WREN_PATHS.foot} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
