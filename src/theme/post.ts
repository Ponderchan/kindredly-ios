/* The Post — the app's visual system.
   The postal service is a MACHINE and the letter is a PERSON. So the chrome is
   systematic — monospace, rules, docket numbers, square corners, no shadows —
   and what a person wrote is the one thing the system didn't typeset.

   ONE SURFACE. Every tab is the same white; RULES do every separation. Warm
   paper and coloured rooms were both tried and both lost: warm reads older
   than this app's readers, and a coloured ground that suits one tab fights the
   next. White is the only ground that holds all four and lets the stamps, the
   mood faces and the pen accent carry the colour instead.

   Deliberately small: one surface, one black, three inks, and the type
   below (THE TYPE: system, SF Mono, the reader's Letter font).
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

/* THE FACES ARE EMBEDDED. The thirteen files in assets/fonts, each named by
   its PostScript name, are listed under the expo-font plugin in app.json, so
   the build puts them in the app and iOS registers them before any JS runs —
   no runtime loading, no splash wait. They used to come from the Expo Google
   Fonts package roots, which ship every weight a package has: 68 files,
   12.2 MB in the 1.2.3 app, for 12 faces actually set (now 2.6 MB). The family
   tokens here, in theme/tokens (F) and theme/y2k (F2) are those PostScript
   names, and so is every SwiftUI Font.custom in modules/kindredly-ui.
   Italic needs saying twice: fontFamily the italic face AND fontStyle
   "italic" — iOS files Fraunces-Italic under the one Fraunces family, and
   React Native picks the face whose style matches fontStyle, so the italic
   face asked for alone comes out upright. (A JS bundle that relies on these
   names must never reach a binary built without them: runtimeVersion follows
   the app version, so an update can't.) */
/* THE TYPE (owner, 2026-10-20): four faces only. The system font (SF Pro)
   for UI — fontFamily left unset (PF.letter is that, undefined) and the
   weight said in fontWeight; SF Mono for labels and the send key — PFM;
   and the reader's Letter font for CONTENT (letters, replies, notes, chat
   bubbles, Wren's lines, quotes, and every field someone writes in) —
   useLetterFamily() in lib/theme, or letterFamily(key) here. Fraunces
   (PF.serif*), Inter (PF.writing) and IBM Plex Mono are no longer drawn;
   their tokens stay until a later step takes them and their files out.

   SF MONO has no file: React Native maps "ui-monospace" to the system
   monospaced design (RCTFontUtils.mm), at the weight fontWeight gives —
   the face name no longer carries it, as Plex's did. So the mono is a
   style FRAGMENT, family and weight together, spread into a style:
   `{ ...PFM.monoSemi, fontSize: 10 }`. A later fontWeight in the same style
   still wins. PF.mono* below are the bare family, kept so nothing that
   reads them breaks; a fontFamily: PF.mono* alone draws 400. */
export const MONO_FAMILY = "ui-monospace";
export const PFM = {
  /** SF Mono 400 (was IBM Plex Mono Regular) */
  mono: { fontFamily: MONO_FAMILY, fontWeight: "400" },
  /** SF Mono 500 (was IBM Plex Mono Medium) */
  monoMed: { fontFamily: MONO_FAMILY, fontWeight: "500" },
  /** SF Mono 600 (was IBM Plex Mono SemiBold) */
  monoSemi: { fontFamily: MONO_FAMILY, fontWeight: "600" },
} as const;

