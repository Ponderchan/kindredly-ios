import { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

/* Renders a flat shape list (from a codegen'd design SVG) inside an <Svg>.
   Shared by StampTile and MoodIcon. Keys mirror the compiled attribute set. */

export interface ArtShape {
  t: "p" | "c" | "e" | "r";
  d?: string;
  cx?: string;
  cy?: string;
  r?: string;
  rx?: string;
  ry?: string;
  x?: string;
  y?: string;
  w?: string;
  h?: string;
  f?: string;
  s?: string;
  sw?: string;
  lc?: string;
  lj?: string;
  o?: string;
  tf?: string;
  da?: string;
}

export function ArtShapes({ list }: { list: ArtShape[] }) {
  return (
    <G>
      {list.map((s, i) => {
        const c = {
          fill: s.f,
          stroke: s.s,
          strokeWidth: s.sw,
          strokeLinecap: s.lc as any,
          strokeLinejoin: s.lj as any,
          opacity: s.o,
          transform: s.tf,
          strokeDasharray: s.da,
        };
        if (s.t === "p") return <Path key={i} d={s.d} {...c} />;
        if (s.t === "c") return <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} {...c} />;
        if (s.t === "e") return <Ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...c} />;
        return <Rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} {...c} />;
      })}
    </G>
  );
}
