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
  brass: "#9A7433", // Sealed's room ink — the PO box door, what's kept
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

/* ── PW: the pure-white variant, on trial ─────────────────────────────────
   The warm paper above reads older than this product's readers (18–27) — the
   beige is what made it feel like an old folder rather than something sharp.
   Same token names, same structure, one variable changed: temperature.
   Cold white, true black, the same electric pen.

   Kindreds runs on this so it can be judged beside Today and Sealed. If it
   wins, P's values become these and nothing else in the app has to move. */
export const PW = {
  // ONE GROUND FOR EVERY TAB. A coloured room suited Today and fought Sealed
  // and Kindreds, and the app has to read as one app — so the ground unifies
  // and the SHEET carries the warmth wherever there's something to read.
  // Today wasn't heavy on white because it was white; it was heavy because the
  // letter had no sheet, so the screen became a wall of black type.
  ground: "#FFFFFF",
  groundInk: "#111113",
  groundInk60: "rgba(17,17,19,0.6)",
  groundInk40: "rgba(17,17,19,0.4)",
  // the sheet itself — an actual piece of paper, and where the whole postal
  // structure lives: docket line, rules, stamp, tag, actions
  sheet: "#FBF7EC",
  paper: "#FFFFFF",
  paperDeep: "#F4F4F5",
  ink: "#111113",
  ink60: "rgba(17,17,19,0.6)",
  ink40: "rgba(17,17,19,0.38)",
  ink12: "rgba(17,17,19,0.12)",
  pen: "#3A3AF5",
  penWash: "#ECECFE",
  post: "#E0483C",
  brass: "#9A7433",
  air: "#3A4F9E",
} as const;
