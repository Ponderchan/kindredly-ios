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

/* A stamp's own colour, darkened just enough to be read as text on the paper.

   The 44 stamps carry designed colours chosen to look right as a printed
   tile, and four of the six fail 4.5:1 against this paper — so setting the
   channel tag to the raw stamp colour would tie the two together and make the
   word unreadable. This walks the colour down (preserving hue) until it
   clears AA, so the tag is recognisably the stamp's colour and still legible.
   The true, undarkened colour stays visible on the tag's rule. */
export function channelInk(hex?: string | null): string {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return P.ink;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lum = (rr: number, gg: number, bb: number) =>
    0.2126 * lin(rr) + 0.7152 * lin(gg) + 0.0722 * lin(bb);
  const paper = lum(0xfa, 0xf8, 0xf3);
  for (let k = 1; k > 0.2; k -= 0.04) {
    const rr = Math.round(r * k);
    const gg = Math.round(g * k);
    const bb = Math.round(b * k);
    const l = lum(rr, gg, bb);
    if ((paper + 0.05) / (l + 0.05) >= 4.5) {
      const h = (n: number) => n.toString(16).padStart(2, "0");
      return `#${h(rr)}${h(gg)}${h(bb)}`;
    }
  }
  return P.ink;
}
