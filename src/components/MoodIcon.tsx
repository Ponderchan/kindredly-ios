import Svg, { Circle, G, Line, Path } from "react-native-svg";
import { getMood, type MoodId } from "../data/moods";

/* Hand-drawn mood glyphs — ported from kindredly-v20.jsx (99-131). `plate`
   draws the pale bg circle; `watermark` renders large + faded for card
   backgrounds (opacity 0.3, no plate). */

export interface MoodIconProps {
  id?: MoodId | string;
  size?: number;
  plate?: boolean;
  watermark?: boolean;
}

export function MoodIcon({ id, size = 34, plate = true, watermark = false }: MoodIconProps) {
  const m = getMood(id);
  const c = m.col;
  const o = watermark ? 0.3 : 1;

  const shape = () => {
    switch (m.id) {
      case "calm":
        return (
          <G opacity={o}>
            <Path d="M12 24Q20 20 30 24T48 24" stroke={c} strokeWidth={2.5} fill="none" strokeLinecap="round" />
            <Path d="M12 32Q20 28 30 32T48 32" stroke={c} strokeWidth={2.5} fill="none" strokeLinecap="round" />
            <Path d="M12 40Q20 36 30 40T48 40" stroke={c} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          </G>
        );
      case "tender":
        return (
          <G opacity={o}>
            <Path
              d="M30 42C22 36 15 30 15 24C15 19 19 16 23 16C26 16 28 18 30 20C32 18 34 16 37 16C41 16 45 19 45 24C45 30 38 36 30 42Z"
              fill={c}
            />
          </G>
        );
      case "restless":
        return (
          <G opacity={o}>
            <Path d="M22 14L18 28L25 28L20 46" stroke={c} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M34 14L30 28L37 28L32 46" stroke={c} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </G>
        );
      case "wistful":
        return (
          <G opacity={o}>
            <Path d="M34 16C26 16 20 22 20 30C20 38 26 44 34 44C30 42 26 36 26 30C26 24 30 18 34 16Z" fill={c} />
            <Circle cx={42} cy={20} r={1.8} fill={c} />
            <Circle cx={44} cy={26} r={1.2} fill={c} />
          </G>
        );
      case "warm":
        return (
          <G opacity={o}>
            <Circle cx={30} cy={30} r={8} fill={c} />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => {
              const r = (d * Math.PI) / 180;
              return (
                <Line
                  key={d}
                  x1={30 + Math.cos(r) * 13}
                  y1={30 + Math.sin(r) * 13}
                  x2={30 + Math.cos(r) * 20}
                  y2={30 + Math.sin(r) * 20}
                  stroke={c}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              );
            })}
          </G>
        );
      case "distant":
        return (
          <G opacity={o}>
            <Path d="M12 42L22 26L30 34L40 22L48 42Z" fill={c} />
          </G>
        );
      case "bright":
        return (
          <G opacity={o}>
            <Path d="M30 12L33 26L47 28L35 36L40 48L30 40L20 48L25 36L13 28L27 26Z" fill={c} />
          </G>
        );
      case "heavy":
        return (
          <G opacity={o}>
            <Path d="M18 28Q15 20 22 18Q25 12 32 15Q42 14 43 24Q48 25 46 32L16 32Q14 30 18 28Z" fill={c} />
            <Line x1={22} y1={38} x2={20} y2={44} stroke={c} strokeWidth={2.5} strokeLinecap="round" />
            <Line x1={30} y1={38} x2={28} y2={44} stroke={c} strokeWidth={2.5} strokeLinecap="round" />
            <Line x1={38} y1={38} x2={36} y2={44} stroke={c} strokeWidth={2.5} strokeLinecap="round" />
          </G>
        );
      default:
        return null;
    }
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {plate && !watermark && <Circle cx={30} cy={30} r={26} fill={m.bg} />}
      {shape()}
    </Svg>
  );
}
