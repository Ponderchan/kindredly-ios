/* The Post — the app's visual system.
   The postal service is a MACHINE and the letter is a PERSON. So the chrome is
   systematic — monospace, rules, docket numbers, square corners, no shadows —
   and what a person wrote is the one thing the system didn't typeset.

   ONE SURFACE. Every tab is the same white; RULES do every separation. Warm
   paper and coloured rooms were both tried and both lost: warm reads older
   than this app's readers, and a coloured ground that suits one tab fights the
   next. White is the only ground that holds all four and lets the stamps, the
   mood faces and the pen accent carry the colour instead.

   Deliberately small: one surface, one black, three inks, two type families.
   If a thing isn't in here, it doesn't belong on the page. */

export const P = {
  paper: "#FFFFFF",
  ground: "#FFFFFF", // same surface; kept so call sites can say what they mean
  sheet: "#FFFFFF",
  paperDeep: "#F4F4F5", // a shade down, for insets only
  ink: "#111113", // rules, type, the machine
  ink60: "rgba(17,17,19,0.6)",
  ink40: "rgba(17,17,19,0.4)",
  ink12: "rgba(17,17,19,0.12)",
  groundInk: "#111113",
  groundInk60: "rgba(17,17,19,0.6)",
  groundInk40: "rgba(17,17,19,0.4)",
  pen: "#3A3AF5", // the one actionable colour
  penWash: "#ECECFE",
  post: "#E0483C", // the postmark's ink — that object only
  air: "#3A4F9E", // airmail blue, for the striped rule only
  brassSeal: "#9A7433", // the wax disc on the sealed page — that object only
  /* the two note keys on the roll and the empty Sealed page (owner,
     2026-09-20: "加个背景色块"): a text note on lavender, a voice note on
     a pale sky blue (the cream was "太丑了") */
  keyText: "#DCD8F6", // a shade under the Sealed page itself, so the block shows on it too
  keyVoice: "#D6EBFA",
} as const;

export const PF = {
  mono: "IBMPlexMono_400Regular",
  monoMed: "IBMPlexMono_500Medium",
  monoSemi: "IBMPlexMono_600SemiBold",
  // the letter itself — system font, so CJK renders properly (see F.letter)
  letter: undefined as unknown as string,
  // WHERE YOU WRITE. A plain, quiet sans — the type a person types in, not
  // the type a letter is set in. Writing is done in this; the letter is
  // read in letterSerif once it arrives (owner, 2026-09-20: "the font in
  // your input box"). Inter falls through to the system face for CJK.
  writing: "Inter_400Regular",
  // a letter between two people — read and written in a text serif
  // (Newsreader; see theme/fonts for why not Fraunces); CJK glyphs fall
  // through to the system face, which is what we want
  letterSerif: "Newsreader_400Regular",
  serif: "Fraunces_400Regular",
  serifItalic: "Fraunces_400Regular_Italic",
  // Wren's handwriting — reserved for words she physically puts on paper
  // (the letter about you), never for the machine or for people's letters
  hand: "Caveat_400Regular",
  handSemi: "Caveat_600SemiBold",
} as const;

/* A panel. What used to be a white card with a radius and a shadow is, in this
   system, a ruled block — the rule does the containing. */
export const panel = { borderWidth: 1, borderColor: P.ink } as const;
export const panelSoft = { borderWidth: 1, borderColor: P.ink12 } as const;

/* the one filled button: pen blue, square, mono label */
export const solidBtn = { backgroundColor: P.pen, paddingVertical: 15, alignItems: "center" } as const;

/* a full-strength hairline — the system's structural move */
export const rule = { borderBottomWidth: 1, borderBottomColor: P.ink } as const;
export const ruleSoft = { borderBottomWidth: 1, borderBottomColor: P.ink12 } as const;

/* ── the channel tag's two colours ────────────────────────────────────────
   The tag and its pasted stamp are the same thing said twice, so they share a
   hue. But the 44 designed colours are chosen to look right as a printed tile,
   not to carry 10.5pt type: four of the six sit at 3.3–4.4:1 on this paper.

   channelWash — the stamp's colour laid over the paper at 14%, so the hue is
   actually PRESENT on the page rather than surviving only as a hairline.
   channelInk  — that same colour walked down in luminance, hue preserved,
   until it clears 4.5:1 against its own wash.

   The tag's rule still carries the true, undarkened colour (a border needs
   only 3:1, which all six clear), so the exact designed hue stays on screen. */

const PAPER_RGB = [0xfa, 0xf8, 0xf3] as const;

function parse(hex?: string | null): [number, number, number] | null {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return null;
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
const hx = (n: number) => Math.round(n).toString(16).padStart(2, "0");

export function channelWash(hex?: string | null, alpha = 0.14): string {
  const c = parse(hex);
  if (!c) return P.paperDeep;
  const m = c.map((v, i) => v * alpha + PAPER_RGB[i] * (1 - alpha));
  return `#${hx(m[0])}${hx(m[1])}${hx(m[2])}`;
}

export function channelInk(hex?: string | null): string {
  const c = parse(hex);
  if (!c) return P.ink;
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lum = (rr: number, gg: number, bb: number) => 0.2126 * lin(rr) + 0.7152 * lin(gg) + 0.0722 * lin(bb);
  const w = parse(channelWash(hex))!;
  const bg = lum(w[0], w[1], w[2]);
  for (let k = 1; k > 0.15; k -= 0.03) {
    const l = lum(c[0] * k, c[1] * k, c[2] * k);
    if ((bg + 0.05) / (l + 0.05) >= 4.5) return `#${hx(c[0] * k)}${hx(c[1] * k)}${hx(c[2] * k)}`;
  }
  return P.ink;
}


