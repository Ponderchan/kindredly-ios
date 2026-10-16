import { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

/* Renders a flat shape list (from a codegen'd design SVG) inside an <Svg>.
   Shared by StampTile, MoodIcon and MoodFace. Keys mirror the compiled attribute set.

   Drawn as given by default: each shape's own fill, stroke and width (the stamps and the old
   self-coloured moods keep their colours in every theme). The mood line art
   (data/mood-line-art) is a TEMPLATE instead — one ink, #000000 — and MoodFace draws it with:
     tint         every fill and stroke the art paints (anything but "none") in this colour; a
                  shape with no fill attribute is SVG-black, so it is painted too
     strokeScale  every stroke width multiplied by this (the size's optical step over the
                  master's 2: 2.4 / 2.0 / 1.75 → 1.2 / 1 / 0.875)
   KArt.draw(in:size:tint:strokeScale:) does the same in Swift. */

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

export function ArtShapes({ list, tint, strokeScale }: { list: readonly ArtShape[]; tint?: string; strokeScale?: number }) {
  return (
    <G>
      {list.map((s, i) => {
        const stroked = s.s !== undefined && s.s !== "none";
        const c = {
          fill: tint === undefined ? s.f : s.f === "none" ? "none" : tint,
          stroke: tint === undefined || !stroked ? s.s : tint,
          strokeWidth: strokeScale === undefined || !stroked ? s.sw : Number(s.sw ?? 1) * strokeScale,
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
