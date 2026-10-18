import { POST_BLUE } from "../../../components/LaunchAnimation";

/* THE NEW ONBOARDING'S OWN COLOURS AND TYPE (storyboard §3 and §6 "Type").
   ────────────────────────────────────────────────────────────────────────
   The run does NOT wear the theme. It is the post before the bird is born:
   one flat Post Blue field (the app icon's own blue, the native splash's and
   the launch's) with paper objects that have ink edges and hard shadows,
   acid keys, and pure white type; at the hatch the egg's warm inside floods
   out and the world turns Shell, which matches the app's light themes, so
   the hand-off to Today is a same-colour dissolve. No gradient, no glow
   (except the egg's warmth, which is the story), no glass.

   Contrast, checked: white on Post Blue 5.0:1 (AA, every size; no faded white
   for small type), ink on paper 16.6:1, ink on acid 11.9:1 (10.3:1 pressed),
   ink on Shell 15.8:1, inkSoft on paper 8.9:1 and on Shell 8.5:1. Night (#16143A) is for the binary that turns DARK_READY on; until
   then the run is day only, like the launch. */

export const OB = {
  /** the app icon's blue: the ground from the splash to screen 6, and 8, and 9 up to the crack */
  blue: POST_BLUE,
  /** cards, the envelope */
  paper: "#FFFFFF",
  /** the letter sheet (screen 7 is the sheet itself) */
  sheet: "#FFFDF8",
  /** warm eggshell white: floods out of the crack on 9; the ground of 10–13 */
  shell: "#FFF8EE",
  /** every primary key */
  acid: "#C3E84F",
  /** the acid key pressed (the shadow collapses; the face a shade down) */
  acidDown: "#B5DA3F",
  /** type on paper / Shell / acid, every edge and every hard shadow */
  ink: "#1E1B35",
  /** quieter ink on paper and Shell (8.9:1 / 8.5:1) */
  inkSoft: "#4A4664",
  /** the warmth inside the egg and its four pips (the launch's dot) */
  gold: "#D8A63F",
  /** all type on Post Blue */
  white: "#FFFFFF",
  /** the dark icon's ground: night before the hatch (DARK_READY only) */
  night: "#16143A",
  /** the dim behind a sheet over the blue (1a) */
  scrim: "rgba(14,12,40,0.45)",
} as const;

/** Edges and shadows: 3pt ink edges, a 4pt hard ink shadow that collapses on press (§3 Acid). */
export const EDGE = 3;
export const SHADOW = 4;
/** The primary key's height and the side gutter every screen shares. */
export const KEY_H = 56;
export const GUTTER = 24;

/* the embedded faces (theme/post: PostScript names, registered by the build) */
export const FONT = {
  /** headlines: Inter 800 */
  head: "Inter-ExtraBold",
  /** keys and strong lines */
  bold: "Inter-Bold",
  /** the egg's voice and labels: Inter 600 */
  semi: "Inter-SemiBold",
  medium: "Inter-Medium",
  /** body lines: Inter 400 */
  body: "Inter-Regular",
  /** the letter: Newsreader */
  letter: "Newsreader-Regular",
  letterItalic: "Newsreader-Italic",
  /** small labels that are labels (AFTER FIVE LETTERS EACH, YOUR FIRST STAMP) */
  mono: "IBMPlexMono-Medium",
  monoSemi: "IBMPlexMono-SemiBold",
} as const;

/** The type set (§6): headlines Inter 800 28–30 at −0.8, lines Inter 15–16, the letter Newsreader 19–20, mono only for labels. */
export const TYPE = {
  headline: { fontFamily: FONT.head, fontSize: 29, lineHeight: 34, letterSpacing: -0.8 },
  line: { fontFamily: FONT.body, fontSize: 16, lineHeight: 22 },
  lineSmall: { fontFamily: FONT.body, fontSize: 15, lineHeight: 21 },
  voice: { fontFamily: FONT.semi, fontSize: 13, lineHeight: 17 },
  key: { fontFamily: FONT.bold, fontSize: 17, letterSpacing: -0.2 },
  textKey: { fontFamily: FONT.semi, fontSize: 15 },
  small: { fontFamily: FONT.body, fontSize: 12.5, lineHeight: 17 },
  letter: { fontFamily: FONT.letter, fontSize: 19.5, lineHeight: 28 },
  label: { fontFamily: FONT.monoSemi, fontSize: 10, letterSpacing: 1.8 },
} as const;

/** The ground's colour, and the colour of type standing directly on it. */
export const GROUND_HEX = { blue: OB.blue, paper: OB.sheet, shell: OB.shell } as const;
export const ON_GROUND = { blue: OB.white, paper: OB.ink, shell: OB.ink } as const;

/* THE RUN'S TYPE STOPS GROWING AT 1.35× (the owner's call, 2026-10-19, after the review found the
   largest accessibility sizes broke screens 1, 3, 1a and 11: a title gone, the wheel under Next).
   Every text in the run carries it; up to XXXL nothing is capped, past it the run stays readable
   and whole rather than reflowing thirteen designed screens. Keys that set their own (1.6, one
   line) keep theirs. */
export const OB_MAX_FONT = 1.35;
