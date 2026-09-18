import type { ViewStyle } from "react-native";

/* STICKER PUNCH — the owner's G1 (Today GenZ Restyle).
   ────────────────────────────────────────────────────────────────────────
   Not a new palette: the same white, the same navy ink the Me, Kindreds
   and Sealed rooms already set their type in. What changes is FORM. The
   sheet stops being a hairline-ruled document and becomes a sticker: a
   2.4px outline, a hard offset shadow with no blur, a solid pill for the
   tag, a black pill for SEND. The structure of the page does not move a
   pixel.

   The onboarding console (theme/y2k) does this with its own tokens and
   forbids a tab from importing it. This file exists so a tab can wear the
   form without borrowing the console. */

export const PUNCH = {
  ink: "#1E1B35",
  dim: "#55506E",
  reply: "#2A2499",
  acid: "#C3E84F", // the one signal colour: what you two have in common
  placeholder: "#9E99B8",
} as const;

/** the outline — white, thick, rounded */
export const outline = (radius = 20, width = 2.4): ViewStyle => ({
  backgroundColor: "#FFFFFF",
  borderWidth: width,
  borderColor: PUNCH.ink,
  borderRadius: radius,
});

/** the hard shadow. iOS needs radius 0 and full opacity or it blurs. */
export const drop = (dx = 5, dy = dx): ViewStyle => ({
  shadowColor: PUNCH.ink,
  shadowOffset: { width: dx, height: dy },
  shadowOpacity: 1,
  shadowRadius: 0,
});
