import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { C } from "../theme/tokens";

/* Bottom-tab glyphs — ported from kindredly-v20.jsx (133-143).
   letters = envelope, journal = ledger, kindreds = heart, me = person. */

export type TabId = "letters" | "journal" | "kindreds" | "me";

export function TabIcon({ id, active, color }: { id: TabId; active?: boolean; color?: string }) {
  const c = color || (active ? C.purple : "#AEB4BF");
  const p = {
    stroke: c,
    strokeWidth: 1.7,
    fill: "none" as const,
    strokeLinecap: "round" as const,
  };
  switch (id) {
    case "letters":
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22">
          <Rect x={2} y={7} width={14} height={11} rx={2} {...p} />
          <Path d="M16 7V2M16 4h5" {...p} />
        </Svg>
      );
    case "journal":
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22">
          <Rect x={3} y={3} width={16} height={16} rx={2.5} {...p} />
          <Line x1={8} y1={3} x2={8} y2={19} {...p} />
          <Line x1={11} y1={8} x2={16} y2={8} {...p} />
          <Line x1={11} y1={12} x2={16} y2={12} {...p} />
        </Svg>
      );
    case "kindreds":
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22">
          <Path d="M11 18C4 13 1.5 8.5 5 6C7.5 4.3 9.8 6 11 8C12.2 6 14.5 4.3 17 6C20.5 8.5 18 13 11 18Z" fill={c} />
        </Svg>
      );
    case "me":
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22">
          <Circle cx={11} cy={11} r={9} {...p} />
          <Circle cx={11} cy={8.5} r={3.2} {...p} />
          <Path d="M5.5 18C7 14.5 15 14.5 16.5 18" {...p} />
        </Svg>
      );
    default:
      return null;
  }
}
