/* The Post — a visual system on trial (Today only, for now).
   The idea: the postal service is a MACHINE and the letter is a PERSON.
   So the chrome is systematic — monospace, rules, docket numbers, square
   corners, no shadows — and the letter body is the one warm, human thing on
   the screen. Everything you can act on is pen-ink blue; postal red belongs to
   the postmark alone and is never used as decoration.

   Deliberately small: one paper, one black, two inks, two type families. If a
   thing isn't in here, it doesn't belong on the page. */

export const P = {
  paper: "#FAF8F3", // warm white — never clinical #FFF
  paperDeep: "#F2EFE6", // a shade down, for insets
  ink: "#1B1B18", // warm black — rules, type, the machine
  ink60: "rgba(27,27,24,0.6)",
  ink40: "rgba(27,27,24,0.4)",
  ink12: "rgba(27,27,24,0.12)",
  pen: "#3A3AF5", // the one actionable colour (tokens' C.purple)
  penWash: "#E9E9FA",
  post: "#E0483C", // the postmark's ink — that object only
  air: "#3A4F9E", // airmail blue, for the striped rule only
} as const;

export const PF = {
  mono: "IBMPlexMono_400Regular",
  monoMed: "IBMPlexMono_500Medium",
  monoSemi: "IBMPlexMono_600SemiBold",
  // the letter itself — system font, so CJK renders properly (see F.letter)
  letter: undefined as unknown as string,
  serif: "Fraunces_400Regular",
  serifItalic: "Fraunces_400Regular_Italic",
} as const;

/* a full-strength hairline — the system's structural move */
export const rule = { borderBottomWidth: 1, borderBottomColor: P.ink } as const;
export const ruleSoft = { borderBottomWidth: 1, borderBottomColor: P.ink12 } as const;