export const PF = {
  // the bare family; use PFM, which carries the weight too
  mono: MONO_FAMILY,
  monoMed: MONO_FAMILY,
  monoSemi: MONO_FAMILY,
  // the letter itself — system font, so CJK renders properly (see F.letter)
  letter: undefined as unknown as string,
  // OLD (Inter): where you wrote. Fields where someone writes content now
  // take the Letter font (useLetterFamily); don't add uses.
  writing: "System",
  // a letter between two people — read and written in a text serif
  // (Newsreader: a text face made for long reading on a screen. Fraunces stays
  // the display voice; its ball-terminal f and hooked ligatures are a
  // mannerism in the middle of someone's sentence — owner, 2026-09-20). CJK
  // glyphs fall through to the system face, which is what we want; fontStyle
  // "italic" finds Newsreader-Italic in its family.
  // 10a: content takes the reader's own choice instead — letterFamily(
  // letterFont) below, or useLetterFamily() in lib/theme. This fixed
  // Newsreader is OLD: content moves to useLetterFamily, UI to the system.
  letterSerif: "Newsreader-Regular",
  // OLD (Fraunces): not drawn any more; UI moves to the system font, Wren's
  // lines to useLetterFamily(true)
  serif: "Newsreader-Regular",
  serifItalic: "Newsreader-Italic",
} as const;

/* A panel. What used to be a white card with a radius and a shadow is, in this
   system, a ruled block — the rule does the containing. */
export const panel = { borderWidth: 1, borderColor: P.ink } as const;
export const panelSoft = { borderWidth: 1, borderColor: P.ink12 } as const;

/* the one filled button: pen blue, square */
export const solidBtn = { backgroundColor: P.pen, paddingVertical: 15, alignItems: "center" } as const;

/* a full-strength hairline — the system's structural move */
export const rule = { borderBottomWidth: 1, borderBottomColor: P.ink } as const;
export const ruleSoft = { borderBottomWidth: 1, borderBottomColor: P.ink12 } as const;

/* ── THE MONO SIZES (10a) ──────────────────────────────────────────────────
   Mono labels and titles come in three sizes only: 9, 10 and 11 (the 10a
   rule, CLAUDE-CODE-PROMPTS.md:58). Owner question 2 is still open and is
   built with its recommended answer: the titles drawn at 12 and 13 (EDIT
   PROFILE, SETTINGS, a sheet's heading) go to 11 as well, YOUR COURIER keeps
   its 12, and the two numbers on the Me profile card stay 13 because they
   are figures, not labels. One table, so the owner's answer is one line;
   KType's mono table says the same for SwiftUI. */
export const MONO = {
  /** stamp dates, the smallest tags */
  small: 9,
  /** section labels, legends, units */
  label: 10,
  /** times, group headers, buttons, and every title (the old 12s and 13s) */
  title: 11,
  /** YOUR COURIER only */
  courier: 12,
  /** the two numbers on the Me profile card */
  figure: 13,
} as const;

/* ── THE LETTER FONT (10a, a device setting) ───────────────────────────────
   CONTENT is set in the face the reader chose: Newsreader (the default,
   embedded), New York (Apple's own serif, in every iPhone, no file
   needed), EB Garamond or SF Mono. It reaches all content (owner,
   2026-10-20): letters, replies, notes, chat bubbles, translations,
   quotes, fold answers, Wren's lines everywhere, my-letter previews, and
   every field where someone writes content. A paper keeps its colour,
   texture and size; the reader's face wins over it. The Kindreds list's
   preview line and names stay in the system face.

   The choice itself lives in lib/theme (ThemeProvider: letterFont and
   setLetterFont; useLetterFont, useLetterFamily), stored on the phone like
   the theme. This part is pure, so it runs under plain node
   (node src/theme/post.test.ts).

   EB GARAMOND is embedded (assets/fonts/EBGaramond-Regular.ttf, OFL — the
   licence sits beside it): the Google Fonts variable file pinned to 400 and
   cut to Latin with fontTools (851 KB → 216 KB; CJK and other scripts fall
   through to the system face, as they do from Newsreader). Only the Regular
   is in the app, and SF Mono has no italic either: italic content in
   either is drawn upright (fontStyle "normal"), never slanted by the
   system, as Swift does (KLetterFace.hasItalic). Only a binary
   built with the file can draw it (runtimeVersion follows the app version,
   so no update reaches a binary without it). */
export const GARAMOND_READY: boolean = true;

