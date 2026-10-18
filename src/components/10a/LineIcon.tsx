import Svg, { Circle, Path } from "react-native-svg";

/* THE CHAT COMPOSERS' ICONS, I1 (owner's pick, 2026-10-18: Chat Icons.dc.html,
   "描边 · 重画"; KLineGlyph's replyArrow … leaveSong in SwiftUI, from the same
   paths). One 24 grid, one weight: stroked at 1.9 (grid units, as the
   prototype's stroke-width on a 24 viewBox) with round caps and joins, in
   ink — ind or lime when on. The 18-22pt icons of the bars are always
   strokes, never solids (Prompt 7). Decorative: the control that holds one
   carries the words VoiceOver reads.

     replyArrow    the reply bar's mark, left of the field: an arrow turning
                   back (the plane's opposite: one goes out, one comes in)
     emoji         the emoji key: a round face, smiling
     planeLine     the send disc's paper plane, as a line
     sparkle       the Kindreds bar's ideas key
     plus          the Kindreds bar's + (the prototype's own 22 grid: drawn at
                   22 it is 16 long, at the 2.4 the bar gives it)
     foldNote      the + tray's four plays: Fold a note,
     askSomething  Ask something,
     tinyMoment    Tiny moment,
     leaveSong     Leave a song
     chevronLeft   the conversation header's back (22 at 2.2)
     more          the header's ⋯, three filled dots */

export type LineIconName =
  | "replyArrow"
  | "emoji"
  | "planeLine"
  | "sparkle"
  | "plus"
  | "foldNote"
  | "askSomething"
  | "tinyMoment"
  | "leaveSong"
  | "chevronLeft"
  | "more";

const PATHS: Record<Exclude<LineIconName, "more" | "plus">, string> = {
  replyArrow: "M9 7 4 12l5 5 M4 12h9a6 6 0 0 1 6 6v1",
  emoji: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M8.5 13.5c.8 1.6 2 2.4 3.5 2.4s2.7-.8 3.5-2.4 M9.2 9v1.2 M14.8 9v1.2",
  planeLine: "M21 3 3.5 10.2l7 2.6L13 20l8-17z M10.5 12.8 21 3",
  sparkle: "M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z M19 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z",
  foldNote: "M6 3h8l5 5v13H6z M14 3v5h5 M14 8l-5.5 5.5 M9 17h6",
  askSomething: "M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9.5L5 20z M10.3 9.3a1.8 1.8 0 0 1 3.2 1.1c0 1.2-1.5 1.4-1.5 2.6 M12 15.3h.01",
  tinyMoment: "M4 8.5h3.2l1.6-2.5h6.4l1.6 2.5H20V19H4z M12 16.5a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6z",
  leaveSong: "M9 17.5V5.5l10-2.2v12 M9 9.3l10-2.2 M9 17.5a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0z M19 15.3a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0z",
  chevronLeft: "M15 5l-7 7 7 7",
};

/** One I1 icon, `size` points square, its line `stroke` grid units wide (1.9 by default). */
export function LineIcon({ name, size, color, stroke = 1.9 }: { name: LineIconName; size: number; color: string; stroke?: number }) {
  if (name === "more") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Circle cx={5} cy={12} r={2} />
        <Circle cx={12} cy={12} r={2} />
        <Circle cx={19} cy={12} r={2} />
      </Svg>
    );
  }
  if (name === "plus") {
    return (
      <Svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round">
        <Path d="M11 3v16M3 11h16" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <Path d={PATHS[name]} />
    </Svg>
  );
}
