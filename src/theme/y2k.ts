import type { TextStyle, ViewStyle } from "react-native";
import { P, PF } from "./post";

/* EGG OS — the onboarding's own skin.
   ────────────────────────────────────────────────────────────────────────
   A Y2K handheld-pet console: thick outlines, hard offset shadows with no
   blur, sticker chrome, pixel readouts. But EVERY COLOUR IN IT IS AN APP
   COLOUR, because the first build of this wasn't and you could feel the
   seam — a saturated periwinkle console handing you off to a white paper
   app read as two products, and the handoff is the one moment where that
   can't happen.

     ground  P.penWash — the app's own blue wash, its palest token
     ink     P.ink     — the same near-black every hairline in the app uses
     blue    P.pen     — the same one actionable colour
     panel   P.paper

   So the Y2K-ness lives entirely in FORM — 2px borders, 4px hard shadows,
   segmented meters, stencilled tags — and none of it in hue. Walking out of
   onboarding is the same world with the packaging taken off, not a different
   app. The two colours that aren't app tokens are deliberate and scoped to
   one object each: `brass` is the hatch key and the reveal card's border (it
   is the wax-seal gold from P.brassSeal, lifted to carry on dark), and
   `night` is P.ink used as a ground for that one screen.

   Nothing in here may be imported by a tab screen. If it ever is, that's the
   signal the two systems have started to blur. */

export const Y = {
  ground: P.penWash, // #ECECFE
  groundDeep: "#DEDEFB", // insets and pressed states
  ink: P.ink, // #111113
  panel: P.paper,
  blue: P.pen, // #3A3AF5
  brass: "#D8A63F", // the hatch key + the reveal border, and nothing else
  night: P.ink, // the reveal screen's ground
  nightCard: "#1D1B26",
  lcd: "#6F63B4", // the console screen — darker than every shell on purpose
  dim: "rgba(17,17,19,0.6)",
  faint: "rgba(17,17,19,0.32)",
  warn: P.post, // #E0483C
} as const;

/* A hard shadow, no blur — the whole look rests on this. iOS needs
   shadowRadius 0 and full opacity or it renders a soft cloud instead. */
export const bevel = (dx = 4, dy = 4): ViewStyle => ({
  shadowColor: Y.ink,
  shadowOffset: { width: dx, height: dy },
  shadowOpacity: 1,
  shadowRadius: 0,
});

/** a white sticker panel */
export const card: ViewStyle = {
  backgroundColor: Y.panel,
  borderWidth: 2,
  borderColor: Y.ink,
  borderRadius: 10,
};

/** the primary key */
export const key: ViewStyle = {
  backgroundColor: Y.blue,
  borderWidth: 2,
  borderColor: Y.ink,
  borderRadius: 10,
  paddingVertical: 15,
  alignItems: "center",
  justifyContent: "center",
};

/** a small stencilled tag (RANDOMIZE, You're 19 ✓, SHE / HER) */
export const tag: ViewStyle = {
  backgroundColor: Y.panel,
  borderWidth: 2,
  borderColor: Y.ink,
  borderRadius: 999,
  paddingHorizontal: 12,
  paddingVertical: 5,
};

/** mono chrome type: everything the console says about itself */
export const mono = (size = 11, weight: "r" | "m" | "b" = "m"): TextStyle => ({
  fontFamily: weight === "b" ? PF.monoSemi : weight === "m" ? PF.monoMed : PF.mono,
  fontSize: size,
  letterSpacing: size <= 11 ? 1.4 : 0.8,
  color: Y.ink,
});

export const F2 = {
  serif: PF.serif,
  serifItalic: PF.serifItalic,
  hand: PF.letter, // what a person types — system font, so CJK renders
} as const;