export type LetterFontKey = "newsreader" | "newyork" | "garamond" | "sfmono";
/** every value the setting can hold, in the order Settings lists them */
export const LETTER_FONT_KEYS: readonly LetterFontKey[] = ["newsreader", "newyork", "garamond", "sfmono"];
export const DEFAULT_LETTER_FONT: LetterFontKey = "newsreader";
/** the choices Settings may offer on this build: no Garamond until GARAMOND_READY */
export const LETTER_FONT_CHOICES: readonly LetterFontKey[] = LETTER_FONT_KEYS.filter((k) => k !== "garamond" || GARAMOND_READY);

/* the faces, by PostScript name. New York has no file and no name: React
   Native (Fabric) maps "ui-serif" to the system serif design, which is New
   York (RCTFontUtils.mm:321-345), and finds its italic from fontStyle. */
const LETTER_FACES: Readonly<Record<LetterFontKey, { regular: string; italic: string }>> = {
  newsreader: { regular: "Newsreader-Regular", italic: "Newsreader-Italic" },
  newyork: { regular: "ui-serif", italic: "ui-serif" },
  garamond: { regular: "EBGaramond-Regular", italic: "EBGaramond-Regular" },
  // SF Mono, the system monospaced design (owner, 2026-10-20: the typewriter one): no file either,
  // "ui-monospace" is mapped by the same RCTFontUtils table as ui-serif
  sfmono: { regular: "ui-monospace", italic: "ui-monospace" },
};

/** Whatever was stored, as a letter font this build can draw: an unknown
    value (or Garamond before GARAMOND_READY) is the default. */
export function letterFontKey(raw: unknown): LetterFontKey {
  if (raw === "newsreader" || raw === "newyork" || raw === "sfmono") return raw;
  if (raw === "garamond" && GARAMOND_READY) return raw;
  return DEFAULT_LETTER_FONT;
}

/** a Text style fragment: spread it into the style of a letter's text */
export type LetterFace = { fontFamily: string; fontStyle: "normal" | "italic" };

/** Whether the face has a true italic: Newsreader and New York do;
    Garamond (Regular only) and SF Mono don't. */
export function letterHasItalic(key: LetterFontKey): boolean {
  const k = letterFontKey(key);
  return k === "newsreader" || k === "newyork";
}

/** The React Native type for content set in `key`. Italic is said twice —
    the italic face AND fontStyle "italic" — as every italic in this app
    must be (see PF above); the upright one says "normal", so it never
    inherits an italic from a parent Text. Italic in a face without one
    (Garamond, SF Mono) is upright. A key this build can't draw
    (Garamond before GARAMOND_READY) gives the default face. */
export function letterFamily(key: LetterFontKey, italic = false): LetterFace {
  const face = LETTER_FACES[letterFontKey(key)];
  return italic && letterHasItalic(key) ? { fontFamily: face.italic, fontStyle: "italic" } : { fontFamily: face.regular, fontStyle: "normal" };
}

/** Whether the face takes more room than Newsreader, the face the content
    layouts were drawn for: SF Mono is about 20% wider, Garamond's line is
    1.305 tall. */
export function letterIsRoomy(key: LetterFontKey): boolean {
  const k = letterFontKey(key);
  return k === "sfmono" || k === "garamond";
}

/** The numberOfLines to allow content laid out for `lines` in Newsreader:
    one more in a roomy face, so it isn't cut. */
export function letterFitLines(key: LetterFontKey, lines: number): number {
  return letterIsRoomy(key) ? lines + 1 : lines;
}

/** The size to set content at in a box measured for Newsreader at `size`
    (a fixed height, a one-line limit): SF Mono a step down for its width,
    Garamond for its taller line. The same numbers as Swift's
    KLetterFace.fitSize. */
export function letterFitSize(key: LetterFontKey, size: number): number {
  const k = letterFontKey(key);
  const f = k === "sfmono" ? 0.85 : k === "garamond" ? 0.92 : 1;
  return f === 1 ? size : Math.round(size * f * 2) / 2;
}

