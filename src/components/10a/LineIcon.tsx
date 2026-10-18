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
     more          the header's ⋯, three filled dots

   THE MARKS AFTER A STRANGER'S NAME (identity Phase 1, identity-plan §4, §9
   and its addendum; KLineGlyph's she … pisces in SwiftUI, from the same
   paths). The same 24 grid, drawn for stroke 2 (pass stroke={2}) with round
   caps, one ink and no solids, so they hold at 14pt in Classic and Midnight.
   The she/he mark sits 6pt after the name at 0.8 × its size, the star sign
   4pt after that (or where the mark would be) at 14 beside a 17pt name; the
   mark is in sub and never tinted, so nothing about it reads as pink or
   blue, and the sign shares its ink. Clean line drawings that keep each
   sign's familiar form, not the Unicode symbols copied: ♈–♓ and ♀ ♂ stay
   the fallback in plain text only. The names are the strings the models
   already carry (CardWho.mark "she" / "he", CardWho.sign's Zodiac ids), so
   a renderer passes them straight through as `name`.

     she           ♀ a round over a short cross
     he            ♂ a round with an arrow leaving it up and to the right
     aries         ♈ a stem that splits into two horns curling out and down
     taurus        ♉ a round head under a crescent of horns
     gemini        ♊ two pillars between two bowed bars
     cancer        ♋ two curls, one sweeping over the top, its twin under
     leo           ♌ a small round, the mane rising in one loop, a flick
     virgo         ♍ an m whose last leg runs on, crossed by a loop
     libra         ♎ an open arch on one line, a second line under it
     scorpio       ♏ an m whose last leg runs off right as an arrow
     sagittarius   ♐ the archer's arrow, crossed on its shaft
     capricorn     ♑ a V with a hooked arm, the other falling into a loop
     aquarius      ♒ two zigzags, one wave over another
     pisces        ♓ two fish back to back, ) and (, tied by a line */

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
  | "more"
  | "she"
  | "he"
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

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
  // the identity marks (drawn for stroke 2; each one's stroked extent centred on 12,12)
  she: "M16.5 8.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0z M12 13.25v6.25 M9 16.5h6",
  he: "M14.25 14.25a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0z M12.93 11.07 18.75 5.25 M13.5 5.25h5.25v5.25",
  aries: "M12 19.5V8.5 M12 8.5A4 4 0 1 0 4.24 9.87 M12 8.5A4 4 0 1 1 19.76 9.87",
  taurus: "M12 19.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z M5 4.5c.5 4 3.5 6 7 6s6.5-2 7-6",
  gemini: "M5 5q7 2.5 14 0 M5 19q7-2.5 14 0 M9 6v12 M15 6v12",
  cancer: "M10.25 9a2.75 2.75 0 1 1-5.5 0 2.75 2.75 0 0 1 5.5 0z M7.5 6.25C12 5.5 17.5 5.75 20 9.5 M19.25 15a2.75 2.75 0 1 1-5.5 0 2.75 2.75 0 0 1 5.5 0z M16.5 17.75C12 18.5 6.5 18.25 4 14.5",
  leo: "M10.25 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M9.85 14.5C8.75 11 8.75 4.5 13.75 4.5s5 4.5 3.5 7S14.75 16.5 15.25 18s3 2 4.5.5",
  virgo: "M3.75 6c1-.8 2-.3 2 1V16 M5.75 7a2.5 2.5 0 0 1 5 0V16 M10.75 7a2.5 2.5 0 0 1 5 0V20 M15.75 9.5c2.8 0 4.5 1.7 4.5 3.8 0 2.4-2.3 3.9-6.8 4.9",
  libra: "M4 18.25h16 M4 13.75h5.17A4.5 4.5 0 1 1 14.83 13.75H20",
  scorpio: "M3.5 6c1-.8 2-.3 2 1v9 M5.5 7a2.25 2.25 0 0 1 4.5 0v9 M10 7a2.25 2.25 0 0 1 4.5 0V14.75c0 1.6 1.2 2.75 2.75 2.75H20.5 M18.3 15.3l2.2 2.2-2.2 2.2",
  sagittarius: "M5 19 19 5 M12.5 5H19v6.5 M7.5 11.5l5 5",
  capricorn: "M3.75 5.75c1.3-.6 2.6 0 3.1 1.4L9.75 16.25l3-10.5c.5 4 1.8 6.5 4.3 6.5a3.1 3.1 0 0 1 0 6.2c-2.2 0-3.5-1.6-3.5-3.3 0-1.3.7-2.3 1.6-2.9",
  aquarius: "M4 10l4-3 4 3 4-3 4 3 M4 17l4-3 4 3 4-3 4 3",
  pisces: "M6 4.5c4 3.5 4 11.5 0 15 M18 4.5c-4 3.5-4 11.5 0 15 M5 12h14",
};

/** One icon of the set, `size` points square, its line `stroke` grid units wide (1.9 by default; the identity marks are drawn for 2). */
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
