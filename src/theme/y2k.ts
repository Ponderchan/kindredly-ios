import type { TextStyle, ViewStyle } from "react-native";

/* EGG OS — the onboarding's own skin.
   ────────────────────────────────────────────────────────────────────────
   The app proper is white paper and hairlines. Onboarding is not the app:
   it's the box the app came in, and a box is allowed to be loud. This is a
   Y2K handheld-pet console — periwinkle ground, 2px black outlines, hard
   offset shadows with no blur, sticker chrome, pixel counters.

   It stays family with the product rather than fighting it: the one blue is
   P.pen, the mono is the same IBM Plex Mono the app's chrome uses, and the
   italic serif on the emphasised word is the same Fraunces Wren speaks in.
   What changes is weight and ground, not vocabulary — so the moment you get
   in, the white page reads as the same world with the packaging taken off.

   Nothing in here is imported by a tab screen. If it ever is, that's the
   signal that the two systems have started to blur. */

export const Y = {
  ground: "#C5B9F4", // the console's body
  groundDeep: "#AFA0EC", // pressed states, inset wells
  ink: "#141221", // every outline and every rule, 2px
  panel: "#FFFFFF",
  blue: "#3A3AF5", // === P.pen. the one actionable colour, both systems
  yellow: "#F5D264", // the hatch key only — it's the loudest act in the flow
  night: "#17141F", // the reveal screen
  gold: "#E5B54C", // the reveal card's border
  dim: "rgba(20,18,33,0.62)",
  faint: "rgba(20,18,33,0.34)",
  warn: "#D9483C",
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

/** a small stencilled tag (WRITE IT DOWN, RANDOMIZE, You're 19 ✓) */
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
  fontFamily: weight === "b" ? "IBMPlexMono_600SemiBold" : weight === "m" ? "IBMPlexMono_500Medium" : "IBMPlexMono_400Regular",
  fontSize: size,
  letterSpacing: size <= 11 ? 1.4 : 0.8,
  color: Y.ink,
});

export const F2 = {
  serif: "Fraunces_400Regular",
  serifItalic: "Fraunces_400Regular_Italic",
  // what a person types — system font, so CJK renders
  hand: undefined as unknown as string,
} as const;