/* ── the channel tag's two colours ────────────────────────────────────────
   The tag and its pasted stamp are the same thing said twice, so they share a
   hue. But the 44 designed colours are chosen to look right as a printed tile,
   not to carry 10.5pt type: four of the six sit at 3.3–4.4:1 on this paper.

   channelWash — the stamp's colour laid over the paper at 14%, so the hue is
   actually PRESENT on the page rather than surviving only as a hairline.
   channelInk  — that same colour walked down in luminance, hue preserved,
   until it clears 4.5:1 against its own wash.

   The tag's rule still carries the true, undarkened colour (a border needs
   only 3:1, which all six clear), so the exact designed hue stays on screen.

   Those two are fixed to a warm paper. On a theme's own surface — Midnight's
   dark trays above all, where a wash of a deep stamp is nearly black and a
   darker ink can't be read on it — use channelColors(stamp, surface) below,
   which says the same three things against the surface it is given. The old
   pair is kept, unchanged, so their callers draw exactly what they drew. */

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

/* ── channelColors: the same three colours on any theme's surface ──────── */

type RGB = readonly [number, number, number];

/* a stamp without a usable colour reads as a quiet violet-grey (10a mute) */
const NEUTRAL_RGB: RGB = [0x8a, 0x86, 0xa3];
/* a wash darker than this takes a lighter ink, not a darker one (Midnight's
   surfaces and the washes over them sit near .01–.03; the light themes'
   washes above .6) */
const DARK_WASH = 0.18;

const toHex = (c: RGB) => `#${hx(c[0])}${hx(c[1])}${hx(c[2])}`;
const chan = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = (c: RGB) => 0.2126 * chan(c[0]) + 0.7152 * chan(c[1]) + 0.0722 * chan(c[2]);
/* measured on the hex that reaches the screen, not the unrounded mix */
const shown = (c: RGB): RGB => parse(toHex(c))!;
/** WCAG contrast ratio of two colours */
function contrast(a: RGB, b: RGB): number {
  const la = lum(shown(a));
  const lb = lum(shown(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
const over = (c: RGB, under: RGB, alpha: number): RGB => [
  c[0] * alpha + under[0] * (1 - alpha),
  c[1] * alpha + under[1] * (1 - alpha),
  c[2] * alpha + under[2] * (1 - alpha),
];

export type ChannelColors = {
  /** the tag's fill: the stamp at 14% over the surface */
  wash: string;
  /** the tag's text: the stamp's hue, walked darker (light surface) or
      lighter (dark surface) until it clears 4.5:1 on the wash */
  ink: string;
  /** the tag's rule: the stamp itself where it clears 3:1 on the surface,
      otherwise the ink */
  line: string;
};

/** The topic tag's colours for a stamp on the surface it sits on — pass
    that surface's colour (tk.sf on a card, tk.bg on the page, tk.soft2 in a
    tray). Never throws: a missing or malformed stamp colour reads as a
    neutral grey, a missing surface as the old paper. */
export function channelColors(stampHex?: string | null, surfaceHex?: string | null, alpha = 0.14): ChannelColors {
  const c: RGB = parse(stampHex) ?? NEUTRAL_RGB;
  const under: RGB = parse(surfaceHex) ?? PAPER_RGB;
  const wash = shown(over(c, under, alpha));
  const dark = lum(wash) < DARK_WASH;
  let ink: string | null = null;
  for (let k = 0; k <= 0.85 && !ink; k += 0.03) {
    // k = 0 is the stamp itself; each step is 3% further from the wash
    const step: RGB = dark
      ? [c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k]
      : [c[0] * (1 - k), c[1] * (1 - k), c[2] * (1 - k)];
    if (contrast(wash, step) >= 4.5) ink = toHex(step);
  }
  const inkHex = ink ?? (dark ? "#FFFFFF" : P.ink);
  return { wash: toHex(wash), ink: inkHex, line: contrast(c, under) >= 3 ? toHex(c) : inkHex };
}

