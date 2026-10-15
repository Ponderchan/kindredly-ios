import { Platform, TextStyle, ViewStyle } from "react-native";

/* ══════════════════════════════════════════════════════════════
   Kindredly design tokens — matched to the LIVE web product
   (kindredly.io / Mailbox.jsx): Bricolage Grotesque + Instrument
   Sans on #F7F7F5, ink #14141A, indigo accent #3A3AF5, black pill
   buttons, white cards @ radius 22. (NOT the v20 cream/serif look.)
   ══════════════════════════════════════════════════════════════ */

export const C = {
  cream: "#F7F7F5", // --paper (app background)
  creamHi: "#FDFDFC",
  card: "#FFFFFF", // --card
  mine: "#F1F1EE", // own-message bubble tint
  navy: "#14141A", // --ink (black primary buttons + text)
  ink: "#14141A",
  night: "#181A2E", // --night: dark "special" cards (morning, Wren, premium)
  muted: "#86868F", // --muted
  faint: "#A8A8B0",
  label: "#9A9AA2",
  line: "#E4E4E0", // --rule (hairline)
  lineSoft: "#EEEEEA",
  purple: "#3A3AF5", // --pen (electric ballpoint indigo)
  penInk: "#2C2CD0", // --pen-ink
  purpleLt: "#E9E9FA", // --wash (light indigo tint)
  purpleMid: "#6D6DF6",
  warm: "#C86E3A", // terracotta "warmth" signal
  ember: "#D66C3E",
  sand: "#F0E7D8", // --sand (warm journal card)
  gold: "#B08A3E",
  goldLt: "#F6EFDF",
  sealFace: "#FFFFFF",
  sealRing: "#E4E4E0",
  sealInner: "#E9E9FA",
  sealTint: "#E9E9FA",
  sealShade: "#2A2AB0",
} as const;

export type ColorKey = keyof typeof C;

/* Font families: the PostScript names of the faces embedded in the app (see
   the note above PF in theme/post, which also says why an italic face wants
   fontStyle too). */
export const F = {
  // v20 typography: Fraunces (serif — headings, letter bodies, quotes) +
  // Inter (sans — UI chrome). Recolored to the blue-white palette above.
  serif: "Fraunces-Regular",
  serifSemi: "Fraunces-SemiBold",
  serifItalic: "Fraunces-Italic",
  // letter bodies read in the system font (iOS: SF Pro for latin, PingFang for
  // CJK) — clean and native like Apple Journal, and Chinese renders properly
  // instead of falling back out of a latin-only serif. `undefined` = system.
  letter: undefined as unknown as string,
  letterLight: undefined as unknown as string,
  letterItalic: "Fraunces-Italic",
  sans: "Inter-Regular",
  sansMed: "Inter-Medium",
  sansSemi: "Inter-SemiBold",
  sansBold: "Inter-Bold",
  sansExtra: "Inter-ExtraBold",
} as const;

/* Soft, low shadows to match the flat product look. */
export const shadow = {
  card: {
    shadowColor: "#14141A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  } as ViewStyle,
  lift: {
    shadowColor: "#14141A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 6,
  } as ViewStyle,
  float: {
    shadowColor: "#14141A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 10,
  } as ViewStyle,
  glow: {
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 8,
  } as ViewStyle,
};

export const radius = { sm: 8, md: 12, lg: 18, xl: 22, pill: 28, round: 999 };

/* ── reusable style objects ── */

export const cardStyle: ViewStyle = {
  backgroundColor: C.card,
  borderRadius: radius.xl, // 22, matches live
  ...shadow.card,
};

export const capsLabel: TextStyle = {
  fontSize: 10.5,
  letterSpacing: 1.4,
  color: C.label,
  fontFamily: F.sansBold,
};

export const navyBtn: ViewStyle = {
  backgroundColor: C.navy,
  borderRadius: radius.pill,
  alignItems: "center",
  justifyContent: "center",
};
export const navyBtnText: TextStyle = {
  color: "#fff",
  fontFamily: F.sansExtra,
  fontSize: 15.5,
  letterSpacing: 0.2,
};

export const HAIRLINE = Platform.select({ ios: 0.5, default: 1 })!;
